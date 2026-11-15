import { createDecipheriv } from 'crypto';

export type SocialPlatform =
  | 'tiktok'
  | 'instagram'
  | 'facebook'
  | 'youtube'
  | 'twitter'
  | 'pinterest'
  | 'threads'
  | 'capcut';

export interface ExtractedMediaResult {
  platform: SocialPlatform;
  id: string;
  title: string;
  cover: string;
  play: string;
  hdplay: string;
  music: string;
  sdLabel?: string;
  hdLabel?: string;
  image?: string;
  mediaItems?: Array<{
    type: 'video' | 'image';
    url: string;
    thumbnail?: string;
  }>;
  duration: number;
  size: number;
  hdSize: number;
  stats: {
    likes?: number;
    comments?: number;
    shares?: number;
    views?: number;
  };
  author: {
    nickname: string;
    uniqueId: string;
    avatar: string;
  };
}

const BTCH_HEADERS = {
  'Content-Type': 'application/json',
  'User-Agent': 'btch/6.4.0',
  'X-Client-Version': '6.4.0',
};

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

export function normalizeUserLink(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return '';
  if (!/^https?:\/\//i.test(trimmed)) {
    return `https://${trimmed}`;
  }
  return trimmed;
}

export function detectPlatform(url: string): SocialPlatform | null {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null;
    const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
    if (host === 'tiktok.com' || host.endsWith('.tiktok.com') || host === 'tikwm.com') {
      return 'tiktok';
    }
    if (host === 'instagram.com' || host.endsWith('.instagram.com') || host === 'instagr.am') {
      return 'instagram';
    }
    if (
      host === 'facebook.com' ||
      host.endsWith('.facebook.com') ||
      host === 'fb.watch' ||
      host === 'fb.com'
    ) {
      return 'facebook';
    }
    if (host === 'youtube.com' || host.endsWith('.youtube.com') || host === 'youtu.be') {
      return 'youtube';
    }
    if (
      host === 'x.com' ||
      host.endsWith('.x.com') ||
      host === 'twitter.com' ||
      host.endsWith('.twitter.com')
    ) {
      return 'twitter';
    }
    if (
      host === 'pinterest.com' ||
      host.endsWith('.pinterest.com') ||
      host === 'pin.it' ||
      host === 'id.pinterest.com'
    ) {
      return 'pinterest';
    }
    if (
      host === 'threads.net' ||
      host.endsWith('.threads.net') ||
      host === 'threads.com' ||
      host.endsWith('.threads.com')
    ) {
      return 'threads';
    }
    if (
      host === 'capcut.com' ||
      host.endsWith('.capcut.com') ||
      host === 'capcut.net' ||
      host.endsWith('.capcut.net')
    ) {
      return 'capcut';
    }
    return null;
  } catch {
    return null;
  }
}

export function isAllowedMediaDownloadUrl(input: string): boolean {
  try {
    const parsed = new URL(input);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return false;
    }
    const host = parsed.hostname.toLowerCase();
    return (
      host.endsWith('tikwm.com') ||
      host.endsWith('tiktokcdn.com') ||
      host.endsWith('tiktokcdn-us.com') ||
      host.endsWith('tiktokv.com') ||
      host.endsWith('tiktok.com') ||
      host.endsWith('byteoversea.com') ||
      host.endsWith('muscdn.com') ||
      host.endsWith('ibytedtos.com') ||
      host.endsWith('ttwstatic.com') ||
      host.endsWith('akamaized.net') ||
      host.endsWith('rapidcdn.app') ||
      host.endsWith('savetube.vip') ||
      host.endsWith('cdninstagram.com') ||
      host.endsWith('fbcdn.net') ||
      host.endsWith('twimg.com') ||
      host.endsWith('pinimg.com') ||
      host.endsWith('googlevideo.com') ||
      host.endsWith('ytimg.com') ||
      host.endsWith('ggpht.com') ||
      host.endsWith('tikcdn.io') ||
      host.endsWith('capcut.com') ||
      host.endsWith('capcutcdn.com') ||
      host.endsWith('byteintl.com') ||
      host.endsWith('threads.net') ||
      host.endsWith('threads.com') ||
      host.includes('tiktokcdn') ||
      host.endsWith('tioo.eu.org')
    );
  } catch {
    return false;
  }
}

