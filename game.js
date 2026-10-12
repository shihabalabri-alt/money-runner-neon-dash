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
const GROUND_Y = 620;
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

// audio (tiny synth, no files)
let muted = localStorage.getItem('nd_mute') === '1';
let AC = null;
function beep(freq, dur, type, vol) {
  if (muted) return;
  try {
    AC = AC || new (window.AudioContext || window.webkitAudioContext)();
    const o = AC.createOscillator(), g = AC.createGain();
    o.type = type || 'square'; o.frequency.value = freq;
    g.gain.value = vol || 0.06;
    o.connect(g); g.connect(AC.destination);
    o.start(); g.gain.exponentialRampToValueAtTime(0.0001, AC.currentTime + dur);
    o.stop(AC.currentTime + dur);
  } catch (e) {}
}

let state = 'menu'; // menu | playing | dead | paused
let score = 0, coins = 0, best = +(localStorage.getItem('nd_best') || 0);
let frame = 0, speed = 8, spawnT = 0, shake = 0;
let parts = [], floats = [];
const GRAV = 1.05;
const player = { x: 180, y: GROUND_Y - 64, w: 64, h: 64, vy: 0, jumps: 0, rot: 0 };
let obstacles = [];

bestEl.textContent = best;

function groundY() { return GROUND_Y - player.h; }
function reset() {
  score = 0; coins = 0; speed = 8; frame = 0; spawnT = 0; shake = 0;
  obstacles = []; parts = []; floats = [];
  player.y = groundY(); player.vy = 0; player.jumps = 0;
  scoreEl.textContent = '0'; coinsEl.textContent = '0';
}
function start() {
  resize(); reset();
  state = 'playing';
  overlay.classList.add('hidden');
}
function die() {
  if (state !== 'playing') return;
  state = 'dead'; shake = 18;
  beep(140, 0.35, 'sawtooth', 0.09);
  burst(player.x + 32, player.y + 32, '#00ff9d', 26);
  if (score > best) { best = Math.floor(score); localStorage.setItem('nd_best', best); bestEl.textContent = best; }
  setTimeout(() => {
    ovTitle.textContent = 'GAME OVER';
    ovSub.innerHTML = `Score <b>${Math.floor(score)}</b> • Coins <b>${coins}</b> • Best <b>${best}</b><br>Tap PLAY for instant restart — no ads.`;
    playBtn.textContent = '↻ PLAY AGAIN';
    overlay.classList.remove('hidden');
  }, 450);
}
function burst(x, y, color, n) {
  for (let i = 0; i < n; i++) parts.push({ x, y, vx: (Math.random() - .5) * 14, vy: -Math.random() * 12, life: 30 + Math.random() * 30, color, s: 3 + Math.random() * 6 });
}
function jump() {
  if (state === 'menu' || state === 'dead') { if (overlay.classList.contains('hidden') === false) start(); return; }
  if (state === 'paused') return;
  if (player.jumps < 2) {
    player.vy = player.jumps === 0 ? -19 : -16;
    player.jumps++;
    beep(player.jumps === 1 ? 520 : 700, 0.12, 'square', 0.05);
    burst(player.x + 32, player.y + 64, '#00ff9d55', 6);
  }
}
function spawn() {
  const r = Math.random();
  if (r < 0.55) {
    const h = 50 + Math.random() * 110, w = 34 + Math.random() * 30;
    obstacles.push({ x: W + 20, y: GROUND_Y - h, w, h, fly: false });
  } else if (r < 0.8) {
    const w = 90 + Math.random() * 90;
    obstacles.push({ x: W + 20, y: GROUND_Y - 44, w, h: 44, fly: false });
  } else {
    const y = GROUND_Y - 170 - Math.random() * 180;
    obstacles.push({ x: W + 20, y, w: 46, h: 40, fly: true, ph: Math.random() * 6 });
  }
  // coin arc
  if (Math.random() < 0.75) {
    const cx = W + 120 + Math.random() * 200, cy = GROUND_Y - 120 - Math.random() * 260;
    for (let i = 0; i < 5; i++) obstacles.push({ x: cx + i * 44, y: cy + Math.sin(i * 0.9) * 26, w: 28, h: 28, coin: true });
  }
}
function update() {
  frame++;
  if (state === 'playing') {
    score += 0.35 + speed * 0.012;
    speed = 8 + score / 220;
    spawnT -= speed;
    if (spawnT <= 0) { spawn(); spawnT = 420 + Math.random() * 420; }
    player.vy += GRAV; player.y += player.vy;
    const gy = groundY();
    if (player.y >= gy) { player.y = gy; player.vy = 0; player.jumps = 0; if (frame % 6 === 0) parts.push({ x: player.x + 10, y: GROUND_Y - 4, vx: -speed * 0.5, vy: -Math.random() * 2, life: 20, color: '#00ff9d44', s: 4 }); }
    player.rot = player.vy * 0.012;
    for (let i = obstacles.length - 1; i >= 0; i--) {
      const o = obstacles[i];
      o.x -= speed * (o.coin ? 1 : 1);
      if (o.fly) o.y += Math.sin(frame * 0.08 + o.ph) * 1.6;
      if (o.x + o.w < -60) { obstacles.splice(i, 1); continue; }
      const px = player.x + 8, pw = player.w - 16, py = player.y + 6, ph = player.h - 8;
      if (o.coin) {
        if (px < o.x + o.w && px + pw > o.x && py < o.y + o.h && py + ph > o.y) {
          coins++; obstacles.splice(i, 1);
          beep(880 + Math.random() * 300, 0.1, 'sine', 0.07);
          floats.push({ x: o.x, y: o.y, t: '+1', life: 30 });
          scoreEl.textContent = Math.floor(score); coinsEl.textContent = coins;
        }
      } else if (px < o.x + o.w - 8 && px + pw > o.x + 8 && py < o.y + o.h - 4 && py + ph > o.y + 4) {
        die(); break;
      }
    }
    scoreEl.textContent = Math.floor(score);
  }
  // particles always
  for (let i = parts.length - 1; i >= 0; i--) { const p = parts[i]; p.x += p.vx; p.y += p.vy; p.vy += 0.4; p.life--; if (p.life <= 0) parts.splice(i, 1); }
  for (let i = floats.length - 1; i >= 0; i--) { const f = floats[i]; f.y -= 2; f.life--; if (f.life <= 0) floats.splice(i, 1); }
  if (shake > 0) shake *= 0.88;
}
function rr(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function draw() {
  ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
  if (shake > 0.5) ctx.translate((Math.random() - .5) * shake, (Math.random() - .5) * shake);
  // sky
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#05070f'); g.addColorStop(0.6, '#0b1230'); g.addColorStop(0.86, '#16213e'); g.addColorStop(1, '#0a0e1a');
  ctx.fillStyle = g; ctx.fillRect(-30, -30, W + 60, H + 60);
  // stars
  ctx.fillStyle = '#ffffff22';
  for (let i = 0; i < 90; i++) { const x = (i * 211 - frame * speed * 0.15) % W; const xx = x < 0 ? x + W : x; const y = 20 + (i * 97) % 420; ctx.fillRect(xx, y, 2.5, 2.5); }
  // mountains far/near
  ctx.fillStyle = '#111a35';
  ctx.beginPath(); ctx.moveTo(-30, GROUND_Y);
  for (let x = -30; x <= W + 30; x += 80) { const mx = x - (frame * speed * 0.25 % 80); ctx.lineTo(mx, GROUND_Y - 120 - ((x * 7919) % 130)); }
  ctx.lineTo(W + 30, GROUND_Y); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#0e1730';
  ctx.beginPath(); ctx.moveTo(-30, GROUND_Y);
  for (let x = -30; x <= W + 30; x += 60) { const mx = x - (frame * speed * 0.5 % 60); ctx.lineTo(mx, GROUND_Y - 60 - ((x * 4799) % 90)); }
  ctx.lineTo(W + 30, GROUND_Y); ctx.closePath(); ctx.fill();
  // ground
  ctx.fillStyle = '#00ff9d'; ctx.fillRect(-30, GROUND_Y, W + 60, 4);
  ctx.fillStyle = '#131c33'; ctx.fillRect(-30, GROUND_Y + 4, W + 60, H - GROUND_Y);
  ctx.fillStyle = '#1e2a4d';
  const off = (frame * speed) % 90;
  for (let x = -90 - off; x < W + 60; x += 90) ctx.fillRect(x, GROUND_Y + 26, 48, 10);
  // coins + blocks
  obstacles.forEach(o => {
    if (o.coin) {
      const cx = o.x + 14, cy = o.y + 14, sq = 1 + Math.sin(frame * 0.2 + o.x * 0.02) * 0.15;
      ctx.save(); ctx.translate(cx, cy); ctx.scale(sq, 1); ctx.translate(-cx, -cy);
      ctx.fillStyle = '#ffd700'; ctx.beginPath(); ctx.arc(cx, cy, 13, 0, 7); ctx.fill();
      ctx.fillStyle = '#8a6500'; ctx.fillRect(cx - 3, cy - 8, 6, 16);
      ctx.restore();
    } else if (o.fly) {
      ctx.fillStyle = '#ff3355'; rr(o.x, o.y, o.w, o.h, 10); ctx.fill();
      ctx.fillStyle = '#ff8899'; ctx.fillRect(o.x + 8, o.y + 10, 12, 8);
      ctx.fillStyle = '#7a0f22'; ctx.fillRect(o.x, o.y + o.h - 8, o.w, 8);
    } else {
      ctx.fillStyle = '#ff3355'; rr(o.x, o.y, o.w, o.h, 8); ctx.fill();
      ctx.fillStyle = '#ffffff22'; ctx.fillRect(o.x + 6, o.y + 6, 6, o.h - 12);
    }
  });
  // player glow + body
  ctx.save();
  ctx.shadowColor = '#00ff9d'; ctx.shadowBlur = 30;
  ctx.translate(player.x + 32, player.y + 32); ctx.rotate(player.rot); ctx.translate(-32, -32);
  ctx.fillStyle = '#00ff9d'; rr(0, 0, 64, 64, 14); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#032b1a'; ctx.fillRect(12, 16, 18, 18);
  ctx.fillStyle = '#fff'; ctx.fillRect(38, 16, 12, 12);
  ctx.fillStyle = '#032b1a55'; ctx.fillRect(8, 48, 48, 8);
  ctx.restore();
  // particles
  parts.forEach(p => { ctx.globalAlpha = Math.min(1, p.life / 25); ctx.fillStyle = p.color; ctx.fillRect(p.x, p.y, p.s, p.s); ctx.globalAlpha = 1; });
  ctx.fillStyle = '#ffd700'; ctx.font = 'bold 26px system-ui';
  floats.forEach(f => { ctx.globalAlpha = f.life / 30; ctx.fillText(f.t, f.x, f.y); ctx.globalAlpha = 1; });
  // speed lines
  if (state === 'playing' && speed > 12) {
    ctx.strokeStyle = '#ffffff18'; ctx.lineWidth = 3;
    for (let i = 0; i < 8; i++) { const y = Math.random() * GROUND_Y; const x = Math.random() * W; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + speed * 8, y); ctx.stroke(); }
  }
  requestAnimationFrame(() => { update(); draw(); });
}

