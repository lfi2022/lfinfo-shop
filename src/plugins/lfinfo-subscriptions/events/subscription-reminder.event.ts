import { VendureEvent, RequestContext } from '@vendure/core';

export class SubscriptionReminderEvent extends VendureEvent {
  constructor(public ctx: RequestContext, public subscriptionId: string, public daysRemaining: number) { super(); }
}
