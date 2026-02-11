export class JuiceSystem {
  constructor(cameraSystem) {
    this.camera = cameraSystem;
    this.timeScale = 1.0;
    this.targetTimeScale = 1.0;
    this.hitstopTimer = 0;
    this.slowmoTimer = 0;
    this.slowmoDuration = 0;
  }

  screenshake(intensity) {
    this.camera.shake(intensity, 0.15 + intensity * 0.1);
  }

  hitstop(duration = 0.04) {
    this.hitstopTimer = duration;
    this.timeScale = 0;
  }

  slowmo(duration = 0.5, scale = 0.3) {
    this.slowmoTimer = duration;
    this.slowmoDuration = duration;
    this.targetTimeScale = scale;
  }

  update(dt) {
    // Hitstop
    if (this.hitstopTimer > 0) {
      this.hitstopTimer -= dt;
      if (this.hitstopTimer <= 0) {
        this.timeScale = this.targetTimeScale;
      }
      return;
    }

    // Slowmo
    if (this.slowmoTimer > 0) {
      this.slowmoTimer -= dt;
      const progress = 1 - (this.slowmoTimer / this.slowmoDuration);
      this.timeScale = this.targetTimeScale + (1 - this.targetTimeScale) * progress;
      if (this.slowmoTimer <= 0) {
        this.timeScale = 1.0;
        this.targetTimeScale = 1.0;
      }
    } else {
      this.timeScale = 1.0;
    }
  }

  getTimeScale() {
    return this.timeScale;
  }
}
