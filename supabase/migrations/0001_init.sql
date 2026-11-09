-- Bricolo : schéma initial (13 tables), règles d'accès (RLS) et recherche.
create extension if not exists pgcrypto;

-- ───────── Référentiels ─────────
create table public.countries (
  code text primary key check (code ~ '^[a-z]{2}$'),
  name text not null,
  capital text not null,
  currency text not null default 'XOF',
  phone_prefix text not null,
  active boolean not null default true
);

create table public.zones (
  id uuid primary key default gen_random_uuid(),
  country_code text not null references public.countries(code),
  name text not null,
  price_factor numeric(3,2) not null default 1.00,
  unique (country_code, name)
);

create table public.trades (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  plural text not null,
  description text
);

-- Prix de départ des boosts, par pays (le boost « cible » = recherche × zones.price_factor)
create table public.price_grid (
  id uuid primary key default gen_random_uuid(),
  country_code text not null references public.countries(code),
  boost_type text not null check (boost_type in ('recherche','accueil','urgence')),
  duration_hours int not null check (duration_hours in (24,72,168)),
  amount int not null check (amount >= 0),
  unique (country_code, boost_type, duration_hours)
);

-- ───────── Comptes ─────────
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role text not null default 'artisan' check (role in ('artisan','admin')),
  country_code text references public.countries(code),
  created_at timestamptz not null default now()
);

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare c text := lower(coalesce(new.raw_user_meta_data->>'country_code',''));
begin
  insert into public.profiles (id, email, country_code)
  values (new.id, new.email, (select code from public.countries where code = c))
  on conflict (id) do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ───────── Artisans ─────────
create table public.artisans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  country_code text not null references public.countries(code),
  name text not null check (char_length(name) between 2 and 80),
  trade_id uuid not null references public.trades(id),
  description text check (char_length(description) <= 1000),
  price_label text check (char_length(price_label) <= 60),
  phone text,
  whatsapp text,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  verified boolean not null default false,
  verification_requested boolean not null default false,
  avg_rating numeric(2,1),
  review_count int not null default 0,
  created_at timestamptz not null default now()
);
create index artisans_search_idx on public.artisans (country_code, trade_id) where status = 'approved';

create table public.artisan_zones (
  artisan_id uuid not null references public.artisans(id) on delete cascade,
  zone_id uuid not null references public.zones(id) on delete cascade,
  primary key (artisan_id, zone_id)
);

create table public.portfolio_photos (
  id uuid primary key default gen_random_uuid(),
  artisan_id uuid not null references public.artisans(id) on delete cascade,
  path text not null,
  caption text,
  created_at timestamptz not null default now()
);

-- Un artisan ne peut pas se valider lui-même ni toucher à sa note.
create or replace function public.guard_artisan_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    if auth.uid() is not null and not public.is_admin() then
      new.status := 'pending'; new.verified := false; new.avg_rating := null; new.review_count := 0;
    end if;
  elsif auth.uid() is not null and not public.is_admin() then
    new.status := old.status; new.verified := old.verified; new.avg_rating := old.avg_rating;
    new.review_count := old.review_count; new.country_code := old.country_code; new.user_id := old.user_id;
  end if;
  return new;
end $$;
create trigger artisans_guard before insert or update on public.artisans
  for each row execute function public.guard_artisan_update();

-- ───────── Demandes, avis, événements ─────────
create table public.service_requests (
  id uuid primary key default gen_random_uuid(),
  artisan_id uuid references public.artisans(id) on delete set null,
  country_code text not null references public.countries(code),
  trade_id uuid references public.trades(id),
  zone_id uuid references public.zones(id),
  description text not null check (char_length(description) between 5 and 1000),
  urgent boolean not null default false,
  client_name text check (char_length(client_name) <= 80),
  client_email text not null check (client_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  status text not null default 'new' check (status in ('new','answered')),
  created_at timestamptz not null default now()
);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  artisan_id uuid not null references public.artisans(id) on delete cascade,
  author_name text not null check (char_length(author_name) between 2 and 60),
  rating int not null check (rating between 1 and 5),
  comment text check (char_length(comment) <= 600),
  status text not null default 'pending' check (status in ('pending','published','hidden')),
  created_at timestamptz not null default now()
);

create or replace function public.refresh_artisan_rating() returns trigger
language plpgsql security definer set search_path = public as $$
declare a uuid := coalesce(new.artisan_id, old.artisan_id);
begin
  update public.artisans set
    review_count = (select count(*) from public.reviews where artisan_id = a and status = 'published'),
    avg_rating = (select round(avg(rating)::numeric, 1) from public.reviews where artisan_id = a and status = 'published')
  where id = a;
  return null;
end $$;
create trigger reviews_rating after insert or update or delete on public.reviews
  for each row execute function public.refresh_artisan_rating();

create table public.events (
  id uuid primary key default gen_random_uuid(),
  artisan_id uuid not null references public.artisans(id) on delete cascade,
  type text not null check (type in ('view','call','whatsapp','request')),
  created_at timestamptz not null default now()
);
create index events_artisan_idx on public.events (artisan_id, created_at desc);

-- ───────── Boosts et paiements (écriture serveur uniquement) ─────────
create table public.boosts (
  id uuid primary key default gen_random_uuid(),
  artisan_id uuid not null references public.artisans(id) on delete cascade,
  type text not null check (type in ('recherche','accueil','urgence','cible')),
  zone_id uuid references public.zones(id),
  duration_hours int not null check (duration_hours in (24,72,168)),
  amount int not null,
  currency text not null default 'XOF',
  status text not null default 'pending' check (status in ('pending','active','expired','cancelled','merged')),
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now()
);
create index boosts_active_idx on public.boosts (type, zone_id, ends_at) where status = 'active';

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  boost_id uuid not null references public.boosts(id) on delete cascade,
  provider text not null default 'geniuspay',
  provider_ref text not null unique,
  amount int not null,
  currency text not null default 'XOF',
  status text not null default 'pending' check (status in ('pending','paid','failed')),
  raw jsonb,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

