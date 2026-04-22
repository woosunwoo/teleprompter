const scriptInput = document.getElementById('scriptInput');
const scriptDisplay = document.getElementById('scriptDisplay');
const viewport = document.getElementById('viewport');
const inner = document.getElementById('inner');
const prompterPanel = document.getElementById('prompterPanel');

const toggleScrollBtn = document.getElementById('toggleScrollBtn');
const resetBtn = document.getElementById('resetBtn');

const orientationPreset = document.getElementById('orientationPreset');
const flipXToggle = document.getElementById('flipXToggle');
const flipYToggle = document.getElementById('flipYToggle');
const rotateToggle = document.getElementById('rotateToggle');
const recalibrateBtn = document.getElementById('recalibrateBtn');

const fontDecBtn = document.getElementById('fontDecBtn');
const fontIncBtn = document.getElementById('fontIncBtn');
const fontSizeRange = document.getElementById('fontSizeRange');
const fontSizeValue = document.getElementById('fontSizeValue');

const speedRange = document.getElementById('speedRange');
const speedValue = document.getElementById('speedValue');

const clearBtn = document.getElementById('clearBtn');
const loadSampleBtn = document.getElementById('loadSampleBtn');
const loadCalibScriptBtn = document.getElementById('loadCalibScriptBtn');
const prompterOnlyBtn = document.getElementById('prompterOnlyBtn');
const enterFullscreenBtn = document.getElementById('enterFullscreenBtn');
const swapPanelsBtn = document.getElementById('swapPanelsBtn');

const overlayToggleBtn = document.getElementById('overlayToggleBtn');
const overlayExitBtn = document.getElementById('overlayExitBtn');
const overlayScrollBtn = document.getElementById('overlayScrollBtn');
const overlayResetBtn = document.getElementById('overlayResetBtn');
const overlayFullscreenBtn = document.getElementById('overlayFullscreenBtn');

const calibrationCard = document.getElementById('calibrationCard');
const calibTopIs1Btn = document.getElementById('calibTopIs1Btn');
const calibTopIs3Btn = document.getElementById('calibTopIs3Btn');
const calibMotionUpBtn = document.getElementById('calibMotionUpBtn');
const calibMotionDownBtn = document.getElementById('calibMotionDownBtn');
const calibStatus = document.getElementById('calibStatus');
const calibScrollBtn = document.getElementById('calibScrollBtn');
const applyCalibrationBtn = document.getElementById('applyCalibrationBtn');
const cancelCalibrationBtn = document.getElementById('cancelCalibrationBtn');

const SETTINGS_KEY = 'teleprompter.settings.v2';
const CALIBRATION_SCRIPT = [
  'LINE 1',
  '',
  'LINE 2',
  '',
  'LINE 3',
  '',
  'LINE 4',
  '',
  'LINE 5',
  '',
  'LINE 6',
  '',
  'LINE 7',
  '',
  'LINE 8',
  '',
  'LINE 9',
  '',
  'LINE 10',
  '',
  'LINE 11',
  '',
  'LINE 12',
].join('\n');

const PRESETS = {
  default: {
    flipX: false,
    flipY: false,
    rotate180: false,
    scrollDirection: 'up',
  },
  diy45: {
    flipX: false,
    flipY: true,
    rotate180: false,
    scrollDirection: 'up',
  },
};

const DEFAULTS = {
  fontSizePx: 56,
  speedPxPerSec: 60,
  preset: 'diy45',
};

const state = {
  preset: DEFAULTS.preset,
  orientation: {
    flipX: PRESETS[DEFAULTS.preset].flipX,
    flipY: PRESETS[DEFAULTS.preset].flipY,
    rotate180: PRESETS[DEFAULTS.preset].rotate180,
  },
  scrollDirection: PRESETS[DEFAULTS.preset].scrollDirection,
  calibration: {
    topLine: null,
    motion: null,
  },
};

