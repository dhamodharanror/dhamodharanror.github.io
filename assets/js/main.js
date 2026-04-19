const { gsap } = window;
gsap.registerPlugin(window.ScrollTrigger);

document.documentElement.classList.add('is-loading');

// ---- CLOCK ----
const clockEls = [document.getElementById('clock'), document.getElementById('clock2')];
const tickClock = () => {
  const now = new Date();
  const ist = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).format(now);
  clockEls.forEach((el, i) => {
    if (!el) return;
    el.textContent = i === 0 ? ist : ist.slice(0, 5);
  });
};
tickClock();
setInterval(tickClock, 1000);

// ---- PRELOADER ----
const preloader = document.getElementById('preloader');
const pctEl = document.getElementById('preloaderPct');
const barEl = document.getElementById('preloaderBar');

const runCounter = () => new Promise((resolve) => {
  const start = performance.now();
  const duration = 1600;
  const tick = (now) => {
    const elapsed = now - start;
    const p = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - p, 2.4);
    const pct = Math.floor(eased * 100);
    pctEl.textContent = String(pct).padStart(2, '0');
    barEl.style.transform = `scaleX(${eased})`;
    if (p < 1) requestAnimationFrame(tick);
    else resolve();
  };
  requestAnimationFrame(tick);
});

runCounter().then(() => {
  // Trigger the coin's landing animation (takes ~2.5s total)
  if (window.coinLand) window.coinLand();

  const tl = gsap.timeline({
    onComplete: () => {
      document.documentElement.classList.remove('is-loading');
      preloader.remove();
      initScrollAnimations();
      initLenis();
    },
  });

  // Fade out preloader UI as the coin is landing
  tl
    .to('.preloader__center', { opacity: 0, y: 10, duration: 0.4 }, 0)
    .to('.preloader__bar', { opacity: 0, duration: 0.4 }, 0)
    .to('.preloader__top', { opacity: 0, y: -10, duration: 0.4 }, 0.15)
    .to('.preloader__bottom', { opacity: 0, y: 10, duration: 0.4 }, 0.15)
    // Wait for the impact + settle (~1.2s after coinLand starts), then fade preloader bg
    .to('.preloader', { opacity: 0, duration: 0.5 }, 1.2)
    // Hero reveal — starts as the coin moves to its hero position
    .from('.hero__title .line__inner', {
      yPercent: 110,
      duration: 1.1,
      stagger: 0.08,
      ease: 'power4.out',
    }, 1.6)
    .from('.hero__profile, .hero__foot', {
      opacity: 0, y: 20, duration: 0.8, stagger: 0.1, ease: 'power3.out',
    }, 1.75)
    .from('.nav, .audio-toggle', {
      opacity: 0, y: -10, duration: 0.6, ease: 'power3.out',
    }, 1.9);
});

// ---- SMOOTH SCROLL ----
let lenis;
function initLenis() {
  if (!window.Lenis) return;
  lenis = new window.Lenis({
    duration: 1.1,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
  });
  const raf = (time) => {
    lenis.raf(time);
    requestAnimationFrame(raf);
  };
  requestAnimationFrame(raf);
  // Keep ScrollTrigger in sync
  lenis.on('scroll', window.ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);

  // Anchor links
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (id && id.length > 1) {
        const target = document.querySelector(id);
        if (target) {
          e.preventDefault();
          lenis.scrollTo(target, { offset: -20 });
        }
      }
    });
  });
}