// input
window.addEventListener('keydown', e => {
  if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') { e.preventDefault(); jump(); }
  if (e.code === 'KeyP') togglePause();
  if (e.code === 'KeyM') toggleMute();
  if (e.code === 'Enter' && state !== 'playing') start();
});
canvas.addEventListener('pointerdown', e => { e.preventDefault(); jump(); });
document.getElementById('jumpBtn').addEventListener('pointerdown', e => { e.preventDefault(); jump(); });
document.getElementById('restartBtn').addEventListener('click', start);
playBtn.addEventListener('click', start);
function togglePause() {
  if (state === 'playing') { state = 'paused'; ovTitle.textContent = 'PAUSED'; ovSub.textContent = 'Press P to resume'; playBtn.textContent = '▶ RESUME'; playBtn.onclick = () => { state = 'playing'; overlay.classList.add('hidden'); }; overlay.classList.remove('hidden'); }
  else if (state === 'paused') { state = 'playing'; overlay.classList.add('hidden'); }
}
function toggleMute() {
  muted = !muted; localStorage.setItem('nd_mute', muted ? '1' : '0');
  document.getElementById('muteBtn').textContent = muted ? '🔇' : '🔊';
}
document.getElementById('muteBtn').addEventListener('click', toggleMute);
document.getElementById('muteBtn').textContent = muted ? '🔇' : '🔊';
document.getElementById('fsBtn').addEventListener('click', () => {
  const el = document.documentElement;
  if (document.fullscreenElement) document.exitFullscreen();
  else if (el.requestFullscreen) el.requestFullscreen();
});
document.addEventListener('visibilitychange', () => { if (document.hidden && state === 'playing') togglePause(); });

reset(); draw();
})();
