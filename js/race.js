'use strict';
// Pferderennen: Das Rennen wird vorab simuliert, Quoten per Monte-Carlo mit ~8 % Hausvorteil.
CASINO.push({ id: 'race', em: '🏇', name: 'Pferderennen', desc: 'Setz auf dein Pferd – Fotofinish!', min: 1, max: 8,
  bg: 'linear-gradient(165deg,#3ddc84 0%,#0f7a4c 36%,#063d25 68%,#2a1606 100%)', start: ps => raceBet(ps) });

const RC_NAMES = ['Blitz Brösel', 'Sir Galopp', 'Leberkäs Express', 'Turbo Tante', 'Wiener Wirbel', 'Donnerhuf', 'Käsekrainer Karl', 'Schnitzel Sprinter', 'Lady Lasagne', 'Gulasch Gustl', 'Almwind', 'Dr. Hufnagel', 'Speedy Sachertorte', 'Mozartkugel', 'Kaiser Kracher', 'Bummel Bertl'];
const RC_SILK = ['#ff3b5c', '#2a8cff', '#f7c948', '#2fd67b', '#c77dff', '#ff8a2a'];
const RC_D = 100, RC_DT = .1, RC_VIEW = 24;
const rcOdds = o => o.toFixed(1).replace('.', ',') + '×';

// Ein Rennen simulieren. rec = Positionen pro Zeitschritt + Ereignisse mitschreiben
function rcSim(hs, rec) {
  const n = hs.length, pos = Array(n).fill(0), v = Array(n).fill(0), boost = Array(n).fill(1), bt = Array(n).fill(0), fin = Array(n).fill(null);
  const frames = rec ? [pos.slice()] : null, events = rec ? [] : null;
  let t = 0;
  while (fin.some(f => f == null) && t < 40) {
    for (let k = 0; k < n; k++) {
      if (bt[k] <= 0 && Math.random() < .03) {
        boost[k] = Math.random() < .55 ? 1.2 + Math.random() * .12 : .8; bt[k] = .8 + Math.random() * 1.2;
        if (rec) events.push({ t, k, dur: bt[k], sprint: boost[k] > 1 });
      }
      const b = bt[k] > 0 ? boost[k] : 1; bt[k] -= RC_DT;
      const late = pos[k] > RC_D * .7 ? .9 + .2 * hs[k].stam : 1;
      let target = hs[k].base * b * late * Math.min(1, t / 1.2 + .3) * (1 + (Math.random() - .5) * .12);
      if (fin[k] != null) target *= .35;
      v[k] += (target - v[k]) * .35;
      const prev = pos[k]; pos[k] += v[k] * RC_DT;
      if (fin[k] == null && pos[k] >= RC_D) fin[k] = t + RC_DT * (RC_D - prev) / (pos[k] - prev);
    }
    t += RC_DT;
    if (rec) frames.push(pos.slice());
  }
  return { order: range(n).sort((a, b) => fin[a] - fin[b]), fin, frames, events };
}

function rcField() {
  const hs = shuffle(RC_NAMES).slice(0, 6).map((name, k) => ({ name, no: k + 1, color: RC_SILK[k], base: 8.3 * (1 + (Math.random() - .5) * .055), stam: Math.random() }));
  const w = hs.map(() => 0), N = 2500;
  for (let s = 0; s < N; s++) w[rcSim(hs).order[0]]++;
  hs.forEach((h, k) => { h.p = Math.max(w[k], 8) / N; h.odds = Math.min(25, Math.max(1.4, Math.floor(.92 / h.p * 10) / 10)); });
  const rank = [...hs].sort((a, b) => b.p - a.p);
  hs.forEach(h => h.form = 5 - Math.floor(rank.indexOf(h) * 5 / 6));
  return hs;
}

