# Project State

Updated: 2026-07-31
Version: 0.3.0

## Working

- Vite + TypeScript project scaffold
- Elementary Audio web renderer initialization after user gesture
- generated stereo impulse responses loaded into the virtual file system
- 12 reusable pad voices plus 6 independent Keys voices
- note on and note off API
- C3 lower input guard for the ambient instrument
- very light sine-based pad with no sub oscillator
- independent slow attack and release
- preserved stereo pink-noise atmosphere
- independent Air, Music and Keys level controls
- separate processing paths for Air, pad and Keys
- soft glass / music-box Keys voice with restrained upper partials
- sparse generative melody tied to the current harmony
- phrase lengths, rests, direction and register vary continuously
- recent notes and intervals are avoided to reduce obvious repetition
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

Evaluate whether the sparse Keys layer adds gentle movement without becoming a memorable foreground hook or competing with the pad and Air texture.

## Known limitations

- The pad and Keys are still oscillator-based rather than sample, wavetable or granular based
- Keys melody generation currently follows the built-in test harmony rather than a formal generator contract
- Voice reuse still needs a dedicated release-state allocator for hostile high-density input
- Convolution reverb uses generated noise impulses rather than selected studio IRs
- No external MIDI input yet
- No formal stream abstraction or equal-power stream crossfade yet
- No automated audio regression tests
- Browser performance has not yet been profiled on mobile devices

## Next step

Listen over several minutes. Tune Keys level, phrase density, bell softness and silence duration before adding another musical layer.

## Completion rule

A stage is complete only when the repository builds and the updated behavior is directly playable in the browser.
