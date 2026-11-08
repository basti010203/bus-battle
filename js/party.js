'use strict';
// Party-Spiele (ohne Chips-Einsatz). Siege bringen über addWin() Bonus-Chips.
// ---------- Wörter ----------
const WORDS = {
  'Orte': ['Flughafen', 'Krankenhaus', 'Schwimmbad', 'Kino', 'Bahnhof', 'Zoo', 'Friedhof', 'Bibliothek', 'Supermarkt', 'Fitnessstudio', 'Kirche', 'Gefängnis', 'U-Boot', 'Raumstation', 'Skihütte', 'Campingplatz', 'Freizeitpark', 'Tankstelle', 'Bäckerei', 'Disco', 'Strand', 'Zahnarztpraxis', 'Bauernhof', 'Polizeistation', 'Hotel', 'Museum', 'Fußballstadion', 'Weihnachtsmarkt', 'Festival', 'Burg'],
  'Essen': ['Pizza', 'Döner', 'Sushi', 'Wiener Schnitzel', 'Pommes', 'Kaiserschmarrn', 'Spaghetti', 'Burger', 'Leberkässemmel', 'Apfelstrudel', 'Popcorn', 'Germknödel', 'Gulasch', 'Palatschinken', 'Sachertorte', 'Käsekrainer', 'Marillenknödel', 'Ramen', 'Tacos', 'Nutella', 'Müsli', 'Zuckerwatte', 'Eiernockerl', 'Fondue', 'Lasagne'],
  'Tiere': ['Giraffe', 'Pinguin', 'Krokodil', 'Faultier', 'Känguru', 'Hai', 'Eule', 'Oktopus', 'Flamingo', 'Igel', 'Kamel', 'Delfin', 'Biene', 'Schnecke', 'Panda', 'Wolf', 'Papagei', 'Elefant', 'Fledermaus', 'Murmeltier', 'Chamäleon', 'Stinktier', 'Qualle', 'Gorilla'],
  'Berufe': ['Pilot', 'Zahnarzt', 'Koch', 'Lehrer', 'Polizist', 'Friseur', 'Astronaut', 'Bauer', 'DJ', 'Zauberer', 'Detektiv', 'Pirat', 'Busfahrer', 'Tierarzt', 'YouTuber', 'Bäcker', 'Schiedsrichter', 'Clown', 'Bademeister', 'Postler', 'Feuerwehrmann', 'Rauchfangkehrer', 'Chirurg', 'Hacker'],
  'Dinge': ['Regenschirm', 'Zahnbürste', 'Kühlschrank', 'Trampolin', 'Fernbedienung', 'Sonnenbrille', 'Staubsauger', 'Rucksack', 'Kerze', 'Wecker', 'Taschenlampe', 'Föhn', 'Gitarre', 'Schlüssel', 'Ladekabel', 'Kopfhörer', 'Luftmatratze', 'Spiegel', 'Toaster', 'Zelt', 'Klopapier', 'Feuerlöscher', 'Hängematte', 'Mikrowelle'],
  'Freizeit & Sport': ['Fußball', 'Skifahren', 'Bowling', 'Klettern', 'Schach', 'Surfen', 'Karaoke', 'Minigolf', 'Tischtennis', 'Angeln', 'Yoga', 'Boxen', 'Paintball', 'Eislaufen', 'Wandern', 'Tauchen', 'Darts', 'Rodeln', 'Escape Room', 'Lasertag', 'Bungee-Jumping', 'Zumba', 'Beerpong', 'Fallschirmspringen'],
  'Fahrzeuge': ['Fahrrad', 'Heißluftballon', 'Traktor', 'Hubschrauber', 'U-Bahn', 'Kreuzfahrtschiff', 'Müllauto', 'Rakete', 'Skateboard', 'Gondel', 'Feuerwehrauto', 'Tretboot', 'Kinderwagen', 'Straßenbahn', 'Segelboot', 'Motorrad', 'E-Scooter', 'Panzer', 'Sessellift', 'Pistenbully', 'Rikscha', 'Jetski'],
  'Figuren': ['Harry Potter', 'Spider-Man', 'Super Mario', 'Pikachu', 'SpongeBob', 'Shrek', 'Batman', 'Elsa', 'Darth Vader', 'Minions', 'Sherlock Holmes', 'Pippi Langstrumpf', 'Gandalf', 'Homer Simpson', 'Barbie', 'James Bond', 'Joker', 'Yoda', 'Nemo', 'Son Goku', 'Naruto', 'Hulk', 'Asterix', 'Jack Sparrow'],
  'Situationen': ['Hochzeit', 'Geburtstag', 'Silvester', 'Halloween', 'Maturaball', 'Klassenfahrt', 'Weihnachten', 'Ostern', 'Zeugnistag', 'Erster Schultag', 'Führerscheinprüfung', 'Vorstellungsgespräch', 'Stromausfall', 'Umzug', 'Grillfeier', 'Hausparty', 'Schularbeit', 'Stau', 'Erstes Date', 'Zahnarzttermin', 'Flugzeugstart', 'Elternsprechtag'],
  'Natur': ['Vulkan', 'Regenbogen', 'Wasserfall', 'Gewitter', 'Wüste', 'Gletscher', 'Höhle', 'Tornado', 'Insel', 'Mond', 'Lagerfeuer', 'Schneemann', 'Dschungel', 'Sonnenfinsternis', 'Polarlicht', 'Erdbeben', 'Lawine', 'Kaktus', 'Sternschnuppe', 'Korallenriff', 'Sumpf', 'Tropfsteinhöhle'],
};
let deck = [], deckPos = 0;
function nextWord() {
  if (deckPos >= deck.length) { deck = shuffle(Object.values(WORDS).flat()); deckPos = 0; }
  return deck[deckPos++];
}

