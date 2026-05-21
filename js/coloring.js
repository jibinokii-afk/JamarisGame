/* ============================================================
   JAMARIS GAME — Coloring v4
   - Tap-to-fill mode: each animal part fills with selected color
   - Brush mode: free finger-draw on top
   ============================================================ */

const COLORS = [
  '#FF3B6C', '#FF6B35', '#FFA62B', '#FFD93D',
  '#A8E063', '#56CCF2', '#4D96FF', '#9B5DE5',
  '#FF7AD9', '#8B4513', '#2a2a3e', '#F5F5F5'
];

let currentColor = COLORS[0];
let brushSize = 24;
let currentMode = 'tap';  // 'tap' or 'brush'
let stars = parseInt(localStorage.getItem('jamaris_stars') || '0', 10);
let filledParts = 0;
let totalParts = 0;
let hasCelebrated = false;

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
function playPop(hue = 0) { playTone(300 + hue * 30, 0.1, 'sine', 0.1); }
function playFill() {
  // Satisfying "splash" sound for filling a region
  playTone(660, 0.06, 'sine', 0.12);
  setTimeout(() => playTone(880, 0.1, 'triangle', 0.1), 50);
}
function playYay() {
  [523, 659, 784, 1047].forEach((f, i) =>
    setTimeout(() => playTone(f, 0.2, 'triangle', 0.18), i * 100)
  );
}

/* ============================================================
   ANIMALS — Each with separable parts
   Each path is a closed shape so it can be filled with a tap.
   Parts are listed in draw order (back to front).
   ============================================================ */