// ---------- Wetten ----------
function raceBet(ps, hs) {
  stopAll();
  hs = hs || rcField();
  const last = store.get('bc_lastbet', {});
  const sel = ps.map(() => null);
  const bets = ps.map(p => Math.min(chips(p.i), last[p.name] || Math.min(100, chips(p.i))));
  const draw = () => {
    mount(`${BACK}<h2 class="gold">🏇 Pferderennen</h2>
      <div class="rc-field"><div class="rc-fh"><span>STARTERFELD</span><span>FORM</span><span>QUOTE</span></div>
      ${hs.map(h => `<div class="rc-h"><span class="rc-no" style="--s:${h.color}">${h.no}</span><b>${esc(h.name)}</b><span class="rc-form">${'★'.repeat(h.form)}<i>${'★'.repeat(5 - h.form)}</i></span><span class="rc-odds">${rcOdds(h.odds)}</span></div>`).join('')}</div>
      <p class="sub small">Quote = Auszahlung bei Sieg, Einsatz inklusive.</p>
      ${ps.map((p, k) => {
        const broke = chips(p.i) < 10, h = sel[k] != null ? hs[sel[k]] : null;
        return `<div class="betrow ${broke ? 'broke' : ''}" style="--c:${p.color}">
          <div class="bethead"><b>${esc(p.name)}</b><span class="mut">Guthaben ${balHTML(p.i)}</span></div>
          ${broke ? '<div class="mut">Pleite – setzt aus 💸</div>' : `
          <div class="rc-pick">${hs.map((x, j) => `<button class="rc-pb ${sel[k] === j ? 'on' : ''}" data-k="${k}" data-h="${j}" style="--s:${x.color}">${x.no}</button>`).join('')}</div>
          <div class="betmain"><div class="betamt">${h && bets[k] ? stackHTML(bets[k]) : ''}<div><b>${h ? fmt(bets[k]) : 'setzt aus'}</b>
            <div class="rc-pay">${h ? `auf <span style="color:${h.color}">${esc(h.name)}</span> · Sieg = <em>${fmt(Math.floor(bets[k] * h.odds))}</em>` : 'Pferd antippen zum Mitwetten'}</div></div></div>
            ${h ? `<button class="mini" data-clr="${k}">✕</button>` : ''}</div>
          ${h ? `<div class="chiprow">${[10, 50, 100, 500].map(v => `<button class="chipbtn" data-k="${k}" data-v="${v}" ${bets[k] + v > chips(p.i) ? 'disabled' : ''}>${chipHTML(v)}</button>`).join('')}<button class="allin" data-all="${k}">ALL IN</button></div>` : ''}`}
        </div>`;
      }).join('')}
      <button class="btn" id="go" ${ps.some((p, k) => sel[k] != null && bets[k] >= 10) ? '' : 'disabled'}>Rennen starten 🏁</button>`, true);
    $$('.rc-pb').forEach(b => b.onclick = () => {
      const k = +b.dataset.k, j = +b.dataset.h;
      sel[k] = sel[k] === j ? null : j;
      if (bets[k] < 10) bets[k] = Math.min(100, chips(ps[k].i));
      sfx.flip(); buzz(15); draw();
    });
    $$('.chipbtn').forEach(b => b.onclick = () => { bets[+b.dataset.k] += +b.dataset.v; sfx.chip(); buzz(10); draw(); });
    $$('[data-clr]').forEach(b => b.onclick = () => { const k = +b.dataset.clr; bets[k] = 0; sel[k] = null; sfx.click(); draw(); });
    $$('[data-all]').forEach(b => b.onclick = () => { const k = +b.dataset.all; bets[k] = chips(ps[k].i); sfx.chip(); sfx.whoosh(); buzz(30); draw(); });
    $('#go').onclick = () => {
      const picks = ps.map((p, k) => ({ p, h: sel[k], bet: Math.min(bets[k], chips(p.i)) })).filter(x => x.h != null && x.bet >= 10);
      const memo = store.get('bc_lastbet', {}); picks.forEach(x => memo[x.p.name] = x.bet); store.set('bc_lastbet', memo);
      raceRun(ps, hs, picks);
    };
  };
  draw();
}

