/* ============================================================
   JAMARIS GAME — Counting (1 to 10) - FIXED layout
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
function playCount(num) {
  const scale = [262, 294, 330, 349, 392, 440, 494, 523, 587, 659];
  playTone(scale[Math.min(num - 1, scale.length - 1)], 0.22, 'triangle', 0.18);
  setTimeout(() => playTone(scale[Math.min(num - 1, scale.length - 1)] * 2, 0.1, 'sine', 0.08), 50);
}
function playYay() {
  [523, 659, 784, 1047].forEach((f, i) =>
    setTimeout(() => playTone(f, 0.2, 'triangle', 0.18), i * 100)
  );
}
function playTrophy() {
  [523, 659, 784, 659, 784, 1047, 1318].forEach((f, i) =>
    setTimeout(() => playTone(f, 0.18, 'triangle', 0.2), i * 130)
  );
}

/* ============================================================
   COUNTING SETS
   ============================================================ */
const COUNT_SETS = [
  { name: 'Apples',       emoji: '🍎', color: '#FFD0D0', accent: '#FF3B6C' },
  { name: 'Fish',         emoji: '🐠', color: '#B5E8F5', accent: '#56CCF2' },
  { name: 'Balloons',     emoji: '🎈', color: '#FFC8E0', accent: '#FF7AD9' },
  { name: 'Stars',        emoji: '⭐', color: '#FFF0B0', accent: '#FFD93D' },
  { name: 'Bees',         emoji: '🐝', color: '#FFEEB0', accent: '#FFA62B' },
  { name: 'Strawberries', emoji: '🍓', color: '#FFD8D8', accent: '#FF4F8B' },
  { name: 'Butterflies',  emoji: '🦋', color: '#E5C8FF', accent: '#9B5DE5' },
  { name: 'Frogs',        emoji: '🐸', color: '#C8E8B0', accent: '#6BCB77' },
  { name: 'Cupcakes',     emoji: '🧁', color: '#FFE0F0', accent: '#FF7AD9' },
  { name: 'Ducks',        emoji: '🦆', color: '#FFE8B0', accent: '#FFA62B' }
];

/* ============================================================
   BUILD PICKER
   ============================================================ */
const carousel = document.getElementById('countCarousel');
COUNT_SETS.forEach((set, idx) => {
  const card = document.createElement('div');
  card.className = 'animal-card';
  card.style.background = set.color;
  card.innerHTML = `
    <div class="count-preview">
      <div class="count-preview-emoji" style="font-size:5rem;">${set.emoji}</div>
      <div class="count-preview-row">
        <span style="font-size:2.5rem;">${set.emoji}</span>
        <span style="font-size:2.5rem;">${set.emoji}</span>
        <span style="font-size:2.5rem;">${set.emoji}</span>
      </div>
    </div>
    <div class="animal-card-name">${set.name}</div>
  `;
  card.addEventListener('click', () => startGame(idx));
  carousel.appendChild(card);
});

/* ============================================================
   GAME STATE
   ============================================================ */
let currentSet = 0;
let targetNumber = 1;
let tappedCount = 0;

function startGame(idx) {
  playClick();
  currentSet = idx;
  targetNumber = 1;
  document.getElementById('picker').classList.remove('active');
  document.getElementById('game').classList.add('active');
  const set = COUNT_SETS[currentSet];
  document.documentElement.style.setProperty('--accent', set.accent);
  // Wait for the screen to actually render and have dimensions
  requestAnimationFrame(() => {
    requestAnimationFrame(() => loadNumber(targetNumber));
  });
}

function backToPicker() {
  playClick();
  document.getElementById('game').classList.remove('active');
  document.getElementById('picker').classList.add('active');
}

function loadNumber(num) {
  const set = COUNT_SETS[currentSet];
  targetNumber = num;
  tappedCount = 0;

  document.getElementById('bigNumber').textContent = num;
  document.getElementById('currentCount').textContent = 0;
  document.getElementById('targetCount').textContent = num;
  document.getElementById('progressFill').style.width = '0%';

  const big = document.getElementById('bigNumber');
  big.style.animation = 'none';
  void big.offsetWidth;
  big.style.animation = 'numberPop 0.6s ease-out';

  spawnObjects(num, set.emoji);
}

