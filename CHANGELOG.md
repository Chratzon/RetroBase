# Changelog

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
