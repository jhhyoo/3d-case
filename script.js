'use strict';

// ═══════════════════════════════════════════════════════════════════════
//  CONFIG
// ═══════════════════════════════════════════════════════════════════════

// Фиолетовые PointLight'ы живут внутри модели (см. case_model.js). Сюда сценоуровневые
// источники света не добавляем — все огни вращаются вместе с корпусом.
const SCENE_CONFIGS = [
  // Hero — interactive (drag to rotate)
  { canvas: 'c0', wrap: 'wrap0', bg: 0xf9f9f6, cam: [-2.7,  1.5, 4.7], rotY:  .38, rotX: -.05, sens: .28, drag: true  },
  // Showcase — front view
  { canvas: 'c1', wrap: 'wrap1', bg: 0x0c0c0b, cam: [ 0.0,  0.2, 5.5], rotY:  0,   rotX:  0,   sens: .20, drag: false },
  // Glass — strict side view (left glass panel)
  { canvas: 'c2', wrap: 'wrap2', bg: 0xf9f9f6, cam: [ 0.0,  0.4, 5.5], rotY: 1.57, rotX:  .03, sens: .18, drag: false },
  // Interior — 3/4 view at front-left glass corner
  { canvas: 'c3', wrap: 'wrap3', bg: 0x0c0c0b, cam: [-2.4,  2.7, 4.3], rotY:  .35, rotX: -.06, sens: .16, drag: false },
  // Pricing — 3/4 view from white side, slight low angle, model centered
  { canvas: 'c4', wrap: 'wrap4', bg: 0xf9f9f6, cam: [ 3.0, -0.5, 3.5], rotY: 0, rotX: 0, sens: .10, drag: false },
];

const REVEAL_THRESHOLD  = 0.12;
const REVEAL_STAGGER_S  = 0.11;

// ═══════════════════════════════════════════════════════════════════════
//  DOM HELPERS
// ═══════════════════════════════════════════════════════════════════════

const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

// ═══════════════════════════════════════════════════════════════════════
//  SCROLL LOCK — shared between navigation and back-to-top.
//  isScrolling = true while a programmatic smooth scroll is in flight;
//  scrollend resets it. If a scroll won't actually move (target == current),
//  we MUST NOT lock — otherwise no scrollend fires and lock sticks forever.
// ═══════════════════════════════════════════════════════════════════════

let isScrolling = false;
window.addEventListener('scrollend', () => { isScrolling = false; });

// ═══════════════════════════════════════════════════════════════════════
//  NAV HEIGHT — measure nav and expose as --nav-h CSS variable
// ═══════════════════════════════════════════════════════════════════════

function syncNavHeight() {
  const nav = $('nav');
  if (!nav) return;
  document.documentElement.style.setProperty('--nav-h', nav.offsetHeight + 'px');
}

// ═══════════════════════════════════════════════════════════════════════
//  NAVIGATION — wheel-driven section snap + smooth scroll for buttons/links
// ═══════════════════════════════════════════════════════════════════════

function initNavigation() {
  const sections = $$('.stripe');

  function goTo(target) {
    if (!target) return;
    // No-op if target is already at viewport top → don't lock
    if (Math.abs(target.getBoundingClientRect().top) < 1) return;
    isScrolling = true;
    target.scrollIntoView({ behavior: 'smooth' });
  }

  function currentIndex() {
    const center = window.scrollY + window.innerHeight / 2;
    let best = 0, bestDist = Infinity;

    sections.forEach((s, i) => {
      const sCenter = s.offsetTop + s.offsetHeight / 2;
      const d = Math.abs(sCenter - center);
      if (d < bestDist) { bestDist = d; best = i; }
    });

    return best;
  }

  // Click handlers — work uniformly for [data-scroll] buttons and nav links
  $$('[data-scroll]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.preventDefault();
      goTo($('#' + btn.dataset.scroll));
    });
  });

  window.addEventListener('wheel', e => {
    if (isScrolling) { e.preventDefault(); return; }
    const dir = Math.sign(e.deltaY);
    if (!dir) return;
    e.preventDefault();

    const next = currentIndex() + dir;
    if (next < 0) return;

    if (next >= sections.length) {
      // Past last section → scroll to bottom of document.
      // Bail if already there, otherwise we'd lock with no scrollend incoming.
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (window.scrollY >= max - 1) return;
      isScrolling = true;
      window.scrollTo({ top: max, behavior: 'smooth' });
    } else {
      goTo(sections[next]);
    }
  }, { passive: false });
}

// ═══════════════════════════════════════════════════════════════════════
//  BACK TO TOP — fixed button, grows in height with scroll progress.
//  Uses mix-blend-mode for auto color inversion across light/dark sections.
// ═══════════════════════════════════════════════════════════════════════

