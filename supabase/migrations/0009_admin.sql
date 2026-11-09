-- Bricolo : back-office administrateur (suspension, notes internes, journal d'activité).
do $$
declare c text;
begin
  select conname into c from pg_constraint where conrelid = 'public.artisans'::regclass and contype = 'c' and pg_get_constraintdef(oid) like '%pending%approved%rejected%';
  if c is not null then execute format('alter table public.artisans drop constraint %I', c); end if;
end $$;
alter table public.artisans add constraint artisans_status_check check (status in ('pending','approved','rejected','suspended'));
alter table public.artisans add column admin_note text, add column suspended_at timestamptz;

create table public.admin_audit (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid,
  admin_email text,
  action text not null,
  target_type text,
  target_id text,
  label text,
  detail jsonb,
  created_at timestamptz not null default now()
);
create index admin_audit_created_idx on public.admin_audit (created_at desc);
alter table public.admin_audit enable row level security; -- aucune politique : lecture et écriture par le serveur uniquement
