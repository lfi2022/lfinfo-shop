# LFINFO Supplier Manager — déploiement

## Pré-requis et droits média

Le module est volontairement inactif sans `TD_SYNNEX_CLIENT_ID` et `TD_SYNNEX_CLIENT_SECRET`. Demandez l’accès API EU Reseller et les paramètres OAuth à TD SYNNEX (portail développeur ou chargé de compte). Vérifiez avec eux les champs exacts autorisés par votre contrat ; le pont accepte les alias habituels mais ne devine pas un identifiant client.

Pour Icecat, créez un compte Channel Partner via le programme Open Icecat si les marques nécessaires y sont couvertes, ou souscrivez Full Icecat pour les marques, flux et droits requis. Dans **MyIcecat → Access Tokens**, créez un **API Access Token** et un **Content Access Token**, puis renseignez-les dans `ICECAT_API_TOKEN` et `ICECAT_CONTENT_TOKEN`. Le plugin appelle l’endpoint officiel Product JSON `https://live.icecat.biz/api` en envoyant ces secrets dans les en-têtes `api-token` et `content-token`; le second fait ajouter à chaque lien média retourné le droit d’accès correspondant. Les tokens restent exclusivement côté serveur. Les images ne sont téléchargées que lorsqu’une URL explicitement autorisée est fournie par ce flux contractuel. En l’état, l’adaptateur enrichit les métadonnées et laisse une image absente plutôt que de réutiliser une image au droit incertain. L’ajout du téléversement dans les Assets Vendure doit être validé avec l’URL et les droits média spécifiques fournis par Icecat.

## Déploiement avec `compose.prod.yml`

1. Sauvegardez avant toute opération (aucune suppression n’est faite par le plugin) :

   ```powershell
   docker compose -f compose.prod.yml exec -T postgres pg_dump -U $env:DB_USERNAME -d $env:DB_NAME > backup-before-supplier-manager.sql
   ```

2. Récupérez le code et contrôlez la révision :

   ```powershell
   git fetch --all --prune
   git pull --ff-only
   git status
   ```

3. Copiez les blocs TD SYNNEX et Icecat de `.env.example` vers le `.env` de production. Conservez les secrets hors Git et protégez les permissions du fichier.

4. Construisez et appliquez d’abord les migrations, avec le serveur arrêté pour éviter deux déploiements concurrents :

   ```powershell
   docker compose -f compose.prod.yml build
   docker compose -f compose.prod.yml run --rm server npx vendure migrate
   docker compose -f compose.prod.yml up -d server worker
   docker compose -f compose.prod.yml ps
   ```

5. Ouvrez `/dashboard`, vérifiez le menu **Fournisseurs**, faites une recherche, puis importez une seule référence de test. Elle doit être créée désactivée et doit être contrôlée puis activée manuellement dans le catalogue. Lancez ensuite « Synchroniser prix et stock » et vérifiez les logs du worker : `docker compose -f compose.prod.yml logs --tail=100 worker`.

## Retour arrière

Arrêtez les services, revenez au commit précédent, reconstruisez et relancez. Ne lancez pas la migration `down` en production tant que les enregistrements fournisseur sont nécessaires. En cas de rollback base de données requis, restaurez le dump :

```powershell
Get-Content -Raw backup-before-supplier-manager.sql | docker compose -f compose.prod.yml exec -T postgres psql -U $env:DB_USERNAME -d $env:DB_NAME
```

Les produits importés restent des brouillons : leur suppression éventuelle doit être une décision explicite dans le Dashboard, jamais une étape automatique de rollback.
