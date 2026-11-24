-- Mode d'affichage de la cover par défaut d'un métier : photo (téléversée ou du site) ou dessin SVG généré.
-- RLS activé sans politique : seul le serveur (clé de service) lit et écrit.
create table if not exists public.trade_default_covers (
  slug text primary key,
  mode text not null default 'photo' check (mode in ('photo','svg')),
  updated_at timestamptz not null default now()
);
alter table public.trade_default_covers enable row level security;
