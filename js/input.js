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

export function createInput({ onChange }) {
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
  function bindPadButtons(root) {
    const elements = root.querySelectorAll('[data-btn]');
    const cleanups = [];
    elements.forEach((el) => {
      const btn = el.dataset.btn;
      const down = (e) => {
        e.preventDefault();
        el.classList.add('pressed');
        el.setPointerCapture?.(e.pointerId);
        setSource('touch', btn, true);
      };
      const up = (e) => {
        e.preventDefault();
        el.classList.remove('pressed');
        setSource('touch', btn, false);
      };
      el.addEventListener('pointerdown', down);
      el.addEventListener('pointerup', up);
      el.addEventListener('pointercancel', up);
      el.addEventListener('lostpointercapture', up);
      el.addEventListener('contextmenu', (e) => e.preventDefault());
      cleanups.push(() => {
        el.removeEventListener('pointerdown', down);
        el.removeEventListener('pointerup', up);
        el.removeEventListener('pointercancel', up);
        el.removeEventListener('lostpointercapture', up);
      });
    });
    return () => cleanups.forEach((fn) => fn());
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
