import gql from 'graphql-tag';
export const adminApiExtensions = gql`
  enum SubscriptionStatus { ACTIVE CANCELLED EXPIRED }
  type SubscriptionPlan implements Node { id: ID! createdAt: DateTime! updatedAt: DateTime! code: String! name: String! intervalMonths: Int! active: Boolean! productVariantId: ID! productName: String! variantName: String! }
  type CustomerSubscription implements Node { id: ID! createdAt: DateTime! updatedAt: DateTime! customerId: ID! orderId: ID! planId: ID! productVariantId: ID! subscriptionIndex: Int! status: SubscriptionStatus! startedAt: DateTime! expiresAt: DateTime! cancelledAt: DateTime customerEmail: String productName: String! planName: String! }
  input CreateOrUpdateSubscriptionPlanInput { id: ID code: String! name: String! intervalMonths: Int! active: Boolean productVariantId: ID! }
  extend type Query { lfinfoSubscriptionPlans: [SubscriptionPlan!]! lfinfoSubscriptions: [CustomerSubscription!]! }
  extend type Mutation { lfinfoSaveSubscriptionPlan(input: CreateOrUpdateSubscriptionPlanInput!): SubscriptionPlan! }
`;
