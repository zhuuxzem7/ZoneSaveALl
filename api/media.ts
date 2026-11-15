import type { IncomingMessage, ServerResponse } from 'http';
import { extractMediaFromUrl } from '../lib/mediaExtractor.js';

interface VercelRequest extends IncomingMessage {
  body?: unknown;
}

interface VercelResponse extends ServerResponse {
  status: (code: number) => VercelResponse;
  json: (data: unknown) => void;
}

async function readJsonBody(req: VercelRequest): Promise<Record<string, unknown>> {
  if (req.body && typeof req.body === 'object') {
    return req.body as Record<string, unknown>;
  }
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  let rawInput = '';

  if (req.method === 'POST') {
    const body = await readJsonBody(req);
    if (typeof body.url === 'string') {
      rawInput = body.url;
    }
  }

  if (!rawInput && req.url) {
    try {
      const parsed = new URL(req.url, 'http://localhost');
      rawInput = parsed.searchParams.get('url') || '';
    } catch {
      rawInput = '';
    }
  }

  if (!rawInput.trim()) {
    res.status(400).json({ error: 'Masukkan tautan video atau media terlebih dahulu.' });
    return;
  }

  try {
    const result = await extractMediaFromUrl(rawInput);
    res.status(200).json(result);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Terjadi kesalahan saat mengambil data media.';
    res.status(400).json({ error: message });
  }
}
