/* Aishani Sharma: portfolio interactions
   Everything here is progressive enhancement: if GSAP fails to load or motion
   is reduced, the page stays fully readable and every control still works. */
(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var hasGSAP = typeof window.gsap !== 'undefined';
  var animate = hasGSAP && !reduce;
  var isDesktop = function () { return window.innerWidth > 920; };

  if (hasGSAP && window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return [].slice.call((c || document).querySelectorAll(s)); };

  /* ---------------- nav ---------------- */
  var nav = $('#nav'), list = $('#navlist'), toggle = $('#navtoggle');

  var onScroll = function () { nav.classList.toggle('is-stuck', window.scrollY > 24); };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  var setMenu = function (open) {
    nav.classList.toggle('is-open', open);
    list.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    document.body.style.overflow = open ? 'hidden' : '';
  };
  toggle.addEventListener('click', function () { setMenu(!list.classList.contains('is-open')); });
  list.addEventListener('click', function (e) { if (e.target.tagName === 'A') setMenu(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });

  // highlight the section currently in the middle of the viewport
  var navLinks = $$('.nav-list a[href^="#"]');
  if ('IntersectionObserver' in window) {
    var byId = {};
    navLinks.forEach(function (a) { byId[a.getAttribute('href').slice(1)] = a; });
    var secObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        navLinks.forEach(function (a) { a.classList.remove('is-active'); });
        var a = byId[en.target.id];
        if (a) a.classList.add('is-active');
      });
    }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });
    Object.keys(byId).forEach(function (id) {
      var el = document.getElementById(id);
      if (el) secObs.observe(el);
    });
  }

  // In-page links scroll smoothly via JS. The CSS scroll-behavior property is
  // deliberately not used: it animates ScrollTrigger's own measurement scrolls
  // during refresh() and leaves the page at the top.
  var navOffset = function () { return nav.offsetHeight + 12; };
  $$('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('href').slice(1);
      var target = id ? document.getElementById(id) : null;
      if (!target) return;
      e.preventDefault();
      var top = id === 'top' ? 0 : target.getBoundingClientRect().top + window.scrollY - navOffset();
      window.scrollTo({ top: Math.max(0, top), behavior: reduce ? 'auto' : 'smooth' });
      if (history.replaceState) history.replaceState(null, '', '#' + id);
    });
  });

  $('#yr').textContent = new Date().getFullYear();

  /* ---------------- local time in the footer ---------------- */
  var lt = $('#localtime');
  if (lt && window.Intl) {
    var fmt = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' });
    var tickTime = function () { lt.textContent = 'Gurugram · ' + fmt.format(new Date()) + ' IST'; };
    tickTime();
    setInterval(tickTime, 30000);
  }

  /* ---------------- scroll progress ---------------- */
  var prog = $('#prog');
  var tickProgress = function () {
    var max = document.documentElement.scrollHeight - window.innerHeight;
    prog.style.transform = 'scaleX(' + (max > 0 ? window.scrollY / max : 0) + ')';
  };
  tickProgress();
  window.addEventListener('scroll', tickProgress, { passive: true });
  window.addEventListener('resize', tickProgress);

  /* ---------------- copy email ---------------- */
  $$('.copy-btn').forEach(function (btn) {
    var text = btn.dataset.copy;
    var done = function () {
      btn.textContent = 'Copied';
      btn.classList.add('done');
      setTimeout(function () { btn.textContent = 'Copy'; btn.classList.remove('done'); }, 1600);
    };
    var fallback = function () {
      var ta = document.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', '');
      ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); done(); } catch (e) { /* leave the button as it was */ }
      ta.remove();
    };
    btn.addEventListener('click', function () {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, fallback);
      } else fallback();
    });
  });

  /* ---------------- accordion ---------------- */
  var panelsReady = false;

  function setPanel(panel, open, instant) {
    if (animate && !instant) {
      gsap.to(panel, {
        height: open ? 'auto' : 0,
        duration: open ? 0.55 : 0.4,
        ease: open ? 'power3.out' : 'power3.in',
        onComplete: function () { if (window.ScrollTrigger) ScrollTrigger.refresh(); }
      });
    } else {
      panel.style.height = open ? 'auto' : '0px';
    }
  }

  $$('#roles .role').forEach(function (role) {
    var head = $('.role-head', role);
    var panel = $('.role-panel', role);
    setPanel(panel, role.classList.contains('is-open'), true);

    head.addEventListener('click', function () {
      var willOpen = !role.classList.contains('is-open');

      // One open at a time keeps the list scannable. A panel collapsing ABOVE the
      // tapped role would shift the whole page up under the reader's thumb (Safari
      // has no scroll anchoring), so those close instantly and the scroll position
      // is moved by exactly the same amount in the same frame: no visible jump.
      var keep = head.getBoundingClientRect().top;
      var collapsedAbove = false;
      $$('#roles .role.is-open').forEach(function (other) {
        if (other === role) return;
        var otherPanel = $('.role-panel', other);
        var isAbove = !!(other.compareDocumentPosition(role) & Node.DOCUMENT_POSITION_FOLLOWING);
        collapsedAbove = collapsedAbove || isAbove;
        other.classList.remove('is-open');
        $('.role-head', other).setAttribute('aria-expanded', 'false');
        setPanel(otherPanel, false, isAbove || !panelsReady);
      });
      if (collapsedAbove) {
        // reading the rect forces layout, so this is the heading's real new position
        var drift = head.getBoundingClientRect().top - keep;
        if (drift) window.scrollTo({ top: Math.max(0, window.scrollY + drift), behavior: 'auto' });
      }

      role.classList.toggle('is-open', willOpen);
      head.setAttribute('aria-expanded', String(willOpen));
      setPanel(panel, willOpen, !panelsReady);
    });
  });
  panelsReady = true;

  /* ---------------- capability filter ---------------- */
  var skills = $$('#skills .skill');
  var skillsWrap = $('#skills');
  var emptyNote = null;

  $$('#filters .chip').forEach(function (chip) {
    chip.addEventListener('click', function () {
      var f = chip.dataset.f;

      $$('#filters .chip').forEach(function (c) {
        var on = c === chip;
        c.classList.toggle('is-on', on);
        c.setAttribute('aria-pressed', String(on));
      });

      var shown = 0;
      var visible = [];
      skills.forEach(function (s) {
        var match = f === 'all' || s.dataset.c === f;
        if (match) { shown++; visible.push(s); }
        // a class, not an inline style: GSAP writes inline transform resets onto
        // these elements and any selector reading the style attribute would collide
        s.classList.toggle('is-off', !match);
      });

      if (animate) {
        gsap.fromTo(visible,
          { opacity: 0, y: 10 },
          { opacity: 1, y: 0, duration: 0.34, stagger: 0.02, ease: 'power2.out', overwrite: true });
      }

      // filtering changes the section height, which moves every trigger below it
      if (window.ScrollTrigger) requestAnimationFrame(function () { ScrollTrigger.refresh(); });

      if (!shown) {
        if (!emptyNote) {
          emptyNote = document.createElement('p');
          emptyNote.className = 'cap-empty';
          emptyNote.textContent = 'Nothing in that group yet.';
          skillsWrap.parentNode.insertBefore(emptyNote, skillsWrap.nextSibling);
        }
      } else if (emptyNote) {
        emptyNote.remove();
        emptyNote = null;
      }
    });
  });

  /* ---------------- analyst <-> creative dial ----------------
     Drives the page accent continuously and swaps the copy at thirds.
     Built on a real <input type=range> so arrow keys and screen readers work.
     setDial is exposed so the scroll choreography below can drive it too. */
  var setDial = null;
  var dial = $('#dial');
  if (dial) {
    var dialWrap = $('.dial');
    var dialLine = $('#dialLine'), dialProof = $('#dialProof');
    var labA = $('#labA'), labB = $('#labB');

    // three stops so the resting state (centre) is the signature fuchsia:
    // cool analyst blue on the left, warm coral on the right.
    var STOP_A = [76, 125, 255], STOP_MID = [255, 46, 136], STOP_B = [255, 122, 61];

    var COPY = [
      { line: 'I read <i>the numbers</i> first.',
        proof: ['<strong>2 yrs 8 mos at Accenture:</strong> dashboards, stakeholder reporting, SLA delivery',
                '<strong>Consumer behaviour and segmentation:</strong> who is actually buying, and why',
                '<strong>GA4, Power BI, Postgres:</strong> the numbers read first-hand, not second-hand'] },
      { line: 'I do both, <i>in the same brief.</i>',
        proof: ['<strong>2 yrs 8 mos at Accenture:</strong> dashboards, stakeholder reporting, SLA delivery',
                '<strong>Campaign concepts for couture drops:</strong> collection stories turned into launches',
                '<strong>A Postgres content model and a live CMS:</strong> strategy through to production'] },
      { line: 'Then I make people <i>feel something.</i>',
        proof: ['<strong>Campaign concepts for couture drops:</strong> collection stories turned into launches',
                '<strong>Reels-first content direction:</strong> built for how the audience actually watches',
                '<strong>Brand storytelling in three languages:</strong> English, Hindi, French'] }
    ];

    var shown = -1;
    var applyDial = function () {
      var v = dial.value / 100;

      var from = v < 0.5 ? STOP_A : STOP_MID;
      var to   = v < 0.5 ? STOP_MID : STOP_B;
      var t    = v < 0.5 ? v / 0.5 : (v - 0.5) / 0.5;
      var c = from.map(function (a, i) { return Math.round(a + (to[i] - a) * t); });
      document.documentElement.style.setProperty('--fuchsia', 'rgb(' + c.join(',') + ')');
      // the contact section sits on bone, so its accent is darkened to stay above 4.5:1
      var deep = c.map(function (n) { return Math.round(n * 0.62); });
      document.documentElement.style.setProperty('--fuchsia-dp', 'rgb(' + deep.join(',') + ')');

      labA.classList.toggle('on', v < 0.34);
      labB.classList.toggle('on', v > 0.66);

      var idx = v < 0.34 ? 0 : (v > 0.66 ? 2 : 1);
      if (idx === shown) return;
      shown = idx;

      var next = COPY[idx];
      dialLine.style.opacity = 0;
      dialLine.style.transform = 'translateY(8px)';
      setTimeout(function () {
        dialLine.innerHTML = next.line;
        dialProof.innerHTML = next.proof.map(function (p) { return '<li>' + p + '</li>'; }).join('');
        dialLine.style.opacity = 1;
        dialLine.style.transform = 'none';
      }, reduce ? 0 : 180);
    };
    dial.addEventListener('input', applyDial);
    applyDial();

    setDial = function (v) { dial.value = Math.round(v); applyDial(); };
  }

  /* ---------------- everything below needs GSAP ---------------- */
  if (!animate) { if (dial) $('.dial').classList.add('ready'); return; }

  /* hero: split the name into characters and lift them in */
  $$('[data-split]').forEach(function (el) {
    var text = el.textContent;
    el.textContent = '';
    text.split('').forEach(function (ch) {
      var s = document.createElement('span');
      s.className = 'ch';
      s.textContent = ch;
      el.appendChild(s);
    });
  });
  $$('.hero-name .ln').forEach(function (l) { l.setAttribute('aria-hidden', 'true'); });

  var intro = gsap.timeline({ defaults: { ease: 'expo.out' } });
  intro
    .from('.hero-eyebrow', { opacity: 0, y: 14, duration: 0.7 })
    .from('.hero-name .ch', { yPercent: 118, duration: 1.05, stagger: 0.028 }, '-=0.35')
    .from('#hrule', { scaleX: 0, duration: 1.1 }, '-=0.6')
    .from('.hero-portrait', { opacity: 0, y: 34, duration: 0.9 }, '-=0.8')
    .from('.hero-lede', { opacity: 0, y: 20, duration: 0.75 }, '-=0.75')
    .from('.hero .field', { opacity: 0, y: 14, duration: 0.55, stagger: 0.06 }, '-=0.55')
    .from('.hero .cta-row', { opacity: 0, y: 16, duration: 0.6 }, '-=0.35');

  /* ambient glow trails the pointer across the hero */
  var glow = $('#glow'), hero = $('.hero');
  if (glow && isDesktop()) {
    gsap.set(glow, { xPercent: -50, yPercent: -50, left: '38%', top: '46%' });
    var gx = gsap.quickTo(glow, 'x', { duration: 1.1, ease: 'power3.out' });
    var gy = gsap.quickTo(glow, 'y', { duration: 1.1, ease: 'power3.out' });
    hero.addEventListener('mousemove', function (e) {
      var r = hero.getBoundingClientRect();
      gx((e.clientX - r.left) - r.width * 0.38);
      gy((e.clientY - r.top) - r.height * 0.46);
    });
  }

  /* hero letters lean toward the cursor */
  var nameEl = $('.hero-name');
  if (nameEl && finePointer) {
    var chars = $$('.hero-name .ch').map(function (c) {
      return { el: c,
               y: gsap.quickTo(c, 'y', { duration: 0.6, ease: 'power3.out' }),
               sx: gsap.quickTo(c, 'skewX', { duration: 0.6, ease: 'power3.out' }) };
    });
    nameEl.addEventListener('mousemove', function (e) {
      chars.forEach(function (c) {
        var r = c.el.getBoundingClientRect();
        var pull = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / 260));
        var near = Math.max(0, 1 - Math.abs(pull));
        c.y(-18 * near);
        c.sx(-7 * pull * near);
      });
    });
    nameEl.addEventListener('mouseleave', function () {
      chars.forEach(function (c) { c.y(0); c.sx(0); });
    });
  }

  /* intro curtain: hold the hero until it lifts */
  var curtain = document.createElement('div');
  curtain.className = 'curtain';
  curtain.setAttribute('aria-hidden', 'true');
  curtain.innerHTML = '<div class="curtain-in"><div class="curtain-name">Aishani <i>Sharma</i></div><div class="curtain-bar"></div></div>';
  document.body.appendChild(curtain);
  document.body.style.overflow = 'hidden';

  var curtainDone = false;
  var liftCurtain = function () {
    if (curtainDone) return;
    curtainDone = true;
    curtain.remove();
    document.body.style.overflow = '';
    if (intro.paused()) intro.play();
    if (window.ScrollTrigger) ScrollTrigger.refresh();
  };

  intro.pause(0);
  gsap.timeline()
    .to(curtain.querySelector('.curtain-bar'), { scaleX: 1, duration: 0.75, ease: 'power2.inOut' })
    .to(curtain.querySelector('.curtain-in'), { opacity: 0, y: -14, duration: 0.4, ease: 'power2.in' })
    .to(curtain, { yPercent: -100, duration: 0.85, ease: 'expo.inOut', onComplete: liftCurtain }, '-=0.1')
    .add(function () { intro.play(); }, '-=0.55');

  // GSAP runs on requestAnimationFrame, which browsers stall in background tabs.
  // If the curtain has not lifted by itself, drop it: the page must never stay locked.
  setTimeout(liftCurtain, 4000);
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) setTimeout(liftCurtain, 2600);
  });

  /* perspective tilt with a light glare: portrait, ledger, service cards */
  if (finePointer) {
    $$('[data-tilt]').forEach(function (el) {
      var strength = parseFloat(el.dataset.tilt) || 6;
      var glare = el.querySelector('.glare');
      gsap.set(el, { transformPerspective: 900 });
      var rx = gsap.quickTo(el, 'rotationX', { duration: 0.55, ease: 'power3.out' });
      var ry = gsap.quickTo(el, 'rotationY', { duration: 0.55, ease: 'power3.out' });
      var ty = gsap.quickTo(el, 'y', { duration: 0.55, ease: 'power3.out' });
      el.addEventListener('mousemove', function (e) {
        var r = el.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - 0.5;
        var py = (e.clientY - r.top) / r.height - 0.5;
        rx(-py * strength * 2);
        ry(px * strength * 2);
        ty(-4);
        if (glare) glare.style.background =
          'radial-gradient(circle at ' + ((px + 0.5) * 100) + '% ' + ((py + 0.5) * 100) + '%, rgba(255,255,255,.16), transparent 58%)';
      });
      el.addEventListener('mouseleave', function () { rx(0); ry(0); ty(0); });
    });
  }

  /* the stamp leans with the pointer anywhere over the hero */
  var stamp = $('#stamp');
  if (stamp && finePointer && hero) {
    gsap.set(stamp, { transformPerspective: 700 });
    var sx = gsap.quickTo(stamp, 'rotationX', { duration: 0.9, ease: 'power3.out' });
    var sy = gsap.quickTo(stamp, 'rotationY', { duration: 0.9, ease: 'power3.out' });
    hero.addEventListener('mousemove', function (e) {
      var r = hero.getBoundingClientRect();
      sx(-((e.clientY - r.top) / r.height - 0.5) * 34);
      sy(((e.clientX - r.left) / r.width - 0.5) * 34);
    });
    hero.addEventListener('mouseleave', function () { sx(0); sy(0); });
  }

  /* magnetic buttons: pointer devices only, and only on the few focal CTAs */
  if (finePointer) {
    $$('.magnetic').forEach(function (el) {
      var xTo = gsap.quickTo(el, 'x', { duration: 0.45, ease: 'elastic.out(1,0.45)' });
      var yTo = gsap.quickTo(el, 'y', { duration: 0.45, ease: 'elastic.out(1,0.45)' });
      el.addEventListener('mousemove', function (e) {
        var r = el.getBoundingClientRect();
        xTo((e.clientX - r.left - r.width / 2) * 0.28);
        yTo((e.clientY - r.top - r.height / 2) * 0.4);
      });
      el.addEventListener('mouseleave', function () { xTo(0); yTo(0); });
    });
  }

  /* marquees lean with scroll momentum */
  var tracks = $$('.mq-track');
  if (tracks.length) {
    var lastY = window.scrollY, vel = 0;
    var loop = function () {
      var now = window.scrollY;
      vel += ((now - lastY) - vel) * 0.18;
      lastY = now;
      var skew = Math.max(-9, Math.min(9, vel * 0.45));
      gsap.set(tracks, { skewX: skew, scaleX: 1 + Math.min(Math.abs(vel) * 0.0016, 0.05) });
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  if (!window.ScrollTrigger) return;

  /* portrait parallax, decorative layer only */
  gsap.to('#portrait', {
    yPercent: 8, ease: 'none',
    scrollTrigger: { trigger: '.hero-portrait', start: 'top bottom', end: 'bottom top', scrub: true }
  });

  /* ---------------- 3D scroll ----------------
     Content travels through depth tied to the scrollbar: it tilts up out of the
     distance and settles flat as it arrives, and reverses when you scroll back.
     Each element carries its own perspective, so nothing above it is transformed:
     the pinned dial and the sticky process cards are deliberately left out. */
  var deep = isDesktop();
  var arrive = function (targets, extra) {
    $$(targets).forEach(function (el) {
      el.classList.add('d3');
      gsap.fromTo(el,
        { rotationX: deep ? -18 : -11, z: deep ? -160 : -80, y: 28, opacity: 0, transformPerspective: 1100, transformOrigin: '50% 100%' },
        { rotationX: 0, z: 0, y: 0, opacity: 1, ease: 'none',
          scrollTrigger: { trigger: el, start: 'top 100%', end: (extra && extra.end) || 'top 50%', scrub: 0.6 } });
    });
  };

  // section headings arrive first and fast; the title still wipes up out of its mask
  arrive('.sec-head', { end: 'top 62%' });
  $$('.sec-title').forEach(function (el) {
    gsap.from(el, {
      clipPath: 'inset(-20% -5% 100% -5%)', duration: 0.95, ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 88%' }
    });
  });

  // content blocks
  arrive('.thesis-body');
  arrive('#ledger', { end: 'top 46%' });
  arrive('.roles');
  arrive('.filters, .skills');
  arrive('.svc');
  arrive('.creds');
  arrive('.contact-grid');

  // the hero recedes into the distance as you leave it
  var heroEl = $('.hero');
  if (heroEl) {
    gsap.to('.hero-name', {
      rotationX: deep ? 24 : 14, z: deep ? -320 : -140, yPercent: -12, opacity: 0.18,
      transformPerspective: 1100, transformOrigin: '50% 0%', ease: 'none',
      scrollTrigger: { trigger: heroEl, start: 'top top', end: 'bottom 35%', scrub: 0.8 }
    });
    gsap.to('.hero-fig', {
      rotationX: deep ? 12 : 6, z: deep ? -180 : -80, y: 40, opacity: 0.35,
      transformPerspective: 1100, transformOrigin: '50% 0%', ease: 'none',
      scrollTrigger: { trigger: heroEl, start: '40% top', end: 'bottom 20%', scrub: 0.8 }
    });
  }

  // depth field: nearer orbs travel further over the length of the page
  var orbTravel = [-55, -130, -210];
  $$('.orb').forEach(function (orb, i) {
    gsap.to(orb, {
      yPercent: orbTravel[i] || -100, scale: 1 + i * 0.12, ease: 'none',
      scrollTrigger: { trigger: document.body, start: 'top top', end: 'bottom bottom', scrub: 1.2 }
    });
  });

  /* ledger rules draw once it has arrived */
  var ledgerItems = $$('.ledger-item');
  if (ledgerItems.length) {
    ScrollTrigger.create({
      trigger: '#ledger', start: 'top 70%', once: true,
      onEnter: function () { ledgerItems.forEach(function (el) { el.classList.add('in'); }); }
    });
  }

  /* process cards recede as the next one stacks over them */
  var steps = $$('.step');
  steps.forEach(function (card, i) {
    var next = steps[i + 1];
    if (!next) return;
    gsap.to(card, {
      scale: 0.94, rotationX: -5, opacity: 0.45, transformPerspective: 1000, ease: 'none',
      scrollTrigger: { trigger: next, start: 'top bottom-=60', end: 'top top+=160', scrub: true }
    });
  });

  /* stat counters */
  $$('.count').forEach(function (el) {
    var to = parseFloat(el.dataset.to);
    var obj = { v: 0 };
    ScrollTrigger.create({
      trigger: el, start: 'top 92%', once: true,
      onEnter: function () {
        gsap.to(obj, {
          v: to, duration: 1.1, ease: 'power2.out',
          onUpdate: function () { el.textContent = Math.round(obj.v); }
        });
      }
    });
  });

  /* ---------------- the dial drives itself ----------------
     Desktop: the dial pins and scroll scrubs it through pink -> analyst -> creative -> pink,
     so every visitor sees all three states without discovering the drag.
     Mobile: it sweeps once on entry. Either way it stays draggable afterwards. */
  var dialEl = $('.dial');
  if (dialEl && setDial) {
    // a proxy so the value eases toward the scroll target instead of snapping
    var proxy = { v: 50 };
    var pathAt = function (p) {           // scroll progress -> dial value
      if (p < 0.25) return 50 - (p / 0.25) * 50;
      if (p < 0.65) return ((p - 0.25) / 0.40) * 100;
      return 100 - ((p - 0.65) / 0.35) * 50;
    };

    if (isDesktop()) {
      // progress already arrives per frame, and the accent has its own CSS transition,
      // so set directly: an extra tween here lags behind fast scrolling
      ScrollTrigger.create({
        trigger: dialEl, start: 'top 14%', end: '+=130%', pin: true, anticipatePin: 1,
        onUpdate: function (self) { proxy.v = pathAt(self.progress); setDial(proxy.v); },
        onLeave: function () { dialEl.classList.add('ready'); },
        onEnterBack: function () { dialEl.classList.remove('ready'); }
      });
    } else {
      ScrollTrigger.create({
        trigger: dialEl, start: 'top 78%', once: true,
        onEnter: function () {
          var upd = function () { setDial(proxy.v); };
          gsap.timeline({ onComplete: function () { dialEl.classList.add('ready'); } })
            .to(proxy, { v: 0,   duration: 0.9, ease: 'power2.inOut', onUpdate: upd })
            .to(proxy, { v: 100, duration: 1.4, ease: 'power2.inOut', onUpdate: upd }, '+=0.35')
            .to(proxy, { v: 50,  duration: 0.9, ease: 'power2.inOut', onUpdate: upd }, '+=0.35');
        }
      });
    }
  }

  /* Triggers were created in code order, but the pinned dial sits above most of them
     on the page and its pin spacer pushes everything below it down. Sorting by page
     position before refreshing makes every later trigger include that spacer. */
  ScrollTrigger.sort();
  ScrollTrigger.refresh();

  /* fonts and images shift layout: recalc once settled */
  window.addEventListener('load', function () { ScrollTrigger.refresh(); });
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () { ScrollTrigger.refresh(); });
  }
})();
