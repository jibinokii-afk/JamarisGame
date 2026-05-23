/* ============================================================
   JAMARIS GAME — Letter Tracing
   Trace letters & numbers with finger; forgiving distance check
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
function playLetterDone(letter) {
  // Quick ascending fanfare
  [523, 659, 784, 1047].forEach((f, i) =>
    setTimeout(() => playTone(f, 0.18, 'triangle', 0.18), i * 90)
  );
}

/* ============================================================
   LETTER STROKE DATA
   Coordinates are based on a 400x500 viewBox
   Each letter is an array of strokes; each stroke is points to follow
   ============================================================ */
const LETTERS = {
  A: [
    [{x:100, y:430}, {x:200, y:80}],         // left diagonal
    [{x:200, y:80},  {x:300, y:430}],         // right diagonal
    [{x:140, y:300}, {x:260, y:300}]          // crossbar
  ],
  B: [
    [{x:130, y:80}, {x:130, y:430}],                                            // vertical
    [{x:130, y:80}, {x:240, y:80}, {x:290, y:140}, {x:240, y:240}, {x:130, y:240}],  // top bump
    [{x:130, y:240}, {x:260, y:240}, {x:310, y:330}, {x:260, y:430}, {x:130, y:430}] // bottom bump
  ],
  C: [
    [{x:310, y:140}, {x:230, y:80}, {x:130, y:130}, {x:90, y:255}, {x:130, y:380}, {x:230, y:430}, {x:310, y:370}]
  ],
  D: [
    [{x:130, y:80}, {x:130, y:430}],                                                          // vertical
    [{x:130, y:80}, {x:240, y:80}, {x:310, y:175}, {x:310, y:335}, {x:240, y:430}, {x:130, y:430}] // curve
  ],
  E: [
    [{x:310, y:80}, {x:130, y:80}, {x:130, y:430}, {x:310, y:430}],   // outline (left vertical + top + bottom)
    [{x:130, y:255}, {x:260, y:255}]                                   // middle
  ],
  F: [
    [{x:310, y:80}, {x:130, y:80}, {x:130, y:430}],   // top + left vertical
    [{x:130, y:255}, {x:260, y:255}]                   // middle
  ],
  G: [
    [{x:310, y:140}, {x:230, y:80}, {x:130, y:130}, {x:90, y:255}, {x:130, y:380}, {x:230, y:430}, {x:310, y:380}, {x:310, y:280}, {x:230, y:280}]
  ],
  H: [
    [{x:130, y:80}, {x:130, y:430}],   // left vertical
    [{x:270, y:80}, {x:270, y:430}],   // right vertical
    [{x:130, y:255}, {x:270, y:255}]   // crossbar
  ],
  I: [
    [{x:140, y:80}, {x:260, y:80}],     // top bar
    [{x:200, y:80}, {x:200, y:430}],    // vertical
    [{x:140, y:430}, {x:260, y:430}]    // bottom bar
  ],
  J: [
    [{x:140, y:80}, {x:260, y:80}],                                       // top bar
    [{x:230, y:80}, {x:230, y:330}, {x:170, y:410}, {x:100, y:380}]        // J curve
  ],
  K: [
    [{x:130, y:80}, {x:130, y:430}],     // vertical
    [{x:290, y:80}, {x:130, y:255}],     // upper diagonal
    [{x:130, y:255}, {x:290, y:430}]     // lower diagonal
  ],
  L: [
    [{x:130, y:80}, {x:130, y:430}, {x:300, y:430}]
  ],
  M: [
    [{x:100, y:430}, {x:100, y:80}, {x:200, y:280}, {x:300, y:80}, {x:300, y:430}]
  ],
  N: [
    [{x:120, y:430}, {x:120, y:80}, {x:280, y:430}, {x:280, y:80}]
  ],
  O: [
    [{x:200, y:80}, {x:90, y:140}, {x:60, y:255}, {x:90, y:370}, {x:200, y:430}, {x:310, y:370}, {x:340, y:255}, {x:310, y:140}, {x:200, y:80}]
  ],
  P: [
    [{x:130, y:430}, {x:130, y:80}, {x:240, y:80}, {x:300, y:145}, {x:240, y:240}, {x:130, y:240}]
  ],
  Q: [
    [{x:200, y:80}, {x:90, y:140}, {x:60, y:255}, {x:90, y:370}, {x:200, y:430}, {x:310, y:370}, {x:340, y:255}, {x:310, y:140}, {x:200, y:80}],
    [{x:240, y:340}, {x:340, y:450}]   // tail
  ],
  R: [
    [{x:130, y:430}, {x:130, y:80}, {x:240, y:80}, {x:300, y:145}, {x:240, y:240}, {x:130, y:240}],
    [{x:200, y:240}, {x:310, y:430}]   // diagonal leg
  ],
  S: [
    [{x:310, y:130}, {x:240, y:80}, {x:130, y:130}, {x:130, y:200}, {x:200, y:255}, {x:300, y:280}, {x:300, y:380}, {x:240, y:430}, {x:130, y:400}, {x:90, y:350}]
  ],
  T: [
    [{x:90, y:80}, {x:310, y:80}],     // horizontal
    [{x:200, y:80}, {x:200, y:430}]    // vertical
  ],
  U: [
    [{x:120, y:80}, {x:120, y:330}, {x:200, y:430}, {x:280, y:330}, {x:280, y:80}]
  ],
  V: [
    [{x:100, y:80}, {x:200, y:430}],   // left diagonal
    [{x:200, y:430}, {x:300, y:80}]    // right diagonal
  ],
  W: [
    [{x:80, y:80}, {x:140, y:430}, {x:200, y:200}, {x:260, y:430}, {x:320, y:80}]
  ],
  X: [
    [{x:100, y:80}, {x:300, y:430}],   // diagonal 1
    [{x:300, y:80}, {x:100, y:430}]    // diagonal 2
  ],
  Y: [
    [{x:100, y:80}, {x:200, y:255}],          // left diagonal
    [{x:300, y:80}, {x:200, y:255}],          // right diagonal
    [{x:200, y:255}, {x:200, y:430}]          // vertical
  ],
  Z: [
    [{x:100, y:80}, {x:300, y:80}, {x:100, y:430}, {x:300, y:430}]
  ]
};

