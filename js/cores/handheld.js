// Handheld-Core: Adapter um mGBA (C → WebAssembly, MPL-2.0, siehe vendor/mgba/LICENSE).
// Die restliche App spricht nur das Interface dieses Adapters an.
// mGBA braucht Threads und damit cross-origin isolation (siehe sw.js).

import mGBA from '../../vendor/mgba/mgba.js';
import * as db from '../db.js';

const BUTTONS = {
  up: 'Up',
  down: 'Down',
  left: 'Left',
  right: 'Right',
  a: 'A',
  b: 'B',
  start: 'Start',
  select: 'Select',
};
const STATE_SLOT = 1; // mGBA-interner Slot; die App verwaltet ihre drei Slots selbst in IndexedDB
const SAVE_DELAY_MS = 2000;

let mod = null; // mGBA-Modul: wird einmal erzeugt und über Spielwechsel hinweg wiederverwendet
let surface = null; // das eine Canvas, auf dem mGBA rendert
let hooks = {};
let paths = null;
let currentId = null; // ID des geladenen Spiels
let pressed = {};
let saveTimer = null;
let listening = false;

function requireModule() {
  if (!mod || currentId === null) throw new Error('Core ist nicht bereit');
  return mod;
}

function romPath() {
  return `${paths.gamePath}/${currentId}.gb`;
}

function savePath() {
  return `${paths.savePath}/${currentId}.sav`;
}

function statePath() {
  return `${paths.saveStatePath}/${currentId}.ss${STATE_SLOT}`;
}

// Battery-Save des laufenden Spiels in IndexedDB sichern.
async function persistSave() {
  if (!mod || currentId === null) return;
  try {
    const data = mod.getSave();
    if (data && data.length) await db.putSave(currentId, data.slice());
  } catch (e) {
    console.warn('SRAM-Speicherung fehlgeschlagen', e);
  }
}

function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(persistSave, SAVE_DELAY_MS);
}

export const handheldCore = {
  id: 'hh',
  name: 'Handheld',
  available: true,
  extensions: ['gb', 'gbc'],
  width: 160,
  height: 144,

  async init(canvas, h = {}) {
    if (!self.crossOriginIsolated) {
      throw new Error('Seite ist nicht cross-origin isolated. Bitte einmal neu laden.');
    }
    hooks = h; // onFrame wird von diesem Build nicht gemeldet, bleibt aber Teil des Interfaces
    if (!mod) {
      surface = canvas;
      mod = await mGBA({ canvas });
      await mod.FSInit();
      paths = mod.filePaths();
    } else if (canvas !== surface) {
      // Das vorhandene Render-Canvas in die neue Ansicht verschieben (WebGL-Kontext bleibt erhalten).
      canvas.replaceWith(surface);
    }
    // Battery-Save sichern, wenn der Tab verlassen oder ausgeblendet wird (der Core meldet keine Save-Updates).
    if (!listening) {
      listening = true;
      window.addEventListener('pagehide', () => persistSave());
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) persistSave();
      });
    }
  },

  async load(bytes, romId) {
    if (!mod) throw new Error('Core ist nicht initialisiert');
    if (!romId) throw new Error('Keine ROM-ID angegeben');
    await persistSave(); // SRAM des bisherigen Spiels sichern (auch bei Neustart)
    clearTimeout(saveTimer);
    currentId = romId;
    pressed = {};

    mod.FS.writeFile(romPath(), bytes);
    const sram = await db.getSave(romId);
    if (sram) {
      mod.FS.writeFile(savePath(), sram);
    } else {
      try {
        mod.FS.unlink(savePath());
      } catch {
        /* kein alter Save vorhanden */
      }
    }

    if (!mod.loadGame(romPath(), savePath())) {
      throw new Error('ROM konnte nicht geladen werden (keine gültige Game-Boy-Datei?)');
    }
    mod.resumeGame();
  },

  async play() {
    if (mod) mod.resumeGame();
  },

  // Muss nach einer Nutzereingabe aufgerufen werden, sonst bleibt der Audio-Kontext auf Mobilgeräten stumm.
  unlockAudio() {
    try {
      mod?.resumeAudio();
      mod?.SDL2?.audioContext?.resume?.();
    } catch (e) {
      console.warn('Audio-Freigabe fehlgeschlagen', e);
    }
  },

  // mGBA meldet in diesem Build keine Frame-Callbacks, deshalb gibt es keinen verlässlichen Bildraten-Wert.
  setMuted(muted) {
    if (mod) mod.setVolume(muted ? 0 : 1);
  },

  getFps() {
    return null;
  },

  async pause() {
    if (mod) mod.pauseGame();
  },

  async stop() {
    clearTimeout(saveTimer);
    await persistSave();
    if (mod) mod.pauseGame();
    pressed = {};
  },

  setJoypad(state) {
    if (!mod || currentId === null) return;
    for (const [key, name] of Object.entries(BUTTONS)) {
      const down = !!state[key];
      if (down !== !!pressed[key]) {
        if (down) mod.buttonPress(name);
        else mod.buttonUnpress(name);
        pressed[key] = down;
      }
    }
  },

  async createState() {
    const m = requireModule();
    if (!m.saveState(STATE_SLOT)) throw new Error('Spielstand konnte nicht erstellt werden');
    const data = m.FS.readFile(statePath());
    return data.slice();
  },

  async restoreState(bytes) {
    const m = requireModule();
    m.FS.writeFile(statePath(), bytes);
    if (!m.loadState(STATE_SLOT)) throw new Error('Spielstand ist nicht kompatibel');
    m.resumeGame();
  },
};
