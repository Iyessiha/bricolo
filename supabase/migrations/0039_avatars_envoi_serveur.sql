-- Les photos de profil passent désormais par le serveur (contrôle anti pièce d identité) : plus d envoi direct depuis le navigateur.
drop policy if exists "avatars : envoyer dans son dossier" on storage.objects;
