/* ============================================================
   JAMARIS'S PET — Main pet game logic
   - Persistent virtual pet with hunger, cleanliness, energy, happy
   - Grows through 3 stages (baby → child → adult) as XP increases
   - Feed, Bath, Play (mini-games), Sleep actions
   - All state in localStorage
   ============================================================ */

'use strict';

/* ============================================================
   CONSTANTS & PET DESIGN
   ============================================================ */
const STAT_MAX = 100;

// XP needed to reach next level (cumulative)
const LEVEL_THRESHOLDS = [0, 10, 25, 50, 90, 150, 230, 330, 450, 600];

// Pet growth stages mapped by level
function stageForLevel(lvl) {
  if (lvl <= 2) return 'baby';
  if (lvl <= 5) return 'child';
  return 'adult';
}

// Rate of need-decay (per minute) — slow per user request
const DECAY = {
  hunger: 0.7,   // ~100% to 0% over ~2.5 hours
  clean:  0.5,   // dirtiness builds slow
  energy: 0.6,
  happy:  0.4    // happiness drifts down slowly when ignored
};

// Action effects on stats
const FOODS = [
  { id: 'apple',     emoji: '🍎', label: 'Apple',     hunger: 15, happy: 5 },
  { id: 'banana',    emoji: '🍌', label: 'Banana',    hunger: 15, happy: 5 },
  { id: 'strawberry',emoji: '🍓', label: 'Berry',     hunger: 10, happy: 8 },
  { id: 'carrot',    emoji: '🥕', label: 'Carrot',    hunger: 12, happy: 4 },
  { id: 'bread',     emoji: '🍞', label: 'Bread',     hunger: 20, happy: 3 },
  { id: 'cheese',    emoji: '🧀', label: 'Cheese',    hunger: 18, happy: 6 },
  { id: 'milk',      emoji: '🥛', label: 'Milk',      hunger: 12, happy: 7 },
  { id: 'cookie',    emoji: '🍪', label: 'Cookie',    hunger: 8,  happy: 15 },
  { id: 'cake',      emoji: '🍰', label: 'Cake',      hunger: 10, happy: 20 },
  { id: 'pizza',     emoji: '🍕', label: 'Pizza',     hunger: 25, happy: 12 },
  { id: 'icecream',  emoji: '🍦', label: 'Ice Cream', hunger: 6,  happy: 18 },
  { id: 'fish',      emoji: '🐟', label: 'Fish',      hunger: 22, happy: 8 }
];

const PET_TYPES = [
  { id: 'cat',    name: 'Cat',    emoji: '🐱', bodyColor: '#FFA8C8', earColor: '#FF7AB0', bellyColor: '#FFF5D6' },
  { id: 'dog',    name: 'Dog',    emoji: '🐶', bodyColor: '#FFCB85', earColor: '#D89855', bellyColor: '#FFF5D6' },
  { id: 'bunny',  name: 'Bunny',  emoji: '🐰', bodyColor: '#F5F5F5', earColor: '#FFA8C8', bellyColor: '#FFE5F1' },
  { id: 'bear',   name: 'Bear',   emoji: '🐻', bodyColor: '#C99868', earColor: '#A07845', bellyColor: '#FFE9C8' },
  { id: 'panda',  name: 'Panda',  emoji: '🐼', bodyColor: '#FFFFFF', earColor: '#2a2a3e', bellyColor: '#FFFFFF' },
  { id: 'fox',    name: 'Fox',    emoji: '🦊', bodyColor: '#FF8C42', earColor: '#D86A22', bellyColor: '#FFF5D6' }
];

/* ============================================================
   STATE — load from localStorage, or create new
   ============================================================ */
const SAVE_KEY = 'jamaris_pet_v1';

function loadState() {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch (e) { return null; }
}

function saveState() {
  localStorage.setItem(SAVE_KEY, JSON.stringify(state));
}