// ---- SCROLL-DRIVEN REVEALS ----
function initScrollAnimations() {
  const ST = window.ScrollTrigger;

  gsap.utils.toArray('.reveal').forEach((el) => {
    gsap.fromTo(el, { opacity: 0, y: 18 }, {
      opacity: 1, y: 0, duration: 1, ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 85%', once: true },
    });
  });

  gsap.utils.toArray('.reveal-up').forEach((el) => {
    gsap.fromTo(el, { opacity: 0, y: 60 }, {
      opacity: 1, y: 0, duration: 1.1, ease: 'power4.out',
      scrollTrigger: { trigger: el, start: 'top 85%', once: true },
    });
  });

  // Split-text per char for major headings
  const splitTargets = document.querySelectorAll('.work__title, .path__title, .gallery__title, .contact__title');
  splitTargets.forEach((h) => {
    // split direct text nodes into wrapped character spans
    const splitNode = (node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.nodeValue;
        const frag = document.createDocumentFragment();
        for (const ch of text) {
          if (ch === ' ') { frag.appendChild(document.createTextNode(' ')); continue; }
          const wrap = document.createElement('span');
          wrap.className = 'char';
          const inner = document.createElement('span');
          inner.className = 'char__inner';
          inner.textContent = ch;
          wrap.appendChild(inner);
          frag.appendChild(wrap);
        }
        node.parentNode.replaceChild(frag, node);
      } else if (node.nodeType === Node.ELEMENT_NODE && node.tagName !== 'BR') {
        Array.from(node.childNodes).forEach(splitNode);
      }
    };
    Array.from(h.childNodes).forEach(splitNode);
    gsap.set(h, { opacity: 1 });
    gsap.fromTo(h.querySelectorAll('.char__inner'), {
      yPercent: 110, rotate: 4,
    }, {
      yPercent: 0, rotate: 0,
      duration: 1.1,
      ease: 'power4.out',
      stagger: { each: 0.02, from: 'start' },
      scrollTrigger: { trigger: h, start: 'top 85%', once: true },
    });
  });

  // Chapter-card slam-in
  gsap.utils.toArray('.chapter').forEach((chapter) => {
    const numInner = chapter.querySelector('.chapter__num-inner');
    const labelSpans = chapter.querySelectorAll('.chapter__label .mono, .chapter__label-name span');
    const tl = gsap.timeline({
      scrollTrigger: { trigger: chapter, start: 'top 80%', once: true },
      defaults: { ease: 'power4.out' },
    });
    tl.to(numInner, { yPercent: 0, duration: 1.1 })
      .from(chapter.querySelector('.chapter__label .mono'), { opacity: 0, y: 12, duration: 0.6 }, '-=0.7')
      .to(chapter.querySelector('.chapter__label-name span'), { yPercent: 0, duration: 0.9 }, '-=0.5');
  });

  initPoleCarousel();

  // Capability cards — cinematic entrance per card
  gsap.utils.toArray('.card').forEach((card) => {
    const num = card.querySelector('.card__num');
    const title = card.querySelector('.card__title');
    const items = card.querySelectorAll('.card__list li');
    const quote = card.querySelector('.card__quote');
    const tag = card.querySelector('.card__tag');

    // split title
    if (title && !title.dataset.split) {
      title.dataset.split = '1';
      const splitNode = (node) => {
        if (node.nodeType === Node.TEXT_NODE) {
          const frag = document.createDocumentFragment();
          for (const ch of node.nodeValue) {
            if (ch === ' ') { frag.appendChild(document.createTextNode(' ')); continue; }
            const wrap = document.createElement('span'); wrap.className = 'char';
            const inner = document.createElement('span'); inner.className = 'char__inner';
            inner.textContent = ch; wrap.appendChild(inner); frag.appendChild(wrap);
          }
          node.parentNode.replaceChild(frag, node);
        } else if (node.nodeType === Node.ELEMENT_NODE && node.tagName !== 'BR') {
          Array.from(node.childNodes).forEach(splitNode);
        }
      };
      Array.from(title.childNodes).forEach(splitNode);
    }

    const tl = gsap.timeline({
      scrollTrigger: { trigger: card, start: 'top 78%', once: true },
      defaults: { ease: 'power4.out' },
    });
    if (num) tl.from(num, { xPercent: -20, opacity: 0, duration: 1.0 }, 0);
    if (tag) tl.from(tag, { opacity: 0, x: -12, duration: 0.6 }, 0.1);
    const chars = title?.querySelectorAll('.char__inner');
    if (chars?.length) tl.from(chars, { yPercent: 110, rotate: 3, duration: 0.9, stagger: 0.012 }, 0.15);
    tl.to(items, { opacity: 1, y: 0, duration: 0.7, stagger: 0.06 }, 0.4);
    if (quote) tl.from(quote, { opacity: 0, y: 12, duration: 0.7 }, '-=0.3');
  });

  // 3D tilt on card hover (desktop only)
  if (window.matchMedia('(pointer: fine)').matches) {
    gsap.utils.toArray('.card').forEach((card) => {
      const num = card.querySelector('.card__num');
      card.addEventListener('pointermove', (e) => {
        const r = card.getBoundingClientRect();
        const mx = (e.clientX - r.left) / r.width;
        const my = (e.clientY - r.top) / r.height;
        card.style.setProperty('--mx', `${mx * 100}%`);
        card.style.setProperty('--my', `${my * 100}%`);
        gsap.to(card, {
          rotateY: (mx - 0.5) * 4,
          rotateX: (0.5 - my) * 3,
          duration: 0.6, ease: 'power3.out',
          transformPerspective: 1400,
        });
        if (num) gsap.to(num, { x: (mx - 0.5) * 20, y: (my - 0.5) * 10, duration: 0.6, ease: 'power3.out' });
      });
      card.addEventListener('pointerleave', () => {
        gsap.to(card, { rotateY: 0, rotateX: 0, duration: 0.8, ease: 'power3.out' });
        if (num) gsap.to(num, { x: 0, y: 0, duration: 0.8, ease: 'power3.out' });
      });
    });
  }

  // Gallery horizontal scroll
  const gallery = document.querySelector('.gallery');
  const track = document.querySelector('.gallery__track');
  if (gallery && track && window.matchMedia('(min-width: 720px)').matches) {
    const distance = () => track.scrollWidth - window.innerWidth + 120;
    gsap.to(track, {
      x: () => -distance(),
      ease: 'none',
      scrollTrigger: {
        trigger: gallery,
        start: 'top top',
        end: () => `+=${distance()}`,
        scrub: 1,
        pin: true,
        invalidateOnRefresh: true,
      },
    });
  }

  // Timeline parallax
  gsap.utils.toArray('.timeline__item').forEach((item) => {
    gsap.from(item.querySelector('.timeline__year'), {
      xPercent: -30,
      opacity: 0,
      scrollTrigger: { trigger: item, start: 'top 85%', once: true },
      duration: 0.9,
      ease: 'power3.out',
    });
  });
}

