/* ============================================================
   JAMARIS GAME — Letter Tracing v2
   Smooth CURVED paths + smoother finger tracing
   Each stroke is now an SVG path string (with curves), and we
   SAMPLE points along it for the tracing math.
   ============================================================ */

let stars = parseInt(localStorage.getItem('jamaris_stars') || '0', 10);
function saveStars() { localStorage.setItem('jamaris_stars', String(stars)); }
function updateStars() {
  const p = document.getElementById('pickerStars');
  if (p) p.textContent = stars;
}

/* ---------- AUDIO ---------- */
let audioCtx;
function getAudio() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}
function playTone(freq, duration = 0.12, type = 'sine', vol = 0.15) {
  try {
    const ctx = getAudio();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (e) {}
}
function playClick() { playTone(800, 0.08, 'triangle'); }
function playTrace() { playTone(600 + Math.random() * 400, 0.04, 'sine', 0.06); }
function playStrokeDone() {
  playTone(880, 0.08, 'triangle', 0.15);
  setTimeout(() => playTone(1100, 0.12, 'triangle', 0.13), 70);
}
function playLetterDone() {
  [523, 659, 784, 1047].forEach((f, i) =>
    setTimeout(() => playTone(f, 0.18, 'triangle', 0.18), i * 90)
  );
}

/* ============================================================
   LETTER STROKE DATA — now SVG path strings (with curves!)
   viewBox is 400 x 500. Each letter = array of stroke path strings.
   M = move, L = line, Q = quadratic curve, C = cubic curve
   ============================================================ */
const LETTERS = {
  A: [
    'M 110 430 L 200 90',
    'M 200 90 L 290 430',
    'M 145 300 L 255 300'
  ],
  B: [
    'M 130 80 L 130 430',
    'M 130 80 L 230 80 Q 300 80 300 160 Q 300 240 230 240 L 130 240',
    'M 130 240 L 240 240 Q 320 240 320 335 Q 320 430 240 430 L 130 430'
  ],
  C: [
    'M 310 150 Q 270 80 190 80 Q 80 80 80 255 Q 80 430 190 430 Q 270 430 310 360'
  ],
  D: [
    'M 130 80 L 130 430',
    'M 130 80 L 220 80 Q 320 80 320 255 Q 320 430 220 430 L 130 430'
  ],
  E: [
    'M 300 80 L 130 80 L 130 430 L 300 430',
    'M 130 255 L 260 255'
  ],
  F: [
    'M 300 80 L 130 80 L 130 430',
    'M 130 255 L 260 255'
  ],
  G: [
    'M 310 150 Q 270 80 190 80 Q 80 80 80 255 Q 80 430 190 430 Q 310 430 310 300 L 310 280 L 220 280'
  ],
  H: [
    'M 130 80 L 130 430',
    'M 270 80 L 270 430',
    'M 130 255 L 270 255'
  ],
  I: [
    'M 140 80 L 260 80',
    'M 200 80 L 200 430',
    'M 140 430 L 260 430'
  ],
  J: [
    'M 140 80 L 260 80',
    'M 220 80 L 220 340 Q 220 430 140 430 Q 90 430 85 370'
  ],
  K: [
    'M 130 80 L 130 430',
    'M 290 80 L 130 255',
    'M 130 255 L 295 430'
  ],
  L: [
    'M 130 80 L 130 430 L 300 430'
  ],
  M: [
    'M 100 430 L 100 80 L 200 280 L 300 80 L 300 430'
  ],
  N: [
    'M 120 430 L 120 80 L 280 430 L 280 80'
  ],
  O: [
    'M 200 80 Q 80 80 80 255 Q 80 430 200 430 Q 320 430 320 255 Q 320 80 200 80 Z'
  ],
  P: [
    'M 130 430 L 130 80 L 240 80 Q 320 80 320 165 Q 320 250 240 250 L 130 250'
  ],
  Q: [
    'M 200 80 Q 80 80 80 255 Q 80 430 200 430 Q 320 430 320 255 Q 320 80 200 80 Z',
    'M 240 330 L 340 450'
  ],
  R: [
    'M 130 430 L 130 80 L 240 80 Q 320 80 320 165 Q 320 250 240 250 L 130 250',
    'M 210 250 L 310 430'
  ],
  S: [
    'M 310 130 Q 250 75 170 100 Q 90 125 130 210 Q 160 270 250 285 Q 320 300 300 380 Q 280 440 180 420 Q 110 405 90 350'
  ],
  T: [
    'M 90 80 L 310 80',
    'M 200 80 L 200 430'
  ],
  U: [
    'M 120 80 L 120 320 Q 120 430 200 430 Q 280 430 280 320 L 280 80'
  ],
  V: [
    'M 100 80 L 200 430',
    'M 200 430 L 300 80'
  ],
  W: [
    'M 80 80 L 140 430 L 200 200 L 260 430 L 320 80'
  ],
  X: [
    'M 100 80 L 300 430',
    'M 300 80 L 100 430'
  ],
  Y: [
    'M 100 80 L 200 255',
    'M 300 80 L 200 255',
    'M 200 255 L 200 430'
  ],
  Z: [
    'M 100 80 L 300 80 L 100 430 L 300 430'
  ]
};

const NUMBERS = {
  '0': ['M 200 80 Q 90 80 90 255 Q 90 430 200 430 Q 310 430 310 255 Q 310 80 200 80 Z'],
  '1': ['M 130 150 L 200 80 L 200 430', 'M 130 430 L 270 430'],
  '2': ['M 100 150 Q 130 80 200 80 Q 290 80 290 160 Q 290 230 110 430 L 300 430'],
  '3': [
    'M 110 130 Q 150 75 220 90 Q 290 105 270 190 Q 255 240 190 250',
    'M 190 250 Q 270 255 290 320 Q 305 400 220 425 Q 140 440 100 380'
  ],
  '4': ['M 240 80 L 100 300 L 300 300', 'M 240 150 L 240 430'],
  '5': ['M 290 80 L 130 80 L 125 220 Q 200 195 270 235 Q 320 270 300 350 Q 280 425 180 415 Q 120 408 100 370'],
  '6': ['M 280 110 Q 220 75 160 110 Q 100 155 95 290 Q 95 430 200 430 Q 305 430 305 320 Q 305 235 215 235 Q 140 235 110 300'],
  '7': ['M 90 80 L 310 80 L 170 430'],
  '8': [
    'M 200 250 Q 110 230 110 160 Q 110 80 200 80 Q 290 80 290 160 Q 290 230 200 250 Q 100 275 100 360 Q 100 440 200 440 Q 300 440 300 360 Q 300 275 200 250 Z'
  ],
  '9': ['M 290 230 Q 260 290 190 290 Q 95 290 95 185 Q 95 80 200 80 Q 305 80 305 210 Q 305 350 240 410 Q 200 445 130 420']
};

/* ============================================================
   PATH SAMPLING — Convert each SVG path string into an array of
   {x,y} points, using a hidden <path> element + getPointAtLength.
   This lets us measure & follow the actual curve precisely.
   ============================================================ */
const measureSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
measureSvg.setAttribute('width', '0');
measureSvg.setAttribute('height', '0');
measureSvg.style.position = 'absolute';
measureSvg.style.visibility = 'hidden';
document.body.appendChild(measureSvg);
const measurePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
measureSvg.appendChild(measurePath);

function samplePath(pathStr, samples = 60) {
  measurePath.setAttribute('d', pathStr);
  const total = measurePath.getTotalLength();
  const pts = [];
  for (let i = 0; i <= samples; i++) {
    const p = measurePath.getPointAtLength((total * i) / samples);
    pts.push({ x: p.x, y: p.y });
  }
  return pts;
}

/* ============================================================
   STATE
   ============================================================ */
let currentSet = 'letters';
let currentLetter = 'A';
let currentStrokePaths = [];   // SVG path strings for the active letter
let currentSamples = [];       // sampled point arrays, one per stroke
let currentStrokeIdx = 0;
let traceProgress = [];         // 0..1 fraction along each stroke
let completedStrokes = [];
let isDrawing = false;

/* ============================================================
   BUILD PICKER GRID
   ============================================================ */
function renderPicker() {
  const grid = document.getElementById('letterGrid');
  grid.innerHTML = '';
  const set = currentSet === 'letters' ? LETTERS : NUMBERS;
  const colors = ['#FF3B6C', '#FF6B35', '#FFA62B', '#FFD93D', '#A8E063', '#56CCF2', '#4D96FF', '#9B5DE5', '#FF7AD9'];
  Object.keys(set).forEach((key, idx) => {
    const card = document.createElement('div');
    card.className = 'letter-card';
    card.style.background = colors[idx % colors.length];
    card.innerHTML = `<div class="letter-card-letter">${key}</div>`;
    card.addEventListener('click', () => startTracing(key));
    grid.appendChild(card);
  });
}

document.querySelectorAll('#picker-mode-toggle .mode-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    currentSet = btn.dataset.set;
    document.querySelectorAll('#picker-mode-toggle .mode-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelector('.picker-title h1').textContent =
      currentSet === 'letters' ? 'Pick a letter!' : 'Pick a number!';
    playClick();
    renderPicker();
  });
});

