'use strict';
// Rakete (Crash): Multiplikator steigt, alle steigen gleichzeitig per Tipp auf ihr Feld aus.
CASINO.push({ id: 'crash', em: '🚀', name: 'Rakete', desc: 'Steig aus, bevor sie explodiert!', min: 1, max: 6,
  bg: 'radial-gradient(120% 90% at 90% 0%,#ff2bd6 0%,#8a22e0 28%,#24095e 58%,#05020f 100%)', start: ps => crashBet(ps) });

const CR_K = 0.13;
const crMult = t => Math.exp(CR_K * t);
const crFmt = m => m.toFixed(2).replace('.', ',') + '×';
const crTier = m => m < 1.5 ? 't0' : m < 2 ? 't1' : m < 10 ? 't2' : 't3';
// Fair mit ~4 % Hausvorteil: 4 % Sofort-Crash bei 1,00×, Deckel 100×
const crashPoint = () => Math.min(100, Math.max(1, Math.floor(0.96 / (1 - Math.random()) * 100) / 100));

function crashBet(ps) {
  betScreen({ title: '🚀 Rakete', ps, confirm: 'Einsteigen 🚀',
    sub: 'Die Rakete steigt und steigt – tipp auf <b>AUSSTEIGEN</b>, bevor sie explodiert. Je länger du drinbleibst, desto mehr kassierst du.',
    onDone: bets => crashRound(ps, bets) });
}

// Triebwerk: Sägezahn + Rauschen, Tonhöhe folgt dem Multiplikator
function crEngine() {
  if (muted) return null;
  try {
    const a = audio(), t = a.currentTime;
    const o = a.createOscillator(), o2 = a.createOscillator(), f = a.createBiquadFilter(), g = a.createGain();
    o.type = 'sawtooth'; o.frequency.value = 55; o2.type = 'square'; o2.frequency.value = 55.7;
    f.type = 'lowpass'; f.frequency.value = 400; f.Q.value = 4;
    const nb = a.createBuffer(1, a.sampleRate, a.sampleRate), d = nb.getChannelData(0);
    for (let k = 0; k < d.length; k++) d[k] = Math.random() * 2 - 1;
    const n = a.createBufferSource(), nf = a.createBiquadFilter(), ng = a.createGain();
    n.buffer = nb; n.loop = true; nf.type = 'lowpass'; nf.frequency.value = 300; ng.gain.value = .25;
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.09, t + .5);
    o.connect(f); o2.connect(f); n.connect(nf).connect(ng).connect(f); f.connect(g).connect(master);
    o.start(); o2.start(); n.start();
    return {
      set(m) {
        const l = Math.log2(m), now = a.currentTime;
        o.frequency.setTargetAtTime(55 + 70 * l, now, .08); o2.frequency.setTargetAtTime(55.7 + 71 * l, now, .08);
        f.frequency.setTargetAtTime(400 + 700 * l, now, .08); nf.frequency.setTargetAtTime(300 + 500 * l, now, .08);
      },
      stop() { try { const now = a.currentTime; g.gain.cancelScheduledValues(now); g.gain.setTargetAtTime(.0001, now, .04); [o, o2, n].forEach(x => x.stop(now + .3)); } catch {} },
    };
  } catch { return null; }
}

