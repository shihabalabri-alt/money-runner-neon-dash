// 1. PASTE YOUR ADSENSE ID HERE WHEN YOU GET IT
// How you get real money (no one can store it for you):
// 1) Host this folder free on Netlify/Vercel -> get https:// your link
// 2) Buy a domain (~$12/yr) + get traffic (TikTok/YouTube Shorts)
// 3) Apply at google.com/adsense -> get ca-pub-XXXX
// 4) Paste it below, set ENABLED=true, re-deploy
// 5) Google pays DIRECT to your bank/card at $100 threshold. No middleman.
// Until then, SIMULATION_MODE shows you what you WOULD earn.

const ADS_CONFIG = {
  ADSENSE_CLIENT: "ca-pub-XXXX", // <-- replace this
  SLOTS: {
    top: "1234567890",
    bottom: "1234567891",
    interstitial: "1234567892",
    rewarded: "1234567893"
  },
  ENABLED: false, // set true after AdSense approval
  SIMULATION_MODE: false, // ads closed - no fake $ counting
  ADS_VISIBLE: false, // false = hide all ads
  SIM_CPM: 3.50, // $3.50 per 1000 ad views (average)
  INTERSTITIAL_EVERY_X_GAMEOVERS: 999999 // effectively off
};

// Simulated balance - DEMO ONLY. Real balance lives in your AdSense dashboard.
const Earnings = {
  key: 'money_runner_sim_balance',
  get() {
    return parseFloat(localStorage.getItem(this.key) || '0');
  },
  addView() {
    if (!ADS_CONFIG.SIMULATION_MODE) return this.get();
    const v = this.get() + (ADS_CONFIG.SIM_CPM / 1000);
    localStorage.setItem(this.key, v.toFixed(4));
    updateEarningsUI();
    return v;
  },
  reset() {
    localStorage.setItem(this.key, '0');
    updateEarningsUI();
  }
};

function updateEarningsUI() {
  const els = document.querySelectorAll('.sim-balance');
  els.forEach(e => e.textContent = '$' + Earnings.get().toFixed(4));
}

// Call this on every banner load + interstitial show
function trackAdImpression(slotName) {
  // If real ads enabled, AdSense counts it automatically.
  // This is only for demo:
  Earnings.addView();
  console.log('[Ads] impression:', slotName);
}

// Interstitial logic - called by game.js on game over
let gameOverCount = 0;
function maybeShowInterstitial(onClose) {
  if (ADS_CONFIG.ADS_VISIBLE === false) { onClose(); return; }
  gameOverCount++;
  if (gameOverCount % ADS_CONFIG.INTERSTITIAL_EVERY_X_GAMEOVERS !== 0) {
    onClose();
    return;
  }
  const modal = document.getElementById('interstitial');
  modal.classList.add('show');
  trackAdImpression('interstitial');
  // Countdown 5s (like real ads)
  let s = 5;
  const btn = document.getElementById('inter-close');
  btn.textContent = `Close in ${s}s`;
  btn.disabled = true;
  const iv = setInterval(() => {
    s--;
    if (s <= 0) {
      clearInterval(iv);
      btn.textContent = 'Close Ad';
      btn.disabled = false;
    } else btn.textContent = `Close in ${s}s`;
  }, 1000);
  btn.onclick = () => {
    modal.classList.remove('show');
    onClose();
  };
}

function loadRealAdsense() {
  if (!ADS_CONFIG.ENABLED) return;
  const s = document.createElement('script');
  s.async = true;
  s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADS_CONFIG.ADSENSE_CLIENT}`;
  s.crossOrigin = 'anonymous';
  document.head.appendChild(s);
}

window.addEventListener('DOMContentLoaded', () => {
  updateEarningsUI();
  if (ADS_CONFIG.ADS_VISIBLE === false) {
    document.querySelectorAll('.ad-slot, #earn, #interstitial').forEach(e => e.style.display = 'none');
    return;
  }
  loadRealAdsense();
  // Simulate banner impressions
  trackAdImpression('top-banner');
  trackAdImpression('bottom-banner');
});