// ---------- Reaktions-Arena ----------
function stream(c, ms, gen) {
  let ok = false, gap = true, k = 0;
  const step = () => {
    gap = true; c.show('');
    later(() => {
      k++;
      if (k > 30) return c.finish([], 'Zu langsam!');
      ok = k > 2 && (Math.random() < .3 || k % 7 === 0);
      c.show(`<div class="item">${gen(ok)}</div>`);
      gap = false;
    }, 130);
  };
  return {
    start() { step(); every(step, ms); },
    down(i) { if (gap) return; if (ok) c.finish([i]); else c.out(i, 'Falsch!'); },
  };
}
const timeBar = (c, ms) => { const t0 = Date.now(); every(() => { const w = Math.max(0, 100 - (Date.now() - t0) / ms * 100) + '%'; $$('.arena .bar i').forEach(b => b.style.width = w); }, 50); };

const MINI = [
  { id: 'gruen', em: '🟢', name: 'Warte auf Grün', info: 'Tippe, sobald dein Feld GRÜN wird. Bei jeder anderen Farbe oder zu früh = raus!', make(c) {
    let live = false;
    return {
      start() {
        c.show('<div class="msg">Warte…</div>'); c.bgAll('#5a1020');
        const t = 1500 + Math.random() * 4000;
        if (Math.random() < .6) range(1 + rnd(2)).forEach(() => {
          later(() => { c.bgAll(pick(['#1f4fbf', '#b07800', '#6a22b0'])); later(() => { if (!live) c.bgAll('#5a1020'); }, 380); }, 500 + Math.random() * (t - 1100));
        });
        later(() => { live = true; c.bgAll('#13a352'); c.show('<div class="big">JETZT!</div>'); sfx.go(); }, t);
      },
      down(i) { live ? c.finish([i]) : c.out(i, 'Zu früh!'); },
    };
  } },
  { id: 'tipp', em: '👆', name: 'Tipp-Rennen', info: '5 Sekunden lang so schnell tippen wie möglich – mehrere Finger erlaubt!', make(c) {
    const cnt = range(c.n).map(() => 0);
    return {
      start() {
        c.show('<div class="big">0</div><div class="bar"><i></i></div>'); timeBar(c, 5000);
        later(() => { const m = Math.max(...cnt); c.finish(range(c.n).filter(i => m > 0 && cnt[i] === m), i => `${cnt[i]} Taps`); }, 5000);
      },
      down(i) { cnt[i]++; $('.big', c.zc[i]).textContent = cnt[i]; },
    };
  } },
  { id: 'farbe', em: '🎨', name: 'Farb-Falle', info: 'Tippe nur, wenn das Wort in SEINER Farbe geschrieben ist – also ROT in Rot. Falsch = raus!', make: c => stream(c, 1150, ok => {
    const C = [['ROT', '#ff4d6d'], ['BLAU', '#4dabff'], ['GRÜN', '#3ddc84'], ['GELB', '#ffd23c'], ['LILA', '#c77dff']];
    const a = rnd(C.length); let b = a; if (!ok) while (b === a) b = rnd(C.length);
    return `<span style="color:${C[b][1]}">${C[a][0]}</span>`;
  }) },
  { id: 'mathe', em: '🧮', name: 'Mathe-Blitz', info: 'Tippe nur, wenn die Rechnung STIMMT. Falsch = raus!', make: c => stream(c, 1800, ok => {
    const op = pick(['+', '−', '×']); let a, b, r;
    if (op === '×') { a = 2 + rnd(8); b = 2 + rnd(8); r = a * b; }
    else if (op === '+') { a = 3 + rnd(40); b = 3 + rnd(40); r = a + b; }
    else { a = 12 + rnd(40); b = 2 + rnd(a - 3); r = a - b; }
    if (!ok) r += pick([-10, -2, -1, 1, 2, 10]);
    return `<span class="math">${a} ${op} ${b} = ${r}</span>`;
  }) },
  { id: 'jagd', em: '🎯', name: 'Emoji-Jagd', make(c) {
    const E = ['🐸', '🍕', '🚌', '⭐', '🦄', '🍌', '👻', '🎸', '🐙', '🌵', '🍩', '🐧'], t = pick(E);
    const g = stream(c, 800, ok => ok ? t : pick(E.filter(e => e !== t)));
    g.info = `Tippe nur, wenn ${t} erscheint! Alles andere = raus.`;
    return g;
  } },
  { id: 'zwilling', em: '👯', name: 'Zwillinge', info: 'Tippe, wenn beide Smileys GENAU gleich sind. Schau genau hin!', make: c => stream(c, 1100, ok => {
    const E = ['😀', '😃', '😄', '😁', '😆', '😊', '🙂', '😉'], a = pick(E);
    return a + (ok ? a : pick(E.filter(e => e !== a)));
  }) },
  { id: 'zehn', em: '⏱️', name: 'Stopp bei 10', info: 'Die Uhr läuft los und wird nach 3 Sekunden unsichtbar. Tippe genau bei 10,00 s – ein Tipp pro Person!', make(c) {
    const t = range(c.n).map(() => null); let t0;
    const done = () => {
      const d = t.map(v => v == null ? 99 : Math.abs(v - 10)), m = Math.min(...d);
      c.finish(range(c.n).filter(i => m < 99 && d[i] === m), i => t[i] == null ? 'nicht gestoppt' : `${t[i].toFixed(2)} s`);
    };
    return {
      start() {
        t0 = performance.now();
        c.show('<div class="big clock">0.0</div>');
        every(() => { const s = (performance.now() - t0) / 1000; $$('.arena .clock').forEach(e => e.textContent = s < 3 ? s.toFixed(1) : '???'); if (s > 20) done(); }, 50);
      },
      down(i) {
        if (t[i] != null) return;
        t[i] = (performance.now() - t0) / 1000; sfx.tick();
        c.set(i, '<div class="big">✋</div><div class="msg">Gestoppt!</div>');
        if (t.every(v => v != null)) done();
      },
    };
  } },
  { id: 'ballon', em: '🎈', name: 'Ballon-Poker', info: 'Tippe zum Aufpumpen. Größter Ballon nach 8 Sekunden gewinnt – aber jeder platzt irgendwann!', make(c) {
    const size = range(c.n).map(() => 0), lim = range(c.n).map(() => 8 + rnd(28));
    return {
      start() {
        c.show('<div class="balloon">🎈</div><div class="msg">0</div><div class="bar"><i></i></div>'); timeBar(c, 8000);
        later(() => { const alive = c.active(), m = Math.max(0, ...alive.map(i => size[i])); c.finish(alive.filter(i => m > 0 && size[i] === m), i => c.isOut(i) ? `geplatzt bei ${size[i]}` : `${size[i]}× gepumpt`); }, 8000);
      },
      down(i) {
        size[i]++;
        if (size[i] >= lim[i]) { sfx.pop(); return c.out(i, 'Geplatzt!', '💥'); }
        $('.balloon', c.zc[i]).style.transform = `scale(${Math.min(3.2, 1 + size[i] * .07)})`;
        $('.msg', c.zc[i]).textContent = size[i];
      },
    };
  } },
  { id: 'nerven', em: '💣', name: 'Nerven-Probe', info: 'Alle legen einen Finger aufs Feld und halten! Wer zuletzt loslässt, gewinnt – wer bei der Explosion noch drückt, fliegt.', make(c) {
    let phase = 'wait', t0 = 0, boomAt = 0, ws = 0;
    const rel = range(c.n).map(() => null);
    const resolve = boom => {
      phase = 'done';
      const r = c.active().filter(i => rel[i] != null), m = Math.max(0, ...r.map(i => rel[i]));
      const at = ((boomAt - t0) / 1000).toFixed(1);
      c.finish(r.filter(i => rel[i] === m), i => rel[i] != null ? `losgelassen bei ${((rel[i] - t0) / 1000).toFixed(1)} s · Bombe: ${at} s` : c.isOut(i) ? '' : `💥 bei ${at} s noch gedrückt`, boom);
    };
    return {
      start() {
        ws = Date.now();
        c.show('<div class="big">☝️</div><div class="msg">Finger drauf & halten!</div>');
        every(() => {
          const now = Date.now();
          if (phase === 'wait') {
            if (!range(c.n).every(i => c.held(i)) && now - ws < 6000) return;
            range(c.n).forEach(i => { if (!c.held(i)) c.out(i, 'Nicht gedrückt!'); });
            if (!c.active().length) return;
            phase = 'run'; t0 = now; boomAt = now + 3000 + Math.random() * 8000;
            c.show('<div class="big"><span class="bomb">💣</span></div><div class="msg">Halten…</div>');
          } else if (phase === 'run') {
            const dur = Math.max(.18, .8 - (now - t0) / 1000 * .07) + 's';
            $$('.arena .bomb').forEach(b => b.style.animationDuration = dur);
            if (now >= boomAt) { sfx.pop(); resolve(true); }
          }
        }, 50);
      },
      up(i) {
        if (phase !== 'run' || rel[i] != null) return;
        rel[i] = Date.now();
        c.set(i, '<div class="big">😮‍💨</div><div class="msg">Losgelassen</div>');
        if (c.active().every(k => rel[k] != null)) resolve(false);
      },
    };
  } },
];

