-- Bricolo : l'identité contrôlée donne d'office le badge « Vérifié » (plus de demande séparée).
create or replace function public.review_artisan(p_artisan uuid, p_approve boolean, p_reason text default null) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'interdit'; end if;
  if p_approve then
    update public.artisan_identity set status = 'approved', reject_reason = null, reviewed_by = auth.uid(), reviewed_at = now() where artisan_id = p_artisan;
    if not found then raise exception 'identite_requise'; end if;
    update public.artisans set status = 'approved', verified = true, verification_requested = false, reject_reason = null where id = p_artisan;
  else
    if char_length(trim(coalesce(p_reason,''))) < 5 then raise exception 'motif_requis'; end if;
    update public.artisan_identity set status = 'rejected', reject_reason = trim(p_reason), reviewed_by = auth.uid(), reviewed_at = now() where artisan_id = p_artisan;
    update public.artisans set status = 'rejected', verified = false, reject_reason = trim(p_reason) where id = p_artisan;
  end if;
end $$;
revoke all on function public.review_artisan(uuid, boolean, text) from public, anon;
grant execute on function public.review_artisan(uuid, boolean, text) to authenticated;

update public.artisans a set verified = true
where a.status = 'approved' and exists (select 1 from public.artisan_identity i where i.artisan_id = a.id and i.status = 'approved');
