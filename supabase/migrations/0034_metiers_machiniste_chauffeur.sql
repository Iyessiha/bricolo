-- Nouveaux métiers : machiniste (engins de chantier) et chauffeur (conduite, transport de personnes et de marchandises).
insert into public.trades (slug, name, plural, description) values
  ('machiniste','Machiniste','Machinistes','Pelleteuse, chargeuse, grue, engins de chantier'),
  ('chauffeur','Chauffeur','Chauffeurs','Chauffeur privé, poids lourd, transport, livraison')
on conflict (slug) do nothing;