function arenaSetup(ps) {
  const cfg = store.get('bb_arena_cfg', { target: 5 });
  const draw = () => {
    mount(`${BACK}<h2>⚡ Reaktions-Arena</h2>
      <div class="card rules"><p>Legt das Handy flach zwischen euch. Jeder bekommt ein Feld in seiner Farbe und tippt <b>nur dort</b>.</p><p>Jede Runde kommt ein zufälliges Minispiel. Wer gewinnt, kriegt einen Punkt.</p></div>
      <div class="card"><div class="lbl">Gewonnen hat, wer zuerst … Punkte hat</div>${seg('target', [3, 5, 10], cfg.target)}
      <div class="lbl">Minispiele</div><p class="sub small" style="margin:0">${MINI.map(m => m.em + ' ' + m.name).join(' · ')}</p></div>
      <button class="btn" id="go">Los geht’s</button>`);
    bindSeg(cfg, draw);
    $('#go').onclick = () => { store.set('bb_arena_cfg', cfg); arenaMatch(ps, cfg.target); };
  };
  draw();
}

function arenaMatch(ps, target) {
  stopAll();
  const n = ps.length, score = range(n).map(() => 0), recent = [];
  app.innerHTML = `<div class="arena n${n}">${ps.map((p, i) => `<div class="zone z${i}" style="--c:${p.color}"><div class="zhead"><b>${esc(p.name)}</b><span class="dots"></span></div><div class="zc"></div></div>`).join('')}<button class="quit" id="quit">✕</button></div>`;
  const zones = $$('.zone'), zc = zones.map(z => $('.zc', z)), held = ps.map(() => new Set());
  let game = null, accepting = false, out = new Set();

  const quit = $('#quit');
  quit.onclick = () => {
    if (quit.classList.contains('armed')) return home();
    quit.classList.add('armed'); quit.textContent = 'Beenden?';
    setTimeout(() => { quit.classList.remove('armed'); quit.textContent = '✕'; }, 2500);
  };
  zones.forEach((z, i) => {
    z.addEventListener('pointerdown', e => { e.preventDefault(); held[i].add(e.pointerId); if (game && accepting && !out.has(i)) game.down?.(i); });
    const up = e => { if (!held[i].delete(e.pointerId)) return; if (!held[i].size && game && accepting && !out.has(i)) game.up?.(i); };
    z.addEventListener('pointerup', up); z.addEventListener('pointercancel', up);
  });

  const drawScores = () => zones.forEach((z, i) => {
    $('.dots', z).textContent = target <= 5 ? '●'.repeat(score[i]) + '○'.repeat(Math.max(0, target - score[i])) : `${score[i]} / ${target}`;
  });
  const c = {
    n, ps, zc,
    set: (i, html) => { zc[i].innerHTML = html; },
    show: html => range(n).forEach(i => { if (!out.has(i)) zc[i].innerHTML = html; }),
    bgAll: color => range(n).forEach(i => { if (!out.has(i)) zones[i].style.background = color; }),
    active: () => range(n).filter(i => !out.has(i)),
    isOut: i => out.has(i),
    held: i => held[i].size > 0,
    out(i, msg, em = '😵') {
      if (out.has(i)) return;
      out.add(i); zones[i].classList.add('out');
      zc[i].innerHTML = `<div class="big">${em}</div><div class="msg">${msg}</div>`;
      sfx.bad();
      if (out.size >= n) c.finish([], 'Alle raus!');
    },
    finish(winners, note = '', keepOutLook) {
      if (!game) return;
      accepting = false; game = null; stopAll();
      winners.forEach(i => score[i]++);
      if (winners.length) sfx.win();
      const names = winners.map(w => esc(ps[w].name)).join(' & ');
      range(n).forEach(i => {
        zones[i].style.background = '';
        zones[i].classList.toggle('won', winners.includes(i));
        const head = !winners.length ? '<div class="big">🤷</div><b>Keiner kriegt den Punkt</b>'
          : winners.includes(i) ? '<div class="big">🏆</div><b>Punkt für dich!</b>'
          : `<div class="big">${out.has(i) ? '😵' : '😤'}</div><b>${names} ${winners.length > 1 ? 'kriegen' : 'kriegt'} den Punkt</b>`;
        const nt = typeof note === 'function' ? note(i) : note;
        zc[i].innerHTML = `<div class="res">${head}${nt ? `<p>${nt}</p>` : ''}</div>`;
      });
      drawScores();
      const max = Math.max(...score), leaders = range(n).filter(i => score[i] === max);
      later(max >= target && leaders.length === 1 ? () => arenaEnd(ps, score, target, leaders[0]) : nextRound, 3000);
    },
  };

  function nextRound() {
    stopAll();
    out = new Set();
    zones.forEach(z => { z.classList.remove('out', 'won'); z.style.background = ''; });
    const m = pick(MINI.filter(x => !recent.includes(x.id)));
    recent.push(m.id); if (recent.length > 4) recent.shift();
    accepting = false;
    game = m.make(c);
    c.show(`<div class="intro"><div class="big">${m.em}</div><b>${m.name}</b><p>${game.info || m.info}</p></div>`);
    later(() => {
      let k = 3;
      const cd = () => { if (k === 0) { accepting = true; game.start(); return; } c.show(`<div class="big">${k}</div>`); sfx.tick(); k--; later(cd, 650); };
      cd();
    }, 3800);
  }
  drawScores();
  nextRound();
}

