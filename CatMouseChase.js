'use strict';

// Card measurements drive the route. Adjust these four values to tune the gag.
const CHASE = {
  enabled: true,
  storySeconds: 13.2,
  catDelaySeconds: 0.75,
  sizeRatio: 0.055,
  pauseSeconds: [0.45, 0.95]
};

const chaseSection = document.querySelector('#services');
const chaseCards = [...chaseSection.querySelectorAll('.service-card')];
const chaseBehind = document.querySelector('#chaseBehind');
const chaseOver = document.querySelector('#chaseOver');
const chaseReducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

const mouseArt = `<svg viewBox="0 0 100 100" aria-hidden="true">
  <g class="chase-tail"><path d="M23 70C4 69 2 87 18 90" fill="none" stroke="#e9859a" stroke-width="7" stroke-linecap="round"/></g>
  <g class="chase-back-legs"><path d="M32 77 25 91m37-13 6 14" stroke="#26333a" stroke-width="7" stroke-linecap="round"/></g>
  <g class="chase-body"><ellipse cx="51" cy="67" rx="32" ry="23" fill="#a9b8bf" stroke="#26333a" stroke-width="4"/></g>
  <g class="chase-front-legs"><path d="M70 70 82 83m-19-9 4 13" stroke="#26333a" stroke-width="7" stroke-linecap="round"/></g>
  <g class="chase-ears"><circle cx="38" cy="27" r="17" fill="#b7c5cb" stroke="#26333a" stroke-width="4"/><circle cx="38" cy="27" r="10" fill="#f3a5ad"/><circle cx="69" cy="25" r="18" fill="#b7c5cb" stroke="#26333a" stroke-width="4"/><circle cx="69" cy="25" r="11" fill="#f3a5ad"/></g>
  <g class="chase-head"><ellipse cx="54" cy="51" rx="31" ry="27" fill="#cbd5d8" stroke="#26333a" stroke-width="4"/><ellipse cx="46" cy="46" rx="8" ry="11" fill="#fff" stroke="#26333a" stroke-width="2.5"/><ellipse cx="67" cy="46" rx="8" ry="11" fill="#fff" stroke="#26333a" stroke-width="2.5"/><circle cx="49" cy="47" r="3.5" fill="#26333a"/><circle cx="70" cy="47" r="3.5" fill="#26333a"/><circle cx="82" cy="60" r="5" fill="#ee8e9d" stroke="#26333a" stroke-width="2"/><path d="M78 66q-8 7-16 0M27 59l-14-3m15 9-15 3" fill="none" stroke="#26333a" stroke-width="2.5" stroke-linecap="round"/><path class="mouse-tongue" d="M68 69q8 15 16 3" fill="#f49aa4" stroke="#26333a" stroke-width="2"/></g>
  <g class="mouse-sweat" fill="#7fd6e2" stroke="#26333a" stroke-width="2"><path d="M27 31q-7 10-2 13 8 1 2-13Z"/><path d="M17 43q-6 9-1 12 7 0 1-12Z"/></g>
</svg>`;

const catArt = `<svg viewBox="0 0 110 105" aria-hidden="true">
  <g class="chase-tail"><path d="M25 76C4 72 3 48 18 40" fill="none" stroke="#26333a" stroke-width="12" stroke-linecap="round"/><path d="M25 76C4 72 3 48 18 40" fill="none" stroke="#efa45d" stroke-width="7" stroke-linecap="round"/></g>
  <g class="chase-back-legs"><path d="M34 82 30 100m49-17 4 17" stroke="#26333a" stroke-width="8" stroke-linecap="round"/></g>
  <g class="chase-body"><ellipse cx="57" cy="72" rx="38" ry="26" fill="#efa45d" stroke="#26333a" stroke-width="4"/><path d="M45 91q11 7 24 0" fill="none" stroke="#f9d5a5" stroke-width="7" stroke-linecap="round"/></g>
  <g class="chase-front-legs"><path d="M75 76 92 92m-27-8 2 15" stroke="#26333a" stroke-width="9" stroke-linecap="round"/></g>
  <g class="chase-ears"><path d="M27 43 27 13l23 15 19-8 20 23" fill="#efa45d" stroke="#26333a" stroke-width="4" stroke-linejoin="round"/><path d="m31 23 11 8m39 1-10 2" stroke="#f8c3a1" stroke-width="6" stroke-linecap="round"/></g>
  <g class="chase-head"><ellipse cx="57" cy="54" rx="34" ry="29" fill="#f5b77b" stroke="#26333a" stroke-width="4"/><ellipse cx="45" cy="48" rx="8" ry="10" fill="#fff"/><ellipse cx="70" cy="48" rx="8" ry="10" fill="#fff"/><circle cx="48" cy="49" r="4" fill="#26333a"/><circle cx="73" cy="49" r="4" fill="#26333a"/><path d="m38 38 13 3m14 0 13-5" fill="none" stroke="#26333a" stroke-width="4" stroke-linecap="round"/><path d="m52 62 5 4 5-4m-5 4v5m0 0q-8 7-13 0m13 0q8 7 13 0" fill="none" stroke="#26333a" stroke-width="2.7" stroke-linecap="round" stroke-linejoin="round"/><path d="M30 65 14 61m17 10-16 5m68-11 16-4m-17 10 17 5" stroke="#26333a" stroke-width="2.2" stroke-linecap="round"/></g>
</svg>`;

