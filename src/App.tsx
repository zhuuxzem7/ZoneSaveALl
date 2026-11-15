import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import {
  AlertCircle,
  ClipboardPaste,
  Clock,
  Download,
  Loader2,
  Trash2,
  X,
} from 'lucide-react';
import Header from './components/Header';
import AdBanner from './components/AdBanner';
import VideoResultCard from './components/VideoResultCard';
import WatchAdsModal from './components/WatchAdsModal';
import InfoSections from './components/InfoSections';
import Footer from './components/Footer';
import {
  detectPlatformFromUrl,
  getPlatformMeta,
  PLATFORM_LIST,
  PlatformLogo,
} from './components/PlatformLogo';
import type {
  MediaDownloadResult,
  PlatformTab,
  SocialPlatform,
} from './types/media';

type ThemeMode = 'light' | 'dark';

interface DownloadHistoryItem {
  platform: SocialPlatform;
  id: string;
  url: string;
  title: string;
  authorName: string;
  uniqueId: string;
  cover: string;
  savedAt: number;
}

const THEME_STORAGE_KEY = 'zonesaveall-theme';
const HISTORY_STORAGE_KEY = 'zonesaveall-history';
const LEGACY_THEME_KEY = 'zonesavetik-theme';
const LEGACY_HISTORY_KEY = 'zonesavetik-history';

function normalizeTikWmUrl(rawUrl: string | undefined): string {
  if (!rawUrl) return '';
  if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) return rawUrl;
  if (rawUrl.startsWith('//')) return `https:${rawUrl}`;
  if (rawUrl.startsWith('/')) return `https://www.tikwm.com${rawUrl}`;
  return `https://www.tikwm.com/${rawUrl}`;
}

function normalizeUserLink(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return '';
  if (!/^https?:\/\//i.test(trimmed)) {
    return `https://${trimmed}`;
  }
  return trimmed;
}

function parseInitialPlatformFromHash(): PlatformTab {
  if (typeof window === 'undefined') return 'all';
  const hash = window.location.hash.replace('#', '').toLowerCase();
  const valid = PLATFORM_LIST.find((p) => p.id === hash);
  return valid ? valid.id : 'all';
}

