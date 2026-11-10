-- Durcissement avant lancement
-- 1. Les fonctions sensibles ne sont plus appelables sans connexion.
revoke execute on function public.review_artisan(uuid, boolean, text) from public, anon;
revoke execute on function public.review_diploma(uuid, boolean, text) from public, anon;
revoke execute on function public.submit_diploma(text, text) from public, anon;
revoke execute on function public.submit_identity(text, text, text, text, text, text) from public, anon;
revoke execute on function public.kyc_locked() from public, anon;
grant execute on function public.review_artisan(uuid, boolean, text) to authenticated;
grant execute on function public.review_diploma(uuid, boolean, text) to authenticated;
grant execute on function public.submit_diploma(text, text) to authenticated;
grant execute on function public.submit_identity(text, text, text, text, text, text) to authenticated;
grant execute on function public.kyc_locked() to authenticated;

-- 2. Un artisan ne peut modifier que le statut de ses demandes (pas le texte, l'e-mail ou l'auteur).
drop policy if exists "répondre à ses demandes" on public.service_requests;
create policy "répondre à ses demandes" on public.service_requests for update
  using (exists (select 1 from public.artisans a where a.id = service_requests.artisan_id and a.user_id = auth.uid()))
  with check (exists (select 1 from public.artisans a where a.id = service_requests.artisan_id and a.user_id = auth.uid()));
revoke update on public.service_requests from anon, authenticated;
grant update (status) on public.service_requests to authenticated;
