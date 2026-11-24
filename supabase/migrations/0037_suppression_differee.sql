-- Suppression de compte différée : 7 jours pour changer d'avis. La fiche est masquée pendant ce délai.
alter table public.artisans add column if not exists deletion_at timestamptz;
alter table public.artisans add column if not exists status_before_deletion text;
