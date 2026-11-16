import type { SocialPlatform } from './mediaExtractor.js';

export type TrendingCategory = 'Populer' | 'Musik Viral' | 'Short & Tren';

export interface TrendingMediaItem {
  id: string;
  platform: Extract<SocialPlatform, 'tiktok' | 'youtube'>;
  title: string;
  author: string;
  url: string;
  thumbnail: string;
  views: number;
  likes: number;
  duration?: number;
  category: TrendingCategory;
}

export interface TrendingMediaResponse {
  items: TrendingMediaItem[];
  updatedAt: string;
  cached: boolean;
}

const CACHE_TTL_MS = 10 * 60 * 1000;
let cachedResult: { data: TrendingMediaResponse; expiresAt: number } | null = null;

function decodeXmlEntities(raw: string): string {
  return raw
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_m, dec) => String.fromCharCode(Number(dec)))
    .trim();
}

function normalizeTikWmAsset(rawUrl: string | undefined): string {
  if (!rawUrl) return '';
  if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) return rawUrl;
  if (rawUrl.startsWith('//')) return `https:${rawUrl}`;
  if (rawUrl.startsWith('/')) return `https://www.tikwm.com${rawUrl}`;
  return `https://www.tikwm.com/${rawUrl}`;
}

async function fetchTikTokTrending(): Promise<TrendingMediaItem[]> {
  try {
    const res = await fetch('https://www.tikwm.com/api/feed/list?region=ID&count=6', {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        Referer: 'https://www.tikwm.com/',
      },
      signal: AbortSignal.timeout(2800),
    });
    if (!res.ok) return [];
    const json = (await res.json()) as {
      code?: number;
      data?: Array<{
        video_id?: string;
        id?: string;
        title?: string;
        cover?: string;
        origin_cover?: string;
        duration?: number;
        digg_count?: number;
        play_count?: number;
        author?: {
          unique_id?: string;
          nickname?: string;
        };
      }>;
    };
    if (json.code !== 0 || !Array.isArray(json.data)) return [];

    return json.data
      .filter((item) => Boolean(item.video_id || item.id))
      .slice(0, 6)
      .map((item) => {
        const videoId = String(item.video_id || item.id);
        const uniqueId = item.author?.unique_id || 'tiktok';
        return {
          id: `tt_${videoId}`,
          platform: 'tiktok' as const,
          title: (item.title || 'Video Viral TikTok Hari Ini').trim(),
          author: item.author?.nickname || `@${uniqueId}`,
          url: `https://www.tiktok.com/@${uniqueId}/video/${videoId}`,
          thumbnail: normalizeTikWmAsset(item.cover || item.origin_cover),
          views: Number(item.play_count) || 0,
          likes: Number(item.digg_count) || 0,
          duration: Number(item.duration) || undefined,
          category: 'Short & Tren' as const,
        };
      });
  } catch {
    return [];
  }
}

async function fetchYouTubePlaylistFeed(
  playlistId: string,
  category: TrendingCategory,
  limit: number
): Promise<TrendingMediaItem[]> {
  try {
    const res = await fetch(
      `https://www.youtube.com/feeds/videos.xml?playlist_id=${encodeURIComponent(playlistId)}`,
      {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        },
        signal: AbortSignal.timeout(4500),
      }
    );
    if (!res.ok) return [];
    const xml = await res.text();
    const entries = xml.match(/<entry>[\s\S]*?<\/entry>/g) || [];
    const items: TrendingMediaItem[] = [];

    for (const entry of entries) {
      if (items.length >= limit) break;
      const videoId = entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/)?.[1]?.trim();
      const rawTitle = entry.match(/<title>([^<]*)<\/title>/)?.[1] || '';
      const rawAuthor = entry.match(/<author>\s*<name>([^<]*)<\/name>/)?.[1] || '';
      const thumb =
        entry.match(/<media:thumbnail[^>]+url="([^"]+)"/)?.[1] ||
        (videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : '');
      const viewsRaw = entry.match(/<media:statistics[^>]+views="(\d+)"/)?.[1];
      const likesRaw = entry.match(/<media:starRating[^>]+count="(\d+)"/)?.[1];

      if (!videoId || !rawTitle) continue;

      items.push({
        id: `yt_${videoId}`,
        platform: 'youtube',
        title: decodeXmlEntities(rawTitle),
        author: decodeXmlEntities(rawAuthor) || 'Kreator YouTube',
        url: `https://www.youtube.com/watch?v=${videoId}`,
        thumbnail: thumb,
        views: Number(viewsRaw) || 0,
        likes: Number(likesRaw) || 0,
        category,
      });
    }

    return items;
  } catch {
    return [];
  }
}

function interleaveTrendingItems(groups: TrendingMediaItem[][]): TrendingMediaItem[] {
  const seen = new Set<string>();
  const combined: TrendingMediaItem[] = [];
  const maxLen = Math.max(0, ...groups.map((g) => g.length));

  for (let i = 0; i < maxLen; i++) {
    for (const group of groups) {
      const item = group[i];
      if (!item || seen.has(item.id)) continue;
      seen.add(item.id);
      combined.push(item);
    }
  }
  return combined.slice(0, 12);
}

export async function fetchTrendingMedia(
  forceRefresh = false
): Promise<TrendingMediaResponse> {
  if (!forceRefresh && cachedResult && cachedResult.expiresAt > Date.now()) {
    return {
      ...cachedResult.data,
      cached: true,
    };
  }

  const [tikTokItems, popularYtItems, musicYtItems] = await Promise.all([
    fetchTikTokTrending(),
    fetchYouTubePlaylistFeed('PLrEnWoR732-BHrPp_Pm8_VleD68f9s14-', 'Populer', 6),
    fetchYouTubePlaylistFeed('PL4fGSI1pDJn6puJdseH2Rt9sMvt9E2M4i', 'Musik Viral', 6),
  ]);

  const items = interleaveTrendingItems([tikTokItems, popularYtItems, musicYtItems]);

  if (items.length === 0) {
    if (cachedResult) {
      return {
        ...cachedResult.data,
        cached: true,
      };
    }
    throw new Error('Gagal mengambil daftar media viral dari API saat ini.');
  }

  const response: TrendingMediaResponse = {
    items,
    updatedAt: new Date().toISOString(),
    cached: false,
  };

  cachedResult = {
    data: response,
    expiresAt: Date.now() + CACHE_TTL_MS,
  };

  return response;
}
