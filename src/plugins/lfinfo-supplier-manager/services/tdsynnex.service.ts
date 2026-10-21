import { Injectable } from '@nestjs/common';

export interface SupplierProduct { sku: string; name: string; manufacturer?: string; manufacturerReference?: string; ean?: string; priceHt?: number; stock?: number; incomingStock?: number; discontinued?: boolean; imageUrl?: string; description?: string; }
export interface SupplierSearch { manufacturer?: string; productClass?: string; productSubClass?: string; reference?: string; status?: string; skip?: number; take?: number; }

/** TD SYNNEX boundary: credentials never leave this server. Response mapping tolerates API field aliases. */
@Injectable()
export class TdSynnexService {
  private accessToken?: string;
  private tokenExpiresAt = 0;
  private readonly apiUrl = process.env.TD_SYNNEX_API_URL || 'https://api.tdsynnex.com';
  get configured() { return !!(process.env.TD_SYNNEX_CLIENT_ID && process.env.TD_SYNNEX_CLIENT_SECRET); }

  async catalogue(search: SupplierSearch): Promise<{ items: SupplierProduct[]; totalItems: number }> {
    if (!this.configured) throw new Error('TD SYNNEX non configuré : renseignez TD_SYNNEX_CLIENT_ID et TD_SYNNEX_CLIENT_SECRET.');
    const token = await this.getToken();
    // Digital Bridge catalogue v2 names and pagination follow the official EU contract.
    const hasReference = !!search.reference?.trim();
    const body = { tdsynnexPartNumber: hasReference ? [search.reference!.trim()] : null, manufPartNumber: null, upcEan: null, customerPartNumber: null, manufacturer: hasReference ? null : (search.manufacturer?.trim() || null), class: hasReference ? null : (search.productClass?.trim() || null), subclass: hasReference ? null : (search.productSubClass?.trim() || null), productStatusCode: search.status?.trim() || null, onlyInStock: false, includeStock: true, includePrice: true, includePricePerQuantity: true, includeOutlet: false, includeEndUserPrice: false, page: Math.floor((search.skip ?? 0) / Math.min(search.take ?? 25, 100)) + 1, pageSize: Math.min(search.take ?? 25, 100) };
    const response = await fetch(`${this.apiUrl}/eu/resellers/v2/products/catalogue`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json', TraceId: crypto.randomUUID() }, body: JSON.stringify(body) });
    if (!response.ok) throw new Error(`TD SYNNEX catalogue: HTTP ${response.status}`);
    const json: any = await response.json();
    const rows = json.products ?? json.items ?? json.data?.products ?? json.data ?? [];
    return { items: Array.isArray(rows) ? rows.map((p: any) => this.mapProduct(p)) : [], totalItems: Number(json.totalItems ?? json.total ?? json.pagination?.total ?? rows.length) };
  }
  private async getToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiresAt) return this.accessToken;
    const form = new URLSearchParams({ grant_type: 'client_credentials', client_id: process.env.TD_SYNNEX_CLIENT_ID!, client_secret: process.env.TD_SYNNEX_CLIENT_SECRET! });
    const response = await fetch(`${this.apiUrl}/auth/token`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' }, body: form });
    if (!response.ok) throw new Error(`TD SYNNEX OAuth: HTTP ${response.status}`);
    const json: any = await response.json();
    if (!json.access_token) throw new Error('TD SYNNEX OAuth: access_token absent.');
    this.accessToken = json.access_token; this.tokenExpiresAt = Date.now() + Math.max(30, Number(json.expires_in ?? 300) - 30) * 1000;
    return this.accessToken!;
  }
  private mapProduct(p: any): SupplierProduct { return { sku: String(p.sku ?? p.productCode ?? p.tdSynnexSku ?? p.id ?? ''), name: p.description ?? p.name ?? p.productDescription ?? 'Produit TD SYNNEX', manufacturer: p.manufacturer ?? p.vendorName, manufacturerReference: p.manufacturerPartNumber ?? p.mpn ?? p.vendorPartNumber, ean: p.ean ?? p.eanCode ?? p.gtin, priceHt: toNumber(p.price ?? p.netPrice ?? p.prices?.net), stock: toNumber(p.stock ?? p.availableStock ?? p.availability?.quantity), incomingStock: toNumber(p.incomingStock ?? p.inboundStock), discontinued: Boolean(p.discontinued ?? p.endOfLife), imageUrl: p.imageUrl ?? p.image, description: p.longDescription ?? p.description }; }
}
function toNumber(value: unknown): number | undefined { const n = Number(value); return Number.isFinite(n) ? n : undefined; }
