export class HUD {
  constructor() {
    this.scoreEl = document.getElementById('score-display');
    this.waveEl = document.getElementById('wave-display');
    this.weaponEl = document.getElementById('weapon-display');
    this.healthBar = document.getElementById('health-bar');
    this.grenadesEl = document.getElementById('grenades-display');
    this.comboEl = document.getElementById('combo-display');
    this.waveAnnounce = document.getElementById('wave-announce');
    this.crosshair = document.getElementById('crosshair');
    this.hudEl = document.getElementById('hud');

    this.popupContainer = document.createElement('div');
    this.popupContainer.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;overflow:hidden;';
    this.hudEl.appendChild(this.popupContainer);

    // Mission elements
    this.missionPanel = document.getElementById('mission-panel');
    this.missionLabel = document.getElementById('mission-label');
    this.missionDetail = document.getElementById('mission-detail');
    this.missionProgressWrap = document.getElementById('mission-progress-wrap');
    this.missionProgressBar = document.getElementById('mission-progress-bar');
    this.missionCompleteEl = document.getElementById('mission-complete-announce');
    this.missionCompleteTimer = 0;

    this.announceTimer = 0;
  }

  updateScore(score) {
    this.scoreEl.textContent = `SCORE: ${score.toLocaleString()}`;
  }

  updateWave(wave) {
    this.waveEl.textContent = `WAVE ${wave}`;
  }

  updateWeapon(text) {
    this.weaponEl.textContent = text;
  }

  updateHealth(hp, maxHp) {
    const pct = Math.max(0, (hp / maxHp) * 100);
    this.healthBar.style.width = `${pct}%`;

    if (pct < 25) {
      this.healthBar.style.background = 'linear-gradient(90deg, #a00, #f00)';
    } else if (pct < 50) {
      this.healthBar.style.background = 'linear-gradient(90deg, #a80, #fa0)';
    } else {
      this.healthBar.style.background = 'linear-gradient(90deg, #0a0, #0f0)';
    }
  }

  updateGrenades(count) {
    this.grenadesEl.textContent = `GRENADES: ${count}`;
  }

  updateCombo(combo) {
    if (combo > 1) {
      this.comboEl.textContent = `x${combo}`;
      this.comboEl.classList.add('active');
      this.comboEl.style.fontSize = `${Math.min(36 + combo * 2, 72)}px`;
    } else {
      this.comboEl.classList.remove('active');
    }
  }

  announceWave(waveNum) {
    this.waveAnnounce.textContent = `WAVE ${waveNum}`;
    this.waveAnnounce.style.opacity = '1';
    this.waveAnnounce.style.transform = 'translate(-50%, -50%) scale(1.5)';
    this.waveAnnounce.style.transition = 'none';

    requestAnimationFrame(() => {
      this.waveAnnounce.style.transition = 'all 0.5s ease-out';
      this.waveAnnounce.style.transform = 'translate(-50%, -50%) scale(1)';
    });

    this.announceTimer = 2;
  }

  showScorePopup(text, screenX, screenY) {
    const popup = document.createElement('div');
    popup.className = 'score-popup';
    popup.textContent = text;
    popup.style.left = `${screenX}px`;
    popup.style.top = `${screenY}px`;
    this.popupContainer.appendChild(popup);

    setTimeout(() => {
      popup.remove();
    }, 800);
  }

  showGameOver(score, kills, maxCombo, rank) {
    const overlay = document.createElement('div');
    overlay.id = 'game-over-overlay';
    overlay.style.cssText = `
      position:absolute; top:0; left:0; width:100%; height:100%;
      background:rgba(0,0,0,0.8); display:flex; flex-direction:column;
      align-items:center; justify-content:center; color:#f00;
      font-family:monospace; pointer-events:all; z-index:50;
    `;
    overlay.innerHTML = `
      <h1 style="font-size:64px; text-shadow:0 0 30px #f00; margin-bottom:20px;">MISSION FAILED</h1>
      <div style="color:#0f0; font-size:24px; margin:8px;">SCORE: ${score.toLocaleString()}</div>
      <div style="color:#0f0; font-size:24px; margin:8px;">KILLS: ${kills}</div>
      <div style="color:#0f0; font-size:24px; margin:8px;">MAX COMBO: x${maxCombo}</div>
      <div style="color:#fa0; font-size:48px; margin:20px;">RANK: ${rank}</div>
      <button id="retry-btn" onclick="location.reload()" style="
        margin-top:30px; padding:15px 40px; font-size:24px;
        background:transparent; border:2px solid #0f0; color:#0f0;
        cursor:pointer; font-family:monospace;
      ">RETRY</button>
      <div style="color:#070; font-size:13px; margin-top:12px; font-family:monospace;">
        Press A or ENTER to retry
      </div>
    `;
    this.hudEl.appendChild(overlay);
  }

  updateCrosshair(x, y) {
    this.crosshair.style.left = `${x}px`;
    this.crosshair.style.top = `${y}px`;
  }

  updateMission(missionInfo, distance) {
    if (!missionInfo) {
      this.missionPanel.style.display = 'none';
      return;
    }

    this.missionPanel.style.display = 'block';
    this.missionPanel.style.borderColor = `#${missionInfo.color.toString(16).padStart(6, '0')}80`;
    this.missionLabel.textContent = missionInfo.label;
    this.missionLabel.style.color = `#${missionInfo.color.toString(16).padStart(6, '0')}`;

    if (distance >= 0) {
      this.missionDetail.textContent = `${Math.round(distance)}m | +${missionInfo.points} pts`;
    }

    if (missionInfo.holdTime > 0 && missionInfo.holdProgress > 0) {
      this.missionProgressWrap.style.display = 'block';
      const pct = Math.min(100, (missionInfo.holdProgress / missionInfo.holdTime) * 100);
      this.missionProgressBar.style.width = `${pct}%`;
      this.missionProgressBar.style.background = `#${missionInfo.color.toString(16).padStart(6, '0')}`;
    } else {
      this.missionProgressWrap.style.display = 'none';
    }
  }

  announceMissionComplete(label, points) {
    this.missionCompleteEl.textContent = `${label} +${points}`;
    this.missionCompleteEl.style.opacity = '1';
    this.missionCompleteEl.style.transform = 'translate(-50%, -50%) scale(1.3)';
    this.missionCompleteEl.style.transition = 'none';

    requestAnimationFrame(() => {
      this.missionCompleteEl.style.transition = 'all 0.4s ease-out';
      this.missionCompleteEl.style.transform = 'translate(-50%, -50%) scale(1)';
    });

    this.missionCompleteTimer = 2;
  }

  hideMission() {
    this.missionPanel.style.display = 'none';
  }

  update(dt) {
    if (this.announceTimer > 0) {
      this.announceTimer -= dt;
      if (this.announceTimer <= 0) {
        this.waveAnnounce.style.transition = 'opacity 0.5s';
        this.waveAnnounce.style.opacity = '0';
      }
    }

    if (this.missionCompleteTimer > 0) {
      this.missionCompleteTimer -= dt;
      if (this.missionCompleteTimer <= 0) {
        this.missionCompleteEl.style.transition = 'opacity 0.5s';
        this.missionCompleteEl.style.opacity = '0';
      }
    }
  }
}
