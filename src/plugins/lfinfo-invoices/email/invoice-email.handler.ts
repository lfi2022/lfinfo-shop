import {
  EmailEventListener,
} from '@vendure/email-plugin';

import {
  InvoiceEmailEvent,
} from '../events/invoice-email.event';

export const invoiceEmailHandler =
  new EmailEventListener(
    'invoice-delivery',
  )

    .on(InvoiceEmailEvent)

    .filter(
      event =>
        !!event.payload.customerEmail,
    )

    .setRecipient(
      event =>
        event.payload.customerEmail,
    )

    .setFrom(
      '{{ fromAddress }}',
    )

    .setSubject(
      'Votre facture LFINFO – commande #{{ order.code }}',
    )

    .setTemplateVars(
      event => ({
        order: {
          id:
            event.payload.orderId,

          code:
            event.payload.orderCode,
        },

        customer: {
          firstName:
            event.payload.customerFirstName,

          lastName:
            event.payload.customerLastName,

          emailAddress:
            event.payload.customerEmail,
        },

        invoiceUrl:
          event.payload.invoiceUrl,
      }),
    );
