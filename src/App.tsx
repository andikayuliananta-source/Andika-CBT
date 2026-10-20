import React, { useState, useEffect } from 'react';
import { Navbar } from './components/common/Navbar';
import { Footer } from './components/common/Footer';
import { LandingPage } from './pages/LandingPage';
import { TokenEntryForm } from './components/student/TokenEntryForm';
import { ExamConfirmation } from './components/student/ExamConfirmation';
import { ExamEngine } from './components/student/ExamEngine';
import { StudentResultView } from './components/student/StudentResultView';
import { TeacherPortal } from './pages/TeacherPortal';
import { TeacherAuthModal } from './components/teacher/TeacherAuthModal';
import {
  User,
  Exam,
  GradeLevel,
  Participant,
  StudentSafeQuestion,
  Result,
  ActiveCrashSession,
} from './types';
import {
  subscribeToAuthChanges,
  logoutTeacher,
  PRIMARY_ADMIN_EMAIL,
  isAuthorizedAdminEmail,
} from './services/firebase/authService';
import {
  getExams,
  startExamSession,
  getStudentSafeQuestions,
  seedSampleSDExams,
  DEFAULT_DEMO_QUESTIONS,
  getActiveCrashRecoverySession,
  saveActiveCrashRecoverySession,
  clearActiveCrashRecoverySession,
  getCrashRecoveryState,
  getAutosaveSnapshot,
} from './services/firebase/examService';
import { requestAppFullscreen } from './utils/fullscreen';

type AppView =
  | 'LANDING'
  | 'STUDENT_TOKEN'
  | 'STUDENT_CONFIRM'
  | 'STUDENT_EXAM'
  | 'STUDENT_RESULT'
  | 'TEACHER_PORTAL';