function initBackToTop() {
  const btn = $('.btn-back-top');
  if (!btn) return;

  const SHOW_FROM_VH = 0.5;   // показываем когда прокручено полвьюпорта (= в Showcase зашли)
  const MIN_H = 44;            // базовая высота = ширина (квадрат)
  const GROW_PER_VH = 44;      // на каждый прокрученный viewport высота +44px

  function update() {
    const vh = window.innerHeight;
    const viewportsScrolled = window.scrollY / vh;
    btn.classList.toggle('visible', window.scrollY > vh * SHOW_FROM_VH);
    btn.style.height = `${MIN_H + viewportsScrolled * GROW_PER_VH}px`;
  }

  window.addEventListener('scroll', update, { passive: true });

  btn.addEventListener('click', () => {
    if (window.scrollY < 1) return;       // already at top — no-op без лока
    isScrolling = true;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  update();
}

// ═══════════════════════════════════════════════════════════════════════
//  FAQ — radio accordion. JS-managed max-height for symmetric animation.
// ═══════════════════════════════════════════════════════════════════════

function initFAQ() {
  const all = $$('.faq-q');

  function close(btn) {
    btn.setAttribute('aria-expanded', 'false');
    btn.nextElementSibling.style.maxHeight = '';
  }
  function open(btn) {
    const ans = btn.nextElementSibling;
    btn.setAttribute('aria-expanded', 'true');
    ans.style.maxHeight = ans.scrollHeight + 'px';
  }

  all.forEach(btn => {
    btn.addEventListener('click', () => {
      const isOpen = btn.getAttribute('aria-expanded') === 'true';
      // Radio: close all others
      all.forEach(other => { if (other !== btn) close(other); });
      // Toggle current
      isOpen ? close(btn) : open(btn);
    });
  });
}

// ═══════════════════════════════════════════════════════════════════════
//  NAV THEME — copies data-theme of the section currently crossing the
//  probe Y (1px below nav) into <nav>. Iterates known sections rather
//  than using document.elementFromPoint — keeps the lookup deterministic
//  (probe can't accidentally hit the nav itself due to sub-pixel layout).
//  rAF-throttled: at most one resolution per frame.
// ═══════════════════════════════════════════════════════════════════════

function initNavTheme() {
  const nav = $('nav');
  if (!nav) return;
  const sections = $$('[data-theme]').filter(el => el !== nav);
  if (!sections.length) return;

  let raf = null;

  function pickTheme() {
    raf = null;
    const probeY = nav.offsetHeight + 1;
    let theme = 'light';
    for (const sec of sections) {
      const r = sec.getBoundingClientRect();
      if (r.top <= probeY && r.bottom > probeY) {
        theme = sec.getAttribute('data-theme') || 'light';
        break;
      }
    }
    if (nav.getAttribute('data-theme') !== theme) {
      nav.setAttribute('data-theme', theme);
    }
  }

  function schedule() {
    if (raf !== null) return;
    raf = requestAnimationFrame(pickTheme);
  }

  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
  pickTheme();
}

// ═══════════════════════════════════════════════════════════════════════
//  REVEAL — fade-in elements as their section enters viewport
// ═══════════════════════════════════════════════════════════════════════

function initReveal() {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      $$('.reveal', entry.target).forEach((el, i) => {
        el.style.transitionDelay = `${i * REVEAL_STAGGER_S}s`;
        el.classList.add('visible');
      });
      observer.unobserve(entry.target);
    });
  }, { threshold: REVEAL_THRESHOLD });
  $$('.stripe').forEach(s => observer.observe(s));
}

// ═══════════════════════════════════════════════════════════════════════
//  SCENES — Three.js, on-demand RAF, only visible scenes render
// ═══════════════════════════════════════════════════════════════════════

