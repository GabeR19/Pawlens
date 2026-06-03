/* =========================================================
   PAWLENS · client interactions
   ========================================================= */
(() => {
  'use strict';

  /* =========================================================
     SHOPIFY-TODO — fill these in when porting to the store:
       1. Bundle variant IDs  → VARIANTS.single / .popular / .pro
       2. Add-on variant IDs  → ADDON_VARIANTS (keyed by data-title)
       3. Cart drawer trigger → onAddSuccess() (theme-specific open)
       4. Success / error UI  → onAddSuccess() / onAddError()
     Until the PLACEHOLDER_* ids below are replaced with real numeric
     variant ids, addToCart() short-circuits instead of POSTing, so the
     standalone prototype keeps working without a Shopify backend.
     ========================================================= */
  const VARIANTS = {
    single:  'PLACEHOLDER_VARIANT_SINGLE',
    popular: 'PLACEHOLDER_VARIANT_POPULAR',
    pro:     'PLACEHOLDER_VARIANT_PRO',
  };
  const ADDON_VARIANTS = {
    'Extra silicone collar': 'PLACEHOLDER_VARIANT_ADDON_COLLAR',
    'Travel pouch':          'PLACEHOLDER_VARIANT_ADDON_POUCH',
    '2-year warranty':       'PLACEHOLDER_VARIANT_ADDON_WARRANTY',
  };

  /* ---------- year ---------- */
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- nav scroll state ---------- */
  const nav = document.getElementById('nav');
  let lastScrolled = false;
  const onScroll = () => {
    const s = window.scrollY > 8;
    if (s !== lastScrolled) {
      nav.classList.toggle('scrolled', s);
      lastScrolled = s;
    }
  };
  document.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- mobile drawer ---------- */
  const toggle = document.getElementById('navToggle');
  const drawer = document.getElementById('navDrawer');
  if (toggle && drawer) {
    toggle.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      drawer.setAttribute('aria-hidden', open ? 'false' : 'true');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    drawer.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => {
        nav.classList.remove('open');
        drawer.setAttribute('aria-hidden', 'true');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  /* ---------- gallery ---------- */
  const galleryImage = document.getElementById('galleryImage');
  const thumbs = document.querySelectorAll('.thumb');
  thumbs.forEach(t => {
    t.addEventListener('click', () => {
      thumbs.forEach(x => x.classList.remove('active'));
      t.classList.add('active');
      const src = t.dataset.src;
      if (src && galleryImage) {
        galleryImage.style.opacity = '0';
        const tmp = new Image();
        tmp.onload = () => {
          galleryImage.src = src;
          galleryImage.style.opacity = '1';
        };
        tmp.src = src;
      }
      // exit spin mode if user picks a thumb
      hideSpin();
    });
  });

  /* ---------- 360 spin toggle ---------- */
  const spinToggle = document.getElementById('spinToggle');
  const spinVideo = document.getElementById('spinVideo');
  let spinAvailable = false;

  // probe video availability: assume yes; mark unavailable only on real error
  if (spinVideo) {
    spinAvailable = true;
    spinVideo.addEventListener('error', () => {
      spinAvailable = false;
      spinToggle.dataset.disabled = 'true';
    });
    // also handle when the <source> can't be found
    const src = spinVideo.querySelector('source');
    if (src) {
      src.addEventListener('error', () => {
        spinAvailable = false;
        spinToggle.dataset.disabled = 'true';
      });
    }
  }

  function showSpin() {
    if (!spinAvailable) return;
    spinVideo.style.display = 'block';
    galleryImage.style.display = 'none';
    spinToggle.setAttribute('aria-pressed', 'true');
    spinVideo.play().catch(() => {});
  }
  function hideSpin() {
    if (spinVideo.style.display === 'block') {
      spinVideo.pause();
      spinVideo.style.display = 'none';
      galleryImage.style.display = 'block';
      spinToggle.setAttribute('aria-pressed', 'false');
    }
  }
  spinToggle?.addEventListener('click', () => {
    const isOn = spinToggle.getAttribute('aria-pressed') === 'true';
    if (isOn) hideSpin(); else showSpin();
  });

  // drag-to-scrub the spin video
  if (spinVideo) {
    let dragging = false;
    let startX = 0, startTime = 0;
    const dur = () => spinVideo.duration || 5;
    const startDrag = (x) => {
      dragging = true;
      startX = x;
      startTime = spinVideo.currentTime;
      spinVideo.pause();
    };
    const moveDrag = (x) => {
      if (!dragging) return;
      const w = spinVideo.getBoundingClientRect().width;
      const delta = (x - startX) / w;     // -1..1 across element width
      let t = startTime + delta * dur();
      // wrap so it feels infinite
      t = ((t % dur()) + dur()) % dur();
      spinVideo.currentTime = t;
    };
    const endDrag = () => { dragging = false; spinVideo.play().catch(() => {}); };

    spinVideo.addEventListener('mousedown', e => { if (spinVideo.style.display !== 'none') startDrag(e.clientX); });
    window.addEventListener('mousemove', e => moveDrag(e.clientX));
    window.addEventListener('mouseup', endDrag);
    spinVideo.addEventListener('touchstart', e => { if (spinVideo.style.display !== 'none') startDrag(e.touches[0].clientX); }, { passive: true });
    spinVideo.addEventListener('touchmove', e => moveDrag(e.touches[0].clientX), { passive: true });
    spinVideo.addEventListener('touchend', endDrag);
  }

  /* ---------- pricing engine ---------- */
  const bundles = document.querySelectorAll('input[name="bundle"]');
  const addons = document.querySelectorAll('.addon input');
  const ctaPrice = document.getElementById('ctaPrice');
  const financePart = document.getElementById('financePart');
  const stickyPrice = document.getElementById('stickyPrice');
  const stickyName = document.getElementById('stickyName');

  const usd = (n) => '$' + Math.round(n * 100) / 100;

  function computeTotal() {
    let total = 0;
    let bundleName = '';
    bundles.forEach(b => { if (b.checked) { total += parseFloat(b.dataset.price); bundleName = b.dataset.title; } });
    addons.forEach(a => { if (a.checked) total += parseFloat(a.dataset.price); });
    if (ctaPrice) ctaPrice.textContent = usd(total);
    if (stickyPrice) stickyPrice.textContent = usd(total);
    if (stickyName) stickyName.textContent = bundleName || '';
    if (financePart) financePart.textContent = usd(total / 4);
  }
  bundles.forEach(b => b.addEventListener('change', computeTotal));
  addons.forEach(a => a.addEventListener('change', computeTotal));
  computeTotal();

  /* ---------- sticky mobile buy ---------- */
  const stickyBuy = document.getElementById('stickyBuy');
  const buySection = document.getElementById('buy');
  if (stickyBuy && buySection && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        // show sticky when buy section is OUT of view
        stickyBuy.classList.toggle('show', !e.isIntersecting);
      });
    }, { rootMargin: '0px 0px -50% 0px', threshold: 0 });
    io.observe(buySection);
  }

  /* ---------- add to cart → submit the Shopify form ---------- */
  const addForm = document.getElementById('pawlens-add');
  const variantIdInput = document.getElementById('pawlensVariantId');
  // Keep the hidden Shopify variant id in sync with the chosen bundle radio.
  function syncVariantId() {
    const sel = [...bundles].find(b => b.checked);
    if (sel && variantIdInput) variantIdInput.value = sel.value;
  }
  bundles.forEach(b => b.addEventListener('change', syncVariantId));
  syncVariantId();

  document.querySelectorAll('.cta-primary, .sticky-cta').forEach(btn => {
    btn.addEventListener('click', (e) => {
      btn.style.transform = 'scale(0.97)';
      setTimeout(() => { btn.style.transform = ''; }, 140);
      // POST the selected variant to Shopify's cart (replaces the demo event).
      if (addForm) {
        e.preventDefault();
        syncVariantId();
        addForm.submit();
      }
    });
  });

  /* ---------- Shopify cart ---------- */
  function buildLineItems() {
    const items = [];
    const bundleEl = [...bundles].find(b => b.checked);
    if (bundleEl) items.push({ id: VARIANTS[bundleEl.value], quantity: 1 });
    addons.forEach(a => {
      if (!a.checked) return;
      const id = ADDON_VARIANTS[a.dataset.title];
      if (id) items.push({ id, quantity: 1 });
    });
    return items;
  }

  async function addToCart() {
    const items = buildLineItems();
    // Guard: don't POST placeholder ids from the static prototype.
    if (items.some(i => String(i.id).startsWith('PLACEHOLDER'))) {
      console.log('[pawlens] add to cart (placeholder ids — not POSTed)', items);
      return;
    }
    try {
      const res = await fetch('/cart/add.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      });
      if (!res.ok) throw new Error('cart/add.js responded ' + res.status);
      onAddSuccess(await res.json());
    } catch (err) {
      onAddError(err);
    }
  }

  function onAddSuccess(_cart) {
    // SHOPIFY-TODO: open your theme's cart drawer here, e.g.
    //   document.dispatchEvent(new CustomEvent('cart:open'));
  }
  function onAddError(err) {
    console.error('[pawlens] add to cart failed', err);
  }

  /* ---------- cart toast ---------- */
  let toastEl = null;
  let toastTimer = null;
  function showToast(message) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'pawlens-toast';
      toastEl.setAttribute('role', 'status');
      toastEl.setAttribute('aria-live', 'polite');
      (document.querySelector('.pawlens-section') || document.body).appendChild(toastEl);
    }
    toastEl.innerHTML =
      '<svg class="pawlens-toast-tick" viewBox="0 0 24 24" aria-hidden="true">' +
      '<circle cx="12" cy="12" r="11" fill="none" stroke="currentColor" stroke-width="1.6"/>' +
      '<path d="M7 12.5l3 3 7-7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>' +
      '</svg><span></span>';
    toastEl.querySelector('span').textContent = message;
    requestAnimationFrame(() => toastEl.classList.add('show'));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 3000);
  }

  window.addEventListener('pawlens:add-to-cart', e => {
    showToast('Added to cart · ' + (e.detail.total || ''));
    addToCart();
  });

  /* ---------- shipping cutoff micro-copy ---------- */
  const shipCutoff = document.querySelector('.ship-cutoff');
  if (shipCutoff) {
    const cutoffText = shipCutoff.querySelector('.ship-cutoff-text');
    const cutoffHour = parseInt(shipCutoff.dataset.cutoffHour, 10) || 15;
    let cutoffTimer = null;
    const renderCutoff = () => {
      const now = new Date();
      const cutoff = new Date(now);
      cutoff.setHours(cutoffHour, 0, 0, 0);
      if (now >= cutoff) {
        if (cutoffText) cutoffText.textContent = 'Order today — ships tomorrow morning';
        if (cutoffTimer) { clearInterval(cutoffTimer); cutoffTimer = null; }
        return;
      }
      const mins = Math.ceil((cutoff - now) / 60000);
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      const within = (h > 0 ? h + 'h ' : '') + m + 'm';
      if (cutoffText) cutoffText.textContent = 'Ships today if you order within ' + within;
    };
    renderCutoff();
    cutoffTimer = setInterval(renderCutoff, 60000);
  }

  // Real-footage sound toggle
  const rfVid = document.querySelector('.real-footage-video');
  const rfBtn = document.querySelector('.real-footage-sound');
  if (rfVid && rfBtn) {
    const iconMuted = rfBtn.querySelector('.rf-icon-muted');
    const iconOn = rfBtn.querySelector('.rf-icon-on');
    rfBtn.addEventListener('click', () => {
      rfVid.muted = !rfVid.muted;
      const on = !rfVid.muted;
      iconMuted.style.display = on ? 'none' : '';
      iconOn.style.display = on ? '' : 'none';
      if (on) rfVid.play().catch(() => {});
    });
  }

  // Fade out the floating demo button while the footage section is on screen
  const demoFab = document.querySelector('.demo-fab');
  const demoSection = document.getElementById('demo');
  if (demoFab && demoSection && 'IntersectionObserver' in window) {
    const fabObserver = new IntersectionObserver(
      entries => entries.forEach(e => demoFab.classList.toggle('is-hidden', e.isIntersecting)),
      { threshold: 0.25 }
    );
    fabObserver.observe(demoSection);
  }

})();
