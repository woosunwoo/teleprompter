const scriptInput = document.getElementById('scriptInput');
const scriptDisplay = document.getElementById('scriptDisplay');
const viewport = document.getElementById('viewport');
const inner = document.getElementById('inner');
const prompterPanel = document.getElementById('prompterPanel');

const toggleScrollBtn = document.getElementById('toggleScrollBtn');
const resetBtn = document.getElementById('resetBtn');
const mirrorToggle = document.getElementById('mirrorToggle');

const fontDecBtn = document.getElementById('fontDecBtn');
const fontIncBtn = document.getElementById('fontIncBtn');
const fontSizeRange = document.getElementById('fontSizeRange');
const fontSizeValue = document.getElementById('fontSizeValue');

const speedRange = document.getElementById('speedRange');
const speedValue = document.getElementById('speedValue');

const clearBtn = document.getElementById('clearBtn');
const loadSampleBtn = document.getElementById('loadSampleBtn');
const prompterOnlyBtn = document.getElementById('prompterOnlyBtn');
const enterFullscreenBtn = document.getElementById('enterFullscreenBtn');
const swapPanelsBtn = document.getElementById('swapPanelsBtn');

const overlayToggleBtn = document.getElementById('overlayToggleBtn');
const overlayExitBtn = document.getElementById('overlayExitBtn');
const overlayScrollBtn = document.getElementById('overlayScrollBtn');
const overlayResetBtn = document.getElementById('overlayResetBtn');
const overlayFullscreenBtn = document.getElementById('overlayFullscreenBtn');

const DEFAULTS = {
  fontSizePx: 56,
  speedPxPerSec: 60,
  mirrored: false,
};

let isRunning = false;
let rafId = null;
let lastTs = null;
let scrollY = 0;

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function setFontSize(px) {
  const v = clamp(Math.round(px), Number(fontSizeRange.min), Number(fontSizeRange.max));
  fontSizeRange.value = String(v);
  fontSizeValue.textContent = String(v);
  scriptDisplay.style.fontSize = `${v}px`;
}

function setSpeed(pxPerSec) {
  const v = clamp(Math.round(pxPerSec), Number(speedRange.min), Number(speedRange.max));
  speedRange.value = String(v);
  speedValue.textContent = String(v);
}

function setMirrored(mirrored) {
  mirrorToggle.checked = mirrored;
  prompterPanel.classList.toggle('mirrored', mirrored);
  renderScriptDisplay();
  resetScroll();
  applyTransform();
}

function getSpeed() {
  return Number(speedRange.value);
}

function applyTransform() {
  const mirrored = mirrorToggle.checked;
  const translate = `translate3d(0, ${-scrollY}px, 0)`;
  inner.style.transform = mirrored ? `${translate} scaleY(-1)` : translate;
}

function setScriptText(text) {
  scriptInput.value = text;
  renderScriptDisplay();
  resetScroll();
}

function getRenderedScriptText() {
  const text = scriptInput.value;
  if (!mirrorToggle.checked) return text;
  return text.split('\n').reverse().join('\n');
}

function renderScriptDisplay() {
  scriptDisplay.textContent = getRenderedScriptText();
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
  viewport.focus();
  rafId = requestAnimationFrame(tick);
}

function stop() {
  if (!isRunning) return;
  isRunning = false;
  toggleScrollBtn.textContent = 'Start';
  overlayScrollBtn.textContent = 'Start';
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

scriptInput.addEventListener('input', () => {
  renderScriptDisplay();
  resetScroll();
});

fontSizeRange.addEventListener('input', () => setFontSize(Number(fontSizeRange.value)));
fontDecBtn.addEventListener('click', () => setFontSize(Number(fontSizeRange.value) - 2));
fontIncBtn.addEventListener('click', () => setFontSize(Number(fontSizeRange.value) + 2));

speedRange.addEventListener('input', () => setSpeed(Number(speedRange.value)));

mirrorToggle.addEventListener('change', () => setMirrored(mirrorToggle.checked));

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
      '- Font: A- / A+ or slider',
      '- Speed: slider (px/s)',
      '- Mirror vertical: toggle',
      '',
      'Tip: Put your browser in fullscreen for a clean prompter view.',
      '',
      'Replace this text with your own script and press Start.',
    ].join('\n')
  );
});

prompterOnlyBtn.addEventListener('click', togglePrompterOnly);

enterFullscreenBtn.addEventListener('click', toggleFullscreen);

swapPanelsBtn.addEventListener('click', swapPanels);

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
  setFontSize(DEFAULTS.fontSizePx);
  setSpeed(DEFAULTS.speedPxPerSec);
  setMirrored(DEFAULTS.mirrored);
  setPrompterOnly(false);
  overlayToggleBtn.textContent = 'Hide';
  overlayScrollBtn.textContent = 'Start';
  setScriptText('');
})();
