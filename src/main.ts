import './style.css';
import { AmbientEngine } from './audio/AmbientEngine';
import { AMBIENT_PRESETS } from './audio/presets';
import type { AmbientParameter, EngineSnapshot } from './audio/types';
import { TestSequencer } from './test-generator/TestSequencer';

const engine = new AmbientEngine();
const sequencer = new TestSequencer(engine);
const app = document.querySelector<HTMLElement>('#app');

if (!app) throw new Error('Missing #app root element');

const mixControls: Array<{
  id: AmbientParameter;
  label: string;
  description: string;
  icon: string;
}> = [
  {
    id: 'air',
    label: 'Air',
    description: 'Base atmosphere',
    icon: '<path d="M3 9c2.4-3 4.8-3 7.2 0s4.8 3 7.2 0M3 15c2.4-3 4.8-3 7.2 0s4.8 3 7.2 0"/>',
  },
  {
    id: 'music',
    label: 'Music',
    description: 'Soft harmony',
    icon: '<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2.5"/><path d="M12 2v2M22 12h-2M12 22v-2M2 12h2"/>',
  },
  {
    id: 'keys',
    label: 'Keys',
    description: 'Glass melody',
    icon: '<path d="M3 6h18v12H3zM7 6v12M11 6v12M15 6v12M19 6v12M6 6v7h3V6M14 6v7h3V6"/>',
  },
];

const macroControls: Array<{ id: AmbientParameter; label: string }> = [
  { id: 'brightness', label: 'Light' },
  { id: 'warmth', label: 'Warmth' },
  { id: 'motion', label: 'Motion' },
  { id: 'space', label: 'Space' },
];