function initScenes() {
  const scenes = [];
  let mouseNX = 0, mouseNY = 0;
  let lastMouseX = window.innerWidth  / 2;
  let lastMouseY = window.innerHeight / 2;

  function recomputeMouseNorm() {
    mouseNX = (lastMouseX / window.innerWidth)  * 2 - 1;
    mouseNY = (lastMouseY / window.innerHeight) * 2 - 1;
  }

  window.addEventListener('mousemove', e => {
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
    recomputeMouseNorm();
  });

  function addStudioLights(scene) {
    scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    const key  = new THREE.DirectionalLight(0xffffff, 2.20); key.position.set( 5,  7,  5); scene.add(key);
    const fill = new THREE.DirectionalLight(0xede8ff, 0.75); fill.position.set(-4, 2, -3); scene.add(fill);
    const rim  = new THREE.DirectionalLight(0xfff8f0, 0.35); rim.position.set( 0, -3, -5); scene.add(rim);
  }

  function attachDrag(canvas, state) {
    let prevX = 0, prevY = 0;
    const begin = (x, y) => { state.dragging = true; prevX = x; prevY = y; };
    const move  = (x, y) => {
      if (!state.dragging) return;
      const dx = x - prevX, dy = y - prevY;
      state.velX = dx * 0.009;
      state.velY = dy * 0.009;
      state.userRotY += state.velX;
      state.userRotX = Math.max(-0.6, Math.min(0.6, state.userRotX + state.velY));
      prevX = x; prevY = y;
    };
    const end = () => { state.dragging = false; };

    canvas.addEventListener('mousedown',  e => begin(e.clientX, e.clientY));
    window.addEventListener('mousemove',  e => move(e.clientX, e.clientY));
    window.addEventListener('mouseup',    end);
    canvas.addEventListener('touchstart', e => begin(e.touches[0].clientX, e.touches[0].clientY), { passive: true });
    window.addEventListener('touchmove',  e => move(e.touches[0].clientX, e.touches[0].clientY),  { passive: true });
    window.addEventListener('touchend',   end);
  }

  function createScene(cfg) {
    const canvas = $('#' + cfg.canvas);
    const wrap   = $('#' + cfg.wrap);

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputEncoding      = THREE.sRGBEncoding;
    renderer.toneMapping         = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.setClearColor(cfg.bg, 1);

    const scene = new THREE.Scene();
    addStudioLights(scene);

    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 50);
    camera.position.set(...cfg.cam);
    camera.lookAt(...(cfg.lookAt || [0, 0, 0]));

    const model = window.buildCase();
    model.rotation.y = cfg.rotY;
    model.rotation.x = cfg.rotX;
    scene.add(model);

    const fit = () => {
      const w = wrap.clientWidth, h = wrap.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    fit();
    new ResizeObserver(fit).observe(wrap);

    const state = {
      cfg, renderer, scene, camera, model, canvas, wrap,
      dragging: false,
      velX: 0, velY: 0,
      userRotY: cfg.rotY,
      userRotX: cfg.rotX,
    };

    if (cfg.drag) attachDrag(canvas, state);
    return state;
  }

  function updateScene(s) {
    if (s.cfg.drag) {
      // Hero: drag inertia + soft re-centering toward cursor parallax
      if (!s.dragging) {
        s.velX *= 0.90;
        s.velY *= 0.90;
        s.userRotY += s.velX;
        s.userRotX += s.velY;
        const ty = s.cfg.rotY + mouseNX * s.cfg.sens;
        const tx = s.cfg.rotX + mouseNY * s.cfg.sens * 0.45;
        s.userRotY += (ty - s.userRotY) * 0.05;
        s.userRotX += (tx - s.userRotX) * 0.05;
      }
      s.model.rotation.y += (s.userRotY - s.model.rotation.y) * 0.10;
      s.model.rotation.x += (s.userRotX - s.model.rotation.x) * 0.10;
    } else {
      // Static scenes: cursor parallax only
      const ty = s.cfg.rotY + mouseNX * s.cfg.sens;
      const tx = s.cfg.rotX + mouseNY * s.cfg.sens * 0.45;
      s.model.rotation.y += (ty - s.model.rotation.y) * 0.08;
      s.model.rotation.x += (tx - s.model.rotation.x) * 0.08;
    }
    s.renderer.render(s.scene, s.camera);
  }

  // RAF runs only while at least one canvas is in viewport.
  // Off-screen canvases are not composited by the browser, so their WebGL
  // draw calls queue up in the GPU command buffer without being flushed —
  // on FAQ (the only section without a canvas) this accumulates until the
  // page hangs. Visibility-gated RAF prevents that.
  let rafId = null;

  function tick() {
    rafId = null;
    let any = false;
    scenes.forEach(s => {
      if (!s.visible) return;
      any = true;
      updateScene(s);
    });
    if (any) requestTick();
  }

  function requestTick() {
    if (rafId !== null) return;
    rafId = requestAnimationFrame(tick);
  }

  // Build all scenes from config
  SCENE_CONFIGS.forEach(cfg => {
    const s = createScene(cfg);
    s.visible = true;
    scenes.push(s);
  });

  // Track which canvases are actually in viewport
  const visIO = new IntersectionObserver(entries => {
    let kick = false;
    entries.forEach(entry => {
      const s = scenes.find(s => s.wrap === entry.target);
      if (!s) return;
      s.visible = entry.isIntersecting;
      if (entry.isIntersecting) kick = true;
    });
    if (kick) requestTick();
  });
  scenes.forEach(s => visIO.observe(s.wrap));

  // Resize: recompute parallax norm against new viewport, kick render once
  window.addEventListener('resize', () => {
    recomputeMouseNorm();
    requestTick();
  });

  requestTick();
}

// ═══════════════════════════════════════════════════════════════════════
//  BOOTSTRAP
// ═══════════════════════════════════════════════════════════════════════

syncNavHeight();
window.addEventListener('resize', syncNavHeight);

initNavigation();
initNavTheme();
initFAQ();
initReveal();
initBackToTop();
initScenes();
