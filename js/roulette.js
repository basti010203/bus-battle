'use strict';
// Europäisches Roulette: alle setzen auf einem Tableau, dann dreht der Kessel.
const RL_WHEEL = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
const RL_RED = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
const rlColor = n => n === 0 ? 'green' : RL_RED.has(n) ? 'red' : 'black';
const RL_OUT = {
  low: { label: '1–18', mult: 1, hit: n => n >= 1 && n <= 18 },
  even: { label: 'GERADE', mult: 1, hit: n => n > 0 && n % 2 === 0 },
  red: { label: '<i class="rl-dia rl-red"></i>', mult: 1, hit: n => RL_RED.has(n) },
  black: { label: '<i class="rl-dia rl-black"></i>', mult: 1, hit: n => n > 0 && !RL_RED.has(n) },
  odd: { label: 'UNGERADE', mult: 1, hit: n => n % 2 === 1 },
  high: { label: '19–36', mult: 1, hit: n => n >= 19 },
  d1: { label: '1. 12', mult: 2, hit: n => n >= 1 && n <= 12 },
  d2: { label: '2. 12', mult: 2, hit: n => n >= 13 && n <= 24 },
  d3: { label: '3. 12', mult: 2, hit: n => n >= 25 },
  c1: { label: '2:1', mult: 2, hit: n => n > 0 && n % 3 === 1 },
  c2: { label: '2:1', mult: 2, hit: n => n > 0 && n % 3 === 2 },
  c3: { label: '2:1', mult: 2, hit: n => n > 0 && n % 3 === 0 },
};
const rlBet = key => key[0] === 'n' ? { mult: 35, hit: n => n === +key.slice(1) } : RL_OUT[key];
const rlShort = v => v >= 1000 ? (Math.round(v / 100) / 10 + 'K').replace('.', ',') : v;
const rlLabels = n => n === 0 ? 'ZERO' : `${RL_RED.has(n) ? 'ROT' : 'SCHWARZ'} · ${n % 2 ? 'UNGERADE' : 'GERADE'} · ${n <= 18 ? '1–18' : '19–36'}`;
const rlSum = b => Object.values(b).reduce((a, v) => a + v, 0);
// Beim Setzen roh abziehen (ohne XP), damit Setzen + Rückgängig kein Level-Farmen erlaubt. XP gibt's erst beim Drehen.
const rlTake = (i, a) => { players[i].chips -= a; savePlayers(); };

// Eigene Roulette-Sounds
const rlSnd = {
  stack: n => { sfx.chip(); beep(700 + Math.min(n, 12) * 70, .04, 'triangle', .035, 1.2, .02); },
  roll: v => noise(.07, .04 + v * .08, 150, 0, 900 + v * 1500),
  tick: v => { noise(.012, .1 + v * .12, 3500); beep(1500 + v * 900, .018, 'square', .025 + v * .03); },
  clack: () => { noise(.05, .38, 1200); beep(950, .07, 'triangle', .1, .5); noise(.03, .16, 2500, .12); noise(.025, .08, 2500, .25); },
  reveal: () => { beep(110, .5, 'sine', .25, .6); noise(.3, .1, 300, 0, 2000); },
};

CASINO.push({
  id: 'roulette', em: '🎡', name: 'Roulette', desc: 'Rot oder Schwarz? Alle setzen gleichzeitig', min: 1, max: 8,
  bg: 'radial-gradient(circle at 80% 15%,#ff3b5c 0%,transparent 45%),radial-gradient(circle at 10% 100%,#0f7a4c 0%,transparent 55%),linear-gradient(160deg,#3a0718,#0b0306)',
  start: ps => rlTable({ ps, cur: 0, val: store.get('rl_val', 50), bets: ps.map(() => ({})), undo: ps.map(() => []), last: null, res: null, net: null, newKey: null }),
});

