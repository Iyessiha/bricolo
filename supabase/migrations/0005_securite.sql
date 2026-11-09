-- Bricolo : sécurité — pas de faux e-mails, pas de doublons, limitation des abus.

-- ───────── Adresses jetables ─────────
create table public.blocked_email_domains (domain text primary key);
alter table public.blocked_email_domains enable row level security; -- aucune politique : accès réservé aux fonctions ci-dessous
insert into public.blocked_email_domains (domain) values ('10minemail.com'),('10minutemail.com'),('10minutemail.net'),('20minutemail.com'),('anonaddy.me'),('anonbox.net'),('armyspy.com'),('bugmenot.com'),('burner.email'),('burnermail.io'),('crazymailing.com'),('cuvox.de'),('dayrep.com'),('discard.email'),('discardmail.com'),('dispostable.com'),('dropmail.me'),('e4ward.com'),('einrot.com'),('emailondeck.com'),('emlhub.com'),('emltmp.com'),('fakeinbox.com'),('fakemail.net'),('fakemailgenerator.com'),('fleckens.hu'),('getnada.com'),('grr.la'),('guerrillamail.biz'),('guerrillamail.com'),('guerrillamail.de'),('guerrillamail.info'),('guerrillamail.net'),('guerrillamail.org'),('guerrillamailblock.com'),('gustr.com'),('harakirimail.com'),('inboxkitten.com'),('instant-mail.de'),('internxt.com'),('jetable.net'),('jetable.org'),('jourrapide.com'),('lroid.com'),('luxusmail.org'),('mail-temporary.com'),('mail.gw'),('mail.tm'),('mailbox.in.ua'),('mailcatch.com'),('maildrop.cc'),('mailforspam.com'),('mailinator.com'),('mailnesia.com'),('mailpoof.com'),('mailsac.com'),('mailtemp.info'),('mintemail.com'),('moakt.cc'),('moakt.com'),('mohmal.com'),('mvrht.net'),('mytemp.email'),('nada.email'),('nada.ltd'),('nospam.ze.tc'),('owlymail.com'),('pokemail.net'),('rhyta.com'),('sharklasers.com'),('spam4.me'),('spambox.us'),('spamdecoy.net'),('spamgourmet.com'),('superrito.com'),('teleworm.us'),('temp-mail.io'),('temp-mail.org'),('tempail.com'),('tempinbox.com'),('tempinbox.xyz'),('tempmail.com'),('tempmail.dev'),('tempmail.net'),('tempmailo.com'),('temporary-mail.net'),('tempr.email'),('throwam.com'),('throwawaymail.com'),('tmail.ws'),('tmails.net'),('tmpbox.net'),('tmpmail.net'),('tmpmail.org'),('trash-mail.com'),('trashmail.com'),('trashmail.de'),('trashmail.net'),('vomoto.com'),('wegwerf-email.de'),('wegwerfemail.de'),('wegwerfmail.de'),('wegwerfmail.net'),('yopmail.com'),('yopmail.fr'),('yopmail.net'),('zetmail.com') on conflict do nothing;

create function public.canonical_email(e text) returns text language sql immutable set search_path = public as $$
  select case
    when split_part(lower(trim(e)), '@', 2) in ('gmail.com','googlemail.com')
      then replace(split_part(split_part(lower(trim(e)), '@', 1), '+', 1), '.', '') || '@gmail.com'
    else split_part(split_part(lower(trim(e)), '@', 1), '+', 1) || '@' || split_part(lower(trim(e)), '@', 2)
  end;
$$;

-- Appliqué dans la base car l'API d'inscription de Supabase est publique : on ne peut pas se contenter du site.
create function public.auth_block_disposable() returns trigger language plpgsql security definer set search_path = public as $$
declare d text := lower(split_part(new.email, '@', 2));
begin
  if exists (select 1 from public.blocked_email_domains b where d = b.domain or d like '%.' || b.domain) then
    raise exception 'email_jetable';
  end if;
  return new;
end $$;
create trigger auth_block_disposable before insert on auth.users for each row execute function public.auth_block_disposable();