const NUMBERS = {
  '0': [
    [{x:200, y:80}, {x:120, y:140}, {x:100, y:255}, {x:120, y:370}, {x:200, y:430}, {x:280, y:370}, {x:300, y:255}, {x:280, y:140}, {x:200, y:80}]
  ],
  '1': [
    [{x:130, y:150}, {x:200, y:80}, {x:200, y:430}],
    [{x:130, y:430}, {x:270, y:430}]
  ],
  '2': [
    [{x:110, y:140}, {x:200, y:80}, {x:290, y:140}, {x:280, y:240}, {x:110, y:430}, {x:300, y:430}]
  ],
  '3': [
    [{x:110, y:130}, {x:200, y:80}, {x:280, y:130}, {x:280, y:200}, {x:200, y:250}],
    [{x:200, y:250}, {x:280, y:300}, {x:280, y:380}, {x:200, y:430}, {x:110, y:380}]
  ],
  '4': [
    [{x:240, y:80}, {x:100, y:300}, {x:300, y:300}],
    [{x:240, y:160}, {x:240, y:430}]
  ],
  '5': [
    [{x:290, y:80}, {x:130, y:80}, {x:130, y:230}, {x:230, y:220}, {x:300, y:280}, {x:300, y:380}, {x:230, y:430}, {x:120, y:410}]
  ],
  '6': [
    [{x:290, y:120}, {x:200, y:80}, {x:130, y:160}, {x:100, y:280}, {x:120, y:380}, {x:200, y:430}, {x:290, y:380}, {x:300, y:300}, {x:230, y:240}, {x:130, y:280}]
  ],
  '7': [
    [{x:90, y:80}, {x:310, y:80}, {x:170, y:430}]
  ],
  '8': [
    [{x:200, y:255}, {x:130, y:200}, {x:130, y:130}, {x:200, y:80}, {x:280, y:130}, {x:280, y:200}, {x:200, y:255}, {x:120, y:310}, {x:110, y:380}, {x:200, y:430}, {x:290, y:380}, {x:280, y:310}, {x:200, y:255}]
  ],
  '9': [
    [{x:200, y:255}, {x:130, y:210}, {x:130, y:130}, {x:200, y:80}, {x:280, y:130}, {x:300, y:240}, {x:280, y:360}, {x:200, y:430}, {x:120, y:400}]
  ]
};