function rlTable(S) {
  const { ps, bets, res } = S, hist = store.get('rl_hist', []);
  const sum = bets.reduce((a, b) => a + rlSum(b), 0);
  const cell = (key, cls, area, inner) => {
    const hit = res != null && rlBet(key).hit(res);
    const here = ps.map((p, k) => bets[k][key] ? { p, k, a: bets[k][key] } : null).filter(Boolean);
    return `<button class="rl-cell ${cls} ${hit ? 'rl-hit' : res != null ? 'rl-miss' : ''}" data-key="${key}" style="grid-area:${area}">${inner}<span class="rl-chips">${here.map((c, j) =>
      `<span class="chip sm rl-c ${S.newKey === key && c.k === S.cur ? 'rl-new' : ''}" style="--cc:${chipColor(c.a)};--pc:${c.p.color};--j:${j}">${rlShort(c.a)}</span>`).join('')}</span></button>`;
  };
  const nums = range(36).map(k => { const n = k + 1; return cell('n' + n, 'rl-n rl-' + rlColor(n), `${1 + Math.ceil(n / 3)}/${3 + (n - 1) % 3}`, `<b>${n}</b>`); }).join('');
  const outs = ['low', 'even', 'red', 'black', 'odd', 'high'].map((key, j) => cell(key, 'rl-o', `${2 + j * 2}/1/${4 + j * 2}/2`, `<span class="rl-v">${RL_OUT[key].label}</span>`)).join('');
  const doz = [1, 2, 3].map(d => cell('d' + d, 'rl-o', `${2 + (d - 1) * 4}/2/${6 + (d - 1) * 4}/3`, `<span class="rl-v">${RL_OUT['d' + d].label}</span>`)).join('');
  const cols = [1, 2, 3].map(c => cell('c' + c, 'rl-o rl-col', `14/${2 + c}`, '2:1')).join('');
  const payTotal = S.net ? S.net.reduce((a, x) => a + x.pay, 0) : 0;

  const top = res == null ? `
    <div class="rl-tabs">${ps.map((p, k) => `<button class="rl-tab ${k === S.cur ? 'on' : ''}" data-t="${k}" style="--c:${p.color}"><b>${esc(p.name)}</b>${balHTML(p.i)}<em>${rlSum(bets[k]) ? fmt(rlSum(bets[k])) + ' am Tisch' : chips(p.i) ? 'noch nix gesetzt' : 'pleite'}</em></button>`).join('')}</div>
    <div class="rl-ctrl"><div class="rl-vals">${[10, 50, 100, 500].map(v => `<button class="rl-val ${S.val === v ? 'on' : ''}" data-v="${v}">${chipHTML(v)}</button>`).join('')}</div>
      <button class="rl-tool" id="rlUndo" aria-label="Rückgängig">↶</button><button class="rl-tool" id="rlClr" aria-label="Alles weg">✕</button></div>`
    : `<div class="rl-result"><div class="rl-disc rl-${rlColor(res)}">${res}</div><div><b>${rlLabels(res)}</b><div class="rl-lines">${ps.map((p, k) => {
        const x = S.net[k]; if (!x.bet) return '';
        const net = x.pay - x.bet;
        return `<div><span style="color:${p.color};font-weight:800">${esc(p.name)}</span> <span class="${net >= 0 ? 'rl-plus' : 'rl-minus'}">${net >= 0 ? '+' : '−'}${fmt(Math.abs(net))}</span>${x.plein ? ' 🎯' : ''}</div>`;
      }).join('')}</div></div></div>`;

  mount(`${BACK}<div class="rl-head"><h2 class="gold">Roulette</h2><div class="rl-hist">${hist.length ? [...hist].reverse().map((n, k, a) => `<span class="rl-hn rl-${rlColor(n)} ${k === a.length - 1 ? 'rl-hn0' : ''}">${n}</span>`).join('') : '<span class="mut small">noch keine Zahlen</span>'}</div></div>
    ${top}
    <div class="felt rl-table ${res != null ? 'rl-done' : ''}">
      <div class="rl-logo">${res == null ? `EINSATZ<b>${fmt(sum)}</b>` : `AUSZAHLUNG<b>${fmt(payTotal)}</b>`}</div>
      ${cell('n0', 'rl-n rl-green rl-zero', '1/3/2/6', '<b>0</b>')}${nums}${outs}${doz}${cols}
    </div>
    ${res == null
      ? `<button class="btn rl-spin" id="rlSpin" ${sum ? '' : 'disabled'}>RIEN NE VA PLUS<small>${sum ? 'Einsatz gesamt ' + fmt(sum) : 'Spieler & Chip wählen, dann aufs Feld tippen'}</small></button>`
      : `<div class="row"><button class="btn sec" id="rlSame">Nochmal gleich</button><button class="btn" id="rlNew">Neue Runde</button></div>`}`, true, 'rl-screen');
  S.newKey = null;

  $('#back').onclick = () => { if (S.res == null) rlRefund(S); home(); };
  if (res == null) {
    $$('.rl-tab').forEach(b => b.onclick = () => { S.cur = +b.dataset.t; sfx.flip(); buzz(8); rlTable(S); });
    $$('.rl-val').forEach(b => b.onclick = () => { S.val = +b.dataset.v; store.set('rl_val', S.val); sfx.chip(); buzz(8); rlTable(S); });
    $$('.rl-cell').forEach(b => b.onclick = () => rlPlace(S, b.dataset.key));
    $('#rlUndo').onclick = () => {
      const u = S.undo[S.cur].pop(); if (!u) return sfx.click();
      const [key, a] = u;
      addChips(ps[S.cur].i, a); bets[S.cur][key] -= a; if (!bets[S.cur][key]) delete bets[S.cur][key];
      sfx.flip(); buzz(8); rlTable(S);
    };
    $('#rlClr').onclick = () => {
      if (!rlSum(bets[S.cur])) return sfx.click();
      rlRefund(S, S.cur); noise(.25, .2, 1500, 0, 6000); sfx.coin(); buzz(20); rlTable(S);
    };
    $('#rlSpin').onclick = () => rlSpin(S);
  } else {
    $('#rlNew').onclick = () => { rlReset(S); sfx.flip(); rlTable(S); };
    $('#rlSame').onclick = () => {
      const last = S.last; rlReset(S);
      let short = false;
      last.forEach((b, k) => Object.entries(b).forEach(([key, a]) => {
        if (chips(ps[k].i) < a) { short = true; return; }
        rlTake(ps[k].i, a); bets[k][key] = a; S.undo[k].push([key, a]);
      }));
      if (short) toast('Nicht alle Einsätze leistbar');
      [0, 70, 140].forEach(d => later(sfx.chip, d)); buzz(20);
      rlTable(S);
    };
  }
}

