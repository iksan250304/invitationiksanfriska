#!/usr/bin/env node
/* Setup otomatis Appwrite Cloud untuk undangan.
   Membuat: database, tabel config/rsvp/wishes (kolom + permission), bucket media, user admin berlabel "admin".
   Lalu mengisi js/config.js (provider, projectId, databaseId).

   Pakai (Node 18+):
     APPWRITE_PROJECT_ID=xxx APPWRITE_API_KEY=xxx ADMIN_EMAIL=kamu@email.com ADMIN_PASSWORD='min8karakter' node setup-appwrite.mjs

   Opsional: APPWRITE_ENDPOINT (default https://cloud.appwrite.io/v1), DATABASE_ID (default undangan).
   API key: Console -> Overview -> Integrations -> API keys. Scope: databases.read/write, tables.read/write,
   columns.read/write, rows.read/write, buckets.read/write, users.read/write.
   Skrip aman dijalankan ulang: resource yang sudah ada dilewati. */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const env = process.env, EP = (env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1').replace(/\/$/, '');
const PID = env.APPWRITE_PROJECT_ID, KEY = env.APPWRITE_API_KEY, DB = env.DATABASE_ID || 'undangan';
const EMAIL = env.ADMIN_EMAIL, PASS = env.ADMIN_PASSWORD;
if (!PID || !KEY || !EMAIL || !PASS) { console.error('Isi APPWRITE_PROJECT_ID, APPWRITE_API_KEY, ADMIN_EMAIL, ADMIN_PASSWORD.'); process.exit(1); }
if (PASS.length < 8) { console.error('ADMIN_PASSWORD minimal 8 karakter.'); process.exit(1); }

const api = async (method, path, body) => {
  const r = await fetch(EP + path, { method, headers: { 'X-Appwrite-Project': PID, 'X-Appwrite-Key': KEY, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(`${method} ${path} -> ${r.status} ${j.message || ''}`), { code: r.status, type: j.type });
  return j;
};
/* buat resource; 409 (sudah ada) dianggap sukses */
const ensure = async (label, fn) => {
  try { await fn(); console.log('  dibuat   ', label); }
  catch (e) { if (e.code === 409) console.log('  sudah ada', label); else { console.error('  GAGAL    ', label, '\n  ', e.message); process.exit(1); } }
};
const sleep = ms => new Promise(r => setTimeout(r, ms));

const ADMIN = 'label:admin';
const TABLES = {
  config: { cols: [['string', { key: 'data', size: 20000, required: true }]], perm: { create: [ADMIN], read: ['any'], update: [ADMIN], delete: [ADMIN] } },
  rsvp: { cols: [['string', { key: 'name', size: 60, required: true }], ['string', { key: 'status', size: 20, required: true }], ['integer', { key: 'pax', required: false, min: 0, max: 20, default: 0 }]], perm: { create: ['any'], read: [ADMIN], update: [ADMIN], delete: [ADMIN] } },
  wishes: { cols: [['string', { key: 'name', size: 60, required: true }], ['string', { key: 'msg', size: 400, required: true }]], perm: { create: ['any'], read: ['any'], update: [ADMIN], delete: [ADMIN] } }
};
const perms = p => Object.entries(p).flatMap(([act, roles]) => roles.map(r => `${act}("${r}")`));

console.log('1. Database');
await ensure(`database ${DB}`, () => api('POST', '/tablesdb', { databaseId: DB, name: 'Undangan' }));

console.log('2. Tabel dan kolom');
for (const [id, t] of Object.entries(TABLES)) {
  await ensure(`tabel ${id}`, () => api('POST', `/tablesdb/${DB}/tables`, { tableId: id, name: id, permissions: perms(t.perm), rowSecurity: false }));
  for (const [type, c] of t.cols) await ensure(`  kolom ${id}.${c.key}`, () => api('POST', `/tablesdb/${DB}/tables/${id}/columns/${type}`, c));
}
console.log('   menunggu kolom aktif...');
for (let i = 0; i < 30; i++) {
  const st = [];
  for (const id of Object.keys(TABLES)) { const r = await api('GET', `/tablesdb/${DB}/tables/${id}/columns`); st.push(...r.columns.map(c => c.status)); }
  if (st.every(s => s === 'available')) break;
  await sleep(1500);
}

console.log('3. Storage');
await ensure('bucket media', () => api('POST', '/storage/buckets', { bucketId: 'media', name: 'media', permissions: perms({ create: [ADMIN], read: ['any'], update: [ADMIN], delete: [ADMIN] }), fileSecurity: false, maximumFileSize: 10000000, allowedFileExtensions: ['jpg', 'jpeg', 'png', 'webp', 'mp3'] }));

console.log('4. User admin');
let uid;
try { const u = await api('POST', '/users', { userId: 'admin', email: EMAIL, password: PASS, name: 'Admin' }); uid = u.$id; console.log('  dibuat    user', EMAIL); }
catch (e) { if (e.code === 409) { uid = 'admin'; console.log('  sudah ada user admin (email/sandi tidak diubah)'); } else { console.error(e.message); process.exit(1); } }
await api('PUT', `/users/${uid}/labels`, { labels: ['admin'] }); console.log('  label admin terpasang');

console.log('5. Isi js/config.js');
const cfgPath = join(dirname(fileURLToPath(import.meta.url)), 'js', 'config.js');
let src = readFileSync(cfgPath, 'utf8');
src = src.replace(/provider:\s*"[^"]*"/, 'provider: "appwrite"').replace(/endpoint:\s*"[^"]*"/, `endpoint: "${EP}"`).replace(/projectId:\s*"[^"]*"/, `projectId: "${PID}"`).replace(/databaseId:\s*"[^"]*"/, `databaseId: "${DB}"`);
writeFileSync(cfgPath, src); console.log('  config.js diperbarui');

console.log('\nSelesai. Langkah manual terakhir:');
console.log('  Console -> Overview -> Add platform -> Web, isi hostname situs undangan (dan localhost untuk uji coba).');
console.log('  Lalu buka admin.html dan masuk dengan ' + EMAIL + '. Jangan commit/bagikan API key.');
