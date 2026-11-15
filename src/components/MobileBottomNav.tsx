import { Clock, Download, Grid2X2, LogIn, User as UserIcon } from 'lucide-react';

interface MobileBottomNavProps {
  activePage: 'home' | 'profile';
  isSignedIn: boolean;
  avatarUrl?: string;
  onGoHome: () => void;
  onGoPlatforms: () => void;
  onGoHistory: () => void;
  onGoAccount: () => void;
}

export default function MobileBottomNav({
  activePage,
  isSignedIn,
  avatarUrl,
  onGoHome,
  onGoPlatforms,
  onGoHistory,
  onGoAccount,
}: MobileBottomNavProps) {
  return (
    <nav
      aria-label="Navigasi Aplikasi Mobile"
      className="fixed bottom-0 left-0 right-0 z-40 md:hidden border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md transition-colors duration-200"
    >
      <div className="grid grid-cols-4 h-16 items-center">
        <button
          type="button"
          onClick={onGoHome}
          className={`flex flex-col items-center justify-center h-full gap-0.5 cursor-pointer transition-colors ${
            activePage === 'home'
              ? 'text-blue-700 dark:text-blue-400'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <Download className="h-5 w-5" aria-hidden="true" />
          <span className="text-[11px] font-semibold tracking-tight">Unduh</span>
        </button>

        <button
          type="button"
          onClick={onGoPlatforms}
          className="flex flex-col items-center justify-center h-full gap-0.5 text-slate-500 dark:text-slate-400 hover:text-blue-700 dark:hover:text-blue-400 cursor-pointer transition-colors"
        >
          <Grid2X2 className="h-5 w-5" aria-hidden="true" />
          <span className="text-[11px] font-medium tracking-tight">Platform</span>
        </button>

        <button
          type="button"
          onClick={onGoHistory}
          className="flex flex-col items-center justify-center h-full gap-0.5 text-slate-500 dark:text-slate-400 hover:text-blue-700 dark:hover:text-blue-400 cursor-pointer transition-colors"
        >
          <Clock className="h-5 w-5" aria-hidden="true" />
          <span className="text-[11px] font-medium tracking-tight">Riwayat</span>
        </button>

        <button
          type="button"
          onClick={onGoAccount}
          className={`flex flex-col items-center justify-center h-full gap-0.5 cursor-pointer transition-colors ${
            activePage === 'profile'
              ? 'text-blue-700 dark:text-blue-400'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          {isSignedIn ? (
            avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Profil"
                referrerPolicy="no-referrer"
                className="h-5 w-5 rounded-full object-cover border border-blue-400"
              />
            ) : (
              <UserIcon className="h-5 w-5" aria-hidden="true" />
            )
          ) : (
            <LogIn className="h-5 w-5" aria-hidden="true" />
          )}
          <span className="text-[11px] font-semibold tracking-tight">
            {isSignedIn ? 'Profil' : 'Masuk'}
          </span>
        </button>
      </div>
    </nav>
  );
}
