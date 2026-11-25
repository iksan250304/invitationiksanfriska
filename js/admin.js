/* Admin undangan. Semua akses data lewat Store (js/store.js); file ini tidak menyentuh localStorage/Appwrite langsung. */
(() => {
const $ = s => document.querySelector(s);
const clone = o => JSON.parse(JSON.stringify(o));
const esc = s => String(s ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
const merge = (a, b) => { for (const k in b) a[k] = b[k] && typeof b[k] === 'object' && !Array.isArray(b[k]) ? merge(a[k] || {}, b[k]) : b[k]; return a; };
const get = p => p.split('.').reduce((a, k) => a == null ? a : a[k], cfg);
const set = (p, v) => { const k = p.split('.'); let o = cfg; while (k.length > 1) o = o[k.shift()]; o[k[0]] = v; };
const toast = m => { const t = $('#toast'); t.textContent = m; t.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('on'), 2200); };
const download = (name, text, type) => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 500); };
const copy = async t => { try { await navigator.clipboard.writeText(t); } catch (_) { const x = document.createElement('textarea'); x.value = t; document.body.append(x); x.select(); document.execCommand('copy'); x.remove(); } toast('Disalin'); };
const fail = (e, m) => { console.error(e); toast(m || e.message || 'Terjadi kesalahan'); };

/* ---------- state ---------- */
let cfg = clone(DEFAULT_CONFIG), tab = 'konten', dirty = false, links = [];
const cache = { rsvp: null, wishes: null };
const markDirty = () => { dirty = true; $('#savebar').hidden = false; };
const clearDirty = () => { dirty = false; $('#savebar').hidden = true; };
addEventListener('beforeunload', e => { if (dirty) { e.preventDefault(); e.returnValue = ''; } });

/* ---------- skema field ---------- */
const GROUPS = [
  ['Mempelai', [['couple.monogram', 'Monogram (contoh W&O)'], ['couple.order', 'Urutan tampil', 'sel'], ['couple.brideNick', 'Nama panggilan wanita'], ['couple.brideFull', 'Nama lengkap wanita'], ['couple.brideParents', 'Orang tua wanita', 'ta'], ['couple.groomNick', 'Nama panggilan pria'], ['couple.groomFull', 'Nama lengkap pria'], ['couple.groomParents', 'Orang tua pria', 'ta']]],
  ['Ayat & kalimat penutup', [['verse.arabic', 'Ayat (Arab)', 'ta'], ['verse.translation', 'Terjemahan', 'ta'], ['verse.source', 'Sumber ayat'], ['closing.quote', 'Kalimat penutup', 'ta']]],
  ['Jadwal & lokasi', [['event.displayDate', 'Tanggal tampilan'], ['event.countdownISO', 'Target countdown', 'dt'], ['event.akadTitle', 'Judul akad'], ['event.akadTime', 'Jam akad'], ['event.resepsiTitle', 'Judul resepsi'], ['event.resepsiTime', 'Jam resepsi'], ['event.venueName', 'Nama venue'], ['event.venueAddress', 'Alamat lengkap', 'ta'], ['event.mapsUrl', 'Tautan Google Maps']]],
  ['Kisah kami', [['story.quote', 'Kutipan', 'ta'], ['story.paragraph1', 'Paragraf 1', 'ta'], ['story.paragraph2', 'Paragraf 2', 'ta'], ['story.badgeText', 'Teks badge']]],
  ['Media sosial', [['media.instagramUrl', 'Instagram'], ['media.tiktokUrl', 'TikTok']]]
];
const PHOTOS = [['couple.bridePhoto', 'Foto mempelai wanita'], ['couple.groomPhoto', 'Foto mempelai pria'], ['media.closingPhoto', 'Foto penutup'], ['media.heroIllustration', 'Ilustrasi hero (kosong = bawaan)']];

