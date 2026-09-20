import gql from 'graphql-tag';

export const adminApiExtensions = gql`

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

  enum LicenseReminderType {
    AUTO
    DAYS_30
    DAYS_10
    DAYS_3
  }

  type OrderLicense implements Node {
    id: ID!
    createdAt: DateTime!
    updatedAt: DateTime!

    orderId: ID!
    orderLineId: ID!
    productVariantId: ID!

    licenseIndex: Int!

    licenseKey: String
    activationUrl: String
    downloadUrl: String
    instructions: String

    status: OrderLicenseStatus!
    deliveredAt: DateTime

    activatedAt: DateTime
    expiresAt: DateTime
    durationMonths: Int

    renewalStatus: LicenseRenewalStatus!
    renewalProductVariantId: ID

    renewedFromLicenseId: ID
    renewedToLicenseId: ID

    renewalReminder30SentAt: DateTime
    renewalReminder10SentAt: DateTime
    renewalReminder3SentAt: DateTime

    productName: String!
    variantName: String!

    orderCode: String!
    customerFirstName: String
    customerLastName: String
    customerEmail: String
  }

  type OrderLicenseList {
    items: [OrderLicense!]!
    totalItems: Int!
  }

  input UpdateOrderLicenseInput {
    id: ID!

    licenseKey: String
    activationUrl: String
    downloadUrl: String
    instructions: String

    status: OrderLicenseStatus

    activatedAt: DateTime
    expiresAt: DateTime
    durationMonths: Int

    renewalStatus: LicenseRenewalStatus
    renewalProductVariantId: ID
  }

  extend type Query {

    lfinfoOrderLicenses(
      orderId: ID!
    ): [OrderLicense!]!

    lfinfoLicenses: OrderLicenseList!
  }

  extend type Mutation {

    lfinfoSyncOrderLicenses(
      orderId: ID!
    ): [OrderLicense!]!

    lfinfoUpdateOrderLicense(
      input: UpdateOrderLicenseInput!
    ): OrderLicense!

    lfinfoSendLicenseReminder(
      licenseId: ID!
      reminderType: LicenseReminderType = AUTO
    ): OrderLicense!

    lfinfoResetLicenseReminders(
      licenseId: ID!
    ): OrderLicense!
  }
`;
