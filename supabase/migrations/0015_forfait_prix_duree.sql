-- Prix du Forfait Pro par durée et par pays. NULL = calculé automatiquement à partir du prix du mois.
alter table public.plan_prices add column if not exists week_amount int check (week_amount is null or week_amount >= 0);
alter table public.plan_prices add column if not exists year_amount int check (year_amount is null or year_amount >= 0);