/* ---------- komponen ---------- */
const field = ([p, l, t]) => {
  const v = get(p) ?? '';
  if (t === 'ta') return `<label class="f full">${l}<textarea data-p="${p}" rows="3">${esc(v)}</textarea></label>`;
  if (t === 'sel') return `<label class="f">${l}<select data-p="${p}"><option value="bride"${v === 'bride' ? ' selected' : ''}>Wanita dulu</option><option value="groom"${v === 'groom' ? ' selected' : ''}>Pria dulu</option></select></label>`;
  return `<label class="f">${l}<input data-p="${p}" type="${t === 'dt' ? 'datetime-local' : 'text'}" value="${esc(v)}"></label>`;
};
const media = (target, label, v, kind = 'image') => {
  const up = String(v).startsWith('data:');
  const thumb = kind === 'image' ? (v ? `<img src="${esc(v)}" alt="">` : '<span>Kosong</span>') : '<span>♪</span>';
  return `<div class="media"><div class="thumb">${thumb}</div><div class="mfields">
    <label class="f">${label}<input ${target} value="${esc(up ? '' : v)}" placeholder="${up ? '(file terunggah)' : 'URL'}"></label>
    ${kind === 'audio' && v && parseMusic(v).t === 'audio' ? `<audio controls src="${esc(v)}"></audio>` : ''}
    <div class="row"><label class="btn sm">Unggah<input type="file" hidden accept="${kind === 'image' ? 'image/*' : 'audio/*'}" data-kind="${kind}" ${target.replace('data-p', 'data-up').replace('data-g', 'data-gup')}></label>
    ${target.startsWith('data-p') ? `<button class="btn sm ghost" data-clear="${target.slice(8, -1)}">Kosongkan</button>` : ''}</div></div></div>`;
};
const musicInfo = v => {
  const m = parseMusic(v), note = t => `<p class="muted">${t}</p>`;
  if (!v) return note('Belum ada lagu.');
  if (m.t === 'youtube') return note('Terdeteksi: <b>YouTube</b>. Diputar tanpa tampilan video; tombol mute tersedia.');
  if (m.t === 'spotify') return note('Terdeteksi: <b>Spotify</b>. Pemutar Spotify tampil di bagian musik; tamu yang belum login Spotify hanya mendengar cuplikan 30 detik, dan tombol mute tidak tersedia.');
  return note('Terdeteksi: <b>file audio</b>.');
};
const giftCard = () => { const a = cfg.gift.accounts; return card(`Tanda kasih <span class="hint">(${a.length}/${MAX_ACCOUNTS} rekening)</span>`,
  `<p class="muted">Tambah sampai ${MAX_ACCOUNTS} rekening atau e-wallet. Rekening dengan nomor kosong tidak ditampilkan.</p>`
  + (a.map((x, i) => `<div class="acc-row"><div class="row" style="justify-content:space-between"><b>Rekening ${i + 1}</b><span class="row"><button class="btn sm" data-amv="${i}:-1" ${i ? '' : 'disabled'}>↑</button><button class="btn sm" data-amv="${i}:1" ${i < a.length - 1 ? '' : 'disabled'}>↓</button><button class="btn sm danger" data-adel="${i}">Hapus</button></span></div>
    <div class="grid"><label class="f">Bank / E-Wallet<input data-a="${i}.bankName" value="${esc(x.bankName)}"></label><label class="f">Nomor rekening<input data-a="${i}.accountNumber" value="${esc(x.accountNumber)}" inputmode="numeric"></label><label class="f full">Atas nama<input data-a="${i}.accountHolder" value="${esc(x.accountHolder)}"></label></div></div>`).join('') || '<p class="empty">Belum ada rekening.</p>')
  + `<button class="btn" id="aadd" ${a.length >= MAX_ACCOUNTS ? 'disabled' : ''}>+ Tambah rekening</button>`); };
const card = (title, body) => `<div class="card"><h2>${title}</h2>${body}</div>`;