const visualSvg = `
  <svg viewBox="0 0 1000 1000" role="img" aria-label="Orbital ambient engine control">
    <defs>
      <radialGradient id="visual-glow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#fff" stop-opacity=".22"/>
        <stop offset="18%" stop-color="#fff" stop-opacity=".09"/>
        <stop offset="48%" stop-color="#fff" stop-opacity=".018"/>
        <stop offset="100%" stop-color="#fff" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="visual-line" x1="360" y1="640" x2="640" y2="360" gradientUnits="userSpaceOnUse">
        <stop offset="0" stop-color="#fff" stop-opacity="0"/>
        <stop offset=".3" stop-color="#fff" stop-opacity=".38"/>
        <stop offset=".5" stop-color="#fff" stop-opacity="1"/>
        <stop offset=".7" stop-color="#fff" stop-opacity=".38"/>
        <stop offset="1" stop-color="#fff" stop-opacity="0"/>
      </linearGradient>
      <radialGradient id="visual-planet">
        <stop offset="0" stop-color="#fff" stop-opacity=".7"/>
        <stop offset=".35" stop-color="#fff" stop-opacity=".16"/>
        <stop offset="1" stop-color="#fff" stop-opacity="0"/>
      </radialGradient>
    </defs>

    <g class="visual-glow-field" aria-hidden="true">
      <circle cx="500" cy="500" r="430" fill="url(#visual-glow)"/>
      <circle cx="500" cy="500" r="250" fill="url(#visual-glow)" opacity=".72"/>
    </g>

    <g class="visual-particles" fill="#fff" aria-hidden="true">
      <circle cx="267" cy="251" r="1.5"/><circle cx="734" cy="284" r="1.1"/>
      <circle cx="828" cy="474" r="1.4"/><circle cx="758" cy="714" r="1.2"/>
      <circle cx="508" cy="844" r="1.3"/><circle cx="294" cy="746" r="1.1"/>
      <circle cx="166" cy="487" r="1.2"/><circle cx="428" cy="146" r="1"/>
    </g>

    <g class="visual-orbits" fill="none" stroke="#fff" stroke-linecap="round" aria-hidden="true">
      <circle cx="500" cy="500" r="238" stroke-opacity=".19" stroke-dasharray="1 10"/>
      <circle cx="500" cy="500" r="304" stroke-opacity=".14" stroke-dasharray="2 13"/>
      <circle cx="500" cy="500" r="374" stroke-opacity=".1" stroke-dasharray="1 15"/>
      <circle cx="500" cy="500" r="443" stroke-opacity=".075" stroke-dasharray="2 17"/>
      <path d="M246 291A338 338 0 0 1 500 162" stroke-opacity=".19"/>
      <path d="M705 231A348 348 0 0 1 842 500" stroke-opacity=".16"/>
      <path d="M755 720A358 358 0 0 1 503 846" stroke-opacity=".15"/>
      <path d="M220 699A370 370 0 0 0 414 847" stroke-opacity=".13"/>
    </g>

    <g aria-hidden="true">
      <g transform="rotate(-35 500 500)"><g class="visual-orbiter visual-orbiter-a">
        <circle cx="738" cy="500" r="15" fill="url(#visual-planet)"/><circle cx="738" cy="500" r="4.6" fill="#fff" opacity=".9"/>
      </g></g>
      <g transform="rotate(102 500 500)"><g class="visual-orbiter visual-orbiter-b">
        <circle cx="804" cy="500" r="13" fill="url(#visual-planet)"/><circle cx="804" cy="500" r="3.8" fill="#fff" opacity=".72"/>
      </g></g>
      <g transform="rotate(211 500 500)"><g class="visual-orbiter visual-orbiter-c">
        <circle cx="874" cy="500" r="12" fill="url(#visual-planet)"/><circle cx="874" cy="500" r="3.4" fill="#fff" opacity=".62"/>
      </g></g>
      <g transform="rotate(307 500 500)"><g class="visual-orbiter visual-orbiter-d">
        <circle cx="943" cy="500" r="11" fill="url(#visual-planet)"/><circle cx="943" cy="500" r="3" fill="#fff" opacity=".55"/>
      </g></g>
    </g>

    <g class="visual-mark">
      <circle cx="500" cy="500" r="177" fill="none" stroke="#fff" stroke-opacity=".16" stroke-width="2"/>
      <line x1="365" y1="635" x2="635" y2="365" stroke="url(#visual-line)" stroke-width="6" stroke-linecap="round"/>
      <circle cx="500" cy="500" r="68" fill="none" stroke="#fff" stroke-width="6"/>
      <circle cx="500" cy="500" r="86" fill="none" stroke="#fff" stroke-opacity=".04" stroke-width="18"/>
    </g>
  </svg>
`;

app.innerHTML = `
  <section class="app-shell">
    <header class="topline">
      <div class="identity">
        <span class="identity-index">AE / 01</span>
        <div>
          <h1>Ambient Engine</h1>
          <p>Live generative sound</p>
        </div>
      </div>
      <div class="engine-state" data-status>Ready</div>
    </header>

    <main class="instrument">
      <section class="visual-section">
        <button class="play-visual" data-play type="button" aria-label="Start ambient engine" aria-pressed="false">
          ${visualSvg}
          <span class="play-caption" data-play-caption>Start</span>
        </button>

        <div class="character-strip" aria-label="Sound character">
          <span class="strip-label">Character</span>
          <div class="preset-list">
            ${AMBIENT_PRESETS.map((preset, index) => `
              <button class="preset-button ${index === 1 ? 'is-active' : ''}" data-preset="${preset.id}" type="button">
                ${preset.name}
              </button>
            `).join('')}
          </div>
        </div>
      </section>

      <aside class="control-section">
        <div class="section-heading">
          <span>Mix</span>
          <small>Independent layers</small>
        </div>

        <div class="mix-list">
          ${mixControls.map((control) => `
            <label class="mix-control">
              <span class="control-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24">${control.icon}</svg>
              </span>
              <span class="control-copy">
                <strong>${control.label}</strong>
                <small>${control.description}</small>
              </span>
              <span class="range-shell">
                <input data-parameter="${control.id}" type="range" min="0" max="1" step="0.01" value="0" />
              </span>
              <output data-output="${control.id}">00</output>
            </label>
          `).join('')}
        </div>

        <div class="shape-section">
          <div class="section-heading">
            <span>Shape</span>
            <small>Slow morphing</small>
          </div>
          <div class="shape-grid">
            ${macroControls.map((control) => `
              <label class="shape-control">
                <span><b>${control.label}</b><output data-output="${control.id}">00</output></span>
                <input data-parameter="${control.id}" type="range" min="0" max="1" step="0.01" value="0" />
              </label>
            `).join('')}
          </div>
        </div>
      </aside>
    </main>

    <footer class="bottomline">
      <span>Continuous ambient synthesis</span>
      <span>Click the centre to play or pause</span>
    </footer>
  </section>
`;

