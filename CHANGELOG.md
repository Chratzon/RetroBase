# Changelog

## v0.2.0

- Game-Boy-Core ausgetauscht: mGBA 2.5.1 (MPL-2.0) statt WasmBoy. WasmBoy ist entfernt.
- Battery-Saves (SRAM) werden pro Spiel in IndexedDB gespeichert und beim nächsten Start wiederhergestellt
- Automatischer Speicherstand alle 5 Minuten, im Menü als „Automatisch“ ladbar (getrennt von den Slots 1–3)
- Service Worker liefert die Header für cross-origin isolation aus (nötig für mGBA auf GitHub Pages). Die Seite lädt beim ersten Besuch einmal neu.

## v0.1.4

- Service Worker lädt Updates zuerst aus dem Netz (Cache nur noch als Offline-Fallback)

## v0.1.3

- Diagnose zählt zusätzlich die erkannten Tastendrücke

## v0.1.2

- Diagnose-Anzeige im Spiel (Menü → „Diagnose einblenden“): Bilder pro Sekunde und Zeit von Tastendruck bis zum nächsten Bild
- Audio wird beim ersten Tippen oder Drücken freigegeben

## v0.1.1

- Konsolen umbenannt: „Handheld“ und „Cube“ statt Markennamen
- Startanimation und Farben neutral gestaltet
- Lizenz: GPL-3.0 (wegen WasmBoy)

Jede Version bekommt ein Git-Tag (`vX.Y.Z`). GitHub erzeugt daraus automatisch eine ZIP-Datei zum Download.

## v0.1.0

- Startscreen mit Konsolenauswahl und Startanimation
- Handheld (inkl. Farbversion) über WasmBoy 0.7.1 (GPL-3.0)
- ROM-Bibliothek mit lokalem Import (IndexedDB)
- Schnellwechsel zwischen Spielen
- Steuerung: On-Screen-Tasten, Tastatur, Gamepad
- Spielstände: drei Slots pro Spiel, lokal gespeichert
- PWA: Manifest, Service Worker, Offline-Shell
- Cube als Platzhalter („Bald verfügbar“)
