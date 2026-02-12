import { GamepadManager } from './GamepadManager.js';

export class InputManager {
  constructor() {
    this.keys = {};
    this.mouseX = 0;
    this.mouseY = 0;
    this.mouseDown = false;
    this.rightMouseDown = false;
    this.justPressed = {};
    this._prevKeys = {};

    // Gamepad
    this.gamepad = new GamepadManager();

    // Game keys that should not trigger browser defaults
    this._gameKeys = new Set([
      'KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyR', 'KeyG',
      'Space', 'ShiftLeft', 'ShiftRight',
      'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
      'Digit1', 'Digit2', 'Digit3'
    ]);

    window.addEventListener('keydown', (e) => {
      if (this._gameKeys.has(e.code)) e.preventDefault();
      this.keys[e.code] = true;
    });
    window.addEventListener('keyup', (e) => {
      if (this._gameKeys.has(e.code)) e.preventDefault();
      this.keys[e.code] = false;
    });
    window.addEventListener('mousemove', (e) => {
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;
    });
    window.addEventListener('mousedown', (e) => {
      if (e.button === 0) this.mouseDown = true;
      if (e.button === 2) this.rightMouseDown = true;
    });
    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.mouseDown = false;
      if (e.button === 2) this.rightMouseDown = false;
    });
    window.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  update() {
    // Keyboard just-pressed detection
    for (const key in this.keys) {
      this.justPressed[key] = this.keys[key] && !this._prevKeys[key];
    }
    this._prevKeys = { ...this.keys };

    // Poll gamepad
    this.gamepad.update();
  }

  isDown(code) {
    return !!this.keys[code];
  }

  wasPressed(code) {
    return !!this.justPressed[code];
  }

  getMovementVector() {
    let x = 0, z = 0;

    // Keyboard
    if (this.isDown('KeyW') || this.isDown('ArrowUp')) z -= 1;
    if (this.isDown('KeyS') || this.isDown('ArrowDown')) z += 1;
    if (this.isDown('KeyA') || this.isDown('ArrowLeft')) x -= 1;
    if (this.isDown('KeyD') || this.isDown('ArrowRight')) x += 1;

    // Gamepad left stick (merge with keyboard)
    const gp = this.gamepad.getLeftStick();
    x += gp.x;
    z += gp.z;

    const len = Math.sqrt(x * x + z * z);
    if (len > 1) { x /= len; z /= len; }
    return { x, z };
  }

  // Returns aim vector from right stick, or null if not aiming with gamepad
  getAimVector() {
    const stick = this.gamepad.getRightStick();
    const len = Math.sqrt(stick.x * stick.x + stick.z * stick.z);
    if (len < 0.3) return null;
    return { x: stick.x / len, z: stick.z / len };
  }

  isSprinting() {
    return this.isDown('ShiftLeft') || this.isDown('ShiftRight')
      || this.gamepad.isSprinting();
  }

  isDashing() {
    return this.wasPressed('Space') || this.gamepad.isDashing();
  }

  isReloading() {
    return this.wasPressed('KeyR') || this.gamepad.isReloading();
  }

  isThrowingGrenade() {
    return this.wasPressed('KeyG') || this.gamepad.isThrowingGrenade();
  }

  isShooting() {
    return this.mouseDown || this.gamepad.isShooting();
  }

  isWeaponNext() {
    return this.gamepad.isWeaponNext();
  }

  isWeaponPrev() {
    return this.gamepad.isWeaponPrev();
  }

  isGamepadActive() {
    return this.gamepad.isConnected();
  }
}
