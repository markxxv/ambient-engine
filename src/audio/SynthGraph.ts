import { el } from '@elemaudio/core';
import type { AmbientPreset, MixState, VoiceState } from './types';

const MAX_DELAY_SAMPLES = 96_000;

type ElemNode = any;

interface GlobalControls {
  brightness: ElemNode;
  warmth: ElemNode;
  motion: ElemNode;
  space: ElemNode;
  attack: ElemNode;
  release: ElemNode;
  air: ElemNode;
  music: ElemNode;
}

function keyedValue(key: string, value: number): ElemNode {
  return el.const({ key, value });
}

function smoothValue(key: string, value: number, seconds: number): ElemNode {
  return el.smooth(el.tau2pole(seconds), keyedValue(key, value));
}

function sum(nodes: ElemNode[]): ElemNode {
  if (nodes.length === 0) return el.const({ value: 0 });
  if (nodes.length === 1) return nodes[0];
  return el.add(...nodes);
}

function renderVoice(
  voice: VoiceState,
  preset: AmbientPreset,
  controls: GlobalControls,
): [ElemNode, ElemNode] {
  const prefix = `voice:${voice.slot}`;
  const gate = keyedValue(`${prefix}:gate`, voice.gate);
  const frequency = smoothValue(`${prefix}:frequency`, voice.frequency, 0.16);
  const velocity = smoothValue(`${prefix}:velocity`, voice.velocity, 0.24);

  const attackPole = el.tau2pole(el.mul(1 / 6.9, controls.attack));
  const releasePole = el.tau2pole(el.mul(1 / 6.9, controls.release));
  const envelope = el.smooth(el.select(gate, attackPole, releasePole), gate);

  // Extremely restrained pitch movement: enough life to avoid a static sine,
  // but too little to produce an obvious chorus or heavy beating.
  const driftDepth = el.mul(preset.detune, controls.motion, 0.18);
  const driftA = el.add(1, el.mul(driftDepth, el.cycle(0.013 + voice.slot * 0.0009)));
  const driftB = el.add(1, el.mul(driftDepth, el.cycle(0.019 + voice.slot * 0.0007)));

  const center = el.cycle(el.mul(frequency, driftA));
  const lowerSide = el.cycle(el.mul(frequency, 1 - preset.detune * 0.32, driftB));
  const upperSide = el.cycle(el.mul(frequency, 1 + preset.detune * 0.32, driftA));
  const octave = el.cycle(el.mul(frequency, 2.001, driftB));
  const thirdHarmonic = el.cycle(el.mul(frequency, 3.002, driftA));

  // No sub oscillator. The voice is mainly a clean sine core with only a
  // trace of stereo width and upper harmonics.
  const leftOsc = el.add(
    el.mul(0.7, center),
    el.mul(0.18, lowerSide),
    el.mul(0.09, octave),
    el.mul(0.03, thirdHarmonic),
  );

  const rightOsc = el.add(
    el.mul(0.7, center),
    el.mul(0.18, upperSide),
    el.mul(0.09, octave),
    el.mul(0.03, thirdHarmonic),
  );

  const voiceCutoff = el.add(
    900,
    el.mul(2_050, controls.brightness, controls.brightness),
    el.mul(90, velocity),
  );
  const lowLeft = el.svf({ mode: 'lowpass' }, voiceCutoff, 0.38, leftOsc);
  const lowRight = el.svf({ mode: 'lowpass' }, voiceCutoff, 0.38, rightOsc);
  const lightLeft = el.svf({ mode: 'highpass' }, 96, 0.42, lowLeft);
  const lightRight = el.svf({ mode: 'highpass' }, 102, 0.42, lowRight);

  const breath = el.add(0.985, el.mul(0.015, el.cycle(0.018 + voice.slot * 0.0011)));
  const amplitude = el.mul(0.027, velocity, envelope, breath);

  return [el.mul(amplitude, lightLeft), el.mul(amplitude, lightRight)];
}

