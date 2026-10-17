// Game-Boy-Core: Adapter um WasmBoy (C/AssemblyScript → WebAssembly).
// Die restliche App spricht nur das Interface dieses Adapters an, damit der Core später
// ausgetauscht werden kann (z. B. gegen einen Gambatte/mGBA-Build).

import { WasmBoy } from '../../vendor/wasmboy/wasmboy.esm.js';

let configured = false;

export const gameboyCore = {
  id: 'gb',
  name: 'Game Boy',
  available: true,
  extensions: ['gb', 'gbc'],
  width: 160,
  height: 144,

  async init(canvas) {
    await WasmBoy.config(
      {
        headless: false,
        isAudioEnabled: true,
        gameboyFrameRate: 60,
        isGbcEnabled: true,
        isGbcColorizationEnabled: true,
        disablePauseOnHidden: false,
      },
      canvas
    );
    configured = true;
  },

  async load(bytes) {
    if (!configured) throw new Error('Core ist nicht initialisiert');
    await WasmBoy.pause();
    await WasmBoy.loadROM(bytes);
    await WasmBoy.play();
  },

  async play() {
    await WasmBoy.play();
  },

  async pause() {
    await WasmBoy.pause();
  },

  async stop() {
    // Battery-Save (SRAM) wird vom Core gespeichert, bevor pausiert wird.
    try {
      await WasmBoy.saveLoadedCartridge();
    } catch (e) {
      console.warn('SRAM-Speicherung fehlgeschlagen', e);
    }
    await WasmBoy.pause();
  },

  setJoypad(state) {
    if (!configured) return;
    WasmBoy.setJoypadState({
      UP: !!state.up,
      DOWN: !!state.down,
      LEFT: !!state.left,
      RIGHT: !!state.right,
      A: !!state.a,
      B: !!state.b,
      START: !!state.start,
      SELECT: !!state.select,
    });
  },

  async createState() {
    return WasmBoy.saveState();
  },

  async restoreState(state) {
    await WasmBoy.loadState(state);
    await WasmBoy.play();
  },
};
