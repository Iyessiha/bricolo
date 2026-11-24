-- Provenance des vues (recherche, accueil, QR code, partage WhatsApp, lien direct) pour les statistiques détaillées du Forfait Pro.
alter table public.events add column if not exists source text;
