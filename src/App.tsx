import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import {
  AlertCircle,
  Bug,
  CheckCircle2,
  ClipboardPaste,
  Clock,
  Download,
  FolderOpen,
  Layers,
  Loader2,
  Search,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import Header from './components/Header';
import AdBanner from './components/AdBanner';
import VideoResultCard from './components/VideoResultCard';
import WatchAdsModal from './components/WatchAdsModal';
import QrShareModal from './components/QrShareModal';
import OfflineIndicator from './components/OfflineIndicator';
import InfoSections from './components/InfoSections';
import Footer from './components/Footer';
import AuthModal from './components/AuthModal';
import ProfileView from './components/ProfileView';
import MobileBottomNav from './components/MobileBottomNav';
import LegalAndReportModal, { type LegalModalTab } from './components/LegalAndReportModal';
import {
  AuthProvider,
  COLLECTION_FOLDERS,
  useAuth,
  type CollectionFolder,
} from './contexts/AuthContext';
import {
  cleanSocialUrlForShare,
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
type HistoryFilter = 'all' | 'favorites' | SocialPlatform;
type FilenameMode = 'default' | 'title';

interface DownloadHistoryItem {
  platform: SocialPlatform;
  id: string;
  url: string;
  title: string;
  authorName: string;
  uniqueId: string;
  cover: string;
  savedAt: number;
  isFavorite?: boolean;
  collectionFolder?: CollectionFolder;
}

interface BatchQueueItem {
  url: string;
  data?: MediaDownloadResult;
  error?: string;
}

const THEME_STORAGE_KEY = 'zonesaveall-theme';
const HISTORY_STORAGE_KEY = 'zonesaveall-history';
const FILENAME_MODE_STORAGE_KEY = 'zonesaveall-filename-mode';
const AUTO_CLIPBOARD_STORAGE_KEY = 'zonesaveall-auto-clipboard';
const LEGACY_THEME_KEY = 'zonesavetik-theme';
const LEGACY_HISTORY_KEY = 'zonesavetik-history';
const API_BASE = (
  (typeof window !== 'undefined'
    ? (window as unknown as { __ZONESAVE_API_BASE__?: string }).__ZONESAVE_API_BASE__
    : '') || ''
).replace(/\/$/, '');

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

function ZoneSaveAllContent() {
  const inputRef = useRef<HTMLInputElement>(null);
  const {
    user,
    profile,
    cloudHistory,
    syncDownloadToCloud,
    toggleCloudFavorite,
    updateCloudFolder,
    removeCloudItem,
  } = useAuth();

  const [activePage, setActivePage] = useState<'home' | 'profile'>('home');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

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
          return parsed.slice(0, 12).map((item) => ({
            ...item,
            platform: item.platform || 'tiktok',
            collectionFolder: COLLECTION_FOLDERS.includes(item.collectionFolder)
              ? item.collectionFolder
              : 'Umum',
          }));
        }
      }
    } catch {
      // ignore storage errors
    }
    return [];
  });

  const [urlInput, setUrlInput] = useState('');
  const [batchInput, setBatchInput] = useState('');
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [batchResults, setBatchResults] = useState<BatchQueueItem[]>([]);
  const [activeSourceUrl, setActiveSourceUrl] = useState('');
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>('all');
  const [historyFolderFilter, setHistoryFolderFilter] = useState<'all' | CollectionFolder>('all');
  const [historySearch, setHistorySearch] = useState('');
  const [filenameMode, setFilenameMode] = useState<FilenameMode>(() => {
    try {
      const saved = localStorage.getItem(FILENAME_MODE_STORAGE_KEY);
      if (saved === 'title' || saved === 'default') return saved;
    } catch {
      // ignore storage errors
    }
    return 'default';
  });
  const [autoClipboard, setAutoClipboard] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(AUTO_CLIPBOARD_STORAGE_KEY);
      if (saved === 'false') return false;
    } catch {
      // ignore storage errors
    }
    return true;
  });
  const [clipboardSuggestion, setClipboardSuggestion] = useState<{
    url: string;
    platform: SocialPlatform;
  } | null>(null);
  const dismissedClipboardRef = useRef<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [mediaResult, setMediaResult] = useState<MediaDownloadResult | null>(null);
  const [isWatchAdsOpen, setIsWatchAdsOpen] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [legalModal, setLegalModal] = useState<{
    isOpen: boolean;
    tab: LegalModalTab;
    prefillUrl: string;
    prefillPlatform: string;
  }>({
    isOpen: false,
    tab: 'privacy',
    prefillUrl: '',
    prefillPlatform: 'umum',
  });

  useEffect(() => {
    if (!user && activePage === 'profile') {
      setActivePage('home');
    }
  }, [activePage, user]);

  useEffect(() => {
    if (profile?.preferredFilenameMode) {
      setFilenameMode(profile.preferredFilenameMode);
    }
    if (typeof profile?.autoClipboard === 'boolean') {
      setAutoClipboard(profile.autoClipboard);
    }
  }, [profile?.autoClipboard, profile?.preferredFilenameMode]);

  const detectedPlatform = useMemo(
    () => detectPlatformFromUrl(isBatchMode ? batchInput.split(/\s+/)[0] || '' : urlInput),
    [batchInput, isBatchMode, urlInput]
  );
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
    try {
      localStorage.setItem(FILENAME_MODE_STORAGE_KEY, filenameMode);
    } catch {
      // ignore storage errors
    }
  }, [filenameMode]);

  useEffect(() => {
    try {
      localStorage.setItem(AUTO_CLIPBOARD_STORAGE_KEY, String(autoClipboard));
    } catch {
      // ignore storage errors
    }
  }, [autoClipboard]);

  const checkClipboardSilently = useCallback(async () => {
    if (
      !autoClipboard ||
      typeof window === 'undefined' ||
      isBatchMode ||
      urlInput.trim().length > 0 ||
      !navigator.clipboard?.readText ||
      !navigator.permissions?.query
    ) {
      return;
    }
    try {
      const status = await navigator.permissions.query({
        name: 'clipboard-read' as PermissionName,
      });
      if (status.state !== 'granted') return;
      const text = (await navigator.clipboard.readText()).trim();
      const match = text.match(/https?:\/\/[^\s<>"']+/i);
      const rawUrl = match ? match[0] : text;
      const platform = detectPlatformFromUrl(rawUrl);
      if (!platform) return;
      const cleanUrl = cleanSocialUrlForShare(rawUrl);
      if (
        !cleanUrl ||
        cleanUrl === activeSourceUrl ||
        cleanUrl === dismissedClipboardRef.current
      ) {
        return;
      }
      setClipboardSuggestion({ url: cleanUrl, platform });
    } catch {
      // ignore denied or unsupported clipboard permissions
    }
  }, [activeSourceUrl, autoClipboard, isBatchMode, urlInput]);

  useEffect(() => {
    const onWindowFocus = () => {
      void checkClipboardSilently();
    };
    window.addEventListener('focus', onWindowFocus);
    return () => window.removeEventListener('focus', onWindowFocus);
  }, [checkClipboardSilently]);

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
    const entryId = `${data.platform}_${data.id}`.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 128);
    const entry: DownloadHistoryItem = {
      platform: data.platform,
      id: entryId,
      url: sourceUrl,
      title: data.title || `Media ${data.platform}`,
      authorName: data.author.nickname,
      uniqueId: data.author.uniqueId,
      cover: data.cover,
      savedAt: Date.now(),
      isFavorite: false,
      collectionFolder: 'Umum',
    };

    setHistory((prev) => {
      const existing = prev.find((item) => item.id === entryId);
      const mergedEntry: DownloadHistoryItem = {
        ...entry,
        isFavorite: existing?.isFavorite ?? false,
        collectionFolder: existing?.collectionFolder || 'Umum',
      };
      const filtered = prev.filter((item) => item.id !== entryId);
      const favorites = filtered.filter((item) => item.isFavorite);
      const nonFavorites = filtered.filter((item) => !item.isFavorite);
      const next = [mergedEntry, ...favorites, ...nonFavorites].slice(0, 12);
      try {
        localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore storage errors
      }
      return next;
    });

    if (user?.emailVerified) {
      void syncDownloadToCloud(entry).catch((err) => {
        console.warn('Cloud sync failed:', err);
      });
    }
  };

  const mergedHistory = useMemo(() => {
    if (!user || cloudHistory.length === 0) return history;
    const map = new Map<string, DownloadHistoryItem>();
    for (const item of cloudHistory) {
      map.set(item.id, item);
    }
    for (const item of history) {
      if (!map.has(item.id)) {
        map.set(item.id, item);
      }
    }
    return Array.from(map.values())
      .sort((a, b) => {
        if (Boolean(a.isFavorite) !== Boolean(b.isFavorite)) {
          return a.isFavorite ? -1 : 1;
        }
        return b.savedAt - a.savedAt;
      })
      .slice(0, 24);
  }, [cloudHistory, history, user]);

  const toggleFavorite = (id: string) => {
    const currentItem = mergedHistory.find((item) => item.id === id);
    if (!currentItem) return;
    const nextFav = !currentItem.isFavorite;

    setHistory((prev) => {
      const next = prev.map((item) =>
        item.id === id ? { ...item, isFavorite: nextFav } : item
      );
      try {
        localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore storage errors
      }
      return next;
    });

    if (user?.emailVerified) {
      if (cloudHistory.some((item) => item.id === id)) {
        void toggleCloudFavorite(id, nextFav).catch((err) => {
          console.warn('Cloud favorite toggle failed:', err);
        });
      } else {
        void syncDownloadToCloud({
          ...currentItem,
          isFavorite: nextFav,
        }).catch((err) => {
          console.warn('Cloud favorite sync failed:', err);
        });
      }
    }
  };

  const changeItemFolder = (id: string, folder: CollectionFolder) => {
    const currentItem = mergedHistory.find((item) => item.id === id);

    setHistory((prev) => {
      const next = prev.map((item) =>
        item.id === id ? { ...item, collectionFolder: folder } : item
      );
      try {
        localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore storage errors
      }
      return next;
    });

    if (user?.emailVerified) {
      if (cloudHistory.some((item) => item.id === id)) {
        void updateCloudFolder(id, folder).catch((err) => {
          console.warn('Cloud folder update failed:', err);
        });
      } else if (currentItem) {
        void syncDownloadToCloud({
          ...currentItem,
          collectionFolder: folder,
        }).catch((err) => {
          console.warn('Cloud folder sync failed:', err);
        });
      }
    }
  };

  const localUnsyncedItems = useMemo(() => {
    if (!user?.emailVerified) return [];
    const cloudIds = new Set(cloudHistory.map((item) => item.id));
    return history.filter((item) => !cloudIds.has(item.id));
  }, [cloudHistory, history, user?.emailVerified]);

  const handleSyncLocalToCloud = async () => {
    if (!user?.emailVerified || localUnsyncedItems.length === 0) return;
    for (const item of localUnsyncedItems) {
      await syncDownloadToCloud(item);
    }
  };

  const clearLocalHistoryCache = () => {
    setHistory([]);
    try {
      localStorage.removeItem(HISTORY_STORAGE_KEY);
      localStorage.removeItem(LEGACY_HISTORY_KEY);
    } catch {
      // ignore storage errors
    }
  };

  const clearHistory = () => {
    const nonFavCloudIds = cloudHistory
      .filter((item) => !item.isFavorite)
      .map((item) => item.id);

    setHistory((prev) => {
      const favoritesOnly = prev.filter((item) => item.isFavorite);
      const next = favoritesOnly.length === prev.length ? [] : favoritesOnly;
      try {
        if (next.length === 0) {
          localStorage.removeItem(HISTORY_STORAGE_KEY);
        } else {
          localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(next));
        }
      } catch {
        // ignore storage errors
      }
      return next;
    });

    if (user?.emailVerified && nonFavCloudIds.length > 0) {
      for (const id of nonFavCloudIds) {
        void removeCloudItem(id).catch((err) => {
          console.warn('Cloud item remove failed:', err);
        });
      }
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

  const resolveSingleMedia = async (normalizedUrl: string): Promise<MediaDownloadResult> => {
    const detected = detectPlatformFromUrl(normalizedUrl);
    let apiResponse: globalThis.Response | null = null;

    try {
      apiResponse = await fetch(`${API_BASE}/api/media`, {
        method: 'POST',
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
        return result as MediaDownloadResult;
      }
    }

    if (detected === 'tiktok') {
      return parseDirectTikWm(normalizedUrl);
    }

    throw new Error('Server pengunduh tidak merespons. Silakan coba lagi.');
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
    setBatchResults([]);

    try {
      const resolved = await resolveSingleMedia(normalizedUrl);
      setMediaResult(resolved);
      setActiveSourceUrl(normalizedUrl);
      saveToHistory(resolved, normalizedUrl);
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

  const runBatchLookup = async (rawText: string) => {
    const rawLines = rawText
      .split(/[\n\r\s]+/)
      .map((item) => item.trim())
      .filter(Boolean);
    const uniqueUrls = Array.from(new Set(rawLines.map(normalizeUserLink))).slice(0, 5);

    if (uniqueUrls.length === 0) {
      setErrorMessage('Tempel minimal 1 tautan video atau media (maksimal 5 tautan).');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setBatchResults([]);

    try {
      const settled = await Promise.all(
        uniqueUrls.map(async (url): Promise<BatchQueueItem> => {
          try {
            const data = await resolveSingleMedia(url);
            saveToHistory(data, url);
            return { url, data };
          } catch (err) {
            return {
              url,
              error: err instanceof Error ? err.message : 'Gagal mengambil media.',
            };
          }
        })
      );

      setBatchResults(settled);
      const firstValid = settled.find((item) => item.data);
      if (firstValid?.data) {
        setMediaResult(firstValid.data);
        setActiveSourceUrl(firstValid.url);
      } else {
        setMediaResult(null);
        setErrorMessage('Semua tautan pada antrean gagal diambil. Periksa tautan Anda.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const processSharedCandidate = (rawCandidate: string) => {
      const extracted = rawCandidate.match(/https?:\/\/[^\s<>"']+/i)?.[0] || '';
      if (!extracted) return;
      const cleaned = cleanSocialUrlForShare(extracted);
      setActivePage('home');
      setIsBatchMode(false);
      setUrlInput(cleaned);
      const detected = detectPlatformFromUrl(cleaned);
      if (detected) setActiveTab(detected);
      void runMediaLookup(cleaned);
    };

    const params = new URLSearchParams(window.location.search);
    const paramUrl = params.get('url')?.trim() || '';
    const paramText = params.get('text')?.trim() || '';
    const paramTitle = params.get('title')?.trim() || '';
    const rawCandidate = paramUrl || paramText;
    const extracted = rawCandidate.match(/https?:\/\/[^\s<>"']+/i)?.[0] || paramUrl;

    if (extracted) {
      processSharedCandidate(extracted);
      if (paramText || paramTitle || cleanSocialUrlForShare(extracted) !== extracted) {
        window.history.replaceState(null, '', '/');
      }
    } else {
      const pending = (window as unknown as { __ZONESAVE_SHARED_TEXT__?: string })
        .__ZONESAVE_SHARED_TEXT__;
      if (pending) {
        (window as unknown as { __ZONESAVE_SHARED_TEXT__?: string }).__ZONESAVE_SHARED_TEXT__ = '';
        processSharedCandidate(pending);
      }
    }

    const onNativeShared = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail;
      if (typeof detail === 'string' && detail.trim()) {
        processSharedCandidate(detail);
      }
    };

    window.addEventListener('zonesave-shared-url', onNativeShared);
    return () => window.removeEventListener('zonesave-shared-url', onNativeShared);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchMediaData = async (e: FormEvent) => {
    e.preventDefault();
    setClipboardSuggestion(null);
    if (isBatchMode) {
      await runBatchLookup(batchInput);
      return;
    }
    const lines = urlInput
      .split(/[\n\r]+/)
      .map((item) => item.trim())
      .filter(Boolean);
    if (lines.length > 1) {
      setIsBatchMode(true);
      setBatchInput(urlInput);
      await runBatchLookup(urlInput);
      return;
    }
    await runMediaLookup(urlInput);
  };

  const handleLoadFromHistory = async (item: DownloadHistoryItem) => {
    setIsBatchMode(false);
    setClipboardSuggestion(null);
    setUrlInput(item.url);
    await runMediaLookup(item.url);
    window.scrollTo({ top: 240, behavior: 'smooth' });
  };

  const buildDownloadFilename = (media: MediaDownloadResult, suffix = ''): string => {
    if (filenameMode === 'title' && media.title) {
      const sanitizedTitle = media.title
        .replace(/#[\p{L}\p{N}_]+/gu, '')
        .replace(/[^\p{L}\p{N}\s_-]/gu, '')
        .trim()
        .replace(/\s+/g, '_')
        .slice(0, 48);
      if (sanitizedTitle) {
        return `zonesaveall_${sanitizedTitle}${suffix}`;
      }
    }
    const safeUser = (media.author.uniqueId || 'user').slice(0, 24);
    const safeId = (media.id || 'media').slice(0, 24);
    return `zonesaveall_${media.platform}${suffix}_${safeUser}_${safeId}`;
  };

  const triggerFileDownload = (
    mediaUrl: string,
    filename: string,
    type: 'mp4' | 'mp3' | 'jpg'
  ) => {
    if (!mediaUrl) return;
    const downloadUrl = `${API_BASE}/api/download?url=${encodeURIComponent(
      mediaUrl
    )}&filename=${encodeURIComponent(filename)}&type=${type}`;
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
    triggerFileDownload(targetUrl, buildDownloadFilename(mediaResult), 'mp4');
  };

  const handleDownloadHD = () => {
    if (!mediaResult) return;
    const targetUrl = mediaResult.hdplay || mediaResult.play;
    triggerFileDownload(targetUrl, buildDownloadFilename(mediaResult, '_HD'), 'mp4');
  };

  const handleDownloadMp3 = () => {
    if (!mediaResult?.music) return;
    triggerFileDownload(mediaResult.music, buildDownloadFilename(mediaResult, '_audio'), 'mp3');
  };

  const handleDownloadImage = (overrideUrl?: string, slideIndex?: number) => {
    const targetUrl = overrideUrl || mediaResult?.image;
    if (!targetUrl || !mediaResult) return;
    const suffix = slideIndex ? `_slide${slideIndex}` : '';
    triggerFileDownload(targetUrl, buildDownloadFilename(mediaResult, suffix), 'jpg');
  };

  const handleReset = () => {
    setMediaResult(null);
    setBatchResults([]);
    setActiveSourceUrl('');
    setUrlInput('');
    setBatchInput('');
    setErrorMessage(null);
    focusInput();
  };

  const shareableQuickUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    const source = cleanSocialUrlForShare(activeSourceUrl || urlInput);
    if (!source) return window.location.origin;
    return `${window.location.origin}/?url=${encodeURIComponent(source)}`;
  }, [activeSourceUrl, urlInput]);

  const filteredHistory = useMemo(() => {
    const q = historySearch.trim().toLowerCase();
    return mergedHistory.filter((item) => {
      if (historyFilter === 'favorites' && !item.isFavorite) return false;
      if (
        historyFilter !== 'all' &&
        historyFilter !== 'favorites' &&
        item.platform !== historyFilter
      ) {
        return false;
      }
      const folder = item.collectionFolder || 'Umum';
      if (historyFolderFilter !== 'all' && folder !== historyFolderFilter) return false;
      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q) ||
        item.authorName.toLowerCase().includes(q) ||
        item.uniqueId.toLowerCase().includes(q) ||
        item.platform.toLowerCase().includes(q)
      );
    });
  }, [historyFilter, historyFolderFilter, historySearch, mergedHistory]);

  const historyPlatforms = useMemo(
    () => Array.from(new Set(mergedHistory.map((item) => item.platform))),
    [mergedHistory]
  );

  const folderCounts = useMemo(() => {
    const counts: Record<CollectionFolder, number> = {
      Umum: 0,
      'Ide Konten': 0,
      'Sound Viral': 0,
      Referensi: 0,
    };
    for (const item of mergedHistory) {
      const folder = item.collectionFolder || 'Umum';
      if (folder in counts) {
        counts[folder] += 1;
      }
    }
    return counts;
  }, [mergedHistory]);

  const hasNonFavoriteHistory = useMemo(
    () => mergedHistory.some((item) => !item.isFavorite),
    [mergedHistory]
  );

  const displayUserName = profile?.displayName || user?.displayName || 'Profil';
  const displayUserPhoto = profile?.photoDataUrl || user?.photoURL || '';

  const openLegalModal = (
    tab: LegalModalTab,
    prefillUrl = '',
    prefillPlatform = 'umum'
  ) => {
    setLegalModal({
      isOpen: true,
      tab,
      prefillUrl,
      prefillPlatform,
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 transition-colors duration-200">
      <Header
        theme={theme}
        onToggleTheme={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
        isSignedIn={Boolean(user)}
        userName={displayUserName}
        userPhoto={displayUserPhoto}
        onGoHome={() => setActivePage('home')}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onOpenProfile={() => setActivePage('profile')}
      />

      <main className="flex-1">
        {activePage === 'profile' && user ? (
          <ProfileView
            onBack={() => setActivePage('home')}
            onSelectMediaItem={(item) => {
              setActivePage('home');
              void handleLoadFromHistory(item);
            }}
            onSyncFilenameMode={(mode) => setFilenameMode(mode)}
            autoClipboard={autoClipboard}
            onSyncAutoClipboard={(enabled) => setAutoClipboard(enabled)}
            onClearLocalCache={clearLocalHistoryCache}
            onOpenLegal={(tab) => openLegalModal(tab, activeSourceUrl || urlInput, displayPlatform)}
            localUnsyncedCount={localUnsyncedItems.length}
            onSyncLocalToCloud={handleSyncLocalToCloud}
          />
        ) : (
          <>
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

              {/* Input Form with Auto-Detected Platform Logo & Single / Multi-Link Toggle */}
              <form
                onSubmit={fetchMediaData}
                className="mt-4 sm:mt-6 mx-auto max-w-3xl"
                noValidate
              >
                <div className="flex flex-col sm:flex-row items-stretch gap-2.5 rounded-xl bg-white dark:bg-slate-900 p-2 shadow-lg border border-transparent dark:border-slate-700 transition-colors duration-200">
                  {isBatchMode ? (
                    <div className="relative flex flex-1 items-start min-w-0">
                      <textarea
                        rows={3}
                        value={batchInput}
                        onChange={(e) => {
                          setBatchInput(e.target.value);
                          if (errorMessage) setErrorMessage(null);
                        }}
                        placeholder="Tempel hingga 5 tautan sekaligus (1 tautan per baris)..."
                        aria-label="Daftar tautan multi-link"
                        className="min-w-0 w-full resize-none rounded-lg bg-transparent p-2.5 text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none"
                      />
                    </div>
                  ) : (
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
                        onFocus={() => void checkClipboardSilently()}
                        onChange={(e) => {
                          setUrlInput(e.target.value);
                          setClipboardSuggestion(null);
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
                  )}

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
                        <span>{isBatchMode ? 'Proses Antrean' : 'Unduh'}</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Compact Batch Mode Switch + Live Detected Platform Feedback */}
                <div className="mt-2.5 flex flex-wrap items-center justify-center gap-3 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setIsBatchMode((prev) => !prev);
                      setErrorMessage(null);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-md bg-blue-900/45 hover:bg-blue-900/70 px-2.5 py-1 font-medium text-blue-100 transition-colors cursor-pointer"
                  >
                    <Layers className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>{isBatchMode ? 'Kembali ke 1 Link' : 'Mode Multi-Link (Maks 5)'}</span>
                  </button>

                  {detectedPlatform && !errorMessage && !isBatchMode && (
                    <span className="inline-flex items-center gap-1.5 font-medium text-blue-100 dark:text-blue-300">
                      <PlatformLogo platform={detectedPlatform} className="h-3.5 w-3.5" />
                      <span>Terdeteksi: {getPlatformMeta(detectedPlatform).name}</span>
                    </span>
                  )}
                </div>

                {clipboardSuggestion && !urlInput && !isBatchMode && (
                  <div className="mt-2 flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const suggested = clipboardSuggestion.url;
                        setClipboardSuggestion(null);
                        setUrlInput(suggested);
                        void runMediaLookup(suggested);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-white/95 dark:bg-slate-900/95 px-3 py-1.5 text-xs font-semibold text-slate-900 dark:text-slate-100 shadow-sm hover:bg-white transition-colors cursor-pointer"
                    >
                      <PlatformLogo
                        platform={clipboardSuggestion.platform}
                        className="h-3.5 w-3.5 shrink-0"
                      />
                      <span>
                        Tautan {getPlatformMeta(clipboardSuggestion.platform).shortName} terdeteksi ·
                        Tempel &amp; Unduh
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        dismissedClipboardRef.current = clipboardSuggestion.url;
                        setClipboardSuggestion(null);
                      }}
                      aria-label="Abaikan saran clipboard"
                      className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-blue-950/50 text-blue-100 hover:bg-blue-950/80 cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>
                )}

                {errorMessage && (
                  <div
                    role="alert"
                    className="mt-3 flex flex-wrap items-center justify-center gap-2.5 rounded-lg bg-red-950/50 border border-red-300/30 px-4 py-2.5 text-xs sm:text-sm text-white"
                  >
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 shrink-0 text-red-200" aria-hidden="true" />
                      <span>{errorMessage}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        openLegalModal(
                          'report',
                          urlInput || activeSourceUrl,
                          detectPlatformFromUrl(urlInput) || displayPlatform
                        )
                      }
                      className="inline-flex items-center gap-1 rounded-md bg-white/15 hover:bg-white/25 px-2.5 py-1 text-xs font-semibold text-white transition-colors cursor-pointer"
                    >
                      <Bug className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Laporkan Link</span>
                    </button>
                  </div>
                )}
              </form>
            </div>
          </div>
        </section>

        {/* Adsterra Banner 728x90 directly below input section */}
        <section
          aria-label="Iklan Banner Utama"
          className="mx-auto max-w-6xl px-4 sm:px-6 pt-5 pb-2"
        >
          <AdBanner
            adKey="f499ca57b48e1b1f25dcfa51c742777f"
            width={728}
            height={90}
          />
        </section>

        {/* Loading Skeleton */}
        {isLoading && (
          <section className="mx-auto max-w-6xl px-4 sm:px-6 pt-5 pb-4">
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

        {/* Batch Multi-Link Queue Strip */}
        {!isLoading && batchResults.length > 1 && (
          <section
            aria-label="Antrean Multi-Link"
            className="mx-auto max-w-6xl px-4 sm:px-6 pt-5"
          >
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 transition-colors duration-200">
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                  <Layers className="h-4 w-4 text-blue-600 dark:text-blue-400" aria-hidden="true" />
                  <span>Antrean Multi-Link ({batchResults.length})</span>
                </div>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Klik item untuk pratinjau &amp; opsi lengkap
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {batchResults.map((item, idx) => {
                  const isSelected = Boolean(
                    item.data && mediaResult && item.data.id === mediaResult.id
                  );
                  return (
                    <div
                      key={`${item.url}-${idx}`}
                      className={`flex items-center justify-between gap-2.5 rounded-lg border p-2.5 transition-colors ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30'
                          : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50'
                      }`}
                    >
                      {item.data ? (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setMediaResult(item.data!);
                              setActiveSourceUrl(item.url);
                            }}
                            className="flex flex-1 items-center gap-2.5 min-w-0 text-left cursor-pointer"
                          >
                            <CheckCircle2
                              className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400"
                              aria-hidden="true"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                                {item.data.author.nickname}
                              </p>
                              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                {getPlatformMeta(item.data.platform).shortName} · {item.data.title}
                              </p>
                            </div>
                          </button>

                          {item.data.play && (
                            <button
                              type="button"
                              onClick={() =>
                                triggerFileDownload(
                                  item.data!.play,
                                  buildDownloadFilename(item.data!),
                                  'mp4'
                                )
                              }
                              title="Unduh cepat MP4"
                              className="shrink-0 rounded-md bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 cursor-pointer"
                            >
                              MP4
                            </button>
                          )}
                        </>
                      ) : (
                        <div className="flex items-center gap-2 min-w-0">
                          <AlertCircle
                            className="h-4 w-4 shrink-0 text-red-500"
                            aria-hidden="true"
                          />
                          <span className="text-xs text-red-600 dark:text-red-400 truncate">
                            {item.error || 'Gagal memuat tautan'}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* Media Result + Side 300x250 Adsterra Banner */}
        {!isLoading && mediaResult && (
          <VideoResultCard
            media={mediaResult}
            filenameMode={filenameMode}
            onToggleFilenameMode={() =>
              setFilenameMode((prev) => (prev === 'default' ? 'title' : 'default'))
            }
            onDownloadStandard={handleDownloadStandard}
            onOpenWatchAds={() => setIsWatchAdsOpen(true)}
            onDownloadMp3={handleDownloadMp3}
            onDownloadImage={handleDownloadImage}
            onOpenQr={() => setIsQrModalOpen(true)}
            onReportLink={() =>
              openLegalModal('report', activeSourceUrl || urlInput, mediaResult.platform)
            }
            onReset={handleReset}
          />
        )}

        {/* Recent History Strip with Search, Folder Collections, Platform Filter & Favorites */}
        {mergedHistory.length > 0 && (
          <section
            id="riwayat-section"
            aria-label="Riwayat Unduhan Terakhir"
            className="mx-auto max-w-6xl px-4 sm:px-6 pt-5 scroll-mt-20"
          >
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 transition-colors duration-200">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                  <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" aria-hidden="true" />
                  <span>Riwayat &amp; Koleksi ({filteredHistory.length})</span>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setHistoryFilter('all')}
                    className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer ${
                      historyFilter === 'all'
                        ? 'bg-blue-700 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    Semua
                  </button>
                  <button
                    type="button"
                    onClick={() => setHistoryFilter('favorites')}
                    className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer ${
                      historyFilter === 'favorites'
                        ? 'bg-amber-500 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    <Star className="h-3 w-3" aria-hidden="true" />
                    <span>Favorit</span>
                  </button>
                  {historyPlatforms.map((plat) => (
                    <button
                      key={plat}
                      type="button"
                      onClick={() => setHistoryFilter(plat)}
                      className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer ${
                        historyFilter === plat
                          ? 'bg-blue-700 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {getPlatformMeta(plat).shortName}
                    </button>
                  ))}

                  <button
                    type="button"
                    onClick={clearHistory}
                    className="ml-1 inline-flex items-center gap-1 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors cursor-pointer py-1 px-1.5"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>{hasNonFavoriteHistory ? 'Bersihkan' : 'Hapus Semua'}</span>
                  </button>
                </div>
              </div>

              {/* Quick Search & Folder Filter Row */}
              <div className="mb-3 flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400"
                    aria-hidden="true"
                  />
                  <input
                    type="search"
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    placeholder="Cari riwayat berdasarkan judul atau kreator..."
                    aria-label="Cari riwayat unduhan"
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 py-1.5 pl-8 pr-3 text-xs text-slate-900 dark:text-slate-100 focus:border-blue-500 focus:outline-none min-h-[36px]"
                  />
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 dark:text-slate-400 shrink-0">
                    <FolderOpen className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Folder Koleksi Saya:</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setHistoryFolderFilter('all')}
                    className={`rounded-md px-2 py-1 text-[11px] font-semibold transition-colors cursor-pointer shrink-0 ${
                      historyFolderFilter === 'all'
                        ? 'bg-slate-900 text-white dark:bg-slate-200 dark:text-slate-900'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    Semua ({mergedHistory.length})
                  </button>
                  {COLLECTION_FOLDERS.map((folder) => (
                    <button
                      key={folder}
                      type="button"
                      onClick={() => setHistoryFolderFilter(folder)}
                      className={`rounded-md px-2 py-1 text-[11px] font-semibold transition-colors cursor-pointer shrink-0 ${
                        historyFolderFilter === folder
                          ? 'bg-slate-900 text-white dark:bg-slate-200 dark:text-slate-900'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {folder} ({folderCounts[folder]})
                    </button>
                  ))}
                </div>
              </div>

              {filteredHistory.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-4 text-center">
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md">
                    {historyFolderFilter !== 'all'
                      ? `Folder "${historyFolderFilter}" masih kosong. Hasil unduhan otomatis masuk ke folder Umum dan bisa dipindahkan lewat menu Koleksi di setiap kartu.`
                      : 'Belum ada riwayat pada filter atau pencarian ini.'}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setHistoryFilter('all');
                      setHistoryFolderFilter('all');
                      setHistorySearch('');
                    }}
                    className="rounded-lg bg-blue-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-800 transition-colors cursor-pointer"
                  >
                    Tampilkan Semua Riwayat ({mergedHistory.length})
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {filteredHistory.map((item) => {
                    const itemMeta = getPlatformMeta(item.platform);
                    const folder = item.collectionFolder || 'Umum';
                    return (
                      <div
                        key={item.id}
                        className="flex flex-col gap-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 p-2 hover:border-blue-400 dark:hover:border-blue-600 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleLoadFromHistory(item)}
                            className="flex flex-1 items-center gap-2.5 min-w-0 text-left cursor-pointer"
                          >
                            <div className="relative h-11 w-9 shrink-0 overflow-hidden rounded bg-slate-200 dark:bg-slate-800 flex items-center justify-center">
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
                                  className="h-4 w-4 text-slate-500"
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

                          <button
                            type="button"
                            onClick={() => toggleFavorite(item.id)}
                            aria-label={item.isFavorite ? 'Hapus dari favorit' : 'Tandai favorit'}
                            title={item.isFavorite ? 'Hapus favorit' : 'Pin favorit'}
                            className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-colors cursor-pointer ${
                              item.isFavorite
                                ? 'text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                                : 'text-slate-400 hover:text-amber-500 hover:bg-slate-200/70 dark:hover:bg-slate-800'
                            }`}
                          >
                            <Star
                              className={`h-4 w-4 ${item.isFavorite ? 'fill-current' : ''}`}
                              aria-hidden="true"
                            />
                          </button>
                        </div>

                        <div className="flex items-center justify-between gap-2 border-t border-slate-200/70 dark:border-slate-800 pt-1">
                          <span className="text-[11px] text-slate-500 dark:text-slate-400">
                            Koleksi:
                          </span>
                          <select
                            value={folder}
                            aria-label={`Folder untuk ${item.title}`}
                            onChange={(e) =>
                              changeItemFolder(item.id, e.target.value as CollectionFolder)
                            }
                            className="rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-1.5 py-0.5 text-[11px] font-medium text-slate-700 dark:text-slate-200 focus:outline-none"
                          >
                            {COLLECTION_FOLDERS.map((f) => (
                              <option key={f} value={f}>
                                {f}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        )}

        <InfoSections onSelectPlatform={handleSelectPlatform} />
          </>
        )}
      </main>

      <Footer
        onOpenLegal={(tab) => openLegalModal(tab, activeSourceUrl || urlInput, displayPlatform)}
      />

      <MobileBottomNav
        activePage={activePage}
        isSignedIn={Boolean(user)}
        avatarUrl={displayUserPhoto}
        onGoHome={() => {
          setActivePage('home');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onGoPlatforms={() => {
          setActivePage('home');
          window.setTimeout(() => {
            document.getElementById('platform-list')?.scrollIntoView({ behavior: 'smooth' });
          }, 60);
        }}
        onGoHistory={() => {
          setActivePage('home');
          window.setTimeout(() => {
            const el = document.getElementById('riwayat-section');
            if (el) {
              el.scrollIntoView({ behavior: 'smooth' });
            } else {
              focusInput();
            }
          }, 60);
        }}
        onGoAccount={() => {
          if (user) {
            setActivePage('profile');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          } else {
            setIsAuthModalOpen(true);
          }
        }}
      />

      <OfflineIndicator />

      {/* Google Login & Email Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

      {/* QR Code Share Modal (Transfer PC <-> HP) */}
      <QrShareModal
        isOpen={isQrModalOpen}
        shareUrl={shareableQuickUrl}
        title={mediaResult?.title || 'Tautan ZoneSaveALL'}
        onClose={() => setIsQrModalOpen(false)}
      />

      {/* Watch Ads Modal (10s Countdown + Banner 300x250, NO Video/VAST) */}
      <WatchAdsModal
        isOpen={isWatchAdsOpen}
        videoTitle={mediaResult?.title || 'Video Kualitas HD'}
        hdLabel={mediaResult?.hdLabel}
        onClose={() => setIsWatchAdsOpen(false)}
        onDownloadHD={handleDownloadHD}
      />

      {/* Privacy Policy, Terms & Bug Report Modal */}
      <LegalAndReportModal
        isOpen={legalModal.isOpen}
        initialTab={legalModal.tab}
        prefillUrl={legalModal.prefillUrl}
        prefillPlatform={legalModal.prefillPlatform}
        onClose={() => setLegalModal((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ZoneSaveAllContent />
    </AuthProvider>
  );
}
