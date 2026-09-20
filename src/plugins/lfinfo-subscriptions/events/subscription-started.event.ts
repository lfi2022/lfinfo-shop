import { RequestContext, VendureEvent } from '@vendure/core';
export class SubscriptionStartedEvent extends VendureEvent { constructor(public ctx: RequestContext, public subscriptionId: string) { super(); } }
