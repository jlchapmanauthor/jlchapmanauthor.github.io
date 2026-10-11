/* The original author portrait remains unchanged. A temporary canvas adds a wink. */
(() => {
  'use strict';

  const frame = document.getElementById('author-wink-frame');
  const photo = document.getElementById('author-portrait');
  const canvas = document.getElementById('author-wink-canvas');
  if (!frame || !photo || !canvas) return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return;

  let ready = false;
  let cooldownUntil = 0;
  let hideTimer = null;
  let resizeObserver = null;

  function render() {
    if (!photo.complete || !photo.naturalWidth) return;
    const width = Math.max(1, Math.round(photo.clientWidth));
    const height = Math.max(1, Math.round(photo.clientHeight));
    if (!width || !height) return;

    const scale = Math.min(window.devicePixelRatio || 1, 1.7);
    const w = Math.max(1, Math.round(width * scale));
    const h = Math.max(1, Math.round(height * scale));
    canvas.width = w;
    canvas.height = h;

    // Mirror object-fit: cover, keeping the same cropping as the photograph.
    const factor = Math.max(w / photo.naturalWidth, h / photo.naturalHeight);
    const dw = photo.naturalWidth * factor;
    const dh = photo.naturalHeight * factor;
    ctx.drawImage(photo, (w - dw) / 2, (h - dh) / 2, dw, dh);

    // On this portrait, the eye on the viewer's right is about 57% across.
    // Sample adjacent skin and blend it over the open eye into a closed lid.
    const image = ctx.getImageData(0, 0, w, h);
    const original = image.data.slice();
    const out = image.data;
    const cx = w * .584;
    const cy = h * .363;
    const rx = w * .069;
    const ry = h * .029;
    const shift = Math.max(1, Math.round(h * .049));

    const x0 = Math.max(0, Math.floor(cx - rx));
    const x1 = Math.min(w - 1, Math.ceil(cx + rx));
    const y0 = Math.max(0, Math.floor(cy - ry));
    const y1 = Math.min(h - 1, Math.ceil(cy + ry));

    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const distance = Math.sqrt(((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2);
        if (distance >= 1) continue;
        const smooth = Math.max(0, Math.min(1, (1 - distance) / .28));
        const strength = smooth * smooth * (3 - 2 * smooth);
        const srcY = Math.min(h - 1, y + shift);
        const src = (srcY * w + x) * 4;
        const dest = (y * w + x) * 4;
        for (let channel = 0; channel < 3; channel++) {
          out[dest + channel] = Math.round(original[dest + channel] * (1 - strength) +
                                           original[src + channel] * strength);
        }
      }
    }
    ctx.putImageData(image, 0, 0);

    // A small shadow crease sells the wink without changing the rest of the face.
    ctx.save();
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(22, 13, 13, .79)';
    ctx.lineWidth = Math.max(1.3, w * .008);
    ctx.beginPath();
    ctx.moveTo(cx - rx * .78, cy + ry * .10);
    ctx.quadraticCurveTo(cx, cy + ry * .47, cx + rx * .84, cy - ry * .06);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(202, 177, 160, .25)';
    ctx.lineWidth = Math.max(1, w * .0038);
    ctx.beginPath();
    ctx.moveTo(cx - rx * .67, cy - ry * .12);
    ctx.quadraticCurveTo(cx, cy - ry * .40, cx + rx * .67, cy - ry * .17);
    ctx.stroke();
    ctx.restore();
    ready = true;
  }

  function wink() {
    if (!ready || reducedMotion.matches || document.hidden || Date.now() < cooldownUntil) return;
    cooldownUntil = Date.now() + 1150;
    frame.classList.add('is-winking');
    window.clearTimeout(hideTimer);
    hideTimer = window.setTimeout(() => frame.classList.remove('is-winking'), 300);
  }

  if (photo.complete && photo.naturalWidth) render();
  else photo.addEventListener('load', render, { once: true });
  frame.addEventListener('mouseenter', wink);
  frame.addEventListener('focus', wink);
  frame.addEventListener('click', wink);
  if (window.ResizeObserver) {
    resizeObserver = new ResizeObserver(render);
    resizeObserver.observe(photo);
  } else {
    window.addEventListener('resize', render, { passive: true });
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) frame.classList.remove('is-winking');
  });
  window.addEventListener('pagehide', () => {
    window.clearTimeout(hideTimer);
    if (resizeObserver) resizeObserver.disconnect();
  });
})();