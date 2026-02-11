import * as THREE from 'three';

class Particle {
  constructor() {
    this.position = new THREE.Vector3();
    this.velocity = new THREE.Vector3();
    this.life = 0;
    this.maxLife = 1;
    this.size = 0.1;
    this.color = new THREE.Color(1, 1, 1);
    this.gravity = -9.8;
    this.active = false;
  }
}

export class ParticleSystem {
  constructor(scene, maxParticles = 2000) {
    this.scene = scene;
    this.particles = [];
    this.maxParticles = maxParticles;

    for (let i = 0; i < maxParticles; i++) {
      this.particles.push(new Particle());
    }

    // Instanced mesh for particles
    const geo = new THREE.BoxGeometry(1, 1, 1);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    this.mesh = new THREE.InstancedMesh(geo, mat, maxParticles);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.mesh.count = 0;

    // Per-instance color
    this.colorAttr = new THREE.InstancedBufferAttribute(new Float32Array(maxParticles * 3), 3);
    this.mesh.instanceColor = this.colorAttr;

    scene.add(this.mesh);

    this._dummy = new THREE.Object3D();
  }

  _getParticle() {
    for (const p of this.particles) {
      if (!p.active) return p;
    }
    return null;
  }

  emit(config) {
    const {
      position,
      count = 10,
      speed = 5,
      spread = 1,
      color = new THREE.Color(1, 0.5, 0),
      color2 = null,
      life = 0.5,
      size = 0.15,
      gravity = -15
    } = config;

    for (let i = 0; i < count; i++) {
      const p = this._getParticle();
      if (!p) break;

      p.active = true;
      p.position.copy(position);
      p.position.x += (Math.random() - 0.5) * spread;
      p.position.y += Math.random() * spread * 0.5;
      p.position.z += (Math.random() - 0.5) * spread;

      const angle = Math.random() * Math.PI * 2;
      const upSpeed = speed * (0.5 + Math.random() * 0.5);
      p.velocity.set(
        Math.cos(angle) * speed * (0.3 + Math.random() * 0.7),
        upSpeed,
        Math.sin(angle) * speed * (0.3 + Math.random() * 0.7)
      );

      p.life = life * (0.5 + Math.random() * 0.5);
      p.maxLife = p.life;
      p.size = size * (0.5 + Math.random());
      p.color = color2 ? color.clone().lerp(color2, Math.random()) : color.clone();
      p.gravity = gravity;
    }
  }

  // Explosion with debris
  explode(position, config = {}) {
    const { intensity = 1.0 } = config;

    // Fire core
    this.emit({
      position,
      count: Math.floor(15 * intensity),
      speed: 6 * intensity,
      spread: 0.5,
      color: new THREE.Color(1, 0.8, 0.2),
      color2: new THREE.Color(1, 0.2, 0),
      life: 0.6,
      size: 0.3,
      gravity: -5
    });

    // Debris
    this.emit({
      position,
      count: Math.floor(10 * intensity),
      speed: 8 * intensity,
      spread: 0.3,
      color: new THREE.Color(0.4, 0.4, 0.4),
      color2: new THREE.Color(0.2, 0.2, 0.2),
      life: 1.0,
      size: 0.2,
      gravity: -20
    });

    // Sparks
    this.emit({
      position,
      count: Math.floor(8 * intensity),
      speed: 12 * intensity,
      spread: 0.2,
      color: new THREE.Color(1, 1, 0.5),
      life: 0.3,
      size: 0.08,
      gravity: -8
    });
  }

  // Alien death pop
  alienDeath(position) {
    this.emit({
      position,
      count: 12,
      speed: 5,
      spread: 0.5,
      color: new THREE.Color(0.2, 1, 0.2),
      color2: new THREE.Color(0, 0.5, 1),
      life: 0.5,
      size: 0.2,
      gravity: -12
    });
  }

  // Muzzle flash particles
  muzzleFlash(position, direction) {
    const pos = position.clone();
    this.emit({
      position: pos,
      count: 3,
      speed: 8,
      spread: 0.1,
      color: new THREE.Color(1, 1, 0.6),
      life: 0.08,
      size: 0.15,
      gravity: 0
    });
  }

  update(dt) {
    let visibleCount = 0;

    for (const p of this.particles) {
      if (!p.active) continue;

      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        continue;
      }

      p.velocity.y += p.gravity * dt;
      p.position.x += p.velocity.x * dt;
      p.position.y += p.velocity.y * dt;
      p.position.z += p.velocity.z * dt;

      // Keep above ground
      if (p.position.y < 0.05) {
        p.position.y = 0.05;
        p.velocity.y *= -0.3;
        p.velocity.x *= 0.7;
        p.velocity.z *= 0.7;
      }

      const lifeRatio = p.life / p.maxLife;
      const scale = p.size * lifeRatio;

      this._dummy.position.copy(p.position);
      this._dummy.scale.setScalar(scale);
      this._dummy.updateMatrix();
      this.mesh.setMatrixAt(visibleCount, this._dummy.matrix);
      this.colorAttr.setXYZ(visibleCount, p.color.r, p.color.g, p.color.b);

      visibleCount++;
    }

    this.mesh.count = visibleCount;
    this.mesh.instanceMatrix.needsUpdate = true;
    this.colorAttr.needsUpdate = true;
  }
}
