import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  Bug,
  Camera,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Eye,
  EyeOff,
  FolderOpen,
  KeyRound,
  Loader2,
  LogOut,
  MailCheck,
  RotateCcw,
  Save,
  Search,
  Send,
  Share2,
  ShieldCheck,
  SlidersHorizontal,
  Star,
  Trash2,
  User as UserIcon,
} from 'lucide-react';
import {
  COLLECTION_FOLDERS,
  formatFirebaseAuthError,
  useAuth,
  type CloudHistoryItem,
  type CollectionFolder,
} from '../contexts/AuthContext';
import { getPlatformMeta, PlatformLogo } from './PlatformLogo';
import type { LegalModalTab } from './LegalAndReportModal';

interface ProfileViewProps {
  onBack: () => void;
  onSelectMediaItem: (item: CloudHistoryItem) => void;
  onSyncFilenameMode?: (mode: 'default' | 'title') => void;
  autoClipboard: boolean;
  onSyncAutoClipboard?: (enabled: boolean) => void;
  onClearLocalCache?: () => void;
  onOpenLegal?: (tab: LegalModalTab) => void;
  localUnsyncedCount?: number;
  onSyncLocalToCloud?: () => Promise<void>;
}

async function compressAvatarFile(file: File): Promise<string> {
  const imageUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Gagal membaca file gambar.'));
      el.src = imageUrl;
    });

    const size = 240;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Browser tidak mendukung pemrosesan gambar.');

    const minSide = Math.min(img.width, img.height);
    const sx = (img.width - minSide) / 2;
    const sy = (img.height - minSide) / 2;
    ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);

    const compressed = canvas.toDataURL('image/jpeg', 0.82);
    if (compressed.length <= 240000) return compressed;

    const medium = canvas.toDataURL('image/jpeg', 0.62);
    if (medium.length <= 240000) return medium;

    return canvas.toDataURL('image/jpeg', 0.42);
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}

