# Project State

Updated: 2026-07-31
Version: 0.2.1

## Working

- Vite + TypeScript project scaffold
- Elementary Audio web renderer initialization after user gesture
- generated stereo impulse responses loaded into the virtual file system
- 12 reusable polyphonic voices
- note on and note off API
- C3 lower input guard for the ambient instrument
- very light sine-based pad with no sub oscillator
- independent slow attack and release
- preserved stereo pink-noise atmosphere
- independent Air and Music level controls
- separate processing paths for Air and Music
- brightness, warmth, motion and space macros
- three continuously morphing presets that preserve the mix
- manual note keyboard
- slow C–G–Am–F chillout progression in C major
- maj7, add9 and 6 voicings beginning at C3 or above
- shared chord tones remain held during transitions
- new tones enter before departing tones dissolve
- output peak meter
- responsive diagnostic interface

## Current focus

Evaluate whether the brighter C-major register and much lighter pad can sit behind the approved Air texture without demanding attention.

## Known limitations

- The pad is still oscillator-based rather than sample, wavetable or granular based
- Voice reuse still needs a dedicated release-state allocator for hostile high-density input
- Convolution reverb uses generated noise impulses rather than selected studio IRs
- No external MIDI input yet
- No formal stream abstraction or equal-power stream crossfade yet
- No automated audio regression tests
- Browser performance has not yet been profiled on mobile devices

## Next step

Listen critically to the new register and harmonic movement. Tune Music level, spectral softness and reverb distance before adding more synthesis layers.

## Completion rule

A stage is complete only when the repository builds and the updated behavior is directly playable in the browser.
