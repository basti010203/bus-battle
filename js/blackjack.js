'use strict';
// Blackjack: 1–4 Spieler gegen den Dealer, 6-Deck-Shoe, Dealer steht auf Soft 17, Blackjack zahlt 3:2.
(() => {
  const SUITS = ['♠', '♥', '♦', '♣'], RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const DECKS = 6, RESHUFFLE = DECKS * 52 * .25;
  const PIPS = {
    2: [[50, 0], [50, 100]], 3: [[50, 0], [50, 50], [50, 100]], 4: [[25, 0], [75, 0], [25, 100], [75, 100]],
    5: [[25, 0], [75, 0], [50, 50], [25, 100], [75, 100]], 6: [[25, 0], [75, 0], [25, 50], [75, 50], [25, 100], [75, 100]],
    7: [[25, 0], [75, 0], [50, 25], [25, 50], [75, 50], [25, 100], [75, 100]],
    8: [[25, 0], [75, 0], [50, 25], [25, 50], [75, 50], [50, 75], [25, 100], [75, 100]],
    9: [[25, 0], [75, 0], [25, 33], [75, 33], [50, 50], [25, 67], [75, 67], [25, 100], [75, 100]],
    10: [[25, 0], [75, 0], [50, 17], [25, 33], [75, 33], [25, 67], [75, 67], [50, 83], [25, 100], [75, 100]],
  };
  let shoe = [], cid = 0, S = null, busy = false;

  const newShoe = () => { shoe = shuffle(range(DECKS).flatMap(() => SUITS.flatMap(s => RANKS.map(r => ({ r, s }))))); };
  const draw = () => ({ ...shoe.pop(), id: ++cid, fresh: true });
  const val = c => c.r === 'A' ? 11 : 'JQK'.includes(c.r) ? 10 : +c.r;
  const total = cards => {
    let t = 0, a = 0;
    for (const c of cards) { t += val(c); if (c.r === 'A') a++; }
    while (t > 21 && a) { t -= 10; a--; }
    return { t, soft: a > 0 };
  };
  const isBJcards = cards => cards.length === 2 && total(cards).t === 21;
  const isBJ = h => !h.split && isBJcards(h.cards);
  const red = c => c.s === '♥' || c.s === '♦';

  // ---------- Sound ----------
  const snd = (n, ...a) => (sfx[n] || sfx.tick)(...a);
  const sDeal = () => { snd('card'); buzz(8); };
  const sKnock = () => { beep(120, .07, 'sine', .35, .7); beep(120, .07, 'sine', .35, .7, .11); noise(.03, .2, 200, 0, 900); noise(.03, .2, 200, .11, 900); };
  const s21 = () => { bell(1568, .09); bell(2093, .08, .08, .6); buzz(25); };
  const sBust = () => { snd('lose'); noise(.25, .25, 60, 0, 500); buzz([60, 40, 90]); };

  // ---------- Darstellung ----------
  function cardHTML(c, { down = false, reveal = false } = {}) {
    let mid;
    if (c.r === 'A') mid = `<div class="bj-ace">${c.s}</div>`;
    else if ('JQK'.includes(c.r)) { const g = { J: '♞', Q: '♛', K: '♚' }[c.r]; mid = `<div class="bj-court"><span>${g}</span><span>${g}</span></div>`; }
    else mid = `<div class="bj-pips">${PIPS[c.r].map(([x, y]) => `<i style="left:${x}%;top:${y}%"${y > 50 ? ' class="u"' : ''}>${c.s}</i>`).join('')}</div>`;
    const idx = `<b>${c.r}</b><i>${c.s}</i>`;
    const cls = ['bj-card', red(c) ? 'bj-red' : '', down ? 'bj-down' : '', c.fresh ? 'bj-fresh' : '', reveal ? 'bj-reveal' : ''].join(' ');
    return `<div class="${cls}"><div class="bj-in"><div class="bj-face"><div class="bj-idx tl">${idx}</div>${mid}<div class="bj-idx br">${idx}</div></div><div class="bj-back"></div></div></div>`;
  }
  function badge(cards, h) {
    if (!cards.length) return '';
    const { t, soft } = total(cards);
    if (t > 21) return `<span class="bj-badge bust">${t} · BUST</span>`;
    if (h ? isBJ(h) : isBJcards(cards)) return '<span class="bj-badge bjk">BLACKJACK</span>';
    return `<span class="bj-badge ${t === 21 ? 's21' : ''}">${soft && t < 21 ? `${t - 10}/${t}` : t}</span>`;
  }
  const RES = {
    win: h => `+${fmt(h.res.net)}`, bj: h => `BLACKJACK +${fmt(h.res.net)}`,
    push: () => 'PUSH', lose: h => `−${fmt(h.bet)}`,
  };
  function handHTML(h, on, two) {
    return `<div class="bj-hw ${on && two ? 'on' : ''} ${h.res && h.res.kind === 'lose' ? 'lost' : ''}">
      <div class="bj-hand">${h.cards.map(c => cardHTML(c)).join('')}</div>
      <div class="bj-meta">${stackHTML(h.bet, 5)}<span class="bj-bet">${fmt(h.bet)}${h.doubled ? ' ×2' : ''}</span>${badge(h.cards, h)}</div>
      ${h.res ? `<div class="bj-res ${h.res.kind}">${RES[h.res.kind](h)}</div>` : ''}</div>`;
  }
  function seatHTML(seat, si) {
    const active = S.turn && S.turn.s === si, two = seat.hands.length > 1;
    return `<div class="bj-seat ${active ? 'bj-active' : ''}" style="--c:${seat.p.color}">
      <div class="bj-name"><b>${esc(seat.p.name)}</b>${balHTML(seat.p.i)}</div>
      <div class="bj-hands ${two ? 'two' : ''}">${seat.hands.map((h, hi) => handHTML(h, active && S.turn.h === hi, two)).join('')}</div>
    </div>`;
  }
  const ARC = `<svg class="bj-arc" viewBox="0 0 360 78" aria-hidden="true"><defs>
      <linearGradient id="bjG" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#fff3b0"/><stop offset=".5" stop-color="#f7c948"/><stop offset="1" stop-color="#c08a12"/></linearGradient>
      <path id="bjA1" d="M22,18 Q180,80 338,18"/><path id="bjA2" d="M60,42 Q180,92 300,42"/></defs>
    <path d="M10,6 Q180,76 350,6" class="bj-line"/>
    <text class="bj-a1"><textPath href="#bjA1" startOffset="50%" text-anchor="middle">BLACKJACK PAYS 3 TO 2</textPath></text>
    <text class="bj-a2"><textPath href="#bjA2" startOffset="50%" text-anchor="middle">DEALER STEHT AUF 17</textPath></text></svg>`;

  function render() {
    const felt = $('#bj-felt'); if (!felt) return;
    const dTot = S.holeDown ? badge(S.dealer.slice(0, 1)) : badge(S.dealer);
    felt.innerHTML = `
      <div class="bj-shoe"><i></i><i></i><i></i><span>${shoe.length}</span></div>
      <div class="bj-dealer"><div class="bj-dlbl">DEALER</div>
        <div class="bj-hand bj-dh">${S.dealer.map((c, k) => cardHTML(c, { down: k === 1 && S.holeDown, reveal: k === 1 && S.reveal })).join('')}</div>
        <div class="bj-dmeta">${S.dealer.length ? dTot : ''}</div></div>
      ${ARC}
      <div class="bj-seats n${S.seats.length}">${S.seats.map(seatHTML).join('')}</div>`;
    // Neue Karten fliegen vom Shoe zu ihrem Platz
    const r0 = $('.bj-shoe', felt).getBoundingClientRect();
    $$('.bj-fresh', felt).forEach(el => {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--fx', `${r0.left + r0.width / 2 - r.left - r.width / 2}px`);
      el.style.setProperty('--fy', `${r0.top + r0.height / 2 - r.top - r.height / 2}px`);
      el.classList.add('bj-new');
    });
    S.dealer.forEach(c => c.fresh = false);
    S.seats.forEach(s => s.hands.forEach(h => h.cards.forEach(c => c.fresh = false)));
    S.reveal = false;
    renderBar();
  }

  function renderBar() {
    const bar = $('#bj-bar'); if (!bar) return;
    if (S.phase === 'done') {
      bar.innerHTML = `<div class="bj-status">${summary()}</div><div class="row"><button class="btn" id="bj-next">Nächste Runde</button><button class="btn sec" id="bj-lobby" style="flex:.6">Lobby</button></div>`;
      $('#bj-next').onclick = () => { snd('chip'); round(S.ps); };
      $('#bj-lobby').onclick = home;
      return;
    }
    const play = S.phase === 'play' && S.turn;
    const seat = play && S.seats[S.turn.s], h = play && seat.hands[S.turn.h];
    const canD = play && h.cards.length === 2 && chips(seat.p.i) >= h.bet;
    const canS = play && seat.hands.length === 1 && h.cards.length === 2 && val(h.cards[0]) === val(h.cards[1]) && chips(seat.p.i) >= h.bet;
    const status = play
      ? `<b style="color:${seat.p.color}">${esc(seat.p.name)}</b> ist dran${seat.hands.length > 1 ? ` · Hand ${S.turn.h + 1}/2` : ''} <span class="bj-hint">${total(h.cards).t}</span>`
      : S.phase === 'dealer' ? 'Dealer zieht …' : 'Karten werden ausgeteilt …';
    bar.innerHTML = `<div class="bj-status">${status}</div><div class="bj-acts">
      <button class="bj-act hit" data-a="hit" ${play ? '' : 'disabled'}><span>＋</span>Karte</button>
      <button class="bj-act stand" data-a="stand" ${play ? '' : 'disabled'}><span>✋</span>Bleiben</button>
      <button class="bj-act dbl" data-a="double" ${canD ? '' : 'disabled'}><span>×2</span>Doppeln</button>
      <button class="bj-act split" data-a="split" ${canS ? '' : 'disabled'}><span>⇆</span>Teilen</button></div>`;
    $$('.bj-act', bar).forEach(b => b.onclick = () => act(b.dataset.a));
  }
  function summary() {
    return S.seats.map(s => `<span style="color:${s.p.color}">${esc(s.p.name)}</span> <b class="${s.net > 0 ? 'bj-plus' : s.net < 0 ? 'bj-minus' : ''}">${s.net > 0 ? '+' : s.net < 0 ? '−' : '±'}${fmt(Math.abs(s.net))}</b>`).join(' · ');
  }

  // ---------- Ablauf ----------
  function round(ps) {
    stopAll(); busy = false;
    if (!ps.some(p => chips(p.i) >= 10)) { toast('Alle pleite – ab in die Lobby 💸'); return home(); }
    betScreen({ title: '🃏 Blackjack', sub: 'Einsätze setzen – Blackjack zahlt 3:2', ps, confirm: 'Karten austeilen', onDone: bets => deal(ps, bets) });
  }

  async function deal(ps, bets) {
    if (shoe.length < RESHUFFLE) { newShoe(); toast('Neuer Shoe gemischt 🔀'); snd('whoosh'); }
    S = { ps, seats: ps.map((p, k) => ({ p, net: 0, hands: [{ cards: [], bet: bets[k] }] })).filter(s => s.hands[0].bet > 0), dealer: [], turn: null, phase: 'deal', holeDown: true, reveal: false };
    S.seats.forEach(s => addChips(s.p.i, -s.hands[0].bet));
    mount(`<div class="bj-top">${BACK}<div class="bj-title">BLACKJACK</div></div><div class="felt bj-felt" id="bj-felt"></div><div class="bj-bar" id="bj-bar"></div>`, false, 'bj-screen');
    render();
    snd('chip');
    await wait(300);
    for (let r = 0; r < 2; r++) {
      for (const s of S.seats) { s.hands[0].cards.push(draw()); sDeal(); render(); await wait(300); }
      S.dealer.push(draw()); sDeal(); render(); await wait(320);
    }
    if (isBJcards(S.dealer)) {
      snd('rise', .8); await wait(300);
      S.holeDown = false; S.reveal = true; snd('flip'); render(); await wait(900); return settle();
    }
    S.seats.forEach(s => { if (isBJ(s.hands[0])) { s.hands[0].done = true; } });
    if (S.seats.some(s => isBJ(s.hands[0]))) s21();
    advance();
  }

  function advance() {
    for (let s = 0; s < S.seats.length; s++) for (let h = 0; h < S.seats[s].hands.length; h++)
      if (!S.seats[s].hands[h].done) {
        const changed = !S.turn || S.turn.s !== s;
        S.turn = { s, h }; S.phase = 'play'; render();
        if (changed) { beep(660, .06, 'triangle', .06); beep(990, .08, 'triangle', .06, 0, .06); }
        return;
      }
    S.turn = null; dealerPlay();
  }

  async function act(a) {
    if (busy || S.phase !== 'play' || !S.turn) return;
    const seat = S.seats[S.turn.s], h = seat.hands[S.turn.h], p = seat.p;
    busy = true;
    if (a === 'hit') {
      snd('click'); h.cards.push(draw()); sDeal(); render(); await wait(380);
      const t = total(h.cards).t;
      if (t > 21) { h.done = true; sBust(); shake($('.bj-seat.bj-active') || app); await wait(450); }
      else if (t === 21) { h.done = true; s21(); await wait(250); }
      else snd('rise', Math.max(0, (t - 11) / 10));
    } else if (a === 'stand') {
      h.done = true; sKnock(); buzz(20);
    } else if (a === 'double') {
      addChips(p.i, -h.bet); h.bet *= 2; h.doubled = true; snd('chip'); setTimeout(() => snd('chip'), 70); buzz([20, 30, 20]);
      snd('rise', .6);
      h.cards.push(draw()); sDeal(); render(); await wait(500);
      const t = total(h.cards).t;
      if (t > 21) { sBust(); await wait(350); } else if (t === 21) s21();
      h.done = true;
    } else if (a === 'split') {
      addChips(p.i, -h.bet); snd('chip'); snd('whoosh'); buzz(30);
      const [c1, c2] = h.cards, aces = c1.r === 'A';
      seat.hands = [{ cards: [c1], bet: h.bet, split: true }, { cards: [c2], bet: h.bet, split: true }];
      render(); await wait(320);
      for (const nh of seat.hands) {
        nh.cards.push(draw()); sDeal(); render(); await wait(380);
        if (aces || total(nh.cards).t === 21) nh.done = true;
      }
    }
    busy = false;
    advance();
  }

  async function dealerPlay() {
    S.phase = 'dealer'; renderBar();
    snd('rise', .5); await wait(350);
    S.holeDown = false; S.reveal = true; snd('flip'); buzz(15); render(); await wait(800);
    const live = S.seats.some(s => s.hands.some(h => total(h.cards).t <= 21 && !isBJ(h)));
    if (live) while (total(S.dealer).t < 17) {
      snd('rise', Math.min(1, Math.max(0, (total(S.dealer).t - 8) / 9))); await wait(260);
      S.dealer.push(draw()); sDeal(); render(); await wait(560);
    }
    if (total(S.dealer).t > 21) { noise(.3, .3, 80, 0, 700); beep(220, .3, 'sawtooth', .06, .4); }
    settle();
  }

  async function settle() {
    S.phase = 'done'; S.turn = null;
    const d = total(S.dealer).t, dBJ = isBJcards(S.dealer);
    for (const s of S.seats) {
      s.net = 0;
      for (const h of s.hands) {
        const t = total(h.cards).t, bj = isBJ(h);
        let pay = 0, kind = 'lose';
        if (t > 21) kind = 'lose';
        else if (dBJ) { if (bj) { kind = 'push'; pay = h.bet; } }
        else if (bj) { kind = 'bj'; pay = h.bet * 2.5; }
        else if (d > 21 || t > d) { kind = 'win'; pay = h.bet * 2; }
        else if (t === d) { kind = 'push'; pay = h.bet; }
        if (pay) addChips(s.p.i, pay);
        h.res = { kind, net: Math.round(pay - h.bet) };
        s.net += h.res.net;
      }
    }
    render();
    // Ergebnis-Stempel nacheinander mit Ton
    const hands = S.seats.flatMap(s => s.hands);
    for (const h of hands) {
      if (h.res.kind === 'lose') beep(196, .12, 'triangle', .07, .8);
      else if (h.res.kind === 'push') snd('click');
      else snd('coin');
      await wait(140);
    }
    await wait(350);
    const winners = S.seats.filter(s => s.net > 0);
    if (winners.length) {
      const bj = winners.some(s => s.hands.some(h => h.res.kind === 'bj'));
      const best = Math.max(...winners.map(s => s.net)), one = winners.length === 1;
      await fx.win({ title: bj ? 'BLACKJACK!' : best >= 1000 ? 'BIG WIN!' : 'GEWONNEN!', amount: one ? winners[0].net : 0, sub: one ? esc(winners[0].p.name) : winners.map(s => `${esc(s.p.name)} +${fmt(s.net)}`).join(' · '), big: bj || best >= 2000 });
    } else if (S.seats.every(s => s.net < 0)) {
      sfx.lose(); buzz([80, 50, 120]); shake($('#bj-felt'));
      toast(dBJ ? 'Dealer hat Blackjack 😬' : 'Die Bank gewinnt 🏦');
    }
  }

  CASINO.push({
    id: 'blackjack', em: '🃏', name: 'Blackjack', desc: 'Schlag den Dealer – 21 gewinnt', min: 1, max: 4,
    bg: 'radial-gradient(110% 90% at 90% 0%,#ffd86b66 0%,transparent 45%),linear-gradient(155deg,#16a866 0%,#07603a 45%,#021a0f 100%)',
    start: ps => round(ps),
    // Für Tests: Karten in Ziehreihenfolge oben auf den Shoe legen, z. B. ['A♠', '10♥']
    rig: list => { if (shoe.length < RESHUFFLE + list.length) newShoe(); shoe.push(...list.map(x => ({ r: x.slice(0, -1), s: x.slice(-1) })).reverse()); },
  });
})();
