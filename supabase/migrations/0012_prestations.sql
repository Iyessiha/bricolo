-- Bricolo : plusieurs prestations par artisan (5 max), chacune avec son « Je vais … » et son tarif.
create table public.artisan_services (
  id uuid primary key default gen_random_uuid(),
  artisan_id uuid not null references public.artisans(id) on delete cascade,
  headline text not null check (char_length(headline) between 10 and 90),
  price_label text check (char_length(price_label) <= 60),
  created_at timestamptz not null default now()
);
create index artisan_services_artisan_idx on public.artisan_services (artisan_id, created_at);
alter table public.artisan_services enable row level security;
create policy "prestations visibles" on public.artisan_services for select using (true);
create policy "gérer ses prestations" on public.artisan_services for all
  using (exists (select 1 from public.artisans a where a.id = artisan_id and a.user_id = auth.uid()))
  with check (exists (select 1 from public.artisans a where a.id = artisan_id and a.user_id = auth.uid()));
create policy "admin gère les prestations" on public.artisan_services for all using (public.is_admin()) with check (public.is_admin());
create or replace function public.limit_services() returns trigger language plpgsql set search_path = public as $$
begin
  if (select count(*) from public.artisan_services where artisan_id = new.artisan_id) >= 5 then raise exception 'prestations_pleines'; end if;
  return new;
end $$;
create trigger services_limit before insert on public.artisan_services for each row execute function public.limit_services();
