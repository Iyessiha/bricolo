-- Bricolo : horaires de disponibilité (facultatifs), urgences, filtre « Ouvert maintenant ».
alter table public.artisans
  add column hours jsonb not null default '{}'::jsonb,
  add column open_24_7 boolean not null default false,
  add column takes_urgent boolean not null default false,
  add constraint artisans_hours_object check (jsonb_typeof(hours) = 'object' and length(hours::text) < 600);

-- Heure locale : Bénin et Niger sont en UTC+1, les autres pays de la liste en UTC.
create function public.is_open_now(p_hours jsonb, p_247 boolean, p_country text) returns boolean
language sql stable set search_path = public as $$
  with t as (select (now() at time zone case when p_country in ('bj','ne') then 'Africa/Lagos' else 'Africa/Abidjan' end) as l)
  select coalesce(p_247, false) or coalesce((
    select (t.l::time >= (p_hours -> (extract(isodow from t.l)::int)::text ->> 0)::time
        and t.l::time <  (p_hours -> (extract(isodow from t.l)::int)::text ->> 1)::time)
    from t), false);
$$;

drop function public.search_artisans(text, uuid, uuid, boolean, text);
create function public.search_artisans(
  p_country text, p_trade uuid default null, p_zone uuid default null,
  p_verified boolean default false, p_seed text default '', p_open boolean default false
) returns table (
  id uuid, name text, trade_id uuid, description text, price_label text, phone text, whatsapp text,
  verified boolean, avg_rating numeric, review_count int, sponsored boolean, zones text[],
  photo_url text, experience_years int, diploma_verified boolean,
  hours jsonb, open_24_7 boolean, takes_urgent boolean
) language sql stable security invoker set search_path = public as $$
  select * from (
    select a.id, a.name, a.trade_id, a.description, a.price_label, a.phone, a.whatsapp,
      a.verified, a.avg_rating, a.review_count,
      exists (select 1 from public.boosts b
        where b.artisan_id = a.id and b.status = 'active' and b.ends_at > now()
          and b.type in ('recherche','cible') and (p_zone is null or b.zone_id = p_zone)) as sponsored,
      coalesce((select array_agg(z.name order by z.name) from public.artisan_zones az
        join public.zones z on z.id = az.zone_id where az.artisan_id = a.id), '{}') as zones,
      a.photo_url, a.experience_years, a.diploma_verified, a.hours, a.open_24_7, a.takes_urgent
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