function rlReset(S) {
  S.bets = S.ps.map(() => ({})); S.undo = S.ps.map(() => []); S.res = null; S.net = null;
}

// Gesetzte Chips zurückgeben (alle oder nur Spieler k)
function rlRefund(S, only) {
  S.ps.forEach((p, k) => {
    if (only != null && k !== only) return;
    addChips(p.i, rlSum(S.bets[k])); S.bets[k] = {}; S.undo[k] = [];
  });
}

function rlPlace(S, key) {
  const p = S.ps[S.cur], have = chips(p.i);
  if (have <= 0) { toast(`${p.name} hat keine Chips mehr`); shake($('.rl-tabs')); sfx.bad(); buzz([20, 30, 20]); return; }
  const a = Math.min(S.val, have);
  rlTake(p.i, a);
  S.bets[S.cur][key] = (S.bets[S.cur][key] || 0) + a;
  S.undo[S.cur].push([key, a]);
  S.newKey = key;
  rlSnd.stack(S.undo[S.cur].filter(u => u[0] === key).length); buzz(10);
  rlTable(S);
}

async function rlSpin(S) {
  const n = RL_WHEEL[rnd(37)];
  S.last = S.bets.map(b => ({ ...b }));
  S.ps.forEach((p, k) => { const t = rlSum(S.bets[k]); if (t) { players[p.i].chips += t; addChips(p.i, -t); } });
  await rlAnimate(n);
  S.res = n;
  S.net = S.ps.map((p, k) => {
    let bet = 0, pay = 0;
    for (const [key, a] of Object.entries(S.bets[k])) { bet += a; const b = rlBet(key); if (b.hit(n)) pay += a * (b.mult + 1); }
    if (pay) addChips(p.i, pay);
    return { bet, pay, plein: !!S.bets[k]['n' + n] };
  });
  store.set('rl_hist', [n, ...store.get('rl_hist', [])].slice(0, 12));
  rlTable(S);
  const win = S.ps.map((p, k) => ({ p, ...S.net[k] })).filter(x => x.pay > x.bet);
  const big = win.some(x => x.plein), total = win.reduce((a, x) => a + x.pay - x.bet, 0);
  if (win.length) {
    fx.win({ title: big ? 'VOLLTREFFER!' : 'GEWONNEN!', amount: total, sub: win.map(x => `${esc(x.p.name)} +${fmt(x.pay - x.bet)}`).join(' · '), big });
    if (!big && total >= 3000) sfx.winBig(3);
  } else { sfx.lose(); buzz([30, 50, 30]); }
}

