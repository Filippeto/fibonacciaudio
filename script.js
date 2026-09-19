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
  const reduceRotation = window.matchMedia('(prefers-reduced-motion: reduce)');
  const lightFrames = smallScreen.matches && (window.devicePixelRatio || 1) < 1.6;
  const urls = Array.from({ length: 8 }, (_, i) => `./assets/rotation/${String(i + 1).padStart(2, '0')}${lightFrames ? '-480' : ''}.webp`);
  const normalize = value => ((value % 360) + 360) % 360;
  const imageCache = new Map();
  let viewer = null, initStarted = false, fallback = false;
  let targetAngle = 24, pointer = null, startX = 0, startY = 0, startAngle = 24, gesture = null;
  let lastX = 0, lastTime = 0, velocity = 0, lastFallback = -1, fade = null;
  function frameImage(index) {
    if (!imageCache.has(index)) imageCache.set(index, new Promise(resolve=>{
      const image = new Image(); image.onload=()=>resolve(image);image.onerror=()=>resolve(null);image.src=urls[index];
    }));
    return imageCache.get(index);
  }
  async function showFallback() {
    const frame = Math.round(normalize(targetAngle)/45)%8;
    const image = await frameImage(frame);
    if (!image || frame !== Math.round(normalize(targetAngle)/45)%8 || lastFallback === frame) return;
    lastFallback=frame;
    picture.removeAttribute('srcset');picture.src=urls[frame];picture.alt=`Fibonacci One, view ${frame+1} of 8`;
    if (!reduceRotation.matches) {fade?.cancel();fade=picture.animate([{opacity:.78},{opacity:1}],{duration:160,easing:'ease-out'});}
  }
  function syncAngle(updateRange=true) {
    const value = Math.round(normalize(targetAngle));
    if (updateRange) range.value=String(value);
    range.setAttribute('aria-valuetext',`Rotation: ${value} degrees`);
    if (viewer) viewer.setAngle(targetAngle);
    else if (fallback) showFallback();
  }
  function enableFallback() {
    viewer?.dispose();viewer=null;fallback=true;stage.dataset.viewer='photos';
    picture.removeAttribute('aria-hidden');
    document.getElementById('rotation-help').textContent='Drag to explore 8 views';
    urls.forEach((_,i)=>frameImage(i));showFallback();
  }
  function loadViewer() {
    if (initStarted) return;
    initStarted=true;
    const script=document.createElement('script');
    script.src='./assets/vendor/viewer-3d.js';script.async=true;
    script.onload=async()=>{
      try {
        viewer=await window.createFibonacci3D(stage);
        viewer.setAngle(targetAngle,true);
        picture.setAttribute('aria-hidden','true');
        stage.setAttribute('aria-label','Interactive 3D speaker view');
      } catch {enableFallback();}
    };
    script.onerror=enableFallback;
    document.head.append(script);
  }
  if ('IntersectionObserver' in window) {
    const loader=new IntersectionObserver(entries=>{
      if(entries.some(entry=>entry.isIntersecting)){loadViewer();loader.disconnect();}
    },{rootMargin:'450px'});loader.observe(stage);
  } else loadViewer();
  stage.addEventListener('viewer-lost',enableFallback);
  range.addEventListener('input',()=>{
    targetAngle=Number(range.value);syncAngle(false);loadViewer();
  });
  document.getElementById('rotate-previous').addEventListener('click',()=>{targetAngle-=fallback?45:15;syncAngle();loadViewer();});
  document.getElementById('rotate-next').addEventListener('click',()=>{targetAngle+=fallback?45:15;syncAngle();loadViewer();});
  stage.addEventListener('pointerdown',event=>{
    if(!event.isPrimary || (event.pointerType==='mouse' && event.button!==0))return;
    pointer=event.pointerId;startX=lastX=event.clientX;startY=event.clientY;
    startAngle=targetAngle=viewer ? viewer.getAngle() : targetAngle;
    velocity=0;lastTime=performance.now();gesture=null;
    stage.setPointerCapture(pointer);loadViewer();
  });
  stage.addEventListener('pointermove',event=>{
    if(event.pointerId!==pointer)return;
    const dx=event.clientX-startX,dy=event.clientY-startY;
    if(!gesture && Math.max(Math.abs(dx),Math.abs(dy))>8)gesture=Math.abs(dx)>Math.abs(dy)?'rotate':'scroll';
    if(gesture!=='rotate')return;
    stage.classList.add('is-dragging');
    const now=performance.now(),sensitivity=180/Math.max(stage.clientWidth,260);
    const elapsed=Math.max(8,now-lastTime);
    velocity=.65*velocity+.35*(event.clientX-lastX)*sensitivity/elapsed;
    lastX=event.clientX;lastTime=now;
    targetAngle=startAngle+dx*sensitivity;syncAngle();
  });
  function stopDragging(event) {
    if(event.pointerId!==pointer)return;
    if(gesture==='rotate' && event.type==='pointerup' && !reduceRotation.matches && performance.now()-lastTime<90){
      targetAngle+=Math.max(-12,Math.min(12,velocity*60));syncAngle();
    }
    pointer=null;gesture=null;velocity=0;stage.classList.remove('is-dragging');
  }
  stage.addEventListener('pointerup',stopDragging);
  stage.addEventListener('pointercancel',stopDragging);
  stage.addEventListener('lostpointercapture',stopDragging);

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
