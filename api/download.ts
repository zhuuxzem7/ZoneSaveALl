import type { IncomingMessage, ServerResponse } from 'http';
import { Readable } from 'stream';
import { isAllowedMediaDownloadUrl } from '../lib/mediaExtractor.js';

interface VercelResponse extends ServerResponse {
  status: (code: number) => VercelResponse;
  json: (data: unknown) => void;
}

export default async function handler(req: IncomingMessage, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  const parsed = new URL(req.url || '/', 'http://localhost');
  const mediaUrl = (parsed.searchParams.get('url') || '').trim();
  const rawFilename = (parsed.searchParams.get('filename') || 'zonesaveall-media').trim();
  const typeParam = parsed.searchParams.get('type') || 'mp4';
  const mediaType = typeParam === 'mp3' ? 'mp3' : typeParam === 'jpg' ? 'jpg' : 'mp4';
  const isInline = parsed.searchParams.get('inline') === '1';

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
      res.writeHead(302, { Location: mediaUrl });
      res.end();
      return;
    }

    const contentType =
      mediaType === 'mp3'
        ? 'audio/mpeg'
        : mediaType === 'jpg'
          ? upstream.headers.get('content-type') || 'image/jpeg'
          : upstream.headers.get('content-type') || 'video/mp4';

    res.statusCode = upstream.status;
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
    res.writeHead(302, { Location: mediaUrl });
    res.end();
  }
}
