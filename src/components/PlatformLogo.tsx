import { Globe } from 'lucide-react';
import type { PlatformTab, SocialPlatform } from '../types/media';

export interface PlatformMeta {
  id: PlatformTab;
  name: string;
  shortName: string;
  headline: string;
  subtitle: string;
  placeholder: string;
  brandBg: string;
}

export const PLATFORM_LIST: PlatformMeta[] = [
  {
    id: 'all',
    name: 'Semua Media',
    shortName: 'Semua',
    headline: 'Downloader Semua Sosial Media',
    subtitle:
      'Simpan video HD tanpa watermark & MP3 dari TikTok, IG, FB, YT, X, Pinterest, Threads & CapCut.',
    placeholder: 'Tempel tautan video atau media di sini...',
    brandBg: 'bg-blue-600 text-white',
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    shortName: 'TikTok',
    headline: 'Unduh Video TikTok Tanpa Watermark',
    subtitle:
      'Simpan MP4 standar, HD tanpa tanda air, serta audio MP3 secara cepat dan gratis.',
    placeholder: 'Tempel tautan TikTok (https://www.tiktok.com/@user/video/...)',
    brandBg: 'bg-slate-900 text-white dark:bg-slate-800',
  },
  {
    id: 'instagram',
    name: 'Instagram',
    shortName: 'Instagram',
    headline: 'Unduh Reels, Video & Foto Instagram',
    subtitle:
      'Simpan Instagram Reels, video, dan carousel kualitas asli langsung dari browser.',
    placeholder: 'Tempel tautan Instagram (https://www.instagram.com/reel/...)',
    brandBg: 'bg-gradient-to-tr from-amber-500 via-pink-600 to-purple-600 text-white',
  },
  {
    id: 'facebook',
    name: 'Facebook',
    shortName: 'Facebook',
    headline: 'Unduh Video & Reels Facebook HD',
    subtitle:
      'Simpan video Facebook Watch, Reels, dan postingan publik dalam format MP4 SD & HD.',
    placeholder: 'Tempel tautan Facebook (https://www.facebook.com/watch/?v=...)',
    brandBg: 'bg-[#1877F2] text-white',
  },
  {
    id: 'youtube',
    name: 'YouTube',
    shortName: 'YouTube',
    headline: 'Unduh Video YouTube HD & MP3',
    subtitle:
      'Ambil video YouTube & Shorts hingga 1080p Full HD atau ekstrak audio MP3.',
    placeholder: 'Tempel tautan YouTube (https://www.youtube.com/watch?v=...)',
    brandBg: 'bg-[#FF0000] text-white',
  },
  {
    id: 'twitter',
    name: 'X / Twitter',
    shortName: 'X / Twitter',
    headline: 'Unduh Video & GIF X (Twitter)',
    subtitle:
      'Simpan video dan GIF postingan X / Twitter ke format MP4 resolusi tertinggi.',
    placeholder: 'Tempel tautan X / Twitter (https://x.com/user/status/...)',
    brandBg: 'bg-slate-950 text-white dark:bg-slate-800',
  },
  {
    id: 'pinterest',
    name: 'Pinterest',
    shortName: 'Pinterest',
    headline: 'Unduh Video & Gambar Pinterest',
    subtitle:
      'Simpan video Pin maupun gambar resolusi penuh dari tautan Pinterest atau pin.it.',
    placeholder: 'Tempel tautan Pinterest (https://www.pinterest.com/pin/...)',
    brandBg: 'bg-[#E60023] text-white',
  },
  {
    id: 'threads',
    name: 'Threads',
    shortName: 'Threads',
    headline: 'Unduh Video & Foto Threads',
    subtitle:
      'Simpan video dan foto postingan Threads dalam kualitas tinggi tanpa aplikasi tambahan.',
    placeholder: 'Tempel tautan Threads (https://www.threads.net/@user/post/...)',
    brandBg: 'bg-neutral-900 text-white dark:bg-neutral-800',
  },
  {
    id: 'capcut',
    name: 'CapCut',
    shortName: 'CapCut',
    headline: 'Unduh Video CapCut Tanpa Watermark',
    subtitle:
      'Simpan pratinjau template atau video CapCut ke MP4 jernih secara cepat dan gratis.',
    placeholder: 'Tempel tautan CapCut (https://www.capcut.com/t/...)',
    brandBg: 'bg-zinc-900 text-white dark:bg-zinc-800',
  },
];

const TRACKING_PARAMS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'igsh',
  'igshid',
  'is_from_webapp',
  'sender_device',
  'sender_web_id',
  '_r',
  '_t',
  'fbclid',
  'si',
  'feature',
  's',
  't',
  'ref',
  'ref_src',
];

export function cleanSocialUrlForShare(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  if (!trimmed) return '';
  try {
    const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const parsed = new URL(candidate);
    for (const key of TRACKING_PARAMS) {
      parsed.searchParams.delete(key);
    }
    return parsed.toString();
  } catch {
    return trimmed;
  }
}

export function getPlatformMeta(id: PlatformTab): PlatformMeta {
  return PLATFORM_LIST.find((p) => p.id === id) || PLATFORM_LIST[0];
}

