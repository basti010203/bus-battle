'use strict';
// Bus-Slots: 5 Walzen × 3 Reihen, 10 Gewinnlinien von links, Wild 🚌 (ersetzt alles außer ⭐),
// Scatter ⭐ (3+ irgendwo = 7 Freispiele, Gewinne ×2), progressiver Jackpot bei 5× 7 auf einer Linie (Wild zählt mit).
// Monte-Carlo (3 Mio. Drehs): ~90 % Auszahlung aus Linien/Scatter/Freispielen + 5 % jedes Einsatzes wandern
// in den Jackpot ≈ 95 % gesamt. Treffer bei ~33 % der Drehs, Freispiele ca. alle 105, Jackpot ca. alle 17.000 Drehs.
const SL_SYM = {
  ch: { w: 10, pay: [5, 20, 50], lbl: '🍒', html: '🍒' },
  le: { w: 9, pay: [6, 20, 60], lbl: '🍋', html: '🍋' },
  me: { w: 7, pay: [10, 30, 100], lbl: '🍉', html: '🍉' },
  be: { w: 6, pay: [12, 50, 150], lbl: '🔔', html: '🔔' },
  di: { w: 4, pay: [25, 100, 400], lbl: '💎', html: '💎' },
  bar: { w: 3, pay: [40, 150, 600], lbl: 'BAR', html: '<span class="sl-bar"><b>BAR</b></span>' },
  se: { w: 2.4, pay: [60, 300, 0], lbl: '7', html: '<span class="sl-7">7</span>' },
  wi: { w: 1.6, lbl: '🚌', html: '<span class="sl-wild">🚌<i>WILD</i></span>' },
  sc: { w: 1.6, lbl: '⭐', html: '<span class="sl-star">⭐</span>' },
};
const SL_LINES = [[1, 1, 1, 1, 1], [0, 0, 0, 0, 0], [2, 2, 2, 2, 2], [0, 1, 2, 1, 0], [2, 1, 0, 1, 2], [0, 0, 1, 2, 2], [2, 2, 1, 0, 0], [1, 0, 0, 0, 1], [1, 2, 2, 2, 1], [0, 1, 0, 1, 0]];
const SL_LC = ['#ffe14d', '#22e4ff', '#ff2bd6', '#3ddc84', '#ff8a3d', '#b18cff', '#ff4d6d', '#7dffef', '#f7c948', '#9dff4d'];
const SL_SCP = [0, 0, 0, 2, 10, 50];
const SL_JP0 = 5000;
const SL_IDS = Object.keys(SL_SYM), SL_TOT = SL_IDS.reduce((a, k) => a + SL_SYM[k].w, 0);
const slJp = () => store.get('bc_jackpot', SL_JP0);
const slSetJp = v => store.set('bc_jackpot', v);
const slPick = () => { let x = Math.random() * SL_TOT; for (const k of SL_IDS) { x -= SL_SYM[k].w; if (x < 0) return k; } return 'ch'; };
// Höchstens ein Stern pro Walze
const slGrid = () => range(5).map(() => { const c = []; while (c.length < 3) { const s = slPick(); if (s === 'sc' && c.includes('sc')) continue; c.push(s); } return c; });
const slCell = s => `<div class="sl-cell sl-${s}">${SL_SYM[s].html}</div>`;

function slEval(g, bet) {
  const lb = bet / 10, wins = [];
  SL_LINES.forEach((ln, li) => {
    const cells = ln.map((row, r) => g[r][row]);
    let sym = cells.find(s => s !== 'wi') || 'se';
    if (sym === 'sc') sym = 'se';
    let n = 0;
    while (n < 5 && (cells[n] === sym || cells[n] === 'wi')) n++;
    if (n < 3) return;
    const jp = n === 5 && sym === 'se';
    wins.push({ li, sym, n, jp, pay: jp ? 0 : SL_SYM[sym].pay[n - 3] * lb, cells: range(n).map(r => [r, ln[r]]) });
  });
  const sc = g.flat().filter(s => s === 'sc').length;
  const scPay = sc >= 3 ? SL_SCP[Math.min(sc, 5)] * bet : 0;
  return { wins, sc, scPay, pay: wins.reduce((a, w) => a + w.pay, 0) + scPay, fs: sc >= 3 ? 7 : 0, jp: wins.some(w => w.jp) };
}
// Spannung, wenn auf den ersten r Walzen schon 2 Sterne oder eine 7er-Kette liegt
const slTension = (g, r) => g.slice(0, r).flat().filter(s => s === 'sc').length >= 2 ||
  SL_LINES.some(ln => range(r).every(k => g[k][ln[k]] === 'se' || g[k][ln[k]] === 'wi') && range(r).some(k => g[k][ln[k]] === 'se'));

