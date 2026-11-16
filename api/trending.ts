import type { IncomingMessage, ServerResponse } from 'http';
import { fetchTrendingMedia } from '../lib/trendingMedia.js';

interface VercelResponse extends ServerResponse {
  status: (code: number) => VercelResponse;
  json: (data: unknown) => void;
}

export default async function handler(req: IncomingMessage, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  let forceRefresh = false;
  if (req.url) {
    try {
      const parsed = new URL(req.url, 'http://localhost');
      forceRefresh = parsed.searchParams.get('refresh') === '1';
    } catch {
      forceRefresh = false;
    }
  }

  try {
    const result = await fetchTrendingMedia(forceRefresh);
    res.setHeader('Cache-Control', 'public, max-age=120, s-maxage=300');
    res.status(200).json(result);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Gagal mengambil daftar media viral saat ini.';
    res.status(502).json({ error: message });
  }
}
