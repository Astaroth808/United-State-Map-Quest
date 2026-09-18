/* United States Map Quest — game engine. Runs fully offline; no network calls. */
(() => {
'use strict';

/* ---------------- helpers ---------------- */
const NS = 'http://www.w3.org/2000/svg';
const $ = (s, r = document) => r.querySelector(s);
const svgEl = (tag, attrs = {}, parent) => {
  const e = document.createElementNS(NS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
};
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const listWords = a => a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + (a.length > 2 ? ',' : '') + ' and ' + a[a.length - 1];
const mmss = ms => { const t = Math.floor(ms / 1000); return String(Math.floor(t / 60)).padStart(2, '0') + ':' + String(t % 60).padStart(2, '0'); };

const STATES = MAP_DATA.states;
const BY = Object.fromEntries(STATES.map(s => [s.id, s]));
const IDS = STATES.map(s => s.id);
const REGION_NAMES = { ALL: 'All 50', NE: 'Northeast', SE: 'Southeast', MW: 'Midwest', SW: 'Southwest', W: 'West' };
const REGION_LONG = { NE: 'the Northeast', SE: 'the Southeast', MW: 'the Midwest', SW: 'the Southwest', W: 'the West' };
const MODES = {
  puzzle: { name: 'Puzzle Builder', desc: 'Drag each state into its spot' },
  neighbors: { name: 'Neighbor Detective', desc: 'Name the states that touch' },
  name: { name: 'Name That State', desc: 'Look at the shape, name the state' },
  where: { name: 'Where Is It?', desc: 'Find the state on the map' },
  which: { name: 'Which Way?', desc: 'North, south, east and west' },
  explore: { name: 'Explore the Map', desc: 'Tap states to learn about them' },
};
const MODE_ORDER = ['puzzle', 'neighbors', 'name', 'where', 'which', 'explore'];
const QN = 10;      // questions per round
const NBN = 5;      // states per Neighbor Detective round
const HAND = 6;     // puzzle pieces shown at once

const STAR_D = 'M12 2.5l2.9 6.2 6.6.8-4.9 4.6 1.3 6.6L12 17.5l-5.9 3.2 1.3-6.6L2.5 9.5l6.6-.8z';
const ICONS = {
  puzzle: '<svg class="exit-icon" viewBox="0 0 44 44" aria-hidden="true"><path d="M9 13h8a4.5 4.5 0 1 1 8 0h8v8a4.5 4.5 0 1 1 0 8v8H9z" fill="none" stroke="#fff" stroke-width="2.8" stroke-linejoin="round"/></svg>',
  neighbors: '<svg class="exit-icon" viewBox="0 0 44 44" aria-hidden="true"><circle cx="19" cy="19" r="10" fill="none" stroke="#fff" stroke-width="3"/><path d="M26.5 26.5L36 36" stroke="#fff" stroke-width="4.5" stroke-linecap="round"/></svg>',
  name: '<svg class="exit-icon" viewBox="0 0 44 44" aria-hidden="true"><path d="M8 8h28a3 3 0 0 1 3 3v17a3 3 0 0 1-3 3H21l-8 6v-6H8a3 3 0 0 1-3-3V11a3 3 0 0 1 3-3z" fill="none" stroke="#fff" stroke-width="2.6" stroke-linejoin="round"/><path d="M18 15.5a4 4 0 1 1 5.6 3.7c-1 .5-1.6 1.2-1.6 2.3v.8" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/><circle cx="22" cy="26.5" r="1.8" fill="#fff"/></svg>',
  where: '<svg class="exit-icon" viewBox="0 0 44 44" aria-hidden="true"><path d="M22 40s-11-9.5-11-19a11 11 0 1 1 22 0c0 9.5-11 19-11 19z" fill="none" stroke="#fff" stroke-width="2.8" stroke-linejoin="round"/><circle cx="22" cy="21" r="4" fill="#fff"/></svg>',
  which: '<svg class="exit-icon" viewBox="0 0 44 44" aria-hidden="true"><circle cx="22" cy="22" r="16" fill="none" stroke="#fff" stroke-width="2.4"/><path d="M22 3.5l3.7 14.8L40.5 22l-14.8 3.7L22 40.5l-3.7-14.8L3.5 22l14.8-3.7z" fill="#fff"/></svg>',
  explore: '<svg class="exit-icon" viewBox="0 0 44 44" aria-hidden="true"><rect x="7" y="7" width="30" height="30" rx="7" fill="none" stroke="#fff" stroke-width="2.8"/><circle cx="22" cy="15.5" r="2.4" fill="#fff"/><path d="M22 21v11" stroke="#fff" stroke-width="3.2" stroke-linecap="round"/></svg>',
  roseMini: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 1.5l2 8.5 8.5 2-8.5 2-2 8.5-2-8.5-8.5-2 8.5-2z" fill="currentColor"/></svg>',
  arrow: '<svg class="exit-arrow" viewBox="0 0 26 26" aria-hidden="true"><path d="M6 20L19 7M9 7h10v10" fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  speaker: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  next: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  diamond: '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M12 1.5L22.5 12 12 22.5 1.5 12z" fill="#f6c343" stroke="#1d1d1d" stroke-width="1.5" stroke-linejoin="round"/><path d="M12 7v6.5" stroke="#1d1d1d" stroke-width="2.4" stroke-linecap="round"/><circle cx="12" cy="17" r="1.4" fill="#1d1d1d"/></svg>',
  good: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="#2f9e57"/><path d="M7 12.5l3.2 3.2L17 9" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  bad: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="#d5473f"/><path d="M8.5 8.5l7 7m0-7l-7 7" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/></svg>',
  cap: '<svg class="cap-star" viewBox="0 0 24 24" aria-hidden="true"><path d="' + STAR_D + '" fill="#c7362e" stroke="#c7362e" stroke-width="1.5" stroke-linejoin="round"/></svg>',
};
const starSmall = n => [1, 2, 3].map(i => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${STAR_D}" fill="${i <= n ? '#f6c343' : 'none'}" stroke="${i <= n ? '#f6c343' : '#fff'}" stroke-width="2.2" stroke-linejoin="round"/></svg>`).join('');
const starBig = full => `<svg viewBox="0 0 24 24" class="${full ? 'full' : ''}" aria-hidden="true"><path d="${STAR_D}" fill="${full ? '#f6c343' : '#eef3f5'}" stroke="${full ? '#b98a00' : '#c3d2d9'}" stroke-width="1.2" stroke-linejoin="round"/></svg>`;
const FB_ICON = { good: ICONS.good, bad: ICONS.bad, hint: ICONS.diamond };

/* ---------------- compass directions ---------------- */
const DIRS = [
  { k: 'N', word: 'north', deg: 0 }, { k: 'NE', word: 'northeast', deg: 45 },
  { k: 'E', word: 'east', deg: 90 }, { k: 'SE', word: 'southeast', deg: 135 },
  { k: 'S', word: 'south', deg: 180 }, { k: 'SW', word: 'southwest', deg: 225 },
  { k: 'W', word: 'west', deg: 270 }, { k: 'NW', word: 'northwest', deg: 315 },
];
const DIR_BY = Object.fromEntries(DIRS.map(d => [d.k, d]));
const OPPOSITE = { N: 'S', S: 'N', E: 'W', W: 'E', NE: 'SW', SW: 'NE', NW: 'SE', SE: 'NW' };
const angDiff = (a, b) => { const d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; };
/* true compass bearing from the centre of state a to the centre of state b */
function bearing(a, b) {
  const A = BY[a].ll, B = BY[b].ll;
  const mid = (A[0] + B[0]) / 2 * Math.PI / 180;
  return (Math.atan2((B[1] - A[1]) * Math.cos(mid), B[0] - A[0]) * 180 / Math.PI + 360) % 360;
}
/* the same, as it looks on this map (the projection tilts the edges a little) */
function mapBearing(a, b) {
  const A = BY[a].ct, B = BY[b].ct;
  return (Math.atan2(B[0] - A[0], -(B[1] - A[1])) * 180 / Math.PI + 360) % 360;
}
const dirOf = (a, b) => { const x = bearing(a, b); return DIRS.reduce((m, d) => angDiff(x, d.deg) < angDiff(x, m.deg) ? d : m); };
/* only ask about pairs that are unmistakable, on the globe AND on the map */
const dirStrict = (a, b, d) => angDiff(bearing(a, b), d.deg) <= 15 && angDiff(mapBearing(a, b), d.deg) <= 24;
/* accept anything inside the direction's quadrant-ish window */
const dirOk = (a, b, d) => angDiff(bearing(a, b), d.deg) <= 33.75;

/* ---------------- storage (per browser, optional) ---------------- */
const Store = {
  key: 'us-map-quest.v1',
  data: { settings: { level: 'easy', region: 'ALL', sound: true, voice: true }, best: {} },
  load() {
    try {
      const d = JSON.parse(localStorage.getItem(this.key) || 'null');
      if (d) { Object.assign(this.data.settings, d.settings || {}); this.data.best = d.best || {}; }
    } catch (e) { /* storage unavailable: play without saving */ }
    if (!REGION_NAMES[this.data.settings.region]) this.data.settings.region = 'ALL';
    if (!['easy', 'hard'].includes(this.data.settings.level)) this.data.settings.level = 'easy';
  },
  save() { try { localStorage.setItem(this.key, JSON.stringify(this.data)); } catch (e) { /* ignore */ } },
};
const S = Store.data.settings;

/* ---------------- sound (synthesized, works offline) ---------------- */
const Sound = {
  ctx: null,
  get() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      try { this.ctx = new AC(); } catch (e) { return null; }
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  },
  tone(f, t, dur, type = 'triangle', vol = 0.16, f2) {
    const c = this.ctx, o = c.createOscillator(), g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(c.destination);
    o.start(t); o.stop(t + dur + 0.05);
  },
  play(name) {
    if (!S.sound) return;
    const c = this.get(); if (!c) return;
    const t = c.currentTime + 0.01;
    switch (name) {
      case 'good': this.tone(784, t, 0.14); this.tone(1175, t + 0.09, 0.28); break;
      case 'bad': this.tone(233, t, 0.3, 'sine', 0.22, 150); break;
      case 'pick': this.tone(620, t, 0.07, 'sine', 0.08); break;
      case 'snap': this.tone(523, t, 0.06, 'square', 0.04); this.tone(1047, t + 0.04, 0.18, 'triangle', 0.15); break;
      case 'win':
        [523, 659, 784, 1047].forEach((f, i) => this.tone(f, t + i * 0.11, 0.3));
        [0.62, 0.86].forEach(d => { this.tone(349, t + d, 0.17, 'square', 0.045); this.tone(440, t + d, 0.17, 'square', 0.045); }); // road-trip "beep beep"
        break;
    }
  },
};

/* ---------------- read-aloud (device voices) ---------------- */
const Voice = {
  ok: 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window,
  voice: null,
  pick() {
    if (!this.ok) return;
    const vs = speechSynthesis.getVoices();
    const en = vs.filter(v => /^en[-_]US/i.test(v.lang));
    this.voice = en.find(v => v.localService && /samantha|aria|jenny|zira|allison|ava/i.test(v.name)) ||
      en.find(v => v.localService) || en[0] || vs.find(v => /^en/i.test(v.lang)) || null;
  },
  say(text, force) {
    if (!this.ok || (!S.voice && !force) || !text) return;
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'en-US'; u.rate = 0.92; u.pitch = 1.05;
      if (this.voice) u.voice = this.voice;
      setTimeout(() => speechSynthesis.speak(u), 40);
    } catch (e) { /* no voice available */ }
  },
  stop() { if (this.ok) try { speechSynthesis.cancel(); } catch (e) { /* ignore */ } },
};
if (Voice.ok) { Voice.pick(); speechSynthesis.onvoiceschanged = () => Voice.pick(); }

/* ---------------- confetti ---------------- */
const Confetti = {
  run() {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const cv = $('#confetti'), ctx = cv.getContext('2d');
    if (!ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1), W = innerWidth, H = innerHeight;
    cv.width = W * dpr; cv.height = H * dpr; cv.hidden = false;
    const colors = ['#f5dc8e', '#f3b797', '#bbd99e', '#cdbbe5', '#f0bacb', '#0d6b41', '#ff8a2a', '#1f4e9e'];
    const P = Array.from({ length: 150 }, () => ({
      x: W * (0.15 + Math.random() * 0.7), y: H * 0.3, vx: (Math.random() - 0.5) * 10, vy: -Math.random() * 12 - 4,
      s: 6 + Math.random() * 7, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3, c: colors[(Math.random() * colors.length) | 0],
    }));
    const t0 = performance.now(), life = 2800;
    const step = now => {
      const el = now - t0;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
      ctx.globalAlpha = Math.max(0, 1 - el / life);
      for (const p of P) {
        p.vy += 0.3; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.r += p.vr;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); ctx.restore();
      }
      if (el < life) requestAnimationFrame(step); else { ctx.clearRect(0, 0, W, H); cv.hidden = true; }
    };
    requestAnimationFrame(step);
  },
};

/* ---------------- the map ---------------- */
const MapView = (() => {
  const W = 975, H = 610;
  const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, class: 'map', role: 'group', 'aria-label': 'Map of the United States' });
  const frames = svgEl('g', { 'aria-hidden': 'true' }, svg);
  for (const id of ['AK', 'HI']) {
    const [x, y, w, h] = BY[id].bb, p = 6;
    const x0 = Math.max(2, x - p), y0 = Math.max(2, y - p), x1 = Math.min(W - 2, x + w + p), y1 = Math.min(H - 2, y + h + p);
    svgEl('rect', { x: x0, y: y0, width: x1 - x0, height: y1 - y0, rx: 10, class: 'inset' }, frames);
  }
  const coast = svgEl('g', { class: 'coast', 'aria-hidden': 'true' }, svg);
  const gSt = svgEl('g', {}, svg);
  const paths = {}, boxes = {}, labels = {};
  for (const s of STATES) {
    svgEl('path', { d: s.d }, coast);
    paths[s.id] = svgEl('path', { d: s.d, class: 'st', 'data-id': s.id, 'data-c': s.c }, gSt);
  }
  svgEl('path', { d: MAP_DATA.dc.d, class: 'dc' }, gSt);
  { const [x, y, w, h] = BY.HI.bb; svgEl('rect', { x: x - 5, y: y - 5, width: w + 10, height: h + 10, class: 'hit', 'data-id': 'HI' }, gSt); }

  // tap boxes for the tiniest states, out in the Atlantic
  const gCo = svgEl('g', {}, svg);
  for (const s of STATES) if (s.co) {
    const [x, y, w, h, tx, ty] = s.co;
    svgEl('line', { x1: x, y1: y + h / 2, x2: tx, y2: ty, class: 'leader' }, gCo);
    svgEl('circle', { cx: tx, cy: ty, r: 1.3, class: 'leader-dot' }, gCo);
    boxes[s.id] = svgEl('rect', { x, y, width: w, height: h, rx: 3, class: 'st co', 'data-id': s.id, 'data-c': s.c }, gCo);
  }

  const gFx = svgEl('g', { 'aria-hidden': 'true' }, svg);
  const hover = svgEl('path', { class: 'hover-line' }, gFx);
  const gPulse = svgEl('g', {}, gFx);
  const gRose = svgEl('g', {}, gFx);
  const gCaps = svgEl('g', { class: 'caps', 'aria-hidden': 'true' }, svg);
  const starAt = (cx, cy, R, r) => {
    let d = '';
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? r : R; d += (i ? 'L' : 'M') + (cx + q * Math.cos(a)).toFixed(2) + ' ' + (cy + q * Math.sin(a)).toFixed(2); }
    return d + 'Z';
  };
  for (const s of STATES) svgEl('path', { d: starAt(s.cp[0], s.cp[1], 4.6, 1.9) }, gCaps);

  const LABEL_FIX = { HI: { x: 322, y: 548, lines: ['Hawaii'], fs: 11 } };
  const layout = s => {
    if (LABEL_FIX[s.id]) return LABEL_FIX[s.id];
    if (s.co) { const [x, y, w, h] = s.co; return { x: x + w / 2, y: y + h / 2, lines: [s.id], fs: 9.5, box: true }; }
    const r = s.r, fs = clamp(r * 0.42, 8.5, 12.5), cw = fs * 0.58, [x, y] = s.lp;
    if (s.name.length * cw <= 2.5 * r) return { x, y, lines: [s.name], fs };
    const words = s.name.split(' ');
    if (words.length === 2 && Math.max(words[0].length, words[1].length) * cw <= 2.3 * r && fs * 2.1 <= 2 * r) return { x, y, lines: words, fs };
    return { x, y, lines: [s.id], fs: Math.min(fs, 10) };
  };
  const gLbl = svgEl('g', { 'aria-hidden': 'true' }, svg);
  for (const s of STATES) {
    const L = layout(s);
    const t = svgEl('text', { class: 'lbl' + (L.box ? ' box' : ''), 'font-size': L.fs }, gLbl);
    L.lines.forEach((line, i) => {
      const cy = L.y + (i - (L.lines.length - 1) / 2) * L.fs * 1.02;
      const ts = svgEl('tspan', { x: L.x.toFixed(1), y: (cy + L.fs * 0.36).toFixed(1) }, t);
      ts.textContent = line;
    });
    labels[s.id] = t;
  }

  const CLASSES = ['dim', 'fade', 'slot', 'slot-hard', 'placed', 'done', 'target', 'other', 'sel', 'good', 'found', 'reveal', 'bad'];
  const timers = {};
  const pinned = new Set();
  let hoverId = null, hoverMode = 'active';

  const api = {
    svg,
    active: new Set(IDS),
    onTap: null,
    mount(host) { if (svg.parentNode !== host) host.appendChild(svg); },
    mark(id, cls, on = true) { paths[id].classList.toggle(cls, on); if (boxes[id]) boxes[id].classList.toggle(cls, on); },
    flash(id, cls, ms = 900) {
      const k = id + ':' + cls; clearTimeout(timers[k]);
      api.mark(id, cls, true);
      timers[k] = setTimeout(() => api.mark(id, cls, false), ms);
    },
    label(id, on = true) { if (on) pinned.add(id); else pinned.delete(id); labels[id].classList.toggle('on', on); },
    peekLabel(id, ms = 1600) {
      const k = id + ':lbl'; clearTimeout(timers[k]);
      labels[id].classList.add('on');
      timers[k] = setTimeout(() => { if (!pinned.has(id)) labels[id].classList.remove('on'); }, ms);
    },
    pulse(id, kind = '') {
      const s = BY[id], r = clamp(Math.max(s.bb[2], s.bb[3]) * 0.55, 14, 56);
      svgEl('circle', { cx: s.lp[0], cy: s.lp[1], r, class: 'pulse ' + kind }, gPulse);
      if (s.co) { const [x, y, w, h] = s.co; svgEl('circle', { cx: x + w / 2, cy: y + h / 2, r: 16, class: 'pulse ' + kind }, gPulse); }
    },
    clearFx() { gPulse.textContent = ''; gRose.textContent = ''; hover.removeAttribute('d'); hoverId = null; },
    /* compass rose centred on a state; `hi` lights one arm */
    rose(id, hi, eight) {
      const [cx, cy] = BY[id].lp;
      const R = clamp(Math.min(cx - 8, 967 - cx, cy - 8, 602 - cy), 42, 96);
      const g = svgEl('g', {}, gRose);
      const P = (deg, rad) => [cx + rad * Math.sin(deg * Math.PI / 180), cy - rad * Math.cos(deg * Math.PI / 180)];
      svgEl('circle', { cx, cy, r: R * 1.04, class: 'rose-disc' }, g);
      svgEl('circle', { cx, cy, r: R * 1.04, class: 'rose-ring' }, g);
      for (const d of DIRS) {
        const diag = d.deg % 90 !== 0;
        if (diag && !eight) continue;
        const rr = diag ? R * 0.72 : R;
        const [tx, ty] = P(d.deg, rr), [ax, ay] = P(d.deg - 90, rr * 0.24), [bx, by] = P(d.deg + 90, rr * 0.24);
        svgEl('path', { d: `M${cx} ${cy}L${ax.toFixed(1)} ${ay.toFixed(1)}L${tx.toFixed(1)} ${ty.toFixed(1)}L${bx.toFixed(1)} ${by.toFixed(1)}Z`, class: 'rose-arm' + (d.k === hi ? ' on' : '') }, g);
        const fs = R * 0.2, [lx, ly] = P(d.deg, rr + fs * 0.85);
        const t = svgEl('text', { x: lx.toFixed(1), y: (ly + fs * 0.36).toFixed(1), class: 'rose-lbl' + (d.k === hi ? ' on' : ''), 'font-size': fs.toFixed(1) }, g);
        t.textContent = d.k;
      }
      svgEl('circle', { cx, cy, r: R * 0.07, class: 'rose-hub' }, g);
    },
    /* dashed arrow from one state to another */
    arrow(a, b) {
      const A = BY[a].lp, B = BY[b].lp;
      const ang = Math.atan2(B[1] - A[1], B[0] - A[0]), len = Math.hypot(B[0] - A[0], B[1] - A[1]);
      const back = Math.min(15, len * 0.18), fwd = Math.min(14, len * 0.16);
      const x1 = A[0] + Math.cos(ang) * back, y1 = A[1] + Math.sin(ang) * back;
      const x2 = B[0] - Math.cos(ang) * fwd, y2 = B[1] - Math.sin(ang) * fwd;
      const g = svgEl('g', {}, gRose), h = 9;
      svgEl('line', { x1: x1.toFixed(1), y1: y1.toFixed(1), x2: x2.toFixed(1), y2: y2.toFixed(1), class: 'dir-arrow' }, g);
      svgEl('path', { d: `M${x2.toFixed(1)} ${y2.toFixed(1)}L${(x2 - h * Math.cos(ang - 0.42)).toFixed(1)} ${(y2 - h * Math.sin(ang - 0.42)).toFixed(1)}L${(x2 - h * Math.cos(ang + 0.42)).toFixed(1)} ${(y2 - h * Math.sin(ang + 0.42)).toFixed(1)}Z`, class: 'dir-arrow-head' }, g);
    },
    reset(o = {}) {
      const { active = null, labels: lab = false, capitals = false, slots = null, hover: hv = 'active' } = o;
      for (const k in timers) clearTimeout(timers[k]);
      pinned.clear();
      for (const id of IDS) {
        for (const c of CLASSES) api.mark(id, c, false);
        const inPlay = !active || active.has(id);
        if (!inPlay) api.mark(id, 'dim');
        if (slots && inPlay) api.mark(id, slots === 'hard' ? 'slot-hard' : 'slot');
        api.label(id, lab === true || (lab instanceof Set && lab.has(id)));
      }
      gCaps.classList.toggle('on', !!capitals);
      svg.classList.add('interactive');
      api.active = active || new Set(IDS);
      hoverMode = hv;
      api.clearFx();
    },
    capitals(on) { gCaps.classList.toggle('on', !!on); },
    center(id) { const [x, y, w, h] = BY[id].bb; return { x: x + w / 2, y: y + h / 2 }; },
    toMap(cx, cy) {
      const m = svg.getScreenCTM(); if (!m) return { x: -999, y: -999 };
      const pt = svg.createSVGPoint(); pt.x = cx; pt.y = cy;
      const q = pt.matrixTransform(m.inverse());
      return { x: q.x, y: q.y };
    },
    inside(id, p) {
      const s = BY[id];
      if (s.co) { const [x, y, w, h] = s.co; if (p.x >= x && p.x <= x + w && p.y >= y && p.y <= y + h) return true; }
      try { const pt = svg.createSVGPoint(); pt.x = p.x; pt.y = p.y; return paths[id].isPointInFill(pt); }
      catch (e) { const [x, y, w, h] = s.bb; return p.x >= x && p.x <= x + w && p.y >= y && p.y <= y + h; }
    },
  };

  svg.addEventListener('click', e => {
    if (!api.onTap) return;
    const t = e.target.closest && e.target.closest('[data-id]');
    api.onTap(t ? t.dataset.id : null, e);
  });
  const canHover = window.matchMedia && matchMedia('(hover: hover)').matches;
  svg.addEventListener('pointermove', e => {
    if (!canHover || e.pointerType !== 'mouse' || !hoverMode) return;
    const t = e.target.closest && e.target.closest('[data-id]');
    let id = t ? t.dataset.id : null;
    if (id && hoverMode === 'active' && !api.active.has(id)) id = null;
    if (id === hoverId) return;
    hoverId = id;
    if (!id) { hover.removeAttribute('d'); return; }
    let d = BY[id].d;
    if (BY[id].co) { const [x, y, w, h] = BY[id].co; d += `M${x} ${y}h${w}v${h}h${-w}z`; }
    hover.setAttribute('d', d);
  });
  svg.addEventListener('pointerleave', () => { hoverId = null; hover.removeAttribute('d'); });
  return api;
})();

