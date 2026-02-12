import * as THREE from 'three';
import { ObjectPool } from '../utils/ObjectPool.js';
import weaponData from '../data/weapons.json';

const PROJECTILE_GEO = new THREE.BoxGeometry(0.15, 0.15, 0.6);

export class WeaponSystem {
  constructor(scene, collisionSystem, audio, particles, lighting, juice) {
    this.scene = scene;
    this.collision = collisionSystem;
    this.audio = audio;
    this.particles = particles;
    this.lighting = lighting;
    this.juice = juice;

    this.weapons = weaponData;
    this.currentWeapon = 'pulsePistol';
    this.unlockedWeapons = ['pulsePistol', 'assaultRifle', 'plasmaShotgun'];
    this.currentIndex = 0;

    this.ammo = {};
    this.fireTimer = 0;
    this.reloading = false;
    this.reloadTimer = 0;

    // Init ammo
    for (const [key, w] of Object.entries(this.weapons)) {
      this.ammo[key] = w.magazineSize;
    }

    // Projectile pool
    this.projectilePool = new ObjectPool(
      () => {
        const color = new THREE.Color(1, 1, 0.5);
        const mat = new THREE.MeshBasicMaterial({ color });
        const mesh = new THREE.Mesh(PROJECTILE_GEO, mat);
        mesh.visible = false;
        scene.add(mesh);
        return {
          mesh,
          velocity: new THREE.Vector3(),
          life: 0,
          damage: 0,
          active: false
        };
      },
      (p) => {
        p.mesh.visible = false;
        p.active = false;
        p.life = 0;
      },
      100
    );
  }

  getWeapon() {
    return this.weapons[this.currentWeapon];
  }

  switchWeapon(direction) {
    this.currentIndex = (this.currentIndex + direction + this.unlockedWeapons.length) % this.unlockedWeapons.length;
    this.currentWeapon = this.unlockedWeapons[this.currentIndex];
    this.reloading = false;
    this.reloadTimer = 0;
  }

  reload() {
    const w = this.getWeapon();
    if (w.magazineSize === -1) return; // infinite
    if (this.reloading) return;
    if (this.ammo[this.currentWeapon] === w.magazineSize) return;
    this.reloading = true;
    this.reloadTimer = w.reloadTime;
    this.audio.playReload();
  }

  fire(origin, direction) {
    if (this.fireTimer > 0) return false;
    if (this.reloading) return false;

    const w = this.getWeapon();

    // Check ammo
    if (w.magazineSize !== -1) {
      if (this.ammo[this.currentWeapon] <= 0) {
        this.reload();
        return false;
      }
      this.ammo[this.currentWeapon]--;
    }

    this.fireTimer = w.fireRate;

    // Spawn projectiles
    for (let i = 0; i < w.projectilesPerShot; i++) {
      const p = this.projectilePool.get();
      const spread = (Math.random() - 0.5) * w.spread * 2;

      const dir = direction.clone();
      dir.x += spread;
      dir.z += spread;
      dir.normalize();

      p.mesh.position.copy(origin);
      p.mesh.position.y = 0.6;
      p.velocity.copy(dir).multiplyScalar(w.projectileSpeed);
      p.mesh.lookAt(p.mesh.position.clone().add(dir));
      p.mesh.material.color.setRGB(w.color[0], w.color[1], w.color[2]);
      p.mesh.visible = true;
      p.damage = w.damage;
      p.life = 1.5;
      p.active = true;
    }

    // Effects
    if (w.sound === 'shotgun') {
      this.audio.playShotgun();
      this.juice.screenshake(0.15);
    } else {
      this.audio.playShoot(w.pitch);
      this.juice.screenshake(0.05);
    }

    // Muzzle flash
    const flashPos = origin.clone();
    flashPos.y = 0.6;
    flashPos.add(direction.clone().multiplyScalar(0.8));
    this.lighting.addMuzzleFlash(flashPos);
    this.particles.muzzleFlash(flashPos, direction);

    return true;
  }

  update(dt, enemies) {
    this.fireTimer -= dt;

    // Reload
    if (this.reloading) {
      this.reloadTimer -= dt;
      if (this.reloadTimer <= 0) {
        this.reloading = false;
        const w = this.getWeapon();
        this.ammo[this.currentWeapon] = w.magazineSize;
      }
    }

    // Update projectiles
    const toRelease = [];

    for (const p of this.projectilePool.getActive()) {
      if (!p.active) continue;

      p.life -= dt;
      if (p.life <= 0) {
        toRelease.push(p);
        continue;
      }

      p.mesh.position.x += p.velocity.x * dt;
      p.mesh.position.z += p.velocity.z * dt;

      // Check static collision
      const hit = this.collision.projectileVsStatics(p.mesh.position.x, p.mesh.position.z);
      if (hit) {
        this.particles.emit({
          position: p.mesh.position,
          count: 5,
          speed: 3,
          color: new THREE.Color(1, 0.8, 0.3),
          life: 0.2,
          size: 0.1
        });
        toRelease.push(p);
        continue;
      }

      // Check enemy collision (circle vs circle with projectile radius)
      let hitEnemy = false;
      for (const enemy of enemies) {
        if (!enemy.alive) continue;
        const dx = p.mesh.position.x - enemy.mesh.position.x;
        const dz = p.mesh.position.z - enemy.mesh.position.z;
        const hitRadius = enemy.radius + 0.2;
        if (dx * dx + dz * dz < hitRadius * hitRadius) {
          enemy.takeDamage(p.damage);
          hitEnemy = true;
          break;
        }
      }

      if (hitEnemy) {
        toRelease.push(p);
      }
    }

    for (const p of toRelease) {
      this.projectilePool.release(p);
    }
  }

  getAmmoDisplay() {
    const w = this.getWeapon();
    if (w.magazineSize === -1) return `${w.name} | ∞`;
    if (this.reloading) return `${w.name} | RELOADING...`;
    return `${w.name} | ${this.ammo[this.currentWeapon]}/${w.magazineSize}`;
  }
}