function arenaEnd(ps, score, target, champ) {
  stopAll(); addWin([ps[champ].name]); sfx.win();
  mount(`<div class="center"><div class="trophy">🏆</div><div class="who" style="color:${ps[champ].color}">${esc(ps[champ].name)}</div><p class="sub">gewinnt die Arena und kriegt eine Krone 👑</p></div>
    <div class="card">${scoreRows(ps, score)}</div>
    <div class="stack"><button class="btn" id="again">Revanche</button><button class="btn sec" id="back">Menü</button></div>`);
  $('#again').onclick = () => arenaMatch(ps, target);
}

// ---------- Spion ----------
function spionSetup(ps) {
  const maxSp = ps.length >= 6 ? 2 : 1;
  const cfg = store.get('bb_spion_cfg', { spies: 1, hint: true, min: 5 });
  if (cfg.spies > maxSp) cfg.spies = 1;
  const draw = () => {
    mount(`${BACK}<h2>🕵️ Spion</h2>
      <div class="card rules"><p>Alle bekommen dasselbe geheime Wort – nur der <b>Spion</b> nicht.</p><p>Reihum stellt ihr euch Fragen dazu. Nicht zu offensichtlich, sonst errät der Spion das Wort – aber klar genug, dass ihr euch gegenseitig erkennt.</p><p>Am Ende zeigen alle gleichzeitig auf den Verdächtigen. Wird der Spion erwischt, darf er noch das Wort raten – stimmt’s, gewinnt er trotzdem.</p></div>
      <div class="card">${maxSp > 1 ? `<div class="lbl">Spione</div>${seg('spies', [1, 2], cfg.spies)}` : ''}
      <div class="lbl">Spion kriegt die Kategorie als Tipp</div>${seg('hint', [true, false], cfg.hint, v => v ? 'Ja' : 'Nein')}
      <div class="lbl">Fragezeit</div>${seg('min', [3, 5, 8], cfg.min, v => v + ' min')}</div>
      <button class="btn" id="go">Karten verteilen</button>`);
    bindSeg(cfg, draw);
    $('#go').onclick = () => { store.set('bb_spion_cfg', cfg); spionRound(ps, cfg); };
  };
  draw();
}

