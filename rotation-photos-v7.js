/* Eight supplied product photographs. No WebGL, canvas or third-party runtime. */
(() => {
  'use strict';
  const stage = document.getElementById('rotation-stage');
  const picture = document.getElementById('rotation-image');
  const range = document.getElementById('rotation-range');
  const previous = document.getElementById('rotate-previous');
  const next = document.getElementById('rotate-next');
  const position = document.getElementById('rotation-position');
  const help = document.getElementById('rotation-help');
  if (!stage || !picture || !range || !previous || !next) return;
  const urls = Array.from({ length: 8 }, (_, i) => new URL(`./assets/rotation/${String(i + 1).padStart(2, '0')}.webp`, document.baseURI).href);
  const frames = new Map();
  let selected = 1, displayed = 1, request = 0, gesture = null;
  const wrap = n => ((n % urls.length) + urls.length) % urls.length;
  function load(index) {
    if (!frames.has(index)) frames.set(index, new Promise(resolve => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => { frames.delete(index); resolve(null); };
      image.src = urls[index];
    }));
    return frames.get(index);
  }
  function sync() {
    range.value = String(selected);
    range.setAttribute('aria-valuetext', `View ${selected + 1} of 8`);
    if (position) position.textContent = `${selected + 1} / 8`;
  }
  async function show(index) {
    selected = wrap(Math.round(index));
    const id = ++request, target = selected;
    sync();
    const image = await load(target);
    if (id !== request) return;
    if (!image) {
      selected = displayed; sync();
      help.textContent = 'Image unavailable. Please try again.';
      return;
    }
    picture.removeAttribute('srcset');
    picture.removeAttribute('sizes');
    picture.src = urls[target];
    picture.alt = `Fibonacci One, view ${target + 1} of 8`;
    displayed = target;
    stage.dataset.frame = String(target + 1);
    help.textContent = 'Drag to explore 8 views';
  }
  range.min = '0'; range.max = '7'; range.step = '1';
  range.addEventListener('input', () => show(Number(range.value)));
  previous.addEventListener('click', () => show(selected - 1));
  next.addEventListener('click', () => show(selected + 1));
  stage.addEventListener('dragstart', event => event.preventDefault());
  stage.addEventListener('pointerdown', event => {
    if (gesture || event.isPrimary === false || (event.pointerType === 'mouse' && event.button !== 0)) return;
    gesture = { id: event.pointerId, x: event.clientX, y: event.clientY, start: selected, direction: null };
    stage.setPointerCapture(event.pointerId);
  });
  stage.addEventListener('pointermove', event => {
    if (!gesture || event.pointerId !== gesture.id) return;
    const dx = event.clientX - gesture.x, dy = event.clientY - gesture.y;
    if (!gesture.direction && Math.max(Math.abs(dx), Math.abs(dy)) > 6) gesture.direction = Math.abs(dx) > Math.abs(dy) ? 'horizontal' : 'vertical';
    if (gesture.direction !== 'horizontal') return;
    stage.classList.add('is-dragging');
    const distance = Math.max(24, stage.clientWidth / 10);
    const target = wrap(gesture.start + Math.trunc(dx / distance));
    if (target !== selected) show(target);
  });
  function end(event) {
    if (!gesture || event.pointerId !== gesture.id) return;
    const id = gesture.id; gesture = null;
    stage.classList.remove('is-dragging');
    if (stage.hasPointerCapture(id)) stage.releasePointerCapture(id);
  }
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(type => stage.addEventListener(type, end));
  stage.dataset.viewer = 'photos';
  stage.dataset.version = '7';
  picture.removeAttribute('aria-hidden');
  sync();
  // Warm the small photo sequence independently of model loading or observers.
  urls.forEach((_, i) => load(i));
})();