/* ============================================================
   START TRACING
   ============================================================ */
function startTracing(letter) {
  playClick();
  currentLetter = letter;
  const set = currentSet === 'letters' ? LETTERS : NUMBERS;
  currentStrokePaths = set[letter];
  currentSamples = currentStrokePaths.map(p => samplePath(p));
  currentStrokeIdx = 0;
  traceProgress = currentStrokePaths.map(() => 0);
  completedStrokes = [];

  document.getElementById('picker').classList.remove('active');
  document.getElementById('game').classList.add('active');
  document.getElementById('currentLetterDisplay').textContent = letter;
  renderLetter();
  updateProgress();
}

function backToPicker() {
  playClick();
  document.getElementById('game').classList.remove('active');
  document.getElementById('picker').classList.add('active');
}

function changeLetter(direction) {
  playClick();
  const set = currentSet === 'letters' ? LETTERS : NUMBERS;
  const keys = Object.keys(set);
  const idx = keys.indexOf(currentLetter);
  startTracing(keys[(idx + direction + keys.length) % keys.length]);
}

function resetLetter() {
  playClick();
  currentStrokeIdx = 0;
  traceProgress = currentStrokePaths.map(() => 0);
  completedStrokes = [];
  renderLetter();
  updateProgress();
}

function updateProgress() {
  const total = currentStrokePaths.length;
  const done = completedStrokes.length;
  const el = document.getElementById('letterProgress');
  if (done >= total) {
    el.textContent = '✨ Done! ✨';
    el.classList.add('done');
  } else {
    el.textContent = `Stroke ${done + 1} of ${total}`;
    el.classList.remove('done');
  }
}

