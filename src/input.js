export class InputController {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.pressed = new Set();
    this.mouseDX = 0;
    this.mouseDY = 0;
    this.fireQueued = false;
    this.fireHeld = false;

    window.addEventListener('keydown', (event) => {
      if (!this.keys.has(event.code)) this.pressed.add(event.code);
      this.keys.add(event.code);
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) {
        event.preventDefault();
      }
    });
    window.addEventListener('keyup', (event) => this.keys.delete(event.code));
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.fireHeld = false;
    });
    window.addEventListener('mousemove', (event) => {
      if (document.pointerLockElement !== this.canvas) return;
      this.mouseDX += event.movementX;
      this.mouseDY += event.movementY;
    });
    window.addEventListener('mousedown', (event) => {
      if (event.button !== 0 || document.pointerLockElement !== this.canvas) return;
      this.fireHeld = true;
      this.fireQueued = true;
    });
    window.addEventListener('mouseup', (event) => {
      if (event.button === 0) this.fireHeld = false;
    });
  }

  down(...codes) {
    return codes.some((code) => this.keys.has(code));
  }

  consume(code) {
    const had = this.pressed.has(code);
    this.pressed.delete(code);
    return had;
  }

  consumeLook() {
    const result = { x: this.mouseDX, y: this.mouseDY };
    this.mouseDX = 0;
    this.mouseDY = 0;
    return result;
  }

  consumeFire() {
    const queued = this.fireQueued;
    this.fireQueued = false;
    return queued;
  }

  clearTransient() {
    this.pressed.clear();
    this.mouseDX = 0;
    this.mouseDY = 0;
    this.fireQueued = false;
  }
}
