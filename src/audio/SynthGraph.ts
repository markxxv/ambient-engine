import { el } from '@elemaudio/core';
import type { AmbientPreset, VoiceState } from './types';

const MAX_DELAY_SAMPLES = 96_000;

type ElemNode = any;

interface GlobalControls {
  brightness: ElemNode;
  warmth: ElemNode;
  motion: ElemNode;
  space: ElemNode;
  attack: ElemNode;
  release: ElemNode;
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
  const frequency = smoothValue(`${prefix}:frequency`, voice.frequency, 0.045);
  const velocity = smoothValue(`${prefix}:velocity`, voice.velocity, 0.08);

  const attackPole = el.tau2pole(el.mul(1 / 6.9, controls.attack));
  const releasePole = el.tau2pole(el.mul(1 / 6.9, controls.release));
  const envelope = el.smooth(el.select(gate, attackPole, releasePole), gate);

  const driftDepth = el.mul(preset.detune, controls.motion);
  const driftA = el.add(1, el.mul(driftDepth, el.cycle(0.031 + voice.slot * 0.0021)));
  const driftB = el.add(1, el.mul(driftDepth, el.cycle(0.043 + voice.slot * 0.0017)));

  const fundamental = el.cycle(el.mul(frequency, driftA));
  const lower = el.cycle(el.mul(frequency, 0.9972, driftB));
  const upper = el.cycle(el.mul(frequency, 1.0028, driftA));
  const octave = el.cycle(el.mul(frequency, 2.001));

  const leftOsc = el.add(
    el.mul(0.46, fundamental),
    el.mul(0.28, lower),
    el.mul(0.16, upper),
    el.mul(0.1, octave),
  );

  const rightOsc = el.add(
    el.mul(0.46, fundamental),
    el.mul(0.16, lower),
    el.mul(0.28, upper),
    el.mul(0.1, octave),
  );

  const amplitude = el.mul(0.115, velocity, envelope);
  return [el.mul(amplitude, leftOsc), el.mul(amplitude, rightOsc)];
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
): [ElemNode, ElemNode] {
  const controls: GlobalControls = {
    brightness: smoothValue('global:brightness', preset.brightness, 1.15),
    warmth: smoothValue('global:warmth', preset.warmth, 1.4),
    motion: smoothValue('global:motion', preset.motion, 1.8),
    space: smoothValue('global:space', preset.space, 2.6),
    attack: smoothValue('global:attack', preset.attack, 2.4),
    release: smoothValue('global:release', preset.release, 3.2),
  };

  const rendered = voices.map((voice) => renderVoice(voice, preset, controls));
  const leftVoices = sum(rendered.map(([left]) => left));
  const rightVoices = sum(rendered.map(([, right]) => right));

  const airAmount = el.add(0.004, el.mul(0.008, controls.brightness));
  const airLeft = el.mul(airAmount, el.lowpass(6_500, 0.5, el.pinknoise({ seed: 31 })));
  const airRight = el.mul(airAmount, el.lowpass(6_900, 0.5, el.pinknoise({ seed: 47 })));

  const leftBus = channelEffects(el.add(leftVoices, airLeft), 'left', controls);
  const rightBus = channelEffects(el.add(rightVoices, airRight), 'right', controls);

  const stereoSidechain = el.add(el.mul(0.5, leftBus), el.mul(0.5, rightBus));
  const leftCompressed = el.skcompress(28, 650, -18, 2.4, 9, stereoSidechain, leftBus);
  const rightCompressed = el.skcompress(28, 650, -18, 2.4, 9, stereoSidechain, rightBus);

  const leftOut = el.meter({ name: 'master-left' }, el.mul(0.62, el.tanh(leftCompressed)));
  const rightOut = el.meter({ name: 'master-right' }, el.mul(0.62, el.tanh(rightCompressed)));

  return [leftOut, rightOut];
}
