import { Injectable } from '@nestjs/common';

export interface SupplierProduct { sku: string; name: string; manufacturer?: string; category?: string; subCategory?: string; manufacturerReference?: string; ean?: string; priceHt?: number; currencyCode?: string; recommendedPrice?: number; stock?: number; localStock?: number; incomingStock?: number; ramGb?: number; ssdGb?: number; keyboardLayout?: string; discontinued?: boolean; status?: string; imageUrl?: string; icecatFound?: boolean; icecatTitle?: string; description?: string; technical?: Record<string, unknown>; }
export interface SupplierSearch { supplier?: string; manufacturer?: string; productClass?: string; productSubClass?: string; reference?: string; manufacturerReference?: string; ean?: string; status?: string; skip?: number; take?: number; }

/** TD SYNNEX boundary: credentials never leave this server. Response mapping tolerates API field aliases. */
@Injectable()
export class TdSynnexService {
  private accessToken?: string;
  private tokenExpiresAt = 0;
  private lastDiagnostic: unknown = null;
  private readonly apiUrl = process.env.TD_SYNNEX_API_URL || 'https://api.tdsynnex.com';
  private get euApiUrl() { return this.apiUrl.replace(/\/$/, '').endsWith('/eu') ? this.apiUrl.replace(/\/$/, '') : `${this.apiUrl.replace(/\/$/, '')}/eu`; }
  get configured() { return !!(process.env.TD_SYNNEX_CLIENT_ID && process.env.TD_SYNNEX_CLIENT_SECRET); }

