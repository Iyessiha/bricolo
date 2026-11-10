-- Zones rangées en deux niveaux : ville -> communes / quartiers.
-- Choisir une ville = « toute la ville » : l'artisan est trouvé dans chacun de ses quartiers (une seule zone dans la limite du forfait).

alter table public.zones add column parent_id uuid references public.zones(id) on delete set null;
create index zones_parent_idx on public.zones (parent_id);

-- Abidjan n'existait pas comme zone : on la crée (ses communes en dépendent).
insert into public.zones (country_code, name, price_factor) values ('ci', 'Abidjan', 1)
on conflict (country_code, name) do nothing;

create temp table _fam (country text, ville text, quartier text);
insert into _fam values
 ('ci','Abidjan','Abobo'),('ci','Abidjan','Adjamé'),('ci','Abidjan','Anyama'),('ci','Abidjan','Attécoubé'),('ci','Abidjan','Bingerville'),
 ('ci','Abidjan','Cocody'),('ci','Abidjan','Koumassi'),('ci','Abidjan','Marcory'),('ci','Abidjan','Plateau'),('ci','Abidjan','Port-Bouët'),
 ('ci','Abidjan','Treichville'),('ci','Abidjan','Yopougon'),
 ('sn','Dakar','Almadies'),('sn','Dakar','Cambérène'),('sn','Dakar','Dalifort'),('sn','Dakar','Fann'),('sn','Dakar','Golf Sud'),('sn','Dakar','Grand-Yoff'),
 ('sn','Dakar','Guédiawaye'),('sn','Dakar','Hann'),('sn','Dakar','HLM'),('sn','Dakar','Keur Massar'),('sn','Dakar','Liberté'),('sn','Dakar','Malika'),
 ('sn','Dakar','Mbao'),('sn','Dakar','Médina'),('sn','Dakar','Mermoz'),('sn','Dakar','Ngor'),('sn','Dakar','Ouakam'),('sn','Dakar','Parcelles Assainies'),
 ('sn','Dakar','Patte d''Oie'),('sn','Dakar','Pikine'),('sn','Dakar','Plateau-Dakar'),('sn','Dakar','Point E'),('sn','Dakar','Rufisque'),
 ('sn','Dakar','Sacré-Cœur'),('sn','Dakar','Sicap'),('sn','Dakar','Thiaroye'),('sn','Dakar','Yoff'),
 ('bf','Ouagadougou','Bogodogo'),('bf','Ouagadougou','Cissin'),('bf','Ouagadougou','Dapoya'),('bf','Ouagadougou','Dassasgho'),('bf','Ouagadougou','Gounghin'),
 ('bf','Ouagadougou','Karpala'),('bf','Ouagadougou','Komsilga'),('bf','Ouagadougou','Kossodo'),('bf','Ouagadougou','Koubri'),('bf','Ouagadougou','Loumbila'),
 ('bf','Ouagadougou','Nongr-Massom'),('bf','Ouagadougou','Ouaga 2000'),('bf','Ouagadougou','Patte d''Oie'),('bf','Ouagadougou','Pissy'),('bf','Ouagadougou','Saaba'),
 ('bf','Ouagadougou','Sarfalao'),('bf','Ouagadougou','Somgandé'),('bf','Ouagadougou','Tanghin'),('bf','Ouagadougou','Tanghin-Dassouri'),('bf','Ouagadougou','Wemtenga'),
 ('bf','Ouagadougou','Zogona'),('bf','Ouagadougou','Zone du Bois'),
 ('ml','Bamako','ACI 2000'),('ml','Bamako','Baco-Djicoroni'),('ml','Bamako','Badalabougou'),('ml','Bamako','Bamako Coura'),('ml','Bamako','Daoudabougou'),
 ('ml','Bamako','Djélibougou'),('ml','Bamako','Faladié'),('ml','Bamako','Hamdallaye'),('ml','Bamako','Hippodrome'),('ml','Bamako','Kalaban Coro'),
 ('ml','Bamako','Kalaban Coura'),('ml','Bamako','Korofina'),('ml','Bamako','Lafiabougou'),('ml','Bamako','Magnambougou'),('ml','Bamako','Médina Coura'),
 ('ml','Bamako','Missira'),('ml','Bamako','Niamakoro'),('ml','Bamako','Quinzambougou'),('ml','Bamako','Sabalibougou'),('ml','Bamako','Sébénikoro'),
 ('ml','Bamako','Senou'),('ml','Bamako','Sogoniko'),('ml','Bamako','Torokorobougou'),('ml','Bamako','Yirimadio'),
 ('ne','Niamey','Boukoki'),('ne','Niamey','Gamkallé'),('ne','Niamey','Harobanda'),('ne','Niamey','Lazaret'),('ne','Niamey','Yantala'),
 ('bj','Cotonou','Agla'),('bj','Cotonou','Akpakpa'),('bj','Cotonou','Cadjehoun'),('bj','Cotonou','Fidjrossè'),('bj','Cotonou','Haie Vive'),
 ('bj','Abomey-Calavi','Akassato'),('bj','Abomey-Calavi','Cococodji'),('bj','Abomey-Calavi','Godomey'),('bj','Abomey-Calavi','Togba'),('bj','Abomey-Calavi','Zinvié'),
 ('bj','Sèmè-Podji','Ekpè'),
 ('tg','Lomé','Adétikopé'),('tg','Lomé','Adidogomé'),('tg','Lomé','Agoè'),('tg','Lomé','Akodésséwa'),('tg','Lomé','Avédji'),('tg','Lomé','Baguida'),
 ('tg','Lomé','Bè'),('tg','Lomé','Djidjolé'),('tg','Lomé','Hanoukopé'),('tg','Lomé','Hédzranawoé'),('tg','Lomé','Kodjoviakopé'),('tg','Lomé','Nyékonakpoè'),('tg','Lomé','Tokoin');

update public.zones q set parent_id = p.id
from _fam f join public.zones p on p.country_code = f.country and p.name = f.ville
where q.country_code = f.country and q.name = f.quartier and q.id <> p.id;

drop table _fam;

-- Les zones qui couvrent une zone : elle-même, sa ville, et ses quartiers.
create function public.zone_family(z uuid) returns uuid[] language sql stable security invoker set search_path = public as $$
  select array[z] || coalesce((select array[parent_id] from public.zones where id = z and parent_id is not null), '{}')
    || coalesce((select array_agg(id) from public.zones where parent_id = z), '{}');
$$;

-- Recherche : un artisan qui couvre « Abidjan » apparaît dans chaque commune, et inversement.
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
        join public.zones z on z.id = az.zone_id where az.artisan_id = a.id), '{}') as zones,
      a.photo_url, a.experience_years, a.diploma_verified, a.hours, a.open_24_7,
      (a.takes_urgent or (a.verified and exists (select 1 from public.boosts b
        where b.artisan_id = a.id and b.status = 'active' and b.ends_at > now() and b.type = 'urgence'
          and (p_zone is null or b.zone_id = any(public.zone_family(p_zone)))))) as takes_urgent,
      coalesce(a.cover_url, (select p.url from public.portfolio_photos p where p.artisan_id = a.id order by p.created_at limit 1)) as cover_url, a.headline, public.artisan_is_pro(a.id) as is_pro
    from public.artisans a
    where a.status = 'approved' and a.country_code = p_country
      and (p_trade is null or a.trade_id = p_trade)
      and (p_zone is null or exists (select 1 from public.artisan_zones az where az.artisan_id = a.id and az.zone_id = any(public.zone_family(p_zone))))
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
