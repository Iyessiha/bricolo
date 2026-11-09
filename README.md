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
   - `supabase/migrations/0002_emails.sql` (journal d'e-mails, désabonnement, campagnes)
   - `supabase/migrations/0003_entreprise.sql` (statut individuel / entreprise)
   - `supabase/migrations/0004_identite.sql` (vérification d'identité, photo de profil, expérience, diplômes ; crée les buckets de stockage `avatars` public et `kyc` privé)
3. **Authentication → URL Configuration** : Site URL = l'URL de production, et ajouter `https://<domaine>/auth/callback` (et `http://localhost:3000/auth/callback`) dans Redirect URLs.
4. **Authentication → SMTP** : configurer un SMTP (Resend, Brevo…) pour que les liens magiques partent de votre domaine, le SMTP par défaut de Supabase est très limité.
5. Se connecter une première fois sur le site, puis promouvoir votre compte administrateur :

```sql
update public.profiles set role = 'admin' where id = (select id from auth.users where email = 'vous@exemple.com');
```

## 2 bis. E-mails (Resend)

Tout passe par Resend : e-mails de l'application, de connexion et marketing.

1. Resend → **Domains** : ajoutez votre domaine et créez les enregistrements DNS (SPF, DKIM). Sans domaine vérifié, seul l'expéditeur de test `onboarding@resend.dev` fonctionne, et uniquement vers votre propre adresse.
2. Renseignez `RESEND_API_KEY` et `EMAIL_FROM` (voir ci-dessous).
3. **E-mails d'authentification** (connexion = e-mail + mot de passe, aucun lien de connexion envoyé) : Supabase → Authentication → SMTP Settings, SMTP personnalisé : hôte `smtp.resend.com`, port `465`, utilisateur `resend`, mot de passe = clé API Resend, expéditeur = `EMAIL_FROM`. Dans Email Templates : « Confirm signup » ← `supabase/email-templates/confirmation.html`, « Reset password » ← `supabase/email-templates/reinitialisation.html`. Un seul e-mail part par nouvel artisan (confirmation) ; si le quota Resend est serré, désactivez « Confirm email » (Authentication → Providers → Email).
4. **Sécurité** (Authentication → Providers → Email / Rate Limits) : longueur minimale du mot de passe 8, lettres + chiffres exigés ; ajoutez un CAPTCHA (Attack Protection) si des robots apparaissent ; « Leaked password protection » nécessite le plan Pro. Côté base (migration 0005) : adresses jetables refusées, un seul compte par boîte e-mail (alias `+` et points Gmail ramenés à l'adresse réelle), un numéro de téléphone/WhatsApp, une immatriculation et une pièce d'identité (empreinte salée, `IDENTITY_HASH_SECRET` facultatif) par profil, limite de demandes clients (1/heure/artisan, 3/jour/e-mail, 10/jour/IP).
4. Webhook Resend → `https://<domaine>/api/webhooks/resend` (événements `email.bounced` et `email.complained`), puis copiez le secret `whsec_…` dans `RESEND_WEBHOOK_SECRET`. Les adresses en rebond ou en plainte sont automatiquement exclues du marketing.
5. Exécutez aussi `supabase/migrations/0002_emails.sql`.

| Déclencheur | E-mail | Type |
|---|---|---|
| Fiche créée | Profil reçu | transactionnel |
| Admin valide / refuse | Profil en ligne / à corriger | transactionnel |
| Badge accordé | Badge Vérifié | transactionnel |
| Demande d'un client | Demande à l'artisan (réponse directe au client) + confirmation au client | transactionnel |
| Paiement confirmé | Reçu de boost | transactionnel |
| Tous les jours à 08:00 UTC | Boost qui se termine (rappel), compte sans fiche depuis 2 jours, aucun boost 7 jours après validation | rappel / marketing |
| Admin → Campagnes e-mail | Message ciblé par pays, métier, « sans boost actif » | marketing |

Chaque e-mail n'est envoyé qu'une fois (table `email_log`). Les messages marketing contiennent un lien de désabonnement et les en-têtes « un clic » exigés par Gmail et Yahoo. Plan gratuit Resend : 100 e-mails/jour, les envois automatiques sont plafonnés à 40 messages marketing par jour.

## 3. Variables d'environnement

| Variable | Rôle |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clés publiques du projet Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Clé serveur (jamais exposée au navigateur) : webhooks, cron, activation des boosts |
| `NEXT_PUBLIC_SITE_URL` | URL publique du site |
| `GENIUSPAY_MODE` | `mock` (simulation) ou `live` |
| `GENIUSPAY_API_URL`, `GENIUSPAY_API_KEY`, `GENIUSPAY_WEBHOOK_SECRET` | Accès GeniusPay |
| `CRON_SECRET` | Secret Bearer des tâches planifiées (expiration des boosts, e-mails) |
| `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_REPLY_TO` | Envoi d'e-mails via Resend (sans clé : mode simulation) |
| `UNSUBSCRIBE_SECRET` | Signe les liens de désabonnement |
| `RESEND_WEBHOOK_SECRET` | Vérifie les webhooks Resend (rebonds, plaintes) |

## 4. Déploiement

1. Pousser sur GitHub :
   ```bash
   git init && git add . && git commit -m "Bricolo: plateforme initiale"
   git branch -M main
   git remote add origin git@github.com:<compte>/bricolo.git
   git push -u origin main
   ```
2. Sur vercel.com, **Import Project** depuis ce dépôt, puis renseigner les variables ci-dessus.
3. `vercel.json` programme deux tâches : expiration des boosts à 03:00 UTC (`/api/cron/expire-boosts`) et e-mails de rappel à 08:00 UTC (`/api/cron/emails`). Vercel envoie automatiquement `Authorization: Bearer $CRON_SECRET`.
4. Webhook GeniusPay à déclarer : `https://<domaine>/api/webhooks/geniuspay`.

## 5. Règles métier importantes

- **Prix calculé côté serveur** depuis `price_grid` (par pays). Le « ciblé » = prix recherche × `zones.price_factor`. Le client n'envoie jamais de montant.
- **Activation uniquement par le webhook** GeniusPay (signature HMAC-SHA256, traitement idempotent).
- **Emplacements limités** : 5 par métier et zone en recherche, 6 en accueil. Le renouvellement d'un boost actif est toujours permis ; une prolongation d'un même boost est fusionnée (statut `merged`).
- **Garde-fous RLS** : un artisan ne peut pas se valider lui-même ; boosts et paiements ne sont modifiables que côté serveur.
- **Rotation équitable** des artisans sponsorisés dans la recherche (`md5(id || seed)`).

## 5 bis. Pages légales

Mentions légales, conditions d'utilisation, conditions des boosts, confidentialité et cookies sont dans `src/app/`. La société éditrice (MonWe Infinity LLC) est définie à un seul endroit : `src/lib/company.ts`. Renseignez-y `registrationNumber`, `postalAddress` et `phone` : ils s'affichent alors automatiquement dans les mentions légales. Faites relire ces textes par un juriste avant la mise en production.

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

## 8. Vérification d'identité et rôles

- Parcours artisan : inscription (4 étapes) → lien e-mail → **tunnel d'activation** (`/activation`, 5 étapes : profil, photo, pièce d'identité, selfie avec la pièce, envoi avec diplôme facultatif). Le profil n'est publié qu'après validation par l'administration (`review_artisan`, contrôlé aussi par un déclencheur en base).
- Les pièces sont dans le bucket privé `kyc` (dossier = identifiant de l'utilisateur, lecture par l'artisan et les admins uniquement ; liens signés de 10 minutes dans `/admin/artisan/<id>`). Les photos de profil sont dans le bucket public `avatars`.
- Administration : `/admin` (dossiers, artisans, prix). Un compte devient admin avec `update public.profiles set role = 'admin' where ...`.
- La connexion par mot de passe (`/connexion`) fonctionne pour les comptes qui en ont un (ex. comptes de démonstration créés en SQL). Supprimez les comptes de démonstration avant le lancement.
