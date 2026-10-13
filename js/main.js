/* ============================================================
   AD INTERIOR STUDIO
   home:  scroll-scrubbed house tour (video frames on a pinned canvas)
   about: lights on / off for the whole page
   both:  reveals, testimonial rivers, footer year
   ============================================================ */
(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const root = document.documentElement;
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  if ($('stage')) initTour();
  if ($('modeToggle')) initLights();
  if ($('directions')) initDirections();

  /* ---------- testimonial rivers: clone each track once for a seamless loop ---------- */
  document.querySelectorAll('[data-marquee]').forEach(m => {
    const clone = m.firstElementChild.cloneNode(true);
    clone.setAttribute('aria-hidden', 'true');
    m.appendChild(clone);
  });

  /* ---------- gentle reveals ---------- */
  const io = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (en.isIntersecting) { en.target.classList.add('in-view'); io.unobserve(en.target); }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
  document.querySelectorAll('.reveal').forEach(el => io.observe(el));

  if ($('year')) $('year').textContent = new Date().getFullYear();

  /* ============================================================
     CONTACT — directions popup
     opens from any [data-directions] link, and from the URL contact.html#directions
     ============================================================ */
  function initDirections() {
    const dlg = $('directions');
    const tabs = Array.from(dlg.querySelectorAll('[role="tab"]'));

    function selectTab(name) {
      tabs.forEach(t => {
        const on = t.dataset.tab === name;
        t.setAttribute('aria-selected', on ? 'true' : 'false');
        t.tabIndex = on ? 0 : -1;
        $('panel-' + t.dataset.tab).hidden = !on;
      });
    }
    function open(name) {
      if (name) selectTab(name);
      if (!dlg.open) dlg.showModal();
      if (location.hash !== '#directions') history.replaceState(null, '', '#directions');   // shareable link
    }

    document.querySelectorAll('[data-directions]').forEach(a => a.addEventListener('click', e => {
      e.preventDefault();
      open(a.dataset.directions);
    }));
    tabs.forEach((t, i) => {
      t.addEventListener('click', () => selectTab(t.dataset.tab));
      t.addEventListener('keydown', e => {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        const next = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
        selectTab(next.dataset.tab); next.focus();
      });
    });

    dlg.querySelector('[data-close]').addEventListener('click', () => dlg.close());
    dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });            // click on the backdrop
    dlg.addEventListener('close', () => {
      if (location.hash === '#directions') history.replaceState(null, '', location.pathname + location.search);
    });

    const copyBtn = $('copyAddr');
    copyBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText('10 Woodlands Square, #04-43 Woods Square Solo 1, Singapore 737714');
        copyBtn.textContent = 'Copied';
      } catch { copyBtn.textContent = 'Press Ctrl/Cmd + C'; }
      setTimeout(() => { copyBtn.textContent = 'Copy address'; }, 1800);
    });

    const fromHash = () => { if (location.hash === '#directions') open(); };
    addEventListener('hashchange', fromHash);
    fromHash();
  }

  /* ============================================================
     ABOUT — lights on / off
     ============================================================ */
  function initLights() {
    const toggle = $('modeToggle');
    const buttons = [$('heroToggle')].filter(Boolean);   // in-page switches that mirror the pill
    const isOff = () => root.getAttribute('data-theme') === 'night';
    function setLights(off) {
      root.setAttribute('data-theme', off ? 'night' : 'day');
      buttons.forEach(b => { b.textContent = off ? 'Turn the lights on' : 'Turn the lights off'; });
      toggle.setAttribute('aria-pressed', off ? 'true' : 'false');
    }
    toggle.addEventListener('click', () => setLights(!isOff()));
    document.querySelectorAll('[data-lights]').forEach(b => b.addEventListener('click', () => setLights(!isOff())));   // per-room chips
    buttons.forEach(b => b.addEventListener('click', () => setLights(!isOff())));
  }

  /* ============================================================
     HOME — the tour
     ============================================================ */
  function initTour() {
    /* ---------- config ---------- */
    const FR_A = 121;                 // hero1: villa exterior → timber doors → living room
    const FR_B = 121;                 // hero2: living room → past the AD wall → dining & kitchen
    const MOBILE = Math.min(innerWidth, innerHeight) <= 820 && innerWidth <= 1024;
    const DIR_A = MOBILE ? 'assets/frames/ma/' : 'assets/frames/a/';
    const DIR_B = MOBILE ? 'assets/frames/mb/' : 'assets/frames/b/';
    const IW = 16, IH = 9;            // frame aspect

    // timeline (progress 0..1 across the scroll stage)
    const INTRO_OUT = [0.008, 0.07];  // title lifts up and fades; the veil (if any) fades on the very same curve
    const V1        = [0.05, 0.42];   // video 1 scrub, starts once the title has cleared
    const CAP1_IN   = [0.40, 0.445];  // first stop: headline, sub-header, CTA
    const CAP1_OUT  = [0.475, 0.515];
    const V2        = [0.50, 0.89];   // video 2 scrub
    const SEAM      = 0.06;           // share of V2 spent cross-fading over the cut
    const CAP2_IN   = [0.87, 0.92];   // deeper-in words + CTA (stays to the end)
    const HOLD_ZOOM = 0.035;          // slow push-in while the living room holds

    const VEIL      = 0.58;           // dark-brown veil behind the title, 0..1 (0 = none)

    /* ---------- dom ---------- */
    const canvas = $('scene'), ctx = canvas.getContext('2d');
    const stage = $('stage'), header = $('header');
    const intro = $('intro'), introInner = $('introInner');
    const cap1 = $('cap1'), cap2 = $('cap2');
    const shadeIntro = $('shadeIntro'), shade1 = $('shadeCaption1'), shade2 = $('shadeCaption2');
    const loader = $('loader');

    /* ---------- helpers ---------- */
    const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
    const span = (p, [a, b]) => clamp01((p - a) / (b - a));
    const ss = t => { t = clamp01(t); return t * t * (3 - 2 * t); };   // smoothstep
    const pad4 = n => String(n).padStart(4, '0');

    /* ---------- frames ---------- */
    const framesA = new Array(FR_A), framesB = new Array(FR_B);
    let lastKey = '';

    // nearest loaded frame, so the tour works while the rest still streams in
    function nearest(set, idx) {
      if (set[idx]) return set[idx];
      for (let d = 1; d < set.length; d++) {
        if (set[idx - d]) return set[idx - d];
        if (set[idx + d]) return set[idx + d];
      }
      return null;
    }

    function loadQueue(jobs, onEach) {
      return new Promise(resolve => {
        let next = 0, done = 0;
        if (!jobs.length) return resolve();
        const pump = () => {
          if (done === jobs.length) return resolve();
          if (next >= jobs.length) return;
          const { set, i, dir } = jobs[next++];
          const img = new Image();
          img.decoding = 'async';
          img.onload = img.onerror = () => {
            if (img.naturalWidth) {
              set[i] = img;
              if (img.decode) img.decode().catch(() => {});            // head start on decoding; never waited on
            }
            done++; onEach && onEach(done, jobs.length); lastKey = ''; pump();
          };
          img.src = dir + pad4(i + 1) + '.jpg';
        };
        for (let k = 0; k < 8; k++) pump();
      });
    }
    const jobsFor = (set, dir, n, pick) => {
      const out = [];
      for (let i = 0; i < n; i++) if (pick(i)) out.push({ set, i, dir });
      return out;
    };

    /* ---------- sizing + drawing ---------- */
    let VW = 0, VH = 0;
    function resize() {
      const r = canvas.getBoundingClientRect();
      const dpr = Math.min(devicePixelRatio || 1, MOBILE ? 2 : 1.5);
      VW = r.width; VH = r.height;
      const scale = Math.min(dpr, (MOBILE ? 1440 : 2200) / Math.max(VW, 1));   // no bigger than the frames can fill
      canvas.width = Math.round(VW * scale);
      canvas.height = Math.round(VH * scale);
      lastKey = '';
    }
    function blit(c, img, zoom) {
      const cw = canvas.width, ch = canvas.height;
      const s = Math.max(cw / IW, ch / IH) * zoom;
      const dw = IW * s, dh = IH * s;
      c.drawImage(img, (cw - dw) / 2, (ch - dh) / 2, dw, dh);
    }
    // pos is a fractional frame index: the two neighbouring frames are mixed by the fraction,
    // so the walk stays fluid even when the scroll moves faster than the video's 24 fps
    function draw(set, pos, zoom, seam) {
      const i0 = Math.floor(pos), f = pos - i0;
      const img0 = nearest(set, i0);
      if (!img0) return null;
      const img1 = f > 0.02 && set[i0 + 1] ? set[i0 + 1] : null;
      const key = (set === framesA ? 'a' : 'b') + (img1 ? pos.toFixed(2) : i0) + ':' + zoom.toFixed(4) + ':' + seam.toFixed(2);
      if (key === lastKey) return img0;
      lastKey = key;
      const lastA = framesA[FR_A - 1];
      const cut = seam < 1 && lastA;                               // cross-fade over the video1 → video2 cut
      if (cut) blit(ctx, lastA, zoom);
      ctx.globalAlpha = cut ? seam : 1;
      blit(ctx, img0, zoom);
      if (img1) { ctx.globalAlpha = (cut ? seam : 1) * f; blit(ctx, img1, zoom); }
      ctx.globalAlpha = 1;
      return img0;
    }

    /* ---------- overlays ---------- */
    function setLayer(el, o, y) {
      el.style.opacity = o.toFixed(3);
      el.style.visibility = o < 0.01 ? 'hidden' : 'visible';
      el.style.transform = 'translate3d(0,' + y.toFixed(1) + 'px,0)';
    }

    function render(p) {
      // canvas
      const holdZoom = 1 + HOLD_ZOOM * (ss(span(p, [V1[1], V2[0]])) - ss(span(p, [V2[0], V2[0] + 0.12])));
      if (p < V2[0]) {
        draw(framesA, span(p, V1) * (FR_A - 1), holdZoom, 1);
      } else {
        const t = span(p, V2);
        draw(framesB, t * (FR_B - 1), holdZoom, clamp01(t / SEAM));
      }

      // title lifts away before the walk begins; the veil leaves with it
      const io = 1 - ss(span(p, INTRO_OUT));
      setLayer(introInner, io, -(1 - io) * VH * 0.12);
      intro.style.visibility = io < 0.01 ? 'hidden' : 'visible';
      shadeIntro.style.opacity = (VEIL * io).toFixed(3);

      // captions
      const c1 = ss(span(p, CAP1_IN)) * (1 - ss(span(p, CAP1_OUT)));
      const c1y = (1 - ss(span(p, CAP1_IN))) * 40 - ss(span(p, CAP1_OUT)) * 40;
      const c2 = ss(span(p, CAP2_IN));
      setLayer(cap1, c1, c1y);
      setLayer(cap2, c2, (1 - c2) * 40);
      shade1.style.opacity = c1.toFixed(3);
      shade2.style.opacity = c2.toFixed(3);
    }

    /* ---------- scroll loop ---------- */
    let target = 0, cur = -1, lastT = performance.now();
    function readScroll() {
      const r = stage.getBoundingClientRect();
      target = clamp01(-r.top / (stage.offsetHeight - innerHeight));
      header.classList.toggle('solid', r.bottom < 80);
    }
    function tick(now) {
      const dt = Math.min(now - lastT, 64); lastT = now;
      if (cur < 0 || reduceMotion) cur = target;
      else cur += (target - cur) * (1 - Math.exp(-dt / 110));    // eased follow → buttery scrub
      if (Math.abs(target - cur) < 0.00005) cur = target;
      render(cur);
      requestAnimationFrame(tick);
    }

    /* ---------- one gesture = one scene ----------
       inside the tour a single wheel tick / swipe / arrow key glides to the next
       scene (title → first stop → deeper in → rest of the page) instead of free-scrolling */
    const SCENES = [0, 0.46, 0.95];                                // progress where each scene rests
    const GLIDE_MS = 3400, EXIT_MS = 1100;
    const easeInOut = t => (1 - Math.cos(Math.PI * t)) / 2;        // sine: even pace, no rush in the middle
    let gliding = false, needGap = false, lastWheel = 0;

    const stageTop = () => stage.getBoundingClientRect().top + scrollY;
    const travel = () => stage.offsetHeight - innerHeight;
    const yOf = pr => stageTop() + travel() * pr;
    const exitY = () => stageTop() + stage.offsetHeight - 56;      // top of the next section, under the header

    function glideTo(y, ms) {
      const from = scrollY, dist = y - from, t0 = performance.now();
      if (Math.abs(dist) < 2) return;
      if (reduceMotion) { scrollTo({ top: y, behavior: 'instant' }); return; }
      gliding = true;
      (function step(now) {
        const t = Math.min((now - t0) / ms, 1);
        scrollTo({ top: from + dist * easeInOut(t), behavior: 'instant' });
        if (t < 1) requestAnimationFrame(step);
        else { gliding = false; needGap = true; }
      })(t0);
    }

    // returns true when the gesture was taken over
    function advance(dir) {
      const y = scrollY, end = yOf(1), EPS = 0.015;
      if (y > end + 2) {                                           // already past the tour
        if (dir < 0 && y <= exitY() + 4) { glideTo(yOf(SCENES[SCENES.length - 1]), EXIT_MS); return true; }
        return false;
      }
      const pr = clamp01((y - stageTop()) / travel());
      if (dir > 0) {
        const next = SCENES.find(sc => sc > pr + EPS);
        if (next === undefined) glideTo(exitY(), EXIT_MS);
        else glideTo(yOf(next), GLIDE_MS * Math.max(0.45, (next - pr) / 0.47));
        return true;
      }
      const prev = [...SCENES].reverse().find(sc => sc < pr - EPS);
      if (prev === undefined) return false;                        // top of the page: nothing to take over
      glideTo(yOf(prev), GLIDE_MS * Math.max(0.45, (pr - prev) / 0.47));
      return true;
    }
    const inTour = () => !document.body.classList.contains('is-loading') && scrollY <= exitY() + 4;

    addEventListener('wheel', e => {
      if (e.ctrlKey || !inTour()) return;                          // pinch-zoom and the rest of the page stay native
      const now = performance.now(), gap = now - lastWheel;
      lastWheel = now;
      if (gliding) { e.preventDefault(); return; }
      if (needGap) {                                               // swallow the inertia tail of the last gesture
        if (gap < 150) { e.preventDefault(); return; }
        needGap = false;
      }
      if (Math.abs(e.deltaY) < 4) return;
      if (advance(e.deltaY > 0 ? 1 : -1)) e.preventDefault();
    }, { passive: false });

    let touchY = null;
    addEventListener('touchstart', e => { touchY = inTour() ? e.touches[0].clientY : null; }, { passive: true });
    addEventListener('touchmove', e => {
      if (touchY === null) return;
      if (gliding) { e.preventDefault(); return; }
      const dy = touchY - e.touches[0].clientY;
      if (Math.abs(dy) < 28) { if (scrollY <= yOf(1)) e.preventDefault(); return; }
      if (advance(dy > 0 ? 1 : -1)) e.preventDefault();
      touchY = null;
    }, { passive: false });

    addEventListener('keydown', e => {
      if (!inTour() || (e.key === ' ' && e.target.closest('a, button')) || e.target.closest('input, textarea, select')) return;
      const dir = ['ArrowDown', 'PageDown', ' '].includes(e.key) ? 1 : ['ArrowUp', 'PageUp'].includes(e.key) ? -1 : 0;
      if (!dir) return;
      if (gliding || advance(dir)) e.preventDefault();
    });

    addEventListener('scroll', readScroll, { passive: true });
    addEventListener('resize', () => { resize(); readScroll(); });
    resize(); readScroll();
    requestAnimationFrame(tick);

    /* ---------- boot ----------
       a coarse pass of frames loads behind an unhurried loader; once the frames are in
       and the minimum time has passed, the brown lifts and the title settles in.
       The remaining frames stream in afterwards. */
    const STRIDE = 2, LOADER_MIN_MS = 2800;
    const bootT = performance.now();
    let left = false;

    function leaveLoader() {
      if (left) return; left = true;
      loader.classList.add('leaving');
      document.body.classList.remove('is-loading');
      setTimeout(() => document.body.classList.add('intro-in'), reduceMotion ? 200 : 800);
      setTimeout(() => loader.classList.add('gone'), 2000);
    }

    loadQueue(jobsFor(framesA, DIR_A, FR_A, i => i % STRIDE === 0 || i === FR_A - 1))
      .then(() => {
        setTimeout(leaveLoader, Math.max(0, LOADER_MIN_MS - (performance.now() - bootT)));
        return loadQueue(jobsFor(framesA, DIR_A, FR_A, i => !framesA[i]));             // finish the first walk
      })
      .then(() => loadQueue(jobsFor(framesB, DIR_B, FR_B, i => i % STRIDE === 0)))
      .then(() => loadQueue(jobsFor(framesB, DIR_B, FR_B, i => !framesB[i])));
  }
})();
