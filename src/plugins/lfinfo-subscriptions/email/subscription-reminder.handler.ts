import { TransactionalConnection } from '@vendure/core';
import { EmailEventListener } from '@vendure/email-plugin';
import { CustomerSubscription } from '../entities/customer-subscription.entity';
import { SubscriptionReminderEvent } from '../events/subscription-reminder.event';
export const subscriptionReminderHandler = new EmailEventListener('subscription-renewal-reminder').on(SubscriptionReminderEvent).loadData(async ({ event, injector }) => {
  const sub = await injector.get(TransactionalConnection).getRepository(event.ctx, CustomerSubscription).findOne({ where: { id: event.subscriptionId as any }, relations: { customer: true, plan: { productVariant: { product: { translations: true } } } } });
  if (!sub?.customer?.emailAddress) throw new Error(`Abonnement ${event.subscriptionId} ou e-mail introuvable`);
  return { email: sub.customer.emailAddress, firstName: sub.customer.firstName ?? '', planName: sub.plan.name, productName: sub.plan.productVariant?.product?.translations?.[0]?.name ?? '', expiresAt: new Intl.DateTimeFormat('fr-BE', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Europe/Brussels' }).format(sub.expiresAt), days: event.daysRemaining, shopUrl: process.env.SHOP_URL ?? 'https://lfinfo.be/boutique' };
}).setRecipient(event => event.data.email).setFrom('{{ fromAddress }}').setSubject('Votre abonnement LFINFO arrive à échéance').setTemplateVars(event => ({ customer: { firstName: event.data.firstName }, subscription: { planName: event.data.planName, productName: event.data.productName, expiresAt: event.data.expiresAt }, daysRemaining: event.data.days, shopUrl: event.data.shopUrl }));
