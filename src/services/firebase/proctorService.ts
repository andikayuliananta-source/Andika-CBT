import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  deleteField,
  query,
  where,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './config';
import { Proctor, ProctorSession, Participant } from '../../types';
import { cleanFirestoreData } from './examService';

const PROCTORS_COLLECTION = 'proctors';
const PROCTOR_SESSION_KEY = 'cbt_proctor_session';

/**
 * Fetch all proctors (Admin only view)
 */
export async function getProctors(): Promise<Proctor[]> {
  try {
    const q = query(collection(db, PROCTORS_COLLECTION), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as Proctor);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, PROCTORS_COLLECTION);
    return [];
  }
}

/**
 * Create a new proctor account
 */
export async function createProctor(
  data: {
    username: string;
    password: string;
    name: string;
    roomOrLab?: string;
    assignedExamIds?: string[];
    createdBy?: string;
  }
): Promise<Proctor> {
  const normUsername = data.username.trim().toLowerCase();

  // Validate username uniqueness
  const existingQ = query(
    collection(db, PROCTORS_COLLECTION),
    where('username', '==', normUsername),
    limit(1)
  );
  const existingSnap = await getDocs(existingQ);
  if (!existingSnap.empty) {
    throw new Error(`Username proktor "${normUsername}" sudah digunakan. Gunakan username lain.`);
  }

  const proctorId = 'proctor_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
  const now = new Date().toISOString();

  const newProctor: Proctor = cleanFirestoreData({
    proctorId,
    username: normUsername,
    password: data.password.trim(),
    name: data.name.trim(),
    roomOrLab: data.roomOrLab?.trim() || 'Semua Ruangan',
    status: 'ACTIVE',
    assignedExamIds: data.assignedExamIds || [],
    createdAt: now,
    updatedAt: now,
    createdBy: data.createdBy || 'admin',
  });

  try {
    await setDoc(doc(db, PROCTORS_COLLECTION, proctorId), newProctor);
    return newProctor;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `${PROCTORS_COLLECTION}/${proctorId}`);
    throw error;
  }
}

/**
 * Update existing proctor account
 */
export async function updateProctor(
  proctorId: string,
  updates: Partial<Pick<Proctor, 'name' | 'password' | 'roomOrLab' | 'status' | 'assignedExamIds'>>
): Promise<void> {
  const path = `${PROCTORS_COLLECTION}/${proctorId}`;
  try {
    const updatePayload: Record<string, any> = {
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    if (updates.password) {
      updatePayload.password = updates.password.trim();
    }
    if (updates.name) {
      updatePayload.name = updates.name.trim();
    }
    await updateDoc(doc(db, PROCTORS_COLLECTION, proctorId), cleanFirestoreData(updatePayload));
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
    throw error;
  }
}

/**
 * Delete a proctor account
 */
export async function deleteProctor(proctorId: string): Promise<void> {
  const path = `${PROCTORS_COLLECTION}/${proctorId}`;
  try {
    await deleteDoc(doc(db, PROCTORS_COLLECTION, proctorId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
    throw error;
  }
}

/**
 * Authenticate proctor login
 */
export async function loginProctor(username: string, password: string): Promise<ProctorSession> {
  const normUsername = username.trim().toLowerCase();
  const inputPassword = password.trim();

  if (!normUsername || !inputPassword) {
    throw new Error('Harap masukkan Username dan Password proktor.');
  }

  // Also check default fallback seed if database is empty
  await seedDefaultProctorIfNone();

  try {
    const q = query(
      collection(db, PROCTORS_COLLECTION),
      where('username', '==', normUsername),
      limit(1)
    );
    const snap = await getDocs(q);

    if (snap.empty) {
      throw new Error('Username proktor tidak ditemukan.');
    }

    const proctor = snap.docs[0].data() as Proctor;

    if (proctor.status !== 'ACTIVE') {
      throw new Error('Akun proktor ini sedang dinonaktifkan oleh Administrator.');
    }

    if (proctor.password !== inputPassword) {
      throw new Error('Password proktor salah. Silakan periksa kembali.');
    }

    const session: ProctorSession = {
      proctorId: proctor.proctorId,
      username: proctor.username,
      name: proctor.name,
      roomOrLab: proctor.roomOrLab,
      loginAt: new Date().toISOString(),
    };

    saveProctorSession(session);
    return session;
  } catch (error: any) {
    if (error.message && (error.message.includes('Username') || error.message.includes('Password') || error.message.includes('dinonaktifkan'))) {
      throw error;
    }
    handleFirestoreError(error, OperationType.GET, PROCTORS_COLLECTION);
    throw error;
  }
}

/**
 * Proctor Session persistence in localStorage / sessionStorage
 */
export function getStoredProctorSession(): ProctorSession | null {
  try {
    const raw = localStorage.getItem(PROCTOR_SESSION_KEY) || sessionStorage.getItem(PROCTOR_SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ProctorSession;
  } catch {
    return null;
  }
}

export function saveProctorSession(session: ProctorSession): void {
  try {
    const raw = JSON.stringify(session);
    localStorage.setItem(PROCTOR_SESSION_KEY, raw);
    sessionStorage.setItem(PROCTOR_SESSION_KEY, raw);
  } catch (e) {
    console.warn('Gagal menyimpan sesi proktor:', e);
  }
}

export function clearProctorSession(): void {
  try {
    localStorage.removeItem(PROCTOR_SESSION_KEY);
    sessionStorage.removeItem(PROCTOR_SESSION_KEY);
  } catch (e) {
    // ignore
  }
}

/**
 * Reset participant session by proctor:
 * Unlocks the participant's session and sets status back to 'IN_PROGRESS'
 * WITHOUT deleting or wiping any student answers already saved in Firestore!
 */
export async function resetStudentSessionByProctor(
  participantId: string,
  examId?: string
): Promise<void> {
  const path = `participants/${participantId}`;
  try {
    const partRef = doc(db, 'participants', participantId);
    const snap = await getDoc(partRef);

    if (!snap.exists()) {
      throw new Error('Data peserta tidak ditemukan.');
    }

    const participantData = snap.data() as Participant;

    // Update status to IN_PROGRESS, unlock session, and note reset timestamp
    const updates: Record<string, any> = {
      status: 'IN_PROGRESS',
      resetByProctorAt: new Date().toISOString(),
      sessionLocked: false,
      submitReason: deleteField(),
    };

    await updateDoc(partRef, cleanFirestoreData(updates));

    // Clear local completion flags in current browser context (if on same workstation)
    if (examId) {
      const normName = participantData.name.trim().toLowerCase();
      localStorage.removeItem(`cbt_finished_${examId}_${normName}`);
      localStorage.removeItem(`cbt_session_${examId}`);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
    throw error;
  }
}

/**
 * Seed initial default proctor if collection has zero proctors
 */
export async function seedDefaultProctorIfNone(): Promise<void> {
  try {
    const snap = await getDocs(query(collection(db, PROCTORS_COLLECTION), limit(1)));
    if (snap.empty) {
      const now = new Date().toISOString();
      const defaultProctor: Proctor = {
        proctorId: 'proctor_demo_1',
        username: 'proktor1',
        password: 'proktor123',
        name: 'Proktor Lab Komputer 1',
        roomOrLab: 'Lab Komputer Utama',
        status: 'ACTIVE',
        assignedExamIds: [],
        createdAt: now,
        updatedAt: now,
        createdBy: 'system_seed',
      };
      await setDoc(doc(db, PROCTORS_COLLECTION, defaultProctor.proctorId), defaultProctor);
    }
  } catch (e) {
    console.warn('Initial proctor seed check error:', e);
  }
}
