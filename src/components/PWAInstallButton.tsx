import { useState } from 'react';
import { Smartphone } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import PWAInstallGuideModal from './PWAInstallGuideModal';

export default function PWAInstallButton() {
  const { isInstallable, isInstalled, isIOS, isAndroid, isMobile, install } =
    usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  // Show header button whenever native prompt is ready, or on mobile devices (iOS/Android)
  if (!isInstallable && !isIOS && !isMobile) {
    return null;
  }

  const handleClick = async () => {
    if (isInstallable) {
      const accepted = await install();
      if (!accepted) return;
      return;
    }
    setShowGuide(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => void handleClick()}
        title="Pasang aplikasi ZoneSaveALL di perangkat"
        className="inline-flex h-9 sm:h-10 items-center gap-1.5 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/70 px-2.5 sm:px-3 text-xs font-semibold text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors cursor-pointer whitespace-nowrap shrink-0"
      >
        <Smartphone className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="sm:hidden">Pasang</span>
        <span className="hidden sm:inline">Install App</span>
      </button>

      <PWAInstallGuideModal
        isOpen={showGuide}
        isIOS={isIOS}
        isAndroid={isAndroid}
        onClose={() => setShowGuide(false)}
      />
    </>
  );
}
