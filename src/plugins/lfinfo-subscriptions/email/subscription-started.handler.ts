import { TransactionalConnection } from '@vendure/core';
import { EmailEventListener } from '@vendure/email-plugin';
import { CustomerSubscription } from '../entities/customer-subscription.entity';
import { SubscriptionStartedEvent } from '../events/subscription-started.event';
export const subscriptionStartedHandler = new EmailEventListener('subscription-started').on(SubscriptionStartedEvent).loadData(async ({ event, injector }) => {
  const sub = await injector.get(TransactionalConnection).getRepository(event.ctx, CustomerSubscription).findOne({ where: { id: event.subscriptionId as any }, relations: { customer: true, plan: true } });
  if (!sub?.customer?.emailAddress) throw new Error(`Abonnement ${event.subscriptionId} ou e-mail introuvable`);
  return { email: sub.customer.emailAddress, firstName: sub.customer.firstName ?? '', planName: sub.plan.name, expiresAt: new Intl.DateTimeFormat('fr-BE', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Europe/Brussels' }).format(sub.expiresAt) };
}).setRecipient(event => event.data.email).setFrom('{{ fromAddress }}').setSubject('Votre abonnement LFINFO est actif').setTemplateVars(event => ({ customer: { firstName: event.data.firstName }, subscription: { planName: event.data.planName, expiresAt: event.data.expiresAt } }));
