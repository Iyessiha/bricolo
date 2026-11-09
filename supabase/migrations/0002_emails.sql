-- Bricolo : e-mails (journal anti-doublon, désabonnement marketing, campagnes).

alter table public.profiles add column marketing_opt_out boolean not null default false;

-- Un e-mail (modèle + référence) n'est envoyé qu'une seule fois.
create table public.email_log (
  id uuid primary key default gen_random_uuid(),
  template text not null,
  ref text not null,
  to_email text not null,
  status text not null default 'pending' check (status in ('pending','sent')),
  provider_id text,
  created_at timestamptz not null default now(),
  unique (template, ref)
);
create index email_log_to_idx on public.email_log (to_email);

create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  subject text not null,
  body text not null,
  audience jsonb not null default '{}'::jsonb,
  recipients int not null default 0,
  sent int not null default 0,
  failed int not null default 0,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.email_log enable row level security;
alter table public.campaigns enable row level security;
create policy "admin lit le journal" on public.email_log for select using (public.is_admin());
create policy "admin lit les campagnes" on public.campaigns for select using (public.is_admin());
