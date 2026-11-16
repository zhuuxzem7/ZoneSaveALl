import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export default function OfflineIndicator() {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-20 md:bottom-4 left-3 right-3 sm:right-auto sm:max-w-md z-50 flex items-center gap-2.5 rounded-xl border border-amber-400/40 bg-amber-600 px-3.5 py-2.5 text-xs font-semibold text-white shadow-lg"
    >
      <WifiOff className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span>
        Mode Offline — Antarmuka &amp; riwayat lokal tetap aktif. Hubungkan internet untuk mengunduh media baru.
      </span>
    </div>
  );
}