const playButton = app.querySelector<HTMLButtonElement>('[data-play]');
const playCaption = app.querySelector<HTMLElement>('[data-play-caption]');
const statusElement = app.querySelector<HTMLElement>('[data-status]');

if (!playButton || !playCaption || !statusElement) {
  throw new Error('Missing playback controls');
}

let isPlaying = false;
let isChangingState = false;

function updatePlaybackUi(): void {
  playButton.classList.toggle('is-playing', isPlaying);
  playButton.setAttribute('aria-pressed', isPlaying.toString());
  playButton.setAttribute('aria-label', isPlaying ? 'Pause ambient engine' : 'Start ambient engine');
  playCaption.textContent = isPlaying ? 'Pause' : 'Start';
  statusElement.textContent = isPlaying ? 'Playing' : 'Ready';
  statusElement.classList.toggle('is-playing', isPlaying);
}

function setRangeValue(parameter: AmbientParameter, value: number): void {
  const input = app.querySelector<HTMLInputElement>(`[data-parameter="${parameter}"]`);
  const output = app.querySelector<HTMLOutputElement>(`[data-output="${parameter}"]`);
  const percentage = Math.round(value * 100);

  if (input && document.activeElement !== input) input.value = value.toString();
  input?.style.setProperty('--range-value', `${percentage}%`);
  if (output) output.value = percentage.toString().padStart(2, '0');
}

function updateSnapshot(snapshot: EngineSnapshot): void {
  (Object.entries(snapshot.parameters) as [AmbientParameter, number][]).forEach(([parameter, value]) => {
    setRangeValue(parameter, value);
  });

  app.querySelectorAll<HTMLButtonElement>('[data-preset]').forEach((button) => {
    button.classList.toggle('is-active', button.dataset.preset === snapshot.presetId);
  });
}

engine.subscribe(updateSnapshot);

playButton.addEventListener('click', async () => {
  if (isChangingState) return;
  isChangingState = true;
  playButton.disabled = true;

  try {
    if (isPlaying) {
      sequencer.stop();
      const context = (engine as unknown as { context: AudioContext | null }).context;
      await context?.suspend();
      isPlaying = false;
    } else {
      await engine.initialize();
      sequencer.start();
      isPlaying = true;
    }
    updatePlaybackUi();
  } catch (error) {
    console.error(error);
    statusElement.textContent = 'Audio unavailable';
  } finally {
    isChangingState = false;
    playButton.disabled = false;
  }
});

app.querySelectorAll<HTMLButtonElement>('[data-preset]').forEach((button) => {
  button.addEventListener('click', () => {
    if (button.dataset.preset) engine.setPreset(button.dataset.preset);
  });
});

app.querySelectorAll<HTMLInputElement>('[data-parameter]').forEach((input) => {
  input.addEventListener('input', () => {
    const parameter = input.dataset.parameter as AmbientParameter;
    const value = Number(input.value);
    input.style.setProperty('--range-value', `${Math.round(value * 100)}%`);
    engine.setParameter(parameter, value);
  });
});

updatePlaybackUi();
