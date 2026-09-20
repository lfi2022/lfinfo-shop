import { Injectable } from '@nestjs/common';
import { EventBus, ID, OrderService, RequestContext, RequestContextService, TransactionalConnection } from '@vendure/core';
import { CustomerSubscription, SubscriptionStatus } from '../entities/customer-subscription.entity';
import { SubscriptionPlan } from '../entities/subscription-plan.entity';
import { SubscriptionReminderEvent } from '../events/subscription-reminder.event';
import { SubscriptionStartedEvent } from '../events/subscription-started.event';
import { MollieRecurringAttempt } from '../entities/mollie-recurring-attempt.entity';
import { createMollieClient } from '@mollie/api-client';

@Injectable()
export class SubscriptionService {
  constructor(private connection: TransactionalConnection, private orderService: OrderService, private requestContextService: RequestContextService, private eventBus: EventBus) {}

  async plans(ctx: RequestContext, activeOnly = false) {
    return this.connection.getRepository(ctx, SubscriptionPlan).find({ where: activeOnly ? { active: true } : {}, relations: { productVariant: { product: { translations: true }, translations: true } }, order: { intervalMonths: 'ASC' } });
  }
  async allSubscriptions(ctx: RequestContext) {
    return this.connection.getRepository(ctx, CustomerSubscription).find({ relations: { customer: true, plan: { productVariant: { product: { translations: true }, translations: true } } }, order: { expiresAt: 'ASC' } });
  }
  async savePlan(ctx: RequestContext, input: { id?: ID; code: string; name: string; intervalMonths: number; productVariantId: ID; active?: boolean }) {
    if (!Number.isInteger(input.intervalMonths) || input.intervalMonths < 1 || input.intervalMonths > 60) throw new Error('La période doit être comprise entre 1 et 60 mois');
    const repo = this.connection.getRepository(ctx, SubscriptionPlan);
    const plan = input.id ? await repo.findOneBy({ id: input.id }) : undefined;
    if (input.id && !plan) throw new Error('Plan introuvable');
    return repo.save(repo.create({ ...plan, ...input, code: input.code.trim().toUpperCase(), name: input.name.trim(), active: input.active ?? plan?.active ?? true }));
  }
  async createForPaidOrder(ctx: RequestContext, orderId: ID) {
    const order = await this.orderService.findOne(ctx, orderId, ['lines', 'lines.productVariant', 'customer']);
    if (!order?.customer) return [];
    const planRepo = this.connection.getRepository(ctx, SubscriptionPlan);
    const subRepo = this.connection.getRepository(ctx, CustomerSubscription);
    const created: CustomerSubscription[] = [];
    for (const line of order.lines) {
      const plan = await planRepo.findOne({ where: { productVariantId: line.productVariant.id, active: true } });
      if (!plan) continue;
      for (let index = 0; index < line.quantity; index++) {
        if (await subRepo.findOne({ where: { orderLineId: line.id, subscriptionIndex: index + 1 } })) continue;
        const startedAt = new Date();
        const subscription = await subRepo.save(subRepo.create({ customerId: order.customer.id, orderId: order.id, orderLineId: line.id, subscriptionIndex: index + 1, planId: plan.id, productVariantId: line.productVariant.id, status: SubscriptionStatus.ACTIVE, startedAt, expiresAt: this.addMonths(startedAt, plan.intervalMonths), cancelledAt: null, reminder30SentAt: null, reminder10SentAt: null, reminder3SentAt: null, mollieSubscriptionId: null }));
        created.push(subscription);
        await this.eventBus.publish(new SubscriptionStartedEvent(ctx, String(subscription.id)));
      }
    }
    return created;
  }
  async mySubscriptions(ctx: RequestContext) {
    if (!ctx.activeUserId) throw new Error('Authentification requise');
    const items = await this.connection.getRepository(ctx, CustomerSubscription).find({ relations: { customer: { user: true }, plan: { productVariant: { product: { translations: true }, translations: true } } }, order: { expiresAt: 'ASC' } });
    return items.filter(item => String(item.customer?.user?.id) === String(ctx.activeUserId));
  }
  async cancel(ctx: RequestContext, id: ID) {
    const repo = this.connection.getRepository(ctx, CustomerSubscription); const sub = await repo.findOne({ where: { id }, relations: { customer: { user: true } } });
    if (!sub || String(sub.customer?.user?.id) !== String(ctx.activeUserId)) throw new Error('Abonnement introuvable');
    if (sub.status === SubscriptionStatus.ACTIVE) {
      if (sub.mollieSubscriptionId) {
        const attempt = await this.connection.getRepository(ctx, MollieRecurringAttempt).findOne({ where: { orderId: sub.orderId, status: 'PAID' } });
        const apiKey = process.env.MOLLIE_RECURRING_API_KEY;
        if (!attempt || !apiKey) throw new Error('Impossible d’annuler la souscription Mollie de manière sûre');
        await createMollieClient({ apiKey }).customerSubscriptions.cancel(sub.mollieSubscriptionId, { customerId: attempt.mollieCustomerId, idempotencyKey: `lfinfo-cancel-${sub.id}` });
      }
      sub.status = SubscriptionStatus.CANCELLED; sub.cancelledAt = new Date(); await repo.save(sub);
    }
    return sub;
  }
  async processRenewals() {
    const ctx = await this.requestContextService.create({ apiType: 'admin' }); const repo = this.connection.getRepository(ctx, CustomerSubscription);
    const subscriptions = await repo.find({ where: { status: SubscriptionStatus.ACTIVE } }); let reminders = 0; let expired = 0;
    for (const sub of subscriptions) { const days = this.daysUntil(sub.expiresAt); if (days <= 0) { sub.status = SubscriptionStatus.EXPIRED; await repo.save(sub); expired++; continue; }
      const field = days <= 3 ? 'reminder3SentAt' : days <= 10 ? 'reminder10SentAt' : days <= 30 ? 'reminder30SentAt' : null;
      const exact = (days === 30 || days === 29 || days === 10 || days === 9 || days === 3 || days === 2);
      if (field && exact && !sub[field]) { await this.eventBus.publish(new SubscriptionReminderEvent(ctx, String(sub.id), days)); sub[field] = new Date(); await repo.save(sub); reminders++; }
    }
    return { checked: subscriptions.length, reminders, expired };
  }
  private daysUntil(date: Date) { const now = new Date(); return Math.ceil((Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) - Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())) / 86400000); }
  private addMonths(date: Date, months: number) { const r = new Date(date); const day = r.getDate(); r.setDate(1); r.setMonth(r.getMonth() + months); r.setDate(Math.min(day, new Date(r.getFullYear(), r.getMonth() + 1, 0).getDate())); return r; }
}
