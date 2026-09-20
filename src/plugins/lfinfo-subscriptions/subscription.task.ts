import { ScheduledTask } from '@vendure/core';
import { SubscriptionService } from './services/subscription.service';
export const subscriptionRenewalTask = new ScheduledTask({ id: 'lfinfo-subscription-renewals', description: 'Envoie les rappels et expire les abonnements LFINFO', schedule: cron => cron.everyDayAt(8, 15), async execute({ injector }) { return injector.get(SubscriptionService).processRenewals(); } });