/* a small stand-alone drawing of one state (puzzle pieces, shape cards) */
function miniSVG(id, colored = true, relSize = false, aspect = 1) {
  const s = BY[id], [x, y, w, h] = s.bb;
  let vw = Math.max(w, h * aspect) * 1.12 + 2;
  if (relSize) vw /= clamp(Math.sqrt(Math.max(w, h) / 250), 0.34, 1);
  const vh = vw / aspect, cx = x + w / 2, cy = y + h / 2;
  const e = svgEl('svg', { viewBox: `${(cx - vw / 2).toFixed(1)} ${(cy - vh / 2).toFixed(1)} ${vw.toFixed(1)} ${vh.toFixed(1)}`, 'aria-hidden': 'true' });
  const p = svgEl('path', { d: s.d, 'vector-effect': 'non-scaling-stroke' }, e);
  if (colored) p.setAttribute('data-c', s.c);
  return e;
}

/* ---------------- dragging puzzle pieces ---------------- */
const Drag = {
  g: null, ghost: null, raf: 0, pos: { x: 0, y: 0 },
  init() { this.g = svgEl('g', {}, $('#dragLayer')); },
  lift(id) {
    this.clear();
    const m = MapView.svg.getScreenCTM();
    if (m) this.g.setAttribute('transform', `matrix(${m.a} ${m.b} ${m.c} ${m.d} ${m.e} ${m.f})`);
    this.ghost = svgEl('path', { d: BY[id].d, class: 'ghost', 'data-c': BY[id].c, filter: 'url(#ghostShadow)' }, this.g);
    this.pos = { x: 0, y: 0 };
  },
  move(dx, dy) {
    if (!this.ghost) return;
    this.pos = { x: dx, y: dy };
    this.ghost.setAttribute('transform', `translate(${dx.toFixed(1)} ${dy.toFixed(1)})`);
  },
  tween(to, ms, fade, done) {
    const g = this.ghost; if (!g) { if (done) done(); return; }
    const from = { ...this.pos }, t0 = performance.now();
    const step = now => {
      const k = Math.min(1, (now - t0) / ms), e = 1 - Math.pow(1 - k, 3);
      this.move(from.x + (to.x - from.x) * e, from.y + (to.y - from.y) * e);
      if (fade) g.style.opacity = String(1 - k);
      if (k < 1) this.raf = requestAnimationFrame(step); else if (done) done();
    };
    this.raf = requestAnimationFrame(step);
  },
  clear() { cancelAnimationFrame(this.raf); if (this.g) this.g.textContent = ''; this.ghost = null; },
};

