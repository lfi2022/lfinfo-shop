# Abonnements LFINFO

Un plan associe une variante Vendure a une periode (en mois). Cette variante devient alors une offre d'abonnement dans la Shop API. Une variante sans plan reste un achat ponctuel : elle peut etre utilisee pour une licence, sans modifier le module de licences existant.

## Back-office

Creer les periodes via l'Admin API, par exemple :

```graphql
mutation {
  lfinfoSaveSubscriptionPlan(input: {
    code: "SUITE-ANNUEL", name: "Suite - abonnement annuel",
    intervalMonths: 12, productVariantId: "42", active: true
  }) { id code name intervalMonths }
}
```

`lfinfoSubscriptionPlans` liste les periodes configurables et `lfinfoSubscriptions` les souscriptions clientes. Les permissions necessaires sont respectivement `UpdateCatalog`, `ReadCatalog` et `ReadOrder`.

## Front-office

Pour afficher le choix licence / abonnement, affichez vos variantes ponctuelles pour la licence et appelez :

```graphql
query {
  lfinfoSubscriptionOffers { id code name intervalMonths productVariantId productName variantName }
}
```

Ajoutez ensuite `productVariantId` de l'offre retenue au panier avec la mutation Vendure habituelle. Lors du passage de commande en `PaymentSettled`, l'abonnement est cree automatiquement pour chaque unite achetee. L'espace client utilise `lfinfoMySubscriptions`; le client peut demander l'arret via `lfinfoCancelMySubscription(id: ...)`.

Les rappels J-30, J-10 et J-3 ainsi que l'expiration sont traites chaque jour par le worker Vendure (`lfinfo-subscription-renewals`). Le worker doit donc etre deploye en continu.

## Paiement recurrent

Le checkout automatique Mollie est demarre depuis le front par :

```graphql
mutation { lfinfoStartMollieSubscription(consent: true) }
```

La mutation renvoie l'URL Mollie vers laquelle le navigateur doit etre redirige. Elle ne fonctionne que pour un panier compose exclusivement d'offres d'abonnement et pour un client connecte. Le backend utilise `MOLLIE_RECURRING_API_KEY`, et Mollie appelle `POST https://adminshop.lfinfo.be/mollie-recurring/webhook` pour confirmer le premier paiement puis chaque prelevement.

Dans le Dashboard Vendure, creez une methode de paiement avec le handler **LFINFO Mollie recurring payment** et le code `lfinfo-mollie-recurring`. Elle ne doit pas etre proposee dans le checkout classique : elle est exclusivement reglee par le webhook apres verification de Mollie.