function spionRound(ps, cfg) {
  stopAll();
  const cat = pick(Object.keys(WORDS)), word = pick(WORDS[cat]);
  const spies = shuffle(range(ps.length)).slice(0, cfg.spies);
  let i = 0;
  const pass = () => {
    if (i >= ps.length) return talk();
    const p = ps[i];
    mount(`${BACK}<div class="center pass"><p class="sub">Handy weitergeben an</p><div class="who" style="color:${p.color}">${esc(p.name)}</div><p class="sub">Die anderen schauen weg 🙈</p><button class="btn" id="show">Aufdecken</button><p class="sub small" style="margin-top:14px">${i + 1} / ${ps.length}</p></div>`);
    $('#show').onclick = () => {
      const spy = spies.includes(i);
      mount(`${BACK}<div class="reveal ${spy ? 'spy' : ''}">${spy
        ? `<div class="big2">🕵️</div><div class="word">Du bist ${cfg.spies > 1 ? 'ein' : 'der'} Spion!</div><p>${cfg.hint ? `Kategorie: <b>${cat}</b><br>` : ''}Finde das Wort heraus, ohne aufzufliegen.</p>`
        : `<p class="sub">Das geheime Wort</p><div class="word">${esc(word)}</div><p class="sub">Kategorie: ${cat}</p>`}</div>
        <button class="btn sec" id="hide">Verstecken & weitergeben</button>`);
      $('#hide').onclick = () => { i++; pass(); };
    };
  };
  const talk = () => {
    const first = pick(ps), end = Date.now() + cfg.min * 60000;
    let over = false;
    mount(`${BACK}<div class="lbl center" style="margin-top:20px">Fragerunde</div><div class="timer" id="t"></div>
      <p class="center" style="font-size:18px"><b style="color:${first.color}">${esc(first.name)}</b> stellt die erste Frage.</p>
      <p class="sub center">Fragt euch reihum zum Wort aus, z. B. „Warst du da schon mal?“ oder „Würdest du das verschenken?“</p>
      <button class="btn" id="vote">Jetzt abstimmen</button>`);
    const tick = () => {
      const s = Math.max(0, Math.ceil((end - Date.now()) / 1000)), el = $('#t');
      if (!el) return;
      el.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
      el.classList.toggle('low', s <= 10);
      if (s <= 10 && s > 0) sfx.tick();
      if (!s && !over) { over = true; sfx.bad(); el.classList.add('over'); $('#vote').textContent = 'Zeit um! Abstimmen'; }
    };
    tick(); every(tick, 1000);
    $('#vote').onclick = vote;
  };
  const vote = () => {
    stopAll();
    mount(`${BACK}<div class="center" style="margin-top:8vh"><div class="big2">👉</div><h2>Auf drei zeigen alle gleichzeitig auf den Spion!</h2>
      <p class="sub">Wer die meisten Finger abkriegt, ist angeklagt. Ist es wirklich ${cfg.spies > 1 ? 'ein' : 'der'} Spion, darf er noch das Wort raten.</p></div>
      <button class="btn" id="rev">Auflösung zeigen</button>`);
    $('#rev').onclick = reveal;
  };
  const reveal = () => {
    const spyNames = spies.map(s => ps[s].name), others = ps.filter((_, k) => !spies.includes(k)).map(p => p.name);
    mount(`${BACK}<div class="reveal spy"><p class="sub">${spies.length > 1 ? 'Die Spione waren' : 'Der Spion war'}</p><div class="word">${spyNames.map(esc).join(' & ')}</div><p class="sub">Das Wort war <b style="color:#fff">${esc(word)}</b></p></div>
      <div class="lbl center">Wer hat gewonnen?</div>
      <div class="row"><button class="btn" id="ws">🕵️ Spion</button><button class="btn" id="wg">👥 Die anderen</button></div>`);
    const fin = names => { addWin(names); after(names); };
    $('#ws').onclick = () => fin(spyNames);
    $('#wg').onclick = () => fin(others);
  };
  const after = names => {
    mount(`${BACK}<div class="center" style="margin-top:8vh"><div class="big2">👑</div><h2>${names.map(esc).join(', ')}</h2><p class="sub">${names.length > 1 ? 'kriegen je eine Krone' : 'kriegt eine Krone'}</p></div>
      <div class="stack"><button class="btn" id="next">Nächste Runde</button><button class="btn sec" id="menu">Menü</button></div>`);
    $('#next').onclick = () => spionRound(ps, cfg);
    $('#menu').onclick = home;
  };
  pass();
}

// ---------- Erklär's ----------
function erklaerSetup(ps) {
  const cfg = store.get('bb_erklaer_cfg', { rounds: 2, time: 60, panto: true });
  const draw = () => {
    mount(`${BACK}<h2>🗣️ Erklär’s!</h2>
      <div class="card rules"><p>Reihum erklärt einer so viele Begriffe wie möglich, die anderen raten. Das Wort selbst darf nicht fallen!</p><p>Bei 🎭-Karten wird nur vorgespielt, ohne ein Wort zu sagen. Wer errät, kriegt einen Punkt – der Erklärer auch.</p></div>
      <div class="card"><div class="lbl">Runden pro Person</div>${seg('rounds', [1, 2, 3], cfg.rounds)}
      <div class="lbl">Zeit pro Runde</div>${seg('time', [45, 60, 90], cfg.time, v => v + ' s')}
      <div class="lbl">Karten</div>${seg('panto', [false, true], cfg.panto, v => v ? '+ Pantomime' : 'Nur erklären')}</div>
      <button class="btn" id="go">Los geht’s</button>`);
    bindSeg(cfg, draw);
    $('#go').onclick = () => { store.set('bb_erklaer_cfg', cfg); erklaerGame(ps, cfg); };
  };
  draw();
}

