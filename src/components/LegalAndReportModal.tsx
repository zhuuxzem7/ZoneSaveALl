import { useEffect, useState, type FormEvent } from 'react';
import {
  AlertCircle,
  Bug,
  Check,
  CheckCircle2,
  Copy,
  FileCheck2,
  Loader2,
  Send,
  Shield,
  X,
} from 'lucide-react';
import { formatFirebaseAuthError, useAuth } from '../contexts/AuthContext';

export type LegalModalTab = 'privacy' | 'terms' | 'report';

interface LegalAndReportModalProps {
  isOpen: boolean;
  initialTab?: LegalModalTab;
  prefillUrl?: string;
  prefillPlatform?: string;
  onClose: () => void;
}

export default function LegalAndReportModal({
  isOpen,
  initialTab = 'privacy',
  prefillUrl = '',
  prefillPlatform = 'umum',
  onClose,
}: LegalAndReportModalProps) {
  const { user, submitBugReport } = useAuth();
  const [activeTab, setActiveTab] = useState<LegalModalTab>(initialTab);
  const [targetUrl, setTargetUrl] = useState(prefillUrl);
  const [platform, setPlatform] = useState(prefillPlatform);
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [reportSuccess, setReportSuccess] = useState<string | null>(null);
  const [copiedReport, setCopiedReport] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setActiveTab(initialTab);
    setTargetUrl(prefillUrl);
    setPlatform(prefillPlatform || 'umum');
    setReportError(null);
    setReportSuccess(null);
    setCopiedReport(false);
  }, [isOpen, initialTab, prefillPlatform, prefillUrl]);

  if (!isOpen) return null;

  const diagnosticSummary = [
    'Laporan Kendala ZoneSaveALL',
    `Platform: ${platform || 'umum'}`,
    `Tautan: ${targetUrl || '-'}`,
    `Kendala: ${description || '-'}`,
  ].join('\n');

  const handleCopyReport = async () => {
    try {
      await navigator.clipboard.writeText(diagnosticSummary);
      setCopiedReport(true);
      window.setTimeout(() => setCopiedReport(false), 2000);
    } catch {
      setCopiedReport(false);
    }
  };

  const handleSubmitReport = async (e: FormEvent) => {
    e.preventDefault();
    setReportError(null);
    setReportSuccess(null);

    if (description.trim().length < 5) {
      setReportError('Jelaskan kendala minimal 5 karakter agar mudah ditindaklanjuti.');
      return;
    }

    if (!user?.emailVerified) {
      await handleCopyReport();
      setReportSuccess(
        'Detail laporan disalin. Anda dapat mengirimkannya langsung lewat tombol CS Telegram di bawah.'
      );
      return;
    }

    setIsSubmitting(true);
    try {
      await submitBugReport({
        targetUrl,
        platform,
        description,
      });
      setDescription('');
      setReportSuccess('Laporan tersimpan ke akun Anda. Terima kasih sudah membantu menjaga layanan!');
    } catch (err) {
      setReportError(formatFirebaseAuthError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const telegramShareUrl = `https://t.me/ZhuuVerzon?text=${encodeURIComponent(diagnosticSummary)}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="legal-modal-title"
    >
      <div className="relative flex max-h-[90vh] w-full max-w-xl flex-col rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 px-5 py-4">
          <h2
            id="legal-modal-title"
            className="font-display text-base sm:text-lg font-extrabold text-slate-900 dark:text-slate-100"
          >
            Pusat Informasi &amp; Bantuan
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup modal"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="grid grid-cols-3 gap-1.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 p-2.5">
          <button
            type="button"
            onClick={() => setActiveTab('privacy')}
            className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-2.5 py-2 text-xs font-semibold transition-colors cursor-pointer min-h-[38px] ${
              activeTab === 'privacy'
                ? 'bg-blue-700 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800'
            }`}
          >
            <Shield className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>Privasi</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('terms')}
            className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-2.5 py-2 text-xs font-semibold transition-colors cursor-pointer min-h-[38px] ${
              activeTab === 'terms'
                ? 'bg-blue-700 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800'
            }`}
          >
            <FileCheck2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>Ketentuan</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('report')}
            className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-2.5 py-2 text-xs font-semibold transition-colors cursor-pointer min-h-[38px] ${
              activeTab === 'report'
                ? 'bg-blue-700 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800'
            }`}
          >
            <Bug className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>Lapor Bug</span>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 text-xs sm:text-sm text-slate-700 dark:text-slate-300 space-y-4 leading-relaxed">
          {activeTab === 'privacy' && (
            <div className="space-y-3">
              <h3 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
                Kebijakan Privasi ZoneSaveALL
              </h3>
              <p>
                ZoneSaveALL menghargai privasi Anda. Kami tidak menyimpan file video atau audio
                hasil unduhan Anda di server kami — media dialirkan secara langsung ke perangkat Anda.
              </p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>
                  <strong>Data Lokal:</strong> Pengaturan tema, format nama file, dan riwayat tamu
                  disimpan di penyimpanan browser/perangkat Anda sendiri.
                </li>
                <li>
                  <strong>Data Akun (Opsional):</strong> Jika Anda masuk memakai Google atau Email,
                  hanya nama tampilan, email, foto profil, serta riwayat/favorit yang Anda simpan
                  yang tersinkron ke akun pribadi Anda di Firebase.
                </li>
                <li>
                  <strong>Izin Clipboard &amp; Bagikan:</strong> Pembacaan clipboard hanya dijalankan
                  saat Anda menyalakan fitur deteksi otomatis atau menekan tombol Tempel.
                </li>
                <li>
                  <strong>Iklan:</strong> Layanan gratis ini didukung oleh mitra iklan pihak ketiga
                  yang dapat menggunakan cookie standar web untuk menampilkan iklan yang relevan.
                </li>
              </ul>
            </div>
          )}

          {activeTab === 'terms' && (
            <div className="space-y-3">
              <h3 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
                Ketentuan Layanan ZoneSaveALL
              </h3>
              <p>
                Dengan menggunakan versi Web maupun APK ZoneSaveALL, Anda menyetujui ketentuan
                penggunaan berikut:
              </p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>
                  <strong>Penggunaan Pribadi:</strong> ZoneSaveALL ditujukan untuk mengarsipkan
                  media publik untuk konsumsi pribadi, referensi kreatif, atau konten milik Anda sendiri.
                </li>
                <li>
                  <strong>Hak Cipta Kreator:</strong> Seluruh hak cipta video, audio, dan gambar
                  sepenuhnya milik kreator asli dan masing-masing platform terkait. Hargai kredit
                  kreator saat menggunakan ulang materi apa pun.
                </li>
                <li>
                  <strong>Ketersediaan Layanan:</strong> Kami berupaya menjaga ekstraktor tetap aktif
                  untuk semua platform, namun ketersediaan video privat atau yang dibatasi wilayah
                  bergantung pada kebijakan platform sumber.
                </li>
                <li>
                  <strong>Larangan Penyalahgunaan:</strong> Dilarang melakukan scraping massal
                  otomatis yang mengganggu stabilitas server publik.
                </li>
              </ul>
            </div>
          )}

          {activeTab === 'report' && (
            <form onSubmit={handleSubmitReport} className="space-y-3.5">
              <div>
                <h3 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
                  Laporkan Link Gagal atau Error
                </h3>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  Temukan tautan yang gagal diunduh? Kirim detailnya agar tim kami bisa segera perbaiki.
                </p>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Tautan Media Bermasalah
                </label>
                <input
                  type="text"
                  maxLength={500}
                  value={targetUrl}
                  onChange={(e) => setTargetUrl(e.target.value)}
                  placeholder="https://www.tiktok.com/@..."
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:border-blue-500 focus:outline-none min-h-[42px]"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Platform
                </label>
                <select
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:border-blue-500 focus:outline-none min-h-[42px]"
                >
                  <option value="umum">Umum / Lainnya</option>
                  <option value="tiktok">TikTok</option>
                  <option value="instagram">Instagram</option>
                  <option value="facebook">Facebook</option>
                  <option value="youtube">YouTube</option>
                  <option value="twitter">X / Twitter</option>
                  <option value="pinterest">Pinterest</option>
                  <option value="threads">Threads</option>
                  <option value="capcut">CapCut</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Jelaskan Kendala
                </label>
                <textarea
                  rows={3}
                  maxLength={600}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Contoh: Tombol HD muncul error atau video slideshow tidak terbaca..."
                  className="w-full resize-none rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:border-blue-500 focus:outline-none"
                />
              </div>

              {reportError && (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 px-3 py-2 text-xs text-red-700 dark:text-red-300"
                >
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
                  <span>{reportError}</span>
                </div>
              )}

              {reportSuccess && (
                <div className="flex items-start gap-2 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-300">
                  <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
                  <span>{reportSuccess}</span>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-700 hover:bg-blue-800 disabled:bg-blue-400 px-4 py-2.5 text-xs sm:text-sm font-bold text-white transition-colors cursor-pointer min-h-[44px]"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      <span>Mengirim...</span>
                    </>
                  ) : user?.emailVerified ? (
                    <>
                      <Send className="h-4 w-4" aria-hidden="true" />
                      <span>Kirim Laporan</span>
                    </>
                  ) : (
                    <>
                      {copiedReport ? (
                        <Check className="h-4 w-4" aria-hidden="true" />
                      ) : (
                        <Copy className="h-4 w-4" aria-hidden="true" />
                      )}
                      <span>{copiedReport ? 'Detail Tersalin' : 'Salin Laporan'}</span>
                    </>
                  )}
                </button>

                <a
                  href={telegramShareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-sky-200 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/50 px-4 py-2.5 text-xs sm:text-sm font-semibold text-sky-700 dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-sky-900/60 transition-colors min-h-[44px]"
                >
                  <Send className="h-4 w-4" aria-hidden="true" />
                  <span>Kirim ke Telegram CS</span>
                </a>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