// ---- CUSTOM CURSOR ----
const cursor = document.querySelector('.cursor');
const ring = cursor?.querySelector('.cursor__ring');
const dot = cursor?.querySelector('.cursor__dot');

if (cursor && window.matchMedia('(pointer: fine)').matches) {
  const pos = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  const ringPos = { x: pos.x, y: pos.y };

  window.addEventListener('pointermove', (e) => {
    pos.x = e.clientX; pos.y = e.clientY;
    dot.style.transform = `translate(${pos.x}px, ${pos.y}px) translate(-50%, -50%)`;
  });

  const animateRing = () => {
    ringPos.x += (pos.x - ringPos.x) * 0.18;
    ringPos.y += (pos.y - ringPos.y) * 0.18;
    ring.style.transform = `translate(${ringPos.x}px, ${ringPos.y}px) translate(-50%, -50%)`;
    requestAnimationFrame(animateRing);
  };
  animateRing();

  // Hover states
  const hoverables = 'a, button, [data-magnetic], .card, .gallery__item';
  document.querySelectorAll(hoverables).forEach((el) => {
    el.addEventListener('pointerenter', () => cursor.classList.add('is-hover'));
    el.addEventListener('pointerleave', () => cursor.classList.remove('is-hover'));
  });

  window.addEventListener('pointerleave', () => cursor.classList.add('is-hidden'));
  window.addEventListener('pointerenter', () => cursor.classList.remove('is-hidden'));
}

// ---- MAGNETIC LINKS ----
document.querySelectorAll('[data-magnetic]').forEach((el) => {
  if (!window.matchMedia('(pointer: fine)').matches) return;
  const strength = el.hasAttribute('data-strong') ? 0.5 : 0.25;

  el.addEventListener('pointermove', (e) => {
    const r = el.getBoundingClientRect();
    const x = (e.clientX - (r.left + r.width / 2)) * strength;
    const y = (e.clientY - (r.top + r.height / 2)) * strength;
    gsap.to(el, { x, y, duration: 0.5, ease: 'power3.out' });
  });

  el.addEventListener('pointerleave', () => {
    gsap.to(el, { x: 0, y: 0, duration: 0.6, ease: 'elastic.out(1, 0.4)' });
  });
});

