# RetroBase

Eine PWA (Progressive Web App) als Retro-Emulator. Läuft im Browser auf Smartphone, Tablet und Desktop und lässt sich auf den Startbildschirm legen.

**Stand: v0.1.0**. Verfügbar ist die **Handheld**-Konsole (inkl. Farbversion). Die **Cube**-Konsole ist im Startscreen als „Bald verfügbar“ enthalten, ihr Core folgt später.

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
js/cores/handheld.js    Handheld-Core (Adapter um mGBA)
js/cores/cube.js         Cube-Platzhalter
vendor/mgba/           Vendored mGBA 2.5.1 (MPL-2.0, siehe LICENSE)
```

Der Core ist über ein kleines Interface angebunden (`init`, `load`, `setJoypad`, `createState`, `restoreState`, `stop`). Er lässt sich später austauschen.

mGBA nutzt Threads. Dafür braucht die Seite cross-origin isolation (`COOP`/`COEP`). GitHub Pages kann diese Header nicht setzen, deshalb liefert `sw.js` sie aus. Beim allerersten Besuch lädt die Seite deshalb einmal neu.

## Rechtliches zu ROMs

ROMs und Spielstände gehören nicht ins Repository. Die `.gitignore` schließt sie aus. Du fügst deine eigenen Dateien lokal in der App hinzu, und sie verlassen dein Gerät nicht.

## Bekannte Grenzen

- Der Game-Boy-Core ist mGBA. Die Genauigkeit entspricht dem Upstream-Projekt. Einzelne Spiele können trotzdem Fehler zeigen.
- Audio startet erst nach einer Eingabe (Browser-Vorgabe).
- Auf iOS sind Hintergrundbetrieb und Speicher eingeschränkter als auf Android.
- Der Cube-Core existiert noch nicht. Ein brauchbarer Browser-Emulator dafür ist eine eigene, große Aufgabe.

## Lizenz

RetroBase steht unter der **GNU General Public License v3.0 (GPL-3.0)**, siehe `LICENSE`.

Der mitgelieferte Game-Boy-Core mGBA (`vendor/mgba/`) steht unter der **Mozilla Public License 2.0 (MPL-2.0)**, siehe `vendor/mgba/LICENSE`. Die MPL-Dateien bleiben unter der MPL. Sie sind mit der GPL-3.0 dieses Projekts kombinierbar.

## Namensgebung

Die Konsolen heißen bewusst generisch „Handheld“ und „Cube“, damit keine Marken Dritter verwendet werden. Die Dateiendungen `.gb` und `.gbc` sind technische Formatbezeichnungen und bleiben so.
