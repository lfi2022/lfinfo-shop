import { Injectable, OnModuleInit } from '@nestjs/common';
import { LanguageCode, ProductService, ProductVariantService, RequestContext, RequestContextService, TransactionalConnection, JobQueue, JobQueueService, User } from '@vendure/core';
import { GlobalFlag } from '@vendure/common/lib/generated-types';
import { SupplierImportRecord } from '../entities/supplier-import-record.entity';
import { SupplierSyncLog } from '../entities/supplier-sync-log.entity';
import { IcecatService } from './icecat.service';
import { SupplierProduct, TdSynnexService } from './tdsynnex.service';

export interface MarginRule { marginPercent: number; fixedAmount: number; }
@Injectable()
export class SupplierManagerService implements OnModuleInit {
  private queue!: JobQueue<{ variantId: string; supplierSku: string }>;
  constructor(private connection: TransactionalConnection, private products: ProductService, private variants: ProductVariantService, private queues: JobQueueService, private contexts: RequestContextService, private td: TdSynnexService, private icecat: IcecatService) {}
  async onModuleInit() { this.queue = await this.queues.createQueue({ name: 'lfinfo-supplier-price-stock-sync', process: job => this.syncOne(job.data.variantId, job.data.supplierSku) }); }
  async search(input: any) { return this.td.catalogue(input); }
  isConfigured() { return this.td.configured; }
  calculateSalePrice(priceHt: number | undefined, rule: MarginRule): number { return Math.round(Math.max(0, (priceHt ?? 0) * (1 + rule.marginPercent / 100) + rule.fixedAmount) * 100); }
  async import(ctx: RequestContext, products: SupplierProduct[], rule: MarginRule): Promise<{ imported: number; skipped: number; errors: string[] }> {
    let imported = 0; let skipped = 0; const errors: string[] = [];
    for (const item of products) {
      try { if (!item.sku) throw new Error('Référence fournisseur absente'); const result = await this.importOne(ctx, item, rule); result ? imported++ : skipped++; }
      catch (e) { errors.push(`${item.sku || '?'}: ${e instanceof Error ? e.message : 'erreur inconnue'}`); await this.log('ERROR', 'import', errors[errors.length - 1]); }
    }
    return { imported, skipped, errors };
  }
  async queueSync(): Promise<number> { const records = await this.connection.getRepository(SupplierImportRecord).find({ where: { supplier: 'TD_SYNNEX' } }); for (const r of records) if (r.productVariantId) await this.queue.add({ variantId: String(r.productVariantId), supplierSku: r.supplierSku }); return records.length; }
  async logs() { return this.connection.getRepository(SupplierSyncLog).find({ order: { createdAt: 'DESC' }, take: 50 }); }
  private async importOne(ctx: RequestContext, item: SupplierProduct, rule: MarginRule): Promise<boolean> {
    const records = this.connection.getRepository(SupplierImportRecord);
    const existing = await records.findOne({ where: { supplier: 'TD_SYNNEX', supplierSku: item.sku } });
    if (existing?.productVariantId) return false;
    const enrichment = await this.icecat.enrich(item.ean, item.manufacturerReference, item.manufacturer);
    const name = enrichment?.name || item.name;
    const product = await this.products.create(ctx, { enabled: false, translations: [{ languageCode: LanguageCode.fr, name, slug: this.slug(`${item.sku}-${name}`), description: enrichment?.description || item.description || '' }] });
    const [variant] = await this.variants.create(ctx, [{ productId: product.id, sku: `TD-${item.sku}`, enabled: false, trackInventory: GlobalFlag.TRUE, stockOnHand: Math.max(0, item.stock ?? 0), prices: [{ currencyCode: ctx.currencyCode, price: this.calculateSalePrice(item.priceHt, rule) }], translations: [{ languageCode: LanguageCode.fr, name }] }]);
    await records.save(records.create({ supplier: 'TD_SYNNEX', supplierSku: item.sku, manufacturerReference: item.manufacturerReference ?? null, ean: item.ean ?? null, productVariantId: variant.id, lastPurchasePrice: Math.round((item.priceHt ?? 0) * 100), lastStock: item.stock ?? 0, marginPercent: Math.round(rule.marginPercent * 100), fixedAmount: Math.round(rule.fixedAmount * 100), lastSyncedAt: new Date(), lastError: null }));
    // Media is deliberately not downloaded until the Icecat contract's permitted image URL is configured.
    await this.log('INFO', 'import', `${item.sku} importé comme brouillon (produit et variante désactivés).`);
    return true;
  }
  private async syncOne(variantId: string, supplierSku: string) {
    try {
      const result = await this.td.catalogue({ reference: supplierSku, take: 1 }); const item = result.items.find(x => x.sku === supplierSku) ?? result.items[0]; if (!item) throw new Error('Référence absente du catalogue fournisseur');
      const ctx = await this.workerContext();
      const variant = await this.variants.findOne(ctx, variantId as any); if (!variant) throw new Error('Variante Vendure introuvable');
      // A sync never enables/disables or publishes an item: only commercial values are refreshed.
      const record = await this.connection.getRepository(SupplierImportRecord).findOneByOrFail({ supplier: 'TD_SYNNEX', supplierSku });
      await this.variants.update(ctx, [{ id: variantId as any, stockOnHand: Math.max(0, item.stock ?? 0), price: this.calculateSalePrice(item.priceHt, { marginPercent: record.marginPercent / 100, fixedAmount: record.fixedAmount / 100 }) }]);
      await this.connection.getRepository(SupplierImportRecord).update({ supplier: 'TD_SYNNEX', supplierSku }, { lastPurchasePrice: Math.round((item.priceHt ?? 0) * 100), lastStock: item.stock ?? 0, lastSyncedAt: new Date(), lastError: null });
      await this.log('INFO', 'sync', `${supplierSku}: stock synchronisé.`);
    } catch (e) { const message = e instanceof Error ? e.message : 'erreur inconnue'; await this.connection.getRepository(SupplierImportRecord).update({ supplier: 'TD_SYNNEX', supplierSku }, { lastError: message }); await this.log('ERROR', 'sync', `${supplierSku}: ${message}`); throw e; }
  }
  private async log(level: 'INFO' | 'ERROR', action: string, message: string) { await this.connection.getRepository(SupplierSyncLog).save({ level, action, message }); }
  private async workerContext(): Promise<RequestContext> { const user = await this.connection.rawConnection.getRepository(User).findOne({ where: { identifier: process.env.SUPERADMIN_USERNAME }, relations: { roles: { channels: true } } }); if (!user) throw new Error('Superadministrateur introuvable pour la synchronisation worker.'); return this.contexts.create({ apiType: 'admin', user }); }
  private slug(value: string) { return value.toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 240) || 'produit'; }
}
