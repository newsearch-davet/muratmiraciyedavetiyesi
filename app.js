/* Miraciye & Murat — original invitation. No trackers or external runtime dependencies. */
(() => {
  'use strict';
  const config = window.INVITATION;
  if (!config) {
    document.documentElement.classList.remove('js');
    return;
  }
  const $ = (selector) => document.querySelector(selector);
  const gate = $('#gate');
  const invitation = $('#invitation');
  const scenes = [...document.querySelectorAll('.scene')];
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const audio = $('#background-music');
  const musicToggle = $('#music-toggle');
  const calendar = $('#calendar-dialog');
  const liveButterflies = $('#butterflies');
  let opened = false;
  let opening = false;
  let activeScene = 0;
  let sceneObserver;
  let openingTimer;
  let butterflyTimer;
  let toastTimer;
  let clockTimer;
  let scrollFrame = 0;
  let musicStarting = false;
  let resumeMusic = false;

  const publicUrl = config.publicUrl.replace(/\/$/, '');
  const targetTime = new Date(`${config.date}T${config.startTime}:00${config.utcOffset}`).getTime();
  const endTime = new Date(`${config.date}T${config.endTime}:00${config.utcOffset}`).getTime();
  const pad = (value) => String(value).padStart(2, '0');

  function toast(message) {
    clearTimeout(toastTimer);
    const box = $('#toast');
    box.textContent = message;
    box.classList.add('is-visible');
    toastTimer = setTimeout(() => box.classList.remove('is-visible'), 3400);
  }

  function setLocked(value) {
    document.body.classList.toggle('is-locked', value);
    invitation.inert = value;
    if (value) invitation.setAttribute('aria-hidden', 'true');
    else invitation.removeAttribute('aria-hidden');
  }

  function markScene(index) {
    activeScene = index;
    $('#scene-current').textContent = pad(index + 1);
    $('#scene-current').parentElement.setAttribute('aria-label', `${scenes.length} bölümden ${index + 1}: ${scenes[index].dataset.scene}`);
    $('#scroll-label').textContent = index === scenes.length - 1 ? 'Başa dön' : 'Aşağı kaydır';
    $('#next-scene').classList.toggle('is-last', index === scenes.length - 1);
  }

  function setupScenes() {
    scenes.forEach((scene) => {
      scene.querySelectorAll('.reveal').forEach((node, i) => {
        node.style.setProperty('--reveal-delay', `${Math.min(i * .09, .5)}s`);
      });
    });
    if (!('IntersectionObserver' in window)) {
      scenes.forEach((scene) => scene.classList.add('is-visible'));
      return;
    }
    sceneObserver = new IntersectionObserver((entries) => {
      if (!opened) return;
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          if (entry.intersectionRatio >= .4) markScene(scenes.indexOf(entry.target));
        }
      }
    }, { threshold: [.15, .4, .6] });
    scenes.forEach((scene) => sceneObserver.observe(scene));
  }

  function makeButterfly(className, index) {
    const item = document.createElement('span');
    item.className = `butterfly ${className}`;
    const left = document.createElement('span');
    left.className = 'wing wing--left';
    const right = document.createElement('span');
    right.className = 'wing wing--right';
    item.append(left, right);
    const size = className === 'is-burst' ? 38 + (index % 4) * 15 : 34 + index * 8;
    item.style.setProperty('--size', `${size}px`);
    if (className === 'is-burst') {
      const angle = (index / 9) * Math.PI * 2 + .2;
      const reach = 175 + (index % 3) * 75;
      item.style.setProperty('--end-x', `${Math.cos(angle) * reach}px`);
      item.style.setProperty('--end-y', `${Math.sin(angle) * reach - 180}px`);
      item.style.setProperty('--turn', `${Math.cos(angle) * 42}deg`);
      item.style.setProperty('--duration', `${3.4 + (index % 3) * .3}s`);
      item.style.setProperty('--delay', `${index * .085}s`);
      item.addEventListener('animationend', (event) => {
        if (event.target === item) item.remove();
      }, { once: true });
    } else {
      item.style.setProperty('--duration', `${19 + index * 4}s`);
      item.style.setProperty('--delay', `${index * -6.5}s`);
      item.style.setProperty('--x1', `${index % 2 ? 165 : -180}px`);
      item.style.setProperty('--x2', `${index % 2 ? 75 : -110}px`);
    }
    liveButterflies.append(item);
  }

  function butterflies(burst = false) {
    if (motion.matches) return;
    if (burst) for (let i = 0; i < 9; i++) makeButterfly('is-burst', i);
    else if (!liveButterflies.querySelector('.is-ambient')) {
      for (let i = 0; i < 3; i++) makeButterfly('is-ambient', i);
    }
  }

  function finishOpening() {
    clearTimeout(openingTimer);
    opened = true;
    opening = false;
    gate.classList.add('is-gone');
    gate.hidden = true;
    gate.inert = true;
    setLocked(false);
    document.body.classList.add('is-open');
    $('#bottom-tools').hidden = false;
    scenes[0].classList.add('is-visible');
    markScene(0);
    invitation.focus({ preventScroll: true });
    butterflies();
  }

  function openInvitation(skip = false) {
    if (opened) return;
    if (opening && !skip) return;
    if (skip || motion.matches) {
      finishOpening();
      return;
    }
    opening = true;
    gate.classList.add('is-opening');
    setTimeout(() => {
      scenes[0].classList.add('is-visible');
      butterflies(true);
    }, 650);
    openingTimer = setTimeout(finishOpening, 2250);
    // A backgrounded tab must never leave the invitation permanently locked.
  }

  function replay() {
    clearTimeout(openingTimer);
    clearTimeout(butterflyTimer);
    opened = false;
    opening = false;
    if (calendar.open) calendar.close();
    setLocked(true);
    window.scrollTo({ top: 0, behavior: 'instant' });
    document.body.classList.remove('is-open');
    $('#bottom-tools').hidden = true;
    scenes.forEach((scene) => scene.classList.remove('is-visible'));
    liveButterflies.replaceChildren();
    gate.inert = false;
    gate.hidden = false;
    gate.classList.remove('is-gone', 'is-opening');
    markScene(0);
    $('#open-invitation').focus({ preventScroll: true });
  }

  function updateCountdown() {
    const now = Date.now();
    const difference = Math.max(0, Math.ceil((targetTime - now) / 1000));
    $('#count-days').textContent = String(Math.floor(difference / 86400));
    $('#count-hours').textContent = pad(Math.floor(difference / 3600) % 24);
    $('#count-minutes').textContent = pad(Math.floor(difference / 60) % 60);
    $('#count-seconds').textContent = pad(difference % 60);
    if (now >= endTime) {
      $('#count-title').textContent = 'Güzel anılarımıza';
      $('#count-message').textContent = 'Mutluluğumuzu paylaştığınız için teşekkür ederiz.';
    } else if (now >= targetTime) {
      $('#count-title').textContent = 'Bugün bizim günümüz';
      $('#count-message').textContent = 'Beklediğimiz an geldi. Birlikte, bir ömür…';
    }
  }

  function startClock() {
    clearInterval(clockTimer);
    updateCountdown();
    if (!document.hidden) clockTimer = setInterval(updateCountdown, 1000);
  }

  function musicState() {
    const playing = !audio.paused && !audio.ended;
    musicToggle.setAttribute('aria-pressed', String(playing));
    const label = playing ? 'Fon müziğini kapat' : 'Fon müziğini aç';
    musicToggle.setAttribute('aria-label', label);
    musicToggle.title = label;
  }

  async function toggleMusic() {
    if (musicStarting) return;
    if (!audio.paused) {
      resumeMusic = false;
      audio.pause();
      return;
    }
    musicStarting = true;
    try {
      if (!audio.getAttribute('src')) audio.src = config.music.src;
      audio.volume = .55;
      await audio.play();
      toast('Fon müziği açıldı');
    } catch {
      musicState();
      toast('Müzik başlatılamadı. Yeniden dokunarak deneyebilirsiniz.');
    } finally {
      musicStarting = false;
    }
  }

  function configureLinks() {
    const names = `${config.bride} & ${config.groom}`;
    const text = `${names}\nDüğünümüze davetlisiniz.\n22 Kasım 2026, Pazar\n${config.startTime}–${config.endTime} · Nikâh ${config.ceremonyTime}\n\n${publicUrl}/`;
    $('#whatsapp-link').href = `https://wa.me/?text=${encodeURIComponent(text)}`;
    const stamp = (value) => new Date(value).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const params = new URLSearchParams({
      action: 'TEMPLATE', text: `${names} · Düğün`,
      dates: `${stamp(targetTime)}/${stamp(endTime)}`,
      ctz: config.timeZone,
      details: `Düğünümüze davetlisiniz. Nikâh: ${config.ceremonyTime}.\n${publicUrl}/`
    });
    if (config.venue.name || config.venue.address) params.set('location', [config.venue.name, config.venue.address].filter(Boolean).join(', '));
    $('#google-calendar').href = `https://calendar.google.com/calendar/render?${params}`;
    const venue = config.venue;
    if (venue.name || venue.address || venue.mapsUrl) {
      $('#venue-name').textContent = venue.name || 'Buluşma yerimiz';
      $('#venue-address').textContent = venue.address || 'Konuma ulaşmak için haritayı açabilirsiniz.';
      let mapsUrl = '';
      if (venue.mapsUrl) {
        try {
          const url = new URL(venue.mapsUrl);
          if (url.protocol === 'https:' && /(^|\.)(google\.com|maps\.app\.goo\.gl|goo\.gl)$/.test(url.hostname)) mapsUrl = url.href;
        } catch { /* Invalid links remain hidden. */ }
      }
      if (!mapsUrl && (venue.address || venue.name)) mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([venue.name, venue.address].filter(Boolean).join(', '))}`;
      if (mapsUrl) {
        $('#maps-link').href = mapsUrl;
        $('#maps-link').hidden = false;
        $('#venue-pending').hidden = true;
      }
    }
    const phone = config.rsvp.whatsapp.replace(/[\s()+-]/g, '');
    if (/^[1-9]\d{9,14}$/.test(phone)) {
      const link = $('#rsvp-link');
      link.href = `https://wa.me/${phone}?text=${encodeURIComponent(`${names} düğünü için katılım durumumu bildirmek istiyorum.`)}`;
      link.hidden = false;
    }
  }

  async function copyLink() {
    const text = `${publicUrl}/`;
    try {
      if (!navigator.clipboard || !window.isSecureContext) throw new Error('clipboard unavailable');
      await navigator.clipboard.writeText(text);
      toast('Davetiye bağlantısı kopyalandı');
    } catch {
      const field = document.createElement('textarea');
      field.value = text;
      field.setAttribute('readonly', '');
      field.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0';
      document.body.append(field);
      field.select();
      field.setSelectionRange(0, text.length);
      const copied = document.execCommand('copy');
      field.remove();
      if (copied) toast('Davetiye bağlantısı kopyalandı');
      else if (navigator.share) {
        try { await navigator.share({ title: `${config.bride} & ${config.groom}`, url: text }); }
        catch (error) { if (error.name !== 'AbortError') toast('Bağlantıyı tarayıcının paylaş menüsünden paylaşabilirsiniz.'); }
      } else toast('Bağlantıyı tarayıcının adres çubuğundan kopyalayabilirsiniz.');
    }
  }

  function onScroll() {
    if (!opened || scrollFrame) return;
    scrollFrame = requestAnimationFrame(() => {
      scrollFrame = 0;
      const position = window.scrollY;
      if (!motion.matches) document.documentElement.style.setProperty('--parallax', `${Math.sin(position / 750) * 16}px`);
      // Nearest section center also supports short landscape viewports.
      let nearest = 0;
      let distance = Infinity;
      const center = window.innerHeight * .5;
      scenes.forEach((scene, index) => {
        const rect = scene.getBoundingClientRect();
        const delta = Math.abs(rect.top + rect.height / 2 - center);
        if (delta < distance) { distance = delta; nearest = index; }
        if (rect.bottom > 0 && rect.top < window.innerHeight) scene.classList.add('is-visible');
      });
      if (nearest !== activeScene) markScene(nearest);
    });
  }

  $('#open-invitation').addEventListener('click', () => openInvitation());
  $('#open-caption').addEventListener('click', () => openInvitation());
  $('#skip-intro').addEventListener('click', () => openInvitation(true));
  $('#replay').addEventListener('click', replay);
  $('#next-scene').addEventListener('click', () => {
    const next = activeScene === scenes.length - 1 ? 0 : activeScene + 1;
    scenes[next].scrollIntoView({ behavior: motion.matches ? 'instant' : 'smooth', block: 'start' });
  });
  musicToggle.addEventListener('click', toggleMusic);
  for (const event of ['play', 'pause', 'ended', 'error']) audio.addEventListener(event, musicState);
  audio.addEventListener('error', () => {
    if (audio.getAttribute('src')) toast('Müzik şu anda yüklenemiyor. Davetiyeyi gezmeye devam edebilirsiniz.');
  });
  document.querySelectorAll('[data-calendar]').forEach((button) => button.addEventListener('click', () => {
    if (typeof calendar.showModal === 'function') calendar.showModal();
    else window.open($('#google-calendar').href, '_blank', 'noopener,noreferrer');
  }));
  $('#close-calendar').addEventListener('click', () => calendar.close());
  calendar.addEventListener('click', (event) => {
    if (event.target !== calendar) return;
    const rect = calendar.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) calendar.close();
  });
  $('#copy-link').addEventListener('click', copyLink);
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      clearInterval(clockTimer);
      resumeMusic = !audio.paused;
      if (resumeMusic) audio.pause();
      liveButterflies.style.visibility = 'hidden';
      liveButterflies.classList.add('is-paused');
    } else {
      startClock();
      liveButterflies.style.visibility = '';
      liveButterflies.classList.remove('is-paused');
      if (opening) finishOpening();
      if (resumeMusic) {
        resumeMusic = false;
        audio.play().catch(() => { musicState(); });
      }
    }
  });
  window.addEventListener('pagehide', () => { clearInterval(clockTimer); audio.pause(); });
  window.addEventListener('pageshow', () => { startClock(); if (opened) setLocked(false); });
  const onMotionChange = () => {
    liveButterflies.replaceChildren();
    if (motion.matches && opening) finishOpening();
    else if (opened) butterflies();
  };
  if (motion.addEventListener) motion.addEventListener('change', onMotionChange);
  if (!config.music.enabled) musicToggle.hidden = true;
  setLocked(true);
  window.scrollTo({ top: 0, behavior: 'instant' });
  setupScenes();
  configureLinks();
  startClock();
})();
