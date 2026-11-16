import { Share, Smartphone, X } from 'lucide-react';

interface PWAInstallGuideModalProps {
  isOpen: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  onClose: () => void;
}

export default function PWAInstallGuideModal({
  isOpen,
  isIOS,
  isAndroid,
  onClose,
}: PWAInstallGuideModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pwa-install-guide-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <img
              src="/pwa-192x192.png"
              alt="Ikon ZoneSaveALL"
              className="h-10 w-10 rounded-xl border border-slate-200 dark:border-slate-700 object-cover shrink-0"
            />
            <div>
              <h3
                id="pwa-install-guide-title"
                className="font-display text-base font-bold text-slate-900 dark:text-slate-100"
              >
                {isIOS
                  ? 'Pasang di iPhone / iPad'
                  : isAndroid
                    ? 'Pasang di Perangkat Android'
                    : 'Pasang Aplikasi ZoneSaveALL'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Akses layaknya aplikasi native dari layar utama
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup panduan pasang aplikasi"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {isIOS ? (
          <ol className="mt-4 space-y-2.5 text-xs sm:text-sm text-slate-600 dark:text-slate-300 list-decimal list-inside">
            <li>
              Ketuk tombol{' '}
              <span className="inline-flex items-center gap-1 font-semibold text-slate-900 dark:text-white">
                <Share className="h-3.5 w-3.5 text-blue-600" aria-hidden="true" />
                Bagikan (Share)
              </span>{' '}
              di bilah browser Safari.
            </li>
            <li>
              Gulir ke bawah dan ketuk <strong>Tambahkan ke Layar Utama</strong>{' '}
              (<em>Add to Home Screen</em>).
            </li>
            <li>
              Ketuk <strong>Tambah</strong> di pojok kanan atas untuk menyelesaikan pemasangan.
            </li>
          </ol>
        ) : isAndroid ? (
          <ol className="mt-4 space-y-2.5 text-xs sm:text-sm text-slate-600 dark:text-slate-300 list-decimal list-inside">
            <li>
              Ketuk ikon menu <strong>⋮</strong> di pojok kanan atas browser (Chrome / Edge / Samsung Internet).
            </li>
            <li>
              Pilih <strong>Instal aplikasi</strong> atau{' '}
              <strong>Tambahkan ke layar utama</strong>.
            </li>
            <li>
              Konfirmasi dengan mengetuk <strong>Instal</strong> untuk membuka ZoneSaveALL dalam mode layar penuh.
            </li>
          </ol>
        ) : (
          <ol className="mt-4 space-y-2.5 text-xs sm:text-sm text-slate-600 dark:text-slate-300 list-decimal list-inside">
            <li>
              Klik ikon{' '}
              <span className="inline-flex items-center gap-1 font-semibold text-slate-900 dark:text-white">
                <Smartphone className="h-3.5 w-3.5 text-blue-600" aria-hidden="true" />
                Instal
              </span>{' '}
              di sisi kanan bilah alamat browser Chrome/Edge.
            </li>
            <li>
              Atau buka menu browser (<strong>⋮</strong>) lalu pilih{' '}
              <strong>Simpan dan bagikan → Instal ZoneSaveALL</strong>.
            </li>
          </ol>
        )}

        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full rounded-lg bg-blue-700 py-2.5 text-xs sm:text-sm font-semibold text-white hover:bg-blue-800 transition-colors cursor-pointer"
        >
          Mengerti
        </button>
      </div>
    </div>
  );
}
