import * as THREE from 'three';
import { InputManager } from '../systems/InputManager.js';
import { CameraSystem } from '../systems/CameraSystem.js';
import { ParticleSystem } from '../systems/ParticleSystem.js';
import { JuiceSystem } from '../systems/JuiceSystem.js';
import { AudioManager } from '../systems/AudioManager.js';
import { CollisionSystem } from '../systems/CollisionSystem.js';
import { LightingSystem } from '../systems/LightingSystem.js';
import { Player } from './Player.js';
import { WeaponSystem } from './WeaponSystem.js';
import { GrenadeSystem } from './GrenadeSystem.js';
import { EnemyManager } from './EnemyManager.js';
import { ScoreManager } from './ScoreManager.js';
import { SuburbanBlock } from '../world/SuburbanBlock.js';
import { HUD } from '../ui/HUD.js';

export class Game {
  constructor() {
    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.setClearColor(0x87ceeb); // sky blue
    document.getElementById('game-container').prepend(this.renderer.domElement);

    // Scene
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0x87ceeb, 60, 120);

    // Systems
    this.input = new InputManager();
    this.cameraSystem = new CameraSystem();
    this.collision = new CollisionSystem();
    this.lighting = new LightingSystem(this.scene);
    this.particles = new ParticleSystem(this.scene);
    this.juice = new JuiceSystem(this.cameraSystem);
    this.audio = new AudioManager();
    this.hud = new HUD();
    this.scoreManager = new ScoreManager();

    // Game objects
    this.player = new Player(this.scene);
    this.weaponSystem = new WeaponSystem(
      this.scene, this.collision, this.audio,
      this.particles, this.lighting, this.juice
    );
    this.grenadeSystem = new GrenadeSystem(this.scene, this.particles, this.audio, this.juice);
    this.enemyManager = new EnemyManager(this.scene, this.particles, this.audio, this.juice);

    // World
    this.world = new SuburbanBlock(this.scene, this.collision);
    this.world.build();

    // State
    this.state = 'idle'; // idle, playing, wavePause, gameOver
    this.wave = 0;
    this.wavePauseTimer = 0;
    this.clock = new THREE.Clock();

