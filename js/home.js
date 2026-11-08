'use strict';
// Lobby, Spielerverwaltung, Pleite-Rettung. Wird als letztes geladen.
PARTY.push(
  { id: 'arena', em: '⚡', name: 'Reaktions-Arena', desc: '9 Minispiele gleichzeitig', min: 2, max: 4, start: ps => arenaSetup(ps) },
  { id: 'spion', em: '🕵️', name: 'Spion', desc: 'Wer kennt das Wort nicht?', min: 3, max: 8, start: ps => spionSetup(ps) },
  { id: 'erklaer', em: '🗣️', name: 'Erklär’s!', desc: 'Erklären & vorspielen', min: 2, max: 8, start: ps => erklaerSetup(ps) },
  { id: 'vier', em: '🔴', name: 'Vier gewinnt', desc: 'Duell für zwei', min: 2, max: 2, start: ps => vierStart(ps) },
  { id: 'kniffel', em: '🎲', name: 'Kniffel', desc: 'Würfel-Klassiker', min: 1, max: 4, start: ps => kniffelStart(ps) },
);

const DARES = [
  'Imitiere 30 Sekunden lang einen Lehrer – die anderen raten, wen.',
  'Erzähl deine peinlichste Geschichte der letzten 12 Monate.',
  'Sprich bis zu deinem nächsten Spiel nur in Reimen.',
  'Mach einen 20-Sekunden-Werbespot für den Snack, der dir am nächsten ist.',
  'Beatboxe 15 Sekunden lang.',
  'Sag das Alphabet rückwärts – ohne Fehler.',
  'Mach jedem Mitspieler ein ehrliches Kompliment.',
  'Erzähl einen Witz. Lacht keiner, kommt noch einer.',
  'Sing den Refrain eines Songs, den die anderen aussuchen.',
  'Rede die nächsten 5 Minuten mit einem Akzent deiner Wahl.',
  'Lass die anderen ein Foto von dir in einer Pose ihrer Wahl machen.',
  'Stell eine berühmte Filmszene nach – die anderen raten den Film.',
  'Verrate deinen peinlichsten Song in der Playlist.',
  'Erkläre in 30 Sekunden, warum du der beste Spieler hier bist – mit voller Überzeugung.',
];
const RESCUE = 300;
const WHEEL_CD = 15 * 60000;
const WHEEL = [[100, 18, '#d1293f'], [50, 20, '#1d1533'], [250, 14, '#2a6fdb'], [75, 14, '#1d1533'], [500, 8, '#7d3cc8'], [150, 18, '#1d1533'], [1000, 5, '#1f9d55'], [2500, 3, '#c9971c']];
const wheelReady = i => Date.now() - (players[i].wheelAt || 0) >= WHEEL_CD;

function home() {
  stopAll();
  const rich = Math.max(...players.map(p => p.chips));
  mount(`
    <div class="marquee"><div class="bulbs t">${'<i></i>'.repeat(16)}</div><div class="bulbs b">${'<i></i>'.repeat(16)}</div>
      <div class="topbtns"><button id="mute">${muted ? '🔇' : '🔊'}</button></div>
      <h1>BUS CASINO</h1><div class="tag">★ OFFLINE · NO LIMIT ★</div></div>
    <div class="plstrip">${players.map((p, i) => `<button class="pcard ${p.chips < 10 ? 'broke' : ''}" data-p="${i}" style="--c:${COLORS[i]}">${players.length > 1 && p.chips === rich && rich > 0 ? '<span class="rich">👑</span>' : ''}<b>${esc(p.name)}</b>${p.chips < 10 ? '<span style="color:var(--bad);font-weight:900;font-size:13px">PLEITE 💸</span>' : balHTML(i)}<span class="lv">Lv ${levelOf(p.xp || 0)}<i style="--p:${Math.round(lvlProgress(p.xp || 0) * 100)}%"></i></span></button>`).join('')}<button class="pcard add" id="edit">✎</button></div>
    ${bonusBar()}
    <div class="sect">CASINO</div>
    <div class="tiles">${CASINO.map((g, k) => `<button class="tile ${CASINO.length % 2 && k === CASINO.length - 1 ? 'wide' : ''}" data-c="${g.id}" style="${g.bg ? `--bgt:${g.bg}` : ''}"><div class="ic">${g.em}</div><b>${g.name}</b><span>${g.desc}</span></button>`).join('')}</div>
    <div class="sect">PARTY · +100 CHIPS PRO SIEG</div>
    <div class="plist">${PARTY.map(g => `<button class="ptile" data-q="${g.id}"><div class="em">${g.em}</div><div><b>${g.name}</b><small>${g.min === g.max ? g.min : g.min + '–' + g.max} Spieler</small></div></button>`).join('')}</div>
    <p class="sub small center" style="margin-top:24px">Nur Spielgeld – kein echtes Geld.</p>`);
  $('#mute').onclick = () => { muted = !muted; store.set('bb_muted', muted); home(); };
  $('#edit').onclick = editPlayers;
  $('#bonus').onclick = () => { const r = range(players.length).filter(wheelReady); if (r.length) bonusPick(r); else toast('Noch nicht bereit – gleich wieder!'); };
  const bb = $('#bonus');
  if (bb.classList.contains('wait')) every(() => { if (!document.body.contains(bb)) return; const r = range(players.length).filter(wheelReady); r.length ? home() : $('small', bb).textContent = bonusWait(); }, 1000);
  $$('.pcard[data-p]').forEach(b => b.onclick = () => { const i = +b.dataset.p; if (players[i].chips < 10) rescue(i); else editPlayers(); });
  const launch = g => {
    if (players.length < g.min) return toast(`${g.name} braucht mindestens ${g.min} Spieler`);
    if (players.length > g.max) return choosePlayers(g);
    g.start(asPlayers(range(players.length)));
  };
  $$('[data-c]').forEach(b => b.onclick = () => { sfx.chip(); launch(CASINO.find(g => g.id === b.dataset.c)); });
  $$('[data-q]').forEach(b => b.onclick = () => launch(PARTY.find(g => g.id === b.dataset.q)));
}

