# Project State

Updated: 2026-07-31
Version: 0.2.0

## Working

- Vite + TypeScript project scaffold
- Elementary Audio web renderer initialization after user gesture
- generated stereo impulse responses loaded into the virtual file system
- 12 reusable polyphonic voices
- note on and note off API
- very soft layered sine pad with quiet harmonic colour
- independent slow attack and release
- preserved stereo pink-noise atmosphere
- independent Air and Music level controls
- brightness, warmth, motion and space macros
- three continuously morphing presets that preserve the mix
- manual note keyboard
- slow original D-minor / F-major chillout progression
- shared chord tones remain held during transitions
- new tones enter before departing tones dissolve
- output peak meter
- responsive diagnostic interface

## Current focus

Evaluate whether the softer pad character and modal progression now feel calm, spacious and non-intrusive enough to become the musical foundation of the generator.

## Known limitations

- The pad is still oscillator-based rather than sample, wavetable or granular based
- Voice reuse still needs a dedicated release-state allocator for hostile high-density input
- Convolution reverb uses generated noise impulses rather than selected studio IRs
- No external MIDI input yet
- No formal stream abstraction or equal-power stream crossfade yet
- No automated audio regression tests
- Browser performance has not yet been profiled on mobile devices

## Next step

Listen critically to the new pad and progression. Tune Music, filter colour, harmonic balance and release length before adding more synthesis layers.

## Completion rule

A stage is complete only when the repository builds and the updated behavior is directly playable in the browser.
