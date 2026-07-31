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
  keys: ElemNode;
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

function renderPadVoice(
  voice: VoiceState,
  preset: AmbientPreset,
  controls: GlobalControls,
): [ElemNode, ElemNode] {
  const prefix = `pad:${voice.slot}`;
  const gate = keyedValue(`${prefix}:gate`, voice.gate);
  const frequency = smoothValue(`${prefix}:frequency`, voice.frequency, 0.16);
  const velocity = smoothValue(`${prefix}:velocity`, voice.velocity, 0.24);

  const attackPole = el.tau2pole(el.mul(1 / 6.9, controls.attack));
  const releasePole = el.tau2pole(el.mul(1 / 6.9, controls.release));
  const envelope = el.smooth(el.select(gate, attackPole, releasePole), gate);

  const driftDepth = el.mul(preset.detune, controls.motion, 0.18);
  const driftA = el.add(1, el.mul(driftDepth, el.cycle(0.013 + voice.slot * 0.0009)));
  const driftB = el.add(1, el.mul(driftDepth, el.cycle(0.019 + voice.slot * 0.0007)));

  const center = el.cycle(el.mul(frequency, driftA));
  const lowerSide = el.cycle(el.mul(frequency, 1 - preset.detune * 0.32, driftB));
  const upperSide = el.cycle(el.mul(frequency, 1 + preset.detune * 0.32, driftA));
  const octave = el.cycle(el.mul(frequency, 2.001, driftB));
  const thirdHarmonic = el.cycle(el.mul(frequency, 3.002, driftA));

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

function renderKeyVoice(voice: VoiceState): [ElemNode, ElemNode] {
  const prefix = `keys:${voice.slot}`;
  const gate = keyedValue(`${prefix}:gate`, voice.gate);
  const frequency = smoothValue(`${prefix}:frequency`, voice.frequency, 0.012);
  const velocity = smoothValue(`${prefix}:velocity`, voice.velocity, 0.035);

  const bodyEnvelope = el.smooth(
    el.select(gate, el.tau2pole(0.006), el.tau2pole(2.7)),
    gate,
  );
  const shimmerEnvelope = el.smooth(
    el.select(gate, el.tau2pole(0.003), el.tau2pole(1.15)),
    gate,
  );

  const fundamental = el.cycle(frequency);
  const octaveLeft = el.cycle(el.mul(frequency, 2.003));
  const octaveRight = el.cycle(el.mul(frequency, 1.997));
  const glassThird = el.cycle(el.mul(frequency, 3.012));
  const glassFourth = el.cycle(el.mul(frequency, 4.027));
  const highChime = el.cycle(el.mul(frequency, 6.041));

  const leftTone = el.add(
    el.mul(0.7, bodyEnvelope, fundamental),
    el.mul(0.2, bodyEnvelope, octaveLeft),
    el.mul(0.07, shimmerEnvelope, glassThird),
    el.mul(0.025, shimmerEnvelope, glassFourth),
    el.mul(0.005, shimmerEnvelope, highChime),
  );
  const rightTone = el.add(
    el.mul(0.7, bodyEnvelope, fundamental),
    el.mul(0.2, bodyEnvelope, octaveRight),
    el.mul(0.07, shimmerEnvelope, glassThird),
    el.mul(0.025, shimmerEnvelope, glassFourth),
    el.mul(0.005, shimmerEnvelope, highChime),
  );

  const softenedLeft = el.svf(
    { mode: 'lowpass' },
    5_400,
    0.34,
    el.svf({ mode: 'highpass' }, 180, 0.42, leftTone),
  );
  const softenedRight = el.svf(
    { mode: 'lowpass' },
    5_200,
    0.34,
    el.svf({ mode: 'highpass' }, 190, 0.42, rightTone),
  );

  const pan = (voice.slot / 5) * 1.4 - 0.7;
  const leftGain = Math.sqrt((1 - pan) * 0.5);
  const rightGain = Math.sqrt((1 + pan) * 0.5);
  const amplitude = el.mul(0.042, velocity);

  return [
    el.mul(amplitude, leftGain, softenedLeft),
    el.mul(amplitude, rightGain, softenedRight),
  ];
}

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

function keysEffects(
  input: ElemNode,
  side: 'left' | 'right',
  controls: GlobalControls,
): ElemNode {
  const filtered = el.svf(
    { mode: 'lowpass' },
    el.add(3_800, el.mul(2_200, controls.brightness)),
    0.36,
    input,
  );
  const delayMs = side === 'left' ? 337 : 463;
  const echo = el.delay(
    { size: MAX_DELAY_SAMPLES },
    el.ms2samps(delayMs),
    0.18,
    filtered,
  );
  const diffused = el.add(el.mul(0.9, filtered), el.mul(0.13, echo));
  const wet = el.convolve({ path: side === 'left' ? '/ir/soft-left' : '/ir/soft-right' }, diffused);
  const wetAmount = el.add(0.62, el.mul(0.24, controls.space));

  return el.add(
    el.mul(el.sub(1, wetAmount), diffused),
    el.mul(wetAmount, wet),
  );
}

export function buildSynthGraph(
  padVoices: VoiceState[],
  keyVoices: VoiceState[],
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
    keys: smoothValue('mix:keys', mix.keys, 1.6),
  };

  const renderedPad = padVoices.map((voice) => renderPadVoice(voice, preset, controls));
  const leftPad = sum(renderedPad.map(([left]) => left));
  const rightPad = sum(renderedPad.map(([, right]) => right));

  const renderedKeys = keyVoices.map((voice) => renderKeyVoice(voice));
  const leftKeys = sum(renderedKeys.map(([left]) => left));
  const rightKeys = sum(renderedKeys.map(([, right]) => right));

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
  const leftMusicBus = musicEffects(el.mul(controls.music, leftPad), 'left', controls);
  const rightMusicBus = musicEffects(el.mul(controls.music, rightPad), 'right', controls);
  const leftKeysBus = keysEffects(el.mul(controls.keys, leftKeys), 'left', controls);
  const rightKeysBus = keysEffects(el.mul(controls.keys, rightKeys), 'right', controls);

  const leftBus = el.add(leftAirBus, leftMusicBus, leftKeysBus);
  const rightBus = el.add(rightAirBus, rightMusicBus, rightKeysBus);
  const stereoSidechain = el.add(el.mul(0.5, leftBus), el.mul(0.5, rightBus));

  const leftCompressed = el.skcompress(45, 900, -10, 1.7, 6, stereoSidechain, leftBus);
  const rightCompressed = el.skcompress(45, 900, -10, 1.7, 6, stereoSidechain, rightBus);

  const leftOut = el.meter({ name: 'master-left' }, el.mul(0.68, el.tanh(leftCompressed)));
  const rightOut = el.meter({ name: 'master-right' }, el.mul(0.68, el.tanh(rightCompressed)));

  return [leftOut, rightOut];
}
