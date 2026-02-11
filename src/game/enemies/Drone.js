import * as THREE from 'three';
import enemyData from '../../data/enemies.json';

const data = enemyData.drone;
const GEO = new THREE.BoxGeometry(0.6, 0.6, 0.6);

export class Drone {
  constructor(scene) {
    this.scene = scene;
    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(data.color[0], data.color[1], data.color[2])
    });
    this.mesh = new THREE.Mesh(GEO, mat);
    this.mesh.castShadow = true;
    this.mesh.visible = false;

    // Wing-like appendages
    const wingGeo = new THREE.BoxGeometry(0.8, 0.1, 0.3);
    const wingMat = new THREE.MeshStandardMaterial({ color: 0x116622 });
    const wing1 = new THREE.Mesh(wingGeo, wingMat);
    wing1.position.set(0, 0.1, 0);
    this.mesh.add(wing1);

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
    this.type = 'drone';

    this.position = new THREE.Vector3();
    this.velocity = new THREE.Vector3();

    // Flock params
    this.separationWeight = 2.0;
    this.cohesionWeight = 0.3;
    this.alignmentWeight = 0.5;
    this.targetWeight = 3.0;
    this.bobPhase = Math.random() * Math.PI * 2;
  }

  spawn(x, z) {
    this.position.set(x, 0, z);
    this.mesh.position.set(x, data.height * 0.5, z);
    this.mesh.visible = true;
    this.hp = data.hp;
    this.alive = true;
    this.attackTimer = 0;
    this.velocity.set(0, 0, 0);
  }

  takeDamage(amount) {
    if (!this.alive) return;
    this.hp -= amount;
    // Flash white
    this.mesh.material.emissive.setHex(0xffffff);
    this.mesh.material.emissiveIntensity = 1;
    setTimeout(() => {
      if (this.mesh.material) {
        this.mesh.material.emissive.setHex(0x000000);
        this.mesh.material.emissiveIntensity = 0;
      }
    }, 50);

    if (this.hp <= 0) {
      this.alive = false;
      this.mesh.visible = false;
      return true; // died
    }
    return false;
  }

  update(dt, playerPos, neighbors) {
    if (!this.alive) return;

    // Flock behavior
    const separation = new THREE.Vector3();
    const cohesion = new THREE.Vector3();
    const alignment = new THREE.Vector3();
    let neighborCount = 0;

    for (const other of neighbors) {
      if (other === this || !other.alive) continue;
      const dx = this.position.x - other.position.x;
      const dz = this.position.z - other.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist < 3) {
        neighborCount++;

        // Separation
        if (dist < 1.5 && dist > 0.01) {
          separation.x += dx / dist;
          separation.z += dz / dist;
        }

        // Cohesion
        cohesion.x += other.position.x;
        cohesion.z += other.position.z;

        // Alignment
        alignment.x += other.velocity.x;
        alignment.z += other.velocity.z;
      }
    }

    if (neighborCount > 0) {
      cohesion.x = cohesion.x / neighborCount - this.position.x;
      cohesion.z = cohesion.z / neighborCount - this.position.z;
      alignment.x /= neighborCount;
      alignment.z /= neighborCount;
    }

    // Target direction
    const toPlayer = new THREE.Vector3(
      playerPos.x - this.position.x,
      0,
      playerPos.z - this.position.z
    );
    const distToPlayer = toPlayer.length();
    if (distToPlayer > 0.1) toPlayer.normalize();

    // Combine forces
    const steer = new THREE.Vector3();
    steer.x += separation.x * this.separationWeight;
    steer.z += separation.z * this.separationWeight;
    steer.x += cohesion.x * this.cohesionWeight;
    steer.z += cohesion.z * this.cohesionWeight;
    steer.x += alignment.x * this.alignmentWeight;
    steer.z += alignment.z * this.alignmentWeight;
    steer.x += toPlayer.x * this.targetWeight;
    steer.z += toPlayer.z * this.targetWeight;

    // Apply
    this.velocity.x += steer.x * dt * 3;
    this.velocity.z += steer.z * dt * 3;

    // Limit speed
    const vel = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.z * this.velocity.z);
    if (vel > this.speed) {
      this.velocity.x = (this.velocity.x / vel) * this.speed;
      this.velocity.z = (this.velocity.z / vel) * this.speed;
    }

    this.position.x += this.velocity.x * dt;
    this.position.z += this.velocity.z * dt;

    // Bobbing
    this.bobPhase += dt * 5;
    const bob = Math.sin(this.bobPhase) * 0.15;

    this.mesh.position.set(this.position.x, data.height * 0.5 + bob, this.position.z);

    // Face movement direction
    if (vel > 0.1) {
      const angle = Math.atan2(this.velocity.x, this.velocity.z);
      this.mesh.rotation.y = angle;
    }

    // Attack
    this.attackTimer -= dt;
    if (distToPlayer < this.attackRange && this.attackTimer <= 0) {
      this.attackTimer = this.attackCooldown;
      return { type: 'melee', damage: this.damage };
    }

    return null;
  }

  deactivate() {
    this.alive = false;
    this.mesh.visible = false;
  }
}
