import { useEffect, useMemo, useState } from 'react';
import JSZip from 'jszip';
import {
  Archive,
  Bug,
  Check,
  Copy,
  Download,
  ExternalLink,
  FileText,
  Film,
  FolderPlus,
  HardDrive,
  Hash,
  Heart,
  Image as ImageIcon,
  Loader2,
  MessageCircle,
  Music,
  Play,
  QrCode,
  Share2,
  SlidersHorizontal,
  Sparkles,
  User,
  Volume2,
  X,
} from 'lucide-react';
import type { MediaDownloadResult, MediaQualityOption } from '../types/media';
import { cleanSocialUrlForShare, getPlatformMeta, PlatformLogo } from './PlatformLogo';
import AdBanner from './AdBanner';
import MediaProgressBar, { type DownloadProgressState } from './MediaProgressBar';
import { formatFirebaseAuthError, useAuth } from '../contexts/AuthContext';
import {
  DriveAuthExpiredError,
  saveMediaToGoogleDrive,
  type DriveMediaFileType,
  type SaveToDriveResult,
} from '../lib/googleDrive';

const API_BASE = (
  (typeof window !== 'undefined'
    ? (window as unknown as { __ZONESAVE_API_BASE__?: string }).__ZONESAVE_API_BASE__
    : '') || ''
).replace(/\/$/, '');

