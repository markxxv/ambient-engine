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
  const frequency = smoothValue(`${prefix}:frequency`, voice.frequency, 0.11);
  const velocity = smoothValue(`${prefix}:velocity`, voice.velocity, 0.18);

  const attackPole = el.tau2pole(el.mul(1 / 6.9, controls.attack));
  const releasePole = el.tau2pole(el.mul(1 / 6.9, controls.release));
  const envelope = el.smooth(el.select(gate, attackPole, releasePole), gate);

  const driftDepth = el.mul(preset.detune, controls.motion, 0.42);
  const driftA = el.add(1, el.mul(driftDepth, el.cycle(0.018 + voice.slot * 0.0013)));
  const driftB = el.add(1, el.mul(driftDepth, el.cycle(0.024 + voice.slot * 0.0011)));

  const center = el.cycle(el.mul(frequency, driftA));
  const lowerSide = el.cycle(el.mul(frequency, 1 - preset.detune * 0.62, driftB));
  const upperSide = el.cycle(el.mul(frequency, 1 + preset.detune * 0.62, driftA));
  const sub = el.cycle(el.mul(frequency, 0.5, driftB));
  const octave = el.cycle(el.mul(frequency, 2.001, driftA));
  const thirdHarmonic = el.cycle(el.mul(frequency, 3.002, driftB));
  const fifthHarmonic = el.cycle(el.mul(frequency, 5.003, driftA));

  const leftOsc = el.add(
    el.mul(0.48, center),
    el.mul(0.19, lowerSide),
    el.mul(0.15, sub),
    el.mul(0.11, octave),
    el.mul(0.05, thirdHarmonic),
    el.mul(0.02, fifthHarmonic),
  );

  const rightOsc = el.add(
    el.mul(0.48, center),
    el.mul(0.19, upperSide),
    el.mul(0.15, sub),
    el.mul(0.11, octave),
    el.mul(0.05, thirdHarmonic),
    el.mul(0.02, fifthHarmonic),
  );

  const voiceCutoff = el.add(
    480,
    el.mul(1_750, controls.brightness, controls.brightness),
    el.mul(180, velocity),
  );
  const softLeft = el.svf({ mode: 'lowpass' }, voiceCutoff, 0.42, leftOsc);
  const softRight = el.svf({ mode: 'lowpass' }, voiceCutoff, 0.42, rightOsc);

  const breath = el.add(0.97, el.mul(0.03, el.cycle(0.026 + voice.slot * 0.0017)));
  const amplitude = el.mul(0.052, velocity, envelope, breath);

  return [el.mul(amplitude, softLeft), el.mul(amplitude, softRight)];
}

function channelEffects(
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
    music: smoothValue('mix:music', mix.music, 1.4),
  };

  const rendered = voices.map((voice) => renderVoice(voice, preset, controls));
  const leftVoices = sum(rendered.map(([left]) => left));
  const rightVoices = sum(rendered.map(([, right]) => right));

  // Keep the original air layer intact; only its independent level is new.
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

  const leftInput = el.add(el.mul(controls.music, leftVoices), airLeft);
  const rightInput = el.add(el.mul(controls.music, rightVoices), airRight);
  const leftBus = channelEffects(leftInput, 'left', controls);
  const rightBus = channelEffects(rightInput, 'right', controls);

  const stereoSidechain = el.add(el.mul(0.5, leftBus), el.mul(0.5, rightBus));
  const leftCompressed = el.skcompress(28, 650, -18, 2.4, 9, stereoSidechain, leftBus);
  const rightCompressed = el.skcompress(28, 650, -18, 2.4, 9, stereoSidechain, rightBus);

  const leftOut = el.meter({ name: 'master-left' }, el.mul(0.62, el.tanh(leftCompressed)));
  const rightOut = el.meter({ name: 'master-right' }, el.mul(0.62, el.tanh(rightCompressed)));

  return [leftOut, rightOut];
}
