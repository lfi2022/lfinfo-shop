import {
  TransactionalConnection,
} from '@vendure/core';

import {
  EmailEventListener,
} from '@vendure/email-plugin';

import {
  OrderLicense,
} from '../entities/order-license.entity';

import {
  LicenseRenewalReminderEvent,
} from '../renewals/license-renewal-reminder.event';


export const licenseRenewalReminderHandler =
  new EmailEventListener(
    'license-renewal-reminder',
  )

    .on(
      LicenseRenewalReminderEvent,
    )

    /**
     * Recharge toutes les données nécessaires.
     *
     * On ne met volontairement que des données
     * sérialisables dans event.data.
     */
    .loadData(
      async ({
        event,
        injector,
      }) => {

        const connection =
          injector.get(
            TransactionalConnection,
          );

        const repo =
          connection.getRepository(
            event.ctx,
            OrderLicense,
          );

        const license =
          await repo.findOne({
            where: {
              id:
                event.payload
                  .licenseId as any,
            },

            relations: {
              order: {
                customer: true,
              },

              productVariant: {
                product: {
                  translations:
                    true,
                },

                translations:
                  true,
              },
            },
          });

        if (!license) {
          throw new Error(
            `Licence ${event.payload.licenseId} introuvable pour l'envoi du rappel`,
          );
        }

        const customer =
          license.order?.customer;

        if (
          !customer?.emailAddress
        ) {
          throw new Error(
            `Aucune adresse e-mail client pour la licence ${license.id}`,
          );
        }

        const productName =
          license
            .productVariant
            ?.product
            ?.translations
            ?.[0]
            ?.name ??
          `Produit ${license.productVariantId}`;

        const variantName =
          license
            .productVariant
            ?.translations
            ?.[0]
            ?.name ??
          `Variante ${license.productVariantId}`;

        /**
         * On masque volontairement la clé.
         * Pas question d'envoyer la clé complète
         * dans un mail de rappel.
         */
        const maskedLicenseKey =
          maskLicenseKey(
            license.licenseKey,
          );

        /**
         * Pour le moment le bouton renvoie vers
         * la boutique LFINFO.
         *
         * La route frontend dédiée au renouvellement
         * sera ensuite gérée par Codex.
         */
        const shopUrl =
          process.env.SHOP_URL ??
          'https://lfinfo.be/boutique';

        return {

          licenseId:
            String(
              license.id,
            ),

          orderId:
            String(
              license.orderId,
            ),

          orderCode:
            license.order?.code ??
            '',

          customerFirstName:
            customer.firstName ??
            '',

          customerLastName:
            customer.lastName ??
            '',

          customerEmail:
            customer.emailAddress,

          productName,

          variantName,

          maskedLicenseKey,

          expiresAt:
            license.expiresAt
              ? license
                  .expiresAt
                  .toISOString()
              : null,

          expiresAtFormatted:
            license.expiresAt
              ? formatDate(
                  license.expiresAt,
                )
              : '',

          reminderDays:
            event.payload
              .reminderDays,

          daysRemaining:
            event.payload
              .daysRemaining,

          manual:
            event.payload.manual,

          renewalStatus:
            license.renewalStatus,

          renewalProductVariantId:
            license
              .renewalProductVariantId,

          shopUrl,
        };
      },
    )


    /**
     * Aucun mail si le chargement des données
     * n'a pas donné d'adresse exploitable.
     */
    .filter(
      event =>
        !!event.data
          .customerEmail,
    )


    .setRecipient(
      event =>
        event.data
          .customerEmail,
    )


    .setFrom(
      '{{ fromAddress }}',
    )


    /**
     * Le sujet utilise reminderDays.
     */
    .setSubject(
      '{{ subject }}',
    )


    .setTemplateVars(
      event => {

        const reminderDays =
          event.data
            .reminderDays;

        return {

          subject:
            getSubject(
              event.data
                .productName,
              reminderDays,
            ),

          customer: {
            firstName:
              event.data
                .customerFirstName,

            lastName:
              event.data
                .customerLastName,

            emailAddress:
              event.data
                .customerEmail,
          },

          order: {
            id:
              event.data
                .orderId,

            code:
              event.data
                .orderCode,
          },

          license: {
            id:
              event.data
                .licenseId,

            productName:
              event.data
                .productName,

            variantName:
              event.data
                .variantName,

            maskedLicenseKey:
              event.data
                .maskedLicenseKey,

            expiresAt:
              event.data
                .expiresAt,

            expiresAtFormatted:
              event.data
                .expiresAtFormatted,

            renewalStatus:
              event.data
                .renewalStatus,

            renewalProductVariantId:
              event.data
                .renewalProductVariantId,
          },

          reminderDays,

          daysRemaining:
            event.data
              .daysRemaining,

          manual:
            event.data.manual,

          shopUrl:
            event.data
              .shopUrl,
        };
      },
    );


function getSubject(
  productName: string,
  reminderDays:
    30 | 10 | 3,
): string {

  switch (reminderDays) {

    case 3:
      return (
        `Important : votre licence ${productName} expire dans 3 jours`
      );

    case 10:
      return (
        `Rappel : votre licence ${productName} expire dans 10 jours`
      );

    case 30:
    default:
      return (
        `Votre licence ${productName} arrive à expiration dans 30 jours`
      );
  }
}


function formatDate(
  date: Date,
): string {

  return new Intl
    .DateTimeFormat(
      'fr-BE',
      {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        timeZone:
          'Europe/Brussels',
      },
    )
    .format(date);
}


function maskLicenseKey(
  licenseKey:
    string | null,
): string {

  if (!licenseKey) {
    return '';
  }

  const value =
    licenseKey.trim();

  if (
    value.length <= 4
  ) {
    return '••••';
  }

  const visible =
    value.slice(-4);

  return (
    `••••-••••-${visible}`
  );
}
