-- Forfait Pro : un boost recherche de 24 h offert par mois, une semaine d'essai gratuite (une seule par artisan), et un bilan envoyé avant la fin.
alter table public.boosts add column if not exists free_period text;
create unique index if not exists boosts_free_once on public.boosts (artisan_id, free_period) where free_period is not null;
alter table public.subscriptions add column if not exists trial boolean not null default false;
alter table public.subscriptions add column if not exists recap_sent_at timestamptz;
create unique index if not exists subscriptions_one_trial on public.subscriptions (artisan_id) where trial;
