(async () => {
/* animasi dimuat setelah elemen dinamis dibuat; failsafe: tetap dimuat maks 4,5 dtk walau jaringan/konten lambat */
let animLoaded = false;
const loadAnim = () => { if (animLoaded) return; animLoaded = true; const an = document.createElement('script'); an.src = 'js/animations.js?v=6'; document.body.append(an); };
setTimeout(loadAnim, 4500);
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const get = (o, p) => p.split('.').reduce((a, k) => a == null ? a : a[k], o);
const merge = (a, b) => { for (const k in b) a[k] = b[k] && typeof b[k] === 'object' && !Array.isArray(b[k]) ? merge(a[k] || {}, b[k]) : b[k]; return a; };
const esc = s => String(s ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
/* konten dari Store (localStorage / Appwrite); gagal atau lambat > 4 dtk -> pakai DEFAULT_CONFIG */
let saved = {};
try { saved = await Promise.race([Store.loadConfig(), new Promise(r => setTimeout(() => r({}), 4000))]); } catch (e) { console.warn('Konten tersimpan gagal dimuat:', e); }
const cfg = merge(JSON.parse(JSON.stringify(DEFAULT_CONFIG)), saved || {});
normalizeGift(cfg, saved);
const c = cfg.couple, A = c.order === 'groom' ? 'groom' : 'bride', B = A === 'bride' ? 'groom' : 'bride';
document.title = `Undangan Pernikahan ${c[A + 'Nick']} & ${c[B + 'Nick']}`;
$$('[data-t]').forEach(e => e.textContent = get(cfg, e.dataset.t) ?? '');
$$('[data-names]').forEach(e => e.textContent = `${c[A + 'Nick']} & ${c[B + 'Nick']}`);
$('[data-n=a]').textContent = c[A + 'Nick']; $('[data-n=b]').textContent = c[B + 'Nick'];
$('#wax').textContent = c.monogram; $('#vlabel').textContent = c.monogram;
const params = new URLSearchParams(location.search), guest = (params.get('to') || '').trim().slice(0, 60);
$('#guest').textContent = guest || 'Tamu Undangan';
$('#rName').value = guest; $('#wName').value = guest;
if (cfg.media.heroIllustration) $('.scene').innerHTML = `<img class="lay house" src="${esc(cfg.media.heroIllustration)}" alt="">`;
const VC = '<svg class="cn tl" viewBox="0 0 64 64" aria-hidden="true"><use href="#vc"/></svg><svg class="cn tr" viewBox="0 0 64 64" aria-hidden="true"><use href="#vc"/></svg><svg class="cn bl" viewBox="0 0 64 64" aria-hidden="true"><use href="#vc"/></svg><svg class="cn br" viewBox="0 0 64 64" aria-hidden="true"><use href="#vc"/></svg>', vf = (img, cls = '') => `<div class="vf ${cls}"><div class="vf-in">${img}</div>${VC}</div>`;
$('#profiles').innerHTML = [A, B].map(k => `<article class="prof"><div class="pw rv" data-r="scale">${vf(`<img src="${esc(c[k + 'Photo'])}" alt="${esc(c[k + 'Nick'])}">`)}<img class="rsi a" src="assets/orn-rose-single.webp" alt=""><img class="rsi b" src="assets/orn-rose-single.webp" alt=""></div><h3 class="rv">${esc(c[k + 'Full'])}</h3><p class="rv">${esc(c[k + 'Parents'])}</p></article>`).join('');
const g = (cfg.gallery || []).filter(Boolean);
$('#s1').src = g[0] || c.bridePhoto; $('#s2').src = g[1] || c.groomPhoto;
$('#car').innerHTML = g.map(u => `<figure class="pol">${vf(`<img src="${esc(u)}" alt="" loading="lazy">`)}</figure>`).join('');
$('#cphoto').src = cfg.media.closingPhoto;
$('#maps').href = cfg.event.mapsUrl; $('#ig').href = cfg.media.instagramUrl; $('#tt').href = cfg.media.tiktokUrl;
$('#cds').innerHTML = ['Hari', 'Jam', 'Menit', 'Detik'].map(l => `<div class="cd"><svg viewBox="0 0 80 80"><circle class="bg" cx="40" cy="40" r="34"/><circle class="fg" cx="40" cy="40" r="34"/></svg><div><b>00</b><small>${l}</small></div></div>`).join('');
const tgt = new Date(cfg.event.countdownISO).getTime();
const tick = () => {
  const d = Math.max(0, (isNaN(tgt) ? 0 : tgt) - Date.now()), v = [d / 864e5, d / 36e5 % 24, d / 6e4 % 60, d / 1e3 % 60].map(Math.floor), mx = [30, 24, 60, 60];
  $$('.cd').forEach((e, i) => { const n = e.querySelector('b'), s = String(v[i]).padStart(2, '0'); if (n.textContent !== s) { n.textContent = s; n.classList.remove('tk'); void n.offsetWidth; n.classList.add('tk'); } e.querySelector('.fg').style.strokeDashoffset = 214 * (1 - Math.min(1, v[i] / mx[i])); });
  $('#cdEnd').textContent = d === 0 ? 'Hari bahagia telah tiba.' : '';
};
tick(); setInterval(tick, 1000);
const toast = m => { const t = $('#toast'); t.textContent = m; t.classList.remove('on'); void t.offsetWidth; t.classList.add('on'); };
const stat = () => $('#paxL').style.display = $('[name=status]:checked').value === 'hadir' ? '' : 'none';
$$('[name=status]').forEach(r => r.onchange = stat); stat();
$('#rsvpForm').onsubmit = async e => {
  e.preventDefault(); const f = new FormData(e.target), n = f.get('name').trim(), m = $('#rsvpMsg'); if (!n) return;
  const st = f.get('status'), btn = e.target.querySelector('button[type=submit]'); btn.disabled = true; m.textContent = 'Mengirim...';
  try { await Store.addRsvp({ name: n, status: st, pax: st === 'hadir' ? +f.get('pax') : 0 }); m.textContent = 'Terima kasih, konfirmasi Anda sudah tercatat.'; }
  catch (err) { console.warn(err); m.textContent = 'Gagal mengirim. Coba lagi sebentar lagi.'; }
  btn.disabled = false;
};
const renderW = async () => {
  let l = []; try { l = await Store.listWishes(); } catch (e) { console.warn(e); }
  $('#wishes').innerHTML = l.length ? l.map(w => `<article class="wish"><b>${esc(w.name)}</b><p>${esc(w.msg)}</p><small>${new Date(w.time).toLocaleDateString('id-ID')}</small></article>`).join('') : '<p class="empty">Belum ada ucapan. Jadilah yang pertama.</p>';
};
renderW(); /* tanpa await: ucapan boleh lambat, jangan menahan opening */
$('#wishForm').onsubmit = async e => {
  e.preventDefault(); const f = new FormData(e.target), btn = e.target.querySelector('button[type=submit]'); btn.disabled = true;
  try { await Store.addWish({ name: f.get('name').trim(), msg: f.get('msg').trim() }); e.target.msg.value = ''; await renderW(); const w = $('#wishes').firstElementChild; if (w && w.classList.contains('wish')) w.classList.add('new'); toast('Ucapan terkirim.'); }
  catch (err) { console.warn(err); toast('Gagal mengirim ucapan.'); }
  btn.disabled = false;
};
const accs = (cfg.gift.accounts || []).filter(x => x && (x.accountNumber || '').trim());
$('#banks').innerHTML = accs.length ? accs.map((x, i) => `<div class="bank rv"><b>${esc(x.bankName)}</b><div class="serif acc">${esc(x.accountNumber)}</div><small>a.n. ${esc(x.accountHolder)}</small><button class="btn sm-copy" type="button" data-copy="${i}">Salin Nomor Rekening</button></div>`).join('') : '<p class="empty">Belum ada rekening.</p>';
$('#banks').addEventListener('click', async e => {
  const b = e.target.closest('[data-copy]'); if (!b) return;
  const t = accs[+b.dataset.copy].accountNumber.replace(/\s/g, '');
  try { await navigator.clipboard.writeText(t); } catch (_) { const x = document.createElement('textarea'); x.value = t; document.body.append(x); x.select(); document.execCommand('copy'); x.remove(); }
  b.textContent = 'Tersalin!'; toast('Disalin ke clipboard.'); setTimeout(() => b.textContent = 'Salin Nomor Rekening', 2500);
});
/* ---- musik: file audio, YouTube, atau Spotify (dikenali otomatis dari tautan) ---- */
const vb = $('#vbox'), mb = $('#musicBtn'), mSrc = parseMusic(cfg.media.musicUrl), load = src => new Promise((ok, no) => { const s = document.createElement('script'); s.src = src; s.async = true; s.onload = ok; s.onerror = no; document.head.append(s); });
const player = { playing: false, canMute: true, muted: false, play() {}, pause() {}, toggleMute() {} };
const setPlaying = p => { player.playing = p; vb.classList.toggle('playing', p); mb.textContent = p ? 'Jeda Musik' : 'Putar Musik'; };
if (mSrc.t === 'youtube') {
  let yt, ready = false, want = false;
  window.onYouTubeIframeAPIReady = () => {
    $('#ytBox').innerHTML = '<div id="ytp"></div>';
    yt = new YT.Player('ytp', { width: 200, height: 200, videoId: mSrc.id, playerVars: { controls: 0, loop: 1, playlist: mSrc.id, playsinline: 1, rel: 0, modestbranding: 1 }, events: {
      onReady: () => { ready = true; if (want) yt.playVideo(); },
      onStateChange: e => { if (e.data === 1) setPlaying(true); else if (e.data === 2 || e.data === 0) setPlaying(false); } } });
  };
  load('https://www.youtube.com/iframe_api').catch(() => {});
  Object.assign(player, { play() { want = true; if (ready) yt.playVideo(); }, pause() { want = false; if (ready) yt.pauseVideo(); },
    toggleMute() { if (!ready) return player.muted; ready && yt.isMuted() ? yt.unMute() : yt.mute(); return player.muted = yt.isMuted(); } });
} else if (mSrc.t === 'spotify') {
  let ctl, want = false; const box = $('#spEmbed'); box.hidden = false; player.canMute = false;
  window.onSpotifyIframeApiReady = api => api.createController(box.appendChild(document.createElement('div')), { uri: mSrc.uri, width: '100%', height: 80 }, c => {
    ctl = c; c.addListener('playback_update', e => setPlaying(!e.data.isPaused));
    if (want) c.play(); });
  load('https://open.spotify.com/embed/iframe-api/v1').catch(() => {});
  Object.assign(player, { play() { want = true; if (ctl) ctl.play(); }, pause() { want = false; if (ctl) ctl.pause(); } });
} else {
  const au = $('#audio'); au.src = mSrc.src;
  au.onplay = () => setPlaying(true); au.onpause = () => setPlaying(false);
  Object.assign(player, { play() { au.play().catch(() => {}); }, pause() { au.pause(); }, toggleMute() { return player.muted = au.muted = !au.muted; } });
}
mb.onclick = () => player.playing ? player.pause() : player.play();
$('#open').onclick = () => {
  const hero = $('#hero'), reduce = matchMedia('(prefers-reduced-motion:reduce)').matches;
  $('#open').disabled = true; player.play(); hero.classList.add('opening');
  $('#arrow').classList.add('on'); $('#ctl').classList.add('on');
  /* zoom-in + blur berjalan; scroll mulai di tengah efek supaya mulus tanpa patah */
  setTimeout(() => {
    document.documentElement.classList.remove('locked');
    $('#ayat').classList.add('arrive');
    requestAnimationFrame(() => $('#ayat').scrollIntoView({ behavior: reduce ? 'instant' : 'smooth' }));
  }, reduce ? 0 : 420);
  /* setelah hero di luar layar, kembalikan ke keadaan normal (tak terlihat) */
  setTimeout(() => { hero.classList.add('skip'); hero.classList.remove('opening'); $('#open').disabled = false; setAuto(true); }, reduce ? 300 : 2600);
};
$('#arrow').onclick = () => {
  const n = $$('section').find(x => x.getBoundingClientRect().top > 80);
  n ? n.scrollIntoView({ behavior: 'smooth' }) : scrollTo({ top: 0, behavior: 'smooth' });
};
addEventListener('scroll', () => $('#arrow').classList.toggle('up', innerHeight + scrollY >= document.documentElement.scrollHeight - 40), { passive: true });

/* ---- geser otomatis halaman ---- */
const ab = $('#autoBtn'), SPEED = 38; let auto = false, y = 0, last = 0, hold = 0, raf = 0;
const maxY = () => document.documentElement.scrollHeight - innerHeight;
const typing = () => /^(INPUT|TEXTAREA|SELECT)$/.test((document.activeElement || {}).tagName || '');
const loop = t => {
  raf = 0; if (!auto) return;
  const dt = Math.min(.05, (t - (last || t)) / 1000); last = t;
  if (t < hold || typing() || document.hidden) y = scrollY;
  else { y = Math.min(maxY(), y + SPEED * dt); scrollTo({ top: y, behavior: 'instant' }); if (y >= maxY() - 1) { setAuto(false); return; } }
  raf = requestAnimationFrame(loop);
};
function setAuto(on) {
  auto = on; ab.classList.toggle('run', on); ab.setAttribute('aria-pressed', on);
  ab.setAttribute('aria-label', on ? 'Jeda geser otomatis' : 'Mulai geser otomatis');
  if (on) { y = scrollY; last = 0; if (!raf) raf = requestAnimationFrame(loop); }
}
ab.classList.remove('run'); ab.setAttribute('aria-pressed', 'false'); ab.setAttribute('aria-label', 'Mulai geser otomatis');
ab.onclick = () => { hold = 0; if (auto) setAuto(false); else { if (y >= maxY() - 1 || scrollY >= maxY() - 1) scrollTo({ top: 0, behavior: 'instant' }); setAuto(true); } };
['wheel', 'touchstart', 'pointerdown', 'keydown'].forEach(ev => addEventListener(ev, e => { if (!(e.target.closest && e.target.closest('#ctl'))) hold = performance.now() + 4500; }, { passive: true }));

/* ---- galeri slide otomatis ---- */
const car = $('#car'); let cHold = 0, cVis = false;
if (car) {
  if ('IntersectionObserver' in window) new IntersectionObserver(e => cVis = e[0].isIntersecting, { threshold: .4 }).observe(car);
  ['pointerdown', 'touchstart', 'wheel'].forEach(ev => car.addEventListener(ev, () => cHold = Date.now() + 6000, { passive: true }));
  setInterval(() => {
    const it = [...car.children]; if (!cVis || Date.now() < cHold || it.length < 2) return;
    const b = car.getBoundingClientRect(), mid = b.left + b.width / 2, d = it.map(e => { const r = e.getBoundingClientRect(); return r.left + r.width / 2 - mid; });
    const cur = d.reduce((m, v, i) => Math.abs(v) < Math.abs(d[m]) ? i : m, 0), nx = (cur + 1) % it.length;
    car.scrollBy({ left: d[nx], behavior: 'smooth' });
  }, 3200);
}

/* ---- mute + layar penuh ---- */
const mu = $('#muteBtn'), fs = $('#fsBtn'), de = document.documentElement;
if (!player.canMute) mu.hidden = true;
mu.onclick = () => { const m = player.toggleMute(); mu.classList.toggle('muted', m); mu.setAttribute('aria-label', m ? 'Nyalakan suara musik' : 'Matikan suara musik'); };
const fsOn = () => document.fullscreenElement || document.webkitFullscreenElement, rfs = de.requestFullscreen || de.webkitRequestFullscreen;
if (!rfs) fs.hidden = true;
fs.onclick = () => { try { fsOn() ? (document.exitFullscreen || document.webkitExitFullscreen).call(document) : rfs.call(de); } catch (_) {} };
['fullscreenchange', 'webkitfullscreenchange'].forEach(ev => document.addEventListener(ev, () => { const o = !!fsOn(); fs.classList.toggle('fs', o); fs.setAttribute('aria-label', o ? 'Keluar layar penuh' : 'Layar penuh'); }));
loadAnim();
})();
