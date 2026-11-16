import { useCallback, useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

const BANNER_DISMISS_STORAGE_KEY = 'zonesaveall-pwa-prompt-dismissed-at';
const BANNER_DISMISS_COOLDOWN_MS = 1000 * 60 * 60 * 24 * 3; // 3 hari

function checkIsInstalled(): boolean {
  if (typeof window === 'undefined') return false;
  const win = window as unknown as {
    navigator: Navigator & { standalone?: boolean };
    Capacitor?: { isNativePlatform?: () => boolean };
  };
  const isCapacitorNative = Boolean(win.Capacitor?.isNativePlatform?.());
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: minimal-ui)').matches ||
    win.navigator.standalone === true;

  return isCapacitorNative || isStandalone;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(checkIsInstalled);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isBannerDismissed, setIsBannerDismissed] = useState<boolean>(() => {
    try {
      const raw = localStorage.getItem(BANNER_DISMISS_STORAGE_KEY);
      if (!raw) return false;
      const ts = Number(raw);
      return Number.isFinite(ts) && Date.now() - ts < BANNER_DISMISS_COOLDOWN_MS;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    setIsInstalled(checkIsInstalled());

    const userAgent = window.navigator.userAgent.toLowerCase();
    const iosDevice =
      /iphone|ipad|ipod/.test(userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const androidDevice = /android/.test(userAgent);
    const mobileDevice = iosDevice || androidDevice || /mobile/.test(userAgent);

    setIsIOS(iosDevice);
    setIsAndroid(androidDevice);
    setIsMobile(mobileDevice);

    const displayModeQuery = window.matchMedia('(display-mode: standalone)');
    const handleDisplayModeChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        setIsInstalled(true);
        setDeferredPrompt(null);
      }
    };

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      setIsBannerDismissed(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    displayModeQuery.addEventListener('change', handleDisplayModeChange);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      displayModeQuery.removeEventListener('change', handleDisplayModeChange);
    };
  }, []);

  const install = useCallback(async () => {
    if (!deferredPrompt) return false;
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
        setDeferredPrompt(null);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, [deferredPrompt]);

  const dismissBanner = useCallback(() => {
    setIsBannerDismissed(true);
    try {
      localStorage.setItem(BANNER_DISMISS_STORAGE_KEY, String(Date.now()));
    } catch {
      // ignore storage errors
    }
  }, []);

  return {
    isInstallable: Boolean(deferredPrompt),
    isInstalled,
    isIOS,
    isAndroid,
    isMobile,
    isBannerDismissed,
    dismissBanner,
    install,
  };
}
