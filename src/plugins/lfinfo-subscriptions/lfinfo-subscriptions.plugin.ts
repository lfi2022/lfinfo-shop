import { PluginCommonModule, RuntimeVendureConfig, VendurePlugin } from '@vendure/core';
import { adminApiExtensions } from './api/api-extensions';
import { shopApiExtensions } from './api/shop-api-extensions';
import { CustomerSubscription } from './entities/customer-subscription.entity';
import { MollieRecurringAttempt } from './entities/mollie-recurring-attempt.entity';
import { SubscriptionPlan } from './entities/subscription-plan.entity';
import { SubscriptionOrderListener } from './events/subscription-order.listener';
import { SubscriptionAdminResolver, CustomerSubscriptionFields, MySubscriptionFields, SubscriptionOfferFields, SubscriptionPlanFields } from './api/subscription.resolver';
import { SubscriptionShopResolver } from './api/subscription-shop.resolver';
import { SubscriptionService } from './services/subscription.service';
import { subscriptionRenewalTask } from './subscription.task';
import { MollieRecurringService } from './mollie-recurring.service';
import { MollieRecurringController } from './mollie-recurring.controller';

@VendurePlugin({
  imports: [PluginCommonModule], entities: [SubscriptionPlan, CustomerSubscription, MollieRecurringAttempt], providers: [SubscriptionService, SubscriptionOrderListener, MollieRecurringService], controllers: [MollieRecurringController],
  adminApiExtensions: { schema: adminApiExtensions, resolvers: [SubscriptionAdminResolver, SubscriptionPlanFields, CustomerSubscriptionFields] },
  shopApiExtensions: { schema: shopApiExtensions, resolvers: [SubscriptionShopResolver, SubscriptionOfferFields, MySubscriptionFields] }, compatibility: '^3.0.0',
  configuration: (config: RuntimeVendureConfig) => { if (!config.schedulerOptions) throw new Error('[LfinfoSubscriptions] schedulerOptions absent'); config.schedulerOptions.tasks = [...(config.schedulerOptions.tasks ?? []), subscriptionRenewalTask]; return config; },
})
export class LfinfoSubscriptionsPlugin {}
