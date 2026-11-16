import { CheckCircle2, Loader2, X } from 'lucide-react';

export type ProgressVariant = 'blue' | 'emerald' | 'teal';

export interface DownloadProgressState {
  id: string;
  label: string;
  detailText?: string;
  progress: number;
  indeterminate?: boolean;
  variant: ProgressVariant;
  status: 'active' | 'complete';
}

interface MediaProgressBarProps {
  progress: number;
  stageText: string;
  detailText?: string;
  indeterminate?: boolean;
  variant?: ProgressVariant;
  status?: 'active' | 'complete';
  onCancel?: () => void;
  cancelLabel?: string;
}

const VARIANT_CLASSES: Record<
  ProgressVariant,
  {
    container: string;
    track: string;
    fill: string;
    text: string;
    icon: string;
  }
> = {
  blue: {
    container:
      'border-blue-200 dark:border-blue-800/80 bg-blue-50/75 dark:bg-blue-950/35',
    track: 'bg-blue-100 dark:bg-slate-800',
    fill: 'bg-gradient-to-r from-blue-600 via-blue-500 to-sky-500',
    text: 'text-blue-800 dark:text-blue-200',
    icon: 'text-blue-600 dark:text-blue-400',
  },
  emerald: {
    container:
      'border-emerald-200 dark:border-emerald-800/80 bg-emerald-50/75 dark:bg-emerald-950/35',
    track: 'bg-emerald-100 dark:bg-slate-800',
    fill: 'bg-gradient-to-r from-emerald-600 via-emerald-500 to-green-500',
    text: 'text-emerald-800 dark:text-emerald-200',
    icon: 'text-emerald-600 dark:text-emerald-400',
  },
  teal: {
    container:
      'border-teal-200 dark:border-teal-800/80 bg-teal-50/75 dark:bg-teal-950/35',
    track: 'bg-teal-100 dark:bg-slate-800',
    fill: 'bg-gradient-to-r from-teal-600 via-teal-500 to-cyan-500',
    text: 'text-teal-800 dark:text-teal-200',
    icon: 'text-teal-600 dark:text-teal-400',
  },
};

export default function MediaProgressBar({
  progress,
  stageText,
  detailText,
  indeterminate = false,
  variant = 'blue',
  status = 'active',
  onCancel,
  cancelLabel = 'Batalkan proses',
}: MediaProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(progress)));
  const styles = VARIANT_CLASSES[variant];
  const isComplete = status === 'complete';

  return (
    <div
      role="status"
      aria-live="polite"
      className={`rounded-xl border p-3.5 transition-colors duration-200 ${styles.container}`}
    >
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          {isComplete ? (
            <CheckCircle2
              className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400"
              aria-hidden="true"
            />
          ) : (
            <Loader2
              className={`h-4 w-4 shrink-0 animate-spin ${styles.icon}`}
              aria-hidden="true"
            />
          )}
          <span className={`text-xs sm:text-sm font-semibold truncate ${styles.text}`}>
            {stageText}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {detailText && (
            <span className="hidden sm:inline font-mono text-[11px] tabular-nums text-slate-500 dark:text-slate-400">
              {detailText}
            </span>
          )}
          {!indeterminate && (
            <span className={`font-mono text-xs font-bold tabular-nums ${styles.text}`}>
              {clamped}%
            </span>
          )}
          {onCancel && !isComplete && (
            <button
              type="button"
              onClick={onCancel}
              aria-label={cancelLabel}
              title={cancelLabel}
              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:bg-white/80 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      <div
        role="progressbar"
        aria-label={stageText}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={indeterminate ? undefined : clamped}
        className={`relative h-2.5 w-full overflow-hidden rounded-full ${styles.track}`}
      >
        {indeterminate && !isComplete ? (
          <div
            className={`h-full w-2/5 rounded-full animate-progress-indeterminate ${styles.fill}`}
          />
        ) : (
          <div
            className={`relative h-full overflow-hidden rounded-full transition-[width] duration-300 ease-out ${styles.fill}`}
            style={{ width: `${Math.max(isComplete ? 100 : 6, clamped)}%` }}
          >
            {!isComplete && (
              <span
                aria-hidden="true"
                className="absolute inset-0 w-1/2 bg-gradient-to-r from-transparent via-white/45 to-transparent animate-progress-shimmer"
              />
            )}
          </div>
        )}
      </div>

      {detailText && (
        <p className="mt-1.5 sm:hidden font-mono text-[11px] tabular-nums text-slate-500 dark:text-slate-400">
          {detailText}
        </p>
      )}
    </div>
  );
}
