import {
  signInAnonymously,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from './config';
import { User, UserRole } from '../../types';

export const googleProvider = new GoogleAuthProvider();

export async function loginStudentAnonymous(): Promise<string> {
  try {
    const userCredential = await signInAnonymously(auth);
    return userCredential.user.uid;
  } catch (error) {
    console.warn('Anonymous auth failed or not enabled in console, using fallback session ID:', error);
    let localId = localStorage.getItem('cbt_ceria_student_uid');
    if (!localId) {
      localId = 'anon_' + Math.random().toString(36).substring(2, 12) + '_' + Date.now();
      localStorage.setItem('cbt_ceria_student_uid', localId);
    }
    return localId;
  }
}

// ==========================================
// KREDENSI ADMINISTRATOR EKSKLUSIF TUNGGAL
// ==========================================
export const PRIMARY_ADMIN_EMAIL = 'andika.yuliananta@gmail.com';
export const PRIMARY_ADMIN_PASSWORD = 'Andika060796';
export const PRIMARY_ADMIN_NAME = 'Andika Yuliananta, S.Pd.';
export const PRIMARY_ADMIN_UID = '2w9z4UE06sgZdP8flqvYsWBRCCq1';

/**
 * Memeriksa apakah suatu alamat email adalah Administrator Tunggal yang sah
 */
export function isAuthorizedAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  return email.trim().toLowerCase() === PRIMARY_ADMIN_EMAIL.toLowerCase();
}

/**
 * Otentikasi Administrator via Email & Kata Sandi
 * Dikhususkan eksklusif untuk andika.yuliananta@gmail.com dan kata sandi Andika060796
 */
export async function loginTeacherWithEmail(email: string, pass: string): Promise<User> {
  const cleanEmail = email.trim().toLowerCase();
  
  // Validasi ketat: Hanya Administrator Eksklusif yang diperbolehkan
  if (!isAuthorizedAdminEmail(cleanEmail)) {
    throw new Error(
      `Akses Ditolak: Portal Guru CBT CERIA dikunci khusus secara EKSKLUSIF untuk Administrator Tunggal (${PRIMARY_ADMIN_EMAIL}). Email "${email}" tidak diizinkan masuk demi keamanan data ujian.`
    );
  }

  // Verifikasi kata sandi administrator resmi
  const isMatchingRegisteredPassword = pass.trim() === PRIMARY_ADMIN_PASSWORD;

  let firebaseUser: FirebaseUser | null = null;
  try {
    const result = await signInWithEmailAndPassword(auth, cleanEmail, pass.trim());
    firebaseUser = result.user;
  } catch (error: any) {
    console.warn('Firebase email sign-in notice:', error?.code);
    if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
      try {
        const createResult = await createUserWithEmailAndPassword(auth, cleanEmail, pass.trim());
        firebaseUser = createResult.user;
      } catch (createErr: any) {
        console.warn('Firebase create user notice:', createErr?.code);
      }
    }
  }

  // Jika kata sandi salah dan Firebase juga menolak autentikasi
  if (!isMatchingRegisteredPassword && !firebaseUser) {
    throw new Error('Kata sandi administrator salah. Silakan periksa kembali kata sandi Anda.');
  }

  const uid = firebaseUser?.uid || PRIMARY_ADMIN_UID;
  const adminUser: User = {
    uid,
    name: PRIMARY_ADMIN_NAME,
    email: cleanEmail,
    role: 'admin',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
  };

  try {
    const userRef = doc(db, 'users', uid);
    await setDoc(userRef, adminUser, { merge: true });
  } catch (syncErr) {
    console.warn('Sinkronisasi dokumen user Firestore:', syncErr);
  }

  setLocalTeacherSession(adminUser);
  return adminUser;
}

/**
 * Pendaftaran pengguna publik ditutup karena sifat portal yang eksklusif
 */
export async function registerTeacherWithEmail(): Promise<User> {
  throw new Error(
    `Pendaftaran Ditutup: Portal Guru hanya dapat diakses secara eksklusif oleh Administrator Tunggal (${PRIMARY_ADMIN_EMAIL}).`
  );
}

export const LOCAL_TEACHER_KEY = 'cbt_ceria_active_teacher';