// ---------- Sounds ----------
const rcGallop = vol => { [0, .07, .16].forEach((d, k) => noise(.035, vol * (k === 2 ? 1.3 : 1), 120, d, 1100)); };
const rcCrowd = vol => noise(1.3, vol, 350, 0, 2600);
const rcCheer = () => { noise(2.6, .22, 300, 0, 3200); noise(1.8, .14, 600, .3, 4000); [0, .25, .6].forEach(d => beep(2100 + Math.random() * 500, .35, 'sine', .035, 1.25, d)); };
const rcFanfare = () => [[392, 0, .14], [523, .14, .14], [659, .28, .14], [784, .42, .5], [659, .95, .14], [784, 1.1, .7]]
  .forEach(([f, d, l]) => { beep(f, l, 'sawtooth', .06, 0, d); beep(f * 2, l, 'square', .02, 0, d); });

// ---------- Rennen ----------
function raceRun(ps, hs, picks) {
  stopAll();
  picks.forEach(x => addChips(x.p.i, -x.bet));
  const sim = rcSim(hs, true), F = sim.frames, ord = sim.order;
  const photo = sim.fin[ord[1]] - sim.fin[ord[0]] < .15;
  const endT = sim.fin[ord[2]] + 1;
  app.innerHTML = `<div class="rc-wrap nomove">
    <div class="rc-top"><button class="rc-x" id="quit">✕</button><div class="rc-tick"><span id="tick">Die Pferde gehen in die Startboxen…</span></div></div>
    <div class="rc-stage"><canvas class="rc-cv"></canvas><div class="rc-big" id="big"></div><div class="rc-flash"></div></div>
    <div class="rc-board">${hs.map((h, k) => `<div class="rc-row" data-k="${k}" style="--s:${h.color};top:${k * 36}px"><span class="rc-rk">${k + 1}</span><span class="rc-no">${h.no}</span><b>${esc(h.name)}</b><span class="rc-bets">${picks.filter(x => x.h === k).map(x => `<i style="background:${x.p.color}"></i>`).join('')}</span><span class="rc-gap"></span></div>`).join('')}</div>
  </div>`;
  const cv = $('.rc-cv'), ctx = cv.getContext('2d'), stage = $('.rc-stage'), tickEl = $('#tick'), bigEl = $('#big'), rows = $$('.rc-row');
  let W = 0, H = 0, dpr = 1;
  const resize = () => { dpr = Math.min(2, devicePixelRatio || 1); W = stage.clientWidth; H = stage.clientHeight; cv.width = W * dpr; cv.height = H * dpr; };
  resize(); addEventListener('resize', resize);

  const quit = $('#quit');
  quit.onclick = () => {
    if (!quit.classList.contains('armed')) { quit.classList.add('armed'); quit.textContent = 'Beenden?'; setTimeout(() => { quit.classList.remove('armed'); quit.textContent = '✕'; }, 2500); return; }
    home();
  };

  // Zuschauer (Parallax), Staub
  const heads = range(150).map(() => ({ x: Math.random(), row: rnd(4), c: pick(['#ff4d6d', '#4dabff', '#ffc93c', '#fff', '#c77dff', '#3ddc84', '#ff9f43', '#f4c7a1']), ph: Math.random() * 7 }));
  let dust = [], phase = 'gate', rt = 0, cam = -4, last = performance.now(), freeze = 0, flashT = 0, wall = 0;
  let lastLeader = -1, tickUntil = 0, said = {}, nextGallop = 0, nextCrowd = 0, nextBoard = 0, evIdx = 0, rankSnap = [], snapAt = 0, winnerShown = false;
  const posAt = (k, t) => { const f = Math.min(F.length - 1.001, t / RC_DT), i = Math.floor(f); return F[i][k] + (F[i + 1][k] - F[i][k]) * (f - i); };
  const say = (txt, force) => {
    if (wall < tickUntil && !force) return;
    tickEl.textContent = txt; tickEl.classList.remove('in'); void tickEl.offsetWidth; tickEl.classList.add('in');
    tickUntil = wall + 1.5;
  };
  const backers = k => picks.filter(x => x.h === k).map(x => x.p.name);
  const big = (txt, cls = '') => { bigEl.textContent = txt; bigEl.className = 'rc-big on ' + cls; void bigEl.offsetWidth; };

  // Countdown + Startschuss
  const count = n => {
    if (n === 0) {
      phase = 'run'; last = performance.now(); big('LOS!', 'go');
      noise(.3, .7, 150, 0, 5000); beep(110, .25, 'square', .25, .3); buzz(70);
      say('Und ab geht die Post! 🏁', true);
      later(() => bigEl.className = 'rc-big', 700);
      return;
    }
    big(n); beep(660, .12, 'square', .08); buzz(15);
    later(() => count(n - 1), 750);
  };
  later(() => count(3), 500);

  const finish = () => {
    phase = 'done';
    later(() => raceResults(ps, hs, picks, sim), 1300);
  };

  const loop = now => {
    if (!document.body.contains(cv)) { removeEventListener('resize', resize); return; }
    const dt = Math.min(.05, (now - last) / 1000); last = now; wall += dt;
    if (phase === 'run') {
      const lead = posAt(ord[0], rt);
      if (freeze > 0) freeze -= dt;
      else {
        const slow = photo && !winnerShown && lead > RC_D - 5 ? .25 : 1;
        rt += dt * slow;
      }
      // Zieleinlauf des Siegers
      if (!winnerShown && rt >= sim.fin[ord[0]]) {
        winnerShown = true; rt = sim.fin[ord[0]]; flashT = .5;
        const w = hs[ord[0]];
        if (photo) { freeze = 1.2; big('📸 FOTOFINISH', 'photo'); noise(.08, .4, 3000); beep(1800, .05, 'square', .05, 0, .05); later(() => { big(`#${w.no} ${w.name}`, 'win'); rcFanfare(); rcCheer(); }, 1100); }
        else { big(`#${w.no} ${w.name}`, 'win'); rcFanfare(); rcCheer(); }
        say(`🏆 ${w.name} gewinnt${backers(ord[0]).length ? ' – Jackpot für ' + backers(ord[0]).join(' & ') : ''}!`, true);
        buzz([60, 40, 120]);
      }
      if (rt >= endT) finish();
      commentary(lead);
      // Hufgetrappel im Galopp-Rhythmus, Publikum wird lauter
      const hype = Math.min(1, Math.max(0, (lead - 40) / 55));
      if (wall >= nextGallop && freeze <= 0) { rcGallop(.08 + hype * .1); nextGallop = wall + (photo && lead > RC_D - 5 && !winnerShown ? .8 : .34); }
      if (wall >= nextCrowd) { rcCrowd(.03 + hype * .1); nextCrowd = wall + 1.1; }
      if (wall >= nextBoard) { board(); nextBoard = wall + .15; }
    }
    draw(dt);
    requestAnimationFrame(loop);
  };

  const ranking = () => range(hs.length).sort((a, b) => posAt(b, rt) - posAt(a, rt));
  const commentary = lead => {
    const r = ranking(), l = r[0];
    while (evIdx < sim.events.length && sim.events[evIdx].t <= rt) {
      const e = sim.events[evIdx++];
      if (rt > 1.5 && posAt(e.k, rt) < RC_D) say(e.sprint ? `${hs[e.k].name} zündet den Turbo! 🔥` : `${hs[e.k].name} geht die Puste aus… 😮‍💨`);
    }
    if (l !== lastLeader) {
      if (lastLeader >= 0 && rt > 1.2 && lead < RC_D) { const b = backers(l); say(`${hs[l].name} übernimmt die Führung!${b.length ? ' 🙌 ' + b.join(' & ') + ' jubeln' : ''}`, true); }
      lastLeader = l;
    }
    if (wall >= snapAt) { rankSnap.push(r.slice()); if (rankSnap.length > 6) rankSnap.shift(); snapAt = wall + .4; }
    if (rankSnap.length >= 6) {
      const old = rankSnap[0];
      r.slice(0, 2).forEach(k => { if (old.indexOf(k) - r.indexOf(k) >= 3 && !said['cb' + k]) { said['cb' + k] = 1; say(`${hs[k].name} kommt von hinten! 😱`, true); } });
    }
    if (lead > 70 && !said.zg) { said.zg = 1; say('ZIELGERADE!! 🏁', true); }
    if (lead > 86 && !said.kk && posAt(r[0], rt) - posAt(r[1], rt) < .8) { said.kk = 1; say('Kopf an Kopf!!! 😵', true); }
  };

  const board = () => {
    const r = ranking(), lead = posAt(r[0], rt);
    r.forEach((k, idx) => {
      const row = rows[k];
      row.style.top = idx * 36 + 'px';
      $('.rc-rk', row).textContent = idx + 1;
      const done = rt >= sim.fin[k];
      $('.rc-gap', row).textContent = done ? ['🥇', '🥈', '🥉'][ord.indexOf(k)] || '✓' : idx ? '−' + (lead - posAt(k, rt)).toFixed(1).replace('.', ',') + ' m' : 'FÜHRT';
      row.classList.toggle('lead', idx === 0);
    });
  };

  const draw = dt => {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const ppu = W / RC_VIEW, crowdH = Math.max(46, H * .2), y0 = crowdH + 10, laneH = (H - y0 - 10) / hs.length;
    const lead = Math.max(...range(hs.length).map(k => posAt(k, rt)));
    const target = Math.min(RC_D + 5 - RC_VIEW, Math.max(-4, lead - 15));
    cam += (target - cam) * Math.min(1, dt * 4);
    const X = u => (u - cam) * ppu;
    const hype = Math.min(1, Math.max(0, (lead - 50) / 45)) + (winnerShown ? .8 : 0);

    // Tribüne mit Publikum
    const sg = ctx.createLinearGradient(0, 0, 0, crowdH);
    sg.addColorStop(0, '#1a0f2e'); sg.addColorStop(1, '#2c1a44');
    ctx.fillStyle = sg; ctx.fillRect(0, 0, W, crowdH);
    for (let r = 0; r < 4; r++) { ctx.fillStyle = r % 2 ? '#3a2558' : '#2f1d4a'; ctx.fillRect(0, crowdH * (.18 + r * .2), W, crowdH * .2); }
    for (const h of heads) {
      const x = ((h.x * W * 1.5 - cam * ppu * .45) % (W * 1.5) + W * 1.5) % (W * 1.5) - W * .25;
      const jump = Math.max(0, Math.sin(wall * (6 + hype * 8) + h.ph)) * (2 + hype * 7);
      const y = crowdH * (.3 + h.row * .2) - jump;
      ctx.fillStyle = h.c; ctx.beginPath(); ctx.arc(x, y, 4.2, 0, 7); ctx.fill();
      ctx.fillStyle = '#f4c7a1'; ctx.beginPath(); ctx.arc(x, y - 6, 3, 0, 7); ctx.fill();
    }
    // Lichterkette
    for (let x = ((-cam * ppu * .45) % 22 + 22) % 22; x < W; x += 22) { ctx.fillStyle = (Math.floor(x / 22 + wall * 4) % 2) ? '#ffe9a0' : '#ff2bd6'; ctx.beginPath(); ctx.arc(x, 6, 2.4, 0, 7); ctx.fill(); }

    // Rasen mit Mähstreifen
    for (let u = Math.floor(cam / 4) * 4; u < cam + RC_VIEW + 4; u += 4) {
      ctx.fillStyle = (Math.floor(u / 4) % 2) ? '#1d8f52' : '#178046'; ctx.fillRect(X(u), y0, 4 * ppu + 1, laneH * hs.length);
    }
    const vg = ctx.createLinearGradient(0, y0, 0, H);
    vg.addColorStop(0, '#00000033'); vg.addColorStop(.5, '#00000000'); vg.addColorStop(1, '#00000044');
    ctx.fillStyle = vg; ctx.fillRect(0, y0, W, H - y0);
    // Bahnlinien
    ctx.strokeStyle = '#ffffff40'; ctx.lineWidth = 1.5; ctx.setLineDash([10, 10]); ctx.lineDashOffset = cam * ppu;
    for (let k = 1; k < hs.length; k++) { const y = y0 + k * laneH; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    ctx.setLineDash([]);
    // Ränder (Rail) mit Pfosten
    for (const ry of [y0 - 4, H - 8]) {
      ctx.fillStyle = '#f4f1ea'; ctx.fillRect(0, ry, W, 4);
      for (let u = Math.floor(cam); u < cam + RC_VIEW + 1; u++) { ctx.fillStyle = '#d8d2c6'; ctx.fillRect(X(u), ry - 3, 3, 9); }
    }
    // Distanztafeln
    ctx.font = '900 11px ui-rounded,system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (let u = 10; u < RC_D; u += 10) {
      const x = X(u); if (x < -20 || x > W + 20) continue;
      ctx.fillStyle = '#fff'; ctx.fillRect(x - 13, y0 - 20, 26, 14); ctx.fillStyle = '#a3001b'; ctx.fillText(RC_D - u, x, y0 - 13);
    }
    // Startboxen
    if (X(0) > -40) for (let k = 0; k < hs.length; k++) { const y = y0 + k * laneH; ctx.fillStyle = '#9aa0ad'; ctx.fillRect(X(0) - 4, y + 2, 6, laneH - 4); ctx.fillStyle = hs[k].color; ctx.fillRect(X(0) - 10, y + laneH * .3, 6, laneH * .4); }
    // Ziellinie mit Schachbrett und Banner
    const fx0 = X(RC_D);
    if (fx0 > -40 && fx0 < W + 60) {
      const sq = laneH * hs.length / 18;
      for (let j = 0; j < 18; j++) for (let c = 0; c < 2; c++) { ctx.fillStyle = (j + c) % 2 ? '#111' : '#fff'; ctx.fillRect(fx0 + c * sq, y0 + j * sq, sq, sq); }
      ctx.fillStyle = '#ff2bd6'; ctx.fillRect(fx0 - 3, 0, 4, y0); ctx.fillRect(fx0 + 2 * sq - 1, 0, 4, y0);
      ctx.fillStyle = '#ff2bd6'; ctx.fillRect(fx0 - 26, 8, 2 * sq + 52, 22);
      ctx.fillStyle = '#fff'; ctx.font = '900 14px ui-rounded,system-ui'; ctx.fillText('ZIEL', fx0 + sq, 19);
    }
    // Staub (Weltkoordinaten)
    dust = dust.filter(d => (d.life -= dt) > 0);
    for (const d of dust) { d.y += d.vy * dt; d.u -= dt * .6; ctx.fillStyle = `rgba(214,190,140,${d.life * .55})`; ctx.beginPath(); ctx.arc(X(d.u), d.y, d.r * (1.6 - d.life), 0, 7); ctx.fill(); }

    // Pferde
    const size = Math.min(laneH * 1.05, 58);
    ctx.textBaseline = 'middle';
    for (let k = 0; k < hs.length; k++) {
      const u = posAt(k, rt), u2 = posAt(k, rt + .1), sp = (u2 - u) / .1, x = X(u), cy = y0 + laneH * (k + .5);
      const running = phase === 'run' && freeze <= 0 && sp > .5;
      const bob = running ? Math.abs(Math.sin(wall * 15 + k * 1.3)) * laneH * .1 : 0;
      // Turbo: Speed-Linien
      const turbo = sim.events.some(e => e.k === k && e.sprint && rt >= e.t && rt <= e.t + e.dur);
      if (turbo && running) { ctx.strokeStyle = '#ffb347aa'; ctx.lineWidth = 2; for (let j = 0; j < 4; j++) { const ly = cy - laneH * .25 + j * laneH * .17; ctx.beginPath(); ctx.moveTo(x - size * 1.1 - j * 6, ly); ctx.lineTo(x - size * 1.9 - j * 10, ly); ctx.stroke(); } }
      if (running && Math.random() < .7) dust.push({ u: u - size * .8 / ppu, y: cy + size * .32, vy: -8 - Math.random() * 10, r: 2 + Math.random() * 3, life: .7 });
      // Schatten
      ctx.fillStyle = '#00000040'; ctx.beginPath(); ctx.ellipse(x - size * .45, cy + size * .4, size * .45, size * .1, 0, 0, 7); ctx.fill();
      ctx.save(); ctx.translate(x - size * .45, cy - bob); ctx.scale(-1, 1);
      ctx.font = `${size}px system-ui`; ctx.textAlign = 'center'; ctx.fillText('🏇', 0, 0);
      ctx.restore();
      // Startnummer + Tipps der Spieler
      const bx = x - size * 1.05, r = Math.max(8, laneH * .2);
      ctx.fillStyle = hs[k].color; ctx.beginPath(); ctx.arc(bx, cy, r, 0, 7); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.font = `900 ${Math.round(r * 1.2)}px ui-rounded,system-ui`; ctx.textAlign = 'center'; ctx.fillText(hs[k].no, bx, cy + 1);
      picks.filter(p => p.h === k).forEach((p, j) => { ctx.fillStyle = p.p.color; ctx.beginPath(); ctx.arc(bx - r - 6 - j * 9, cy, 4, 0, 7); ctx.fill(); ctx.strokeStyle = '#000a'; ctx.lineWidth = 1; ctx.stroke(); });
    }
    // Fotofinish-Tönung + Blitz
    if (freeze > 0) { ctx.fillStyle = 'rgba(255,230,180,.12)'; ctx.fillRect(0, 0, W, H); ctx.strokeStyle = '#ff2bd6'; ctx.lineWidth = 2; ctx.setLineDash([6, 6]); ctx.beginPath(); ctx.moveTo(fx0, 0); ctx.lineTo(fx0, H); ctx.stroke(); ctx.setLineDash([]); }
    if (flashT > 0) { flashT -= dt; ctx.fillStyle = `rgba(255,255,255,${Math.min(1, flashT * 1.8)})`; ctx.fillRect(0, 0, W, H); }
  };
  requestAnimationFrame(loop);
}

