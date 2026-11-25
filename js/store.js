/* Store: satu-satunya lapisan data. Halaman undangan dan admin hanya memanggil `Store.*`.
   Ganti BACKEND.provider di config.js: local | supabase | appwrite.
   Semua method async. Bentuk data:
     rsvp  : { id, name, status: 'hadir'|'berhalangan', pax, time }
     wish  : { id, name, msg, time }
   Konten undangan = objek parsial yang di-merge ke DEFAULT_CONFIG. */
const Store = (() => {
  const B = BACKEND, A = B.appwrite;
  const K = { cfg: 'rg_config', rsvp: 'rg_rsvp', wishes: 'rg_wishes', auth: 'rg_auth' };
  const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) || d; } catch (e) { return d; } };
  const save = (k, v) => localStorage.setItem(k, JSON.stringify(v));
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const sameId = (a, b) => String(a) === String(b);

  /* ---------- util gambar ---------- */
  const resizeImage = (file, max = 1200) => new Promise((res, rej) => {
    const r = new FileReader(); r.onerror = rej;
    r.onload = () => {
      const i = new Image(); i.onerror = rej;
      i.onload = () => {
        const s = Math.min(1, max / Math.max(i.width, i.height)), c = document.createElement('canvas');
        c.width = Math.round(i.width * s); c.height = Math.round(i.height * s);
        c.getContext('2d').drawImage(i, 0, 0, c.width, c.height);
        c.toBlob(b => b ? res(b) : rej(new Error('Gagal memproses gambar')), 'image/jpeg', .85);
      };
      i.src = r.result;
    };
    r.readAsDataURL(file);
  });
  const toDataUrl = blob => new Promise((res, rej) => { const r = new FileReader(); r.onerror = rej; r.onload = () => res(r.result); r.readAsDataURL(blob); });

  /* ================= LOCAL ================= */
  const local = {
    mode: 'local',
    label: 'Lokal (localStorage)',
    limits: { audio: 10e6 },
    ready: () => true,
    loadConfig: async () => load(K.cfg, {}),
    saveConfig: async cfg => { try { save(K.cfg, cfg); } catch (e) { throw new Error('Penyimpanan browser penuh. File besar (musik/foto) hanya muat dengan Appwrite.'); } },
    resetConfig: async () => localStorage.removeItem(K.cfg),
    listRsvp: async () => load(K.rsvp, []),
    addRsvp: async r => {
      const n = r.name.toLowerCase(), l = load(K.rsvp, []).filter(x => x.name.toLowerCase() !== n);
      l.push({ id: uid(), ...r, time: new Date().toISOString() }); save(K.rsvp, l);
    },
    deleteRsvp: async id => save(K.rsvp, load(K.rsvp, []).filter(x => !sameId(x.id, id))),
    listWishes: async () => load(K.wishes, []),
    addWish: async w => { const l = load(K.wishes, []); l.unshift({ id: uid(), ...w, time: new Date().toISOString() }); save(K.wishes, l); },
    deleteWish: async id => save(K.wishes, load(K.wishes, []).filter(x => !sameId(x.id, id))),
    restore: async d => { if (d.rsvp) save(K.rsvp, d.rsvp); if (d.wishes) save(K.wishes, d.wishes); },
    upload: async (file, kind) => {
      if (kind === 'audio' && file.size > 3e6) throw new Error('Mode lokal hanya muat sekitar 3 MB. Aktifkan Appwrite untuk file sampai 10 MB.');
      return toDataUrl(kind === 'image' ? await resizeImage(file) : file);
    },
    auth: {
      fields: [{ name: 'pin', label: 'PIN Admin', type: 'password', inputmode: 'numeric' }],
      check: async () => sessionStorage.getItem(K.auth) === '1',
      login: async ({ pin }) => { if (pin !== B.local.adminPin) throw new Error('PIN salah.'); sessionStorage.setItem(K.auth, '1'); },
      logout: async () => sessionStorage.removeItem(K.auth)
    }
  };

  /* ================= APPWRITE =================
     Tamu (publik)  : REST fetch ringan, tanpa SDK  -> loadConfig, addRsvp, addWish, listWishes
     Admin (login)  : Appwrite Web SDK (js/vendor/appwrite.js, dimuat lazy) -> sisanya */
  const T = n => A.tables[n];
  const rowsUrl = (t, id = '') => `${A.endpoint}/tablesdb/${A.databaseId}/tables/${T(t)}/rows${id ? '/' + encodeURIComponent(id) : ''}`;
  const rest = async (method, url, body) => {
    const ctl = new AbortController(), tm = setTimeout(() => ctl.abort(), 8000);
    let r; try { r = await fetch(url, { method, signal: ctl.signal, headers: { 'X-Appwrite-Project': A.projectId, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined }); } finally { clearTimeout(tm); }
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw Object.assign(new Error(j.message || 'HTTP ' + r.status), { code: r.status });
    return j;
  };
  const qs = qq => qq.map(q => 'queries[]=' + encodeURIComponent(JSON.stringify(q))).join('&');
  const norm = r => ({ id: r.$id, time: r.$createdAt, name: r.name, msg: r.msg, status: r.status, pax: r.pax });
  let sdk = null;
  const loadScript = src => new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('Gagal memuat ' + src)); document.head.append(s); });
  const getSdk = async () => {
    if (sdk) return sdk;
    if (!window.Appwrite) await loadScript('js/vendor/appwrite.js');
    const client = new Appwrite.Client().setEndpoint(A.endpoint).setProject(A.projectId);
    return sdk = { client, account: new Appwrite.Account(client), db: new Appwrite.TablesDB(client), storage: new Appwrite.Storage(client), Q: Appwrite.Query, ID: Appwrite.ID };
  };
  const adminList = async t => {
    const s = await getSdk();
    const r = await s.db.listRows({ databaseId: A.databaseId, tableId: T(t), queries: [s.Q.orderDesc('$createdAt'), s.Q.limit(500)] });
    return r.rows.map(norm);
  };
  const adminDelete = async (t, id) => { const s = await getSdk(); await s.db.deleteRow({ databaseId: A.databaseId, tableId: T(t), rowId: id }); };

  const appwrite = {
    mode: 'appwrite',
    label: 'Appwrite Cloud',
    limits: { audio: 10e6 },
    ready: () => !!(A.projectId && A.databaseId),
    loadConfig: async () => {
      try { const r = await rest('GET', rowsUrl('config', A.configRowId)); return JSON.parse(r.data || '{}'); }
      catch (e) { if (e.code === 404) return {}; throw e; }
    },
    saveConfig: async cfg => {
      const s = await getSdk(), p = { databaseId: A.databaseId, tableId: T('config'), rowId: A.configRowId, data: { data: JSON.stringify(cfg) } };
      try { await s.db.updateRow(p); } catch (e) { if (e.code === 404) await s.db.createRow(p); else throw e; }
    },
    resetConfig: async () => { const s = await getSdk(); try { await s.db.deleteRow({ databaseId: A.databaseId, tableId: T('config'), rowId: A.configRowId }); } catch (e) { if (e.code !== 404) throw e; } },
    addRsvp: async r => { await rest('POST', rowsUrl('rsvp'), { rowId: 'unique()', data: { name: r.name, status: r.status, pax: r.pax } }); },
    addWish: async w => { await rest('POST', rowsUrl('wishes'), { rowId: 'unique()', data: { name: w.name, msg: w.msg } }); },
    listWishes: async () => {
      const r = await rest('GET', rowsUrl('wishes') + '?' + qs([{ method: 'orderDesc', attribute: '$createdAt' }, { method: 'limit', values: [50] }]));
      return r.rows.map(norm);
    },
    listRsvp: () => adminList('rsvp'),
    deleteRsvp: id => adminDelete('rsvp', id),
    deleteWish: id => adminDelete('wishes', id),
    restore: async () => {},
    upload: async (file, kind) => {
      const s = await getSdk(), f = kind === 'image' ? new File([await resizeImage(file)], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' }) : file;
      const r = await s.storage.createFile({ bucketId: A.bucketId, fileId: s.ID.unique(), file: f });
      return `${A.endpoint}/storage/buckets/${A.bucketId}/files/${r.$id}/view?project=${A.projectId}`;
    },
    auth: {
      fields: [{ name: 'email', label: 'Email admin', type: 'email' }, { name: 'password', label: 'Kata sandi', type: 'password' }],
      check: async () => { try { await (await getSdk()).account.get(); return true; } catch (e) { return false; } },
      login: async ({ email, password }) => {
        const s = await getSdk();
        try { await s.account.createEmailPasswordSession({ email, password }); } catch (e) { throw new Error(e.code === 401 ? 'Email atau kata sandi salah.' : e.message); }
      },
      logout: async () => { try { await (await getSdk()).account.deleteSession({ sessionId: 'current' }); } catch (e) {} }
    }
  };

  /* ================= SUPABASE =================
     Tanpa SDK: REST (PostgREST), Auth (GoTrue) dan Storage dipanggil lewat fetch.
     Tamu (publik) : apikey saja  -> loadConfig, addRsvp, addWish, listWishes
     Admin (login) : apikey + JWT sesi -> sisanya. Hak admin dijaga RLS (fungsi is_admin() di supabase-setup.sql). */
  const S = B.supabase || {}, SB = (S.url || '').replace(/\/$/, ''), SK = 'sb_session';
  const sbSession = () => { try { return JSON.parse(localStorage.getItem(SK)); } catch (e) { return null; } };
  const sbSetSession = j => { const x = { access_token: j.access_token, refresh_token: j.refresh_token, expires_at: Math.floor(Date.now() / 1000) + (j.expires_in || 3600) }; localStorage.setItem(SK, JSON.stringify(x)); return x; };
  const sbFetch = async (path, { method = 'GET', body, headers = {}, auth = false, raw = false } = {}) => {
    const ctl = new AbortController(), tm = setTimeout(() => ctl.abort(), 12000), h = { apikey: S.anonKey, ...headers };
    if (auth) { const t = await sbToken(); if (t) h.Authorization = 'Bearer ' + t; }
    let r; try { r = await fetch(SB + path, { method, signal: ctl.signal, headers: h, body }); } finally { clearTimeout(tm); }
    if (raw) return r;
    const txt = await r.text(), j = txt ? (() => { try { return JSON.parse(txt); } catch (e) { return {}; } })() : null;
    if (!r.ok) throw Object.assign(new Error((j && (j.message || j.msg || j.error_description)) || 'HTTP ' + r.status), { code: r.status });
    return j;
  };
  const sbJson = (method, path, data, opt = {}) => sbFetch(path, { method, body: data === undefined ? undefined : JSON.stringify(data), ...opt, headers: { 'Content-Type': 'application/json', ...(opt.headers || {}) } });
  const sbToken = async () => {
    let s = sbSession(); if (!s) return null;
    if (s.expires_at - 60 < Date.now() / 1000) {
      try { s = sbSetSession(await sbJson('POST', '/auth/v1/token?grant_type=refresh_token', { refresh_token: s.refresh_token })); }
      catch (e) { localStorage.removeItem(SK); return null; }
    }
    return s.access_token;
  };
  const sbNorm = r => ({ id: r.id, time: r.created_at, name: r.name, msg: r.msg, status: r.status, pax: r.pax });
  const sbRows = (t, q) => sbJson('GET', `/rest/v1/${t}?${q}`, undefined, { auth: true });
  const supabase = {
    mode: 'supabase',
    label: 'Supabase',
    limits: { audio: 10e6 },
    hint: 'Supabase belum dikonfigurasi. Isi url dan anonKey di js/config.js.',
    ready: () => !!(SB && S.anonKey),
    loadConfig: async () => {
      const r = await sbJson('GET', `/rest/v1/config?id=eq.${encodeURIComponent(S.configRowId || 'main')}&select=data`);
      const d = r && r[0] && r[0].data; return d && typeof d === 'object' ? d : (typeof d === 'string' ? JSON.parse(d || '{}') : {});
    },
    saveConfig: async cfg => { await sbJson('POST', '/rest/v1/config?on_conflict=id', { id: S.configRowId || 'main', data: cfg, updated_at: new Date().toISOString() }, { auth: true, headers: { Prefer: 'resolution=merge-duplicates,return=minimal' } }); },
    resetConfig: async () => { await sbFetch(`/rest/v1/config?id=eq.${encodeURIComponent(S.configRowId || 'main')}`, { method: 'DELETE', auth: true }); },
    addRsvp: async r => { await sbJson('POST', '/rest/v1/rsvp', { name: r.name, status: r.status, pax: r.pax }, { headers: { Prefer: 'return=minimal' } }); },
    addWish: async w => { await sbJson('POST', '/rest/v1/wishes', { name: w.name, msg: w.msg }, { headers: { Prefer: 'return=minimal' } }); },
    listWishes: async () => (await sbJson('GET', '/rest/v1/wishes?select=*&order=created_at.desc&limit=50')).map(sbNorm),
    listRsvp: async () => (await sbRows('rsvp', 'select=*&order=created_at.desc&limit=500')).map(sbNorm),
    deleteRsvp: async id => { await sbFetch(`/rest/v1/rsvp?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE', auth: true }); },
    deleteWish: async id => { await sbFetch(`/rest/v1/wishes?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE', auth: true }); },
    restore: async () => {},
    upload: async (file, kind) => {
      const bucket = S.bucket || 'media', isImg = kind === 'image', blob = isImg ? await resizeImage(file) : file;
      const ext = isImg ? 'jpg' : ((file.name.match(/\.(\w+)$/) || [])[1] || 'mp3').toLowerCase(), name = `${uid()}.${ext}`;
      await sbFetch(`/storage/v1/object/${bucket}/${name}`, { method: 'POST', auth: true, body: blob, headers: { 'Content-Type': isImg ? 'image/jpeg' : (file.type || 'audio/mpeg'), 'x-upsert': 'false' } });
      return `${SB}/storage/v1/object/public/${bucket}/${name}`;
    },
    auth: {
      fields: [{ name: 'email', label: 'Email admin', type: 'email' }, { name: 'password', label: 'Kata sandi', type: 'password' }],
      check: async () => { const t = await sbToken(); if (!t) return false; try { await sbFetch('/auth/v1/user', { auth: true }); return true; } catch (e) { localStorage.removeItem(SK); return false; } },
      login: async ({ email, password }) => {
        try { sbSetSession(await sbJson('POST', '/auth/v1/token?grant_type=password', { email, password })); }
        catch (e) { throw new Error(e.code === 400 || e.code === 401 ? 'Email atau kata sandi salah.' : e.message); }
      },
      logout: async () => { try { await sbFetch('/auth/v1/logout', { method: 'POST', auth: true }); } catch (e) {} localStorage.removeItem(SK); }
    }
  };

  return B.provider === 'supabase' ? supabase : B.provider === 'appwrite' ? appwrite : local;
})();