export function detectPlatformFromUrl(input: string): SocialPlatform | null {
  const raw = input.trim().toLowerCase();
  if (!raw) return null;

  const candidate = /^https?:\/\//.test(raw) ? raw : `https://${raw}`;
  try {
    const host = new URL(candidate).hostname.replace(/^www\./, '');
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
    if (
      host === 'youtube.com' ||
      host.endsWith('.youtube.com') ||
      host === 'youtu.be'
    ) {
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
  } catch {
    return null;
  }
  return null;
}

interface PlatformLogoProps {
  platform: PlatformTab;
  className?: string;
}

export function PlatformLogo({ platform, className = 'h-5 w-5' }: PlatformLogoProps) {
  switch (platform) {
    case 'tiktok':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
          <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 0 0-.79-.05A6.34 6.34 0 0 0 3.15 15a6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.87a8.28 8.28 0 0 0 4.76 1.5V6.92a4.85 4.85 0 0 1-1-.23z" />
        </svg>
      );
    case 'instagram':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
          <path d="M7.75 2h8.5A5.75 5.75 0 0 1 22 7.75v8.5A5.75 5.75 0 0 1 16.25 22h-8.5A5.75 5.75 0 0 1 2 16.25v-8.5A5.75 5.75 0 0 1 7.75 2zm0 2A3.75 3.75 0 0 0 4 7.75v8.5A3.75 3.75 0 0 0 7.75 20h8.5A3.75 3.75 0 0 0 20 16.25v-8.5A3.75 3.75 0 0 0 16.25 4h-8.5zm9.5 1.5a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5zM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" />
        </svg>
      );
    case 'facebook':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
          <path d="M13.5 22v-8h2.7l.4-3h-3.1V9.1c0-.87.24-1.46 1.5-1.46h1.6V4.94A21.3 21.3 0 0 0 14.27 4.8c-2.3 0-3.87 1.4-3.87 3.97V11H7.7v3h2.7v8h3.1z" />
        </svg>
      );
    case 'youtube':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
        </svg>
      );
    case 'twitter':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      );
    case 'pinterest':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
          <path d="M12 2C6.477 2 2 6.477 2 12c0 4.237 2.636 7.855 6.356 9.312-.088-.791-.167-2.005.035-2.868.181-.78 1.172-4.97 1.172-4.97s-.299-.6-.299-1.486c0-1.39.806-2.428 1.81-2.428.852 0 1.264.64 1.264 1.408 0 .858-.546 2.14-.828 3.33-.236.995.5 1.807 1.48 1.807 1.778 0 3.144-1.874 3.144-4.58 0-2.393-1.72-4.068-4.176-4.068-2.845 0-4.516 2.135-4.516 4.34 0 .859.331 1.781.745 2.281a.3.3 0 0 1 .069.288l-.278 1.133c-.044.183-.145.223-.335.134-1.249-.581-2.03-2.407-2.03-3.874 0-3.154 2.292-6.052 6.608-6.052 3.469 0 6.165 2.473 6.165 5.776 0 3.447-2.173 6.22-5.19 6.22-1.013 0-1.965-.525-2.291-1.148l-.623 2.378c-.226.869-.835 1.958-1.244 2.621.937.29 1.931.446 2.962.446 5.523 0 10-4.477 10-10S17.523 2 12 2z" />
        </svg>
      );
    case 'threads':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
          <path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.589 12c.027 3.086.718 5.496 2.057 7.164 1.43 1.783 3.631 2.698 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.31-.71-.873-1.3-1.634-1.75-.192 1.352-.622 2.446-1.284 3.272-.886 1.102-2.14 1.704-3.73 1.79-1.202.065-2.361-.218-3.259-.801-1.063-.689-1.685-1.74-1.752-2.964-.065-1.19.408-2.285 1.33-3.082.88-.76 2.119-1.207 3.583-1.291a13.853 13.853 0 0 1 3.02.142c-.126-.742-.375-1.332-.75-1.757-.513-.586-1.308-.883-2.359-.89h-.029c-.844 0-1.992.232-2.721 1.32l-1.757-1.182C9.826 7.018 11.464 6.26 13.412 6.26h.044c3.13.02 4.988 1.98 5.146 5.418.49.242.936.533 1.334.872 1.148.977 1.874 2.291 2.043 3.702.257 2.135-.388 4.462-1.923 6.004-1.851 1.859-4.294 2.73-7.87 2.744zm-1.106-6.25c1.094-.06 2.41-.49 2.642-2.616a10.427 10.427 0 0 0-2.063-.156c-1.454.084-2.463.61-2.416 1.484.045.829.886 1.341 1.837 1.288z" />
        </svg>
      );
    case 'capcut':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
          <path d="M18.9 5.3 15.1 7.5 11.3 5.3A2 2 0 0 0 8.5 7v2.4L4.7 7.2a1 1 0 0 0-1.5.87v7.86a1 1 0 0 0 1.5.87l3.8-2.2V17a2 2 0 0 0 2.8 1.7l3.8-2.2 3.8 2.2a1.5 1.5 0 0 0 2.2-1.3V6.6a1.5 1.5 0 0 0-2.2-1.3zM10.5 16.5v-9l5.5 3.18v2.64L10.5 16.5z" />
        </svg>
      );
    default:
      return <Globe className={className} aria-hidden="true" />;
  }
}
