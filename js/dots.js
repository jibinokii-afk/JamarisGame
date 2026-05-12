/* ============================================================
   JAMARIS GAME — Connect the Dots v2
   Modern shapes + multi-segment line support
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
  const scale = [262, 294, 330, 349, 392, 440, 494, 523, 587, 659, 698, 784, 880, 988];
  playTone(scale[(num - 1) % scale.length], 0.18, 'triangle', 0.15);
}
function playYay() {
  [523, 659, 784, 1047].forEach((f, i) =>
    setTimeout(() => playTone(f, 0.2, 'triangle', 0.18), i * 100)
  );
}

/* ============================================================
   PUZZLES — Each dot has a `lift: true` flag if the line should
   restart from that dot (not connect from the previous one).
   This lets us draw shapes with separate strokes.
   ============================================================ */

const PUZZLES = [
  {
    name: 'Star', emoji: '⭐', color: '#FFE9A8', fill: '#FFD93D',
    dots: [
      {x:200,y:70},{x:230,y:165},{x:330,y:165},{x:250,y:225},
      {x:280,y:320},{x:200,y:265},{x:120,y:320},{x:150,y:225},
      {x:70,y:165},{x:170,y:165}
    ],
    closeShape: true
  },
  {
    name: 'Heart', emoji: '❤️', color: '#FFD0E0', fill: '#FF4F8B',
    dots: [
      {x:200,y:340},{x:100,y:240},{x:70,y:170},{x:90,y:110},
      {x:140,y:90},{x:180,y:120},{x:200,y:160},{x:220,y:120},
      {x:260,y:90},{x:310,y:110},{x:330,y:170},{x:300,y:240}
    ],
    closeShape: true
  },
  {
    name: 'Smiley', emoji: '😊', color: '#FFF0B0', fill: '#FFD93D',
    // Big circle for the face
    dots: [
      {x:200,y:70},{x:280,y:90},{x:330,y:150},{x:340,y:220},
      {x:310,y:285},{x:255,y:325},{x:200,y:335},{x:145,y:325},
      {x:90,y:285},{x:60,y:220},{x:70,y:150},{x:120,y:90}
    ],
    closeShape: true
  },
  {
    name: 'House', emoji: '🏠', color: '#FFD9B0', fill: '#FFA62B',
    dots: [
      // Walls + roof in one stroke
      {x:90,y:340},{x:90,y:200},{x:200,y:100},{x:310,y:200},{x:310,y:340},{x:90,y:340},
      // Door (separate stroke)
      {x:170,y:340, lift:true},{x:170,y:260},{x:230,y:260},{x:230,y:340},
      // Window (separate stroke)
      {x:120,y:240, lift:true},{x:160,y:240},{x:160,y:280},{x:120,y:280},{x:120,y:240}
    ],
    closeShape: false
  },
  {
    name: 'Flower', emoji: '🌷', color: '#FFE0F0', fill: '#FF7AD9',
    dots: [
      // Petals (loop)
      {x:200,y:80},{x:240,y:110},{x:280,y:130},{x:310,y:170},
      {x:280,y:220},{x:230,y:240},{x:200,y:200},
      {x:170,y:240},{x:120,y:220},{x:90,y:170},
      {x:120,y:130},{x:160,y:110},
      // Stem (separate stroke down from center)
      {x:200,y:240, lift:true},{x:200,y:330},
      // Leaf
      {x:200,y:290, lift:true},{x:250,y:280},{x:260,y:310},{x:200,y:310}
    ],
    closeShape: false
  },
  {
    name: 'Sun', emoji: '☀️', color: '#FFF0B5', fill: '#FFA62B',
    dots: [
      // Big sun circle
      {x:200,y:130},{x:240,y:140},{x:260,y:170},{x:270,y:200},
      {x:260,y:230},{x:240,y:260},{x:200,y:270},{x:160,y:260},
      {x:140,y:230},{x:130,y:200},{x:140,y:170},{x:160,y:140},
      // Ray 1 (top)
      {x:200,y:110, lift:true},{x:200,y:60},
      // Ray 2 (right)
      {x:280,y:200, lift:true},{x:340,y:200},
      // Ray 3 (bottom)
      {x:200,y:290, lift:true},{x:200,y:340},
      // Ray 4 (left)
      {x:120,y:200, lift:true},{x:60,y:200}
    ],
    closeShape: false
  },
  {
    name: 'Boat', emoji: '⛵', color: '#B5D9F0', fill: '#4D96FF',
    dots: [
      // Boat hull
      {x:70,y:280},{x:330,y:280},{x:290,y:330},{x:110,y:330},{x:70,y:280},
      // Mast going up
      {x:200,y:280, lift:true},{x:200,y:80},
      // Sail (triangle from mast top)
      {x:200,y:80},{x:280,y:240},{x:200,y:240}
    ],
    closeShape: false
  },
  {
    name: 'Apple', emoji: '🍎', color: '#FFD0D0', fill: '#FF3B6C',
    dots: [
      // Apple body
      {x:200,y:130},{x:160,y:140},{x:120,y:170},{x:100,y:230},
      {x:120,y:300},{x:180,y:330},{x:220,y:330},{x:280,y:300},
      {x:300,y:230},{x:280,y:170},{x:240,y:140},{x:200,y:130},
      // Stem
      {x:200,y:130, lift:true},{x:215,y:95},
      // Leaf
      {x:215,y:95},{x:255,y:85},{x:240,y:115}
    ],
    closeShape: false
  },
  {
    name: 'Balloon', emoji: '🎈', color: '#FFC8E0', fill: '#FF3B6C',
    dots: [
      // Balloon top
      {x:200,y:80},{x:260,y:100},{x:290,y:150},{x:290,y:210},
      {x:260,y:250},{x:220,y:265},{x:200,y:280},
      {x:180,y:265},{x:140,y:250},{x:110,y:210},{x:110,y:150},{x:140,y:100},{x:200,y:80},
      // String (zig-zag down)
      {x:200,y:280, lift:true},{x:190,y:310},{x:210,y:340},{x:195,y:370}
    ],
    closeShape: false
  },
  {
    name: 'Ice Cream', emoji: '🍦', color: '#FFE0E8', fill: '#FF7AD9',
    dots: [
      // Top scoop (round)
      {x:200,y:80},{x:250,y:100},{x:270,y:140},{x:260,y:170},
      {x:200,y:175},{x:140,y:170},{x:130,y:140},{x:150,y:100},{x:200,y:80},
      // Cone (triangle)
      {x:140,y:175, lift:true},{x:200,y:340},{x:260,y:175},
      // Waffle lines
      {x:160,y:220, lift:true},{x:240,y:220},
      {x:175,y:270, lift:true},{x:225,y:270}
    ],
    closeShape: false
  },
  {
    name: 'Tree', emoji: '🌳', color: '#C8E8B5', fill: '#6BCB77',
    dots: [
      // Tree top (cloud-like)
      {x:200,y:60},{x:260,y:80},{x:300,y:130},{x:310,y:190},
      {x:280,y:230},{x:230,y:240},
      // Right trunk
      {x:230,y:240},{x:230,y:330},
      // Bottom (ground)
      {x:230,y:330},{x:170,y:330},
      // Left trunk back up
      {x:170,y:330},{x:170,y:240},
      // Back around the leaves
      {x:170,y:240},{x:120,y:230},{x:90,y:190},{x:100,y:130},{x:140,y:80},{x:200,y:60}
    ],
    closeShape: false
  },
  {
    name: 'Rocket', emoji: '🚀', color: '#D0D8F0', fill: '#9B5DE5',
    dots: [
      // Rocket body
      {x:200,y:70},{x:240,y:110},{x:240,y:240},
      // Right fin
      {x:240,y:240},{x:290,y:300},{x:240,y:290},
      // Bottom (flame area)
      {x:240,y:290},{x:200,y:330},{x:160,y:290},
      // Left fin
      {x:160,y:290},{x:110,y:300},{x:160,y:240},
      // Back up to nose
      {x:160,y:240},{x:160,y:110},{x:200,y:70},
      // Window (separate circle)
      {x:200,y:140, lift:true},{x:220,y:160},{x:200,y:180},{x:180,y:160},{x:200,y:140}
    ],
    closeShape: false
  }
];

