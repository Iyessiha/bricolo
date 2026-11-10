-- Signalements de clients et sanctions contre les artisans.
-- Aucune politique RLS : tout passe par le serveur (service role).

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  artisan_id uuid not null references public.artisans(id) on delete cascade,
  reason text not null check (reason in ('travail','arnaque','comportement','identite','autre')),
  details text not null check (char_length(details) between 10 and 1500),
  reporter_name text check (char_length(reporter_name) <= 80),
  reporter_contact text not null check (char_length(reporter_contact) between 5 and 120),
  ip_hash text,
  status text not null default 'new' check (status in ('new','upheld','dismissed')),
  resolution text check (char_length(resolution) <= 1000),
  resolved_by text,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);
create index reports_status_idx on public.reports (status, created_at desc);
create index reports_artisan_idx on public.reports (artisan_id);
alter table public.reports enable row level security;

create table public.artisan_sanctions (
  id uuid primary key default gen_random_uuid(),
  artisan_id uuid not null references public.artisans(id) on delete cascade,
  report_id uuid references public.reports(id) on delete set null,
  kind text not null check (kind in ('avertissement','badge_retire','suspension','bannissement')),
  reason text not null check (char_length(reason) between 5 and 1000),
  created_by text,
  created_at timestamptz not null default now()
);
create index sanctions_artisan_idx on public.artisan_sanctions (artisan_id, created_at desc);
alter table public.artisan_sanctions enable row level security;

-- Anti-abus : un même visiteur ne signale pas le même artisan en boucle, ni en masse.
create function public.reports_throttle() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from public.reports where artisan_id = new.artisan_id and lower(reporter_contact) = lower(new.reporter_contact) and created_at > now() - interval '1 day') then
    raise exception 'signalement_deja_envoye';
  end if;
  if new.ip_hash is not null and (select count(*) from public.reports where ip_hash = new.ip_hash and created_at > now() - interval '1 day') >= 5 then
    raise exception 'trop_de_signalements';
  end if;
  return new;
end $$;
create trigger reports_throttle before insert on public.reports for each row execute function public.reports_throttle();
revoke execute on function public.reports_throttle() from public, anon, authenticated;
