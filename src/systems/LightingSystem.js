import * as THREE from 'three';

export class LightingSystem {
  constructor(scene) {
    this.scene = scene;
    this.muzzleFlashes = [];

    // Ambient — soft blue fill
    this.ambient = new THREE.AmbientLight(0x88aacc, 0.5);
    scene.add(this.ambient);

    // Main directional — warm afternoon sun
    this.sun = new THREE.DirectionalLight(0xffeedd, 1.2);
    this.sun.position.set(30, 40, 20);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.width = 2048;
    this.sun.shadow.mapSize.height = 2048;
    this.sun.shadow.camera.left = -60;
    this.sun.shadow.camera.right = 60;
    this.sun.shadow.camera.top = 60;
    this.sun.shadow.camera.bottom = -60;
    this.sun.shadow.camera.near = 1;
    this.sun.shadow.camera.far = 100;
    this.sun.shadow.bias = -0.001;
    scene.add(this.sun);

    // Hemisphere light — sky/ground
    this.hemi = new THREE.HemisphereLight(0x87ceeb, 0x556b2f, 0.4);
    scene.add(this.hemi);
  }

  addMuzzleFlash(position) {
    const light = new THREE.PointLight(0xffaa00, 3, 8);
    light.position.copy(position);
    light.position.y += 0.8;
    this.scene.add(light);
    this.muzzleFlashes.push({ light, timer: 0.06 });
  }

  updateSunPosition(playerPos) {
    if (playerPos) {
      this.sun.position.set(playerPos.x + 30, 40, playerPos.z + 20);
      this.sun.target.position.copy(playerPos);
      this.sun.target.updateMatrixWorld();
    }
  }

  update(dt) {
    for (let i = this.muzzleFlashes.length - 1; i >= 0; i--) {
      const flash = this.muzzleFlashes[i];
      flash.timer -= dt;
      if (flash.timer <= 0) {
        this.scene.remove(flash.light);
        flash.light.dispose();
        this.muzzleFlashes.splice(i, 1);
      } else {
        flash.light.intensity = 3 * (flash.timer / 0.06);
      }
    }
  }
}