function normalizeTikWmUrl(rawUrl: string | undefined | null): string {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) return rawUrl;
  if (rawUrl.startsWith('//')) return `https:${rawUrl}`;
  if (rawUrl.startsWith('/')) return `https://www.tikwm.com${rawUrl}`;
  return `https://www.tikwm.com/${rawUrl}`;
}

function unescapeJsonString(raw: string): string {
  try {
    return JSON.parse(`"${raw}"`) as string;
  } catch {
    return raw.replace(/\\\//g, '/').replace(/\\u0026/g, '&');
  }
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&#x([0-9a-fA-F]+);/g, (_m, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_m, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

async function extractTikTok(url: string): Promise<ExtractedMediaResult> {
  const apiUrl = `https://tikwm.com/api/?url=${encodeURIComponent(url)}&hd=1`;
  const upstream = await fetch(apiUrl, {
    signal: AbortSignal.timeout(15000),
    headers: { Accept: 'application/json', 'User-Agent': BROWSER_UA },
  });

  if (!upstream.ok) {
    throw new Error('Layanan TikTok sedang sibuk. Silakan coba lagi.');
  }

  const payload = (await upstream.json()) as {
    code?: number;
    msg?: string;
    data?: {
      id?: string;
      title?: string;
      cover?: string;
      origin_cover?: string;
      play?: string;
      hdplay?: string;
      music?: string;
      duration?: number;
      size?: number;
      hd_size?: number;
      digg_count?: number;
      comment_count?: number;
      share_count?: number;
      play_count?: number;
      music_info?: { play?: string };
      author?: { unique_id?: string; nickname?: string; avatar?: string };
    };
  };

  if (payload.code !== 0 || !payload.data) {
    throw new Error(
      payload.msg || 'Video TikTok tidak ditemukan atau bersifat privat.'
    );
  }

  const d = payload.data;
  const playUrl = normalizeTikWmUrl(d.play);
  const hdPlayUrl = normalizeTikWmUrl(d.hdplay) || playUrl;
  const musicUrl = normalizeTikWmUrl(d.music || d.music_info?.play);

  return {
    platform: 'tiktok',
    id: d.id || String(Date.now()),
    title: d.title || 'Video TikTok',
    cover: normalizeTikWmUrl(d.cover || d.origin_cover),
    play: playUrl,
    hdplay: hdPlayUrl,
    music: musicUrl,
    sdLabel: 'Standar',
    hdLabel: d.hdplay ? '1080p Full HD' : 'Kualitas Asli HD',
    duration: d.duration || 0,
    size: d.size || 0,
    hdSize: d.hd_size || 0,
    stats: {
      likes: d.digg_count ?? 0,
      comments: d.comment_count ?? 0,
      shares: d.share_count ?? 0,
      views: d.play_count ?? 0,
    },
    author: {
      nickname: d.author?.nickname || 'Kreator TikTok',
      uniqueId: d.author?.unique_id || 'tiktok',
      avatar: normalizeTikWmUrl(d.author?.avatar),
    },
  };
}

async function extractInstagram(url: string): Promise<ExtractedMediaResult> {
  const endpoint = `https://backend1.tioo.eu.org/igdl?url=${encodeURIComponent(url)}`;
  let res: globalThis.Response;
  try {
    res = await fetch(endpoint, {
      headers: BTCH_HEADERS,
      signal: AbortSignal.timeout(25000),
    });
  } catch (err) {
    if (err instanceof Error && (err.name === 'TimeoutError' || err.name === 'AbortError')) {
      throw new Error(
        'Server Instagram sedang sibuk atau lambat merespons. Silakan klik Unduh sekali lagi.'
      );
    }
    throw err;
  }

  if (!res.ok) {
    throw new Error('Gagal mengambil media Instagram. Pastikan akun tidak privat.');
  }

  const raw = await res.json();
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new Error(
      'Media Instagram tidak ditemukan. Pastikan tautan Reels/Postingan bersifat publik.'
    );
  }

  const items = raw
    .filter((item) => item && typeof item.url === 'string' && item.url)
    .map((item) => {
      const mediaUrl = String(item.url);
      const isImage =
        mediaUrl.includes('.jpg') ||
        mediaUrl.includes('.jpeg') ||
        mediaUrl.includes('.webp') ||
        mediaUrl.includes('stype=image');
      return {
        type: (isImage ? 'image' : 'video') as 'video' | 'image',
        url: mediaUrl,
        thumbnail: typeof item.thumbnail === 'string' ? item.thumbnail : '',
      };
    });

  if (items.length === 0) {
    throw new Error('Tautan unduhan Instagram tidak tersedia.');
  }

  const firstVideo = items.find((i) => i.type === 'video');
  const firstImage = items.find((i) => i.type === 'image');
  const first = items[0];

  const shortcodeMatch = url.match(/instagram\.com\/(?:p|reel|reels|tv)\/([^/?#]+)/i);
  const igId = shortcodeMatch?.[1] || String(Date.now());

  return {
    platform: 'instagram',
    id: igId,
    title: 'Postingan / Reels Instagram',
    cover: first.thumbnail || firstImage?.url || '',
    play: firstVideo?.url || '',
    hdplay: firstVideo?.url || '',
    music: '',
    sdLabel: 'Standar',
    hdLabel: 'Kualitas Asli HD',
    image: firstImage?.url || '',
    mediaItems: items,
    duration: 0,
    size: 0,
    hdSize: 0,
    stats: {},
    author: {
      nickname: 'Kreator Instagram',
      uniqueId: 'instagram',
      avatar: '',
    },
  };
}

async function extractFacebook(url: string): Promise<ExtractedMediaResult> {
  // Primary: direct Facebook HTML extraction (extracts true native HD and SD streams)
  try {
    const htmlRes = await fetch(url, {
      headers: {
        'User-Agent': BROWSER_UA,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Sec-Fetch-Mode': 'navigate',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(12000),
    });

    if (htmlRes.ok) {
      const html = await htmlRes.text();
      const hdMatch =
        html.match(/"browser_native_hd_url":"([^"]+)"/) ||
        html.match(/"playable_url_quality_hd":"([^"]+)"/);
      const sdMatch =
        html.match(/"browser_native_sd_url":"([^"]+)"/) ||
        html.match(/"playable_url":"([^"]+)"/);

      const hdUrl = hdMatch ? unescapeJsonString(hdMatch[1]) : '';
      const sdUrl = sdMatch ? unescapeJsonString(sdMatch[1]) : '';

      if (hdUrl || sdUrl) {
        const titleMatch =
          html.match(/<meta property="og:title" content="([^"]*)"/) ||
          html.match(/<title>([^<]*)<\/title>/);
        const imageMatch = html.match(/<meta property="og:image" content="([^"]*)"/);
        const videoIdMatch = url.match(/(?:v=|videos\/|reel\/)(\d+)/);

        return {
          platform: 'facebook',
          id: videoIdMatch?.[1] || String(Date.now()),
          title: titleMatch ? decodeHtmlEntities(titleMatch[1]) : 'Video Facebook',
          cover: imageMatch ? decodeHtmlEntities(imageMatch[1]) : '',
          play: sdUrl || hdUrl,
          hdplay: hdUrl || sdUrl,
          music: '',
          sdLabel: 'SD',
          hdLabel: hdUrl ? 'HD 720p/1080p' : 'Kualitas Terbaik',
          duration: 0,
          size: 0,
          hdSize: 0,
          stats: {},
          author: {
            nickname: 'Kreator Facebook',
            uniqueId: 'facebook',
            avatar: '',
          },
        };
      }
    }
  } catch {
    // Fallback to btch fbdown below
  }

  const fallbackRes = await fetch(
    `https://backend1.tioo.eu.org/fbdown?url=${encodeURIComponent(url)}`,
    {
      headers: BTCH_HEADERS,
      signal: AbortSignal.timeout(15000),
    }
  );

  if (!fallbackRes.ok) {
    throw new Error('Video Facebook tidak ditemukan atau bersifat privat.');
  }

  const fbData = (await fallbackRes.json()) as {
    status?: boolean;
    Normal_video?: string;
    HD?: string;
  };

  if (!fbData.Normal_video && !fbData.HD) {
    throw new Error('Video Facebook tidak ditemukan atau tautan tidak valid.');
  }

  return {
    platform: 'facebook',
    id: String(Date.now()),
    title: 'Video Facebook',
    cover: '',
    play: fbData.Normal_video || fbData.HD || '',
    hdplay: fbData.HD || fbData.Normal_video || '',
    music: '',
    sdLabel: 'SD',
    hdLabel: fbData.HD ? 'HD 720p/1080p' : 'Kualitas Terbaik',
    duration: 0,
    size: 0,
    hdSize: 0,
    stats: {},
    author: {
      nickname: 'Kreator Facebook',
      uniqueId: 'facebook',
      avatar: '',
    },
  };
}

