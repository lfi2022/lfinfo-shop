#!/usr/bin/env bash
set -euo pipefail

ADMIN_URL="${VENDURE_ADMIN_URL:-https://adminshop.lfinfo.be/admin-api}"
API_KEY="${VENDURE_API_KEY:-}"

if [ -z "$API_KEY" ]; then
  echo "❌ VENDURE_API_KEY n'est pas définie"
  echo
  echo 'Exemple :'
  echo 'export VENDURE_API_KEY="ta_cle"'
  exit 1
fi

echo "========================================"
echo " LFINFO - Test module licences Vendure"
echo "========================================"
echo

echo "1) Recherche de la dernière commande..."
ORDER_JSON=$(curl -sS "$ADMIN_URL" \
  -H "Content-Type: application/json" \
  -H "vendure-api-key: $API_KEY" \
  --data-binary '{
    "query":"query { orders(options:{take:1, sort:{createdAt:DESC}}) { items { id code state totalWithTax lines { id quantity productVariant { id name sku } } } } }"
  }')

echo "$ORDER_JSON" | jq .

if echo "$ORDER_JSON" | jq -e '.errors' >/dev/null 2>&1; then
  echo
  echo "❌ Erreur GraphQL pendant la recherche de commande"
  exit 1
fi

ORDER_ID=$(echo "$ORDER_JSON" | jq -r '.data.orders.items[0].id // empty')
ORDER_CODE=$(echo "$ORDER_JSON" | jq -r '.data.orders.items[0].code // empty')

if [ -z "$ORDER_ID" ]; then
  echo
  echo "❌ Aucune commande trouvée"
  exit 1
fi

echo
echo "✅ Commande trouvée : $ORDER_CODE (ID: $ORDER_ID)"
echo

echo "2) Lecture des licences avant synchronisation..."
READ_BEFORE=$(curl -sS "$ADMIN_URL" \
  -H "Content-Type: application/json" \
  -H "vendure-api-key: $API_KEY" \
  --data-binary "{
    \"query\":\"query { lfinfoOrderLicenses(orderId: \\\"$ORDER_ID\\\") { id orderId orderLineId productVariantId licenseIndex licenseKey activationUrl downloadUrl instructions status productName variantName } }\"
  }")

echo "$READ_BEFORE" | jq .

if echo "$READ_BEFORE" | jq -e '.errors' >/dev/null 2>&1; then
  echo
  echo "❌ Erreur sur lfinfoOrderLicenses"
  exit 1
fi

echo
echo "3) Synchronisation des slots de licences..."
SYNC_JSON=$(curl -sS "$ADMIN_URL" \
  -H "Content-Type: application/json" \
  -H "vendure-api-key: $API_KEY" \
  --data-binary "{
    \"query\":\"mutation { lfinfoSyncOrderLicenses(orderId: \\\"$ORDER_ID\\\") { id orderLineId productVariantId licenseIndex status productName variantName } }\"
  }")

echo "$SYNC_JSON" | jq .

if echo "$SYNC_JSON" | jq -e '.errors' >/dev/null 2>&1; then
  echo
  echo "❌ Erreur sur lfinfoSyncOrderLicenses"
  exit 1
fi

LICENSE_COUNT=$(echo "$SYNC_JSON" | jq '.data.lfinfoSyncOrderLicenses | length')

echo
echo "✅ $LICENSE_COUNT slot(s) de licence trouvé(s)/créé(s)"

if [ "$LICENSE_COUNT" -eq 0 ]; then
  echo
  echo "⚠️ Aucun slot de licence créé."
  echo "La commande ne contient peut-être aucune ligne exploitable."
  exit 0
fi

LICENSE_ID=$(echo "$SYNC_JSON" | jq -r '.data.lfinfoSyncOrderLicenses[0].id')

echo
echo "4) Test de modification de la licence ID $LICENSE_ID..."

TEST_KEY="LFINFO-TEST-$(date +%s)"

UPDATE_JSON=$(curl -sS "$ADMIN_URL" \
  -H "Content-Type: application/json" \
  -H "vendure-api-key: $API_KEY" \
  --data-binary "{
    \"query\":\"mutation { lfinfoUpdateOrderLicense(input:{ id:\\\"$LICENSE_ID\\\", licenseKey:\\\"$TEST_KEY\\\", activationUrl:\\\"https://example.com/activate\\\", downloadUrl:\\\"https://example.com/download\\\", instructions:\\\"Licence de test automatique LFINFO\\\", status:READY }) { id licenseKey activationUrl downloadUrl instructions status updatedAt } }\"
  }")

echo "$UPDATE_JSON" | jq .

if echo "$UPDATE_JSON" | jq -e '.errors' >/dev/null 2>&1; then
  echo
  echo "❌ Erreur sur lfinfoUpdateOrderLicense"
  exit 1
fi

RETURNED_KEY=$(echo "$UPDATE_JSON" | jq -r '.data.lfinfoUpdateOrderLicense.licenseKey // empty')
RETURNED_STATUS=$(echo "$UPDATE_JSON" | jq -r '.data.lfinfoUpdateOrderLicense.status // empty')

if [ "$RETURNED_KEY" != "$TEST_KEY" ]; then
  echo
  echo "❌ La clé retournée ne correspond pas"
  exit 1
fi

if [ "$RETURNED_STATUS" != "READY" ]; then
  echo
  echo "❌ Le statut retourné n'est pas READY"
  exit 1
fi

echo
echo "✅ Modification réussie"

echo
echo "5) Vérification de la persistance..."

VERIFY_JSON=$(curl -sS "$ADMIN_URL" \
  -H "Content-Type: application/json" \
  -H "vendure-api-key: $API_KEY" \
  --data-binary "{
    \"query\":\"query { lfinfoOrderLicenses(orderId: \\\"$ORDER_ID\\\") { id licenseIndex licenseKey status productName variantName } }\"
  }")

echo "$VERIFY_JSON" | jq .

if echo "$VERIFY_JSON" | jq -e '.errors' >/dev/null 2>&1; then
  echo
  echo "❌ Erreur pendant la vérification finale"
  exit 1
fi

PERSISTED_KEY=$(echo "$VERIFY_JSON" | jq -r \
  ".data.lfinfoOrderLicenses[] | select(.id == \"$LICENSE_ID\") | .licenseKey")

PERSISTED_STATUS=$(echo "$VERIFY_JSON" | jq -r \
  ".data.lfinfoOrderLicenses[] | select(.id == \"$LICENSE_ID\") | .status")

if [ "$PERSISTED_KEY" != "$TEST_KEY" ]; then
  echo
  echo "❌ La clé n'a pas été persistée correctement"
  exit 1
fi

if [ "$PERSISTED_STATUS" != "READY" ]; then
  echo
  echo "❌ Le statut n'a pas été persisté correctement"
  exit 1
fi

echo
echo "========================================"
echo " ✅ MODULE LICENCES FONCTIONNEL"
echo "========================================"
echo
echo "Commande : $ORDER_CODE"
echo "Order ID : $ORDER_ID"
echo "Licence testée : $LICENSE_ID"
echo "Clé de test : $TEST_KEY"
echo "Statut : READY"
echo