interface VideoResultCardProps {
  media: MediaDownloadResult;
  sourceUrl?: string;
  filenameMode: 'default' | 'title';
  activeDownload?: DownloadProgressState | null;
  onCancelDownload?: () => void;
  onToggleFilenameMode: () => void;
  onDownloadStandard: (overrideUrl?: string, qualityTag?: string) => void;
  onOpenWatchAds: () => void;
  onDownloadMp3: () => void;
  onDownloadImage: (overrideUrl?: string, index?: number) => void;
  onOpenQr?: () => void;
  onReportLink?: () => void;
  onOpenAuth?: () => void;
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
  sourceUrl = '',
  filenameMode,
  activeDownload = null,
  onCancelDownload,
  onToggleFilenameMode,
  onDownloadStandard,
  onOpenWatchAds,
  onDownloadMp3,
  onDownloadImage,
  onOpenQr,
  onReportLink,
  onOpenAuth,
  onReset,
}: VideoResultCardProps) {
  const {
    user,
    hasDriveAccess,
    signInWithGoogle,
    connectGoogleDrive,
    getDriveAccessToken,
    invalidateDriveAccessToken,
  } = useAuth();

  const [coverError, setCoverError] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const [copiedCaption, setCopiedCaption] = useState(false);
  const [copiedHashtags, setCopiedHashtags] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [useDirectPreview, setUseDirectPreview] = useState(false);
  const [isAudioPreviewing, setIsAudioPreviewing] = useState(false);
  const [useDirectAudio, setUseDirectAudio] = useState(false);
  const [isZipping, setIsZipping] = useState(false);
  const [zipProgress, setZipProgress] = useState<{
    completed: number;
    total: number;
    stage: string;
  } | null>(null);
  const [zipError, setZipError] = useState<string | null>(null);

  const [isDriveOpen, setIsDriveOpen] = useState(false);
  const [driveFormat, setDriveFormat] = useState<'mp4' | 'mp4_hd' | 'mp3' | 'jpg'>('mp4');
  const [driveFolder, setDriveFolder] = useState('ZoneSaveALL');
  const [isDriveUploading, setIsDriveUploading] = useState(false);
  const [driveStage, setDriveStage] = useState<'downloading' | 'uploading' | 'connecting' | null>(
    null
  );
  const [drivePercent, setDrivePercent] = useState(0);
  const [driveError, setDriveError] = useState<string | null>(null);
  const [driveResult, setDriveResult] = useState<SaveToDriveResult | null>(null);
  const [selectedQualityId, setSelectedQualityId] = useState<string>('');

  const availableQualities = useMemo<MediaQualityOption[]>(() => {
    if (media.qualityOptions && media.qualityOptions.length > 0) {
      return media.qualityOptions;
    }
    const list: MediaQualityOption[] = [];
    if (media.hdplay && media.hdplay !== media.play) {
      list.push({
        id: '1080p',
        label: media.hdLabel || '1080p HD',
        resolution: media.hdLabel?.includes('720') ? '720p' : 'HD',
        url: media.hdplay,
        size: media.hdSize || 0,
        isHd: true,
      });
    }
    if (media.play) {
      list.push({
        id: media.hdplay && media.hdplay !== media.play ? 'sd' : 'default',
        label: media.sdLabel || 'Standar MP4',
        resolution: media.sdLabel || 'MP4',
        url: media.play,
        size: media.size || 0,
        isHd: !media.hdplay || media.hdplay === media.play,
      });
    }
    return list;
  }, [media.hdLabel, media.hdSize, media.hdplay, media.play, media.qualityOptions, media.sdLabel, media.size]);

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
    setZipProgress(null);
    setZipError(null);
    setIsDriveOpen(false);
    setIsDriveUploading(false);
    setDriveStage(null);
    setDrivePercent(0);
    setDriveError(null);
    setDriveResult(null);
    setSelectedQualityId(availableQualities[0]?.id || '');
    if (media.hdplay && media.hdplay !== media.play) {
      setDriveFormat('mp4_hd');
    } else if (media.play) {
      setDriveFormat('mp4');
    } else if (media.image || media.cover) {
      setDriveFormat('jpg');
    } else if (media.music) {
      setDriveFormat('mp3');
    }
  }, [availableQualities, media.cover, media.hdplay, media.id, media.image, media.music, media.play]);

  const selectedQuality = useMemo(
    () =>
      availableQualities.find((q) => q.id === selectedQualityId) ||
      availableQualities[0] ||
      null,
    [availableQualities, selectedQualityId]
  );

  const platformMeta = getPlatformMeta(media.platform);
  const durationText = formatDuration(media.duration);
  const standardSizeText = formatFileSize(selectedQuality?.size || media.size);
  const hdSizeText = formatFileSize(media.hdSize);

  const hasStats =
    (media.stats.likes ?? 0) > 0 ||
    (media.stats.comments ?? 0) > 0 ||
    (media.stats.shares ?? 0) > 0;

  const hasVideo = Boolean(media.play || media.hdplay);
  const hasMultipleItems = (media.mediaItems?.length ?? 0) > 1;

  const hashtags = useMemo(() => {
    if (!media.title) return [];
    const matches = media.title.match(/#[\p{L}\p{N}_]+/gu) || [];
    return Array.from(new Set(matches));
  }, [media.title]);

  const previewUrl = selectedQuality?.url || media.play || media.hdplay;
  const previewSrc = useDirectPreview
    ? previewUrl
    : `${API_BASE}/api/download?url=${encodeURIComponent(previewUrl)}&filename=preview&type=mp4&inline=1`;
  const audioSrc = media.music
    ? useDirectAudio
      ? media.music
      : `${API_BASE}/api/download?url=${encodeURIComponent(media.music)}&filename=audio_preview&type=mp3&inline=1`
    : '';

  const { whatsappShareHref, telegramShareHref } = useMemo(() => {
    const cleanedSource = sourceUrl ? cleanSocialUrlForShare(sourceUrl) : '';
    const originBase =
      API_BASE ||
      (typeof window !== 'undefined' && window.location.origin.startsWith('http')
        ? window.location.origin
        : 'https://zonesaveall.vercel.app');
    const quickConvertUrl = cleanedSource
      ? `${originBase}/?url=${encodeURIComponent(cleanedSource)}`
      : originBase;

    const bestDirectUrl = media.hdplay || media.play || media.image || media.music || '';
    const shareTargetUrl =
      bestDirectUrl && bestDirectUrl.length <= 280 ? bestDirectUrl : quickConvertUrl;

    const shortTitle = (media.title || `Media ${platformMeta.shortName}`)
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 72);

    const shareSummary = `Unduh ${platformMeta.shortName} (${media.author.nickname}) lewat ZoneSaveALL: "${shortTitle}"`;
    const waText =
      shareTargetUrl === quickConvertUrl
        ? `${shareSummary}\nLink Download: ${shareTargetUrl}`
        : `${shareSummary}\nLink Download Langsung: ${shareTargetUrl}\nBuka di ZoneSaveALL: ${quickConvertUrl}`;

    return {
      whatsappShareHref: `https://wa.me/?text=${encodeURIComponent(waText)}`,
      telegramShareHref: `https://t.me/share/url?url=${encodeURIComponent(
        shareTargetUrl
      )}&text=${encodeURIComponent(shareSummary)}`,
    };
  }, [media.author.nickname, media.hdplay, media.image, media.music, media.play, media.title, platformMeta.shortName, sourceUrl]);

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
    const totalSlides = media.mediaItems.length;
    let completedSlides = 0;
    setIsZipping(true);
    setZipError(null);
    setZipProgress({
      completed: 0,
      total: totalSlides,
      stage: `Mengunduh slide 0 dari ${totalSlides}...`,
    });

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
          completedSlides += 1;
          setZipProgress({
            completed: completedSlides,
            total: totalSlides,
            stage:
              completedSlides >= totalSlides
                ? 'Mengemas file menjadi arsip ZIP...'
                : `Mengunduh slide ${completedSlides} dari ${totalSlides}...`,
          });
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

      setZipProgress({
        completed: totalSlides,
        total: totalSlides,
        stage: 'Menyimpan arsip ZIP...',
      });
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
      setZipProgress(null);
    }
  };

  const driveFormatOptions = useMemo(() => {
    const options: Array<{
      id: 'mp4_hd' | 'mp4' | 'mp3' | 'jpg';
      label: string;
      url: string;
      fileType: DriveMediaFileType;
      suffix: string;
    }> = [];
    if (media.hdplay && media.hdplay !== media.play) {
      options.push({
        id: 'mp4_hd',
        label: `Video HD (${media.hdLabel || 'HD'})`,
        url: media.hdplay,
        fileType: 'mp4',
        suffix: '_HD',
      });
    }
    if (media.play) {
      options.push({
        id: 'mp4',
        label: 'Video MP4',
        url: media.play,
        fileType: 'mp4',
        suffix: '',
      });
    }
    if (media.music) {
      options.push({
        id: 'mp3',
        label: 'Audio MP3',
        url: media.music,
        fileType: 'mp3',
        suffix: '_audio',
      });
    }
    if (media.image || media.cover) {
      options.push({
        id: 'jpg',
        label: media.image ? 'Gambar Asli' : 'Thumbnail HD',
        url: media.image || media.cover,
        fileType: 'jpg',
        suffix: media.image ? '' : '_cover',
      });
    }
    return options;
  }, [media.cover, media.hdLabel, media.hdplay, media.image, media.music, media.play]);

  const selectedDriveOption = useMemo(
    () => driveFormatOptions.find((opt) => opt.id === driveFormat) || driveFormatOptions[0],
    [driveFormat, driveFormatOptions]
  );

  const previewDriveFilename = useMemo(() => {
    if (!selectedDriveOption) return 'zonesaveall_media.mp4';
    const suffix = selectedDriveOption.suffix;
    let base = '';
    if (filenameMode === 'title' && media.title) {
      const sanitizedTitle = sanitizeZipSegment(media.title, '');
      if (sanitizedTitle) {
        base = `zonesaveall_${sanitizedTitle}${suffix}`;
      }
    }
    if (!base) {
      const safeUser = (media.author.uniqueId || 'user').slice(0, 24);
      const safeId = (media.id || 'media').slice(0, 24);
      base = `zonesaveall_${media.platform}${suffix}_${safeUser}_${safeId}`;
    }
    return `${base}.${selectedDriveOption.fileType}`;
  }, [
    filenameMode,
    media.author.uniqueId,
    media.id,
    media.platform,
    media.title,
    selectedDriveOption,
  ]);

  const handleGoogleLoginForDrive = async () => {
    setDriveError(null);
    setIsDriveUploading(true);
    setDriveStage('connecting');
    try {
      await signInWithGoogle();
    } catch (err) {
      setDriveError(formatFirebaseAuthError(err));
    } finally {
      setIsDriveUploading(false);
      setDriveStage(null);
    }
  };

  const handleSaveToDrive = async () => {
    if (!selectedDriveOption || isDriveUploading) return;
    setDriveError(null);
    setDriveResult(null);
    setIsDriveUploading(true);
    setDrivePercent(0);

    try {
      let token = getDriveAccessToken();
      if (!token) {
        setDriveStage('connecting');
        token = await connectGoogleDrive();
      }

      const executeUpload = async (activeToken: string) =>
        saveMediaToGoogleDrive({
          accessToken: activeToken,
          mediaUrl: selectedDriveOption.url,
          filename: previewDriveFilename,
          fileType: selectedDriveOption.fileType,
          folderName: driveFolder.trim() || 'ZoneSaveALL',
          apiBase: API_BASE,
          description: `${platformMeta.name} · @${media.author.uniqueId} · ${media.title}`.slice(
            0,
            240
          ),
          onProgress: (stage, pct) => {
            setDriveStage(stage);
            if (typeof pct === 'number') setDrivePercent(pct);
          },
        });

      let saved: SaveToDriveResult;
      try {
        saved = await executeUpload(token);
      } catch (err) {
        if (err instanceof DriveAuthExpiredError) {
          invalidateDriveAccessToken();
          setDriveStage('connecting');
          const refreshedToken = await connectGoogleDrive();
          saved = await executeUpload(refreshedToken);
        } else {
          throw err;
        }
      }

      setDriveResult(saved);
    } catch (err) {
      if (err instanceof DriveAuthExpiredError) {
        invalidateDriveAccessToken();
      }
      setDriveError(
        err instanceof Error
          ? err.message
          : 'Gagal menyimpan file ke Google Drive. Silakan coba lagi.'
      );
    } finally {
      setIsDriveUploading(false);
      setDriveStage(null);
    }
  };

  return (
    <section
      aria-label="Hasil Media Sosial"
      className="animate-result-enter mx-auto max-w-6xl px-4 sm:px-6 pt-6 pb-4"
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
                {activeDownload && (
                  <MediaProgressBar
                    progress={activeDownload.progress}
                    stageText={activeDownload.label}
                    detailText={activeDownload.detailText}
                    indeterminate={activeDownload.indeterminate}
                    variant={activeDownload.variant}
                    status={activeDownload.status}
                    onCancel={
                      activeDownload.status === 'active' ? onCancelDownload : undefined
                    }
                    cancelLabel="Batalkan unduhan"
                  />
                )}
                {hasVideo && (
                  <>
                    {availableQualities.length > 1 && (
                      <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60 p-2.5 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
                            <SlidersHorizontal className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                            <span>Filter Kualitas / Resolusi Video:</span>
                          </span>
                          {selectedQuality && (
                            <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                              {selectedQuality.label}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {availableQualities.map((q) => {
                            const isSelected = selectedQuality?.id === q.id;
                            const qSize = q.size ? formatFileSize(q.size) : '';
                            return (
                              <button
                                key={q.id}
                                type="button"
                                onClick={() => setSelectedQualityId(q.id)}
                                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all duration-150 cursor-pointer ${
                                  isSelected
                                    ? 'bg-emerald-600 text-white shadow-xs ring-2 ring-emerald-500/30'
                                    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-emerald-400 dark:hover:border-emerald-600'
                                }`}
                              >
                                <span>{q.resolution}</span>
                                {qSize && (
                                  <span
                                    className={`text-[10px] font-mono ${
                                      isSelected
                                        ? 'text-emerald-100'
                                        : 'text-slate-500 dark:text-slate-400'
                                    }`}
                                  >
                                    · {qSize}
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() =>
                        onDownloadStandard(
                          selectedQuality?.url || media.play,
                          availableQualities.length > 1 ? selectedQuality?.id : undefined
                        )
                      }
                      disabled={!selectedQuality?.url && !media.play}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 text-xs sm:text-sm font-semibold text-white text-center hover:bg-emerald-700 hover:scale-105 active:scale-[0.98] disabled:hover:scale-100 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer min-h-[44px] whitespace-normal sm:whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
                    >
                      <Download className="h-4 w-4 shrink-0" aria-hidden="true" />
                      <span>
                        MP4 HD (Tanpa Watermark)
                        {selectedQuality?.resolution
                          ? ` · ${selectedQuality.resolution}`
                          : media.sdLabel
                            ? ` · ${media.sdLabel}`
                            : ''}
                        {standardSizeText ? ` · ${standardSizeText}` : ''}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={onOpenWatchAds}
                      disabled={!media.hdplay && !media.play}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-3 text-xs sm:text-sm font-semibold text-white text-center hover:bg-green-700 hover:scale-105 active:scale-[0.98] disabled:hover:scale-100 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer min-h-[44px] whitespace-normal sm:whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600"
                    >
                      <Sparkles className="h-4 w-4 shrink-0" aria-hidden="true" />
                      <span>
                        {`Tanpa Watermark 100% HD${media.hdLabel ? ` (${media.hdLabel})` : ''} | Watch ads`}
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
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 py-3 text-xs sm:text-sm font-semibold text-white text-center hover:bg-teal-700 hover:scale-105 active:scale-[0.98] transition-all duration-200 cursor-pointer min-h-[44px] whitespace-normal sm:whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600"
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
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 text-xs sm:text-sm font-semibold text-white text-center hover:bg-emerald-700 hover:scale-105 active:scale-[0.98] transition-all duration-200 cursor-pointer min-h-[44px] whitespace-normal sm:whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
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
                        className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 hover:scale-105 active:scale-[0.98] disabled:hover:scale-100 disabled:bg-blue-400 px-3 py-1.5 text-xs font-semibold text-white transition-all duration-200 cursor-pointer whitespace-nowrap min-h-[34px]"
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
                    {isZipping && zipProgress && (
                      <div className="mb-2.5">
                        <MediaProgressBar
                          progress={
                            zipProgress.total > 0
                              ? (zipProgress.completed / zipProgress.total) * 100
                              : 15
                          }
                          stageText={zipProgress.stage}
                          detailText={`${zipProgress.completed}/${zipProgress.total} slide`}
                          variant="blue"
                          status="active"
                        />
                      </div>
                    )}
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
                          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600/90 hover:bg-emerald-700 hover:scale-105 active:scale-[0.98] px-3 py-2 text-xs font-semibold text-white transition-all duration-200 cursor-pointer whitespace-nowrap"
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

                {/* Save directly to Google Drive */}
                {driveFormatOptions.length > 0 && (
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                    {!isDriveOpen ? (
                      <button
                        type="button"
                        onClick={() => {
                          setDriveError(null);
                          setIsDriveOpen(true);
                        }}
                        className="inline-flex w-full items-center justify-between gap-2 rounded-lg border border-blue-200 dark:border-blue-800/80 bg-blue-50/80 dark:bg-blue-950/40 px-4 py-2.5 text-xs sm:text-sm font-semibold text-blue-900 dark:text-blue-200 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors cursor-pointer min-h-[44px]"
                      >
                        <span className="inline-flex items-center gap-2">
                          <HardDrive className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" aria-hidden="true" />
                          <span>Simpan ke Google Drive</span>
                        </span>
                        <span className="text-[11px] font-medium text-blue-700 dark:text-blue-300">
                          {driveResult
                            ? 'Tersimpan ✓'
                            : user
                              ? 'Pilih Folder & Format'
                              : 'Masuk untuk Simpan'}
                        </span>
                      </button>
                    ) : (
                      <div className="rounded-xl border border-blue-200 dark:border-blue-800/80 bg-blue-50/50 dark:bg-slate-950/60 p-3.5 space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <HardDrive className="h-4 w-4 text-blue-600 dark:text-blue-400" aria-hidden="true" />
                            <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
                              Simpan ke Google Drive
                            </h3>
                          </div>
                          <button
                            type="button"
                            onClick={() => setIsDriveOpen(false)}
                            disabled={isDriveUploading}
                            aria-label="Tutup panel Google Drive"
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:bg-slate-200/70 dark:hover:bg-slate-800 cursor-pointer disabled:opacity-50"
                          >
                            <X className="h-4 w-4" aria-hidden="true" />
                          </button>
                        </div>

                        {!user ? (
                          <div className="space-y-2.5">
                            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                              Masuk dengan akun Google Anda agar file hasil konversi bisa langsung dibuat dan disimpan ke folder Google Drive Anda.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-2">
                              <button
                                type="button"
                                onClick={handleGoogleLoginForDrive}
                                disabled={isDriveUploading}
                                className="inline-flex flex-1 items-center justify-center gap-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-xs transition-colors cursor-pointer min-h-[42px] disabled:opacity-60"
                              >
                                <svg
                                  viewBox="0 0 48 48"
                                  className="h-4 w-4 shrink-0"
                                  aria-hidden="true"
                                >
                                  <path
                                    fill="#EA4335"
                                    d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                                  />
                                  <path
                                    fill="#4285F4"
                                    d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                                  />
                                  <path
                                    fill="#FBBC05"
                                    d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                                  />
                                  <path
                                    fill="#34A853"
                                    d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                                  />
                                </svg>
                                <span>
                                  {driveStage === 'connecting'
                                    ? 'Menghubungkan Google...'
                                    : 'Sign in with Google'}
                                </span>
                              </button>

                              {onOpenAuth && (
                                <button
                                  type="button"
                                  onClick={onOpenAuth}
                                  className="inline-flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-3.5 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer min-h-[42px]"
                                >
                                  Masuk Email
                                </button>
                              )}
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="space-y-1.5">
                              <span className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                                Pilih Format Media:
                              </span>
                              <div className="flex flex-wrap gap-1.5">
                                {driveFormatOptions.map((opt) => {
                                  const active = selectedDriveOption?.id === opt.id;
                                  return (
                                    <button
                                      key={opt.id}
                                      type="button"
                                      disabled={isDriveUploading}
                                      onClick={() => {
                                        setDriveFormat(opt.id);
                                        setDriveResult(null);
                                        setDriveError(null);
                                      }}
                                      className={`rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-60 ${
                                        active
                                          ? 'bg-blue-700 text-white shadow-xs'
                                          : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                                      }`}
                                    >
                                      {opt.label}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            <div className="space-y-1.5">
                              <label
                                htmlFor={`drive-folder-${media.id}`}
                                className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300"
                              >
                                <FolderPlus className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
                                <span>Folder Tujuan Google Drive:</span>
                              </label>
                              <input
                                id={`drive-folder-${media.id}`}
                                type="text"
                                value={driveFolder}
                                disabled={isDriveUploading}
                                onChange={(e) => {
                                  setDriveFolder(e.target.value);
                                  setDriveResult(null);
                                }}
                                placeholder="ZoneSaveALL"
                                maxLength={60}
                                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:border-blue-500 focus:outline-none"
                              />
                              <div className="flex flex-wrap gap-1.5">
                                {[
                                  'ZoneSaveALL',
                                  `ZoneSaveALL - ${platformMeta.shortName}`,
                                  'ZoneSaveALL - Favorit',
                                ].map((preset) => (
                                  <button
                                    key={preset}
                                    type="button"
                                    disabled={isDriveUploading}
                                    onClick={() => {
                                      setDriveFolder(preset);
                                      setDriveResult(null);
                                    }}
                                    className={`rounded px-2 py-0.5 text-[11px] font-medium transition-colors cursor-pointer ${
                                      driveFolder === preset
                                        ? 'bg-slate-900 text-white dark:bg-slate-200 dark:text-slate-900'
                                        : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                                    }`}
                                  >
                                    {preset}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <p className="rounded-lg bg-white/80 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 px-3 py-2 text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                              File <span className="font-semibold text-slate-900 dark:text-slate-100 break-all">{previewDriveFilename}</span> akan dibuat dan disimpan di folder{' '}
                              <span className="font-semibold text-slate-900 dark:text-slate-100">
                                {driveFolder.trim() || 'ZoneSaveALL'}
                              </span>{' '}
                              Google Drive akun <span className="font-semibold">{user.email || user.displayName}</span>.
                            </p>

                            {isDriveUploading && (
                              <div className="space-y-1.5">
                                <div className="flex items-center justify-between text-xs font-medium text-blue-700 dark:text-blue-300">
                                  <span className="inline-flex items-center gap-1.5">
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                                    <span>
                                      {driveStage === 'connecting'
                                        ? 'Meminta izin Google Drive...'
                                        : driveStage === 'downloading'
                                          ? 'Menyiapkan file media...'
                                          : `Mengunggah ke Google Drive (${drivePercent}%)...`}
                                    </span>
                                  </span>
                                  {driveStage === 'uploading' && (
                                    <span className="font-mono tabular-nums">{drivePercent}%</span>
                                  )}
                                </div>
                                <div className="h-2 w-full overflow-hidden rounded-full bg-blue-100 dark:bg-slate-800">
                                  <div
                                    className="h-full bg-blue-600 transition-all duration-200"
                                    style={{
                                      width: `${
                                        driveStage === 'uploading'
                                          ? Math.max(8, drivePercent)
                                          : driveStage === 'downloading'
                                            ? 25
                                            : 12
                                      }%`,
                                    }}
                                  />
                                </div>
                              </div>
                            )}

                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                onClick={handleSaveToDrive}
                                disabled={isDriveUploading}
                                className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-700 hover:bg-blue-800 disabled:bg-blue-400 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white transition-colors cursor-pointer min-h-[42px]"
                              >
                                <HardDrive className="h-4 w-4 shrink-0" aria-hidden="true" />
                                <span>
                                  {isDriveUploading
                                    ? 'Menyimpan...'
                                    : hasDriveAccess
                                      ? 'Simpan ke Google Drive'
                                      : 'Hubungkan Google Drive & Simpan'}
                                </span>
                              </button>

                              <button
                                type="button"
                                onClick={() => setIsDriveOpen(false)}
                                disabled={isDriveUploading}
                                className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer min-h-[42px] disabled:opacity-50"
                              >
                                Batal
                              </button>
                            </div>
                          </>
                        )}

                        {driveResult && (
                          <div className="rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                                <Check className="h-4 w-4 shrink-0" aria-hidden="true" />
                                <span>Berhasil disimpan ke Google Drive!</span>
                              </p>
                              <p className="mt-0.5 text-[11px] text-emerald-700 dark:text-emerald-400 truncate">
                                Folder: {driveResult.folderName} · {driveResult.name}
                              </p>
                            </div>
                            <a
                              href={driveResult.webViewLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white transition-colors"
                            >
                              <span>Buka di Drive</span>
                              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                            </a>
                          </div>
                        )}

                        {driveError && (
                          <p
                            role="alert"
                            className="rounded-lg border border-red-200 dark:border-red-800/80 bg-red-50 dark:bg-red-950/40 px-3 py-2 text-xs text-red-700 dark:text-red-300"
                          >
                            {driveError}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Quick Share Download Link to WhatsApp / Telegram */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Bagikan link download hasil convert ke teman:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <a
                      href={whatsappShareHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 rounded-lg border border-emerald-200 dark:border-emerald-800/80 bg-emerald-50 dark:bg-emerald-950/40 px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors min-h-[42px]"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400"
                        aria-hidden="true"
                      >
                        <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91C21.95 6.45 17.5 2 12.04 2zm5.8 14.08c-.24.68-1.42 1.3-1.95 1.38-.52.08-1.18.11-1.91-.12-.44-.14-1.01-.33-1.74-.64-3.06-1.32-5.06-4.41-5.21-4.61-.15-.2-1.24-1.65-1.24-3.15s.78-2.23 1.06-2.53c.28-.3.61-.38.81-.38.2 0 .41 0 .59.01.19.01.44-.07.69.53.26.62.87 2.14.95 2.3.08.16.13.34.03.54-.1.2-.15.33-.3.51-.15.18-.32.4-.45.54-.15.15-.31.31-.13.62.18.31.79 1.3 1.7 2.11 1.17 1.04 2.15 1.36 2.46 1.52.31.15.49.13.67-.08.18-.2.77-.9.97-1.21.2-.31.41-.26.69-.15.28.1 1.78.84 2.09.99.31.15.51.23.59.36.08.13.08.76-.16 1.44z" />
                      </svg>
                      <span>Bagikan ke WhatsApp</span>
                    </a>

                    <a
                      href={telegramShareHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 rounded-lg border border-sky-200 dark:border-sky-800/80 bg-sky-50 dark:bg-sky-950/40 px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-sky-800 dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-sky-900/60 transition-colors min-h-[42px]"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        className="h-4 w-4 shrink-0 text-sky-600 dark:text-sky-400"
                        aria-hidden="true"
                      >
                        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                      </svg>
                      <span>Bagikan ke Telegram</span>
                    </a>
                  </div>
                </div>

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