function spawnObjects(count, emoji) {
  const wrap = document.getElementById('countingWrap');
  wrap.innerHTML = '';

  // Get the wrap's actual size; fallback to window if 0
  let rect = wrap.getBoundingClientRect();
  let W = rect.width;
  let H = rect.height;

  // FALLBACK: if container has no dimensions, use viewport-based defaults
  if (W < 50 || H < 50) {
    W = Math.max(window.innerWidth - 24, 280);
    H = Math.max(window.innerHeight * 0.5, 400);
  }

  // Object size scales with available space AND object count
  // Smaller objects when there are many
  const baseSize = Math.min(W * 0.22, H * 0.22, 110);
  const size = Math.max(38, baseSize - count * 3);

  const positions = [];
  const minDist = size * 1.08;
  const padding = size * 0.55;

  // Make sure padding doesn't exceed half the available space
  const safePadding = Math.min(padding, W * 0.3, H * 0.3);

  for (let i = 0; i < count; i++) {
    let placed = false;
    for (let attempt = 0; attempt < 100 && !placed; attempt++) {
      const x = safePadding + Math.random() * Math.max(W - safePadding * 2, size);
      const y = safePadding + Math.random() * Math.max(H - safePadding * 2, size);
      let collides = false;
      for (const p of positions) {
        const dx = p.x - x, dy = p.y - y;
        if (Math.sqrt(dx * dx + dy * dy) < minDist) { collides = true; break; }
      }
      if (!collides) {
        positions.push({ x, y });
        placed = true;
      }
    }
    if (!placed) {
      // Grid fallback - guaranteed non-overlapping
      const cols = Math.ceil(Math.sqrt(count));
      const rows = Math.ceil(count / cols);
      const col = i % cols;
      const row = Math.floor(i / cols);
      const cellW = Math.max((W - safePadding * 2) / cols, size);
      const cellH = Math.max((H - safePadding * 2) / rows, size);
      positions.push({
        x: safePadding + (col + 0.5) * cellW,
        y: safePadding + (row + 0.5) * cellH
      });
    }
  }

  positions.forEach((pos, i) => {
    const obj = document.createElement('div');
    obj.className = 'count-obj';
    obj.textContent = emoji;
    obj.style.position = 'absolute';
    obj.style.left = (pos.x - size / 2) + 'px';
    obj.style.top = (pos.y - size / 2) + 'px';
    obj.style.width = size + 'px';
    obj.style.height = size + 'px';
    obj.style.fontSize = size + 'px';
    obj.style.lineHeight = size + 'px';
    obj.style.textAlign = 'center';
    obj.style.transform = `rotate(${(Math.random() - 0.5) * 20}deg)`;
    obj.style.animationDelay = (i * 0.05) + 's';
    obj.dataset.index = i;
    obj.addEventListener('click', () => tapObject(obj));
    obj.addEventListener('touchstart', (e) => {
      e.preventDefault();
      tapObject(obj);
    }, { passive: false });
    wrap.appendChild(obj);
  });
}

function tapObject(el) {
  if (el.classList.contains('counted')) return;
  el.classList.add('counted');
  tappedCount++;

  playCount(tappedCount);

  const check = document.createElement('div');
  check.className = 'check-mark';
  check.textContent = tappedCount;
  el.appendChild(check);

  document.getElementById('currentCount').textContent = tappedCount;
  const pct = (tappedCount / targetNumber) * 100;
  document.getElementById('progressFill').style.width = pct + '%';

  spawnSparkles(el);

  if (tappedCount >= targetNumber) {
    setTimeout(() => numberComplete(), 600);
  }
}

function spawnSparkles(el) {
  const rect = el.getBoundingClientRect();
  const wrap = document.getElementById('countingWrap');
  const wrapRect = wrap.getBoundingClientRect();
  const cx = rect.left - wrapRect.left + rect.width / 2;
  const cy = rect.top - wrapRect.top + rect.height / 2;
  for (let i = 0; i < 6; i++) {
    const s = document.createElement('div');
    s.className = 'sparkle';
    s.textContent = ['✨','⭐','💫'][Math.floor(Math.random() * 3)];
    s.style.left = cx + 'px';
    s.style.top = cy + 'px';
    const angle = (Math.PI * 2 * i) / 6;
    const dist = 40 + Math.random() * 30;
    s.style.setProperty('--dx', Math.cos(angle) * dist + 'px');
    s.style.setProperty('--dy', Math.sin(angle) * dist + 'px');
    wrap.appendChild(s);
    setTimeout(() => s.remove(), 800);
  }
}

function numberComplete() {
  stars++;
  saveStars();
  updateStars();

  if (targetNumber >= 10) {
    showTrophy();
  } else {
    showNumberDone();
  }
}

function showNumberDone() {
  document.getElementById('completedNumber').textContent = targetNumber;
  document.getElementById('numberComplete').classList.add('active');
  playYay();
  spawnConfetti();

  const handler = () => {
    document.getElementById('numberComplete').classList.remove('active');
    document.getElementById('numberComplete').removeEventListener('click', handler);
    loadNumber(targetNumber + 1);
  };
  document.getElementById('numberComplete').addEventListener('click', handler);

  setTimeout(() => {
    if (document.getElementById('numberComplete').classList.contains('active')) {
      handler();
    }
  }, 2500);
}

function showTrophy() {
  const overlay = document.getElementById('numberComplete');
  overlay.innerHTML = `
    <div class="number-complete-inner trophy-mode">
      <div class="trophy-big">🏆</div>
      <div class="trophy-msg">YOU COUNTED TO 10!</div>
      <div class="next-msg">Tap to count again</div>
    </div>
  `;
  overlay.classList.add('active');
  playTrophy();
  spawnConfetti();
  spawnConfetti();

  const handler = () => {
    overlay.classList.remove('active');
    overlay.removeEventListener('click', handler);
    overlay.innerHTML = `
      <div class="number-complete-inner">
        <div class="trophy">🏆</div>
        <div class="big-number-done" id="completedNumber">1</div>
        <div class="next-msg">Tap to keep going!</div>
      </div>
    `;
    loadNumber(1);
  };
  overlay.addEventListener('click', handler);
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
  loadNumber(targetNumber);
});

window.addEventListener('resize', () => {
  if (document.getElementById('game').classList.contains('active')) {
    tappedCount = 0;
    document.getElementById('currentCount').textContent = 0;
    document.getElementById('progressFill').style.width = '0%';
    spawnObjects(targetNumber, COUNT_SETS[currentSet].emoji);
  }
});

updateStars();
