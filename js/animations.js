(function () {
  const qs = (sel) => document.querySelector(sel);
  const qsa = (sel) => Array.from(document.querySelectorAll(sel));
  const rand = Math.random;

  // 1. Opening sinematik: dimulai dari app.js setelah gambar hero + font siap (lihat bagian "opening" di app.js)

  // 2. Partikel Kelopak Bunga Jatuh
  const petalBox = qs('#petals');
  if (petalBox) {
    for (let i = 0, N = document.documentElement.classList.contains('ios') ? 8 : 18; i < N; i++) {
      const p = document.createElement('div');
      p.className = 'petal';
      const x = (rand() * 100).toFixed(1);
      const s = (10 + rand() * 10).toFixed(1);
      const f = (9 + rand() * 9).toFixed(1);
      const w = (3 + rand() * 3).toFixed(1);
      const dl = (-rand() * 16).toFixed(1);
      const c = ['#AF8741', '#DBC7AC', '#7993AC'][Math.floor(rand() * 3)];
      const sw = (20 + rand() * 30).toFixed(1);
      p.style.cssText = `--x:${x}%;--s:${s}px;--f:${f}s;--w:${w}s;--dl:${dl}s;--c:${c};--sw:${sw}px`;
      p.innerHTML = '<i></i>';
      petalBox.appendChild(p);
    }
  }

  // 3. Kilau Cahaya (Sparkles) pada Kartu Gelap
  qsa('[data-sp]').forEach((sec) => {
    if (!sec.style.position) sec.style.position = 'relative';
    for (let i = 0; i < 16; i++) {
      const sp = document.createElement('span');
      sp.className = 'sp';
      sp.textContent = rand() < 0.4 ? '\u2726' : '\u2022';
      const left = (rand() * 100).toFixed(1);
      const top = (rand() * 100).toFixed(1);
      const size = (8 + rand() * 10).toFixed(1);
      const delay = (rand() * 4).toFixed(2);
      const dur = (2.5 + rand() * 3).toFixed(2);
      sp.style.cssText = `left:${left}%;top:${top}%;font-size:${size}px;animation-delay:${delay}s;animation-duration:${dur}s`;
      sec.appendChild(sp);
    }
  });

  // 4. Scroll Reveal Bertahap (Staggered Entrance)
  qsa('section').forEach((sec) => {
    sec.querySelectorAll('.rv').forEach((el, idx) => {
      el.style.setProperty('--d', String(Math.min(idx, 8)));
    });
  });

  const revealObserver = 'IntersectionObserver' in window
    ? new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in');
            revealObserver.unobserve(entry.target);
          }
        });
      }, { threshold: 0.15 })
    : null;

  qsa('.rv').forEach((el) => {
    if (revealObserver) revealObserver.observe(el);
    else el.classList.add('in');
  });

  // 5. Animasi Amplop RSVP Terbuka Saat di-Scroll
  const env = qs('#env');
  const card = qs('.env-card');
  const fitEnvelope = () => {
    if (env && card) {
      env.style.height = (card.offsetHeight + 60) + 'px';
    }
  };

  if (env && 'IntersectionObserver' in window) {
    const envObserver = new IntersectionObserver((entries, obs) => {
      if (entries[0].isIntersecting) {
        obs.disconnect();
        setTimeout(() => {
          env.classList.add('open');
          fitEnvelope();
          window.addEventListener('resize', fitEnvelope);
          if ('ResizeObserver' in window && card) {
            new ResizeObserver(fitEnvelope).observe(card);
          }
        }, 300);
      }
    }, { threshold: 0.35 });
    envObserver.observe(env);
  } else if (env) {
    env.classList.add('open');
    fitEnvelope();
  }

  // 6. Galeri Polaroid Carousel Interaktif
  const car = qs('#car');
  if (car) {
    const updateCarousel = () => {
      const box = car.getBoundingClientRect();
      const mid = box.left + box.width / 2;
      const items = Array.from(car.children);
      let bestIdx = 0;
      let bestDist = Infinity;

      items.forEach((item, i) => {
        const rect = item.getBoundingClientRect();
        const dist = Math.abs(rect.left + rect.width / 2 - mid);
        if (dist < bestDist) {
          bestDist = dist;
          bestIdx = i;
        }
      });

      items.forEach((item, i) => {
        item.className = 'pol' + (i === bestIdx ? ' c' : i < bestIdx ? ' l' : ' r');
      });
    };

    car.addEventListener('scroll', () => requestAnimationFrame(updateCarousel), { passive: true });
    window.addEventListener('resize', updateCarousel);
    updateCarousel();
  }
})();