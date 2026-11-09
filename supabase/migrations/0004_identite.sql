-- Bricolo : vérification d'identité, photo de profil, expérience, diplômes.
-- Principe : un profil ne peut passer « validé » que si une pièce d'identité a été examinée et acceptée par l'administration.

alter table public.artisans
  add column photo_url text,
  add column experience_years int check (experience_years between 0 and 60),
  add column diploma_verified boolean not null default false,
  add column diploma_title text check (char_length(diploma_title) <= 120),
  add column reject_reason text check (char_length(reject_reason) <= 500);

-- ───────── Pièce d'identité (une par artisan, fichiers dans le bucket privé « kyc ») ─────────
create table public.artisan_identity (
  artisan_id uuid primary key references public.artisans(id) on delete cascade,
  doc_type text not null check (doc_type in ('cni','passeport','permis','carte_consulaire')),
  front_path text not null,
  back_path text,
  selfie_path text not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  reject_reason text check (char_length(reject_reason) <= 500),
  submitted_at timestamptz not null default now(),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz
);

create table public.artisan_diplomas (
  id uuid primary key default gen_random_uuid(),
  artisan_id uuid not null references public.artisans(id) on delete cascade,
  title text not null check (char_length(title) between 2 and 120),
  path text not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  reject_reason text check (char_length(reject_reason) <= 500),
  submitted_at timestamptz not null default now(),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz
);
create index artisan_diplomas_artisan_idx on public.artisan_diplomas (artisan_id);

alter table public.artisan_identity enable row level security;
alter table public.artisan_diplomas enable row level security;
create policy "lire son identité" on public.artisan_identity for select using (
  public.is_admin() or exists (select 1 from public.artisans a where a.id = artisan_id and a.user_id = auth.uid()));
create policy "lire ses diplômes" on public.artisan_diplomas for select using (
  public.is_admin() or exists (select 1 from public.artisans a where a.id = artisan_id and a.user_id = auth.uid()));
-- Aucune écriture directe : tout passe par les fonctions ci-dessous.

-- ───────── Garde-fous ─────────
-- Fonction non « security definer » : current_user vaut « authenticated » pour une requête du navigateur,
-- et le propriétaire des fonctions ci-dessous lorsqu'elles agissent pour le compte de l'utilisateur.
create or replace function public.guard_artisan_update() returns trigger
language plpgsql set search_path = public as $$
begin
  if auth.uid() is not null and current_user = 'authenticated' and not public.is_admin() then
    if tg_op = 'INSERT' then
      new.status := 'pending'; new.verified := false; new.avg_rating := null; new.review_count := 0;
      new.diploma_verified := false; new.diploma_title := null; new.reject_reason := null;
    else
      new.status := old.status; new.verified := old.verified; new.avg_rating := old.avg_rating;
      new.review_count := old.review_count; new.country_code := old.country_code; new.user_id := old.user_id;
      new.diploma_verified := old.diploma_verified; new.diploma_title := old.diploma_title; new.reject_reason := old.reject_reason;
    end if;
  end if;
  return new;
end $$;

-- Un profil ne devient « validé » qu'avec une pièce d'identité acceptée et une photo de profil.
create or replace function public.artisans_kyc_gate() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'approved' and old.status is distinct from 'approved' then
    if new.photo_url is null then raise exception 'photo_requise'; end if;
    if not exists (select 1 from public.artisan_identity where artisan_id = new.id and status = 'approved') then
      raise exception 'identite_requise';
    end if;
  end if;
  return new;
end $$;
create trigger artisans_kyc_gate before update on public.artisans
  for each row execute function public.artisans_kyc_gate();