/* ============================================================
   RENDER (uses the curved path strings directly = smooth!)
   ============================================================ */
const svg = document.getElementById('letterSvg');
function NS(tag) { return document.createElementNS('http://www.w3.org/2000/svg', tag); }

function getPartialPathString(strokeIdx, fraction) {
  // Build a partial path by sampling points up to `fraction`
  const samples = currentSamples[strokeIdx];
  const n = Math.max(1, Math.floor(samples.length * fraction));
  if (n < 1) return '';
  let str = `M ${samples[0].x} ${samples[0].y}`;
  for (let i = 1; i <= n && i < samples.length; i++) {
    str += ` L ${samples[i].x} ${samples[i].y}`;
  }
  return str;
}

function getTracePoint() {
  if (currentStrokeIdx >= currentSamples.length) return { x: 0, y: 0 };
  const samples = currentSamples[currentStrokeIdx];
  const frac = traceProgress[currentStrokeIdx];
  const idx = Math.min(samples.length - 1, Math.floor(frac * (samples.length - 1)));
  return samples[idx];
}

function renderLetter() {
  svg.innerHTML = '';

  // 1. Big faint background letter
  const bg = NS('text');
  bg.setAttribute('x', '200');
  bg.setAttribute('y', '410');
  bg.setAttribute('text-anchor', 'middle');
  bg.setAttribute('font-family', 'Bowlby One, sans-serif');
  bg.setAttribute('font-size', '450');
  bg.setAttribute('fill', 'rgba(42, 42, 62, 0.06)');
  bg.textContent = currentLetter;
  svg.appendChild(bg);

  // 2. Guide lines (SMOOTH curves now, drawn from the path strings)
  currentStrokePaths.forEach((pathStr, idx) => {
    if (completedStrokes.includes(idx)) return; // hide finished guides
    const guide = NS('path');
    guide.setAttribute('d', pathStr);
    guide.setAttribute('fill', 'none');
    guide.setAttribute('stroke', idx === currentStrokeIdx ? '#FFD93D' : 'rgba(42,42,62,0.25)');
    guide.setAttribute('stroke-width', '8');
    guide.setAttribute('stroke-dasharray', '2 18');
    guide.setAttribute('stroke-linecap', 'round');
    guide.setAttribute('stroke-linejoin', 'round');
    if (idx === currentStrokeIdx) guide.setAttribute('class', 'guide-active');
    svg.appendChild(guide);
  });

  // 3. Completed strokes (full smooth colored paths)
  const cols = ['#FF3B6C', '#FFA62B', '#FFD93D', '#6BCB77', '#56CCF2', '#9B5DE5', '#FF7AD9'];
  completedStrokes.forEach((si, di) => {
    const d = NS('path');
    d.setAttribute('d', currentStrokePaths[si]);
    d.setAttribute('fill', 'none');
    d.setAttribute('stroke', cols[di % cols.length]);
    d.setAttribute('stroke-width', '22');
    d.setAttribute('stroke-linecap', 'round');
    d.setAttribute('stroke-linejoin', 'round');
    d.setAttribute('opacity', '0.9');
    svg.appendChild(d);
  });

  // 4. Partial in-progress stroke
  if (currentStrokeIdx < currentStrokePaths.length && traceProgress[currentStrokeIdx] > 0) {
    const partial = NS('path');
    partial.setAttribute('d', getPartialPathString(currentStrokeIdx, traceProgress[currentStrokeIdx]));
    partial.setAttribute('fill', 'none');
    partial.setAttribute('stroke', '#FF3B6C');
    partial.setAttribute('stroke-width', '22');
    partial.setAttribute('stroke-linecap', 'round');
    partial.setAttribute('stroke-linejoin', 'round');
    svg.appendChild(partial);
  }

  // 5. Pulsing start/leading dot
  if (currentStrokeIdx < currentStrokePaths.length && traceProgress[currentStrokeIdx] < 1) {
    const sp = getTracePoint();
    const halo = NS('circle');
    halo.setAttribute('cx', sp.x);
    halo.setAttribute('cy', sp.y);
    halo.setAttribute('r', '30');
    halo.setAttribute('fill', '#FFD93D');
    halo.setAttribute('opacity', '0.4');
    halo.setAttribute('class', 'trace-halo');
    svg.appendChild(halo);

    const dot = NS('circle');
    dot.setAttribute('cx', sp.x);
    dot.setAttribute('cy', sp.y);
    dot.setAttribute('r', '22');
    dot.setAttribute('fill', '#FF3B6C');
    dot.setAttribute('stroke', '#2a2a3e');
    dot.setAttribute('stroke-width', '4');
    svg.appendChild(dot);

    const num = NS('text');
    num.setAttribute('x', sp.x);
    num.setAttribute('y', sp.y + 8);
    num.setAttribute('text-anchor', 'middle');
    num.setAttribute('font-family', 'Bowlby One, sans-serif');
    num.setAttribute('font-size', '24');
    num.setAttribute('fill', 'white');
    num.textContent = currentStrokeIdx + 1;
    svg.appendChild(num);
  }
}

