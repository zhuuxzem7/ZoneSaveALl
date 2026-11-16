import type { IncomingMessage, ServerResponse } from 'http';
import { PLATFORM_SEO_LIST } from '../lib/platformSeo.js';

function resolveOrigin(req: IncomingMessage): string {
  const envUrl = process.env.APP_URL?.trim();
  if (envUrl && /^https?:\/\//i.test(envUrl)) {
    return envUrl.replace(/\/$/, '');
  }
  const forwardedProto = req.headers['x-forwarded-proto'];
  const proto =
    typeof forwardedProto === 'string' && forwardedProto
      ? forwardedProto.split(',')[0].trim()
      : 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000';
  return `${proto}://${Array.isArray(host) ? host[0] : host}`;
}

export function buildSitemapXml(origin: string): string {
  const today = new Date().toISOString().split('T')[0];
  const urls = PLATFORM_SEO_LIST.map((item) => {
    const loc = item.slug === '/' ? `${origin}/` : `${origin}${item.slug}`;
    const priority = item.id === 'all' ? '1.0' : '0.9';
    return `  <url>
    <loc>${loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>${priority}</priority>
  </url>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;
}

export default function handler(req: IncomingMessage, res: ServerResponse) {
  const origin = resolveOrigin(req);
  const xml = buildSitemapXml(origin);
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');
  res.end(xml);
}