/* ---------- panel ---------- */
const TABS = { konten: 'Konten', foto: 'Foto & Musik', tamu: 'Link Tamu', rsvp: 'RSVP', ucapan: 'Ucapan', setelan: 'Pengaturan' };
const panels = {
  konten: () => GROUPS.map(([t, f]) => card(t, `<div class="grid">${f.map(field).join('')}</div>`)).join('') + giftCard(),
  foto: () => card('Foto', PHOTOS.map(([p, l]) => media(`data-p="${p}"`, l, get(p) || '')).join(''))
    + card('Galeri', `${cfg.gallery.map((u, i) => `<div class="media">${media(`data-g="${i}"`, 'Foto ' + (i + 1), u).replace('<div class="media">', '<div class="media" style="margin:0;flex:1">')}<div class="row"><button class="btn sm" data-gmv="${i}:-1" ${i ? '' : 'disabled'}>↑</button><button class="btn sm" data-gmv="${i}:1" ${i < cfg.gallery.length - 1 ? '' : 'disabled'}>↓</button><button class="btn sm danger" data-gdel="${i}">Hapus</button></div></div>`).join('') || '<p class="empty">Belum ada foto.</p>'}<button class="btn" id="gadd">+ Tambah foto</button>`)
    + card('Musik', `<p class="muted">Tempel tautan <b>YouTube</b> atau <b>Spotify</b>, atau unggah file MP3 (maks ${Math.round(Store.limits.audio / 1e6)} MB).</p>` + media('data-p="media.musicUrl"', 'Tautan atau file lagu', get('media.musicUrl') || '', 'audio') + musicInfo(get('media.musicUrl'))),
  tamu: () => card('Buat link undangan per tamu', `<label class="f">URL halaman undangan<input id="base" value="${esc(new URL('index.html', location.href).href)}"></label>
    <label class="f">Nama tamu (satu per baris)<textarea id="names" rows="5"></textarea></label>
    <label class="f">Template WhatsApp <span class="hint">{nama} {link} {pasangan} {tanggal}</span><textarea data-p="invite.waTemplate" rows="6">${esc(cfg.invite.waTemplate)}</textarea></label>
    <button class="btn primary" id="mk">Buat Link</button>`)
    + (links.length ? card('Hasil', links.map((x, i) => `<div class="item"><span><b>${esc(x.n)}</b><br><small>${esc(x.u)}</small></span><span class="row"><button class="btn sm" data-cl="${i}">Salin Link</button><button class="btn sm" data-cw="${i}">Salin Teks WA</button></span></div>`).join('')) : ''),
  rsvp: () => {
    if (!cache.rsvp) return card('RSVP', '<p class="empty">Memuat…</p>');
    const seen = new Set(), l = cache.rsvp.filter(x => { const k = x.name.toLowerCase(); return seen.has(k) ? false : seen.add(k); }), h = l.filter(x => x.status === 'hadir');
    return card('Ringkasan', `<div class="stats"><div class="stat"><b>${l.length}</b>Konfirmasi</div><div class="stat"><b>${h.length}</b>Hadir</div><div class="stat"><b>${h.reduce((a, x) => a + (+x.pax || 0), 0)}</b>Total tamu</div><div class="stat"><b>${l.length - h.length}</b>Berhalangan</div></div>
      <div class="row"><button class="btn" id="csv">Ekspor CSV</button><button class="btn ghost" data-refresh="rsvp">Muat ulang</button></div>`)
      + card('Daftar', l.length ? `<div class="scroll"><table><tr><th>Nama</th><th>Status</th><th>Tamu</th><th>Waktu</th><th></th></tr>${l.map(x => `<tr><td>${esc(x.name)}</td><td>${esc(x.status)}</td><td>${x.pax}</td><td>${new Date(x.time).toLocaleString('id-ID')}</td><td><button class="btn sm danger" data-rd="${esc(x.id)}">Hapus</button></td></tr>`).join('')}</table></div>` : '<p class="empty">Belum ada data.</p>');
  },
  ucapan: () => !cache.wishes ? card('Ucapan', '<p class="empty">Memuat…</p>')
    : card('Ucapan & doa', `<div class="row"><button class="btn ghost" data-refresh="wishes">Muat ulang</button></div>` + (cache.wishes.map(x => `<div class="item"><span><b>${esc(x.name)}</b><br>${esc(x.msg)}<br><small>${new Date(x.time).toLocaleString('id-ID')}</small></span><button class="btn sm danger" data-wd="${esc(x.id)}">Hapus</button></div>`).join('') || '<p class="empty">Belum ada ucapan.</p>')),
  setelan: () => card('Backend', `<p class="muted">Penyimpanan aktif: <b>${esc(Store.label)}</b>. Ubah di <code>js/config.js</code> (BACKEND.provider). Panduan: <code>SUPABASE_SETUP.md</code> atau <code>APPWRITE_SETUP.md</code>.</p>`)
    + card('Cadangan', `<div class="row"><button class="btn" id="bk">Unduh cadangan JSON</button><label class="btn">Pulihkan dari JSON<input id="rs" type="file" accept=".json" hidden></label></div>`)
    + card('Reset', `<p class="muted">Kembalikan seluruh konten ke nilai default di <code>js/config.js</code>. RSVP dan ucapan tidak dihapus.</p><button class="btn danger" id="reset">Reset konten ke default</button>`)
};
const render = () => {
  $('#tabs').innerHTML = Object.entries(TABS).map(([k, v]) => `<button data-tab="${k}" class="${k === tab ? 'on' : ''}">${v}</button>`).join('');
  $('#panel').innerHTML = panels[tab]();
};
const loadList = async (kind, force) => {
  if (cache[kind] && !force) return;
  cache[kind] = null; if (tab === (kind === 'rsvp' ? 'rsvp' : 'ucapan')) render();
  try { cache[kind] = await (kind === 'rsvp' ? Store.listRsvp() : Store.listWishes()); } catch (e) { cache[kind] = []; fail(e, 'Gagal memuat data'); }
  if (tab === (kind === 'rsvp' ? 'rsvp' : 'ucapan')) render();
};
const go = t => { tab = t; render(); if (t === 'rsvp') loadList('rsvp'); if (t === 'ucapan') loadList('wishes'); };

