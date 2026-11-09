-- Bricolo : un artisan peut créer son profil à titre individuel ou au nom d'une entreprise.
alter table public.artisans
  add column account_type text not null default 'individuel' check (account_type in ('individuel','entreprise')),
  add column company_name text check (char_length(company_name) <= 120);

-- Le numéro d'immatriculation (RCCM, IFU, NIF, NINEA…) reste privé : visible seulement par l'artisan et l'administration.
create table public.artisan_companies (
  artisan_id uuid primary key references public.artisans(id) on delete cascade,
  registration_number text check (char_length(registration_number) <= 60),
  updated_at timestamptz not null default now()
);
alter table public.artisan_companies enable row level security;

create policy "voir son immatriculation" on public.artisan_companies for select using (
  public.is_admin() or exists (select 1 from public.artisans a where a.id = artisan_id and a.user_id = auth.uid()));
create policy "créer son immatriculation" on public.artisan_companies for insert with check (
  exists (select 1 from public.artisans a where a.id = artisan_id and a.user_id = auth.uid()));
create policy "modifier son immatriculation" on public.artisan_companies for update
  using (exists (select 1 from public.artisans a where a.id = artisan_id and a.user_id = auth.uid()))
  with check (exists (select 1 from public.artisans a where a.id = artisan_id and a.user_id = auth.uid()));
create policy "supprimer son immatriculation" on public.artisan_companies for delete using (
  exists (select 1 from public.artisans a where a.id = artisan_id and a.user_id = auth.uid()));
