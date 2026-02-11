import * as THREE from 'three';
import enemyData from '../../data/enemies.json';

const data = enemyData.spitter;
const BODY_GEO = new THREE.BoxGeometry(0.7, 0.9, 0.5);
const HEAD_GEO = new THREE.SphereGeometry(0.35, 8, 8);

export class Spitter {
  constructor(scene) {
    this.scene = scene;

    const group = new THREE.Group();

    const bodyMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(data.color[0], data.color[1], data.color[2])
    });
    const body = new THREE.Mesh(BODY_GEO, bodyMat);
    body.position.y = 0.55;
    body.castShadow = true;
    group.add(body);

    const headMat = new THREE.MeshStandardMaterial({ color: 0xcc44ff });
    const head = new THREE.Mesh(HEAD_GEO, headMat);
    head.position.y = 1.15;
    head.castShadow = true;
    group.add(head);

    this.mesh = group;
    this.bodyMesh = body;
    this.mesh.visible = false;
    scene.add(this.mesh);

    this.hp = data.hp;
    this.maxHp = data.hp;
    this.speed = data.speed;
    this.damage = data.damage;
    this.attackRange = data.attackRange;
    this.attackCooldown = data.attackCooldown;
    this.attackTimer = 0;
    this.radius = data.radius;
    this.scoreValue = data.score;
    this.alive = false;
    this.type = 'spitter';

    this.position = new THREE.Vector3();
    this.velocity = new THREE.Vector3();
    this.preferredDist = 10; // tries to keep this distance
    this.strafeDir = Math.random() > 0.5 ? 1 : -1;
    this.strafeTimer = 0;

    // Projectile data
    this.projectiles = [];
  }

  spawn(x, z) {
    this.position.set(x, 0, z);
    this.mesh.position.set(x, 0, z);
    this.mesh.visible = true;
    this.hp = data.hp;
    this.alive = true;
    this.attackTimer = Math.random() * 0.5; // stagger first shot
    this.projectiles = [];
  }

  takeDamage(amount) {
    if (!this.alive) return;
    this.hp -= amount;
    this.bodyMesh.material.emissive.setHex(0xffffff);
    this.bodyMesh.material.emissiveIntensity = 1;
    setTimeout(() => {
      if (this.bodyMesh.material) {
        this.bodyMesh.material.emissive.setHex(0x000000);
        this.bodyMesh.material.emissiveIntensity = 0;
      }
    }, 50);
    if (this.hp <= 0) {
      this.alive = false;
      this.mesh.visible = false;
      // Clean up projectiles
      for (const p of this.projectiles) {
        this.scene.remove(p.mesh);
      }
      this.projectiles = [];
      return true;
    }
    return false;
  }

  update(dt, playerPos) {
    if (!this.alive) return null;

    const dx = playerPos.x - this.position.x;
    const dz = playerPos.z - this.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    const dirX = dist > 0.1 ? dx / dist : 0;
    const dirZ = dist > 0.1 ? dz / dist : 0;

    // Movement: keep preferred distance + strafe
    let moveX = 0, moveZ = 0;

    if (dist > this.preferredDist + 2) {
      moveX += dirX;
      moveZ += dirZ;
    } else if (dist < this.preferredDist - 2) {
      moveX -= dirX;
      moveZ -= dirZ;
    }

    // Strafe
    this.strafeTimer -= dt;
    if (this.strafeTimer <= 0) {
      this.strafeDir *= -1;
      this.strafeTimer = 1.5 + Math.random() * 2;
    }
    moveX += -dirZ * this.strafeDir * 0.7;
    moveZ += dirX * this.strafeDir * 0.7;

    const moveLen = Math.sqrt(moveX * moveX + moveZ * moveZ);
    if (moveLen > 0) {
      this.position.x += (moveX / moveLen) * this.speed * dt;
      this.position.z += (moveZ / moveLen) * this.speed * dt;
    }

    this.mesh.position.set(this.position.x, 0, this.position.z);

    // Face player
    const angle = Math.atan2(dx, dz);
    this.mesh.rotation.y = angle;

    // Shoot
    this.attackTimer -= dt;
    let attack = null;
    if (dist < this.attackRange && this.attackTimer <= 0) {
      this.attackTimer = this.attackCooldown;
      // Spawn projectile
      this._spawnProjectile(dirX, dirZ);
      attack = { type: 'ranged' };
    }

    // Update projectiles
    this._updateProjectiles(dt, playerPos);

    return attack;
  }

  _spawnProjectile(dirX, dirZ) {
    const geo = new THREE.SphereGeometry(0.15, 6, 6);
    const mat = new THREE.MeshBasicMaterial({ color: 0xff00ff });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(this.position.x, 0.8, this.position.z);
    this.scene.add(mesh);

    this.projectiles.push({
      mesh,
      vx: dirX * 12,
      vz: dirZ * 12,
      life: 3
    });
  }

  _updateProjectiles(dt, playerPos) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        this.projectiles.splice(i, 1);
        continue;
      }

      p.mesh.position.x += p.vx * dt;
      p.mesh.position.z += p.vz * dt;

      // Check vs player
      const dx = p.mesh.position.x - playerPos.x;
      const dz = p.mesh.position.z - playerPos.z;
      if (dx * dx + dz * dz < 0.5 * 0.5) {
        this.scene.remove(p.mesh);
        this.projectiles.splice(i, 1);
        return { type: 'hit', damage: this.damage };
      }
    }
    return null;
  }

  checkProjectileHits(playerPos) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      const dx = p.mesh.position.x - playerPos.x;
      const dz = p.mesh.position.z - playerPos.z;
      if (dx * dx + dz * dz < 0.6 * 0.6) {
        this.scene.remove(p.mesh);
        this.projectiles.splice(i, 1);
        return this.damage;
      }
    }
    return 0;
  }

  deactivate() {
    this.alive = false;
    this.mesh.visible = false;
    for (const p of this.projectiles) {
      this.scene.remove(p.mesh);
    }
    this.projectiles = [];
  }
}
