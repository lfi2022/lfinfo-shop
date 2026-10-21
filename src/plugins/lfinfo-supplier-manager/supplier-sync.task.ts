import { ScheduledTask } from '@vendure/core';
import { SupplierManagerService } from './services/supplier-manager.service';
/** Enqueues only known imported variants; it never discovers/imports/publishes products on its own. */
export const supplierPriceStockSyncTask = new ScheduledTask({ id: 'lfinfo-supplier-price-stock-sync', description: 'Met en file la synchronisation non destructive des prix et stocks TD SYNNEX', schedule: cron => cron.everyHour(), async execute({ injector }) { return injector.get(SupplierManagerService).queueSync(); } });
