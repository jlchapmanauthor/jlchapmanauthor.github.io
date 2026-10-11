/*
 * NIGHTMARE MODE
 * Decorative opt-in scares. No autoplay, added sound, flashing strobes,
 * layout shifts, external dependencies, or persistent tracking.
 */
(() => {
  'use strict';

  const toggle = document.getElementById('nightmare-toggle');
  const layer = document.getElementById('nightmare-layer');
  const stateLabel = document.getElementById('nightmare-state');
  if (!toggle || !layer || !stateLabel) return;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let enabled = false;
  let nextTimer = null;
  let removeTimer = null;
  let activeApparition = null;
  let enabledAt = 0;
  let lastMajorScare = 0;
  let eventCount = 0;
  let lastKind = '';

  const eyes = [
    '<svg viewBox="0 0 340 145" role="presentation" focusable="false" xmlns="http://www.w3.org/2000/svg">',
    '<defs><radialGradient id="nmEyeLight"><stop offset="0" stop-color="#fce9c0"/><stop offset=".42" stop-color="#e05239"/><stop offset="1" stop-color="#280302"/></radialGradient>',
    '<radialGradient id="nmEyeVoid"><stop stop-color="#16100f"/><stop offset="1" stop-color="#040303" stop-opacity="0"/></radialGradient></defs>',
    '<ellipse cx="170" cy="78" rx="165" ry="70" fill="url(#nmEyeVoid)"/>',
    '<path d="M29 76 Q83 6 146 74 Q89 114 29 76 M194 74 Q260 5 316 77 Q266 113 194 74" fill="#050303" stroke="#5d1a17" stroke-width="3"/>',
    '<path d="M42 72 Q88 47 135 73 Q91 102 42 72 M206 72 Q256 44 304 75 Q253 105 206 72" fill="#f9c9a0" opacity=".27"/>',
    '<ellipse cx="90" cy="74" rx="24" ry="19" fill="url(#nmEyeLight)"/><ellipse cx="253" cy="74" rx="24" ry="19" fill="url(#nmEyeLight)"/>',
    '<ellipse cx="91" cy="75" rx="7" ry="17" fill="#060101"/><ellipse cx="252" cy="75" rx="7" ry="17" fill="#060101"/>',
    '<path d="M35 64 Q85 24 139 66 M201 65 Q252 23 309 64" fill="none" stroke="#3b0c0a" stroke-width="9" stroke-linecap="round"/>',
    '</svg>'
  ].join('');

  const watcher = [
    '<svg viewBox="0 0 290 460" role="presentation" focusable="false" xmlns="http://www.w3.org/2000/svg">',
    '<defs><linearGradient id="nmRobe" x1="0" y1="0" x2=".8" y2="1"><stop stop-color="#0a0808"/><stop offset=".6" stop-color="#191112"/><stop offset="1" stop-color="#020203"/></linearGradient>',
    '<radialGradient id="nmSkull"><stop stop-color="#978a82"/><stop offset=".52" stop-color="#4e4140"/><stop offset="1" stop-color="#0c0808"/></radialGradient></defs>',
    '<path d="M146 13 C62 2 18 109 32 212 C-6 295 2 386 0 460 L290 460 C260 365 281 301 244 211 C266 108 220 17 146 13Z" fill="url(#nmRobe)"/>',
    '<path d="M64 138 C57 60 103 38 150 47 C207 51 224 98 215 153 L206 241 Q145 281 76 232Z" fill="#050405"/>',
    '<path d="M86 113 Q142 72 205 115 L200 204 Q155 259 101 214 Q80 178 86 113Z" fill="url(#nmSkull)" opacity=".95"/>',
    '<path d="M100 148 Q122 127 145 154 Q128 173 107 170Z M158 153 Q181 129 204 150 Q191 172 164 170Z" fill="#030304"/>',
    '<path d="M116 160 L131 162 M175 162 L190 158" stroke="#c6251b" stroke-width="5" stroke-linecap="round"/>',
    '<path d="M150 169 L142 193 L157 200" stroke="#231818" stroke-width="8" fill="none"/>',
    '<path d="M113 218 Q151 200 188 216 Q166 260 127 247Z" fill="#0b0103" stroke="#4f2422" stroke-width="3"/>',
    '<path d="M126 219 L134 231 L143 219 L150 230 L160 220 L168 229 L177 217" stroke="#cab7a3" stroke-width="4" fill="none"/>',
    '<path d="M93 97 L115 125 L104 147 M183 89 L170 123 L193 139 M95 185 L126 205" fill="none" stroke="#180c0a" stroke-width="4"/>',
    '<path d="M48 205 Q7 287 8 460 L90 460 Q92 333 111 289 M238 204 Q281 300 281 460 L199 460 Q194 348 177 290" fill="none" stroke="#241618" stroke-width="7"/>',
    '<path d="M62 330 Q143 280 234 328" stroke="#612322" opacity=".24" fill="none" stroke-width="5"/>',
    '</svg>'
  ].join('');

  const hand = [
    '<svg viewBox="0 0 320 360" role="presentation" focusable="false" xmlns="http://www.w3.org/2000/svg">',
    '<defs><linearGradient id="nmSkin" x1=".1" y1="0" x2=".9" y2="1"><stop stop-color="#74615c"/><stop offset=".48" stop-color="#282020"/><stop offset="1" stop-color="#0b0809"/></linearGradient></defs>',
    '<path d="M126 360 Q128 305 118 279 Q97 250 78 220 Q64 201 50 193 Q35 188 32 203 Q42 223 70 261 L82 294 L43 276 Q23 264 16 280 Q18 302 69 329 L102 360Z" fill="#191114"/>',
    '<path d="M126 360 C113 320 113 287 109 257 L82 125 Q76 91 89 86 Q104 85 109 122 L136 205 L132 53 Q133 17 150 19 Q165 20 164 57 L166 202 L184 40 Q187 7 201 12 Q216 18 208 52 L192 208 L229 84 Q238 56 252 68 Q267 76 256 101 L219 240 Q250 204 269 195 Q287 192 290 208 Q292 220 274 238 L229 288 Q209 318 214 360Z" fill="url(#nmSkin)" stroke="#453533" stroke-width="5"/>',
    '<path d="M149 68 L148 177 M199 61 L179 176 M248 111 L215 218 M107 153 L127 219 M130 276 Q157 244 207 269" stroke="#b39a88" stroke-width="3" opacity=".26" fill="none"/>',
    '<path d="M132 36 Q146 -11 158 35 M185 28 Q200 -14 215 28 M81 105 Q86 75 97 91 M248 81 Q256 48 270 79" fill="#0d090a" stroke="#8c706b" stroke-width="3"/>',
    '<path d="M146 230 L136 244 L154 258 M190 255 L180 272 L198 291 M159 304 L178 316" fill="none" stroke="#6c1818" stroke-width="4" opacity=".55"/>',
    '</svg>'
  ].join('');

  const face = [
    '<svg viewBox="0 0 530 680" role="presentation" focusable="false" xmlns="http://www.w3.org/2000/svg">',
    '<defs><radialGradient id="nmFullFace" cx=".48" cy=".37" r=".64"><stop stop-color="#cec5b7"/><stop offset=".40" stop-color="#74645e"/><stop offset=".82" stop-color="#302727"/><stop offset="1" stop-color="#0b0607"/></radialGradient>',
    '<radialGradient id="nmFullBackdrop"><stop stop-color="#5a100e" stop-opacity=".65"/><stop offset="1" stop-color="#080303" stop-opacity="0"/></radialGradient></defs>',
    '<ellipse cx="265" cy="335" rx="260" ry="334" fill="url(#nmFullBackdrop)"/>',
    '<path d="M263 24 Q105 20 73 180 L58 312 Q43 444 132 545 L194 651 L340 651 L416 540 Q497 426 471 296 L448 173 Q410 28 263 24Z" fill="#0c0809" stroke="#3a1818" stroke-width="5"/>',
    '<path d="M263 78 Q143 70 118 194 L111 361 Q117 470 178 524 L239 603 L300 597 L358 519 Q429 447 423 343 L415 197 Q398 76 263 78Z" fill="url(#nmFullFace)"/>',
    '<path d="M114 232 Q174 169 228 220 L221 284 Q171 326 118 285Z M304 216 Q361 168 422 236 L414 290 Q359 325 307 279Z" fill="#0a0304" stroke="#492021" stroke-width="6"/>',
    '<ellipse cx="172" cy="262" rx="18" ry="13" fill="#d34131"/><ellipse cx="365" cy="258" rx="18" ry="13" fill="#d34131"/>',
    '<ellipse cx="173" cy="260" rx="7" ry="12" fill="#120304"/><ellipse cx="366" cy="260" rx="7" ry="12" fill="#120304"/>',
    '<path d="M264 259 L225 386 Q264 411 302 389Z" fill="#2b1414"/>',
    '<path d="M184 444 Q266 399 351 446 Q395 513 328 577 Q268 627 200 568 Q142 513 184 444Z" fill="#090103" stroke="#681f1c" stroke-width="8"/>',
    '<path d="M180 445 L209 478 L226 442 L246 480 L264 436 L282 478 L302 443 L322 480 L351 448 M194 563 L218 532 L236 573 L256 533 L276 574 L298 532 L321 562" stroke="#f1e5cf" stroke-width="10" fill="none" stroke-linecap="round"/>',
    '<path d="M270 466 Q255 514 272 556" stroke="#721312" stroke-width="10" fill="none"/>',
    '<path d="M123 173 L151 198 L137 212 L169 242 M409 182 L376 221 L401 259 M137 378 L176 397 L162 436 M369 382 L341 421" stroke="#261010" stroke-width="9" fill="none"/>',
    '<path d="M139 123 L180 157 L166 183 M391 121 L360 162 L384 198 M223 105 L241 159 M314 129 L291 191 M203 580 L190 615" stroke="#9c7771" stroke-width="3" opacity=".65" fill="none"/>',
    '<path d="M129 510 L147 537 L137 557 M385 497 L365 533 L382 552" stroke="#861c19" stroke-width="8" fill="none"/>',
    '</svg>'
  ].join('');

  function between(min, max) {
    return Math.round(min + Math.random() * (max - min));
  }

  function clearApparition() {
    window.clearTimeout(removeTimer);
    removeTimer = null;
    if (activeApparition) activeApparition.remove();
    activeApparition = null;
  }

  function cancelPending() {
    window.clearTimeout(nextTimer);
    nextTimer = null;
    clearApparition();
  }

  function schedule(isFirst) {
    window.clearTimeout(nextTimer);
    if (!enabled || prefersReducedMotion.matches || document.hidden) return;
    // Scares are occasional, never rapid-fire.
    nextTimer = window.setTimeout(showScare, isFirst ? between(10000, 17000) : between(21000, 48000));
  }

  function pickKind() {
    const now = Date.now();
    const majorAllowed = eventCount >= 4 && now - enabledAt >= 110000 &&
      (lastMajorScare === 0 || now - lastMajorScare >= 210000);
    if (majorAllowed && Math.random() < 0.24) {
      lastMajorScare = now;
      return 'face';
    }

    const options = ['eyes', 'eyes', 'watcher', 'watcher', 'hand', 'glitch'];
    let choice = options[between(0, options.length - 1)];
    if (choice === lastKind) {
      choice = options.filter(kind => kind !== lastKind)[between(0, options.length - 3)];
    }
    return choice;
  }

  function showScare() {
    if (!enabled || document.hidden || prefersReducedMotion.matches) return;
    clearApparition();

    const kind = pickKind();
    lastKind = kind;
    eventCount += 1;

    const sighting = document.createElement('div');
    sighting.className = 'nm-apparition nm-' + kind;
    sighting.setAttribute('aria-hidden', 'true');

    if (kind === 'eyes') {
      sighting.innerHTML = eyes;
      sighting.style.top = between(17, 77) + '%';
      sighting.style.left = between(2, 69) + '%';
    } else if (kind === 'watcher') {
      sighting.innerHTML = watcher;
      sighting.classList.add(Math.random() < 0.5 ? 'nm-from-left' : 'nm-from-right');
      sighting.style.top = between(22, 49) + '%';
    } else if (kind === 'hand') {
      sighting.innerHTML = hand;
      sighting.style.left = between(3, 65) + '%';
    } else if (kind === 'glitch') {
      sighting.innerHTML = '<span>IT IS STILL HERE</span>';
      sighting.style.top = between(24, 75) + '%';
    } else {
      sighting.innerHTML = '<div class="nm-full-backdrop"></div><div class="nm-full-art">' +
        face + '</div><div class="nm-full-words">DON\'T LOOK AWAY</div>';
    }

    layer.appendChild(sighting);
    activeApparition = sighting;

    // Remove the decorative element as soon as its short appearance ends.
    const lifetime = kind === 'face' ? 1650 : kind === 'glitch' ? 1200 : between(2400, 3200);
    removeTimer = window.setTimeout(clearApparition, lifetime);
    schedule(false);
  }

  function refreshControl() {
    toggle.setAttribute('aria-pressed', String(enabled));
    toggle.setAttribute('aria-label', enabled ? 'Turn off Nightmare Mode' : 'Turn on Nightmare Mode with optional visual scares');
    stateLabel.textContent = enabled ? 'On' : 'Off';
    toggle.classList.toggle('is-active', enabled);
  }

  function setEnabled(next) {
    if (next && prefersReducedMotion.matches) return;
    cancelPending();
    enabled = Boolean(next);
    if (enabled) {
      enabledAt = Date.now();
      lastMajorScare = 0;
      eventCount = 0;
      lastKind = '';
      schedule(true);
    }
    refreshControl();
  }

  function handleMotionChange() {
    if (prefersReducedMotion.matches) setEnabled(false);
    toggle.disabled = prefersReducedMotion.matches;
    toggle.title = prefersReducedMotion.matches
      ? 'Nightmare Mode is unavailable while reduced motion is enabled'
      : 'Optional randomized horror visuals, including rare full-screen scares. Click to toggle.';
  }

  toggle.addEventListener('click', () => setEnabled(!enabled));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && enabled) setEnabled(false);
  });
  document.addEventListener('visibilitychange', () => {
    if (!enabled) return;
    cancelPending();
    if (!document.hidden) schedule(true);
  });
  window.addEventListener('pagehide', cancelPending);
  if (typeof prefersReducedMotion.addEventListener === 'function') {
    prefersReducedMotion.addEventListener('change', handleMotionChange);
  } else if (typeof prefersReducedMotion.addListener === 'function') {
    prefersReducedMotion.addListener(handleMotionChange);
  }

  refreshControl();
  handleMotionChange();
})();