function newState(petType) {
  return {
    petType: petType,
    petName: petType.name,
    level: 1,
    xp: 0,
    hunger: 80,
    clean: 90,
    energy: 80,
    happy: 80,
    lastTick: Date.now(),
    stars: parseInt(localStorage.getItem('jamaris_stars') || '0', 10)
  };
}

let state = loadState();

/* ============================================================
   STAT DECAY — runs on load and every minute
   ============================================================ */
function decayStats() {
  const now = Date.now();
  const elapsedMin = (now - state.lastTick) / 60000;
  if (elapsedMin < 0.1) return;
  state.hunger = Math.max(0, state.hunger - DECAY.hunger * elapsedMin);
  state.clean  = Math.max(0, state.clean  - DECAY.clean  * elapsedMin);
  state.energy = Math.max(0, state.energy - DECAY.energy * elapsedMin);
  // Happy passively drifts down a bit AND is influenced by other stats
  const lowStatsPenalty =
    (state.hunger < 30 ? 0.3 : 0) +
    (state.clean  < 30 ? 0.2 : 0) +
    (state.energy < 30 ? 0.2 : 0);
  state.happy = Math.max(0, state.happy - (DECAY.happy + lowStatsPenalty) * elapsedMin);
  state.lastTick = now;
  saveState();
}

/* ============================================================
   AUDIO
   ============================================================ */