function getYouTubeId(url: string): string | null {
  const regex =
    /(?:https?:\/\/)?(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

function decodeSaveTubeData(enc: string): {
  title?: string;
  duration?: number;
  thumbnail?: string;
  key: string;
} {
  const secretKey = 'C5D58EF67A7584E4A29F6C35BBC4EB12';
  const data = Buffer.from(enc, 'base64');
  const iv = data.subarray(0, 16);
  const content = data.subarray(16);
  const key = Buffer.from(secretKey, 'hex');
  const decipher = createDecipheriv('aes-128-cbc', key, iv);
  const decrypted = Buffer.concat([decipher.update(content), decipher.final()]);
  return JSON.parse(decrypted.toString('utf8'));
}

async function requestSaveTubeDownload(
  cdn: string,
  key: string,
  downloadType: 'video' | 'audio',
  quality: string
): Promise<string> {
  const res = await fetch(`https://${cdn}/download`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': BROWSER_UA,
      Referer: 'https://save-tube.com/',
    },
    body: JSON.stringify({ downloadType, quality, key }),
    signal: AbortSignal.timeout(14000),
  });
  if (!res.ok) return '';
  const json = (await res.json()) as { data?: { downloadUrl?: string } };
  return json?.data?.downloadUrl || '';
}

async function extractYouTube(url: string): Promise<ExtractedMediaResult> {
  const videoId = getYouTubeId(url);
  if (!videoId) {
    throw new Error('Tautan YouTube tidak valid.');
  }

  const canonicalUrl = `https://www.youtube.com/watch?v=${videoId}`;

  const cdnRes = await fetch('https://media.savetube.vip/api/random-cdn', {
    signal: AbortSignal.timeout(8000),
  });
  if (!cdnRes.ok) {
    throw new Error('Server konversi YouTube sedang sibuk. Coba sesaat lagi.');
  }
  const { cdn } = (await cdnRes.json()) as { cdn: string };

  const infoRes = await fetch(`https://${cdn}/v2/info`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': BROWSER_UA,
      Referer: 'https://save-tube.com/',
    },
    body: JSON.stringify({ url: canonicalUrl }),
    signal: AbortSignal.timeout(12000),
  });

  if (!infoRes.ok) {
    throw new Error('Gagal membaca informasi video YouTube.');
  }

  const infoPayload = (await infoRes.json()) as { data?: string };
  if (!infoPayload.data) {
    throw new Error('Video YouTube tidak tersedia untuk diunduh.');
  }

  const info = decodeSaveTubeData(infoPayload.data);

  // Request true 1080p Full HD, 720p HD fallback, 360p SD, and 320kbps/128kbps MP3
  const [sdUrl, hd1080Url, hd720Url, mp3HighUrl, mp3StdUrl] = await Promise.all([
    requestSaveTubeDownload(cdn, info.key, 'video', '360').catch(() => ''),
    requestSaveTubeDownload(cdn, info.key, 'video', '1080').catch(() => ''),
    requestSaveTubeDownload(cdn, info.key, 'video', '720').catch(() => ''),
    requestSaveTubeDownload(cdn, info.key, 'audio', '320').catch(() => ''),
    requestSaveTubeDownload(cdn, info.key, 'audio', '128').catch(() => ''),
  ]);

  const bestHdUrl = hd1080Url || hd720Url || sdUrl;
  const hdLabel = hd1080Url ? '1080p Full HD' : hd720Url ? '720p HD' : '360p';
  const bestMp3Url = mp3HighUrl || mp3StdUrl;

  if (!sdUrl && !bestHdUrl && !bestMp3Url) {
    throw new Error('Gagal menyiapkan tautan unduhan YouTube.');
  }

  let authorName = 'Channel YouTube';
  try {
    const oembed = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(canonicalUrl)}&format=json`,
      { signal: AbortSignal.timeout(4000) }
    );
    if (oembed.ok) {
      const oj = (await oembed.json()) as { author_name?: string };
      if (oj.author_name) authorName = oj.author_name;
    }
  } catch {
    // ignore oembed failure
  }

  return {
    platform: 'youtube',
    id: videoId,
    title: info.title || 'Video YouTube',
    cover: info.thumbnail || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    play: sdUrl || bestHdUrl,
    hdplay: bestHdUrl,
    music: bestMp3Url,
    sdLabel: '360p',
    hdLabel,
    duration: info.duration || 0,
    size: 0,
    hdSize: 0,
    stats: {},
    author: {
      nickname: authorName,
      uniqueId: 'youtube',
      avatar: '',
    },
  };
}

function parseResolutionFromTwitterUrl(url: string): string {
  const match = url.match(/\/(\d{3,4})x(\d{3,4})\//);
  if (!match) return 'HD';
  const height = Math.max(Number(match[1]), Number(match[2]));
  if (height >= 1920) return '1080p Full HD';
  if (height >= 1280) return '720p HD';
  return `${match[1]}×${match[2]}`;
}

async function extractTwitter(url: string): Promise<ExtractedMediaResult> {
  const match = url.match(/(?:x\.com|twitter\.com)\/([^/]+)\/status\/(\d+)/i);
  if (!match) {
    throw new Error('Tautan X / Twitter tidak valid. Gunakan link postingan status.');
  }

  const [, user, statusId] = match;
  const fxRes = await fetch(`https://api.fxtwitter.com/${user}/status/${statusId}`, {
    signal: AbortSignal.timeout(10000),
  });

  if (!fxRes.ok) {
    throw new Error('Postingan X / Twitter tidak ditemukan atau bersifat privat.');
  }

  const fxData = (await fxRes.json()) as {
    code?: number;
    tweet?: {
      id?: string;
      text?: string;
      likes?: number;
      replies?: number;
      retweets?: number;
      views?: number;
      author?: {
        name?: string;
        screen_name?: string;
        avatar_url?: string;
      };
      media?: {
        videos?: Array<{
          url?: string;
          thumbnail_url?: string;
          duration?: number;
          variants?: Array<{ url?: string; bitrate?: number; content_type?: string }>;
        }>;
        photos?: Array<{ url?: string }>;
      };
    };
  };

  const tweet = fxData.tweet;
  if (!tweet) {
    throw new Error('Postingan X / Twitter tidak ditemukan.');
  }

  const firstVideo = tweet.media?.videos?.[0];
  const firstPhoto = tweet.media?.photos?.[0];

  let hdUrl = firstVideo?.url || '';
  let sdUrl = firstVideo?.url || '';

  if (firstVideo?.variants && firstVideo.variants.length > 0) {
    const mp4s = firstVideo.variants
      .filter((v) => v.url && v.content_type === 'video/mp4')
      .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));
    if (mp4s.length > 0) {
      hdUrl = mp4s[0].url || hdUrl;
      sdUrl = mp4s[mp4s.length - 1].url || sdUrl;
    }
  }

  if (!hdUrl && !firstPhoto?.url) {
    throw new Error('Postingan X / Twitter ini tidak berisi video atau gambar.');
  }

  return {
    platform: 'twitter',
    id: tweet.id || statusId,
    title: tweet.text || 'Postingan X / Twitter',
    cover: firstVideo?.thumbnail_url || firstPhoto?.url || '',
    play: sdUrl,
    hdplay: hdUrl,
    music: '',
    sdLabel: 'SD',
    hdLabel: hdUrl ? parseResolutionFromTwitterUrl(hdUrl) : 'HD',
    image: !hdUrl ? firstPhoto?.url || '' : '',
    duration: Math.round(firstVideo?.duration || 0),
    size: 0,
    hdSize: 0,
    stats: {
      likes: tweet.likes ?? 0,
      comments: tweet.replies ?? 0,
      shares: tweet.retweets ?? 0,
      views: tweet.views ?? 0,
    },
    author: {
      nickname: tweet.author?.name || user,
      uniqueId: tweet.author?.screen_name || user,
      avatar: tweet.author?.avatar_url || '',
    },
  };
}

