import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import {
  applyActionCode,
  confirmPasswordReset,
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  GoogleAuthProvider,
  linkWithCredential,
  linkWithPopup,
  onAuthStateChanged,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updatePassword,
  updateProfile,
  verifyPasswordResetCode,
  type User,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import {
  auth,
  db,
  GOOGLE_DRIVE_SCOPES,
  googleProvider,
  handleFirestoreError,
  OperationType,
} from '../lib/firebase';
import type { SocialPlatform } from '../types/media';

// Cached strictly in memory (never localStorage/sessionStorage) per security policy.
let cachedDriveAccessToken: string | null = null;

export type CollectionFolder = 'Umum' | 'Ide Konten' | 'Sound Viral' | 'Referensi';

export const COLLECTION_FOLDERS: CollectionFolder[] = [
  'Umum',
  'Ide Konten',
  'Sound Viral',
  'Referensi',
];

export interface UserProfileData {
  uid: string;
  displayName: string;
  email: string;
  photoDataUrl?: string;
  bio?: string;
  preferredFilenameMode?: 'default' | 'title';
  autoClipboard?: boolean;
}

export interface CloudHistoryItem {
  platform: SocialPlatform;
  id: string;
  url: string;
  title: string;
  authorName: string;
  uniqueId: string;
  cover: string;
  savedAt: number;
  isFavorite?: boolean;
  collectionFolder?: CollectionFolder;
}

interface AuthContextValue {
  user: User | null;
  profile: UserProfileData | null;
  authReady: boolean;
  cloudHistory: CloudHistoryItem[];
  hasPasswordProvider: boolean;
  hasGoogleProvider: boolean;
  hasDriveAccess: boolean;
  getDriveAccessToken: () => string | null;
  invalidateDriveAccessToken: () => void;
  connectGoogleDrive: () => Promise<string>;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  registerWithEmail: (displayName: string, email: string, password: string) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
  updateUserProfile: (updates: {
    displayName: string;
    bio: string;
    photoDataUrl?: string;
    preferredFilenameMode?: 'default' | 'title';
    autoClipboard?: boolean;
  }) => Promise<void>;
  changeOrSetPassword: (params: {
    currentPassword?: string;
    newPassword: string;
  }) => Promise<void>;
  sendPasswordChangeCodeToEmail: () => Promise<void>;
  verifyAndConfirmPasswordCode: (codeOrUrl: string, newPassword: string) => Promise<void>;
  confirmPasswordResetByActionCode: (oobCode: string, newPassword: string) => Promise<string>;
  applyEmailVerificationByCode: (oobCode: string) => Promise<void>;
  syncDownloadToCloud: (item: Omit<CloudHistoryItem, 'savedAt'>) => Promise<void>;
  toggleCloudFavorite: (id: string, isFavorite: boolean) => Promise<void>;
  updateCloudFolder: (id: string, collectionFolder: CollectionFolder) => Promise<void>;
  removeCloudItem: (id: string) => Promise<void>;
  submitBugReport: (report: {
    targetUrl: string;
    platform: string;
    description: string;
  }) => Promise<void>;
  signOutUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function formatFirebaseAuthError(error: unknown): string {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code?: string }).code)
      : '';

  switch (code) {
    case 'auth/popup-closed-by-user':
      return 'Jendela login Google ditutup sebelum selesai.';
    case 'auth/popup-blocked':
      return 'Popup login diblokir browser. Izinkan popup lalu coba lagi.';
    case 'auth/unauthorized-domain':
      return 'Domain ini belum diizinkan di Firebase Authentication → Authorized domains.';
    case 'auth/operation-not-allowed':
      return 'Metode login Email/Password belum diaktifkan di Firebase Console → Authentication → Sign-in method.';
    case 'auth/invalid-email':
      return 'Format alamat email tidak valid.';
    case 'auth/user-disabled':
      return 'Akun ini sedang dinonaktifkan.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Email atau kata sandi salah. Periksa kembali lalu coba lagi.';
    case 'auth/email-already-in-use':
      return 'Email ini sudah terdaftar. Silakan masuk atau gunakan Login Google.';
    case 'auth/weak-password':
      return 'Kata sandi terlalu lemah. Gunakan minimal 6 karakter.';
    case 'auth/requires-recent-login':
      return 'Demi keamanan, silakan masukkan kata sandi saat ini atau login ulang sebelum mengganti sandi.';
    case 'auth/expired-action-code':
      return 'Kode verifikasi dari email sudah kedaluwarsa. Kirim ulang kode baru.';
    case 'auth/invalid-action-code':
      return 'Kode atau tautan verifikasi email tidak valid atau sudah pernah digunakan.';
    case 'auth/provider-already-linked':
      return 'Akun ini sudah memiliki kata sandi. Gunakan formulir Ganti Kata Sandi.';
    case 'auth/too-many-requests':
      return 'Terlalu banyak percobaan. Tunggu beberapa saat lalu coba lagi.';
    default:
      return error instanceof Error
        ? error.message
        : 'Terjadi kesalahan autentikasi. Silakan coba lagi.';
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [cloudHistory, setCloudHistory] = useState<CloudHistoryItem[]>([]);
  const [hasDriveAccess, setHasDriveAccess] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);
      setAuthReady(true);

      if (!nextUser) {
        cachedDriveAccessToken = null;
        setHasDriveAccess(false);
        setProfile(null);
        setCloudHistory([]);
        return;
      }

      const fallbackProfile: UserProfileData = {
        uid: nextUser.uid,
        displayName: (nextUser.displayName || nextUser.email?.split('@')[0] || 'Pengguna').slice(0, 60),
        email: (nextUser.email || '').slice(0, 120),
        photoDataUrl: nextUser.photoURL || '',
        bio: '',
        preferredFilenameMode: 'default',
        autoClipboard: true,
      };
      setProfile(fallbackProfile);

      if (nextUser.emailVerified) {
        const userRef = doc(db, 'users', nextUser.uid);
        try {
          const snap = await getDoc(userRef);
          if (!snap.exists()) {
            await setDoc(userRef, {
              uid: nextUser.uid,
              displayName: fallbackProfile.displayName,
              email: fallbackProfile.email,
              photoDataUrl: (fallbackProfile.photoDataUrl || '').slice(0, 250000),
              bio: '',
              preferredFilenameMode: 'default',
              autoClipboard: true,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          }
        } catch (err) {
          console.warn('Firestore initial profile sync skipped:', err);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!authReady || !user) return;

    const userDocPath = `users/${user.uid}`;
    const unsubProfile = onSnapshot(
      doc(db, 'users', user.uid),
      (snap) => {
        if (snap.exists()) {
          const d = snap.data();
          setProfile({
            uid: user.uid,
            displayName: typeof d.displayName === 'string' ? d.displayName : user.displayName || 'Pengguna',
            email: typeof d.email === 'string' ? d.email : user.email || '',
            photoDataUrl: typeof d.photoDataUrl === 'string' ? d.photoDataUrl : user.photoURL || '',
            bio: typeof d.bio === 'string' ? d.bio : '',
            preferredFilenameMode: d.preferredFilenameMode === 'title' ? 'title' : 'default',
            autoClipboard: typeof d.autoClipboard === 'boolean' ? d.autoClipboard : true,
          });
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, userDocPath);
      }
    );

    const downloadsPath = `users/${user.uid}/downloads`;
    const downloadsQuery = query(
      collection(db, 'users', user.uid, 'downloads'),
      where('userId', '==', user.uid)
    );

    const unsubDownloads = onSnapshot(
      downloadsQuery,
      (snapshot) => {
        const items: CloudHistoryItem[] = snapshot.docs
          .map((docSnap) => {
            const d = docSnap.data();
            const updatedAtMs =
              typeof d.updatedAt?.toMillis === 'function' ? d.updatedAt.toMillis() : Date.now();
            const folderVal = COLLECTION_FOLDERS.includes(d.collectionFolder as CollectionFolder)
              ? (d.collectionFolder as CollectionFolder)
              : 'Umum';
            return {
              id: docSnap.id,
              platform: (d.platform || 'tiktok') as SocialPlatform,
              url: String(d.url || ''),
              title: String(d.title || 'Media'),
              authorName: String(d.authorName || 'Kreator'),
              uniqueId: String(d.uniqueId || 'user'),
              cover: String(d.cover || ''),
              isFavorite: Boolean(d.isFavorite),
              collectionFolder: folderVal,
              savedAt: updatedAtMs,
            };
          })
          .sort((a, b) => b.savedAt - a.savedAt)
          .slice(0, 24);
        setCloudHistory(items);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, downloadsPath);
      }
    );

    return () => {
      unsubProfile();
      unsubDownloads();
    };
  }, [authReady, user]);

  const hasPasswordProvider = Boolean(
    user?.providerData?.some((provider) => provider.providerId === 'password')
  );
  const hasGoogleProvider = Boolean(
    user?.providerData?.some((provider) => provider.providerId === 'google.com')
  );

  const getDriveAccessToken = useCallback(() => cachedDriveAccessToken, []);

  const invalidateDriveAccessToken = useCallback(() => {
    cachedDriveAccessToken = null;
    setHasDriveAccess(false);
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const result = await signInWithPopup(auth, googleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (credential?.accessToken) {
      cachedDriveAccessToken = credential.accessToken;
      setHasDriveAccess(true);
    }
  }, []);

  const connectGoogleDrive = useCallback(async (): Promise<string> => {
    const driveProvider = new GoogleAuthProvider();
    for (const scope of GOOGLE_DRIVE_SCOPES) {
      driveProvider.addScope(scope);
    }
    const current = auth.currentUser;
    if (current?.email) {
      driveProvider.setCustomParameters({
        prompt: 'consent select_account',
        login_hint: current.email,
      });
    } else {
      driveProvider.setCustomParameters({ prompt: 'consent select_account' });
    }

    let token: string | undefined;
    if (current) {
      const alreadyGoogle = current.providerData.some((p) => p.providerId === 'google.com');
      if (alreadyGoogle) {
        try {
          const result = await reauthenticateWithPopup(current, driveProvider);
          token = GoogleAuthProvider.credentialFromResult(result)?.accessToken;
        } catch (err) {
          const code =
            typeof err === 'object' && err !== null && 'code' in err
              ? String((err as { code?: string }).code)
              : '';
          if (code === 'auth/user-mismatch') {
            const fallbackResult = await signInWithPopup(auth, driveProvider);
            token = GoogleAuthProvider.credentialFromResult(fallbackResult)?.accessToken;
          } else {
            throw err;
          }
        }
      } else {
        try {
          const linked = await linkWithPopup(current, driveProvider);
          token = GoogleAuthProvider.credentialFromResult(linked)?.accessToken;
          await current.reload();
          setUser(auth.currentUser);
        } catch (err) {
          const code =
            typeof err === 'object' && err !== null && 'code' in err
              ? String((err as { code?: string }).code)
              : '';
          if (code === 'auth/credential-already-in-use') {
            const switchResult = await signInWithPopup(auth, driveProvider);
            token = GoogleAuthProvider.credentialFromResult(switchResult)?.accessToken;
          } else {
            throw err;
          }
        }
      }
    } else {
      const result = await signInWithPopup(auth, driveProvider);
      token = GoogleAuthProvider.credentialFromResult(result)?.accessToken;
    }

    if (!token) {
      throw new Error('Izin akses Google Drive tidak diterima. Silakan coba lagi.');
    }

    cachedDriveAccessToken = token;
    setHasDriveAccess(true);
    return token;
  }, []);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email.trim(), password);
  }, []);

  const registerWithEmail = useCallback(
    async (displayName: string, email: string, password: string) => {
      const cleanName = displayName.trim().slice(0, 60) || 'Pengguna';
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      await updateProfile(cred.user, { displayName: cleanName });
      try {
        await sendEmailVerification(cred.user);
      } catch {
        // ignore verification email throttle on immediate retry
      }
      setUser(cred.user);
      setProfile({
        uid: cred.user.uid,
        displayName: cleanName,
        email: cred.user.email || email.trim(),
        photoDataUrl: '',
        bio: '',
        preferredFilenameMode: 'default',
      });
    },
    []
  );

  const sendPasswordReset = useCallback(async (email: string) => {
    await sendPasswordResetEmail(auth, email.trim());
  }, []);

  const resendVerificationEmail = useCallback(async () => {
    if (!auth.currentUser) return;
    await sendEmailVerification(auth.currentUser);
  }, []);

  const updateUserProfile = useCallback(
    async (updates: {
      displayName: string;
      bio: string;
      photoDataUrl?: string;
      preferredFilenameMode?: 'default' | 'title';
      autoClipboard?: boolean;
    }) => {
      const current = auth.currentUser;
      if (!current) throw new Error('Anda belum masuk ke akun.');

      const safeName = updates.displayName.trim().slice(0, 60);
      if (!safeName) throw new Error('Nama tampilan tidak boleh kosong.');
      const safeBio = updates.bio.trim().slice(0, 160);
      const safePhoto = (updates.photoDataUrl ?? profile?.photoDataUrl ?? '').slice(0, 250000);
      const safeFilenameMode = updates.preferredFilenameMode || 'default';
      const safeAutoClipboard =
        typeof updates.autoClipboard === 'boolean'
          ? updates.autoClipboard
          : profile?.autoClipboard ?? true;

      await updateProfile(current, {
        displayName: safeName,
        photoURL: safePhoto.startsWith('http') ? safePhoto : current.photoURL,
      });

      setProfile((prev) => ({
        uid: current.uid,
        displayName: safeName,
        email: current.email || prev?.email || '',
        photoDataUrl: safePhoto,
        bio: safeBio,
        preferredFilenameMode: safeFilenameMode,
        autoClipboard: safeAutoClipboard,
      }));

      if (current.emailVerified) {
        const userRef = doc(db, 'users', current.uid);
        const path = `users/${current.uid}`;
        try {
          const existingSnap = await getDoc(userRef);
          if (existingSnap.exists()) {
            await updateDoc(userRef, {
              displayName: safeName,
              email: (current.email || '').slice(0, 120),
              photoDataUrl: safePhoto,
              bio: safeBio,
              preferredFilenameMode: safeFilenameMode,
              autoClipboard: safeAutoClipboard,
              updatedAt: serverTimestamp(),
            });
          } else {
            await setDoc(userRef, {
              uid: current.uid,
              displayName: safeName,
              email: (current.email || '').slice(0, 120),
              photoDataUrl: safePhoto,
              bio: safeBio,
              preferredFilenameMode: safeFilenameMode,
              autoClipboard: safeAutoClipboard,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, path);
        }
      }
    },
    [profile?.autoClipboard, profile?.photoDataUrl]
  );

  const changeOrSetPassword = useCallback(
    async ({ currentPassword, newPassword }: { currentPassword?: string; newPassword: string }) => {
      const current = auth.currentUser;
      if (!current || !current.email) {
        throw new Error('Akun tidak memiliki email aktif.');
      }
      if (newPassword.length < 6) {
        throw new Error('Kata sandi baru minimal 6 karakter.');
      }

      const alreadyHasPassword = current.providerData.some((p) => p.providerId === 'password');

      if (alreadyHasPassword) {
        if (!currentPassword) {
          throw new Error('Masukkan kata sandi lama terlebih dahulu.');
        }
        const credential = EmailAuthProvider.credential(current.email, currentPassword);
        await reauthenticateWithCredential(current, credential);
        await updatePassword(current, newPassword);
      } else {
        const credential = EmailAuthProvider.credential(current.email, newPassword);
        try {
          await linkWithCredential(current, credential);
        } catch (err) {
          const code =
            typeof err === 'object' && err !== null && 'code' in err
              ? String((err as { code?: string }).code)
              : '';
          if (code === 'auth/requires-recent-login') {
            await reauthenticateWithPopup(current, googleProvider);
            await linkWithCredential(current, credential);
          } else {
            throw err;
          }
        }
        await current.reload();
        setUser(auth.currentUser);
      }
    },
    []
  );

  const sendPasswordChangeCodeToEmail = useCallback(async () => {
    const current = auth.currentUser;
    if (!current || !current.email) {
      throw new Error('Akun tidak memiliki alamat email aktif.');
    }
    await sendPasswordResetEmail(auth, current.email);
  }, []);

  const verifyAndConfirmPasswordCode = useCallback(
    async (codeOrUrl: string, newPassword: string) => {
      const current = auth.currentUser;
      if (!current || !current.email) {
        throw new Error('Anda harus masuk terlebih dahulu.');
      }
      if (newPassword.length < 6) {
        throw new Error('Kata sandi baru minimal 6 karakter.');
      }

      const raw = codeOrUrl.trim();
      if (!raw) {
        throw new Error('Masukkan kode atau tautan verifikasi yang dikirim ke email Anda.');
      }

      let oobCode = raw;
      if (/^https?:\/\//i.test(raw) || raw.includes('oobCode=')) {
        try {
          const parsed = new URL(raw.startsWith('http') ? raw : `https://dummy.local/?${raw}`);
          oobCode = parsed.searchParams.get('oobCode') || raw;
        } catch {
          const match = raw.match(/[?&]oobCode=([^&]+)/i);
          if (match?.[1]) oobCode = decodeURIComponent(match[1]);
        }
      }

      const verifiedEmail = await verifyPasswordResetCode(auth, oobCode);
      if (verifiedEmail.toLowerCase() !== current.email.toLowerCase()) {
        throw new Error('Kode verifikasi ini bukan milik email akun yang sedang masuk.');
      }

      await confirmPasswordReset(auth, oobCode, newPassword);
      await current.reload();
      setUser(auth.currentUser);
    },
    []
  );

  const confirmPasswordResetByActionCode = useCallback(
    async (oobCode: string, newPassword: string) => {
      if (newPassword.length < 6) {
        throw new Error('Kata sandi baru minimal 6 karakter.');
      }
      const email = await verifyPasswordResetCode(auth, oobCode);
      await confirmPasswordReset(auth, oobCode, newPassword);
      if (auth.currentUser) {
        await auth.currentUser.reload();
        setUser(auth.currentUser);
      }
      return email;
    },
    []
  );

  const applyEmailVerificationByCode = useCallback(async (oobCode: string) => {
    await applyActionCode(auth, oobCode);
    if (auth.currentUser) {
      await auth.currentUser.reload();
      setUser(auth.currentUser);
    }
  }, []);

  const syncDownloadToCloud = useCallback(async (item: Omit<CloudHistoryItem, 'savedAt'>) => {
    const current = auth.currentUser;
    if (!current || !current.emailVerified) return;

    const safeId = item.id.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 128);
    if (!safeId) return;

    const safeFolder: CollectionFolder = COLLECTION_FOLDERS.includes(
      item.collectionFolder as CollectionFolder
    )
      ? (item.collectionFolder as CollectionFolder)
      : 'Umum';

    const userRef = doc(db, 'users', current.uid);
    const itemRef = doc(db, 'users', current.uid, 'downloads', safeId);
    const path = `users/${current.uid}/downloads/${safeId}`;

    try {
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        await setDoc(userRef, {
          uid: current.uid,
          displayName: (current.displayName || current.email?.split('@')[0] || 'Pengguna').slice(
            0,
            60
          ),
          email: (current.email || '').slice(0, 120),
          photoDataUrl: (current.photoURL || '').slice(0, 250000),
          bio: '',
          preferredFilenameMode: 'default',
          autoClipboard: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      const existingItem = await getDoc(itemRef);
      if (existingItem.exists()) {
        const existingFolder = COLLECTION_FOLDERS.includes(
          existingItem.data().collectionFolder as CollectionFolder
        )
          ? (existingItem.data().collectionFolder as CollectionFolder)
          : safeFolder;
        await updateDoc(itemRef, {
          url: item.url.slice(0, 500),
          title: item.title.slice(0, 300),
          authorName: item.authorName.slice(0, 100),
          uniqueId: item.uniqueId.slice(0, 100),
          cover: item.cover.slice(0, 1000),
          isFavorite: Boolean(existingItem.data().isFavorite || item.isFavorite),
          collectionFolder: existingFolder,
          updatedAt: serverTimestamp(),
        });
      } else {
        await setDoc(itemRef, {
          id: safeId,
          userId: current.uid,
          platform: item.platform,
          url: item.url.slice(0, 500),
          title: item.title.slice(0, 300),
          authorName: item.authorName.slice(0, 100),
          uniqueId: item.uniqueId.slice(0, 100),
          cover: item.cover.slice(0, 1000),
          isFavorite: Boolean(item.isFavorite),
          collectionFolder: safeFolder,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }, []);

  const toggleCloudFavorite = useCallback(async (id: string, isFavorite: boolean) => {
    const current = auth.currentUser;
    if (!current || !current.emailVerified) return;
    const safeId = id.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 128);
    if (!safeId) return;
    const path = `users/${current.uid}/downloads/${safeId}`;
    try {
      await updateDoc(doc(db, 'users', current.uid, 'downloads', safeId), {
        isFavorite,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  }, []);

  const updateCloudFolder = useCallback(
    async (id: string, collectionFolder: CollectionFolder) => {
      const current = auth.currentUser;
      if (!current || !current.emailVerified) return;
      const safeId = id.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 128);
      if (!safeId) return;
      const safeFolder: CollectionFolder = COLLECTION_FOLDERS.includes(collectionFolder)
        ? collectionFolder
        : 'Umum';
      const path = `users/${current.uid}/downloads/${safeId}`;
      try {
        await updateDoc(doc(db, 'users', current.uid, 'downloads', safeId), {
          collectionFolder: safeFolder,
          updatedAt: serverTimestamp(),
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, path);
      }
    },
    []
  );

  const removeCloudItem = useCallback(async (id: string) => {
    const current = auth.currentUser;
    if (!current || !current.emailVerified) return;
    const safeId = id.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 128);
    if (!safeId) return;
    const path = `users/${current.uid}/downloads/${safeId}`;
    try {
      await deleteDoc(doc(db, 'users', current.uid, 'downloads', safeId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  }, []);

  const submitBugReport = useCallback(
    async (report: { targetUrl: string; platform: string; description: string }) => {
      const current = auth.currentUser;
      if (!current || !current.emailVerified) {
        throw new Error('Login & verifikasi email untuk menyimpan laporan ke cloud.');
      }
      const cleanDesc = report.description.trim().slice(0, 600);
      if (cleanDesc.length < 5) {
        throw new Error('Deskripsi kendala minimal 5 karakter.');
      }
      const reportId = `rep_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const userRef = doc(db, 'users', current.uid);
      const reportRef = doc(db, 'users', current.uid, 'reports', reportId);
      const path = `users/${current.uid}/reports/${reportId}`;

      try {
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
          await setDoc(userRef, {
            uid: current.uid,
            displayName: (current.displayName || current.email?.split('@')[0] || 'Pengguna').slice(
              0,
              60
            ),
            email: (current.email || '').slice(0, 120),
            photoDataUrl: (current.photoURL || '').slice(0, 250000),
            bio: '',
            preferredFilenameMode: 'default',
            autoClipboard: true,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }

        await setDoc(reportRef, {
          id: reportId,
          userId: current.uid,
          targetUrl: report.targetUrl.trim().slice(0, 500),
          platform: (report.platform.trim() || 'umum').slice(0, 32),
          description: cleanDesc,
          status: 'open',
          createdAt: serverTimestamp(),
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, path);
      }
    },
    []
  );

  const signOutUser = useCallback(async () => {
    cachedDriveAccessToken = null;
    setHasDriveAccess(false);
    await signOut(auth);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        authReady,
        cloudHistory,
        hasPasswordProvider,
        hasGoogleProvider,
        hasDriveAccess,
        getDriveAccessToken,
        invalidateDriveAccessToken,
        connectGoogleDrive,
        signInWithGoogle,
        signInWithEmail,
        registerWithEmail,
        sendPasswordReset,
        resendVerificationEmail,
        updateUserProfile,
        changeOrSetPassword,
        sendPasswordChangeCodeToEmail,
        verifyAndConfirmPasswordCode,
        confirmPasswordResetByActionCode,
        applyEmailVerificationByCode,
        syncDownloadToCloud,
        toggleCloudFavorite,
        updateCloudFolder,
        removeCloudItem,
        submitBugReport,
        signOutUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return ctx;
}
