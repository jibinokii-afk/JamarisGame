/* ============================================================
   JAMARIS GAME — Shapes (drag-and-drop sorter)
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
function playPickup() { playTone(500, 0.08, 'sine', 0.1); }
function playSnap() {
  // Satisfying "click in" sound
  playTone(880, 0.06, 'sine', 0.15);
  setTimeout(() => playTone(1320, 0.12, 'triangle', 0.15), 60);
}
function playWrong() { playTone(200, 0.18, 'sine', 0.08); }
function playYay() {
  [523, 659, 784, 1047].forEach((f, i) =>
    setTimeout(() => playTone(f, 0.2, 'triangle', 0.18), i * 100)
  );
}

/* ============================================================
   SHAPE SVGs — Modern chunky designs
   All centered on viewBox 100x100
   ============================================================ */
const SHAPE_SVG = {
  circle:    `<circle cx="50" cy="50" r="42" />`,
  square:    `<rect x="8" y="8" width="84" height="84" rx="14" />`,
  triangle:  `<path d="M50 8 L92 88 L8 88 Z" stroke-linejoin="round" />`,
  star:      `<path d="M50 6 L61 38 L94 38 L67 58 L78 90 L50 70 L22 90 L33 58 L6 38 L39 38 Z" stroke-linejoin="round"/>`,
  heart:     `<path d="M50 88 Q12 60 12 32 Q12 12 30 12 Q42 12 50 24 Q58 12 70 12 Q88 12 88 32 Q88 60 50 88 Z" stroke-linejoin="round"/>`,
  rectangle: `<rect x="6" y="28" width="88" height="44" rx="10" />`,
  diamond:   `<path d="M50 6 L92 50 L50 94 L8 50 Z" stroke-linejoin="round"/>`,
  moon:      `<path d="M65 14 Q35 20 35 50 Q35 80 65 86 Q40 86 25 64 Q15 50 25 36 Q40 14 65 14 Z" stroke-linejoin="round"/>`
};

const SHAPE_NAMES = {
  circle: 'Circle', square: 'Square', triangle: 'Triangle',
  star: 'Star', heart: 'Heart', rectangle: 'Rectangle',
  diamond: 'Diamond', moon: 'Moon'
};

const COLORS = ['#FF3B6C', '#FFA62B', '#FFD93D', '#6BCB77', '#56CCF2', '#9B5DE5', '#FF7AD9'];

/* ============================================================
   GAME MODES (only one for now, more can be added later)
   ============================================================ */
const MODES = [
  {
    id: 'sorter',
    name: 'Shape Sorter',
    emoji: '🔵',
    color: '#FFE9A8',
    description: 'Drop shapes in matching holes!'
  }
  // Future: { id: 'colorsort', name: 'Color Match', emoji: '🌈', color: '#FFD0E0' }
  // Future: { id: 'find', name: 'Find the Shape', emoji: '🔍', color: '#C8E8E8' }
];

/* ============================================================
   BUILD PICKER
   ============================================================ */
const carousel = document.getElementById('modeCarousel');
MODES.forEach((mode, idx) => {
  const card = document.createElement('div');
  card.className = 'animal-card';
  card.style.background = mode.color;
  card.innerHTML = `
    <div class="count-preview">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;font-size:3.5rem;">
        <div>🔵</div><div>🟧</div>
        <div>🔺</div><div>⭐</div>
      </div>
    </div>
    <div class="animal-card-name">${mode.emoji} ${mode.name}</div>
  `;
  card.addEventListener('click', () => startGame(idx));
  carousel.appendChild(card);
});

/* ============================================================
   GAME STATE
   ============================================================ */
const ROUND_LENGTH = 5; // Shapes per round
const HOLE_COUNT = 3;   // Holes shown each round

let currentRound = 0;   // 0..ROUND_LENGTH
let currentTarget = null; // shape name like 'circle'
let currentHoles = [];   // array of shape names
let activeShapeEl = null;
let isDragging = false;
let dragOffset = { x: 0, y: 0 };
let spawnHomeX = 0, spawnHomeY = 0;

function startGame(modeIdx) {
  playClick();
  currentRound = 0;
  document.getElementById('picker').classList.remove('active');
  document.getElementById('game').classList.add('active');
  // Wait for screen to render
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      nextRound();
    });
  });
}

function backToPicker() {
  playClick();
  document.getElementById('game').classList.remove('active');
  document.getElementById('picker').classList.add('active');
}

function updateProgressDots() {
  const dotsEl = document.getElementById('progressDots');
  dotsEl.innerHTML = '';
  for (let i = 0; i < ROUND_LENGTH; i++) {
    const dot = document.createElement('div');
    dot.className = 'progress-dot' + (i < currentRound ? ' done' : '') + (i === currentRound ? ' current' : '');
    dotsEl.appendChild(dot);
  }
}

