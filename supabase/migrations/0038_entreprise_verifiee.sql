-- Une fiche n'est présentée comme « Entreprise » que si le registre de commerce ou un diplôme/certification est vérifié par l'équipe.
alter table public.artisan_companies add column if not exists verified_at timestamptz;
alter table public.artisan_companies add column if not exists verified_by uuid;
alter table public.artisans add column if not exists registration_verified boolean not null default false;

-- Seul l'administrateur valide ; changer le numéro annule la validation.
create or replace function public.guard_company_update() returns trigger language plpgsql set search_path to 'public' as $$
begin
  if tg_op = 'INSERT' then
    if auth.uid() is not null and current_user = 'authenticated' and not public.is_admin() then new.verified_at := null; new.verified_by := null; end if;
  else
    if new.registration_number is distinct from old.registration_number then
      new.verified_at := null; new.verified_by := null;
    elsif auth.uid() is not null and current_user = 'authenticated' and not public.is_admin() then
      new.verified_at := old.verified_at; new.verified_by := old.verified_by;
    end if;
  end if;
  return new;
end $$;
drop trigger if exists companies_guard on public.artisan_companies;
create trigger companies_guard before insert or update on public.artisan_companies for each row execute function public.guard_company_update();

-- Copie publique du statut (la table artisan_companies n'est lisible que par l'artisan et l'admin).
create or replace function public.sync_registration_verified() returns trigger language plpgsql security definer set search_path to 'public' as $$
begin
  if tg_op = 'DELETE' then
    update public.artisans set registration_verified = false where id = old.artisan_id;
    return old;
  end if;
  update public.artisans set registration_verified = (new.verified_at is not null) where id = new.artisan_id;
  return new;
end $$;
drop trigger if exists companies_sync on public.artisan_companies;
create trigger companies_sync after insert or update or delete on public.artisan_companies for each row execute function public.sync_registration_verified();

-- L'artisan ne peut pas se valider lui-même sur sa fiche.
create or replace function public.guard_artisan_update() returns trigger language plpgsql set search_path to 'public' as $$
begin
  if auth.uid() is not null and current_user = 'authenticated' and not public.is_admin() then
    if tg_op = 'INSERT' then
      new.status := 'pending'; new.verified := false; new.avg_rating := null; new.review_count := 0;
      new.diploma_verified := false; new.diploma_title := null; new.reject_reason := null; new.registration_verified := false;
    else
      new.status := old.status; new.verified := old.verified; new.avg_rating := old.avg_rating;
      new.review_count := old.review_count; new.country_code := old.country_code; new.user_id := old.user_id;
      new.diploma_verified := old.diploma_verified; new.diploma_title := old.diploma_title; new.reject_reason := old.reject_reason;
      new.registration_verified := old.registration_verified;
    end if;
  end if;
  return new;
end $$;