function makeChaseCharacter(kind, art) {
  const element = document.createElement('div');
  element.className = `chase-character chase-${kind} is-peek`;
  element.innerHTML = `${art}<span class="chase-speed" aria-hidden="true"></span><span class="chase-dust" aria-hidden="true"></span><span class="chase-exclaim" aria-hidden="true">!</span><span class="chase-stars" aria-hidden="true">✦ ✳</span>`;
  chaseBehind.appendChild(element);
  return element;
}

if (chaseSection && chaseCards.length === 4 && CHASE.enabled) {
  const mouse = makeChaseCharacter('mouse', mouseArt);
  const cat = makeChaseCharacter('cat', catArt);
  let route;
  let active = false;
  let raf = 0;
  let elapsed = 0;
  let previousTime = 0;
  let loopNumber = 0;
  let pause = CHASE.pauseSeconds[0];
  let reverse = false;

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const lerp = (start, end, t) => start + (end - start) * t;
  const ease = t => t * t * (3 - 2 * t);
  const point = (x, y) => ({x, y});
  const move = (from, to, t) => point(lerp(from.x, to.x, t), lerp(from.y, to.y, t));

  function measureCards() {
    const sectionBox = chaseSection.getBoundingClientRect();
    const boxes = chaseCards.map(card => {
      const box = card.getBoundingClientRect();
      return {left: box.left - sectionBox.left, right: box.right - sectionBox.left, top: box.top - sectionBox.top, bottom: box.bottom - sectionBox.top, width: box.width, height: box.height};
    });
    const size = clamp(sectionBox.width * CHASE.sizeRatio, 40, 70);
    chaseSection.style.setProperty('--chase-size', `${size}px`);
    const ordered = reverse ? [...boxes].reverse() : boxes;
    const [first, second, third, last] = ordered;
    const direction = reverse ? -1 : 1;
    const vertical = Math.abs(second.top - first.top) > first.height * .35;
    const entry = card => reverse ? card.right - size * .9 : card.left + size * .12;
    const exit = card => reverse ? card.left - size * .25 : card.right - size * .75;
    const top = card => card.top - size * .46;
    route = {
      size, direction, vertical,
      a: point(entry(first), top(first)),
      b: point(exit(first), vertical ? first.bottom - size * .8 : top(first)),
      c: point(exit(second), top(second)),
      d: point(entry(third), top(third)),
      e: point(exit(third), top(third)),
      f: point(vertical ? exit(last) : last.right + direction * size, vertical ? last.bottom - size * .65 : top(last)),
      targetOne: second, targetTwo: third
    };
  }

  function segment(time, start, end) { return clamp((time - start) / (end - start), 0, 1); }
  function jump(from, to, time, start, end, height) {
    const t = segment(time, start, end);
    const p = move(from, to, ease(t));
    p.y -= Math.sin(Math.PI * t) * height;
    // On stacked cards, wait until the jumper reaches the next card's top.
    // This keeps the foreground sprite away from the previous card's text.
    const targetTop = to.y + route.size * .46;
    const front = route.vertical
      ? t > .55 && t < .97 && p.y > targetTop - route.size * .6
      : t > .09 && t < .91;
    return { ...p, mode: t > .88 ? 'land' : 'jump', front, angle: lerp(-8, 8, t) };
  }

  function pose(time, isCat) {
    const r = route;
    const size = r.size;
    if (time < 0 || time >= CHASE.storySeconds) return {visible: false};
    if (time < .82) return {...r.a, mode: 'peek', front: false, angle: Math.sin(time * 9) * 7};
    if (time < 1.25) return {...r.a, mode: 'anticipate', front: false, angle: -10};
    if (time < 2.5) return {...move(r.a, r.b, segment(time, 1.25, 2.5)), mode: 'run', front: false};
    if (time < 4.25) return jump(r.b, r.c, time, 2.5, 4.25, size * (r.vertical ? .35 : .28));
    if (time < 5.2) return {...move(r.c, r.d, segment(time, 4.25, 5.2)), mode: 'run', front: false};
    if (time < 6.9) return jump(r.d, r.e, time, 5.2, 6.9, size * (r.vertical ? .35 : .28));
    if (time < 8.6) {
      if (isCat) {
        const skid = segment(time, 6.9, 7.55);
        return {...move(r.e, point(r.e.x - r.direction * size * .85, r.e.y + size * .25), ease(skid)), mode: time < 7.5 ? 'fail' : 'dizzy', front: true, angle: time < 7.5 ? -27 : Math.sin(time * 16) * 8};
      }
      return {...r.e, mode: 'reaction', front: true, angle: -8};
    }
    if (time < 10.7) {
      const start = isCat ? point(r.e.x - r.direction * size * .85, r.e.y + size * .25) : r.e;
      return {...move(start, r.f, segment(time, 8.6, 10.7)), mode: 'run', front: false};
    }
    if (time < 12.2) {
      const escape = point(r.f.x + r.direction * size * 2, r.vertical ? r.f.y + size * 1.1 : r.f.y);
      return {...move(r.f, escape, segment(time, 10.7, 12.2)), mode: 'run', front: false};
    }
    return {visible: false};
  }

  function draw(character, time, isCat) {
    const p = pose(time, isCat);
    if (p.visible === false) { character.style.opacity = '0'; return; }
    character.style.opacity = '1';
    const layer = p.front ? chaseOver : chaseBehind;
    if (character.parentElement !== layer) layer.appendChild(character);
    const facing = p.mode === 'reaction' ? -route.direction : route.direction;
    character.style.transform = `translate3d(${p.x.toFixed(1)}px,${p.y.toFixed(1)}px,0) scaleX(${facing}) rotate(${(p.angle || 0).toFixed(1)}deg)`;
    const mode = `is-${p.mode}`;
    if (!character.classList.contains(mode)) {
      character.className = `chase-character chase-${isCat ? 'cat' : 'mouse'} ${mode}`;
    }
  }

  function frame(now) {
    if (!active) return;
    elapsed += Math.min(now - previousTime, 50) / 1000;
    previousTime = now;
    const cycle = CHASE.storySeconds + CHASE.catDelaySeconds + pause;
    if (elapsed >= cycle) {
      elapsed -= cycle;
      loopNumber++;
      reverse = loopNumber % 3 === 2;
      pause = lerp(CHASE.pauseSeconds[0], CHASE.pauseSeconds[1], Math.random());
      measureCards();
    }
    draw(mouse, elapsed, false);
    draw(cat, elapsed - CHASE.catDelaySeconds, true);
    raf = requestAnimationFrame(frame);
  }

  function setActive(value) {
    if (value === active) return;
    active = value;
    chaseSection.classList.toggle('chase-playing', active);
    if (active) { previousTime = performance.now(); raf = requestAnimationFrame(frame); }
    else cancelAnimationFrame(raf);
  }

  measureCards();
  if (chaseReducedMotion.matches) {
    mouse.style.opacity = '1';
    cat.style.opacity = '1';
    mouse.style.transform = `translate3d(${route.a.x}px,${route.a.y}px,0)`;
    cat.style.transform = `translate3d(${route.a.x + route.size * 1.2}px,${route.a.y}px,0)`;
  } else {
    const observer = new IntersectionObserver(entries => {
      setActive(entries[0].isIntersecting && !document.hidden);
    }, {threshold: .08});
    observer.observe(chaseSection);
    document.addEventListener('visibilitychange', () => setActive(!document.hidden && chaseSection.getBoundingClientRect().bottom > 0 && chaseSection.getBoundingClientRect().top < innerHeight));
  }
  if ('ResizeObserver' in window) {
    const resize = new ResizeObserver(measureCards);
    resize.observe(chaseSection);
    chaseCards.forEach(card => resize.observe(card));
  } else window.addEventListener('resize', measureCards, {passive: true});
}
