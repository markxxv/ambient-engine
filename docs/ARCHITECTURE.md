# Architecture

## Global direction

```text
Atmosphere Generator
  harmony · tempo · density · phrases · scene decisions
                    ↓
             stable event contract
                    ↓
Ambient Synth
  voices · timbre · smoothing · space · safety
                    ↓
                 audio out
```

The synth and generator remain independent. The generator never needs to know oscillator, filter, envelope or effect implementation details.

## Current prototype

```text
TestSequencer
     ↓ notes
AmbientEngine
  ├── input range guard
  ├── 8 voice allocator
  ├── keyed state updates
  └── serialized graph renders
     ↓
SynthGraph
  ├── stereo sine layers
  ├── slow drift
  ├── asymmetric attack/release
  ├── low-pass tone shaping
  ├── tanh warmth
  ├── short diffusion delays
  ├── convolution space
  ├── soft-knee compression
  └── master metering
```

## Smoothness policy

No external parameter is connected directly to an audible DSP control. Frequency, timbre and global macro values use smoothing inside the Elementary graph. Note gates use separate attack and release coefficients. Presets are target states rather than replacement graphs.

## Development stages

1. Playable baseline pad
2. Voice stealing and transition refinement
3. Better stereo ensemble and reverb
4. Stream crossfading contract
5. Generator interface
6. Harmonic and temporal generator
7. Scene evolution and preset automation
8. Performance profiling and mobile constraints

Every stage must preserve a working browser demo.