export default function ProfileView({
  onBack,
  onSelectMediaItem,
  onSyncFilenameMode,
  autoClipboard,
  onSyncAutoClipboard,
  onClearLocalCache,
  onOpenLegal,
  localUnsyncedCount = 0,
  onSyncLocalToCloud,
}: ProfileViewProps) {
  const {
    user,
    profile,
    cloudHistory,
    hasPasswordProvider,
    hasGoogleProvider,
    resendVerificationEmail,
    updateUserProfile,
    toggleCloudFavorite,
    updateCloudFolder,
    removeCloudItem,
    sendPasswordChangeCodeToEmail,
    verifyAndConfirmPasswordCode,
    signOutUser,
  } = useAuth();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState(profile?.displayName || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [photoDataUrl, setPhotoDataUrl] = useState(profile?.photoDataUrl || '');
  const [preferredFilenameMode, setPreferredFilenameMode] = useState<'default' | 'title'>(
    profile?.preferredFilenameMode || 'default'
  );
  const [clipboardEnabled, setClipboardEnabled] = useState<boolean>(
    profile?.autoClipboard ?? autoClipboard
  );

  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileNotice, setProfileNotice] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [emailCode, setEmailCode] = useState('');
  const [codeSentToEmail, setCodeSentToEmail] = useState(false);
  const [codeCooldown, setCodeCooldown] = useState(0);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPw, setShowNewPw] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [pwNotice, setPwNotice] = useState<string | null>(null);
  const [pwError, setPwError] = useState<string | null>(null);

  const [verifyNotice, setVerifyNotice] = useState<string | null>(null);
  const [isResendingVerify, setIsResendingVerify] = useState(false);

  const [cloudSearch, setCloudSearch] = useState('');
  const [cloudFolderFilter, setCloudFolderFilter] = useState<'all' | CollectionFolder>('all');
  const [isSyncingLocal, setIsSyncingLocal] = useState(false);
  const [settingsNotice, setSettingsNotice] = useState<string | null>(null);
  const [sharedApp, setSharedApp] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setDisplayName(profile.displayName || '');
    setBio(profile.bio || '');
    setPhotoDataUrl(profile.photoDataUrl || '');
    setPreferredFilenameMode(profile.preferredFilenameMode || 'default');
    if (typeof profile.autoClipboard === 'boolean') {
      setClipboardEnabled(profile.autoClipboard);
    }
  }, [profile]);

  useEffect(() => {
    if (codeCooldown <= 0) return;
    const timer = window.setInterval(() => {
      setCodeCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [codeCooldown]);

  const favoriteCount = useMemo(
    () => cloudHistory.filter((item) => item.isFavorite).length,
    [cloudHistory]
  );

  const topPlatformLabel = useMemo(() => {
    if (cloudHistory.length === 0) return 'Belum ada';
    const counts = new Map<string, number>();
    for (const item of cloudHistory) {
      counts.set(item.platform, (counts.get(item.platform) || 0) + 1);
    }
    let top = cloudHistory[0].platform;
    let best = 0;
    for (const [plat, count] of counts.entries()) {
      if (count > best) {
        best = count;
        top = plat as typeof top;
      }
    }
    return getPlatformMeta(top).shortName;
  }, [cloudHistory]);

  const customFolderCount = useMemo(
    () =>
      cloudHistory.filter(
        (item) => item.collectionFolder && item.collectionFolder !== 'Umum'
      ).length,
    [cloudHistory]
  );

  const cloudFolderCounts = useMemo(() => {
    const counts: Record<CollectionFolder, number> = {
      Umum: 0,
      'Ide Konten': 0,
      'Sound Viral': 0,
      Referensi: 0,
    };
    for (const item of cloudHistory) {
      const folder = item.collectionFolder || 'Umum';
      if (folder in counts) {
        counts[folder] += 1;
      }
    }
    return counts;
  }, [cloudHistory]);

  const filteredCloudHistory = useMemo(() => {
    const q = cloudSearch.trim().toLowerCase();
    return cloudHistory.filter((item) => {
      const folder = item.collectionFolder || 'Umum';
      if (cloudFolderFilter !== 'all' && folder !== cloudFolderFilter) return false;
      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q) ||
        item.authorName.toLowerCase().includes(q) ||
        item.uniqueId.toLowerCase().includes(q) ||
        item.platform.toLowerCase().includes(q)
      );
    });
  }, [cloudFolderFilter, cloudHistory, cloudSearch]);

  if (!user) return null;

  const handleAvatarUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProfileError(null);
    setProfileNotice(null);
    try {
      const compressed = await compressAvatarFile(file);
      setPhotoDataUrl(compressed);
      await updateUserProfile({
        displayName: displayName || profile?.displayName || 'Pengguna',
        bio,
        photoDataUrl: compressed,
        preferredFilenameMode,
      });
      setProfileNotice('Foto profil berhasil diperbarui.');
    } catch (err) {
      setProfileError(
        err instanceof Error ? err.message : 'Gagal memperbarui foto profil.'
      );
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleResetToGooglePhoto = async () => {
    if (!user.photoURL) return;
    setProfileError(null);
    setProfileNotice(null);
    setPhotoDataUrl(user.photoURL);
    try {
      await updateUserProfile({
        displayName: displayName || profile?.displayName || 'Pengguna',
        bio,
        photoDataUrl: user.photoURL,
        preferredFilenameMode,
      });
      setProfileNotice('Foto dikembalikan ke foto akun Google.');
    } catch (err) {
      setProfileError(formatFirebaseAuthError(err));
    }
  };

  const handleSaveProfile = async (e: FormEvent) => {
    e.preventDefault();
    setProfileError(null);
    setProfileNotice(null);
    if (!displayName.trim()) {
      setProfileError('Nama tampilan tidak boleh kosong.');
      return;
    }

    setIsSavingProfile(true);
    try {
      await updateUserProfile({
        displayName,
        bio,
        photoDataUrl,
        preferredFilenameMode,
        autoClipboard: clipboardEnabled,
      });
      onSyncFilenameMode?.(preferredFilenameMode);
      onSyncAutoClipboard?.(clipboardEnabled);
      setProfileNotice('Perubahan nama & profil berhasil disimpan.');
    } catch (err) {
      setProfileError(formatFirebaseAuthError(err));
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleToggleAutoClipboard = async () => {
    const next = !clipboardEnabled;
    setClipboardEnabled(next);
    onSyncAutoClipboard?.(next);
    setSettingsNotice(
      next ? 'Deteksi clipboard otomatis diaktifkan.' : 'Deteksi clipboard otomatis dimatikan.'
    );
    try {
      await updateUserProfile({
        displayName: displayName || profile?.displayName || 'Pengguna',
        bio,
        photoDataUrl,
        preferredFilenameMode,
        autoClipboard: next,
      });
    } catch {
      // local preference already applied
    }
  };

  const handleShareApp = async () => {
    const shareUrl =
      typeof window !== 'undefined' && window.location.origin.startsWith('http')
        ? window.location.origin
        : 'https://zonesaveall.vercel.app';
    const shareText =
      'Unduh video TikTok tanpa watermark, IG Reels, YT, FB, X, Pinterest, Threads & CapCut HD gratis pakai ZoneSaveALL!';
    try {
      if (typeof navigator.share === 'function') {
        await navigator.share({
          title: 'ZoneSaveALL Downloader',
          text: shareText,
          url: shareUrl,
        });
      } else {
        await navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
      }
      setSharedApp(true);
      setSettingsNotice('Tautan aplikasi siap dibagikan.');
      window.setTimeout(() => setSharedApp(false), 2000);
    } catch {
      // ignore cancelled share
    }
  };

  const handleSendPasswordCode = async () => {
    setPwError(null);
    setPwNotice(null);
    setIsSendingCode(true);
    try {
      await sendPasswordChangeCodeToEmail();
      setCodeSentToEmail(true);
      setCodeCooldown(60);
      setPwNotice(
        `Kode & tautan verifikasi sudah dikirim ke ${user.email}. Cek Inbox atau folder Spam, lalu tempel kode/tautannya di bawah (atau klik tautan langsung di email).`
      );
    } catch (err) {
      setPwError(formatFirebaseAuthError(err));
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleSavePassword = async (e: FormEvent) => {
    e.preventDefault();
    setPwError(null);
    setPwNotice(null);

    if (!emailCode.trim()) {
      setPwError('Kirim dan masukkan kode atau tautan verifikasi dari email terlebih dahulu.');
      return;
    }
    if (newPassword.length < 6) {
      setPwError('Kata sandi baru minimal 6 karakter.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError('Konfirmasi kata sandi baru tidak cocok.');
      return;
    }

    setIsSavingPassword(true);
    try {
      await verifyAndConfirmPasswordCode(emailCode, newPassword);
      setEmailCode('');
      setNewPassword('');
      setConfirmPassword('');
      setCodeSentToEmail(false);
      setPwNotice(
        hasPasswordProvider
          ? 'Kode email terverifikasi! Kata sandi akun Anda berhasil diganti.'
          : 'Kode email terverifikasi! Kata sandi berhasil dibuat dan ditautkan ke akun Anda.'
      );
    } catch (err) {
      setPwError(formatFirebaseAuthError(err));
    } finally {
      setIsSavingPassword(false);
    }
  };

  const handleResendVerify = async () => {
    setIsResendingVerify(true);
    setVerifyNotice(null);
    try {
      await resendVerificationEmail();
      setVerifyNotice('Email verifikasi terkirim. Cek kotak masuk / folder spam lalu login ulang.');
    } catch (err) {
      setVerifyNotice(formatFirebaseAuthError(err));
    } finally {
      setIsResendingVerify(false);
    }
  };

  const handleSignOut = async () => {
    await signOutUser();
    onBack();
  };

  return (
    <section
      aria-label="Halaman Profil Akun"
      className="mx-auto max-w-4xl px-4 sm:px-6 py-6 sm:py-8 space-y-5"
    >
      {/* Top Action Bar */}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 py-2 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer min-h-[42px]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          <span>Kembali ke Downloader</span>
        </button>

        <button
          type="button"
          onClick={handleSignOut}
          className="inline-flex items-center gap-2 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30 px-3.5 py-2 text-xs sm:text-sm font-semibold text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-950/60 transition-colors cursor-pointer min-h-[42px]"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          <span>Keluar</span>
        </button>
      </div>

      {/* Email Verification Notice for Email/Password signups */}
      {!user.emailVerified && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/30 p-4 text-xs sm:text-sm text-amber-800 dark:text-amber-200">
          <div className="flex items-start gap-2.5">
            <MailCheck className="h-5 w-5 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" aria-hidden="true" />
            <div>
              <p className="font-semibold">Email belum diverifikasi</p>
              <p className="mt-0.5 text-xs opacity-90">
                Verifikasi email untuk mengaktifkan sinkronisasi profil dan riwayat cloud lintas perangkat.
              </p>
              {verifyNotice && <p className="mt-1 text-xs font-medium">{verifyNotice}</p>}
            </div>
          </div>
          <button
            type="button"
            onClick={handleResendVerify}
            disabled={isResendingVerify}
            className="shrink-0 rounded-xl bg-amber-600 hover:bg-amber-700 px-3.5 py-2 text-xs font-semibold text-white transition-colors cursor-pointer min-h-[38px]"
          >
            {isResendingVerify ? 'Mengirim...' : 'Kirim Email Verifikasi'}
          </button>
        </div>
      )}

      {/* Profile Hero Header Card */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center gap-5">
          {/* Avatar + Camera Upload */}
          <div className="relative mx-auto sm:mx-0 shrink-0">
            <div className="h-24 w-24 overflow-hidden rounded-full border-2 border-blue-200 dark:border-blue-800 bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
              {photoDataUrl ? (
                <img
                  src={photoDataUrl}
                  alt={`Foto profil ${displayName || 'Pengguna'}`}
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover"
                />
              ) : (
                <UserIcon className="h-10 w-10 text-slate-400" aria-hidden="true" />
              )}
            </div>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              aria-label="Ubah foto profil"
              title="Pilih foto dari galeri / komputer"
              className="absolute bottom-0 right-0 inline-flex h-9 w-9 items-center justify-center rounded-full bg-blue-700 text-white shadow-md border-2 border-white dark:border-slate-900 hover:bg-blue-800 transition-colors cursor-pointer"
            >
              <Camera className="h-4 w-4" aria-hidden="true" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              className="hidden"
            />
          </div>

          <div className="flex-1 text-center sm:text-left min-w-0">
            <h1 className="font-display text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100 truncate">
              {profile?.displayName || user.displayName || 'Pengguna ZoneSaveALL'}
            </h1>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400 truncate">
              {user.email}
            </p>
            <div className="mt-2 flex flex-wrap items-center justify-center sm:justify-start gap-x-2.5 gap-y-1 text-xs text-slate-600 dark:text-slate-300">
              <span className="inline-flex items-center gap-1 font-medium text-emerald-700 dark:text-emerald-400">
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{user.emailVerified ? 'Akun Terverifikasi' : 'Menunggu Verifikasi'}</span>
              </span>
              <span aria-hidden="true" className="text-slate-300 dark:text-slate-600">
                ·
              </span>
              <span>
                Login:{' '}
                {[hasGoogleProvider ? 'Google' : null, hasPasswordProvider ? 'Password' : null]
                  .filter(Boolean)
                  .join(' & ') || 'Email'}
              </span>
            </div>

            {user.photoURL && photoDataUrl !== user.photoURL && (
              <button
                type="button"
                onClick={handleResetToGooglePhoto}
                className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Gunakan foto akun Google</span>
              </button>
            )}
          </div>

          {/* Account Cloud Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-2 gap-2.5 sm:w-56 shrink-0">
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 p-2.5 text-center">
              <p className="font-mono text-lg font-bold tabular-nums text-slate-900 dark:text-slate-100">
                {cloudHistory.length}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Riwayat Cloud</p>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 p-2.5 text-center">
              <p className="font-mono text-lg font-bold tabular-nums text-amber-600 dark:text-amber-400">
                {favoriteCount}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Favorit</p>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 p-2.5 text-center">
              <p className="text-xs font-bold text-blue-700 dark:text-blue-400 truncate">
                {topPlatformLabel}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Teratas</p>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 p-2.5 text-center">
              <p className="font-mono text-lg font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                {customFolderCount}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Di Folder</p>
            </div>
          </div>
        </div>
      </div>

      {/* Two-Column Forms: Edit Profil & Keamanan Kata Sandi */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
        {/* Card 1: Edit Nama, Foto & Bio Profil */}
        <form
          onSubmit={handleSaveProfile}
          className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-xs space-y-4"
        >
          <div>
            <h2 className="font-display text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
              Edit Nama &amp; Profil
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Ubah nama tampilan, bio, dan format nama file unduhan default Anda.
            </p>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Nama Tampilan
            </label>
            <input
              type="text"
              maxLength={60}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Nama Anda"
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:border-blue-500 focus:outline-none min-h-[44px]"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Bio Singkat
            </label>
            <textarea
              rows={2}
              maxLength={160}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Contoh: Kreator konten & editor video"
              className="w-full resize-none rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:border-blue-500 focus:outline-none"
            />
            <p className="mt-1 text-right font-mono text-[11px] tabular-nums text-slate-400">
              {bio.length}/160
            </p>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Format Nama File Unduhan
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPreferredFilenameMode('default')}
                className={`rounded-xl border px-3 py-2 text-xs font-semibold transition-colors cursor-pointer min-h-[42px] ${
                  preferredFilenameMode === 'default'
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
                    : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300'
                }`}
              >
                Default (ID Kreator)
              </button>
              <button
                type="button"
                onClick={() => setPreferredFilenameMode('title')}
                className={`rounded-xl border px-3 py-2 text-xs font-semibold transition-colors cursor-pointer min-h-[42px] ${
                  preferredFilenameMode === 'title'
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
                    : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300'
                }`}
              >
                Sesuai Judul Video
              </button>
            </div>
          </div>

          {profileError && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 px-3 py-2.5 text-xs text-red-700 dark:text-red-300"
            >
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
              <span>{profileError}</span>
            </div>
          )}

          {profileNotice && (
            <div className="flex items-start gap-2 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-2.5 text-xs text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
              <span>{profileNotice}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isSavingProfile}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-700 hover:bg-blue-800 disabled:bg-blue-400 px-4 py-3 text-sm font-bold text-white transition-colors cursor-pointer min-h-[46px]"
          >
            {isSavingProfile ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                <span>Menyimpan...</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4" aria-hidden="true" />
                <span>Simpan Profil</span>
              </>
            )}
          </button>
        </form>

        {/* Card 2: Keamanan & Ganti Kata Sandi Wajib Verifikasi Email */}
        <form
          onSubmit={handleSavePassword}
          className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-xs space-y-4"
        >
          <div className="flex items-start gap-2.5">
            <KeyRound
              className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5"
              aria-hidden="true"
            />
            <div>
              <h2 className="font-display text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                {hasPasswordProvider ? 'Ganti Kata Sandi (Via Email)' : 'Buat Kata Sandi (Via Email)'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Demi keamanan akun, penggantian kata sandi wajib mengirim kode verifikasi ke email{' '}
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  {user.email}
                </span>
                .
              </p>
            </div>
          </div>

          {/* Step 1: Send Verification Code to Email */}
          <div className="rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/70 dark:bg-blue-950/30 p-3.5 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-blue-900 dark:text-blue-200">
                Langkah 1 · Kirim Kode ke Email
              </span>
              {codeSentToEmail && (
                <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                  Terkirim
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={handleSendPasswordCode}
              disabled={isSendingCode || codeCooldown > 0}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-700 hover:bg-blue-800 disabled:bg-blue-400 px-4 py-2.5 text-xs sm:text-sm font-bold text-white transition-colors cursor-pointer min-h-[42px]"
            >
              {isSendingCode ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  <span>Mengirim kode ke email...</span>
                </>
              ) : codeCooldown > 0 ? (
                <span>Kirim Ulang Kode ({codeCooldown}s)</span>
              ) : (
                <>
                  <Send className="h-4 w-4" aria-hidden="true" />
                  <span>
                    {codeSentToEmail ? 'Kirim Ulang Kode ke Email' : 'Kirim Kode Verifikasi ke Email'}
                  </span>
                </>
              )}
            </button>
          </div>

          {/* Step 2: Enter Email Verification Code/Link + New Password */}
          <div className="space-y-3">
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Langkah 2 · Masukkan Kode / Tautan dari Email
            </p>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Kode atau Tautan Verifikasi Email
              </label>
              <input
                type="text"
                value={emailCode}
                onChange={(e) => setEmailCode(e.target.value)}
                placeholder="Tempel tautan atau kode oobCode dari email..."
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:border-blue-500 focus:outline-none min-h-[44px]"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Kata Sandi Baru
              </label>
              <div className="relative flex items-center">
                <input
                  type={showNewPw ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimal 6 karakter"
                  autoComplete="new-password"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 py-2.5 pl-3.5 pr-11 text-sm text-slate-900 dark:text-slate-100 focus:border-blue-500 focus:outline-none min-h-[44px]"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPw((prev) => !prev)}
                  aria-label={showNewPw ? 'Sembunyikan sandi' : 'Lihat sandi'}
                  className="absolute right-1 inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                >
                  {showNewPw ? (
                    <EyeOff className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Konfirmasi Kata Sandi Baru
              </label>
              <input
                type={showNewPw ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Ulangi kata sandi baru"
                autoComplete="new-password"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:border-blue-500 focus:outline-none min-h-[44px]"
              />
            </div>
          </div>

          {pwError && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 px-3 py-2.5 text-xs text-red-700 dark:text-red-300"
            >
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
              <span>{pwError}</span>
            </div>
          )}

          {pwNotice && (
            <div className="flex items-start gap-2 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-2.5 text-xs text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
              <span>{pwNotice}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isSavingPassword}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 dark:hover:bg-emerald-700 disabled:opacity-60 px-4 py-3 text-sm font-bold text-white transition-colors cursor-pointer min-h-[46px]"
          >
            {isSavingPassword ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                <span>Memverifikasi kode...</span>
              </>
            ) : (
              <>
                <KeyRound className="h-4 w-4" aria-hidden="true" />
                <span>Verifikasi Kode &amp; Simpan Sandi Baru</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* App Settings & Quick Utilities Card */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-blue-600 dark:text-blue-400" aria-hidden="true" />
            <h2 className="font-display text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
              Pengaturan Aplikasi
            </h2>
          </div>
          <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
            ZoneSaveALL v2.2 · Web &amp; APK
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={handleToggleAutoClipboard}
            className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 px-4 py-3 text-left hover:border-blue-400 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <ClipboardCheck className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                  Deteksi Clipboard Otomatis
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  Tawarkan tempel link saat membuka aplikasi
                </p>
              </div>
            </div>
            <span
              className={`shrink-0 rounded-md px-2 py-1 text-[11px] font-bold ${
                clipboardEnabled
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                  : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
              }`}
            >
              {clipboardEnabled ? 'Aktif' : 'Nonaktif'}
            </span>
          </button>

          <button
            type="button"
            onClick={handleShareApp}
            className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 px-4 py-3 text-left hover:border-blue-400 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {sharedApp ? (
                <Check className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
              ) : (
                <Share2 className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" aria-hidden="true" />
              )}
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                  Bagikan ZoneSaveALL
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  Kirim tautan web &amp; APK ke teman
                </p>
              </div>
            </div>
            <span className="shrink-0 text-xs font-semibold text-blue-700 dark:text-blue-400">
              Bagikan
            </span>
          </button>

          {onClearLocalCache && (
            <button
              type="button"
              onClick={() => {
                onClearLocalCache();
                setSettingsNotice('Cache riwayat lokal perangkat berhasil dibersihkan.');
              }}
              className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 px-4 py-3 text-left hover:border-red-300 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Trash2 className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                    Bersihkan Cache Lokal
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    Hapus riwayat sementara di browser/HP ini
                  </p>
                </div>
              </div>
              <span className="shrink-0 text-xs font-semibold text-rose-600 dark:text-rose-400">
                Bersihkan
              </span>
            </button>
          )}

          {onOpenLegal && (
            <button
              type="button"
              onClick={() => onOpenLegal('report')}
              className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 px-4 py-3 text-left hover:border-amber-400 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Bug className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                    Bantuan &amp; Lapor Link Gagal
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    Privasi, Ketentuan Layanan &amp; Laporan Error
                  </p>
                </div>
              </div>
              <span className="shrink-0 text-xs font-semibold text-amber-700 dark:text-amber-400">
                Buka
              </span>
            </button>
          )}
        </div>

        {settingsNotice && (
          <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
            {settingsNotice}
          </p>
        )}
      </div>

      {/* Cloud Synced History, Search & Folder Collections */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-xs space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100">
            <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" aria-hidden="true" />
            <span>Koleksi &amp; Riwayat Akun ({filteredCloudHistory.length})</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {localUnsyncedCount > 0 && user.emailVerified && onSyncLocalToCloud && (
              <button
                type="button"
                disabled={isSyncingLocal}
                onClick={async () => {
                  setIsSyncingLocal(true);
                  try {
                    await onSyncLocalToCloud();
                    setSettingsNotice('Riwayat lokal berhasil disinkronkan ke akun cloud Anda.');
                  } finally {
                    setIsSyncingLocal(false);
                  }
                }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 disabled:bg-blue-400 px-2.5 py-1 text-xs font-semibold text-white transition-colors cursor-pointer"
              >
                {isSyncingLocal ? (
                  <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                ) : null}
                <span>Sinkronkan Lokal ({localUnsyncedCount})</span>
              </button>
            )}
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Klik kartu untuk unduh ulang
            </span>
          </div>
        </div>

        {cloudHistory.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400"
                aria-hidden="true"
              />
              <input
                type="search"
                value={cloudSearch}
                onChange={(e) => setCloudSearch(e.target.value)}
                placeholder="Cari judul, kreator, atau platform..."
                aria-label="Cari koleksi cloud"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 py-2 pl-8 pr-3 text-xs text-slate-900 dark:text-slate-100 focus:border-blue-500 focus:outline-none min-h-[38px]"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setCloudFolderFilter('all')}
                className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer min-h-[36px] ${
                  cloudFolderFilter === 'all'
                    ? 'bg-blue-700 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                <FolderOpen className="h-3 w-3" aria-hidden="true" />
                <span>Semua ({cloudHistory.length})</span>
              </button>
              {COLLECTION_FOLDERS.map((folder) => (
                <button
                  key={folder}
                  type="button"
                  onClick={() => setCloudFolderFilter(folder)}
                  className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer min-h-[36px] ${
                    cloudFolderFilter === folder
                      ? 'bg-blue-700 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {folder} ({cloudFolderCounts[folder]})
                </button>
              ))}
            </div>
          </div>
        )}

        {filteredCloudHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-4 text-center">
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md">
              {cloudHistory.length === 0
                ? 'Belum ada riwayat tersimpan di akun cloud Anda. Unduh media saat login agar otomatis tersinkron.'
                : cloudFolderFilter !== 'all'
                ? `Folder "${cloudFolderFilter}" masih kosong. Item baru otomatis masuk ke folder Umum dan bisa dipindahkan lewat menu Folder pada tiap kartu.`
                : 'Tidak ada item yang cocok dengan pencarian tersebut.'}
            </p>
            {cloudHistory.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setCloudFolderFilter('all');
                  setCloudSearch('');
                }}
                className="rounded-lg bg-blue-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-800 transition-colors cursor-pointer"
              >
                Tampilkan Semua ({cloudHistory.length})
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {filteredCloudHistory.slice(0, 12).map((item) => {
              const meta = getPlatformMeta(item.platform);
              const folder = item.collectionFolder || 'Umum';
              return (
                <div
                  key={item.id}
                  className="flex flex-col gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 p-2.5 hover:border-blue-400 dark:hover:border-blue-600 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onSelectMediaItem(item)}
                      className="flex flex-1 items-center gap-2.5 min-w-0 text-left cursor-pointer"
                    >
                      <div className="relative h-11 w-9 shrink-0 overflow-hidden rounded-lg bg-slate-200 dark:bg-slate-800 flex items-center justify-center">
                        {item.cover ? (
                          <img
                            src={item.cover}
                            alt={item.authorName}
                            referrerPolicy="no-referrer"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <PlatformLogo platform={item.platform} className="h-4 w-4 text-slate-500" />
                        )}
                        <span
                          className={`absolute bottom-0.5 right-0.5 flex h-4 w-4 items-center justify-center rounded ${meta.brandBg}`}
                        >
                          <PlatformLogo platform={item.platform} className="h-2.5 w-2.5" />
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                          {item.authorName}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                          {meta.shortName} · {item.title}
                        </p>
                      </div>
                    </button>

                    {user.emailVerified && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => void toggleCloudFavorite(item.id, !item.isFavorite)}
                          aria-label={item.isFavorite ? 'Hapus dari favorit' : 'Tandai favorit'}
                          title={item.isFavorite ? 'Hapus favorit' : 'Tandai favorit'}
                          className={`inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors cursor-pointer ${
                            item.isFavorite
                              ? 'text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                              : 'text-slate-400 hover:text-amber-500 hover:bg-slate-200/70 dark:hover:bg-slate-800'
                          }`}
                        >
                          <Star
                            className={`h-3.5 w-3.5 ${item.isFavorite ? 'fill-current' : ''}`}
                            aria-hidden="true"
                          />
                        </button>
                        <button
                          type="button"
                          onClick={() => void removeCloudItem(item.id)}
                          aria-label={`Hapus ${item.title} dari cloud`}
                          title="Hapus dari cloud"
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      </div>
                    )}
                  </div>

                  {user.emailVerified && (
                    <div className="flex items-center justify-between gap-2 border-t border-slate-200/70 dark:border-slate-800 pt-1.5">
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        Folder:
                      </span>
                      <select
                        value={folder}
                        aria-label={`Pilih folder untuk ${item.title}`}
                        onChange={(e) =>
                          void updateCloudFolder(item.id, e.target.value as CollectionFolder)
                        }
                        className="rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-0.5 text-[11px] font-medium text-slate-700 dark:text-slate-200 focus:outline-none"
                      >
                        {COLLECTION_FOLDERS.map((f) => (
                          <option key={f} value={f}>
                            {f}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
