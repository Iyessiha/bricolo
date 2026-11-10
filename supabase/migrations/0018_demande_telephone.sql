-- Le client peut laisser un numéro (WhatsApp / téléphone) au lieu d'un e-mail, ou les deux.
alter table public.service_requests add column if not exists client_phone text;
alter table public.service_requests alter column client_email drop not null;
alter table public.service_requests drop constraint if exists service_requests_contact_check;
alter table public.service_requests add constraint service_requests_contact_check
  check (client_email is not null or client_phone is not null);

create or replace function public.service_requests_throttle() returns trigger
language plpgsql security definer set search_path to 'public' as $$
begin
  if new.client_email is not null then
    if exists (select 1 from public.service_requests where artisan_id = new.artisan_id and lower(client_email) = lower(new.client_email) and created_at > now() - interval '1 hour') then
      raise exception 'demande_deja_envoyee';
    end if;
    if (select count(*) from public.service_requests where lower(client_email) = lower(new.client_email) and created_at > now() - interval '1 day') >= 3 then
      raise exception 'trop_de_demandes';
    end if;
  end if;
  if new.client_phone is not null then
    if exists (select 1 from public.service_requests where artisan_id = new.artisan_id and client_phone = new.client_phone and created_at > now() - interval '1 hour') then
      raise exception 'demande_deja_envoyee';
    end if;
    if (select count(*) from public.service_requests where client_phone = new.client_phone and created_at > now() - interval '1 day') >= 3 then
      raise exception 'trop_de_demandes';
    end if;
  end if;
  if new.ip_hash is not null and (select count(*) from public.service_requests where ip_hash = new.ip_hash and created_at > now() - interval '1 day') >= 10 then
    raise exception 'trop_de_demandes';
  end if;
  return new;
end $$;
