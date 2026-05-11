/* ============================================================
   JAMARIS GAME — Connect the Dots
   ============================================================ */

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
function playWrong() { playTone(200, 0.15, 'sawtooth', 0.08); }
function playDot(num) {
  // Ascending musical scale as dots connect
  const scale = [262, 294, 330, 349, 392, 440, 494, 523, 587, 659, 698, 784];
  playTone(scale[(num - 1) % scale.length], 0.18, 'triangle', 0.15);
}
function playYay() {
  [523, 659, 784, 1047].forEach((f, i) =>
    setTimeout(() => playTone(f, 0.2, 'triangle', 0.18), i * 100)
  );
}

/* ============================================================
   PUZZLES — Each is a list of numbered dot positions (0-400 grid)
   Includes a "reveal" SVG that shows the completed picture
   ============================================================ */
const PUZZLES = [
  {
    name: 'Star',
    emoji: '⭐',
    color: '#FFE9A8',
    dots: [
      {x:200,y:60},{x:230,y:155},{x:330,y:155},{x:250,y:215},
      {x:280,y:310},{x:200,y:255},{x:120,y:310},{x:150,y:215},
      {x:70,y:155},{x:170,y:155}
    ],
    closeShape: true,
    fill: '#FFD93D'
  },
  {
    name: 'Heart',
    emoji: '❤️',
    color: '#FFD0E0',
    dots: [
      {x:200,y:340},{x:100,y:240},{x:70,y:170},{x:90,y:110},
      {x:140,y:90},{x:180,y:120},{x:200,y:160},{x:220,y:120},
      {x:260,y:90},{x:310,y:110},{x:330,y:170},{x:300,y:240}
    ],
    closeShape: true,
    fill: '#FF4F8B'
  },
  {
    name: 'House',
    emoji: '🏠',
    color: '#FFD9B0',
    dots: [
      {x:90,y:340},{x:90,y:200},{x:60,y:200},{x:200,y:80},
      {x:340,y:200},{x:310,y:200},{x:310,y:340}
    ],
    closeShape: true,
    fill: '#FFA62B'
  },
  {
    name: 'Flower',
    emoji: '🌸',
    color: '#FFE0F0',
    dots: [
      {x:200,y:80},{x:260,y:100},{x:300,y:160},{x:320,y:220},
      {x:280,y:280},{x:220,y:310},{x:180,y:310},{x:120,y:280},
      {x:80,y:220},{x:100,y:160},{x:140,y:100}
    ],
    closeShape: true,
    fill: '#FF7AD9'
  },
  {
    name: 'Fish',
    emoji: '🐠',
    color: '#B5E0F5',
    dots: [
      {x:90,y:200},{x:140,y:130},{x:230,y:120},{x:310,y:170},
      {x:340,y:200},{x:310,y:230},{x:230,y:280},{x:140,y:270},
      {x:90,y:200},{x:50,y:140},{x:50,y:260}
    ],
    closeShape: false,
    fill: '#56CCF2'
  },
  {
    name: 'Sun',
    emoji: '☀️',
    color: '#FFF0B5',
    dots: [
      {x:200,y:80},{x:260,y:110},{x:290,y:140},{x:320,y:200},
      {x:290,y:260},{x:260,y:290},{x:200,y:320},{x:140,y:290},
      {x:110,y:260},{x:80,y:200},{x:110,y:140},{x:140,y:110}
    ],
    closeShape: true,
    fill: '#FFD93D'
  },
  {
    name: 'Boat',
    emoji: '⛵',
    color: '#B5D9E0',
    dots: [
      {x:60,y:280},{x:340,y:280},{x:300,y:330},{x:100,y:330},
      {x:60,y:280},{x:200,y:280},{x:200,y:80},{x:300,y:240},{x:200,y:240}
    ],
    closeShape: false,
    fill: '#4D96FF'
  },
  {
    name: 'Apple',
    emoji: '🍎',
    color: '#FFD0D0',
    dots: [
      {x:200,y:120},{x:160,y:130},{x:120,y:160},{x:100,y:220},
      {x:120,y:290},{x:180,y:330},{x:220,y:330},{x:280,y:290},
      {x:300,y:220},{x:280,y:160},{x:240,y:130},{x:200,y:120},
      {x:215,y:90},{x:240,y:70}
    ],
    closeShape: false,
    fill: '#FF3B6C'
  }
];

/* ============================================================
   BUILD PICKER
   ============================================================ */
