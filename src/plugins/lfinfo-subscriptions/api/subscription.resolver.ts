import { Args, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { Allow, Ctx, ID, Permission, RequestContext, Transaction } from '@vendure/core';
import { CustomerSubscription } from '../entities/customer-subscription.entity';
import { SubscriptionPlan } from '../entities/subscription-plan.entity';
import { SubscriptionService } from '../services/subscription.service';

@Resolver()
export class SubscriptionAdminResolver {
  constructor(private subscriptions: SubscriptionService) {}
  @Query() @Allow(Permission.ReadCatalog) lfinfoSubscriptionPlans(@Ctx() ctx: RequestContext) { return this.subscriptions.plans(ctx); }
  @Query() @Allow(Permission.ReadOrder) lfinfoSubscriptions(@Ctx() ctx: RequestContext) { return this.subscriptions.allSubscriptions(ctx); }
  @Mutation() @Transaction() @Allow(Permission.UpdateCatalog) lfinfoSaveSubscriptionPlan(@Ctx() ctx: RequestContext, @Args() args: { input: { id?: ID; code: string; name: string; intervalMonths: number; productVariantId: ID; active?: boolean } }) { return this.subscriptions.savePlan(ctx, args.input); }
}

@Resolver('SubscriptionPlan')
export class SubscriptionPlanFields {
  @ResolveField() productName(@Parent() plan: SubscriptionPlan) { return plan.productVariant?.product?.translations?.[0]?.name ?? `Produit ${plan.productVariantId}`; }
  @ResolveField() variantName(@Parent() plan: SubscriptionPlan) { return plan.productVariant?.translations?.[0]?.name ?? `Variante ${plan.productVariantId}`; }
}
@Resolver('CustomerSubscription')
export class CustomerSubscriptionFields {
  @ResolveField() customerEmail(@Parent() sub: CustomerSubscription) { return sub.customer?.emailAddress ?? null; }
  @ResolveField() productName(@Parent() sub: CustomerSubscription) { return sub.plan?.productVariant?.product?.translations?.[0]?.name ?? `Produit ${sub.productVariantId}`; }
  @ResolveField() planName(@Parent() sub: CustomerSubscription) { return sub.plan?.name ?? ''; }
}

@Resolver('SubscriptionOffer')
export class SubscriptionOfferFields {
  @ResolveField() productName(@Parent() plan: SubscriptionPlan) { return plan.productVariant?.product?.translations?.[0]?.name ?? `Produit ${plan.productVariantId}`; }
  @ResolveField() variantName(@Parent() plan: SubscriptionPlan) { return plan.productVariant?.translations?.[0]?.name ?? `Variante ${plan.productVariantId}`; }
}
@Resolver('MySubscription')
export class MySubscriptionFields {
  @ResolveField() productName(@Parent() sub: CustomerSubscription) { return sub.plan?.productVariant?.product?.translations?.[0]?.name ?? `Produit ${sub.productVariantId}`; }
  @ResolveField() planName(@Parent() sub: CustomerSubscription) { return sub.plan?.name ?? ''; }
}
