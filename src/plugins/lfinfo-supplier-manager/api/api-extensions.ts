import gql from 'graphql-tag';
export const supplierAdminApi = gql`
  type SupplierCatalogueProduct { sku: String! name: String! manufacturer: String category: String subCategory: String manufacturerReference: String ean: String priceHt: Float currencyCode: String recommendedPrice: Float stock: Int localStock: Int incomingStock: Int ramGb: Float ssdGb: Float keyboardLayout: String discontinued: Boolean status: String imageUrl: String description: String technical: JSON imported: Boolean! }
  type SupplierCatalogueResult { items: [SupplierCatalogueProduct!]! totalItems: Int! isExhaustive: Boolean! source: String! notice: String }
  type SupplierImportResult { imported: Int! skipped: Int! errors: [String!]! }
  type SupplierSyncLog implements Node { id: ID! createdAt: DateTime! level: String! action: String! message: String! }
  type SupplierImportedProduct { supplierSku: String! manufacturerReference: String ean: String productVariantId: ID lastPurchasePrice: Int lastStock: Int marginPercent: Int fixedAmount: Int lastSyncedAt: DateTime lastError: String }
  input SupplierSearchInput { supplier: String manufacturer: String productClass: String productSubClass: String reference: String manufacturerReference: String ean: String status: String text: String minRamGb: Float minSsdGb: Float keyboardLayout: String minPurchasePrice: Float maxPurchasePrice: Float availability: String skip: Int take: Int }
  input SupplierImportItemInput { sku: String! name: String! manufacturer: String manufacturerReference: String ean: String priceHt: Float recommendedPrice: Float stock: Int incomingStock: Int discontinued: Boolean imageUrl: String description: String }
  extend type Query { lfinfoSupplierConfigured: Boolean! lfinfoSupplierCatalogue(input: SupplierSearchInput!): SupplierCatalogueResult! lfinfoSupplierDiagnostic: JSON lfinfoSupplierLogs: [SupplierSyncLog!]! lfinfoSupplierImported: [SupplierImportedProduct!]! }
  extend type Mutation { lfinfoSupplierImport(items: [SupplierImportItemInput!]!, marginPercent: Float!, fixedAmount: Float!, useRecommendedPrice: Boolean! = true): SupplierImportResult! lfinfoSupplierQueueSync: Int! }
`;
