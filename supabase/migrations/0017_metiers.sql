-- Métiers supplémentaires les plus demandés + descriptions plus justes pour l'existant.
update public.trades set description = 'Climatisation, froid, chambres froides' where slug = 'frigoriste';
update public.trades set description = 'Portes, placards, escaliers' where slug = 'menuisier';

insert into public.trades (slug, name, plural, description) values
  ('carreleur','Carreleur','Carreleurs','Sols, murs, salles de bain'),
  ('plaquiste','Plaquiste','Plaquistes','Faux plafonds, cloisons'),
  ('serrurier','Serrurier','Serruriers','Clés, serrures, portes bloquées'),
  ('couvreur','Couvreur','Couvreurs','Toiture, charpente, étanchéité'),
  ('electromenager','Technicien électroménager','Techniciens électroménager','Machines à laver, frigos, TV'),
  ('vitrier','Vitrier','Vitriers','Vitres, baies, aluminium'),
  ('cameras','Installateur de caméras','Caméras et alarmes','Vidéosurveillance, alarmes, interphones'),
  ('solaire','Installateur solaire','Installateurs solaires','Panneaux, onduleurs, batteries'),
  ('carrossier','Carrossier','Carrossiers','Tôlerie et peinture auto'),
  ('jardinier','Jardinier','Jardiniers','Jardin, pelouse, élagage'),
  ('nettoyage','Spécialiste nettoyage','Nettoyage et nuisibles','Nettoyage, désinsectisation, dératisation'),
  ('puisatier','Puisatier','Puisatiers','Puits, forage, pompes'),
  ('informatique','Technicien informatique','Informatique et téléphone','Ordinateurs, téléphones, réseau')
on conflict (slug) do nothing;