let isRunning = false;
let rafId = null;
let lastTs = null;
let scrollY = 0;

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveSettings() {
  try {
    const payload = {
      fontSizePx: Number(fontSizeRange.value),
      speedPxPerSec: Number(speedRange.value),
      preset: state.preset,
      orientation: { ...state.orientation },
      scrollDirection: state.scrollDirection,
    };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(payload));
  } catch {
    // Ignore storage failures.
  }
}

function syncOrientationControls() {
  flipXToggle.checked = state.orientation.flipX;
  flipYToggle.checked = state.orientation.flipY;
  rotateToggle.checked = state.orientation.rotate180;
  orientationPreset.value = state.preset;
}

function setFontSize(px, { persist = true } = {}) {
  const v = clamp(Math.round(px), Number(fontSizeRange.min), Number(fontSizeRange.max));
  fontSizeRange.value = String(v);
  fontSizeValue.textContent = String(v);
  scriptDisplay.style.fontSize = `${v}px`;
  if (persist) saveSettings();
}

function setSpeed(pxPerSec, { persist = true } = {}) {
  const v = clamp(Math.round(pxPerSec), Number(speedRange.min), Number(speedRange.max));
  speedRange.value = String(v);
  speedValue.textContent = String(v);
  if (persist) saveSettings();
}

function setOrientation(orientation, { preset = 'custom', persist = true } = {}) {
  state.orientation = {
    flipX: !!orientation.flipX,
    flipY: !!orientation.flipY,
    rotate180: !!orientation.rotate180,
  };
  state.preset = preset;
  syncOrientationControls();
  resetScroll();
  if (persist) saveSettings();
}

function setScrollDirection(direction, { persist = true } = {}) {
  state.scrollDirection = direction === 'down' ? 'down' : 'up';
  resetScroll();
  if (persist) saveSettings();
}

function applyPreset(name, { persist = true } = {}) {
  const preset = PRESETS[name];
  if (!preset) {
    state.preset = 'custom';
    syncOrientationControls();
    if (persist) saveSettings();
    return;
  }

  state.orientation = {
    flipX: preset.flipX,
    flipY: preset.flipY,
    rotate180: preset.rotate180,
  };
  state.scrollDirection = preset.scrollDirection;
  state.preset = name;
  syncOrientationControls();
  resetScroll();
  if (persist) saveSettings();
}

function getSpeed() {
  return Number(speedRange.value);
}

function applyTransform() {
  const translateY = state.scrollDirection === 'up' ? -scrollY : scrollY;
  const transforms = [`translate3d(0, ${translateY}px, 0)`];

  if (state.orientation.rotate180) transforms.push('rotate(180deg)');
  if (state.orientation.flipX) transforms.push('scaleX(-1)');
  if (state.orientation.flipY) transforms.push('scaleY(-1)');

  inner.style.transform = transforms.join(' ');
}

function renderScriptDisplay() {
  scriptDisplay.textContent = scriptInput.value;
}

function setScriptText(text) {
  scriptInput.value = text;
  renderScriptDisplay();
  resetScroll();
}

function resetScroll() {
  scrollY = 0;
  lastTs = null;
  applyTransform();
}

function measureMaxScroll() {
  const viewportH = viewport.clientHeight;
  const innerH = inner.scrollHeight;
  return Math.max(0, innerH - viewportH);
}

function tick(ts) {
  if (!isRunning) return;

  if (lastTs == null) lastTs = ts;
  const dt = (ts - lastTs) / 1000;
  lastTs = ts;

  const speed = getSpeed();
  scrollY += speed * dt;

  const maxScroll = measureMaxScroll();
  scrollY = clamp(scrollY, 0, maxScroll);
  applyTransform();

  if (scrollY >= maxScroll) {
    stop();
    return;
  }

  rafId = requestAnimationFrame(tick);
}

function start() {
  if (isRunning) return;
  isRunning = true;
  toggleScrollBtn.textContent = 'Stop';
  overlayScrollBtn.textContent = 'Stop';
  calibScrollBtn.textContent = 'Stop';
  viewport.focus();
  rafId = requestAnimationFrame(tick);
}

function stop() {
  if (!isRunning) return;
  isRunning = false;
  toggleScrollBtn.textContent = 'Start';
  overlayScrollBtn.textContent = 'Start';
  calibScrollBtn.textContent = 'Start';
  if (rafId != null) cancelAnimationFrame(rafId);
  rafId = null;
  lastTs = null;
}

