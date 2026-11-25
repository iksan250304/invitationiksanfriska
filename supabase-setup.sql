-- ============================================================
-- Setup Supabase untuk undangan. Jalankan SEKALI di:
--   Supabase Dashboard -> SQL Editor -> New query -> tempel semua -> Run
-- Aman dijalankan ulang.
--
-- WAJIB: ganti email di fungsi is_admin() di bawah dengan email admin-mu
-- (email yang sama dengan user yang kamu buat di Authentication -> Users).
-- ============================================================

-- 1. Siapa admin? Hanya email ini yang boleh membaca RSVP, mengubah konten, dan mengunggah file.
create or replace function public.is_admin() returns boolean
language sql stable as $$
  select coalesce(auth.jwt() ->> 'email', '') = lower('GANTI_DENGAN_EMAIL_ADMIN@contoh.com')
$$;

-- 2. Tabel
create table if not exists public.config (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.rsvp (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 60),
  status text not null check (status in ('hadir','berhalangan')),
  pax integer not null default 0 check (pax between 0 and 20),
  created_at timestamptz not null default now()
);

create table if not exists public.wishes (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 60),
  msg text not null check (char_length(msg) between 1 and 400),
  created_at timestamptz not null default now()
);

-- 3. Row Level Security
alter table public.config enable row level security;
alter table public.rsvp   enable row level security;
alter table public.wishes enable row level security;

drop policy if exists "config read all"    on public.config;
drop policy if exists "config admin write" on public.config;
create policy "config read all"    on public.config for select using (true);
create policy "config admin write" on public.config for all    using (public.is_admin()) with check (public.is_admin());

drop policy if exists "rsvp guest insert" on public.rsvp;
drop policy if exists "rsvp admin all"    on public.rsvp;
create policy "rsvp guest insert" on public.rsvp for insert with check (true);
create policy "rsvp admin all"    on public.rsvp for all    using (public.is_admin()) with check (public.is_admin());

drop policy if exists "wishes read all"     on public.wishes;
drop policy if exists "wishes guest insert" on public.wishes;
drop policy if exists "wishes admin write"  on public.wishes;
create policy "wishes read all"     on public.wishes for select using (true);
create policy "wishes guest insert" on public.wishes for insert with check (true);
create policy "wishes admin write"  on public.wishes for all    using (public.is_admin()) with check (public.is_admin());

-- 3b. Hak akses tabel. Proyek baru kadang tidak memberi hak ini otomatis ("permission denied for table").
grant usage on schema public to anon, authenticated;
grant execute on function public.is_admin() to anon, authenticated;
grant select on public.config to anon, authenticated;
grant insert, update, delete on public.config to authenticated;
grant insert on public.rsvp to anon, authenticated;
grant select, delete on public.rsvp to authenticated;
grant select, insert on public.wishes to anon, authenticated;
grant delete on public.wishes to authenticated;

-- 4. Storage (foto dan musik): bucket publik, hanya admin yang boleh unggah/hapus
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 10485760, array['image/jpeg','image/png','image/webp','audio/mpeg','audio/mp3'])
on conflict (id) do update set public = true, file_size_limit = 10485760,
  allowed_mime_types = array['image/jpeg','image/png','image/webp','audio/mpeg','audio/mp3'];

drop policy if exists "media admin insert" on storage.objects;
drop policy if exists "media admin update" on storage.objects;
drop policy if exists "media admin delete" on storage.objects;
create policy "media admin insert" on storage.objects for insert with check (bucket_id = 'media' and public.is_admin());
create policy "media admin update" on storage.objects for update using (bucket_id = 'media' and public.is_admin());
create policy "media admin delete" on storage.objects for delete using (bucket_id = 'media' and public.is_admin());