-- ───────── Un seul compte artisan par boîte e-mail (alias « + » et points Gmail ramenés à l'adresse réelle) ─────────
alter table public.profiles add column email_canonical text;
update public.profiles set email_canonical = public.canonical_email(email);
create unique index profiles_artisan_email_canonical_idx on public.profiles (email_canonical) where role = 'artisan';

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare c text := lower(coalesce(new.raw_user_meta_data->>'country_code',''));
begin
  insert into public.profiles (id, email, email_canonical, country_code)
  values (new.id, new.email, public.canonical_email(new.email), (select code from public.countries where code = c))
  on conflict (id) do nothing;
  return new;
end $$;

-- ───────── Un numéro de téléphone ou WhatsApp = un seul profil ─────────
alter table public.artisans add column phone_key text, add column whatsapp_key text;
create function public.phone_key(p text) returns text language sql immutable set search_path = public as $$
  select case when length(regexp_replace(coalesce(p, ''), '\D', '', 'g')) >= 8 then right(regexp_replace(p, '\D', '', 'g'), 8) end;
$$;
create function public.artisans_unique_contact() returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.phone_key := public.phone_key(new.phone);
  new.whatsapp_key := public.phone_key(new.whatsapp);
  if new.phone_key is not null or new.whatsapp_key is not null then
    if exists (select 1 from public.artisans a where a.id <> new.id
        and (a.phone_key in (new.phone_key, new.whatsapp_key) or a.whatsapp_key in (new.phone_key, new.whatsapp_key))) then
      raise exception 'telephone_deja_utilise';
    end if;
  end if;
  return new;
end $$;
create trigger artisans_unique_contact before insert or update on public.artisans for each row execute function public.artisans_unique_contact();

-- ───────── Une entreprise (numéro d'immatriculation) = un seul profil ─────────
create unique index artisan_companies_registration_idx on public.artisan_companies (upper(regexp_replace(registration_number, '[^A-Za-z0-9]', '', 'g')))
  where registration_number is not null and registration_number <> '';

-- ───────── Une pièce d'identité = un seul compte (empreinte du numéro, jamais le numéro lui-même) ─────────
alter table public.artisan_identity add column doc_hash text, add column doc_last4 text;
create unique index artisan_identity_doc_hash_idx on public.artisan_identity (doc_hash) where doc_hash is not null;

drop function public.submit_identity(text, text, text, text);
create function public.submit_identity(p_doc_type text, p_front text, p_back text, p_selfie text, p_doc_hash text, p_doc_last4 text) returns void
language plpgsql security definer set search_path = public as $$
declare a public.artisans%rowtype; uid uuid := auth.uid(); pre text;
begin
  if uid is null then raise exception 'auth'; end if;
  pre := uid::text || '/';
  select * into a from public.artisans where user_id = uid;
  if not found then raise exception 'profil_requis'; end if;
  if a.photo_url is null then raise exception 'photo_requise'; end if;
  if p_doc_type not in ('cni','passeport','permis','carte_consulaire') then raise exception 'type_invalide'; end if;
  if coalesce(p_doc_hash, '') !~ '^[0-9a-f]{64}$' then raise exception 'numero_invalide'; end if;
  if left(coalesce(p_front,''), length(pre)) <> pre or left(coalesce(p_selfie,''), length(pre)) <> pre
     or (p_back is not null and left(p_back, length(pre)) <> pre) then raise exception 'chemin_invalide'; end if;
  if exists (select 1 from public.artisan_identity where artisan_id = a.id and status = 'approved') then raise exception 'deja_verifie'; end if;
  begin
    insert into public.artisan_identity (artisan_id, doc_type, front_path, back_path, selfie_path, doc_hash, doc_last4)
    values (a.id, p_doc_type, p_front, nullif(p_back,''), p_selfie, p_doc_hash, left(p_doc_last4, 4))
    on conflict (artisan_id) do update set doc_type = excluded.doc_type, front_path = excluded.front_path,
      back_path = excluded.back_path, selfie_path = excluded.selfie_path, doc_hash = excluded.doc_hash, doc_last4 = excluded.doc_last4,
      status = 'pending', reject_reason = null, submitted_at = now(), reviewed_by = null, reviewed_at = null;
  exception when unique_violation then raise exception 'piece_deja_utilisee';
  end;
  update public.artisans set status = 'pending', reject_reason = null where id = a.id and status = 'rejected';
end $$;
revoke all on function public.submit_identity(text,text,text,text,text,text) from public, anon;
grant execute on function public.submit_identity(text,text,text,text,text,text) to authenticated;

-- ───────── Demandes de clients : limitation des abus (chaque demande envoie des e-mails) ─────────
alter table public.service_requests add column ip_hash text;
create function public.service_requests_throttle() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from public.service_requests where artisan_id = new.artisan_id and lower(client_email) = lower(new.client_email) and created_at > now() - interval '1 hour') then
    raise exception 'demande_deja_envoyee';
  end if;
  if (select count(*) from public.service_requests where lower(client_email) = lower(new.client_email) and created_at > now() - interval '1 day') >= 3 then
    raise exception 'trop_de_demandes';
  end if;
  if new.ip_hash is not null and (select count(*) from public.service_requests where ip_hash = new.ip_hash and created_at > now() - interval '1 day') >= 10 then
    raise exception 'trop_de_demandes';
  end if;
  return new;
end $$;
create trigger service_requests_throttle before insert on public.service_requests for each row execute function public.service_requests_throttle();

-- Ces fonctions ne sont que des déclencheurs : personne ne doit pouvoir les appeler via l'API.
revoke execute on function public.auth_block_disposable(), public.artisans_unique_contact(), public.service_requests_throttle() from public, anon, authenticated;