function erklaerGame(ps, cfg) {
  const n = ps.length, score = range(n).map(() => 0), total = n * cfg.rounds;
  let turn = 0;
  const pre = () => {
    stopAll();
    if (turn >= total) return end();
    const e = turn % n;
    mount(`${BACK}<div class="center pass" style="padding-top:6vh"><p class="sub">Runde ${Math.floor(turn / n) + 1} von ${cfg.rounds}</p><div class="who" style="color:${ps[e].color}">${esc(ps[e].name)}</div><p class="sub">erklärt jetzt – nur ${esc(ps[e].name)} schaut aufs Handy!</p><button class="btn" id="go">Start (${cfg.time} s)</button></div>
      <div class="card">${scoreRows(ps, score)}</div>`);
    $('#go').onclick = () => play(e);
  };
  const play = e => {
    const t0 = Date.now();
    let got = 0, card, picking = false, timeUp = false, lastS = cfg.time;
    const next = () => { card = { w: nextWord(), panto: cfg.panto && Math.random() < .3 }; draw(); };
    const draw = () => {
      mount(`<div class="timer" id="t">${lastS}</div>
        <div class="wcard ${card.panto ? 'panto' : ''}"><div class="mode">${card.panto ? '🎭 Vorspielen – kein Wort sagen!' : '🗣️ Erklären – ohne das Wort'}</div><div class="word">${esc(card.w)}</div></div>
        <div id="acts" class="stack"><button class="btn ok" id="ok">✓ Erraten</button><button class="btn sec" id="skip">Überspringen</button></div>
        <p class="sub center" style="margin-top:14px">${got} erraten</p>`, true);
      $('#ok').onclick = guessed;
      $('#skip').onclick = next;
    };
    const credit = g => { score[e]++; score[g]++; got++; picking = false; sfx.tick(); timeUp ? finish() : next(); };
    const guessed = () => {
      const others = range(n).filter(k => k !== e);
      if (others.length === 1) return credit(others[0]);
      picking = true;
      $('#acts').innerHTML = `<div class="lbl center">Wer hat’s erraten?</div>${others.map(k => `<button class="btn sec" data-g="${k}" style="color:${ps[k].color}">${esc(ps[k].name)}</button>`).join('')}<button class="link" id="cancel" style="width:100%">Abbrechen</button>`;
      $$('[data-g]').forEach(b => b.onclick = () => credit(+b.dataset.g));
      $('#cancel').onclick = () => { picking = false; timeUp ? finish() : draw(); };
    };
    const finish = () => {
      stopAll(); turn++;
      mount(`<div class="center" style="margin-top:8vh"><div class="big2">⏰</div><h2>Zeit um!</h2><p class="sub">${esc(ps[e].name)} hat ${got} ${got === 1 ? 'Begriff' : 'Begriffe'} rübergebracht.<br>Letzte Karte: <b>${esc(card.w)}</b></p></div>
        <button class="btn" id="go">${turn >= total ? 'Ergebnis' : 'Weiter'}</button>`);
      $('#go').onclick = pre;
    };
    every(() => {
      const s = Math.max(0, cfg.time - Math.floor((Date.now() - t0) / 1000));
      if (s === lastS) return;
      lastS = s;
      const el = $('#t'); if (el) { el.textContent = s; el.classList.toggle('low', s <= 5); }
      if (s <= 5 && s > 0) sfx.tick();
      if (!s && !timeUp) { timeUp = true; sfx.bad(); if (!picking) finish(); }
    }, 200);
    next();
  };
  const end = () => {
    const max = Math.max(...score), sum = score.reduce((a, b) => a + b, 0) / 2;
    const top = range(n).filter(i => score[i] === max && max > 0);
    if (n > 2 && top.length) addWin(top.map(i => ps[i].name));
    let best = store.get('bb_erklaer_rekord', 0);
    const rec = n === 2 && sum > best;
    if (rec) store.set('bb_erklaer_rekord', sum);
    mount(`<div class="center"><div class="trophy">${n === 2 ? '🤝' : '🏆'}</div>
      ${n === 2 ? `<h2>${sum} Begriffe gemeinsam</h2><p class="sub">${rec ? 'Neuer Rekord!' : `Rekord: ${best}`}</p>`
        : `<div class="who">${top.map(i => `<span style="color:${ps[i].color}">${esc(ps[i].name)}</span>`).join(' & ') || '–'}</div><p class="sub">${top.length ? 'gewinnt und kriegt eine Krone 👑' : ''}</p>`}</div>
      <div class="card">${scoreRows(ps, score)}</div>
      <div class="stack"><button class="btn" id="again">Nochmal</button><button class="btn sec" id="back">Menü</button></div>`);
    $('#again').onclick = () => erklaerGame(ps, cfg);
  };
  pre();
}

