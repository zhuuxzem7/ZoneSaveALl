import { useEffect, useState, type FormEvent } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  MailCheck,
  X,
} from 'lucide-react';
import { formatFirebaseAuthError, useAuth } from '../contexts/AuthContext';

export interface FirebaseEmailAction {
  mode: 'resetPassword' | 'verifyEmail';
  oobCode: string;
}

interface FirebaseActionModalProps {
  action: FirebaseEmailAction | null;
  onClose: () => void;
}

export default function FirebaseActionModal({ action, onClose }: FirebaseActionModalProps) {
  const { confirmPasswordResetByActionCode, applyEmailVerificationByCode } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!action) return;
    setError(null);
    setSuccess(null);
    setNewPassword('');
    setConfirmPassword('');

    if (action.mode === 'verifyEmail') {
      setIsProcessing(true);
      void applyEmailVerificationByCode(action.oobCode)
        .then(() => {
          setSuccess('Email Anda berhasil diverifikasi! Sinkronisasi cloud ZoneSaveALL kini aktif.');
        })
        .catch((err) => {
          setError(formatFirebaseAuthError(err));
        })
        .finally(() => {
          setIsProcessing(false);
        });
    }
  }, [action, applyEmailVerificationByCode]);

  if (!action) return null;

  const handleResetSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (newPassword.length < 6) {
      setError('Kata sandi baru minimal 6 karakter.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Konfirmasi kata sandi tidak cocok.');
      return;
    }

    setIsProcessing(true);
    try {
      const verifiedEmail = await confirmPasswordResetByActionCode(action.oobCode, newPassword);
      setSuccess(
        `Kata sandi baru untuk ${verifiedEmail} berhasil disimpan! Anda dapat langsung masuk menggunakan sandi baru.`
      );
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(formatFirebaseAuthError(err));
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="firebase-action-title"
    >
      <div className="relative w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-400 shrink-0">
              {action.mode === 'verifyEmail' ? (
                <MailCheck className="h-5 w-5" aria-hidden="true" />
              ) : (
                <KeyRound className="h-5 w-5" aria-hidden="true" />
              )}
            </div>
            <div>
              <h2
                id="firebase-action-title"
                className="font-display text-base sm:text-lg font-extrabold text-slate-900 dark:text-slate-100"
              >
                {action.mode === 'verifyEmail'
                  ? 'Verifikasi Email ZoneSaveALL'
                  : 'Atur Kata Sandi Baru'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {action.mode === 'verifyEmail'
                  ? 'Mengaktifkan akun & sinkronisasi cloud'
                  : 'Masukkan kata sandi baru untuk akun ZoneSaveALL Anda'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup jendela"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {action.mode === 'verifyEmail' ? (
            <>
              {isProcessing && (
                <div className="flex items-center gap-2.5 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50 dark:bg-blue-950/30 p-3.5 text-xs sm:text-sm text-blue-800 dark:text-blue-200">
                  <Loader2 className="h-4 w-4 animate-spin shrink-0" aria-hidden="true" />
                  <span>Memverifikasi tautan email Anda...</span>
                </div>
              )}
              {error && (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 px-3 py-2.5 text-xs text-red-700 dark:text-red-300"
                >
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
                  <span>{error}</span>
                </div>
              )}
              {success && (
                <div className="flex items-start gap-2 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-2.5 text-xs text-emerald-700 dark:text-emerald-300">
                  <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
                  <span>{success}</span>
                </div>
              )}
              <button
                type="button"
                onClick={onClose}
                className="w-full rounded-xl bg-blue-700 hover:bg-blue-800 py-2.5 text-sm font-bold text-white transition-colors cursor-pointer min-h-[44px]"
              >
                Lanjutkan ke ZoneSaveALL
              </button>
            </>
          ) : (
            <form onSubmit={handleResetSubmit} className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Kata Sandi Baru
                </label>
                <div className="relative flex items-center">
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimal 6 karakter"
                    autoComplete="new-password"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 py-2.5 pl-3.5 pr-11 text-sm text-slate-900 dark:text-slate-100 focus:border-blue-500 focus:outline-none min-h-[44px]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((prev) => !prev)}
                    aria-label={showPw ? 'Sembunyikan sandi' : 'Lihat sandi'}
                    className="absolute right-1 inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                  >
                    {showPw ? (
                      <EyeOff className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <Eye className="h-4 w-4" aria-hidden="true" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Ulangi Kata Sandi Baru
                </label>
                <input
                  type={showPw ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Ketik ulang kata sandi baru"
                  autoComplete="new-password"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:border-blue-500 focus:outline-none min-h-[44px]"
                />
              </div>

              {error && (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 px-3 py-2.5 text-xs text-red-700 dark:text-red-300"
                >
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
                  <span>{error}</span>
                </div>
              )}

              {success && (
                <div className="flex items-start gap-2 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-2.5 text-xs text-emerald-700 dark:text-emerald-300">
                  <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
                  <span>{success}</span>
                </div>
              )}

              {success ? (
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 py-2.5 text-sm font-bold text-white transition-colors cursor-pointer min-h-[44px]"
                >
                  Selesai
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-700 hover:bg-blue-800 disabled:bg-blue-400 py-2.5 text-sm font-bold text-white transition-colors cursor-pointer min-h-[44px]"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <span>Simpan Kata Sandi Baru</span>
                  )}
                </button>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
