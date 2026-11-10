-- Forfait Pro : durées en jours (semaine 7, mois 30, année 365) au lieu de mois.
alter table public.subscriptions add column if not exists days int;
update public.subscriptions set days = months * 30 where days is null;
alter table public.subscriptions alter column days set not null;
alter table public.subscriptions add constraint subscriptions_days_check check (days between 1 and 400);
alter table public.subscriptions alter column months drop not null;
alter table public.subscriptions drop constraint if exists subscriptions_months_check;
