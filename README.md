# Aumlet

Modular synthesizer playground built on the Web Audio API. Aumlet runs the
entire patch graph inside a single AudioWorkletProcessor and lets you wire
modules through a patch matrix UI.

## Features

- AudioWorklet-based modular graph with real-time patching.
- Patch matrix supports multiple connections per input (banana stacking).
- Module table for editing parameters and deleting modules.
- Random graph generator for quick inspiration.
- Voltage-style routing with simple 1V/oct behavior.

## Modules

- VCO: saw oscillator. Inputs `pitch`, `fm`. Param `freq` (volts, 1V/oct).
- VCA: amplifier. Inputs `in`, `cv`. Output `out` (5V = unity gain).
- LFO: low-frequency oscillator. Input `rate`. Params `freq` (volts), `shape`.
- Slew: slew limiter / looping envelope. Input `in`. Params `riseTime`, `fallTime`.
- OUTPUT: final sink. Input `in`.

## Quick Start

```bash
npm install
npm run dev
```

Open `http://localhost:5173`, click **Start Audio**, then:

- Use **Add Module** buttons to create modules.
- Click cells in the patch matrix to connect outputs (rows) to inputs (columns).
- Use **Randomize** for a new patch.
- Press `Cmd/Ctrl+Enter` to reload the current graph while audio is running.

## Build & Preview

```bash
npm run build
npm run preview
```

## Notes

- AudioWorklet requires a user gesture; you must click **Start Audio**.
- Tested best in modern Chromium-based browsers.

## License

MIT. See `LICENSE`.
