import { Injectable } from '@nestjs/common';
export interface EnrichedProduct { name?: string; description?: string; imageUrl?: string; specifications?: Record<string, string>; }
/** Adapter seam. Icecat access is optional and is only used after contractual rights are configured. */
@Injectable()
export class IcecatService {
  get configured() { return !!(process.env.ICECAT_USERNAME && process.env.ICECAT_PASSWORD); }
  async enrich(ean?: string, manufacturerReference?: string): Promise<EnrichedProduct | undefined> {
    if (!this.configured || (!ean && !manufacturerReference)) return undefined;
    // Open/Full Icecat endpoints and allowed media fields differ per contract. Keep the endpoint configurable.
    const endpoint = process.env.ICECAT_LOOKUP_URL;
    if (!endpoint) return undefined;
    const url = new URL(endpoint); if (ean) url.searchParams.set('ean', ean); if (manufacturerReference) url.searchParams.set('productCode', manufacturerReference);
    const response = await fetch(url, { headers: { Authorization: `Basic ${Buffer.from(`${process.env.ICECAT_USERNAME}:${process.env.ICECAT_PASSWORD}`).toString('base64')}`, Accept: 'application/json' } });
    if (!response.ok) return undefined;
    const data: any = await response.json();
    return { name: data.name ?? data.Title, description: data.description ?? data.Description?.LongDesc, imageUrl: data.imageUrl ?? data.Image?.HighPic, specifications: data.specifications };
  }
}