const ANIMALS = [
  {
    name: 'Cat', emoji: '🐱', bgColor: '#FFD0E8',
    parts: [
      // tail (behind body)
      { d: 'M280 290 Q335 280 340 220 Q340 195 320 200 Q318 215 325 230 Q325 260 280 270 Z', name: 'tail' },
      // ears
      { d: 'M125 150 L110 80 L170 135 Z', name: 'leftEar' },
      { d: 'M275 150 L290 80 L230 135 Z', name: 'rightEar' },
      // body
      { d: 'M115 230 Q115 320 200 330 Q285 320 285 230 Q285 200 270 180 L130 180 Q115 200 115 230 Z', name: 'body' },
      // head
      { d: 'M115 180 Q115 100 200 100 Q285 100 285 180 Q285 230 200 230 Q115 230 115 180 Z', name: 'head' },
      // inner ears (decoration, not separately fillable)
      { d: 'M135 130 L130 105 L155 125 Z', name: 'leftInnerEar', decor: true },
      { d: 'M265 130 L270 105 L245 125 Z', name: 'rightInnerEar', decor: true },
      // eyes (decoration)
      { d: 'M165 160 Q165 175 175 175 Q175 160 175 150 Q165 150 165 160 Z', name: 'leftEye', decor: true, fill: '#2a2a3e' },
      { d: 'M225 160 Q225 175 235 175 Q235 160 235 150 Q225 150 225 160 Z', name: 'rightEye', decor: true, fill: '#2a2a3e' },
      // nose (decoration)
      { d: 'M193 180 Q200 192 207 180 Q200 174 193 180 Z', name: 'nose', decor: true, fill: '#FF7AD9' },
      // mouth lines (decoration, strokes only)
      { d: 'M200 192 L200 200 M200 200 Q188 210 180 204 M200 200 Q212 210 220 204', name: 'mouth', decor: true, nofill: true },
      // whiskers (decoration)
      { d: 'M140 180 L100 175 M140 188 L100 195 M260 180 L300 175 M260 188 L300 195', name: 'whiskers', decor: true, nofill: true },
      // paws
      { d: 'M155 325 Q140 325 140 335 Q140 340 155 340 Q170 340 170 335 Q170 325 155 325 Z', name: 'leftPaw' },
      { d: 'M245 325 Q230 325 230 335 Q230 340 245 340 Q260 340 260 335 Q260 325 245 325 Z', name: 'rightPaw' }
    ]
  },
  {
    name: 'Dog', emoji: '🐶', bgColor: '#FFE0B5',
    parts: [
      // ears (behind head)
      { d: 'M130 160 Q90 155 90 210 Q90 245 130 245 L150 200 Z', name: 'leftEar' },
      { d: 'M270 160 Q310 155 310 210 Q310 245 270 245 L250 200 Z', name: 'rightEar' },
      // body
      { d: 'M130 270 Q130 340 200 350 Q270 340 270 270 Z', name: 'body' },
      // head
      { d: 'M130 200 Q130 130 200 130 Q270 130 270 200 Q270 270 200 280 Q130 270 130 200 Z', name: 'head' },
      // snout
      { d: 'M165 235 Q165 270 200 275 Q235 270 235 235 Q235 215 200 215 Q165 215 165 235 Z', name: 'snout' },
      // nose
      { d: 'M188 225 Q188 240 200 240 Q212 240 212 225 Q212 218 200 218 Q188 218 188 225 Z', name: 'nose', decor: true, fill: '#2a2a3e' },
      // tongue
      { d: 'M192 250 Q192 268 200 268 Q208 268 208 250 Q208 245 200 245 Q192 245 192 250 Z', name: 'tongue', decor: true, fill: '#FF7AD9' },
      // eyes
      { d: 'M165 190 Q165 205 175 205 Q175 195 175 180 Q165 180 165 190 Z', name: 'leftEye', decor: true, fill: '#2a2a3e' },
      { d: 'M225 190 Q225 205 235 205 Q235 195 235 180 Q225 180 225 190 Z', name: 'rightEye', decor: true, fill: '#2a2a3e' },
      // paws
      { d: 'M155 345 Q140 345 140 355 Q140 360 155 360 Q170 360 170 355 Q170 345 155 345 Z', name: 'leftPaw' },
      { d: 'M245 345 Q230 345 230 355 Q230 360 245 360 Q260 360 260 355 Q260 345 245 345 Z', name: 'rightPaw' }
    ]
  },
  {
    name: 'Bunny', emoji: '🐰', bgColor: '#FFD8E8',
    parts: [
      // ears (behind head, way up top)
      { d: 'M155 80 Q148 30 175 30 Q195 35 190 90 Q188 120 175 130 Q160 125 155 110 Z', name: 'leftEar' },
      { d: 'M245 80 Q252 30 225 30 Q205 35 210 90 Q212 120 225 130 Q240 125 245 110 Z', name: 'rightEar' },
      // body
      { d: 'M130 320 Q130 360 200 360 Q270 360 270 320 Q270 290 200 290 Q130 290 130 320 Z', name: 'body' },
      // head
      { d: 'M125 200 Q125 130 200 130 Q275 130 275 200 Q275 270 200 280 Q125 270 125 200 Z', name: 'head' },
      // inner ears
      { d: 'M167 80 Q162 45 175 45 Q185 48 182 90 Q180 110 172 115 Z', name: 'leftInnerEar', decor: true, fill: '#FFA8C8' },
      { d: 'M233 80 Q238 45 225 45 Q215 48 218 90 Q220 110 228 115 Z', name: 'rightInnerEar', decor: true, fill: '#FFA8C8' },
      // cheeks
      { d: 'M150 230 Q140 230 140 240 Q140 250 152 250 Q162 248 162 238 Q160 230 150 230 Z', name: 'leftCheek', decor: true, fill: '#FFA8C8' },
      { d: 'M250 230 Q260 230 260 240 Q260 250 248 250 Q238 248 238 238 Q240 230 250 230 Z', name: 'rightCheek', decor: true, fill: '#FFA8C8' },
      // eyes
      { d: 'M168 200 Q165 215 175 215 Q180 215 180 200 Q180 188 173 188 Q168 188 168 200 Z', name: 'leftEye', decor: true, fill: '#2a2a3e' },
      { d: 'M232 200 Q235 215 225 215 Q220 215 220 200 Q220 188 227 188 Q232 188 232 200 Z', name: 'rightEye', decor: true, fill: '#2a2a3e' },
      // nose
      { d: 'M194 235 Q190 245 200 250 Q210 245 206 235 Q200 230 194 235 Z', name: 'nose', decor: true, fill: '#FF7AD9' },
      // teeth
      { d: 'M196 252 L196 268 L200 268 L200 252 Z M200 252 L200 268 L204 268 L204 252 Z', name: 'teeth', decor: true, fill: 'white' },
      // feet
      { d: 'M160 355 Q145 355 145 365 Q145 372 162 372 Q175 372 175 365 Q175 355 160 355 Z', name: 'leftFoot' },
      { d: 'M240 355 Q225 355 225 365 Q225 372 238 372 Q255 372 255 365 Q255 355 240 355 Z', name: 'rightFoot' }
    ]
  },
  {
    name: 'Fish', emoji: '🐠', bgColor: '#B5E8F5',
    parts: [
      // tail
      { d: 'M100 200 Q60 140 45 155 Q40 200 45 245 Q60 260 100 200 Z', name: 'tail' },
      // top fin
      { d: 'M180 140 Q200 90 225 140 Q210 150 195 150 Q185 150 180 140 Z', name: 'topFin' },
      // bottom fin
      { d: 'M180 260 Q200 310 225 260 Q210 250 195 250 Q185 250 180 260 Z', name: 'bottomFin' },
      // body
      { d: 'M100 200 Q100 130 210 125 Q310 130 325 200 Q310 270 210 275 Q100 270 100 200 Z', name: 'body' },
      // side fin
      { d: 'M170 200 Q150 220 165 240 Q185 235 188 215 Q188 200 170 200 Z', name: 'sideFin' },
      // stripes (decoration)
      { d: 'M170 160 Q170 200 165 240 Z', name: 'stripe1', decor: true, nofill: true },
      { d: 'M215 145 Q215 200 215 255 Z', name: 'stripe2', decor: true, nofill: true },
      // eye white
      { d: 'M260 180 Q245 180 245 195 Q245 210 260 210 Q275 210 275 195 Q275 180 260 180 Z', name: 'eyeWhite', decor: true, fill: 'white' },
      // eye black
      { d: 'M260 188 Q254 188 254 195 Q254 202 260 202 Q266 202 266 195 Q266 188 260 188 Z', name: 'eyePupil', decor: true, fill: '#2a2a3e' },
      // mouth
      { d: 'M315 205 Q323 210 322 222 Q317 220 313 215 Z', name: 'mouth' }
    ]
  },
  {
    name: 'Pig', emoji: '🐷', bgColor: '#FFC0DE',
    parts: [
      // ears
      { d: 'M140 145 Q120 100 145 95 Q165 105 160 150 Z', name: 'leftEar' },
      { d: 'M260 145 Q280 100 255 95 Q235 105 240 150 Z', name: 'rightEar' },
      // body (round)
      { d: 'M110 220 Q110 320 200 330 Q290 320 290 220 Q290 130 200 130 Q110 130 110 220 Z', name: 'body' },
      // snout
      { d: 'M165 245 Q165 280 200 282 Q235 280 235 245 Q235 220 200 220 Q165 220 165 245 Z', name: 'snout' },
      // nostrils
      { d: 'M183 245 Q178 245 178 255 Q178 263 188 263 Q193 263 193 253 Q193 245 183 245 Z', name: 'leftNostril', decor: true, fill: '#2a2a3e' },
      { d: 'M217 245 Q222 245 222 255 Q222 263 212 263 Q207 263 207 253 Q207 245 217 245 Z', name: 'rightNostril', decor: true, fill: '#2a2a3e' },
      // eyes
      { d: 'M165 195 Q160 210 170 210 Q177 210 177 195 Q177 185 170 185 Q165 185 165 195 Z', name: 'leftEye', decor: true, fill: '#2a2a3e' },
      { d: 'M235 195 Q240 210 230 210 Q223 210 223 195 Q223 185 230 185 Q235 185 235 195 Z', name: 'rightEye', decor: true, fill: '#2a2a3e' },
      // cheeks
      { d: 'M135 220 Q125 220 125 232 Q125 244 140 244 Q150 240 150 228 Q148 220 135 220 Z', name: 'leftCheek', decor: true, fill: '#FF7AD9' },
      { d: 'M265 220 Q275 220 275 232 Q275 244 260 244 Q250 240 250 228 Q252 220 265 220 Z', name: 'rightCheek', decor: true, fill: '#FF7AD9' },
      // tail (curly, on the right)
      { d: 'M290 200 Q310 200 310 215 Q310 225 300 225 Q295 220 300 215', name: 'tail', decor: true, nofill: true }
    ]
  },
  {
    name: 'Frog', emoji: '🐸', bgColor: '#C8E8B0',
    parts: [
      // body
      { d: 'M90 250 Q90 340 200 345 Q310 340 310 250 Q310 200 200 195 Q90 200 90 250 Z', name: 'body' },
      // eye bumps (behind eyes)
      { d: 'M115 170 Q115 130 155 130 Q195 130 195 170 Q195 210 155 210 Q115 210 115 170 Z', name: 'leftEyeBump' },
      { d: 'M205 170 Q205 130 245 130 Q285 130 285 170 Q285 210 245 210 Q205 210 205 170 Z', name: 'rightEyeBump' },
      // belly
      { d: 'M140 280 Q140 325 200 330 Q260 325 260 280 Q260 260 200 258 Q140 260 140 280 Z', name: 'belly', decor: true, fill: '#FFE9A8' },
      // eyes (white parts)
      { d: 'M140 160 Q140 185 160 185 Q180 185 180 160 Q180 145 160 145 Q140 145 140 160 Z', name: 'leftEyeWhite', decor: true, fill: 'white' },
      { d: 'M220 160 Q220 185 240 185 Q260 185 260 160 Q260 145 240 145 Q220 145 220 160 Z', name: 'rightEyeWhite', decor: true, fill: 'white' },
      // pupils
      { d: 'M155 165 Q150 178 160 180 Q170 180 170 168 Q170 158 162 158 Q155 158 155 165 Z', name: 'leftPupil', decor: true, fill: '#2a2a3e' },
      { d: 'M235 165 Q230 178 240 180 Q250 180 250 168 Q250 158 242 158 Q235 158 235 165 Z', name: 'rightPupil', decor: true, fill: '#2a2a3e' },
      // smile
      { d: 'M140 270 Q200 320 260 270', name: 'smile', decor: true, nofill: true },
      // front legs
      { d: 'M90 290 Q60 295 55 320 Q80 335 105 320 Q108 305 95 295 Z', name: 'leftLeg' },
      { d: 'M310 290 Q340 295 345 320 Q320 335 295 320 Q292 305 305 295 Z', name: 'rightLeg' }
    ]
  },
  {
    name: 'Bird', emoji: '🐦', bgColor: '#FFD9B5',
    parts: [
      // body
      { d: 'M125 230 Q125 130 215 125 Q300 135 300 230 Q300 305 215 315 Q125 305 125 230 Z', name: 'body' },
      // wing
      { d: 'M150 215 Q175 205 225 230 Q220 260 180 260 Q145 250 150 215 Z', name: 'wing' },
      // beak
      { d: 'M300 215 L340 210 L340 235 L300 240 Z', name: 'beak', fill: '#FFA62B' },
      // tail
      { d: 'M125 230 Q90 240 110 265 Q130 260 130 240 Z', name: 'tail' },
      // head tuft (3 spikes)
      { d: 'M180 130 Q175 100 195 105 Q200 95 215 105 Q220 100 235 125', name: 'tuft', decor: true, nofill: true },
      // eye white
      { d: 'M250 185 Q250 205 265 205 Q280 205 280 185 Q280 175 265 175 Q250 175 250 185 Z', name: 'eyeWhite', decor: true, fill: 'white' },
      // pupil
      { d: 'M262 188 Q258 188 258 198 Q258 208 268 208 Q272 208 272 198 Q272 188 262 188 Z', name: 'pupil', decor: true, fill: '#2a2a3e' },
      // legs
      { d: 'M175 315 L170 350 L185 350 L185 315 Z', name: 'leftLeg', fill: '#FFA62B' },
      { d: 'M225 315 L235 350 L220 350 L220 315 Z', name: 'rightLeg', fill: '#FFA62B' }
    ]
  },
  {
    name: 'Turtle', emoji: '🐢', bgColor: '#C0E8C0',
    parts: [
      // shell (back layer)
      { d: 'M105 230 Q105 150 200 145 Q295 150 295 230 Q295 295 200 300 Q105 295 105 230 Z', name: 'shell' },
      // shell pattern hexagon center
      { d: 'M200 180 L230 205 L230 250 L200 270 L170 250 L170 205 Z', name: 'shellCenter', decor: true, fill: '#88AA77' },
      // shell pattern left
      { d: 'M170 205 L140 195 L130 230 L140 255 L170 250 Z', name: 'shellLeft', decor: true, fill: '#A8C898' },
      // shell pattern right
      { d: 'M230 205 L260 195 L270 230 L260 255 L230 250 Z', name: 'shellRight', decor: true, fill: '#A8C898' },
      // head
      { d: 'M295 220 Q330 220 335 240 Q330 265 295 260 Q278 250 278 240 Q278 225 295 220 Z', name: 'head' },
      // legs - front left
      { d: 'M125 270 Q100 275 100 295 Q120 305 140 295 Q145 280 135 270 Z', name: 'frontLeftLeg' },
      // legs - front right
      { d: 'M275 270 Q300 275 300 295 Q280 305 260 295 Q255 280 265 270 Z', name: 'frontRightLeg' },
      // legs - back left
      { d: 'M145 295 Q135 310 145 320 Q165 320 170 305 Z', name: 'backLeftLeg' },
      // legs - back right
      { d: 'M255 295 Q265 310 255 320 Q235 320 230 305 Z', name: 'backRightLeg' },
      // eye
      { d: 'M315 235 Q311 235 311 240 Q311 246 318 246 Q322 246 322 240 Q322 235 315 235 Z', name: 'eye', decor: true, fill: '#2a2a3e' },
      // smile
      { d: 'M298 248 Q310 257 322 250', name: 'smile', decor: true, nofill: true }
    ]
  },
  {
    name: 'Butterfly', emoji: '🦋', bgColor: '#E5C8FF',
    parts: [
      // body (center)
      { d: 'M194 130 Q190 280 200 290 Q210 280 206 130 Q200 120 194 130 Z', name: 'body' },
      // head
      { d: 'M200 110 Q188 110 188 125 Q188 138 200 138 Q212 138 212 125 Q212 110 200 110 Z', name: 'head' },
      // top-left wing
      { d: 'M190 170 Q120 120 75 170 Q60 220 105 240 Q150 240 192 215 Z', name: 'topLeftWing' },
      // top-right wing
      { d: 'M210 170 Q280 120 325 170 Q340 220 295 240 Q250 240 208 215 Z', name: 'topRightWing' },
      // bottom-left wing
      { d: 'M192 225 Q140 245 115 285 Q140 315 180 295 Q195 270 195 240 Z', name: 'bottomLeftWing' },
      // bottom-right wing
      { d: 'M208 225 Q260 245 285 285 Q260 315 220 295 Q205 270 205 240 Z', name: 'bottomRightWing' },
      // wing spots
      { d: 'M130 190 Q120 190 120 200 Q120 215 135 215 Q145 213 145 200 Q143 190 130 190 Z', name: 'topLeftSpot', decor: true, fill: '#FFD93D' },
      { d: 'M270 190 Q280 190 280 200 Q280 215 265 215 Q255 213 255 200 Q257 190 270 190 Z', name: 'topRightSpot', decor: true, fill: '#FFD93D' },
      { d: 'M145 270 Q140 275 145 282 Q155 285 155 275 Q153 268 148 268 Z', name: 'bottomLeftSpot', decor: true, fill: '#FFD93D' },
      { d: 'M255 270 Q260 275 255 282 Q245 285 245 275 Q247 268 252 268 Z', name: 'bottomRightSpot', decor: true, fill: '#FFD93D' },
      // antennae
      { d: 'M194 110 Q180 85 188 75 M206 110 Q220 85 212 75', name: 'antennae', decor: true, nofill: true },
      // eyes
      { d: 'M194 122 Q192 122 192 126 Q192 130 195 130 Q198 130 198 126 Q198 122 195 122 Z', name: 'leftEye', decor: true, fill: '#2a2a3e' },
      { d: 'M206 122 Q204 122 204 126 Q204 130 207 130 Q210 130 210 126 Q210 122 207 122 Z', name: 'rightEye', decor: true, fill: '#2a2a3e' }
    ]
  },
  {
    name: 'Elephant', emoji: '🐘', bgColor: '#D5D5E8',
    parts: [
      // ear (behind body)
      { d: 'M115 175 Q70 175 65 230 Q65 280 115 265 Q130 240 130 200 Z', name: 'ear' },
      // body
      { d: 'M105 230 Q105 145 200 130 Q295 145 305 200 Q320 210 320 235 Q320 295 275 320 L270 345 L245 345 L245 315 L205 315 L205 345 L180 345 L180 315 Q125 310 115 275 Q105 255 105 230 Z', name: 'body' },
      // trunk
      { d: 'M200 230 Q200 280 175 310 Q160 340 175 355 Q205 360 215 325 Q230 290 245 270 Q240 250 215 250 Q200 240 200 230 Z', name: 'trunk' },
      // tusk
      { d: 'M225 280 Q235 295 240 305 Q230 308 220 295 Z', name: 'tusk', decor: true, fill: 'white' },
      // tail
      { d: 'M298 245 Q325 250 325 290 Q320 295 315 290 Q315 270 295 260 Z', name: 'tail' },
      // toenails
      { d: 'M188 345 L188 358 M205 345 L205 358 M218 345 L218 358', name: 'leftToes', decor: true, nofill: true },
      { d: 'M252 345 L252 358 M268 345 L268 358 M285 345 L285 358', name: 'rightToes', decor: true, nofill: true },
      // eye
      { d: 'M170 190 Q165 190 165 197 Q165 205 173 205 Q178 205 178 197 Q178 190 170 190 Z', name: 'eye', decor: true, fill: '#2a2a3e' }
    ]
  }
];