function crashRound(ps, bets) {
  stopAll();
  const act = ps.map((p, k) => ({ ...p, bet: bets[k] })).filter(p => p.bet > 0);
  act.forEach(p => addChips(p.i, -p.bet));
  const crash = crashPoint(), tc = Math.log(crash) / CR_K;
  const hist = store.get('cr_hist', []);
  const cols = act.length <= 3 ? act.length : act.length === 4 ? 2 : 3;
  app.innerHTML = `<div class="cr-wrap nomove">
    <div class="cr-top"><button class="cr-x" id="quit">✕</button><div class="cr-hist">${hist.slice(-10).reverse().map(v => `<span class="${crTier(v)}">${crFmt(v)}</span>`).join('') || '<span class="t1">Erster Flug</span>'}</div></div>
    <div class="cr-stage"><canvas class="cr-cv"></canvas><div class="cr-mult" id="mult"></div><div class="cr-status" id="status"></div><div class="cr-flash"></div></div>
    <div class="cr-pads n${act.length}" style="grid-template-columns:repeat(${cols},1fr)">${act.map((p, k) => `<div class="cr-pad" data-k="${k}" style="--c:${p.color}"><div class="cr-pn">${esc(p.name)}</div><div class="cr-pb">Einsatz ${fmt(p.bet)}</div><div class="cr-pa">BEREIT</div><div class="cr-pw">${fmt(p.bet)}</div></div>`).join('')}</div>
  </div>`;
  const cv = $('.cr-cv'), ctx = cv.getContext('2d'), stage = $('.cr-stage'), multEl = $('#mult'), statusEl = $('#status'), pads = $$('.cr-pad');
  let W = 0, H = 0, dpr = 1;
  const resize = () => { dpr = Math.min(2, devicePixelRatio || 1); W = stage.clientWidth; H = stage.clientHeight; cv.width = W * dpr; cv.height = H * dpr; };
  resize(); addEventListener('resize', resize);

  let phase = 'count', vt = 0, m = 1, last = performance.now(), shakeT = 0, flashT = 0, nextTick = 0, milestone = 0, eng = null;
  const outs = act.map(() => null);
  const stars = range(160).map(() => ({ x: Math.random(), y: Math.random(), z: .15 + Math.random() * .85 }));
  let parts = [], rings = [], tip = { x: 0, y: 0, a: -Math.PI / 4 };
  const MILES = [1.5, 2, 3, 5, 10, 20, 50, 1e9];

  const quit = $('#quit');
  quit.onclick = () => {
    if (!quit.classList.contains('armed')) { quit.classList.add('armed'); quit.textContent = 'Beenden?'; setTimeout(() => { quit.classList.remove('armed'); quit.textContent = '✕'; }, 2500); return; }
    eng && eng.stop(); home();
  };

  // Countdown
  const count = n => {
    if (n === 0) {
      phase = 'fly'; last = performance.now(); statusEl.textContent = 'LIFT OFF';
      sfx.whoosh(); noise(1.2, .3, 30, 0, 400); buzz(80); eng = crEngine();
      pads.forEach(p => { p.classList.add('live'); $('.cr-pa', p).textContent = 'AUSSTEIGEN'; });
      return;
    }
    multEl.textContent = n; multEl.className = 'cr-mult cd'; void multEl.offsetWidth; multEl.classList.add('go');
    statusEl.textContent = 'FINGER BEREIT';
    beep(440, .15, 'square', .08); buzz(20);
    later(() => count(n - 1), 800);
  };
  count(3);

  const padCenter = el => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; };
  const cashOut = k => {
    const mm = Math.floor(m * 100) / 100, win = Math.floor(act[k].bet * mm);
    outs[k] = { m: mm, t: vt, win };
    addChips(act[k].i, win);
    const pad = pads[k];
    pad.classList.remove('live'); pad.classList.add('cashed');
    $('.cr-pa', pad).textContent = 'RAUS BEI ' + crFmt(mm);
    $('.cr-pw', pad).textContent = '+' + fmt(win);
    sfx.cash(); if (mm >= 5) sfx.winBig(mm >= 10 ? 2 : 1);
    buzz(mm >= 5 ? [50, 30, 90] : 45);
    fx.coins(Math.min(50, 10 + Math.round(mm * 4)), padCenter(pad));
  };
  pads.forEach(pad => pad.addEventListener('pointerdown', e => {
    e.preventDefault();
    const k = +pad.dataset.k;
    if (phase === 'fly' && !outs[k]) cashOut(k);
  }));

  const boom = () => {
    phase = 'boom'; shakeT = .9; flashT = .5;
    eng && eng.stop();
    sfx.pop(); noise(1.4, .45, 20, .05, 700); beep(40, 1.2, 'sine', .5, .5, .05); buzz([120, 50, 220]);
    $('.cr-flash').classList.add('on');
    multEl.textContent = crFmt(crash); multEl.className = 'cr-mult crashed';
    statusEl.textContent = '💥 EXPLODIERT';
    for (let k = 0; k < 160; k++) {
      const a = Math.random() * Math.PI * 2, s = 40 + Math.random() * 420;
      parts.push({ x: tip.x, y: tip.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: .5 + Math.random(), max: 1.5, r: 2 + Math.random() * 6, kind: Math.random() < .2 ? 'debris' : 'fire', drag: .92 });
    }
    rings.push({ x: tip.x, y: tip.y, r: 0, life: .7 }, { x: tip.x, y: tip.y, r: 0, life: .9, slow: true });
    pads.forEach((pad, k) => { if (outs[k]) return; pad.classList.remove('live'); pad.classList.add('lost'); $('.cr-pa', pad).textContent = '💥 WEG'; $('.cr-pw', pad).textContent = '−' + fmt(act[k].bet); });
    hist.push(crash); store.set('cr_hist', hist.slice(-20));
    later(results, 1500);
  };

  const results = () => {
    const ws = act.map((p, k) => ({ p, o: outs[k] })).filter(x => x.o);
    const res = document.createElement('div');
    res.className = 'cr-res';
    res.innerHTML = `<div class="cr-rt">Explodiert bei <b class="${crTier(crash)}">${crFmt(crash)}</b></div>
      ${act.map((p, k) => `<div class="cr-rr"><span style="color:${p.color}">${esc(p.name)}</span>${outs[k] ? `<b class="pos">+${fmt(outs[k].win - p.bet)} <small>${crFmt(outs[k].m)}</small></b>` : `<b class="neg">−${fmt(p.bet)}</b>`}</div>`).join('')}
      <div class="row" style="margin-top:12px"><button class="btn sec" id="lob">Lobby</button><button class="btn" id="again">Nächste Runde</button></div>`;
    stage.appendChild(res);
    $('#lob').onclick = home;
    $('#again').onclick = () => crashBet(ps);
    if (ws.length) {
      const best = ws.reduce((a, b) => b.o.win > a.o.win ? b : a);
      fx.win({ title: ws.length > 1 ? 'CASHOUT!' : esc(best.p.name).toUpperCase(), amount: ws.reduce((s, x) => s + x.o.win, 0),
        sub: ws.map(x => `${esc(x.p.name)} bei ${crFmt(x.o.m)}`).join(' · '), big: best.o.m >= 10 });
    } else { sfx.lose(); shake(stage); }
  };

  // Achsen-Schritt für saubere Gitterlinien
  const niceStep = span => [.1, .2, .25, .5, 1, 2, 5, 10, 20, 25, 50].find(s => span / s <= 5) || 100;

  const loop = now => {
    if (!document.body.contains(cv)) { eng && eng.stop(); removeEventListener('resize', resize); return; }
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    if (phase === 'fly') {
      vt += dt * (outs.every(Boolean) ? 3 : 1);
      if (vt >= tc) { vt = tc; m = crash; boom(); }
      else {
        m = crMult(vt);
        multEl.textContent = crFmt(m); multEl.className = 'cr-mult ' + crTier(m);
        pads.forEach((pad, k) => { if (!outs[k]) $('.cr-pw', pad).textContent = fmt(Math.floor(act[k].bet * m)); });
        eng && eng.set(m);
        // Spannungs-Tick wird schneller und höher
        if (now >= nextTick) { sfx.rise(Math.min(1, Math.log(m) / Math.log(20))); nextTick = now + Math.max(90, 420 / Math.sqrt(m)); }
        if (m >= MILES[milestone]) { statusEl.textContent = String(MILES[milestone]).replace('.', ',') + '× ERREICHT'; bell(NOTES[Math.min(10, 4 + milestone)], .08); buzz(25); milestone++; }
      }
    }
    draw(dt);
    requestAnimationFrame(loop);
  };

  const draw = dt => {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const heat = Math.min(1, Math.log(m) / Math.log(20));
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, `hsl(${265 + heat * 50},70%,${6 + heat * 6}%)`); bg.addColorStop(1, `hsl(${280 + heat * 40},80%,${12 + heat * 8}%)`);
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    let sx = 0, sy = 0;
    if (shakeT > 0) { shakeT -= dt; const a = shakeT * 26; sx = (Math.random() - .5) * a; sy = (Math.random() - .5) * a; }
    ctx.translate(sx, sy);

    // Sterne mit Parallax, bei hoher Geschwindigkeit als Streifen
    const speed = phase === 'fly' ? 30 + 160 * heat + 40 * Math.log(m) : phase === 'count' ? 6 : 14;
    for (const s of stars) {
      const v = speed * s.z;
      s.x -= v * dt / W * .7; s.y += v * dt / H;
      if (s.x < 0) s.x += 1; if (s.y > 1) s.y -= 1;
      const x = s.x * W, y = s.y * H, len = Math.max(1.5, Math.min(40, v * .06));
      ctx.strokeStyle = `rgba(255,255,255,${.25 + s.z * .6})`; ctx.lineWidth = s.z * 1.8;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + len * .7, y - len); ctx.stroke();
    }
    // Nebel/Planet unten links
    const pg = ctx.createRadialGradient(W * .05, H * 1.15, 10, W * .05, H * 1.15, H * .6);
    pg.addColorStop(0, '#ff2bd666'); pg.addColorStop(.6, '#7a1fd622'); pg.addColorStop(1, 'transparent');
    ctx.fillStyle = pg; ctx.fillRect(0, 0, W, H);

    // Diagramm
    const L = 46, R = 26, T = 34, B = 28, gw = W - L - R, gh = H - T - B;
    const tMax = Math.max(6, vt * 1.25), mMax = Math.max(1.8, m * 1.3);
    const X = t => L + t / tMax * gw, Y = mm => H - B - (mm - 1) / (mMax - 1) * gh;
    ctx.font = '700 11px ui-rounded,system-ui'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    const ys = niceStep(mMax - 1);
    for (let v = 1; v <= mMax; v += ys) {
      const y = Y(v);
      ctx.strokeStyle = '#ffffff14'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(L, y); ctx.lineTo(W - R + 10, y); ctx.stroke();
      ctx.fillStyle = '#ffffff70'; ctx.fillText((Math.round(v * 100) / 100).toFixed(ys < 1 ? 1 : 0).replace('.', ',') + '×', L - 8, y);
    }
    const xs = niceStep(tMax);
    ctx.textAlign = 'center';
    for (let t = xs; t <= tMax; t += xs) { const x = X(t); ctx.strokeStyle = '#ffffff0c'; ctx.beginPath(); ctx.moveTo(x, T); ctx.lineTo(x, H - B); ctx.stroke(); ctx.fillStyle = '#ffffff50'; ctx.fillText(Math.round(t) + 's', x, H - B + 14); }

    const col = m < 2 ? '#22e4ff' : m < 10 ? '#f7c948' : '#ff2bd6';
    if (phase !== 'count') {
      const N = 70, pts = range(N + 1).map(j => { const t = vt * j / N; return [X(t), Y(crMult(t))]; });
      // Fläche unter der Kurve
      const fg = ctx.createLinearGradient(0, T, 0, H - B);
      fg.addColorStop(0, col + '55'); fg.addColorStop(1, col + '00');
      ctx.fillStyle = fg; ctx.beginPath(); ctx.moveTo(X(0), H - B); pts.forEach(([x, y]) => ctx.lineTo(x, y)); ctx.lineTo(pts[N][0], H - B); ctx.fill();
      // Leuchtende Linie
      ctx.save(); ctx.shadowColor = col; ctx.shadowBlur = 22; ctx.strokeStyle = col; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); pts.forEach(([x, y], j) => j ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke();
      ctx.shadowBlur = 0; ctx.strokeStyle = '#ffffffcc'; ctx.lineWidth = 1.6; ctx.stroke(); ctx.restore();
      // Ausstiegs-Marker
      outs.forEach((o, k) => {
        if (!o) return;
        const x = X(o.t), y = Y(o.m);
        ctx.save(); ctx.shadowColor = act[k].color; ctx.shadowBlur = 12; ctx.fillStyle = act[k].color;
        ctx.beginPath(); ctx.arc(x, y, 7, 0, 7); ctx.fill(); ctx.restore();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, 7, 0, 7); ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.font = '800 11px ui-rounded,system-ui'; ctx.textAlign = 'center';
        ctx.fillText(act[k].name.slice(0, 8), x, y - 15 - (k % 2) * 12);
      });
    }

    // Rakete an der Kurvenspitze, Flammen + Rauch
    if (phase !== 'boom') {
      const x = X(vt), y = Y(m), dmdt = CR_K * m;
      const a = phase === 'count' ? -Math.PI / 4 : Math.atan2(-dmdt * gh / (mMax - 1), gw / tMax);
      const jit = phase === 'count' ? (Math.random() - .5) * 1.5 : (Math.random() - .5) * heat * 2.5;
      tip = { x: x + jit, y: y + jit, a };
      const dx = Math.cos(a), dy = Math.sin(a), tx = tip.x - dx * 18, ty = tip.y - dy * 18;
      const emit = phase === 'fly' ? 4 + Math.round(heat * 4) : 1;
      for (let k = 0; k < emit; k++) {
        const s = 80 + Math.random() * 120, sp = (Math.random() - .5) * .6;
        parts.push({ x: tx, y: ty, vx: -Math.cos(a + sp) * s, vy: -Math.sin(a + sp) * s, life: .25 + Math.random() * .35, max: .6, r: 4 + Math.random() * 5, kind: 'fire', drag: .9 });
        if (Math.random() < .5) parts.push({ x: tx, y: ty, vx: -dx * 40 + (Math.random() - .5) * 30, vy: -dy * 40 + (Math.random() - .5) * 30, life: .8 + Math.random() * .6, max: 1.4, r: 5 + Math.random() * 6, kind: 'smoke', drag: .96 });
      }
    }
    ctx.save();
    parts = parts.filter(p => (p.life -= dt) > 0);
    for (const p of parts) {
      p.vx *= p.drag; p.vy *= p.drag; if (p.kind === 'debris') p.vy += 300 * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      const f = p.life / p.max;
      if (p.kind === 'smoke') { ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = `rgba(200,180,230,${f * .18})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (2 - f), 0, 7); ctx.fill(); }
      else if (p.kind === 'debris') { ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = `rgba(90,80,110,${f})`; ctx.fillRect(p.x, p.y, p.r, p.r); }
      else { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = `hsla(${15 + f * 40},100%,${50 + f * 30}%,${f})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * f + 1, 0, 7); ctx.fill(); }
    }
    ctx.restore();
    if (phase !== 'boom') {
      ctx.save(); ctx.translate(tip.x, tip.y); ctx.rotate(tip.a + Math.PI / 4);
      ctx.shadowColor = '#ff9a3c'; ctx.shadowBlur = 20;
      ctx.font = '42px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('🚀', 0, 0);
      ctx.restore();
    }
    // Druckwellen
    rings = rings.filter(r => (r.life -= dt) > 0);
    for (const r of rings) { r.r += (r.slow ? 260 : 600) * dt; ctx.strokeStyle = `rgba(255,${r.slow ? 80 : 220},120,${r.life})`; ctx.lineWidth = 6 * r.life + 1; ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, 7); ctx.stroke(); }
    // Blitz
    if (flashT > 0) { flashT -= dt; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.fillStyle = `rgba(255,240,220,${Math.min(1, flashT * 1.4)})`; ctx.fillRect(0, 0, W, H); }
  };
  requestAnimationFrame(loop);
}
