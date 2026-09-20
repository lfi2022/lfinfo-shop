import {
  PluginCommonModule,
  RuntimeVendureConfig,
  VendurePlugin,
} from '@vendure/core';

import {
  InvoiceEmailDelivery,
} from './entities/invoice-email-delivery.entity';

import {
  InvoiceEmailDeliveryService,
} from './services/invoice-email-delivery.service';

import {
  InvoiceFulfillmentListener,
} from './listeners/invoice-fulfillment.listener';

import {
  sendPendingInvoicesTask,
} from './config/send-pending-invoices.task';

@VendurePlugin({
  imports: [
    PluginCommonModule,
  ],

  entities: [
    InvoiceEmailDelivery,
  ],

  providers: [
    InvoiceEmailDeliveryService,
    InvoiceFulfillmentListener,
  ],

  configuration: (
    config: RuntimeVendureConfig,
  ) => {

    if (!config.schedulerOptions) {
      throw new Error(
        '[LfinfoInvoices] schedulerOptions est absent de la configuration Vendure',
      );
    }

    config.schedulerOptions.tasks = [
      ...(config.schedulerOptions.tasks ?? []),
      sendPendingInvoicesTask,
    ];

    return config;
  },

  compatibility: '^3.7.0',
})
export class LfinfoInvoicesPlugin {}