/* ---------------- typed answers ---------------- */
const norm = s => s.toLowerCase().replace(/[^a-z]/g, '');
function editDistance(a, b) {
  const m = a.length, n = b.length;
  if (!m) return n; if (!n) return m;
  const d = Array.from({ length: m + 1 }, (_, i) => { const r = new Array(n + 1).fill(0); r[0] = i; return r; });
  for (let j = 0; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) {
    const c = a[i - 1] === b[j - 1] ? 0 : 1;
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + c);
    if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
  }
  return d[m][n];
}
/* Returns {s, exact} for a recognised state name (forgiving small spelling slips),
   {abbr: true} for a two-letter postal code, or null. */
function matchState(input) {
  const raw = input.trim(), q = norm(raw);
  if (!q) return null;
  if (q.length === 2 && BY[q.toUpperCase()]) return { abbr: true, s: BY[q.toUpperCase()] };
  for (const s of STATES) if (norm(s.name) === q) return { s, exact: true };
  if (q.length < 3) return null;
  let best = null, bd = Infinity, tie = false;
  for (const s of STATES) {
    const d = editDistance(q, norm(s.name));
    if (d < bd) { bd = d; best = s; tie = false; } else if (d === bd) tie = true;
  }
  const n = norm(best.name).length, allow = n <= 4 ? 1 : n <= 7 ? 2 : 3;
  return bd <= allow && !tie ? { s: best, exact: false } : null;
}

/* ---------------- shared panel bits ---------------- */
const sayBtn = () => Voice.ok ? `<button class="icon-btn say-btn" type="button" data-say aria-label="Hear it again" title="Hear it again">${ICONS.speaker}</button>` : '';
const pipsHTML = (res, total, cur) => {
  let h = '';
  for (let i = 0; i < total; i++) h += `<span class="pip ${res[i] || (i === cur ? 'now' : '')}"></span>`;
  return `<div class="pips" aria-hidden="true">${h}</div>`;
};
const refreshPips = (res, total, cur) => { const el = document.querySelector('#panel .pips'); if (el) el.outerHTML = pipsHTML(res, total, cur); };
const answerForm = ph => `<form class="answer" id="answerForm" autocomplete="off">
  <input id="answerInput" type="text" autocapitalize="words" autocorrect="off" spellcheck="false" enterkeyhint="done" placeholder="${ph}" aria-label="${ph}">
  <button class="btn btn-go" type="submit">Check</button></form>`;
function bindAnswer(handler) {
  const f = $('#answerForm'), inp = $('#answerInput');
  f.addEventListener('submit', e => { e.preventDefault(); const v = inp.value; if (v.trim()) handler(v, inp); });
  setTimeout(() => inp.focus({ preventScroll: true }), 60);
}
function nextButton(fn) {
  const a = $('#actions');
  a.innerHTML = `<button class="btn btn-go grow" id="nextBtn" type="button">Next ${ICONS.next}</button>`;
  $('#nextBtn').addEventListener('click', fn);
  $('#nextBtn').focus({ preventScroll: true });
}
const lockInputs = () => document.querySelectorAll('#panel [data-pick], #panel [data-dir], #answerForm input, #answerForm button, #hintBtn, #giveBtn').forEach(b => { b.disabled = true; });

