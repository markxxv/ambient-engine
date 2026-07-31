import './style.css';
import { AmbientEngine } from './audio/AmbientEngine';
import { AMBIENT_PRESETS } from './audio/presets';
import type { AmbientParameter, EngineSnapshot } from './audio/types';
import { TestSequencer } from './test-generator/TestSequencer';

const engine = new AmbientEngine();
const sequencer = new TestSequencer(engine);
const appElement = document.querySelector<HTMLElement>('#app');

if (!appElement) throw new Error('Missing #app root element');
const app = appElement;

const keyboardNotes = [48, 50, 52, 53, 55, 57, 59, 60, 62, 64, 65, 67];
const noteNames = ['C3', 'D3', 'E3', 'F3', 'G3', 'A3', 'B3', 'C4', 'D4', 'E4', 'F4', 'G4'];
const controlParameters: Array<{ id: AmbientParameter; label: string }> = [
  { id: 'air', label: 'Air' },
  { id: 'music', label: 'Music' },
  { id: 'brightness', label: 'Brightness' },
  { id: 'warmth', label: 'Warmth' },
  { id: 'motion', label: 'Motion' },
  { id: 'space', label: 'Space' },
];

app.innerHTML = `
  <section class="shell">
    <header class="topbar">
      <div class="brand">
        <span class="brand-mark" aria-hidden="true"><i></i><i></i><i></i></span>
        <div>
          <p>Live synthesis study</p>
          <h1>Ambient Engine</h1>
        </div>
      </div>
      <div class="status" data-status>Audio suspended</div>
    </header>

    <section class="hero-panel">
      <div class="orb" aria-hidden="true">
        <div class="orb-ring orb-ring-a"></div>
        <div class="orb-ring orb-ring-b"></div>
        <div class="orb-core"></div>
      </div>
      <div class="hero-copy">
        <p class="eyebrow">Prototype 0.2</p>
        <h2>A softer polyphonic pad with a separate atmosphere layer.</h2>
        <p>Twelve voices, slow shared harmonies, independent Air and Music levels and continuously diffused space.</p>
        <div class="primary-actions">
          <button class="button button-primary" data-start>Start audio</button>
          <button class="button" data-sequence disabled>Play atmosphere</button>
        </div>
      </div>
    </section>

    <section class="workspace">
      <article class="panel presets-panel">
        <div class="panel-heading">
          <div><span>01</span><h3>Character</h3></div>
          <p>Preset changes morph continuously without changing the mix.</p>
        </div>
        <div class="preset-grid">
          ${AMBIENT_PRESETS.map((preset, index) => `
            <button class="preset-card ${index === 1 ? 'is-active' : ''}" data-preset="${preset.id}" disabled>
              <span>${String(index + 1).padStart(2, '0')}</span>
              <strong>${preset.name}</strong>
              <small>${preset.description}</small>
            </button>
          `).join('')}
        </div>
      </article>

      <article class="panel controls-panel">
        <div class="panel-heading">
          <div><span>02</span><h3>Atmosphere</h3></div>
          <p>Air and music are independent; every transition is smoothed.</p>
        </div>
        <div class="controls">
          ${controlParameters.map((parameter) => `
            <label class="control">
              <span><b>${parameter.label}</b><output data-output="${parameter.id}">0</output></span>
              <input data-parameter="${parameter.id}" type="range" min="0" max="1" step="0.01" value="0.5" disabled />
            </label>
          `).join('')}
        </div>
      </article>

      <article class="panel keyboard-panel">
        <div class="panel-heading">
          <div><span>03</span><h3>Input test</h3></div>
          <p>Touch individual notes or let the new modal progression breathe.</p>
        </div>
        <div class="keyboard">
          ${keyboardNotes.map((midi, index) => `
            <button class="key" data-note="${midi}" disabled>
              <span>${noteNames[index]}</span>
            </button>
          `).join('')}
        </div>
      </article>
    </section>

    <footer class="metrics">
      <div><span>Voices</span><strong data-voices>0 / 12</strong></div>
      <div><span>Peak</span><strong data-peak>−∞ dB</strong></div>
      <div><span>Engine</span><strong>Elementary Audio</strong></div>
      <div><span>Stage</span><strong>Soft pad study</strong></div>
    </footer>
  </section>
`;

