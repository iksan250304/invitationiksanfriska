# Integrasi Supabase

Semua akses data lewat `js/store.js` (provider `supabase`). Tanpa SDK, tanpa langkah CORS: Supabase sudah mengizinkan semua origin, jadi domain bawaan hosting langsung jalan.

## 1. Buat project
supabase.com -> New project (pilih region Singapore). Tunggu selesai.

## 2. Buat user admin
**Authentication -> Users -> Add user -> Create new user.** Isi email dan sandi, centang **Auto Confirm User**.
Lalu matikan pendaftaran umum: **Authentication -> Sign In / Providers -> matikan "Allow new users to sign up"**.

## 3. Jalankan SQL
Buka `supabase-setup.sql`. **Ganti `GANTI_DENGAN_EMAIL_ADMIN@contoh.com` dengan email admin tadi.** Lalu **SQL Editor -> New query -> tempel -> Run**.
Ini membuat tabel `config`, `rsvp`, `wishes`, aturan RLS, dan bucket `media`.

Hak akses:
| Tabel | Tamu | Admin |
|---|---|---|
| config | baca | baca, ubah |
| rsvp | kirim | baca, hapus |
| wishes | baca, kirim | baca, hapus |
| bucket media | lihat file | unggah, hapus |

## 4. Isi `js/config.js`
Ambil dari **Project Settings -> API** (atau tombol Connect):
```js
provider: "supabase",
supabase: {
  url: "https://XXXX.supabase.co",
  anonKey: "ISI_ANON_ATAU_PUBLISHABLE_KEY",
  bucket: "media",
  configRowId: "main"
}
```
`anonKey` / publishable key memang boleh publik. **Jangan pernah** pakai `service_role` / secret key di file ini.

## 5. Uji
Jalankan server lokal (`npx serve .`), buka `admin.html`, masuk, ubah konten, Simpan. Lalu kirim RSVP dari `index.html` dan cek di tab RSVP admin.

## Konten balik ke default setelah Simpan
Penyebab paling umum: email di fungsi `is_admin()` tidak sama dengan email login, jadi Supabase menolak penyimpanan.
1. Buka `admin.html`, tab **Pengaturan**, klik **Jalankan tes** pada kartu "Tes koneksi".
2. Baris yang bertanda merah menunjukkan penyebabnya. Bila `is_admin()` FALSE, salin SQL perbaikan yang muncul, tempel di SQL Editor, Run.
3. Bila muncul "permission denied", Run ulang seluruh `supabase-setup.sql` (sudah berisi GRANT).
4. Simpan lagi. Pesan "Tersimpan di Supabase" hanya muncul bila server benar-benar menyimpan; kalau gagal, banner merah menampilkan alasannya.

## Catatan
- Rekening tanda kasih (maks. 5) tersimpan di JSON `config`.
- Kalau RSVP/konten gagal: cek email di `is_admin()` sama persis dengan email login, dan SQL sudah di-Run tanpa error.
- Proyek free Supabase di-pause setelah sekitar 1 minggu tanpa aktivitas; buka dashboard untuk mengaktifkan lagi.