let audioCtx;
function getAudio() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}
function playTone(freq, dur = 0.12, type = 'sine', vol = 0.15) {
  try {
    const ctx = getAudio();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(vol, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    o.connect(g); g.connect(ctx.destination);
    o.start(); o.stop(ctx.currentTime + dur);
  } catch (e) {}
}
function playClick() { playTone(800, 0.08, 'triangle'); }
function playChomp() {
  playTone(220, 0.08, 'square', 0.15);
  setTimeout(() => playTone(180, 0.1, 'square', 0.13), 80);
}
function playSplash() {
  playTone(400 + Math.random() * 300, 0.1, 'sine', 0.1);
}
function playYay() {
  [523, 659, 784, 1047].forEach((f, i) =>
    setTimeout(() => playTone(f, 0.18, 'triangle', 0.18), i * 90)
  );
}
function playMeow() {
  // High-low-high warbly meow
  try {
    const ctx = getAudio();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sawtooth';
    const t = ctx.currentTime;
    o.frequency.setValueAtTime(700, t);
    o.frequency.exponentialRampToValueAtTime(500, t + 0.15);
    o.frequency.exponentialRampToValueAtTime(800, t + 0.3);
    g.gain.setValueAtTime(0.12, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    o.connect(g); g.connect(ctx.destination);
    o.start(t); o.stop(t + 0.4);
  } catch (e) {}
}

/* ============================================================
   BUILDING THE PET (layered SVG, parameterized by stage)
   ============================================================ */
function buildPetSvg(petType, stage, mood) {
  // mood: 'happy', 'sad', 'sleepy', 'eating', 'neutral'
  // stage: 'baby', 'child', 'adult' — affects overall size & proportions
  const c = petType;
  // size multipliers
  const sizeMap = { baby: 0.75, child: 0.92, adult: 1.05 };
  const headSize = sizeMap[stage];

  // mood adjustments
  const eyeOpen = (mood === 'sleepy') ? 0.15 : 1;
  const mouthCurve = (mood === 'sad') ? -1 : (mood === 'happy' ? 1 : 0.3);

  // Type-specific ear/feature shapes
  let earsLeft = '';
  let earsRight = '';
  if (c.id === 'cat') {
    earsLeft  = `<path d="M 130 70 L 110 25 L 175 60 Z" fill="${c.bodyColor}" stroke="#2a2a3e" stroke-width="6" stroke-linejoin="round"/>
                 <path d="M 140 60 L 130 40 L 160 56 Z" fill="${c.earColor}"/>`;
    earsRight = `<path d="M 270 70 L 290 25 L 225 60 Z" fill="${c.bodyColor}" stroke="#2a2a3e" stroke-width="6" stroke-linejoin="round"/>
                 <path d="M 260 60 L 270 40 L 240 56 Z" fill="${c.earColor}"/>`;
  } else if (c.id === 'dog') {
    earsLeft  = `<path d="M 115 80 Q 80 70 75 130 Q 80 165 125 155 Z" fill="${c.earColor}" stroke="#2a2a3e" stroke-width="6" stroke-linejoin="round"/>`;
    earsRight = `<path d="M 285 80 Q 320 70 325 130 Q 320 165 275 155 Z" fill="${c.earColor}" stroke="#2a2a3e" stroke-width="6" stroke-linejoin="round"/>`;
  } else if (c.id === 'bunny') {
    earsLeft  = `<path d="M 155 60 Q 138 -10 168 -5 Q 188 0 180 75 Z" fill="${c.bodyColor}" stroke="#2a2a3e" stroke-width="6" stroke-linejoin="round"/>
                 <path d="M 165 60 Q 152 5 170 5 Q 180 8 175 70 Z" fill="${c.earColor}"/>`;
    earsRight = `<path d="M 245 60 Q 262 -10 232 -5 Q 212 0 220 75 Z" fill="${c.bodyColor}" stroke="#2a2a3e" stroke-width="6" stroke-linejoin="round"/>
                 <path d="M 235 60 Q 248 5 230 5 Q 220 8 225 70 Z" fill="${c.earColor}"/>`;
  } else if (c.id === 'bear' || c.id === 'panda') {
    earsLeft  = `<circle cx="125" cy="75" r="28" fill="${c.earColor}" stroke="#2a2a3e" stroke-width="6"/>
                 <circle cx="125" cy="75" r="14" fill="${c.bodyColor === '#FFFFFF' ? '#FFD0E8' : '#FFE5C8'}"/>`;
    earsRight = `<circle cx="275" cy="75" r="28" fill="${c.earColor}" stroke="#2a2a3e" stroke-width="6"/>
                 <circle cx="275" cy="75" r="14" fill="${c.bodyColor === '#FFFFFF' ? '#FFD0E8' : '#FFE5C8'}"/>`;
  } else if (c.id === 'fox') {
    earsLeft  = `<path d="M 130 75 L 105 15 L 175 60 Z" fill="${c.bodyColor}" stroke="#2a2a3e" stroke-width="6" stroke-linejoin="round"/>
                 <path d="M 140 60 L 125 30 L 160 55 Z" fill="${c.earColor}"/>`;
    earsRight = `<path d="M 270 75 L 295 15 L 225 60 Z" fill="${c.bodyColor}" stroke="#2a2a3e" stroke-width="6" stroke-linejoin="round"/>
                 <path d="M 260 60 L 275 30 L 240 55 Z" fill="${c.earColor}"/>`;
  }

  // Panda eye patches
  let pandaPatches = '';
  if (c.id === 'panda') {
    pandaPatches = `
      <ellipse cx="155" cy="180" rx="28" ry="36" fill="#2a2a3e" transform="rotate(-15 155 180)"/>
      <ellipse cx="245" cy="180" rx="28" ry="36" fill="#2a2a3e" transform="rotate(15 245 180)"/>`;
  }

  // Mouth path based on mood
  let mouthPath;
  if (mouthCurve > 0.5) {
    mouthPath = `M 180 245 Q 200 270 220 245`; // big smile
  } else if (mouthCurve < 0) {
    mouthPath = `M 180 260 Q 200 240 220 260`; // frown
  } else {
    mouthPath = `M 190 250 Q 200 258 210 250`; // small smile
  }

  // Closed eyes vs open eyes
  const eyeY = 195;
  let leftEye, rightEye;
  if (eyeOpen < 0.5) {
    // sleepy: arc-shaped closed eyes
    leftEye  = `<path d="M 150 ${eyeY} Q 165 ${eyeY + 8} 180 ${eyeY}" fill="none" stroke="#2a2a3e" stroke-width="5" stroke-linecap="round"/>`;
    rightEye = `<path d="M 220 ${eyeY} Q 235 ${eyeY + 8} 250 ${eyeY}" fill="none" stroke="#2a2a3e" stroke-width="5" stroke-linecap="round"/>`;
  } else {
    leftEye  = `<ellipse cx="165" cy="${eyeY}" rx="11" ry="13" fill="#2a2a3e"/>
                <circle cx="169" cy="${eyeY - 3}" r="4" fill="white"/>`;
    rightEye = `<ellipse cx="235" cy="${eyeY}" rx="11" ry="13" fill="#2a2a3e"/>
                <circle cx="239" cy="${eyeY - 3}" r="4" fill="white"/>`;
  }

  // Nose color: black for most, pink for cat/bunny/pig
  const noseColor = (c.id === 'cat' || c.id === 'bunny') ? '#FF7AB0' : '#2a2a3e';

  return `
    <svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg" class="pet-svg-inner" preserveAspectRatio="xMidYMid meet">
      <defs>
        <radialGradient id="bodyShadow" cx="50%" cy="60%" r="50%">
          <stop offset="0%" stop-color="white" stop-opacity="0.6"/>
          <stop offset="100%" stop-color="white" stop-opacity="0"/>
        </radialGradient>
      </defs>

      <!-- Belly behind body -->
      <ellipse cx="200" cy="280" rx="95" ry="80" fill="${c.bellyColor}" opacity="0.5"/>

      <!-- Body -->
      <ellipse cx="200" cy="280" rx="120" ry="95" fill="${c.bodyColor}" stroke="#2a2a3e" stroke-width="6"/>

      <!-- Front paws -->
      <ellipse cx="150" cy="355" rx="28" ry="20" fill="${c.bodyColor}" stroke="#2a2a3e" stroke-width="5"/>
      <ellipse cx="250" cy="355" rx="28" ry="20" fill="${c.bodyColor}" stroke="#2a2a3e" stroke-width="5"/>
      <!-- Paw pads -->
      <ellipse cx="150" cy="358" rx="14" ry="8" fill="${noseColor === '#FF7AB0' ? '#FF7AB0' : '#3a3a4e'}" opacity="0.5"/>
      <ellipse cx="250" cy="358" rx="14" ry="8" fill="${noseColor === '#FF7AB0' ? '#FF7AB0' : '#3a3a4e'}" opacity="0.5"/>

      <!-- Tummy patch -->
      <ellipse cx="200" cy="305" rx="60" ry="48" fill="${c.bellyColor}"/>

      <!-- Ears -->
      <g class="pet-ear-left">${earsLeft}</g>
      <g class="pet-ear-right">${earsRight}</g>

      <!-- Head -->
      <g class="pet-head" transform="translate(200 195) scale(${headSize}) translate(-200 -195)">
        <circle cx="200" cy="195" r="95" fill="${c.bodyColor}" stroke="#2a2a3e" stroke-width="6"/>
        <!-- subtle highlight -->
        <ellipse cx="180" cy="170" rx="50" ry="35" fill="url(#bodyShadow)"/>

        <!-- Panda patches if applicable -->
        ${pandaPatches}

        <!-- Cheeks (blush) -->
        <ellipse cx="138" cy="225" rx="14" ry="9" fill="#FF7AB0" opacity="0.55"/>
        <ellipse cx="262" cy="225" rx="14" ry="9" fill="#FF7AB0" opacity="0.55"/>

        <!-- Eyes -->
        ${leftEye}
        ${rightEye}

        <!-- Nose -->
        <ellipse cx="200" cy="232" rx="10" ry="8" fill="${noseColor}"/>

        <!-- Mouth -->
        <path d="${mouthPath}" fill="none" stroke="#2a2a3e" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
      </g>
    </svg>
  `;
}

/* ============================================================
   RENDER FUNCTIONS
   ============================================================ */
function getCurrentMood() {
  const avg = (state.hunger + state.clean + state.energy + state.happy) / 4;
  if (avg < 30) return 'sad';
  if (avg > 70) return 'happy';
  return 'neutral';
}

function renderPet() {
  const stage = stageForLevel(state.level);
  const mood = getCurrentMood();
  document.getElementById('petBodyWrap').innerHTML = buildPetSvg(state.petType, stage, mood);
  document.body.dataset.stage = stage;
  document.body.dataset.mood = mood;
  renderDirt();
}

function renderHeader() {
  document.getElementById('petName').textContent = state.petName;
  document.getElementById('petLevel').textContent = state.level;
  document.getElementById('petStars').textContent = state.stars;
}

function renderStats() {
  ['hunger', 'clean', 'energy', 'happy'].forEach(stat => {
    const v = Math.max(0, Math.min(100, state[stat]));
    const el = document.getElementById(stat + 'Fill');
    if (el) {
      el.style.width = v + '%';
      // Color by level
      el.style.background = v < 30 ? '#FF3B6C' : (v < 60 ? '#FFA62B' : '#6BCB77');
    }
  });
}

function renderDirt() {
  const layer = document.getElementById('dirtLayer');
  layer.innerHTML = '';
  const dirtAmount = 100 - state.clean;
  // 0-7 splotches based on dirtiness
  const splotchCount = Math.floor(dirtAmount / 14);
  for (let i = 0; i < splotchCount; i++) {
    const spot = document.createElement('div');
    spot.className = 'dirt-spot';
    spot.style.left = (20 + Math.random() * 60) + '%';
    spot.style.top = (30 + Math.random() * 50) + '%';
    spot.style.transform = `scale(${0.6 + Math.random() * 0.6}) rotate(${Math.random() * 360}deg)`;
    layer.appendChild(spot);
  }
}

function renderAll() {
  renderHeader();
  renderStats();
  renderPet();
}

/* ============================================================
   STAT MANIPULATION HELPERS
   ============================================================ */
function adjustStat(stat, delta) {
  state[stat] = Math.max(0, Math.min(100, state[stat] + delta));
}

function addXp(amount) {
  state.xp += amount;
  // Show XP popup
  const pop = document.getElementById('xpPopup');
  pop.textContent = '+' + amount + ' XP';
  pop.classList.remove('show');
  void pop.offsetWidth;
  pop.classList.add('show');

  // Check for level up
  while (state.level < LEVEL_THRESHOLDS.length && state.xp >= LEVEL_THRESHOLDS[state.level]) {
    state.level++;
    levelUp();
  }
}

function levelUp() {
  playYay();
  const el = document.getElementById('levelUpCelebrate');
  document.getElementById('levelUpNumDisplay').textContent = state.level;
  let msg = 'Your pet is growing!';
  const newStage = stageForLevel(state.level);
  const oldStage = stageForLevel(state.level - 1);
  if (newStage !== oldStage) {
    msg = `Your pet is now a ${newStage}!`;
  }
  document.getElementById('levelUpMsg').textContent = msg;
  el.classList.add('active');
  setTimeout(() => {
    el.classList.remove('active');
    renderAll();
  }, 2800);
}

function showThought(text) {
  const t = document.getElementById('petThought');
  t.textContent = text;
  t.classList.remove('show');
  void t.offsetWidth;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}

/* ============================================================
   PET TAP — make it react!
   ============================================================ */
document.getElementById('petWrap').addEventListener('click', () => {
  playMeow();
  // Quick bounce animation
  const wrap = document.getElementById('petBodyWrap');
  wrap.classList.remove('pet-bounce');
  void wrap.offsetWidth;
  wrap.classList.add('pet-bounce');
  // Random love message
  const messages = ['❤️', '✨', '😊', state.petType.emoji];
  showThought(messages[Math.floor(Math.random() * messages.length)]);
  adjustStat('happy', 2);
  renderStats();
  saveState();
});

/* ============================================================
   FEED ACTION
   ============================================================ */
function openFeed() {
  playClick();
  const shelves = document.getElementById('fridgeShelves');
  shelves.innerHTML = '';
  FOODS.forEach(food => {
    const item = document.createElement('div');
    item.className = 'food-item';
    item.dataset.foodId = food.id;
    item.innerHTML = `<span class="food-emoji">${food.emoji}</span><span class="food-name">${food.label}</span>`;
    item.addEventListener('mousedown', e => startFoodDrag(e, food));
    item.addEventListener('touchstart', e => startFoodDrag(e, food), { passive: false });
    shelves.appendChild(item);
  });
  document.getElementById('feedPetSvg').innerHTML = buildPetSvg(state.petType, stageForLevel(state.level), 'happy');
  document.getElementById('feedOverlay').classList.add('active');
}

function closeFeed() {
  playClick();
  document.getElementById('feedOverlay').classList.remove('active');
}

let foodGhost = null;
let draggingFood = null;
let foodOffset = { x: 0, y: 0 };

function getPos(e) {
  return e.touches ? { x: e.touches[0].clientX, y: e.touches[0].clientY }
                   : { x: e.clientX, y: e.clientY };
}

function startFoodDrag(e, food) {
  e.preventDefault();
  draggingFood = food;
  const item = e.currentTarget;
  const rect = item.getBoundingClientRect();
  const p = getPos(e);
  foodOffset.x = p.x - (rect.left + rect.width / 2);
  foodOffset.y = p.y - (rect.top + rect.height / 2);

  foodGhost = document.createElement('div');
  foodGhost.className = 'food-ghost';
  foodGhost.textContent = food.emoji;
  foodGhost.style.left = (rect.left + rect.width / 2) + 'px';
  foodGhost.style.top = (rect.top + rect.height / 2) + 'px';
  document.body.appendChild(foodGhost);

  document.addEventListener('mousemove', doFoodDrag);
  document.addEventListener('mouseup', endFoodDrag);
  document.addEventListener('touchmove', doFoodDrag, { passive: false });
  document.addEventListener('touchend', endFoodDrag);
}

function doFoodDrag(e) {
  if (!foodGhost) return;
  e.preventDefault();
  const p = getPos(e);
  foodGhost.style.left = (p.x - foodOffset.x) + 'px';
  foodGhost.style.top = (p.y - foodOffset.y) + 'px';

  const target = document.getElementById('feedPetTarget');
  const tr = target.getBoundingClientRect();
  if (p.x >= tr.left && p.x <= tr.right && p.y >= tr.top && p.y <= tr.bottom) {
    target.classList.add('hover');
  } else {
    target.classList.remove('hover');
  }
}

function endFoodDrag(e) {
  document.removeEventListener('mousemove', doFoodDrag);
  document.removeEventListener('mouseup', endFoodDrag);
  document.removeEventListener('touchmove', doFoodDrag);
  document.removeEventListener('touchend', endFoodDrag);

  if (!foodGhost || !draggingFood) return;
  const target = document.getElementById('feedPetTarget');
  target.classList.remove('hover');

  const tr = target.getBoundingClientRect();
  const gr = foodGhost.getBoundingClientRect();
  const cx = gr.left + gr.width / 2;
  const cy = gr.top + gr.height / 2;

  if (cx >= tr.left && cx <= tr.right && cy >= tr.top && cy <= tr.bottom) {
    // Pet eats it!
    eatFood(draggingFood);
  }
  foodGhost.remove();
  foodGhost = null;
  draggingFood = null;
}

function eatFood(food) {
  playChomp();
  adjustStat('hunger', food.hunger);
  adjustStat('happy', food.happy);
  addXp(3);
  renderStats();
  saveState();

  // Chomp animation on the feed pet
  const fp = document.getElementById('feedPetSvg');
  fp.classList.remove('chomp');
  void fp.offsetWidth;
  fp.classList.add('chomp');

  // Crumb particles
  const target = document.getElementById('feedPetTarget');
  const rect = target.getBoundingClientRect();
  for (let i = 0; i < 8; i++) {
    const crumb = document.createElement('div');
    crumb.className = 'food-crumb';
    crumb.textContent = food.emoji;
    crumb.style.left = (rect.width / 2) + 'px';
    crumb.style.top = (rect.height / 2) + 'px';
    crumb.style.setProperty('--dx', (Math.random() * 80 - 40) + 'px');
    crumb.style.setProperty('--dy', (Math.random() * -60 - 20) + 'px');
    target.appendChild(crumb);
    setTimeout(() => crumb.remove(), 800);
  }
}

document.getElementById('feedBtn').addEventListener('click', openFeed);
document.getElementById('feedClose').addEventListener('click', closeFeed);

/* ============================================================
   BATH ACTION
   ============================================================ */
let bathDirtRemaining = 0;

function openBath() {
  playClick();
  document.getElementById('bathPetSvg').innerHTML = buildPetSvg(state.petType, stageForLevel(state.level), 'neutral');

  // Place dirt spots on the bath pet
  const dirtLayer = document.getElementById('bathDirtLayer');
  dirtLayer.innerHTML = '';
  const dirtAmount = 100 - state.clean;
  bathDirtRemaining = Math.max(3, Math.floor(dirtAmount / 10));
  for (let i = 0; i < bathDirtRemaining; i++) {
    const spot = document.createElement('div');
    spot.className = 'dirt-spot bath-dirt';
    spot.style.left = (20 + Math.random() * 60) + '%';
    spot.style.top = (25 + Math.random() * 50) + '%';
    spot.style.transform = `scale(${0.8 + Math.random() * 0.7}) rotate(${Math.random() * 360}deg)`;
    spot.dataset.scrubbed = '0';
    dirtLayer.appendChild(spot);
  }

  document.getElementById('bathBubbles').innerHTML = '';
  document.getElementById('bathOverlay').classList.add('active');
}

function closeBath() {
  playClick();
  document.getElementById('bathOverlay').classList.remove('active');
}

document.getElementById('bathBtn').addEventListener('click', openBath);
document.getElementById('bathClose').addEventListener('click', closeBath);

// Scrubbing logic
let isScrubbing = false;
function bathPos(e) {
  const wrap = document.getElementById('bathPetWrap');
  const r = wrap.getBoundingClientRect();
  const p = getPos(e);
  return { x: p.x - r.left, y: p.y - r.top, wrap, rect: r };
}

function scrubStart(e) {
  e.preventDefault();
  isScrubbing = true;
  scrubMove(e);
}

function scrubMove(e) {
  if (!isScrubbing) return;
  e.preventDefault();
  const { x, y, wrap, rect } = bathPos(e);

  // Spawn a bubble at finger position
  if (Math.random() < 0.4) {
    const bub = document.createElement('div');
    bub.className = 'bath-bubble';
    bub.style.left = x + 'px';
    bub.style.top = y + 'px';
    bub.style.fontSize = (1 + Math.random() * 1) + 'rem';
    document.getElementById('bathBubbles').appendChild(bub);
    setTimeout(() => bub.remove(), 1500);
  }

  // Check if we're near any dirt spots
  const dirtSpots = document.querySelectorAll('#bathDirtLayer .dirt-spot');
  dirtSpots.forEach(spot => {
    if (spot.dataset.scrubbed === '1') return;
    const sr = spot.getBoundingClientRect();
    const cx = sr.left + sr.width / 2 - rect.left;
    const cy = sr.top + sr.height / 2 - rect.top;
    if (Math.hypot(x - cx, y - cy) < 50) {
      spot.dataset.scrubbed = '1';
      spot.classList.add('scrubbed-away');
      playSplash();
      bathDirtRemaining--;
      setTimeout(() => spot.remove(), 400);

      if (bathDirtRemaining <= 0) {
        // Bath complete!
        adjustStat('clean', 100);
        adjustStat('happy', 15);
        addXp(8);
        renderStats();
        saveState();
        setTimeout(() => {
          closeBath();
          renderPet();
        }, 600);
      }
    }
  });
}

function scrubEnd() { isScrubbing = false; }

document.getElementById('bathPetWrap').addEventListener('mousedown', scrubStart);
document.getElementById('bathPetWrap').addEventListener('mousemove', scrubMove);
document.getElementById('bathPetWrap').addEventListener('mouseup', scrubEnd);
document.getElementById('bathPetWrap').addEventListener('mouseleave', scrubEnd);
document.getElementById('bathPetWrap').addEventListener('touchstart', scrubStart, { passive: false });
document.getElementById('bathPetWrap').addEventListener('touchmove', scrubMove, { passive: false });
document.getElementById('bathPetWrap').addEventListener('touchend', scrubEnd);

/* ============================================================
   PLAY ACTION (open mini-games picker)
   ============================================================ */
document.getElementById('playBtn').addEventListener('click', () => {
  playClick();
  document.getElementById('playOverlay').classList.add('active');
});
document.getElementById('playClose').addEventListener('click', () => {
  playClick();
  document.getElementById('playOverlay').classList.remove('active');
});

/* ============================================================
   SLEEP ACTION
   ============================================================ */
let sleepInterval = null;

function openSleep() {
  playClick();
  document.getElementById('sleepPetSvg').innerHTML = buildPetSvg(state.petType, stageForLevel(state.level), 'sleepy');
  document.getElementById('sleepOverlay').classList.add('active');

  // Boost energy gradually while sleeping
  sleepInterval = setInterval(() => {
    adjustStat('energy', 3);
    adjustStat('happy', 1);
    if (state.energy >= 100) {
      adjustStat('energy', -100);
      state.energy = 100;
    }
  }, 800);
}

function closeSleep() {
  playClick();
  if (sleepInterval) {
    clearInterval(sleepInterval);
    sleepInterval = null;
  }
  // Award XP for the sleep
  addXp(5);
  renderStats();
  saveState();
  document.getElementById('sleepOverlay').classList.remove('active');
  renderPet();
}

document.getElementById('sleepBtn').addEventListener('click', openSleep);
document.getElementById('wakeBtn').addEventListener('click', closeSleep);

/* ============================================================
   PET CHOOSER (first time only)
   ============================================================ */
function buildChooser() {
  const grid = document.getElementById('petChooserGrid');
  grid.innerHTML = '';
  PET_TYPES.forEach(pt => {
    const card = document.createElement('div');
    card.className = 'pet-chooser-card';
    card.style.background = pt.bodyColor;
    card.innerHTML = `
      <div class="pet-chooser-svg">${buildPetSvg(pt, 'baby', 'happy')}</div>
      <div class="pet-chooser-name">${pt.name}</div>
    `;
    card.addEventListener('click', () => {
      playClick();
      state = newState(pt);
      saveState();
      document.getElementById('chooserScreen').classList.remove('active');
      document.getElementById('petHome').classList.add('active');
      renderAll();
    });
    grid.appendChild(card);
  });
}

/* ============================================================
   INIT
   ============================================================ */
if (!state) {
  // First time — show pet chooser
  document.getElementById('petHome').classList.remove('active');
  document.getElementById('chooserScreen').classList.add('active');
  buildChooser();
} else {
  decayStats();
  renderAll();

  // If user came from a mini-game, reward them!
  // We detect this by checking if the referrer is from /games/
  try {
    if (document.referrer && document.referrer.includes('/games/')) {
      setTimeout(() => {
        adjustStat('happy', 12);
        adjustStat('energy', -8);
        addXp(10);
        renderStats();
        saveState();
        showThought('🎉');
      }, 500);
    }
  } catch (e) {}
}

// Periodic stat decay every 30 seconds
setInterval(() => {
  if (state) {
    decayStats();
    renderStats();
    renderPet();
  }
}, 30000);

// Save when leaving page
window.addEventListener('beforeunload', () => { if (state) saveState(); });
