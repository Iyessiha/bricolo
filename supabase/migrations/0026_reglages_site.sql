-- Réglages du site (pixels de suivi, vérification des moteurs de recherche, titre et description de l'accueil).
-- Lecture et écriture réservées au serveur (clé de service) : aucune politique, donc aucun accès public.
create table if not exists public.site_settings (
  key text primary key check (key ~ '^[a-z0-9_]{2,40}$'),
  value text not null default '' check (char_length(value) <= 400),
  updated_at timestamptz not null default now()
);
alter table public.site_settings enable row level security;