// ---- TEXT SCRAMBLE on nav links ----
const SCRAMBLE_CHARS = '!<>-_\\/[]{}—=+*^?#___';
function scrambleText(el) {
  const original = el.dataset.origText || el.textContent;
  el.dataset.origText = original;
  let frame = 0;
  const duration = 24;
  const chars = original.split('');
  const out = [];
  for (let i = 0; i < chars.length; i++) {
    out.push({
      from: SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)],
      to: chars[i],
      start: Math.floor(Math.random() * 10),
      end: Math.floor(10 + Math.random() * 14),
    });
  }
  let raf;
  const update = () => {
    let output = '';
    let complete = 0;
    for (let i = 0; i < out.length; i++) {
      const { from, to, start, end } = out[i];
      if (frame >= end) { complete++; output += to; }
      else if (frame >= start) {
        const ch = Math.random() < 0.28 ? SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)] : (out[i].lastCh || from);
        out[i].lastCh = ch;
        output += ch;
      } else { output += from; }
    }
    el.textContent = output;
    frame++;
    if (complete < out.length && frame <= duration + 4) raf = requestAnimationFrame(update);
    else el.textContent = original;
  };
  cancelAnimationFrame(el._scrambleRaf);
  el._scrambleRaf = requestAnimationFrame(update);
}
document.querySelectorAll('.nav__links a, .nav__brand span:last-child').forEach((el) => {
  el.addEventListener('pointerenter', () => scrambleText(el));
});

// ---- GALLERY reveal (DOM images) ----
gsap.utils.toArray('.gallery__item').forEach((item, i) => {
  gsap.fromTo(item, { clipPath: 'inset(0 0 100% 0)' }, {
    clipPath: 'inset(0 0 0% 0)',
    duration: 1.2,
    ease: 'power4.out',
    scrollTrigger: { trigger: item, start: 'top 92%', once: true },
    delay: i * 0.1,
  });
});

// ---- AUDIO TOGGLE (Web Audio ambient drone) ----
const audioBtn = document.getElementById('audioToggle');
let audioCtx, masterGain, oscillators = [];
function startAudio() {
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  masterGain = audioCtx.createGain();
  masterGain.gain.value = 0;
  masterGain.connect(audioCtx.destination);

  const filter = audioCtx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 1200;
  filter.Q.value = 0.7;
  filter.connect(masterGain);

  // Layered pad (Dm7 / Fmaj7-ish)
  const freqs = [110, 146.83, 220, 261.63, 329.63];
  freqs.forEach((f, i) => {
    const o = audioCtx.createOscillator();
    o.type = i % 2 ? 'sine' : 'triangle';
    o.frequency.value = f;
    const og = audioCtx.createGain();
    og.gain.value = 0.08;
    // slow LFO on gain
    const lfo = audioCtx.createOscillator();
    const lfoGain = audioCtx.createGain();
    lfo.frequency.value = 0.08 + i * 0.03;
    lfoGain.gain.value = 0.04;
    lfo.connect(lfoGain).connect(og.gain);
    o.connect(og).connect(filter);
    o.start(); lfo.start();
    oscillators.push(o, lfo);
  });

  // fade in
  masterGain.gain.linearRampToValueAtTime(0.18, audioCtx.currentTime + 2.0);
}
function stopAudio() {
  if (!audioCtx) return;
  const now = audioCtx.currentTime;
  masterGain.gain.cancelScheduledValues(now);
  masterGain.gain.setValueAtTime(masterGain.gain.value, now);
  masterGain.gain.linearRampToValueAtTime(0, now + 0.6);
  setTimeout(() => {
    oscillators.forEach(o => { try { o.stop(); } catch {} });
    oscillators = [];
    audioCtx.close();
    audioCtx = null;
  }, 700);
}
audioBtn?.addEventListener('click', () => {
  if (audioBtn.classList.contains('is-on')) {
    stopAudio();
    audioBtn.classList.remove('is-on');
    audioBtn.querySelector('.audio-toggle__label').textContent = 'Sound';
  } else {
    startAudio();
    audioBtn.classList.add('is-on');
    audioBtn.querySelector('.audio-toggle__label').textContent = 'Playing';
  }
});

