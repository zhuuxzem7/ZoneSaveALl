import { useEffect, useState } from 'react';
import { CheckCircle2, Film, Sparkles } from 'lucide-react';

interface ProcessedStatsBarProps {
  sessionIncrement?: number;
}

export default function ProcessedStatsBar({ sessionIncrement = 0 }: ProcessedStatsBarProps) {
  const [baseTotal, setBaseTotal] = useState<number>(
    () => 1_284_500 + Math.floor(Math.random() * 48_500)
  );

  useEffect(() => {
    const timer = window.setInterval(() => {
      const step = 1 + Math.floor(Math.random() * 3);
      setBaseTotal((prev) => prev + step);
    }, 5000);
    return () => window.clearInterval(timer);
  }, []);

  const displayedTotal = (baseTotal + sessionIncrement).toLocaleString('id-ID');

  return (
    <section
      aria-label="Statistik Aplikasi ZoneSaveALL"
      className="mx-auto max-w-6xl px-4 sm:px-6 pt-4"
    >
      <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 dark:divide-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs transition-colors duration-200">
        <div className="flex items-center justify-center sm:justify-start gap-3 px-4 py-3">
          <div className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-400">
            <Film className="h-4 w-4" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="font-mono text-base sm:text-lg font-extrabold tabular-nums text-slate-900 dark:text-slate-100 leading-tight">
              {displayedTotal}+
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Total Video Telah Diproses
            </p>
          </div>
        </div>

        <div className="flex items-center justify-center gap-3 px-4 py-3">
          <div className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="font-mono text-base sm:text-lg font-extrabold tabular-nums text-slate-900 dark:text-slate-100 leading-tight">
              99,4%
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Keberhasilan Ekstraksi HD
            </p>
          </div>
        </div>

        <div className="flex items-center justify-center sm:justify-end gap-3 px-4 py-3">
          <div className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-950/70 text-amber-700 dark:text-amber-400">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="font-display text-base sm:text-lg font-extrabold text-slate-900 dark:text-slate-100 leading-tight">
              8 Platform
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              MP4 Tanpa Watermark &amp; MP3
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