/* ---------- aksi ---------- */
const upload = async (file, kind, apply) => {
  if (kind === 'audio' && file.size > Store.limits.audio) return toast(`Audio terlalu besar (maks ${Math.round(Store.limits.audio / 1e6)} MB).`);
  toast('Mengunggah…');
  try { apply(await Store.upload(file, kind)); markDirty(); render(); toast('Terunggah. Klik Simpan.'); } catch (e) { fail(e, 'Gagal mengunggah'); }
};
document.addEventListener('input', e => {
  const t = e.target, p = t.dataset.p, g = t.dataset.g, ac = t.dataset.a;
  if (ac) { const [i, k] = ac.split('.'); cfg.gift.accounts[+i][k] = t.value; } else if (p) set(p, t.value); else if (g != null) cfg.gallery[+g] = t.value; else return;
  markDirty();
});
document.addEventListener('change', e => {
  const t = e.target, f = t.files && t.files[0]; if (!f) return;
  if (t.id === 'rs') return restore(f, t);
  if (t.dataset.up) upload(f, t.dataset.kind, u => set(t.dataset.up, u));
  else if (t.dataset.gup != null) upload(f, 'image', u => cfg.gallery[+t.dataset.gup] = u);
  t.value = '';
});
document.addEventListener('click', async e => {
  const t = e.target.closest('button,a,label'); if (!t) return; const d = t.dataset;
  try {
    if (d.tab) go(d.tab);
    else if (d.clear) { set(d.clear, ''); markDirty(); render(); }
    else if (t.id === 'gadd') { cfg.gallery.push(''); markDirty(); render(); }
    else if (t.id === 'aadd') { if (cfg.gift.accounts.length < MAX_ACCOUNTS) { cfg.gift.accounts.push({ bankName: '', accountNumber: '', accountHolder: '' }); markDirty(); render(); } }
    else if (d.adel != null) { cfg.gift.accounts.splice(+d.adel, 1); markDirty(); render(); }
    else if (d.amv) { const [i, s] = d.amv.split(':').map(Number), a = cfg.gift.accounts; [a[i], a[i + s]] = [a[i + s], a[i]]; markDirty(); render(); }
    else if (d.gdel != null) { cfg.gallery.splice(+d.gdel, 1); markDirty(); render(); }
    else if (d.gmv) { const [i, s] = d.gmv.split(':').map(Number); [cfg.gallery[i], cfg.gallery[i + s]] = [cfg.gallery[i + s], cfg.gallery[i]]; markDirty(); render(); }
    else if (t.id === 'mk') {
      const base = $('#base').value.trim(), keep = $('#names').value;
      links = keep.split('\n').map(s => s.trim()).filter(Boolean).map(n => ({ n, u: `${base}?to=${encodeURIComponent(n).replace(/%20/g, '+')}` }));
      render(); $('#names').value = keep; $('#base').value = base;
    }
    else if (d.cl != null) copy(links[+d.cl].u);
    else if (d.cw != null) {
      const c = cfg.couple, A = c.order === 'groom' ? 'groom' : 'bride', B = A === 'bride' ? 'groom' : 'bride', x = links[+d.cw];
      copy(cfg.invite.waTemplate.replaceAll('{nama}', x.n).replaceAll('{link}', x.u).replaceAll('{pasangan}', `${c[A + 'Nick']} & ${c[B + 'Nick']}`).replaceAll('{tanggal}', cfg.event.displayDate));
    }
    else if (d.refresh) loadList(d.refresh, true);
    else if (d.rd != null) { if (confirm('Hapus data RSVP ini?')) { await Store.deleteRsvp(d.rd); cache.rsvp = cache.rsvp.filter(x => String(x.id) !== d.rd); render(); } }
    else if (d.wd != null) { if (confirm('Hapus ucapan ini?')) { await Store.deleteWish(d.wd); cache.wishes = cache.wishes.filter(x => String(x.id) !== d.wd); render(); } }
    else if (t.id === 'csv') {
      const q = v => { v = String(v); if (/^[=+\-@]/.test(v)) v = "'" + v; return '"' + v.replace(/"/g, '""') + '"'; };
      download('rsvp.csv', ['Nama,Status,Tamu,Waktu', ...cache.rsvp.map(x => [x.name, x.status, x.pax, x.time].map(q).join(','))].join('\n'), 'text/csv');
    }
    else if (t.id === 'bk') download('backup-undangan.json', JSON.stringify({ cfg, rsvp: await Store.listRsvp(), wishes: await Store.listWishes() }, null, 2), 'application/json');
    else if (t.id === 'reset') { if (confirm('Kembalikan semua konten ke default?')) { await Store.resetConfig(); cfg = clone(DEFAULT_CONFIG); clearDirty(); render(); toast('Direset ke default'); } }
  } catch (err) { fail(err); }
});
const restore = async (file, input) => {
  try { const d = JSON.parse(await file.text()); cfg = normalizeGift(merge(clone(DEFAULT_CONFIG), d.cfg || {}), d.cfg); await Store.saveConfig(cfg); await Store.restore(d); cache.rsvp = cache.wishes = null; clearDirty(); render(); toast('Cadangan dipulihkan'); }
  catch (e) { fail(e, 'File JSON tidak valid'); }
  input.value = '';
};
$('#save').onclick = async () => {
  const b = $('#save'); b.disabled = true;
  try { await Store.saveConfig(cfg); clearDirty(); toast('Tersimpan'); } catch (e) { fail(e, 'Gagal menyimpan'); }
  b.disabled = false;
};
$('#discard').onclick = async () => { { const sv = await Store.loadConfig(); cfg = normalizeGift(merge(clone(DEFAULT_CONFIG), sv), sv); } clearDirty(); render(); toast('Perubahan dibatalkan'); };

/* ---------- login & start ---------- */
const start = async () => {
  $('#login').hidden = true; $('#app').hidden = false; $('#modeChip').textContent = Store.label;
  try { { const sv = await Store.loadConfig(); cfg = normalizeGift(merge(clone(DEFAULT_CONFIG), sv), sv); } } catch (e) { fail(e, 'Konten tersimpan gagal dimuat, memakai default'); }
  go(tab);
};
const boot = async () => {
  $('#loginFields').innerHTML = Store.auth.fields.map(f => `<label class="f">${f.label}<input name="${f.name}" type="${f.type}" ${f.inputmode ? `inputmode="${f.inputmode}"` : ''} autocomplete="off" required></label>`).join('');
  if (!Store.ready()) { $('#loginInfo').textContent = (Store.hint || 'Backend belum dikonfigurasi. Cek js/config.js.'); $('#loginForm button').disabled = true; return; }
  $('#loginInfo').textContent = 'Masuk dengan akun admin (' + Store.label + ').';
  if (await Store.auth.check()) start();
};
$('#loginForm').onsubmit = async e => {
  e.preventDefault(); const b = e.target.querySelector('button'); b.disabled = true; $('#err').textContent = '';
  try { await Store.auth.login(Object.fromEntries(new FormData(e.target))); start(); } catch (x) { $('#err').textContent = x.message; }
  b.disabled = false;
};
$('#logout').onclick = async () => { await Store.auth.logout(); location.reload(); };
boot();
})();