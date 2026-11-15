export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 transition-colors duration-200">
      <div className="mx-auto flex max-w-6xl flex-col sm:flex-row items-center justify-between gap-4 px-4 sm:px-6 py-8 text-sm text-slate-500 dark:text-slate-400">
        <div className="flex flex-col sm:flex-row items-center gap-2.5 sm:gap-3.5 text-center sm:text-left">
          <div className="inline-flex items-center gap-2">
            <img
              src="/assets/aistudio/sara_seo_pfp_6f6b2a74.jfif"
              alt="Logo ZoneSaveALL"
              className="h-7 w-7 rounded-full object-cover object-center border border-blue-200 dark:border-slate-700 shrink-0"
            />
            <span className="font-display text-base font-bold text-blue-700 dark:text-blue-400">
              ZoneSaveALL
            </span>
          </div>
          <span className="hidden sm:inline text-slate-300 dark:text-slate-700" aria-hidden="true">
            ·
          </span>
          <span>
            &copy; {year} ZoneSaveALL. Layanan pengunduh video &amp; audio semua sosial media.
          </span>
        </div>

        <nav className="flex items-center gap-6 text-xs sm:text-sm">
          <a
            href="#beranda"
            className="hover:text-slate-900 dark:hover:text-slate-200 transition-colors whitespace-nowrap"
          >
            Beranda
          </a>
          <a
            href="#cara-unduh"
            className="hover:text-slate-900 dark:hover:text-slate-200 transition-colors whitespace-nowrap"
          >
            Cara Unduh
          </a>
          <a
            href="#faq"
            className="hover:text-slate-900 dark:hover:text-slate-200 transition-colors whitespace-nowrap"
          >
            FAQ
          </a>
          <a
            href="https://t.me/ZhuuVerzon"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors whitespace-nowrap"
          >
            CS Telegram
          </a>
        </nav>
      </div>
    </footer>
  );
}
