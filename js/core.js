'use strict';
// Gemeinsame Basis: Helfer, Spieler + Chips, Sound, Effekte, Einsatz-Bildschirm.
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const app = $('#app');
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const rnd = n => Math.floor(Math.random() * n);
const pick = a => a[rnd(a.length)];
const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const range = n => [...Array(n).keys()];
const fmt = n => Math.round(n).toLocaleString('de-DE');
const COLORS = ['#ff4d6d', '#4dabff', '#3ddc84', '#ffc93c', '#c77dff', '#ff9f43', '#2ee6d6', '#ff7ac6'];

const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  del(k) { try { localStorage.removeItem(k); } catch {} },
};

// Registrierung der Spiele: { id, em, name, desc, min, max, start(ps), bg? }
const CASINO = [];
const PARTY = [];

// ---------- Spieler & Chips ----------
const START_CHIPS = 1000;
let players = (store.get('bc_players', null) || store.get('bb_players', ['Spieler 1', 'Spieler 2', 'Spieler 3']))
  .map(p => typeof p === 'string' ? { name: p, chips: START_CHIPS } : p);
const savePlayers = () => store.set('bc_players', players);
const chips = i => players[i].chips;
// Level: jeder gesetzte Chip gibt 1 XP. Aufstieg bringt Level × 100 Bonus-Chips.
const lvlNeed = l => 300 * l * (l + 1) / 2;
const levelOf = xp => { let l = 1; while (xp >= lvlNeed(l)) l++; return l; };
const lvlProgress = xp => { const l = levelOf(xp), a = l > 1 ? lvlNeed(l - 1) : 0; return (xp - a) / (lvlNeed(l) - a); };
function addChips(i, d) {
  const p = players[i];
  p.chips = Math.max(0, Math.round(p.chips + d));
  if (d < 0) {
    const before = levelOf(p.xp || 0);
    p.xp = (p.xp || 0) - d;
    const after = levelOf(p.xp);
    if (after > before) { p.chips += after * 100; setTimeout(() => levelUp(i, after), 500); }
  }
  savePlayers();
}
function levelUp(i, l) {
  const o = document.createElement('div');
  o.className = 'lvlup';
  o.style.setProperty('--c', COLORS[i]);
  o.innerHTML = `<b>LEVEL UP!</b><span>${esc(players[i].name)} ist jetzt Level ${l}</span><em>+${fmt(l * 100)} Chips</em>`;
  document.body.appendChild(o);
  sfx.winBig(2); buzz([40, 30, 80]);
  setTimeout(() => o.classList.add('out'), 2600); setTimeout(() => o.remove(), 3000);
}
const asPlayers = idx => idx.map(i => ({ i, name: players[i].name, color: COLORS[i] }));
// Party-Siege geben Bonus-Chips
function addWin(names, amount = 100) {
  names.forEach(n => { const i = players.findIndex(p => p.name === n); if (i >= 0) addChips(i, amount); });
  if (names.length) toast(`+${amount} Chips für ${names.join(', ')}`);
}

// ---------- Timer ----------
let timers = [];
const later = (fn, ms) => { const id = setTimeout(fn, ms); timers.push(id); return id; };
const every = (fn, ms) => { const id = setInterval(fn, ms); timers.push(id); return id; };
function stopAll() { timers.forEach(id => { clearTimeout(id); clearInterval(id); }); timers = []; }
const wait = ms => new Promise(r => later(r, ms));