// This is intentionally kept close to the previous processing path because
// the existing stereo air texture is already approved.
function airEffects(
  input: ElemNode,
  side: 'left' | 'right',
  controls: GlobalControls,
): ElemNode {
  const cutoff = el.add(520, el.mul(5_600, el.mul(controls.brightness, controls.brightness)));
  const filtered = el.svf({ mode: 'lowpass' }, cutoff, 0.58, input);

  const drive = el.add(1.05, el.mul(1.5, controls.warmth));
  const saturated = el.mul(0.8, el.tanh(el.mul(drive, filtered)));

  const delayMs = side === 'left' ? 83 : 127;
  const diffused = el.add(
    el.mul(0.88, saturated),
    el.mul(
      0.22,
      el.delay(
        { size: MAX_DELAY_SAMPLES },
        el.ms2samps(delayMs),
        0.24,
        saturated,
      ),
    ),
  );

  const wet = el.convolve({ path: side === 'left' ? '/ir/soft-left' : '/ir/soft-right' }, diffused);
  return el.add(
    el.mul(el.sub(1, el.mul(0.64, controls.space)), diffused),
    el.mul(0.64, controls.space, wet),
  );
}

function musicEffects(
  input: ElemNode,
  side: 'left' | 'right',
  controls: GlobalControls,
): ElemNode {
  const highPassed = el.svf({ mode: 'highpass' }, side === 'left' ? 112 : 118, 0.42, input);
  const cutoff = el.add(1_050, el.mul(2_700, controls.brightness, controls.brightness));
  const filtered = el.svf({ mode: 'lowpass' }, cutoff, 0.4, highPassed);

  // Barely touch the transient density; the old saturation made the pad feel
  // close and insistent, so this stage remains almost linear.
  const drive = el.add(0.88, el.mul(0.32, controls.warmth));
  const softened = el.mul(0.94, el.tanh(el.mul(drive, filtered)));

  const delayMs = side === 'left' ? 149 : 193;
  const diffused = el.add(
    el.mul(0.94, softened),
    el.mul(
      0.12,
      el.delay(
        { size: MAX_DELAY_SAMPLES },
        el.ms2samps(delayMs),
        0.16,
        softened,
      ),
    ),
  );

  const wet = el.convolve({ path: side === 'left' ? '/ir/soft-left' : '/ir/soft-right' }, diffused);
  const wetAmount = el.mul(0.76, controls.space);

  return el.add(
    el.mul(el.sub(1, wetAmount), diffused),
    el.mul(wetAmount, wet),
  );
}

export function buildSynthGraph(
  voices: VoiceState[],
  preset: AmbientPreset,
  mix: MixState,
): [ElemNode, ElemNode] {
  const controls: GlobalControls = {
    brightness: smoothValue('global:brightness', preset.brightness, 1.4),
    warmth: smoothValue('global:warmth', preset.warmth, 1.8),
    motion: smoothValue('global:motion', preset.motion, 2.4),
    space: smoothValue('global:space', preset.space, 3.2),
    attack: smoothValue('global:attack', preset.attack, 2.8),
    release: smoothValue('global:release', preset.release, 3.8),
    air: smoothValue('mix:air', mix.air, 1.2),
    music: smoothValue('mix:music', mix.music, 1.8),
  };

  const rendered = voices.map((voice) => renderVoice(voice, preset, controls));
  const leftVoices = sum(rendered.map(([left]) => left));
  const rightVoices = sum(rendered.map(([, right]) => right));

  const airAmount = el.add(0.004, el.mul(0.008, controls.brightness));
  const airLeft = el.mul(
    controls.air,
    airAmount,
    el.lowpass(6_500, 0.5, el.pinknoise({ seed: 31 })),
  );
  const airRight = el.mul(
    controls.air,
    airAmount,
    el.lowpass(6_900, 0.5, el.pinknoise({ seed: 47 })),
  );

  const leftAirBus = airEffects(airLeft, 'left', controls);
  const rightAirBus = airEffects(airRight, 'right', controls);
  const leftMusicBus = musicEffects(el.mul(controls.music, leftVoices), 'left', controls);
  const rightMusicBus = musicEffects(el.mul(controls.music, rightVoices), 'right', controls);

  const leftBus = el.add(leftAirBus, leftMusicBus);
  const rightBus = el.add(rightAirBus, rightMusicBus);
  const stereoSidechain = el.add(el.mul(0.5, leftBus), el.mul(0.5, rightBus));

  // Gentle safety compression only. It should never pull the pad forward.
  const leftCompressed = el.skcompress(45, 900, -10, 1.7, 6, stereoSidechain, leftBus);
  const rightCompressed = el.skcompress(45, 900, -10, 1.7, 6, stereoSidechain, rightBus);

  const leftOut = el.meter({ name: 'master-left' }, el.mul(0.68, el.tanh(leftCompressed)));
  const rightOut = el.meter({ name: 'master-right' }, el.mul(0.68, el.tanh(rightCompressed)));

  return [leftOut, rightOut];
}
