// Lokale Persistenz über IndexedDB.
// Stores:
//   roms   – Schlüssel: id (SHA-256 der ROM-Bytes). Felder: id, console, title, fileName, size, bytes, addedAt, lastPlayed
//   states – Schlüssel: "<romId>:<slot>". Felder: key, romId, slot, savedAt, state
// Battery-Saves (SRAM) verwaltet der Core (WasmBoy) in seinem eigenen Speicher.

const DB_NAME = 'retrobase';
const DB_VERSION = 1;

let dbPromise = null;

function open() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('roms')) {
          const roms = db.createObjectStore('roms', { keyPath: 'id' });
          roms.createIndex('console', 'console', { unique: false });
        }
        if (!db.objectStoreNames.contains('states')) {
          const states = db.createObjectStore('states', { keyPath: 'key' });
          states.createIndex('romId', 'romId', { unique: false });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbPromise;
}

function run(storeName, mode, fn) {
  return open().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, mode);
        const store = tx.objectStore(storeName);
        const result = fn(store);
        tx.oncomplete = () => resolve(result && result.result !== undefined ? result.result : undefined);
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      })
  );
}

function getAll(storeName) {
  return open().then(
    (db) =>
      new Promise((resolve, reject) => {
        const req = db.transaction(storeName, 'readonly').objectStore(storeName).getAll();
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      })
  );
}

function getOne(storeName, key) {
  return open().then(
    (db) =>
      new Promise((resolve, reject) => {
        const req = db.transaction(storeName, 'readonly').objectStore(storeName).get(key);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      })
  );
}

// ---------- ROMs ----------

export async function listRoms(consoleId) {
  const all = await getAll('roms');
  return all
    .filter((r) => r.console === consoleId)
    .map(({ bytes, ...meta }) => meta)
    .sort((a, b) => (b.lastPlayed || 0) - (a.lastPlayed || 0) || a.title.localeCompare(b.title));
}

export async function getRom(id) {
  return getOne('roms', id);
}

export async function putRom(rom) {
  await run('roms', 'readwrite', (store) => store.put(rom));
}

export async function touchRom(id) {
  const rom = await getRom(id);
  if (rom) {
    rom.lastPlayed = Date.now();
    await putRom(rom);
  }
}

export async function deleteRom(id) {
  await run('roms', 'readwrite', (store) => store.delete(id));
  const states = await listStates(id);
  await Promise.all(states.map((s) => deleteState(s.key)));
}

// ---------- Spielstände (Save-States) ----------

export async function listStates(romId) {
  const all = await getAll('states');
  return all.filter((s) => s.romId === romId).sort((a, b) => a.slot - b.slot);
}

export async function getState(romId, slot) {
  return getOne('states', `${romId}:${slot}`);
}

export async function putState(romId, slot, state) {
  const record = { key: `${romId}:${slot}`, romId, slot, savedAt: Date.now(), state };
  await run('states', 'readwrite', (store) => store.put(record));
  return record;
}

export async function deleteState(key) {
  await run('states', 'readwrite', (store) => store.delete(key));
}

// ---------- Hilfsfunktionen ----------

export async function hashBytes(bytes) {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Liest den Titel aus dem Game-Boy-Header (Offset 0x134–0x143).
export function readGameBoyTitle(bytes) {
  if (bytes.length < 0x144) return null;
  let title = '';
  for (let i = 0x134; i < 0x144; i++) {
    const c = bytes[i];
    if (c === 0) break;
    if (c >= 0x20 && c < 0x7f) title += String.fromCharCode(c);
  }
  return title.trim() || null;
}