function toggle() {
  if (isRunning) stop();
  else start();
}

function toggleFullscreen() {
  const el = document.documentElement;
  if (document.fullscreenElement) {
    document.exitFullscreen();
  } else {
    el.requestFullscreen();
  }
}

function setPrompterOnly(enabled) {
  document.body.classList.toggle('prompter-only', enabled);
  if (!enabled) document.body.classList.remove('overlay-hidden');
  prompterOnlyBtn.textContent = enabled ? 'Exit Prompter Only' : 'Prompter Only';
}

function togglePrompterOnly() {
  const enabled = document.body.classList.contains('prompter-only');
  setPrompterOnly(!enabled);
}

function swapPanels() {
  const editorPanel = document.getElementById('editorPanel');
  const content = document.querySelector('.content');
  const children = Array.from(content.children);
  if (children[0] === editorPanel) {
    content.insertBefore(prompterPanel, editorPanel);
  } else {
    content.insertBefore(editorPanel, prompterPanel);
  }
}

function updateCalibrationUI() {
  calibTopIs1Btn.classList.toggle('active', state.calibration.topLine === 1);
  calibTopIs3Btn.classList.toggle('active', state.calibration.topLine === 3);
  calibMotionUpBtn.classList.toggle('active', state.calibration.motion === 'up');
  calibMotionDownBtn.classList.toggle('active', state.calibration.motion === 'down');

  if (state.calibration.topLine == null) {
    calibStatus.textContent = 'Step 1/2: choose top line.';
  } else if (state.calibration.motion == null) {
    calibStatus.textContent = 'Step 2/2: choose visible motion direction.';
  } else {
    calibStatus.textContent = 'Ready: apply calibration.';
  }

  applyCalibrationBtn.disabled = !(state.calibration.topLine && state.calibration.motion);
}

function startCalibration() {
  stop();
  setPrompterOnly(true);
  document.body.classList.add('calibrating');
  calibrationCard.hidden = false;
  state.calibration.topLine = null;
  state.calibration.motion = null;
  setScriptText(CALIBRATION_SCRIPT);
  calibScrollBtn.textContent = 'Start';
  updateCalibrationUI();
}

function endCalibration() {
  document.body.classList.remove('calibrating');
  calibrationCard.hidden = true;
}

function applyCalibration() {
  const orientation = {
    flipX: false,
    flipY: state.calibration.topLine === 3,
    rotate180: false,
  };
  const motion = state.calibration.motion === 'down' ? 'down' : 'up';

  setOrientation(orientation, { preset: 'custom', persist: false });
  setScrollDirection(motion, { persist: false });
  saveSettings();
  endCalibration();
}

scriptInput.addEventListener('input', () => {
  renderScriptDisplay();
  resetScroll();
});

fontSizeRange.addEventListener('input', () => setFontSize(Number(fontSizeRange.value)));
fontDecBtn.addEventListener('click', () => setFontSize(Number(fontSizeRange.value) - 2));
fontIncBtn.addEventListener('click', () => setFontSize(Number(fontSizeRange.value) + 2));

speedRange.addEventListener('input', () => setSpeed(Number(speedRange.value)));

orientationPreset.addEventListener('change', () => {
  applyPreset(orientationPreset.value);
});

flipXToggle.addEventListener('change', () => {
  setOrientation(
    {
      ...state.orientation,
      flipX: flipXToggle.checked,
    },
    { preset: 'custom' }
  );
});

flipYToggle.addEventListener('change', () => {
  setOrientation(
    {
      ...state.orientation,
      flipY: flipYToggle.checked,
    },
    { preset: 'custom' }
  );
});

rotateToggle.addEventListener('change', () => {
  setOrientation(
    {
      ...state.orientation,
      rotate180: rotateToggle.checked,
    },
    { preset: 'custom' }
  );
});

recalibrateBtn.addEventListener('click', startCalibration);

toggleScrollBtn.addEventListener('click', toggle);

