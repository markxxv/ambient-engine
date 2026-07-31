# Project State

Updated: 2026-07-31
Version: 0.1.0

## Working

- Vite + TypeScript project scaffold
- Elementary Audio web renderer initialization after user gesture
- generated stereo impulse responses loaded into the virtual file system
- 8 reusable voices
- note on and note off API
- soft oscillator pad with stereo detune
- independent slow attack and release
- brightness, warmth, motion and space macros
- three continuously morphing presets
- manual note keyboard
- temporary repeating ambient sequence
- output peak meter
- responsive diagnostic interface

## Current focus

Prove that the browser synth can sound pleasant enough to justify developing the generator.

## Known limitations

- Voice reuse chooses the oldest active voice without a dedicated pre-release phase
- Preset attack and release values affect newly reconciled voice state but need deeper transition testing
- Convolution reverb uses generated noise impulses rather than selected studio IRs
- No external MIDI input yet
- No stream abstraction or equal-power stream crossfade yet
- No automated audio regression tests
- Browser performance has not yet been profiled on mobile devices

## Next step

Listen critically to the baseline. Adjust oscillator balance, filter range, envelope times and reverb character before adding architectural complexity.

## Completion rule

A stage is complete only when the repository builds and the updated behavior is directly playable in the browser.