// ---------- Sound ----------
// Alles synthetisch über WebAudio (offline), mit Kompressor für mehr Wumms.
let ac = null, master = null, muted = store.get('bb_muted', false);
function audio() {
  if (!ac) {
    ac = new (window.AudioContext || window.webkitAudioContext)();
    const comp = ac.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 6; comp.attack.value = .003; comp.release.value = .2;
    master = ac.createGain(); master.gain.value = .9;
    master.connect(comp).connect(ac.destination);
  }
  if (ac.state === 'suspended') ac.resume();
  return ac;
}
function beep(freq, dur = .12, type = 'sine', vol = .15, slide = 0, delay = 0) {
  if (muted) return;
  try {
    const a = audio(), o = a.createOscillator(), g = a.createGain(), t = a.currentTime + delay;
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq * slide), t + dur);
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + .005);
    g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(g).connect(master); o.start(t); o.stop(t + dur + .02);
  } catch {}
}
function noise(dur = .08, vol = .12, hp = 2000, delay = 0, lp = 0) {
  if (muted) return;
  try {
    const a = audio(), b = a.createBuffer(1, Math.max(1, a.sampleRate * dur), a.sampleRate), d = b.getChannelData(0);
    for (let k = 0; k < d.length; k++) d[k] = (Math.random() * 2 - 1) * Math.pow(1 - k / d.length, 2);
    const s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
    f.type = 'highpass'; f.frequency.value = hp; g.gain.value = vol;
    let node = s.connect(f);
    if (lp) { const l = a.createBiquadFilter(); l.type = 'lowpass'; l.frequency.value = lp; node = node.connect(l); }
    s.buffer = b; node.connect(g).connect(master); s.start(a.currentTime + delay);
  } catch {}
}
// Glocke: Grundton + unharmonische Obertöne
const bell = (f, vol = .08, delay = 0, dur = .5) => { beep(f, dur, 'sine', vol, 0, delay); beep(f * 2.76, dur * .6, 'sine', vol * .4, 0, delay); beep(f * 5.4, dur * .3, 'sine', vol * .2, 0, delay); };
const NOTES = [523.3, 587.3, 659.3, 784, 880, 1046.5, 1174.7, 1318.5, 1568, 1760, 2093];
const sfx = {
  go: () => beep(880, .15, 'square', .08),
  win: () => { bell(784, .1); bell(1175, .1, .09); bell(1568, .09, .18, .7); },
  bad: () => beep(150, .3, 'sawtooth', .1, .7),
  tick: () => beep(520, .05, 'sine', .08),
  pop: () => { noise(.6, .5, 40, 0, 900); beep(90, .5, 'sawtooth', .25, .3); beep(55, .7, 'sine', .4, .5); },
  chip: () => { noise(.03, .25, 2500); noise(.04, .18, 3500, .035); beep(3200, .03, 'triangle', .04, 0, .01); },
  card: () => { noise(.12, .16, 900, 0, 6000); },
  flip: () => { noise(.05, .2, 1800); beep(1400, .04, 'triangle', .04, .6, .02); },
  click: () => beep(1800, .025, 'square', .04),
  coin: () => { bell(1976, .06); bell(2637, .06, .07); },
  cash: () => { noise(.05, .25, 3000); bell(2093, .1, .05, .6); bell(2637, .09, .12, .8); beep(150, .08, 'square', .06, .5); },
  lose: () => { beep(392, .18, 'triangle', .14); beep(311, .2, 'triangle', .14, 0, .17); beep(233, .45, 'triangle', .14, .9, .34); },
  jackpot: () => { [0, 2, 4, 5, 7, 9, 10].forEach((n, k) => bell(NOTES[n], .09, k * .09)); [5, 7, 10].forEach((n, k) => beep(NOTES[n], .9, 'square', .035, 0, .7 + k * .02)); },
  whoosh: () => { noise(.4, .12, 400, 0, 3000); beep(200, .4, 'sawtooth', .04, 6); },
  // Spannung: p von 0 bis 1 (z. B. im Takt aufrufen)
  rise: (p = 0) => beep(180 + p * 900, .12, 'sawtooth', .025 + p * .03, 1.06),
  // Gewinn-Fanfare, länger und größer je nach Stufe 1–3
  winBig: (level = 1) => {
    const seq = level >= 3 ? [0, 2, 4, 7, 4, 7, 9, 10] : level === 2 ? [0, 2, 4, 7, 9] : [2, 4, 7];
    seq.forEach((n, k) => { bell(NOTES[n], .09, k * .085); beep(NOTES[n] / 2, .12, 'square', .03, 0, k * .085); });
    const end = seq.length * .085;
    if (level >= 2) [0, 4, 7].forEach(n => beep(NOTES[n], .7, 'triangle', .05, 0, end));
    for (let k = 0; k < level * 6; k++) bell(1800 + Math.random() * 1600, .035, end + k * .05, .25);
  },
};
const buzz = p => { try { navigator.vibrate && navigator.vibrate(p); } catch {} };

// ---------- Bildschirm an, Gesten ----------
let wakeLock = null;
async function keepAwake() {
  try { if (!wakeLock && navigator.wakeLock && document.visibilityState === 'visible') { wakeLock = await navigator.wakeLock.request('screen'); wakeLock.addEventListener('release', () => wakeLock = null); } } catch {}
}
document.addEventListener('visibilitychange', keepAwake);
document.addEventListener('pointerdown', keepAwake, { passive: true });
document.addEventListener('touchmove', e => { if (e.target.closest('.arena,.nomove')) e.preventDefault(); }, { passive: false });
document.addEventListener('contextmenu', e => e.preventDefault());

