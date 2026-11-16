import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Check,
  Copy,
  Download,
  Flame,
  RefreshCw,
} from 'lucide-react';
import { getPlatformMeta, PlatformLogo } from './PlatformLogo';

export interface TrendingMediaItem {
  id: string;
  platform: 'tiktok' | 'youtube';
  title: string;
  author: string;
  url: string;
  thumbnail: string;
  views: number;
  likes: number;
  duration?: number;
  category: 'Populer' | 'Musik Viral' | 'Short & Tren';
}

interface TrendingViralSectionProps {
  apiBase?: string;
  onSelectTrendingUrl: (url: string) => void;
}

function formatViews(views: number): string {
  if (!views || views <= 0) return '';
  if (views >= 1_000_000_000) {
    return `${(views / 1_000_000_000).toFixed(1).replace(/\.0$/, '')}Mrd ditonton`;
  }
  if (views >= 1_000_000) {
    return `${(views / 1_000_000).toFixed(1).replace(/\.0$/, '')}Jt ditonton`;
  }
  if (views >= 1_000) {
    return `${(views / 1_000).toFixed(1).replace(/\.0$/, '')}Rb ditonton`;
  }
  return `${views.toLocaleString('id-ID')} ditonton`;
}

export default function TrendingViralSection({
  apiBase = '',
  onSelectTrendingUrl,
}: TrendingViralSectionProps) {
  const [items, setItems] = useState<TrendingMediaItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('Semua');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [failedThumbs, setFailedThumbs] = useState<Record<string, boolean>>({});
  const [showAll, setShowAll] = useState(false);

  const loadTrending = useCallback(
    async (forceRefresh = false) => {
      if (forceRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      try {
        const endpoint = `${apiBase}/api/trending${forceRefresh ? '?refresh=1' : ''}`;
        const res = await fetch(endpoint);
        const contentType = res.headers.get('content-type') || '';
        if (!res.ok || !contentType.includes('application/json')) {
          throw new Error('Server tren belum merespons.');
        }
        const json = (await res.json()) as {
          items?: TrendingMediaItem[];
          error?: string;
        };
        if (!Array.isArray(json.items) || json.items.length === 0) {
          throw new Error(json.error || 'Belum ada video viral yang tersedia saat ini.');
        }
        setItems(json.items);
        setFailedThumbs({});
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Gagal memuat daftar media viral hari ini.'
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [apiBase]
  );

  useEffect(() => {
    void loadTrending(false);
  }, [loadTrending]);

  const categories = useMemo(() => {
    const present = Array.from(new Set(items.map((item) => item.category)));
    return ['Semua', ...present];
  }, [items]);

  const filteredItems = useMemo(() => {
    if (activeCategory === 'Semua') return items;
    return items.filter((item) => item.category === activeCategory);
  }, [activeCategory, items]);

  const visibleItems = useMemo(
    () => (showAll ? filteredItems : filteredItems.slice(0, 6)),
    [filteredItems, showAll]
  );

  const handleCopyLink = async (item: TrendingMediaItem) => {
    try {
      await navigator.clipboard.writeText(item.url);
      setCopiedId(item.id);
      window.setTimeout(() => {
        setCopiedId((prev) => (prev === item.id ? null : prev));
      }, 2000);
    } catch {
      onSelectTrendingUrl(item.url);
    }
  };

  return (
    <section
      id="media-viral"
      aria-label="Media Viral Hari Ini"
      className="mx-auto max-w-6xl px-4 sm:px-6 pb-8 pt-2"
    >
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-xs transition-colors duration-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-rose-50 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400">
                <Flame className="h-4 w-4" aria-hidden="true" />
              </span>
              <h2 className="font-display text-base sm:text-lg font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
                Media Viral Hari Ini
              </h2>
            </div>
            <p className="mt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              Belum punya tautan? Pilih video populer langsung dari API untuk inspirasi unduhan instan.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {categories.length > 1 && (
              <div
                role="group"
                aria-label="Filter kategori media viral"
                className="flex items-center gap-1 rounded-lg bg-slate-100 dark:bg-slate-800 p-1 overflow-x-auto no-scrollbar"
              >
                {categories.map((cat) => {
                  const isActive = activeCategory === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => {
                        setActiveCategory(cat);
                        setShowAll(false);
                      }}
                      className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                        isActive
                          ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>
            )}

            <button
              type="button"
              onClick={() => void loadTrending(true)}
              disabled={isLoading || isRefreshing}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-60"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`}
                aria-hidden="true"
              />
              <span>Segarkan</span>
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 animate-pulse">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div
                key={idx}
                className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 overflow-hidden"
              >
                <div className="aspect-video bg-slate-200 dark:bg-slate-800" />
                <div className="p-3 space-y-2">
                  <div className="h-4 w-5/6 rounded bg-slate-200 dark:bg-slate-800" />
                  <div className="h-3 w-1/2 rounded bg-slate-200 dark:bg-slate-800" />
                  <div className="h-9 w-full rounded-lg bg-slate-200 dark:bg-slate-800" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 p-4 text-center sm:text-left">
            <div className="flex items-center gap-2.5 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
              <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={() => void loadTrending(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 px-3.5 py-2 text-xs font-semibold text-white transition-colors cursor-pointer shrink-0"
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Coba Lagi</span>
            </button>
          </div>
        ) : (
          <>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {visibleItems.map((item, idx) => {
                const meta = getPlatformMeta(item.platform);
                const viewLabel = formatViews(item.views);
                const thumbFailed = Boolean(failedThumbs[item.id]);

                return (
                  <article
                    key={item.id}
                    className="group flex flex-col justify-between overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 hover:border-blue-400 dark:hover:border-blue-600 transition-colors"
                  >
                    <div>
                      <div className="relative aspect-video w-full overflow-hidden bg-slate-900">
                        {item.thumbnail && !thumbFailed ? (
                          <img
                            src={item.thumbnail}
                            alt={`Thumbnail ${item.title}`}
                            referrerPolicy="no-referrer"
                            loading="lazy"
                            onError={() =>
                              setFailedThumbs((prev) => ({ ...prev, [item.id]: true }))
                            }
                            className="h-full w-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                          />
                        ) : (
                          <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-slate-800 to-slate-950 text-slate-300 p-3 text-center">
                            <PlatformLogo platform={item.platform} className="h-7 w-7 mb-1.5" />
                            <span className="text-xs font-medium truncate max-w-full">
                              {meta.shortName}
                            </span>
                          </div>
                        )}

                        <div
                          className={`absolute top-2 left-2 inline-flex h-7 w-7 items-center justify-center rounded-md shadow-sm ${meta.brandBg}`}
                          title={meta.name}
                        >
                          <PlatformLogo platform={item.platform} className="h-3.5 w-3.5" />
                        </div>

                        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/80 via-black/35 to-transparent px-2.5 py-1.5 text-[11px] font-medium text-white">
                          <span className="font-mono tabular-nums font-bold">
                            #{idx + 1}
                          </span>
                          <span>{item.category}</span>
                        </div>
                      </div>

                      <div className="p-3">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 line-clamp-2 leading-snug">
                          {item.title}
                        </h3>
                        <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 truncate">
                          <span>{item.author}</span>
                          <span className="mx-1.5 text-slate-300 dark:text-slate-600" aria-hidden="true">
                            ·
                          </span>
                          <span>{meta.shortName}</span>
                          {viewLabel && (
                            <>
                              <span className="mx-1.5 text-slate-300 dark:text-slate-600" aria-hidden="true">
                                ·
                              </span>
                              <span className="font-mono tabular-nums">{viewLabel}</span>
                            </>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 px-3 pb-3">
                      <button
                        type="button"
                        onClick={() => onSelectTrendingUrl(item.url)}
                        className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 hover:scale-[1.02] active:scale-[0.98] px-3 py-2 text-xs font-semibold text-white transition-all duration-200 cursor-pointer min-h-[40px] whitespace-nowrap"
                      >
                        <Download className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        <span>Proses &amp; Unduh</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => void handleCopyLink(item)}
                        aria-label={`Salin tautan ${item.title}`}
                        title="Salin tautan video"
                        className="inline-flex items-center justify-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer min-h-[40px] whitespace-nowrap shrink-0"
                      >
                        {copiedId === item.id ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                            <span>Tersalin</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                            <span>Salin</span>
                          </>
                        )}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>

            {filteredItems.length > 6 && (
              <div className="mt-4 flex justify-center">
                <button
                  type="button"
                  onClick={() => setShowAll((prev) => !prev)}
                  className="inline-flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer min-h-[38px]"
                >
                  {showAll
                    ? 'Tampilkan Lebih Sedikit'
                    : `Lihat Semua (${filteredItems.length} Video Viral)`}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