const startButton = app.querySelector<HTMLButtonElement>('[data-start]');
const sequenceButton = app.querySelector<HTMLButtonElement>('[data-sequence]');
const statusElement = app.querySelector<HTMLElement>('[data-status]');
const voicesElement = app.querySelector<HTMLElement>('[data-voices]');
const peakElement = app.querySelector<HTMLElement>('[data-peak]');
const interactiveElements = app.querySelectorAll<HTMLButtonElement | HTMLInputElement>('[data-sequence], [data-preset], [data-parameter], [data-note]');

function enableInterface(): void {
  interactiveElements.forEach((element) => {
    element.disabled = false;
  });
}

function setSequenceState(): void {
  if (!sequenceButton) return;
  sequenceButton.textContent = sequencer.isRunning() ? 'Stop atmosphere' : 'Play atmosphere';
  sequenceButton.classList.toggle('is-running', sequencer.isRunning());
}

function updateSnapshot(snapshot: EngineSnapshot): void {
  if (statusElement) {
    statusElement.textContent = snapshot.initialized ? 'Audio engine active' : 'Audio suspended';
    statusElement.classList.toggle('is-active', snapshot.initialized);
  }

  if (voicesElement) voicesElement.textContent = `${snapshot.activeVoices} / ${snapshot.maxVoices}`;
  if (peakElement) {
    const db = snapshot.peak > 0 ? 20 * Math.log10(snapshot.peak) : Number.NEGATIVE_INFINITY;
    peakElement.textContent = Number.isFinite(db) ? `${db.toFixed(1)} dB` : '−∞ dB';
  }

  (Object.entries(snapshot.parameters) as [AmbientParameter, number][]).forEach(([parameter, value]) => {
    const input = app.querySelector<HTMLInputElement>(`[data-parameter="${parameter}"]`);
    const output = app.querySelector<HTMLOutputElement>(`[data-output="${parameter}"]`);
    if (input && document.activeElement !== input) input.value = value.toString();
    if (output) output.value = Math.round(value * 100).toString();
  });

  app.querySelectorAll<HTMLElement>('[data-preset]').forEach((element) => {
    element.classList.toggle('is-active', element.dataset.preset === snapshot.presetId);
  });
}

engine.subscribe(updateSnapshot);

startButton?.addEventListener('click', async () => {
  startButton.disabled = true;
  startButton.textContent = 'Starting…';

  try {
    await engine.initialize();
    startButton.textContent = 'Audio active';
    startButton.classList.add('is-active');
    enableInterface();
  } catch (error) {
    console.error(error);
    startButton.disabled = false;
    startButton.textContent = 'Start failed — retry';
    if (statusElement) statusElement.textContent = 'Could not initialize audio';
  }
});

sequenceButton?.addEventListener('click', () => {
  if (sequencer.isRunning()) sequencer.stop();
  else sequencer.start();
  setSequenceState();
});

app.querySelectorAll<HTMLButtonElement>('[data-preset]').forEach((button) => {
  button.addEventListener('click', () => {
    if (button.dataset.preset) engine.setPreset(button.dataset.preset);
  });
});

app.querySelectorAll<HTMLInputElement>('[data-parameter]').forEach((input) => {
  input.addEventListener('input', () => {
    engine.setParameter(input.dataset.parameter as AmbientParameter, Number(input.value));
  });
});

app.querySelectorAll<HTMLButtonElement>('[data-note]').forEach((button) => {
  const midi = Number(button.dataset.note);
  const press = (): void => {
    button.classList.add('is-active');
    engine.noteOn(midi, 0.44);
  };
  const release = (): void => {
    button.classList.remove('is-active');
    engine.noteOff(midi);
  };

  button.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    button.setPointerCapture(event.pointerId);
    press();
  });
  button.addEventListener('pointerup', release);
  button.addEventListener('pointercancel', release);
  button.addEventListener('lostpointercapture', release);
});