/* ============================================================
   TRACING — finger follows the sampled points
   ============================================================ */
function getSvgPos(e) {
  const t = e.touches ? e.touches[0] : e;
  if (!t) return null;
  const rect = svg.getBoundingClientRect();
  return {
    x: ((t.clientX - rect.left) / rect.width) * 400,
    y: ((t.clientY - rect.top) / rect.height) * 500
  };
}
function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }

const TOLERANCE = 75; // how close the finger must be to the path

function tryAdvance(fp) {
  if (currentStrokeIdx >= currentSamples.length) return;
  const samples = currentSamples[currentStrokeIdx];
  const cur = traceProgress[currentStrokeIdx];

  // Must be near the current leading point to start/continue
  if (dist(fp, getTracePoint()) > TOLERANCE) return;

  // Find the furthest-forward sample point the finger is close to
  let bestFrac = cur;
  const curIdx = Math.floor(cur * (samples.length - 1));
  for (let i = curIdx; i < samples.length; i++) {
    const d = dist(fp, samples[i]);
    if (d < TOLERANCE) {
      const frac = i / (samples.length - 1);
      if (frac > bestFrac) bestFrac = frac;
    } else if (i > curIdx + 2) {
      // stop scanning once we move clearly away (prevents skipping across gaps)
      break;
    }
  }

  if (bestFrac > cur) {
    traceProgress[currentStrokeIdx] = bestFrac;
    playTrace();
    renderLetter();
    if (bestFrac >= 0.96) strokeComplete();
  }
}

