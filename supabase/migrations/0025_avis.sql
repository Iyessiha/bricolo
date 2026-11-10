-- Avis clients : liens personnels à usage unique, mention « avis vérifié », réponse de l'artisan.
alter table public.reviews
  add column if not exists verified_by text check (verified_by in ('artisan','demande')),
  add column if not exists artisan_reply text check (char_length(artisan_reply) <= 400),
  add column if not exists replied_at timestamptz;

create table public.review_links (
  id uuid primary key default gen_random_uuid(),
  token text not null unique default replace(gen_random_uuid()::text, '-', ''),
  artisan_id uuid not null references public.artisans(id) on delete cascade,
  request_id uuid references public.service_requests(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '30 days',
  used_at timestamptz,
  review_id uuid references public.reviews(id) on delete set null
);
-- Aucune politique : seul le serveur (clé de service) lit et écrit ces liens.
alter table public.review_links enable row level security;
create unique index review_links_request_uidx on public.review_links (request_id) where request_id is not null;
create index review_links_artisan_idx on public.review_links (artisan_id, created_at desc);

-- Un artisan ne peut pas se fabriquer des avis : 10 liens « libres » par période de 30 jours.
create or replace function public.review_links_throttle() returns trigger language plpgsql set search_path = public as $$
begin
  if new.request_id is null and (select count(*) from public.review_links
      where artisan_id = new.artisan_id and request_id is null and created_at > now() - interval '30 days') >= 10 then
    raise exception 'trop_de_liens';
  end if;
  return new;
end $$;
create trigger review_links_throttle before insert on public.review_links for each row execute function public.review_links_throttle();