async function extractPinterest(url: string): Promise<ExtractedMediaResult> {
  const res = await fetch(
    `https://backend1.tioo.eu.org/pinterest?url=${encodeURIComponent(url)}`,
    {
      headers: BTCH_HEADERS,
      signal: AbortSignal.timeout(15000),
    }
  );

  if (res.ok) {
    const json = (await res.json()) as {
      success?: boolean;
      result?: {
        id?: string;
        title?: string;
        description?: string;
        image?: string;
        video_url?: string;
        videos?: {
          V_1080P?: { url?: string };
          V_720P?: { url?: string };
          V_HLSV4?: { url?: string };
        };
      };
    };

    if (json.success && json.result) {
      const r = json.result;
      const hdVideoUrl =
        r.videos?.V_1080P?.url || r.videos?.V_720P?.url || r.video_url || '';
      const sdVideoUrl = r.video_url || r.videos?.V_720P?.url || hdVideoUrl;
      const imageUrl = r.image || '';

      if (hdVideoUrl || imageUrl) {
        return {
          platform: 'pinterest',
          id: r.id || String(Date.now()),
          title: r.title || r.description || 'Pin Pinterest',
          cover: imageUrl,
          play: sdVideoUrl,
          hdplay: hdVideoUrl,
          music: '',
          sdLabel: 'Standar',
          hdLabel: r.videos?.V_1080P?.url ? '1080p Full HD' : '720p HD',
          image: imageUrl,
          duration: 0,
          size: 0,
          hdSize: 0,
          stats: {},
          author: {
            nickname: 'Pinterest',
            uniqueId: 'pinterest',
            avatar: '',
          },
        };
      }
    }
  }

  throw new Error('Media Pinterest tidak ditemukan. Pastikan tautan pin valid.');
}

