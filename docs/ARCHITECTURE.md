# Architecture

## Global direction

```text
Time / manual scene / external event
                    ↓
          CompositionGenerator
  harmony · timing · phrases · transitions
                    ↓
             stable note contract
                    ↓
              AmbientEngine
  voices · timbre · smoothing · space · safety
                    ↓
                 audio out
```

The synth and generator are independent. The generator knows which notes and musical events should happen; it never knows how oscillators, filters, envelopes or effects are implemented.

## Generator module

```text
src/generator/
├── CompositionGenerator.ts  runtime, timers and transitions
├── compositionFactory.ts    deterministic hourly composition builder
├── progressions.ts          editable chords, voicings and progressions
├── scenes.ts                editable musical behaviour profiles
├── schedule.ts              editable local-hour → scene bindings
├── random.ts                deterministic seeded variation
└── types.ts                 generator contracts
```

### Editing harmony

Edit `progressions.ts` to change chord voicings or progression order. Pad voicings remain at C3 or above. The factory automatically selects inversions with shared tones and small voice movement.

### Editing time behaviour

Edit only `TIME_BINDINGS` in `schedule.ts` to move scenes to different hours. Every local hour from 0 through 23 must appear exactly once.

### Editing a scene

Edit `scenes.ts` to change chord duration, transition duration, pad velocity, Keys density, phrase length, silence length or melodic register.

## Hourly composition behaviour

- Browser local time selects a scene.
- Local date + hour + scene create a deterministic seed.
- Each hour receives a new composition identity.
- Refreshing during the same hour produces the same starting composition.
- A composition combines two or three progression sections.
- Each completed route generates another deterministic variation, avoiding a short unchanged loop.
- At an hour boundary, the next opening chord is selected for maximum common tones with the current chord.
- New tones enter before old tones release using the target scene's crossfade duration.
- Keys pause during the scene boundary, then begin a new sparse phrase.

## Future scene controls

The runtime already supports three sources:

```text
clock   current local-hour schedule
manual  future Work / Sleep / Walk buttons
event   future external or application events
```

Future UI controls can call:

```ts
compositionGenerator.selectScene('daylight', 'manual');
compositionGenerator.selectScene('deep-night', 'event');
compositionGenerator.followClock();
```

No synth or DSP code needs to change.

## Synth module

```text
CompositionGenerator
     ↓ pad notes + key triggers
AmbientEngine
  ├── C3 pad range guard
  ├── 12 pad voices
  ├── 6 independent Keys voices
  ├── keyed state updates
  └── serialized graph renders
     ↓
SynthGraph
  ├── light sine pad layers
  ├── soft glass Keys voice
  ├── separate Air / Music / Keys buses
  ├── asymmetric attack/release
  ├── low-pass tone shaping
  ├── diffusion delays
  ├── convolution space
  ├── soft-knee compression
  └── master metering
```

## Smoothness policy

No external parameter is connected directly to an audible DSP control. Frequency, timbre and global macro values use smoothing inside the Elementary graph. Note gates use separate attack and release coefficients. Presets are target states rather than replacement graphs. Musical stream changes enter before the previous stream dissolves.

## Completion rule

Every stage must preserve a working browser demo and pass `npm run build` before it reaches `main`.
