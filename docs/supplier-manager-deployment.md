# LFINFO Supplier Manager — déploiement

## Pré-requis et droits média

Le module est volontairement inactif sans `TD_SYNNEX_CLIENT_ID` et `TD_SYNNEX_CLIENT_SECRET`. Le pont appelle `POST https://api.tdsynnex.com/auth/token` avec `grant_type=client_credentials`, `client_id` et `client_secret`, conformément à la documentation Digital Bridge. Demandez l’accès API EU Reseller et les paramètres OAuth à TD SYNNEX (portail développeur ou chargé de compte). Vérifiez avec eux les champs exacts autorisés par votre contrat ; le pont accepte les alias habituels mais ne devine pas un identifiant client.

Pour Icecat, créez un compte Channel Partner via le programme Open Icecat si les marques nécessaires y sont couvertes, ou souscrivez Full Icecat pour les marques, flux et droits requis. Dans **MyIcecat → Access Tokens**, créez un **API Access Token** et un **Content Access Token**, puis renseignez-les dans `ICECAT_API_TOKEN` et `ICECAT_CONTENT_TOKEN`. Le plugin appelle l’endpoint officiel Product JSON `https://live.icecat.biz/api` en envoyant ces secrets dans les en-têtes `api-token` et `content-token`; le second fait ajouter à chaque lien média retourné le droit d’accès correspondant. Les tokens restent exclusivement côté serveur. Les images ne sont téléchargées que lorsqu’une URL explicitement autorisée est fournie par ce flux contractuel. En l’état, l’adaptateur enrichit les métadonnées et laisse une image absente plutôt que de réutiliser une image au droit incertain. L’ajout du téléversement dans les Assets Vendure doit être validé avec l’URL et les droits média spécifiques fournis par Icecat.

## Déploiement sur un serveur systemd

> Remplacez `vendure-server`, `vendure-worker` et `/chemin/vers/lfinfo-shop` par les noms et chemin réellement utilisés sur le serveur. Vérifiez-les avant le déploiement avec `systemctl list-units --type=service | grep -i vendure` et `systemctl cat <nom-du-service>`.

1. Sauvegardez avant toute opération (aucune suppression n’est faite par le plugin). Utilisez les valeurs de la configuration PostgreSQL de production :

   ```powershell
   pg_dump -h <DB_HOST> -U <DB_USERNAME> -d <DB_NAME> > backup-before-supplier-manager.sql
   ```

2. Récupérez le code et contrôlez la révision :

   ```powershell
   git fetch --all --prune
   git pull --ff-only
   git status
   ```

3. Copiez les variables TD SYNNEX et Icecat de `.env.example` vers le `.env` chargé par les services systemd. Conservez les secrets hors Git et protégez les permissions du fichier. Si `EnvironmentFile=` dans l’unité pointe vers un autre chemin, modifiez ce fichier-là.

4. Arrêtez le serveur et le worker, construisez, puis appliquez la migration depuis le répertoire du projet. L’environnement doit être celui du service (`.env` ou `EnvironmentFile`).

   ```powershell
   sudo systemctl stop vendure-server vendure-worker
   cd /chemin/vers/lfinfo-shop
   npm ci
   npm run build
   npx vendure migrate
   sudo systemctl start vendure-server vendure-worker
   sudo systemctl status vendure-server vendure-worker --no-pager
   ```

5. Ouvrez `/dashboard`, vérifiez le menu **Fournisseurs**, faites une recherche, puis importez une seule référence de test. Elle doit être créée désactivée et doit être contrôlée puis activée manuellement dans le catalogue. Lancez ensuite « Synchroniser prix et stock » et vérifiez les logs du worker : `sudo journalctl -u vendure-worker -n 100 --no-pager`.

## Retour arrière

Arrêtez les services, revenez au commit précédent, reconstruisez et relancez. Ne lancez pas la migration `down` en production tant que les enregistrements fournisseur sont nécessaires. En cas de rollback base de données requis, restaurez le dump :

```powershell
psql -h <DB_HOST> -U <DB_USERNAME> -d <DB_NAME> < backup-before-supplier-manager.sql
```

Les produits importés restent des brouillons : leur suppression éventuelle doit être une décision explicite dans le Dashboard, jamais une étape automatique de rollback.
