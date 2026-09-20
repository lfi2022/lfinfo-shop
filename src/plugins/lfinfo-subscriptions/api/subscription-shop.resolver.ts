import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Allow, Ctx, ID, Permission, RequestContext, Transaction } from '@vendure/core';
import { SubscriptionService } from '../services/subscription.service';
import { MollieRecurringService } from '../mollie-recurring.service';
@Resolver()
export class SubscriptionShopResolver {
  constructor(private subscriptions: SubscriptionService, private mollie: MollieRecurringService) {}
  @Query() @Allow(Permission.Public) lfinfoSubscriptionOffers(@Ctx() ctx: RequestContext) { return this.subscriptions.plans(ctx, true); }
  @Query() @Allow(Permission.Authenticated) lfinfoMySubscriptions(@Ctx() ctx: RequestContext) { return this.subscriptions.mySubscriptions(ctx); }
  @Mutation() @Transaction() @Allow(Permission.Authenticated) lfinfoCancelMySubscription(@Ctx() ctx: RequestContext, @Args() args: { id: ID }) { return this.subscriptions.cancel(ctx, args.id); }
  @Mutation() @Allow(Permission.Authenticated) lfinfoStartMollieSubscription(@Ctx() ctx: RequestContext, @Args() args: { consent: boolean }) { return this.mollie.start(ctx, args.consent); }
}
