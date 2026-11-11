-- Nouveau métier : femme de ménage (prestations ponctuelles ou régulières à la tâche, pas d'emploi salarié à demeure).
insert into public.trades (slug, name, plural, description) values
  ('femme-de-menage','Femme de ménage','Femmes de ménage','Ménage à domicile, repassage, grand nettoyage')
on conflict (slug) do nothing;