let currentAnimalIndex = 0;

/* ============================================================
   BUILD PICKER SCREEN
   ============================================================ */
const carousel = document.getElementById('animalCarousel');
ANIMALS.forEach((animal, idx) => {
  const card = document.createElement('div');
  card.className = 'animal-card';
  card.style.background = animal.bgColor;
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

/* ---------- MODE TOGGLE ---------- */
document.querySelectorAll('.mode-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    setMode(btn.dataset.mode);
    playClick();
  });
});

function setMode(mode) {
  currentMode = mode;
  document.querySelectorAll('.mode-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.mode === mode);
  });
  const canvas = document.getElementById('drawCanvas');
  const svg = document.getElementById('animalSvg');
  if (mode === 'tap') {
    canvas.style.pointerEvents = 'none';
    canvas.style.opacity = '0.7';
    svg.style.pointerEvents = 'auto';
  } else {
    canvas.style.pointerEvents = 'auto';
    canvas.style.opacity = '1';
    svg.style.pointerEvents = 'none';
  }
}

/* ============================================================
   ANIMAL RENDERING (SVG with tappable parts)
   ============================================================ */
const svg = document.getElementById('animalSvg');

function loadAnimal(idx) {
  currentAnimalIndex = idx;
  const animal = ANIMALS[idx];
  filledParts = 0;
  totalParts = animal.parts.filter(p => !p.decor).length;
  hasCelebrated = false;

  svg.innerHTML = '';

  animal.parts.forEach((part, partIdx) => {
    const pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    pathEl.setAttribute('d', part.d);
    pathEl.dataset.partIndex = partIdx;
    pathEl.dataset.partName = part.name;

    // Decorative parts (eyes, nose, etc.) are pre-filled and not tappable
    if (part.decor) {
      if (part.nofill) {
        pathEl.setAttribute('fill', 'none');
      } else {
        pathEl.setAttribute('fill', part.fill || '#2a2a3e');
      }
      pathEl.setAttribute('stroke', '#2a2a3e');
      pathEl.setAttribute('stroke-width', '4');
      pathEl.setAttribute('stroke-linejoin', 'round');
      pathEl.setAttribute('stroke-linecap', 'round');
      pathEl.style.pointerEvents = 'none';
    } else {
      // Fillable part - starts white
      pathEl.setAttribute('fill', 'white');
      pathEl.setAttribute('stroke', '#2a2a3e');
      pathEl.setAttribute('stroke-width', '5');
      pathEl.setAttribute('stroke-linejoin', 'round');
      pathEl.setAttribute('stroke-linecap', 'round');
      pathEl.classList.add('tappable-part');
      pathEl.addEventListener('click', () => fillPart(pathEl));
      pathEl.addEventListener('touchstart', (e) => {
        e.preventDefault();
        fillPart(pathEl);
      }, { passive: false });
    }

    svg.appendChild(pathEl);
  });

  // Reset the drawing canvas too
  clearDrawCanvas(true);
}