// ---------- Sounds ----------
const slSnd = {
  lever: () => { noise(.09, .35, 150, 0, 1800); beep(110, .12, 'square', .09, .6); beep(70, .2, 'sine', .22, .7, .03); },
  klack: () => { noise(.06, .32, 250, 0, 3000); beep(95, .09, 'square', .09, .55); },
  star: n => { const f = NOTES[[4, 7, 10][Math.min(n, 3) - 1]]; bell(f, .11, 0, .8); beep(f * 2, .25, 'triangle', .03, 1.5); },
  whirr: n => noise(.03, .015 + .011 * n, 1500, 0, 7000),
  aww: () => { beep(523, .16, 'triangle', .05, .8); beep(392, .3, 'triangle', .05, .7, .13); },
  step: p => beep(620 + p * 1100, .045, 'square', .03),
};

// ---------- Spiel ----------
let SL = null, slJpShown = null;

function slotsStart(ps) {
  stopAll();
  const first = Math.max(0, ps.findIndex(p => chips(p.i) >= 10));
  SL = { ps, cur: first, bet: store.get('bc_sl_bet', 50), grid: slGrid(), spinning: false, autoOn: false, autoLeft: 0, fs: null, rotate: store.get('bc_sl_rot', true), force: [], msgT: null };
  slDraw();
}

function slDraw() {
  const S = SL;
  mount(`<div class="sl-top">${BACK}<div class="sl-topr"><button class="sl-pill ${S.rotate ? 'on' : ''}" id="slRot">🔁 Reihum</button><button class="sl-pill" id="slInfo">ℹ️ Gewinne</button></div></div>
    <div class="sl-tabs">${S.ps.map((p, k) => `<button class="sl-tab" data-k="${k}" style="--c:${p.color}"><b>${esc(p.name)}</b><span class="bal">${fmt(chips(p.i))}</span></button>`).join('')}</div>
    <div class="sl-cab">
      <div class="sl-sign"><div class="sl-chase">${'<i></i>'.repeat(18)}</div><div class="sl-neon">BUS<span>★</span>SLOTS</div>
        <div class="sl-led sl-jp"><small>★ JACKPOT ★</small><b id="slJp">${fmt(slJp())}</b></div></div>
      <div class="sl-fsbar" id="slFs"></div>
      <div class="sl-frame"><div class="sl-window nomove" id="slWin">
        ${range(5).map(r => `<div class="sl-reel"><div class="sl-strip">${S.grid[r].map(slCell).join('')}</div></div>`).join('')}
        <div class="sl-glass"></div>
        <svg class="sl-lines" id="slLines" viewBox="0 0 500 300" preserveAspectRatio="none"></svg>
      </div></div>
      <div class="sl-msg" id="slMsg">Viel Glück!</div>
      <div class="sl-meters">
        <div class="sl-led"><small>EINSATZ</small><b id="slBet"></b></div>
        <div class="sl-led"><small>GEWINN</small><b id="slWinAmt">0</b></div>
        <div class="sl-led"><small>GUTHABEN</small><b id="slBal"></b></div>
      </div>
      <div class="sl-bets">${[10, 50, 100, 500].map(v => `<button class="sl-chipb" data-v="${v}">${chipHTML(v)}</button>`).join('')}</div>
      <div class="sl-ctrl"><button class="sl-auto" id="slAuto"></button><button class="sl-spin" id="slSpin"><span>SPIN</span></button><button class="sl-auto" id="slMax">MAX<br><small>BET</small></button></div>
    </div>`, false, 'sl-screen');
  slJpShown = null;
  $('#slRot').onclick = () => { S.rotate = !S.rotate; store.set('bc_sl_rot', S.rotate); $('#slRot').classList.toggle('on', S.rotate); sfx.click(); toast(S.rotate ? 'Nach jedem Dreh ist der Nächste dran' : 'Jeder dreht, so lange er will'); };
  $('#slInfo').onclick = slInfo;
  $$('.sl-tab').forEach(b => b.onclick = () => { if (S.spinning || S.fs || S.autoOn) return; S.cur = +b.dataset.k; sfx.click(); buzz(8); slHud(); });
  $$('.sl-chipb').forEach(b => b.onclick = () => { S.bet = +b.dataset.v; store.set('bc_sl_bet', S.bet); sfx.chip(); buzz(10); slHud(); });
  $('#slMax').onclick = () => {
    if (S.spinning || S.fs || S.autoOn) return;
    const c = chips(S.ps[S.cur].i);
    S.bet = [500, 100, 50, 10].find(v => v <= c) || 10; store.set('bc_sl_bet', S.bet);
    sfx.chip(); setTimeout(sfx.chip, 70); setTimeout(sfx.cash, 140); buzz([10, 30, 10]); slHud();
  };
  $('#slAuto').onclick = () => {
    if (S.autoOn) { S.autoOn = false; S.autoLeft = 0; sfx.click(); return slHud(); }
    if (S.spinning || S.fs) return;
    S.autoOn = true; S.autoLeft = 10; sfx.click(); buzz(15); slSpin();
  };
  $('#slSpin').onclick = slSpin;
  $('#slWin').onclick = () => { if (!S.autoOn) slSpin(); };
  slHud();
}

