-- Détail d'une prestation : ce qui est inclus dans le prix, et ce qui est facturé en supplément (ex. recharge de gaz).
alter table public.artisan_services
  add column if not exists included text[] not null default '{}' check (cardinality(included) <= 8),
  add column if not exists extras text[] not null default '{}' check (cardinality(extras) <= 6);