// ---------- Vier gewinnt ----------
function vierStart(ps, starter = 0) {
  const R = 6, C = 7, b = range(R).map(() => Array(C).fill(-1));
  let cur = starter, last = null, line = null, over = false;
  const winLine = (r, c) => {
    for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) {
      const l = [[r, c]];
      for (const d of [1, -1]) {
        let y = r + dr * d, x = c + dc * d;
        while (y >= 0 && y < R && x >= 0 && x < C && b[y][x] === b[r][c]) { l.push([y, x]); y += dr * d; x += dc * d; }
      }
      if (l.length >= 4) return l;
    }
    return null;
  };
  const draw = () => {
    const isWin = (r, c) => line && line.some(([y, x]) => y === r && x === c);
    const status = line ? `<b>${esc(ps[cur].name)}</b> gewinnt! 🎉` : over ? '<b style="color:var(--txt)">Unentschieden</b>' : `<b>${esc(ps[cur].name)}</b> ist dran`;
    mount(`${BACK}<h2>🔴 Vier gewinnt</h2><div class="khead" style="--c:${ps[cur].color}">${status}</div>
      <div class="c4">${range(R).map(r => range(C).map(c => `<button class="c4c" data-c="${c}">${b[r][c] >= 0 ? `<i style="background:${ps[b[r][c]].color}" class="${last && last[0] === r && last[1] === c ? 'drop' : ''} ${isWin(r, c) ? 'win' : ''}"></i>` : ''}</button>`).join('')).join('')}</div>
      ${over ? '<div class="stack"><button class="btn" id="again">Nochmal</button><button class="btn sec" id="menu">Menü</button></div>' : '<p class="sub center">Tippe in eine Spalte, um einen Stein fallen zu lassen.</p>'}`, true);
    if (over) { $('#again').onclick = () => vierStart(ps, 1 - starter); $('#menu').onclick = home; return; }
    $$('.c4c').forEach(el => el.onclick = () => {
      const c = +el.dataset.c, r = b.map(row => row[c]).lastIndexOf(-1);
      if (r < 0) return;
      b[r][c] = cur; last = [r, c]; sfx.tick();
      line = winLine(r, c);
      if (line) { over = true; addWin([ps[cur].name]); sfx.win(); }
      else if (b[0].every(v => v >= 0)) over = true;
      else cur = 1 - cur;
      draw();
    });
  };
  draw();
}

// ---------- Kniffel ----------
const kSum = d => d.reduce((a, b) => a + b, 0);
const kCounts = d => { const c = [0, 0, 0, 0, 0, 0, 0]; d.forEach(v => c[v]++); return c; };
const kMax = d => Math.max(...kCounts(d));
const kRun = (d, len) => { const s = new Set(d); for (let a = 1; a + len - 1 <= 6; a++) if (range(len).every(k => s.has(a + k))) return true; return false; };
const KN = [
  ...['Einser', 'Zweier', 'Dreier', 'Vierer', 'Fünfer', 'Sechser'].map((name, k) => ({ id: 'u' + (k + 1), name, up: true, f: d => d.filter(x => x === k + 1).length * (k + 1) })),
  { id: 'p3', name: 'Dreierpasch', f: d => kMax(d) >= 3 ? kSum(d) : 0 },
  { id: 'p4', name: 'Viererpasch', f: d => kMax(d) >= 4 ? kSum(d) : 0 },
  { id: 'fh', name: 'Full House', f: d => { const c = kCounts(d).filter(x => x).sort(); return c.length === 2 && c[0] === 2 ? 25 : 0; } },
  { id: 'ks', name: 'Kleine Straße', f: d => kRun(d, 4) ? 30 : 0 },
  { id: 'gs', name: 'Große Straße', f: d => kRun(d, 5) ? 40 : 0 },
  { id: 'kn', name: 'Kniffel', f: d => kMax(d) === 5 ? 50 : 0 },
  { id: 'ch', name: 'Chance', f: kSum },
];
const kUpper = s => KN.filter(c => c.up).reduce((a, c) => a + (s[c.id] || 0), 0);
const kTotal = s => { const u = kUpper(s); return u + (u >= 63 ? 35 : 0) + KN.filter(c => !c.up).reduce((a, c) => a + (s[c.id] || 0), 0) + (s.bonus || 0); };
const kDone = s => KN.every(c => s[c.id] != null);
const PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
const pipHTML = v => `<div class="pips">${range(9).map(k => `<i class="${PIPS[v].includes(k) ? 'on' : ''}"></i>`).join('')}</div>`;
let K = null;
const kSave = () => store.set('bb_kniffel', K);

