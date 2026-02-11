import * as THREE from 'three';
import enemyData from '../../data/enemies.json';

const data = enemyData.brute;
const BODY_GEO = new THREE.BoxGeometry(1.5, 1.8, 1.2);
const HEAD_GEO = new THREE.BoxGeometry(0.8, 0.6, 0.7);
const ARM_GEO = new THREE.BoxGeometry(0.5, 1.0, 0.5);

export class Brute {
  constructor(scene) {
    this.scene = scene;

    const group = new THREE.Group();

    const bodyMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(data.color[0], data.color[1], data.color[2])
    });
    const body = new THREE.Mesh(BODY_GEO, bodyMat);
    body.position.y = 1.1;
    body.castShadow = true;
    group.add(body);

    const headMat = new THREE.MeshStandardMaterial({ color: 0xcc3322 });
    const head = new THREE.Mesh(HEAD_GEO, headMat);
    head.position.y = 2.3;
    head.castShadow = true;
    group.add(head);

    // Arms
    const armMat = new THREE.MeshStandardMaterial({ color: 0x882211 });
    const leftArm = new THREE.Mesh(ARM_GEO, armMat);
    leftArm.position.set(-1.0, 1.0, 0);
    group.add(leftArm);
    const rightArm = new THREE.Mesh(ARM_GEO, armMat);
    rightArm.position.set(1.0, 1.0, 0);
    group.add(rightArm);

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
    this.type = 'brute';

    this.position = new THREE.Vector3();
    this.velocity = new THREE.Vector3();

    // Charge
    this.charging = false;
    this.chargeTimer = 0;
    this.chargeCooldown = 0;
    this.chargeDir = new THREE.Vector3();
    this.chargeSpeed = 12;
  }

  spawn(x, z) {
    this.position.set(x, 0, z);
    this.mesh.position.set(x, 0, z);
    this.mesh.visible = true;
    this.hp = data.hp;
    this.alive = true;
    this.attackTimer = 0;
    this.charging = false;
    this.chargeCooldown = 3;
  }

  takeDamage(amount) {
    if (!this.alive) return;
    this.hp -= amount;
    this.bodyMesh.material.emissive.setHex(0xffffff);
    this.bodyMesh.material.emissiveIntensity = 0.5;
    setTimeout(() => {
      if (this.bodyMesh.material) {
        this.bodyMesh.material.emissive.setHex(0x000000);
        this.bodyMesh.material.emissiveIntensity = 0;
      }
    }, 80);
    if (this.hp <= 0) {
      this.alive = false;
      this.mesh.visible = false;
      return true;
    }
    return false;
  }

  update(dt, playerPos) {
    if (!this.alive) return null;

    const dx = playerPos.x - this.position.x;
    const dz = playerPos.z - this.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    this.chargeCooldown -= dt;

    if (this.charging) {
      this.chargeTimer -= dt;
      this.position.x += this.chargeDir.x * this.chargeSpeed * dt;
      this.position.z += this.chargeDir.z * this.chargeSpeed * dt;

      if (this.chargeTimer <= 0) {
        this.charging = false;
        this.chargeCooldown = 4;
      }

      // Check hit
      if (dist < this.attackRange + 0.5) {
        this.charging = false;
        this.chargeCooldown = 4;
        this.mesh.position.set(this.position.x, 0, this.position.z);
        return { type: 'melee', damage: this.damage };
      }
    } else {
      // Initiate charge
      if (dist < 15 && dist > 4 && this.chargeCooldown <= 0) {
        this.charging = true;
        this.chargeTimer = 1.0;
        this.chargeDir.set(dx / dist, 0, dz / dist);
      } else {
        // Walk towards player
        if (dist > 0.1) {
          this.position.x += (dx / dist) * this.speed * dt;
          this.position.z += (dz / dist) * this.speed * dt;
        }
      }

      // Melee attack
      this.attackTimer -= dt;
      if (dist < this.attackRange && this.attackTimer <= 0) {
        this.attackTimer = this.attackCooldown;
        return { type: 'melee', damage: this.damage };
      }
    }

    this.mesh.position.set(this.position.x, 0, this.position.z);

    // Face direction
    if (dist > 0.1) {
      const angle = Math.atan2(dx, dz);
      this.mesh.rotation.y = angle;
    }

    // Charge visual: lean forward
    if (this.charging) {
      this.mesh.rotation.x = -0.3;
    } else {
      this.mesh.rotation.x = 0;
    }

    return null;
  }

  deactivate() {
    this.alive = false;
    this.mesh.visible = false;
  }
}