function bonusWait() {
  const ms = Math.min(...players.map(p => WHEEL_CD - (Date.now() - (p.wheelAt || 0)))), s = Math.ceil(ms / 1000);
  return `Nächster Dreh in ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
function bonusBar() {
  const r = range(players.length).filter(wheelReady);
  return r.length
    ? `<button class="bonusbar" id="bonus"><span class="bi">🎁</span><span><b>GRATIS-GLÜCKSRAD</b><small>${r.length === players.length ? 'Alle dürfen drehen!' : r.map(i => esc(players[i].name)).join(', ') + ' darf drehen'} · bis zu 2.500 Chips</small></span></button>`
    : `<button class="bonusbar wait" id="bonus"><span class="bi">🎁</span><span><b>Gratis-Glücksrad</b><small>${bonusWait()}</small></span></button>`;
}
function bonusPick(ready) {
  if (ready.length === 1) return bonusWheel(ready[0]);
  mount(`${BACK}<h2 class="gold">🎁 Gratis-Glücksrad</h2><p class="sub">Wer dreht?</p>
    ${ready.map(i => `<button class="pick" data-i="${i}"><i style="background:${COLORS[i]}"></i>${esc(players[i].name)}<span>🎡</span></button>`).join('')}`);
  $$('.pick').forEach(b => b.onclick = () => bonusWheel(+b.dataset.i));
}
function bonusWheel(i) {
  const n = WHEEL.length, segA = 360 / n;
  const conic = WHEEL.map(([, , c], k) => `${c} ${k * segA}deg ${(k + 1) * segA}deg`).join(',');
  mount(`${BACK}<h2 class="gold center">Glücksrad</h2><p class="sub center"><b style="color:${COLORS[i]}">${esc(players[i].name)}</b> dreht – viel Glück!</p>
    <div class="wheelwrap"><div class="pointer"></div>
      <div class="lights">${range(24).map(k => `<i style="transform:rotate(${k * 15}deg) translateY(calc(-1 * min(42vw,170px) - 2px))"></i>`).join('')}</div>
      <div class="wheel" id="wh" style="background:conic-gradient(${conic})">
        ${WHEEL.map(([v], k) => `<div class="seg-l" style="transform:rotate(${k * segA + segA / 2 - 90}deg)">${fmt(v)}</div>`).join('')}
        <div class="hub">🚌</div></div></div>
    <button class="btn" id="spin">DREHEN!</button>`);
  $('#spin').onclick = () => {
    $('#spin').disabled = true; $('#back').disabled = true;
    players[i].wheelAt = Date.now(); savePlayers();
    let r = Math.random() * WHEEL.reduce((a, w) => a + w[1], 0), k = 0;
    while ((r -= WHEEL[k][1]) > 0) k++;
    const target = 360 * 7 - (k * segA + segA / 2) + (Math.random() - .5) * segA * .7;
    const wh = $('#wh');
    sfx.whoosh(); buzz(30);
    requestAnimationFrame(() => wh.style.transform = `rotate(${target}deg)`);
    let lastSeg = 0;
    const watch = () => {
      if (!document.body.contains(wh)) return;
      const m = new DOMMatrix(getComputedStyle(wh).transform), a = (Math.atan2(m.b, m.a) * 180 / Math.PI + 360) % 360;
      const sgi = Math.floor(a / segA);
      if (sgi !== lastSeg) { lastSeg = sgi; sfx.click(); buzz(5); }
      requestAnimationFrame(watch);
    };
    requestAnimationFrame(watch);
    wh.addEventListener('transitionend', () => {
      const v = WHEEL[k][0];
      addChips(i, v);
      fx.win({ title: v >= 1000 ? 'MEGA BONUS!' : 'BONUS!', amount: v, big: v >= 1000 }).then(home);
    }, { once: true });
  };
}

function editPlayers() {
  mount(`${BACK}<h2 class="gold">Spieler</h2>
    <div class="card">${players.map((p, i) => `<div class="prow"><i style="background:${COLORS[i]}"></i><input value="${esc(p.name)}" data-i="${i}" maxlength="14" enterkeyhint="done" autocomplete="off"><span class="bal" style="font-size:14px;min-width:70px;text-align:right">${fmt(p.chips)}</span><button data-del="${i}" ${players.length <= 1 ? 'disabled' : ''}>✕</button></div>`).join('')}
    ${players.length < 8 ? '<button class="btn sec small" id="add">+ Spieler</button>' : ''}</div>
    <p class="sub small">Neue Spieler starten mit ${fmt(START_CHIPS)} Chips.</p>
    <button class="link" id="reset">Alle Chips auf ${fmt(START_CHIPS)} zurücksetzen</button>`, true);
  $$('.prow input').forEach(inp => {
    inp.oninput = () => { players[+inp.dataset.i].name = inp.value; savePlayers(); };
    inp.onblur = () => { const p = players[+inp.dataset.i]; p.name = p.name.trim() || 'Spieler ' + (+inp.dataset.i + 1); inp.value = p.name; savePlayers(); };
    inp.onkeydown = e => { if (e.key === 'Enter') inp.blur(); };
  });
  $$('[data-del]').forEach(b => b.onclick = () => { players.splice(+b.dataset.del, 1); savePlayers(); editPlayers(); });
  const add = $('#add'); if (add) add.onclick = () => { players.push({ name: 'Spieler ' + (players.length + 1), chips: START_CHIPS }); savePlayers(); editPlayers(); const ins = $$('.prow input'); ins[ins.length - 1].select(); };
  const reset = $('#reset');
  reset.onclick = () => {
    if (!reset.dataset.armed) { reset.dataset.armed = 1; reset.textContent = 'Sicher? Nochmal tippen'; return; }
    players.forEach(p => p.chips = START_CHIPS); savePlayers(); editPlayers(); toast('Alle wieder bei ' + fmt(START_CHIPS));
  };
}

function rescue(i) {
  const p = players[i], dare = pick(DARES);
  mount(`${BACK}<div class="center" style="margin-top:6vh"><div class="big2">💸</div><h2 style="color:${COLORS[i]}">${esc(p.name)} ist pleite!</h2>
    <p class="sub">Die Bank gibt dir ${fmt(RESCUE)} Chips – aber nur gegen eine Aufgabe:</p></div>
    <div class="reveal"><div class="word" style="font-size:24px;line-height:1.3">${esc(dare)}</div></div>
    <div class="stack"><button class="btn ok" id="ok">Erledigt – her mit den Chips</button><button class="btn sec" id="other">Andere Aufgabe</button></div>`);
  $('#ok').onclick = () => { addChips(i, RESCUE); fx.win({ title: 'GERETTET', amount: RESCUE }).then(home); };
  $('#other').onclick = () => rescue(i);
}

function choosePlayers(g) {
  const sel = new Set(range(Math.min(g.max, players.length)));
  const draw = () => {
    mount(`${BACK}<h2 class="gold">${g.em} ${g.name}</h2><p class="sub">Wer spielt mit? (${g.min}–${g.max})</p>
      ${players.map((p, i) => `<button class="pick ${sel.has(i) ? 'on' : ''}" data-i="${i}"><i style="background:${COLORS[i]}"></i>${esc(p.name)}<span>${sel.has(i) ? '✓' : ''}</span></button>`).join('')}
      <button class="btn" id="go" style="margin-top:16px" ${sel.size < g.min || sel.size > g.max ? 'disabled' : ''}>Weiter</button>`, true);
    $$('.pick').forEach(b => b.onclick = () => { const i = +b.dataset.i; sel.has(i) ? sel.delete(i) : sel.add(i); draw(); });
    $('#go').onclick = () => g.start(asPlayers([...sel].sort((a, b) => a - b)));
  };
  draw();
}

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
home();
