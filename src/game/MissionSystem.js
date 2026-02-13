import * as THREE from 'three';
import { randomRange } from '../utils/MathUtils.js';

const MISSION_TEMPLATES = [
  { id: 'rescue_cat', label: 'RESCUE THE CAT', points: 500, holdTime: 0, color: 0xffaa00 },
  { id: 'rescue_neighbor', label: 'SAVE THE NEIGHBOR', points: 750, holdTime: 3, color: 0x00aaff },
  { id: 'fetch_package', label: 'GRAB THE PACKAGE', points: 500, holdTime: 0, color: 0xddaa44 },
  { id: 'fetch_toolbox', label: 'FIND THE TOOLBOX', points: 600, holdTime: 0, color: 0xff4444 },
  { id: 'defend_grill', label: 'DEFEND THE GRILL', points: 1000, holdTime: 5, color: 0xff6600 },
  { id: 'rescue_dog', label: 'RESCUE THE DOG', points: 500, holdTime: 0, color: 0xeebb44 },
  { id: 'fetch_keys', label: 'FIND THE KEYS', points: 400, holdTime: 0, color: 0xcccccc },
  { id: 'defend_car', label: 'DEFEND THE CAR', points: 900, holdTime: 4, color: 0x4488ff },
];

export class MissionSystem {
  constructor(scene) {
    this.scene = scene;
    this.currentMission = null;
    this.marker = null;
    this.diamond = null;
    this.completed = false;
    this.holdProgress = 0;
    this.missionHistory = [];
    this.elapsedTime = 0;

    // Direction arrow that follows the player
    this.dirArrow = this._createDirectionArrow();
    this.dirArrow.visible = false;
  }

  _createDirectionArrow() {
    const group = new THREE.Group();

    // Arrow cone — pushed far from the player so it won't overlap the weapon
    const coneGeo = new THREE.ConeGeometry(0.3, 0.7, 4);
    const coneMat = new THREE.MeshBasicMaterial({
      color: 0xffaa00,
      transparent: true,
      opacity: 0.85,
      depthTest: false
    });
    const cone = new THREE.Mesh(coneGeo, coneMat);
    cone.rotation.x = Math.PI / 2; // point along Z
    cone.position.z = 5.0;
    cone.renderOrder = 999;
    group.add(cone);

    // Shaft
    const shaftGeo = new THREE.BoxGeometry(0.1, 0.1, 1.0);
    const shaft = new THREE.Mesh(shaftGeo, coneMat);
    shaft.position.z = 4.2;
    shaft.renderOrder = 999;
    group.add(shaft);

    group.position.y = 0.5;
    this.scene.add(group);
    return group;
  }

  startMission(waveNum) {
    this.clearMission();

    // Pick a random mission, avoid repeating the last one
    const lastId = this.missionHistory.length > 0
      ? this.missionHistory[this.missionHistory.length - 1]
      : null;
    let available = MISSION_TEMPLATES.filter(m => m.id !== lastId);
    const template = available[Math.floor(Math.random() * available.length)];

    // Random position in yards (avoid road area z: -7 to 7)
    let x = randomRange(-40, 40);
    let z = randomRange(-30, 30);
    if (Math.abs(z) < 8) {
      z = z > 0 ? z + 10 : z - 10;
    }

    this.currentMission = {
      ...template,
      x,
      z,
      active: true
    };
    this.completed = false;
    this.holdProgress = 0;
    this.elapsedTime = 0;
    this.missionHistory.push(template.id);

    this._createMarker(x, z, template.color);
    return this.currentMission;
  }

  _createMarker(x, z, color) {
    this.marker = new THREE.Group();

    // Pillar of light
    const pillarGeo = new THREE.CylinderGeometry(0.3, 0.6, 10, 8);
    const pillarMat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.15
    });
    const pillar = new THREE.Mesh(pillarGeo, pillarMat);
    pillar.position.y = 5;
    this.marker.add(pillar);

    // Floating diamond
    const diamondGeo = new THREE.OctahedronGeometry(0.5);
    const diamondMat = new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.8
    });
    this.diamond = new THREE.Mesh(diamondGeo, diamondMat);
    this.diamond.position.y = 2;
    this.marker.add(this.diamond);

    // Ground ring
    const ringGeo = new THREE.TorusGeometry(1.5, 0.08, 8, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.6
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.05;
    this.marker.add(ring);

    // Point light
    const light = new THREE.PointLight(color, 2, 12);
    light.position.y = 2;
    this.marker.add(light);

    this.marker.position.set(x, 0, z);
    this.scene.add(this.marker);
  }

  update(dt, playerPos) {
    if (!this.currentMission || this.completed) {
      this.dirArrow.visible = false;
      return null;
    }

    this.elapsedTime += dt;

    // Animate marker
    if (this.marker && this.diamond) {
      this.diamond.rotation.y += dt * 2;
      this.diamond.position.y = 2 + Math.sin(this.elapsedTime * 3) * 0.3;
    }

    // Update direction arrow — follow player, point towards objective
    const toDx = this.currentMission.x - playerPos.x;
    const toDz = this.currentMission.z - playerPos.z;
    const angle = Math.atan2(toDx, toDz);
    this.dirArrow.position.x = playerPos.x;
    this.dirArrow.position.z = playerPos.z;
    this.dirArrow.rotation.y = angle;
    this.dirArrow.visible = true;

    // Fade arrow opacity based on distance — hide when very close
    const toDist = Math.sqrt(toDx * toDx + toDz * toDz);
    const arrowOpacity = toDist < 5 ? 0.15 : 0.85;
    this.dirArrow.children.forEach(c => {
      if (c.material) c.material.opacity = arrowOpacity;
    });

    // Check proximity
    const dx = playerPos.x - this.currentMission.x;
    const dz = playerPos.z - this.currentMission.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist < 2.5) {
      if (this.currentMission.holdTime > 0) {
        this.holdProgress += dt;
        if (this.holdProgress >= this.currentMission.holdTime) {
          return this._completeMission();
        }
        return {
          type: 'progress',
          progress: this.holdProgress / this.currentMission.holdTime
        };
      } else {
        return this._completeMission();
      }
    } else {
      // Slowly lose hold progress if player leaves
      this.holdProgress = Math.max(0, this.holdProgress - dt * 0.5);
    }

    return null;
  }

  _completeMission() {
    this.completed = true;
    this.currentMission.active = false;
    this.dirArrow.visible = false;

    // Remove marker
    if (this.marker) {
      this.scene.remove(this.marker);
      this.marker = null;
      this.diamond = null;
    }

    return {
      type: 'complete',
      points: this.currentMission.points,
      label: this.currentMission.label
    };
  }

  clearMission() {
    this.completed = false;
    this.currentMission = null;
    this.holdProgress = 0;
    this.dirArrow.visible = false;
    if (this.marker) {
      this.scene.remove(this.marker);
      this.marker = null;
      this.diamond = null;
    }
  }

  getMissionInfo() {
    if (!this.currentMission || this.completed) return null;
    return {
      label: this.currentMission.label,
      x: this.currentMission.x,
      z: this.currentMission.z,
      holdTime: this.currentMission.holdTime,
      holdProgress: this.holdProgress,
      points: this.currentMission.points,
      color: this.currentMission.color
    };
  }

  getDistanceTo(playerPos) {
    if (!this.currentMission || this.completed) return -1;
    const dx = playerPos.x - this.currentMission.x;
    const dz = playerPos.z - this.currentMission.z;
    return Math.sqrt(dx * dx + dz * dz);
  }
}
