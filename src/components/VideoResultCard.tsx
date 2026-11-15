import { useEffect, useMemo, useState } from 'react';
import JSZip from 'jszip';
import {
  Archive,
  Bug,
  Check,
  Copy,
  Download,
  FileText,
  Film,
  Hash,
  Heart,
  Image as ImageIcon,
  Loader2,
  MessageCircle,
  Music,
  Play,
  QrCode,
  Share2,
  Sparkles,
  User,
  Volume2,
  X,
} from 'lucide-react';
import type { MediaDownloadResult } from '../types/media';
import { getPlatformMeta, PlatformLogo } from './PlatformLogo';
import AdBanner from './AdBanner';

const API_BASE = (
  (typeof window !== 'undefined'
    ? (window as unknown as { __ZONESAVE_API_BASE__?: string }).__ZONESAVE_API_BASE__
    : '') || ''
).replace(/\/$/, '');

interface VideoResultCardProps {
  media: MediaDownloadResult;
  filenameMode: 'default' | 'title';
  onToggleFilenameMode: () => void;
  onDownloadStandard: (overrideUrl?: string) => void;
  onOpenWatchAds: () => void;
  onDownloadMp3: () => void;
  onDownloadImage: (overrideUrl?: string, index?: number) => void;
  onOpenQr?: () => void;
  onReportLink?: () => void;
  onReset: () => void;
}

function formatCompactNumber(num: number): string {
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  }
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  }
  return num.toLocaleString('id-ID');
}

