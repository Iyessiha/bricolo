-- Pays de la zone FCFA francophone (ouverts)
insert into public.countries (code, name, capital, currency, phone_prefix) values
  ('ci','Côte d''Ivoire','Abidjan','XOF','225'),
  ('sn','Sénégal','Dakar','XOF','221'),
  ('bf','Burkina Faso','Ouagadougou','XOF','226'),
  ('ml','Mali','Bamako','XOF','223'),
  ('ne','Niger','Niamey','XOF','227'),
  ('bj','Bénin','Cotonou','XOF','229'),
  ('tg','Togo','Lomé','XOF','228')
on conflict (code) do nothing;

insert into public.trades (slug, name, plural, description) values
  ('frigoriste','Frigoriste','Frigoristes','Climatisation, froid, chambres froides'),
  ('mecanicien','Mécanicien','Mécaniciens','Voitures, motos, dépannage'),
  ('menuisier','Menuisier','Menuisiers','Portes, placards, escaliers'),
  ('ebeniste','Ébéniste','Ébénistes','Meubles sur mesure'),
  ('electricien','Électricien','Électriciens','Installation et dépannage'),
  ('plombier','Plombier','Plombiers','Fuites, sanitaires, installation'),
  ('peintre','Peintre','Peintres','Intérieur, extérieur, finitions'),
  ('soudeur','Soudeur','Soudeurs','Portails, grilles, structures'),
  ('macon','Maçon','Maçons','Murs, dalles, rénovation'),
  ('tapissier','Tapissier','Tapissiers','Canapés, fauteuils, sièges auto'),
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

insert into public.zones (country_code, name, price_factor) values
  ('ci','Cocody',1.6),('ci','Plateau',1.6),('ci','Marcory',1.4),('ci','Yopougon',1),('ci','Abobo',1),('ci','Bingerville',1),
  ('ci','Koumassi',1),('ci','Port-Bouët',1),('ci','Adjamé',1),('ci','Treichville',1),('ci','Attécoubé',1),
  ('sn','Plateau-Dakar',1.6),('sn','Médina',1),('sn','Almadies',1.4),('sn','Pikine',1),('sn','Guédiawaye',1),('sn','Rufisque',1),('sn','Thiès',1),
  ('bf','Ouaga 2000',1.4),('bf','Gounghin',1),('bf','Tanghin',1),('bf','Bobo-Dioulasso',1),('bf','Koudougou',1),
  ('ml','Bamako',1),('ml','Sikasso',1),('ml','Ségou',1),('ml','Kayes',1),
  ('ne','Niamey',1),('ne','Zinder',1),('ne','Maradi',1),('ne','Agadez',1),
  ('bj','Cotonou',1.4),('bj','Porto-Novo',1),('bj','Abomey-Calavi',1),('bj','Parakou',1),
  ('tg','Lomé',1.4),('tg','Kara',1),('tg','Sokodé',1),('tg','Kpalimé',1)
on conflict (country_code, name) do nothing;

-- Grille de prix de départ (FCFA) pour chaque pays, modifiable ensuite dans l'administration
insert into public.price_grid (country_code, boost_type, duration_hours, amount)
select c.code, v.t, v.d, v.a from public.countries c cross join (values
  ('recherche',24,500),('recherche',72,1200),('recherche',168,2500),
  ('accueil',24,1000),('accueil',72,2500),('accueil',168,5000),
  ('urgence',24,800),('urgence',72,2000),('urgence',168,4000)
) as v(t,d,a)
on conflict (country_code, boost_type, duration_hours) do nothing;
