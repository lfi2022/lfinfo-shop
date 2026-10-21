import { Injectable } from '@nestjs/common';
import { Readable } from 'stream';
export interface EnrichedProduct { name?: string; description?: string; imageUrl?: string; specifications?: Record<string, string>; }
/**
 * Icecat Product JSON API. Tokens are sent only server-to-server as headers.
 * The content token causes Icecat to append permitted media access to returned links.
 * @see https://iceclog.com/manual-for-icecat-json-product-requests/
 */
@Injectable()
export class IcecatService {
  get configured() { return !!(process.env.ICECAT_API_TOKEN && process.env.ICECAT_CONTENT_TOKEN); }
  private readonly previewCache = new Map<string, { until: number; value?: EnrichedProduct }>();
  async preview(ean?: string, manufacturerReference?: string, manufacturer?: string): Promise<EnrichedProduct | undefined> {
    const key = JSON.stringify([ean, manufacturerReference, manufacturer]);
    const cached = this.previewCache.get(key);
    if (cached && cached.until > Date.now()) return cached.value;
    const value = await this.enrich(ean, manufacturerReference, manufacturer).catch(() => undefined);
    if (this.previewCache.size > 2000) this.previewCache.clear();
    this.previewCache.set(key, { until: Date.now() + 30 * 60_000, value });
    return value;
  }
  // The URL must be provided by Icecat, never by a dashboard client.
  async downloadImage(url: string): Promise<{ stream: Readable; filename: string } | undefined> {
    if (!isIcecatImageUrl(url)) return undefined;
    const response = await fetch(url, { signal: AbortSignal.timeout(12000), redirect: 'error' });
    if (!response.ok || !response.body) return undefined;
    const type = response.headers.get('content-type')?.split(';')[0]?.toLowerCase();
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(type ?? '')) return undefined;
    const bytes = Buffer.from(await response.arrayBuffer());
    if (!bytes.length || bytes.length > 8 * 1024 * 1024) return undefined;
    const extension = type === 'image/png' ? 'png' : type === 'image/webp' ? 'webp' : 'jpg';
    return { stream: Readable.from(bytes), filename: `icecat-${Date.now()}.${extension}` };
  }
  async enrich(ean?: string, manufacturerReference?: string, manufacturer?: string): Promise<EnrichedProduct | undefined> {
    if (!this.configured || (!ean && !(manufacturerReference && manufacturer))) return undefined;
    const url = new URL('https://live.icecat.biz/api');
    url.searchParams.set('lang', process.env.ICECAT_LANGUAGE ?? 'FR_BE');
    url.searchParams.set('content', 'generalinfo,image,gallery,featuregroups');
    if (manufacturerReference && manufacturer) { url.searchParams.set('Brand', manufacturer); url.searchParams.set('ProductCode', manufacturerReference); }
    if (ean) url.searchParams.set('GTIN', ean);
    const response = await fetch(url, { signal: AbortSignal.timeout(12000), headers: { 'api-token': process.env.ICECAT_API_TOKEN!, 'content-token': process.env.ICECAT_CONTENT_TOKEN!, Accept: 'application/json' } });
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

export function isIcecatImageUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === 'https:' && (u.hostname === 'icecat.biz' || u.hostname.endsWith('.icecat.biz') || u.hostname === 'icecat.com' || u.hostname.endsWith('.icecat.com')) && !u.username && !u.password;
  } catch { return false; }
}
export function publicIcecatImageUrl(value?: string): string | undefined {
  if (!value || !isIcecatImageUrl(value)) return undefined;
  const u = new URL(value);
  if ([...u.searchParams.keys()].some(k => /token|secret|key|auth|pass|user/i.test(k))) return undefined;
  return value;
}
