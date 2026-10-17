// RetroBase – Haupt-App: Startscreen, Konsolen-Animation, Bibliothek, Spielansicht.
// Routing über den URL-Hash, damit der Zurück-Button (Android/Browser) funktioniert.

import * as db from './db.js';
import { createInput, KEYBOARD_HELP } from './input.js';
import { handheldCore } from './cores/handheld.js';
import { cubeCore } from './cores/cube.js';

const CONSOLES = {
  hh: { core: handheldCore, label: 'Handheld', theme: 'thumb-hh', bootClass: 'hh', color: '#b8e05a', extensions: '.gb,.gbc', desc: 'Klassische Handheld-Spiele, inkl. Farbversion.' },
  cube: { core: cubeCore, label: 'Cube', theme: 'thumb-cube', bootClass: 'cube', color: '#8e7ad0', extensions: '.iso,.gcm,.rvz', desc: 'Würfel-Konsole mit Disc-Format (Core folgt).' },
};

const SLOTS = [1, 2, 3];

const app = document.getElementById('app');
const overlay = document.getElementById('overlay');

// ---------- Hilfsfunktionen ----------

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function toast(message) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = message;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2300);
}

function fmtDate(ts) {
  if (!ts) return '–';
  return new Date(ts).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' });
}

function fmtSize(bytes) {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function setView(html) {
  app.innerHTML = html;
}

function go(hash) {
  if (location.hash === hash) render();
  else location.hash = hash;
}

// ---------- Router ----------

let currentSession = null; // { romId, core, input, canvas }

async function render() {
  const hash = location.hash || '#/';
  const parts = hash.replace(/^#\/?/, '').split('/');

  if (currentSession && !(parts[0] === 'play' && parts[1] === currentSession.romId)) {
    await endSession();
  }

  if (parts[0] === 'play' && parts[1]) {
    return renderGame(parts[1]);
  }
  if (CONSOLES[parts[0]]) {
    return renderLibrary(parts[0]);
  }
  return renderStart();
}

window.addEventListener('hashchange', render);

// ---------- Startscreen ----------

function renderStart() {
  document.body.classList.remove('in-game');
  setView(`
    <div class="brand">
      <div class="logo">RetroBase</div>
      <p>Wähle eine Konsole</p>
    </div>
    <div class="console-grid">
      ${Object.entries(CONSOLES)
        .map(
          ([id, c]) => `
        <button class="console-card" data-console="${id}">
          <div class="console-thumb ${c.theme}">${id === 'hh' ? '<div class="screen"></div>' : '<div class="cube"></div>'}</div>
          <div class="name">${esc(c.label)}</div>
          <div class="desc">${esc(c.desc)}</div>
          <span class="badge ${c.core.available ? 'ok' : ''}">${c.core.available ? 'Verfügbar' : 'Bald verfügbar'}</span>
        </button>`
        )
        .join('')}
    </div>
  `);

  app.querySelectorAll('[data-console]').forEach((btn) => {
    btn.addEventListener('click', () => playBoot(btn.dataset.console));
  });
}

// ---------- Startanimation ----------

function playBoot(consoleId) {
  const c = CONSOLES[consoleId];
  overlay.hidden = false;
  overlay.className = 'boot';
  overlay.style.setProperty('--boot-color', c.color);
  overlay.innerHTML = `
    <div class="device">
      <div class="body ${c.bootClass}">
        <div class="screen-glow"></div>
        <div class="led"></div>
      </div>
      <div class="name">${esc(c.label.toUpperCase())}</div>
    </div>`;

  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    overlay.hidden = true;
    overlay.className = 'overlay';
    overlay.innerHTML = '';
    overlay.onclick = null;
    go(`#/${consoleId}`);
  };
  overlay.onclick = finish; // Tippen überspringt die Animation
  setTimeout(finish, 2700);
}

// ---------- Bibliothek ----------

async function renderLibrary(consoleId) {
  const c = CONSOLES[consoleId];
  const roms = c.core.available ? await db.listRoms(consoleId) : [];

  setView(`
    <div class="toolbar">
      <div class="left">
        <button class="btn ghost" id="back">← Konsolen</button>
      </div>
      <div class="right">
        <h1 style="margin:0">${esc(c.label)}</h1>
      </div>
      <div class="right">
        <button class="btn primary" id="add" ${c.core.available ? '' : 'disabled'}>+ ROM hinzufügen</button>
        <input type="file" id="file" accept="${c.extensions}" multiple hidden>
      </div>
    </div>

    ${c.core.available ? '' : `<div class="notice">Der ${esc(c.label)}-Core ist noch nicht verfügbar. Sobald er fertig ist, kannst du hier ROMs hinzufügen.</div>`}

    <input class="search" id="search" type="search" placeholder="Suchen …" ${c.core.available ? '' : 'disabled'}>
    <ul class="rom-list" id="list"></ul>
    <div class="notice">
      Tastatur: ${KEYBOARD_HELP.map(([k, v]) => `<b>${esc(k)}</b> = ${esc(v)}`).join(' · ')}.
      Gamepad wird automatisch erkannt. ROMs und Spielstände bleiben nur auf diesem Gerät.
    </div>
  `);

  document.getElementById('back').onclick = () => go('#/');
  const fileInput = document.getElementById('file');
  document.getElementById('add').onclick = () => fileInput.click();
  fileInput.onchange = () => importFiles(consoleId, fileInput.files);

  const list = document.getElementById('list');
  const search = document.getElementById('search');

  const drawList = (filter = '') => {
    const f = filter.trim().toLowerCase();
    const shown = roms.filter((r) => !f || r.title.toLowerCase().includes(f) || r.fileName.toLowerCase().includes(f));
    if (!roms.length) {
      list.innerHTML = `<li class="empty">Noch keine ROMs. Füge oben eine Datei hinzu.</li>`;
      return;
    }
    if (!shown.length) {
      list.innerHTML = `<li class="empty">Keine Treffer.</li>`;
      return;
    }
    list.innerHTML = shown
      .map(
        (r) => `
        <li class="rom-item">
          <div class="info">
            <div class="title">${esc(r.title)}</div>
            <div class="meta">${esc(r.fileName)} · ${fmtSize(r.size)} · zuletzt: ${fmtDate(r.lastPlayed)}</div>
          </div>
          <button class="btn" data-del="${r.id}" aria-label="Entfernen" title="Entfernen">🗑</button>
          <button class="btn primary" data-play="${r.id}">Spielen</button>
        </li>`
      )
      .join('');
    list.querySelectorAll('[data-play]').forEach((b) => (b.onclick = () => go(`#/play/${b.dataset.play}`)));
    list.querySelectorAll('[data-del]').forEach((b) => (b.onclick = () => removeRom(consoleId, b.dataset.del)));
  };

  search.oninput = () => drawList(search.value);
  drawList();
}

async function importFiles(consoleId, files) {
  const c = CONSOLES[consoleId];
  const allowed = c.extensions.split(',').map((e) => e.trim().toLowerCase());
  let added = 0;
  let skipped = 0;

  for (const file of files) {
    const ext = file.name.split('.').pop().toLowerCase();
    if (!allowed.includes(`.${ext}`)) {
      skipped++;
      continue;
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    const id = await db.hashBytes(bytes);
    if (await db.getRom(id)) {
      skipped++;
      continue;
    }
    const title = (consoleId === 'hh' && db.readHeaderTitle(bytes)) || file.name.replace(/\.[^.]+$/, '');
    await db.putRom({
      id,
      console: consoleId,
      title,
      fileName: file.name,
      size: bytes.length,
      bytes,
      addedAt: Date.now(),
      lastPlayed: 0,
    });
    added++;
  }

  toast(`${added} hinzugefügt${skipped ? `, ${skipped} übersprungen` : ''}`);
  renderLibrary(consoleId);
}

async function removeRom(consoleId, id) {
  const rom = await db.getRom(id);
  if (!rom) return;
  if (!confirm(`„${rom.title}“ inkl. Spielständen von diesem Gerät entfernen?`)) return;
  await db.deleteRom(id);
  toast('Entfernt');
  renderLibrary(consoleId);
}

// ---------- Spielansicht ----------

async function renderGame(romId) {
  const rom = await db.getRom(romId);
  if (!rom) {
    toast('ROM nicht gefunden');
    return go('#/');
  }
  const c = CONSOLES[rom.console];
  const showPad = matchMedia('(pointer: coarse)').matches;
  document.body.classList.add('in-game');

  overlay.hidden = true;
  setView(`
    <div class="game">
      <div class="game-bar">
        <button class="btn ghost" id="exit" aria-label="Zurück">←</button>
        <div class="title">${esc(rom.title)}</div>
        <button class="btn" id="switch" title="Schnellwechsel">⇆</button>
        <button class="btn" id="menu" title="Menü">☰</button>
      </div>
      <div class="screen-wrap">
        <div class="game-canvas-holder"><canvas id="game-canvas" width="${c.core.width}" height="${c.core.height}"></canvas></div>
        <div class="diag hidden" id="diag"></div>
      </div>
      <div class="controls ${showPad ? 'show' : ''}" id="controls">
        <div class="pad-row">
          <div class="dpad">
            <button class="pad-btn up" data-btn="up" aria-label="Oben">▲</button>
            <button class="pad-btn left" data-btn="left" aria-label="Links">◀</button>
            <div class="pad-btn center"></div>
            <button class="pad-btn right" data-btn="right" aria-label="Rechts">▶</button>
            <button class="pad-btn down" data-btn="down" aria-label="Unten">▼</button>
          </div>
          <div class="ab">
            <button class="pad-btn round" data-btn="b" aria-label="B">B</button>
            <button class="pad-btn round" data-btn="a" aria-label="A">A</button>
          </div>
        </div>
        <div class="ss">
          <button class="pad-btn pill" data-btn="select">Select</button>
          <button class="pad-btn pill" data-btn="start">Start</button>
        </div>
      </div>
    </div>
  `);

  document.getElementById('exit').onclick = () => go('#/' + rom.console);
  document.getElementById('switch').onclick = () => openSwitcher(rom);
  document.getElementById('menu').onclick = () => openMenu(rom);

  // Eingabe und Core starten
  const canvas = document.getElementById('game-canvas');
  const diagEl = document.getElementById('diag');

  // Diagnose: Zeit von Tastendruck bis zum nächsten gerenderten Bild
  const diag = { pendingInputAt: null, lastLatency: null, frames: 0, wasAnyPressed: false, timer: null };

  const input = createInput({
    onChange: (state) => {
      const anyPressed = Object.values(state).some(Boolean);
      if (anyPressed && !diag.wasAnyPressed) diag.pendingInputAt = performance.now();
      diag.wasAnyPressed = anyPressed;
      c.core.setJoypad(state);
    },
  });
  input.start();
  input.bindPadButtons(document.getElementById('controls'));

  // Audio beim ersten Tippen/Drücken freigeben (Browser-Vorgabe)
  const unlock = () => c.core.unlockAudio();
  window.addEventListener('pointerdown', unlock, { once: true, capture: true });
  window.addEventListener('keydown', unlock, { once: true, capture: true });

  currentSession = { romId, core: c.core, input, canvas, consoleId: rom.console, diag, diagEl, unlock };
  if (isDiagOn()) startDiag();

  try {
    await c.core.init(canvas, {
      onFrame: () => {
        diag.frames++;
        if (diag.pendingInputAt !== null) {
          diag.lastLatency = performance.now() - diag.pendingInputAt;
          diag.pendingInputAt = null;
        }
      },
    });
    await c.core.load(new Uint8Array(rom.bytes));
    await db.touchRom(romId);
  } catch (err) {
    console.error(err);
    toast('Start fehlgeschlagen: ' + (err.message || err));
  }
}

// ---------- Diagnose ----------

function isDiagOn() {
  try {
    return localStorage.getItem('rb-diag') === '1';
  } catch {
    return false;
  }
}

function setDiagOn(on) {
  try {
    localStorage.setItem('rb-diag', on ? '1' : '0');
  } catch {
    /* Speicher nicht verfügbar – nur für diese Sitzung */
  }
}

function startDiag() {
  if (!currentSession) return;
  const s = currentSession;
  s.diagEl.classList.remove('hidden');
  let lastFrames = s.diag.frames;
  let lastTime = performance.now();
  s.diag.timer = setInterval(() => {
    const now = performance.now();
    const framesNow = s.diag.frames;
    const fps = ((framesNow - lastFrames) * 1000) / (now - lastTime);
    lastFrames = framesNow;
    lastTime = now;
    const lat = s.diag.lastLatency === null ? '–' : Math.round(s.diag.lastLatency) + ' ms';
    s.diagEl.textContent = `Bilder/s: ${fps.toFixed(0)} · Eingabe→Bild: ${lat} · Core: ${s.core.getFps ? s.core.getFps() : '?'} fps`;
  }, 500);
}

function stopDiag() {
  if (!currentSession) return;
  clearInterval(currentSession.diag.timer);
  currentSession.diagEl.classList.add('hidden');
}

async function endSession() {
  if (!currentSession) return;
  const s = currentSession;
  currentSession = null;
  clearInterval(s.diag.timer);
  window.removeEventListener('pointerdown', s.unlock, { capture: true });
  window.removeEventListener('keydown', s.unlock, { capture: true });
  s.input.stop();
  try {
    await s.core.stop();
  } catch (e) {
    console.warn(e);
  }
}

// ---------- Menü (Speichern/Laden) ----------

function sheet(html) {
  overlay.hidden = false;
  overlay.className = 'overlay';
  overlay.innerHTML = `<div class="sheet" role="dialog" aria-modal="true">${html}</div>`;
  overlay.onclick = (e) => {
    if (e.target === overlay) closeSheet();
  };
  return overlay.querySelector('.sheet');
}

function closeSheet() {
  overlay.hidden = true;
  overlay.innerHTML = '';
  overlay.onclick = null;
  if (currentSession) currentSession.input.releaseAll();
}

async function openMenu(rom) {
  const states = await db.listStates(rom.id);
  const bySlot = Object.fromEntries(states.map((s) => [s.slot, s]));

  const el = sheet(`
    <h2>${esc(rom.title)}</h2>
    <p class="muted" style="margin-top:0">Spielstände auf diesem Gerät</p>
    <div class="row">
      ${SLOTS.map((n) => {
        const s = bySlot[n];
        return `
        <div class="slot">
          <div class="t">Slot ${n}</div>
          <div class="m">${s ? 'gespeichert ' + fmtDate(s.savedAt) : 'leer'}</div>
          <div class="row">
            <button class="btn primary" data-save="${n}">Speichern</button>
            <button class="btn" data-load="${n}" ${s ? '' : 'disabled'}>Laden</button>
          </div>
        </div>`;
      }).join('')}
    </div>
    <div class="row">
      <button class="btn" id="m-diag">Diagnose ${isDiagOn() ? 'ausblenden' : 'einblenden'}</button>
      <button class="btn" id="m-reset">Neustart</button>
      <button class="btn" id="m-switch">Spiel wechseln</button>
      <button class="btn" id="m-library">Zur Bibliothek</button>
      <button class="btn ghost" id="m-close">Schließen</button>
    </div>
  `);

  el.querySelectorAll('[data-save]').forEach((b) => (b.onclick = () => saveSlot(rom, Number(b.dataset.save))));
  el.querySelectorAll('[data-load]').forEach((b) => (b.onclick = () => loadSlot(rom, Number(b.dataset.load))));
  el.querySelector('#m-reset').onclick = async () => {
    closeSheet();
    await currentSession?.core.load(new Uint8Array(rom.bytes));
    toast('Neustart');
  };
  el.querySelector('#m-diag').onclick = () => {
    const on = !isDiagOn();
    setDiagOn(on);
    if (on) startDiag();
    else stopDiag();
    closeSheet();
  };
  el.querySelector('#m-switch').onclick = () => openSwitcher(rom);
  el.querySelector('#m-library').onclick = () => {
    closeSheet();
    go('#/' + rom.console);
  };
  el.querySelector('#m-close').onclick = closeSheet;
}

async function saveSlot(rom, slot) {
  if (!currentSession) return;
  try {
    const state = await currentSession.core.createState();
    await db.putState(rom.id, slot, state);
    await currentSession.core.play();
    closeSheet();
    toast(`Gespeichert in Slot ${slot}`);
  } catch (err) {
    console.error(err);
    toast('Speichern fehlgeschlagen');
  }
}

async function loadSlot(rom, slot) {
  if (!currentSession) return;
  const rec = await db.getState(rom.id, slot);
  if (!rec) return toast('Slot ist leer');
  try {
    await currentSession.core.restoreState(rec.state);
    closeSheet();
    toast(`Slot ${slot} geladen`);
  } catch (err) {
    console.error(err);
    toast('Laden fehlgeschlagen');
  }
}

// ---------- Schnellwechsel ----------

async function openSwitcher(current) {
  const roms = await db.listRoms(current.console);
  const el = sheet(`
    <h2>Spiel wechseln</h2>
    <input class="search" id="sw-search" type="search" placeholder="Suchen …">
    <ul class="rom-list" id="sw-list"></ul>
  `);

  const list = el.querySelector('#sw-list');
  const draw = (filter = '') => {
    const f = filter.trim().toLowerCase();
    const shown = roms.filter((r) => !f || r.title.toLowerCase().includes(f));
    list.innerHTML = shown
      .map(
        (r) => `
        <li class="rom-item" data-id="${r.id}" style="cursor:pointer;${r.id === current.id ? 'outline:2px solid var(--accent)' : ''}">
          <div class="info">
            <div class="title">${esc(r.title)}</div>
            <div class="meta">${r.id === current.id ? 'läuft gerade' : 'zuletzt: ' + fmtDate(r.lastPlayed)}</div>
          </div>
        </li>`
      )
      .join('') || `<li class="empty">Keine Treffer.</li>`;
    list.querySelectorAll('[data-id]').forEach((li) => {
      li.onclick = () => {
        if (li.dataset.id === current.id) return closeSheet();
        closeSheet();
        go(`#/play/${li.dataset.id}`);
      };
    });
  };
  el.querySelector('#sw-search').oninput = (e) => draw(e.target.value);
  draw();
}

// ---------- Start ----------

render();

if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  navigator.serviceWorker.register('./sw.js').catch((err) => console.warn('Service Worker', err));
}
