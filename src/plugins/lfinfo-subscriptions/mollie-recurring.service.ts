import crypto from 'crypto';
import { Injectable } from '@nestjs/common';
import { ActiveOrderService, ID, OrderService, RequestContext, RequestContextService, TransactionalConnection } from '@vendure/core';
import { createMollieClient, SequenceType } from '@mollie/api-client';
import { MollieRecurringAttempt } from './entities/mollie-recurring-attempt.entity';
import { SubscriptionPlan } from './entities/subscription-plan.entity';
import { CustomerSubscription } from './entities/customer-subscription.entity';
import { SubscriptionService } from './services/subscription.service';
@Injectable()
export class MollieRecurringService {
  constructor(private activeOrders: ActiveOrderService, private orders: OrderService, private connection: TransactionalConnection, private contexts: RequestContextService, private subscriptions: SubscriptionService) {}
  async start(ctx: RequestContext, consent: boolean) {
    if (!consent || !ctx.activeUserId) throw new Error('Un compte client et le consentement au prélèvement sont requis');
    const key = process.env.MOLLIE_RECURRING_API_KEY; if (!key) throw new Error('MOLLIE_RECURRING_API_KEY est absent');
    const activeOrder = await this.activeOrders.getActiveOrder(ctx, undefined); const order = activeOrder && await this.orders.findOne(ctx, activeOrder.id, ['customer', 'lines', 'lines.productVariant', 'lines.productVariant.product']); if (!order?.customer || order.lines.length === 0) throw new Error('Panier introuvable');
    if (!order.lines.every(line => (line.productVariant.product as any)?.customFields?.productType === 'subscription')) throw new Error('Un panier d’abonnement ne peut contenir que des produits marqués Abonnement récurrent');
    const mollie = createMollieClient({ apiKey: key }); const customer = await mollie.customers.create({ name: `${order.customer.firstName} ${order.customer.lastName}`.trim(), email: order.customer.emailAddress, metadata: { vendureCustomerId: String(order.customer.id) }, idempotencyKey: `lfinfo-customer-${order.customer.id}` });
    const returnUrl = `${process.env.SHOP_URL ?? 'https://lfinfo.be/boutique'}/commande/${order.code}`;
    const payment = await mollie.payments.create({ amount: { currency: order.currencyCode, value: (order.totalWithTax / 100).toFixed(2) }, description: `LFINFO abonnement - commande ${order.code}`, customerId: customer.id, sequenceType: SequenceType.first, redirectUrl: returnUrl, webhookUrl: 'https://adminshop.lfinfo.be/mollie-recurring/webhook', metadata: { vendureOrderId: String(order.id), orderCode: order.code }, idempotencyKey: `lfinfo-first-${order.id}` });
    await this.connection.getRepository(ctx, MollieRecurringAttempt).save({ orderId: order.id, molliePaymentId: payment.id, mollieCustomerId: customer.id, status: 'OPEN' });
    await this.orders.transitionToState(ctx, order.id, 'ArrangingPayment');
    const checkoutUrl = payment.getCheckoutUrl(); if (!checkoutUrl) throw new Error('Mollie n’a pas retourné d’URL de paiement'); return checkoutUrl;
  }
  async webhook(paymentId: string) {
    const key = process.env.MOLLIE_RECURRING_API_KEY; if (!key) throw new Error('MOLLIE_RECURRING_API_KEY est absent'); const ctx = await this.contexts.create({ apiType: 'admin' }); const mollie = createMollieClient({ apiKey: key }); const payment = await mollie.payments.get(paymentId); const repo = this.connection.getRepository(ctx, MollieRecurringAttempt); const attempt = await repo.findOne({ where: { molliePaymentId: paymentId } });
    if (!attempt) { const externalId = (payment as any).subscriptionId; if (externalId) { const subRepo = this.connection.getRepository(ctx, CustomerSubscription); const sub = await subRepo.findOne({ where: { mollieSubscriptionId: externalId }, relations: { plan: true } }); if (sub && payment.status === 'paid') { const base = sub.expiresAt > new Date() ? sub.expiresAt : new Date(); const next = new Date(base); next.setMonth(next.getMonth() + sub.plan.intervalMonths); sub.expiresAt = next; await subRepo.save(sub); } } return; } if (payment.status !== 'paid') { attempt.status = 'FAILED'; await repo.save(attempt); return; } if (attempt.status === 'PAID') return;
    const signature = crypto.createHmac('sha256', process.env.MOLLIE_RECURRING_WEBHOOK_SECRET!).update(`${attempt.orderId}:${paymentId}`).digest('hex'); await this.orders.addPaymentToOrder(ctx, attempt.orderId, { method: 'lfinfo-mollie-recurring', metadata: { molliePaymentId: paymentId, signature } });
    const subscriptions = await this.subscriptions.createForPaidOrder(ctx, attempt.orderId); const order = await this.orders.findOne(ctx, attempt.orderId, ['lines', 'lines.productVariant']); const plans = await this.connection.getRepository(ctx, SubscriptionPlan).find({ where: { active: true } });
    if (order) for (const sub of subscriptions) { const line = order.lines.find(item => String(item.id) === String(sub.orderLineId)); const plan = plans.find(item => String(item.id) === String(sub.planId)); if (!line || !plan) continue; const external = await mollie.customerSubscriptions.create({ customerId: attempt.mollieCustomerId, amount: { currency: order.currencyCode, value: (line.unitPriceWithTax / 100).toFixed(2) }, interval: `${plan.intervalMonths} month${plan.intervalMonths > 1 ? 's' : ''}`, description: `LFINFO ${plan.name} (${sub.id})`, startDate: sub.expiresAt.toISOString().slice(0, 10), webhookUrl: 'https://adminshop.lfinfo.be/mollie-recurring/webhook', metadata: { lfinfoSubscriptionId: String(sub.id) }, idempotencyKey: `lfinfo-subscription-${sub.id}` }); sub.mollieSubscriptionId = external.id; await this.connection.getRepository(ctx, CustomerSubscription).save(sub); }
    attempt.status = 'PAID'; await repo.save(attempt);
  }
}
