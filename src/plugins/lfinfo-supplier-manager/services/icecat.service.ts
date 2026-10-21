import { Injectable } from '@nestjs/common';
export interface EnrichedProduct { name?: string; description?: string; imageUrl?: string; specifications?: Record<string, string>; }
/**
 * Icecat Product JSON API. Tokens are sent only server-to-server as headers.
 * The content token causes Icecat to append permitted media access to returned links.
 * @see https://iceclog.com/manual-for-icecat-json-product-requests/
 */
@Injectable()
export class IcecatService {
  get configured() { return !!(process.env.ICECAT_API_TOKEN && process.env.ICECAT_CONTENT_TOKEN); }
  async enrich(ean?: string, manufacturerReference?: string, manufacturer?: string): Promise<EnrichedProduct | undefined> {
    if (!this.configured || (!ean && !(manufacturerReference && manufacturer))) return undefined;
    const url = new URL('https://live.icecat.biz/api');
    url.searchParams.set('lang', process.env.ICECAT_LANGUAGE ?? 'FR_BE');
    url.searchParams.set('content', 'generalinfo,image,gallery,featuregroups');
    if (manufacturerReference && manufacturer) { url.searchParams.set('Brand', manufacturer); url.searchParams.set('ProductCode', manufacturerReference); }
    if (ean) url.searchParams.set('GTIN', ean);
    const response = await fetch(url, { headers: { 'api-token': process.env.ICECAT_API_TOKEN!, 'content-token': process.env.ICECAT_CONTENT_TOKEN!, Accept: 'application/json' } });
    if (!response.ok) return undefined;
    const payload: any = await response.json();
    if (payload.msg !== 'OK' || !payload.data) return undefined;
    const data = payload.data;
    const info = data.GeneralInfo ?? {};
    const image = data.Image ?? data.Gallery?.find((entry: any) => entry.IsMain === 'Y') ?? data.Gallery?.[0] ?? {};
    return { name: info.Title, description: info.Description?.LongDesc ?? info.SummaryDescription?.LongSummaryDescription, imageUrl: image.HighPic ?? image.Pic ?? image.Pic500x500, specifications: this.flattenFeatures(data.FeaturesGroups) };
  }
  private flattenFeatures(groups: any[]): Record<string, string> { const result: Record<string, string> = {}; for (const group of groups ?? []) for (const feature of group.Features ?? []) { const name = feature.Name?.Value ?? feature.Name; const value = feature.PresentationValue ?? feature.Value; if (name && value != null) result[String(name)] = String(value); } return result; }
}
