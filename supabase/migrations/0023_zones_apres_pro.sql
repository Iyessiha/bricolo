-- Fin du Forfait Pro : l'artisan garde ses 3 premières zones (quartiers). Les autres zones et « toute la ville » ne comptent plus dans la recherche.
alter table public.artisan_zones add column if not exists position smallint not null default 0;
update public.artisan_zones az set position = r.rn - 1
from (select artisan_id, zone_id, row_number() over (partition by artisan_id order by zone_id) rn from public.artisan_zones) r
where r.artisan_id = az.artisan_id and r.zone_id = az.zone_id;

create or replace function public.zone_is_active(p_artisan uuid, p_zone uuid, p_pos smallint)
returns boolean language sql stable security invoker set search_path = public as $$
  select public.artisan_is_pro(p_artisan)
    or (p_pos < 3 and not exists (select 1 from public.zones c where c.parent_id = p_zone));
$$;

create or replace function public.search_artisans(
  p_country text, p_trade uuid default null, p_zone uuid default null,
  p_verified boolean default false, p_seed text default '', p_open boolean default false, p_urgent boolean default false
) returns table (
  id uuid, name text, trade_id uuid, description text, price_label text, phone text, whatsapp text,
  verified boolean, avg_rating numeric, review_count int, sponsored boolean, zones text[],
  photo_url text, experience_years int, diploma_verified boolean,
  hours jsonb, open_24_7 boolean, takes_urgent boolean, cover_url text, headline text, is_pro boolean
) language sql stable security invoker set search_path = public as $$
  select s.id, s.name, s.trade_id, s.description, s.price_label, s.phone, s.whatsapp,
    s.verified, s.avg_rating, s.review_count, s.sponsored, s.zones,
    s.photo_url, s.experience_years, s.diploma_verified, s.hours, s.open_24_7, s.takes_urgent, s.cover_url, s.headline, s.is_pro
  from (
    select a.id, a.name, a.trade_id, a.description, a.price_label, a.phone, a.whatsapp,
      a.verified, a.avg_rating, a.review_count,
      a.verified and exists (select 1 from public.boosts b
        where b.artisan_id = a.id and b.status = 'active' and b.ends_at > now()
          and (b.type in ('recherche','cible') or (p_urgent and b.type = 'urgence'))
          and (p_zone is null or b.zone_id = any(public.zone_family(p_zone)))) as sponsored,
      coalesce((select array_agg(z.name order by z.name) from public.artisan_zones az
        join public.zones z on z.id = az.zone_id where az.artisan_id = a.id and public.zone_is_active(az.artisan_id, az.zone_id, az.position)), '{}') as zones,
      a.photo_url, a.experience_years, a.diploma_verified, a.hours, a.open_24_7,
      (a.takes_urgent or (a.verified and exists (select 1 from public.boosts b
        where b.artisan_id = a.id and b.status = 'active' and b.ends_at > now() and b.type = 'urgence'
          and (p_zone is null or b.zone_id = any(public.zone_family(p_zone)))))) as takes_urgent,
      coalesce(a.cover_url, (select p.url from public.portfolio_photos p where p.artisan_id = a.id order by p.created_at limit 1)) as cover_url, a.headline, public.artisan_is_pro(a.id) as is_pro
    from public.artisans a
    where a.status = 'approved' and a.country_code = p_country
      and (p_trade is null or a.trade_id = p_trade)
      and (p_zone is null or exists (select 1 from public.artisan_zones az where az.artisan_id = a.id and az.zone_id = any(public.zone_family(p_zone))
        and public.zone_is_active(az.artisan_id, az.zone_id, az.position)))
      and (not p_verified or a.verified)
      and (not p_open or public.is_open_now(a.hours, a.open_24_7, a.country_code))
  ) s
  where (not p_urgent or s.takes_urgent)
  order by s.sponsored desc,
    case when s.sponsored then md5(s.id::text || p_seed) end,
    (case when s.verified then 10 else 0 end + case when s.diploma_verified then 2 else 0 end
      + coalesce(s.avg_rating, 0) * 2 + least(s.review_count, 50) / 25.0) desc,
    s.name;
$$;
