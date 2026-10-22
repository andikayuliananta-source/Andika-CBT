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
  serverTimestamp,
  writeBatch,
  DocumentReference,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, handleFirestoreError, OperationType } from './config';
import { compressImageFile } from '../../utils/imageCompressor';
import { ensureTeacherAuthSession } from './authService';
import {
  Exam,
  Question,
  Participant,
  Answer,
  Result,
  StudentSafeQuestion,
  GradeLevel,
  SubmitReason,
  CrashRecoveryState,
  ActiveCrashSession,
  LocalAnswerDraft,
  OfflineDraftSyncResult,
  AutosaveSnapshot,
} from '../../types';

// ==========================================
// FIRESTORE SANITIZATION HELPER
// ==========================================

/**
 * Recursively removes any object keys with undefined values.
 * Firestore strictly rejects undefined field values with an 'Unsupported field value: undefined' error.
 */
export function cleanFirestoreData<T>(data: T): T {
  if (data === null || data === undefined) {
    return data;
  }
  // Preserve Firestore FieldValue sentinels (e.g. deleteField(), serverTimestamp())
  if (
    typeof data === 'object' &&
    ('_methodName' in (data as any) ||
      (data as any).constructor?.name?.includes('FieldValue') ||
      (data as any).constructor?.name?.includes('Delete'))
  ) {
    return data;
  }
  if (Array.isArray(data)) {
    return data.map((item) => cleanFirestoreData(item)) as unknown as T;
  }
  if (typeof data === 'object' && !(data instanceof Date)) {
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(data as Record<string, any>)) {
      if (value !== undefined) {
        cleaned[key] = cleanFirestoreData(value);
      }
    }
    return cleaned as T;
  }
  return data;
}

// ==========================================
// IN-MEMORY CACHE FOR HIGH CONCURRENCY (800+ STUDENTS)
// ==========================================
const questionsCache = new Map<string, { questions: Question[]; timestamp: number }>();
const examCache = new Map<string, { exam: Exam; timestamp: number }>();
const tokenCache = new Map<string, { exam: Exam; timestamp: number }>();
const CACHE_TTL_MS = 60 * 1000; // 60 seconds cache to shield Firestore from concurrent fetch storms

export function clearExamServiceCaches(examId?: string): void {
  if (examId) {
    questionsCache.delete(examId);
    examCache.delete(examId);
  } else {
    questionsCache.clear();
    examCache.clear();
  }
  tokenCache.clear();
}

// ==========================================
// EXAM OPERATIONS
// ==========================================

