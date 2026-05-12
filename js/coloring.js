/* ============================================================
   JAMARIS GAME — Coloring Game v3
   Uses high-quality emoji as outlines for beautiful, modern art
   ============================================================ */

const COLORS = [
  '#FF3B6C', '#FF6B35', '#FFA62B', '#FFD93D',
  '#A8E063', '#56CCF2', '#4D96FF', '#9B5DE5',
  '#FF7AD9', '#8B4513', '#2a2a3e', '#F5F5F5'
];

let currentColor = COLORS[0];
let brushSize = 24;
let stars = parseInt(localStorage.getItem('jamaris_stars') || '0', 10);

function saveStars() { localStorage.setItem('jamaris_stars', String(stars)); }
function updateStars() {
  const g = document.getElementById('gameStars');
  const p = document.getElementById('pickerStars');
  if (g) g.textContent = stars;
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
function playPop(hue = 0) { playTone(300 + hue * 30, 0.1, 'sine', 0.1); }
function playYay() {
  [523, 659, 784, 1047].forEach((f, i) =>
    setTimeout(() => playTone(f, 0.2, 'triangle', 0.18), i * 100)
  );
}

/* ============================================================
   20 ANIMALS — Pure emoji, beautiful native rendering on iPhone
   ============================================================ */
const ANIMALS = [
  { name: 'Cat',        emoji: '🐱', color: '#FFD0E8' },
  { name: 'Dog',        emoji: '🐶', color: '#FFE0B5' },
  { name: 'Bunny',      emoji: '🐰', color: '#FFD8E8' },
  { name: 'Fox',        emoji: '🦊', color: '#FFCBA8' },
  { name: 'Bear',       emoji: '🐻', color: '#E8D0B0' },
  { name: 'Panda',      emoji: '🐼', color: '#E8E8E8' },
  { name: 'Lion',       emoji: '🦁', color: '#FFE8A8' },
  { name: 'Tiger',      emoji: '🐯', color: '#FFD080' },
  { name: 'Elephant',   emoji: '🐘', color: '#D5D5E8' },
  { name: 'Monkey',     emoji: '🐵', color: '#E8C8A0' },
  { name: 'Pig',        emoji: '🐷', color: '#FFC0DE' },
  { name: 'Cow',        emoji: '🐮', color: '#FFEED0' },
  { name: 'Frog',       emoji: '🐸', color: '#C8E8B0' },
  { name: 'Penguin',    emoji: '🐧', color: '#C8D8E8' },
  { name: 'Bird',       emoji: '🐦', color: '#FFD9B5' },
  { name: 'Owl',        emoji: '🦉', color: '#E0C8A0' },
  { name: 'Butterfly',  emoji: '🦋', color: '#E5C8FF' },
  { name: 'Turtle',     emoji: '🐢', color: '#C0E8C0' },
  { name: 'Fish',       emoji: '🐠', color: '#B5E8F5' },
  { name: 'Unicorn',    emoji: '🦄', color: '#F5D8FF' }
];

/* ============================================================
   BUILD PICKER SCREEN
   ============================================================ */
const carousel = document.getElementById('animalCarousel');
ANIMALS.forEach((animal, idx) => {
  const card = document.createElement('div');
  card.className = 'animal-card';
  card.style.background = animal.color;
  card.innerHTML = `
    <div class="animal-card-emoji">${animal.emoji}</div>
    <div class="animal-card-name">${animal.name}</div>
  `;
  card.addEventListener('click', () => startColoring(idx));
  carousel.appendChild(card);
});

/* ============================================================
   COLORING SCREEN — PALETTE + BRUSHES
   ============================================================ */
const paletteEl = document.getElementById('palette');
COLORS.forEach((color, i) => {
  const c = document.createElement('div');
  c.className = 'crayon' + (i === 0 ? ' active' : '');
  c.style.background = color;
  c.addEventListener('click', () => {
    document.querySelectorAll('.crayon').forEach(x => x.classList.remove('active'));
    c.classList.add('active');
    currentColor = color;
    playPop(i);
  });
  paletteEl.appendChild(c);
});

document.querySelectorAll('.brush-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    brushSize = parseInt(btn.dataset.brush, 10);
    document.querySelectorAll('.brush-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    playClick();
  });
});

/* ---------- CANVAS ---------- */
// Two canvases: bottom one draws the emoji ghost, top one is for drawing
const drawCanvas = document.getElementById('drawCanvas');
const ghostCanvas = document.getElementById('ghostCanvas');
const ctx = drawCanvas.getContext('2d');
const gctx = ghostCanvas.getContext('2d');
let currentAnimalIndex = 0;

