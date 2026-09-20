import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { EventBus, OrderStateTransitionEvent } from '@vendure/core';
import { filter } from 'rxjs/operators';
import { SubscriptionService } from '../services/subscription.service';
@Injectable()
export class SubscriptionOrderListener implements OnApplicationBootstrap {
  constructor(private eventBus: EventBus, private subscriptions: SubscriptionService) {}
  onApplicationBootstrap() { this.eventBus.ofType(OrderStateTransitionEvent).pipe(filter(event => event.toState === 'PaymentSettled')).subscribe({ next: event => this.subscriptions.createForPaidOrder(event.ctx, event.order.id).catch(error => console.error('[LfinfoSubscriptions] activation impossible', error)) }); }
}
