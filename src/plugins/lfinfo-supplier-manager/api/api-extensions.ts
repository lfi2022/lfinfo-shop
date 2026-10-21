import gql from 'graphql-tag';
export const supplierAdminApi = gql`
  type SupplierCatalogueProduct { sku: String! name: String! manufacturer: String manufacturerReference: String ean: String priceHt: Float stock: Int incomingStock: Int discontinued: Boolean imageUrl: String description: String }
  type SupplierCatalogueResult { items: [SupplierCatalogueProduct!]! totalItems: Int! }
  type SupplierImportResult { imported: Int! skipped: Int! errors: [String!]! }
  type SupplierSyncLog implements Node { id: ID! createdAt: DateTime! level: String! action: String! message: String! }
  input SupplierSearchInput { manufacturer: String productClass: String productSubClass: String reference: String status: String skip: Int take: Int }
  input SupplierImportItemInput { sku: String! name: String! manufacturer: String manufacturerReference: String ean: String priceHt: Float stock: Int incomingStock: Int discontinued: Boolean imageUrl: String description: String }
  extend type Query { lfinfoSupplierConfigured: Boolean! lfinfoSupplierCatalogue(input: SupplierSearchInput!): SupplierCatalogueResult! lfinfoSupplierLogs: [SupplierSyncLog!]! }
  extend type Mutation { lfinfoSupplierImport(items: [SupplierImportItemInput!]!, marginPercent: Float!, fixedAmount: Float!): SupplierImportResult! lfinfoSupplierQueueSync: Int! }
`;
