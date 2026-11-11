-- Messagerie d'aide : une conversation par artisan avec l'équipe Bricolo.
-- Service-role uniquement : RLS activée, aucune politique (tout passe par des routes serveur contrôlées).
create table if not exists public.support_messages (
  id uuid primary key default gen_random_uuid(),
  artisan_id uuid not null references public.artisans(id) on delete cascade,
  sender text not null check (sender in ('artisan','admin')),
  sender_user_id uuid references auth.users(id) on delete set null,
  body text not null check (char_length(body) between 1 and 2000),
  read_at timestamptz,            -- lu par l'autre partie
  created_at timestamptz not null default now()
);
create index if not exists support_messages_artisan_idx on public.support_messages(artisan_id, created_at);
create index if not exists support_messages_unread_idx on public.support_messages(sender) where read_at is null;
alter table public.support_messages enable row level security;
