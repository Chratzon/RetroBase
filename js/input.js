// Eingabe: Tastatur, Maus/Touch (On-Screen-Tasten) und Gamepad (Standard-Mapping).
// Jede Quelle liefert einen eigenen Zustand; der Gesamtzustand ist die Vereinigung aller Quellen.

const BUTTONS = ['up', 'down', 'left', 'right', 'a', 'b', 'start', 'select'];

const KEY_MAP = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  KeyX: 'a',
  KeyZ: 'b',
  Enter: 'start',
  ShiftLeft: 'select',
  ShiftRight: 'select',
  Backspace: 'select',
};

const emptyState = () => Object.fromEntries(BUTTONS.map((b) => [b, false]));

export function createInput({ onChange, onSource }) {
  const sources = { keyboard: emptyState(), touch: emptyState(), gamepad: emptyState() };
  let combined = emptyState();
  let active = false;
  let rafId = null;

  function recompute() {
    const next = emptyState();
    for (const src of Object.values(sources)) {
      for (const b of BUTTONS) next[b] = next[b] || src[b];
    }
    const changed = BUTTONS.some((b) => next[b] !== combined[b]);
    combined = next;
    if (changed) onChange({ ...combined });
  }

  function setSource(name, button, pressed) {
    if (!sources[name] || !(button in sources[name])) return;
    if (sources[name][button] === pressed) return;
    sources[name][button] = pressed;
    if (pressed && onSource) onSource(name);
    recompute();
  }

  function releaseAll() {
    for (const src of Object.values(sources)) for (const b of BUTTONS) src[b] = false;
    recompute();
  }

  // ----- Tastatur -----
  function isTyping(target) {
    const tag = target && target.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || (target && target.isContentEditable);
  }

  function onKeyDown(e) {
    if (!active || isTyping(e.target)) return;
    const btn = KEY_MAP[e.code];
    if (!btn) return;
    e.preventDefault();
    setSource('keyboard', btn, true);
  }

  function onKeyUp(e) {
    if (!active) return;
    const btn = KEY_MAP[e.code];
    if (!btn) return;
    e.preventDefault();
    setSource('keyboard', btn, false);
  }

  // ----- Gamepad -----
  const AXIS_THRESHOLD = 0.5;

  function pollGamepads() {
    if (!active) return;
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const state = emptyState();
    for (const pad of pads) {
      if (!pad) continue;
      const pressed = (i) => !!(pad.buttons[i] && pad.buttons[i].pressed);
      state.a = state.a || pressed(0);
      state.b = state.b || pressed(1);
      state.select = state.select || pressed(8);
      state.start = state.start || pressed(9);
      state.up = state.up || pressed(12);
      state.down = state.down || pressed(13);
      state.left = state.left || pressed(14);
      state.right = state.right || pressed(15);
      const [ax = 0, ay = 0] = pad.axes || [];
      state.left = state.left || ax < -AXIS_THRESHOLD;
      state.right = state.right || ax > AXIS_THRESHOLD;
      state.up = state.up || ay < -AXIS_THRESHOLD;
      state.down = state.down || ay > AXIS_THRESHOLD;
    }
    for (const b of BUTTONS) setSource('gamepad', b, state[b]);
    rafId = requestAnimationFrame(pollGamepads);
  }

  // ----- On-Screen-Tasten (Maus und Touch) -----
  // Ein Finger kann von einer Taste zur nächsten rutschen, ohne loszulassen (z. B. über das Steuerkreuz).
  // Jeder Zeiger merkt sich seine aktuelle Taste; eine Taste ist gedrückt, solange mindestens ein Zeiger auf ihr liegt.
  function bindPadButtons(root) {
    const active = new Set();    // Zeiger, die gerade auf dem Bedienfeld liegen
    const byPointer = new Map(); // pointerId -> Taste, auf der der Zeiger gerade liegt
    const count = Object.fromEntries(BUTTONS.map((b) => [b, 0]));

    const sync = (btn) => {
      const pressed = count[btn] > 0;
      root.querySelectorAll(`[data-btn="${btn}"]`).forEach((el) => el.classList.toggle('pressed', pressed));
      setSource('touch', btn, pressed);
    };
    const press = (btn, id) => {
      byPointer.set(id, btn);
      count[btn]++;
      sync(btn);
    };
    const release = (id) => {
      const btn = byPointer.get(id);
      if (!btn) return;
      byPointer.delete(id);
      count[btn]--;
      sync(btn);
    };
    const buttonAt = (x, y) => {
      const el = document.elementFromPoint(x, y)?.closest?.('[data-btn]');
      return el && root.contains(el) ? el.dataset.btn : null;
    };

    const onDown = (e) => {
      const el = e.target.closest?.('[data-btn]');
      if (!el || !root.contains(el)) return;
      e.preventDefault();
      root.setPointerCapture?.(e.pointerId);
      active.add(e.pointerId);
      press(el.dataset.btn, e.pointerId);
    };
    const onMove = (e) => {
      if (!active.has(e.pointerId)) return;
      const next = buttonAt(e.clientX, e.clientY);
      if (next === (byPointer.get(e.pointerId) ?? null)) return;
      release(e.pointerId);
      if (next) press(next, e.pointerId);
    };
    const onUp = (e) => {
      active.delete(e.pointerId);
      release(e.pointerId);
    };
    const onContext = (e) => e.preventDefault();

    root.addEventListener('pointerdown', onDown);
    root.addEventListener('pointermove', onMove);
    root.addEventListener('pointerup', onUp);
    root.addEventListener('pointercancel', onUp);
    root.addEventListener('lostpointercapture', onUp);
    root.addEventListener('contextmenu', onContext);
    return () => {
      root.removeEventListener('pointerdown', onDown);
      root.removeEventListener('pointermove', onMove);
      root.removeEventListener('pointerup', onUp);
      root.removeEventListener('pointercancel', onUp);
      root.removeEventListener('lostpointercapture', onUp);
      root.removeEventListener('contextmenu', onContext);
    };
  }

  function start() {
    if (active) return;
    active = true;
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', releaseAll);
    rafId = requestAnimationFrame(pollGamepads);
  }

  function stop() {
    active = false;
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    window.removeEventListener('blur', releaseAll);
    if (rafId) cancelAnimationFrame(rafId);
    releaseAll();
  }

  return { start, stop, bindPadButtons, releaseAll };
}

export const KEYBOARD_HELP = [
  ['Pfeiltasten', 'Steuerkreuz'],
  ['X', 'A'],
  ['Z', 'B'],
  ['Enter', 'Start'],
  ['Shift / Backspace', 'Select'],
];
