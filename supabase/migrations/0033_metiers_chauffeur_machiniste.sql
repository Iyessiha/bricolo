-- Deux nouveaux métiers, distincts : chauffeur (véhicules légers, livraisons, transport de personnes) et machiniste (bus et cars, maintenance de base).
insert into public.trades (slug, name, plural, description) values
  ('chauffeur','Chauffeur','Chauffeurs','Conduite de véhicules, livraisons, transport de personnes'),
  ('machiniste','Machiniste','Machinistes','Conduite de bus et de cars, maintenance de base')
on conflict (slug) do nothing;
