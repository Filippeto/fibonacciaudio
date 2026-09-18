(() => {
  'use strict';
  const config = window.FIBONACCI_CONFIG || {};
  const phone = String(config.whatsappNumber || '').replace(/\D/g, '');
  const contact = document.getElementById('whatsapp-link');
  if (/^[1-9]\d{7,14}$/.test(phone)) {
    contact.href = `https://wa.me/${phone}?text=${encodeURIComponent(config.whatsappMessage || 'Hello! I’m interested in Fibonacci One.')}`;
    contact.target = '_blank';
    contact.rel = 'noopener noreferrer';
    contact.removeAttribute('aria-disabled');
    contact.removeAttribute('aria-describedby');
    document.getElementById('contact-status').hidden = true;
  }
  const safeUrl = value => {
    try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) ? url.href : null; }
    catch { return null; }
  };
  const secondProductUrl = safeUrl(config.fibonacciTwoUrl);
  if (secondProductUrl) {
    const oldItem = document.querySelector('.future-product');
    const link = document.createElement('a');
    link.href = secondProductUrl;
    link.textContent = 'FIBONACCI Two';
    link.className = 'future-product';
    oldItem.replaceWith(link);
  }
  const socials = document.getElementById('social-links');
  for (const [key, label] of [['facebook', 'Facebook'], ['instagram', 'Instagram']]) {
    const url = safeUrl(config.socialLinks?.[key]);
    if (!url) continue;
    const link = document.createElement('a');
    link.href = url; link.textContent = label; link.target = '_blank'; link.rel = 'noopener noreferrer';
    socials.append(link); socials.hidden = false;
  }
  const stage = document.getElementById('rotation-stage');
  const picture = document.getElementById('rotation-image');
  const range = document.getElementById('rotation-range');
  const smallScreen = window.matchMedia('(max-width: 600px)');
  const lightFrames = smallScreen.matches && (window.devicePixelRatio || 1) < 1.6;
  const urls = Array.from({ length: 8 }, (_, i) => `./assets/rotation/${String(i + 1).padStart(2, '0')}${lightFrames ? '-480' : ''}.webp`);
  let frame = 1, desiredFrame = 1, pointer = null, startX = 0, startY = 0, startFrame = 1, gesture = null;
  const cache = new Map();
  function loadFrame(index) {
    if (!cache.has(index)) {
      cache.set(index, new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image); image.onerror = reject; image.src = urls[index];
      }).catch(() => { cache.delete(index); return null; }));
    }
    return cache.get(index);
  }
  async function showFrame(index) {
    desiredFrame = (index + urls.length * 1000) % urls.length;
    const requested = desiredFrame;
    const loaded = await loadFrame(requested);
    if (!loaded || requested !== desiredFrame) return;
    frame = requested;
    picture.removeAttribute('srcset');
    picture.src = urls[frame]; picture.alt = `Fibonacci One, view ${frame + 1} of 8`;
    range.value = String(frame); range.setAttribute('aria-valuetext', `View ${frame + 1} of 8`);
  }
  function preload() { urls.forEach((_, index) => loadFrame(index)); }
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { preload(); observer.disconnect(); }
    }, { rootMargin: '300px' });
    observer.observe(stage);
  } else preload();
  range.addEventListener('input', () => showFrame(Number(range.value)));
  document.getElementById('rotate-previous').addEventListener('click', () => showFrame(desiredFrame - 1));
  document.getElementById('rotate-next').addEventListener('click', () => showFrame(desiredFrame + 1));
  stage.addEventListener('pointerdown', event => {
    if (!event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) return;
    pointer = event.pointerId; startX = event.clientX; startY = event.clientY; startFrame = frame; gesture = null;
    stage.setPointerCapture(pointer); preload();
  });
  stage.addEventListener('pointermove', event => {
    if (event.pointerId !== pointer) return;
    const dx = event.clientX - startX, dy = event.clientY - startY;
    if (!gesture && Math.max(Math.abs(dx), Math.abs(dy)) > 8) gesture = Math.abs(dx) >= Math.abs(dy) ? 'rotate' : 'scroll';
    if (gesture !== 'rotate') return;
    stage.classList.add('is-dragging');
    showFrame(startFrame + Math.round(dx / Math.max(24, stage.clientWidth / 10)));
  });
  function stopDragging(event) {
    if (event.pointerId !== pointer) return;
    pointer = null; gesture = null; stage.classList.remove('is-dragging');
  }
  stage.addEventListener('pointerup', stopDragging);
  stage.addEventListener('pointercancel', stopDragging);
  stage.addEventListener('lostpointercapture', stopDragging);

  // Content stays visible without JavaScript or animation support.
  const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
  const root = document.documentElement;
  const entrances = new Set();
  function motionEnabled() { return !motionPreference.matches && !document.hidden; }
  function syncMotion() {
    root.dataset.motion = motionEnabled() ? 'running' : 'paused';
    if (!motionEnabled()) {
      entrances.forEach(animation => animation.cancel());
      entrances.clear();
    }
  }
  motionPreference.addEventListener('change', syncMotion);
  document.addEventListener('visibilitychange', syncMotion);
  syncMotion();

  if ('IntersectionObserver' in window) {
    const sectionObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => entry.target.classList.toggle('is-motion-visible', entry.isIntersecting));
    }, { threshold: 0 });
    document.querySelectorAll('.overview, .design, .contact').forEach(section => sectionObserver.observe(section));

    // A bounded queue per section creates a reading sequence without long waits.
    const nextEntrance = new WeakMap();
    const revealSelector = '.rotation-stage, h2, h3, .hero-copy p, .indented, .rotation-copy, .kit-intro, .contact-copy > p, .contact-copy .ruled-list, .lifestyle-copy .ruled-list, .kit-contents, .features li, .photo-frame, .overview-product, .product-wordmark';
    const revealObserver = new IntersectionObserver(entries => {
      const visible = entries.filter(entry => entry.isIntersecting).sort((a, b) => {
        const aRect = a.target.getBoundingClientRect(), bRect = b.target.getBoundingClientRect();
        return Math.abs(aRect.top - bRect.top) > 32 ? aRect.top - bRect.top : aRect.left - bRect.left;
      });
      visible.forEach(entry => {
        const element = entry.target;
        revealObserver.unobserve(element);
        if (!motionEnabled() || typeof element.animate !== 'function') return;
        const isImage = element.matches('.rotation-stage, .photo-frame, .overview-product');
        const image = isImage ? element.querySelector('img') : null;
        const playEntrance = () => {
          const rect = element.getBoundingClientRect();
          if (!motionEnabled() || rect.bottom <= 0 || rect.top >= window.innerHeight) return;
          const section = element.closest('.features, .detail-grid, .lifestyle-gallery') || element.closest('section');
          const now = performance.now();
          const mobile = smallScreen.matches;
          const scheduled = Math.min(Math.max(now, nextEntrance.get(section) || now), now + (mobile ? 500 : 750));
          nextEntrance.set(section, scheduled + (mobile ? 100 : 150));
          const animation = element.animate([
            { opacity: 0, translate: `0 ${mobile ? 7 : (isImage ? 14 : 10)}px` },
            { opacity: 1, translate: '0 0' }
          ], { duration: mobile ? 900 : 1200, delay: scheduled - now, easing: 'cubic-bezier(.22,.61,.36,1)', fill: 'backwards' });
          entrances.add(animation);
          animation.finished.then(() => entrances.delete(animation)).catch(() => entrances.delete(animation));
        };
        if (image && !image.complete) image.addEventListener('load', playEntrance, { once: true });
        else playEntrance();
      });
    }, { threshold: .08 });
    document.querySelectorAll(revealSelector).forEach(element => revealObserver.observe(element));
  }
})();
