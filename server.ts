import express, { type Request, type Response } from 'express';
import { createServer as createViteServer } from 'vite';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Readable } from 'stream';
import {
  extractMediaFromUrl,
  isAllowedMediaDownloadUrl,
} from './lib/mediaExtractor.ts';
import { fetchTrendingMedia } from './lib/trendingMedia.ts';
import {
  buildStructuredDataJson,
  getPlatformSeoByPath,
  PLATFORM_SEO_LIST,
} from './lib/platformSeo.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;

function resolveRequestOrigin(req: Request): string {
  const envUrl = process.env.APP_URL?.trim();
  if (envUrl && /^https?:\/\//i.test(envUrl)) {
    return envUrl.replace(/\/$/, '');
  }
  const forwardedProto = req.headers['x-forwarded-proto'];
  const proto =
    typeof forwardedProto === 'string' && forwardedProto
      ? forwardedProto.split(',')[0].trim()
      : req.protocol || 'http';
  const host = req.headers['x-forwarded-host'] || req.headers.host || `localhost:${PORT}`;
  return `${proto}://${Array.isArray(host) ? host[0] : host}`;
}

function escapeHtmlAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function injectPlatformSeoHtml(html: string, pathname: string, origin: string): string {
  const seo = getPlatformSeoByPath(pathname) || PLATFORM_SEO_LIST[0];
  const canonicalUrl = seo.slug === '/' ? `${origin}/` : `${origin}${seo.slug}`;
  const safeTitle = escapeHtmlAttr(seo.title);
  const safeDesc = escapeHtmlAttr(seo.description);
  const safeUrl = escapeHtmlAttr(canonicalUrl);
  const safeImage = escapeHtmlAttr(`${origin}/pwa-512x512.png`);
  const jsonLd = buildStructuredDataJson(seo, origin).replace(/<\/script/gi, '<\\/script');

  return html
    .replace(/<title>[\s\S]*?<\/title>/i, `<title>${safeTitle}</title>`)
    .replace(
      /<meta\s+name="description"\s+content="[\s\S]*?"\s*\/?>/i,
      `<meta name="description" content="${safeDesc}" />`
    )
    .replace(
      /<link\s+rel="canonical"[^>]*>/i,
      `<link rel="canonical" href="${safeUrl}" />`
    )
    .replace(
      /<meta\s+property="og:url"\s+content="[\s\S]*?"\s*\/?>/i,
      `<meta property="og:url" content="${safeUrl}" />`
    )
    .replace(
      /<meta\s+property="og:title"\s+content="[\s\S]*?"\s*\/?>/i,
      `<meta property="og:title" content="${safeTitle}" />`
    )
    .replace(
      /<meta\s+property="og:description"\s+content="[\s\S]*?"\s*\/?>/i,
      `<meta property="og:description" content="${safeDesc}" />`
    )
    .replace(
      /<meta\s+property="og:image"\s+content="[\s\S]*?"\s*\/?>/i,
      `<meta property="og:image" content="${safeImage}" />`
    )
    .replace(
      /<meta\s+name="twitter:title"\s+content="[\s\S]*?"\s*\/?>/i,
      `<meta name="twitter:title" content="${safeTitle}" />`
    )
    .replace(
      /<meta\s+name="twitter:description"\s+content="[\s\S]*?"\s*\/?>/i,
      `<meta name="twitter:description" content="${safeDesc}" />`
    )
    .replace(
      /<meta\s+name="twitter:image"\s+content="[\s\S]*?"\s*\/?>/i,
      `<meta name="twitter:image" content="${safeImage}" />`
    )
    .replace(
      /<script id="zonesaveall-jsonld" type="application\/ld\+json">[\s\S]*?<\/script>/i,
      `<script id="zonesaveall-jsonld" type="application/ld+json">${jsonLd}</script>`
    );
}

async function handleMediaLookup(req: Request, res: Response) {
  const rawInput =
    typeof req.body?.url === 'string'
      ? req.body.url
      : typeof req.query.url === 'string'
        ? req.query.url
        : '';

  if (!rawInput.trim()) {
    res.status(400).json({ error: 'Masukkan tautan video atau media terlebih dahulu.' });
    return;
  }

  try {
    const result = await extractMediaFromUrl(rawInput);
    res.json(result);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Terjadi kesalahan saat mengambil data media.';
    res.status(400).json({ error: message });
  }
}