const carousel = document.getElementById('dotsCarousel');
PUZZLES.forEach((puzzle, idx) => {
  const card = document.createElement('div');
  card.className = 'animal-card';
  card.style.background = puzzle.color;

  // Generate mini preview SVG with all dots numbered
  let dotsHtml = '';
  puzzle.dots.forEach((d, i) => {
    dotsHtml += `<circle cx="${d.x}" cy="${d.y}" r="14" fill="white" stroke="#2a2a3e" stroke-width="3"/>`;
    dotsHtml += `<text x="${d.x}" y="${d.y + 5}" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="14" fill="#2a2a3e">${i+1}</text>`;
  });

  card.innerHTML = `
    <div class="animal-card-svg">
      <svg viewBox="0 0 400 400" preserveAspectRatio="xMidYMid meet">${dotsHtml}</svg>
    </div>
    <div class="animal-card-name">${puzzle.emoji} ${puzzle.name}</div>
  `;
  card.addEventListener('click', () => startGame(idx));
  carousel.appendChild(card);
});

/* ============================================================
   GAME LOGIC
   ============================================================ */
const svgEl = document.getElementById('dotsSvg');
let currentPuzzle = 0;
let nextDot = 1;
let connectedPath = '';

function startGame(idx) {
  playClick();
  currentPuzzle = idx;
  document.getElementById('picker').classList.remove('active');
  document.getElementById('game').classList.add('active');
  resetPuzzle();
}

function backToPicker() {
  playClick();
  document.getElementById('game').classList.remove('active');
  document.getElementById('picker').classList.add('active');
}

function resetPuzzle() {
  nextDot = 1;
  connectedPath = '';
  drawPuzzle();
  document.getElementById('nextNum').textContent = '1';
  document.getElementById('dotsHint').classList.remove('done');
}

function drawPuzzle() {
  const puzzle = PUZZLES[currentPuzzle];
  let html = '';

  // Draw connected lines first (so dots appear on top)
  if (connectedPath) {
    html += `<path d="${connectedPath}" fill="none" stroke="${puzzle.fill}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>`;
  }

  // Draw each dot
  puzzle.dots.forEach((d, i) => {
    const num = i + 1;
    const isDone = num < nextDot;
    const isNext = num === nextDot;
    const fillColor = isDone ? puzzle.fill : 'white';
    const textColor = isDone ? 'white' : '#2a2a3e';
    const ringClass = isNext ? ' class="pulsing-dot"' : '';
    html += `<g${ringClass} data-num="${num}" style="cursor:pointer;">`;
    if (isNext) {
      html += `<circle cx="${d.x}" cy="${d.y}" r="28" fill="${puzzle.fill}" opacity="0.25"/>`;
    }
    html += `<circle cx="${d.x}" cy="${d.y}" r="20" fill="${fillColor}" stroke="#2a2a3e" stroke-width="4"/>`;
    html += `<text x="${d.x}" y="${d.y + 7}" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="20" fill="${textColor}" pointer-events="none">${num}</text>`;
    html += `</g>`;
  });

  svgEl.innerHTML = html;

  // Attach tap handlers
  svgEl.querySelectorAll('g[data-num]').forEach(g => {
    g.addEventListener('click', () => onDotTap(parseInt(g.dataset.num, 10)));
    g.addEventListener('touchstart', (e) => {
      e.preventDefault();
      onDotTap(parseInt(g.dataset.num, 10));
    }, { passive: false });
  });
}

function onDotTap(num) {
  if (num === nextDot) {
    const puzzle = PUZZLES[currentPuzzle];
    const d = puzzle.dots[num - 1];
    playDot(num);

    if (num === 1) {
      connectedPath = `M ${d.x} ${d.y}`;
    } else {
      connectedPath += ` L ${d.x} ${d.y}`;
    }

    nextDot++;

    if (nextDot > puzzle.dots.length) {
      // Done!
      if (puzzle.closeShape) {
        const first = puzzle.dots[0];
        connectedPath += ` L ${first.x} ${first.y} Z`;
      }
      drawPuzzleComplete();
      celebrate();
    } else {
      document.getElementById('nextNum').textContent = nextDot;
      drawPuzzle();
    }
  } else {
    // Wrong dot
    playWrong();
    const wrong = svgEl.querySelector(`g[data-num="${num}"]`);
    if (wrong) {
      wrong.classList.add('shake');
      setTimeout(() => wrong.classList.remove('shake'), 400);
    }
  }
}

function drawPuzzleComplete() {
  const puzzle = PUZZLES[currentPuzzle];
  let html = `<path d="${connectedPath}" fill="${puzzle.fill}" fill-opacity="0.4" stroke="${puzzle.fill}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>`;
  // Show big emoji in the center
  html += `<text x="200" y="220" text-anchor="middle" font-size="120">${puzzle.emoji}</text>`;
  svgEl.innerHTML = html;
  document.getElementById('dotsHint').textContent = '✨ Great job! ✨';
  document.getElementById('dotsHint').classList.add('done');
}

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

/* ---------- WIRE UP ---------- */
document.getElementById('backBtn').addEventListener('click', backToPicker);
document.getElementById('resetBtn').addEventListener('click', () => {
  playClick();
  resetPuzzle();
});

updateStars();