// Kessel-Animation: Rotor dreht im Uhrzeigersinn, Kugel gegenläufig, fällt am Ende ins Fach von n
function rlAnimate(n) {
  return new Promise(done => {
    const ov = document.createElement('div');
    ov.className = 'rl-ov';
    ov.innerHTML = `<div class="rl-ovtxt">Rien ne va plus!</div><div class="rl-wrap">${rlWheelSVG()}</div><div class="rl-res"></div>`;
    document.body.appendChild(ov);
    const rotor = $('.rl-rotor', ov), ball = $('.rl-ball', ov);
    const st = 360 / 37, idx = RL_WHEEL.indexOf(n);
    const T = 5800, L = 4300;
    const R0 = Math.random() * 360, D = 720 + Math.random() * 360;
    const rotorAt = t => R0 + D * (1 - Math.pow(1 - Math.min(1, t / T), 3));
    const S = 360 * 4 + Math.random() * 360;
    const B0 = rotorAt(L) + idx * st + S;
    let lastPk = null, lastTick = 0, lastRoll = 0, lastRise = 0, locked = false;
    const t0 = performance.now();
    sfx.whoosh(); buzz(20);
    const frame = now => {
      const t = now - t0, R = rotorAt(t);
      let a, r;
      if (t < L) {
        const p = t / L, q = Math.max(0, (p - .55) / .45);
        a = B0 - S * (1 - Math.pow(1 - p, 2));
        // erst oben auf der Laufbahn, dann nach innen spiralen und über die Rauten hüpfen
        r = 169 - 47 * q * q + (q > .35 ? Math.abs(Math.sin(q * 24)) * 9 * (1 - q) : 0);
        const speed = 1 - p;
        if (q === 0 && now - lastRoll > 70) { lastRoll = now; rlSnd.roll(speed); }
        if (q > 0 && now - lastRise > 260) { lastRise = now; sfx.rise(q); }
      } else {
        const q = (t - L) / 1000;
        if (!locked) { locked = true; rlSnd.clack(); buzz([35, 60, 15]); }
        a = R + idx * st + Math.sin(q * 28) * 3 * Math.exp(-q * 6);
        r = 122 + Math.abs(Math.sin(q * 20)) * 7 * Math.exp(-q * 5);
      }
      rotor.setAttribute('transform', `rotate(${R.toFixed(2)})`);
      const rad = a * Math.PI / 180;
      ball.setAttribute('transform', `translate(${(r * Math.sin(rad)).toFixed(2)} ${(-r * Math.cos(rad)).toFixed(2)})`);
      // Ticks beim Passieren der Fächer – werden mit der Kugel langsamer
      if (t > L * .5 && t < L) {
        const pk = Math.floor((a - R) / st + .5);
        if (pk !== lastPk && now - lastTick > 40) { lastPk = pk; lastTick = now; rlSnd.tick(1 - t / L); buzz(4); }
      }
      if (t < T) requestAnimationFrame(frame); else finish();
    };
    const finish = () => {
      $('.rl-res', ov).innerHTML = `<div class="rl-disc big rl-${rlColor(n)}">${n}</div><div class="rl-reslbl">${rlLabels(n)}</div>`;
      $('.rl-wrap', ov).classList.add('rl-landed');
      rlSnd.reveal(); buzz(50);
      let closed = false;
      const close = () => { if (closed) return; closed = true; ov.classList.add('out'); setTimeout(() => { ov.remove(); done(); }, 280); };
      ov.onclick = close; setTimeout(close, 1700);
    };
    requestAnimationFrame(frame);
  });
}

