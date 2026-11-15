import express, { type Request, type Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { Readable } from 'stream';
import {
  extractMediaFromUrl,
  isAllowedMediaDownloadUrl,
} from './lib/mediaExtractor.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;

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

    if (!mediaUrl || !isAllowedMediaDownloadUrl(mediaUrl)) {
      res.status(400).json({ error: 'Tautan unduhan tidak valid.' });
      return;
    }

    const safeBase =
      rawFilename.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80) || 'zonesaveall-media';
    const extension = `.${mediaType}`;
    const finalFilename = safeBase.endsWith(extension) ? safeBase : `${safeBase}${extension}`;

    try {
      const upstream = await fetch(mediaUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
          Referer: 'https://www.tikwm.com/',
        },
      });

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

      const contentLength = upstream.headers.get('content-length');
      if (contentLength) {
        res.setHeader('Content-Length', contentLength);
      }

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${finalFilename}"`);
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
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ZoneSaveALL server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