async function extractThreads(url: string): Promise<ExtractedMediaResult> {
  const canonicalUrl = url.replace('threads.com', 'threads.net');

  for (const endpoint of ['threads', 'igdl']) {
    try {
      const apiRes = await fetch(
        `https://backend1.tioo.eu.org/${endpoint}?url=${encodeURIComponent(canonicalUrl)}`,
        {
          headers: BTCH_HEADERS,
          signal: AbortSignal.timeout(20000),
        }
      );
      if (apiRes.ok) {
        const json = (await apiRes.json()) as {
          status?: number | boolean;
          result?: Array<{ url?: string; thumbnail?: string; wm?: string }> | {
            video?: string[];
            image?: string[];
            video_urls?: Array<{ download_url?: string }>;
            image_urls?: string[];
          };
          video?: string[];
          image?: string[];
        };

        const videos: string[] = [];
        const images: string[] = [];
        let thumb = '';

        if (Array.isArray(json.result)) {
          for (const item of json.result) {
            if (!item?.url) continue;
            if (!thumb && item.thumbnail) thumb = item.thumbnail;
            if (/\.mp4|video/i.test(item.url) || !/\.(jpe?g|png|webp)(\?|$)/i.test(item.url)) {
              videos.push(item.url);
            } else {
              images.push(item.url);
            }
          }
        } else if (json.result && typeof json.result === 'object') {
          if (Array.isArray(json.result.video)) videos.push(...json.result.video);
          if (Array.isArray(json.result.image)) images.push(...json.result.image);
          if (Array.isArray(json.result.video_urls)) {
            for (const v of json.result.video_urls) {
              if (v?.download_url) videos.push(v.download_url);
            }
          }
          if (Array.isArray(json.result.image_urls)) images.push(...json.result.image_urls);
        }

        if (Array.isArray(json.video)) videos.push(...json.video);
        if (Array.isArray(json.image)) images.push(...json.image);

        if (videos.length > 0 || images.length > 0) {
          const mediaItems = [
            ...videos.map((v) => ({ type: 'video' as const, url: v, thumbnail: thumb || images[0] })),
            ...images.map((img) => ({ type: 'image' as const, url: img, thumbnail: img })),
          ];
          return {
            platform: 'threads',
            id: String(Date.now()),
            title: 'Postingan Threads',
            cover: thumb || images[0] || '',
            play: videos[0] || '',
            hdplay: videos[0] || '',
            music: '',
            sdLabel: 'Standar',
            hdLabel: videos[0] ? 'HD' : undefined,
            image: videos.length === 0 ? images[0] : undefined,
            mediaItems: mediaItems.length > 1 ? mediaItems : undefined,
            duration: 0,
            size: 0,
            hdSize: 0,
            stats: {},
            author: {
              nickname: 'Kreator Threads',
              uniqueId: 'threads',
              avatar: '',
            },
          };
        }
      }
    } catch {
      // try next fallback
    }
  }

  // Direct HTML fallback
  try {
    const htmlRes = await fetch(canonicalUrl, {
      headers: {
        'User-Agent': BROWSER_UA,
        Accept: 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(12000),
    });
    if (htmlRes.ok) {
      const html = await htmlRes.text();
      const videoMatches = html.match(/https:\/\/[^"\\]+\.mp4[^"\\]*/gi) || [];
      const cleanVideos = videoMatches.map((u) => unescapeJsonString(u));
      const ogImgMatch = html.match(/property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
      const cover = ogImgMatch ? decodeHtmlEntities(ogImgMatch[1]) : '';

      if (cleanVideos.length > 0) {
        return {
          platform: 'threads',
          id: String(Date.now()),
          title: 'Video Threads',
          cover,
          play: cleanVideos[0],
          hdplay: cleanVideos[0],
          music: '',
          sdLabel: 'Standar',
          hdLabel: 'HD',
          duration: 0,
          size: 0,
          hdSize: 0,
          stats: {},
          author: {
            nickname: 'Kreator Threads',
            uniqueId: 'threads',
            avatar: '',
          },
        };
      }
    }
  } catch {
    // ignore HTML fallback error
  }

  throw new Error(
    'Media Threads tidak ditemukan. Pastikan postingan bersifat publik dan berisi video atau foto.'
  );
}

async function extractCapCut(url: string): Promise<ExtractedMediaResult> {
  let resolvedUrl = url;
  try {
    const headRes = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      headers: { 'User-Agent': BROWSER_UA },
      signal: AbortSignal.timeout(10000),
    });
    if (headRes.url) resolvedUrl = headRes.url;

    const html = await headRes.text();
    for (const endpoint of ['capcut', 'aio']) {
      try {
        const apiRes = await fetch(
          `https://backend1.tioo.eu.org/${endpoint}?url=${encodeURIComponent(resolvedUrl)}`,
          {
            headers: BTCH_HEADERS,
            signal: AbortSignal.timeout(15000),
          }
        );
        if (apiRes.ok) {
          const json = (await apiRes.json()) as {
            status?: boolean | number;
            title?: string;
            video?: string;
            url?: string;
            cover?: string;
            thumbnail?: string;
            result?: {
              title?: string;
              video?: string;
              url?: string;
              cover?: string;
              thumbnail?: string;
              author?: string;
            };
          };

          const videoUrl = json.result?.video || json.result?.url || json.video || json.url || '';
          const coverUrl =
            json.result?.cover || json.result?.thumbnail || json.cover || json.thumbnail || '';
          const title = json.result?.title || json.title || 'Template CapCut';

          if (videoUrl) {
            return {
              platform: 'capcut',
              id: String(Date.now()),
              title: decodeHtmlEntities(title),
              cover: coverUrl,
              play: videoUrl,
              hdplay: videoUrl,
              music: '',
              sdLabel: 'Standar',
              hdLabel: 'HD',
              duration: 0,
              size: 0,
              hdSize: 0,
              stats: {},
              author: {
                nickname: json.result?.author || 'Kreator CapCut',
                uniqueId: 'capcut',
                avatar: '',
              },
            };
          }
        }
      } catch {
        // continue to HTML extraction
      }
    }

    const videoJsonMatch =
      html.match(/"video_url"\s*:\s*"([^"]+\.mp4[^"]*)"/i) ||
      html.match(/"play_url"\s*:\s*"([^"]+)"/i) ||
      html.match(/property=["']og:video(?::url)?["'][^>]+content=["']([^"']+)["']/i);
    const rawVideo = videoJsonMatch ? unescapeJsonString(videoJsonMatch[1]) : '';
    const coverMatch =
      html.match(/"cover_url"\s*:\s*"([^"]+)"/i) ||
      html.match(/property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
    const titleMatch =
      html.match(/"short_title"\s*:\s*"([^"]+)"/i) ||
      html.match(/property=["']og:title["'][^>]+content=["']([^"']+)["']/i);

    if (rawVideo && !rawVideo.includes('cc_landing/video_en')) {
      return {
        platform: 'capcut',
        id: String(Date.now()),
        title: titleMatch ? decodeHtmlEntities(unescapeJsonString(titleMatch[1])) : 'Template CapCut',
        cover: coverMatch ? unescapeJsonString(coverMatch[1]) : '',
        play: rawVideo,
        hdplay: rawVideo,
        music: '',
        sdLabel: 'Standar',
        hdLabel: 'HD',
        duration: 0,
        size: 0,
        hdSize: 0,
        stats: {},
        author: {
          nickname: 'Kreator CapCut',
          uniqueId: 'capcut',
          avatar: '',
        },
      };
    }
  } catch {
    // ignore and throw friendly Indonesian error
  }

  throw new Error(
    'Video CapCut tidak ditemukan. Pastikan tautan template/video CapCut valid dan bersifat publik.'
  );
}

export async function extractMediaFromUrl(rawUrl: string): Promise<ExtractedMediaResult> {
  const normalizedUrl = normalizeUserLink(rawUrl);
  if (!normalizedUrl) {
    throw new Error('Masukkan tautan media terlebih dahulu.');
  }

  const platform = detectPlatform(normalizedUrl);
  if (!platform) {
    throw new Error(
      'Platform belum didukung atau tautan tidak valid. Gunakan tautan TikTok, Instagram, Facebook, YouTube, X/Twitter, Pinterest, Threads, atau CapCut.'
    );
  }

  switch (platform) {
    case 'tiktok':
      return extractTikTok(normalizedUrl);
    case 'instagram':
      return extractInstagram(normalizedUrl);
    case 'facebook':
      return extractFacebook(normalizedUrl);
    case 'youtube':
      return extractYouTube(normalizedUrl);
    case 'twitter':
      return extractTwitter(normalizedUrl);
    case 'pinterest':
      return extractPinterest(normalizedUrl);
    case 'threads':
      return extractThreads(normalizedUrl);
    case 'capcut':
      return extractCapCut(normalizedUrl);
  }
}
