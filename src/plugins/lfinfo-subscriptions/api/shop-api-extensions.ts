import gql from 'graphql-tag';
export const shopApiExtensions = gql`
  enum SubscriptionStatus { ACTIVE CANCELLED EXPIRED }
  type SubscriptionOffer { id: ID! code: String! name: String! intervalMonths: Int! productVariantId: ID! productName: String! variantName: String! }
  type MySubscription implements Node { id: ID! createdAt: DateTime! updatedAt: DateTime! planId: ID! productVariantId: ID! status: SubscriptionStatus! startedAt: DateTime! expiresAt: DateTime! cancelledAt: DateTime planName: String! productName: String! }
  extend type Query { lfinfoSubscriptionOffers: [SubscriptionOffer!]! lfinfoMySubscriptions: [MySubscription!]! }
  extend type Mutation { lfinfoCancelMySubscription(id: ID!): MySubscription! lfinfoStartMollieSubscription(consent: Boolean!): String! }
`;
