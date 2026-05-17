/* ============================================================
   JAMARIS GAME — Build a Train
   Drag cars, customize colors and passengers, watch it chug!
   ============================================================ */

let stars = parseInt(localStorage.getItem('jamaris_stars') || '0', 10);
function saveStars() { localStorage.setItem('jamaris_stars', String(stars)); }

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
function playSnap() {
  playTone(660, 0.06, 'square', 0.1);
  setTimeout(() => playTone(880, 0.1, 'triangle', 0.12), 50);
}
function playPop() { playTone(400, 0.08, 'sine', 0.12); }
function playChooChoo() {
  // Descending train whistle
  try {
    const ctx = getAudio();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(700, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(450, ctx.currentTime + 0.4);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  } catch (e) {}
}
function playChug() {
  // Quick percussive "chug" sound
  playTone(120 + Math.random() * 30, 0.08, 'square', 0.06);
}
function playYay() {
  [523, 659, 784, 1047].forEach((f, i) =>
    setTimeout(() => playTone(f, 0.2, 'triangle', 0.18), i * 100)
  );
}

/* ============================================================
   CAR TYPES & PASSENGERS
   ============================================================ */
const CAR_COLORS = ['#FF3B6C', '#FFA62B', '#FFD93D', '#6BCB77', '#56CCF2', '#9B5DE5', '#FF7AD9'];
const PASSENGERS = ['🐱', '🐶', '🐰', '🦊', '🐻', '🐼', '🦁', '🐯', '🐸', '🐧', '🦋', '🦄', null]; // null = empty

// Car templates: each is an SVG that gets the color injected
const CAR_TYPES = {
  passenger: {
    name: 'Passenger',
    hasWindow: true,
    svg: (color) => `
      <svg viewBox="0 0 140 100" preserveAspectRatio="xMidYMid meet">
        <!-- Body -->
        <rect x="6" y="20" width="128" height="55" rx="10" fill="${color}" stroke="#2a2a3e" stroke-width="5"/>
        <!-- Window -->
        <rect x="22" y="30" width="96" height="34" rx="6" fill="#E8F4FF" stroke="#2a2a3e" stroke-width="4" class="car-window"/>
        <!-- Window frame divider -->
        <line x1="70" y1="30" x2="70" y2="64" stroke="#2a2a3e" stroke-width="3"/>
        <!-- Wheels -->
        <circle cx="35" cy="80" r="13" fill="#2a2a3e"/>
        <circle cx="35" cy="80" r="6" fill="#888" class="wheel-spoke"/>
        <circle cx="105" cy="80" r="13" fill="#2a2a3e"/>
        <circle cx="105" cy="80" r="6" fill="#888" class="wheel-spoke"/>
        <!-- Couplers -->
        <rect x="0" y="50" width="8" height="10" fill="#2a2a3e"/>
        <rect x="132" y="50" width="8" height="10" fill="#2a2a3e"/>
      </svg>
    `
  },
  cargo: {
    name: 'Cargo',
    hasWindow: false,
    svg: (color) => `
      <svg viewBox="0 0 140 100" preserveAspectRatio="xMidYMid meet">
        <!-- Open-top body -->
        <path d="M6 30 L6 75 Q6 80 11 80 L129 80 Q134 80 134 75 L134 30 L120 30 L120 50 L20 50 L20 30 Z" fill="${color}" stroke="#2a2a3e" stroke-width="5" stroke-linejoin="round"/>
        <!-- Cargo box inside -->
        <rect x="25" y="35" width="90" height="30" rx="3" fill="#A0522D" stroke="#2a2a3e" stroke-width="3"/>
        <line x1="70" y1="35" x2="70" y2="65" stroke="#2a2a3e" stroke-width="2"/>
        <!-- Wheels -->
        <circle cx="35" cy="80" r="13" fill="#2a2a3e"/>
        <circle cx="35" cy="80" r="6" fill="#888" class="wheel-spoke"/>
        <circle cx="105" cy="80" r="13" fill="#2a2a3e"/>
        <circle cx="105" cy="80" r="6" fill="#888" class="wheel-spoke"/>
        <!-- Couplers -->
        <rect x="0" y="50" width="8" height="10" fill="#2a2a3e"/>
        <rect x="132" y="50" width="8" height="10" fill="#2a2a3e"/>
      </svg>
    `
  },
  tanker: {
    name: 'Tanker',
    hasWindow: false,
    svg: (color) => `
      <svg viewBox="0 0 140 100" preserveAspectRatio="xMidYMid meet">
        <!-- Base platform -->
        <rect x="6" y="60" width="128" height="15" rx="3" fill="#5a3a1a" stroke="#2a2a3e" stroke-width="4"/>
        <!-- Tanker cylinder -->
        <ellipse cx="70" cy="48" rx="60" ry="22" fill="${color}" stroke="#2a2a3e" stroke-width="5"/>
        <!-- Top hatch -->
        <circle cx="70" cy="30" r="8" fill="#2a2a3e"/>
        <circle cx="70" cy="30" r="4" fill="#888"/>
        <!-- Side line for cylinder shape -->
        <line x1="22" y1="48" x2="118" y2="48" stroke="#2a2a3e" stroke-width="2" opacity="0.3"/>
        <!-- Wheels -->
        <circle cx="35" cy="80" r="13" fill="#2a2a3e"/>
        <circle cx="35" cy="80" r="6" fill="#888" class="wheel-spoke"/>
        <circle cx="105" cy="80" r="13" fill="#2a2a3e"/>
        <circle cx="105" cy="80" r="6" fill="#888" class="wheel-spoke"/>
        <!-- Couplers -->
        <rect x="0" y="60" width="8" height="10" fill="#2a2a3e"/>
        <rect x="132" y="60" width="8" height="10" fill="#2a2a3e"/>
      </svg>
    `
  },
  caboose: {
    name: 'Caboose',
    hasWindow: true,
    svg: (color) => `
      <svg viewBox="0 0 140 100" preserveAspectRatio="xMidYMid meet">
        <!-- Body -->
        <rect x="6" y="30" width="128" height="45" rx="8" fill="${color}" stroke="#2a2a3e" stroke-width="5"/>
        <!-- Cupola on top -->
        <rect x="50" y="10" width="40" height="22" rx="5" fill="${color}" stroke="#2a2a3e" stroke-width="5"/>
        <!-- Cupola window -->
        <rect x="58" y="16" width="24" height="12" rx="2" fill="#E8F4FF" stroke="#2a2a3e" stroke-width="2"/>
        <!-- Main window -->
        <rect x="22" y="42" width="40" height="24" rx="4" fill="#E8F4FF" stroke="#2a2a3e" stroke-width="4" class="car-window"/>
        <!-- Door -->
        <rect x="85" y="40" width="30" height="35" rx="3" fill="#A0522D" stroke="#2a2a3e" stroke-width="3"/>
        <circle cx="108" cy="58" r="2" fill="#2a2a3e"/>
        <!-- Wheels -->
        <circle cx="35" cy="80" r="13" fill="#2a2a3e"/>
        <circle cx="35" cy="80" r="6" fill="#888" class="wheel-spoke"/>
        <circle cx="105" cy="80" r="13" fill="#2a2a3e"/>
        <circle cx="105" cy="80" r="6" fill="#888" class="wheel-spoke"/>
        <!-- Couplers -->
        <rect x="0" y="50" width="8" height="10" fill="#2a2a3e"/>
        <rect x="132" y="50" width="8" height="10" fill="#2a2a3e"/>
      </svg>
    `
  }
};

// The locomotive (always at the front, never removable)
function locomotiveSvg(color = '#FF3B6C') {
  return `
    <svg viewBox="0 0 160 110" preserveAspectRatio="xMidYMid meet">
      <!-- Smokestack -->
      <rect x="40" y="14" width="20" height="30" rx="3" fill="#2a2a3e" stroke="#2a2a3e" stroke-width="3"/>
      <rect x="36" y="10" width="28" height="8" rx="2" fill="#2a2a3e"/>
      <!-- Cab (back) -->
      <rect x="95" y="20" width="50" height="50" rx="6" fill="${color}" stroke="#2a2a3e" stroke-width="5"/>
      <rect x="105" y="30" width="32" height="24" rx="3" fill="#E8F4FF" stroke="#2a2a3e" stroke-width="3"/>
      <!-- Boiler (main cylinder) -->
      <ellipse cx="55" cy="55" rx="50" ry="20" fill="${color}" stroke="#2a2a3e" stroke-width="5"/>
      <!-- Front face -->
      <circle cx="20" cy="55" r="14" fill="#2a2a3e"/>
      <circle cx="20" cy="55" r="9" fill="#FFD93D"/>
      <circle cx="20" cy="55" r="4" fill="#FFA62B"/>
      <!-- Base platform -->
      <rect x="6" y="70" width="148" height="8" rx="2" fill="#2a2a3e"/>
      <!-- Small front wheel -->
      <circle cx="30" cy="88" r="10" fill="#2a2a3e"/>
      <circle cx="30" cy="88" r="5" fill="#888" class="wheel-spoke"/>
      <!-- Big back wheels -->
      <circle cx="75" cy="88" r="15" fill="#2a2a3e"/>
      <circle cx="75" cy="88" r="7" fill="#888" class="wheel-spoke"/>
      <circle cx="120" cy="88" r="15" fill="#2a2a3e"/>
      <circle cx="120" cy="88" r="7" fill="#888" class="wheel-spoke"/>
      <!-- Connecting rod -->
      <line x1="75" y1="88" x2="120" y2="88" stroke="#888" stroke-width="3"/>
      <!-- Rear coupler -->
      <rect x="152" y="55" width="8" height="10" fill="#2a2a3e"/>
    </svg>
  `;
}

/* ============================================================
   STATE — the train as a list of cars
   ============================================================ */
let train = []; // array of { id, type, color, passenger }
let nextId = 1;
let isRiding = false;

function makeId() { return 'car-' + (nextId++); }

/* ============================================================
   RENDER THE PARTS SHELF (where Jamaris drags cars from)
   ============================================================ */
function renderShelf() {
  const shelf = document.getElementById('partsShelf');
  shelf.innerHTML = '';

  // For each car type, show one example with the default color
  Object.keys(CAR_TYPES).forEach(typeKey => {
    const carType = CAR_TYPES[typeKey];
    const shelfItem = document.createElement('div');
    shelfItem.className = 'shelf-item';
    shelfItem.dataset.cartype = typeKey;
    // Use a "neutral" color for the shelf preview (gets randomized on drop)
    const previewColor = CAR_COLORS[Object.keys(CAR_TYPES).indexOf(typeKey) % CAR_COLORS.length];
    shelfItem.innerHTML = carType.svg(previewColor) + `<div class="shelf-label">${carType.name}</div>`;
    shelfItem.addEventListener('mousedown', startShelfDrag);
    shelfItem.addEventListener('touchstart', startShelfDrag, { passive: false });
    shelf.appendChild(shelfItem);
  });
}

/* ============================================================
   RENDER THE TRAIN (locomotive + all built cars)
   ============================================================ */
function renderTrain() {
  const cars = document.getElementById('trainCars');
  cars.innerHTML = '';

  // Always include the locomotive
  const loco = document.createElement('div');
  loco.className = 'train-piece loco';
  loco.innerHTML = locomotiveSvg();
  cars.appendChild(loco);

  // Add user-built cars
  train.forEach(car => {
    const piece = document.createElement('div');
    piece.className = 'train-piece car';
    piece.dataset.id = car.id;
    piece.innerHTML = CAR_TYPES[car.type].svg(car.color);

    // Add passenger if applicable
    if (CAR_TYPES[car.type].hasWindow && car.passenger) {
      const passenger = document.createElement('div');
      passenger.className = 'passenger';
      passenger.textContent = car.passenger;
      piece.appendChild(passenger);
    }

    // Tap on car: cycle color
    // Tap on window: cycle passenger
    // Long-press / double-tap: remove
    piece.addEventListener('click', (e) => onCarTap(car.id, e));
    cars.appendChild(piece);
  });
}

function onCarTap(carId, e) {
  if (isRiding) return;
  const car = train.find(c => c.id === carId);
  if (!car) return;

  // Determine what part of the car was tapped — was it the window?
  const piece = e.currentTarget;
  const rect = piece.getBoundingClientRect();
  const relY = (e.clientY || (e.touches && e.touches[0].clientY) || 0) - rect.top;
  const tappedTop = relY < rect.height * 0.6; // upper portion = window area

  if (tappedTop && CAR_TYPES[car.type].hasWindow) {
    // Cycle passenger
    const idx = PASSENGERS.indexOf(car.passenger);
    car.passenger = PASSENGERS[(idx + 1) % PASSENGERS.length];
    playPop();
  } else {
    // Cycle color
    const idx = CAR_COLORS.indexOf(car.color);
    car.color = CAR_COLORS[(idx + 1) % CAR_COLORS.length];
    playClick();
  }
  renderTrain();
}

/* ============================================================
   DRAG FROM SHELF TO TRACKS
   ============================================================ */
let dragGhost = null;
let dragCarType = null;
let dragOffset = { x: 0, y: 0 };

function getEventPos(e) {
  if (e.touches && e.touches.length > 0) {
    return { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }
  return { x: e.clientX, y: e.clientY };
}

function startShelfDrag(e) {
  if (isRiding) return;
  e.preventDefault();
  const item = e.currentTarget;
  dragCarType = item.dataset.cartype;

  const rect = item.getBoundingClientRect();
  const pos = getEventPos(e);
  dragOffset.x = pos.x - (rect.left + rect.width / 2);
  dragOffset.y = pos.y - (rect.top + rect.height / 2);

  // Create a floating "ghost" preview that follows the finger
  dragGhost = document.createElement('div');
  dragGhost.className = 'drag-ghost';
  const previewColor = CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)];
  dragGhost.dataset.color = previewColor;
  dragGhost.innerHTML = CAR_TYPES[dragCarType].svg(previewColor);
  dragGhost.style.left = (rect.left + rect.width / 2) + 'px';
  dragGhost.style.top = (rect.top + rect.height / 2) + 'px';
  document.body.appendChild(dragGhost);

  playClick();

  document.addEventListener('mousemove', doShelfDrag);
  document.addEventListener('mouseup', endShelfDrag);
  document.addEventListener('touchmove', doShelfDrag, { passive: false });
  document.addEventListener('touchend', endShelfDrag);
  document.addEventListener('touchcancel', endShelfDrag);
}