  async catalogue(search: SupplierSearch): Promise<{ items: SupplierProduct[]; totalItems: number }> {
    if (!this.configured) throw new Error('TD SYNNEX non configuré : renseignez TD_SYNNEX_CLIENT_ID et TD_SYNNEX_CLIENT_SECRET.');
    const token = await this.getToken();
    // Catalogue V2 accepts one primary criterion. Local text/specification filters must never be sent as unsupported API fields.
    const tdReference = clean(search.reference), manufacturerReference = clean(search.manufacturerReference), ean = clean(search.ean);
    const hasExact = !!(tdReference || manufacturerReference || ean); const pageSize = Math.min(Math.max(search.take ?? 25, 1), 100);
    const body = { tdsynnexPartNumber: tdReference ? [tdReference] : null, manufPartNumber: !tdReference && manufacturerReference ? [manufacturerReference] : null, upcEan: !tdReference && !manufacturerReference && ean ? [ean] : null, customerPartNumber: null, manufacturer: hasExact ? null : clean(search.manufacturer), class: hasExact ? null : clean(search.productClass), subclass: hasExact ? null : clean(search.productSubClass), productStatusCode: clean(search.status), onlyInStock: false, includeStock: true, includePrice: true, includePricePerQuantity: false, includeOutlet: false, includeEndUserPrice: false, page: Math.floor((search.skip ?? 0) / pageSize) + 1, pageSize };
    const response = await fetch(`${this.euApiUrl}/resellers/v2/products/catalogue`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json', TraceId: crypto.randomUUID() }, body: JSON.stringify(body) });
    const raw = await response.text(); let json: any; try { json = raw ? JSON.parse(raw) : {}; } catch { json = { response: raw.slice(0, 1000) }; }
    this.lastDiagnostic = { request: body, response: sanitize(json), httpStatus: response.status, ok: response.ok, at: new Date().toISOString() };
    if (!response.ok) throw new Error(`TD SYNNEX catalogue: HTTP ${response.status}; critère primaire=${tdReference ? 'tdsynnexPartNumber' : manufacturerReference ? 'manufPartNumber' : ean ? 'upcEan' : clean(search.manufacturer) ? 'manufacturer' : 'aucun'}.`);
    const rows = json.products ?? json.items ?? json.data?.products ?? json.data?.items ?? json.data ?? json.productList ?? [];
    return { items: Array.isArray(rows) ? rows.map((p: any) => this.mapProduct(p)).filter((p: SupplierProduct) => !!p.sku) : [], totalItems: toNumber(json.totalResults ?? json.totalItems ?? json.total ?? json.pagination?.total) ?? (Array.isArray(rows) ? rows.length : 0) };
  }
  diagnostic() { return this.lastDiagnostic; }
  private async getToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiresAt) return this.accessToken;
    const form = new URLSearchParams({ grant_type: 'client_credentials', client_id: process.env.TD_SYNNEX_CLIENT_ID!, client_secret: process.env.TD_SYNNEX_CLIENT_SECRET! });
    const response = await fetch(`${this.euApiUrl}/auth/token`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' }, body: form });
    if (!response.ok) throw new Error(`TD SYNNEX OAuth: HTTP ${response.status}`);
    const json: any = await response.json();
    if (!json.access_token) throw new Error('TD SYNNEX OAuth: access_token absent.');
    this.accessToken = json.access_token; this.tokenExpiresAt = Date.now() + Math.max(30, Number(json.expires_in ?? 300) - 30) * 1000;
    return this.accessToken!;
  }
  private mapProduct(p: any): SupplierProduct {
    const price = p.price;
    const stock = p.stock;
    const status = nullishString(p.productStatusCode ?? p.status);
    return { sku: String(p.tdsynnexPartNumber ?? p.sku ?? p.productCode ?? p.id ?? ''), name: p.name ?? p.productDescription ?? p.description ?? 'Produit TD SYNNEX', manufacturer: nullishString(p.manufacturer ?? p.vendorName), category: nullishString(p.class ?? p.productClass ?? p.category), subCategory: nullishString(p.subclass ?? p.productSubClass ?? p.subCategory), manufacturerReference: nullishString(p.manufPartNumber ?? p.manufacturerPartNumber ?? p.mpn ?? p.vendorPartNumber), ean: firstString(p.upcEan ?? p.ean ?? p.eanCode ?? p.gtin), priceHt: priceNumber(price?.customerPrice), currencyCode: nullishString(price?.currencyCode), recommendedPrice: priceNumber(p.endUserPrice ?? price?.endUserPrice ?? p.endUserPrices?.[0] ?? p.recommendedRetailPrice), stock: toNumber(stock?.quantityAvailableTotal), localStock: toNumber(stock?.quantityAvailableLocal), incomingStock: toNumber(stock?.quantityIncomingTotal), ramGb: capacityGb(p.memory ?? p.ram ?? p.memorySize), ssdGb: capacityGb(p.ssd ?? p.storage ?? p.storageCapacity), keyboardLayout: keyboardLayout(p), discontinued: status ? !/^active$/i.test(status) : undefined, status, imageUrl: nullishString(p.imageUrl ?? p.image ?? p.primaryImageUrl), description: nullishString(p.longDescription ?? p.description), technical: technical(p) };
  }
}
function toNumber(value: unknown): number | undefined { if (value === null || value === undefined || value === '') return undefined; const n = Number(value); return Number.isFinite(n) ? n : undefined; }
function priceNumber(value: any): number | undefined { return toNumber(value?.amount ?? value?.price ?? value?.value ?? value); }
function firstString(value: unknown): string | undefined { const v = Array.isArray(value) ? value[0] : value; return typeof v === 'string' && v.trim() ? v.trim() : undefined; }
function nullishString(value: unknown): string | undefined { return typeof value === 'string' && value.trim() ? value.trim() : undefined; }
function capacityGb(value: unknown): number | undefined { const direct = toNumber(value); if (direct !== undefined) return direct; const match = typeof value === 'string' ? value.match(/(\d+(?:[.,]\d+)?)\s*(TB|GB)/i) : null; if (!match) return undefined; const n = Number(match[1].replace(',', '.')); return match[2].toUpperCase() === 'TB' ? n * 1024 : n; }
function belgianKeyboard(p: any): boolean | undefined { const value = p.keyboardLayout ?? p.keyboard ?? p.keyboardLanguage; if (value == null) return undefined; return /\b(be|belgian|azerty)\b/i.test(String(value)); }
function keyboardLayout(p: any): string | undefined { const v = String(p.keyboardLayout ?? p.keyboard ?? p.keyboardLanguage ?? ''); if (!v) return undefined; if (/\b(be|belgian|belgique)\b/i.test(v)) return 'BE'; if (/\b(fr|french|france)\b/i.test(v)) return 'FR'; if (/\b(de|german|deutsch)\b/i.test(v)) return 'DE'; return 'OTHER'; }
function technical(p: any): Record<string, unknown> { const keys = ['processor', 'memory', 'ram', 'memorySize', 'storage', 'ssd', 'storageCapacity', 'keyboardLayout', 'screenSize', 'operatingSystem', 'warranty']; return Object.fromEntries(keys.filter(k => p[k] !== undefined && p[k] !== null).map(k => [k, p[k]])); }
function clean(v: unknown): string | null { return typeof v === 'string' && v.trim() ? v.trim() : null; }
function sanitize(value: any, depth = 0): any { if (depth > 4) return '[tronqué]'; if (Array.isArray(value)) return value.slice(0, 3).map(v => sanitize(v, depth + 1)); if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).filter(([k]) => !/(token|secret|authorization|password)/i.test(k)).map(([k, v]) => [k, sanitize(v, depth + 1)])); if (typeof value === 'string') return value.length > 300 ? `${value.slice(0, 300)}…` : value; return value; }