function fillPart(pathEl) {
  if (currentMode !== 'tap') return;
  const wasFilled = pathEl.getAttribute('fill') !== 'white';
  pathEl.setAttribute('fill', currentColor);
  // Animation
  pathEl.classList.remove('just-filled');
  void pathEl.getBoundingClientRect(); // force reflow
  pathEl.classList.add('just-filled');

  playFill();

  if (!wasFilled) {
    filledParts++;
    if (filledParts >= totalParts && !hasCelebrated) {
      hasCelebrated = true;
      setTimeout(celebrate, 400);
    }
  }
}

function nextAnimal() {
  currentAnimalIndex = (currentAnimalIndex + 1) % ANIMALS.length;
  loadAnimal(currentAnimalIndex);
  playClick();
}

/* ============================================================
   DRAW CANVAS (brush mode)
   ============================================================ */
const drawCanvas = document.getElementById('drawCanvas');
const ctx = drawCanvas.getContext('2d');

function resizeCanvas() {
  const wrap = document.getElementById('canvasWrap');
  const rect = wrap.getBoundingClientRect();
  if (rect.width === 0) return;
  const dpr = window.devicePixelRatio || 1;
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = drawCanvas.width;
  tempCanvas.height = drawCanvas.height;
  if (drawCanvas.width > 0) tempCanvas.getContext('2d').drawImage(drawCanvas, 0, 0);
  drawCanvas.width = rect.width * dpr;
  drawCanvas.height = rect.height * dpr;
  drawCanvas.style.width = rect.width + 'px';
  drawCanvas.style.height = rect.height + 'px';
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(dpr, dpr);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (tempCanvas.width > 0) ctx.drawImage(tempCanvas, 0, 0, rect.width, rect.height);
}
window.addEventListener('resize', resizeCanvas);
window.addEventListener('orientationchange', () => {
  setTimeout(resizeCanvas, 200);
});

