/* ============================================================
   JAMARIS GAME — Coloring Game with Animal Picker
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

/* ---------- 10 ANIMALS ---------- */
const ANIMALS = [
  { name: 'Cat', emoji: '🐱', color: '#FFB5D8', paths: `
    <path d="M120 180 L110 90 L170 140 L230 140 L290 90 L280 180" />
    <path d="M120 180 Q90 240 120 300 Q140 340 200 340 Q260 340 280 300 Q310 240 280 180" />
    <circle cx="160" cy="220" r="8"/>
    <circle cx="240" cy="220" r="8"/>
    <path d="M195 250 Q200 260 205 250" />
    <path d="M200 260 L200 280" />
    <path d="M170 275 Q200 295 230 275" />
    <path d="M140 230 L100 220 M140 240 L100 245 M260 230 L300 220 M260 240 L300 245" />
  `},
  { name: 'Fish', emoji: '🐟', color: '#A8E0F5', paths: `
    <path d="M80 200 Q120 130 220 130 Q300 130 320 200 Q300 270 220 270 Q120 270 80 200 Z" />
    <path d="M80 200 L30 150 L40 200 L30 250 Z" />
    <circle cx="260" cy="185" r="10"/>
    <path d="M200 170 Q210 180 220 170 M200 220 Q210 230 220 220" />
    <path d="M150 200 Q170 195 190 200 Q170 205 150 200" />
  `},
  { name: 'Butterfly', emoji: '🦋', color: '#E0BFFF', paths: `
    <ellipse cx="200" cy="200" rx="12" ry="60"/>
    <circle cx="200" cy="145" r="14"/>
    <path d="M195 135 Q185 115 195 105 M205 135 Q215 115 205 105" />
    <path d="M188 170 Q100 120 80 200 Q90 240 188 220 Z" />
    <path d="M212 170 Q300 120 320 200 Q310 240 212 220 Z" />
    <path d="M188 220 Q120 240 110 290 Q160 300 188 260 Z" />
    <path d="M212 220 Q280 240 290 290 Q240 300 212 260 Z" />
    <circle cx="140" cy="190" r="6"/>
    <circle cx="260" cy="190" r="6"/>
  `},
  { name: 'Elephant', emoji: '🐘', color: '#C9C9E0', paths: `
    <path d="M100 200 Q100 130 180 120 Q260 120 280 170 L300 170 Q330 170 330 210 Q330 250 300 250 L290 280 Q290 320 250 320 L240 320 L240 290 L200 290 L200 320 L160 320 Q120 320 120 280 L120 250 Q100 240 100 200 Z" />
    <circle cx="180" cy="170" r="6"/>
    <path d="M170 240 Q170 280 150 310 Q140 330 160 340 Q180 335 180 310 Q185 280 195 260" />
    <path d="M80 200 Q60 220 80 250" />
  `},
  { name: 'Bird', emoji: '🐦', color: '#FFD9A8', paths: `
    <path d="M120 230 Q120 150 200 140 Q280 150 280 230 Q280 290 200 300 Q120 290 120 230 Z" />
    <circle cx="240" cy="200" r="6"/>
    <path d="M280 215 L320 210 L320 230 L280 235 Z" />
    <path d="M120 240 Q100 280 130 290 Q150 280 140 260" />
    <path d="M180 300 L175 330 L190 320 M210 300 L215 330 L200 320" />
    <path d="M150 200 Q170 190 200 195 Q180 210 150 200" />
  `},
  { name: 'Turtle', emoji: '🐢', color: '#B5E8C0', paths: `
    <ellipse cx="200" cy="220" rx="110" ry="80"/>
    <path d="M200 160 L170 200 L185 250 L215 250 L230 200 Z" />
    <path d="M170 200 L130 215 M230 200 L270 215 M185 250 L175 290 M215 250 L225 290" />
    <circle cx="305" cy="200" r="25"/>
    <circle cx="312" cy="195" r="4"/>
    <path d="M295 215 Q305 220 315 215" />
    <path d="M110 200 Q90 200 95 215 L120 215 M290 290 L300 305 M120 290 L110 305 M280 290 L290 305" />
  `},
  { name: 'Bunny', emoji: '🐰', color: '#FFE5E5', paths: `
    <ellipse cx="170" cy="100" rx="20" ry="55"/>
    <ellipse cx="230" cy="100" rx="20" ry="55"/>
    <circle cx="200" cy="200" r="80"/>
    <circle cx="175" cy="190" r="6"/>
    <circle cx="225" cy="190" r="6"/>
    <ellipse cx="200" cy="215" rx="8" ry="5"/>
    <path d="M200 220 L200 235" />
    <path d="M185 240 Q200 250 215 240" />
    <path d="M170 250 L155 270 M180 255 L175 280 M220 255 L225 280 M230 250 L245 270" />
    <ellipse cx="200" cy="320" rx="60" ry="25"/>
  `},
  { name: 'Dog', emoji: '🐶', color: '#FFE0B5', paths: `
    <path d="M130 180 Q120 100 170 120 L180 160" />
    <path d="M270 180 Q280 100 230 120 L220 160" />
    <circle cx="200" cy="220" r="90"/>
    <circle cx="170" cy="210" r="7"/>
    <circle cx="230" cy="210" r="7"/>
    <ellipse cx="200" cy="240" rx="14" ry="10"/>
    <path d="M200 250 L200 265" />
    <path d="M180 270 Q200 285 220 270" />
    <path d="M195 275 L195 290 L205 290 L205 275" />
  `},
  { name: 'Pig', emoji: '🐷', color: '#FFCBE0', paths: `
    <circle cx="200" cy="220" r="100"/>
    <path d="M150 130 L165 165 M250 130 L235 165" />
    <ellipse cx="200" cy="245" rx="35" ry="25"/>
    <circle cx="190" cy="245" r="5"/>
    <circle cx="210" cy="245" r="5"/>
    <circle cx="170" cy="200" r="7"/>
    <circle cx="230" cy="200" r="7"/>
    <path d="M180 275 Q200 290 220 275" />
  `},
  { name: 'Frog', emoji: '🐸', color: '#C8E6B5', paths: `
    <ellipse cx="200" cy="240" rx="110" ry="70"/>
    <circle cx="155" cy="170" r="35"/>
    <circle cx="245" cy="170" r="35"/>
    <circle cx="155" cy="175" r="10"/>
    <circle cx="245" cy="175" r="10"/>
    <path d="M150 250 Q200 290 250 250" />
    <path d="M100 290 Q70 300 80 320 Q100 330 130 310 M300 290 Q330 300 320 320 Q300 330 270 310" />
  `}
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
    <div class="animal-card-svg">
      <svg viewBox="0 0 400 400" preserveAspectRatio="xMidYMid meet">${animal.paths}</svg>
    </div>
    <div class="animal-card-name">${animal.emoji} ${animal.name}</div>
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
const canvas = document.getElementById('drawCanvas');
const ctx = canvas.getContext('2d');
const svg = document.getElementById('outlineSvg');
let currentAnimalIndex = 0;

function resizeCanvas() {
  const wrap = document.getElementById('canvasWrap');
  const rect = wrap.getBoundingClientRect();
  if (rect.width === 0) return;
  const dpr = window.devicePixelRatio || 1;
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = canvas.width;
  tempCanvas.height = canvas.height;
  if (canvas.width > 0) tempCanvas.getContext('2d').drawImage(canvas, 0, 0);
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  canvas.style.width = rect.width + 'px';
  canvas.style.height = rect.height + 'px';
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(dpr, dpr);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (tempCanvas.width > 0) ctx.drawImage(tempCanvas, 0, 0, rect.width, rect.height);
}
window.addEventListener('resize', resizeCanvas);

function loadAnimal(idx) {
  svg.innerHTML = ANIMALS[idx].paths;
  clearCanvas(true);
}

function nextAnimal() {
  currentAnimalIndex = (currentAnimalIndex + 1) % ANIMALS.length;
  loadAnimal(currentAnimalIndex);
  playClick();
}

function clearCanvas(silent = false) {
  const rect = canvas.getBoundingClientRect();
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
  const rect = canvas.getBoundingClientRect();
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

canvas.addEventListener('mousedown', startDraw);
canvas.addEventListener('mousemove', draw);
canvas.addEventListener('mouseup', stopDraw);
canvas.addEventListener('mouseleave', stopDraw);
canvas.addEventListener('touchstart', startDraw, { passive: false });
canvas.addEventListener('touchmove', draw, { passive: false });
canvas.addEventListener('touchend', stopDraw);

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
    resizeCanvas();
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