function doShelfDrag(e) {
  if (!dragGhost) return;
  e.preventDefault();
  const pos = getEventPos(e);
  dragGhost.style.left = (pos.x - dragOffset.x) + 'px';
  dragGhost.style.top = (pos.y - dragOffset.y) + 'px';

  // Highlight track if we're over it
  const track = document.getElementById('trainTrack');
  const trackRect = track.getBoundingClientRect();
  if (pos.x >= trackRect.left && pos.x <= trackRect.right &&
      pos.y >= trackRect.top && pos.y <= trackRect.bottom) {
    track.classList.add('drag-over');
  } else {
    track.classList.remove('drag-over');
  }
}

function endShelfDrag(e) {
  document.removeEventListener('mousemove', doShelfDrag);
  document.removeEventListener('mouseup', endShelfDrag);
  document.removeEventListener('touchmove', doShelfDrag);
  document.removeEventListener('touchend', endShelfDrag);
  document.removeEventListener('touchcancel', endShelfDrag);

  if (!dragGhost) return;

  const track = document.getElementById('trainTrack');
  track.classList.remove('drag-over');
  const trackRect = track.getBoundingClientRect();

  // Get final position from ghost
  const ghostRect = dragGhost.getBoundingClientRect();
  const ghostCx = ghostRect.left + ghostRect.width / 2;
  const ghostCy = ghostRect.top + ghostRect.height / 2;

  const droppedOnTrack = (
    ghostCx >= trackRect.left && ghostCx <= trackRect.right &&
    ghostCy >= trackRect.top && ghostCy <= trackRect.bottom
  );

  if (droppedOnTrack) {
    // Add this car to the train
    const newCar = {
      id: makeId(),
      type: dragCarType,
      color: dragGhost.dataset.color,
      passenger: null
    };
    train.push(newCar);
    playSnap();
    renderTrain();
    flashNewCar();
  }

  dragGhost.remove();
  dragGhost = null;
  dragCarType = null;
}