async function startServer() {
  const app = express();
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', app: 'ZoneSaveALL' });
  });

  app.get('/robots.txt', (req, res) => {
    const origin = resolveRequestOrigin(req);
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(`User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${origin}/sitemap.xml\n`);
  });

  app.get('/sitemap.xml', (req, res) => {
    const origin = resolveRequestOrigin(req);
    const today = new Date().toISOString().split('T')[0];
    const urls = PLATFORM_SEO_LIST.map((item) => {
      const loc = item.slug === '/' ? `${origin}/` : `${origin}${item.slug}`;
      const priority = item.id === 'all' ? '1.0' : '0.9';
      return `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
    }).join('\n');

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(
      `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`
    );
  });

  app.get('/api/trending', async (req, res) => {
    const forceRefresh = req.query.refresh === '1';
    try {
      const result = await fetchTrendingMedia(forceRefresh);
      res.setHeader('Cache-Control', 'public, max-age=120');
      res.json(result);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Gagal mengambil daftar media viral saat ini.';
      res.status(502).json({ error: message });
    }
  });

  app.get('/api/media', handleMediaLookup);
  app.post('/api/media', handleMediaLookup);
  app.get('/api/tiktok', handleMediaLookup);
  app.post('/api/tiktok', handleMediaLookup);

  app.get('/api/download', async (req, res) => {
    const mediaUrl = typeof req.query.url === 'string' ? req.query.url.trim() : '';
    const rawFilename =
      typeof req.query.filename === 'string' ? req.query.filename.trim() : 'zonesaveall-media';
    const typeParam = typeof req.query.type === 'string' ? req.query.type : 'mp4';
    const mediaType = typeParam === 'mp3' ? 'mp3' : typeParam === 'jpg' ? 'jpg' : 'mp4';
    const isInline = req.query.inline === '1';

    if (!mediaUrl || !isAllowedMediaDownloadUrl(mediaUrl)) {
      res.status(400).json({ error: 'Tautan unduhan tidak valid.' });
      return;
    }

    const safeBase =
      rawFilename.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80) || 'zonesaveall-media';
    const extension = `.${mediaType}`;
    const finalFilename = safeBase.endsWith(extension) ? safeBase : `${safeBase}${extension}`;

    try {
      const fetchHeaders: Record<string, string> = {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        Referer: 'https://www.tikwm.com/',
      };
      if (typeof req.headers.range === 'string') {
        fetchHeaders.Range = req.headers.range;
      }

      const upstream = await fetch(mediaUrl, { headers: fetchHeaders });

      if (!upstream.ok || !upstream.body) {
        res.redirect(mediaUrl);
        return;
      }

      const contentType =
        mediaType === 'mp3'
          ? 'audio/mpeg'
          : mediaType === 'jpg'
            ? upstream.headers.get('content-type') || 'image/jpeg'
            : upstream.headers.get('content-type') || 'video/mp4';

      res.status(upstream.status);
      const contentLength = upstream.headers.get('content-length');
      if (contentLength) {
        res.setHeader('Content-Length', contentLength);
      }
      const contentRange = upstream.headers.get('content-range');
      if (contentRange) {
        res.setHeader('Content-Range', contentRange);
      }
      const acceptRanges = upstream.headers.get('accept-ranges');
      if (acceptRanges) {
        res.setHeader('Accept-Ranges', acceptRanges);
      }

      res.setHeader('Content-Type', contentType);
      res.setHeader(
        'Content-Disposition',
        isInline
          ? `inline; filename="${finalFilename}"`
          : `attachment; filename="${finalFilename}"`
      );
      res.setHeader('Cache-Control', 'no-store');

      const nodeStream = Readable.fromWeb(upstream.body as Parameters<typeof Readable.fromWeb>[0]);
      nodeStream.on('error', () => {
        if (!res.headersSent) {
          res.status(502).end();
        } else {
          res.end();
        }
      });
      nodeStream.pipe(res);
    } catch (error) {
      console.error('Download proxy error:', error);
      res.redirect(mediaUrl);
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });

    app.use((req, res, next) => {
      if (
        req.method === 'GET' &&
        (req.path === '/' || Boolean(getPlatformSeoByPath(req.path)))
      ) {
        const origin = resolveRequestOrigin(req);
        const templatePath = path.resolve(__dirname, 'index.html');
        fs.readFile(templatePath, 'utf8', async (err, rawHtml) => {
          if (err) {
            next(err);
            return;
          }
          try {
            const transformed = await vite.transformIndexHtml(req.originalUrl, rawHtml);
            const seoHtml = injectPlatformSeoHtml(transformed, req.path, origin);
            res.status(200).setHeader('Content-Type', 'text/html; charset=utf-8').end(seoHtml);
          } catch (e) {
            next(e);
          }
        });
        return;
      }
      next();
    });

    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    const distIndexHtml = fs.readFileSync(path.join(distPath, 'index.html'), 'utf8');
    app.use(express.static(distPath, { index: false }));
    app.get('*', (req, res) => {
      const origin = resolveRequestOrigin(req);
      const seoHtml = injectPlatformSeoHtml(distIndexHtml, req.path, origin);
      res.status(200).setHeader('Content-Type', 'text/html; charset=utf-8').send(seoHtml);
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ZoneSaveALL server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
