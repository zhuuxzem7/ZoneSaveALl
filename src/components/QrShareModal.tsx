import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Check, Copy, QrCode, X } from 'lucide-react';

interface QrShareModalProps {
  isOpen: boolean;
  shareUrl: string;
  title: string;
  onClose: () => void;
}

export default function QrShareModal({
  isOpen,
  shareUrl,
  title,
  onClose,
}: QrShareModalProps) {
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen || !shareUrl) {
      setQrDataUrl('');
      return;
    }

    let cancelled = false;
    QRCode.toDataURL(shareUrl, {
      width: 240,
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
      .then((dataUrl) => {
        if (!cancelled) setQrDataUrl(dataUrl);
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl('');
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, shareUrl]);

  if (!isOpen) return null;

  const handleCopyShareUrl = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="qr-share-modal-title"
    >
      <div className="relative w-full max-w-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xl transition-colors duration-200">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2
              id="qr-share-modal-title"
              className="font-display text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2"
            >
              <QrCode className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0" aria-hidden="true" />
              <span>Kirim ke HP via QR</span>
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 truncate">
              {title}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup QR"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="my-4 flex justify-center">
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white p-3 shadow-xs">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt="QR Code untuk membuka di HP"
                width={216}
                height={216}
                className="h-54 w-54 block"
              />
            ) : (
              <div className="h-54 w-54 flex items-center justify-center text-xs text-slate-400">
                Membuat QR Code...
              </div>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          Scan QR Code dengan kamera HP untuk langsung membuka halaman unduhan video ini di perangkat Anda.
        </p>

        <p className="mt-2 rounded-lg bg-slate-100 dark:bg-slate-800/80 px-3 py-1.5 text-center font-mono text-[11px] text-slate-600 dark:text-slate-300 truncate">
          {shareUrl}
        </p>

        <button
          type="button"
          onClick={handleCopyShareUrl}
          className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white hover:bg-blue-800 transition-colors cursor-pointer min-h-[40px]"
        >
          {copied ? (
            <>
              <Check className="h-4 w-4" aria-hidden="true" />
              <span>Tautan Cepat Tersalin</span>
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" aria-hidden="true" />
              <span>Salin Tautan Cepat</span>
            </>
          )}
        </button>

        <div className="mt-2.5 grid grid-cols-2 gap-2">
          <a
            href={`https://wa.me/?text=${encodeURIComponent(`${title}\n${shareUrl}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#25D366] px-3 py-2 text-xs font-semibold text-white hover:bg-[#1ebe5d] transition-colors min-h-[38px]"
          >
            <span>WhatsApp</span>
          </a>
          <a
            href={`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(title)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#229ED9] px-3 py-2 text-xs font-semibold text-white hover:bg-[#1C8BC0] transition-colors min-h-[38px]"
          >
            <span>Telegram</span>
          </a>
        </div>
      </div>
    </div>
  );
}
