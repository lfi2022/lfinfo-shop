import { PluginCommonModule, RuntimeVendureConfig, VendurePlugin } from '@vendure/core';
import { supplierAdminApi } from './api/api-extensions';
import { SupplierAdminResolver } from './api/supplier.resolver';
import { SupplierImportRecord } from './entities/supplier-import-record.entity';
import { SupplierSyncLog } from './entities/supplier-sync-log.entity';
import { SupplierCatalogueCache } from './entities/supplier-catalogue-cache.entity';
import { IcecatService } from './services/icecat.service';
import { SupplierManagerService } from './services/supplier-manager.service';
import { TdSynnexService } from './services/tdsynnex.service';
import { supplierPriceStockSyncTask } from './supplier-sync.task';
@VendurePlugin({ imports: [PluginCommonModule], entities: [SupplierImportRecord, SupplierSyncLog, SupplierCatalogueCache], providers: [SupplierManagerService, TdSynnexService, IcecatService], adminApiExtensions: { schema: supplierAdminApi, resolvers: [SupplierAdminResolver] }, dashboard: './dashboard/index.tsx', compatibility: '^3.7.0', configuration: (config: RuntimeVendureConfig) => { if (!config.schedulerOptions) throw new Error('[LfinfoSupplierManager] schedulerOptions absent'); config.schedulerOptions.tasks = [...(config.schedulerOptions.tasks ?? []), supplierPriceStockSyncTask]; return config; } })
export class LfinfoSupplierManagerPlugin {}
