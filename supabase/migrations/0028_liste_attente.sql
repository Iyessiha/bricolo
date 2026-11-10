-- Liste d'attente des pays pas encore ouverts (Cameroun, Tchad, Gabon). Écriture et lecture par le serveur uniquement.
create table if not exists public.waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null check (char_length(email) between 5 and 120),
  country text not null check (country in ('cm','td','ga')),
  role text not null check (role in ('artisan','client')),
  trade text check (char_length(trade) <= 60),
  city text check (char_length(city) <= 60),
  ip_hash text,
  created_at timestamptz not null default now()
);
create unique index if not exists waitlist_unique on public.waitlist (lower(email), country, role);
create index if not exists waitlist_ip_idx on public.waitlist (ip_hash, created_at);
alter table public.waitlist enable row level security;