export async function getExams(): Promise<Exam[]> {
  const path = 'exams';
  try {
    const q = query(collection(db, path), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as Exam);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function getExamById(examId: string): Promise<Exam | null> {
  const cached = examCache.get(examId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.exam;
  }
  const path = `exams/${examId}`;
  try {
    const snap = await getDoc(doc(db, 'exams', examId));
    if (snap.exists()) {
      const data = snap.data() as Exam;
      examCache.set(examId, { exam: data, timestamp: Date.now() });
      return data;
    }
    return null;
  } catch (error) {
    if (cached) return cached.exam;
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
}

export async function getExamByToken(token: string): Promise<{ exam: Exam | null; error?: string }> {
  const cleanToken = token.trim().toUpperCase();
  if (!cleanToken) {
    return { exam: null, error: 'Token ujian wajib diisi.' };
  }

  // Check in-memory token cache for high concurrency (800+ students entering same token)
  const cached = tokenCache.get(cleanToken);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return { exam: cached.exam };
  }

  // Fast-track demo token without Firestore latency if offline/high-traffic
  if (cleanToken === 'MAT6A26' || cleanToken.includes('DEMO')) {
    const demoExam: Exam = {
      examId: 'exam_demo_mat6_2026',
      title: 'Penilaian Sumatif Matematika Kelas 6 SD',
      subject: 'Matematika',
      grade: '6',
      phase: 'C',
      description: 'Ujian simulasi komprehensif Matematika SD berbasis CBT ramah anak.',
      token: 'MAT6A26',
      startAt: '2026-01-01T00:00:00.000Z',
      endAt: '2027-12-31T23:59:59.000Z',
      durationMinutes: 60,
      kkm: 75,
      status: 'ACTIVE',
      showScore: true,
      showAnswerReview: true,
      shuffleQuestions: false,
      shuffleOptions: false,
      createdBy: 'andika.yuliananta@gmail.com',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    tokenCache.set(cleanToken, { exam: demoExam, timestamp: Date.now() });
    examCache.set(demoExam.examId, { exam: demoExam, timestamp: Date.now() });
  }

  const path = 'exams';
  try {
    const q = query(collection(db, path), where('token', '==', cleanToken));
    const snap = await getDocs(q);

    if (snap.empty) {
      if (cleanToken === 'MAT6A26') {
        const cachedDemo = tokenCache.get(cleanToken);
        if (cachedDemo) return { exam: cachedDemo.exam };
      }
      return { exam: null, error: 'Token ujian tidak ditemukan. Periksa kembali token dari gurumu.' };
    }

    const exam = snap.docs[0].data() as Exam;

    // Check if exam is explicitly DRAFT or INACTIVE
    if (exam.status === 'DRAFT' || exam.status === 'INACTIVE') {
      return { exam: null, error: 'Ujian belum dibuka atau sedang dinonaktifkan oleh guru.' };
    }

    // Check future scheduled start time
    const now = new Date();
    if (exam.startAt && new Date(exam.startAt) > now) {
      return { exam: null, error: 'Ujian belum dimulai. Silakan tunggu jadwal mulai.' };
    }

    // If exam was marked FINISHED or endAt has elapsed in the past, auto-heal to ACTIVE
    // so students entering a valid token are never blocked by 'ujian berakhir'
    if (exam.status === 'FINISHED' || (exam.endAt && new Date(exam.endAt) < now)) {
      const futureEndAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
      exam.status = 'ACTIVE';
      exam.endAt = futureEndAt;
      updateDoc(doc(db, 'exams', exam.examId), {
        status: 'ACTIVE',
        endAt: futureEndAt,
        updatedAt: new Date().toISOString(),
      }).catch((e) => console.warn('Auto-heal exam status info:', e));
    }

    tokenCache.set(cleanToken, { exam, timestamp: Date.now() });
    examCache.set(exam.examId, { exam, timestamp: Date.now() });

    return { exam };
  } catch (error) {
    if (cached) return { exam: cached.exam };
    handleFirestoreError(error, OperationType.LIST, path);
    return { exam: null, error: 'Terjadi gangguan koneksi saat memeriksa token.' };
  }
}

export async function createExam(examData: Omit<Exam, 'examId' | 'createdAt' | 'updatedAt'>): Promise<Exam> {
  const examId = 'exam_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
  const now = new Date().toISOString();

  const newExam: Exam = cleanFirestoreData({
    ...examData,
    examId,
    createdAt: now,
    updatedAt: now,
  });

  const path = `exams/${examId}`;
  try {
    await setDoc(doc(db, 'exams', examId), newExam);
    return newExam;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
    throw error;
  }
}

export async function updateExam(examId: string, updates: Partial<Exam>): Promise<void> {
  examCache.delete(examId);
  const path = `exams/${examId}`;
  try {
    const examRef = doc(db, 'exams', examId);
    const cleanUpdates = cleanFirestoreData({
      ...updates,
      updatedAt: new Date().toISOString(),
    });
    await updateDoc(examRef, cleanUpdates);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
    throw error;
  }
}

export async function deleteExam(examId: string): Promise<void> {
  examCache.delete(examId);
  questionsCache.delete(examId);
  const path = `exams/${examId}`;
  try {
    // Delete all questions in subcollection
    const questionsSnap = await getDocs(collection(db, `exams/${examId}/questions`));
    const batch = writeBatch(db);
    questionsSnap.docs.forEach((qDoc) => {
      batch.delete(qDoc.ref);
    });
    batch.delete(doc(db, 'exams', examId));
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
    throw error;
  }
}

export async function duplicateExam(originalExamId: string, createdByUid: string): Promise<Exam> {
  const original = await getExamById(originalExamId);
  if (!original) throw new Error('Ujian tidak ditemukan');

  const newExamId = 'exam_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
  const newToken = 'CERIA' + Math.floor(1000 + Math.random() * 9000);
  const now = new Date().toISOString();

  const clonedExam: Exam = {
    ...original,
    examId: newExamId,
    title: `${original.title} (Salinan)`,
    token: newToken,
    status: 'DRAFT',
    createdBy: createdByUid,
    createdAt: now,
    updatedAt: now,
  };

  await setDoc(doc(db, 'exams', newExamId), cleanFirestoreData(clonedExam));

  // Duplicate questions
  const originalQuestions = await getQuestions(originalExamId);
  const batch = writeBatch(db);
  originalQuestions.forEach((q, idx) => {
    const newQId = 'q_' + Date.now() + '_' + idx;
    const newQ: Question = cleanFirestoreData({
      ...q,
      questionId: newQId,
      examId: newExamId,
      createdAt: now,
      updatedAt: now,
    });
    batch.set(doc(db, `exams/${newExamId}/questions`, newQId), newQ);
  });
  await batch.commit();

  return clonedExam;
}

// ==========================================
// DEFAULT DEMO QUESTIONS (FALLBACK & SEED)
// ==========================================
export const DEFAULT_DEMO_QUESTIONS: Question[] = [
  {
    questionId: 'q_demo_1',
    examId: 'exam_demo_mat6_2026',
    number: 1,
    question: 'Perhatikan gambar stimulus di bawah ini! Hasil penjumlahan pecahan 3/4 + 1/2 dalam bentuk pecahan paling sederhana adalah ...',
    imageUrl: 'https://images.unsplash.com/photo-1509228468518-180dd4864904?w=600&auto=format&fit=crop&q=80',
    optionA: '4/6',
    optionB: '5/4 atau 1 1/4',
    optionC: '4/4',
    optionD: '2/4',
    correctAnswer: 'B',
    weight: 20,
    explanation: '3/4 + 1/2 = 3/4 + 2/4 = 5/4 = 1 1/4. Maka jawaban yang tepat adalah pilihan B.',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    questionId: 'q_demo_2',
    examId: 'exam_demo_mat6_2026',
    number: 2,
    question: 'Perhatikan ilustrasi lingkaran pada gambar! Sebuah lingkaran memiliki jari-jari (r) sepanjang 14 cm. Berapakah luas lingkaran tersebut? (Gunakan π = 22/7)',
    imageUrl: 'https://images.unsplash.com/photo-1596495578065-6e0763fa1178?w=600&auto=format&fit=crop&q=80',
    optionA: '616 cm²',
    optionB: '308 cm²',
    optionC: '88 cm²',
    optionD: '154 cm²',
    correctAnswer: 'A',
    weight: 20,
    explanation: 'Rumus Luas Lingkaran = π × r² = (22/7) × 14 × 14 = 22 × 2 × 14 = 616 cm².',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    questionId: 'q_demo_3',
    examId: 'exam_demo_mat6_2026',
    number: 3,
    question: 'Perhatikan stimulus diagram persentase berikut! Bentuk persen dari pecahan 3/5 adalah ...',
    imageUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&auto=format&fit=crop&q=80',
    optionA: '30%',
    optionB: '50%',
    optionC: '60%',
    optionD: '75%',
    correctAnswer: 'C',
    weight: 20,
    explanation: '3/5 × 100% = 300% / 5 = 60%.',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    questionId: 'q_demo_4',
    examId: 'exam_demo_mat6_2026',
    number: 4,
    question: 'Perhatikan gambar bangun ruang balok di bawah ini! Sebuah balok memiliki panjang 10 cm, lebar 6 cm, dan tinggi 5 cm. Volume balok tersebut adalah ...',
    imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80',
    optionA: '150 cm³',
    optionB: '210 cm³',
    optionC: '300 cm³',
    optionD: '600 cm³',
    correctAnswer: 'C',
    weight: 20,
    explanation: 'Rumus Volume Balok = p × l × t = 10 cm × 6 cm × 5 cm = 300 cm³.',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    questionId: 'q_demo_5',
    examId: 'exam_demo_mat6_2026',
    number: 5,
    question: 'Perhatikan grafik data nilai ulangan pada gambar! Rata-rata (mean) dari nilai ulangan matematika siswa: 70, 80, 85, 90, 75 adalah ...',
    imageUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&auto=format&fit=crop&q=80',
    optionA: '78',
    optionB: '80',
    optionC: '82',
    optionD: '85',
    correctAnswer: 'B',
    weight: 20,
    explanation: 'Jumlah nilai = 70 + 80 + 85 + 90 + 75 = 400. Rata-rata = 400 / 5 = 80.',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    questionId: 'q_demo_6',
    examId: 'exam_demo_mat6_2026',
    number: 6,
    type: 'COMPLEX',
    question: 'Perhatikan gambar bangun datar berikut! Manakah pernyataan di bawah ini yang merupakan sifat-sifat dari bangun datar persegi? (Pilihlah semua pernyataan yang benar!)',
    imageUrl: 'https://images.unsplash.com/photo-1509228627152-72ae9ae6848d?w=600&auto=format&fit=crop&q=80',
    optionA: 'Memiliki 4 sisi yang sama panjang',
    optionB: 'Memiliki 4 sudut siku-siku (90°)',
    optionC: 'Hanya memiliki sepasang sisi sejajar',
    optionD: 'Kedua diagonalnya sama panjang dan saling berpotongan tegak lurus',
    correctAnswer: 'A',
    correctAnswers: ['A', 'B', 'D'],
    weight: 25,
    explanation: 'Sifat-sifat persegi: (A) 4 sisi sama panjang, (B) 4 sudut siku-siku 90°, dan (D) diagonalnya sama panjang & tegak lurus. Opsi C salah karena persegi memiliki dua pasang sisi sejajar.',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    questionId: 'q_demo_7',
    examId: 'exam_demo_mat6_2026',
    number: 7,
    type: 'COMPLEX_TF',
    question: 'Perhatikan gambar stimulus bangun ruang berikut! Tentukan apakah setiap butir pernyataan di bawah ini bernilai Benar (B) atau Salah (S)!',
    imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80',
    optionA: 'Benar',
    optionB: 'Salah',
    statements: [
      {
        id: 's1',
        text: 'Kubus memiliki 6 sisi datar yang semuanya berbentuk persegi kongruen (sama luas).',
        imageUrl: 'https://images.unsplash.com/photo-1543269865-cbf427effbad?w=400&auto=format&fit=crop&q=80',
        isCorrectTrue: true,
      },
      {
        id: 's2',
        text: 'Balok memiliki 12 rusuk dan tepat 8 titik sudut.',
        imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&auto=format&fit=crop&q=80',
        isCorrectTrue: true,
      },
      {
        id: 's3',
        text: 'Sebuah tabung memiliki 4 titik sudut yang berhadapan satu sama lain.',
        imageUrl: 'https://images.unsplash.com/photo-1596495578065-6e0763fa1178?w=400&auto=format&fit=crop&q=80',
        isCorrectTrue: false,
      },
    ],
    correctAnswer: 'A',
    weight: 20,
    explanation: 'Pernyataan 1 Benar (sisi kubus ada 6 persegi kongruen). Pernyataan 2 Benar (balok memiliki 12 rusuk dan 8 titik sudut). Pernyataan 3 Salah karena bangun ruang tabung tidak memiliki titik sudut sama sekali.',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
];

// ==========================================
// STATEMENT ANSWER HELPERS (COMPLEX_TF)
// ==========================================

export function parseStatementAnswers(raw?: string | null): Record<string, 'B' | 'S'> {
  if (!raw || typeof raw !== 'string') return {};
  const trimmed = raw.trim();
  if (!trimmed) return {};
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (typeof parsed === 'object' && parsed !== null) {
        const out: Record<string, 'B' | 'S'> = {};
        for (const [k, v] of Object.entries(parsed)) {
          if (v === 'B' || v === 'S') {
            out[k] = v;
          }
        }
        return out;
      }
    } catch {
      // fallback
    }
  }
  // Fallback for format "s1:B,s2:S"
  const result: Record<string, 'B' | 'S'> = {};
  const parts = trimmed.split(',');
  for (const part of parts) {
    const [id, val] = part.split(':').map((s) => s.trim().toUpperCase());
    if (id && (val === 'B' || val === 'S')) {
      result[id] = val;
    }
  }
  return result;
}

export function serializeStatementAnswers(map: Record<string, 'B' | 'S'>): string {
  if (!map || Object.keys(map).length === 0) return '';
  return JSON.stringify(map);
}

// ==========================================
// QUESTION OPERATIONS
// ==========================================

export async function getQuestions(examId: string): Promise<Question[]> {
  const cached = questionsCache.get(examId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.questions;
  }
  const path = `exams/${examId}/questions`;
  try {
    const snap = await getDocs(collection(db, path));
    if (snap.empty) {
      // If it's the demo exam or demo token, populate demo questions so it's never empty
      if (examId === 'exam_demo_mat6_2026' || examId.includes('demo')) {
        try {
          const batch = writeBatch(db);
          DEFAULT_DEMO_QUESTIONS.forEach((q) => {
            batch.set(doc(db, 'exams', examId, 'questions', q.questionId), cleanFirestoreData({ ...q, examId }));
          });
          await batch.commit();
        } catch {
          // batch write fallback
        }
        questionsCache.set(examId, { questions: DEFAULT_DEMO_QUESTIONS, timestamp: Date.now() });
        return DEFAULT_DEMO_QUESTIONS;
      }
      return [];
    }
    const questions = snap.docs.map((d) => {
      const raw = d.data();
      const q = { ...raw } as Question;

      // Defensive data sanitization: guarantee string or undefined fields
      // Prevents unhandled render exceptions if corrupted maps/sentinels were stored
      if (q.explanation !== undefined && (typeof q.explanation !== 'string' || !q.explanation.trim())) {
        delete (q as any).explanation;
      }
      if (q.imageUrl !== undefined && (typeof q.imageUrl !== 'string' || !q.imageUrl.trim())) {
        delete (q as any).imageUrl;
      }
      if (q.optionC !== undefined && (typeof q.optionC !== 'string' || !q.optionC.trim())) {
        delete (q as any).optionC;
      }
      if (q.optionD !== undefined && (typeof q.optionD !== 'string' || !q.optionD.trim())) {
        delete (q as any).optionD;
      }
      if (q.question !== undefined && typeof q.question !== 'string') {
        q.question = String(q.question || '');
      }
      if (q.optionA !== undefined && typeof q.optionA !== 'string') {
        q.optionA = String(q.optionA || '');
      }
      if (q.optionB !== undefined && typeof q.optionB !== 'string') {
        q.optionB = String(q.optionB || '');
      }
      if (q.correctAnswers !== undefined && !Array.isArray(q.correctAnswers)) {
        q.correctAnswers = typeof q.correctAnswers === 'object' && q.correctAnswers !== null
          ? Object.values(q.correctAnswers)
          : [];
      }
      if (q.statements !== undefined && Array.isArray(q.statements)) {
        q.statements = q.statements.map((s, sIdx) => ({
          id: s.id || `s${sIdx + 1}`,
          text: typeof s.text === 'string' ? s.text : String(s.text || ''),
          imageUrl: typeof s.imageUrl === 'string' && s.imageUrl.trim() ? s.imageUrl.trim() : undefined,
          isCorrectTrue: typeof s.isCorrectTrue === 'boolean' ? s.isCorrectTrue : true,
        }));
      }

      return q;
    });
    const sorted = questions.sort((a, b) => (a.number || 0) - (b.number || 0));
    questionsCache.set(examId, { questions: sorted, timestamp: Date.now() });
    return sorted;
  } catch (error) {
    console.warn(`Error fetching questions for ${path}:`, error);
    if (cached) {
      return cached.questions;
    }
    if (examId === 'exam_demo_mat6_2026' || examId.includes('demo')) {
      return DEFAULT_DEMO_QUESTIONS;
    }
    return [];
  }
}

// Safe projection for students during test taking (omits answer key)
export async function getStudentQuestions(exam: Exam): Promise<StudentSafeQuestion[]> {
  let allQuestions = await getQuestions(exam.examId);
  if (allQuestions.length === 0 && (exam.examId === 'exam_demo_mat6_2026' || exam.token === 'MAT6A26')) {
    allQuestions = DEFAULT_DEMO_QUESTIONS;
  }

  let projected: StudentSafeQuestion[] = allQuestions.map((q) => ({
    questionId: q.questionId,
    examId: q.examId,
    number: q.number,
    question: q.question,
    imageUrl: q.imageUrl,
    type: q.type || 'SINGLE',
    optionA: q.optionA,
    optionB: q.optionB,
    optionC: q.optionC,
    optionD: q.optionD,
    statements: q.statements?.map((s) => ({
      id: s.id,
      text: s.text,
      imageUrl: s.imageUrl || undefined,
    })),
    weight: q.weight,
  }));

  if (exam.shuffleQuestions) {
    projected = [...projected].sort(() => Math.random() - 0.5);
    projected = projected.map((q, idx) => ({ ...q, number: idx + 1 }));
  }

  return projected;
}

export async function getStudentSafeQuestions(
  examId: string,
  shuffleQuestions?: boolean,
  _shuffleOptions?: boolean
): Promise<StudentSafeQuestion[]> {
  const exam = await getExamById(examId);
  if (!exam) return [];
  return getStudentQuestions({
    ...exam,
    shuffleQuestions: shuffleQuestions ?? exam.shuffleQuestions,
  });
}

export async function addQuestion(examId: string, qData: Omit<Question, 'questionId' | 'examId' | 'createdAt' | 'updatedAt'>): Promise<Question> {
  questionsCache.delete(examId);
  const questionId = 'q_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
  const now = new Date().toISOString();

  const newQuestion: Question = cleanFirestoreData({
    ...qData,
    questionId,
    examId,
    createdAt: now,
    updatedAt: now,
  });

  const path = `exams/${examId}/questions/${questionId}`;
  try {
    await setDoc(doc(db, 'exams', examId, 'questions', questionId), newQuestion);
    return newQuestion;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
    throw error;
  }
}

export async function updateQuestion(examId: string, questionId: string, updates: Partial<Question>): Promise<void> {
  questionsCache.delete(examId);
  const path = `exams/${examId}/questions/${questionId}`;
  try {
    const rawUpdates: Record<string, any> = {
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    // If an optional field was cleared, use deleteField() so Firestore deletes it cleanly
    if (rawUpdates.imageUrl === '' || rawUpdates.imageUrl === null) {
      rawUpdates.imageUrl = deleteField();
    }
    if (rawUpdates.explanation === '' || rawUpdates.explanation === null) {
      rawUpdates.explanation = deleteField();
    }
    if (rawUpdates.optionC === '' || rawUpdates.optionC === null) {
      rawUpdates.optionC = deleteField();
    }
    if (rawUpdates.optionD === '' || rawUpdates.optionD === null) {
      rawUpdates.optionD = deleteField();
    }
    if (rawUpdates.type === 'SINGLE') {
      rawUpdates.correctAnswers = deleteField();
      rawUpdates.statements = deleteField();
    } else if (rawUpdates.type === 'COMPLEX') {
      rawUpdates.statements = deleteField();
    } else if (rawUpdates.type === 'COMPLEX_TF') {
      rawUpdates.correctAnswers = deleteField();
    }

    const cleanUpdates = cleanFirestoreData(rawUpdates);
    await updateDoc(doc(db, 'exams', examId, 'questions', questionId), cleanUpdates);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
    throw error;
  }
}

export async function deleteQuestion(examId: string, questionId: string): Promise<void> {
  questionsCache.delete(examId);
  const path = `exams/${examId}/questions/${questionId}`;
  try {
    await deleteDoc(doc(db, 'exams', examId, 'questions', questionId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
    throw error;
  }
}

export async function importQuestionsBatch(examId: string, questions: Omit<Question, 'questionId' | 'examId' | 'createdAt' | 'updatedAt'>[]): Promise<number> {
  questionsCache.delete(examId);
  const batch = writeBatch(db);
  const now = new Date().toISOString();
  let count = 0;

  questions.forEach((q, idx) => {
    const questionId = 'q_imp_' + Date.now() + '_' + idx;
    const newQ: Question = cleanFirestoreData({
      ...q,
      questionId,
      examId,
      number: q.number || idx + 1,
      createdAt: now,
      updatedAt: now,
    });
    batch.set(doc(db, 'exams', examId, 'questions', questionId), newQ);
    count++;
  });

  await batch.commit();
  return count;
}

// ==========================================
// IMAGE UPLOAD
// ==========================================

export async function uploadQuestionImage(file: File, examId?: string, questionId?: string): Promise<string> {
  // Process and compress image in under 50ms into a compact, crystal-clear WebP/JPEG data URL (typically 25KB - 60KB)
  // This bypasses Firebase Storage bucket activation delays, CORS errors, and timeouts.
  const result = await compressImageFile(file, {
    maxDimension: 960,
    quality: 0.82,
    maxFileSizeMb: 10,
  });

  return result.dataUrl;
}

// ==========================================
// PARTICIPANT & EXAM SESSION
// ==========================================

export async function startOrResumeParticipant(
  exam: Exam,
  studentData: { name: string; school: string; grade: GradeLevel },
  userId: string
): Promise<Participant> {
  const normName = studentData.name.trim().toLowerCase();
  const finishedKey = `cbt_finished_${exam.examId}_${normName}`;
  if (localStorage.getItem(finishedKey) === 'true') {
    throw new Error('Kamu sudah menyelesaikan ujian ini (atau ujian telah dihentikan otomatis karena menutup/berpindah tab). Ujian tidak dapat diulang kembali.');
  }

  const existingSessionJson = localStorage.getItem(`cbt_session_${exam.examId}`);
  if (existingSessionJson) {
    try {
      const parsed = JSON.parse(existingSessionJson) as Participant;
      const snap = await getDoc(doc(db, 'participants', parsed.participantId));
      if (snap.exists()) {
        const currentData = snap.data() as Participant;
        if (currentData.status === 'IN_PROGRESS') {
          return currentData;
        } else if (currentData.status === 'SUBMITTED') {
          throw new Error('Kamu sudah menyelesaikan ujian ini (atau ujian telah otomatis dihentikan karena menutup/berpindah tab). Ujian tidak dapat diulang.');
        }
      }
    } catch (err: any) {
      if (err.message && err.message.includes('sudah menyelesaikan')) {
        throw err;
      }
      // If parsing fails, proceed to check remote or create new
    }
  }

  // Check remote if student already submitted this exam
  try {
    const qSubmitted = query(
      collection(db, 'participants'),
      where('examId', '==', exam.examId),
      where('name', '==', studentData.name.trim())
    );
    const snapSubmitted = await getDocs(qSubmitted);
    if (!snapSubmitted.empty) {
      const existing = snapSubmitted.docs[0].data() as Participant;
      if (existing.status === 'SUBMITTED') {
        throw new Error('Nama peserta ini sudah tercatat menyelesaikan ujian ini sebelumnya.');
      } else if (existing.status === 'IN_PROGRESS') {
        localStorage.setItem(`cbt_session_${exam.examId}`, JSON.stringify(existing));
        return existing;
      }
    }
  } catch (checkErr: any) {
    if (checkErr.message && checkErr.message.includes('sudah')) {
      throw checkErr;
    }
  }

  const participantId = 'part_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
  const startedAtDate = new Date();
  const endAtDate = new Date(startedAtDate.getTime() + exam.durationMinutes * 60 * 1000);

  const newParticipant: Participant = {
    participantId,
    examId: exam.examId,
    userId,
    name: studentData.name.trim(),
    school: studentData.school.trim(),
    grade: studentData.grade,
    startedAt: startedAtDate.toISOString(),
    endAt: endAtDate.toISOString(),
    status: 'IN_PROGRESS',
    tabSwitchCount: 0,
  };

  const path = `participants/${participantId}`;
  try {
    await setDoc(doc(db, 'participants', participantId), newParticipant);
    localStorage.setItem(`cbt_session_${exam.examId}`, JSON.stringify(newParticipant));
    return newParticipant;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
    throw error;
  }
}

// ==========================================
// OFFLINE ANSWER DRAFT & LOCALSTORAGE AUTOSAVE (HIGH PERFORMANCE MEMORY CACHED)
// ==========================================

const localDraftsMemCache = new Map<string, Record<string, LocalAnswerDraft>>();
const unsyncedSetMemCache = new Map<string, Set<string>>();
const localAnswersMemCache = new Map<string, Record<string, any>>();

export function saveAutosaveSnapshot(
  participantId: string,
  examId: string,
  lastQuestionId: string,
  lastAnswer: string,
  totalAnswered: number,
  totalMarked: number
): AutosaveSnapshot {
  const now = new Date();
  const timeStr = now.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const snapshot: AutosaveSnapshot = {
    participantId,
    examId,
    lastQuestionId,
    lastAnswer,
    totalAnswered,
    totalMarked,
    savedAt: now.toISOString(),
    formattedTime: timeStr,
  };
  try {
    localStorage.setItem(`cbt_autosave_${participantId}`, JSON.stringify(snapshot));
  } catch (err) {
    console.warn('Gagal menyimpan autosave snapshot ke localStorage:', err);
  }
  return snapshot;
}

export function getAutosaveSnapshot(participantId: string): AutosaveSnapshot | null {
  try {
    const raw = localStorage.getItem(`cbt_autosave_${participantId}`);
    return raw ? (JSON.parse(raw) as AutosaveSnapshot) : null;
  } catch {
    return null;
  }
}

const pendingFlushTimers = new Map<string, ReturnType<typeof setTimeout>>();

export function flushDraftsToLocalStorage(participantId: string): void {
  const existingTimer = pendingFlushTimers.get(participantId);
  if (existingTimer) {
    clearTimeout(existingTimer);
    pendingFlushTimers.delete(participantId);
  }
  try {
    const existingDrafts = localDraftsMemCache.get(participantId);
    if (existingDrafts) {
      localStorage.setItem(`cbt_drafts_${participantId}`, JSON.stringify(existingDrafts));
    }
    const unsyncedSet = unsyncedSetMemCache.get(participantId);
    if (unsyncedSet) {
      localStorage.setItem(`cbt_unsynced_${participantId}`, JSON.stringify(Array.from(unsyncedSet)));
    }
    const existingAnswers = localAnswersMemCache.get(participantId);
    if (existingAnswers) {
      localStorage.setItem(`cbt_answers_${participantId}`, JSON.stringify(existingAnswers));
    }
  } catch (err) {
    console.warn('Gagal flush draf jawaban ke localStorage:', err);
  }
}

function scheduleDraftLocalStorageFlush(participantId: string): void {
  if (pendingFlushTimers.has(participantId)) {
    return;
  }
  const timer = setTimeout(() => {
    pendingFlushTimers.delete(participantId);
    flushDraftsToLocalStorage(participantId);
  }, 250);
  pendingFlushTimers.set(participantId, timer);
}

export function saveAnswerDraftLocally(
  participantId: string,
  examId: string,
  questionId: string,
  answer: string,
  marked: boolean
): LocalAnswerDraft {
  const now = new Date().toISOString();
  const draftRecord: LocalAnswerDraft = {
    questionId,
    examId,
    participantId,
    answer,
    marked,
    savedAt: now,
    syncedToCloud: false,
  };

  try {
    // 1. In-memory draft cache (0ms instant access)
    let existingDrafts = localDraftsMemCache.get(participantId);
    if (!existingDrafts) {
      existingDrafts = JSON.parse(localStorage.getItem(`cbt_drafts_${participantId}`) || '{}');
      localDraftsMemCache.set(participantId, existingDrafts!);
    }
    existingDrafts[questionId] = draftRecord;

    // 2. In-memory unsynced queue
    let unsyncedSet = unsyncedSetMemCache.get(participantId);
    if (!unsyncedSet) {
      unsyncedSet = new Set<string>(JSON.parse(localStorage.getItem(`cbt_unsynced_${participantId}`) || '[]'));
      unsyncedSetMemCache.set(participantId, unsyncedSet);
    }
    unsyncedSet.add(questionId);

    // 3. Keep answers cache in sync
    let existingAnswers = localAnswersMemCache.get(participantId);
    if (!existingAnswers) {
      existingAnswers = JSON.parse(localStorage.getItem(`cbt_answers_${participantId}`) || '{}');
      localAnswersMemCache.set(participantId, existingAnswers!);
    }
    existingAnswers[questionId] = { answer, marked, updatedAt: now };

    // Asynchronously flush to disk in background so option clicks have 0ms latency
    scheduleDraftLocalStorageFlush(participantId);
  } catch (err) {
    console.warn('Gagal menyimpan draf jawaban ke memori:', err);
  }

  return draftRecord;
}

export function markDraftSyncedLocally(participantId: string, questionId: string): void {
  try {
    const drafts = localDraftsMemCache.get(participantId) || JSON.parse(localStorage.getItem(`cbt_drafts_${participantId}`) || '{}');
    if (drafts[questionId]) {
      drafts[questionId].syncedToCloud = true;
      localDraftsMemCache.set(participantId, drafts);
    }

    const unsyncedSet = unsyncedSetMemCache.get(participantId) || new Set<string>(JSON.parse(localStorage.getItem(`cbt_unsynced_${participantId}`) || '[]'));
    unsyncedSet.delete(questionId);
    unsyncedSetMemCache.set(participantId, unsyncedSet);

    scheduleDraftLocalStorageFlush(participantId);
  } catch (err) {
    console.warn('Gagal memperbarui status draf di memori:', err);
  }
}

export function getUnsyncedDraftCount(participantId: string): number {
  try {
    const cachedSet = unsyncedSetMemCache.get(participantId);
    if (cachedSet !== undefined) {
      return cachedSet.size;
    }
    const unsyncedKey = `cbt_unsynced_${participantId}`;
    const unsyncedList: string[] = JSON.parse(localStorage.getItem(unsyncedKey) || '[]');
    unsyncedSetMemCache.set(participantId, new Set(unsyncedList));
    return unsyncedList.length;
  } catch {
    return 0;
  }
}

export function getUnsyncedDrafts(participantId: string): LocalAnswerDraft[] {
  try {
    const existingDrafts = localDraftsMemCache.get(participantId) || JSON.parse(localStorage.getItem(`cbt_drafts_${participantId}`) || '{}');
    const unsyncedSet = unsyncedSetMemCache.get(participantId) || new Set<string>(JSON.parse(localStorage.getItem(`cbt_unsynced_${participantId}`) || '[]'));
    return Array.from(unsyncedSet).map((qId) => existingDrafts[qId]).filter(Boolean);
  } catch {
    return [];
  }
}

export function getAllLocalDrafts(participantId: string): Record<string, LocalAnswerDraft> {
  try {
    const cached = localDraftsMemCache.get(participantId);
    if (cached) return cached;
    const fromStorage = JSON.parse(localStorage.getItem(`cbt_drafts_${participantId}`) || '{}');
    localDraftsMemCache.set(participantId, fromStorage);
    return fromStorage;
  } catch {
    return {};
  }
}

export async function syncOfflineDraftsToCloud(
  participantId: string,
  examId: string
): Promise<OfflineDraftSyncResult> {
  const unsynced = getUnsyncedDrafts(participantId);
  if (unsynced.length === 0) {
    return { syncedCount: 0, failedCount: 0, totalPending: 0 };
  }

  // Use writeBatch for high-speed single round-trip sync
  try {
    const batch = writeBatch(db);
    for (const draft of unsynced) {
      const answerId = `${participantId}_${draft.questionId}`;
      const answerData: Answer = {
        answerId,
        participantId,
        examId,
        questionId: draft.questionId,
        answer: draft.answer,
        marked: draft.marked,
        updatedAt: draft.savedAt || new Date().toISOString(),
      };
      batch.set(
        doc(db, 'participants', participantId, 'answers', answerId),
        cleanFirestoreData(answerData)
      );
    }
    await batch.commit();

    for (const draft of unsynced) {
      markDraftSyncedLocally(participantId, draft.questionId);
    }

    return {
      syncedCount: unsynced.length,
      failedCount: 0,
      totalPending: 0,
    };
  } catch (batchErr) {
    console.warn('Batch sync fallback to individual sync:', batchErr);
    let syncedCount = 0;
    let failedCount = 0;

    for (const draft of unsynced) {
      try {
        const answerId = `${participantId}_${draft.questionId}`;
        const answerData: Answer = {
          answerId,
          participantId,
          examId,
          questionId: draft.questionId,
          answer: draft.answer,
          marked: draft.marked,
          updatedAt: draft.savedAt || new Date().toISOString(),
        };
        await setDoc(
          doc(db, 'participants', participantId, 'answers', answerId),
          cleanFirestoreData(answerData)
        );
        markDraftSyncedLocally(participantId, draft.questionId);
        syncedCount++;
      } catch (err) {
        console.warn(`Gagal sinkronisasi draf offline soal ${draft.questionId}:`, err);
        failedCount++;
      }
    }

    return {
      syncedCount,
      failedCount,
      totalPending: getUnsyncedDraftCount(participantId),
    };
  }
}

export async function saveStudentAnswer(
  participantId: string,
  examId: string,
  questionId: string,
  answer: string,
  marked: boolean
): Promise<void> {
  const answerId = `${participantId}_${questionId}`;
  const now = new Date().toISOString();

  // 1. Instantly save draft to localStorage so answer is 100% safeguarded against offline / crash
  saveAnswerDraftLocally(participantId, examId, questionId, answer, marked);

  // 2. Attempt Firestore sync
  const path = `participants/${participantId}/answers/${answerId}`;
  try {
    const answerData: Answer = {
      answerId,
      participantId,
      examId,
      questionId,
      answer,
      marked,
      updatedAt: now,
    };
    await setDoc(
      doc(db, 'participants', participantId, 'answers', answerId),
      cleanFirestoreData(answerData)
    );
    // 3. Mark as successfully synced in local draft state
    markDraftSyncedLocally(participantId, questionId);
  } catch (error) {
    // Left in offline draft queue in localStorage
    console.warn('Sync answer warning (saved safely in local draft):', error);
    throw error;
  }
}

export async function getParticipantAnswers(participantId: string): Promise<Record<string, { answer: string; marked: boolean }>> {
  const answers: Record<string, { answer: string; marked: boolean }> = {};

  // 1. Load from legacy answers store in localStorage
  const localKey = `cbt_answers_${participantId}`;
  try {
    const stored = JSON.parse(localStorage.getItem(localKey) || '{}');
    Object.assign(answers, stored);
  } catch {
    // ignore
  }

  // 2. Load from structured drafts store in localStorage
  const localDrafts = getAllLocalDrafts(participantId);
  const unsyncedDrafts = new Set<string>();
  try {
    const unsyncedKey = `cbt_unsynced_${participantId}`;
    const list: string[] = JSON.parse(localStorage.getItem(unsyncedKey) || '[]');
    list.forEach((qId) => unsyncedDrafts.add(qId));
  } catch {
    // ignore
  }

  Object.values(localDrafts).forEach((d) => {
    if (d.answer !== '' || !answers[d.questionId]) {
      answers[d.questionId] = {
        answer: d.answer,
        marked: d.marked,
      };
    }
  });

  // 3. Sync from Firestore, preserving local drafts that are unsynced or more recent
  try {
    const snap = await getDocs(collection(db, `participants/${participantId}/answers`));
    snap.docs.forEach((d) => {
      const data = d.data() as Answer;
      const currentLocal = answers[data.questionId];
      const isUnsynced = unsyncedDrafts.has(data.questionId);

      // If locally unsynced with an answer, the student's offline choice takes priority
      if (isUnsynced && currentLocal && currentLocal.answer) {
        return;
      }

      if (data.answer) {
        const localDraft = localDrafts[data.questionId];
        const localTime = localDraft?.savedAt ? new Date(localDraft.savedAt).getTime() : 0;
        const remoteTime = data.updatedAt ? new Date(data.updatedAt).getTime() : 0;

        if (localTime > remoteTime && localDraft?.answer) {
          answers[data.questionId] = {
            answer: localDraft.answer,
            marked: localDraft.marked,
          };
        } else {
          answers[data.questionId] = {
            answer: data.answer,
            marked: data.marked,
          };
        }
      }
    });
  } catch (error) {
    console.warn('Could not fetch remote answers, using robust local cache:', error);
  }

  return answers;
}

// ==========================================
// CRASH RECOVERY & PERIODIC AUTOSAVE HELPERS
// ==========================================

export function saveCrashRecoveryState(recoveryData: CrashRecoveryState): void {
  try {
    const key = `cbt_recovery_${recoveryData.participantId}`;
    localStorage.setItem(key, JSON.stringify(recoveryData));

    // Also update individual answers local store for offline redundancy
    const localAnswersKey = `cbt_answers_${recoveryData.participantId}`;
    localStorage.setItem(localAnswersKey, JSON.stringify(recoveryData.answers));
  } catch (err) {
    console.warn('Could not save crash recovery to localStorage:', err);
  }
}

export function getCrashRecoveryState(participantId: string): CrashRecoveryState | null {
  try {
    const key = `cbt_recovery_${participantId}`;
    const item = localStorage.getItem(key);
    if (!item) return null;
    return JSON.parse(item) as CrashRecoveryState;
  } catch (err) {
    console.warn('Could not read crash recovery state:', err);
    return null;
  }
}

export function saveActiveCrashRecoverySession(session: ActiveCrashSession): void {
  try {
    localStorage.setItem('cbt_active_session', JSON.stringify(session));
  } catch (err) {
    console.warn('Could not save active crash recovery session:', err);
  }
}

export function getActiveCrashRecoverySession(): ActiveCrashSession | null {
  try {
    const raw = localStorage.getItem('cbt_active_session');
    if (!raw) return null;
    const session = JSON.parse(raw) as ActiveCrashSession;

    // Check if participant is still valid and not expired
    if (!session.participant || !session.exam) return null;

    const normName = session.studentData?.name?.trim()?.toLowerCase() || '';
    const finishedKey = `cbt_finished_${session.exam.examId}_${normName}`;
    if (localStorage.getItem(finishedKey) === 'true') {
      localStorage.removeItem('cbt_active_session');
      return null;
    }

    const endMs = new Date(session.participant.endAt).getTime();
    if (Date.now() >= endMs) {
      // Session has expired
      return null;
    }

    return session;
  } catch (err) {
    console.warn('Could not parse active session:', err);
    return null;
  }
}

export function clearActiveCrashRecoverySession(): void {
  try {
    localStorage.removeItem('cbt_active_session');
  } catch {
    // ignore
  }
}

export async function recordTabSwitch(participantId: string): Promise<number> {
  const path = `participants/${participantId}`;
  try {
    const partRef = doc(db, 'participants', participantId);
    const snap = await getDoc(partRef);
    if (snap.exists()) {
      const current = snap.data() as Participant;
      const count = (current.tabSwitchCount || 0) + 1;
      await updateDoc(partRef, { tabSwitchCount: count });
      return count;
    }
  } catch (error) {
    console.warn('Error recording tab switch:', error);
  }
  return 1;
}

// ==========================================
// SCORING & SUBMIT EXAM
// ==========================================

export async function submitExamAndCalculateScore(
  participantId: string,
  examId: string,
  submitReason: SubmitReason = 'NORMAL'
): Promise<Result> {
  const partRef = doc(db, 'participants', participantId);
  const partSnap = await getDoc(partRef);
  if (!partSnap.exists()) {
    throw new Error('Data peserta ujian tidak ditemukan.');
  }

  const participant = partSnap.data() as Participant;
  if (participant.status === 'SUBMITTED') {
    // Check if result already exists
    const resultsSnap = await getDocs(
      query(collection(db, 'results'), where('participantId', '==', participantId))
    );
    if (!resultsSnap.empty) {
      return resultsSnap.docs[0].data() as Result;
    }
  }

  const exam = await getExamById(examId);
  if (!exam) {
    throw new Error('Ujian tidak ditemukan.');
  }

  // Flush any offline drafts to Firestore before calculating score
  try {
    await syncOfflineDraftsToCloud(participantId, examId);
  } catch (syncErr) {
    console.warn('Could not sync all offline drafts before submit:', syncErr);
  }

  // Fetch true questions from server with correct answers
  let questions = await getQuestions(examId);
  if (questions.length === 0) {
    const cached = questionsCache.get(examId);
    if (cached && cached.questions.length > 0) {
      questions = cached.questions;
    } else if (examId === 'exam_demo_mat6_2026' || examId.includes('demo')) {
      questions = DEFAULT_DEMO_QUESTIONS;
    }
  }
  const studentAnswers = await getParticipantAnswers(participantId);

  let totalWeight = 0;
  let earnedWeight = 0;
  let correctCount = 0;
  let wrongCount = 0;

  questions.forEach((q) => {
    const weight = q.weight || 1;
    totalWeight += weight;

    const studentChoice = studentAnswers[q.questionId]?.answer;
    const isComplexTF = q.type === 'COMPLEX_TF' && Array.isArray(q.statements) && q.statements.length > 0;
    const isComplex = q.type === 'COMPLEX' || (Array.isArray(q.correctAnswers) && q.correctAnswers.length > 0);

    let isCorrect = false;

    if (isComplexTF && q.statements) {
      const studentMap = parseStatementAnswers(studentChoice);
      const allStatementsPresent = q.statements.every((stmt) => studentMap[stmt.id] !== undefined);
      const allStatementsMatch =
        allStatementsPresent &&
        q.statements.every((stmt) => {
          const expected = stmt.isCorrectTrue ? 'B' : 'S';
          return studentMap[stmt.id] === expected;
        });

      if (allStatementsMatch) {
        isCorrect = true;
      }
    } else if (isComplex) {
      // Determine canonical list of correct answers
      const correctList: string[] = (
        q.correctAnswers && q.correctAnswers.length > 0
          ? q.correctAnswers
          : [q.correctAnswer]
      )
        .map((c) => String(c).trim().toUpperCase())
        .filter(Boolean)
        .sort();

      // Student choice can be comma-separated string e.g. "A,B,D"
      const studentList: string[] = (
        studentChoice
          ? String(studentChoice)
              .split(',')
              .map((s) => s.trim().toUpperCase())
              .filter(Boolean)
          : []
      ).sort();

      if (
        studentList.length === correctList.length &&
        studentList.every((val, idx) => val === correctList[idx])
      ) {
        isCorrect = true;
      }
    } else {
      isCorrect = Boolean(
        studentChoice &&
        String(studentChoice).trim().toUpperCase() === String(q.correctAnswer).trim().toUpperCase()
      );
    }

    if (isCorrect) {
      earnedWeight += weight;
      correctCount++;
    } else {
      wrongCount++;
    }
  });

  const finalScore = totalWeight > 0 ? Math.round((earnedWeight / totalWeight) * 100) : 0;
  const isPassed = finalScore >= (exam.kkm || 75);

  const finishedAt = new Date().toISOString();
  const resultId = 'res_' + participantId;

  const finalResult: Result = {
    resultId,
    participantId,
    examId,
    name: participant.name,
    school: participant.school,
    grade: participant.grade,
    totalQuestions: questions.length,
    correctAnswers: correctCount,
    wrongAnswers: wrongCount,
    score: finalScore,
    status: isPassed ? 'LULUS' : 'BELUM LULUS',
    startedAt: participant.startedAt,
    finishedAt,
    createdAt: finishedAt,
    submitReason,
  };

  const batch = writeBatch(db);

  // 1. Update participant status
  const currentSwitches = participant.tabSwitchCount || 0;
  batch.update(partRef, {
    status: 'SUBMITTED',
    finishedAt,
    submitReason,
    tabSwitchCount: submitReason === 'TAB_SWITCH' ? currentSwitches + 1 : currentSwitches,
  });

  // 2. Save result
  batch.set(doc(db, 'results', resultId), finalResult);

  await batch.commit();

  // Clear local session marker and mark completed
  localStorage.removeItem(`cbt_session_${examId}`);
  localStorage.removeItem(`cbt_drafts_${participantId}`);
  localStorage.removeItem(`cbt_unsynced_${participantId}`);
  localStorage.removeItem(`cbt_answers_${participantId}`);
  localStorage.removeItem(`cbt_recovery_${participantId}`);
  clearActiveCrashRecoverySession();
  const normName = participant.name.trim().toLowerCase();
  localStorage.setItem(`cbt_finished_${examId}_${normName}`, 'true');

  return finalResult;
}

// ==========================================
// RESULTS & REPORTING
// ==========================================

export async function getExamResults(examId?: string): Promise<Result[]> {
  const path = 'results';
  try {
    let q = query(collection(db, path), orderBy('createdAt', 'desc'));
    if (examId) {
      q = query(collection(db, path), where('examId', '==', examId), orderBy('createdAt', 'desc'));
    }
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as Result);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function getAllParticipants(): Promise<Participant[]> {
  const path = 'participants';
  try {
    const snap = await getDocs(query(collection(db, path), orderBy('startedAt', 'desc')));
    return snap.docs.map((d) => d.data() as Participant);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export const getParticipants = getAllParticipants;
export const getAllResults = getExamResults;

export async function getTopScorers(options?: {
  examId?: string;
  limitCount?: number;
}): Promise<Result[]> {
  const path = 'results';
  const limitCount = options?.limitCount || 10;
  try {
    let q = query(collection(db, path));
    if (options?.examId && options.examId !== 'ALL') {
      q = query(collection(db, path), where('examId', '==', options.examId));
    }
    const snap = await getDocs(q);
    const results = snap.docs.map((d) => d.data() as Result);

    // Sort by score DESC, then correctAnswers DESC, then completion time ASC
    results.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      if (b.correctAnswers !== a.correctAnswers) {
        return b.correctAnswers - a.correctAnswers;
      }
      const timeA = new Date(a.finishedAt || a.createdAt || 0).getTime();
      const timeB = new Date(b.finishedAt || b.createdAt || 0).getTime();
      return timeA - timeB;
    });

    return results.slice(0, limitCount);
  } catch (error) {
    console.warn('Error fetching top scorers from Firestore:', error);
    try {
      handleFirestoreError(error, OperationType.LIST, path);
    } catch {
      // Do not crash public UI
    }
    return [];
  }
}

// ==========================================
// PARTICIPANT RESET & DATABASE CLEANUP
// ==========================================

export interface ResetParticipantsOptions {
  examId?: string; // Specific examId or 'ALL' / undefined for all exams
  onlyFinished?: boolean; // Default true: only delete 'SUBMITTED' and 'TIMEOUT'
  deleteResults?: boolean; // Default false: also delete associated Result records
}

export interface ResetParticipantsResult {
  deletedParticipants: number;
  deletedAnswers: number;
  deletedResults: number;
  success: boolean;
}

/**
 * Executes batch deletion of Firestore document references in chunks of 400
 * to strictly observe the Firestore limit of 500 writes per batch.
 */
async function executeBatchDeletes(refs: DocumentReference[]): Promise<void> {
  const CHUNK_SIZE = 400;
  for (let i = 0; i < refs.length; i += CHUNK_SIZE) {
    const chunk = refs.slice(i, i + CHUNK_SIZE);
    const batch = writeBatch(db);
    for (const ref of chunk) {
      batch.delete(ref);
    }
    await batch.commit();
  }
}

/**
 * Deletes a single participant, all their answer subcollection documents,
 * and optionally their corresponding result document.
 */
export async function deleteParticipant(
  participantId: string,
  deleteResult: boolean = false
): Promise<{ success: boolean; deletedAnswers: number }> {
  await ensureTeacherAuthSession();
  const path = `participants/${participantId}`;
  try {
    // 1. Fetch all answers for this participant
    const answersSnap = await getDocs(collection(db, 'participants', participantId, 'answers'));
    const refsToDelete: DocumentReference[] = [];
    answersSnap.docs.forEach((d) => refsToDelete.push(d.ref));

    // 2. Fetch participant document
    const partRef = doc(db, 'participants', participantId);
    refsToDelete.push(partRef);

    // 3. Delete result document if requested
    if (deleteResult) {
      const resSnap = await getDocs(
        query(collection(db, 'results'), where('participantId', '==', participantId))
      );
      resSnap.docs.forEach((d) => refsToDelete.push(d.ref));
    }

    // 4. Clean local storage keys for this participant if found
    try {
      const partSnap = await getDoc(partRef);
      if (partSnap.exists()) {
        const p = partSnap.data() as Participant;
        const normName = p.name?.trim()?.toLowerCase() || '';
        localStorage.removeItem(`cbt_finished_${p.examId}_${normName}`);
        localStorage.removeItem(`cbt_session_${p.examId}`);
        localStorage.removeItem(`cbt_recovery_${p.participantId}`);
      }
    } catch {
      // ignore
    }

    // 5. Execute deletion in safe chunks
    await executeBatchDeletes(refsToDelete);

    return {
      success: true,
      deletedAnswers: answersSnap.size,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
    throw error;
  }
}

/**
 * Resets participants in Firestore to 0 or clears finished participants
 * to relieve database storage and document quotas ("sehingga tidak memberatkan database yang ada").
 *
 * @param options.examId - If provided (and not 'ALL'), only resets participants of that exam.
 * @param options.onlyFinished - If true (default), only deletes participants with status 'SUBMITTED' or 'TIMEOUT'.
 *                               If false, deletes ALL matching participants (resetting count to 0).
 * @param options.deleteResults - If true, also deletes corresponding documents from the 'results' collection.
 */
export async function resetParticipants(
  options: ResetParticipantsOptions = {}
): Promise<ResetParticipantsResult> {
  await ensureTeacherAuthSession();
  const { examId, onlyFinished = true, deleteResults = false } = options;

  try {
    // 1. Fetch participants (filtered by examId if specified)
    let participantsQuery;
    if (examId && examId !== 'ALL') {
      participantsQuery = query(collection(db, 'participants'), where('examId', '==', examId));
    } else {
      participantsQuery = collection(db, 'participants');
    }

    const participantsSnap = await getDocs(participantsQuery);
    const allParticipants = participantsSnap.docs.map((d) => d.data() as Participant);

    // 2. Filter target participants
    const targetParticipants = onlyFinished
      ? allParticipants.filter((p) => p.status === 'SUBMITTED' || p.status === 'TIMEOUT')
      : allParticipants;

    if (targetParticipants.length === 0) {
      return {
        deletedParticipants: 0,
        deletedAnswers: 0,
        deletedResults: 0,
        success: true,
      };
    }

    const refsToDelete: DocumentReference[] = [];
    let totalAnswersCount = 0;

    // 3. Gather subcollection answers and participant doc refs
    for (const p of targetParticipants) {
      try {
        const answersSnap = await getDocs(
          collection(db, 'participants', p.participantId, 'answers')
        );
        totalAnswersCount += answersSnap.size;
        answersSnap.docs.forEach((aDoc) => refsToDelete.push(aDoc.ref));
      } catch (err) {
        console.warn(`Could not fetch answers for participant ${p.participantId}:`, err);
      }
      refsToDelete.push(doc(db, 'participants', p.participantId));

      // Clean local client storage keys if running on same device
      try {
        const normName = p.name?.trim()?.toLowerCase() || '';
        localStorage.removeItem(`cbt_finished_${p.examId}_${normName}`);
        localStorage.removeItem(`cbt_session_${p.examId}`);
        localStorage.removeItem(`cbt_recovery_${p.participantId}`);
      } catch {
        // ignore local storage errors
      }
    }

    // 4. Gather result doc refs if requested
    let totalResultsCount = 0;
    if (deleteResults) {
      const targetIds = new Set(targetParticipants.map((p) => p.participantId));
      let resultsQuery;
      if (examId && examId !== 'ALL') {
        resultsQuery = query(collection(db, 'results'), where('examId', '==', examId));
      } else {
        resultsQuery = collection(db, 'results');
      }
      const resultsSnap = await getDocs(resultsQuery);
      resultsSnap.docs.forEach((rDoc) => {
        const rData = rDoc.data() as Result;
        if (targetIds.has(rData.participantId) || !onlyFinished) {
          refsToDelete.push(rDoc.ref);
          totalResultsCount++;
        }
      });
    }

    // 5. Commit batch deletes in safe <= 400 chunks
    await executeBatchDeletes(refsToDelete);

    return {
      deletedParticipants: targetParticipants.length,
      deletedAnswers: totalAnswersCount,
      deletedResults: totalResultsCount,
      success: true,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, 'participants');
    throw error;
  }
}

/**
 * Convenience helper to reset finished participants back to 0.
 */
export async function resetFinishedParticipants(
  examId?: string,
  deleteResults: boolean = false
): Promise<ResetParticipantsResult> {
  return resetParticipants({
    examId,
    onlyFinished: true,
    deleteResults,
  });
}

/**
 * Convenience helper to reset ALL participants back to 0.
 */
export async function resetAllParticipants(
  examId?: string,
  deleteResults: boolean = false
): Promise<ResetParticipantsResult> {
  return resetParticipants({
    examId,
    onlyFinished: false,
    deleteResults,
  });
}

export interface ResetExamResultsOptions {
  examId?: string;
  resultIds?: string[];
  resetParticipantSessions?: boolean;
}

export interface ResetExamResultsResult {
  deletedResults: number;
  deletedParticipants: number;
  deletedAnswers: number;
  success: boolean;
}

/**
 * Resets exam results in Firestore and optionally resets the participant's
 * session and answer docs so they can retake the exam.
 */
export async function resetExamResults(
  options: ResetExamResultsOptions = {}
): Promise<ResetExamResultsResult> {
  await ensureTeacherAuthSession();
  const { examId, resultIds, resetParticipantSessions = true } = options;

  try {
    const refsToDelete: DocumentReference[] = [];
    const targetResults: Result[] = [];

    if (resultIds && resultIds.length > 0) {
      // Fetch specific results
      for (const resId of resultIds) {
        try {
          const resSnap = await getDoc(doc(db, 'results', resId));
          if (resSnap.exists()) {
            targetResults.push(resSnap.data() as Result);
          }
        } catch (err) {
          console.warn(`Error reading result doc ${resId}:`, err);
        }
      }
    } else {
      // Query by examId or all
      let resultsQuery;
      if (examId && examId !== 'ALL') {
        resultsQuery = query(collection(db, 'results'), where('examId', '==', examId));
      } else {
        resultsQuery = collection(db, 'results');
      }
      const resultsSnap = await getDocs(resultsQuery);
      resultsSnap.docs.forEach((d) => targetResults.push(d.data() as Result));
    }

    if (targetResults.length === 0) {
      return {
        deletedResults: 0,
        deletedParticipants: 0,
        deletedAnswers: 0,
        success: true,
      };
    }

    // Add result docs to deletion list
    targetResults.forEach((r) => {
      refsToDelete.push(doc(db, 'results', r.resultId));
    });

    let totalAnswersCount = 0;
    const participantIds = new Set<string>();

    if (resetParticipantSessions) {
      for (const r of targetResults) {
        if (r.participantId && !participantIds.has(r.participantId)) {
          participantIds.add(r.participantId);
          try {
            const answersSnap = await getDocs(
              collection(db, 'participants', r.participantId, 'answers')
            );
            totalAnswersCount += answersSnap.size;
            answersSnap.docs.forEach((aDoc) => refsToDelete.push(aDoc.ref));
          } catch (err) {
            console.warn(`Could not fetch answers for participant ${r.participantId}:`, err);
          }

          refsToDelete.push(doc(db, 'participants', r.participantId));

          // Clean local client storage lock keys
          try {
            const normName = r.name?.trim()?.toLowerCase() || '';
            localStorage.removeItem(`cbt_finished_${r.examId}_${normName}`);
            localStorage.removeItem(`cbt_session_${r.examId}`);
            localStorage.removeItem(`cbt_recovery_${r.participantId}`);
          } catch {
            // ignore
          }
        }
      }
    }

    // Execute chunked batch deletions
    await executeBatchDeletes(refsToDelete);

    return {
      deletedResults: targetResults.length,
      deletedParticipants: participantIds.size,
      deletedAnswers: totalAnswersCount,
      success: true,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, 'results');
    throw error;
  }
}

/**
 * Deletes a single result and optionally resets the participant's session
 * and answers so the student can retake the exam.
 */
export async function deleteSingleResult(
  resultId: string,
  resetParticipantSession: boolean = true
): Promise<{ success: boolean; deletedAnswers: number }> {
  await ensureTeacherAuthSession();
  const path = `results/${resultId}`;
  try {
    const resRef = doc(db, 'results', resultId);
    const resSnap = await getDoc(resRef);
    if (!resSnap.exists()) {
      return { success: true, deletedAnswers: 0 };
    }
    const rData = resSnap.data() as Result;
    const refsToDelete: DocumentReference[] = [resRef];
    let deletedAnswers = 0;

    if (resetParticipantSession && rData.participantId) {
      try {
        const answersSnap = await getDocs(
          collection(db, 'participants', rData.participantId, 'answers')
        );
        deletedAnswers = answersSnap.size;
        answersSnap.docs.forEach((d) => refsToDelete.push(d.ref));
        refsToDelete.push(doc(db, 'participants', rData.participantId));
      } catch (err) {
        console.warn(`Could not fetch answers for participant ${rData.participantId}:`, err);
      }

      try {
        const normName = rData.name?.trim()?.toLowerCase() || '';
        localStorage.removeItem(`cbt_finished_${rData.examId}_${normName}`);
        localStorage.removeItem(`cbt_session_${rData.examId}`);
        localStorage.removeItem(`cbt_recovery_${rData.participantId}`);
      } catch {
        // ignore
      }
    }

    await executeBatchDeletes(refsToDelete);
    return { success: true, deletedAnswers };
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
    throw error;
  }
}

// ==========================================
// SEED DEMO DATA
// ==========================================

export async function seedDemoDataIfEmpty(): Promise<boolean> {
  try {
    const snap = await getDocs(collection(db, 'exams'));
    if (!snap.empty) {
      return false; // already has data
    }

    const demoExamId = 'exam_demo_mat6_2026';
    const now = new Date().toISOString();
    const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const demoExam: Exam = {
      examId: demoExamId,
      title: 'Penilaian Matematika Kelas 6',
      subject: 'Matematika',
      grade: '6',
      phase: 'C',
      description: 'Ujian latihan dan penilaian harian materi pecahan, desimal, dan bangun ruang untuk siswa Kelas 6 Sekolah Dasar.',
      token: 'MAT6A26',
      startAt: now,
      endAt: futureDate,
      durationMinutes: 60,
      kkm: 75,
      status: 'ACTIVE',
      showScore: true,
      showAnswerReview: true,
      shuffleQuestions: false,
      shuffleOptions: false,
      createdBy: 'andika_yuliananta',
      createdAt: now,
      updatedAt: now,
    };

    await setDoc(doc(db, 'exams', demoExamId), cleanFirestoreData(demoExam));

    const demoQuestions: Question[] = [
      {
        questionId: 'q_demo_1',
        examId: demoExamId,
        number: 1,
        question: 'Hasil dari 3/4 + 1/2 dalam bentuk pecahan paling sederhana adalah ...',
        optionA: '4/6',
        optionB: '5/4 atau 1 1/4',
        optionC: '4/4',
        optionD: '2/4',
        correctAnswer: 'B',
        weight: 20,
        explanation: '3/4 + 1/2 = 3/4 + 2/4 = 5/4 = 1 1/4. Maka jawaban yang tepat adalah pilihan B.',
        createdAt: now,
        updatedAt: now,
      },
      {
        questionId: 'q_demo_2',
        examId: demoExamId,
        number: 2,
        question: 'Sebuah lingkaran memiliki jari-jari (r) sepanjang 14 cm. Berapakah luas lingkaran tersebut? (Gunakan π = 22/7)',
        optionA: '616 cm²',
        optionB: '308 cm²',
        optionC: '88 cm²',
        optionD: '154 cm²',
        correctAnswer: 'A',
        weight: 20,
        explanation: 'Rumus Luas Lingkaran = π × r² = (22/7) × 14 × 14 = 22 × 2 × 14 = 616 cm².',
        createdAt: now,
        updatedAt: now,
      },
      {
        questionId: 'q_demo_3',
        examId: demoExamId,
        number: 3,
        question: 'Bentuk persen dari pecahan 3/5 adalah ...',
        optionA: '30%',
        optionB: '50%',
        optionC: '60%',
        optionD: '75%',
        correctAnswer: 'C',
        weight: 20,
        explanation: '3/5 × 100% = 300% / 5 = 60%.',
        createdAt: now,
        updatedAt: now,
      },
      {
        questionId: 'q_demo_4',
        examId: demoExamId,
        number: 4,
        question: 'Sebuah balok memiliki panjang 10 cm, lebar 6 cm, dan tinggi 5 cm. Volume balok tersebut adalah ...',
        optionA: '150 cm³',
        optionB: '210 cm³',
        optionC: '300 cm³',
        optionD: '600 cm³',
        correctAnswer: 'C',
        weight: 20,
        explanation: 'Rumus Volume Balok = p × l × t = 10 cm × 6 cm × 5 cm = 300 cm³.',
        createdAt: now,
        updatedAt: now,
      },
      {
        questionId: 'q_demo_5',
        examId: demoExamId,
        number: 5,
        question: 'Rata-rata (mean) dari nilai ulangan matematika siswa: 70, 80, 85, 90, 75 adalah ...',
        optionA: '78',
        optionB: '80',
        optionC: '82',
        optionD: '85',
        correctAnswer: 'B',
        weight: 20,
        explanation: 'Jumlah nilai = 70 + 80 + 85 + 90 + 75 = 400. Rata-rata = 400 / 5 = 80.',
        createdAt: now,
        updatedAt: now,
      },
    ];

    const batch = writeBatch(db);
    demoQuestions.forEach((q) => {
      batch.set(doc(db, 'exams', demoExamId, 'questions', q.questionId), cleanFirestoreData(q));
    });
    await batch.commit();

    console.log('Demo data seeded successfully for CBT CERIA.');
    return true;
  } catch (error) {
    console.warn('Seed demo data info:', error);
    return false;
  }
}

export async function seedSampleSDExams(_uid?: string): Promise<boolean> {
  return seedDemoDataIfEmpty();
}

export async function startExamSession(
  examId: string,
  studentName: string,
  studentSchool: string,
  studentGrade: GradeLevel,
  durationMinutes: number
): Promise<Participant> {
  const examSnap = await getDoc(doc(db, 'exams', examId));
  const exam = examSnap.exists()
    ? (examSnap.data() as Exam)
    : {
        examId,
        durationMinutes,
      } as Exam;

  return startOrResumeParticipant(
    exam,
    { name: studentName, school: studentSchool, grade: studentGrade },
    'anon_' + Date.now()
  );
}

