import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, RefreshCw, X } from 'lucide-react';
import { registerSW } from 'virtual:pwa-register';

export default function PWAUpdatePrompt() {
  const [needRefresh, setNeedRefresh] = useState(false);
  const [offlineReady, setOfflineReady] = useState(false);
  const updateServiceWorkerRef = useRef<((reloadPage?: boolean) => Promise<void>) | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    const win = window as unknown as {
      Capacitor?: { isNativePlatform?: () => boolean };
    };
    if (win.Capacitor?.isNativePlatform?.()) {
      return;
    }

    let intervalId: number | undefined;

    const updateSW = registerSW({
      immediate: true,
      onNeedRefresh() {
        setNeedRefresh(true);
      },
      onOfflineReady() {
        setOfflineReady(true);
      },
      onRegisteredSW(_swUrl, registration) {
        if (!registration) return;
        intervalId = window.setInterval(() => {
          if (!navigator.onLine) return;
          void registration.update().catch(() => {
            // ignore background update check error
          });
        }, 60 * 60 * 1000);
      },
      onRegisterError(error) {
        console.warn('Service Worker registration warning:', error);
      },
    });

    updateServiceWorkerRef.current = updateSW;

    return () => {
      if (intervalId !== undefined) {
        window.clearInterval(intervalId);
      }
    };
  }, []);

  useEffect(() => {
    if (!offlineReady) return;
    const timer = window.setTimeout(() => {
      setOfflineReady(false);
    }, 5500);
    return () => window.clearTimeout(timer);
  }, [offlineReady]);

  if (!needRefresh && !offlineReady) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-16 left-3 right-3 sm:left-auto sm:right-5 sm:max-w-sm z-40 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-3.5 py-2.5 shadow-lg"
    >
      {needRefresh ? (
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <RefreshCw className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" aria-hidden="true" />
            <p className="text-xs font-medium text-slate-800 dark:text-slate-100">
              Pembaruan aplikasi tersedia.
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => void updateServiceWorkerRef.current?.(true)}
              className="rounded-lg bg-blue-700 px-2.5 py-1 text-xs font-semibold text-white hover:bg-blue-800 transition-colors cursor-pointer"
            >
              Perbarui
            </button>
            <button
              type="button"
              onClick={() => setNeedRefresh(false)}
              aria-label="Tutup notifikasi pembaruan"
              className="inline-flex h-6 w-6 items-center justify-center rounded text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <CheckCircle2
              className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400"
              aria-hidden="true"
            />
            <p className="text-xs font-medium text-slate-800 dark:text-slate-100">
              Aplikasi siap diakses secara offline.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOfflineReady(false)}
            aria-label="Tutup notifikasi offline siap"
            className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}