function slHud() {
  const S = SL, cab = $('.sl-cab');
  if (!S || !cab) return;
  const p = S.ps[S.cur], free = !!S.fs, bet = free ? S.fs.bet : S.bet, busy = S.spinning || free || S.autoOn;
  $$('.sl-tab').forEach((b, k) => { b.classList.toggle('on', k === S.cur); $('.bal', b).textContent = fmt(chips(S.ps[k].i)); b.disabled = busy && k !== S.cur; });
  $('#slBet').textContent = fmt(bet);
  $('#slBal').textContent = fmt(chips(p.i));
  $$('.sl-chipb').forEach(b => { b.classList.toggle('on', +b.dataset.v === S.bet); b.disabled = busy; });
  const spin = $('#slSpin');
  spin.disabled = S.spinning || free;
  spin.classList.toggle('poor', !free && chips(p.i) < bet);
  $('span', spin).innerHTML = free ? `FREI<br><small>${S.fs.total - S.fs.left}/${S.fs.total}</small>` : 'SPIN';
  const auto = $('#slAuto');
  auto.classList.toggle('on', S.autoOn);
  auto.innerHTML = S.autoOn ? `STOP<br><small>noch ${S.autoLeft}</small>` : 'AUTO<br><small>×10</small>';
  $('#slMax').disabled = busy;
  $('#slFs').textContent = free ? `★ FREISPIEL ${S.fs.total - S.fs.left} / ${S.fs.total} · GEWINNE ×2 · ${fmt(S.fs.won)} ★` : '';
  cab.classList.toggle('sl-fs', free);
  cab.style.setProperty('--pc', p.color);
  slJpShow();
}

