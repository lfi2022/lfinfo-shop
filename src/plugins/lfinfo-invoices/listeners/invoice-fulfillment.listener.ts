import {
  Injectable,
  OnApplicationBootstrap,
} from '@nestjs/common';

import {
  EventBus,
  Fulfillment,
  FulfillmentStateTransitionEvent,
  TransactionalConnection,
} from '@vendure/core';

import {
  filter,
} from 'rxjs/operators';

import {
  InvoiceEmailDeliveryService,
} from '../services/invoice-email-delivery.service';

@Injectable()
export class InvoiceFulfillmentListener
  implements OnApplicationBootstrap {

  constructor(
    private eventBus: EventBus,
    private connection: TransactionalConnection,
    private invoiceEmailDelivery:
      InvoiceEmailDeliveryService,
  ) {}

  onApplicationBootstrap() {

    this.eventBus
      .ofType(
        FulfillmentStateTransitionEvent,
      )
      .pipe(
        filter(
          event =>
            event.toState === 'Delivered',
        ),
      )
      .subscribe({
        next: async event => {

          try {

            const fulfillmentRepo =
              this.connection.getRepository(
                event.ctx,
                Fulfillment,
              );

            const fulfillment =
              await fulfillmentRepo.findOne({
                where: {
                  id: event.fulfillment.id,
                },
                relations: {
                  orders: true,
                },
              });

            if (!fulfillment) {
              return;
            }

            for (
              const order
              of fulfillment.orders ?? []
            ) {

              await this
                .invoiceEmailDelivery
                .schedule(
                  event.ctx,
                  order.id,
                );

              console.log(
                `[LfinfoInvoices] Facture commande ${order.id} programmée pour envoi dans 5 minutes`,
              );
            }

          } catch (error) {

            console.error(
              '[LfinfoInvoices] Erreur programmation facture',
              error,
            );
          }
        },

        error: error => {
          console.error(
            '[LfinfoInvoices] EventBus error',
            error,
          );
        },
      });
  }
}
