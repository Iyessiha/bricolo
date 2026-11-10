-- Les pixels personnalisés sont des extraits de code plus longs que les identifiants : on relève la limite à 4 000 caractères.
alter table public.site_settings drop constraint if exists site_settings_value_check;
alter table public.site_settings add constraint site_settings_value_check check (char_length(value) <= 4000);
