# RetroBase

Eine PWA (Progressive Web App) als Retro-Emulator. Läuft im Browser auf Smartphone, Tablet und Desktop und lässt sich auf den Startbildschirm legen.

**Stand: v0.1.0**. Verfügbar ist der **Game Boy** (inkl. Color). Der **GameCube** ist im Startscreen als „Bald verfügbar“ enthalten, sein Core folgt später.

## Funktionen

- Startscreen mit Konsolenauswahl und kurzer Startanimation pro Konsole
- ROMs lokal hinzufügen (Datei-Dialog, mehrere Dateien auf einmal), gespeichert in IndexedDB
- Schnellwechsel zwischen Spielen direkt aus dem laufenden Spiel
- Steuerung über:
  - On-Screen-Tasten (Maus und Touch)
  - Tastatur: Pfeiltasten = Steuerkreuz, `X` = A, `Z` = B, `Enter` = Start, `Shift`/`Backspace` = Select
  - Gamepad (Standard-Mapping der Gamepad API, wird automatisch erkannt)
- Spielstände: drei Speicherplätze pro Spiel, lokal gespeichert. Batterie-Saves (SRAM) speichert der Core automatisch.
- Offline-Nutzung über Service Worker

## Starten

Die App ist rein statisch (kein Build-Schritt). Sie braucht nur einen lokalen Webserver, weil ES-Module und Service Worker nicht über `file://` laufen:

```bash
python3 -m http.server 8080
# dann im Browser: http://localhost:8080
```

Für die Nutzung auf dem Handy wird die Seite über HTTPS ausgeliefert (z. B. GitHub Pages). Dann „Zum Startbildschirm hinzufügen“ wählen.

## Projektstruktur

```
index.html              Einstiegspunkt
styles.css              Layout, Startanimation, Steuerung
manifest.webmanifest    PWA-Manifest
sw.js                   Service Worker (App-Shell offline)
js/app.js               Routing, Startscreen, Bibliothek, Spielansicht, Menüs
js/db.js                IndexedDB: ROMs und Spielstände
js/input.js             Eingabe: Tastatur, On-Screen-Tasten, Gamepad
js/cores/gameboy.js     Game-Boy-Core (Adapter um WasmBoy)
js/cores/gamecube.js    GameCube-Platzhalter
vendor/wasmboy/         Vendored WasmBoy 0.7.1 (GPL-3.0-or-later, siehe LICENSE)
```

Der Core ist über ein kleines Interface angebunden (`init`, `load`, `setJoypad`, `createState`, `restoreState`, `stop`). Er lässt sich später austauschen, z. B. gegen einen Gambatte- oder mGBA-Build.

## Rechtliches zu ROMs

ROMs und Spielstände gehören nicht ins Repository. Die `.gitignore` schließt sie aus. Du fügst deine eigenen Dateien lokal in der App hinzu, und sie verlassen dein Gerät nicht.

## Bekannte Grenzen

- Der Game-Boy-Core basiert auf WasmBoy, das laut Upstream noch nicht vollständig genau ist. Einzelne Spiele können Fehler zeigen.
- Audio startet erst nach einer Eingabe (Browser-Vorgabe).
- Auf iOS sind Hintergrundbetrieb und Speicher eingeschränkter als auf Android.
- Der GameCube-Core existiert noch nicht. Ein brauchbarer Browser-Emulator dafür ist eine eigene, große Aufgabe.

## Lizenz

Der Code von RetroBase ist noch nicht lizenziert. Da WasmBoy unter GPL-3.0-or-later steht, muss eine Veröffentlichung unter einer GPL-kompatiblen Lizenz erfolgen, sobald die Build-Ausgabe mit WasmBoy ausgeliefert wird. Die Lizenzwahl ist offen.
