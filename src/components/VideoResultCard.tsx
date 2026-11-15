import { useState } from 'react';
import {
  Check,
  Copy,
  Download,
  Film,
  Heart,
  Image as ImageIcon,
  MessageCircle,
  Music,
  Share2,
  Sparkles,
  User,
} from 'lucide-react';
import type { MediaDownloadResult } from '../types/media';
import { getPlatformMeta, PlatformLogo } from './PlatformLogo';
import AdBanner from './AdBanner';

interface VideoResultCardProps {
  media: MediaDownloadResult;
  onDownloadStandard: (overrideUrl?: string) => void;
  onOpenWatchAds: () => void;
  onDownloadMp3: () => void;
  onDownloadImage: (overrideUrl?: string, index?: number) => void;
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

export default function VideoResultCard({
  media,
  onDownloadStandard,
  onOpenWatchAds,
  onDownloadMp3,
  onDownloadImage,
  onReset,
}: VideoResultCardProps) {
  const [coverError, setCoverError] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const [copiedCaption, setCopiedCaption] = useState(false);

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

  return (
    <section
      aria-label="Hasil Media Sosial"
      className="mx-auto max-w-6xl px-4 sm:px-6 pt-8 pb-4"
    >
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">
        {/* Main Result Card */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-sm transition-colors duration-200">
          <div className="flex flex-col sm:flex-row gap-5 sm:gap-6">
            {/* Media Thumbnail */}
            <div className="relative mx-auto sm:mx-0 w-44 sm:w-48 aspect-[9/14] shrink-0 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-900">
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
                  <PlatformLogo platform={media.platform} className="mb-2.5 h-9 w-9 text-slate-300" />
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

              {durationText && (
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-3 py-2 flex justify-end">
                  <span className="font-mono text-xs font-semibold tabular-nums text-white">
                    {durationText}
                  </span>
                </div>
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
                    <button
                      type="button"
                      onClick={handleCopyCaption}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer shrink-0 whitespace-nowrap min-h-[36px]"
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
                  <button
                    type="button"
                    onClick={onDownloadMp3}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 py-3 text-xs sm:text-sm font-semibold text-white text-center hover:bg-teal-700 transition-colors cursor-pointer min-h-[44px] whitespace-normal sm:whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600"
                  >
                    <Music className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>Unduh audio MP3</span>
                  </button>
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
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
                      Semua Slide Carousel ({media.mediaItems.length} item):
                    </p>
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

                <button
                  type="button"
                  onClick={onReset}
                  className="mt-1 self-start text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-blue-700 dark:hover:text-blue-400 hover:underline underline-offset-4 transition-colors cursor-pointer py-1"
                >
                  Unduh video atau media lainnya
                </button>
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
