import { useEffect, useState } from 'react';
import { Download, Clock, ShieldCheck } from 'lucide-react';
import AdBanner from './AdBanner';

interface WatchAdsModalProps {
  isOpen: boolean;
  videoTitle: string;
  hdLabel?: string;
  onClose: () => void;
  onDownloadHD: () => void;
}

const COUNTDOWN_SECONDS = 10;

export default function WatchAdsModal({
  isOpen,
  videoTitle,
  hdLabel,
  onClose,
  onDownloadHD,
}: WatchAdsModalProps) {
  const [secondsLeft, setSecondsLeft] = useState(COUNTDOWN_SECONDS);

  useEffect(() => {
    if (!isOpen) {
      setSecondsLeft(COUNTDOWN_SECONDS);
      return;
    }

    setSecondsLeft(COUNTDOWN_SECONDS);

    const intervalId = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(intervalId);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [isOpen]);

  if (!isOpen) return null;

  const isReady = secondsLeft === 0;
  const progress = (COUNTDOWN_SECONDS - secondsLeft) / COUNTDOWN_SECONDS;

  const handleCloseOrDownload = () => {
    if (!isReady) return;
    onDownloadHD();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="watch-ads-modal-title"
    >
      <div className="relative w-full max-w-md rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-2xl transition-colors duration-200">
        {/* Top-right action button: disabled during 10s, transforms to Tutup & Download */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="min-w-0">
            <h2
              id="watch-ads-modal-title"
              className="font-display text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100"
            >
              Unduh Kualitas HD{hdLabel ? ` · ${hdLabel}` : ''}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 truncate">
              {videoTitle}
            </p>
          </div>

          <button
            type="button"
            disabled={!isReady}
            onClick={handleCloseOrDownload}
            className={`shrink-0 inline-flex items-center justify-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap min-h-[40px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 ${
              isReady
                ? 'bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer shadow-xs'
                : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 cursor-not-allowed'
            }`}
          >
            {isReady ? (
              <>
                <Download className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Tutup &amp; Download</span>
              </>
            ) : (
              <span className="font-mono tabular-nums">Tutup ({secondsLeft})</span>
            )}
          </button>
        </div>

        {/* Countdown status strip */}
        <div className="mb-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 px-3.5 py-2.5">
          <div className="flex items-center justify-between gap-2 text-xs font-medium text-slate-700 dark:text-slate-300">
            <span className="inline-flex items-center gap-1.5 min-w-0">
              {isReady ? (
                <>
                  <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                  <span className="truncate">
                    Tautan video {hdLabel || 'HD'} siap diunduh!
                  </span>
                </>
              ) : (
                <>
                  <Clock className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" aria-hidden="true" />
                  <span className="truncate">
                    Menyiapkan video {hdLabel || 'HD'}, tunggu sebentar...
                  </span>
                </>
              )}
            </span>
            <span className="font-mono text-xs font-semibold tabular-nums text-slate-900 dark:text-slate-100">
              {secondsLeft}s
            </span>
          </div>

          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
            <div
              className={`h-full w-full origin-left transition-transform duration-300 ease-out ${
                isReady ? 'bg-emerald-600' : 'bg-blue-600'
              }`}
              style={{ transform: `scaleX(${progress})` }}
            />
          </div>
        </div>

        {/* Adsterra Banner 300x250 inside Modal (NO Video Player / VAST) */}
        <div className="flex justify-center py-1">
          <AdBanner
            adKey="b5815a366a899a3a9e1826e2140efe28"
            width={300}
            height={250}
          />
        </div>

        <p className="mt-3 text-center text-xs text-slate-500 dark:text-slate-400">
          {isReady
            ? 'Klik tombol "Tutup & Download" di pojok kanan atas untuk menyimpan video HD.'
            : `Tombol unduh akan aktif otomatis dalam ${secondsLeft} detik.`}
        </p>
      </div>
    </div>
  );
}
