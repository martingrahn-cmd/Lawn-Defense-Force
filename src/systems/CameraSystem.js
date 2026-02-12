import * as THREE from 'three';
import { lerp, clamp, randomRange } from '../utils/MathUtils.js';

export class CameraSystem {
  constructor() {
    this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 500);

    // Isometric-style offset: 45° angle, looking down
    this.baseOffset = new THREE.Vector3(0, 28, 22);
    this.currentOffset = this.baseOffset.clone();
    this.targetPosition = new THREE.Vector3();
    this.lookAtTarget = new THREE.Vector3();

    // Smooth follow
    this.followSpeed = 2.5;
    this.leadAmount = 0.5;

    // Dynamic zoom
    this.baseZoomDist = 1.0;
    this.currentZoom = 1.0;
    this.targetZoom = 1.0;

    // Screenshake
    this.shakeIntensity = 0;
    this.shakeDuration = 0;
    this.shakeTimer = 0;
    this.shakeOffset = new THREE.Vector3();

    // Initial position
    this.camera.position.copy(this.baseOffset);
    this.camera.lookAt(0, 0, 0);

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
    });
  }

  shake(intensity, duration = 0.2) {
    this.shakeIntensity = intensity;
    this.shakeDuration = duration;
    this.shakeTimer = duration;
  }

  setZoom(zoom) {
    this.targetZoom = clamp(zoom, 0.7, 1.5);
  }

  update(dt, playerPos, playerVelocity) {
    if (!playerPos) return;

    // Lead camera in movement direction
    const leadX = playerVelocity ? playerVelocity.x * this.leadAmount : 0;
    const leadZ = playerVelocity ? playerVelocity.z * this.leadAmount : 0;

    this.targetPosition.set(
      playerPos.x + leadX,
      0,
      playerPos.z + leadZ
    );

    // Smooth follow
    this.lookAtTarget.x = lerp(this.lookAtTarget.x, this.targetPosition.x, this.followSpeed * dt);
    this.lookAtTarget.z = lerp(this.lookAtTarget.z, this.targetPosition.z, this.followSpeed * dt);

    // Zoom
    this.currentZoom = lerp(this.currentZoom, this.targetZoom, 2 * dt);
    this.currentOffset.copy(this.baseOffset).multiplyScalar(this.currentZoom);

    // Camera position
    this.camera.position.x = lerp(this.camera.position.x, this.lookAtTarget.x + this.currentOffset.x, this.followSpeed * dt);
    this.camera.position.y = lerp(this.camera.position.y, this.lookAtTarget.y + this.currentOffset.y, this.followSpeed * dt);
    this.camera.position.z = lerp(this.camera.position.z, this.lookAtTarget.z + this.currentOffset.z, this.followSpeed * dt);

    // Screenshake
    if (this.shakeTimer > 0) {
      this.shakeTimer -= dt;
      const progress = this.shakeTimer / this.shakeDuration;
      const intensity = this.shakeIntensity * progress;
      this.shakeOffset.set(
        randomRange(-intensity, intensity),
        randomRange(-intensity, intensity) * 0.5,
        randomRange(-intensity, intensity)
      );
      this.camera.position.add(this.shakeOffset);
    }

    this.camera.lookAt(this.lookAtTarget);
  }
}
