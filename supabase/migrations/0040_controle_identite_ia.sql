-- Pré-contrôle automatique des dossiers d'identité (résultat lisible par l'équipe uniquement).
create table if not exists public.identity_ai_checks (
  artisan_id uuid primary key references public.artisans(id) on delete cascade,
  front_path text not null,
  verdict text not null check (verdict in ('conforme','refuser','douter','erreur')),
  reason text,
  details jsonb,
  decided text check (decided in ('refuse_auto','approuve_auto')),
  checked_at timestamptz not null default now()
);
alter table public.identity_ai_checks enable row level security;
-- Aucune politique : seul le serveur (clé service) lit et écrit.
