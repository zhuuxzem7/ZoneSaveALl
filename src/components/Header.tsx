import { LogIn, Moon, Sun, User as UserIcon } from 'lucide-react';
import PWAInstallButton from './PWAInstallButton';

interface HeaderProps {
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  isSignedIn: boolean;
  userName?: string;
  userPhoto?: string;
  onGoHome: () => void;
  onOpenAuth: () => void;
  onOpenProfile: () => void;
}

export default function Header({
  theme,
  onToggleTheme,
  isSignedIn,
  userName,
  userPhoto,
  onGoHome,
  onOpenAuth,
  onOpenProfile,
}: HeaderProps) {
  const isDark = theme === 'dark';

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 transition-colors duration-200">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 sm:gap-8 px-4 sm:px-6 py-2.5 sm:py-3">
        {/* Zone 1: Brand avatar logo + wordmark */}
        <a
          href="#beranda"
          onClick={onGoHome}
          className="inline-flex items-center gap-2.5 whitespace-nowrap shrink-0"
        >
          <img
            src="/assets/aistudio/sara_seo_pfp_6f6b2a74.jfif"
            alt="Logo ZoneSaveALL"
            className="h-8 w-8 sm:h-9 sm:w-9 rounded-full object-cover object-center border border-blue-200 dark:border-slate-700 shrink-0"
          />
          <span className="font-display text-base sm:text-xl font-extrabold tracking-tight text-blue-700 dark:text-blue-400">
            ZoneSaveALL
          </span>
        </a>

        {/* Zone 2: 4 concise single-line text nav links */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600 dark:text-slate-300">
          <a
            href="#beranda"
            onClick={onGoHome}
            className="hover:text-blue-700 dark:hover:text-blue-400 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Beranda
          </a>
          <a
            href="#cara-unduh"
            onClick={onGoHome}
            className="hover:text-blue-700 dark:hover:text-blue-400 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Cara Unduh
          </a>
          <a
            href="#fitur"
            onClick={onGoHome}
            className="hover:text-blue-700 dark:hover:text-blue-400 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Fitur
          </a>
          <a
            href="#faq"
            onClick={onGoHome}
            className="hover:text-blue-700 dark:hover:text-blue-400 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            FAQ
          </a>
        </nav>

        {/* Zone 3: PWA Install + Theme Toggle + Telegram CS + Account */}
        <div className="flex items-center gap-2 shrink-0">
          <PWAInstallButton />
          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={isDark ? 'Ganti ke tema terang' : 'Ganti ke tema gelap'}
            title={isDark ? 'Tema Terang' : 'Tema Gelap'}
            className="inline-flex h-9 sm:h-10 items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-2.5 sm:px-3 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            {isDark ? (
              <>
                <Sun className="h-4 w-4 text-amber-400" aria-hidden="true" />
                <span className="hidden sm:inline">Terang</span>
              </>
            ) : (
              <>
                <Moon className="h-4 w-4 text-slate-600" aria-hidden="true" />
                <span className="hidden sm:inline">Gelap</span>
              </>
            )}
          </button>

          <a
            href="https://t.me/ZhuuVerzon"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Customer Service Telegram"
            title="Hubungi CS Telegram"
            className="inline-flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-[#229ED9] text-white hover:bg-[#1C8BC0] transition-colors shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#229ED9]"
          >
            <svg
              viewBox="0 0 24 24"
              fill="currentColor"
              className="h-5 w-5"
              aria-hidden="true"
            >
              <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
            </svg>
          </a>

          {isSignedIn ? (
            <button
              type="button"
              onClick={onOpenProfile}
              title="Buka Halaman Profil"
              className="inline-flex h-9 sm:h-10 items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-2 sm:px-2.5 text-xs font-semibold text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
            >
              {userPhoto ? (
                <img
                  src={userPhoto}
                  alt={userName || 'Profil'}
                  referrerPolicy="no-referrer"
                  className="h-6 w-6 rounded-full object-cover shrink-0"
                />
              ) : (
                <UserIcon className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" aria-hidden="true" />
              )}
              <span className="hidden sm:inline max-w-[88px] truncate">
                {userName || 'Profil'}
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpenAuth}
              className="inline-flex h-9 sm:h-10 items-center gap-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 px-2.5 sm:px-3 text-xs font-semibold text-white transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <LogIn className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>Masuk</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