function clearDrawCanvas(silent = false) {
  const rect = drawCanvas.getBoundingClientRect();
  ctx.clearRect(0, 0, rect.width, rect.height);
  if (!silent) playClick();
}

function eraseAll() {
  // Erase everything: reset SVG fills AND clear the canvas
  playClick();
  clearDrawCanvas(true);
  const animal = ANIMALS[currentAnimalIndex];
  const paths = svg.querySelectorAll('path');
  paths.forEach((path, i) => {
    const part = animal.parts[i];
    if (part && !part.decor) {
      path.setAttribute('fill', 'white');
    }
  });
  filledParts = 0;
  hasCelebrated = false;
}

/* ---------- DRAWING (brush mode) ---------- */
let isDrawing = false;
let lastX = 0, lastY = 0;

function getPos(e) {
  const rect = drawCanvas.getBoundingClientRect();
  const touch = e.touches ? e.touches[0] : e;
  return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
}

function startDraw(e) {
  if (currentMode !== 'brush') return;
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
  if (!isDrawing || currentMode !== 'brush') return;
  e.preventDefault();
  const pos = getPos(e);
  ctx.strokeStyle = currentColor;
  ctx.lineWidth = brushSize;
  ctx.beginPath();
  ctx.moveTo(lastX, lastY);
  ctx.lineTo(pos.x, pos.y);
  ctx.stroke();
  lastX = pos.x;
  lastY = pos.y;
}

function stopDraw() { isDrawing = false; }

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
  document.getElementById('picker').classList.remove('active');
  document.getElementById('coloring').classList.add('active');
  setTimeout(() => {
    resizeCanvas();
    loadAnimal(animalIdx);
    setMode('tap'); // default
  }, 50);
}

function backToPicker() {
  playClick();
  document.getElementById('coloring').classList.remove('active');
  document.getElementById('picker').classList.add('active');
}

document.getElementById('backBtn').addEventListener('click', backToPicker);
document.getElementById('nextBtn').addEventListener('click', nextAnimal);
document.getElementById('eraseBtn').addEventListener('click', eraseAll);

/* ---------- INIT ---------- */
updateStars();
