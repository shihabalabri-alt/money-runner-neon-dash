(() => {
// GHOST TRAFFIC: survive LOOP_LEN s. Each completed loop stores your x-path.
// Next loops replay up to 4 ghosts as solid killers alongside traffic.
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const loopEl = document.getElementById('loop');
const bestEl = document.getElementById('best');
const overlay = document.getElementById('overlay');
const ovTitle = document.getElementById('ovTitle');
const ovSub = document.getElementById('ovSub');
const playBtn = document.getElementById('playBtn');

const W = 1280, H = 720;
const LOOP_LEN = 25; // seconds per loop
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

let muted = localStorage.getItem('gt_mute') === '1';
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

const roadL = 300, roadR = W - 300;
let state = 'menu';
let score = 0, best = +(localStorage.getItem('gt_best') || 0);
let loop = 1, loopT = 0, frame = 0, speed = 9, spawnT = 0, shake = 0, roadOff = 0;
let enemies = [], coins = [], parts = [];
let ghosts = [];      // completed loops: {path:[x...], color}
let curPath = [];     // recording current loop x per tick
let ghostObjs = [];   // live replay cars this loop
const car = { x: W / 2, y: H - 170, w: 84, h: 140 };
const GHOST_COLORS = ['#00ff9d', '#00c8ff', '#ffdd33', '#ff8833'];
bestEl.textContent = best;

function resetAll() {
  score = 0; loop = 1; loopT = 0; frame = 0; speed = 9; spawnT = 0; shake = 0;
  enemies = []; coinsAr(); ghosts = []; curPath = []; ghostObjs = [];
  car.x = W / 2;
  scoreEl.textContent = '0'; loopEl.textContent = '1';
}
function coinsAr() { coins = []; }
function start() { resize(); resetAll(); state = 'playing'; overlay.classList.add('hidden'); beep(440, 0.15, 'square', 0.06); }
function startLoop(n) {
  loop = n; loopT = 0; curPath = [];
  enemies = []; coins = [];
  // build replay cars from last up to 4 ghosts
  ghostObjs = ghosts.slice(-4).map((g, i) => ({ path: g.path, color: g.color, y: H - 170, i }));
  loopEl.textContent = loop;
  beep(660 + loop * 60, 0.2, 'sine', 0.07);
  flashText('LOOP ' + loop + (loop > 1 ? ' — ' + ghostObjs.length + ' GHOST' + (ghostObjs.length > 1 ? 'S' : '') + ' AWAKE' : ''));
}
let flash = null;
function flashText(t) { flash = { t, life: 120 }; }
function die(reason) {
  if (state !== 'playing') return;
  state = 'dead'; shake = 20;
  beep(120, 0.4, 'sawtooth', 0.09);
  burst(car.x, car.y, '#b26bff', 30);
  if (score > best) { best = Math.floor(score); localStorage.setItem('gt_best', best); bestEl.textContent = best; }
  setTimeout(() => {
    ovTitle.textContent = reason === 'ghost' ? 'KILLED BY YOURSELF' : 'CRASHED';
    ovSub.innerHTML = `Loop <b>${loop}</b> • Score <b>${Math.floor(score)}</b> • Best <b>${best}</b> • Ghosts banked <b>${ghosts.length}</b><br>${reason === 'ghost' ? 'Your past self cut you off.' : 'Traffic got you.'} Survive ${LOOP_LEN}s to bank another ghost.`;
    playBtn.textContent = '↻ DRIVE AGAIN';
    overlay.classList.remove('hidden');
  }, 500);
}
function burst(x, y, c, n) {
  for (let i = 0; i < n; i++) parts.push({ x, y, vx: (Math.random() - .5) * 16, vy: -Math.random() * 12, life: 30 + Math.random() * 30, c, s: 3 + Math.random() * 7 });
}
function spawnTraffic() {
  const lanes = [0, 1, 2, 3].sort(() => Math.random() - .5);
  const laneW = (roadR - roadL) / 4;
  const n = 1 + (Math.random() < Math.min(0.7, 0.2 + loop * 0.08) ? 1 : 0);
  for (let i = 0; i < n; i++) {
    const x = roadL + laneW * (lanes[i] + 0.5);
    enemies.push({ x, y: -180, w: 84, h: 140, c: ['#ff3355', '#ff8833', '#cc33ff', '#ffdd33'][Math.floor(Math.random() * 4)], sp: 2 + Math.random() * (2 + loop * 0.4) });
  }
  if (Math.random() < 0.65) {
    const x = roadL + laneW * (Math.floor(Math.random() * 4) + 0.5);
    for (let i = 0; i < 4; i++) coins.push({ x, y: -120 - i * 70, r: 16 });
  }
}
// input
const keys = {};
window.addEventListener('keydown', e => {
  if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.l = true;
  if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.r = true;
  if ((e.code === 'Space' || e.code === 'Enter') && state !== 'playing') start();
  if (e.code === 'KeyP') togglePause();
  if (e.code === 'KeyM') toggleMute();
});
window.addEventListener('keyup', e => {
  if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.l = false;
  if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.r = false;
});
let holdL = false, holdR = false;
const lb = document.getElementById('leftBtn'), rb = document.getElementById('rightBtn');
lb.addEventListener('pointerdown', e => { e.preventDefault(); holdL = true; });
rb.addEventListener('pointerdown', e => { e.preventDefault(); holdR = true; });
window.addEventListener('pointerup', () => { holdL = holdR = false; });
let dragging = false, lastX = 0;
canvas.addEventListener('pointerdown', e => { if (state !== 'playing') { if (!overlay.classList.contains('hidden')) start(); return; } dragging = true; lastX = e.clientX; });
window.addEventListener('pointermove', e => { if (dragging && state === 'playing') { car.x += (e.clientX - lastX) * (W / canvas.getBoundingClientRect().width) * 1.2; lastX = e.clientX; car.x = Math.max(roadL - 20, Math.min(roadR + 20, car.x)); } });
window.addEventListener('pointerup', () => dragging = false);
playBtn.addEventListener('click', start);
function togglePause() {
  if (state === 'playing') { state = 'paused'; ovTitle.textContent = 'PAUSED'; ovSub.textContent = 'Press P to resume'; playBtn.textContent = '▶ RESUME'; playBtn.onclick = () => { state = 'playing'; overlay.classList.add('hidden'); }; overlay.classList.remove('hidden'); }
  else if (state === 'paused') { state = 'playing'; overlay.classList.add('hidden'); }
}
function toggleMute() { muted = !muted; localStorage.setItem('gt_mute', muted ? '1' : '0'); document.getElementById('muteBtn').textContent = muted ? '🔇' : '🔊'; }
document.getElementById('muteBtn').addEventListener('click', toggleMute);
document.getElementById('muteBtn').textContent = muted ? '🔇' : '🔊';
document.getElementById('fsBtn').addEventListener('click', () => { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen && document.documentElement.requestFullscreen(); });
document.addEventListener('visibilitychange', () => { if (document.hidden && state === 'playing') togglePause(); });

function update(dt) {
  frame++;
  if (state === 'playing') {
    loopT += dt; score += dt * (10 + speed);
    speed = 9 + loop * 0.9 + loopT * 0.12;
    roadOff = (roadOff + speed * 2 * dt * 60 / 60) % 80;
    const mv = 620 * dt;
    if (keys.l || holdL) car.x -= mv;
    if (keys.r || holdR) car.x += mv;
    car.x = Math.max(roadL - 20, Math.min(roadR + 20, car.x));
    curPath.push(car.x);
    spawnT -= speed * dt * 60;
    if (spawnT <= 0) { spawnTraffic(); spawnT = Math.max(220, 560 - loop * 40) + Math.random() * 380; }
    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i]; e.y += (speed - e.sp) * dt * 60;
      if (e.y > H + 220) { enemies.splice(i, 1); continue; }
      if (Math.abs(e.x - car.x) < 80 && Math.abs(e.y - car.y) < 128) { die('traffic'); break; }
    }
    if (state !== 'playing') return;
    for (let i = coins.length - 1; i >= 0; i--) {
      const p = coins[i]; p.y += speed * dt * 60;
      if (p.y > H + 60) { coins.splice(i, 1); continue; }
      if (Math.abs(p.x - car.x) < 70 && Math.abs(p.y - (car.y - 20)) < 105) {
        coins.splice(i, 1); score += 50;
        beep(900 + Math.random() * 300, 0.1, 'sine', 0.07);
      }
    }
    // ghosts replay: index by frame count of this loop
    const gi = Math.floor(loopT * 60);
    for (const g of ghostObjs) {
      const gx = g.path[Math.min(gi, g.path.length - 1)];
      if (gx === undefined) continue;
      g.x = gx;
      if (Math.abs(gx - car.x) < 78 && Math.abs(car.y - g.y) < 126) { die('ghost'); break; }
    }
    if (state !== 'playing') return;
    if (loopT >= LOOP_LEN) {
      ghosts.push({ path: curPath.slice(), color: GHOST_COLORS[(loop - 1) % GHOST_COLORS.length] });
      score += 500;
      beep(880, 0.25, 'sine', 0.08);
      startLoop(loop + 1);
    }
    scoreEl.textContent = Math.floor(score);
    if (frame % 4 === 0) parts.push({ x: car.x - 20 + Math.random() * 40, y: car.y + 82, vx: 0, vy: 6, life: 16, c: '#b26bff55', s: 5 });
  }
  for (let i = parts.length - 1; i >= 0; i--) { const p = parts[i]; p.x += p.vx * dt * 60 / 60; p.y += p.vy * dt * 60 / 60; p.life -= dt * 60; if (p.life <= 0) parts.splice(i, 1); }
  if (flash) { flash.life -= dt * 60; if (flash.life <= 0) flash = null; }
  if (shake > 0) shake *= 0.88;
}
function drawCar(x, y, color, ghost) {
  ctx.save();
  ctx.globalAlpha = ghost ? 0.72 : 1;
  if (!ghost) { ctx.shadowColor = color; ctx.shadowBlur = 25; }
  else { ctx.shadowColor = color; ctx.shadowBlur = 18; ctx.setLineDash([10, 8]); }
  ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.fillRect(x - 42, y - 60, 88, 144);
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.roundRect(x - 40, y - 70, 80, 140, 16); ctx.fill();
  ctx.shadowBlur = 0; ctx.setLineDash([]);
  ctx.fillStyle = ghost ? 'rgba(0,0,0,.55)' : 'rgba(255,255,255,.8)';
  ctx.beginPath(); ctx.roundRect(x - 30, y - 40, 60, 44, 8); ctx.fill();
  ctx.fillStyle = '#ffee55'; ctx.fillRect(x - 34, y - 70, 22, 10); ctx.fillRect(x + 12, y - 70, 22, 10);
  ctx.fillStyle = '#ff2222'; ctx.fillRect(x - 34, y + 60, 22, 10); ctx.fillRect(x + 12, y + 60, 22, 10);
  ctx.fillStyle = '#111'; ctx.fillRect(x - 48, y - 40, 10, 34); ctx.fillRect(x + 38, y - 40, 10, 34);
  ctx.fillRect(x - 48, y + 20, 10, 34); ctx.fillRect(x + 38, y + 20, 10, 34);
  ctx.restore();
}
let last = performance.now();
function draw(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
  if (shake > 0.5) ctx.translate((Math.random() - .5) * shake, (Math.random() - .5) * shake);
  ctx.fillStyle = '#0a0718'; ctx.fillRect(-40, -40, W + 80, H + 80);
  ctx.fillStyle = '#0d0a20'; ctx.fillRect(0, 0, roadL - 40, H); ctx.fillRect(roadR + 40, 0, W - roadR, H);
  ctx.fillStyle = '#171330'; ctx.fillRect(roadL - 40, 0, roadR - roadL + 80, H);
  ctx.fillStyle = '#b26bff'; ctx.fillRect(roadL - 44, 0, 5, H); ctx.fillRect(roadR + 39, 0, 5, H);
  ctx.fillStyle = '#3d3370';
  for (let l = 1; l < 4; l++) {
    const x = roadL + (roadR - roadL) * l / 4;
    for (let y = -80 + roadOff; y < H + 80; y += 80) ctx.fillRect(x - 4, y, 8, 44);
  }
  // loop progress bar
  ctx.fillStyle = '#2a2148'; ctx.fillRect(roadL - 40, 14, roadR - roadL + 80, 12);
  ctx.fillStyle = '#b26bff'; ctx.fillRect(roadL - 40, 14, (roadR - roadL + 80) * Math.min(1, loopT / LOOP_LEN), 12);
  coins.forEach(p => {
    ctx.save(); ctx.shadowColor = '#ffd700'; ctx.shadowBlur = 16;
    ctx.fillStyle = '#ffd700'; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill();
    ctx.shadowBlur = 0; ctx.fillStyle = '#8a6500'; ctx.fillRect(p.x - 3, p.y - 9, 6, 18);
    ctx.restore();
  });
  enemies.forEach(e => drawCar(e.x, e.y, e.c, false));
  const gi = Math.floor(loopT * 60);
  ghostObjs.forEach((g, i) => {
    const gx = g.path[Math.min(gi, g.path.length - 1)];
    if (gx === undefined) return;
    drawCar(gx, g.y, ghosts[ghosts.length - ghostObjs.length + i] ? ghosts[ghosts.length - ghostObjs.length + i].color : '#00ff9d', true);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 20px system-ui'; ctx.fillText('GHOST ' + (i + 1), gx - 44, g.y - 86);
  });
  if (state !== 'dead') drawCar(car.x, car.y, '#b26bff', false);
  parts.forEach(p => { ctx.globalAlpha = Math.min(1, p.life / 22); ctx.fillStyle = p.c; ctx.fillRect(p.x, p.y, p.s, p.s); ctx.globalAlpha = 1; });
  // countdown
  ctx.fillStyle = '#fff'; ctx.font = 'bold 26px system-ui';
  ctx.fillText(Math.max(0, LOOP_LEN - loopT).toFixed(1) + 's', roadL - 30, 60);
  if (flash) {
    ctx.globalAlpha = Math.min(1, flash.life / 40);
    ctx.fillStyle = '#fff'; ctx.font = '900 64px system-ui'; ctx.textAlign = 'center';
    ctx.fillText(flash.t, W / 2, H / 2 - 60); ctx.textAlign = 'left'; ctx.globalAlpha = 1;
  }
  update(dt);
  requestAnimationFrame(draw);
}
resetAll(); loopEl.textContent = '1';
requestAnimationFrame(draw);
})();
