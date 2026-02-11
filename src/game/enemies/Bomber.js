import * as THREE from 'three';
import enemyData from '../../data/enemies.json';

const data = enemyData.bomber;
const BODY_GEO = new THREE.SphereGeometry(0.4, 8, 8);

export class Bomber {
  constructor(scene) {
    this.scene = scene;

    const group = new THREE.Group();

    const bodyMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(data.color[0], data.color[1], data.color[2]),
      emissive: new THREE.Color(0.5, 0.2, 0),
      emissiveIntensity: 0.5
    });
    const body = new THREE.Mesh(BODY_GEO, bodyMat);
    body.position.y = 0.5;
    body.castShadow = true;
    group.add(body);

    // Glow indicator
    const glowGeo = new THREE.SphereGeometry(0.55, 8, 8);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0xff4400,
      transparent: true,
      opacity: 0.3
    });
    this.glowMesh = new THREE.Mesh(glowGeo, glowMat);
    this.glowMesh.position.y = 0.5;
    group.add(this.glowMesh);

    this.mesh = group;
    this.bodyMesh = body;
    this.mesh.visible = false;
    scene.add(this.mesh);

    this.hp = data.hp;
    this.maxHp = data.hp;
    this.speed = data.speed;
    this.damage = data.damage;
    this.attackRange = data.attackRange;
    this.radius = data.radius;
    this.scoreValue = data.score;
    this.alive = false;
    this.type = 'bomber';
    this.exploded = false;

    this.position = new THREE.Vector3();
    this.pulsePhase = Math.random() * Math.PI * 2;
  }

  spawn(x, z) {
    this.position.set(x, 0, z);
    this.mesh.position.set(x, 0, z);
    this.mesh.visible = true;
    this.hp = data.hp;
    this.alive = true;
    this.exploded = false;
  }

  takeDamage(amount) {
    if (!this.alive) return;
    this.hp -= amount;
    this.bodyMesh.material.emissive.setHex(0xffffff);
    setTimeout(() => {
      if (this.bodyMesh.material) {
        this.bodyMesh.material.emissive.set(0.5, 0.2, 0);
      }
    }, 50);
    if (this.hp <= 0) {
      this.alive = false;
      this.mesh.visible = false;
      this.exploded = true;
      return true;
    }
    return false;
  }

  update(dt, playerPos) {
    if (!this.alive) return null;

    const dx = playerPos.x - this.position.x;
    const dz = playerPos.z - this.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    // Rush towards player
    if (dist > 0.1) {
      this.position.x += (dx / dist) * this.speed * dt;
      this.position.z += (dz / dist) * this.speed * dt;
    }

    this.mesh.position.set(this.position.x, 0, this.position.z);

    // Pulse glow faster as closer
    this.pulsePhase += dt * (3 + (1 - Math.min(dist / 10, 1)) * 15);
    const pulse = 0.2 + Math.sin(this.pulsePhase) * 0.15;
    this.glowMesh.material.opacity = pulse;
    const scale = 1 + Math.sin(this.pulsePhase) * 0.1;
    this.glowMesh.scale.setScalar(scale);

    // Face player
    if (dist > 0.1) {
      const angle = Math.atan2(dx, dz);
      this.mesh.rotation.y = angle;
    }

    // Explode on contact
    if (dist < this.attackRange) {
      this.alive = false;
      this.mesh.visible = false;
      this.exploded = true;
      return { type: 'explosion', damage: this.damage };
    }

    return null;
  }

  deactivate() {
    this.alive = false;
    this.mesh.visible = false;
  }
}
