import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Clock,
  Bookmark,
  Flag,
  ChevronLeft,
  ChevronRight,
  Send,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Wifi,
  WifiOff,
  EyeOff,
  X,
  ShieldAlert,
  ArrowRight,
  Database,
  ShieldCheck,
  Save,
  Maximize2,
  Minimize2,
  Lock,
  Unlock,
  LayoutGrid,
  ZoomIn,
  Loader2,
  Check,
  ListChecks,
  CheckSquare,
  Square,
  CloudOff,
  HardDrive,
} from 'lucide-react';
import { QuestionImage } from '../common/QuestionImage';
import { Exam, Participant, StudentSafeQuestion, Result, SubmitReason, CrashRecoveryState } from '../../types';
import { convertLatexToStandardMath } from '../../utils/mathFormatter';
import { ExamProgressBar } from './ExamProgressBar';
import { ExamTimeProgressBar } from './ExamTimeProgressBar';
import { QuestionCard } from './QuestionCard';
import { QuestionChip } from './QuestionChip';
import { ExamLiveTimer, ExamHeaderBadgeTimer } from './ExamLiveTimer';
import {
  saveStudentAnswer,
  getParticipantAnswers,
  recordTabSwitch,
  submitExamAndCalculateScore,
  saveCrashRecoveryState,
  getCrashRecoveryState,
  saveActiveCrashRecoverySession,
  saveAnswerDraftLocally,
  markDraftSyncedLocally,
  getUnsyncedDraftCount,
  syncOfflineDraftsToCloud,
  getAllLocalDrafts,
  saveAutosaveSnapshot,
  getAutosaveSnapshot,
} from '../../services/firebase/examService';
import {
  requestAppFullscreen,
  exitAppFullscreen,
  isAppFullscreen,
  subscribeFullscreenChange,
} from '../../utils/fullscreen';

interface ExamEngineProps {
  exam: Exam;
  participant: Participant;
  questions: StudentSafeQuestion[];
  onFinishExam: (result: Result) => void;
}