/* ============================================================
   STATE
   ============================================================ */
let currentSet = 'letters';
let currentLetter = 'A';
let currentStrokes = [];
let currentStrokeIdx = 0;
let traceProgress = []; // for each stroke, fraction (0..1) of how far along
let completedStrokes = [];
let isDrawing = false;
let lastPos = null;

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
   START TRACING A LETTER
   ============================================================ */
function startTracing(letter) {
  playClick();
  currentLetter = letter;
  const set = currentSet === 'letters' ? LETTERS : NUMBERS;
  currentStrokes = set[letter];
  currentStrokeIdx = 0;
  traceProgress = currentStrokes.map(() => 0);
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
  const currentIdx = keys.indexOf(currentLetter);
  const newIdx = (currentIdx + direction + keys.length) % keys.length;
  startTracing(keys[newIdx]);
}

function resetLetter() {
  playClick();
  currentStrokeIdx = 0;
  traceProgress = currentStrokes.map(() => 0);
  completedStrokes = [];
  renderLetter();
  updateProgress();
}

function updateProgress() {
  const total = currentStrokes.length;
  const done = completedStrokes.length;
  if (done >= total) {
    document.getElementById('letterProgress').textContent = '✨ Done! ✨';
    document.getElementById('letterProgress').classList.add('done');
  } else {
    document.getElementById('letterProgress').textContent = `Stroke ${done + 1} of ${total}`;
    document.getElementById('letterProgress').classList.remove('done');
  }
}

/* ============================================================
   RENDER THE LETTER + GUIDE PATHS
   ============================================================ */
const svg = document.getElementById('letterSvg');

function pointsToPath(points) {
  if (points.length === 0) return '';
  let str = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    str += ` L ${points[i].x} ${points[i].y}`;
  }
  return str;
}

function getPartialPath(points, fraction) {
  // Returns SVG path for the first `fraction` of the points
  if (fraction <= 0 || points.length < 2) return '';
  // Compute total length and target length
  let totalLen = 0;
  const segs = [];
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i-1].x;
    const dy = points[i].y - points[i-1].y;
    const len = Math.sqrt(dx*dx + dy*dy);
    segs.push(len);
    totalLen += len;
  }
  const targetLen = totalLen * fraction;
  let walked = 0;
  let path = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const seg = segs[i-1];
    if (walked + seg <= targetLen) {
      path += ` L ${points[i].x} ${points[i].y}`;
      walked += seg;
    } else {
      const remaining = targetLen - walked;
      const t = remaining / seg;
      const x = points[i-1].x + (points[i].x - points[i-1].x) * t;
      const y = points[i-1].y + (points[i].y - points[i-1].y) * t;
      path += ` L ${x} ${y}`;
      break;
    }
  }
  return path;
}

