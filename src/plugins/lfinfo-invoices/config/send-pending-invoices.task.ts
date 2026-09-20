import {
  ScheduledTask,
} from '@vendure/core';

import {
  InvoiceEmailDeliveryService,
} from '../services/invoice-email-delivery.service';

export const sendPendingInvoicesTask =
  new ScheduledTask({

    id: 'lfinfo-send-pending-invoices',

    description:
      'Envoie les factures LFINFO programmées après livraison',

    schedule:
      cron => cron.everyMinute(),

    async execute({
      injector,
    }) {

      const service =
        injector.get(
          InvoiceEmailDeliveryService,
        );

      return await service.processPending();
    },
  });
