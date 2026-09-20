import {
  EmailEventListener,
} from '@vendure/email-plugin';

import {
  LicensesDeliveredEvent,
} from '../events/licenses-delivered.event';

export const licenseDeliveryHandler =
  new EmailEventListener(
    'license-delivery',
  )
    .on(LicensesDeliveredEvent)

    .filter(
      event =>
        !!event.order.customer?.emailAddress &&
        event.licenses.length > 0,
    )

    .setRecipient(
      event =>
        event.order.customer!.emailAddress,
    )

    .setFrom('{{ fromAddress }}')

    .setSubject(
      'Vos licences LFINFO – commande #{{ order.code }}',
    )

    .setTemplateVars(event => ({
      order: {
        id: event.order.id,
        code: event.order.code,
      },

      customer: {
        firstName:
          event.order.customer?.firstName ?? '',

        lastName:
          event.order.customer?.lastName ?? '',

        emailAddress:
          event.order.customer?.emailAddress ?? '',
      },

      licenses: event.licenses.map(license => ({
        id: license.id,
        licenseIndex: license.licenseIndex,
        licenseKey: license.licenseKey,
        activationUrl: license.activationUrl,
        downloadUrl: license.downloadUrl,
        instructions: license.instructions,
        status: license.status,
        deliveredAt: license.deliveredAt,

        productName:
          license.productVariant?.product
            ?.translations?.[0]?.name ??
          `Produit ${license.productVariantId}`,

        variantName:
          license.productVariant
            ?.translations?.[0]?.name ??
          `Variante ${license.productVariantId}`,
      })),
    }));