/* ============================================================
   BUILD PICKER (with mini preview of each puzzle)
   ============================================================ */
const carousel = document.getElementById('dotsCarousel');
PUZZLES.forEach((puzzle, idx) => {
  const card = document.createElement('div');
  card.className = 'animal-card';
  card.style.background = puzzle.color;

  // Create preview: show the lines that will form + dots
  let pathStr = '';
  puzzle.dots.forEach((d, i) => {
    if (i === 0 || d.lift) {
      pathStr += ` M ${d.x} ${d.y}`;
    } else {
      pathStr += ` L ${d.x} ${d.y}`;
    }
  });

  let dotsHtml = '';
  puzzle.dots.forEach((d, i) => {
    dotsHtml += `<circle cx="${d.x}" cy="${d.y}" r="10" fill="white" stroke="#2a2a3e" stroke-width="3"/>`;
    dotsHtml += `<text x="${d.x}" y="${d.y + 4}" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="11" fill="#2a2a3e">${i+1}</text>`;
  });

  card.innerHTML = `
    <div class="animal-card-svg">
      <svg viewBox="0 0 400 400" preserveAspectRatio="xMidYMid meet">
        <path d="${pathStr}" fill="none" stroke="${puzzle.fill}" stroke-width="3" stroke-dasharray="6,6" opacity="0.4"/>
        ${dotsHtml}
      </svg>
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
let pathSegments = []; // array of {x,y,lift} commands

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
  pathSegments = [];
  drawPuzzle();
  document.getElementById('nextNum').textContent = '1';
  document.getElementById('dotsHint').classList.remove('done');
  document.getElementById('dotsHint').innerHTML = 'Tap dot <span id="nextNum">1</span>';
}

function buildPathString() {
  let str = '';
  pathSegments.forEach((seg, i) => {
    if (i === 0 || seg.lift) {
      str += ` M ${seg.x} ${seg.y}`;
    } else {
      str += ` L ${seg.x} ${seg.y}`;
    }
  });
  return str;
}

function drawPuzzle() {
  const puzzle = PUZZLES[currentPuzzle];
  let html = '';

  // Draw connected lines (supports multiple segments via M commands)
  if (pathSegments.length > 0) {
    const pathStr = buildPathString();
    html += `<path d="${pathStr}" fill="none" stroke="${puzzle.fill}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>`;
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
      html += `<circle cx="${d.x}" cy="${d.y}" r="32" fill="${puzzle.fill}" opacity="0.25"/>`;
    }
    // Bigger tap target (invisible)
    html += `<circle cx="${d.x}" cy="${d.y}" r="30" fill="transparent"/>`;
    // Visible dot
    html += `<circle cx="${d.x}" cy="${d.y}" r="20" fill="${fillColor}" stroke="#2a2a3e" stroke-width="4"/>`;
    html += `<text x="${d.x}" y="${d.y + 7}" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="20" fill="${textColor}" pointer-events="none">${num}</text>`;
    html += `</g>`;
  });

  svgEl.innerHTML = html;

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

    // Add this dot to the path; preserve its "lift" flag
    pathSegments.push({
      x: d.x,
      y: d.y,
      lift: d.lift === true
    });

    nextDot++;

    if (nextDot > puzzle.dots.length) {
      // Done!
      if (puzzle.closeShape && pathSegments.length > 0) {
        // Close back to the first point of the last segment
        // Find the last "lift" or start
        let lastStart = 0;
        for (let i = pathSegments.length - 1; i >= 0; i--) {
          if (i === 0 || pathSegments[i].lift) { lastStart = i; break; }
        }
        const startPt = pathSegments[lastStart];
        pathSegments.push({ x: startPt.x, y: startPt.y, lift: false });
      }
      drawPuzzleComplete();
      celebrate();
    } else {
      document.getElementById('nextNum').textContent = nextDot;
      drawPuzzle();
    }
  } else {
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
  const pathStr = buildPathString();
  let html = `<path d="${pathStr}" fill="${puzzle.fill}" fill-opacity="0.35" stroke="${puzzle.fill}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>`;
  // Big emoji in center
  html += `<text x="200" y="225" text-anchor="middle" font-size="100">${puzzle.emoji}</text>`;
  svgEl.innerHTML = html;
  document.getElementById('dotsHint').innerHTML = '✨ Great job! ✨';
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