function renderLetter() {
  svg.innerHTML = '';

  // 1. Big background letter outline (the "ghost")
  const bg = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  bg.setAttribute('x', '200');
  bg.setAttribute('y', '410');
  bg.setAttribute('text-anchor', 'middle');
  bg.setAttribute('font-family', 'Bowlby One, sans-serif');
  bg.setAttribute('font-size', '450');
  bg.setAttribute('fill', 'rgba(42, 42, 62, 0.08)');
  bg.setAttribute('stroke', 'rgba(42, 42, 62, 0.15)');
  bg.setAttribute('stroke-width', '4');
  bg.textContent = currentLetter;
  svg.appendChild(bg);

  // 2. Render each stroke as a dashed guide line
  currentStrokes.forEach((stroke, idx) => {
    const guide = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    guide.setAttribute('d', pointsToPath(stroke));
    guide.setAttribute('fill', 'none');
    guide.setAttribute('stroke', idx === currentStrokeIdx ? '#FFD93D' : (completedStrokes.includes(idx) ? 'transparent' : 'rgba(42,42,62,0.3)'));
    guide.setAttribute('stroke-width', '6');
    guide.setAttribute('stroke-dasharray', '8 10');
    guide.setAttribute('stroke-linecap', 'round');
    guide.setAttribute('stroke-linejoin', 'round');
    guide.setAttribute('class', idx === currentStrokeIdx ? 'guide-active' : '');
    svg.appendChild(guide);
  });

  // 3. Completed strokes drawn in rainbow color
  completedStrokes.forEach((strokeIdx, doneIdx) => {
    const stroke = currentStrokes[strokeIdx];
    const drawn = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    drawn.setAttribute('d', pointsToPath(stroke));
    drawn.setAttribute('fill', 'none');
    const colors = ['#FF3B6C', '#FFA62B', '#FFD93D', '#6BCB77', '#56CCF2', '#9B5DE5', '#FF7AD9'];
    drawn.setAttribute('stroke', colors[doneIdx % colors.length]);
    drawn.setAttribute('stroke-width', '20');
    drawn.setAttribute('stroke-linecap', 'round');
    drawn.setAttribute('stroke-linejoin', 'round');
    drawn.setAttribute('opacity', '0.85');
    svg.appendChild(drawn);
  });

  // 4. Partial current stroke being drawn
  if (currentStrokeIdx < currentStrokes.length && traceProgress[currentStrokeIdx] > 0) {
    const partial = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    partial.setAttribute('d', getPartialPath(currentStrokes[currentStrokeIdx], traceProgress[currentStrokeIdx]));
    partial.setAttribute('fill', 'none');
    partial.setAttribute('stroke', '#FF3B6C');
    partial.setAttribute('stroke-width', '20');
    partial.setAttribute('stroke-linecap', 'round');
    partial.setAttribute('stroke-linejoin', 'round');
    svg.appendChild(partial);
  }

  // 5. Start dot for the current stroke (pulsing)
  if (currentStrokeIdx < currentStrokes.length && traceProgress[currentStrokeIdx] < 1) {
    const stroke = currentStrokes[currentStrokeIdx];
    const startIdx = traceProgress[currentStrokeIdx] === 0 ? 0 : 0; // always show at start
    const startPoint = getCurrentTracePoint();

    // Pulsing halo
    const halo = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    halo.setAttribute('cx', startPoint.x);
    halo.setAttribute('cy', startPoint.y);
    halo.setAttribute('r', '30');
    halo.setAttribute('fill', '#FFD93D');
    halo.setAttribute('opacity', '0.4');
    halo.setAttribute('class', 'trace-halo');
    svg.appendChild(halo);

    // The numbered dot
    const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    dot.setAttribute('cx', startPoint.x);
    dot.setAttribute('cy', startPoint.y);
    dot.setAttribute('r', '22');
    dot.setAttribute('fill', '#FF3B6C');
    dot.setAttribute('stroke', '#2a2a3e');
    dot.setAttribute('stroke-width', '4');
    svg.appendChild(dot);

    const num = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    num.setAttribute('x', startPoint.x);
    num.setAttribute('y', startPoint.y + 8);
    num.setAttribute('text-anchor', 'middle');
    num.setAttribute('font-family', 'Bowlby One, sans-serif');
    num.setAttribute('font-size', '24');
    num.setAttribute('fill', 'white');
    num.textContent = currentStrokeIdx + 1;
    svg.appendChild(num);
  }
}

function getCurrentTracePoint() {
  // Where along the current stroke is the leading edge?
  if (currentStrokeIdx >= currentStrokes.length) return { x: 0, y: 0 };
  const stroke = currentStrokes[currentStrokeIdx];
  const frac = traceProgress[currentStrokeIdx];
  if (frac === 0) return stroke[0];
  // Walk along the stroke to find the point
  let totalLen = 0;
  const segs = [];
  for (let i = 1; i < stroke.length; i++) {
    const dx = stroke[i].x - stroke[i-1].x;
    const dy = stroke[i].y - stroke[i-1].y;
    const len = Math.sqrt(dx*dx + dy*dy);
    segs.push(len);
    totalLen += len;
  }
  const targetLen = totalLen * frac;
  let walked = 0;
  for (let i = 1; i < stroke.length; i++) {
    if (walked + segs[i-1] >= targetLen) {
      const remaining = targetLen - walked;
      const t = remaining / segs[i-1];
      return {
        x: stroke[i-1].x + (stroke[i].x - stroke[i-1].x) * t,
        y: stroke[i-1].y + (stroke[i].y - stroke[i-1].y) * t
      };
    }
    walked += segs[i-1];
  }
  return stroke[stroke.length - 1];
}

