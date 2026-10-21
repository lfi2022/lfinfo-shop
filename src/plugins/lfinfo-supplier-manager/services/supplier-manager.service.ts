import { Injectable, OnModuleInit } from '@nestjs/common';
import { AssetService, LanguageCode, ProductService, ProductVariantService, RequestContext, RequestContextService, TransactionalConnection, JobQueue, JobQueueService, User } from '@vendure/core';
import { GlobalFlag } from '@vendure/common/lib/generated-types';
import { SupplierImportRecord } from '../entities/supplier-import-record.entity';
import { SupplierSyncLog } from '../entities/supplier-sync-log.entity';
import { SupplierCatalogueCache } from '../entities/supplier-catalogue-cache.entity';
import { IcecatService, publicIcecatImageUrl } from './icecat.service';
import { SupplierProduct, TdSynnexService } from './tdsynnex.service';

export interface MarginRule { marginPercent: number; fixedAmount: number; useRecommendedPrice?: boolean; }
@Injectable()
export class SupplierManagerService implements OnModuleInit {
  private queue!: JobQueue<{ variantId: string; supplierSku: string }>;
  constructor(private connection: TransactionalConnection, private products: ProductService, private variants: ProductVariantService, private queues: JobQueueService, private contexts: RequestContextService, private td: TdSynnexService, private icecat: IcecatService, private assets: AssetService) {}
  async onModuleInit() { this.queue = await this.queues.createQueue({ name: 'lfinfo-supplier-price-stock-sync', process: job => this.syncOne(job.data.variantId, job.data.supplierSku) }); }
  async search(input: any) {
    if (input.supplier && input.supplier !== 'TD_SYNNEX') throw new Error(`Fournisseur non pris en charge : ${input.supplier}`);
    const result = await this.td.catalogue(input); const cache = this.connection.getRepository(SupplierCatalogueCache);
    for (const item of result.items) { const found = await cache.findOne({ where: { supplier: 'TD_SYNNEX', supplierSku: item.sku } }); await cache.save(found ? { ...found, payload: item as any, fetchedAt: new Date() } : cache.create({ supplier: 'TD_SYNNEX', supplierSku: item.sku, payload: item as any, fetchedAt: new Date() })); }
    const local = !!(String(input.text ?? '').trim() || input.minRamGb != null || input.minSsdGb != null || input.keyboardLayout || input.minPurchasePrice != null || input.maxPurchasePrice != null || input.availability);
    const cached = local ? (await cache.find({ where: { supplier: 'TD_SYNNEX' }, order: { fetchedAt: 'DESC' }, take: 5000 })).map(x => x.payload as unknown as SupplierProduct) : [];
    const all = new Map<string, SupplierProduct>(); [...result.items, ...cached].forEach(item => all.set(item.sku, item));
    const imported = new Set((await this.connection.getRepository(SupplierImportRecord).find({ select: { supplierSku: true } })).map(r => r.supplierSku));
    const items = [...all.values()].filter(item => this.matchesLocal(item, input)).map(item => ({ ...item, imported: imported.has(item.sku) }));
    // Previews are fetched only for the visible result page, with bounded concurrency.
    const visible = items.slice(0, Math.min(25, Math.max(1, input.take ?? 25)));
    for (let offset = 0; offset < visible.length; offset += 4) {
      await Promise.all(visible.slice(offset, offset + 4).map(async item => {
        if (!item.ean && !(item.manufacturerReference && item.manufacturer)) return;
        const enriched = await this.icecat.preview(item.ean, item.manufacturerReference, item.manufacturer);
        if (enriched) { item.imageUrl = publicIcecatImageUrl(enriched.imageUrl) ?? item.imageUrl; item.icecatFound = true; item.icecatTitle = enriched.name; }
      }));
    }
    return { items, totalItems: local ? items.length : result.totalItems, isExhaustive: false, source: local ? 'API_PAGE_PLUS_CACHE_PARTIAL' : 'API_PAGE', notice: local ? 'Filtres locaux appliqués à la page reçue et au cache déjà consulté : résultat non exhaustif.' : 'Page TD SYNNEX courante : résultat non exhaustif tant que toutes les pages ne sont pas analysées.' };
  }
  private matchesLocal(item: SupplierProduct, input: any) { const text = String(input.text ?? '').trim().toLowerCase(); const haystack = [item.name, item.manufacturer, item.manufacturerReference, item.ean, item.description].filter(Boolean).join(' ').toLowerCase(); const availability = input.availability; return (!text || haystack.includes(text)) && (input.minRamGb == null || (item.ramGb !== undefined && item.ramGb >= input.minRamGb)) && (input.minSsdGb == null || (item.ssdGb !== undefined && item.ssdGb >= input.minSsdGb)) && (!input.keyboardLayout || item.keyboardLayout === input.keyboardLayout) && (input.minPurchasePrice == null || (item.priceHt !== undefined && item.priceHt >= input.minPurchasePrice)) && (input.maxPurchasePrice == null || (item.priceHt !== undefined && item.priceHt <= input.maxPurchasePrice)) && (!availability || availability === 'ALL' || (availability === 'IN_STOCK' && item.stock !== undefined && item.stock > 0) || (availability === 'INCOMING' && item.incomingStock !== undefined && item.incomingStock > 0) || (availability === 'UNAVAILABLE' && item.stock === 0 && (item.incomingStock === 0 || item.incomingStock === undefined))); }
  diagnostic() { return this.td.diagnostic(); }
  isConfigured() { return this.td.configured; }
  calculateSalePrice(priceHt: number | undefined, rule: MarginRule, recommendedPrice?: number): number { const salePrice = rule.useRecommendedPrice && recommendedPrice != null ? recommendedPrice : (priceHt ?? 0) * (1 + rule.marginPercent / 100) + rule.fixedAmount; return Math.round(Math.max(0, salePrice) * 100); }
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
  async imported() { return this.connection.getRepository(SupplierImportRecord).find({ where: { supplier: 'TD_SYNNEX' }, order: { updatedAt: 'DESC' }, take: 200 }); }
  private async importOne(ctx: RequestContext, item: SupplierProduct, rule: MarginRule): Promise<boolean> {
    const records = this.connection.getRepository(SupplierImportRecord);
    const existing = await records.findOne({ where: { supplier: 'TD_SYNNEX', supplierSku: item.sku } });
    if (existing?.productVariantId) return false;
    const enrichment = await this.icecat.enrich(item.ean, item.manufacturerReference, item.manufacturer);
    const name = enrichment?.name || item.name;
    const salePrice = rule.useRecommendedPrice && item.recommendedPrice !== undefined ? Math.round(item.recommendedPrice * 100) : (item.priceHt === undefined ? undefined : this.calculateSalePrice(item.priceHt, rule, item.recommendedPrice));
    if (salePrice === undefined || !Number.isFinite(salePrice) || salePrice <= 0) throw new Error('Prix de vente absent ou invalide : import refusé avant création du produit.');
    const product = await this.products.create(ctx, { enabled: false, translations: [{ languageCode: LanguageCode.fr, name, slug: this.slug(`${item.sku}-${name}`), description: enrichment?.description || item.description || '' }] });
    const [variant] = await this.variants.create(ctx, [{ productId: product.id, sku: `TD-${item.sku}`, enabled: false, trackInventory: GlobalFlag.FALSE, prices: [{ currencyCode: ctx.currencyCode, price: salePrice }], translations: [{ languageCode: LanguageCode.fr, name }] }]);
    await records.save(records.create({ supplier: 'TD_SYNNEX', supplierSku: item.sku, manufacturerReference: item.manufacturerReference ?? null, ean: item.ean ?? null, productVariantId: variant.id, lastPurchasePrice: item.priceHt === undefined ? null : Math.round(item.priceHt * 100), lastStock: item.stock ?? null, marginPercent: Math.round(rule.marginPercent * 100), fixedAmount: Math.round(rule.fixedAmount * 100), lastSyncedAt: new Date(), lastError: null }));
    // Download only an image returned by the server-side Icecat lookup, never an arbitrary client URL.
    if (enrichment?.imageUrl && process.env.ICECAT_IMPORT_IMAGES === 'true') {
      try {
        const downloaded = await this.icecat.downloadImage(enrichment.imageUrl);
        if (downloaded) {
         const result: any = await this.assets.createFromFileStream(
  downloaded.stream,
  downloaded.filename,
  ctx
);
          if (result?.id) await this.products.update(ctx, { id: product.id, featuredAssetId: result.id });
          else await this.log('ERROR', 'icecat-image', `${item.sku}: création asset refusée.`);
        }
      } catch (error) { await this.log('ERROR', 'icecat-image', `${item.sku}: ${error instanceof Error ? error.message : 'erreur image'}`); }
    }
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
      if (item.stock !== undefined || item.priceHt !== undefined) await this.variants.update(ctx, [{ id: variantId as any, ...(item.priceHt === undefined ? {} : { price: this.calculateSalePrice(item.priceHt, { marginPercent: record.marginPercent / 100, fixedAmount: record.fixedAmount / 100 }) }) }]);
      await this.connection.getRepository(SupplierImportRecord).update({ supplier: 'TD_SYNNEX', supplierSku }, { ...(item.priceHt === undefined ? {} : { lastPurchasePrice: Math.round(item.priceHt * 100) }), ...(item.stock === undefined ? {} : { lastStock: item.stock }), lastSyncedAt: new Date(), lastError: null });
      await this.log('INFO', 'sync', `${supplierSku}: prix et disponibilité fournisseur actualisés (sans modifier le stock physique).`);
    } catch (e) { const message = e instanceof Error ? e.message : 'erreur inconnue'; await this.connection.getRepository(SupplierImportRecord).update({ supplier: 'TD_SYNNEX', supplierSku }, { lastError: message }); await this.log('ERROR', 'sync', `${supplierSku}: ${message}`); throw e; }
  }
  private async log(level: 'INFO' | 'ERROR', action: string, message: string) { await this.connection.getRepository(SupplierSyncLog).save({ level, action, message }); }
  private async workerContext(): Promise<RequestContext> { const user = await this.connection.rawConnection.getRepository(User).findOne({ where: { identifier: process.env.SUPERADMIN_USERNAME }, relations: { roles: { channels: true } } }); if (!user) throw new Error('Superadministrateur introuvable pour la synchronisation worker.'); return this.contexts.create({ apiType: 'admin', user }); }
  private slug(value: string) { return value.toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 240) || 'produit'; }
}