export default function App() {
  // Navigation & View State
  const [currentView, setCurrentView] = useState<AppView>('LANDING');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showTeacherAuthModal, setShowTeacherAuthModal] = useState(false);

  // Student Exam Session State
  const [activeExam, setActiveExam] = useState<Exam | null>(null);
  const [studentData, setStudentData] = useState<{
    name: string;
    school: string;
    grade: GradeLevel;
  } | null>(null);
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [questions, setQuestions] = useState<StudentSafeQuestion[]>([]);
  const [examResult, setExamResult] = useState<Result | null>(null);
  const [loadingStart, setLoadingStart] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  // Demo tokens for quick access helper
  const [activeTokens, setActiveTokens] = useState<string[]>([]);
  const [activeCrashSession, setActiveCrashSession] = useState<ActiveCrashSession | null>(null);

  // Check for in-progress crash recovery session on mount or view changes
  useEffect(() => {
    if (currentView === 'LANDING' || currentView === 'STUDENT_TOKEN') {
      const savedSession = getActiveCrashRecoverySession();
      setActiveCrashSession(savedSession);
    }
  }, [currentView]);

  // Auth observer
  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges((user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  // Initial seed check & token preload
  useEffect(() => {
    async function initCheck() {
      try {
        let exams = await getExams();
        if (exams.length === 0) {
          await seedSampleSDExams('admin_ceria');
          exams = await getExams();
        }
        const tokens = exams
          .filter((e) => e.status === 'ACTIVE')
          .map((e) => `${e.token} (${e.title})`);
        setActiveTokens(tokens);
      } catch (err) {
        console.warn('Initial seed or tokens check:', err);
      }
    }
    initCheck();
  }, []);

  // Handle portal selection from Landing Page
  const handleSelectPortal = (portal: 'student' | 'teacher') => {
    if (portal === 'student') {
      setCurrentView('STUDENT_TOKEN');
    } else {
      if (currentUser && isAuthorizedAdminEmail(currentUser.email)) {
        setCurrentView('TEACHER_PORTAL');
      } else {
        if (currentUser && !isAuthorizedAdminEmail(currentUser.email)) {
          logoutTeacher().catch(() => {});
          setCurrentUser(null);
        }
        setShowTeacherAuthModal(true);
      }
    }
  };

  // Student Token Verified -> Move to Confirmation Screen
  const handleTokenVerified = async (
    exam: Exam,
    data: { name: string; school: string; grade: GradeLevel }
  ) => {
    setActiveExam(exam);
    setStudentData(data);
    setStartError(null);
    try {
      let qList = await getStudentSafeQuestions(
        exam.examId,
        exam.shuffleQuestions,
        exam.shuffleOptions
      );
      if (!qList || qList.length === 0) {
        qList = DEFAULT_DEMO_QUESTIONS.map((q) => ({
          questionId: q.questionId,
          examId: exam.examId,
          number: q.number,
          question: q.question,
          imageUrl: q.imageUrl,
          type: q.type || 'SINGLE',
          optionA: q.optionA,
          optionB: q.optionB,
          optionC: q.optionC,
          optionD: q.optionD,
          statements: q.statements?.map((s) => ({ id: s.id, text: s.text })),
          weight: q.weight,
        }));
      }
      setQuestions(qList);
      setCurrentView('STUDENT_CONFIRM');
    } catch (err) {
      console.warn('Fallback demo questions due to error:', err);
      const fallback = DEFAULT_DEMO_QUESTIONS.map((q) => ({
        questionId: q.questionId,
        examId: exam.examId,
        number: q.number,
        question: q.question,
        imageUrl: q.imageUrl,
        type: q.type || 'SINGLE',
        optionA: q.optionA,
        optionB: q.optionB,
        optionC: q.optionC,
        optionD: q.optionD,
        statements: q.statements?.map((s) => ({ id: s.id, text: s.text })),
        weight: q.weight,
      }));
      setQuestions(fallback);
      setCurrentView('STUDENT_CONFIRM');
    }
  };

  // Student Confirms -> Start Exam Session
  const handleStartExam = async () => {
    if (!activeExam || !studentData) return;

    setLoadingStart(true);
    setStartError(null);
    try {
      const part = await startExamSession(
        activeExam.examId,
        studentData.name,
        studentData.school,
        studentData.grade,
        activeExam.durationMinutes || 60
      );
      setParticipant(part);

      // Ensure questions is never empty
      let safeQuestions = questions;
      if (!safeQuestions || safeQuestions.length === 0) {
        safeQuestions = DEFAULT_DEMO_QUESTIONS.map((q) => ({
          questionId: q.questionId,
          examId: activeExam.examId,
          number: q.number,
          question: q.question,
          imageUrl: q.imageUrl,
          type: q.type || 'SINGLE',
          optionA: q.optionA,
          optionB: q.optionB,
          optionC: q.optionC,
          optionD: q.optionD,
          statements: q.statements?.map((s) => ({ id: s.id, text: s.text })),
          weight: q.weight,
        }));
        setQuestions(safeQuestions);
      }

      // Save initial snapshot for crash recovery
      saveActiveCrashRecoverySession({
        exam: activeExam,
        participant: part,
        studentData,
        questions: safeQuestions,
        currentIndex: 0,
        savedAt: new Date().toISOString(),
      });

      setCurrentView('STUDENT_EXAM');
    } catch (err: any) {
      console.error('Failed to start exam session:', err);
      setStartError(err?.message || 'Gagal memulai sesi ujian. Silakan coba kembali.');
    } finally {
      setLoadingStart(false);
    }
  };

  // Resume In-Progress Exam after browser crash
  const handleResumeCrashSession = () => {
    if (!activeCrashSession) return;
    requestAppFullscreen().catch(() => {});
    setActiveExam(activeCrashSession.exam);
    setParticipant(activeCrashSession.participant);
    setStudentData(activeCrashSession.studentData);
    setQuestions(activeCrashSession.questions);
    setStartError(null);
    setCurrentView('STUDENT_EXAM');
  };

  // Discard crashed session
  const handleDiscardCrashSession = () => {
    clearActiveCrashRecoverySession();
    setActiveCrashSession(null);
  };

  const handleResetSessionForStudent = () => {
    if (activeExam && studentData) {
      const normName = studentData.name.trim().toLowerCase();
      localStorage.removeItem(`cbt_finished_${activeExam.examId}_${normName}`);
      localStorage.removeItem(`cbt_session_${activeExam.examId}`);
      clearActiveCrashRecoverySession();
      setActiveCrashSession(null);
      setStartError(null);
      handleStartExam();
    }
  };

  // Student Finishes Exam -> Result Screen
  const handleFinishExam = (result: Result) => {
    clearActiveCrashRecoverySession();
    setActiveCrashSession(null);
    setExamResult(result);
    setCurrentView('STUDENT_RESULT');
  };

  // Return to Home / Landing
  const handleResetToHome = () => {
    setActiveExam(null);
    setStudentData(null);
    setParticipant(null);
    setQuestions([]);
    setExamResult(null);
    setStartError(null);
    setCurrentView('LANDING');
  };

  // Switch to teacher portal after successful login
  const handleTeacherAuthSuccess = (user: User) => {
    if (!isAuthorizedAdminEmail(user.email)) {
      logoutTeacher().catch(() => {});
      setCurrentUser(null);
      setShowTeacherAuthModal(false);
      return;
    }
    setCurrentUser(user);
    setShowTeacherAuthModal(false);
    setCurrentView('TEACHER_PORTAL');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FCFDFD] text-slate-800">
      {/* Show Navbar when not in active student exam engine */}
      {currentView !== 'STUDENT_EXAM' && currentView !== 'TEACHER_PORTAL' && (
        <Navbar
          currentView={currentView}
          currentUser={currentUser}
          onOpenTeacherPortal={() => handleSelectPortal('teacher')}
          onOpenStudentPortal={() => handleSelectPortal('student')}
          onGoHome={handleResetToHome}
        />
      )}

      {/* Browser Crash Recovery Notification Bar */}
      {activeCrashSession && (currentView === 'LANDING' || currentView === 'STUDENT_TOKEN') && (() => {
        const savedRecovery = getCrashRecoveryState(activeCrashSession.participant.participantId);
        const savedSnapshot = getAutosaveSnapshot(activeCrashSession.participant.participantId);
        const answeredCount = savedRecovery?.answeredCount ?? savedSnapshot?.totalAnswered ?? 0;
        const totalQ = activeCrashSession.questions?.length || 0;
        const savedTime = savedSnapshot?.formattedTime || (savedRecovery?.savedAt ? new Date(savedRecovery.savedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : null);

        return (
          <div
            id="crash-recovery-alert-bar"
            className="w-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white shadow-md border-b-2 border-amber-400 animate-in fade-in"
          >
            <div className="max-w-6xl mx-auto px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center space-x-3 text-left">
                <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center text-xl shrink-0 shadow-xs">
                  ⚡
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="bg-white/25 text-[10px] uppercase font-black tracking-wider px-2 py-0.5 rounded-md text-amber-50">
                      Sesi Ujian Aktif Ditemukan (Autosave Pulih)
                    </span>
                    <span className="text-xs text-amber-100 font-semibold hidden md:inline">
                      (Tahan Gangguan Koneksi & Crash Browser)
                    </span>
                  </div>
                  <p className="text-sm font-display font-black mt-0.5">
                    {activeCrashSession.exam.title} • {activeCrashSession.studentData.name} ({activeCrashSession.studentData.school})
                  </p>
                  <p className="text-xs text-amber-100 font-medium">
                    💾 {answeredCount > 0 ? `${answeredCount} dari ${totalQ} jawaban telah tersimpan di localStorage` : 'Jawaban tersimpan otomatis di penyimpanan lokal'}{savedTime ? ` • Terakhir disimpan ${savedTime}` : ''}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
                <button
                  id="resume-crash-exam-btn"
                  type="button"
                  onClick={handleResumeCrashSession}
                  className="bg-white text-orange-600 hover:bg-orange-50 font-display font-black px-4 py-2 rounded-xl text-xs sm:text-sm shadow-sm transition-all flex items-center space-x-1.5 cursor-pointer"
                >
                  <span>🚀 Pulihkan & Lanjutkan Ujian</span>
                </button>
                <button
                  id="discard-crash-session-btn"
                  type="button"
                  onClick={handleDiscardCrashSession}
                  className="text-white/80 hover:text-white px-2.5 py-2 text-xs font-bold transition-colors cursor-pointer"
                  title="Abaikan dan hapus sesi ujian yang crash ini"
                >
                  ✕ Abaikan
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Main View Router */}
      <main className="flex-1 flex flex-col">
        {currentView === 'LANDING' && (
          <LandingPage
            onSelectPortal={handleSelectPortal}
            onStartDemoExam={() => handleSelectPortal('student')}
          />
        )}

        {currentView === 'STUDENT_TOKEN' && (
          <div className="flex-1 flex flex-col items-center justify-center p-4">
            <TokenEntryForm
              onSuccess={handleTokenVerified}
              onExamVerified={handleTokenVerified}
              onBack={handleResetToHome}
            />

            {/* Quick Helper for Demo Token Testing */}
            {activeTokens.length > 0 && (
              <div className="mt-6 max-w-lg w-full bg-amber-50/80 border border-amber-200 rounded-2xl p-4 text-xs font-semibold text-amber-900 text-center space-y-1">
                <div className="font-bold flex items-center justify-center space-x-1">
                  <span>💡 Token Ujian Tersedia untuk Simulasi:</span>
                </div>
                <div className="font-mono text-amber-800 font-black">
                  {activeTokens.join(' • ')}
                </div>
              </div>
            )}
          </div>
        )}

        {currentView === 'STUDENT_CONFIRM' && activeExam && studentData && (
          <div className="flex-1 flex items-center justify-center p-4">
            <ExamConfirmation
              exam={activeExam}
              studentData={studentData}
              questionsCount={questions.length > 0 ? questions.length : 5}
              onConfirmStart={handleStartExam}
              onBack={() => setCurrentView('STUDENT_TOKEN')}
              loading={loadingStart}
              errorMessage={startError}
              onResetSession={handleResetSessionForStudent}
            />
          </div>
        )}

        {currentView === 'STUDENT_EXAM' && activeExam && participant && (
          <ExamEngine
            exam={activeExam}
            participant={participant}
            questions={questions}
            onFinishExam={handleFinishExam}
          />
        )}

        {currentView === 'STUDENT_RESULT' && examResult && activeExam && (
          <div className="flex-1 flex items-center justify-center p-4">
            <StudentResultView
              result={examResult}
              exam={activeExam}
              onBackToHome={handleResetToHome}
            />
          </div>
        )}

        {currentView === 'TEACHER_PORTAL' && (
          currentUser && isAuthorizedAdminEmail(currentUser.email) ? (
            <TeacherPortal
              currentUser={currentUser}
              onLogout={() => {
                logoutTeacher().catch(() => {});
                setCurrentUser(null);
                setCurrentView('LANDING');
              }}
              onSwitchToStudentView={() => setCurrentView('STUDENT_TOKEN')}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center p-6 bg-slate-50">
              <div className="max-w-md w-full bg-white rounded-3xl border-2 border-red-200 p-8 text-center space-y-4 shadow-xl">
                <div className="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto text-3xl">
                  🛑
                </div>
                <h3 className="font-display font-black text-xl text-slate-900">
                  Akses Ditolak: Khusus Administrator
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed font-medium">
                  Portal Guru dan Bank Soal dilindungi secara ketat. Hanya akun Administrator Utama (<strong>{PRIMARY_ADMIN_EMAIL}</strong>) yang memiliki izin masuk demi menjaga keamanan soal ujian.
                </p>
                <div className="pt-2 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => setShowTeacherAuthModal(true)}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-display font-extrabold text-xs shadow-xs cursor-pointer"
                  >
                    🔐 Masuk ke Portal Guru
                  </button>
                  <button
                    type="button"
                    onClick={handleResetToHome}
                    className="w-full py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-bold text-xs cursor-pointer"
                  >
                    Kembali ke Beranda
                  </button>
                </div>
              </div>
            </div>
          )
        )}
      </main>

      {/* Teacher Authentication Modal */}
      {showTeacherAuthModal && (
        <TeacherAuthModal
          onSuccess={handleTeacherAuthSuccess}
          onCancel={() => setShowTeacherAuthModal(false)}
        />
      )}

      {/* Footer when not inside active exam */}
      {currentView !== 'STUDENT_EXAM' && currentView !== 'TEACHER_PORTAL' && (
        <Footer />
      )}
    </div>
  );
}