export const ExamEngine: React.FC<ExamEngineProps> = ({
  exam,
  participant,
  questions,
  onFinishExam,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, { answer: string; marked: boolean }>>({});
  const [syncStatus, setSyncStatus] = useState<'saved' | 'saving' | 'offline'>('saved');

  // Periodic LocalStorage & Crash Recovery State
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [isPeriodicSaving, setIsPeriodicSaving] = useState(false);
  const [recoveryNotice, setRecoveryNotice] = useState<{
    show: boolean;
    count: number;
    savedAt?: string;
  } | null>(null);
  const [showManualSavedToast, setShowManualSavedToast] = useState(false);

  // Offline draft tracking state (persisted in localStorage)
  const [unsyncedDraftCount, setUnsyncedDraftCount] = useState<number>(() => {
    return getUnsyncedDraftCount(participant.participantId);
  });
  const [isSyncingDrafts, setIsSyncingDrafts] = useState(false);
  const [draftSyncNotice, setDraftSyncNotice] = useState<string | null>(null);

  // Real-time connectivity monitor state
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    return typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean'
      ? navigator.onLine
      : true;
  });
  const [showReconnectedToast, setShowReconnectedToast] = useState(false);
  const [isCheckingConnection, setIsCheckingConnection] = useState(false);

  // Status indicator that briefly flashes in the corner when student selects an answer
  const [answerSavingStatus, setAnswerSavingStatus] = useState<'saving' | 'saved' | null>(null);
  const savingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const answersRef = useRef(answers);
  const currentIndexRef = useRef(currentIndex);

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  useEffect(() => {
    return () => {
      if (savingTimeoutRef.current) {
        clearTimeout(savingTimeoutRef.current);
      }
    };
  }, []);

  // Fullscreen state & Screen Lock enforcement
  const [isFullscreen, setIsFullscreen] = useState<boolean>(() => isAppFullscreen());
  const [dismissFullscreenBanner, setDismissFullscreenBanner] = useState(false);
  const [bypassFullscreenLock, setBypassFullscreenLock] = useState<boolean>(false);
  const [fullscreenToast, setFullscreenToast] = useState<string | null>(null);
  const [fullscreenLockExits, setFullscreenLockExits] = useState<number>(0);

  // Mobile navigation, palette drawer, and accessibility states
  const [showMobilePalette, setShowMobilePalette] = useState(false);
  const [fontSize, setFontSize] = useState<'normal' | 'large'>('normal');
  const [previewImageModal, setPreviewImageModal] = useState<string | null>(null);
  const carouselRef = useRef<HTMLDivElement>(null);

  // Auto-scroll active question chip into view on mobile carousel
  useEffect(() => {
    if (carouselRef.current) {
      const activeChip = carouselRef.current.querySelector(`#chip-q-${currentIndex}`);
      if (activeChip) {
        activeChip.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }
  }, [currentIndex]);

  // Dialogs and alerts
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitErrorNotice, setSubmitErrorNotice] = useState<string | null>(null);
  const [timeWarning, setTimeWarning] = useState<string | null>(null);

  // Debounced network sync queue to protect Firestore and Wi-Fi from 500+ concurrent students
  const syncDebounceTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Clean up any pending sync timers on unmount
  useEffect(() => {
    return () => {
      syncDebounceTimersRef.current.forEach((t) => clearTimeout(t));
      syncDebounceTimersRef.current.clear();
    };
  }, []);

  // Security termination state
  const isSubmittedRef = useRef(false);
  const [securityTermination, setSecurityTermination] = useState<{
    triggered: boolean;
    reason: 'TAB_SWITCH' | 'TAB_CLOSED';
    result?: Result;
  } | null>(null);
  const [autoRedirectCountdown, setAutoRedirectCountdown] = useState(5);

  // Time warning flags to only show once
  const alerted10Min = useRef(false);
  const alerted5Min = useRef(false);
  const alerted1Min = useRef(false);

  // Synchronize any pending offline drafts stored in localStorage to Cloud
  const handleSyncPendingDrafts = useCallback(async () => {
    if (isSyncingDrafts) return;
    const pending = getUnsyncedDraftCount(participant.participantId);
    if (pending === 0) return;

    setIsSyncingDrafts(true);
    try {
      const res = await syncOfflineDraftsToCloud(participant.participantId, exam.examId);
      setUnsyncedDraftCount(res.totalPending);
      if (res.syncedCount > 0) {
        setDraftSyncNotice(`${res.syncedCount} draf jawaban berhasil disinkronkan ke server.`);
        setTimeout(() => setDraftSyncNotice(null), 4000);
        if (res.totalPending === 0) {
          setSyncStatus('saved');
        }
      }
    } catch (err) {
      console.warn('Gagal sinkronisasi draf offline:', err);
    } finally {
      setIsSyncingDrafts(false);
    }
  }, [isSyncingDrafts, participant.participantId, exam.examId]);

  // Helper to persist answer state to localStorage with debounce to eliminate main-thread lag
  const persistTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const persistAnswersToLocalStorage = useCallback(
    (currentAnswers: Record<string, { answer: string; marked: boolean }>, activeIdx: number, immediate: boolean = false) => {
      if (isSubmittedRef.current) return;

      const doPersist = () => {
        try {
          const now = new Date();
          const timeStr = now.toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          });

          // Save lightweight crash recovery data (answers & index only, fast & non-blocking)
          const recoveryData: CrashRecoveryState = {
            participantId: participant.participantId,
            examId: exam.examId,
            studentName: participant.name,
            currentIndex: activeIdx,
            answers: currentAnswers,
            savedAt: now.toISOString(),
            answeredCount: Object.values(currentAnswers).filter((a) => a.answer !== '').length,
          };
          saveCrashRecoveryState(recoveryData);
          setLastSavedTime(timeStr);
        } catch (err) {
          console.warn('Gagal mencadangkan jawaban ke localStorage:', err);
        }
      };

      if (immediate) {
        if (persistTimeoutRef.current) clearTimeout(persistTimeoutRef.current);
        doPersist();
      } else {
        if (persistTimeoutRef.current) clearTimeout(persistTimeoutRef.current);
        persistTimeoutRef.current = setTimeout(doPersist, 400);
      }
    },
    [participant.participantId, participant.name, exam.examId]
  );

  // Load initial answers with Crash Recovery and LocalStorage Drafts detection
  useEffect(() => {
    async function loadAnswersWithRecovery() {
      try {
        // 1. Instantly preload from local drafts and crash recovery from localStorage (0ms latency, resilient to crash/offline)
        const localDrafts = getAllLocalDrafts(participant.participantId);
        const localRecovery = getCrashRecoveryState(participant.participantId);
        const localAnswers: Record<string, { answer: string; marked: boolean }> = {};

        try {
          const storedLegacy = JSON.parse(localStorage.getItem(`cbt_answers_${participant.participantId}`) || '{}');
          Object.assign(localAnswers, storedLegacy);
        } catch {
          // ignore
        }

        Object.values(localDrafts).forEach((d) => {
          if (d.answer !== '' || !localAnswers[d.questionId]) {
            localAnswers[d.questionId] = { answer: d.answer, marked: d.marked };
          }
        });

        if (localRecovery?.answers) {
          Object.assign(localAnswers, localRecovery.answers);
        }

        // Immediately set local answers to UI
        if (Object.keys(localAnswers).length > 0) {
          setAnswers(localAnswers);
          const initialAnswered = Object.values(localAnswers).filter((a) => a.answer !== '').length;
          if (initialAnswered > 0) {
            const formattedSavedTime = localRecovery?.savedAt
              ? new Date(localRecovery.savedAt).toLocaleTimeString('id-ID', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })
              : null;
            setLastSavedTime(formattedSavedTime || new Date().toLocaleTimeString('id-ID'));
            setRecoveryNotice({
              show: true,
              count: initialAnswered,
              savedAt: formattedSavedTime || undefined,
            });
            if (
              localRecovery &&
              typeof localRecovery.currentIndex === 'number' &&
              localRecovery.currentIndex >= 0 &&
              localRecovery.currentIndex < questions.length
            ) {
              setCurrentIndex(localRecovery.currentIndex);
            }
          }
        }

        // 2. Fetch and merge remote answers from Firestore
        const remoteAnswers = await getParticipantAnswers(participant.participantId);

        const mergedAnswers: Record<string, { answer: string; marked: boolean }> = {
          ...remoteAnswers,
        };

        // Merge drafts from localStorage, prioritizing local drafts
        Object.values(localDrafts).forEach((d) => {
          if (d.answer !== '' || !mergedAnswers[d.questionId]) {
            mergedAnswers[d.questionId] = { answer: d.answer, marked: d.marked };
          }
        });

        if (localRecovery?.answers) {
          Object.assign(mergedAnswers, localRecovery.answers);
        }

        setAnswers(mergedAnswers);

        // Set pending unsynced draft count
        const pendingCount = getUnsyncedDraftCount(participant.participantId);
        setUnsyncedDraftCount(pendingCount);

        const answeredTotal = Object.values(mergedAnswers).filter((a) => a.answer !== '').length;
        if (answeredTotal > 0 && (localRecovery || Object.keys(localDrafts).length > 0)) {
          const formattedSavedTime = localRecovery?.savedAt
            ? new Date(localRecovery.savedAt).toLocaleTimeString('id-ID', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })
            : null;

          setLastSavedTime(formattedSavedTime || new Date().toLocaleTimeString('id-ID'));
          setRecoveryNotice({
            show: true,
            count: answeredTotal,
            savedAt: formattedSavedTime || undefined,
          });

          // Restore last question index if valid
          if (
            localRecovery &&
            typeof localRecovery.currentIndex === 'number' &&
            localRecovery.currentIndex >= 0 &&
            localRecovery.currentIndex < questions.length
          ) {
            setCurrentIndex(localRecovery.currentIndex);
          }
        } else {
          setLastSavedTime(new Date().toLocaleTimeString('id-ID'));
        }

        // If online and there are pending offline drafts from previous session, background sync them
        if (typeof navigator !== 'undefined' && navigator.onLine && pendingCount > 0) {
          syncOfflineDraftsToCloud(participant.participantId, exam.examId)
            .then((res) => {
              setUnsyncedDraftCount(res.totalPending);
            })
            .catch(() => {});
        }
      } catch (err) {
        console.warn('Could not load stored answers:', err);
      }
    }
    loadAnswersWithRecovery();
  }, [participant.participantId, exam.examId, questions.length]);

  // Periodic LocalStorage Auto-Save: Runs silently every 15s in background without re-render lag
  useEffect(() => {
    const autosaveTimer = setInterval(() => {
      if (isSubmittedRef.current) return;
      persistAnswersToLocalStorage(answersRef.current, currentIndexRef.current, true);
    }, 15000);

    return () => clearInterval(autosaveTimer);
  }, [persistAnswersToLocalStorage]);

  // Real-time connectivity monitor listeners & interval detection
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setSyncStatus('saved');
      setShowReconnectedToast(true);
      handleSyncPendingDrafts();
      const timer = setTimeout(() => setShowReconnectedToast(false), 4000);
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setSyncStatus('offline');
      setShowReconnectedToast(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Active heartbeat check every 15s to catch silent network drops (e.g. Wi-Fi packet loss)
    const connectivityTimer = setInterval(() => {
      if (typeof navigator !== 'undefined') {
        const currentlyOnline = navigator.onLine;
        setIsOnline((prev) => {
          if (prev !== currentlyOnline) {
            if (currentlyOnline) {
              setSyncStatus('saved');
              setShowReconnectedToast(true);
              handleSyncPendingDrafts();
              setTimeout(() => setShowReconnectedToast(false), 4000);
            } else {
              setSyncStatus('offline');
              setShowReconnectedToast(false);
            }
            return currentlyOnline;
          }
          return prev;
        });
      }
    }, 15000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(connectivityTimer);
    };
  }, []);

  // Listen to Fullscreen changes in real time and enforce automatic screen lock
  useEffect(() => {
    // Attempt automatic fullscreen request on component mount
    if (!isAppFullscreen()) {
      requestAppFullscreen()
        .then((granted) => {
          if (granted) {
            setIsFullscreen(true);
            setFullscreenToast('🔒 Mode Layar Penuh Aktif: Layar ujian terkunci dari gangguan.');
          }
        })
        .catch(() => {});
    } else {
      setIsFullscreen(true);
      setFullscreenToast('🔒 Mode Layar Penuh Aktif: Layar ujian terkunci dari gangguan.');
    }

    const unsubscribe = subscribeFullscreenChange((fs) => {
      setIsFullscreen(fs);
      if (fs) {
        setFullscreenToast('🔒 Layar penuh terkunci. Selamat mengerjakan!');
      } else {
        // Fullscreen was exited during test session
        setFullscreenLockExits((prev) => prev + 1);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Auto-dismiss fullscreen toast after 4s
  useEffect(() => {
    if (!fullscreenToast) return;
    const timer = setTimeout(() => {
      setFullscreenToast(null);
    }, 4000);
    return () => clearTimeout(timer);
  }, [fullscreenToast]);

  // Handler to lock screen into fullscreen
  const handleLockFullscreen = async () => {
    const granted = await requestAppFullscreen();
    if (granted) {
      setIsFullscreen(true);
      setFullscreenToast('🔒 Layar berhasil dikunci dalam mode penuh.');
    } else {
      // If browser denies fullscreen (e.g. iframe permission restricted)
      setFullscreenToast('⚠️ Browser membatasi layar penuh. Anda dapat melanjutkan dalam mode jendela.');
    }
  };

  // Toggle Fullscreen handler
  const handleToggleFullscreen = async () => {
    if (isAppFullscreen()) {
      await exitAppFullscreen();
      setIsFullscreen(false);
    } else {
      await handleLockFullscreen();
    }
  };

  // Strict anti-cheating & security: Tab switch or tab closing automatically submits exam
  const handleSecurityTerminate = useCallback(
    async (reason: 'TAB_SWITCH' | 'TAB_CLOSED') => {
      if (isSubmittedRef.current) return;
      isSubmittedRef.current = true;
      setIsSubmitting(true);
      setSecurityTermination({ triggered: true, reason });
      exitAppFullscreen().catch(() => {});

      try {
        const res = await submitExamAndCalculateScore(
          participant.participantId,
          exam.examId,
          reason
        );
        setSecurityTermination({ triggered: true, reason, result: res });
      } catch (err) {
        console.error('Auto-termination error:', err);
      }
    },
    [participant.participantId, exam.examId]
  );

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && !isSubmittedRef.current) {
        // Guarantee latest answers are flushed to localStorage instantly
        persistAnswersToLocalStorage(answersRef.current, currentIndexRef.current);
        handleSecurityTerminate('TAB_SWITCH');
      }
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isSubmittedRef.current) {
        // Guarantee latest answers are flushed to localStorage instantly
        persistAnswersToLocalStorage(answersRef.current, currentIndexRef.current);
        handleSecurityTerminate('TAB_CLOSED');
        e.preventDefault();
        e.returnValue = 'Peringatan: Menutup atau berpindah tab akan otomatis menyelesaikan dan mengirim ujian kamu!';
        return e.returnValue;
      }
    };

    const handlePageHide = () => {
      if (!isSubmittedRef.current) {
        // Guarantee latest answers are flushed to localStorage instantly
        persistAnswersToLocalStorage(answersRef.current, currentIndexRef.current);
        handleSecurityTerminate('TAB_CLOSED');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, [handleSecurityTerminate, persistAnswersToLocalStorage]);

  // Countdown for auto redirection to results when security terminated
  useEffect(() => {
    if (!securityTermination?.triggered) return;

    const timer = setInterval(() => {
      setAutoRedirectCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          if (securityTermination.result) {
            onFinishExam(securityTermination.result);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [securityTermination, onFinishExam]);

  const queueAnswerSync = useCallback(
    (questionId: string, answer: string, marked: boolean) => {
      // Clear existing debounce timer for this question if student clicked options rapidly
      const existingTimer = syncDebounceTimersRef.current.get(questionId);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      const timer = setTimeout(async () => {
        syncDebounceTimersRef.current.delete(questionId);
        try {
          await saveStudentAnswer(
            participant.participantId,
            exam.examId,
            questionId,
            answer,
            marked
          );
          setSyncStatus('saved');
          setIsOnline(true);
          setUnsyncedDraftCount(getUnsyncedDraftCount(participant.participantId));
        } catch {
          setSyncStatus('offline');
          setIsOnline(false);
          setUnsyncedDraftCount(getUnsyncedDraftCount(participant.participantId));
        }
      }, 350);

      syncDebounceTimersRef.current.set(questionId, timer);
    },
    [participant.participantId, exam.examId]
  );

  const handleAutoSubmit = useCallback(async () => {
    if (isSubmitting || isSubmittedRef.current) return;
    isSubmittedRef.current = true;
    setIsSubmitting(true);
    exitAppFullscreen().catch(() => {});
    try {
      // Cancel pending debounce timers to avoid post-submit mutations
      syncDebounceTimersRef.current.forEach((t) => clearTimeout(t));
      syncDebounceTimersRef.current.clear();

      try {
        await syncOfflineDraftsToCloud(participant.participantId, exam.examId);
      } catch (syncErr) {
        console.warn('Auto-submit draft sync warning:', syncErr);
      }
      const result = await submitExamAndCalculateScore(participant.participantId, exam.examId, 'TIMEOUT');
      onFinishExam(result);
    } catch (err) {
      console.error('Auto-submit error:', err);
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting, participant.participantId, exam.examId, onFinishExam]);

  const handleManualSubmit = async () => {
    if (isSubmittedRef.current) return;
    isSubmittedRef.current = true;
    setIsSubmitting(true);
    setSubmitErrorNotice(null);
    exitAppFullscreen().catch(() => {});
    try {
      // Cancel pending debounce timers and commit all offline drafts
      syncDebounceTimersRef.current.forEach((t) => clearTimeout(t));
      syncDebounceTimersRef.current.clear();

      try {
        await syncOfflineDraftsToCloud(participant.participantId, exam.examId);
      } catch (syncErr) {
        console.warn('Manual submit draft sync warning:', syncErr);
      }
      const result = await submitExamAndCalculateScore(participant.participantId, exam.examId, 'NORMAL');
      setShowSubmitModal(false);
      onFinishExam(result);
    } catch (err: any) {
      isSubmittedRef.current = false;
      setSubmitErrorNotice(err?.message || 'Gagal mengirim jawaban. Silakan periksa koneksi internet dan coba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Answer selection handler (with autosave)
  const currentQuestion = questions[currentIndex];
  const currentAnswer = currentQuestion ? answers[currentQuestion.questionId]?.answer || '' : '';
  const currentMarked = currentQuestion ? answers[currentQuestion.questionId]?.marked || false : false;

  const handleSelectOption = async (optionKey: string) => {
    if (!currentQuestion || isSubmitting) return;

    if (savingTimeoutRef.current) {
      clearTimeout(savingTimeoutRef.current);
      savingTimeoutRef.current = null;
    }

    const isComplex = currentQuestion.type === 'COMPLEX';
    let nextAnswer = optionKey.toUpperCase();

    if (isComplex) {
      const currentList = currentAnswer
        ? currentAnswer.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean)
        : [];
      let updatedList: string[];
      if (currentList.includes(nextAnswer)) {
        updatedList = currentList.filter((k) => k !== nextAnswer);
      } else {
        updatedList = [...currentList, nextAnswer];
      }
      updatedList.sort();
      nextAnswer = updatedList.join(',');
    }

    const newAnswers = {
      ...answers,
      [currentQuestion.questionId]: {
        answer: nextAnswer,
        marked: currentMarked,
      },
    };
    setAnswers(newAnswers);

    // 1. Instant save draft in-memory and debounced flush
    saveAnswerDraftLocally(
      participant.participantId,
      exam.examId,
      currentQuestion.questionId,
      nextAnswer,
      currentMarked
    );
    persistAnswersToLocalStorage(newAnswers, currentIndex, false);

    const nowTime = new Date().toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    setLastSavedTime(nowTime);
    setAnswerSavingStatus('saved');

    // 2. Debounced background sync to Firestore
    queueAnswerSync(currentQuestion.questionId, nextAnswer, currentMarked);

    savingTimeoutRef.current = setTimeout(() => {
      setAnswerSavingStatus(null);
      savingTimeoutRef.current = null;
    }, 1800);
  };

  const handleToggleMark = async () => {
    if (!currentQuestion || isSubmitting) return;

    if (savingTimeoutRef.current) {
      clearTimeout(savingTimeoutRef.current);
      savingTimeoutRef.current = null;
    }

    const nextMarked = !currentMarked;
    const newAnswers = {
      ...answers,
      [currentQuestion.questionId]: {
        answer: currentAnswer,
        marked: nextMarked,
      },
    };
    setAnswers(newAnswers);

    // 1. Instant save draft in-memory and debounced flush
    saveAnswerDraftLocally(
      participant.participantId,
      exam.examId,
      currentQuestion.questionId,
      currentAnswer,
      nextMarked
    );
    persistAnswersToLocalStorage(newAnswers, currentIndex, false);

    const markTime = new Date().toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    setLastSavedTime(markTime);
    setAnswerSavingStatus('saved');

    // 2. Debounced background sync to Firestore
    queueAnswerSync(currentQuestion.questionId, currentAnswer, nextMarked);

    savingTimeoutRef.current = setTimeout(() => {
      setAnswerSavingStatus(null);
      savingTimeoutRef.current = null;
    }, 1500);
  };

  // Real-time manual connectivity check triggered by student
  const handleCheckConnectivity = async () => {
    setIsCheckingConnection(true);
    try {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        setIsOnline(false);
        setSyncStatus('offline');
      } else {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);
        try {
          await fetch(`/api/health?_t=${Date.now()}`, {
            method: 'HEAD',
            cache: 'no-store',
            signal: controller.signal,
          });
          clearTimeout(timeoutId);
          setIsOnline(true);
          setSyncStatus('saved');
          setShowReconnectedToast(true);
          handleSyncPendingDrafts();
          setTimeout(() => setShowReconnectedToast(false), 4000);
        } catch {
          clearTimeout(timeoutId);
          if (typeof navigator !== 'undefined' && !navigator.onLine) {
            setIsOnline(false);
            setSyncStatus('offline');
          } else {
            // If API health ping fails or aborted, still check navigator
            setIsOnline(navigator.onLine);
            if (!navigator.onLine) setSyncStatus('offline');
          }
        }
      }
    } finally {
      setTimeout(() => setIsCheckingConnection(false), 400);
    }
  };

  const handleNavigateQuestion = (newIdx: number) => {
    setCurrentIndex(newIdx);
    persistAnswersToLocalStorage(answers, newIdx);
  };

  const handleJumpToNextMarkedQuestion = () => {
    const markedIndices: number[] = [];
    questions.forEach((q, idx) => {
      if (answers[q.questionId]?.marked) {
        markedIndices.push(idx);
      }
    });
    if (markedIndices.length === 0) return;
    const nextIdx = markedIndices.find((idx) => idx > currentIndex);
    if (nextIdx !== undefined) {
      handleNavigateQuestion(nextIdx);
    } else {
      handleNavigateQuestion(markedIndices[0]);
    }
  };

  const handleManualBackup = () => {
    setIsPeriodicSaving(true);
    persistAnswersToLocalStorage(answers, currentIndex);
    setShowManualSavedToast(true);
    setTimeout(() => {
      setIsPeriodicSaving(false);
    }, 400);
    setTimeout(() => {
      setShowManualSavedToast(false);
    }, 3000);
  };

  // Counts
  const answeredCount = Object.values(answers).filter(
    (a: { answer: string; marked: boolean }) => a.answer !== ''
  ).length;
  const markedCount = Object.values(answers).filter(
    (a: { answer: string; marked: boolean }) => a.marked
  ).length;
  const unansweredCount = Math.max(0, questions.length - answeredCount);

  return (
    <div className="flex-1 flex flex-col max-w-6xl mx-auto w-full p-2.5 sm:p-6 pb-24 sm:pb-6 space-y-3 sm:space-y-4">

      {/* 1. EXAM HEADER */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border-2 border-amber-200 shadow-sm p-3 sm:p-5 transition-all">
        {/* Top Row: Student info, Timer & Fullscreen button */}
        <div className="flex items-center justify-between gap-2">
          {/* Left: Student & Exam info */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center space-x-1.5 sm:space-x-2">
              <span className="text-base sm:text-xl shrink-0">🧑‍🎓</span>
              <span className="font-display font-extrabold text-slate-900 text-sm sm:text-lg truncate">
                {participant.name}
              </span>
              <span className="text-[11px] sm:text-xs bg-amber-100 text-amber-900 px-1.5 sm:px-2 py-0.5 rounded-md font-bold shrink-0">
                Kls {participant.grade} SD
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-500 font-semibold truncate mt-0.5">
              {exam.title} • {exam.subject}
            </p>
          </div>

          {/* Right: Fullscreen Toggle & Timer Box */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* FULLSCREEN LOCK / TOGGLE BUTTON */}
            <button
              id="toggle-fullscreen-btn"
              type="button"
              onClick={handleToggleFullscreen}
              title={
                isFullscreen
                  ? 'Layar Terkunci Penuh (Bebas Gangguan). Klik untuk keluar.'
                  : 'Kunci Layar Penuh (Fullscreen) untuk meminimalkan gangguan dari aplikasi lain'
              }
              className={`flex items-center space-x-1 sm:space-x-1.5 text-xs font-bold px-2.5 sm:px-3 py-1.5 rounded-xl border transition-all cursor-pointer select-none shadow-2xs ${
                isFullscreen
                  ? 'bg-emerald-50 hover:bg-emerald-100 border-emerald-300 text-emerald-900'
                  : 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 text-white border-amber-400 animate-pulse'
              }`}
            >
              {isFullscreen ? (
                <>
                  <Lock className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                  <span className="hidden md:inline">Layar Terkunci</span>
                  <span className="text-[10px] bg-emerald-200/80 text-emerald-950 font-black px-1.5 py-0.5 rounded-md hidden lg:inline">
                    Penuh
                  </span>
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5 text-white shrink-0" />
                  <span className="hidden sm:inline">Kunci Layar 🔒</span>
                  <span className="sm:hidden text-[11px]">Kunci Layar</span>
                </>
              )}
            </button>

            {/* TIMER BOX */}
            <ExamHeaderBadgeTimer endAt={participant.endAt} />
          </div>
        </div>

        {/* Bottom Row: Micro status indicators (Anti-cheat, Real-time Connectivity Monitor & Periodic Autosave) */}
        <div className="flex flex-wrap items-center justify-between gap-2 mt-2 pt-2 border-t border-slate-100 text-[11px] sm:text-xs">
          <div className="flex items-center space-x-2">
            {/* Security status */}
            <div className="flex items-center space-x-1 text-red-700 font-bold bg-red-50/80 px-2 py-0.5 rounded-lg border border-red-200/60 truncate">
              <ShieldAlert className="w-3 h-3 text-red-600 shrink-0 animate-pulse" />
              <span className="hidden sm:inline">Anti-Curang Aktif: Jangan Berpindah Tab!</span>
              <span className="sm:hidden">Anti-Curang</span>
            </div>

            {/* Screen Lock Status Indicator */}
            <div
              id="screen-lock-status-badge"
              className={`flex items-center space-x-1 font-bold px-2 py-0.5 rounded-lg border text-[11px] truncate select-none ${
                isFullscreen
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-amber-100 text-amber-950 border-amber-300'
              }`}
              title={
                isFullscreen
                  ? 'Layar terkunci dalam mode penuh, bebas gangguan notifikasi & aplikasi lain'
                  : 'Layar belum terkunci penuh'
              }
            >
              {isFullscreen ? (
                <>
                  <Lock className="w-3 h-3 text-emerald-700 shrink-0" />
                  <span className="hidden sm:inline">Layar Terkunci (Bebas Gangguan)</span>
                  <span className="sm:hidden">Layar Terkunci</span>
                </>
              ) : (
                <>
                  <Unlock className="w-3 h-3 text-amber-700 shrink-0" />
                  <span className="hidden sm:inline">Layar Belum Terkunci</span>
                  <span className="sm:hidden">Layar Terbuka</span>
                </>
              )}
            </div>

            {/* Real-time Connectivity Status Monitor */}
            <div
              id="connectivity-status-badge"
              className={`flex items-center space-x-1.5 font-bold px-2 sm:px-2.5 py-0.5 rounded-lg border transition-colors select-none shrink-0 ${
                isOnline
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-amber-100 text-amber-950 border-amber-300 animate-pulse'
              }`}
              title={
                isOnline
                  ? 'Koneksi internet stabil dan terhubung real-time'
                  : 'Koneksi internet terputus! Mohon JANGAN tutup browser.'
              }
            >
              {isOnline ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                  <Wifi className="w-3 h-3 text-emerald-600 shrink-0" />
                  <span className="hidden sm:inline">Online</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-amber-600 shrink-0 animate-ping"></span>
                  <WifiOff className="w-3 h-3 text-amber-700 shrink-0" />
                  <span className="font-extrabold text-amber-950">Offline (Jangan Tutup Tab)</span>
                </>
              )}
            </div>
          </div>

          {/* Periodic Autosave & LocalStorage Status indicator */}
          <div
            id="autosave-status-badge"
            onClick={unsyncedDraftCount > 0 ? handleSyncPendingDrafts : handleManualBackup}
            title={
              unsyncedDraftCount > 0
                ? `${unsyncedDraftCount} draf jawaban tersimpan di memori perangkat. Klik untuk sinkronisasi ke server.`
                : 'Jawaban tersimpan otomatis ke memori perangkat (localStorage) dan cloud. Bebas cemas internet terputus.'
            }
            className={`flex items-center space-x-1.5 font-bold px-2 sm:px-2.5 py-0.5 rounded-lg border transition-colors cursor-pointer select-none shrink-0 ${
              unsyncedDraftCount > 0
                ? 'bg-amber-50 hover:bg-amber-100 border-amber-300 text-amber-900'
                : 'bg-emerald-50 hover:bg-emerald-100 border-emerald-300 text-emerald-900'
            }`}
          >
            {unsyncedDraftCount > 0 ? (
              <>
                {isSyncingDrafts ? (
                  <RefreshCw className="w-3 h-3 text-amber-700 animate-spin shrink-0" />
                ) : (
                  <CloudOff className="w-3 h-3 text-amber-700 shrink-0" />
                )}
                <span className="hidden sm:inline">
                  {isSyncingDrafts
                    ? 'Menyinkronkan Draf...'
                    : `${unsyncedDraftCount} Draf Offline (Klik Sinkron)`}
                </span>
                <span className="sm:hidden">
                  {isSyncingDrafts ? 'Sinkron...' : `${unsyncedDraftCount} Draf Offline`}
                </span>
              </>
            ) : (
              <>
                <Database className={`w-3 h-3 text-emerald-600 shrink-0 ${isPeriodicSaving ? 'animate-bounce' : ''}`} />
                <span className="hidden sm:inline">
                  {isPeriodicSaving ? 'Menyimpan ke localStorage...' : `Draf Tersimpan Otomatis (${lastSavedTime || 'Baru saja'})`}
                </span>
                <span className="sm:hidden">
                  {isPeriodicSaving ? 'Menyimpan...' : `Draf Aman (${lastSavedTime || 'Baru saja'})`}
                </span>
              </>
            )}
          </div>
        </div>

        {/* VISUAL REAL-TIME DURATION REMAINING PROGRESS BAR */}
        <ExamLiveTimer
          endAt={participant.endAt}
          startedAt={participant.startedAt}
          durationMinutes={exam.durationMinutes}
          onTimeUp={handleAutoSubmit}
          onTimeWarning={(msg) => setTimeWarning(msg)}
        />
      </div>

      {/* Fullscreen Toast Notification */}
      {fullscreenToast && (
        <div
          id="fullscreen-toast"
          role="status"
          className="bg-slate-900/95 text-white border border-slate-700 rounded-2xl p-3 shadow-xl flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 text-xs sm:text-sm font-bold"
        >
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{fullscreenToast}</span>
          </div>
          <button
            type="button"
            onClick={() => setFullscreenToast(null)}
            className="text-slate-400 hover:text-white p-1 rounded-md cursor-pointer"
            title="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Fullscreen Mode Guidance Banner if not currently fullscreen and bypass was chosen */}
      {!isFullscreen && bypassFullscreenLock && !dismissFullscreenBanner && (
        <div
          id="fullscreen-mode-banner"
          className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white rounded-xl sm:rounded-2xl p-2.5 sm:p-4 flex items-center justify-between gap-2.5 shadow-md border border-amber-400 animate-in fade-in"
        >
          <div className="flex items-center space-x-2.5 text-xs min-w-0">
            <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
              <Lock className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="min-w-0">
              <p className="font-display font-black text-white text-xs sm:text-sm truncate">
                🔒 Layar Ujian Belum Terkunci Penuh
              </p>
              <p className="text-amber-100 font-medium text-[11px] truncate hidden sm:block">
                Kunci ke mode layar penuh untuk menyembunyikan bilah browser dan meminimalkan gangguan dari aplikasi lain.
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-1.5 shrink-0">
            <button
              type="button"
              onClick={handleLockFullscreen}
              className="bg-white text-amber-950 hover:bg-amber-50 font-display font-black text-[11px] sm:text-xs px-3 py-1.5 rounded-lg shadow-xs transition-all flex items-center space-x-1 cursor-pointer"
            >
              <Lock className="w-3 h-3 text-amber-800" />
              <span>Kunci Layar</span>
            </button>
            <button
              type="button"
              onClick={() => setDismissFullscreenBanner(true)}
              className="text-white/80 hover:text-white p-1 rounded-md cursor-pointer"
              title="Tutup pemberitahuan"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Real-time Connectivity Warning Indicator (Offline Monitor) */}
      {!isOnline && (
        <div
          id="connectivity-offline-warning-banner"
          role="alert"
          aria-live="assertive"
          className="bg-amber-500 border-2 border-amber-300 text-white rounded-2xl p-3 sm:p-4 shadow-md flex items-start sm:items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2"
        >
          <div className="flex items-start sm:items-center space-x-3 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-amber-600/70 border border-amber-300/60 flex items-center justify-center shrink-0">
              <WifiOff className="w-4 h-4 sm:w-5 sm:h-5 text-white animate-pulse" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-display font-black text-xs sm:text-sm tracking-wide bg-amber-900/40 text-amber-100 px-2 py-0.5 rounded-md uppercase">
                  ⚠️ Koneksi Terputus
                </span>
                <span className="text-[11px] font-bold text-amber-100">
                  Mode Offline Aktif
                </span>
                {unsyncedDraftCount > 0 && (
                  <span className="text-[11px] font-black bg-white/20 text-white px-2 py-0.5 rounded-md">
                    {unsyncedDraftCount} Draf Tersimpan di Memori
                  </span>
                )}
              </div>
              <p className="font-extrabold text-xs sm:text-sm text-white mt-1 leading-snug">
                PENTING: Jangan tutup browser atau tab ini!
              </p>
              <p className="text-[11px] sm:text-xs text-amber-50 font-medium leading-relaxed mt-0.5">
                Setiap pilihan jawabanmu <strong>otomatis tersimpan ke draf lokal (localStorage)</strong> perangkat ini. Kamu tetap bisa lanjut mengerjakan soal sampai selesai. Sistem akan otomatis menyinkronkan seluruh draf saat internet kembali normal.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0 self-center">
            <button
              id="recheck-connectivity-btn"
              type="button"
              onClick={handleCheckConnectivity}
              disabled={isCheckingConnection}
              title="Klik untuk menguji apakah koneksi internet sudah tersambung kembali"
              className="bg-white hover:bg-amber-50 text-amber-950 font-display font-bold text-xs px-3 py-2 rounded-xl shadow-xs transition-colors flex items-center space-x-1.5 cursor-pointer disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-amber-700 ${isCheckingConnection ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{isCheckingConnection ? 'Memeriksa...' : 'Cek Koneksi'}</span>
              <span className="sm:hidden">Cek</span>
            </button>
          </div>
        </div>
      )}

      {/* Draft Synchronized Notification Toast */}
      {draftSyncNotice && (
        <div
          id="draft-sync-notice-toast"
          role="status"
          className="bg-sky-600 border border-sky-400 text-white rounded-2xl p-3 shadow-md flex items-center justify-between gap-2 animate-in fade-in slide-in-from-top-2 text-xs sm:text-sm font-bold"
        >
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-sky-200 shrink-0" />
            <span>{draftSyncNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setDraftSyncNotice(null)}
            className="text-sky-100 hover:text-white p-1 rounded-md cursor-pointer"
            title="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Connectivity Reconnected Toast/Banner */}
      {showReconnectedToast && (
        <div
          id="connectivity-reconnected-banner"
          role="status"
          className="bg-emerald-600 border border-emerald-400 text-white rounded-2xl p-3 shadow-md flex items-center justify-between gap-2 animate-in fade-in slide-in-from-top-2 text-xs sm:text-sm font-bold"
        >
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-200 shrink-0" />
            <span>Koneksi internet terhubung kembali! Semua jawaban kamu disinkronkan ke server.</span>
          </div>
          <button
            type="button"
            onClick={() => setShowReconnectedToast(false)}
            className="text-emerald-100 hover:text-white p-1 rounded-md cursor-pointer"
            title="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Quick Question Number Carousel on Mobile & Tablet */}
      <div className="lg:hidden bg-white rounded-2xl border-2 border-amber-200/90 p-2 shadow-xs">
        <div className="flex items-center justify-between px-1 pb-1.5 text-xs">
          <span className="font-display font-black text-slate-800 flex items-center space-x-1.5">
            <LayoutGrid className="w-3.5 h-3.5 text-amber-600" />
            <span>Pilih Nomor Soal:</span>
          </span>
          <button
            type="button"
            onClick={() => setShowMobilePalette(true)}
            className="text-[11px] font-bold text-amber-800 hover:text-amber-950 bg-amber-50 hover:bg-amber-100 px-2 py-0.5 rounded-md border border-amber-300 transition-colors cursor-pointer flex items-center space-x-1"
          >
            <span>Semua Soal ({answeredCount}/{questions.length})</span>
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>
        <div
          ref={carouselRef}
          className="flex items-center space-x-1.5 overflow-x-auto scrollbar-none py-0.5 px-0.5 scroll-smooth"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {questions.map((q, idx) => {
            const ansState = answers[q.questionId];
            return (
              <QuestionChip
                key={q.questionId}
                index={idx}
                isAnswered={Boolean(ansState?.answer && ansState.answer !== '')}
                isMarked={Boolean(ansState?.marked)}
                isActive={idx === currentIndex}
                onClick={() => handleNavigateQuestion(idx)}
                variant="carousel"
              />
            );
          })}
        </div>
      </div>

      {/* Recovery Notice after browser crash recovery */}
      {recoveryNotice?.show && (
        <div
          id="crash-recovery-notice"
          className="bg-emerald-50 border-2 border-emerald-400 text-emerald-950 rounded-2xl p-4 flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-top-2"
        >
          <div className="flex items-center space-x-3 text-xs sm:text-sm">
            <div className="w-8 h-8 rounded-xl bg-emerald-200/80 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <p className="font-display font-black text-emerald-900">
                ✨ Pemulihan Progres Crash Berhasil!
              </p>
              <p className="font-semibold text-emerald-800 text-xs mt-0.5">
                Sebanyak <strong>{recoveryNotice.count} jawaban</strong> berhasil dipulihkan dari penyimpanan lokal perangkatmu
                {recoveryNotice.savedAt ? ` (tercatat pukul ${recoveryNotice.savedAt})` : ''}. Kamu dapat langsung melanjutkan ujian tanpa kehilangan progres.
              </p>
            </div>
          </div>
          <button
            onClick={() => setRecoveryNotice(null)}
            className="text-emerald-700 hover:text-emerald-950 p-1.5 rounded-lg hover:bg-emerald-100 font-bold text-xs shrink-0 cursor-pointer transition-colors"
            title="Tutup pemberitahuan"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Manual save confirmation toast */}
      {showManualSavedToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-700 text-white font-bold px-4 py-3 rounded-2xl shadow-xl flex items-center space-x-2.5 text-xs sm:text-sm animate-in fade-in slide-in-from-bottom-2 border border-emerald-500">
          <CheckCircle2 className="w-5 h-5 text-emerald-200 shrink-0" />
          <span>Semua jawaban dan progres berhasil dicadangkan ke memori perangkat (localStorage)!</span>
        </div>
      )}

      {/* Small Saving... Status Indicator - briefly flashes in the corner when student selects an answer */}
      {answerSavingStatus && (
        <div
          id="answer-saving-status-indicator"
          role="status"
          aria-live="polite"
          className="fixed bottom-20 sm:bottom-6 right-3.5 sm:right-6 z-50 pointer-events-none transition-all duration-200 animate-in fade-in slide-in-from-bottom-2"
        >
          <div
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-bold shadow-lg border backdrop-blur-md transition-all ${
              answerSavingStatus === 'saving'
                ? 'bg-slate-900/90 text-amber-300 border-amber-400/50 shadow-slate-900/30'
                : 'bg-emerald-700/95 text-white border-emerald-500/80 shadow-emerald-900/25'
            }`}
          >
            {answerSavingStatus === 'saving' ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400 shrink-0" />
                <span className="font-semibold tracking-wide text-white">Menyimpan draf...</span>
              </>
            ) : (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-200 shrink-0 stroke-[3]" />
                <span className="font-semibold tracking-wide text-white">
                  {isOnline ? 'Draf Tersimpan ✓' : 'Draf Aman di Perangkat ✓'}
                </span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Time Warning Notification Toast */}
      {timeWarning && (
        <div className="bg-amber-500 text-white px-4 py-2.5 rounded-2xl flex items-center justify-between text-xs sm:text-sm font-bold shadow-md animate-bounce">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-white" />
            <span>{timeWarning}</span>
          </div>
          <button
            onClick={() => setTimeWarning(null)}
            className="text-white hover:text-amber-200 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Strict Anti-cheating Security Termination Modal (Tab Switch or Tab Close) */}
      {securityTermination?.triggered && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full border-4 border-red-500 shadow-2xl text-center space-y-5">
            <div className="w-20 h-20 bg-red-100 border-4 border-red-300 rounded-full flex items-center justify-center mx-auto text-4xl animate-pulse">
              🚨
            </div>
            <div className="space-y-2">
              <span className="inline-block px-3 py-1 rounded-full text-xs font-black uppercase bg-red-100 text-red-800 border border-red-300">
                {securityTermination.reason === 'TAB_SWITCH'
                  ? '⚠️ Terdeteksi Berpindah Tab / Jendela'
                  : '⚠️ Terdeteksi Menutup Jendela Ujian'}
              </span>
              <h3 className="font-display text-2xl font-black text-slate-900">
                Ujian Dihentikan Otomatis!
              </h3>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-left space-y-2 text-xs sm:text-sm text-red-900 font-semibold leading-relaxed">
              <p>
                Sesuai peraturan ketat CBT CERIA, kamu <strong>dilarang keras menutup tab atau berpindah ke tab lain</strong> selama ujian berlangsung.
              </p>
              <p>
                Sistem keamanan telah <strong>menyelesaikan ujian kamu secara otomatis</strong>. Semua jawaban yang telah kamu pilih sudah disimpan dengan aman dan dikirimkan ke guru.
              </p>
            </div>

            {securityTermination.result ? (
              <div className="space-y-3 pt-2">
                <button
                  id="view-terminated-result-btn"
                  type="button"
                  onClick={() => onFinishExam(securityTermination.result!)}
                  className="w-full py-3.5 px-6 bg-red-600 hover:bg-red-700 text-white font-display font-extrabold rounded-2xl shadow-lg hover:shadow-xl transition-all text-sm sm:text-base flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <span>Lihat Hasil Ujian Sekarang</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <p className="text-xs text-slate-500 font-medium">
                  Otomatis membuka halaman hasil dalam {autoRedirectCountdown} detik...
                </p>
              </div>
            ) : (
              <div className="flex items-center justify-center space-x-2 py-4 text-slate-600 text-sm font-bold">
                <RefreshCw className="w-5 h-5 animate-spin text-red-600" />
                <span>Menyimpan dan mengunci ujian kamu...</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* VISUAL EXAM PROGRESS BAR */}
      <ExamProgressBar
        total={questions.length}
        answered={answeredCount}
        marked={markedCount}
        currentIndex={currentIndex}
      />

      {/* 2. MAIN QUESTION & NAVIGATOR SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* QUESTION PANEL (Memoized QuestionCard to eliminate re-render lag) */}
        {currentQuestion ? (
          <QuestionCard
            question={currentQuestion}
            currentIndex={currentIndex}
            totalQuestions={questions.length}
            currentAnswer={currentAnswer}
            currentMarked={currentMarked}
            fontSize={fontSize}
            onChangeFontSize={setFontSize}
            onSelectOption={handleSelectOption}
            onToggleMark={handleToggleMark}
            onJumpToNextMarked={handleJumpToNextMarkedQuestion}
            markedCount={markedCount}
            onPreviewImage={(url) => setPreviewImageModal(url)}
            lastSavedTime={lastSavedTime}
            unsyncedDraftCount={unsyncedDraftCount}
            onSyncDrafts={handleSyncPendingDrafts}
            isSyncingDrafts={isSyncingDrafts}
            onNavigatePrev={() => handleNavigateQuestion(Math.max(0, currentIndex - 1))}
            onNavigateNext={() => handleNavigateQuestion(Math.min(questions.length - 1, currentIndex + 1))}
            onOpenMobilePalette={() => setShowMobilePalette(true)}
            onOpenSubmitModal={() => setShowSubmitModal(true)}
            isSubmitting={isSubmitting}
          />
        ) : (
          <div className="lg:col-span-3 bg-white rounded-2xl sm:rounded-3xl border-2 border-amber-200 p-12 text-center text-slate-400 font-semibold">
            Tidak ada soal yang tersedia.
          </div>
        )}

        {/* QUESTION NUMBER GRID & STATS (Desktop Sidebar ONLY: hidden lg:block) */}
        <div className="hidden lg:block bg-white rounded-3xl border-2 border-amber-200 p-5 shadow-sm space-y-4">
          <div className="space-y-2 border-b border-amber-100 pb-3">
            <div className="flex items-center justify-between">
              <h4 className="font-display font-extrabold text-sm text-slate-900">
                Daftar Soal
              </h4>
              <span className="text-xs font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md">
                {answeredCount}/{questions.length} Dijawab
              </span>
            </div>
            {/* Sidebar mini progress bar */}
            <div
              id="sidebar-mini-progress-track"
              className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200/80"
              title={`${answeredCount} dari ${questions.length} terjawab (${Math.round((answeredCount / Math.max(1, questions.length)) * 100)}%)`}
            >
              <div
                id="sidebar-mini-progress-fill"
                className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                style={{
                  width: `${Math.round((answeredCount / Math.max(1, questions.length)) * 100)}%`,
                }}
              />
            </div>
          </div>

          {/* Grid of Number Badges */}
          <div className="grid grid-cols-5 gap-2 max-h-64 overflow-y-auto p-1">
            {questions.map((q, idx) => {
              const ansState = answers[q.questionId];
              return (
                <QuestionChip
                  key={q.questionId}
                  index={idx}
                  isAnswered={Boolean(ansState?.answer && ansState.answer !== '')}
                  isMarked={Boolean(ansState?.marked)}
                  isActive={idx === currentIndex}
                  onClick={() => handleNavigateQuestion(idx)}
                  variant="grid"
                />
              );
            })}
          </div>

          {/* Legend / Petunjuk Warna */}
          <div className="pt-2 border-t border-slate-100 text-[11px] font-bold text-slate-600 space-y-1.5">
            <div className="flex items-center space-x-2">
              <span className="w-3 h-3 rounded-md bg-blue-500 ring-1 ring-blue-300"></span>
              <span>Soal Aktif</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-3 h-3 rounded-md bg-emerald-500"></span>
              <span>Sudah Dijawab</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-3 h-3 rounded-md bg-yellow-400"></span>
              <span>Ditandai untuk Ditinjau (Review)</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-3 h-3 rounded-md bg-slate-200"></span>
              <span>Belum Dijawab</span>
            </div>
          </div>

          {/* Jump to Next Review Question in Sidebar if marked */}
          {markedCount > 0 && (
            <button
              id="sidebar-review-marked-btn"
              type="button"
              onClick={handleJumpToNextMarkedQuestion}
              className="w-full bg-amber-50 hover:bg-amber-100 text-amber-950 border border-amber-300 font-display font-bold text-xs py-2.5 px-3 rounded-xl transition-colors flex items-center justify-center space-x-1.5 cursor-pointer shadow-2xs"
            >
              <Flag className="w-3.5 h-3.5 fill-amber-500 text-amber-700" />
              <span>Tinjau Soal Ditandai ({markedCount})</span>
            </button>
          )}

          {/* Kirim Jawaban Button at Sidebar Bottom */}
          <div className="pt-3 border-t border-slate-100">
            <button
              id="sidebar-finish-btn"
              type="button"
              onClick={() => setShowSubmitModal(true)}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-display font-extrabold text-xs py-3 px-4 rounded-xl shadow-sm transition-colors flex items-center justify-center space-x-1.5 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Selesai & Kirim Ujian</span>
            </button>
          </div>
        </div>
      </div>

      {/* MOBILE STICKY BOTTOM DOCK (Always visible without scrolling on mobile) */}
      <div
        id="mobile-sticky-dock"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t-2 border-amber-200 px-3 py-2 shadow-2xl flex items-center justify-between gap-2 transition-transform duration-200"
      >
        <button
          type="button"
          disabled={currentIndex === 0}
          onClick={() => handleNavigateQuestion(Math.max(0, currentIndex - 1))}
          className="flex items-center justify-center space-x-1 px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-700 text-xs font-bold disabled:opacity-40 disabled:pointer-events-none active:scale-95 cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden xs:inline">Sebelumnya</span>
        </button>

        <button
          id="mobile-mark-for-review-btn"
          type="button"
          onClick={handleToggleMark}
          className={`flex items-center space-x-1 px-2.5 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
            currentMarked
              ? 'bg-amber-400 text-amber-950 border-amber-500 shadow-2xs ring-1 ring-amber-400'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-amber-50'
          }`}
          title="Tandai untuk Ditinjau (Mark for Review)"
        >
          <Flag className={`w-3.5 h-3.5 ${currentMarked ? 'fill-amber-950 text-amber-950' : 'text-amber-600'}`} />
          <span>{currentMarked ? 'Review ✓' : 'Review'}</span>
        </button>

        <button
          id="mobile-palette-toggle-btn"
          type="button"
          onClick={() => setShowMobilePalette(true)}
          className="flex-1 flex items-center justify-center space-x-1.5 px-2 py-2 rounded-xl bg-amber-100/90 border border-amber-300 text-amber-950 font-display font-extrabold text-xs shadow-2xs active:scale-95 cursor-pointer"
        >
          <LayoutGrid className="w-3.5 h-3.5 text-amber-700" />
          <span>Soal {currentIndex + 1}/{questions.length}</span>
        </button>

        {currentIndex < questions.length - 1 ? (
          <button
            type="button"
            onClick={() => handleNavigateQuestion(Math.min(questions.length - 1, currentIndex + 1))}
            className="flex items-center justify-center space-x-1 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-display font-extrabold text-xs shadow-xs active:scale-95 cursor-pointer"
          >
            <span className="hidden xs:inline">Berikutnya</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setShowSubmitModal(true)}
            className="flex items-center justify-center space-x-1 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-display font-black text-xs shadow-xs active:scale-95 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Kirim</span>
          </button>
        )}
      </div>

      {/* MOBILE QUESTION PALETTE DRAWER (Bottom Sheet Modal) */}
      {showMobilePalette && (
        <div
          id="mobile-palette-modal"
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex flex-col justify-end lg:hidden animate-in fade-in"
          onClick={() => setShowMobilePalette(false)}
        >
          <div
            className="bg-white rounded-t-3xl border-t-2 border-amber-300 p-4 sm:p-5 max-h-[82vh] flex flex-col space-y-3 shadow-2xl animate-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-amber-100 pb-2.5">
              <div>
                <h4 className="font-display font-black text-base text-slate-900 flex items-center space-x-1.5">
                  <LayoutGrid className="w-4 h-4 text-amber-600" />
                  <span>Daftar Nomor Soal</span>
                </h4>
                <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
                  Ketuk nomor soal untuk langsung menuju ke soal tersebut
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowMobilePalette(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Progress Stats Summary */}
            <div className="flex items-center justify-between text-xs font-bold bg-amber-50/80 p-2.5 rounded-xl border border-amber-200">
              <span className="text-emerald-700 flex items-center space-x-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                <span>{answeredCount} Terjawab</span>
              </span>
              <span className="text-yellow-800 flex items-center space-x-1">
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-400"></span>
                <span>{markedCount} Review</span>
              </span>
              <span className="text-slate-600 flex items-center space-x-1">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-300"></span>
                <span>{unansweredCount} Belum</span>
              </span>
            </div>

            {/* Quick jump to marked questions on mobile */}
            {markedCount > 0 && (
              <button
                type="button"
                onClick={() => {
                  setShowMobilePalette(false);
                  handleJumpToNextMarkedQuestion();
                }}
                className="w-full bg-amber-100 hover:bg-amber-200 text-amber-950 border border-amber-300 font-display font-bold text-xs py-2 px-3 rounded-xl transition-colors flex items-center justify-center space-x-1.5 cursor-pointer shadow-2xs"
              >
                <Flag className="w-3.5 h-3.5 fill-amber-600 text-amber-700" />
                <span>Lompat ke Soal Ditinjau ({markedCount})</span>
              </button>
            )}

            {/* Number Grid */}
            <div className="grid grid-cols-5 xs:grid-cols-6 sm:grid-cols-8 gap-2 overflow-y-auto max-h-[48vh] p-1">
              {questions.map((q, idx) => {
                const ansState = answers[q.questionId];
                return (
                  <QuestionChip
                    key={q.questionId}
                    index={idx}
                    isAnswered={Boolean(ansState?.answer && ansState.answer !== '')}
                    isMarked={Boolean(ansState?.marked)}
                    isActive={idx === currentIndex}
                    onClick={() => {
                      handleNavigateQuestion(idx);
                      setShowMobilePalette(false);
                    }}
                    variant="drawer"
                  />
                );
              })}
            </div>

            {/* Actions */}
            <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowMobilePalette(false);
                  setShowSubmitModal(true);
                }}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-display font-black text-xs sm:text-sm py-3 px-4 rounded-xl shadow-sm transition-colors flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>Selesai & Kirim Ujian</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* IMAGE PREVIEW LIGHTBOX MODAL */}
      {previewImageModal && (
        <div
          id="image-preview-modal"
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setPreviewImageModal(null)}
        >
          <div
            className="relative max-w-2xl max-h-[85vh] w-full bg-white rounded-2xl p-3 sm:p-4 shadow-2xl flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="font-display font-bold text-xs sm:text-sm text-slate-800">
                🔍 Gambar Soal #{currentIndex + 1}
              </span>
              <button
                type="button"
                onClick={() => setPreviewImageModal(null)}
                className="p-1 rounded-lg text-slate-500 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-2 overflow-auto max-h-[75vh] w-full flex items-center justify-center">
              <QuestionImage
                src={previewImageModal}
                alt="Gambar Soal Diperbesar"
                allowZoom={false}
                className="w-full border-0 bg-transparent p-0 shadow-none"
                imgClassName="max-h-[70vh]"
              />
            </div>
          </div>
        </div>
      )}

      {/* 3. CONFIRMATION MODAL BEFORE FINAL SUBMISSION */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 border-2 border-amber-200 shadow-2xl space-y-5">
            <div className="text-center">
              <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto text-3xl mb-3 shadow-inner">
                📝
              </div>
              <h3 className="font-display text-2xl font-black text-slate-900">
                Kirim Jawaban Ujian?
              </h3>
              <p className="text-xs text-slate-500 font-semibold mt-1">
                Apakah kamu yakin ingin mengirim jawaban sekarang?
              </p>
            </div>

            {/* Answered statistics */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 text-xs sm:text-sm font-bold text-slate-700 space-y-2">
              <div className="flex justify-between">
                <span>Jumlah Soal:</span>
                <span className="text-slate-900 font-extrabold">{questions.length}</span>
              </div>
              <div className="flex justify-between text-emerald-700">
                <span>Sudah Dijawab:</span>
                <span className="font-extrabold">{answeredCount}</span>
              </div>
              {markedCount > 0 && (
                <div className="flex justify-between text-amber-700">
                  <span>Ditandai untuk Ditinjau:</span>
                  <span className="font-extrabold">{markedCount}</span>
                </div>
              )}
              <div className="flex justify-between text-red-600">
                <span>Belum Dijawab:</span>
                <span className="font-extrabold">{unansweredCount}</span>
              </div>
            </div>

            {markedCount > 0 && (
              <div className="bg-amber-50 rounded-2xl p-3.5 border border-amber-200 text-center space-y-2">
                <p className="text-xs font-bold text-amber-900">
                  🚩 Ada <strong>{markedCount} soal</strong> yang kamu tandai untuk ditinjau (Mark for Review).
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setShowSubmitModal(false);
                    handleJumpToNextMarkedQuestion();
                  }}
                  className="w-full py-2.5 px-3 bg-amber-400 hover:bg-amber-500 text-amber-950 font-display font-extrabold rounded-xl text-xs shadow-xs transition-colors flex items-center justify-center space-x-1.5 cursor-pointer"
                >
                  <Flag className="w-3.5 h-3.5 fill-amber-950" />
                  <span>Tinjau Soal Ditandai Dulu</span>
                </button>
              </div>
            )}

            {unsyncedDraftCount > 0 && isOnline && (
              <div className="bg-sky-50 rounded-2xl p-3 border border-sky-200 text-sky-900 text-xs font-semibold flex items-center space-x-2">
                <HardDrive className="w-4 h-4 text-sky-600 shrink-0" />
                <span>
                  Ada <strong>{unsyncedDraftCount} draf lokal</strong> yang akan otomatis disinkronkan ke server saat kamu menekan tombol Kirim.
                </span>
              </div>
            )}

            {!isOnline && (
              <div
                id="modal-offline-alert"
                className="bg-amber-50 rounded-2xl p-3.5 border-2 border-amber-300 text-amber-950 space-y-2"
              >
                <div className="flex items-center space-x-2 font-display font-extrabold text-xs sm:text-sm text-amber-900">
                  <WifiOff className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>Koneksi Internet Sedang Terputus</span>
                </div>
                <p className="text-xs text-amber-900 font-semibold leading-relaxed">
                  Semua jawabanmu aman tersimpan di perangkat. <strong>Mohon JANGAN TUTUP BROWSER!</strong> Sambungkan internet kembali lalu coba periksa koneksi sebelum mengirim.
                </p>
                <button
                  type="button"
                  onClick={handleCheckConnectivity}
                  disabled={isCheckingConnection}
                  className="w-full py-2 px-3 bg-amber-400 hover:bg-amber-500 text-amber-950 font-display font-black rounded-xl text-xs shadow-xs transition-colors flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-60"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-amber-900 ${isCheckingConnection ? 'animate-spin' : ''}`} />
                  <span>{isCheckingConnection ? 'Memeriksa Koneksi...' : 'Cek Koneksi Ulang'}</span>
                </button>
              </div>
            )}

            {submitErrorNotice && (
              <div
                id="submit-error-banner"
                className="bg-rose-50 border-2 border-rose-300 text-rose-950 p-3.5 rounded-2xl text-xs font-semibold space-y-1 animate-in fade-in"
              >
                <div className="flex items-center space-x-2 text-rose-700 font-bold">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>Pengiriman Belum Berhasil</span>
                </div>
                <p className="text-[11px] text-rose-900 leading-relaxed">
                  {submitErrorNotice}
                </p>
                <p className="text-[10px] text-rose-700">
                  Semua jawaban Anda tetap aman tersimpan di perangkat. Silakan coba tekan tombol "Kirim Sekarang" kembali.
                </p>
              </div>
            )}

            {unansweredCount > 0 && (
              <p className="text-xs font-bold text-orange-700 bg-orange-50 p-2.5 rounded-xl border border-orange-200 text-center">
                Masih ada {unansweredCount} soal yang belum kamu jawab.
              </p>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                id="cancel-submit-modal-btn"
                type="button"
                disabled={isSubmitting}
                onClick={() => setShowSubmitModal(false)}
                className="w-full sm:w-1/2 py-3 px-4 border-2 border-slate-200 text-slate-700 font-bold rounded-2xl hover:bg-slate-50 transition-colors text-xs sm:text-sm"
              >
                ← Periksa Lagi
              </button>
              <button
                id="confirm-submit-modal-btn"
                type="button"
                disabled={isSubmitting}
                onClick={handleManualSubmit}
                className="w-full sm:w-1/2 bg-emerald-600 hover:bg-emerald-700 text-white font-display font-extrabold py-3 px-4 rounded-2xl shadow-md transition-colors text-xs sm:text-sm flex items-center justify-center space-x-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isSubmitting ? 'Mengirim...' : '✓ Kirim Sekarang'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Automatic Fullscreen Screen Lock Modal Overlay */}
      {!isFullscreen && !bypassFullscreenLock && !isSubmittedRef.current && !securityTermination && (
        <div
          id="exam-fullscreen-lock-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="lock-modal-title"
          className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div className="bg-white rounded-3xl border-2 border-indigo-200 shadow-2xl max-w-lg w-full p-6 sm:p-8 space-y-5 text-center">
            {/* Lock Badge & Icon */}
            <div className="relative inline-block">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-indigo-600 to-sky-500 flex items-center justify-center text-white shadow-lg mx-auto">
                <Lock className="w-10 h-10 animate-pulse" />
              </div>
              <div className="absolute -bottom-1 -right-1 bg-amber-400 text-amber-950 p-1.5 rounded-full shadow-md">
                <Maximize2 className="w-4 h-4" />
              </div>
            </div>

            <div>
              <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                <span>Penguncian Layar Ujian CBT</span>
              </span>

              <h2
                id="lock-modal-title"
                className="font-display text-2xl sm:text-3xl font-black text-slate-900 mt-2"
              >
                {fullscreenLockExits > 0
                  ? 'Layar Ujian Terlepas dari Mode Penuh!'
                  : 'Kunci Layar Penuh untuk Memulai Ujian'}
              </h2>

              <p className="text-xs sm:text-sm text-slate-600 font-semibold mt-2 leading-relaxed">
                Untuk meminimalkan gangguan dari aplikasi lain (notifikasi, chat, jendela lain) dan menjaga konsentrasi menjawab soal, ujian ini wajib dijalankan dalam <strong>Mode Layar Penuh (Fullscreen)</strong>.
              </p>
            </div>

            {/* Benefits info card */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left space-y-2 text-xs">
              <div className="flex items-start space-x-2 text-slate-700 font-semibold">
                <span className="text-emerald-600 font-bold shrink-0">✓</span>
                <span><strong>Bebas Gangguan:</strong> Menyembunyikan bilah browser, tab lain, dan notifikasi yang mengalihkan perhatian.</span>
              </div>
              <div className="flex items-start space-x-2 text-slate-700 font-semibold">
                <span className="text-emerald-600 font-bold shrink-0">✓</span>
                <span><strong>Tampilan Maksimal:</strong> Font soal dan gambar diagram tampil lebih besar dan jelas di layar.</span>
              </div>
              <div className="flex items-start space-x-2 text-slate-700 font-semibold">
                <span className="text-emerald-600 font-bold shrink-0">✓</span>
                <span><strong>Aman & Terjaga:</strong> Menghindarkan dari ketidaksengajaan berpindah tab atau menutup jendela ujian.</span>
              </div>
            </div>

            {/* CTA Button */}
            <div className="space-y-3 pt-2">
              <button
                id="btn-lock-fullscreen-confirm"
                type="button"
                onClick={handleLockFullscreen}
                className="w-full bg-gradient-to-r from-indigo-600 via-indigo-700 to-sky-600 hover:from-indigo-700 hover:to-sky-700 active:scale-[0.98] text-white font-display font-extrabold text-base sm:text-lg py-4 px-6 rounded-2xl shadow-lg hover:shadow-indigo-500/25 transition-all flex items-center justify-center space-x-2.5 cursor-pointer"
              >
                <Lock className="w-5 h-5 text-indigo-200" />
                <span>KUNCI LAYAR PENUH & LANJUTKAN</span>
              </button>

              <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
                <span>Tips: Anda juga dapat menekan <strong>F11</strong></span>
                <button
                  type="button"
                  onClick={() => setBypassFullscreenLock(true)}
                  className="text-slate-500 hover:text-slate-700 underline font-semibold transition-colors cursor-pointer"
                >
                  Browser membatasi? Lanjut mode jendela
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
