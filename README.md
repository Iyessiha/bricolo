# Bricolo

Annuaire et mise en relation d'artisans pour les pays francophones de la zone FCFA (Côte d'Ivoire, Sénégal, Burkina Faso, Mali, Niger, Bénin, Togo).

- Inscription gratuite pour les artisans et les clients (connexion par lien magique e-mail, sans SMS).
- Chaque artisan choisit son pays à l'inscription et n'est affiché qu'aux clients de ce pays.
- Revenus : **boosts** (recherche, accueil, urgence, ciblé) de 24 h, 3 j ou 7 j, payés en Mobile Money via GeniusPay.

Stack : Next.js 15 (App Router) · React 19 · TypeScript · Supabase (auth, Postgres, RLS) · Vercel.

## 1. Démarrer en local

```bash
npm install
cp .env.example .env.local   # puis remplir les valeurs
npm run dev
```

Sans clés Supabase, l'application s'ouvre et affiche un bandeau « configuration requise ». Avec `GENIUSPAY_MODE=mock`, le paiement est simulé (page `/api/dev/confirm`), ce qui permet de tester tout le parcours boost sans compte GeniusPay.

## 2. Base de données Supabase

1. Créer un projet sur supabase.com.
2. Dans **SQL Editor**, exécuter dans l'ordre :
   - `supabase/migrations/0001_init.sql` (13 tables, RLS, fonctions, déclencheurs)
   - `supabase/seed.sql` (7 pays, métiers, zones, grille de prix)
3. **Authentication → URL Configuration** : Site URL = l'URL de production, et ajouter `https://<domaine>/auth/callback` (et `http://localhost:3000/auth/callback`) dans Redirect URLs.
4. **Authentication → SMTP** : configurer un SMTP (Resend, Brevo…) pour que les liens magiques partent de votre domaine, le SMTP par défaut de Supabase est très limité.
5. Se connecter une première fois sur le site, puis promouvoir votre compte administrateur :

```sql
update public.profiles set role = 'admin' where id = (select id from auth.users where email = 'vous@exemple.com');
```

## 3. Variables d'environnement

| Variable | Rôle |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clés publiques du projet Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Clé serveur (jamais exposée au navigateur) : webhooks, cron, activation des boosts |
| `NEXT_PUBLIC_SITE_URL` | URL publique du site |
| `GENIUSPAY_MODE` | `mock` (simulation) ou `live` |
| `GENIUSPAY_API_URL`, `GENIUSPAY_API_KEY`, `GENIUSPAY_WEBHOOK_SECRET` | Accès GeniusPay |
| `CRON_SECRET` | Secret Bearer du cron d'expiration des boosts |

## 4. Déploiement

1. Pousser sur GitHub :
   ```bash
   git init && git add . && git commit -m "Bricolo: plateforme initiale"
   git branch -M main
   git remote add origin git@github.com:<compte>/bricolo.git
   git push -u origin main
   ```
2. Sur vercel.com, **Import Project** depuis ce dépôt, puis renseigner les variables ci-dessus.
3. `vercel.json` programme l'expiration des boosts chaque jour à 03:00 UTC (`/api/cron/expire-boosts`). Vercel envoie automatiquement `Authorization: Bearer $CRON_SECRET`.
4. Webhook GeniusPay à déclarer : `https://<domaine>/api/webhooks/geniuspay`.

## 5. Règles métier importantes

- **Prix calculé côté serveur** depuis `price_grid` (par pays). Le « ciblé » = prix recherche × `zones.price_factor`. Le client n'envoie jamais de montant.
- **Activation uniquement par le webhook** GeniusPay (signature HMAC-SHA256, traitement idempotent).
- **Emplacements limités** : 5 par métier et zone en recherche, 6 en accueil. Le renouvellement d'un boost actif est toujours permis ; une prolongation d'un même boost est fusionnée (statut `merged`).
- **Garde-fous RLS** : un artisan ne peut pas se valider lui-même ; boosts et paiements ne sont modifiables que côté serveur.
- **Rotation équitable** des artisans sponsorisés dans la recherche (`md5(id || seed)`).

## 6. À finaliser avant la mise en production

- **GeniusPay en mode `live`** : les noms de champs, l'URL d'API et l'en-tête de signature (`x-geniuspay-signature`) dans `src/lib/geniuspay.ts` sont des hypothèses à aligner sur la documentation officielle.
- Vérifier le nom « Bricolo » (domaine, marque OAPI).
- Brancher un service OTP/SMS quand les revenus le permettent (pour l'instant, tout passe par e-mail).
- Extension CEMAC (XAF) non traitée : prévoir une devise par pays.

## 7. Structure

```
src/app/            pages, server actions, routes API (checkout, webhook, cron, contact)
src/components/     Header, CountrySelect, ArtisanCard, SetupNotice
src/lib/            boost, geniuspay, pays, formats, clients Supabase
supabase/           migration SQL et données initiales
```

Charte : bleu `#27489a`, orange `#ff6a13` réservé au boost, Bricolage Grotesque + Instrument Sans.
