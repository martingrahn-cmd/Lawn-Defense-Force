export class ScoreManager {
  constructor() {
    this.score = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.comboDuration = 2.0;
    this.maxCombo = 0;
    this.kills = 0;
    this.popups = [];
  }

  addKill(baseScore, position) {
    this.kills++;
    this.combo++;
    this.comboTimer = this.comboDuration;
    if (this.combo > this.maxCombo) this.maxCombo = this.combo;

    const multiplier = Math.min(1 + (this.combo - 1) * 0.1, 5);
    const points = Math.floor(baseScore * multiplier);
    this.score += points;

    // Create popup
    if (position) {
      this.popups.push({
        text: `+${points}`,
        x: position.x,
        z: position.z,
        timer: 0.8
      });
    }

    return points;
  }

  addScore(points) {
    this.score += points;
  }

  update(dt) {
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) {
        this.combo = 0;
      }
    }

    // Update popups
    for (let i = this.popups.length - 1; i >= 0; i--) {
      this.popups[i].timer -= dt;
      if (this.popups[i].timer <= 0) {
        this.popups.splice(i, 1);
      }
    }
  }

  getRank() {
    if (this.score >= 50000) return 'S';
    if (this.score >= 30000) return 'A';
    if (this.score >= 15000) return 'B';
    if (this.score >= 5000) return 'C';
    return 'D';
  }

  reset() {
    this.score = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.maxCombo = 0;
    this.kills = 0;
    this.popups = [];
  }
}
