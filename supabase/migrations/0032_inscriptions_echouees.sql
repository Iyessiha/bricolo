-- Journal des inscriptions qui échouent côté serveur (SMTP, limite d'envoi, erreur inconnue).
-- RLS activé sans politique : seul le serveur (clé de service) lit et écrit.
create table if not exists public.signup_failures (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  email text not null,
  country_code text,
  kind text not null check (kind in ('envoi_email','limite','autre')),
  message text,
  handled boolean not null default false
);
create index if not exists signup_failures_open on public.signup_failures (handled, created_at desc);
alter table public.signup_failures enable row level security;
