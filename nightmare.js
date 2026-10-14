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
  const nightmares = [
    { css: 'clown', name: 'THE_CARNIVAL.jpg' },
    { css: 'glass', name: 'THE_OTHER_SIDE.jpg' },
    { css: 'lurker', name: 'IT_SEES_YOU.jpg' },
    { css: 'ward', name: 'PATIENT_UNKNOWN.jpg' },
    { css: 'faceless', name: 'DO_NOT_OPEN.jpg' }
  ];
  const creepyMessages = [
    "It's 10pm, do you know where your kids are?",
    "I see you.",
    "Don't turn around.",
    "You were not alone here.",
    "It knows your name."
  ];
  // The original pressing face plus four new realistic variations.
  const pressingFaces = ['original', 'spider', 'grinning', 'stretched', 'porcelain'];
  let lastPressingFace = null;
  const pressureTargets = '.hero-copy, .hero-feature, .book-card, .work-card, .section-heading, .about-card, .representation-feature, .reader-signup-box, .contact-section p, .contact-section h2';

  let enabled = false;
  let next = null;
  let timers = new Set();
  let animations = new Set();
  let raf = null;
  let currentKind = '';
  let lastKind = '';
  let lastCursorAt = 0;
  let lastDollAt = 0;
  let lastGlassAt = 0;
  let lastSpiderAt = 0;
  let spiderVideoAvailable = false;
  let glassVideoAvailable = false;
  let activeGlassVideo = null;
  let shown = 0;
  let activatedAt = 0;
  let lastPointer = null;
  let lastMessage = '';
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
    if (activeGlassVideo) {
      activeGlassVideo.pause();
      activeGlassVideo.removeAttribute('src');
      activeGlassVideo.load();
      activeGlassVideo = null;
    }
    layer.replaceChildren();
    layer.setAttribute('aria-hidden', 'true');
    currentKind = '';
  }
  function blocked() {
    if (document.hidden || motion.matches) return true;
    const el = document.activeElement;
    return Boolean(el && el.matches && el.matches('input:not([type="range"]):not([type="button"]):not([type="checkbox"]):not([type="radio"]), select, textarea, [contenteditable="true"], [role="textbox"]'));
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

  // A short interference effect types a haunted message, without flashing.
  function glitchMessage() {
    const choices = creepyMessages.filter(message => message !== lastMessage);
    const message = pick(choices.length ? choices : creepyMessages);
    lastMessage = message;

    const overlay = make('div', 'nm-glitch-screen');
    const scan = make('div', 'nm-glitch-scan', overlay);
    const box = make('div', 'nm-glitch-box', overlay);
    const label = make('div', 'nm-glitch-label', box);
    const text = make('div', 'nm-glitch-text', box);
    label.textContent = 'SIGNAL INTERRUPTED';
    text.textContent = '';

    animate(overlay, [
      { offset: 0, opacity: 0 },
      { offset: .10, opacity: 1 },
      { offset: .83, opacity: 1 },
      { offset: 1, opacity: 0 }
    ], { duration: 6250 });
    animate(box, [
      { offset: 0, opacity: 0, transform: 'translateY(9px) scale(.98)' },
      { offset: .14, opacity: 1, transform: 'translateY(0) scale(1)' },
      { offset: .83, opacity: 1, transform: 'translateY(0) scale(1)' },
      { offset: 1, opacity: 0, transform: 'translateY(-6px) scale(.99)' }
    ], { duration: 6200 });
    animate(scan, [
      { offset: 0, opacity: 0, transform: 'translateY(-12vh)' },
      { offset: .15, opacity: .30, transform: 'translateY(12vh)' },
      { offset: .85, opacity: .13, transform: 'translateY(72vh)' },
      { offset: 1, opacity: 0, transform: 'translateY(110vh)' }
    ], { duration: 6150 });

    let index = 0;
    function typeNext() {
      if (!enabled || currentKind !== 'glitch') return;
      if (index < message.length) {
        text.textContent += message.charAt(index++);
        after(random(39, 62), typeNext);
      }
    }
    after(570, typeNext);
    stopEvent(6500);
  }

  function pressedFace() {
    const choices = pressingFaces.filter(name => name !== lastPressingFace);
    const chosenFace = pick(choices);
    lastPressingFace = chosenFace;
    const faceClass = chosenFace === 'original'
      ? 'nm-photo nm-face-real nm-photo--face'
      : 'nm-photo nm-face-real nm-new-face nm-new-face--' + chosenFace;
    const face = make('div', faceClass);
    const membrane = make('div', 'nm-face-membrane');
    // Anchor the face to the visual viewport, not the start of the document.
    // On narrow screens keep it centered so the entire expression stays visible.
    const viewport = layer.getBoundingClientRect();
    const narrow = viewport.width <= 640 || viewport.height <= 500;
    const x = narrow ? viewport.width * .5 : random(viewport.width * .30, viewport.width * .70);
    const y = narrow ? viewport.height * .52 : random(viewport.height * .29, viewport.height * .62);
    face.style.left = membrane.style.left = x + 'px';
    face.style.top = membrane.style.top = y + 'px';
    // On phones the old long blur and side-cropping hid most of the face.
    const faceFrames = narrow ? [
      { offset: 0, transform: 'translate(-50%, -50%) scale(.78)', opacity: 0, filter: 'blur(9px) brightness(.95)' },
      { offset: .20, transform: 'translate(-50%, -50%) scale(.94)', opacity: .88, filter: 'blur(2px) brightness(1.08)' },
      { offset: .45, transform: 'translate(-50%, -50%) scale(1.05)', opacity: 1, filter: 'blur(0) brightness(1.12)' },
      { offset: .82, transform: 'translate(-50%, -50%) scale(1.10)', opacity: 1, filter: 'blur(0) brightness(1.12)' },
      { offset: 1, transform: 'translate(-50%, -50%) scale(1.08)', opacity: 0, filter: 'blur(3px)' }
    ] : [
      { offset: 0, transform: 'translate(-50%, -50%) scale(.68)', opacity: 0, filter: 'blur(10px)' },
      { offset: .30, transform: 'translate(-50%, -50%) scale(.94)', opacity: .84, filter: 'blur(3px)' },
      { offset: .62, transform: 'translate(-50%, -50%) scale(1.13)', opacity: 1, filter: 'blur(0) brightness(1.08)' },
      { offset: .87, transform: 'translate(-50%, -50%) scale(1.16)', opacity: 1, filter: 'blur(0) brightness(1.08)' },
      { offset: 1, transform: 'translate(-50%, -50%) scale(1.10)', opacity: 0, filter: 'blur(3px)' }
    ];
    animate(face, faceFrames, { duration: 5100 });
    animate(membrane, [
      { offset: 0, opacity: 0, transform: 'translate(-50%, -50%) scale(.35)' },
      { offset: .65, opacity: .9, transform: 'translate(-50%, -50%) scale(1)' },
      { offset: 1, opacity: 0, transform: 'translate(-50%, -50%) scale(1.25)' }
    ], { duration: 5100 });
    after(1900, () => bendNearby(x, y, 9));
    after(3650, () => bendNearby(x, y, 15));
    stopEvent(5300);
  }

  function cursorShape() {
    return '<svg width="24" height="32" viewBox="0 0 24 32" aria-hidden="true" focusable="false">' +
      '<path d="M3 2 L3 25 L9 19 L13 29 L17 27 L13 17 L22 17Z" fill="#fff4e7" stroke="#090808" stroke-width="2" stroke-linejoin="round"/></svg>';
  }
  function showNightmareArchive() {
    const chosen = pick(nightmares);
    const overlay = make('div', 'nm-archive-overlay');
    const windowFrame = make('div', 'nm-archive-window', overlay);
    const bar = make('div', 'nm-archive-title', windowFrame);
    bar.textContent = 'NIGHTMARE ARCHIVE  /  ' + chosen.name;
    make('div', 'nm-photo nm-popup-photo nm-photo--' + chosen.css, windowFrame);
    const footer = make('div', 'nm-archive-footer', windowFrame);
    footer.textContent = 'CONNECTION LOST';
    overlay.classList.add('nm-archive-open');
  }

  /* Long haunted-doll variation of the fake file and cursor event.
     No actual mouse movement, file access, click, or window interaction. */
  function cursedDoll() {
    const rect = layer.getBoundingClientRect();
    const vw = rect.width;
    const vh = rect.height;
    const isSmall = vw <= 640 || vh <= 500;
    const width = isSmall ? Math.min(218, Math.max(140, vw * .54))
                          : Math.min(325, Math.max(194, vw * .25));
    const height = width * (1448 / 1086);
    // The file appears in the center before anything starts moving.
    const fileX = vw * .5;
    const fileY = vh * .50;
    const fakeFile = make('div', 'nm-cursed-file nm-doll-file');
    fakeFile.innerHTML = '<span class="nm-cursed-file-symbol" aria-hidden="true">▣</span><span>DON_T_OPEN.jpg</span>';
    fakeFile.style.left = fileX + 'px';
    fakeFile.style.top = fileY + 'px';
    fakeFile.classList.add('nm-file-visible');

    const doll = make('div', 'nm-doll-walker');
    doll.style.width = width + 'px';
    doll.style.height = height + 'px';
    const body = make('div', 'nm-doll-body', doll);

    const startX = -width - 30;
    const pauseX = fileX - width * (isSmall ? 1.12 : 1.25);
    const endX = fileX - width * .83;
    const endY = fileY - height * .43;
    const startY = endY + (isSmall ? 33 : 44);
    // Crawl in from the LEFT, with uneven, stop-start steps.
    const positions = [
      { offset: 0, transform: 'translate3d(' + startX + 'px,' + (startY + 7) + 'px,0)', opacity: 0 },
      { offset: .08, transform: 'translate3d(' + (startX + 25) + 'px,' + startY + 'px,0)', opacity: 1 },
      { offset: .24, transform: 'translate3d(' + (pauseX - 45) + 'px,' + (startY - 8) + 'px,0)', opacity: 1 },
      { offset: .36, transform: 'translate3d(' + pauseX + 'px,' + startY + 'px,0)', opacity: 1 },
      { offset: .57, transform: 'translate3d(' + pauseX + 'px,' + startY + 'px,0)', opacity: 1 },
      { offset: .78, transform: 'translate3d(' + endX + 'px,' + endY + 'px,0)', opacity: 1 },
      { offset: .90, transform: 'translate3d(' + endX + 'px,' + endY + 'px,0)', opacity: 1 },
      { offset: 1, transform: 'translate3d(' + endX + 'px,' + (endY + 18) + 'px,0)', opacity: 0 }
    ];
    animate(doll, positions, { duration: 14300, easing: 'linear' });
    animate(body, [
      { offset: 0, transform: 'rotate(-3deg) translateY(0)' },
      { offset: .12, transform: 'rotate(3deg) translateY(-7px)' },
      { offset: .23, transform: 'rotate(-4deg) translateY(2px)' },
      { offset: .36, transform: 'rotate(2deg) translateY(-6px)' },
      { offset: .46, transform: 'rotate(-2deg) translateY(0)' },
      { offset: .57, transform: 'rotate(-2deg) translateY(0)' },
      { offset: .71, transform: 'rotate(4deg) translateY(-9px)' },
      { offset: .81, transform: 'rotate(-2deg) translateY(0)' },
      { offset: .92, transform: 'rotate(0deg) translateY(0)' },
      { offset: 1, transform: 'rotate(-3deg) translateY(7px)' }
    ], { duration: 14300, easing: 'ease-in-out' });

    // The doll captures a simulated cursor, while the actual pointer stays free.
    const ghostCursor = make('div', 'nm-phantom-cursor nm-doll-cursor');
    ghostCursor.innerHTML = cursorShape();
    const clamped = (v, low, high) => Math.min(high, Math.max(low, v));
    const originalPointer = lastPointer && !coarse.matches
      ? { x: clamped(lastPointer.x, 15, vw - 24), y: clamped(lastPointer.y, 15, vh - 35) }
      : { x: vw * .65, y: vh * .62 };
    const handX = pauseX + width * .86;
    const handY = startY + height * .41;
    // Cursor becomes visible only once the doll has wandered partway in.
    after(4350, () => {
      animate(ghostCursor, [
        { offset: 0, opacity: 0, transform: 'translate(' + originalPointer.x + 'px,' + originalPointer.y + 'px) scale(.65)' },
        { offset: .12, opacity: 1, transform: 'translate(' + originalPointer.x + 'px,' + originalPointer.y + 'px) scale(1)' },
        { offset: 1, opacity: 1, transform: 'translate(' + handX + 'px,' + handY + 'px) scale(1)' }
      ], { duration: 1700 });
    });
    after(6240, () => {
      animate(ghostCursor, [
        { offset: 0, opacity: 1, transform: 'translate(' + handX + 'px,' + handY + 'px)' },
        { offset: .5, opacity: 1, transform: 'translate(' + ((handX + fileX) / 2) + 'px,' + ((handY + fileY) / 2) + 'px)' },
        { offset: 1, opacity: 1, transform: 'translate(' + fileX + 'px,' + fileY + 'px)' }
      ], { duration: 3100, easing: 'ease-in-out' });
    });
    after(9520, () => {
      fakeFile.classList.add('nm-file-clicked');
      const clickRing = make('div', 'nm-doll-click-ring');
      clickRing.style.left = fileX + 'px';
      clickRing.style.top = fileY + 'px';
    });
    after(10050, showNightmareArchive);
    stopEvent(14350);
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
      showNightmareArchive();
    });
    stopEvent(6150);
  }


  /* Only run the full-screen, muted video once the visitor opted in AND
     the video is present in GitHub Pages. Never take over browser fullscreen. */
  function behindGlass() {
    const overlay = document.createElement('div');
    overlay.className = 'nm-glass-overlay';
    overlay.setAttribute('role', 'group');
    overlay.setAttribute('aria-label', 'Something Behind the Glass horror video');
    const video = document.createElement('video');
    video.className = 'nm-glass-video';
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.controls = false;
    video.preload = 'auto';
    video.setAttribute('playsinline', '');
    video.setAttribute('aria-hidden', 'true');

    const skip = document.createElement('button');
    skip.className = 'nm-glass-skip';
    skip.type = 'button';
    skip.textContent = 'Skip scare ×';
    skip.setAttribute('aria-label', 'Skip this Nightmare Mode video');

    overlay.appendChild(video);
    overlay.appendChild(skip);
    layer.appendChild(overlay);
    layer.setAttribute('aria-hidden', 'false');
    activeGlassVideo = video;
    function endGlass() {
      if (!enabled || currentKind !== 'glass') return;
      clean();
      schedule(false);
    }
    skip.addEventListener('click', endGlass);
    video.addEventListener('ended', () => {
      if (enabled && currentKind === 'glass') {
        // Let the last handprint linger for a moment.
        after(1700, endGlass);
      }
    }, { once: true });
    video.addEventListener('error', () => {
      glassVideoAvailable = false;
      endGlass();
    }, { once: true });
    video.src = 'nightmare-behind-the-glass.mp4';
    const playback = video.play();
    if (playback && typeof playback.catch === 'function') {
      playback.catch(() => {
        glassVideoAvailable = false;
        endGlass();
      });
    }
    // Do not leave a black screen behind if video cannot complete.
    after(24000, endGlass);
  }


  /* Rare vertical video pop-up, framed for both mobile and desktop.
     Runs only after voluntary Nightmare Mode opt-in and asset availability. */
  function spiderHallway() {
    const overlay = document.createElement('div');
    overlay.className = 'nm-glass-overlay nm-hallway-overlay';
    overlay.setAttribute('role', 'group');
    overlay.setAttribute('aria-label', 'Spider hallway Nightmare Mode video');

    const video = document.createElement('video');
    video.className = 'nm-glass-video nm-hallway-video';
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.controls = false;
    video.preload = 'auto';
    video.setAttribute('playsinline', '');
    video.setAttribute('aria-hidden', 'true');

    const skip = document.createElement('button');
    skip.className = 'nm-glass-skip';
    skip.type = 'button';
    skip.textContent = 'Skip scare ×';
    skip.setAttribute('aria-label', 'Skip spider hallway video');

    overlay.appendChild(video);
    overlay.appendChild(skip);
    layer.appendChild(overlay);
    layer.setAttribute('aria-hidden', 'false');
    activeGlassVideo = video; // shared media cleanup handles both video events

    function endSpider() {
      if (!enabled || currentKind !== 'spider') return;
      clean();
      schedule(false);
    }

    skip.addEventListener('click', endSpider);
    video.addEventListener('ended', () => after(650, endSpider), { once: true });
    video.addEventListener('error', () => {
      spiderVideoAvailable = false;
      endSpider();
    }, { once: true });

    video.src = 'nightmare-spider-hallway.mp4';
    const playback = video.play();
    if (playback && typeof playback.catch === 'function') {
      playback.catch(() => {
        spiderVideoAvailable = false;
        endSpider();
      });
    }
    // Clean up even if playback stalls on a slow mobile connection.
    after(18500, endSpider);
  }

  function choose() {
    const sinceStart = now() - activatedAt;
    const cursorAllowed = shown >= 3 && sinceStart > 85000 &&
      (lastCursorAt === 0 || now() - lastCursorAt > 155000);
    const dollAllowed = shown >= 1 && sinceStart > 38000 &&
      (lastDollAt === 0 || now() - lastDollAt > 175000);
    const kinds = ['watcher', 'watcher', 'glitch', 'glitch', 'face', 'face'];
    if (cursorAllowed) kinds.push('cursor');
    if (dollAllowed) kinds.push('doll', 'doll');
    // A separate rare video scare; no file download until it actually plays.
    if (spiderVideoAvailable && shown >= 2 && sinceStart > 65000 &&
        (lastSpiderAt === 0 || now() - lastSpiderAt > 5 * 60 * 1000)) {
      kinds.push('spider');
    }
    // Rare long-form scare. Exclude until the MP4 has been uploaded.
    if (glassVideoAvailable && shown >= 3 && sinceStart > 120000 &&
        (lastGlassAt === 0 || now() - lastGlassAt > 8 * 60 * 1000)) {
      kinds.push('glass');
    }
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
    else if (kind === 'doll') { lastDollAt = now(); cursedDoll(); }
    else if (kind === 'glass') { lastGlassAt = now(); behindGlass(); }
    else if (kind === 'spider') { lastSpiderAt = now(); spiderHallway(); }
    else if (kind === 'watcher') watcher();
    else if (kind === 'glitch') glitchMessage();
    else pressedFace();
  }

  function updateControl() {
    toggle.setAttribute('aria-pressed', String(enabled));
    toggle.setAttribute('aria-label', enabled ? 'Turn off Nightmare Mode' : 'Turn on Nightmare Mode with visual jump scares');
    toggle.classList.toggle('is-active', enabled);
    state.textContent = enabled ? 'Turn off nightmare mode' : 'Turn on nightmare mode';
  }
  function setEnabled(nextValue) {
    clean();
    enabled = Boolean(nextValue) && !motion.matches;
    if (enabled) {
      // Warm the small artwork files after opt-in, before the first scare.
      const preload = new Image();
      preload.src = 'nightmare-pressing-faces-atlas.webp';
      const dollPreload = new Image();
      dollPreload.src = 'nightmare-doll.webp';
      activatedAt = now();
      lastCursorAt = 0;
      lastDollAt = 0;
      lastGlassAt = 0;
      lastSpiderAt = 0;
      glassVideoAvailable = false;
      spiderVideoAvailable = false;
      fetch('nightmare-spider-hallway.mp4', { method: 'HEAD', cache: 'no-store' })
        .then(response => {
          const type = response.headers.get('content-type') || '';
          if (enabled && response.ok && !type.includes('text/html')) {
            spiderVideoAvailable = true;
          }
        })
        .catch(() => {});
      // Do not download a large MP4 until it is an available opt-in scare.
      fetch('nightmare-behind-the-glass.mp4', { method: 'HEAD', cache: 'no-store' })
        .then(response => {
          const type = response.headers.get('content-type') || '';
          if (enabled && response.ok && !type.includes('text/html')) {
            glassVideoAvailable = true;
          }
        })
        .catch(() => {});
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
      : 'Optional visual scares including pressing faces, glitch messages, fake cursors, a haunted doll, and occasional spider or glass apparition videos. Press Escape to exit.';
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