function flashNewCar() {
  const cars = document.querySelectorAll('.train-piece.car');
  const last = cars[cars.length - 1];
  if (last) {
    last.classList.add('snap-in');
    setTimeout(() => last.classList.remove('snap-in'), 500);
  }
}

/* ============================================================
   GO! — Animate the train across the screen
   ============================================================ */
function goRide() {
  if (isRiding) return;
  isRiding = true;
  document.getElementById('goBtn').classList.add('riding');

  playChooChoo();
  const cars = document.getElementById('trainCars');
  cars.classList.add('riding');

  // Add smoke puffs from the locomotive
  const smokeInterval = setInterval(() => {
    spawnSmoke();
  }, 300);

  // Chug-chug sound effect
  const chugInterval = setInterval(() => {
    playChug();
  }, 200);

  // Stop after a few seconds
  setTimeout(() => {
    clearInterval(smokeInterval);
    clearInterval(chugInterval);
    cars.classList.remove('riding');
    document.getElementById('goBtn').classList.remove('riding');
    isRiding = false;
    playChooChoo();
    // Award a star for completing the ride
    if (train.length > 0) {
      stars++;
      saveStars();
      celebrate();
    }
  }, 3500);
}

function spawnSmoke() {
  const scene = document.getElementById('trainScene');
  const loco = document.querySelector('.train-piece.loco');
  if (!loco) return;
  const locoRect = loco.getBoundingClientRect();
  const sceneRect = scene.getBoundingClientRect();

  const smoke = document.createElement('div');
  smoke.className = 'smoke-puff';
  smoke.textContent = '☁️';
  // Smokestack is roughly 1/3 from left of the locomotive
  smoke.style.left = (locoRect.left - sceneRect.left + locoRect.width * 0.3) + 'px';
  smoke.style.top = (locoRect.top - sceneRect.top - 10) + 'px';
  scene.appendChild(smoke);
  setTimeout(() => smoke.remove(), 1500);
}

function celebrate() {
  playYay();
  const c = document.getElementById('celebrate');
  document.getElementById('celebrateMsg').textContent = 'CHOO CHOO!';
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
document.getElementById('goBtn').addEventListener('click', goRide);

/* ---------- INIT ---------- */
renderShelf();
renderTrain();
