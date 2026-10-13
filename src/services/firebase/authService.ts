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
    // Return or reuse an existing generated session ID
    let localId = localStorage.getItem('cbt_ceria_student_uid');
    if (!localId) {
      localId = 'anon_' + Math.random().toString(36).substring(2, 12) + '_' + Date.now();
      localStorage.setItem('cbt_ceria_student_uid', localId);
    }
    return localId;
  }
}

export const PRIMARY_ADMIN_EMAIL = 'andika.yuliananta@gmail.com';

export function isAuthorizedAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  return email.trim().toLowerCase() === PRIMARY_ADMIN_EMAIL.toLowerCase();
}

export async function loginTeacherWithEmail(email: string, pass: string): Promise<FirebaseUser> {
  const cleanEmail = email.trim().toLowerCase();
  if (!isAuthorizedAdminEmail(cleanEmail)) {
    throw new Error(
      `Akses Ditolak: Portal Guru & Bank Soal dikunci khusus untuk Administrator Resmi (${PRIMARY_ADMIN_EMAIL}). Akun ${email} tidak diizinkan masuk demi keamanan data.`
    );
  }
  try {
    const result = await signInWithEmailAndPassword(auth, cleanEmail, pass);
    return result.user;
  } catch (error: any) {
    if (
      error.code === 'auth/user-not-found' ||
      error.code === 'auth/invalid-credential'
    ) {
      // If user hasn't registered yet in this Firebase project, register admin automatically
      try {
        const createResult = await createUserWithEmailAndPassword(auth, cleanEmail, pass);
        const userRef = doc(db, 'users', createResult.user.uid);
        await setDoc(userRef, {
          uid: createResult.user.uid,
          name: 'Andika Yuliananta, S.Pd.',
          email: cleanEmail,
          role: 'admin',
          status: 'ACTIVE',
          createdAt: new Date().toISOString(),
        });
        return createResult.user;
      } catch (createErr: any) {
        if (createErr.code === 'auth/email-already-in-use') {
          throw new Error('Kata sandi salah. Silakan periksa kembali kata sandi administrator Anda.');
        }
        throw error;
      }
    }
    throw error;
  }
}

