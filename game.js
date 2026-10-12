const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

// Logical game size - same on iPhone + laptop, scaled to screen
const W = 960, H = 540;
const GROUND_H = 80;
const GROUND_Y = H - GROUND_H;
let SCALE = 1, DPR = 1;

function resize() {
  const rect = canvas.getBoundingClientRect();
  DPR = Math.min(window.devicePixelRatio || 1, 3);
  canvas.width = Math.max(1, Math.round(rect.width * DPR));
  canvas.height = Math.max(1, Math.round(rect.height * DPR));
  SCALE = canvas.width / W;
}
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => setTimeout(resize, 200));
setTimeout(resize, 50);

let running = false, score = 0, best = +(localStorage.getItem('mr_best') || 0);
let frame = 0, speed = 5, coins = 0;
let player = { x: 110, y: 0, w: 46, h: 46, vy: 0, jumping: false };
const GRAV = 0.9;
let obstacles = [];
let groundY = GROUND_Y - 46;

function playerGround() { return GROUND_Y - player.h; }

function reset() {
  score = 0; coins = 0; speed = 6; obstacles = []; frame = 0;
  player.y = playerGround(); player.vy = 0; player.jumping = false;
  document.getElementById('score').textContent = '0';
  document.getElementById('best').textContent = 'BEST ' + best;
}
function jump() {
  if (!running) { start(); return; }
  if (!player.jumping) { player.vy = -16; player.jumping = true; }
}
function start() {
  resize();
  reset();
  running = true;
  document.getElementById('overlay').classList.add('hidden');
}
function gameOver() {
  running = false;
  if (score > best) { best = Math.floor(score); localStorage.setItem('mr_best', best); }
  const o = document.getElementById('overlay');
  o.classList.remove('hidden');
  o.innerHTML = `<h2>GAME OVER</h2><p>Score ${Math.floor(score)} • Best ${best} • Coins ${coins}</p>
  <button class="btn" onclick="start()">PLAY AGAIN</button>
  <button class="btn secondary" onclick="revive()">REVIVE</button>`;
  try { maybeShowInterstitial(() => {}); } catch(e){}
}
function revive() {
  obstacles = [];
  running = true;
  document.getElementById('overlay').classList.add('hidden');
}
function spawn() {
  const h = 34 + Math.random() * 56;
  const w = 26 + Math.random() * 30;
  obstacles.push({ x: W + 10, w, h, y: GROUND_Y - h });
  if (Math.random() < 0.6) obstacles.push({ x: W + 140 + Math.random()*120, w: 24, h: 24, y: GROUND_Y - 120 - Math.random()*180, coin: true });
}
function update() {
  frame++;
  if (running) {
    // faster on big screen feels same: speed scaled to W
    score += 0.22; speed = 6 + score / 350;
    if (frame % 65 === 0) spawn();
    player.vy += GRAV; player.y += player.vy;
    const gy = playerGround();
    if (player.y >= gy) { player.y = gy; player.vy = 0; player.jumping = false; }
    for (let i = obstacles.length - 1; i >= 0; i--) {
      let o = obstacles[i]; o.x -= speed;
      if (o.x + o.w < -20) { obstacles.splice(i, 1); continue; }
      if (!o.coin && player.x < o.x + o.w - 6 && player.x + player.w - 6 > o.x && player.y + 4 < o.y + o.h && player.y + player.h > o.y) {
        gameOver(); break;
      }
      if (o.coin && player.x < o.x + o.w && player.x + player.w > o.x && player.y < o.y + o.h && player.y + player.h > o.y) {
        coins++; obstacles.splice(i, 1);
      }
    }
    document.getElementById('score').textContent = Math.floor(score);
  }
}
function draw() {
  // scale logical -> device pixels
  ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
  ctx.clearRect(0, 0, W, H);
  // sky grid
  ctx.fillStyle = '#0a0e1a'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#16213e'; ctx.fillRect(0, 0, W, GROUND_Y);
  // stars / dots parallax
  ctx.fillStyle = '#334155';
  for (let i = 0; i < 40; i++) {
    let x = (i * 173 - frame * speed * 1.2) % W; if (x < 0) x += W;
    let y = 30 + (i * 61) % (GROUND_Y - 60);
    ctx.fillRect(x, y, 4, 4);
  }
  // ground
  ctx.fillStyle = '#00ff9d'; ctx.fillRect(0, GROUND_Y, W, 4);
  ctx.fillStyle = '#1e293b'; ctx.fillRect(0, GROUND_Y + 4, W, GROUND_H);
  ctx.fillStyle = '#0f172a';
  for (let x = -((frame*speed)%60); x < W; x += 60) ctx.fillRect(x, GROUND_Y+20, 30, 8);
  // player
  ctx.fillStyle = '#00ff9d';
  const squash = player.jumping ? 0 : 1 + Math.sin(frame*0.3)*0.03;
  ctx.fillRect(player.x, player.y, player.w, player.h * squash);
  ctx.fillStyle = '#00331c'; ctx.fillRect(player.x+8, player.y+10, 12, 12);
  ctx.fillStyle = '#fff'; ctx.fillRect(player.x+30, player.y+10, 8, 8);
  // obstacles
  obstacles.forEach(o => {
    if (o.coin) {
      ctx.fillStyle = '#ffd700'; ctx.beginPath(); ctx.arc(o.x+12, o.y+12, 12, 0, 7); ctx.fill();
      ctx.fillStyle = '#7a5a00'; ctx.fillRect(o.x+9, o.y+5, 6, 14);
    } else {
      ctx.fillStyle = '#ff3355'; ctx.fillRect(o.x, o.y, o.w, o.h);
      ctx.fillStyle = '#7a0f22'; ctx.fillRect(o.x, o.y, o.w, 6);
    }
  });
  requestAnimationFrame(() => { update(); draw(); });
}
document.addEventListener('keydown', e => { if (e.code === 'Space' || e.code === 'ArrowUp') { e.preventDefault(); jump(); }});
canvas.addEventListener('pointerdown', e => { e.preventDefault(); jump(); });
document.addEventListener('touchmove', e => { if (e.target === canvas) e.preventDefault(); }, { passive: false });
document.getElementById('best').textContent = 'BEST ' + best;
reset();
draw();
try { updateEarningsUI(); } catch(e){}