// ---------- Siegerehrung ----------
function raceResults(ps, hs, picks, sim) {
  stopAll();
  const ord = sim.order, w = ord[0];
  const res = picks.map(x => ({ ...x, win: x.h === w ? Math.floor(x.bet * hs[w].odds) : 0 }));
  res.forEach(x => x.win && addChips(x.p.i, x.win));
  const step = (k, place) => `<div class="rc-step s${place}"><div class="rc-ph">🏇</div><span class="rc-no" style="--s:${hs[k].color}">${hs[k].no}</span><b>${esc(hs[k].name)}</b><div class="rc-block">${place}</div></div>`;
  mount(`<h2 class="gold center" style="margin-top:8px">🏁 Zieleinlauf</h2>
    <p class="sub center">Vorsprung ${(sim.fin[ord[1]] - sim.fin[w]).toFixed(2).replace('.', ',')} s · Quote ${rcOdds(hs[w].odds)}</p>
    <div class="rc-podium">${step(ord[1], 2)}${step(w, 1)}${step(ord[2], 3)}</div>
    <div class="card">${res.length ? res.map(x => `<div class="krow"><span><b style="color:${x.p.color}">${esc(x.p.name)}</b> <span class="mut">auf #${hs[x.h].no}</span></span>${x.win ? `<b style="color:#7dffb5">+${fmt(x.win - x.bet)}</b>` : `<b style="color:var(--bad)">−${fmt(x.bet)}</b>`}</div>`).join('') : '<div class="mut center">Keiner hat gewettet.</div>'}</div>
    <div class="row"><button class="btn sec" id="back">Lobby</button><button class="btn" id="again">Nächstes Rennen</button></div>`);
  $('#again').onclick = () => raceBet(ps);
  const ws = res.filter(x => x.win);
  if (ws.length) fx.win({ title: ws.length > 1 ? 'TREFFER!' : esc(ws[0].p.name).toUpperCase(), amount: ws.reduce((s, x) => s + x.win, 0), sub: `auf ${esc(hs[w].name)} · ${rcOdds(hs[w].odds)}`, big: hs[w].odds >= 8 });
  else if (res.length) sfx.lose();
}