    // Resize
    window.addEventListener('resize', () => {
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // Fullscreen
    window.addEventListener('keydown', (e) => {
      if (e.key === 'F11') {
        e.preventDefault();
        document.body.requestFullscreen?.();
      }
    });

    // Weapon switch with scroll
    window.addEventListener('wheel', (e) => {
      if (this.state !== 'playing') return;
      this.weaponSystem.switchWeapon(e.deltaY > 0 ? 1 : -1);
    });

    // Weapon switch with number keys
    window.addEventListener('keydown', (e) => {
      if (this.state !== 'playing') return;
      if (e.code === 'Digit1') { this.weaponSystem.currentIndex = 0; this.weaponSystem.currentWeapon = this.weaponSystem.unlockedWeapons[0]; }
      if (e.code === 'Digit2' && this.weaponSystem.unlockedWeapons.length > 1) { this.weaponSystem.currentIndex = 1; this.weaponSystem.currentWeapon = this.weaponSystem.unlockedWeapons[1]; }
      if (e.code === 'Digit3' && this.weaponSystem.unlockedWeapons.length > 2) { this.weaponSystem.currentIndex = 2; this.weaponSystem.currentWeapon = this.weaponSystem.unlockedWeapons[2]; }
    });

    // Toggle controls overlay with H
    this.controlsOverlay = document.getElementById('controls-overlay');
    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyH') {
        this.controlsOverlay.classList.toggle('hidden');
      }
    });

    // Version display
    document.getElementById('version-display').textContent = `v${__APP_VERSION__}`;
  }

  start() {
    this.audio.init();
    this.state = 'playing';
    this.wave = 1;
    this.hud.announceWave(this.wave);
    this.enemyManager.startWave(this.wave);
    this.clock.start();
    this._loop();
  }

  _loop() {
    requestAnimationFrame(() => this._loop());

    const rawDt = Math.min(this.clock.getDelta(), 0.05);

    // Apply juice time scale
    this.juice.update(rawDt);
    const dt = rawDt * this.juice.getTimeScale();

    this.input.update();

    if (this.state === 'playing') {
      this._updatePlaying(dt, rawDt);
    } else if (this.state === 'wavePause') {
      this._updateWavePause(dt, rawDt);
    }

    // Always update these
    this.particles.update(rawDt);
    this.lighting.update(rawDt);
    this.cameraSystem.update(rawDt, this.player.position, this.player.velocity);
    this.lighting.updateSunPosition(this.player.position);
    this.hud.update(rawDt);

    // Render
    this.renderer.render(this.scene, this.cameraSystem.camera);
  }

  _updatePlaying(dt, rawDt) {
    // Player
    this.player.update(dt, this.input, this.cameraSystem.camera, this.collision);

    // Dash
    if (this.input.isDashing()) {
      this.player.dash(this.input.getMovementVector(), this.audio);
    }

    // Shooting
    if (this.input.isShooting() && !this.player.sprinting) {
      this.weaponSystem.fire(this.player.getFireOrigin(), this.player.aimDirection);
    }

    // Reload
    if (this.input.isReloading()) {
      this.weaponSystem.reload();
    }

    // Grenades
    if (this.input.isThrowingGrenade()) {
      this.grenadeSystem.throw(this.player.position, this.player.aimDirection);
    }

    // Update systems
    const allEnemies = this.enemyManager.enemies.filter(e => e.alive);
    this.weaponSystem.update(dt, allEnemies);
    this.grenadeSystem.update(dt, allEnemies);
    this.enemyManager.update(dt, this.player.position, this.player, this.scoreManager);
    this.scoreManager.update(dt);

    // Dynamic camera zoom based on enemy count
    const nearbyEnemies = allEnemies.filter(e => {
      const dx = e.position.x - this.player.position.x;
      const dz = e.position.z - this.player.position.z;
      return dx * dx + dz * dz < 400; // within 20m
    });
    const zoomTarget = 1.0 + Math.min(nearbyEnemies.length / 30, 0.3);
    this.cameraSystem.setZoom(zoomTarget);

    // Slowmo on last kill in wave
    if (this.enemyManager.spawnQueue.length === 0 &&
        this.enemyManager.getAliveCount() === 1) {
      // Don't trigger slowmo yet, wait for the kill
    }

    // HUD updates
    this.hud.updateScore(this.scoreManager.score);
    this.hud.updateCombo(this.scoreManager.combo);
    this.hud.updateWeapon(this.weaponSystem.getAmmoDisplay());
    this.hud.updateHealth(this.player.hp, this.player.maxHp);
    this.hud.updateGrenades(this.grenadeSystem.count);
    this.hud.updateCrosshair(this.input.mouseX, this.input.mouseY);

    // Score popups
    for (const popup of this.scoreManager.popups) {
      if (popup.timer > 0.75) { // just spawned
        const worldPos = new THREE.Vector3(popup.x, 1.5, popup.z);
        worldPos.project(this.cameraSystem.camera);
        const screenX = (worldPos.x * 0.5 + 0.5) * window.innerWidth;
        const screenY = (-worldPos.y * 0.5 + 0.5) * window.innerHeight;
        this.hud.showScorePopup(popup.text, screenX, screenY);
      }
    }

    // Wave check
    if (this.enemyManager.isWaveComplete()) {
      // Slowmo for wave end
      this.juice.slowmo(0.8, 0.2);
      this.state = 'wavePause';
      this.wavePauseTimer = 4;
    }

    // Game over
    if (!this.player.alive) {
      this.state = 'gameOver';
      this.enemyManager.clearAll();
      this.hud.showGameOver(
        this.scoreManager.score,
        this.scoreManager.kills,
        this.scoreManager.maxCombo,
        this.scoreManager.getRank()
      );
    }
  }

  _updateWavePause(dt, rawDt) {
    this.player.update(dt, this.input, this.cameraSystem.camera, this.collision);

    this.wavePauseTimer -= rawDt;
    if (this.wavePauseTimer <= 0) {
      this.wave++;
      this.state = 'playing';
      this.hud.announceWave(this.wave);
      this.hud.updateWave(this.wave);
      this.enemyManager.startWave(this.wave);

      // Heal player a bit between waves
      this.player.heal(20);
      // Add grenades
      this.grenadeSystem.addGrenades(1);
    }
  }
}
