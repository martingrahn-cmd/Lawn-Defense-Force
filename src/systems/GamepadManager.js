export class GamepadManager {
  constructor() {
    this.gamepadIndex = null;
    this.deadzone = 0.15;
    this.minButtons = 2; // Filter out USB devices with fewer than 2 buttons

    // Snapshotted state
    this._buttons = [];
    this._prevButtons = [];
    this._axes = [];

    window.addEventListener('gamepadconnected', (e) => {
      const gp = e.gamepad;
      if (gp.buttons.length < this.minButtons) {
        console.log(`Ignored device (too few buttons): ${gp.id}`);
        return;
      }
      this.gamepadIndex = gp.index;
      console.log(`Gamepad connected: ${gp.id} (${gp.buttons.length} buttons, ${gp.axes.length} axes)`);
    });

    window.addEventListener('gamepaddisconnected', (e) => {
      if (e.gamepad.index === this.gamepadIndex) {
        console.log(`Gamepad disconnected: ${e.gamepad.id}`);
        this.gamepadIndex = null;
        this._buttons = [];
        this._prevButtons = [];
        this._axes = [];
      }
    });
  }

  update() {
    // Save previous state
    this._prevButtons = [...this._buttons];

    if (this.gamepadIndex === null) {
      this._buttons = [];
      this._axes = [];
      return;
    }

    const gamepads = navigator.getGamepads();
    const gp = gamepads[this.gamepadIndex];

    if (!gp) {
      this._buttons = [];
      this._axes = [];
      return;
    }

    // Snapshot button states
    this._buttons = gp.buttons.map(b => b.pressed);
    this._buttonValues = gp.buttons.map(b => b.value);
    this._axes = [...gp.axes];
  }

  isConnected() {
    return this.gamepadIndex !== null && this._buttons.length > 0;
  }

  _applyDeadzone(value) {
    return Math.abs(value) < this.deadzone ? 0 : value;
  }

  getLeftStick() {
    if (this._axes.length < 2) return { x: 0, z: 0 };
    let x = this._applyDeadzone(this._axes[0]);
    let z = this._applyDeadzone(this._axes[1]);
    const len = Math.sqrt(x * x + z * z);
    if (len > 1) { x /= len; z /= len; }
    return { x, z };
  }

  getRightStick() {
    if (this._axes.length < 4) return { x: 0, z: 0 };
    let x = this._applyDeadzone(this._axes[2]);
    let z = this._applyDeadzone(this._axes[3]);
    return { x, z };
  }

  isButtonDown(index) {
    return !!this._buttons[index];
  }

  wasButtonPressed(index) {
    return !!this._buttons[index] && !this._prevButtons[index];
  }

  getButtonValue(index) {
    return this._buttonValues ? (this._buttonValues[index] || 0) : 0;
  }

  // Standard gamepad mapping:
  // RT (7) = Shoot (analog trigger)
  isShooting() { return this.getButtonValue(7) > 0.1; }
  // A (0) = Dash
  isDashing() { return this.wasButtonPressed(0); }
  // X (2) = Reload
  isReloading() { return this.wasButtonPressed(2); }
  // LB (4) = Grenade
  isThrowingGrenade() { return this.wasButtonPressed(4); }
  // Y (3) = Weapon next
  isWeaponNext() { return this.wasButtonPressed(3); }
  // RB (5) = Weapon prev
  isWeaponPrev() { return this.wasButtonPressed(5); }
  // L3 (10) = Sprint
  isSprinting() { return this.isButtonDown(10); }
}
