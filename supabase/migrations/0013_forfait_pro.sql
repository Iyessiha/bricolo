-- Bricolo : Forfait Pro (abonnement mensuel). Gratuit : 1 prestation, 8 photos. Pro : 10 prestations, 20 photos, badge Pro.
create table public.plan_prices (
  country_code text primary key references public.countries(code),
  amount int not null check (amount >= 0)
);
insert into public.plan_prices (country_code, amount) select code, 3000 from public.countries;
alter table public.plan_prices enable row level security;
create policy "tarifs visibles" on public.plan_prices for select using (true);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  artisan_id uuid not null references public.artisans(id) on delete cascade,
  months int not null default 1 check (months between 1 and 12),
  amount int not null,
  status text not null default 'pending' check (status in ('pending','active','expired','cancelled')),
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now()
);
create index subscriptions_artisan_idx on public.subscriptions (artisan_id, status, ends_at);
alter table public.subscriptions enable row level security;
create policy "lire ses abonnements" on public.subscriptions for select using (
  public.is_admin() or exists (select 1 from public.artisans a where a.id = artisan_id and a.user_id = auth.uid()));

alter table public.payments alter column boost_id drop not null;
alter table public.payments add column subscription_id uuid references public.subscriptions(id) on delete cascade;
alter table public.payments add constraint payments_target check (boost_id is not null or subscription_id is not null);

create or replace function public.artisan_is_pro(a uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.subscriptions where artisan_id = a and status = 'active' and ends_at > now());
$$;

create or replace function public.limit_services() returns trigger language plpgsql set search_path = public as $$
begin
  if (select count(*) from public.artisan_services where artisan_id = new.artisan_id) >= (case when public.artisan_is_pro(new.artisan_id) then 10 else 1 end) then raise exception 'prestations_pleines'; end if;
  return new;
end $$;
create or replace function public.limit_portfolio() returns trigger language plpgsql set search_path = public as $$
begin
  if (select count(*) from public.portfolio_photos where artisan_id = new.artisan_id) >= (case when public.artisan_is_pro(new.artisan_id) then 20 else 8 end) then raise exception 'portfolio_plein'; end if;
  return new;
end $$;

drop function public.search_artisans(text, uuid, uuid, boolean, text, boolean);
create function public.search_artisans(
  p_country text, p_trade uuid default null, p_zone uuid default null,
  p_verified boolean default false, p_seed text default '', p_open boolean default false
) returns table (
  id uuid, name text, trade_id uuid, description text, price_label text, phone text, whatsapp text,
  verified boolean, avg_rating numeric, review_count int, sponsored boolean, zones text[],
  photo_url text, experience_years int, diploma_verified boolean,
  hours jsonb, open_24_7 boolean, takes_urgent boolean, cover_url text, headline text, is_pro boolean
) language sql stable security invoker set search_path = public as $$
  select * from (
    select a.id, a.name, a.trade_id, a.description, a.price_label, a.phone, a.whatsapp,
      a.verified, a.avg_rating, a.review_count,
      exists (select 1 from public.boosts b
        where b.artisan_id = a.id and b.status = 'active' and b.ends_at > now()
          and b.type in ('recherche','cible') and (p_zone is null or b.zone_id = p_zone)) as sponsored,
      coalesce((select array_agg(z.name order by z.name) from public.artisan_zones az
        join public.zones z on z.id = az.zone_id where az.artisan_id = a.id), '{}') as zones,
      a.photo_url, a.experience_years, a.diploma_verified, a.hours, a.open_24_7, a.takes_urgent,
      coalesce(a.cover_url, (select p.url from public.portfolio_photos p where p.artisan_id = a.id order by p.created_at limit 1)) as cover_url, a.headline, public.artisan_is_pro(a.id) as is_pro
    from public.artisans a
    where a.status = 'approved' and a.country_code = p_country
      and (p_trade is null or a.trade_id = p_trade)
      and (p_zone is null or exists (select 1 from public.artisan_zones az where az.artisan_id = a.id and az.zone_id = p_zone))
      and (not p_verified or a.verified)
      and (not p_open or public.is_open_now(a.hours, a.open_24_7, a.country_code))
  ) s
  order by s.sponsored desc,
    case when s.sponsored then md5(s.id::text || p_seed) end,
    (case when s.verified then 10 else 0 end + case when s.diploma_verified then 2 else 0 end
      + coalesce(s.avg_rating, 0) * 2 + least(s.review_count, 50) / 25.0) desc,
    s.name;
$$;
