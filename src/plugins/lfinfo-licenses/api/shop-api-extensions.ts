import gql from 'graphql-tag';

export const shopApiExtensions = gql`

  enum OrderLicenseStatus {
    PENDING
    READY
    DELIVERED
  }

  enum LicenseRenewalStatus {
    NONE
    AVAILABLE
    PENDING
    RENEWED
    EXPIRED
  }

  type MyOrderLicense implements Node {
    id: ID!
    createdAt: DateTime!
    updatedAt: DateTime!

    orderId: ID!
    orderLineId: ID!
    productVariantId: ID!

    licenseIndex: Int!

    productName: String!
    variantName: String!

    status: OrderLicenseStatus!
    deliveredAt: DateTime

    licenseKey: String
    activationUrl: String
    downloadUrl: String
    instructions: String

    activatedAt: DateTime
    expiresAt: DateTime
    durationMonths: Int

    renewalStatus: LicenseRenewalStatus!

    renewalProductVariantId: ID
  }

  extend type Query {
    lfinfoMyOrderLicenses(
      orderId: ID!
    ): [MyOrderLicense!]!
  }
`;