// ---- ROTATING POLE CAROUSEL ----
function initPoleCarousel() {
  const carousel = document.getElementById('carousel');
  if (!carousel) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const cards = gsap.utils.toArray('.pcard');
  const numEl = document.getElementById('carouselNum');
  const introEl = document.getElementById('carouselIntro');
  const outroEl = document.getElementById('carouselOutro');
  const total = cards.length;

  const lerp = (a, b, t) => a + (b - a) * Math.max(0, Math.min(1, t));

  // Pre-compute card base offsets — left cards to the left of pole, right to the right
  const baseOffset = 280; // px from center
  cards.forEach((card) => {
    const isLeft = card.classList.contains('pcard--l');
    card.dataset.sign = isLeft ? '-1' : '1';
  });

  // Pre-set each card starting position
  const setCardState = (card, step) => {
    // step: cardProgress relative to this card (0 = active center)
    const sign = parseFloat(card.dataset.sign);
    let opacity, x, rotY, scale, z;

    if (step <= -1) {
      opacity = 0;
      x = sign * 760;
      rotY = sign * 35;
      scale = 0.7;
      z = -260;
    } else if (step < 0) {
      const t = step + 1; // 0 → 1 (entering)
      const e = 1 - Math.pow(1 - t, 3);
      opacity = e;
      x = lerp(sign * 760, sign * baseOffset, e);
      rotY = lerp(sign * 35, 0, e);
      scale = lerp(0.7, 1, e);
      z = lerp(-260, 0, e);
    } else if (step < 1) {
      const t = step; // 0 → 1 (exiting)
      const e = Math.pow(t, 2.2);
      opacity = 1 - e;
      x = lerp(sign * baseOffset, sign * 380, e);
      rotY = lerp(0, -sign * 25, e);
      scale = lerp(1, 0.82, e);
      z = lerp(0, -180, e);
    } else {
      opacity = 0;
      x = sign * 380;
      rotY = -sign * 25;
      scale = 0.82;
      z = -180;
    }

    gsap.set(card, {
      xPercent: -50,
      yPercent: -50,
      x,
      y: 0,
      z,
      rotationY: rotY,
      scale,
      opacity,
      transformPerspective: 1400,
      transformOrigin: 'center center',
      force3D: true,
    });
  };

  // Initial state — all hidden off to their side
  cards.forEach((card, i) => setCardState(card, -1 - i));

  window.ScrollTrigger.create({
    trigger: carousel,
    start: 'top top',
    end: 'bottom bottom',
    scrub: 1.4,
    onUpdate: (self) => {
      const p = self.progress; // 0 → 1

      // drive the 3D spine scene first
      if (window.spineSetScroll) window.spineSetScroll(p);

      // Pull the spine's math so card visibility matches wedge cycle exactly
      const cfg = window.__spineConfig;
      let step;
      if (cfg && cfg.mode === 'wedge') {
        if (p < cfg.P_SPLIT_COMPLETE) {
          step = -1;
        } else if (p > cfg.P_CYCLE_END) {
          step = cfg.WCOUNT;
        } else {
          const cycleT = (p - cfg.P_SPLIT_COMPLETE) / (cfg.P_CYCLE_END - cfg.P_SPLIT_COMPLETE);
          // Shift -0.5 so card fully visible at the middle of its fragment's hold window
          step = cycleT * cfg.WCOUNT - 0.5;
        }
      } else {
        step = p * total;
      }

      const activeIdx = Math.max(0, Math.min(total - 1, Math.round(step)));
      if (numEl) numEl.textContent = String(activeIdx + 1).padStart(2, '0');

      cards.forEach((card, i) => setCardState(card, step - i));

      // Intro overlay is visible while drill is still above the first vertebra
      // (step < 0). Fade it out as the drill approaches.
      if (introEl) {
        const introOpacity = Math.max(0, Math.min(1, -step));
        introEl.style.opacity = introOpacity.toFixed(3);
        introEl.style.transform = `translateX(-50%) translateY(${-introOpacity * 0 + (1 - introOpacity) * -24}px)`;
      }

      // Outro "Reforging..." hint — visible during rejoin, gone by the time coin is whole
      if (outroEl) {
        let outroOpacity = 0;
        if (cfg && cfg.P_REJOIN_END !== undefined) {
          const fadeIn  = Math.max(0, Math.min(1, (p - cfg.P_CYCLE_END) / 0.03));
          const fadeOut = Math.max(0, Math.min(1, (p - (cfg.P_REJOIN_END - 0.08)) / 0.08));
          outroOpacity = fadeIn * (1 - fadeOut);
        } else {
          outroOpacity = Math.max(0, Math.min(1, step - (total - 1)));
        }
        outroEl.style.opacity = outroOpacity.toFixed(3);
      }
    },
  });

  // Refresh after load to correct for image/font shifts
  window.addEventListener('load', () => window.ScrollTrigger.refresh());
}

// ---- Hero parallax on scroll (subtle) ----
gsap.to('.hero__title', {
  yPercent: -15,
  ease: 'none',
  scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true },
});
