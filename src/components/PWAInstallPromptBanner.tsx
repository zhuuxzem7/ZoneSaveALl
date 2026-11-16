import { useState } from 'react';
import { Download, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import PWAInstallGuideModal from './PWAInstallGuideModal';

export default function PWAInstallPromptBanner() {
  const {
    isInstallable,
    isInstalled,
    isIOS,
    isAndroid,
    isMobile,
    isBannerDismissed,
    dismissBanner,
    install,
  } = usePWAInstall();
  const isOnline = useOnlineStatus();
  const [showGuide, setShowGuide] = useState(false);

  // Suppress if already installed (standalone/Capacitor), dismissed, offline, or neither installable nor mobile
  if (isInstalled || isBannerDismissed || !isOnline) {
    return null;
  }

  if (!isInstallable && !isMobile && !isIOS) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      const accepted = await install();
      if (accepted) {
        dismissBanner();
      }
      return;
    }
    setShowGuide(true);
  };

  return (
    <>
      <aside
        aria-label="Promosi pemasangan aplikasi ZoneSaveALL"
        className="fixed bottom-20 md:bottom-5 left-3 right-3 md:left-auto md:right-5 md:w-[390px] z-40 rounded-xl border border-blue-200 dark:border-blue-800/80 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-3.5 shadow-xl transition-all duration-200 animate-result-enter"
      >
        <div className="flex items-start gap-3">
          <img
            src="/pwa-192x192.png"
            alt="Logo ZoneSaveALL"
            className="h-11 w-11 rounded-xl border border-slate-200 dark:border-slate-700 object-cover shrink-0"
          />

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="font-display text-sm font-bold text-slate-900 dark:text-slate-100 leading-snug">
                  Pasang Aplikasi ZoneSaveALL
                </h2>
                <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Akses instan dari layar utama HP &amp; buka riwayat meski tanpa internet.
                </p>
              </div>
              <button
                type="button"
                onClick={dismissBanner}
                aria-label="Tutup banner pasang aplikasi"
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="mt-2.5 flex items-center gap-2">
              <button
                type="button"
                onClick={() => void handleInstallClick()}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-blue-700 px-3.5 py-2 text-xs font-bold text-white hover:bg-blue-800 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 cursor-pointer"
              >
                {isInstallable ? (
                  <Download className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                ) : (
                  <Smartphone className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                )}
                <span>{isInstallable ? 'Pasang Sekarang' : 'Cara Pasang App'}</span>
              </button>

              <button
                type="button"
                onClick={dismissBanner}
                className="inline-flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                Nanti
              </button>
            </div>
          </div>
        </div>
      </aside>

      <PWAInstallGuideModal
        isOpen={showGuide}
        isIOS={isIOS}
        isAndroid={isAndroid}
        onClose={() => setShowGuide(false)}
      />
    </>
  );
}