-- ───────── Fonctions appelées par l'application ─────────
create or replace function public.submit_identity(p_doc_type text, p_front text, p_back text, p_selfie text) returns void
language plpgsql security definer set search_path = public as $$
declare a public.artisans%rowtype; uid uuid := auth.uid(); pre text;
begin
  if uid is null then raise exception 'auth'; end if;
  pre := uid::text || '/';
  select * into a from public.artisans where user_id = uid;
  if not found then raise exception 'profil_requis'; end if;
  if a.photo_url is null then raise exception 'photo_requise'; end if;
  if p_doc_type not in ('cni','passeport','permis','carte_consulaire') then raise exception 'type_invalide'; end if;
  if left(coalesce(p_front,''), length(pre)) <> pre or left(coalesce(p_selfie,''), length(pre)) <> pre
     or (p_back is not null and left(p_back, length(pre)) <> pre) then raise exception 'chemin_invalide'; end if;
  if exists (select 1 from public.artisan_identity where artisan_id = a.id and status = 'approved') then raise exception 'deja_verifie'; end if;
  insert into public.artisan_identity (artisan_id, doc_type, front_path, back_path, selfie_path)
  values (a.id, p_doc_type, p_front, nullif(p_back,''), p_selfie)
  on conflict (artisan_id) do update set doc_type = excluded.doc_type, front_path = excluded.front_path,
    back_path = excluded.back_path, selfie_path = excluded.selfie_path, status = 'pending', reject_reason = null,
    submitted_at = now(), reviewed_by = null, reviewed_at = null;
  update public.artisans set status = 'pending', reject_reason = null where id = a.id and status = 'rejected';
end $$;

create or replace function public.submit_diploma(p_title text, p_path text) returns void
language plpgsql security definer set search_path = public as $$
declare a public.artisans%rowtype; uid uuid := auth.uid();
begin
  if uid is null then raise exception 'auth'; end if;
  select * into a from public.artisans where user_id = uid;
  if not found then raise exception 'profil_requis'; end if;
  if char_length(trim(coalesce(p_title,''))) not between 2 and 120 then raise exception 'titre_invalide'; end if;
  if left(coalesce(p_path,''), length(uid::text) + 1) <> uid::text || '/' then raise exception 'chemin_invalide'; end if;
  if (select count(*) from public.artisan_diplomas where artisan_id = a.id and status <> 'rejected') >= 3 then raise exception 'limite_diplomes'; end if;
  insert into public.artisan_diplomas (artisan_id, title, path) values (a.id, trim(p_title), p_path);
end $$;

-- Décision de l'administration sur le dossier (identité + profil en une seule étape).
create or replace function public.review_artisan(p_artisan uuid, p_approve boolean, p_reason text default null) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'interdit'; end if;
  if p_approve then
    update public.artisan_identity set status = 'approved', reject_reason = null, reviewed_by = auth.uid(), reviewed_at = now() where artisan_id = p_artisan;
    if not found then raise exception 'identite_requise'; end if;
    update public.artisans set status = 'approved', reject_reason = null where id = p_artisan;
  else
    if char_length(trim(coalesce(p_reason,''))) < 5 then raise exception 'motif_requis'; end if;
    update public.artisan_identity set status = 'rejected', reject_reason = trim(p_reason), reviewed_by = auth.uid(), reviewed_at = now() where artisan_id = p_artisan;
    update public.artisans set status = 'rejected', reject_reason = trim(p_reason) where id = p_artisan;
  end if;
end $$;

create or replace function public.review_diploma(p_diploma uuid, p_approve boolean, p_reason text default null) returns void
language plpgsql security definer set search_path = public as $$
declare d public.artisan_diplomas%rowtype;
begin
  if not public.is_admin() then raise exception 'interdit'; end if;
  select * into d from public.artisan_diplomas where id = p_diploma;
  if not found then raise exception 'introuvable'; end if;
  if p_approve then
    update public.artisan_diplomas set status = 'approved', reject_reason = null, reviewed_by = auth.uid(), reviewed_at = now() where id = d.id;
    update public.artisans set diploma_verified = true, diploma_title = d.title where id = d.artisan_id;
  else
    if char_length(trim(coalesce(p_reason,''))) < 5 then raise exception 'motif_requis'; end if;
    update public.artisan_diplomas set status = 'rejected', reject_reason = trim(p_reason), reviewed_by = auth.uid(), reviewed_at = now() where id = d.id;
    if not exists (select 1 from public.artisan_diplomas where artisan_id = d.artisan_id and status = 'approved') then
      update public.artisans set diploma_verified = false, diploma_title = null where id = d.artisan_id;
    end if;
  end if;
