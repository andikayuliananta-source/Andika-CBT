export type UserRole = 'admin' | 'teacher';
export type UserStatus = 'ACTIVE' | 'INACTIVE';
export type ExamStatus = 'DRAFT' | 'ACTIVE' | 'FINISHED' | 'INACTIVE';
export type ParticipantStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'SUBMITTED' | 'TIMEOUT';
export type SubmitReason = 'NORMAL' | 'TIMEOUT' | 'TAB_SWITCH' | 'TAB_CLOSED';
export type ResultPassStatus = 'LULUS' | 'BELUM LULUS';
export type GradeLevel = '1' | '2' | '3' | '4' | '5' | '6';
export type CurriculumPhase = 'A' | 'B' | 'C';
export type QuestionType = 'SINGLE' | 'COMPLEX' | 'COMPLEX_TF'; // SINGLE = PG Biasa, COMPLEX = PG Kompleks (Multi-Opsi), COMPLEX_TF = PG Kompleks (Pernyataan Benar/Salah)

export interface QuestionStatement {
  id: string; // e.g. "s1", "s2", "s3"
  text: string;
  imageUrl?: string; // Optional image URL for the statement/visual stimulus
  isCorrectTrue: boolean; // true = Benar, false = Salah
}

export interface StudentSafeStatement {
  id: string;
  text: string;
  imageUrl?: string; // Optional image URL for student exam view
}

export interface User {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
}

export interface Exam {
  examId: string;
  title: string;
  subject: string;
  grade: GradeLevel;
  phase: CurriculumPhase;
  description: string;
  token: string;
  startAt: string;
  endAt: string;
  durationMinutes: number;
  kkm: number;
  status: ExamStatus;
  showScore: boolean;
  showAnswerReview: boolean;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface Question {
  questionId: string;
  examId: string;
  number: number;
  question: string;
  imageUrl?: string;
  type?: QuestionType; // 'SINGLE' (default) | 'COMPLEX' | 'COMPLEX_TF'
  optionA: string;
  optionB: string;
  optionC?: string;
  optionD?: string;
  statements?: QuestionStatement[]; // For COMPLEX_TF: array of statements with Benar/Salah keys
  correctAnswer: 'A' | 'B' | 'C' | 'D'; // Primary or single answer
  correctAnswers?: ('A' | 'B' | 'C' | 'D')[]; // Multiple correct answers for 'COMPLEX'
  weight: number;
  explanation?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Client question projection (without answer key sent to student)
export interface StudentSafeQuestion {
  questionId: string;
  examId: string;
  number: number;
  question: string;
  imageUrl?: string;
  type?: QuestionType;
  optionA: string;
  optionB: string;
  optionC?: string;
  optionD?: string;
  statements?: StudentSafeStatement[]; // Omit isCorrectTrue for test integrity
  weight: number;
}

export interface Participant {
  participantId: string;
  examId: string;
  userId: string;
  name: string;
  school: string;
  grade: GradeLevel;
  startedAt: string;
  endAt: string;
  finishedAt?: string;
  status: ParticipantStatus;
  tabSwitchCount: number;
  submitReason?: SubmitReason;
}

export interface Answer {
  answerId: string;
  participantId: string;
  examId: string;
  questionId: string;
  answer: string; // For SINGLE: 'A'. For COMPLEX: sorted comma-separated 'A,C'
  answers?: string[];
  marked: boolean;
  updatedAt: string;
}

export interface Result {
  resultId: string;
  participantId: string;
  examId: string;
  name: string;
  school: string;
  grade: GradeLevel;
  totalQuestions: number;
  correctAnswers: number;
  wrongAnswers: number;
  score: number;
  status: ResultPassStatus;
  startedAt: string;
  finishedAt: string;
  createdAt: string;
  submitReason?: SubmitReason;
}

export interface AppSetting {
  settingId: string;
  appName: string;
  schoolName: string;
  defaultDuration: number;
  defaultKkm: number;
  updatedAt: string;
}

export interface StudentSession {
  participant: Participant;
  exam: Exam;
  questions: Question[];
  answers: Record<string, { answer: string; marked: boolean }>;
}

export interface CrashRecoveryState {
  participantId: string;
  examId: string;
  studentName: string;
  currentIndex: number;
  answers: Record<string, { answer: string; marked: boolean }>;
  savedAt: string;
  answeredCount: number;
}

export interface LocalAnswerDraft {
  questionId: string;
  examId: string;
  participantId: string;
  answer: string;
  marked: boolean;
  savedAt: string;
  syncedToCloud: boolean;
}

export interface OfflineDraftSyncResult {
  syncedCount: number;
  failedCount: number;
  totalPending: number;
}

export interface AutosaveSnapshot {
  participantId: string;
  examId: string;
  lastQuestionId: string;
  lastAnswer: string;
  totalAnswered: number;
  totalMarked: number;
  savedAt: string;
  formattedTime: string;
}

export interface ActiveCrashSession {
  exam: Exam;
  participant: Participant;
  studentData: { name: string; school: string; grade: GradeLevel };
  questions: StudentSafeQuestion[];
  currentIndex?: number;
  savedAt: string;
}