/* ============================================================
   TRACING LOGIC
   - As finger moves, find the nearest point on the active stroke's
     "expected next position" — if close enough, advance progress.
   ============================================================ */
const stage = document.getElementById('tracingStage');

function getSvgPos(e) {
  const touch = e.touches ? e.touches[0] : e;
  if (!touch) return null;
  // Convert from screen coords to SVG viewBox coords
  const rect = svg.getBoundingClientRect();
  const x = ((touch.clientX - rect.left) / rect.width) * 400;
  const y = ((touch.clientY - rect.top) / rect.height) * 500;
  return { x, y };
}

function strokeLength(stroke) {
  let total = 0;
  for (let i = 1; i < stroke.length; i++) {
    const dx = stroke[i].x - stroke[i-1].x;
    const dy = stroke[i].y - stroke[i-1].y;
    total += Math.sqrt(dx*dx + dy*dy);
  }
  return total;
}

function dist(p1, p2) {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.sqrt(dx*dx + dy*dy);
}

function tryAdvance(fingerPos) {
  if (currentStrokeIdx >= currentStrokes.length) return;
  const stroke = currentStrokes[currentStrokeIdx];
  const currentPoint = getCurrentTracePoint();
  const distToCurrent = dist(fingerPos, currentPoint);

  // Tolerance: how close finger needs to be to count
  const TOLERANCE = 70;

  if (distToCurrent > TOLERANCE) return; // too far away, ignore

  // The finger is close enough; advance progress.
  // Calculate how much of the stroke length the finger has moved along.
  const totalLen = strokeLength(stroke);

  // Find the closest point on the *next* part of the stroke to the finger
  const currentFrac = traceProgress[currentStrokeIdx];
  let walked = 0;
  let bestFrac = currentFrac;
  let bestDist = Infinity;

  for (let i = 1; i < stroke.length; i++) {
    const segLen = dist(stroke[i-1], stroke[i]);
    // Project finger position onto this segment
    const ax = stroke[i-1].x, ay = stroke[i-1].y;
    const bx = stroke[i].x, by = stroke[i].y;
    const fx = fingerPos.x, fy = fingerPos.y;
    const segDx = bx - ax, segDy = by - ay;
    const segLenSq = segDx*segDx + segDy*segDy;
    const t = Math.max(0, Math.min(1, ((fx - ax) * segDx + (fy - ay) * segDy) / segLenSq));
    const px = ax + segDx * t;
    const py = ay + segDy * t;
    const projDist = Math.hypot(fx - px, fy - py);
    const lenAtThisPoint = walked + segLen * t;
    const frac = lenAtThisPoint / totalLen;
    // Only consider forward progress within tolerance
    if (frac >= currentFrac && projDist < TOLERANCE && projDist < bestDist) {
      bestDist = projDist;
      bestFrac = frac;
    }
    walked += segLen;
  }

  if (bestFrac > currentFrac) {
    traceProgress[currentStrokeIdx] = bestFrac;
    playTrace();
    renderLetter();
    // Stroke complete?
    if (bestFrac >= 0.97) {
      strokeComplete();
    }
  }
}

function strokeComplete() {
  completedStrokes.push(currentStrokeIdx);
  traceProgress[currentStrokeIdx] = 1;
  playStrokeDone();
  currentStrokeIdx++;
  updateProgress();

  if (currentStrokeIdx >= currentStrokes.length) {
    setTimeout(letterComplete, 500);
  } else {
    renderLetter();
  }
}

function letterComplete() {
  // Pre-fill currentStrokeIdx past the end so no start dot shows
  renderLetter();
  stars++;
  saveStars();
  updateStars();
  playLetterDone(currentLetter);

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
  lastPos = pos;
  tryAdvance(pos);
}

function moveTrace(e) {
  if (!isDrawing) return;
  e.preventDefault();
  const pos = getSvgPos(e);
  if (!pos) return;
  lastPos = pos;
  tryAdvance(pos);
}

function endTrace() {
  isDrawing = false;
  lastPos = null;
}

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