function resizeCanvases() {
  const wrap = document.getElementById('canvasWrap');
  const rect = wrap.getBoundingClientRect();
  if (rect.width === 0) return;
  const dpr = window.devicePixelRatio || 1;

  // Save drawing canvas
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = drawCanvas.width;
  tempCanvas.height = drawCanvas.height;
  if (drawCanvas.width > 0) tempCanvas.getContext('2d').drawImage(drawCanvas, 0, 0);

  [drawCanvas, ghostCanvas].forEach(c => {
    c.width = rect.width * dpr;
    c.height = rect.height * dpr;
    c.style.width = rect.width + 'px';
    c.style.height = rect.height + 'px';
  });

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(dpr, dpr);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  gctx.setTransform(1, 0, 0, 1, 0, 0);
  gctx.scale(dpr, dpr);

  if (tempCanvas.width > 0) ctx.drawImage(tempCanvas, 0, 0, rect.width, rect.height);
  drawGhost();
}
window.addEventListener('resize', resizeCanvases);

function drawGhost() {
  const rect = ghostCanvas.getBoundingClientRect();
  gctx.clearRect(0, 0, rect.width, rect.height);
  const animal = ANIMALS[currentAnimalIndex];

  // Pick a size based on the smaller dimension
  const size = Math.min(rect.width, rect.height) * 0.85;

  gctx.font = `${size}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", system-ui, sans-serif`;
  gctx.textAlign = 'center';
  gctx.textBaseline = 'middle';

  // Soft ghosted look - faded
  gctx.globalAlpha = 0.35;
  gctx.fillText(animal.emoji, rect.width / 2, rect.height / 2);
  gctx.globalAlpha = 1;
}

function loadAnimal(idx) {
  currentAnimalIndex = idx;
  clearCanvas(true);
  drawGhost();
}

function nextAnimal() {
  currentAnimalIndex = (currentAnimalIndex + 1) % ANIMALS.length;
  loadAnimal(currentAnimalIndex);
  playClick();
}

function clearCanvas(silent = false) {
  const rect = drawCanvas.getBoundingClientRect();
  ctx.clearRect(0, 0, rect.width, rect.height);
  if (!silent) playClick();
  drawingPixels = 0;
  hasCelebrated = false;
}

/* ---------- DRAWING ---------- */
let isDrawing = false;
let lastX = 0, lastY = 0;
let drawingPixels = 0;
let hasCelebrated = false;
const COMPLETION_THRESHOLD = 8000;

function getPos(e) {
  const rect = drawCanvas.getBoundingClientRect();
  const touch = e.touches ? e.touches[0] : e;
  return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
}

function startDraw(e) {
  e.preventDefault();
  isDrawing = true;
  const pos = getPos(e);
  lastX = pos.x;
  lastY = pos.y;
  ctx.beginPath();
  ctx.arc(pos.x, pos.y, brushSize / 2, 0, Math.PI * 2);
  ctx.fillStyle = currentColor;
  ctx.fill();
  playTone(400 + Math.random() * 200, 0.05, 'sine', 0.08);
}

function draw(e) {
  if (!isDrawing) return;
  e.preventDefault();
  const pos = getPos(e);
  ctx.strokeStyle = currentColor;
  ctx.lineWidth = brushSize;
  ctx.beginPath();
  ctx.moveTo(lastX, lastY);
  ctx.lineTo(pos.x, pos.y);
  ctx.stroke();
  const dx = pos.x - lastX, dy = pos.y - lastY;
  drawingPixels += Math.sqrt(dx * dx + dy * dy) * brushSize / 10;
  lastX = pos.x;
  lastY = pos.y;
  if (!hasCelebrated && drawingPixels > COMPLETION_THRESHOLD) {
    hasCelebrated = true;
    celebrate();
  }
}

function stopDraw() { isDrawing = false; }

// Attach to drawCanvas (the top one)
drawCanvas.addEventListener('mousedown', startDraw);
drawCanvas.addEventListener('mousemove', draw);
drawCanvas.addEventListener('mouseup', stopDraw);
drawCanvas.addEventListener('mouseleave', stopDraw);
drawCanvas.addEventListener('touchstart', startDraw, { passive: false });
drawCanvas.addEventListener('touchmove', draw, { passive: false });
drawCanvas.addEventListener('touchend', stopDraw);

/* ---------- CELEBRATION ---------- */
function celebrate() {
  stars++;
  saveStars();
  updateStars();
  playYay();
  const c = document.getElementById('celebrate');
  const msgs = ['YAY!', 'WOW!', 'NICE!', 'SUPER!', 'AMAZING!'];
  document.getElementById('celebrateMsg').textContent = msgs[Math.floor(Math.random() * msgs.length)];
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

/* ---------- SCREEN NAV ---------- */
function startColoring(animalIdx) {
  playClick();
  currentAnimalIndex = animalIdx;
  document.getElementById('picker').classList.remove('active');
  document.getElementById('coloring').classList.add('active');
  setTimeout(() => {
    resizeCanvases();
    loadAnimal(currentAnimalIndex);
  }, 50);
}

function backToPicker() {
  playClick();
  document.getElementById('coloring').classList.remove('active');
  document.getElementById('picker').classList.add('active');
}

document.getElementById('backBtn').addEventListener('click', backToPicker);
document.getElementById('nextBtn').addEventListener('click', nextAnimal);
document.getElementById('eraseBtn').addEventListener('click', () => clearCanvas(false));

/* ---------- INIT ---------- */
updateStars();