/* ================= MODES ================= */

/* ---- 1. Puzzle Builder ---- */
const Puzzle = {
  start() {
    const pool = App.pool();
    Object.assign(this, { total: pool.length, queue: shuffle(pool), hand: [], placed: new Set(), first: 0, miss: {}, sel: null, t0: Date.now(), hintFor: null });
    MapView.reset({ active: new Set(pool), slots: S.level, hover: false });
    const easy = S.level === 'easy';
    this.sayText = 'Build the map! Drag each state to where it belongs.';
    App.panel(`
      <div class="prompt"><div><p class="eyebrow">Puzzle time</p><h2>Build the map!</h2></div>${sayBtn()}</div>
      <div class="stats" id="stats"></div>
      <div class="tray" id="tray"></div>
      <div class="feedback" id="feedback"><span>${easy ? 'Drag a piece onto the map — or tap a piece, then tap its spot.' : 'Hard level: no names on the pieces. Match the shapes!'}</span></div>
      <div class="row"><button class="btn btn-plain grow" id="swapBtn" type="button">Show different pieces</button></div>`);
    this.tray = $('#tray');
    this.bindTray();
    $('#swapBtn').addEventListener('click', () => this.swap());
    this.fill(); this.renderTray(); this.stats();
    this.tick = setInterval(() => this.stats(), 1000);
    App.say(this.sayText);
  },
  stop() { clearInterval(this.tick); },
  fill() { while (this.hand.length < HAND && this.queue.length) this.hand.push(this.queue.shift()); },
  swap() {
    this.select(null);
    this.queue.push(...shuffle(this.hand)); this.hand = [];
    this.fill(); this.renderTray();
  },
  renderTray() {
    const easy = S.level === 'easy';
    this.tray.textContent = '';
    for (const id of this.hand) {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'piece' + (id === this.sel ? ' is-selected' : ''); b.dataset.id = id;
      b.setAttribute('aria-label', easy ? `${BY[id].name} piece` : 'Mystery state piece');
      b.appendChild(miniSVG(id, true, true));
      const n = document.createElement('span'); n.className = 'piece-name'; n.textContent = easy ? BY[id].name : ' ';
      b.appendChild(n);
      this.tray.appendChild(b);
    }
  },
  stats() {
    const el = $('#stats'); if (!el) return;
    el.innerHTML = `<span>Placed <b>${this.placed.size}</b>/${this.total}</span><span>First try <b>${this.first}</b></span><span>Time <b>${mmss(Date.now() - this.t0)}</b></span>`;
    App.progress(this.placed.size, this.total);
  },
  select(id) {
    this.sel = id;
    this.tray.querySelectorAll('.piece').forEach(b => b.classList.toggle('is-selected', b.dataset.id === id));
    if (id) {
      if (this.hintFor && this.hintFor !== id) { MapView.clearFx(); this.hintFor = null; }
      Sound.play('pick');
      App.feedback('', S.level === 'easy' ? `Now tap the map where <b>${BY[id].name}</b> goes.` : 'Now tap the map where this piece goes.');
    }
  },
  bindTray() {
    this.tray.addEventListener('pointerdown', e => {
      const b = e.target.closest('.piece');
      if (!b || e.button > 0) return;
      e.preventDefault();
      const id = b.dataset.id;
      try { b.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      const st = { x0: e.clientX, y0: e.clientY, moved: false, touch: e.pointerType !== 'mouse', p: null };
      const onMove = ev => {
        if (!st.moved && Math.hypot(ev.clientX - st.x0, ev.clientY - st.y0) < 6) return;
        if (!st.moved) {
          st.moved = true; this.select(null);
          if (this.hintFor && this.hintFor !== id) { MapView.clearFx(); this.hintFor = null; }
          b.classList.add('is-lifted'); Drag.lift(id); Sound.play('pick');
        }
        const p = MapView.toMap(ev.clientX, ev.clientY - (st.touch ? 40 : 0));
        const c = MapView.center(id);
        st.p = p; Drag.move(p.x - c.x, p.y - c.y);
      };
      const onUp = ev => {
        b.removeEventListener('pointermove', onMove); b.removeEventListener('pointerup', onUp); b.removeEventListener('pointercancel', onUp);
        if (!st.moved) { if (ev.type === 'pointerup') this.select(this.sel === id ? null : id); return; }
        if (ev.type === 'pointercancel' || !st.p) { Drag.clear(); b.classList.remove('is-lifted'); return; }
        this.drop(id, st.p, b);
      };
      b.addEventListener('pointermove', onMove); b.addEventListener('pointerup', onUp); b.addEventListener('pointercancel', onUp);
    });
    // keyboard: Enter/Space on a piece selects it
    this.tray.addEventListener('click', e => {
      const b = e.target.closest('.piece');
      if (b && e.detail === 0) this.select(this.sel === b.dataset.id ? null : b.dataset.id);
    });
  },
  tolerance(id) {
    const [, , w, h] = BY[id].bb;
    return clamp(Math.hypot(w, h) * 0.22, 12, 34) * (S.level === 'easy' ? 1.5 : 1);
  },
  drop(id, p, b) {
    const c = MapView.center(id), dx = p.x - c.x, dy = p.y - c.y;
    const ok = Math.hypot(dx, dy) <= this.tolerance(id) || (S.level === 'easy' && MapView.inside(id, p));
    if (ok) Drag.tween({ x: 0, y: 0 }, 170, false, () => { Drag.clear(); this.place(id); });
    else { this.fail(id); Drag.tween({ x: dx, y: dy + 12 }, 260, true, () => { Drag.clear(); b.classList.remove('is-lifted'); }); }
  },
  tap(id, e) {
    if (!this.sel) {
      App.feedback('', id && this.placed.has(id) ? `That's <b>${BY[id].name}</b>. Pick a piece to keep going.` : 'Pick a piece first, then tap where it goes.');
      return;
    }
    const sel = this.sel, p = MapView.toMap(e.clientX, e.clientY);
    if (id === sel || MapView.inside(sel, p)) { this.select(null); this.place(sel); } else this.fail(sel);
  },
  place(id) {
    this.placed.add(id);
    if (!this.miss[id]) this.first++;
    if (this.hintFor) { MapView.clearFx(); this.hintFor = null; }
    MapView.mark(id, 'slot', false); MapView.mark(id, 'slot-hard', false); MapView.mark(id, 'placed'); MapView.label(id, true);
    Sound.play('snap');
    this.hand = this.hand.filter(h => h !== id);
    this.fill(); this.renderTray(); this.stats();
    if (this.placed.size === this.total) {
      App.feedback('good', 'You built the whole map!');
      App.later(() => this.end(), 900);
      return;
    }
    App.feedback('good', `<b>${BY[id].name}</b> is in place!`);
    App.say(BY[id].name);
  },
  fail(id) {
    this.miss[id] = (this.miss[id] || 0) + 1;
    Sound.play('bad');
    const b = this.tray.querySelector(`[data-id="${id}"]`);
    if (b) { b.classList.remove('is-shake'); void b.offsetWidth; b.classList.add('is-shake'); }
    const hintAt = S.level === 'easy' ? 2 : 3;
    if (this.miss[id] >= hintAt) {
      MapView.clearFx(); MapView.pulse(id, 'hint'); this.hintFor = id;
      App.feedback('hint', `Look for the blinking circle — ${S.level === 'easy' ? '<b>' + BY[id].name + '</b>' : 'that piece'} goes there.`);
      App.say('Look for the blinking circle.');
    } else App.feedback('bad', 'Not quite. Try another spot!');
  },
  end() {
    clearInterval(this.tick);
    const time = mmss(Date.now() - this.t0);
    App.finish({
      points: this.first, max: this.total,
      missed: Object.keys(this.miss),
      score: `${this.first} of ${this.total} placed on the first try`,
      extra: `Time: ${time}`,
    });
  },
};

/* ---- 2. Neighbor Detective ---- */
function distractors(t, k) {
  const nb = new Set(BY[t].nb), near = new Set();
  for (const n of nb) for (const m of BY[n].nb) if (m !== t && !nb.has(m)) near.add(m);
  let out = shuffle([...near]);
  if (out.length < k) out = out.concat(shuffle(IDS.filter(id => id !== t && !nb.has(id) && !near.has(id))));
  return out.slice(0, k);
}
const Neighbors = {
  start() {
    const pool = App.pool().filter(id => BY[id].nb.length);
    Object.assign(this, { qs: shuffle(pool).slice(0, Math.min(NBN, pool.length)), i: -1, points: 0, missed: [], res: [], got: 0, need: 0 });
    this.next();
  },
  next() {
    MapView.reset({ hover: S.level === 'easy' ? 'active' : false });
    this.i++;
    if (this.i >= this.qs.length) return this.end();
    const t = this.t = this.qs[this.i], s = BY[t], easy = S.level === 'easy';
    Object.assign(this, { found: [], wrong: 0, locked: false });
    MapView.mark(t, 'target'); MapView.label(t, true);
    App.progress(this.i + 1, this.qs.length);
    this.sayText = `Which states touch ${s.name}?`;
    const bank = easy ? shuffle([...s.nb, ...distractors(t, clamp(10 - s.nb.length, 3, 4))]) : [];
    App.panel(`
      <div class="prompt"><div><p class="eyebrow">Which states touch</p><h2>${s.name}?</h2></div>${sayBtn()}</div>
      ${pipsHTML(this.res, this.qs.length, this.i)}
      <p class="muted" id="count"></p>
      <div class="slots" id="slots"></div>
      ${easy ? `<div class="chips" id="bank">${bank.map(id => `<button class="reg" type="button" data-pick="${id}">${BY[id].name}</button>`).join('')}</div>` : answerForm('Type a state that touches it')}
      <div class="feedback" id="feedback"><span>${easy ? 'Tap the names, or tap the states on the map.' : 'Type one state at a time, then press Enter.'}</span></div>
      <div class="row" id="actions"><button class="btn btn-plain grow" type="button" id="giveBtn">I'm stuck — show me</button></div>`);
    this.renderSlots([]);
    if (easy) $('#bank').addEventListener('click', e => { const b = e.target.closest('[data-pick]'); if (b) this.guess(b.dataset.pick); });
    else bindAnswer((v, inp) => {
      const m = matchState(v);
      if (!m) { App.feedback('hint', `Hmm, I don't know a state called “${esc(v.trim())}”. Check the spelling!`); inp.select(); return; }
      if (m.abbr) { App.feedback('hint', `Type the whole name, not just “${esc(m.s.id)}”.`); inp.select(); return; }
      inp.value = '';
      this.guess(m.s.id, m.exact ? '' : ` Watch the spelling: <b>${m.s.name}</b>.`);
    });
    $('#giveBtn').addEventListener('click', () => this.giveUp());
    App.say(this.sayText);
  },
  tap(id) {
    if (!id || this.locked) return;
    if (S.level === 'hard') { App.feedback('hint', 'On Hard level, type the names in the box.'); return; }
    this.guess(id);
  },
  guess(id, note = '') {
    if (this.locked) return;
    const s = BY[this.t];
    if (id === this.t) { App.feedback('', `That's ${s.name} itself! Find the states that touch it.`); return; }
    if (this.found.includes(id)) { App.feedback('', `You already found <b>${BY[id].name}</b>.`); return; }
    const chip = $(`#bank [data-pick="${id}"]`);
    if (s.nb.includes(id)) {
      this.found.push(id);
      MapView.mark(id, 'found'); MapView.label(id, true); Sound.play('good');
      if (chip) { chip.classList.add('right'); chip.disabled = true; }
      this.renderSlots([]);
      if (this.found.length === s.nb.length) return this.complete();
      App.feedback('good', `Yes! <b>${BY[id].name}</b> touches ${s.name}.${note}`);
      App.say(`Yes! ${BY[id].name}.`);
    } else {
      this.wrong++;
      Sound.play('bad'); MapView.flash(id, 'bad', 1100); MapView.peekLabel(id, 1700);
      if (chip) { chip.classList.add('wrong'); chip.disabled = true; }
      App.feedback('bad', `<b>${BY[id].name}</b> doesn't touch ${s.name}.${note}`);
      App.say(`${BY[id].name} doesn't touch ${s.name}.`);
    }
  },
  renderSlots(gave) {
    const s = BY[this.t], n = s.nb.length;
    let h = this.found.map(id => `<div class="slot-box got">${BY[id].name}</div>`).join('');
    h += gave.map(id => `<div class="slot-box gave">${BY[id].name}</div>`).join('');
    for (let k = this.found.length + gave.length; k < n; k++) h += '<div class="slot-box">?</div>';
    $('#slots').innerHTML = h;
    $('#count').innerHTML = `${s.name} touches <b>${n}</b> state${n > 1 ? 's' : ''}. You found <b>${this.found.length}</b>.`;
  },
  score() { return Math.max(0, this.found.length - 0.5 * this.wrong) / BY[this.t].nb.length; },
  complete() {
    this.locked = true;
    const s = BY[this.t], sc = this.score();
    this.points += sc; this.res[this.i] = sc > 0.99 ? 'g' : 'y'; refreshPips(this.res, this.qs.length, -1);
    this.got += this.found.length; this.need += s.nb.length;
    lockInputs(); $('#actions').innerHTML = '';
    App.feedback('good', `You found all ${s.nb.length}! Great detective work.`);
    App.say(`You found all ${s.nb.length}!`);
    App.later(() => this.next(), 1900);
  },
  giveUp() {
    if (this.locked) return;
    this.locked = true;
    const s = BY[this.t], rest = s.nb.filter(id => !this.found.includes(id));
    rest.forEach(id => { MapView.mark(id, 'reveal'); MapView.label(id, true); });
    this.points += this.score(); this.res[this.i] = this.found.length ? 'y' : 'r'; refreshPips(this.res, this.qs.length, -1);
    this.got += this.found.length; this.need += s.nb.length;
    this.missed.push(this.t);
    this.renderSlots(rest); lockInputs();
    const names = listWords(rest.map(id => BY[id].name));
    App.feedback('hint', `${names} ${rest.length > 1 ? 'touch' : 'touches'} ${s.name} too.`);
    App.say(`${names} ${rest.length > 1 ? 'touch' : 'touches'} ${s.name} too.`);
    nextButton(() => this.next());
  },
  end() {
    App.finish({ points: this.points, max: this.qs.length, missed: this.missed, score: `${this.got} of ${this.need} neighbors found` });
  },
};

/* ---- 3. Name That State ---- */
const NameIt = {
  start() {
    const pool = App.pool();
    Object.assign(this, { pool, qs: shuffle(pool).slice(0, Math.min(QN, pool.length)), i: -1, points: 0, missed: [], res: [], t: null });
    MapView.reset({ active: new Set(pool) });
    this.next();
  },
  next() {
    if (this.t) { MapView.mark(this.t, 'target', false); MapView.mark(this.t, 'good', false); MapView.mark(this.t, 'done'); }
    this.i++;
    if (this.i >= this.qs.length) return this.end();
    const t = this.t = this.qs[this.i], easy = S.level === 'easy';
    Object.assign(this, { tries: 0, locked: false, hint: false });
    MapView.clearFx(); MapView.mark(t, 'target'); MapView.pulse(t);
    App.progress(this.i + 1, this.qs.length);
    this.sayText = 'What state is this?';
    let answer;
    if (easy) {
      const from = (this.pool.length >= 3 ? this.pool : IDS).filter(id => id !== t);
      const opts = shuffle([t, ...shuffle(from).slice(0, 2)]);
      answer = `<div class="choices" id="choices">${opts.map(id => `<button class="reg" type="button" data-pick="${id}">${BY[id].name}</button>`).join('')}</div>`;
    } else {
      answer = answerForm('Type the state name') + `<div class="row"><button class="btn btn-plain" type="button" id="hintBtn">${ICONS.diamond} First letter</button><span class="hint-letters" id="hintLetters" aria-live="polite"></span></div>`;
    }
    App.panel(`
      <div class="prompt"><div><p class="eyebrow">Name that state</p><h2>What state is this?</h2></div>${sayBtn()}</div>
      ${pipsHTML(this.res, this.qs.length, this.i)}
      <div class="silhouette" id="sil"></div>
      ${answer}
      <div class="feedback" id="feedback"><span>${easy ? 'Tap the right name.' : 'Type its name, then press Enter.'}</span></div>
      <div class="row" id="actions"></div>`);
    $('#sil').appendChild(miniSVG(t, false, false, 1.6));
    if (easy) $('#choices').addEventListener('click', e => { const b = e.target.closest('[data-pick]'); if (b && !b.disabled) this.pick(b.dataset.pick, b); });
    else {
      bindAnswer((v, inp) => this.typed(v, inp));
      $('#hintBtn').addEventListener('click', () => {
        this.hint = true; $('#hintBtn').disabled = true;
        $('#hintLetters').textContent = BY[t].name.split('').map((c, k) => k === 0 ? c : c === ' ' ? ' ' : '_').join(' ');
      });
    }
    App.say(this.sayText);
  },
  pick(id, btn) {
    if (this.locked) return;
    if (id === this.t) { btn.classList.add('right'); return this.right(''); }
    this.tries++;
    btn.classList.add('wrong'); btn.disabled = true;
    Sound.play('bad'); MapView.flash(id, 'bad', 1200); MapView.peekLabel(id, 1800);
    if (this.tries >= 2) return this.reveal();
    App.feedback('bad', `Not ${BY[id].name} — that one's flashing red on the map. Try again!`);
    App.say(`Not ${BY[id].name}. Try again.`);
  },
  typed(v, inp) {
    if (this.locked) return;
    const m = matchState(v);
    if (!m) { App.feedback('hint', `Hmm, I don't know a state called “${esc(v.trim())}”. Check the spelling!`); inp.select(); return; }
    if (m.abbr) { App.feedback('hint', `Type the whole name, not just “${esc(m.s.id)}”.`); inp.select(); return; }
    if (m.s.id === this.t) return this.right(m.exact ? '' : ` Watch the spelling: <b>${m.s.name}</b>.`);
    this.tries++;
    Sound.play('bad'); MapView.flash(m.s.id, 'bad', 1200); MapView.peekLabel(m.s.id, 1800);
    if (this.tries >= 2) return this.reveal();
    App.feedback('bad', `No, that's not ${m.s.name}. Try again!`);
    App.say(`No, that's not ${m.s.name}. Try again.`);
    inp.select();
  },
  right(extra) {
    this.locked = true;
    const t = this.t;
    let pts = this.tries ? 0.5 : 1; if (this.hint) pts /= 2;
    this.points += pts; this.res[this.i] = this.tries || this.hint ? 'y' : 'g'; refreshPips(this.res, this.qs.length, -1);
    MapView.clearFx(); MapView.mark(t, 'target', false); MapView.mark(t, 'good'); MapView.label(t, true);
    Sound.play('good'); lockInputs();
    App.feedback('good', `Yes! It's <b>${BY[t].name}</b>.${extra}`);
    App.say(`Yes! It's ${BY[t].name}.`);
    App.later(() => this.next(), extra ? 2400 : 1500);
  },
  reveal() {
    this.locked = true;
    const t = this.t;
    this.res[this.i] = 'r'; this.missed.push(t); refreshPips(this.res, this.qs.length, -1);
    MapView.label(t, true); lockInputs();
    const right = $(`#choices [data-pick="${t}"]`); if (right) right.classList.add('right');
    App.feedback('bad', `This is <b>${BY[t].name}</b>.`);
    App.say(`This is ${BY[t].name}.`);
    nextButton(() => this.next());
  },
  end() {
    App.finish({ points: this.points, max: this.qs.length, missed: this.missed, score: `${this.res.filter(r => r === 'g').length} of ${this.qs.length} named on the first try` });
  },
};

/* ---- 4. Where Is It? ---- */
const Where = {
  start() {
    const pool = App.pool();
    Object.assign(this, { qs: shuffle(pool).slice(0, Math.min(QN, pool.length)), i: -1, points: 0, missed: [], res: [], hintLabels: [] });
    MapView.reset({ active: new Set(pool) });
    this.next();
  },
  clearHints() {
    for (const id of IDS) MapView.mark(id, 'fade', false);
    this.hintLabels.forEach(id => MapView.label(id, false)); this.hintLabels = [];
  },
  next() {
    this.clearHints();
    this.i++;
    if (this.i >= this.qs.length) return this.end();
    const t = this.t = this.qs[this.i];
    Object.assign(this, { tries: 0, locked: false });
    MapView.clearFx();
    App.progress(this.i + 1, this.qs.length);
    this.sayText = `Find ${BY[t].name}.`;
    App.panel(`
      <div class="prompt"><div><p class="eyebrow">Find this state</p><h2>${BY[t].name}</h2></div>${sayBtn()}</div>
      ${pipsHTML(this.res, this.qs.length, this.i)}
      <div class="feedback" id="feedback"><span>Tap <b>${BY[t].name}</b> on the map.</span></div>
      <div class="row" id="actions"></div>`);
    App.say(this.sayText);
  },
  tap(id) {
    if (this.locked || !id) return;
    if (!MapView.active.has(id)) { App.feedback('', `${BY[id].name} isn't on this trip. Look in ${REGION_LONG[S.region]}!`); return; }
    const t = this.t;
    if (id === t) return this.right();
    this.tries++;
    Sound.play('bad'); MapView.flash(id, 'bad', 1000); MapView.peekLabel(id, 1700);
    const max = S.level === 'easy' ? 3 : 2;
    if (this.tries >= max) return this.reveal(id);
    const that = `That's ${BY[id].name}.`;
    if (S.level === 'hard') { App.feedback('bad', `${that} Try again!`); App.say(`${that} Try again.`); return; }
    if (this.tries === 1) {
      const s = BY[t];
      let msg;
      if (S.region === 'ALL') { for (const x of STATES) MapView.mark(x.id, 'fade', x.reg !== s.reg); msg = `It's in ${REGION_LONG[s.reg]}.`; }
      else if (s.nb.length) { const n = shuffle(s.nb)[0]; MapView.label(n, true); this.hintLabels.push(n); msg = `It touches ${BY[n].name}.`; }
      else msg = `It doesn't touch any other state.`;
      App.feedback('hint', `${that} Hint: ${msg}`);
      App.say(`${that} Hint: ${msg}`);
    } else {
      MapView.pulse(t, 'hint');
      App.feedback('hint', `${that} Look for the blinking circle!`);
      App.say(`${that} Look for the blinking circle.`);
    }
  },
  right() {
    this.locked = true;
    const t = this.t;
    this.points += [1, 0.5, 0.25][this.tries] || 0.25;
    this.res[this.i] = this.tries ? 'y' : 'g'; refreshPips(this.res, this.qs.length, -1);
    this.clearHints(); MapView.clearFx();
    MapView.mark(t, 'good'); MapView.label(t, true); Sound.play('good');
    App.feedback('good', `Yes! That's <b>${BY[t].name}</b>.`);
    App.say(`Yes! ${BY[t].name}.`);
    App.later(() => { MapView.mark(t, 'good', false); MapView.mark(t, 'done'); this.next(); }, 1400);
  },
  reveal(wrongId) {
    this.locked = true;
    const t = this.t;
    this.res[this.i] = 'r'; this.missed.push(t); refreshPips(this.res, this.qs.length, -1);
    this.clearHints(); MapView.clearFx();
    MapView.mark(t, 'reveal'); MapView.label(t, true); MapView.pulse(t);
    App.feedback('bad', `That's ${BY[wrongId].name}. <b>${BY[t].name}</b> is right here.`);
    App.say(`That's ${BY[wrongId].name}. ${BY[t].name} is right here.`);
    nextButton(() => { MapView.mark(t, 'reveal', false); MapView.mark(t, 'done'); this.next(); });
  },
  end() {
    App.finish({ points: this.points, max: this.qs.length, missed: this.missed, score: `${this.res.filter(r => r === 'g').length} of ${this.qs.length} found on the first try` });
  },
};

/* ---- 5. Which Way? (cardinal and intermediate directions) ----
   Three kinds of question, mixed through a round:
     dir   "Texas is ____ of Arkansas"        -> tap a compass direction
     find  "Name 2 states west of Indiana"    -> tap states (Easy) / type them (Hard)
     inv   "Texas is southwest of which state?" -> tap a state (Easy) / type it (Hard)
   Alaska and Hawaii sit in inset boxes, so they are left out of direction questions. */
const compassHTML = eight => {
  const cell = k => {
    const d = DIR_BY[k];
    if (!eight && d.deg % 90 !== 0) return '<span></span>';
    return `<button class="reg banner" type="button" data-dir="${k}"><b>${k}</b><small>${d.word}</small></button>`;
  };
  return `<div class="compass" id="compass">${['NW', 'N', 'NE'].map(cell).join('')}${cell('W')}<span class="compass-hub">${ICONS.roseMini}</span>${cell('E')}${['SW', 'S', 'SE'].map(cell).join('')}</div>`;
};

const WhichWay = {
  start() {
    const base = App.pool().filter(id => id !== 'AK' && id !== 'HI');
    this.all = IDS.filter(id => id !== 'AK' && id !== 'HI');
    this.pool = base.length >= 2 ? base : this.all;
    this.eight = S.level === 'hard';
    this.dirs = this.eight ? DIRS : DIRS.filter(d => d.deg % 90 === 0);
    this.qs = this.build(QN);
    Object.assign(this, { i: -1, points: 0, missed: [], res: [] });
    this.next();
  },
  build(n) {
    const want = [];
    for (let k = 0; k < n; k++) want.push(k % 5 === 3 ? 'inv' : k % 2 ? 'find' : 'dir');
    const out = [];
    let last = null;
    for (const kind of shuffle(want)) {
      const q = this.make(kind, last) || this.make('dir', last) || this.make('find', last);
      if (q) { out.push(q); last = q.b || q.a; }
    }
    return out;
  },
  make(kind, avoid) {
    const rnd = a => a[(Math.random() * a.length) | 0];
    for (let t = 0; t < 240; t++) {
      const d = rnd(this.dirs);
      if (kind === 'dir') {
        const b = rnd(this.pool);
        if (b === avoid) continue;
        const far = this.eight && Math.random() < 0.4;
        const cands = far ? this.all.filter(id => id !== b) : BY[b].nb.filter(id => id !== 'AK' && id !== 'HI');
        const ok = cands.filter(a => dirStrict(b, a, d));
        if (ok.length) return { kind, b, a: rnd(ok), d };
      } else if (kind === 'find') {
        const b = rnd(this.pool);
        if (b === avoid) continue;
        const ok = this.all.filter(x => x !== b && dirStrict(b, x, d));
        if (ok.length >= 3) return { kind, b, d, need: 2, examples: ok };
      } else {
        const a = rnd(this.pool);
        if (a === avoid) continue;
        const ok = BY[a].nb.filter(x => x !== 'AK' && x !== 'HI' && dirStrict(x, a, d));
        if (ok.length) return { kind, a, d, example: rnd(ok) };
      }
    }
    return null;
  },
  next() {
    MapView.reset({ hover: S.level === 'easy' ? 'active' : false });
    this.i++;
    if (this.i >= this.qs.length) return this.end();
    const q = this.q = this.qs[this.i];
    Object.assign(this, { tries: 0, locked: false, found: [], wrong: 0 });
    App.progress(this.i + 1, this.qs.length);
    const easy = S.level === 'easy';
    if (q.kind === 'dir') this.askDir(q);
    else if (q.kind === 'find') this.askFind(q, easy);
    else this.askInv(q, easy);
    App.say(this.sayText);
  },

  /* ---- "A is ____ of B" ---- */
  askDir(q) {
    MapView.mark(q.b, 'target'); MapView.label(q.b, true);
    MapView.mark(q.a, 'other'); MapView.label(q.a, true);
    MapView.rose(q.b, null, this.eight);
    MapView.arrow(q.b, q.a);
    this.sayText = `Which direction is ${BY[q.a].name} from ${BY[q.b].name}?`;
    App.panel(`
      <div class="prompt"><div><p class="eyebrow">Which way?</p>
        <h2><span class="s-blue">${BY[q.a].name}</span> is <span class="blank">&nbsp;</span> of <span class="s-orange">${BY[q.b].name}</span></h2></div>${sayBtn()}</div>
      ${pipsHTML(this.res, this.qs.length, this.i)}
      ${compassHTML(this.eight)}
      <div class="feedback" id="feedback"><span>Follow the arrow out from ${BY[q.b].name}, then tap a direction.</span></div>
      <div class="row" id="actions"></div>`);
    $('#compass').addEventListener('click', e => {
      const b = e.target.closest('[data-dir]');
      if (b && !b.disabled) this.pickDir(b.dataset.dir, b);
    });
  },
  pickDir(k, btn) {
    if (this.locked) return;
    const q = this.q;
    if (k === q.d.k) { btn.classList.add('right'); return this.score(1, `Yes! <b>${BY[q.a].name}</b> is ${q.d.word} of ${BY[q.b].name}.`, `Yes! ${BY[q.a].name} is ${q.d.word} of ${BY[q.b].name}.`); }
    this.tries++;
    btn.classList.add('wrong'); btn.disabled = true;
    Sound.play('bad');
    if (this.tries >= 2) return this.revealDir();
    App.feedback('bad', `Not ${DIR_BY[k].word}. Look at the arrow leaving ${BY[q.b].name} and try again.`);
    App.say(`Not ${DIR_BY[k].word}. Try again.`);
  },
  revealDir() {
    const q = this.q;
    this.locked = true; this.res[this.i] = 'r'; this.missed.push(q.b);
    refreshPips(this.res, this.qs.length, -1);
    MapView.clearFx(); MapView.rose(q.b, q.d.k, this.eight); MapView.arrow(q.b, q.a);
    const btn = $(`#compass [data-dir="${q.d.k}"]`); if (btn) btn.classList.add('right');
    lockInputs();
    App.feedback('bad', `<b>${BY[q.a].name}</b> is ${q.d.word} of ${BY[q.b].name}.`);
    App.say(`${BY[q.a].name} is ${q.d.word} of ${BY[q.b].name}.`);
    nextButton(() => this.next());
  },

  /* ---- "Name 2 states west of Indiana" ---- */
  askFind(q, easy) {
    MapView.mark(q.b, 'target'); MapView.label(q.b, true);
    MapView.rose(q.b, q.d.k, this.eight);
    this.sayText = `Name ${q.need} states ${q.d.word} of ${BY[q.b].name}.`;
    App.panel(`
      <div class="prompt"><div><p class="eyebrow">Use the compass</p>
        <h2>Name ${q.need} states <span class="s-orange">${q.d.word}</span> of ${BY[q.b].name}</h2></div>${sayBtn()}</div>
      ${pipsHTML(this.res, this.qs.length, this.i)}
      <div class="slots" id="slots">${('<div class="slot-box">?</div>').repeat(q.need)}</div>
      ${easy ? '' : answerForm('Type a state name')}
      <div class="feedback" id="feedback"><span>${easy ? `Tap ${q.need} states that are ${q.d.word} of ${BY[q.b].name}.` : 'Type one state at a time, then press Enter.'}</span></div>
      <div class="row" id="actions"><button class="btn btn-plain grow" id="giveBtn" type="button">I'm stuck — show me</button></div>`);
    if (!easy) bindAnswer((v, inp) => this.typed(v, inp, id => this.guessFind(id)));
    $('#giveBtn').addEventListener('click', () => this.giveUpFind());
    this.renderSlots([]);
  },
  renderSlots(gave) {
    const q = this.q;
    let h = this.found.map(id => `<div class="slot-box got">${BY[id].name}</div>`).join('');
    h += gave.map(id => `<div class="slot-box gave">${BY[id].name}</div>`).join('');
    for (let k = this.found.length + gave.length; k < q.need; k++) h += '<div class="slot-box">?</div>';
    $('#slots').innerHTML = h;
  },
  guessFind(id) {
    const q = this.q;
    if (this.locked || this.inset(id)) return;
    if (id === q.b) { App.feedback('', `That's ${BY[id].name} itself! Find states ${q.d.word} of it.`); return; }
    if (this.found.includes(id)) { App.feedback('', `You already have <b>${BY[id].name}</b>.`); return; }
    if (dirOk(q.b, id, q.d)) {
      this.found.push(id);
      MapView.mark(id, 'found'); MapView.label(id, true); Sound.play('good');
      this.renderSlots([]);
      if (this.found.length >= q.need) {
        this.locked = true; lockInputs(); $('#actions').innerHTML = '';
        return this.score(Math.max(0, this.found.length - 0.5 * this.wrong) / q.need,
          `That's ${q.need}! Both are ${q.d.word} of ${BY[q.b].name}.`, `That's ${q.need}! Nice compass work.`);
      }
      App.feedback('good', `Yes — <b>${BY[id].name}</b> is ${q.d.word} of ${BY[q.b].name}. One more!`);
      App.say(`Yes! ${BY[id].name}.`);
    } else {
      this.wrong++;
      Sound.play('bad'); MapView.flash(id, 'bad', 1100); MapView.peekLabel(id, 1700);
      App.feedback('bad', `<b>${BY[id].name}</b> is ${dirOf(q.b, id).word} of ${BY[q.b].name} — I need one that's ${q.d.word}.`);
      App.say(`${BY[id].name} is ${dirOf(q.b, id).word} of ${BY[q.b].name}. Try again.`);
    }
  },
  giveUpFind() {
    if (this.locked) return;
    const q = this.q;
    this.locked = true;
    const rest = shuffle(q.examples.filter(id => !this.found.includes(id))).slice(0, q.need - this.found.length);
    rest.forEach(id => { MapView.mark(id, 'reveal'); MapView.label(id, true); });
    this.renderSlots(rest); lockInputs();
    this.missed.push(q.b);
    const names = listWords(rest.map(id => BY[id].name));
    this.record(Math.max(0, this.found.length - 0.5 * this.wrong) / q.need, this.found.length ? 'y' : 'r');
    App.feedback('hint', `${names} ${rest.length > 1 ? 'are' : 'is'} ${q.d.word} of ${BY[q.b].name}.`);
    App.say(`${names} ${rest.length > 1 ? 'are' : 'is'} ${q.d.word} of ${BY[q.b].name}.`);
    nextButton(() => this.next());
  },

  /* ---- "Texas is southwest of which state?" ---- */
  askInv(q, easy) {
    MapView.mark(q.a, 'target'); MapView.label(q.a, true);
    MapView.rose(q.a, q.d.k, this.eight);
    this.sayText = `${BY[q.a].name} is ${q.d.word} of which state?`;
    App.panel(`
      <div class="prompt"><div><p class="eyebrow">Turn it around</p>
        <h2><span class="s-orange">${BY[q.a].name}</span> is ${q.d.word} of which state?</h2></div>${sayBtn()}</div>
      ${pipsHTML(this.res, this.qs.length, this.i)}
      ${easy ? '' : answerForm('Type the state name')}
      <div class="feedback" id="feedback"><span>${easy ? `Tap the state that has ${BY[q.a].name} to its ${q.d.word}.` : `Type the state that has ${BY[q.a].name} to its ${q.d.word}.`}</span></div>
      <div class="row" id="actions"><button class="btn btn-plain grow" id="giveBtn" type="button">I'm stuck — show me</button></div>`);
    if (!easy) bindAnswer((v, inp) => this.typed(v, inp, id => this.guessInv(id)));
    $('#giveBtn').addEventListener('click', () => this.revealInv());
  },
  guessInv(id) {
    const q = this.q;
    if (this.locked || this.inset(id)) return;
    if (id === q.a) { App.feedback('', `That's ${BY[id].name} itself! Which state does it sit ${q.d.word} of?`); return; }
    if (dirOk(id, q.a, q.d)) {
      MapView.mark(id, 'other'); MapView.label(id, true); MapView.arrow(id, q.a);
      return this.score(1, `Yes! <b>${BY[q.a].name}</b> is ${q.d.word} of <b>${BY[id].name}</b>.`, `Yes! ${BY[q.a].name} is ${q.d.word} of ${BY[id].name}.`);
    }
    this.tries++;
    Sound.play('bad'); MapView.flash(id, 'bad', 1100); MapView.peekLabel(id, 1700);
    const real = dirOf(id, q.a).word;
    if (this.tries >= (S.level === 'easy' ? 3 : 2)) return this.revealInv(id);
    const msg = `From ${BY[id].name}, ${BY[q.a].name} is ${real} — not ${q.d.word}.`;
    if (this.tries === 1) {
      const look = DIR_BY[OPPOSITE[q.d.k]].word;
      App.feedback('hint', `${msg} Hint: look ${look} of ${BY[q.a].name}.`);
      App.say(`${msg} Hint: look ${look} of ${BY[q.a].name}.`);
    } else {
      App.feedback('bad', `${msg} Try again!`);
      App.say(`${msg} Try again.`);
    }
  },
  revealInv(wrongId) {
    const q = this.q;
    this.locked = true; lockInputs();
    MapView.mark(q.example, 'reveal'); MapView.label(q.example, true); MapView.arrow(q.example, q.a);
    this.missed.push(q.a);
    this.record(0, 'r');
    App.feedback('bad', `${wrongId ? `That's ${BY[wrongId].name}. ` : ''}<b>${BY[q.a].name}</b> is ${q.d.word} of <b>${BY[q.example].name}</b>.`);
    App.say(`${BY[q.a].name} is ${q.d.word} of ${BY[q.example].name}.`);
    nextButton(() => this.next());
  },

  /* ---- shared ---- */
  inset(id) {
    if (id !== 'AK' && id !== 'HI') return false;
    App.feedback('hint', `${BY[id].name} is drawn in a box to save room, so the map can't show its real direction. ${id === 'AK' ? 'Alaska is really northwest of the other states.' : 'Hawaii is really far west, out in the Pacific Ocean.'}`);
    App.say(`${BY[id].name} is drawn in a box, so we leave it out of direction questions.`);
    return true;
  },
  typed(v, inp, handler) {
    const m = matchState(v);
    if (!m) { App.feedback('hint', `Hmm, I don't know a state called “${esc(v.trim())}”. Check the spelling!`); inp.select(); return; }
    if (m.abbr) { App.feedback('hint', `Type the whole name, not just “${esc(m.s.id)}”.`); inp.select(); return; }
    inp.value = '';
    handler(m.s.id);
    if (!m.exact) { const f = $('#feedback span'); if (f) f.innerHTML += ` Spelled <b>${m.s.name}</b>.`; }
  },
  record(points, pip) {
    this.points += points;
    this.res[this.i] = pip;
    refreshPips(this.res, this.qs.length, -1);
  },
  score(points, html, spoken) {
    this.locked = true;
    const pts = this.tries ? points * 0.5 : points;
    this.record(pts, pts > 0.99 ? 'g' : 'y');
    lockInputs();
    const a = $('#actions'); if (a) a.innerHTML = '';
    Sound.play('good');
    App.feedback('good', html);
    App.say(spoken);
    App.later(() => this.next(), 1900);
  },
  tap(id) {
    if (!id || this.locked) return;
    const q = this.q;
    if (q.kind === 'dir') { App.feedback('', 'Tap one of the compass directions.'); return; }
    if (S.level === 'hard') { App.feedback('hint', 'On Hard level, type the name in the box.'); return; }
    if (q.kind === 'find') this.guessFind(id); else this.guessInv(id);
  },
  end() {
    App.finish({
      points: this.points, max: this.qs.length, missed: this.missed,
      score: `${this.res.filter(r => r === 'g').length} of ${this.qs.length} right on the first try`,
    });
  },
};

/* ---- 6. Explore the Map ---- */
const Explore = {
  labels: true, caps: true, sel: null,
  start(focus) {
    this.sel = null;
    MapView.reset({ active: new Set(App.pool()), labels: this.labels, capitals: this.caps, hover: 'all' });
    this.sayText = 'Tap any state to learn about it.';
    App.panel(`
      <div class="toggle-row">
        <button class="btn btn-plain" type="button" id="lblBtn"></button>
        <button class="btn btn-plain" type="button" id="capBtn"></button>
      </div>
      <div id="card">
        <p class="eyebrow">Rest area</p>
        <div class="prompt"><h2>Tap any state</h2>${sayBtn()}</div>
        <p class="muted">See its name, its capital city ${ICONS.cap}, and the states it touches.</p>
      </div>`);
    const sync = () => {
      $('#lblBtn').textContent = this.labels ? 'Hide names' : 'Show names';
      $('#capBtn').innerHTML = `${ICONS.cap}${this.caps ? 'Hide capitals' : 'Show capitals'}`;
      $('#lblBtn').setAttribute('aria-pressed', String(this.labels));
      $('#capBtn').setAttribute('aria-pressed', String(this.caps));
    };
    sync();
    $('#lblBtn').addEventListener('click', () => { this.labels = !this.labels; for (const id of IDS) MapView.label(id, this.labels || id === this.sel); sync(); });
    $('#capBtn').addEventListener('click', () => { this.caps = !this.caps; MapView.capitals(this.caps); sync(); });
    $('#card').addEventListener('click', e => { const b = e.target.closest('[data-go]'); if (b) this.show(b.dataset.go); });
    if (focus && BY[focus]) this.show(focus);
    else App.say(this.sayText);
  },
  tap(id) { if (id) this.show(id); },
  show(id) {
    if (this.sel) { MapView.mark(this.sel, 'sel', false); if (!this.labels) MapView.label(this.sel, false); }
    this.sel = id;
    const s = BY[id];
    MapView.mark(id, 'sel'); MapView.label(id, true);
    const none = id === 'HI' ? 'None. Hawaii is a chain of islands in the Pacific Ocean.' : 'None. Alaska touches Canada, but no other state.';
    this.sayText = `${s.name}. The capital is ${s.cap}.` + (s.nb.length ? ` It touches ${listWords(s.nb.map(n => BY[n].name))}.` : '');
    $('#card').innerHTML = `
      <div class="prompt"><div><p class="eyebrow">${REGION_NAMES[s.reg]}</p><h2>${s.name} <span class="abbr-tag">${s.id}</span></h2></div>${sayBtn()}</div>
      <div class="silhouette sel" id="sil"></div>
      <dl class="facts">
        <dt>Capital</dt><dd>${ICONS.cap}${s.cap}</dd>
        <dt>Touches</dt><dd>${s.nb.length ? `${s.nb.length} state${s.nb.length > 1 ? 's' : ''}` : none}</dd>
      </dl>
      ${s.nb.length ? `<div class="chips">${s.nb.map(n => `<button class="reg" type="button" data-go="${n}">${BY[n].name}</button>`).join('')}</div>` : ''}`;
    $('#sil').appendChild(miniSVG(id, true, false, 1.6));
    App.say(`${s.name}. The capital is ${s.cap}.`);
  },
};

const MODE_IMPL = { puzzle: Puzzle, neighbors: Neighbors, name: NameIt, where: Where, which: WhichWay, explore: Explore };

/* ================= APP SHELL ================= */
const App = {
  mode: null, cur: null, timers: [], el: {},
  init() {
    Store.load();
    const ids = ['home', 'game', 'panel', 'homeBtn', 'titleSign', 'modeSign', 'modeName', 'modeSub', 'progress', 'progNum', 'progText', 'report'];
    ids.forEach(k => { this.el[k] = document.getElementById(k); });
    Drag.init();
    this.buildHome();
    this.bindShell();
    this.home();
  },
  later(fn, ms) { const t = setTimeout(fn, ms); this.timers.push(t); return t; },
  pool() { return S.region === 'ALL' ? IDS.slice() : IDS.filter(id => BY[id].reg === S.region); },
  levelName() { return S.level === 'easy' ? 'Easy' : 'Hard'; },
  buildHome() {
    $('#regionOpts').innerHTML = Object.entries(REGION_NAMES).map(([k, v]) =>
      `<label class="opt"><input type="radio" name="region" id="region-${k}" value="${k}"><span>${v}</span></label>`).join('');
    $(`#level-${S.level}`).checked = true;
    $(`#region-${S.region}`).checked = true;
    $('#levelOpts').addEventListener('change', e => { S.level = e.target.value; Store.save(); });
    $('#regionOpts').addEventListener('change', e => { S.region = e.target.value; Store.save(); this.homeMap(); });
    $('#exits').innerHTML = MODE_ORDER.map(m => `
      <button class="sign exit${m === 'explore' ? ' service' : ''}" type="button" data-mode="${m}">
        <span class="exit-tab" data-tab="${m}"></span>
        ${ICONS[m]}<span class="exit-name">${MODES[m].name}</span><span class="exit-desc">${MODES[m].desc}</span>${ICONS.arrow}
      </button>`).join('');
    $('#exits').addEventListener('click', e => { const b = e.target.closest('[data-mode]'); if (b) this.start(b.dataset.mode); });
  },
  updateTabs() {
    for (const m of MODE_ORDER) {
      const tab = $(`[data-tab="${m}"]`);
      if (m === 'explore') { tab.textContent = 'Rest area'; continue; }
      const n = Store.data.best[m] || 0;
      tab.innerHTML = n ? `Best ${starSmall(n)}` : 'New';
      tab.setAttribute('aria-label', n ? `Best: ${n} of 3 stars` : 'Not played yet');
    }
  },
  homeMap() {
    const pool = this.pool();
    MapView.reset({ active: new Set(pool), hover: 'all' });
    MapView.onTap = id => { if (id) this.start('explore', id); };
    $('#homeNote').textContent = S.region === 'ALL'
      ? 'Tap any state to explore it, or pick a game.'
      : `Games will use the ${pool.length} states of the ${REGION_NAMES[S.region]}. Tap any state to explore it.`;
  },
  stop() {
    this.timers.forEach(clearTimeout); this.timers = [];
    Drag.clear(); Voice.stop();
    if (this.cur && this.cur.stop) this.cur.stop();
    this.cur = null;
  },
  home() {
    this.stop();
    const e = this.el;
    e.report.hidden = true; e.game.hidden = true; e.home.hidden = false;
    e.homeBtn.hidden = true; e.modeSign.hidden = true; e.progress.hidden = true; e.titleSign.hidden = false;
    MapView.mount($('#homeMap'));
    this.homeMap(); this.updateTabs();
  },
  start(mode, arg) {
    this.stop();
    const e = this.el;
    this.mode = mode; this.cur = MODE_IMPL[mode];
    e.report.hidden = true; e.home.hidden = true; e.game.hidden = false;
    e.homeBtn.hidden = false; e.titleSign.hidden = true; e.modeSign.hidden = false;
    e.modeSign.classList.toggle('service', mode === 'explore');
    e.modeName.textContent = MODES[mode].name;
    e.modeSub.textContent = mode === 'explore' ? REGION_NAMES[S.region] : `${this.levelName()} · ${REGION_NAMES[S.region]}`;
    e.progress.hidden = mode === 'explore';
    MapView.mount($('#gameMap'));
    MapView.onTap = (id, ev) => { if (this.cur && this.cur.tap) this.cur.tap(id, ev); };
    this.cur.start(arg);
    window.scrollTo(0, 0);
  },
  progress(n, total) { this.el.progNum.textContent = n; this.el.progText.textContent = `of ${total}`; },
  panel(html) { this.el.panel.innerHTML = html; },
  feedback(kind, html) {
    const f = $('#feedback'); if (!f) return;
    f.className = 'feedback' + (kind ? ' ' + kind : '');
    f.innerHTML = (FB_ICON[kind] || '') + `<span>${html}</span>`;
  },
  say(t) { Voice.say(t); },
  finish(r) {
    this.timers.forEach(clearTimeout); this.timers = [];
    const pct = r.max ? r.points / r.max : 0;
    const stars = pct >= 0.9 ? 3 : pct >= 0.6 ? 2 : 1;
    const best = Store.data.best;
    best[this.mode] = Math.max(best[this.mode] || 0, stars);
    Store.save();
    const title = stars === 3 ? 'Amazing trip!' : stars === 2 ? 'Great driving!' : 'Trip complete!';
    $('#reportTitle').textContent = title;
    $('#reportSub').textContent = `${MODES[this.mode].name} · ${this.levelName()} · ${REGION_NAMES[S.region]}`;
    $('#reportStars').innerHTML = [1, 2, 3].map(i => starBig(i <= stars)).join('');
    $('#reportStars').setAttribute('aria-label', `${stars} of 3 stars`);
    $('#reportScore').textContent = r.score;
    $('#reportExtra').textContent = r.extra || '';
    const miss = [...new Set(r.missed)].filter(id => BY[id]);
    $('#reportPractice').innerHTML = miss.length
      ? `<p class="eyebrow">Practice these</p><div class="chips">${miss.map(id => `<button class="reg" type="button" data-explore="${id}">${BY[id].name}</button>`).join('')}</div>`
      : '';
    this.el.report.hidden = false;
    $('#againBtn').focus({ preventScroll: true });
    Sound.play('win'); Confetti.run();
    this.say(`${title} You earned ${stars} star${stars > 1 ? 's' : ''}.`);
  },
  bindShell() {
    this.el.homeBtn.addEventListener('click', () => this.home());
    const sb = $('#soundBtn'), vb = $('#voiceBtn');
    const sync = () => { sb.setAttribute('aria-pressed', String(!!S.sound)); vb.setAttribute('aria-pressed', String(!!S.voice)); vb.hidden = !Voice.ok; };
    sb.addEventListener('click', () => { S.sound = !S.sound; Store.save(); sync(); if (S.sound) Sound.play('good'); });
    vb.addEventListener('click', () => { S.voice = !S.voice; Store.save(); sync(); if (S.voice) Voice.say('Read aloud is on.'); else Voice.stop(); });
    sync();
    this.el.panel.addEventListener('click', e => { if (e.target.closest('[data-say]') && this.cur) Voice.say(this.cur.sayText, true); });
    $('#againBtn').addEventListener('click', () => this.start(this.mode));
    $('#pickBtn').addEventListener('click', () => this.home());
    $('#reportPractice').addEventListener('click', e => { const b = e.target.closest('[data-explore]'); if (b) this.start('explore', b.dataset.explore); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !this.el.report.hidden) this.home(); });
  },
};

window.MapQuest = { App, MapView, matchState, BY, DIRS, bearing, dirOf, modes: MODE_IMPL }; // handy for poking around in dev tools
App.init();
})();
