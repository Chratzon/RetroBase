// Cube-Platzhalter. Ein brauchbarer Browser-Core existiert noch nicht (siehe README).
// Die Oberfläche zeigt die Konsole an, startet aber keinen Emulator.

export const cubeCore = {
  id: 'cube',
  name: 'Cube',
  available: false,
  extensions: ['iso', 'gcm', 'rvz'],
  width: 640,
  height: 480,

  async init() {},

  async load() {
    throw new Error('Cube-Core ist noch nicht verfügbar.');
  },

  async play() {},
  async pause() {},
  async stop() {},
  setJoypad() {},
  async createState() {
    throw new Error('Cube-Core ist noch nicht verfügbar.');
  },
  async restoreState() {
    throw new Error('Cube-Core ist noch nicht verfügbar.');
  },
};
