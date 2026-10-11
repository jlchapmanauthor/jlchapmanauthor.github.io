/* J.L. Chapman: opt-in Nightmare Mode. No browser control, forced sound or tracking. */
(() => {
  'use strict';
  const toggle = document.getElementById('nightmare-toggle');
  const state = document.getElementById('nightmare-state');
  const layer = document.getElementById('nightmare-layer');
  if (!toggle || !state || !layer) return;

  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const coarse = window.matchMedia('(pointer: coarse)');
  const random = (min, max) => min + Math.random() * (max - min);
  const pick = list => list[Math.floor(Math.random() * list.length)];
  const oneOf = (value, values) => values.includes(value);
  const nightmares = [
    { css: 'clown', name: 'THE_CARNIVAL.jpg' },
    { css: 'glass', name: 'THE_OTHER_SIDE.jpg' },
    { css: 'lurker', name: 'IT_SEES_YOU.jpg' },
    { css: 'ward', name: 'PATIENT_UNKNOWN.jpg' },
    { css: 'faceless', name: 'DO_NOT_OPEN.jpg' }
  ];
  const pressureTargets = '.hero-copy, .hero-feature, .book-card, .work-card, .section-heading, .about-card, .representation-feature, .reader-signup-box, .contact-section p, .contact-section h2';

  let enabled = false;
  let next = null;
  let timers = new Set();
  let animations = new Set();
  let raf = null;
  let currentKind = '';
  let lastKind = '';
  let lastCursorAt = 0;
  let shown = 0;
  let activatedAt = 0;
  let lastPointer = null;
  let focusedBeforeScare = null;
  let touched = new Set();

  const now = () => Date.now();
  function after(ms, fn) {
    const id = window.setTimeout(() => { timers.delete(id); if (enabled && !document.hidden) fn(); }, ms);
    timers.add(id);
    return id;
  }
  function animate(element, keyframes, options) {
    const a = element.animate(keyframes, { fill: 'both', easing: 'ease-in-out', ...options });
    animations.add(a);
    a.addEventListener('finish', () => animations.delete(a), { once: true });
    return a;
  }
  function make(tag, css, parent = layer) {
    const node = document.createElement(tag);
    node.className = css;
    node.setAttribute('aria-hidden', 'true');
    parent.appendChild(node);
    return node;
  }
  function clearPressure() {
    touched.forEach(el => { el.style.removeProperty('translate'); el.style.removeProperty('transition'); });
    touched.clear();
  }
  function clean() {
    if (next !== null) { window.clearTimeout(next); next = null; }
    timers.forEach(id => window.clearTimeout(id));
    timers.clear();
    animations.forEach(a => a.cancel());
    animations.clear();
    if (raf !== null) { window.cancelAnimationFrame(raf); raf = null; }
    clearPressure();
    layer.replaceChildren();
    currentKind = '';
  }
  function blocked() {
    if (document.hidden || motion.matches) return true;
    const el = document.activeElement;
    return Boolean(el && el.matches && el.matches('input, select, textarea, [contenteditable], [role="textbox"]'));
  }
  function schedule(first = false) {
    if (!enabled || blocked()) return;
    next = window.setTimeout(() => {
      next = null;
      if (blocked()) { schedule(false); return; }
      perform();
    }, first ? random(9000, 16000) : random(20000, 42000));
  }
  function stopEvent(delay = 0) {
    after(delay, () => {
      layer.replaceChildren();
      clearPressure();
      currentKind = '';
      if (enabled) schedule(false);
    });
  }

  /* The moving lens and tiny displacements create the illusion of pressed glass. */
  function bendNearby(x, y, force) {
    const targets = document.querySelectorAll(pressureTargets);
    targets.forEach(el => {
      const rect = el.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > innerHeight) return;
      const cx = Math.max(rect.left, Math.min(rect.right, x));
      const cy = Math.max(rect.top, Math.min(rect.bottom, y));
      const d = Math.hypot(cx - x, cy - y);
      if (d > 190) {
        if (touched.has(el)) {
          el.style.removeProperty('translate');
          el.style.removeProperty('transition');
          touched.delete(el);
        }
        return;
      }
      const amount = (1 - d / 190) * force;
      const vx = (rect.left + rect.width / 2 - x) >= 0 ? 1 : -1;
      const vy = (rect.top + rect.height / 2 - y) >= 0 ? 1 : -1;
      el.style.setProperty('transition', 'translate 170ms ease-out');
      el.style.setProperty('translate', (vx * amount * 0.66).toFixed(1) + 'px ' + (vy * amount).toFixed(1) + 'px');
      touched.add(el);
    });
  }

  function watcher() {
    const side = Math.random() < .5 ? 'left' : 'right';
    const node = make('div', 'nm-photo nm-watcher-real nm-photo--watcher nm-watcher-' + side);
    node.style.top = random(13, 51).toFixed(1) + 'vh';
    // Half-concealed at the edge, then slow inward and slowly back out.
    animate(node, [
      { offset: 0, opacity: 0, transform: side === 'right' ? 'translateX(89%)' : 'translateX(-89%) scaleX(-1)' },
      { offset: .21, opacity: .75, transform: side === 'right' ? 'translateX(50%)' : 'translateX(-50%) scaleX(-1)' },
      { offset: .57, opacity: 1, transform: side === 'right' ? 'translateX(17%)' : 'translateX(-17%) scaleX(-1)' },
      { offset: .79, opacity: 1, transform: side === 'right' ? 'translateX(17%)' : 'translateX(-17%) scaleX(-1)' },
      { offset: 1, opacity: 0, transform: side === 'right' ? 'translateX(92%)' : 'translateX(-92%) scaleX(-1)' }
    ], { duration: 5400 });
    stopEvent(5650);
  }

  function claw() {
    const node = make('div', 'nm-photo nm-hand-real nm-photo--hand');
    const lens = make('div', 'nm-pressure-lens nm-pressure-claw');
    const x = random(innerWidth * .21, innerWidth * .78);
    const height = Math.min(innerHeight * .55, 490);
    const start = -height * .9;
    const end = innerHeight + 50;
    node.style.left = x + 'px';
    const duration = 5800;
    const startTime = performance.now();
    let previousUpdate = -9999;
    const frame = time => {
      if (!enabled || currentKind !== 'claw') return;
      const p = Math.min(1, (time - startTime) / duration);
      const y = start + (end - start) * p;
      node.style.transform = 'translate(-50%, ' + (y - height * .18).toFixed(1) + 'px)';
      node.style.opacity = p < .07 ? String(p / .07) : p > .9 ? String((1 - p) / .1) : '.95';
      const contactY = y + height * .49;
      lens.style.transform = 'translate(-50%, -50%)';
      lens.style.left = x + 'px';
      lens.style.top = contactY + 'px';
      lens.style.opacity = p < .12 || p > .89 ? '0' : '.85';
      if (time - previousUpdate > 95) { bendNearby(x, contactY, 10); previousUpdate = time; }
      if (p < 1) raf = requestAnimationFrame(frame);
      else raf = null;
    };
    raf = requestAnimationFrame(frame);
    stopEvent(duration + 180);
  }

  function pressedFace() {
    const face = make('div', 'nm-photo nm-face-real nm-photo--face');
    const membrane = make('div', 'nm-face-membrane');
    const x = random(innerWidth * .30, innerWidth * .70);
    const y = random(innerHeight * .29, innerHeight * .62);
    face.style.left = membrane.style.left = x + 'px';
    face.style.top = membrane.style.top = y + 'px';
    animate(face, [
      { offset: 0, transform: 'translate(-50%, -50%) scale(.58)', opacity: 0, filter: 'blur(15px)' },
      { offset: .35, transform: 'translate(-50%, -50%) scale(.92)', opacity: .62, filter: 'blur(4px)' },
      { offset: .71, transform: 'translate(-50%, -50%) scale(1.18)', opacity: 1, filter: 'blur(0)' },
      { offset: .91, transform: 'translate(-50%, -50%) scale(1.21)', opacity: .96, filter: 'blur(0)' },
      { offset: 1, transform: 'translate(-50%, -50%) scale(1.11)', opacity: 0, filter: 'blur(4px)' }
    ], { duration: 4400 });
    animate(membrane, [
      { offset: 0, opacity: 0, transform: 'translate(-50%, -50%) scale(.35)' },
      { offset: .65, opacity: .9, transform: 'translate(-50%, -50%) scale(1)' },
      { offset: 1, opacity: 0, transform: 'translate(-50%, -50%) scale(1.25)' }
    ], { duration: 4500 });
    after(2100, () => bendNearby(x, y, 9));
    after(3450, () => bendNearby(x, y, 15));
    stopEvent(4600);
  }

  function cursorShape() {
    return '<svg width="24" height="32" viewBox="0 0 24 32" aria-hidden="true" focusable="false">' +
      '<path d="M3 2 L3 25 L9 19 L13 29 L17 27 L13 17 L22 17Z" fill="#fff4e7" stroke="#090808" stroke-width="2" stroke-linejoin="round"/></svg>';
  }
  function cursedCursor() {
    if (coarse.matches && !lastPointer) {
      lastPointer = { x: innerWidth * .44, y: innerHeight * .44 };
    }
    const x = lastPointer ? lastPointer.x : innerWidth * .52;
    const y = lastPointer ? lastPointer.y : innerHeight * .49;
    const swarm = [];
    const count = 6;
    for (let i = 0; i < count; i++) {
      const cursor = make('div', 'nm-phantom-cursor');
      cursor.innerHTML = cursorShape();
      const angle = Math.PI * 2 * i / count + random(-.30, .30);
      const distance = random(70, Math.min(190, innerWidth * .3));
      const dx = Math.cos(angle) * distance, dy = Math.sin(angle) * distance;
      const toX = Math.max(12, Math.min(innerWidth - 25, x + dx));
      const toY = Math.max(10, Math.min(innerHeight - 44, y + dy));
      animate(cursor, [
        { offset: 0, transform: 'translate(' + x + 'px,' + y + 'px) scale(.35)', opacity: 0 },
        { offset: .12, transform: 'translate(' + x + 'px,' + y + 'px) scale(1)', opacity: 1 },
        { offset: 1, transform: 'translate(' + toX + 'px,' + toY + 'px) scale(1)', opacity: 1 }
      ], { duration: 1320 + i * 115, easing: 'cubic-bezier(.18,.75,.36,1)' });
      swarm.push({ node: cursor, x: toX, y: toY });
    }

    const fileX = Math.max(35, Math.min(innerWidth - 90, innerWidth * random(.30, .72)));
    const fileY = Math.max(95, Math.min(innerHeight - 140, innerHeight * random(.24, .68)));
    const fakeFile = make('div', 'nm-cursed-file');
    fakeFile.innerHTML = '<span class="nm-cursed-file-symbol" aria-hidden="true">▣</span><span>UNKNOWN.jpg</span>';
    fakeFile.style.left = fileX + 'px';
    fakeFile.style.top = fileY + 'px';
    after(1500, () => fakeFile.classList.add('nm-file-visible'));
    after(2200, () => {
      // The animation simulates clicks only inside Nightmare Mode. Nothing is downloaded or opened.
      const lead = swarm[0];
      if (!lead) return;
      animate(lead.node, [
        { transform: 'translate(' + lead.x + 'px,' + lead.y + 'px) scale(1)' },
        { transform: 'translate(' + (fileX + 27) + 'px,' + (fileY + 17) + 'px) scale(1)' }
      ], { duration: 900, easing: 'ease-in-out' });
      swarm.slice(1).forEach((obj, i) => {
        animate(obj.node, [
          { opacity: .85, transform: 'translate(' + obj.x + 'px,' + obj.y + 'px)' },
          { opacity: 0, transform: 'translate(' + (obj.x + random(-30,30)) + 'px,' + (obj.y + random(-30,30)) + 'px)' }
        ], { duration: 520 + i * 80 });
      });
    });
    after(3250, () => {
      fakeFile.classList.add('nm-file-clicked');
      const chosen = pick(nightmares);
      const overlay = make('div', 'nm-archive-overlay');
      const windowFrame = make('div', 'nm-archive-window', overlay);
      const bar = make('div', 'nm-archive-title', windowFrame);
      bar.textContent = 'NIGHTMARE ARCHIVE  /  ' + chosen.name;
      const photo = make('div', 'nm-photo nm-popup-photo nm-photo--' + chosen.css, windowFrame);
      const footer = make('div', 'nm-archive-footer', windowFrame);
      footer.textContent = 'CONNECTION LOST';
      overlay.classList.add('nm-archive-open');
    });
    stopEvent(6150);
  }

  function choose() {
    const sinceStart = now() - activatedAt;
    const cursorAllowed = shown >= 3 && sinceStart > 85000 &&
      (lastCursorAt === 0 || now() - lastCursorAt > 155000);
    const kinds = cursorAllowed
      ? ['watcher', 'watcher', 'claw', 'claw', 'face', 'face', 'cursor']
      : ['watcher', 'watcher', 'claw', 'claw', 'face', 'face'];
    let kind = pick(kinds);
    if (kind === lastKind) kind = pick(kinds.filter(k => k !== lastKind));
    return kind;
  }
  function perform() {
    if (!enabled || blocked()) { schedule(false); return; }
    clean();
    const kind = choose();
    currentKind = kind;
    lastKind = kind;
    shown++;
    if (kind === 'cursor') { lastCursorAt = now(); cursedCursor(); }
    else if (kind === 'watcher') watcher();
    else if (kind === 'claw') claw();
    else pressedFace();
  }

  function updateControl() {
    toggle.setAttribute('aria-pressed', String(enabled));
    toggle.setAttribute('aria-label', enabled ? 'Turn off Nightmare Mode' : 'Turn on Nightmare Mode with visual jump scares');
    toggle.classList.toggle('is-active', enabled);
    state.textContent = enabled ? 'On' : 'Off';
  }
  function setEnabled(nextValue) {
    clean();
    enabled = Boolean(nextValue) && !motion.matches;
    if (enabled) {
      activatedAt = now();
      lastCursorAt = 0;
      shown = 0;
      lastKind = '';
      schedule(true);
    }
    updateControl();
  }
  function motionChange() {
    if (motion.matches) setEnabled(false);
    toggle.disabled = motion.matches;
    toggle.title = motion.matches
      ? 'Nightmare Mode is disabled while reduced motion is enabled'
      : 'Optional visual scares including crawling hands, false cursors, and full-screen faces. Press Escape to exit.';
  }

  window.addEventListener('pointermove', event => {
    if (event.isPrimary !== false) lastPointer = { x: event.clientX, y: event.clientY };
  }, { passive: true });
  toggle.addEventListener('click', () => setEnabled(!enabled));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && enabled) setEnabled(false);
  });
  document.addEventListener('visibilitychange', () => {
    if (!enabled) return;
    clean();
    if (!document.hidden) schedule(true);
  });
  window.addEventListener('pagehide', clean);
  if (motion.addEventListener) motion.addEventListener('change', motionChange);
  else if (motion.addListener) motion.addListener(motionChange);
  updateControl();
  motionChange();
})();