function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return '';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatFileSize(bytes: number): string {
  if (!bytes || bytes <= 0) return '';
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(1)} MB`;
}

function sanitizeZipSegment(text: string, fallback: string): string {
  const cleaned = text
    .replace(/#[\p{L}\p{N}_]+/gu, '')
    .replace(/[^\p{L}\p{N}\s_-]/gu, '')
    .trim()
    .replace(/\s+/g, '_')
    .slice(0, 44);
  return cleaned || fallback;
}

export default function VideoResultCard({
  media,
  filenameMode,
  onToggleFilenameMode,
  onDownloadStandard,
  onOpenWatchAds,
  onDownloadMp3,
  onDownloadImage,
  onOpenQr,
  onReportLink,
  onReset,
}: VideoResultCardProps) {
  const [coverError, setCoverError] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const [copiedCaption, setCopiedCaption] = useState(false);
  const [copiedHashtags, setCopiedHashtags] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [useDirectPreview, setUseDirectPreview] = useState(false);
  const [isAudioPreviewing, setIsAudioPreviewing] = useState(false);
  const [useDirectAudio, setUseDirectAudio] = useState(false);
  const [isZipping, setIsZipping] = useState(false);
  const [zipError, setZipError] = useState<string | null>(null);

  useEffect(() => {
    setCoverError(false);
    setAvatarError(false);
    setCopiedCaption(false);
    setCopiedHashtags(false);
    setIsPreviewing(false);
    setUseDirectPreview(false);
    setIsAudioPreviewing(false);
    setUseDirectAudio(false);
    setIsZipping(false);
    setZipError(null);
  }, [media.id]);

  const platformMeta = getPlatformMeta(media.platform);
  const durationText = formatDuration(media.duration);
  const standardSizeText = formatFileSize(media.size);
  const hdSizeText = formatFileSize(media.hdSize);

  const hasStats =
    (media.stats.likes ?? 0) > 0 ||
    (media.stats.comments ?? 0) > 0 ||
    (media.stats.shares ?? 0) > 0;

  const isTikTok = media.platform === 'tiktok';
  const hasVideo = Boolean(media.play || media.hdplay);
  const hasMultipleItems = (media.mediaItems?.length ?? 0) > 1;

  const hashtags = useMemo(() => {
    if (!media.title) return [];
    const matches = media.title.match(/#[\p{L}\p{N}_]+/gu) || [];
    return Array.from(new Set(matches));
  }, [media.title]);

  const previewUrl = media.play || media.hdplay;
  const previewSrc = useDirectPreview
    ? previewUrl
    : `${API_BASE}/api/download?url=${encodeURIComponent(previewUrl)}&filename=preview&type=mp4&inline=1`;
  const audioSrc = media.music
    ? useDirectAudio
      ? media.music
      : `${API_BASE}/api/download?url=${encodeURIComponent(media.music)}&filename=audio_preview&type=mp3&inline=1`
    : '';

  const handleCopyCaption = async () => {
    if (!media.title) return;
    try {
      await navigator.clipboard.writeText(media.title);
      setCopiedCaption(true);
      window.setTimeout(() => setCopiedCaption(false), 2000);
    } catch {
      setCopiedCaption(false);
    }
  };

  const handleCopyHashtags = async () => {
    if (hashtags.length === 0) return;
    try {
      await navigator.clipboard.writeText(hashtags.join(' '));
      setCopiedHashtags(true);
      window.setTimeout(() => setCopiedHashtags(false), 2000);
    } catch {
      setCopiedHashtags(false);
    }
  };

  const handleDownloadAllZip = async () => {
    if (!media.mediaItems || media.mediaItems.length === 0 || isZipping) return;
    setIsZipping(true);
    setZipError(null);

    try {
      const zip = new JSZip();
      const basePrefix =
        filenameMode === 'title' && media.title
          ? sanitizeZipSegment(media.title, `${media.platform}_${media.id}`)
          : `${media.platform}_${media.author.uniqueId || 'media'}_${media.id}`;

      const results = await Promise.allSettled(
        media.mediaItems.map(async (item, idx) => {
          const ext = item.type === 'video' ? 'mp4' : 'jpg';
          const proxyUrl = `${API_BASE}/api/download?url=${encodeURIComponent(
            item.url
          )}&filename=slide_${idx + 1}&type=${ext}&inline=1`;
          const res = await fetch(proxyUrl);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const buf = await res.arrayBuffer();
          return {
            name: `${basePrefix}_slide_${String(idx + 1).padStart(2, '0')}.${ext}`,
            buf,
          };
        })
      );

      let added = 0;
      for (const r of results) {
        if (r.status === 'fulfilled' && r.value.buf.byteLength > 0) {
          zip.file(r.value.name, r.value.buf);
          added += 1;
        }
      }

      if (added === 0) {
        throw new Error('Gagal mengunduh slide untuk dikemas ke ZIP.');
      }

      const blob = await zip.generateAsync({ type: 'blob' });
      const zipFilename = `zonesaveall_${basePrefix}.zip`;
      const isCapacitorNative = Boolean(
        (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor
          ?.isNativePlatform?.()
      );
      if (isCapacitorNative && typeof navigator.share === 'function') {
        const zipFile = new File([blob], zipFilename, { type: 'application/zip' });
        if (navigator.canShare?.({ files: [zipFile] })) {
          await navigator.share({ files: [zipFile], title: zipFilename });
          return;
        }
      }

      const blobUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = blobUrl;
      anchor.download = zipFilename;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      window.setTimeout(() => URL.revokeObjectURL(blobUrl), 3000);
    } catch {
      setZipError('Sebagian slide gagal dikemas ke ZIP. Unduh satu per satu di bawah.');
    } finally {
      setIsZipping(false);
    }
  };

  return (
    <section
      aria-label="Hasil Media Sosial"
      className="mx-auto max-w-6xl px-4 sm:px-6 pt-6 pb-4"
    >
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">
        {/* Main Result Card */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-6 shadow-sm transition-colors duration-200">
          <div className="flex flex-col sm:flex-row gap-5 sm:gap-6">
            {/* Media Thumbnail / Inline Video Preview Player */}
            <div className="relative mx-auto sm:mx-0 w-48 sm:w-52 aspect-[9/14] shrink-0 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-950">
              {isPreviewing && previewUrl ? (
                <>
                  <video
                    key={`${media.id}-${useDirectPreview ? 'direct' : 'proxy'}`}
                    src={previewSrc}
                    poster={media.cover || undefined}
                    controls
                    playsInline
                    autoPlay
                    onError={() => {
                      if (!useDirectPreview) {
                        setUseDirectPreview(true);
                      } else {
                        setIsPreviewing(false);
                      }
                    }}
                    className="h-full w-full bg-black object-contain"
                  />
                  <button
                    type="button"
                    onClick={() => setIsPreviewing(false)}
                    aria-label="Tutup pratinjau video"
                    title="Tutup pratinjau"
                    className="absolute top-2 right-2 z-10 inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-950/80 text-white hover:bg-slate-900 border border-white/20 cursor-pointer"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                </>
              ) : (
                <>
                  {media.cover && !coverError ? (
                    <img
                      src={media.cover}
                      alt={`Thumbnail ${media.author.nickname}`}
                      referrerPolicy="no-referrer"
                      onError={() => setCoverError(true)}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-slate-800 to-slate-950 p-4 text-center text-slate-300">
                      <PlatformLogo
                        platform={media.platform}
                        className="mb-2.5 h-9 w-9 text-slate-300"
                      />
                      <span className="text-xs font-medium flex items-center gap-1.5">
                        <Film className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>{platformMeta.shortName}</span>
                      </span>
                    </div>
                  )}

                  {/* Top-left platform badge on thumbnail */}
                  <div
                    className={`absolute top-2.5 left-2.5 inline-flex h-8 w-8 items-center justify-center rounded-lg shadow-md ${platformMeta.brandBg}`}
                    title={platformMeta.name}
                  >
                    <PlatformLogo platform={media.platform} className="h-4 w-4" />
                  </div>

                  {/* Mini Video Preview Trigger */}
                  {hasVideo && (
                    <button
                      type="button"
                      onClick={() => setIsPreviewing(true)}
                      aria-label="Putar pratinjau video"
                      className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/35 transition-colors cursor-pointer group"
                    >
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-950/85 px-3.5 py-2 text-xs font-semibold text-white shadow-lg border border-white/20 group-hover:scale-105 transition-transform">
                        <Play className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
                        <span>Pratinjau</span>
                      </span>
                    </button>
                  )}

                  {durationText && (
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-3 py-2 flex justify-end">
                      <span className="font-mono text-xs font-semibold tabular-nums text-white">
                        {durationText}
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Author Info, Stats, Description & Green Download Buttons */}
            <div className="flex flex-1 flex-col justify-between min-w-0">
              <div>
                {/* Author Profile */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800">
                      {media.author.avatar && !avatarError ? (
                        <img
                          src={media.author.avatar}
                          alt={`Foto profil ${media.author.nickname}`}
                          referrerPolicy="no-referrer"
                          onError={() => setAvatarError(true)}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-400">
                          {media.author.avatar ? (
                            <User className="h-5 w-5" aria-hidden="true" />
                          ) : (
                            <PlatformLogo platform={media.platform} className="h-5 w-5" />
                          )}
                        </div>
                      )}
                    </div>

                    <div className="min-w-0">
                      <h2 className="font-display text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 truncate">
                        {media.author.nickname}
                      </h2>
                      <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
                        @{media.author.uniqueId}
                        <span className="mx-1.5 text-slate-300 dark:text-slate-600" aria-hidden="true">
                          ·
                        </span>
                        <span>{platformMeta.shortName}</span>
                      </p>
                    </div>
                  </div>

                  {media.title && (
                    <div className="flex flex-wrap items-center justify-end gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={handleCopyCaption}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer shrink-0 whitespace-nowrap min-h-[36px]"
                      >
                        {copiedCaption ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                            <span>Tersalin</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                            <span>Salin Caption</span>
                          </>
                        )}
                      </button>

                      {hashtags.length > 0 && (
                        <button
                          type="button"
                          onClick={handleCopyHashtags}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer shrink-0 whitespace-nowrap min-h-[36px]"
                        >
                          {copiedHashtags ? (
                            <>
                              <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                              <span>Hashtag Tersalin</span>
                            </>
                          ) : (
                            <>
                              <Hash className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
                              <span>Hashtag ({hashtags.length})</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Video Description */}
                <p className="mt-3.5 text-sm leading-relaxed text-slate-700 dark:text-slate-300 line-clamp-3">
                  {media.title || `Media dari ${platformMeta.name}.`}
                </p>

                {/* Statistics: Likes, Comments, Shares */}
                {hasStats && (
                  <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-y border-slate-100 dark:border-slate-800 py-3 text-sm text-slate-600 dark:text-slate-400">
                    {(media.stats.likes ?? 0) > 0 && (
                      <div className="inline-flex items-center gap-1.5">
                        <Heart className="h-4 w-4 text-rose-600 dark:text-rose-400" aria-hidden="true" />
                        <span className="font-mono font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                          {formatCompactNumber(media.stats.likes ?? 0)}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">Suka</span>
                      </div>
                    )}

                    {(media.stats.comments ?? 0) > 0 && (
                      <div className="inline-flex items-center gap-1.5">
                        <MessageCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" aria-hidden="true" />
                        <span className="font-mono font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                          {formatCompactNumber(media.stats.comments ?? 0)}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">Komentar</span>
                      </div>
                    )}

                    {(media.stats.shares ?? 0) > 0 && (
                      <div className="inline-flex items-center gap-1.5">
                        <Share2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                        <span className="font-mono font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                          {formatCompactNumber(media.stats.shares ?? 0)}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">Dibagikan</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Green Download Buttons */}
              <div className="mt-5 flex flex-col gap-2.5">
                {hasVideo && (
                  <>
                    <button
                      type="button"
                      onClick={() => onDownloadStandard()}
                      disabled={!media.play}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 text-xs sm:text-sm font-semibold text-white text-center hover:bg-emerald-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed transition-colors cursor-pointer min-h-[44px] whitespace-normal sm:whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
                    >
                      <Download className="h-4 w-4 shrink-0" aria-hidden="true" />
                      <span>
                        {isTikTok ? 'MP4 (tanpa watermark)' : 'Unduh Video MP4'}
                        {media.sdLabel ? ` · ${media.sdLabel}` : ''}
                        {standardSizeText ? ` · ${standardSizeText}` : ''}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={onOpenWatchAds}
                      disabled={!media.hdplay && !media.play}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-3 text-xs sm:text-sm font-semibold text-white text-center hover:bg-green-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed transition-colors cursor-pointer min-h-[44px] whitespace-normal sm:whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600"
                    >
                      <Sparkles className="h-4 w-4 shrink-0" aria-hidden="true" />
                      <span>
                        {isTikTok
                          ? `Tanpa tanda air HD${media.hdLabel ? ` (${media.hdLabel})` : ''} | Watch ads`
                          : `Unduh Kualitas HD${media.hdLabel ? ` (${media.hdLabel})` : ''} | Watch ads`}
                        {hdSizeText ? ` · ${hdSizeText}` : ''}
                      </span>
                    </button>
                  </>
                )}

                {media.music && (
                  <div className="space-y-2">
                    <div className="flex flex-col sm:flex-row gap-2">
                      <button
                        type="button"
                        onClick={onDownloadMp3}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 py-3 text-xs sm:text-sm font-semibold text-white text-center hover:bg-teal-700 transition-colors cursor-pointer min-h-[44px] whitespace-normal sm:whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600"
                      >
                        <Music className="h-4 w-4 shrink-0" aria-hidden="true" />
                        <span>Unduh audio MP3</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsAudioPreviewing((prev) => !prev)}
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-teal-200 dark:border-teal-800 bg-teal-50 dark:bg-teal-950/40 px-4 py-3 text-xs sm:text-sm font-semibold text-teal-800 dark:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-900/60 transition-colors cursor-pointer min-h-[44px] whitespace-nowrap"
                      >
                        <Volume2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                        <span>{isAudioPreviewing ? 'Tutup Audio' : 'Putar Audio'}</span>
                      </button>
                    </div>

                    {isAudioPreviewing && audioSrc && (
                      <div className="rounded-lg border border-teal-200 dark:border-teal-900/60 bg-teal-50/60 dark:bg-teal-950/30 p-2.5">
                        <audio
                          key={`${media.id}-${useDirectAudio ? 'direct' : 'proxy'}`}
                          src={audioSrc}
                          controls
                          autoPlay
                          preload="metadata"
                          onError={() => {
                            if (!useDirectAudio) {
                              setUseDirectAudio(true);
                            } else {
                              setIsAudioPreviewing(false);
                            }
                          }}
                          className="w-full h-9"
                        />
                      </div>
                    )}
                  </div>
                )}

                {media.image && (
                  <button
                    type="button"
                    onClick={() => onDownloadImage()}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 text-xs sm:text-sm font-semibold text-white text-center hover:bg-emerald-700 transition-colors cursor-pointer min-h-[44px] whitespace-normal sm:whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
                  >
                    <ImageIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>Unduh Gambar Kualitas Asli</span>
                  </button>
                )}

                {hasMultipleItems && media.mediaItems && (
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        Semua Slide Carousel ({media.mediaItems.length} item):
                      </p>
                      <button
                        type="button"
                        onClick={handleDownloadAllZip}
                        disabled={isZipping}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 disabled:bg-blue-400 px-3 py-1.5 text-xs font-semibold text-white transition-colors cursor-pointer whitespace-nowrap min-h-[34px]"
                      >
                        {isZipping ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                            <span>Mengemas ZIP...</span>
                          </>
                        ) : (
                          <>
                            <Archive className="h-3.5 w-3.5" aria-hidden="true" />
                            <span>Unduh Semua Slide (.zip)</span>
                          </>
                        )}
                      </button>
                    </div>
                    {zipError && (
                      <p className="mb-2 text-xs text-red-600 dark:text-red-400">
                        {zipError}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {media.mediaItems.map((item, idx) => (
                        <button
                          key={`${item.url}-${idx}`}
                          type="button"
                          onClick={() =>
                            item.type === 'image'
                              ? onDownloadImage(item.url, idx + 1)
                              : onDownloadStandard(item.url)
                          }
                          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600/90 hover:bg-emerald-700 px-3 py-2 text-xs font-semibold text-white transition-colors cursor-pointer whitespace-nowrap"
                        >
                          <Download className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>
                            Slide {idx + 1} ({item.type === 'image' ? 'Foto' : 'Video'})
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Secondary Utility Actions: Unduh Thumbnail HD + Bagikan/QR + Nama File + Lapor + Reset */}
                <div className="mt-1 flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex flex-wrap items-center gap-2">
                    {media.cover && (
                      <button
                        type="button"
                        onClick={() => onDownloadImage(media.cover)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer min-h-[36px]"
                      >
                        <ImageIcon className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                        <span>Simpan Thumbnail HD</span>
                      </button>
                    )}

                    {onOpenQr && (
                      <button
                        type="button"
                        onClick={onOpenQr}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer min-h-[36px]"
                      >
                        <QrCode className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
                        <span>Bagikan / QR</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={onToggleFilenameMode}
                      title="Ganti format nama file unduhan"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer min-h-[36px]"
                    >
                      <FileText className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" aria-hidden="true" />
                      <span>Nama File: {filenameMode === 'title' ? 'Judul' : 'Default'}</span>
                    </button>

                    {onReportLink && (
                      <button
                        type="button"
                        onClick={onReportLink}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-amber-400 hover:text-amber-700 dark:hover:text-amber-400 transition-colors cursor-pointer min-h-[36px]"
                      >
                        <Bug className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                        <span>Lapor Link</span>
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={onReset}
                    className="text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-blue-700 dark:hover:text-blue-400 hover:underline underline-offset-4 transition-colors cursor-pointer py-1.5"
                  >
                    Unduh video atau media lainnya
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Adsterra Banner 300x250 beside video result */}
        <aside
          aria-label="Iklan Banner Samping"
          className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 shadow-sm flex justify-center transition-colors duration-200"
        >
          <AdBanner
            adKey="b5815a366a899a3a9e1826e2140efe28"
            width={300}
            height={250}
          />
        </aside>
      </div>
    </section>
  );
}