resetBtn.addEventListener('click', () => {
  stop();
  resetScroll();
});

overlayScrollBtn.addEventListener('click', toggle);

overlayResetBtn.addEventListener('click', () => {
  stop();
  resetScroll();
});

overlayFullscreenBtn.addEventListener('click', toggleFullscreen);

overlayExitBtn.addEventListener('click', () => {
  setPrompterOnly(false);
});

overlayToggleBtn.addEventListener('click', () => {
  const hidden = document.body.classList.toggle('overlay-hidden');
  overlayToggleBtn.textContent = hidden ? 'Show' : 'Hide';
});

clearBtn.addEventListener('click', () => {
  stop();
  setScriptText('');
});

loadSampleBtn.addEventListener('click', () => {
  setScriptText(
    [
      'Welcome to your teleprompter.',
      '',
      'Controls:',
      '- Start/Stop: button or Space',
      '- Reset: button or R',
      '- Orientation preset: Default / DIY 45° / Custom',
      '- Orientation toggles: Flip X, Flip Y, Rotate 180°',
      '- Recalibrate: guides you in glass view',
      '',
      'Tip: Use Prompter Only + Fullscreen on iPad.',
      '',
      'Replace this text with your own script and press Start.',
    ].join('\n')
  );
});

loadCalibScriptBtn.addEventListener('click', () => {
  setScriptText(CALIBRATION_SCRIPT);
});

calibScrollBtn.addEventListener('click', toggle);

prompterOnlyBtn.addEventListener('click', togglePrompterOnly);

enterFullscreenBtn.addEventListener('click', toggleFullscreen);

swapPanelsBtn.addEventListener('click', swapPanels);

calibTopIs1Btn.addEventListener('click', () => {
  state.calibration.topLine = 1;
  updateCalibrationUI();
});

calibTopIs3Btn.addEventListener('click', () => {
  state.calibration.topLine = 3;
  updateCalibrationUI();
});

calibMotionUpBtn.addEventListener('click', () => {
  state.calibration.motion = 'up';
  updateCalibrationUI();
});

calibMotionDownBtn.addEventListener('click', () => {
  state.calibration.motion = 'down';
  updateCalibrationUI();
});

applyCalibrationBtn.addEventListener('click', applyCalibration);
cancelCalibrationBtn.addEventListener('click', endCalibration);

window.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    e.preventDefault();
    toggle();
    return;
  }

  if (e.key === 'p' || e.key === 'P') {
    e.preventDefault();
    togglePrompterOnly();
    return;
  }

  if (e.key === 'r' || e.key === 'R') {
    e.preventDefault();
    stop();
    resetScroll();
    return;
  }

  if (e.key === '+' || e.key === '=') {
    setFontSize(Number(fontSizeRange.value) + 2);
    return;
  }

  if (e.key === '-' || e.key === '_') {
    setFontSize(Number(fontSizeRange.value) - 2);
    return;
  }
});

window.addEventListener('resize', () => {
  const maxScroll = measureMaxScroll();
  scrollY = clamp(scrollY, 0, maxScroll);
  applyTransform();
});

(function init() {
  const saved = loadSettings();

  setFontSize(saved?.fontSizePx ?? DEFAULTS.fontSizePx, { persist: false });
  setSpeed(saved?.speedPxPerSec ?? DEFAULTS.speedPxPerSec, { persist: false });

  if (saved?.orientation && typeof saved.orientation === 'object') {
    state.orientation = {
      flipX: !!saved.orientation.flipX,
      flipY: !!saved.orientation.flipY,
      rotate180: !!saved.orientation.rotate180,
    };
    state.scrollDirection = saved.scrollDirection === 'down' ? 'down' : 'up';
    state.preset = saved.preset || 'custom';
    syncOrientationControls();
  } else {
    applyPreset(DEFAULTS.preset, { persist: false });
  }

  setPrompterOnly(false);
  overlayToggleBtn.textContent = 'Hide';
  overlayScrollBtn.textContent = 'Start';
  calibrationCard.hidden = true;
  renderScriptDisplay();
  resetScroll();
})();
