import * as THREE from 'three';

const GRENADE_GEO = new THREE.SphereGeometry(0.2, 8, 8);
const GRENADE_MAT = new THREE.MeshStandardMaterial({ color: 0x556633 });

export class GrenadeSystem {
  constructor(scene, particles, audio, juice) {
    this.scene = scene;
    this.particles = particles;
    this.audio = audio;
    this.juice = juice;

    this.grenades = [];
    this.count = 3;
    this.maxGrenades = 5;
    this.explosionRadius = 6;
    this.explosionDamage = 80;
  }

  throw(origin, direction) {
    if (this.count <= 0) return;
    this.count--;

    const mesh = new THREE.Mesh(GRENADE_GEO, GRENADE_MAT);
    mesh.position.copy(origin);
    mesh.position.y = 0.8;
    this.scene.add(mesh);

    this.audio.playGrenade();

    this.grenades.push({
      mesh,
      velocity: direction.clone().multiplyScalar(15),
      velocityY: 6,
      timer: 1.2,
      bounced: false
    });
  }

  update(dt, enemies) {
    for (let i = this.grenades.length - 1; i >= 0; i--) {
      const g = this.grenades[i];
      g.timer -= dt;

      // Physics
      g.velocity.multiplyScalar(0.98);
      g.velocityY -= 20 * dt;
      g.mesh.position.x += g.velocity.x * dt;
      g.mesh.position.z += g.velocity.z * dt;
      g.mesh.position.y += g.velocityY * dt;

      // Bounce
      if (g.mesh.position.y < 0.2) {
        g.mesh.position.y = 0.2;
        g.velocityY *= -0.4;
        g.velocity.multiplyScalar(0.6);
      }

      g.mesh.rotation.x += dt * 10;
      g.mesh.rotation.z += dt * 8;

      if (g.timer <= 0) {
        // Explode
        this.particles.explode(g.mesh.position, { intensity: 2.0 });
        this.audio.playExplosion(1.5);
        this.juice.screenshake(0.6);
        this.juice.hitstop(0.06);

        // Damage enemies
        for (const enemy of enemies) {
          if (!enemy.alive) continue;
          const dx = enemy.mesh.position.x - g.mesh.position.x;
          const dz = enemy.mesh.position.z - g.mesh.position.z;
          const dist = Math.sqrt(dx * dx + dz * dz);
          if (dist < this.explosionRadius) {
            const falloff = 1 - (dist / this.explosionRadius);
            enemy.takeDamage(this.explosionDamage * falloff);
          }
        }

        this.scene.remove(g.mesh);
        g.mesh.geometry.dispose();
        this.grenades.splice(i, 1);
      }
    }
  }

  addGrenades(amount) {
    this.count = Math.min(this.count + amount, this.maxGrenades);
  }
}