-- ───────── Recherche : sponsorisés d'abord (ordre tournant), puis score naturel ─────────
create or replace function public.search_artisans(
  p_country text, p_trade uuid default null, p_zone uuid default null,
  p_verified boolean default false, p_seed text default ''
) returns table (
  id uuid, name text, trade_id uuid, description text, price_label text, phone text, whatsapp text,
  verified boolean, avg_rating numeric, review_count int, sponsored boolean, zones text[]
) language sql stable security invoker set search_path = public as $$
  select * from (
    select a.id, a.name, a.trade_id, a.description, a.price_label, a.phone, a.whatsapp,
      a.verified, a.avg_rating, a.review_count,
      exists (select 1 from public.boosts b
        where b.artisan_id = a.id and b.status = 'active' and b.ends_at > now()
          and b.type in ('recherche','cible') and (p_zone is null or b.zone_id = p_zone)) as sponsored,
      coalesce((select array_agg(z.name order by z.name) from public.artisan_zones az
        join public.zones z on z.id = az.zone_id where az.artisan_id = a.id), '{}') as zones
    from public.artisans a
    where a.status = 'approved' and a.country_code = p_country
      and (p_trade is null or a.trade_id = p_trade)
      and (p_zone is null or exists (select 1 from public.artisan_zones az where az.artisan_id = a.id and az.zone_id = p_zone))
      and (not p_verified or a.verified)
  ) s
  order by s.sponsored desc,
    case when s.sponsored then md5(s.id::text || p_seed) end,
    (case when s.verified then 10 else 0 end + coalesce(s.avg_rating, 0) * 2 + least(s.review_count, 50) / 25.0) desc,
    s.name;
$$;

-- ───────── Règles d'accès (RLS) ─────────
alter table public.countries enable row level security;
alter table public.zones enable row level security;
alter table public.trades enable row level security;
alter table public.price_grid enable row level security;
alter table public.profiles enable row level security;
alter table public.artisans enable row level security;
alter table public.artisan_zones enable row level security;
alter table public.portfolio_photos enable row level security;
alter table public.service_requests enable row level security;
alter table public.reviews enable row level security;
alter table public.events enable row level security;
alter table public.boosts enable row level security;
alter table public.payments enable row level security;

-- Lecture publique des référentiels
create policy "lecture publique" on public.countries for select using (true);
create policy "lecture publique" on public.zones for select using (true);
create policy "lecture publique" on public.trades for select using (true);
create policy "lecture publique" on public.price_grid for select using (true);
create policy "admin écrit les prix" on public.price_grid for update using (public.is_admin()) with check (public.is_admin());

-- Profils
create policy "voir son profil" on public.profiles for select using (id = auth.uid() or public.is_admin());

-- Artisans
create policy "artisans validés visibles" on public.artisans for select using (status = 'approved' or user_id = auth.uid() or public.is_admin());
create policy "créer sa fiche" on public.artisans for insert with check (user_id = auth.uid());
create policy "modifier sa fiche" on public.artisans for update using (user_id = auth.uid() or public.is_admin()) with check (user_id = auth.uid() or public.is_admin());

create policy "zones visibles" on public.artisan_zones for select using (true);
create policy "gérer ses zones" on public.artisan_zones for all
  using (exists (select 1 from public.artisans a where a.id = artisan_id and a.user_id = auth.uid()))
  with check (exists (select 1 from public.artisans a where a.id = artisan_id and a.user_id = auth.uid()));

create policy "photos visibles" on public.portfolio_photos for select using (true);
create policy "gérer ses photos" on public.portfolio_photos for all
  using (exists (select 1 from public.artisans a where a.id = artisan_id and a.user_id = auth.uid()))
  with check (exists (select 1 from public.artisans a where a.id = artisan_id and a.user_id = auth.uid()));

-- Demandes : n'importe qui peut en envoyer, seul l'artisan concerné les lit
create policy "envoyer une demande" on public.service_requests for insert with check (true);
create policy "lire ses demandes" on public.service_requests for select using (
  public.is_admin() or exists (select 1 from public.artisans a where a.id = artisan_id and a.user_id = auth.uid()));
create policy "répondre à ses demandes" on public.service_requests for update using (
  exists (select 1 from public.artisans a where a.id = artisan_id and a.user_id = auth.uid()));

-- Avis : lecture des avis publiés ; création et modération côté serveur
create policy "avis publiés visibles" on public.reviews for select using (status = 'published' or public.is_admin());

-- Événements : l'artisan lit les siens ; l'écriture passe par le serveur
create policy "lire ses statistiques" on public.events for select using (
  exists (select 1 from public.artisans a where a.id = artisan_id and a.user_id = auth.uid()));

-- Boosts : les boosts actifs sont publics (nécessaires au classement), l'artisan voit les siens ; aucune écriture client
create policy "boosts actifs visibles" on public.boosts for select using (
  (status = 'active' and ends_at > now())
  or exists (select 1 from public.artisans a where a.id = artisan_id and a.user_id = auth.uid())
  or public.is_admin());

-- Paiements : l'artisan lit les siens ; aucune écriture client
create policy "lire ses paiements" on public.payments for select using (
  public.is_admin() or exists (select 1 from public.boosts b join public.artisans a on a.id = b.artisan_id
    where b.id = boost_id and a.user_id = auth.uid()));