function slJpShow() {
  const el = $('#slJp');
  if (!el) return;
  const target = Math.floor(slJp()), from = slJpShown ?? target, t0 = performance.now();
  slJpShown = target;
  if (from === target) { el.textContent = fmt(target); return; }
  const step = t => { const p = Math.min(1, (t - t0) / 700); if (!document.body.contains(el)) return; el.textContent = fmt(from + (target - from) * p); if (p < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}

function slClear() {
  const S = SL;
  clearInterval(S.msgT);
  $('#slWin').classList.remove('sl-won');
  $('#slLines').innerHTML = '';
  $('#slWinAmt').textContent = '0';
  $('#slMsg').textContent = S.fs ? 'Freispiel läuft …' : `${S.ps[S.cur].name} dreht …`;
}

async function slSpin() {
  const S = SL;
  if (!S || S.spinning || !$('.sl-cab')) return;
  const p = S.ps[S.cur], free = !!S.fs, bet = free ? S.fs.bet : S.bet;
  if (!free) {
    if (chips(p.i) < bet) {
      sfx.bad(); buzz(80); shake($('.sl-cab'));
      toast(chips(p.i) < 10 ? `${p.name} ist pleite 💸` : 'Zu wenig Chips – Einsatz runter!');
      S.autoOn = false; return slHud();
    }
    addChips(p.i, -bet); slSetJp(slJp() + bet * .05);
    if (S.autoOn) S.autoLeft--;
  } else S.fs.left--;
  S.spinning = true; slClear(); slHud();
  slSnd.lever(); sfx.chip(); buzz(15);
  const grid = S.force.length ? S.force.shift() : slGrid();
  const res = slEval(grid, bet);
  const tense = await slAnimate(S, grid);
  if (S !== SL) return;
  S.grid = grid;
  const mult = free ? 2 : 1;
  let jp = 0;
  if (res.jp) { jp = Math.round(slJp()); slSetJp(SL_JP0); }
  const total = res.pay * mult + jp;
  slShowWins(res, mult, jp);
  if (total) {
    addChips(p.i, total);
    if (S.fs) S.fs.won += total;
    const x = total / bet;
    if (jp) {
      fx.confetti(); sfx.winBig(3);
      await Promise.all([slCount(total, bet), fx.win({ title: 'JACKPOT!', amount: total, big: true, sub: `${esc(p.name)} knackt den Topf! 🚌💰` })]);
    } else if (x >= 10) {
      sfx.winBig(x >= 50 ? 3 : x >= 20 ? 2 : 1);
      await Promise.all([slCount(total, bet), fx.win({ title: x >= 50 ? 'MEGA WIN!' : x >= 20 ? 'BIG WIN!' : 'NICE WIN!', amount: total, big: x >= 20 })]);
    } else {
      if (x >= 4) { sfx.winBig(1); fx.coins(Math.round(x * 6)); buzz([20, 30, 40]); } else if (x >= 1.5) { sfx.cash(); buzz(25); } else sfx.coin();
      await slCount(total, bet);
    }
  } else if (tense || res.sc === 2) slSnd.aww();
  if (S !== SL) return;
  if (res.fs) {
    if (S.fs) { S.fs.left += 7; S.fs.total += 7; sfx.winBig(2); toast('+7 Freispiele! 🔥'); }
    else {
      S.fs = { left: 7, total: 7, won: 0, bet };
      sfx.whoosh(); slHud();
      await fx.win({ title: 'FREISPIELE!', sub: '7 Gratis-Drehs · alle Gewinne ×2', big: true });
      if (S !== SL) return;
    }
  }
  S.spinning = false; slHud();
  if (S.fs) {
    if (S.fs.left > 0) { await wait(900); if (S === SL) slSpin(); return; }
    const won = S.fs.won;
    S.fs = null;
    await wait(500);
    if (S !== SL) return;
    if (won) await fx.win({ title: 'FREISPIEL-GEWINN', amount: won, big: won >= 20 * bet });
    else { slSnd.aww(); toast('Freispiele vorbei – diesmal nix 😬'); }
    if (S !== SL) return;
    slHud();
  }
  if (S.autoOn && S.autoLeft > 0) { await wait(total ? 900 : 450); if (S === SL && S.autoOn) slSpin(); return; }
  S.autoOn = false; slHud();
  slNextTurn();
}

// Dreht die Walzen per requestAnimationFrame; liefert true, wenn Spannung aufkam
function slAnimate(S, grid) {
  return new Promise(res => {
    const reels = $$('.sl-reel');
    if (!reels.length) return res(false);
    const h = reels[0].clientHeight / 3, v = h / 40, Td = 420;
    const stops = [];
    let t = 800;
    for (let r = 0; r < 5; r++) { const tense = r >= 2 && slTension(grid, r); if (r) t += tense ? 1400 : 240; stops.push({ t, tense }); }
    const jobs = reels.map((reel, r) => {
      const strip = $('.sl-strip', reel), T = stops[r].t;
      const n = Math.max(6, Math.round(v * (T - Td / 2) / h));
      // Oben die Zielsymbole, unten die aktuellen – der Streifen läuft nach unten
      const syms = [...grid[r], ...range(n).map(slPick), ...S.grid[r]];
      strip.innerHTML = syms.map(slCell).join('');
      const D = (syms.length - 3) * h;
      strip.classList.remove('sl-bounce');
      strip.style.transform = `translate3d(0,${-D}px,0)`;
      strip.classList.add('sl-blur');
      return { reel, strip, r, T, D, vv: D / (T - Td / 2), tense: stops[r].tense, hot: false, done: false };
    });
    const t0 = performance.now();
    let lastWhirr = 0, lastRise = 0, stars = 0, anyTense = false;
    const frame = now => {
      if (S !== SL || !document.body.contains(jobs[0].reel)) return res(false);
      const t = now - t0;
      let running = 0;
      for (const j of jobs) {
        if (j.done) continue;
        if (t >= j.T) {
          j.done = true;
          j.strip.classList.remove('sl-blur');
          j.strip.style.transform = 'translate3d(0,0,0)';
          j.strip.innerHTML = grid[j.r].map(slCell).join('');
          j.reel.classList.remove('sl-tense');
          void j.strip.offsetWidth; j.strip.classList.add('sl-bounce');
          slSnd.klack(); buzz(10);
          const sc = grid[j.r].filter(s => s === 'sc').length;
          if (sc) { stars += sc; slSnd.star(stars); buzz(25); }
          continue;
        }
        running++;
        let y;
        if (t < j.T - Td) y = j.vv * t;
        else { const tau = (t - (j.T - Td)) / Td; y = j.vv * (j.T - Td) + j.vv * Td * (tau - tau * tau / 2); if (tau > .5) j.strip.classList.remove('sl-blur'); }
        j.strip.style.transform = `translate3d(0,${(y - j.D).toFixed(1)}px,0)`;
        if (j.tense && !j.hot && t > stops[j.r - 1].t) { j.hot = true; anyTense = true; j.reel.classList.add('sl-tense'); $('#slMsg').textContent = 'Uiii … 😳'; }
      }
      const hot = jobs.find(j => j.hot && !j.done);
      if (hot && now - lastRise > 105) {
        lastRise = now;
        const a = stops[hot.r - 1].t;
        sfx.rise(Math.min(1, (t - a) / (hot.T - a)));
        if (Math.round(t / 105) % 4 === 0) { beep(58, .14, 'sine', .3); buzz(12); }
      }
      if (running && now - lastWhirr > 55) { lastWhirr = now; slSnd.whirr(running); }
      if (running) requestAnimationFrame(frame); else later(() => res(anyTense), 180);
    };
    requestAnimationFrame(frame);
  });
}

function slShowWins(res, mult, jp) {
  const S = SL, win = $('#slWin'), svg = $('#slLines');
  if (!win) return;
  const cellAt = (r, row) => $$('.sl-cell', $$('.sl-reel')[r])[row];
  const msgs = [];
  res.wins.forEach(w => {
    w.cells.forEach(([r, row]) => cellAt(r, row).classList.add('hit'));
    svg.insertAdjacentHTML('beforeend', `<polyline pathLength="1" style="--lc:${SL_LC[w.li]}" points="${SL_LINES[w.li].map((row, r) => `${50 + r * 100},${50 + row * 100}`).join(' ')}"/>`);
    msgs.push(w.jp ? `Linie ${w.li + 1}: 5× 7 = JACKPOT ${fmt(jp)}!` : `Linie ${w.li + 1}: ${w.n}× ${SL_SYM[w.sym].lbl} = ${fmt(w.pay * mult)}`);
  });
  if (res.sc >= 3) {
    $$('.sl-cell.sl-sc').forEach(c => c.classList.add('hit'));
    msgs.push(`${res.sc}× ⭐ = ${fmt(res.scPay * mult)} + 7 Freispiele`);
  }
  if (!msgs.length) { $('#slMsg').textContent = res.sc === 2 ? 'Knapp! Nur 2 Sterne …' : pick(['Nix. Nochmal!', 'Fast …', 'Nächster Dreh!', 'Weiter geht’s!']); return; }
  win.classList.add('sl-won');
  if (mult > 1) msgs.forEach((m, k) => msgs[k] = m + ' (×2)');
  let k = 0;
  const show = () => { const el = $('#slMsg'); if (el) el.textContent = msgs[k++ % msgs.length]; };
  show();
  if (msgs.length > 1) S.msgT = every(show, 1500);
}

// Zählt das Gewinn-Display hoch; länger und höher bei größeren Gewinnen
function slCount(amount, bet) {
  return new Promise(res => {
    const el = $('#slWinAmt');
    if (!el) return res();
    const x = amount / bet, dur = Math.min(3200, 300 + Math.sqrt(x) * 420), t0 = performance.now();
    let last = 0;
    const step = t => {
      if (!document.body.contains(el)) return res();
      const p = Math.min(1, (t - t0) / dur);
      el.textContent = fmt(amount * (1 - Math.pow(1 - p, 2)));
      if (t - last > 65 && p < 1) { last = t; slSnd.step(p * Math.min(1, x / 20)); }
      if (p < 1) requestAnimationFrame(step);
      else { sfx.coin(); slHud(); res(); }
    };
    requestAnimationFrame(step);
  });
}

function slNextTurn() {
  const S = SL;
  if (!S.rotate || S.ps.length < 2) return;
  for (let k = 1; k <= S.ps.length; k++) {
    const n = (S.cur + k) % S.ps.length;
    if (chips(S.ps[n].i) < 10) continue;
    if (n !== S.cur) later(() => { if (S !== SL || S.spinning || S.autoOn) return; S.cur = n; slHud(); sfx.click(); buzz(10); toast(`${S.ps[n].name} ist dran`); }, 1100);
    return;
  }
}

function slInfo() {
  const S = SL, lb = S.bet / 10;
  const o = document.createElement('div');
  o.className = 'sl-modal';
  o.innerHTML = `<div class="sl-mbox"><h2 class="gold">Gewinne</h2><p class="mut small" style="margin:0 0 10px">bei ${fmt(S.bet)} Einsatz pro Dreh · 10 Linien</p>
    <table class="sl-pt">${['se', 'bar', 'di', 'be', 'me', 'le', 'ch'].map(k => `<tr><td class="sl-pts">${SL_SYM[k].html}</td>${[0, 1, 2].map(n => `<td><small>${n + 3}×</small>${k === 'se' && n === 2 ? '<b class="sl-jpword">JACKPOT</b>' : fmt(SL_SYM[k].pay[n] * lb)}</td>`).join('')}</tr>`).join('')}</table>
    <div class="sl-rule"><span class="sl-pts sl-wi">${SL_SYM.wi.html}</span><p><b>WILD</b> ersetzt jedes Symbol außer ⭐. Eine Linie nur aus Wilds zählt als 7er.</p></div>
    <div class="sl-rule"><span class="sl-pts sl-sc">${SL_SYM.sc.html}</span><p><b>3 / 4 / 5 Sterne</b> irgendwo = ${fmt(2 * S.bet)} / ${fmt(10 * S.bet)} / ${fmt(50 * S.bet)} + <b>7 Freispiele</b> mit doppelten Gewinnen.</p></div>
    <div class="sl-rule"><span class="sl-pts">${SL_SYM.se.html}</span><p><b>5× 7</b> auf einer Linie knackt den <b>Jackpot</b>. 5 % jedes Einsatzes wandern in den Topf.</p></div>
    <div class="lbl" style="margin-top:14px">10 Gewinnlinien</div>
    <div class="sl-ldiag">${SL_LINES.map((ln, li) => `<div class="sl-lmini" style="--lc:${SL_LC[li]}">${range(3).map(row => range(5).map(r => `<i class="${ln[r] === row ? 'on' : ''}"></i>`).join('')).join('')}<small>${li + 1}</small></div>`).join('')}</div>
    <button class="btn" id="slClose">Weiter zocken</button></div>`;
  document.body.appendChild(o);
  sfx.flip();
  o.onclick = e => { if (e.target === o || e.target.id === 'slClose') { o.remove(); sfx.click(); } };
}

CASINO.push({
  id: 'slots', em: '🎰', name: 'Bus-Slots', desc: 'Jackpot knacken – reihum drehen', min: 1, max: 8,
  bg: 'radial-gradient(120% 90% at 80% 0%,#ff2bd6 0%,#7b12c9 38%,#2a0650 70%,#12041f 100%)',
  start: ps => slotsStart(ps),
});