function nextRound() {
  if (currentRound >= ROUND_LENGTH) {
    levelComplete();
    return;
  }
  updateProgressDots();

  // Pick HOLE_COUNT random shapes for this round
  const allShapes = Object.keys(SHAPE_SVG);
  const shuffled = [...allShapes].sort(() => Math.random() - 0.5);
  currentHoles = shuffled.slice(0, HOLE_COUNT);
  // Pick the target from the holes
  currentTarget = currentHoles[Math.floor(Math.random() * currentHoles.length)];

  document.getElementById('hintShape').textContent = SHAPE_NAMES[currentTarget];

  renderHoles();
  spawnShape();
}

function renderHoles() {
  const holesEl = document.getElementById('shapeHoles');
  holesEl.innerHTML = '';
  currentHoles.forEach((shapeName, idx) => {
    const hole = document.createElement('div');
    hole.className = 'shape-hole';
    hole.dataset.shape = shapeName;
    // The hole is the shape outline, but darker/recessed-looking
    hole.innerHTML = `
      <svg viewBox="0 0 100 100" class="hole-svg">
        ${SHAPE_SVG[shapeName]}
      </svg>
    `;
    holesEl.appendChild(hole);
  });
}

function spawnShape() {
  const spawn = document.getElementById('shapeSpawn');
  spawn.innerHTML = '';

  const shapeEl = document.createElement('div');
  shapeEl.className = 'drag-shape';
  const color = COLORS[Math.floor(Math.random() * COLORS.length)];
  shapeEl.style.color = color;
  shapeEl.dataset.shape = currentTarget;
  shapeEl.innerHTML = `
    <svg viewBox="0 0 100 100" class="drag-svg" style="fill:${color};">
      ${SHAPE_SVG[currentTarget]}
    </svg>
  `;
  spawn.appendChild(shapeEl);
  activeShapeEl = shapeEl;

  // Remember home position (center of spawn area)
  const spawnRect = spawn.getBoundingClientRect();
  spawnHomeX = spawnRect.width / 2;
  spawnHomeY = spawnRect.height / 2;

  // Attach drag events
  shapeEl.addEventListener('mousedown', startDrag);
  shapeEl.addEventListener('touchstart', startDrag, { passive: false });
}

/* ---------- DRAG LOGIC ---------- */
function getEventPos(e) {
  if (e.touches && e.touches.length > 0) {
    return { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }
  return { x: e.clientX, y: e.clientY };
}

function startDrag(e) {
  e.preventDefault();
  if (!activeShapeEl) return;
  isDragging = true;
  activeShapeEl.classList.add('dragging');
  playPickup();

  const pos = getEventPos(e);
  const rect = activeShapeEl.getBoundingClientRect();
  dragOffset.x = pos.x - (rect.left + rect.width / 2);
  dragOffset.y = pos.y - (rect.top + rect.height / 2);

  document.addEventListener('mousemove', doDrag);
  document.addEventListener('mouseup', endDrag);
  document.addEventListener('touchmove', doDrag, { passive: false });
  document.addEventListener('touchend', endDrag);
  document.addEventListener('touchcancel', endDrag);
}

function doDrag(e) {
  if (!isDragging || !activeShapeEl) return;
  e.preventDefault();
  const pos = getEventPos(e);
  const stage = document.getElementById('shapesStage');
  const stageRect = stage.getBoundingClientRect();

  // Position relative to stage
  const x = pos.x - dragOffset.x - stageRect.left;
  const y = pos.y - dragOffset.y - stageRect.top;

  activeShapeEl.style.left = x + 'px';
  activeShapeEl.style.top = y + 'px';
  activeShapeEl.style.transform = 'translate(-50%, -50%) scale(1.1)';

  // Highlight matching hole when hovering near it
  const holes = document.querySelectorAll('.shape-hole');
  holes.forEach(h => {
    const hRect = h.getBoundingClientRect();
    const hCx = hRect.left + hRect.width / 2;
    const hCy = hRect.top + hRect.height / 2;
    const dx = pos.x - hCx;
    const dy = pos.y - hCy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < hRect.width * 0.7 && h.dataset.shape === currentTarget) {
      h.classList.add('glow');
    } else {
      h.classList.remove('glow');
    }
  });
}