function rlWheelSVG() {
  const st = 360 / 37, P = Math.PI / 180;
  const pol = (r, a) => `${(r * Math.sin(a * P)).toFixed(2)} ${(-r * Math.cos(a * P)).toFixed(2)}`;
  const sec = (r1, r2, a1, a2) => `M${pol(r2, a1)}A${r2} ${r2} 0 0 1 ${pol(r2, a2)}L${pol(r1, a2)}A${r1} ${r1} 0 0 0 ${pol(r1, a1)}Z`;
  const fill = n => n === 0 ? 'url(#rlG)' : RL_RED.has(n) ? 'url(#rlR)' : 'url(#rlK)';
  const pockets = RL_WHEEL.map((n, k) => `<path d="${sec(106, 153, k * st - st / 2, k * st + st / 2)}" fill="${fill(n)}"/>`).join('');
  const labels = RL_WHEEL.map((n, k) => `<text transform="rotate(${(k * st).toFixed(2)}) translate(0 -143)">${n}</text>`).join('');
  const frets = RL_WHEEL.map((_, k) => `M${pol(106, k * st + st / 2)}L${pol(153, k * st + st / 2)}`).join('');
  const spokes = [0, 90, 180, 270].map(a => `<g transform="rotate(${a})"><rect x="-3.5" y="-66" width="7" height="50" rx="3.5" fill="url(#rlGold)"/><circle cy="-68" r="8" fill="url(#rlGoldR)"/></g>`).join('');
  const diamonds = range(8).map(k => `<path d="M0 -9L4.5 0L0 9L-4.5 0Z" fill="url(#rlGold)" transform="rotate(${k * 45 + 22.5}) translate(0 -170)"/>`).join('');
  return `<svg class="rl-wheel" viewBox="-200 -200 400 400" aria-hidden="true">
    <defs>
      <radialGradient id="rlR" gradientUnits="userSpaceOnUse" cx="0" cy="0" r="153"><stop offset=".68" stop-color="#6e0816"/><stop offset=".86" stop-color="#c3162f"/><stop offset="1" stop-color="#f03a52"/></radialGradient>
      <radialGradient id="rlK" gradientUnits="userSpaceOnUse" cx="0" cy="0" r="153"><stop offset=".68" stop-color="#000"/><stop offset=".86" stop-color="#151515"/><stop offset="1" stop-color="#3a3a3a"/></radialGradient>
      <radialGradient id="rlG" gradientUnits="userSpaceOnUse" cx="0" cy="0" r="153"><stop offset=".68" stop-color="#03401f"/><stop offset=".86" stop-color="#0c8a46"/><stop offset="1" stop-color="#26d27a"/></radialGradient>
      <radialGradient id="rlWood" gradientUnits="userSpaceOnUse" cx="0" cy="0" r="199"><stop offset=".86" stop-color="#1c0d04"/><stop offset=".92" stop-color="#6b3a18"/><stop offset=".965" stop-color="#b8743a"/><stop offset="1" stop-color="#3a1c0a"/></radialGradient>
      <radialGradient id="rlTrack" gradientUnits="userSpaceOnUse" cx="0" cy="0" r="187"><stop offset=".81" stop-color="#0c0603"/><stop offset=".87" stop-color="#3d2716"/><stop offset=".93" stop-color="#22150b"/><stop offset="1" stop-color="#090402"/></radialGradient>
      <radialGradient id="rlCone" gradientUnits="userSpaceOnUse" cx="-25" cy="-30" r="130"><stop offset="0" stop-color="#d49a5a"/><stop offset=".55" stop-color="#7a4520"/><stop offset="1" stop-color="#2a1206"/></radialGradient>
      <linearGradient id="rlGold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff6c4"/><stop offset=".4" stop-color="#f7c948"/><stop offset=".7" stop-color="#a8740c"/><stop offset="1" stop-color="#ffe48a"/></linearGradient>
      <radialGradient id="rlGoldR" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#fffbe0"/><stop offset=".45" stop-color="#f7c948"/><stop offset="1" stop-color="#7a5004"/></radialGradient>
      <radialGradient id="rlBall" cx=".35" cy=".3" r=".75"><stop offset="0" stop-color="#fff"/><stop offset=".55" stop-color="#e2e2e2"/><stop offset="1" stop-color="#7d7d7d"/></radialGradient>
      <radialGradient id="rlGlare" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff" stop-opacity=".2"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
    </defs>
    <circle r="199" fill="url(#rlWood)"/>
    <circle r="187" fill="none" stroke="url(#rlGold)" stroke-width="3"/>
    <circle r="170" fill="none" stroke="url(#rlTrack)" stroke-width="32"/>
    ${diamonds}
    <g class="rl-rotor">
      <circle r="156" fill="url(#rlGold)"/>
      ${pockets}
      <circle r="119" fill="none" stroke="#000" stroke-opacity=".5" stroke-width="26"/>
      <path d="${frets}" stroke="url(#rlGold)" stroke-width="1.6"/>
      <circle r="153" fill="none" stroke="url(#rlGold)" stroke-width="2.5"/>
      <circle r="132" fill="none" stroke="url(#rlGold)" stroke-width="1.4"/>
      ${labels}
      <circle r="106" fill="url(#rlCone)" stroke="url(#rlGold)" stroke-width="3"/>
      <circle r="78" fill="none" stroke="url(#rlGold)" stroke-width="1.5" opacity=".6"/>
      ${spokes}
      <circle r="22" fill="url(#rlGoldR)"/><circle r="9" fill="#fff8d6"/>
    </g>
    <g class="rl-ball" transform="translate(0 -169)"><circle r="7.5" cx="2" cy="2.5" fill="#000" opacity=".45"/><circle r="7" fill="url(#rlBall)"/></g>
    <ellipse cx="-45" cy="-95" rx="160" ry="95" fill="url(#rlGlare)"/>
  </svg>`;
}