// ---------- UI-Helfer ----------
function toast(msg) {
  let t = $('#toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; document.body.appendChild(t); }
  t.textContent = msg; t.classList.add('on');
  clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('on'), 1800);
}
const BACK = '<button class="back" id="back">‹ Lobby</button>';
function mount(html, keepScroll, cls = '') {
  app.innerHTML = `<div class="screen ${cls}">${html}</div>`;
  const b = $('#back'); if (b) b.onclick = home;
  if (!keepScroll) window.scrollTo(0, 0);
}
const seg = (key, opts, val, fmtFn = v => v) =>
  `<div class="seg">${opts.map(o => `<button data-k="${key}" data-v='${JSON.stringify(o)}' class="${o === val ? 'on' : ''}">${fmtFn(o)}</button>`).join('')}</div>`;
function bindSeg(cfg, redraw) { $$('.seg button').forEach(b => b.onclick = () => { cfg[b.dataset.k] = JSON.parse(b.dataset.v); redraw(); }); }
const scoreRows = (ps, score) => range(ps.length).sort((a, b) => score[b] - score[a])
  .map(i => `<div class="krow"><span style="color:${ps[i].color};font-weight:700">${esc(ps[i].name)}</span><b>${score[i]}</b></div>`).join('');

// Casino-Chip als HTML. cls z. B. 'sm' oder 'lg'
const chipColor = v => v >= 1000 ? '#c9971c' : v >= 500 ? '#7d3cc8' : v >= 100 ? '#202020' : v >= 50 ? '#d1293f' : v >= 25 ? '#1f9d55' : '#2a6fdb';
const chipLabel = v => v >= 1000 ? (v / 1000) + 'K' : v;
const chipHTML = (v, cls = '') => `<span class="chip ${cls}" style="--cc:${chipColor(v)}">${chipLabel(v)}</span>`;
// Kleiner Stapel für einen Betrag (zerlegt in Chip-Werte)
function stackHTML(amount, max = 6) {
  const out = [];
  for (const v of [1000, 500, 100, 50, 25, 10]) while (amount >= v && out.length < max) { out.push(v); amount -= v; }
  return `<span class="stack">${out.reverse().map((v, k) => `<span class="chip sm" style="--cc:${chipColor(v)};--k:${k}">${k === out.length - 1 ? chipLabel(v) : ''}</span>`).join('')}</span>`;
}
const balHTML = i => `<span class="bal">${fmt(chips(i))}</span>`;

// ---------- Einsatz-Bildschirm für mehrere Spieler ----------
// onDone(bets) – bets[k] gehört zu ps[k], 0 = setzt aus. Chips werden NICHT abgezogen, das macht das Spiel.
function betScreen({ title, sub = '', ps, min = 10, max = Infinity, onDone, confirm = 'Einsätze fertig' }) {
  const key = 'bc_lastbet';
  const last = store.get(key, {});
  const bets = ps.map(p => Math.min(chips(p.i), max, last[p.name] ?? Math.min(100, chips(p.i))));
  const draw = () => {
    mount(`${BACK}<h2 class="gold">${title}</h2>${sub ? `<p class="sub">${sub}</p>` : ''}
      ${ps.map((p, k) => {
        const broke = chips(p.i) < min;
        return `<div class="betrow ${broke ? 'broke' : ''}" style="--c:${p.color}">
          <div class="bethead"><b>${esc(p.name)}</b><span class="mut">Guthaben ${balHTML(p.i)}</span></div>
          ${broke ? '<div class="mut">Pleite – setzt aus 💸</div>' : `
          <div class="betmain"><div class="betamt">${bets[k] ? stackHTML(bets[k]) : ''}<b>${bets[k] ? fmt(bets[k]) : 'setzt aus'}</b></div>
            <button class="mini" data-clr="${k}">✕</button></div>
          <div class="chiprow">${[10, 50, 100, 500].map(v => `<button class="chipbtn" data-k="${k}" data-v="${v}" ${bets[k] + v > Math.min(chips(p.i), max) ? 'disabled' : ''}>${chipHTML(v)}</button>`).join('')}
            <button class="allin" data-all="${k}">ALL IN</button></div>`}
        </div>`;
      }).join('')}
      <button class="btn" id="go" ${bets.some(b => b >= min) ? '' : 'disabled'}>${confirm}</button>`, true);
    $$('.chipbtn').forEach(b => b.onclick = () => { bets[+b.dataset.k] += +b.dataset.v; sfx.chip(); draw(); });
    $$('[data-clr]').forEach(b => b.onclick = () => { bets[+b.dataset.clr] = 0; sfx.click(); draw(); });
    $$('[data-all]').forEach(b => b.onclick = () => { const k = +b.dataset.all; bets[k] = Math.min(chips(ps[k].i), max); sfx.chip(); buzz(30); draw(); });
    $('#go').onclick = () => {
      const fin = bets.map(b => b >= min ? b : 0);
      const memo = store.get(key, {}); ps.forEach((p, k) => memo[p.name] = fin[k]); store.set(key, memo);
      onDone(fin);
    };
  };
  draw();
}

