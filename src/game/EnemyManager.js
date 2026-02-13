import * as THREE from 'three';
import { Drone } from './enemies/Drone.js';
import { Spitter } from './enemies/Spitter.js';
import { Brute } from './enemies/Brute.js';
import { Bomber } from './enemies/Bomber.js';
import { randomRange } from '../utils/MathUtils.js';

export class EnemyManager {
  constructor(scene, particles, audio, juice) {
    this.scene = scene;
    this.particles = particles;
    this.audio = audio;
    this.juice = juice;

    this.enemies = [];
    this.maxEnemies = 50;

    // Pre-create enemy pools
    this.pools = {
      drone: [],
      spitter: [],
      brute: [],
      bomber: []
    };

    for (let i = 0; i < 30; i++) {
      this.pools.drone.push(new Drone(scene));
    }
    for (let i = 0; i < 8; i++) {
      this.pools.spitter.push(new Spitter(scene));
    }
    for (let i = 0; i < 4; i++) {
      this.pools.brute.push(new Brute(scene));
    }
    for (let i = 0; i < 8; i++) {
      this.pools.bomber.push(new Bomber(scene));
    }

    // Wave system
    this.wave = 0;
    this.waveTimer = 0;
    this.wavePause = 5; // seconds between waves
    this.waveActive = false;
    this.enemiesRemainingInWave = 0;
    this.spawnTimer = 0;
    this.spawnQueue = [];

    // Spawn points (edges of the map)
    this.spawnRadius = 45;
  }

  _getFromPool(type) {
    const pool = this.pools[type];
    if (!pool) return null;
    for (const e of pool) {
      if (!e.alive) return e;
    }
    return null;
  }

  _getSpawnPos(playerPos) {
    // Spawn at edges, away from player
    const angle = Math.random() * Math.PI * 2;
    const dist = this.spawnRadius + randomRange(-5, 5);
    let x = playerPos.x + Math.cos(angle) * dist;
    let z = playerPos.z + Math.sin(angle) * dist;
    // Clamp to level bounds
    x = Math.max(-55, Math.min(55, x));
    z = Math.max(-45, Math.min(45, z));
    return { x, z };
  }

  spawnEnemy(type, x, z) {
    const enemy = this._getFromPool(type);
    if (!enemy) return null;
    enemy.spawn(x, z);
    if (!this.enemies.includes(enemy)) {
      this.enemies.push(enemy);
    }
    return enemy;
  }

  startWave(waveNum) {
    this.wave = waveNum;
    this.waveActive = true;
    this.spawnQueue = [];

    // Wave composition — gentler scaling for mission-based gameplay
    const droneCount = 3 + waveNum * 2;
    const spitterCount = waveNum >= 2 ? Math.floor(waveNum * 0.7) : 0;
    const bruteCount = waveNum >= 4 ? Math.max(1, Math.floor((waveNum - 3) * 0.5)) : 0;
    const bomberCount = waveNum >= 3 ? Math.max(1, Math.floor((waveNum - 2) * 0.5)) : 0;

    for (let i = 0; i < droneCount; i++) this.spawnQueue.push('drone');
    for (let i = 0; i < spitterCount; i++) this.spawnQueue.push('spitter');
    for (let i = 0; i < bruteCount; i++) this.spawnQueue.push('brute');
    for (let i = 0; i < bomberCount; i++) this.spawnQueue.push('bomber');

    // Shuffle
    for (let i = this.spawnQueue.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.spawnQueue[i], this.spawnQueue[j]] = [this.spawnQueue[j], this.spawnQueue[i]];
    }

    this.enemiesRemainingInWave = this.spawnQueue.length;
    this.spawnTimer = 0;
  }

  getAliveCount() {
    let count = 0;
    for (const e of this.enemies) {
      if (e.alive) count++;
    }
    return count;
  }

  update(dt, playerPos, player, scoreManager) {
    // Spawn from queue
    if (this.spawnQueue.length > 0) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        const type = this.spawnQueue.shift();
        const pos = this._getSpawnPos(playerPos);
        this.spawnEnemy(type, pos.x, pos.z);
        // Stagger spawns: drones faster, brutes slower
        this.spawnTimer = type === 'drone' ? 0.3 : type === 'brute' ? 1.5 : 0.6;
      }
    }

    // Get all active drones for flock behavior
    const drones = this.enemies.filter(e => e.type === 'drone' && e.alive);

    // Update all enemies
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;

      let attack;
      if (enemy.type === 'drone') {
        attack = enemy.update(dt, playerPos, drones);
      } else {
        attack = enemy.update(dt, playerPos);
      }

      // Handle attacks on player
      if (attack) {
        if (attack.type === 'melee' || attack.type === 'explosion') {
          player.takeDamage(attack.damage);
          this.audio.playHit();
          this.juice.screenshake(attack.type === 'explosion' ? 0.4 : 0.15);

          if (attack.type === 'explosion') {
            this.particles.explode(enemy.mesh.position || enemy.position, { intensity: 1.5 });
            this.audio.playExplosion(1.0);
          }
        }
      }

      // Spitter projectile hits
      if (enemy.type === 'spitter' && enemy.alive) {
        const dmg = enemy.checkProjectileHits(playerPos);
        if (dmg > 0) {
          player.takeDamage(dmg);
          this.audio.playHit();
          this.juice.screenshake(0.1);
        }
      }
    }

    // Check dead enemies
    for (const enemy of this.enemies) {
      if (enemy.alive) continue;
      if (enemy.deathProcessed) continue;

      // Mark as processed so we only score once
      enemy.deathProcessed = true;

      // Death effects
      const pos = enemy.mesh.position || enemy.position;
      if (pos) {
        if (enemy.type === 'bomber' && enemy.exploded) {
          this.particles.explode(pos, { intensity: 1.5 });
          this.audio.playExplosion(1.0);
          this.juice.screenshake(0.3);
        } else {
          this.particles.alienDeath(pos);
          this.audio.playAlienDeath();
        }
        scoreManager.addKill(enemy.scoreValue, pos);
      }
    }

    // Check wave completion
    if (this.waveActive && this.spawnQueue.length === 0 && this.getAliveCount() === 0) {
      this.waveActive = false;
    }
  }

  isWaveComplete() {
    return !this.waveActive && this.spawnQueue.length === 0 && this.getAliveCount() === 0;
  }

  clearAll() {
    for (const enemy of this.enemies) {
      enemy.deactivate();
    }
  }
}