function strokeComplete() {
  completedStrokes.push(currentStrokeIdx);
  traceProgress[currentStrokeIdx] = 1;
  playStrokeDone();
  currentStrokeIdx++;
  updateProgress();
  if (currentStrokeIdx >= currentStrokePaths.length) {
    setTimeout(letterComplete, 450);
  } else {
    renderLetter();
  }
}

function letterComplete() {
  renderLetter();
  stars++;
  saveStars();
  updateStars();
  playLetterDone();
  const c = document.getElementById('celebrate');
  document.getElementById('celebrateMsg').textContent = currentLetter + '!';
  c.classList.add('active');
  spawnConfetti();
  setTimeout(() => c.classList.remove('active'), 2200);
}

function spawnConfetti() {
  const colors = ['#FF3B6C', '#FFD93D', '#56CCF2', '#A8E063', '#9B5DE5', '#FF7AD9'];
  const container = document.getElementById('celebrate');
  for (let i = 0; i < 40; i++) {
    const conf = document.createElement('div');
    conf.className = 'confetti';
    conf.style.background = colors[Math.floor(Math.random() * colors.length)];
    conf.style.left = Math.random() * 100 + 'vw';
    conf.style.top = '-20px';
    conf.style.animationDelay = (Math.random() * 0.5) + 's';
    container.appendChild(conf);
    setTimeout(() => conf.remove(), 2500);
  }
}

/* ---------- POINTER EVENTS ---------- */
function startTrace(e) {
  e.preventDefault();
  const pos = getSvgPos(e);
  if (!pos) return;
  isDrawing = true;
  tryAdvance(pos);
}
function moveTrace(e) {
  if (!isDrawing) return;
  e.preventDefault();
  const pos = getSvgPos(e);
  if (!pos) return;
  tryAdvance(pos);
}
function endTrace() { isDrawing = false; }

svg.addEventListener('mousedown', startTrace);
svg.addEventListener('mousemove', moveTrace);
svg.addEventListener('mouseup', endTrace);
svg.addEventListener('mouseleave', endTrace);
svg.addEventListener('touchstart', startTrace, { passive: false });
svg.addEventListener('touchmove', moveTrace, { passive: false });
svg.addEventListener('touchend', endTrace);

/* ---------- WIRE UP ---------- */
document.getElementById('backBtn').addEventListener('click', backToPicker);
document.getElementById('resetBtn').addEventListener('click', resetLetter);
document.getElementById('prevLetterBtn').addEventListener('click', () => changeLetter(-1));
document.getElementById('nextLetterBtn').addEventListener('click', () => changeLetter(1));

/* ---------- INIT ---------- */
renderPicker();
updateStars();