end $$;

revoke all on function public.submit_identity(text,text,text,text), public.submit_diploma(text,text),
  public.review_artisan(uuid,boolean,text), public.review_diploma(uuid,boolean,text) from public, anon;
grant execute on function public.submit_identity(text,text,text,text), public.submit_diploma(text,text),
  public.review_artisan(uuid,boolean,text), public.review_diploma(uuid,boolean,text) to authenticated;

-- ───────── Stockage ─────────
-- avatars : public (affiché sur les fiches) ; kyc : privé (pièces d'identité et diplômes, lecture par l'artisan et l'administration).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('avatars', 'avatars', true, 2097152, array['image/jpeg','image/png','image/webp']),
  ('kyc', 'kyc', false, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.kyc_locked() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.artisan_identity i join public.artisans a on a.id = i.artisan_id
    where a.user_id = auth.uid() and i.status = 'approved');
$$;

create policy "avatars : envoyer dans son dossier" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars : supprimer les siens" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "kyc : envoyer dans son dossier" on storage.objects for insert to authenticated
  with check (bucket_id = 'kyc' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "kyc : lire les siens ou admin" on storage.objects for select to authenticated
  using (bucket_id = 'kyc' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));
create policy "kyc : supprimer les siens tant que non vérifié" on storage.objects for delete to authenticated
  using (bucket_id = 'kyc' and (storage.foldername(name))[1] = auth.uid()::text and not public.kyc_locked());

-- ───────── Recherche : ajoute photo, expérience et diplôme ─────────
drop function public.search_artisans(text, uuid, uuid, boolean, text);
create function public.search_artisans(
  p_country text, p_trade uuid default null, p_zone uuid default null,
  p_verified boolean default false, p_seed text default ''
) returns table (
  id uuid, name text, trade_id uuid, description text, price_label text, phone text, whatsapp text,
  verified boolean, avg_rating numeric, review_count int, sponsored boolean, zones text[],
  photo_url text, experience_years int, diploma_verified boolean
) language sql stable security invoker set search_path = public as $$
  select * from (
    select a.id, a.name, a.trade_id, a.description, a.price_label, a.phone, a.whatsapp,
      a.verified, a.avg_rating, a.review_count,
      exists (select 1 from public.boosts b
        where b.artisan_id = a.id and b.status = 'active' and b.ends_at > now()
          and b.type in ('recherche','cible') and (p_zone is null or b.zone_id = p_zone)) as sponsored,
      coalesce((select array_agg(z.name order by z.name) from public.artisan_zones az
        join public.zones z on z.id = az.zone_id where az.artisan_id = a.id), '{}') as zones,
      a.photo_url, a.experience_years, a.diploma_verified
    from public.artisans a
    where a.status = 'approved' and a.country_code = p_country
      and (p_trade is null or a.trade_id = p_trade)
      and (p_zone is null or exists (select 1 from public.artisan_zones az where az.artisan_id = a.id and az.zone_id = p_zone))
      and (not p_verified or a.verified)
  ) s
  order by s.sponsored desc,
    case when s.sponsored then md5(s.id::text || p_seed) end,
    (case when s.verified then 10 else 0 end + case when s.diploma_verified then 2 else 0 end
      + coalesce(s.avg_rating, 0) * 2 + least(s.review_count, 50) / 25.0) desc,
    s.name;
$$;

-- Durcissement (conseils de sécurité Supabase)
revoke execute on function public.artisans_kyc_gate() from public, anon, authenticated;
revoke execute on function public.kyc_locked() from public, anon;
grant execute on function public.kyc_locked() to authenticated;