// ---------- Effekte: Münzregen, Konfetti, Gewinn-Banner ----------
const fx = (() => {
  let cv, ctx, parts = [], running = false, W = 0, H = 0, dpr = 1;
  const ensure = () => {
    if (cv && document.body.contains(cv)) return;
    cv = document.createElement('canvas'); cv.id = 'fx'; document.body.appendChild(cv);
    ctx = cv.getContext('2d'); resize();
  };
  const resize = () => { if (!cv) return; dpr = Math.min(2, devicePixelRatio || 1); W = innerWidth; H = innerHeight; cv.width = W * dpr; cv.height = H * dpr; };
  addEventListener('resize', resize);
  const loop = () => {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    parts = parts.filter(p => p.y < H + 60 && p.life-- > 0);
    for (const p of parts) {
      p.vy += p.g; p.vx *= .995; p.x += p.vx; p.y += p.vy; p.rot += p.vr;
      ctx.save(); ctx.translate(p.x, p.y);
      if (p.coin) {
        const sx = Math.cos(p.rot);
        ctx.scale(Math.abs(sx) < .08 ? .08 : sx, 1);
        const g = ctx.createRadialGradient(-p.r * .3, -p.r * .3, 1, 0, 0, p.r);
        g.addColorStop(0, '#fff6c2'); g.addColorStop(.45, '#f7c948'); g.addColorStop(1, '#a8740c');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, p.r, 0, 7); ctx.fill();
        ctx.strokeStyle = '#8a5d06'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, 0, p.r * .72, 0, 7); ctx.stroke();
      } else {
        ctx.rotate(p.rot); ctx.fillStyle = p.color; ctx.fillRect(-p.r, -p.r * .45, p.r * 2, p.r * .9);
      }
      ctx.restore();
    }
    if (parts.length) requestAnimationFrame(loop); else { running = false; ctx.clearRect(0, 0, W, H); }
  };
  const start = () => { if (!running) { running = true; requestAnimationFrame(loop); } };
  const coins = (n = 60, from) => {
    ensure();
    for (let k = 0; k < n; k++) {
      const burst = from || { x: W / 2, y: H * .45 };
      parts.push({ coin: true, x: burst.x + (Math.random() - .5) * 40, y: burst.y, vx: (Math.random() - .5) * 14, vy: -8 - Math.random() * 12, g: .45, r: 8 + Math.random() * 8, rot: Math.random() * 6, vr: .15 + Math.random() * .3, life: 260 });
    }
    start();
  };
  const confetti = (n = 140) => {
    ensure();
    const cols = ['#f7c948', '#ff2bd6', '#22e4ff', '#3ddc84', '#ff4d6d', '#ffffff'];
    for (let k = 0; k < n; k++) parts.push({ x: Math.random() * W, y: -20 - Math.random() * H * .5, vx: (Math.random() - .5) * 3, vy: 2 + Math.random() * 3, g: .04, r: 4 + Math.random() * 4, rot: Math.random() * 6, vr: (Math.random() - .5) * .3, color: pick(cols), life: 400 });
    start();
  };
  // Großes Gewinn-Banner. Tippen schließt. Gibt ein Promise zurück.
  const win = ({ title = 'GEWONNEN!', amount = 0, sub = '', big = false } = {}) => new Promise(res => {
    const o = document.createElement('div');
    o.className = 'winbanner' + (big ? ' big' : '');
    o.innerHTML = `<div class="wb-in"><div class="wb-title">${title}</div>${amount ? `<div class="wb-amt">+<span>0</span></div>` : ''}${sub ? `<div class="wb-sub">${sub}</div>` : ''}</div>`;
    document.body.appendChild(o);
    big ? sfx.jackpot() : sfx.winBig(amount >= 1000 ? 2 : 1); sfx.cash(); buzz(big ? [60, 40, 60, 40, 120] : 60);
    coins(big ? 140 : 60); if (big) confetti();
    const span = $('.wb-amt span', o), t0 = performance.now();
    if (span) { const step = t => { const p = Math.min(1, (t - t0) / 900); span.textContent = fmt(amount * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(step); }; requestAnimationFrame(step); }
    let done = false;
    const close = () => { if (done) return; done = true; o.classList.add('out'); setTimeout(() => { o.remove(); res(); }, 250); };
    o.onclick = close; setTimeout(close, big ? 3200 : 2200);
  });
  return { coins, confetti, win };
})();

const shake = (el = app) => { el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); };
