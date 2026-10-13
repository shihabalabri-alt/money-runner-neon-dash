(() => {
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const coinsEl = document.getElementById('coins');
const bestEl = document.getElementById('best');
const overlay = document.getElementById('overlay');
const ovTitle = document.getElementById('ovTitle');
const ovSub = document.getElementById('ovSub');
const playBtn = document.getElementById('playBtn');

const W = 1280, H = 720;
let SCALE = 1, DPR = 1;
function resize() {
  const r = canvas.getBoundingClientRect();
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.max(2, Math.round(r.width * DPR));
  canvas.height = Math.max(2, Math.round(r.height * DPR));
  SCALE = canvas.width / W;
}
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => setTimeout(resize, 250));
setTimeout(resize, 60);

let muted = localStorage.getItem('tr_mute') === '1';
let AC = null;
function beep(f, d, t, v) {
  if (muted) return;
  try {
    AC = AC || new (window.AudioContext || window.webkitAudioContext)();
    const o = AC.createOscillator(), g = AC.createGain();
    o.type = t || 'square'; o.frequency.value = f; g.gain.value = v || 0.05;
    o.connect(g); g.connect(AC.destination); o.start();
    g.gain.exponentialRampToValueAtTime(0.0001, AC.currentTime + d);
    o.stop(AC.currentTime + d);
  } catch (e) {}
}

const LANES = 4;
const roadL = 300, roadR = W - 300;
const laneX = i => roadL + (roadR - roadL) * (i + 0.5) / LANES;
let state = 'menu', score = 0, coins = 0, best = +(localStorage.getItem('tr_best') || 0);
let frame = 0, speed = 9, spawnT = 0, shake = 0, roadOff = 0;
let enemies = [], pickups = [], parts = [];
const car = { lane: 1.5, x: 0, y: H - 170, w: 84, h: 140 };
bestEl.textContent = best;

function reset() {
  score = 0; coins = 0; speed = 9; frame = 0; spawnT = 0; shake = 0;
  enemies = []; pickups = []; parts = [];
  car.lane = 1.5;
  scoreEl.textContent = '0'; coinsEl.textContent = '0';
}
function start() { resize(); reset(); state = 'playing'; overlay.classList.add('hidden'); }
function die() {
  if (state !== 'playing') return;
  state = 'dead'; shake = 20;
  beep(120, 0.4, 'sawtooth', 0.09);
  burst(car.x, car.y, '#00c8ff', 30);
  burst(car.x, car.y, '#ff5533', 20);
  if (score > best) { best = Math.floor(score); localStorage.setItem('tr_best', best); bestEl.textContent = best; }
  setTimeout(() => {
    ovTitle.textContent = 'CRASHED';
    ovSub.innerHTML = `Score <b>${Math.floor(score)}</b> • Coins <b>${coins}</b> • Best <b>${best}</b>`;
    playBtn.textContent = '↻ DRIVE AGAIN';
    overlay.classList.remove('hidden');
  }, 500);
}
function burst(x, y, c, n) {
  for (let i = 0; i < n; i++) parts.push({ x, y, vx: (Math.random() - .5) * 16, vy: -Math.random() * 12, life: 30 + Math.random() * 30, c, s: 3 + Math.random() * 7 });
}
function spawn() {
  const lanes = [0, 1, 2, 3].sort(() => Math.random() - .5);
  const n = Math.random() < 0.6 ? 2 : 1;
  for (let i = 0; i < n; i++) {
    const l = lanes[i];
    enemies.push({ lane: l, x: laneX(l), y: -180, w: 84, h: 140, c: ['#ff3355', '#ff8833', '#cc33ff', '#ffdd33'][Math.floor(Math.random() * 4)], sp: 2 + Math.random() * 3 });
  }
  if (Math.random() < 0.7) {
    const l = lanes[n] !== undefined ? lanes[n] : Math.floor(Math.random() * 4);
    for (let i = 0; i < 4; i++) pickups.push({ x: laneX(l), y: -120 - i * 70, r: 16, got: false });
  }
}
const keys = {};
window.addEventListener('keydown', e => {
  if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.l = true;
  if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.r = true;
  if (e.code === 'Space' || e.code === 'Enter') { if (state !== 'playing') start(); }
  if (e.code === 'KeyP') togglePause();
  if (e.code === 'KeyM') toggleMute();
});
window.addEventListener('keyup', e => {
  if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.l = false;
  if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.r = false;
});
let holdL = false, holdR = false;
const lb = document.getElementById('leftBtn'), rb = document.getElementById('rightBtn');
[['pointerdown', 'pointerup', 'pointerleave', 'pointercancel']].forEach(() => {});
lb.addEventListener('pointerdown', e => { e.preventDefault(); holdL = true; });
rb.addEventListener('pointerdown', e => { e.preventDefault(); holdR = true; });
window.addEventListener('pointerup', () => { holdL = holdR = false; });
lb.addEventListener('pointerleave', () => holdL = false);
rb.addEventListener('pointerleave', () => holdR = false);
// drag steering
let dragging = false, lastX = 0;
canvas.addEventListener('pointerdown', e => { if (state !== 'playing') { start(); return; } dragging = true; lastX = e.clientX; });
window.addEventListener('pointermove', e => {
  if (!dragging || state !== 'playing') return;
  car.lane += (e.clientX - lastX) / 120; lastX = e.clientX;
  car.lane = Math.max(-0.2, Math.min(3.2, car.lane));
});
window.addEventListener('pointerup', () => dragging = false);
playBtn.addEventListener('click', start);

function togglePause() {
  if (state === 'playing') { state = 'paused'; ovTitle.textContent = 'PAUSED'; ovSub.textContent = 'Press P to resume'; playBtn.textContent = '▶ RESUME'; playBtn.onclick = () => { state = 'playing'; overlay.classList.add('hidden'); }; overlay.classList.remove('hidden'); }
  else if (state === 'paused') { state = 'playing'; overlay.classList.add('hidden'); }
}
function toggleMute() {
  muted = !muted; localStorage.setItem('tr_mute', muted ? '1' : '0');
  document.getElementById('muteBtn').textContent = muted ? '🔇' : '🔊';
}
document.getElementById('muteBtn').addEventListener('click', toggleMute);
document.getElementById('muteBtn').textContent = muted ? '🔇' : '🔊';
document.getElementById('fsBtn').addEventListener('click', () => {
  if (document.fullscreenElement) document.exitFullscreen();
  else document.documentElement.requestFullscreen && document.documentElement.requestFullscreen();
});
document.addEventListener('visibilitychange', () => { if (document.hidden && state === 'playing') togglePause(); });

function update() {
  frame++;
  if (state === 'playing') {
    score += 0.3 + speed * 0.01;
    speed = 9 + score / 260;
    roadOff = (roadOff + speed * 2) % 80;
    if (keys.l || holdL) car.lane -= 0.09;
    if (keys.r || holdR) car.lane += 0.09;
    car.lane = Math.max(-0.2, Math.min(3.2, car.lane));
    const tx = laneX(0) + (laneX(3) - laneX(0)) * (car.lane / 3);
    car.x += (tx - car.x) * 0.18;
    spawnT -= speed;
    if (spawnT <= 0) { spawn(); spawnT = 500 + Math.random() * 400 - Math.min(300, score / 4); }
    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i]; e.y += speed - e.sp;
      if (e.y > H + 200) { enemies.splice(i, 1); continue; }
      if (Math.abs(e.x - car.x) < 80 && Math.abs(e.y - car.y) < 130) { die(); break; }
    }
    for (let i = pickups.length - 1; i >= 0; i--) {
      const p = pickups[i]; p.y += speed;
      if (p.y > H + 60) { pickups.splice(i, 1); continue; }
      if (Math.abs(p.x - car.x) < 70 && Math.abs(p.y - (car.y - 20)) < 100) {
        coins++; pickups.splice(i, 1);
        beep(900 + Math.random() * 300, 0.1, 'sine', 0.07);
        coinsEl.textContent = coins;
      }
    }
    scoreEl.textContent = Math.floor(score);
    if (frame % 4 === 0) parts.push({ x: car.x - 20 + Math.random() * 40, y: car.y + 80, vx: 0, vy: 6, life: 18, c: '#00c8ff44', s: 5 });
  }
  for (let i = parts.length - 1; i >= 0; i--) { const p = parts[i]; p.x += p.vx; p.y += p.vy; p.life--; if (p.life <= 0) parts.splice(i, 1); }
  if (shake > 0) shake *= 0.88;
}
function drawCar(x, y, color, glow) {
  ctx.save();
  if (glow) { ctx.shadowColor = glow; ctx.shadowBlur = 25; }
  ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.fillRect(x - 42, y - 60, 88, 144);
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.roundRect(x - 40, y - 70, 80, 140, 16); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(255,255,255,.75)';
  ctx.beginPath(); ctx.roundRect(x - 30, y - 40, 60, 44, 8); ctx.fill();
  ctx.fillStyle = '#ffee55'; ctx.fillRect(x - 34, y - 70, 22, 10); ctx.fillRect(x + 12, y - 70, 22, 10);
  ctx.fillStyle = '#ff2222'; ctx.fillRect(x - 34, y + 60, 22, 10); ctx.fillRect(x + 12, y + 60, 22, 10);
  ctx.fillStyle = '#111'; ctx.fillRect(x - 48, y - 40, 10, 34); ctx.fillRect(x + 38, y - 40, 10, 34);
  ctx.fillRect(x - 48, y + 20, 10, 34); ctx.fillRect(x + 38, y + 20, 10, 34);
  ctx.restore();
}
function draw() {
  ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
  if (shake > 0.5) ctx.translate((Math.random() - .5) * shake, (Math.random() - .5) * shake);
  ctx.fillStyle = '#070b16'; ctx.fillRect(-40, -40, W + 80, H + 80);
  // grass sides
  ctx.fillStyle = '#0a1420'; ctx.fillRect(0, 0, roadL - 40, H); ctx.fillRect(roadR + 40, 0, W - roadR, H);
  // road
  ctx.fillStyle = '#151d31'; ctx.fillRect(roadL - 40, 0, roadR - roadL + 80, H);
  ctx.fillStyle = '#00c8ff'; ctx.fillRect(roadL - 44, 0, 5, H); ctx.fillRect(roadR + 39, 0, 5, H);
  // lane dashes
  ctx.fillStyle = '#3b4a6e';
  for (let l = 1; l < LANES; l++) {
    const x = roadL + (roadR - roadL) * l / LANES;
    for (let y = -80 + roadOff; y < H + 80; y += 80) ctx.fillRect(x - 4, y, 8, 44);
  }
  // side lights
  for (let y = -60 + (roadOff * 1.4 % 120); y < H + 60; y += 120) {
    ctx.fillStyle = '#00c8ff33'; ctx.fillRect(roadL - 90, y, 26, 60); ctx.fillRect(roadR + 64, y, 26, 60);
  }
  pickups.forEach(p => {
    ctx.save(); ctx.shadowColor = '#ffd700'; ctx.shadowBlur = 18;
    ctx.fillStyle = '#ffd700'; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill();
    ctx.shadowBlur = 0; ctx.fillStyle = '#8a6500'; ctx.fillRect(p.x - 3, p.y - 9, 6, 18);
    ctx.restore();
  });
  enemies.forEach(e => drawCar(e.x, e.y, e.c, null));
  if (state !== 'dead') drawCar(car.x, car.y, '#00c8ff', '#00c8ff');
  parts.forEach(p => { ctx.globalAlpha = Math.min(1, p.life / 22); ctx.fillStyle = p.c; ctx.fillRect(p.x, p.y, p.s, p.s); ctx.globalAlpha = 1; });
  requestAnimationFrame(() => { update(); draw(); });
}
car.x = laneX(1.5);
reset(); draw();
})();
