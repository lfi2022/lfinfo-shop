import {
  Injectable,
} from '@nestjs/common';

import {
  EventBus,
  ID,
  Order,
  RequestContextService,
  TransactionalConnection,
} from '@vendure/core';

import {
  IsNull,
  LessThanOrEqual,
} from 'typeorm';

import {
  InvoiceEmailDelivery,
} from '../entities/invoice-email-delivery.entity';

import {
  InvoiceEmailEvent,
} from '../events/invoice-email.event';

@Injectable()
export class InvoiceEmailDeliveryService {

  constructor(
    private connection: TransactionalConnection,
    private eventBus: EventBus,
    private requestContextService: RequestContextService,
  ) {}

  async schedule(
    ctx: any,
    orderId: ID,
  ): Promise<void> {

    const repo =
      this.connection.getRepository(
        ctx,
        InvoiceEmailDelivery,
      );

    const existing =
      await repo.findOne({
        where: {
          orderId: String(orderId),
        },
      });

    if (existing?.sentAt) {
      return;
    }

    const scheduledFor =
      new Date(Date.now() + 5 * 60 * 1000);

    if (existing) {
      existing.scheduledFor = scheduledFor;
      existing.lastError = null;

      await repo.save(existing);

      return;
    }

    await repo.save(
      repo.create({
        orderId: String(orderId),
        scheduledFor,
        sentAt: null,
        lastError: null,
        attempts: 0,
      }),
    );
  }

  async processPending(): Promise<{
    processed: number;
    sent: number;
    failed: number;
  }> {

    const ctx =
      await this.requestContextService.create({
        apiType: 'admin',
      });

    const repo =
      this.connection.getRepository(
        ctx,
        InvoiceEmailDelivery,
      );

    const pending =
      await repo.find({
        where: {
          sentAt: IsNull(),
          scheduledFor: LessThanOrEqual(
            new Date(),
          ),
        },
        order: {
          scheduledFor: 'ASC',
        },
        take: 50,
      });

    let sent = 0;
    let failed = 0;

    for (const delivery of pending) {

      try {

        const orderRepo =
          this.connection.getRepository(
            ctx,
            Order,
          );

        const order =
          await orderRepo.findOne({
            where: {
              id: delivery.orderId as any,
            },
            relations: {
              customer: true,
              channels: true,
            },
          });

        if (!order) {
          throw new Error(
            `Commande ${delivery.orderId} introuvable`,
          );
        }

        if (!order.customer) {
          throw new Error(
            `Commande ${order.id} sans client`,
          );
        }

        if (!order.customer.emailAddress) {
          throw new Error(
            `Commande ${order.id} sans email client`,
          );
        }

        const channel =
          order.channels?.[0];

        if (!channel) {
          throw new Error(
            `Commande ${order.id} sans channel`,
          );
        }

        const baseUrl =
          process.env.VENDURE_PUBLIC_URL ??
          'https://adminshop.lfinfo.be';

	const invoiceUrl =
  `${baseUrl}/invoices/` +
  `${encodeURIComponent(channel.token)}/` +
  `${encodeURIComponent(order.code)}` +
  `?email=${encodeURIComponent(order.customer.emailAddress)}`;

        await this.eventBus.publish(
          new InvoiceEmailEvent(
            ctx,
            {
              orderId:
                String(order.id),

              orderCode:
                order.code,

              customerFirstName:
                order.customer.firstName ?? '',

              customerLastName:
                order.customer.lastName ?? '',

              customerEmail:
                order.customer.emailAddress,

              invoiceUrl,
            },
          ),
        );

        delivery.sentAt =
          new Date();

        delivery.lastError =
          null;

        delivery.attempts += 1;

        await repo.save(
          delivery,
        );

        sent += 1;

      } catch (error) {

        delivery.attempts += 1;

        delivery.lastError =
          error instanceof Error
            ? error.message
            : String(error);

        await repo.save(
          delivery,
        );

        failed += 1;
      }
    }

    return {
      processed: pending.length,
      sent,
      failed,
    };
  }
}
