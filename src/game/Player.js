import * as THREE from 'three';
import { mouseToWorld, clamp } from '../utils/MathUtils.js';

const PLAYER_SPEED = 8;
const SPRINT_MULTIPLIER = 1.5;
const DASH_SPEED = 25;
const DASH_DURATION = 0.15;
const DASH_COOLDOWN = 0.8;
const DASH_INVINCIBILITY = 0.2;
const PLAYER_RADIUS = 0.4;

export class Player {
  constructor(scene) {
    this.scene = scene;

    // Visual — blocky character stand-in
    const group = new THREE.Group();

    // Body
    const bodyGeo = new THREE.BoxGeometry(0.6, 0.9, 0.4);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x336699 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.75;
    body.castShadow = true;
    group.add(body);

    // Head
    const headGeo = new THREE.BoxGeometry(0.4, 0.4, 0.4);
    const headMat = new THREE.MeshStandardMaterial({ color: 0xffcc88 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 1.45;
    head.castShadow = true;
    group.add(head);

    // Gun arm
    const gunGeo = new THREE.BoxGeometry(0.15, 0.15, 0.7);
    const gunMat = new THREE.MeshStandardMaterial({ color: 0x444444 });
    this.gunMesh = new THREE.Mesh(gunGeo, gunMat);
    this.gunMesh.position.set(0.4, 0.8, 0.2);
    group.add(this.gunMesh);

    this.mesh = group;
    this.mesh.castShadow = true;
    scene.add(this.mesh);

    // State
    this.position = new THREE.Vector3(0, 0, 0);
    this.velocity = new THREE.Vector3();
    this.aimDirection = new THREE.Vector3(0, 0, -1);
    this.radius = PLAYER_RADIUS;

    // HP
    this.maxHp = 100;
    this.hp = this.maxHp;
    this.alive = true;
    this.invincibleTimer = 0;
    this.hitFlashTimer = 0;

    // Dash
    this.dashTimer = 0;
    this.dashCooldown = 0;
    this.dashDirection = new THREE.Vector3();
    this.dashInvincible = 0;

    // Sprint
    this.sprinting = false;
  }

  takeDamage(amount) {
    if (this.dashInvincible > 0 || this.invincibleTimer > 0) return;
    this.hp -= amount;
    this.hitFlashTimer = 0.1;
    this.invincibleTimer = 0.15;
    if (this.hp <= 0) {
      this.hp = 0;
      this.alive = false;
    }
  }

  heal(amount) {
    this.hp = Math.min(this.hp + amount, this.maxHp);
  }

  dash(moveDir, audio) {
    if (this.dashCooldown > 0) return;
    if (moveDir.x === 0 && moveDir.z === 0) return;

    this.dashTimer = DASH_DURATION;
    this.dashCooldown = DASH_COOLDOWN;
    this.dashInvincible = DASH_INVINCIBILITY;
    this.dashDirection.set(moveDir.x, 0, moveDir.z).normalize();
    audio.playDash();
  }

  update(dt, input, camera, collision) {
    if (!this.alive) return;

    // Timers
    this.dashCooldown -= dt;
    this.invincibleTimer -= dt;
    this.dashInvincible -= dt;
    this.hitFlashTimer -= dt;

    // Movement
    const move = input.getMovementVector();
    this.sprinting = input.isSprinting() && (move.x !== 0 || move.z !== 0);

    let speed = PLAYER_SPEED;
    if (this.sprinting) speed *= SPRINT_MULTIPLIER;

    if (this.dashTimer > 0) {
      this.dashTimer -= dt;
      this.velocity.x = this.dashDirection.x * DASH_SPEED;
      this.velocity.z = this.dashDirection.z * DASH_SPEED;
    } else {
      this.velocity.x = move.x * speed;
      this.velocity.z = move.z * speed;
    }

    // Apply velocity
    let newX = this.position.x + this.velocity.x * dt;
    let newZ = this.position.z + this.velocity.z * dt;

    // Collision resolution
    const resolved = collision.resolvePlayerStatic(newX, newZ, this.radius);
    this.position.x = resolved.x;
    this.position.z = resolved.z;

    // Aim at mouse
    const worldPos = mouseToWorld(input.mouseX, input.mouseY, camera);
    if (worldPos) {
      this.aimDirection.set(
        worldPos.x - this.position.x,
        0,
        worldPos.z - this.position.z
      ).normalize();
    }

    // Update mesh
    this.mesh.position.set(this.position.x, 0, this.position.z);

    // Rotate towards aim
    const angle = Math.atan2(this.aimDirection.x, this.aimDirection.z);
    this.mesh.rotation.y = angle;

    // Hit flash effect
    if (this.hitFlashTimer > 0) {
      this.mesh.children[0].material.emissive.setHex(0xff0000);
      this.mesh.children[0].material.emissiveIntensity = 2;
    } else {
      this.mesh.children[0].material.emissive.setHex(0x000000);
      this.mesh.children[0].material.emissiveIntensity = 0;
    }

    // Dash visual
    if (this.dashInvincible > 0) {
      this.mesh.children.forEach(c => {
        if (c.material) c.material.opacity = 0.5;
        if (c.material) c.material.transparent = true;
      });
    } else {
      this.mesh.children.forEach(c => {
        if (c.material) c.material.opacity = 1;
        if (c.material) c.material.transparent = false;
      });
    }
  }

  getFireOrigin() {
    return this.position.clone().add(this.aimDirection.clone().multiplyScalar(0.5));
  }
}
