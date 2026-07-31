# Project State

Updated: 2026-07-31
Version: 0.4.0

## Working

- Vite + TypeScript project scaffold
- Elementary Audio renderer initialized after user gesture
- 12 pad voices and 6 independent Keys voices
- light C3-and-above pad, Air texture and soft glass Keys voice
- independent Air, Music and Keys controls
- brightness, warmth, motion and space macros
- monochrome one-column player interface
- central lightweight SVG play / pause control
- separate `src/generator` module
- editable chords, voicings and progression library
- editable scene definitions and 24-hour local-time schedule
- deterministic seed based on local date and hour
- a new composition identity every hour
- continuing variations during the hour
- scene-specific timing, transition, dynamics and Keys density
- common-tone voicing selection for smooth scene changes
- future-ready clock, manual and event sources

## Current focus

Listen through several generated routes and verify that every time-of-day scene feels distinct but related. Check transitions between adjacent hours and long-term melodic repetition.

## Known limitations

- Pad and Keys are oscillator-based
- Harmony currently stays inside one consonant C-major / A-minor world
- The UI follows local time and has no visible scene selector yet
- Manual and event APIs exist but are not connected to controls
- Reverb uses generated noise impulses
- No external MIDI input yet
- No automated audio regression tests
- Mobile performance has not yet been profiled

## Next step

Tune the time-of-day scenes after real listening, then expose optional activity controls such as Work, Sleep and Walk.

## Completion rule

A stage is complete only when the repository builds and the updated behaviour is directly playable in the browser.
