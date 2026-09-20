import {
  Injectable,
  OnApplicationBootstrap,
} from '@nestjs/common';

import {
  EventBus,
  Fulfillment,
  FulfillmentStateTransitionEvent,
  Order,
  TransactionalConnection,
} from '@vendure/core';

import { filter } from 'rxjs/operators';

import {
  OrderLicenseService,
} from '../services/order-license.service';

import {
  LicensesDeliveredEvent,
} from './licenses-delivered.event';

@Injectable()
export class LicenseFulfillmentListener
  implements OnApplicationBootstrap
{
  constructor(
    private eventBus: EventBus,
    private connection: TransactionalConnection,
    private licenses: OrderLicenseService,
  ) {}

  onApplicationBootstrap() {
    this.eventBus
      .ofType(FulfillmentStateTransitionEvent)
      .pipe(
        filter(
          event => event.toState === 'Delivered',
        ),
      )
      .subscribe({
        next: async event => {
          try {
            console.log(
              `[LfinfoLicenses] Fulfillment ${event.fulfillment.id} passé de ${event.fromState} à ${event.toState}`,
            );

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
              console.error(
                `[LfinfoLicenses] Fulfillment ${event.fulfillment.id} introuvable en base`,
              );
              return;
            }

            const orders =
              fulfillment.orders ?? [];

            if (orders.length === 0) {
              console.warn(
                `[LfinfoLicenses] Fulfillment ${fulfillment.id} sans commande associée`,
              );
              return;
            }

            console.log(
              `[LfinfoLicenses] Fulfillment ${fulfillment.id} associé à ${orders.length} commande(s)`,
            );

            const orderRepo =
              this.connection.getRepository(
                event.ctx,
                Order,
              );

            for (const fulfillmentOrder of orders) {
              console.log(
                `[LfinfoLicenses] Livraison des licences pour la commande ${fulfillmentOrder.id}`,
              );

              /*
               * IMPORTANT :
               * on recharge explicitement la commande
               * avec son customer.
               *
               * L'objet provenant de fulfillment.orders
               * ne contient pas nécessairement cette relation.
               */
              const order =
                await orderRepo.findOne({
                  where: {
                    id: fulfillmentOrder.id,
                  },

                  relations: {
                    customer: true,
                  },
                });

              if (!order) {
                console.error(
                  `[LfinfoLicenses] Commande ${fulfillmentOrder.id} introuvable en base`,
                );
                continue;
              }

              if (!order.customer) {
                console.error(
                  `[LfinfoLicenses] Commande ${order.id} sans client associé`,
                );
                continue;
              }

              if (!order.customer.emailAddress) {
                console.error(
                  `[LfinfoLicenses] Commande ${order.id} : le client ${order.customer.id} n'a pas d'adresse e-mail`,
                );
                continue;
              }

              console.log(
                `[LfinfoLicenses] Client trouvé : ${order.customer.emailAddress}`,
              );

              const deliveredLicenses =
                await this.licenses.markOrderDelivered(
                  event.ctx,
                  order.id,
                );

              console.log(
                `[LfinfoLicenses] Commande ${order.id} : ${deliveredLicenses.length} licence(s) passée(s) en DELIVERED`,
              );

              if (deliveredLicenses.length === 0) {
                console.warn(
                  `[LfinfoLicenses] Commande ${order.id} : aucune licence à envoyer`,
                );
                continue;
              }

              console.log(
                `[LfinfoLicenses] Publication de LicensesDeliveredEvent pour ${order.customer.emailAddress}`,
              );

              await this.eventBus.publish(
                new LicensesDeliveredEvent(
                  event.ctx,
                  order,
                  deliveredLicenses,
                ),
              );

              console.log(
                `[LfinfoLicenses] LicensesDeliveredEvent publié pour la commande ${order.id}`,
              );
            }
          } catch (error) {
            console.error(
              '[LfinfoLicenses] Erreur lors de la livraison des licences',
              error,
            );
          }
        },

        error: error => {
          console.error(
            '[LfinfoLicenses] EventBus error',
            error,
          );
        },
      });
  }
}
