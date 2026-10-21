import { Injectable } from '@nestjs/common';

export interface SupplierProduct { sku: string; name: string; manufacturer?: string; manufacturerReference?: string; ean?: string; priceHt?: number; currencyCode?: string; recommendedPrice?: number; stock?: number; localStock?: number; incomingStock?: number; ramGb?: number; ssdGb?: number; belgianKeyboard?: boolean; discontinued?: boolean; imageUrl?: string; description?: string; }
export interface SupplierSearch { manufacturer?: string; productClass?: string; productSubClass?: string; reference?: string; status?: string; skip?: number; take?: number; }

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
    // Digital Bridge catalogue v2 names and pagination follow the official EU contract.
    const hasReference = !!search.reference?.trim();
    const body = { tdsynnexPartNumber: hasReference ? [search.reference!.trim()] : null, manufPartNumber: null, upcEan: null, customerPartNumber: null, manufacturer: hasReference ? null : (search.manufacturer?.trim() || null), class: hasReference ? null : (search.productClass?.trim() || null), subclass: hasReference ? null : (search.productSubClass?.trim() || null), productStatusCode: search.status?.trim() || null, onlyInStock: false, includeStock: true, includePrice: true, includePricePerQuantity: true, includeOutlet: false, includeEndUserPrice: true, page: Math.floor((search.skip ?? 0) / Math.min(search.take ?? 25, 100)) + 1, pageSize: Math.min(search.take ?? 25, 100) };
    const response = await fetch(`${this.euApiUrl}/resellers/v2/products/catalogue`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json', TraceId: crypto.randomUUID() }, body: JSON.stringify(body) });
    if (!response.ok) throw new Error(`TD SYNNEX catalogue: HTTP ${response.status}`);
    const json: any = await response.json();
    this.lastDiagnostic = sanitize(json);
    const rows = json.products ?? json.items ?? json.data?.products ?? json.data ?? json.productList ?? json;
    return { items: Array.isArray(rows) ? rows.map((p: any) => this.mapProduct(p)) : [], totalItems: Number(json.totalItems ?? json.total ?? json.pagination?.total ?? rows.length) };
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
    return { sku: String(p.tdsynnexPartNumber ?? p.sku ?? p.productCode ?? p.id ?? ''), name: p.description ?? p.name ?? p.productDescription ?? 'Produit TD SYNNEX', manufacturer: p.manufacturer ?? p.vendorName, manufacturerReference: p.manufPartNumber ?? p.manufacturerPartNumber ?? p.mpn ?? nullishString(p.vendorPartNumber), ean: firstString(p.upcEan) ?? firstString(p.ean) ?? firstString(p.eanCode) ?? firstString(p.gtin), priceHt: priceNumber(price?.customerPrice), currencyCode: nullishString(price?.currencyCode), recommendedPrice: priceNumber(p.endUserPrice ?? p.endUserPrices?.[0] ?? p.recommendedRetailPrice), stock: toNumber(stock?.quantityAvailableTotal), localStock: toNumber(stock?.quantityAvailableLocal), incomingStock: toNumber(stock?.quantityIncomingTotal), ramGb: capacityGb(p.memory ?? p.ram ?? p.memorySize), ssdGb: capacityGb(p.ssd ?? p.storage ?? p.storageCapacity), belgianKeyboard: belgianKeyboard(p), discontinued: p.productStatusCode ? p.productStatusCode !== 'Active' : undefined, imageUrl: p.imageUrl ?? p.image, description: p.longDescription ?? p.description };
  }
}
function toNumber(value: unknown): number | undefined { const n = Number(value); return Number.isFinite(n) ? n : undefined; }
function priceNumber(value: any): number | undefined { return toNumber(value?.amount ?? value?.price ?? value?.value ?? value); }
function firstString(value: unknown): string | undefined { const v = Array.isArray(value) ? value[0] : value; return typeof v === 'string' && v.trim() ? v.trim() : undefined; }
function nullishString(value: unknown): string | undefined { return typeof value === 'string' && value.trim() ? value.trim() : undefined; }
function capacityGb(value: unknown): number | undefined { const direct = toNumber(value); if (direct !== undefined) return direct; const match = typeof value === 'string' ? value.match(/(\d+(?:[.,]\d+)?)\s*(TB|GB)/i) : null; if (!match) return undefined; const n = Number(match[1].replace(',', '.')); return match[2].toUpperCase() === 'TB' ? n * 1024 : n; }
function belgianKeyboard(p: any): boolean | undefined { const value = p.keyboardLayout ?? p.keyboard ?? p.keyboardLanguage; if (value == null) return undefined; return /\b(be|belgian|azerty)\b/i.test(String(value)); }
function sanitize(value: any, depth = 0): any { if (depth > 4) return '[tronqué]'; if (Array.isArray(value)) return value.slice(0, 3).map(v => sanitize(v, depth + 1)); if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).filter(([k]) => !/(token|secret|authorization|password)/i.test(k)).map(([k, v]) => [k, sanitize(v, depth + 1)])); if (typeof value === 'string') return value.length > 300 ? `${value.slice(0, 300)}…` : value; return value; }
