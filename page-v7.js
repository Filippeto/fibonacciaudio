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
  const smallScreen = window.matchMedia('(max-width: 600px)');
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