function kniffelStart(ps) {
  const saved = store.get('bb_kniffel', null);
  if (!saved || saved.s.every(kDone)) return kNew(ps);
  const round = Math.min(13, Math.min(...saved.s.map(s => KN.filter(c => s[c.id] != null).length)) + 1);
  mount(`${BACK}<h2>🎲 Kniffel</h2><div class="card"><div class="lbl">Gespeichertes Spiel</div><p style="margin:0 0 4px;font-weight:700">${saved.ps.map(p => esc(p.name)).join(', ')}</p><p class="sub" style="margin:0">Runde ${round} von 13</p></div>
    <div class="stack"><button class="btn" id="cont">Weiterspielen</button><button class="btn sec" id="new">Neues Spiel</button></div>`);
  $('#cont').onclick = () => { K = saved; kDraw(); };
  $('#new').onclick = () => kNew(ps);
}
function kNew(ps) {
  K = { ps, s: ps.map(() => ({})), cur: 0, dice: [1, 1, 1, 1, 1], held: [0, 0, 0, 0, 0], rolls: 0, sel: null };
  kSave(); kDraw();
  window.scrollTo(0, 0);
}
function kDraw(anim) {
  const { ps, s, cur, dice, held, rolls, sel } = K, p = ps[cur];
  const pv = rolls ? Object.fromEntries(KN.map(c => [c.id, c.f(dice)])) : {};
  const round = KN.filter(c => s[cur][c.id] != null).length + 1;
  const cell = (i, c) => {
    const v = s[i][c.id];
    if (v != null) return `<td class="${i === cur ? 'cur' : ''}">${v}</td>`;
    if (i === cur && rolls) return `<td class="cur pv ${pv[c.id] ? '' : 'zero'} ${sel === c.id ? 'sel' : ''}" data-c="${c.id}">${pv[c.id]}</td>`;
    return `<td class="${i === cur ? 'cur' : ''}"></td>`;
  };
  const row = c => `<tr><th>${c.name}</th>${ps.map((_, i) => cell(i, c)).join('')}</tr>`;
  const sumRow = (label, f, cls = 'sum') => `<tr class="${cls}"><th>${label}</th>${ps.map((_, i) => `<td>${f(s[i])}</td>`).join('')}</tr>`;
  const hint = !rolls ? 'Würfle los!' : rolls < 3 ? 'Tippe Würfel zum Halten und würfle nochmal – oder wähle unten ein Feld.' : 'Keine Würfe mehr – wähle unten ein Feld.';
  const selC = KN.find(c => c.id === sel);
  app.innerHTML = `<div class="screen">${BACK}
    <div class="khead" style="--c:${p.color}"><b>${esc(p.name)}</b>${ps.length > 1 ? ' ist dran' : ''}<span>Runde ${round}/13</span></div>
    <div class="dice">${dice.map((v, i) => `<button class="die ${held[i] ? 'held' : ''} ${anim && !held[i] ? 'roll' : ''}" data-d="${i}">${rolls ? pipHTML(v) : '?'}</button>`).join('')}</div>
    <p class="hint">${hint}</p>
    <div class="row"><button class="btn ${sel ? 'sec' : ''}" id="roll" ${rolls >= 3 ? 'disabled' : ''}>🎲 Würfeln <small>(${3 - rolls})</small></button>${sel ? `<button class="btn ok" id="take">${selC.name}: ${pv[sel]}</button>` : ''}</div>
    <table class="sheet"><thead><tr><th></th>${ps.map(q => `<th style="color:${q.color}">${esc(q.name.slice(0, 7))}</th>`).join('')}</tr></thead><tbody>
      ${KN.filter(c => c.up).map(row).join('')}
      ${sumRow('Summe oben', kUpper)}
      ${sumRow('Bonus <small>(ab 63)</small>', x => kUpper(x) >= 63 ? 35 : `<small>${kUpper(x) - 63}</small>`)}
      ${KN.filter(c => !c.up).map(row).join('')}
      ${s.some(x => x.bonus) ? sumRow('Extra-Kniffel', x => x.bonus || '') : ''}
      ${sumRow('Gesamt', kTotal, 'tot')}
    </tbody></table></div>`;
  $('#back').onclick = home;
  $$('.die').forEach(b => b.onclick = () => { if (!rolls || rolls >= 3) return; const i = +b.dataset.d; K.held[i] = K.held[i] ? 0 : 1; kSave(); kDraw(); });
  $('#roll').onclick = () => {
    if (K.rolls >= 3) return;
    K.dice = K.dice.map((v, i) => K.held[i] ? v : 1 + rnd(6));
    K.rolls++; K.sel = null; kSave(); kDraw(true); sfx.tick();
    if (kMax(K.dice) === 5) { toast('🎉 KNIFFEL!'); sfx.win(); }
  };
  $$('td[data-c]').forEach(td => td.onclick = () => { K.sel = K.sel === td.dataset.c ? null : td.dataset.c; kDraw(); });
  const take = $('#take'); if (take) take.onclick = kTake;
}
function kTake() {
  const sc = K.s[K.cur], c = KN.find(x => x.id === K.sel);
  if (kMax(K.dice) === 5 && sc.kn === 50 && c.id !== 'kn') sc.bonus = (sc.bonus || 0) + 50;
  sc[c.id] = c.f(K.dice);
  if (K.s.every(kDone)) return kEnd();
  K.cur = (K.cur + 1) % K.ps.length;
  Object.assign(K, { dice: [1, 1, 1, 1, 1], held: [0, 0, 0, 0, 0], rolls: 0, sel: null });
  kSave(); kDraw();
  if (K.ps.length > 1) { toast(`${K.ps[K.cur].name} ist dran`); window.scrollTo(0, 0); }
}
function kEnd() {
  const { ps, s } = K, tot = s.map(kTotal), max = Math.max(...tot);
  const top = range(ps.length).filter(i => tot[i] === max);
  store.del('bb_kniffel');
  if (ps.length > 1) addWin(top.map(i => ps[i].name));
  const high = store.get('bb_kn_high', 0), rec = max > high;
  if (rec) store.set('bb_kn_high', max);
  sfx.win();
  mount(`<div class="center"><div class="trophy">🎲</div><div class="who">${top.map(i => `<span style="color:${ps[i].color}">${esc(ps[i].name)}</span>`).join(' & ')}</div>
    <p class="sub">${ps.length > 1 ? 'gewinnt mit' : 'schafft'} ${max} Punkten${rec ? ' – neuer Rekord! 🔥' : ` · Rekord: ${high}`}</p></div>
    <div class="card">${scoreRows(ps, tot)}</div>
    <div class="stack"><button class="btn" id="again">Neues Spiel</button><button class="btn sec" id="back">Menü</button></div>`);
  $('#again').onclick = () => kNew(ps);
}

