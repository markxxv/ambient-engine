# Ambient Engine

A playable browser prototype for a live generative ambient music system.

The project is intentionally split into two long-term modules:

1. **Ambient Synth** — a resilient real-time instrument that accepts changing note streams and keeps transitions soft, continuous and musical.
2. **Atmosphere Generator** — a future logic layer responsible for harmony, tempo, density, sequences, scene changes and preset direction.

Version `0.1.0` focuses exclusively on proving the sound engine.

## Run locally

Requirements: Node.js 22.12 or newer.

```bash
npm install
npm run dev
```

Open the local URL printed by Vite, press **Start audio**, then use **Play atmosphere**, the preset cards, sliders and keyboard.

## Current playable features

- Elementary Audio running in an AudioWorklet
- 8-voice polyphonic pad
- slow independent attack and release
- detuned stereo oscillator layers
- filtered air texture
- soft saturation and compression
- generated convolution hall loaded into Elementary's VFS
- three morphable presets
- smooth live controls
- manual keyboard
- temporary test sequencer standing in for the future generator

## Project rule

Every development stage must remain directly playable. A change is complete only when:

```bash
npm run build
npm run dev
```

both work and the result can be heard or interacted with in the browser.

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) and [`docs/PROJECT_STATE.md`](docs/PROJECT_STATE.md).
