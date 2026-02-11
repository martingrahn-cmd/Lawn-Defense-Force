export class InputManager {
  constructor() {
    this.keys = {};
    this.mouseX = 0;
    this.mouseY = 0;
    this.mouseDown = false;
    this.rightMouseDown = false;
    this.justPressed = {};
    this._prevKeys = {};

    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
    });
    window.addEventListener('keyup', (e) => {
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
    for (const key in this.keys) {
      this.justPressed[key] = this.keys[key] && !this._prevKeys[key];
    }
    this._prevKeys = { ...this.keys };
  }

  isDown(code) {
    return !!this.keys[code];
  }

  wasPressed(code) {
    return !!this.justPressed[code];
  }

  getMovementVector() {
    let x = 0, z = 0;
    if (this.isDown('KeyW') || this.isDown('ArrowUp')) z -= 1;
    if (this.isDown('KeyS') || this.isDown('ArrowDown')) z += 1;
    if (this.isDown('KeyA') || this.isDown('ArrowLeft')) x -= 1;
    if (this.isDown('KeyD') || this.isDown('ArrowRight')) x += 1;
    const len = Math.sqrt(x * x + z * z);
    if (len > 0) { x /= len; z /= len; }
    return { x, z };
  }

  isSprinting() {
    return this.isDown('ShiftLeft') || this.isDown('ShiftRight');
  }

  isDashing() {
    return this.wasPressed('Space');
  }

  isReloading() {
    return this.wasPressed('KeyR');
  }

  isThrowingGrenade() {
    return this.wasPressed('KeyG');
  }

  isShooting() {
    return this.mouseDown;
  }
}
