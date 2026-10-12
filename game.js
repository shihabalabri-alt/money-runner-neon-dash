const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
function fit(){ canvas.width = 480; canvas.height = 320; }
fit();

let running=false, score=0, best=+(localStorage.getItem('mr_best')||0);
let frame=0, speed=4, coins=0;
let player={x:60,y:250,w:30,h:30,vy:0,jumping:false};
let obstacles=[], particles=[];
const GRAV=0.7, GROUND=260;

function reset(){
  score=0; coins=0; speed=4; obstacles=[]; particles=[];
  player.y=250; player.vy=0;
  document.getElementById('score').textContent='0';
  document.getElementById('best').textContent='BEST '+best;
}
function jump(){
  if(!running){ start(); return; }
  if(!player.jumping){ player.vy=-12; player.jumping=true; }
}
function start(){
  reset();
  running=true;
  document.getElementById('overlay').classList.add('hidden');
}
function gameOver(){
  running=false;
  if(score>best){ best=Math.floor(score); localStorage.setItem('mr_best',best); }
  const o=document.getElementById('overlay');
  o.classList.remove('hidden');
  o.innerHTML=`<h2>GAME OVER</h2><p>Score ${Math.floor(score)} • Best ${best} • Coins ${coins}</p>
  <button class="btn" onclick="start()">PLAY AGAIN (ad every 3rd)</button>
  <button class="btn secondary" onclick="revive()">REVIVE ▶ Watch Ad</button>`;
  maybeShowInterstitial(()=>{});
}
function revive(){
  // Rewarded ad simulation
  trackAdImpression('rewarded');
  alert('Rewarded Ad (demo 3s)... Revived!');
  obstacles=[];
  running=true;
  document.getElementById('overlay').classList.add('hidden');
}
function spawn(){
  const h = 20+Math.random()*30;
  obstacles.push({x:480,w:20+Math.random()*20,h,y:GROUND+30-h});
  if(Math.random()<0.5) obstacles.push({x:560,w:16,h:16,y:200+Math.random()*40,coin:true});
}
function update(){
  frame++;
  if(running){
    score+=0.15; speed=4+score/400;
    if(frame%70===0) spawn();
    // physics
    player.vy+=GRAV; player.y+=player.vy;
    if(player.y>=250){ player.y=250; player.vy=0; player.jumping=false; }
    // obstacles
    for(let i=obstacles.length-1;i>=0;i--){
      let o=obstacles[i]; o.x-=speed;
      if(o.x+o.w<0) obstacles.splice(i,1);
      // collision
      if(!o.coin && player.x<o.x+o.w && player.x+player.w>o.x && player.y<o.y+o.h && player.y+player.h>o.y){
        gameOver(); break;
      }
      if(o.coin && player.x<o.x+o.w && player.x+player.w>o.x && player.y<o.y+o.h && player.y+player.h>o.y){
        coins++; obstacles.splice(i,1);
      }
    }
    document.getElementById('score').textContent=Math.floor(score);
  }
}
function draw(){
  ctx.clearRect(0,0,480,320);
  // ground
  ctx.fillStyle='#00ff9d'; ctx.fillRect(0,GROUND+30,480,3);
  ctx.fillStyle='#1e293b'; ctx.fillRect(0,GROUND+33,480,60);
  // player
  ctx.fillStyle='#00ff9d';
  ctx.fillRect(player.x,player.y,player.w,player.h);
  ctx.fillStyle='#fff'; ctx.fillRect(player.x+18,player.y+6,6,6);
  // obstacles
  obstacles.forEach(o=>{
    if(o.coin){ ctx.fillStyle='#ffd700'; ctx.beginPath(); ctx.arc(o.x+8,o.y+8,8,0,7); ctx.fill(); }
    else { ctx.fillStyle='#ff3355'; ctx.fillRect(o.x,o.y,o.w,o.h); }
  });
  // parallax dots
  ctx.fillStyle='#334155';
  for(let i=0;i<20;i++){ let x=(i*90 - frame*speed)%480; ctx.fillRect(x<0?x+480:x, 40+(i*37)%180, 3,3); }
  requestAnimationFrame(()=>{ update(); draw(); });
}
document.addEventListener('keydown',e=>{ if(e.code==='Space'||e.code==='ArrowUp'){ e.preventDefault(); jump(); }});
canvas.addEventListener('pointerdown',jump);
draw();
updateEarningsUI();