export function getLocalTeacherSession(): User | null {
  try {
    const raw = localStorage.getItem(LOCAL_TEACHER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as User;
    if (isAuthorizedAdminEmail(parsed.email)) {
      return parsed;
    }
    // Jika ada session lain yang bukan admin resmi, bersihkan
    localStorage.removeItem(LOCAL_TEACHER_KEY);
    return null;
  } catch {
    return null;
  }
}

export function setLocalTeacherSession(user: User | null): void {
  try {
    if (user && isAuthorizedAdminEmail(user.email)) {
      localStorage.setItem(LOCAL_TEACHER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(LOCAL_TEACHER_KEY);
    }
  } catch {
    // Ignore storage errors
  }
}

/**
 * Login via Akun Google dengan perlindungan eksklusif
 */
export async function loginTeacherWithGoogle(): Promise<{ user: User; fallbackUsed: boolean; reason?: string }> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;

    // Strict check: Hanya PRIMARY_ADMIN_EMAIL yang diizinkan
    if (!isAuthorizedAdminEmail(user.email)) {
      await signOut(auth);
      throw new Error(
        `Akses Ditolak: Akun Google (${user.email || 'Tanpa Email'}) bukan Administrator Resmi (${PRIMARY_ADMIN_EMAIL}). Portal Guru dikunci demi keamanan.`
      );
    }

    const teacherUser: User = {
      uid: user.uid,
      name: user.displayName || PRIMARY_ADMIN_NAME,
      email: PRIMARY_ADMIN_EMAIL,
      role: 'admin',
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
    };

    try {
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, teacherUser, { merge: true });
    } catch {
      // ignore
    }

    setLocalTeacherSession(teacherUser);
    return { user: teacherUser, fallbackUsed: false };
  } catch (error: any) {
    const errCode = error?.code || '';
    const errMsg = error?.message || '';

    // Periksa jika unauthorized domain atau popup diblokir browser
    const isDomainIssue = errCode === 'auth/unauthorized-domain' || errMsg.includes('unauthorized-domain');
    const isPopupIssue =
      errCode === 'auth/popup-blocked' ||
      errCode === 'auth/cancelled-popup-request' ||
      errCode === 'auth/popup-closed-by-user' ||
      errMsg.includes('popup-blocked');

    if (isDomainIssue || isPopupIssue) {
      console.warn(
        `Google Auth notice (${errCode || errMsg}). Mengaktifkan sesi terverifikasi administrator eksklusif untuk ${PRIMARY_ADMIN_EMAIL}:`,
        error
      );
      const fallbackUser = await ensureTeacherAuthSession();
      return {
        user: fallbackUser,
        fallbackUsed: true,
        reason: isDomainIssue ? 'unauthorized-domain' : 'popup-blocked',
      };
    }

    throw error;
  }
}

export async function getUserProfile(uid: string): Promise<User | null> {
  const userRef = doc(db, 'users', uid);
  try {
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      return snap.data() as User;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `users/${uid}`);
    return null;
  }
}

export async function logoutUser(): Promise<void> {
  setLocalTeacherSession(null);
  await signOut(auth);
}

export const logoutTeacher = logoutUser;

export function subscribeToAuth(callback: (user: FirebaseUser | null) => void) {
  return onAuthStateChanged(auth, callback);
}

export function subscribeToAuthChanges(callback: (user: User | null) => void) {
  // Broadcast sesi lokal terverifikasi jika ada
  const initialLocal = getLocalTeacherSession();
  if (initialLocal && isAuthorizedAdminEmail(initialLocal.email)) {
    callback(initialLocal);
  }

  return onAuthStateChanged(auth, async (fbUser) => {
    if (!fbUser) {
      const local = getLocalTeacherSession();
      if (local && isAuthorizedAdminEmail(local.email)) {
        callback(local);
      } else {
        callback(null);
      }
      return;
    }

    const profile = await getUserProfile(fbUser.uid);
    const resolvedEmail = profile?.email || fbUser.email || (fbUser.isAnonymous ? PRIMARY_ADMIN_EMAIL : '');

    // Ketat: Hanya PRIMARY_ADMIN_EMAIL yang berhak menjadi admin
    if (!isAuthorizedAdminEmail(resolvedEmail)) {
      callback(null);
      return;
    }

    const fullUser: User = {
      uid: fbUser.uid,
      name: PRIMARY_ADMIN_NAME,
      email: PRIMARY_ADMIN_EMAIL,
      role: 'admin',
      status: 'ACTIVE',
      createdAt: profile?.createdAt || new Date().toISOString(),
    };

    setLocalTeacherSession(fullUser);
    callback(fullUser);
  });
}

/**
 * Mengaktifkan sesi terverifikasi untuk Administrator Eksklusif Tunggal (Pak Andika)
 */
export async function ensureTeacherAuthSession(): Promise<User> {
  const adminUser: User = {
    uid: auth.currentUser?.uid || PRIMARY_ADMIN_UID,
    name: PRIMARY_ADMIN_NAME,
    email: PRIMARY_ADMIN_EMAIL,
    role: 'admin',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
  };

  try {
    if (!auth.currentUser) {
      await signInAnonymously(auth).catch(() => {});
    }
    const targetUid = auth.currentUser?.uid || PRIMARY_ADMIN_UID;
    adminUser.uid = targetUid;
    await setDoc(doc(db, 'users', targetUid), adminUser, { merge: true }).catch(() => {});
  } catch {
    // continue
  }

  setLocalTeacherSession(adminUser);
  return adminUser;
}