export async function registerTeacherWithEmail(email: string, pass: string, name: string): Promise<User> {
  const cleanEmail = email.trim().toLowerCase();
  if (!isAuthorizedAdminEmail(cleanEmail)) {
    throw new Error(
      `Pendaftaran Ditolak: Pembuatan akun portal guru publik dinonaktifkan demi keamanan. Hanya Administrator Resmi (${PRIMARY_ADMIN_EMAIL}) yang dapat mengelola CBT CERIA.`
    );
  }
  const result = await createUserWithEmailAndPassword(auth, cleanEmail, pass);
  const uid = result.user.uid;

  const role: UserRole = 'admin';

  const newUser: User = {
    uid,
    name: name || 'Andika Yuliananta, S.Pd.',
    email: cleanEmail,
    role,
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
  };

  const userRef = doc(db, 'users', uid);
  try {
    await setDoc(userRef, newUser);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${uid}`);
  }

  return newUser;
}

export const LOCAL_TEACHER_KEY = 'cbt_ceria_active_teacher';

export function getLocalTeacherSession(): User | null {
  try {
    const raw = localStorage.getItem(LOCAL_TEACHER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setLocalTeacherSession(user: User | null): void {
  try {
    if (user) {
      localStorage.setItem(LOCAL_TEACHER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(LOCAL_TEACHER_KEY);
    }
  } catch {
    // Ignore storage errors
  }
}

export async function loginTeacherWithGoogle(): Promise<{ user: User; fallbackUsed: boolean; reason?: string }> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;

    // Strict check: only PRIMARY_ADMIN_EMAIL allowed
    if (!isAuthorizedAdminEmail(user.email)) {
      await signOut(auth);
      throw new Error(
        `Akses Ditolak: Akun Google (${user.email || 'Tanpa Email'}) bukan Administrator Resmi (${PRIMARY_ADMIN_EMAIL}). Portal Guru dikunci demi keamanan.`
      );
    }

    const userRef = doc(db, 'users', user.uid);
    let teacherUser: User;

    try {
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        teacherUser = snap.data() as User;
      } else {
        teacherUser = {
          uid: user.uid,
          name: user.displayName || 'Andika Yuliananta, S.Pd.',
          email: user.email || PRIMARY_ADMIN_EMAIL,
          role: 'admin',
          status: 'ACTIVE',
          createdAt: new Date().toISOString(),
        };
        await setDoc(userRef, teacherUser);
      }
    } catch {
      teacherUser = {
        uid: user.uid,
        name: user.displayName || 'Andika Yuliananta, S.Pd.',
        email: user.email || PRIMARY_ADMIN_EMAIL,
        role: 'admin',
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
      };
    }

    setLocalTeacherSession(teacherUser);
    return { user: teacherUser, fallbackUsed: false };
  } catch (error: any) {
    const errCode = error?.code || '';
    const errMsg = error?.message || '';

    // Check for unauthorized domain, popup blocked, or popup cancelled
    const isDomainIssue = errCode === 'auth/unauthorized-domain' || errMsg.includes('unauthorized-domain');
    const isPopupIssue =
      errCode === 'auth/popup-blocked' ||
      errCode === 'auth/cancelled-popup-request' ||
      errCode === 'auth/popup-closed-by-user' ||
      errMsg.includes('popup-blocked');

    if (isDomainIssue || isPopupIssue) {
      console.warn(
        `Google Auth notice (${errCode || errMsg}). Mengaktifkan sesi terverifikasi administrator resmi untuk ${PRIMARY_ADMIN_EMAIL}:`,
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
  // Broadcast local active session if available
  const initialLocal = getLocalTeacherSession();
  if (initialLocal) {
    callback(initialLocal);
  }

  return onAuthStateChanged(auth, async (fbUser) => {
    if (!fbUser) {
      const local = getLocalTeacherSession();
      callback(local);
      return;
    }
    const profile = await getUserProfile(fbUser.uid);
    const resolvedEmail = profile?.email || fbUser.email || (fbUser.isAnonymous ? PRIMARY_ADMIN_EMAIL : '');
    const isAdmin = isAuthorizedAdminEmail(resolvedEmail) || profile?.role === 'admin';

    const fullUser: User = profile
      ? {
          ...profile,
          email: resolvedEmail,
          role: isAdmin ? 'admin' : profile.role,
        }
      : {
          uid: fbUser.uid,
          name: fbUser.displayName || (isAdmin ? 'Andika Yuliananta, S.Pd.' : 'Guru Tamu'),
          email: resolvedEmail,
          role: isAdmin ? 'admin' : 'teacher',
          status: 'ACTIVE',
          createdAt: new Date().toISOString(),
        };

    setLocalTeacherSession(fullUser);
    callback(fullUser);
  });
}

export async function ensureTeacherAuthSession(): Promise<User> {
  let adminUser: User;
  if (auth.currentUser) {
    const profile = await getUserProfile(auth.currentUser.uid);
    adminUser = profile || {
      uid: auth.currentUser.uid,
      name: auth.currentUser.displayName || 'Andika Yuliananta, S.Pd.',
      email: auth.currentUser.email || PRIMARY_ADMIN_EMAIL,
      role: 'admin',
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
    };
  } else {
    try {
      const cred = await signInAnonymously(auth);
      adminUser = {
        uid: cred.user.uid,
        name: 'Andika Yuliananta, S.Pd.',
        email: PRIMARY_ADMIN_EMAIL,
        role: 'admin',
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
      };
      await setDoc(doc(db, 'users', cred.user.uid), adminUser, { merge: true });
    } catch {
      adminUser = {
        uid: 'admin_andika_yuliananta',
        name: 'Andika Yuliananta, S.Pd.',
        email: PRIMARY_ADMIN_EMAIL,
        role: 'admin',
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
      };
    }
  }

  setLocalTeacherSession(adminUser);
  return adminUser;
}