function endDrag(e) {
  if (!isDragging || !activeShapeEl) return;
  isDragging = false;
  activeShapeEl.classList.remove('dragging');

  document.removeEventListener('mousemove', doDrag);
  document.removeEventListener('mouseup', endDrag);
  document.removeEventListener('touchmove', doDrag);
  document.removeEventListener('touchend', endDrag);
  document.removeEventListener('touchcancel', endDrag);

  // Get final position
  const shapeRect = activeShapeEl.getBoundingClientRect();
  const shapeCx = shapeRect.left + shapeRect.width / 2;
  const shapeCy = shapeRect.top + shapeRect.height / 2;

  // Check overlap with any hole
  const holes = document.querySelectorAll('.shape-hole');
  let droppedOnCorrect = false;
  let droppedOnWrong = false;
  let correctHole = null;

  holes.forEach(h => {
    h.classList.remove('glow');
    const hRect = h.getBoundingClientRect();
    const hCx = hRect.left + hRect.width / 2;
    const hCy = hRect.top + hRect.height / 2;
    const dx = shapeCx - hCx;
    const dy = shapeCy - hCy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < hRect.width * 0.5) {
      if (h.dataset.shape === currentTarget) {
        droppedOnCorrect = true;
        correctHole = h;
      } else {
        droppedOnWrong = true;
      }
    }
  });

  if (droppedOnCorrect) {
    snapIntoHole(correctHole);
  } else if (droppedOnWrong) {
    bounceBack(true);
  } else {
    bounceBack(false);
  }
}

function snapIntoHole(hole) {
  if (!activeShapeEl) return;
  playSnap();

  const stage = document.getElementById('shapesStage');
  const stageRect = stage.getBoundingClientRect();
  const hRect = hole.getBoundingClientRect();
  const targetX = hRect.left - stageRect.left + hRect.width / 2;
  const targetY = hRect.top - stageRect.top + hRect.height / 2;

  // Animate to hole
  activeShapeEl.style.transition = 'left 0.3s ease-out, top 0.3s ease-out, transform 0.3s ease-out';
  activeShapeEl.style.left = targetX + 'px';
  activeShapeEl.style.top = targetY + 'px';
  activeShapeEl.style.transform = 'translate(-50%, -50%) scale(0.85)';

  // Flash hole
  hole.classList.add('filled');
  setTimeout(() => {
    // Mini sparkles
    spawnMiniSparkles(hole);
  }, 200);

  // Disable further interactions
  isDragging = false;

  setTimeout(() => {
    currentRound++;
    updateStars();  // Save a star per shape? No, just per round
    nextRound();
  }, 800);
}

function bounceBack(playWrongSound) {
  if (!activeShapeEl) return;
  if (playWrongSound) playWrong();

  activeShapeEl.style.transition = 'left 0.4s cubic-bezier(0.5, 1.5, 0.4, 1), top 0.4s cubic-bezier(0.5, 1.5, 0.4, 1), transform 0.4s';
  activeShapeEl.style.left = spawnHomeX + 'px';
  activeShapeEl.style.top = spawnHomeY + 'px';
  activeShapeEl.style.transform = 'translate(-50%, -50%) scale(1)';

  setTimeout(() => {
    if (activeShapeEl) {
      activeShapeEl.style.transition = '';
    }
  }, 400);
}

function spawnMiniSparkles(hole) {
  const rect = hole.getBoundingClientRect();
  const stage = document.getElementById('shapesStage');
  const stageRect = stage.getBoundingClientRect();
  const cx = rect.left - stageRect.left + rect.width / 2;
  const cy = rect.top - stageRect.top + rect.height / 2;

  for (let i = 0; i < 8; i++) {
    const s = document.createElement('div');
    s.className = 'sparkle';
    s.textContent = ['✨','⭐','💫'][Math.floor(Math.random() * 3)];
    s.style.left = cx + 'px';
    s.style.top = cy + 'px';
    const angle = (Math.PI * 2 * i) / 8;
    const dist = 50 + Math.random() * 30;
    s.style.setProperty('--dx', Math.cos(angle) * dist + 'px');
    s.style.setProperty('--dy', Math.sin(angle) * dist + 'px');
    stage.appendChild(s);
    setTimeout(() => s.remove(), 800);
  }
}

function levelComplete() {
  stars++;
  saveStars();
  updateStars();
  playYay();

  const overlay = document.getElementById('levelComplete');
  overlay.classList.add('active');
  spawnConfetti();

  const handler = () => {
    overlay.classList.remove('active');
    overlay.removeEventListener('click', handler);
    currentRound = 0;
    nextRound();
  };
  overlay.addEventListener('click', handler);

  setTimeout(() => {
    if (overlay.classList.contains('active')) handler();
  }, 3000);
}

function spawnConfetti() {
  const colors = ['#FF3B6C', '#FFD93D', '#56CCF2', '#A8E063', '#9B5DE5', '#FF7AD9'];
  const container = document.getElementById('celebrate');
  container.classList.add('active');
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
  setTimeout(() => container.classList.remove('active'), 2200);
}

/* ---------- WIRE UP ---------- */
document.getElementById('backBtn').addEventListener('click', backToPicker);
document.getElementById('resetBtn').addEventListener('click', () => {
  playClick();
  currentRound = 0;
  nextRound();
});

updateStars();