export default function App() {
  const inputRef = useRef<HTMLInputElement>(null);

  const [theme, setTheme] = useState<ThemeMode>(() => {
    try {
      const saved =
        localStorage.getItem(THEME_STORAGE_KEY) || localStorage.getItem(LEGACY_THEME_KEY);
      if (saved === 'dark' || saved === 'light') return saved;
    } catch {
      // ignore storage errors
    }
    return 'light';
  });

  const [activeTab, setActiveTab] = useState<PlatformTab>(parseInitialPlatformFromHash);

  const [history, setHistory] = useState<DownloadHistoryItem[]>(() => {
    try {
      const raw =
        localStorage.getItem(HISTORY_STORAGE_KEY) || localStorage.getItem(LEGACY_HISTORY_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed.slice(0, 6).map((item) => ({
            ...item,
            platform: item.platform || 'tiktok',
          }));
        }
      }
    } catch {
      // ignore storage errors
    }
    return [];
  });

  const [urlInput, setUrlInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [mediaResult, setMediaResult] = useState<MediaDownloadResult | null>(null);
  const [isWatchAdsOpen, setIsWatchAdsOpen] = useState(false);

  const detectedPlatform = useMemo(() => detectPlatformFromUrl(urlInput), [urlInput]);
  const displayPlatform: PlatformTab = detectedPlatform || activeTab;
  const activeMeta = useMemo(() => getPlatformMeta(activeTab), [activeTab]);
  const detectedMeta = useMemo(
    () => getPlatformMeta(displayPlatform),
    [displayPlatform]
  );

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // ignore storage errors
    }
  }, [theme]);

  useEffect(() => {
    const onHashChange = () => {
      const hash = window.location.hash.replace('#', '').toLowerCase();
      const valid = PLATFORM_LIST.find((p) => p.id === hash);
      if (valid) setActiveTab(valid.id);
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== '/') return;
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }
      event.preventDefault();
      inputRef.current?.focus();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const handleSelectPlatform = (tab: PlatformTab) => {
    setActiveTab(tab);
    setErrorMessage(null);
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', tab === 'all' ? '#beranda' : `#${tab}`);
    }
    inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    inputRef.current?.focus();
  };

  const saveToHistory = (data: MediaDownloadResult, sourceUrl: string) => {
    const entry: DownloadHistoryItem = {
      platform: data.platform,
      id: `${data.platform}_${data.id}`,
      url: sourceUrl,
      title: data.title || `Media ${data.platform}`,
      authorName: data.author.nickname,
      uniqueId: data.author.uniqueId,
      cover: data.cover,
      savedAt: Date.now(),
    };

    setHistory((prev) => {
      const filtered = prev.filter((item) => item.id !== entry.id);
      const next = [entry, ...filtered].slice(0, 6);
      try {
        localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore storage errors
      }
      return next;
    });
  };

  const clearHistory = () => {
    setHistory([]);
    try {
      localStorage.removeItem(HISTORY_STORAGE_KEY);
    } catch {
      // ignore storage errors
    }
  };

  const focusInput = () => {
    inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    inputRef.current?.focus();
  };

  const handlePaste = async () => {
    setErrorMessage(null);
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        const trimmed = text.trim();
        setUrlInput(trimmed);
        const found = detectPlatformFromUrl(trimmed);
        if (found) setActiveTab(found);
      } else {
        setErrorMessage('Clipboard kosong. Salin tautan video terlebih dahulu.');
      }
    } catch {
      setErrorMessage(
        'Izin clipboard ditolak browser. Tempel tautan secara manual (Ctrl+V / tekan lama).'
      );
      inputRef.current?.focus();
    }
  };

  const handleClearInput = () => {
    setUrlInput('');
    setErrorMessage(null);
    inputRef.current?.focus();
  };

  const parseDirectTikWm = async (normalizedUrl: string): Promise<MediaDownloadResult> => {
    const directRes = await fetch(
      `https://tikwm.com/api/?url=${encodeURIComponent(normalizedUrl)}&hd=1`
    );
    const directJson = await directRes.json();
    if (directJson.code !== 0 || !directJson.data) {
      throw new Error(directJson.msg || 'Video tidak ditemukan atau bersifat privat.');
    }

    const d = directJson.data;
    return {
      platform: 'tiktok',
      id: d.id || String(Date.now()),
      title: d.title || 'Video TikTok',
      cover: normalizeTikWmUrl(d.cover || d.origin_cover),
      play: normalizeTikWmUrl(d.play),
      hdplay: normalizeTikWmUrl(d.hdplay) || normalizeTikWmUrl(d.play),
      music: normalizeTikWmUrl(d.music || d.music_info?.play),
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
  };

  const runMediaLookup = async (rawUrl: string) => {
    const normalizedUrl = normalizeUserLink(rawUrl);

    if (!normalizedUrl) {
      setErrorMessage('Silakan tempel tautan video atau media terlebih dahulu.');
      inputRef.current?.focus();
      return;
    }

    const detected = detectPlatformFromUrl(normalizedUrl);
    if (detected) {
      setActiveTab(detected);
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      let apiResponse: globalThis.Response | null = null;

      try {
        apiResponse = await fetch('/api/media', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: normalizedUrl }),
        });
      } catch {
        apiResponse = null;
      }

      if (apiResponse) {
        const contentType = apiResponse.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const result = await apiResponse.json();
          if (!apiResponse.ok) {
            throw new Error(result.error || 'Gagal mengambil data media.');
          }
          const resolved = result as MediaDownloadResult;
          setMediaResult(resolved);
          saveToHistory(resolved, normalizedUrl);
          return;
        }
      }

      if (detected === 'tiktok') {
        const fallbackData = await parseDirectTikWm(normalizedUrl);
        setMediaResult(fallbackData);
        saveToHistory(fallbackData, normalizedUrl);
        return;
      }

      throw new Error('Server pengunduh tidak merespons. Silakan coba lagi.');
    } catch (err) {
      let msg = 'Terjadi kesalahan saat mengambil data media. Coba lagi.';
      if (err instanceof Error) {
        if (
          err.message === 'Failed to fetch' ||
          err.message.toLowerCase().includes('networkerror') ||
          err.message.toLowerCase().includes('load failed')
        ) {
          msg =
            'Gagal terhubung ke server pengunduh. Muat ulang halaman atau pastikan ekstensi AdBlocker/jaringan tidak memblokir permintaan.';
        } else {
          msg = err.message;
        }
      }
      setErrorMessage(msg);
      setMediaResult(null);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMediaData = async (e: FormEvent) => {
    e.preventDefault();
    await runMediaLookup(urlInput);
  };

  const handleLoadFromHistory = async (item: DownloadHistoryItem) => {
    setUrlInput(item.url);
    await runMediaLookup(item.url);
    window.scrollTo({ top: 280, behavior: 'smooth' });
  };

  const triggerFileDownload = (
    mediaUrl: string,
    filename: string,
    type: 'mp4' | 'mp3' | 'jpg'
  ) => {
    if (!mediaUrl) return;
    const downloadUrl = `/api/download?url=${encodeURIComponent(mediaUrl)}&filename=${encodeURIComponent(
      filename
    )}&type=${type}`;
    const anchor = document.createElement('a');
    anchor.href = downloadUrl;
    anchor.download = `${filename}.${type}`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  };

  const handleDownloadStandard = (overrideUrl?: string) => {
    const targetUrl = overrideUrl || mediaResult?.play;
    if (!targetUrl || !mediaResult) return;
    triggerFileDownload(
      targetUrl,
      `zonesaveall_${mediaResult.platform}_${mediaResult.author.uniqueId}_${mediaResult.id}`,
      'mp4'
    );
  };

  const handleDownloadHD = () => {
    if (!mediaResult) return;
    const targetUrl = mediaResult.hdplay || mediaResult.play;
    triggerFileDownload(
      targetUrl,
      `zonesaveall_${mediaResult.platform}_HD_${mediaResult.author.uniqueId}_${mediaResult.id}`,
      'mp4'
    );
  };

  const handleDownloadMp3 = () => {
    if (!mediaResult?.music) return;
    triggerFileDownload(
      mediaResult.music,
      `zonesaveall_${mediaResult.platform}_audio_${mediaResult.author.uniqueId}_${mediaResult.id}`,
      'mp3'
    );
  };

  const handleDownloadImage = (overrideUrl?: string, slideIndex?: number) => {
    const targetUrl = overrideUrl || mediaResult?.image;
    if (!targetUrl || !mediaResult) return;
    const suffix = slideIndex ? `_slide${slideIndex}` : '';
    triggerFileDownload(
      targetUrl,
      `zonesaveall_${mediaResult.platform}_${mediaResult.id}${suffix}`,
      'jpg'
    );
  };

  const handleReset = () => {
    setMediaResult(null);
    setUrlInput('');
    setErrorMessage(null);
    focusInput();
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 transition-colors duration-200">
      <Header
        theme={theme}
        onToggleTheme={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
      />

      <main className="flex-1">
        {/* Compact Multi-Platform Hero + Single-Row Tabs + Dynamic Logo Input */}
        <section
          id="beranda"
          className="relative overflow-hidden bg-gradient-to-b from-blue-800 via-blue-700 to-blue-600 dark:from-slate-900 dark:via-blue-950 dark:to-slate-950 text-white py-5 sm:py-9 px-4 sm:px-6 transition-colors duration-200"
        >
          <div className="mx-auto max-w-5xl">
            {/* Platform Switcher Tabs: single horizontal row on mobile, centered on desktop */}
            <div
              role="tablist"
              aria-label="Pilih halaman platform sosial media"
              className="mb-4 sm:mb-6 flex md:flex-wrap items-center md:justify-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar pb-1 -mx-1 px-1"
            >
              {PLATFORM_LIST.map((platform) => {
                const isActive = activeTab === platform.id;
                return (
                  <button
                    key={platform.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => handleSelectPlatform(platform.id)}
                    className={`inline-flex items-center gap-1.5 sm:gap-2 rounded-lg px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs sm:text-sm font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 min-h-[36px] sm:min-h-[40px] ${
                      isActive
                        ? 'bg-white text-slate-900 shadow-md dark:bg-slate-800 dark:text-white dark:ring-1 dark:ring-blue-400'
                        : 'bg-blue-900/40 text-blue-100 hover:bg-blue-900/70 hover:text-white dark:bg-slate-900/60 dark:text-slate-300 dark:hover:bg-slate-800'
                    }`}
                  >
                    <PlatformLogo platform={platform.id} className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                    <span>{platform.shortName}</span>
                  </button>
                );
              })}
            </div>

            <div className="text-center">
              <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight leading-tight text-balance">
                {activeMeta.headline}
              </h1>
              <p className="mt-2 mx-auto max-w-2xl text-xs sm:text-sm text-blue-100 dark:text-slate-300 leading-relaxed">
                {activeMeta.subtitle}
              </p>

              {/* Input Form with Auto-Detected Platform Logo */}
              <form
                onSubmit={fetchMediaData}
                className="mt-4 sm:mt-6 mx-auto max-w-3xl"
                noValidate
              >
                <div className="flex flex-col sm:flex-row items-stretch gap-2.5 rounded-xl bg-white dark:bg-slate-900 p-2 shadow-lg border border-transparent dark:border-slate-700 transition-colors duration-200">
                  <div className="relative flex flex-1 items-center min-w-0">
                    {/* Dynamic Platform Logo Icon inside Input */}
                    <div
                      title={`Platform: ${detectedMeta.name}`}
                      className={`ml-1.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors duration-200 ${detectedMeta.brandBg}`}
                    >
                      <PlatformLogo platform={displayPlatform} className="h-4 w-4" />
                    </div>

                    <input
                      ref={inputRef}
                      type="url"
                      value={urlInput}
                      onChange={(e) => {
                        setUrlInput(e.target.value);
                        if (errorMessage) setErrorMessage(null);
                      }}
                      placeholder={activeMeta.placeholder}
                      aria-label="Tautan video atau media sosial"
                      className="min-w-0 w-full rounded-lg bg-transparent py-3 pl-3 pr-24 text-sm sm:text-base text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none"
                    />

                    <div className="absolute right-1.5 flex items-center gap-1">
                      {urlInput ? (
                        <button
                          type="button"
                          onClick={handleClearInput}
                          aria-label="Hapus tautan"
                          className="inline-flex items-center gap-1 rounded-md bg-slate-100 dark:bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer min-h-[34px]"
                        >
                          <X className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>Hapus</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={handlePaste}
                          className="inline-flex items-center gap-1.5 rounded-md bg-blue-50 dark:bg-blue-950/80 px-3 py-1.5 text-xs font-semibold text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors cursor-pointer min-h-[34px] whitespace-nowrap"
                        >
                          <ClipboardPaste className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>Tempel</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-6 py-3 text-sm sm:text-base font-bold text-white hover:bg-red-700 disabled:bg-red-400 transition-colors cursor-pointer min-h-[46px] shrink-0 whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                        <span>Memproses...</span>
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4" aria-hidden="true" />
                        <span>Unduh</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Live detected platform feedback */}
                {detectedPlatform && !errorMessage && (
                  <p className="mt-2.5 inline-flex items-center justify-center gap-1.5 text-xs font-medium text-blue-100 dark:text-blue-300">
                    <PlatformLogo platform={detectedPlatform} className="h-3.5 w-3.5" />
                    <span>Tautan terdeteksi: {getPlatformMeta(detectedPlatform).name}</span>
                  </p>
                )}

                {errorMessage && (
                  <div
                    role="alert"
                    className="mt-3 flex items-center justify-center gap-2 rounded-lg bg-red-950/50 border border-red-300/30 px-4 py-2.5 text-xs sm:text-sm text-white"
                  >
                    <AlertCircle className="h-4 w-4 shrink-0 text-red-200" aria-hidden="true" />
                    <span>{errorMessage}</span>
                  </div>
                )}
              </form>
            </div>
          </div>
        </section>

        {/* Adsterra Banner 728x90 directly below input section */}
        <section
          aria-label="Iklan Banner Utama"
          className="mx-auto max-w-6xl px-4 sm:px-6 pt-6 pb-2"
        >
          <AdBanner
            adKey="f499ca57b48e1b1f25dcfa51c742777f"
            width={728}
            height={90}
          />
        </section>

        {/* Loading Skeleton */}
        {isLoading && (
          <section className="mx-auto max-w-6xl px-4 sm:px-6 pt-6 pb-4">
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row gap-6 animate-pulse">
                <div className="mx-auto sm:mx-0 w-44 sm:w-48 aspect-[9/14] rounded-lg bg-slate-200 dark:bg-slate-800 shrink-0" />
                <div className="flex-1 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-slate-200 dark:bg-slate-800" />
                    <div className="space-y-2 flex-1">
                      <div className="h-4 w-40 rounded bg-slate-200 dark:bg-slate-800" />
                      <div className="h-3 w-28 rounded bg-slate-200 dark:bg-slate-800" />
                    </div>
                  </div>
                  <div className="h-4 w-full rounded bg-slate-200 dark:bg-slate-800" />
                  <div className="h-4 w-3/4 rounded bg-slate-200 dark:bg-slate-800" />
                  <div className="pt-3 space-y-2.5">
                    <div className="h-11 w-full rounded-lg bg-slate-200 dark:bg-slate-800" />
                    <div className="h-11 w-full rounded-lg bg-slate-200 dark:bg-slate-800" />
                    <div className="h-11 w-full rounded-lg bg-slate-200 dark:bg-slate-800" />
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Media Result + Side 300x250 Adsterra Banner */}
        {!isLoading && mediaResult && (
          <VideoResultCard
            media={mediaResult}
            onDownloadStandard={handleDownloadStandard}
            onOpenWatchAds={() => setIsWatchAdsOpen(true)}
            onDownloadMp3={handleDownloadMp3}
            onDownloadImage={handleDownloadImage}
            onReset={handleReset}
          />
        )}

        {/* Recent History Strip */}
        {history.length > 0 && (
          <section
            aria-label="Riwayat Unduhan Terakhir"
            className="mx-auto max-w-6xl px-4 sm:px-6 pt-6"
          >
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 transition-colors duration-200">
              <div className="flex items-center justify-between gap-4 mb-3.5">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                  <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" aria-hidden="true" />
                  <span>Riwayat Terakhir</span>
                </div>
                <button
                  type="button"
                  onClick={clearHistory}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors cursor-pointer py-1"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Hapus Riwayat</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {history.map((item) => {
                  const itemMeta = getPlatformMeta(item.platform);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleLoadFromHistory(item)}
                      className="flex items-center gap-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 p-2.5 text-left hover:border-blue-400 dark:hover:border-blue-600 hover:bg-blue-50/40 dark:hover:bg-slate-800/70 transition-colors cursor-pointer"
                    >
                      <div className="relative h-12 w-10 shrink-0 overflow-hidden rounded bg-slate-200 dark:bg-slate-800 flex items-center justify-center">
                        {item.cover ? (
                          <img
                            src={item.cover}
                            alt={item.authorName}
                            referrerPolicy="no-referrer"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <PlatformLogo
                            platform={item.platform}
                            className="h-5 w-5 text-slate-500"
                          />
                        )}
                        <span
                          className={`absolute bottom-0.5 right-0.5 flex h-4 w-4 items-center justify-center rounded ${itemMeta.brandBg}`}
                        >
                          <PlatformLogo platform={item.platform} className="h-2.5 w-2.5" />
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                          {item.authorName}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                          {itemMeta.shortName} · {item.title}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        <InfoSections onSelectPlatform={handleSelectPlatform} />
      </main>

      <Footer />

      {/* Watch Ads Modal (10s Countdown + Banner 300x250, NO Video/VAST) */}
      <WatchAdsModal
        isOpen={isWatchAdsOpen}
        videoTitle={mediaResult?.title || 'Video Kualitas HD'}
        hdLabel={mediaResult?.hdLabel}
        onClose={() => setIsWatchAdsOpen(false)}
        onDownloadHD={handleDownloadHD}
      />
    </div>
  );
}
