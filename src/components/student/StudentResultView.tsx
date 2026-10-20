import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import {
  Trophy,
  Star,
  CheckCircle,
  XCircle,
  Home,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  Download,
  Share2,
  Image as ImageIcon,
  Loader2,
  Check,
  Eye,
  Sparkles,
  Printer,
  Award,
  Scroll,
} from 'lucide-react';
import { Result, Exam, Question } from '../../types';
import { getQuestions } from '../../services/firebase/examService';
import { convertLatexToStandardMath } from '../../utils/mathFormatter';
import {
  downloadResultCardImage,
  shareOrDownloadResultCard,
  generateResultCardCanvas,
} from '../../utils/generateResultCardImage';
import { DigitalCertificateModal } from './DigitalCertificateModal';

interface StudentResultViewProps {
  result: Result;
  exam: Exam;
  onBackToHome: () => void;
}

export const StudentResultView: React.FC<StudentResultViewProps> = ({
  result,
  exam,
  onBackToHome,
}) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [showReviewAccordion, setShowReviewAccordion] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showCertificateModal, setShowCertificateModal] = useState(false);
  const [autoPrintCertificate, setAutoPrintCertificate] = useState(false);

  const handleOpenCertificate = (autoPrint: boolean = false) => {
    setAutoPrintCertificate(autoPrint);
    setShowCertificateModal(true);
  };

  // Spectacular Celebratory Firework Animation effect
  const triggerFireworksShow = (durationMs: number = 3500) => {
    const animationEnd = Date.now() + durationMs;
    const defaults = { startVelocity: 32, spread: 360, ticks: 60, zIndex: 9999 };

    function randomInRange(min: number, max: number) {
      return Math.random() * (max - min) + min;
    }

    // Initial dual burst left & right
    confetti({
      ...defaults,
      particleCount: 50,
      origin: { x: 0.2, y: 0.65 },
      colors: ['#FFD700', '#FF5722', '#4CAF50', '#2196F3', '#E91E63', '#9C27B0'],
    });
    confetti({
      ...defaults,
      particleCount: 50,
      origin: { x: 0.8, y: 0.65 },
      colors: ['#FFD700', '#FF5722', '#4CAF50', '#2196F3', '#E91E63', '#9C27B0'],
    });

    const interval: ReturnType<typeof setInterval> = setInterval(() => {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        clearInterval(interval);
        return;
      }

      const particleCount = 45 * (timeLeft / durationMs);

      // Fireworks bursting across upper screen
      confetti({
        ...defaults,
        particleCount: Math.floor(particleCount * 0.85),
        origin: { x: randomInRange(0.15, 0.45), y: randomInRange(0.15, 0.45) },
        colors: ['#FFE600', '#FF5E7E', '#48C9B0', '#A569BD', '#F39C12'],
        shapes: ['star', 'circle'],
      });

      confetti({
        ...defaults,
        particleCount: Math.floor(particleCount * 0.85),
        origin: { x: randomInRange(0.55, 0.85), y: randomInRange(0.15, 0.45) },
        colors: ['#58D68D', '#5DADE2', '#F4D03F', '#EC7063', '#AF7AC5'],
        shapes: ['star', 'circle'],
      });

      // Periodic high center burst
      if (Math.random() > 0.35) {
        confetti({
          ...defaults,
          particleCount: Math.floor(particleCount * 0.9),
          origin: { x: randomInRange(0.38, 0.62), y: randomInRange(0.1, 0.32) },
          colors: ['#FFD700', '#FF9F43', '#00D2D3', '#54A0FF', '#E040FB'],
          shapes: ['circle'],
          scalar: 1.25,
        });
      }
    }, 320);

    return () => clearInterval(interval);
  };

  // Trigger celebration firework animation on mount
  useEffect(() => {
    const cleanupFireworks = triggerFireworksShow(3500);

    if (exam.showAnswerReview) {
      getQuestions(exam.examId).then(setQuestions).catch(console.error);
    }

    return () => {
      if (cleanupFireworks) cleanupFireworks();
    };
  }, [exam]);

  const isPassed = result.score >= (exam.kkm || 75);

  const handleDownloadPng = async () => {
    setDownloading(true);
    setDownloadSuccess(false);
    try {
      await downloadResultCardImage(result, exam);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 4000);
    } catch (err) {
      console.error('Download PNG failed:', err);
    } finally {
      setDownloading(false);
    }
  };

  const handleSharePng = async () => {
    setSharing(true);
    try {
      await shareOrDownloadResultCard(result, exam);
    } catch (err) {
      console.error('Share PNG failed:', err);
    } finally {
      setSharing(false);
    }
  };

  const handleOpenPreview = async () => {
    try {
      const canvas = await generateResultCardCanvas(result, exam);
      setPreviewUrl(canvas.toDataURL('image/png'));
      setShowPreviewModal(true);
    } catch (err) {
      console.error('Preview failed:', err);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-4 space-y-6">
      <div className="bg-white rounded-3xl border-2 border-amber-200 shadow-xl p-6 sm:p-8 text-center space-y-6">
        {/* Celebration Badges & Trophy with Firework Rays Aura */}
        <div className="relative inline-block mx-auto pt-2">
          {/* Pulsing Firework Glow Aura */}
          <div className="absolute -inset-4 bg-gradient-to-tr from-amber-300/40 via-yellow-300/50 to-orange-400/40 rounded-full blur-xl animate-pulse pointer-events-none" />

          {/* Rotating Sunburst Firework Rays */}
          <div className="absolute -inset-8 opacity-25 animate-ray-spin pointer-events-none flex items-center justify-center">
            <svg viewBox="0 0 160 160" className="w-36 h-36 sm:w-44 sm:h-44 fill-amber-400">
              <path d="M80 0 L84 70 L95 10 L88 72 L120 25 L92 76 L140 45 L95 80 L155 70 L96 85 L160 98 L94 90 L150 125 L90 94 L130 150 L85 96 L105 160 L80 97 L55 160 L75 96 L30 150 L70 94 L10 125 L66 90 L0 98 L64 85 L5 70 L65 80 L20 45 L68 76 L40 25 L72 72 L65 10 L76 70 Z" />
            </svg>
          </div>

          {/* Floating Firework Sparkle Badges */}
          <span className="absolute -top-3 -left-4 text-2xl animate-firework-sparkle pointer-events-none">
            ✨
          </span>
          <span
            className="absolute -top-4 -right-4 text-2xl animate-firework-sparkle pointer-events-none"
            style={{ animationDelay: '0.6s' }}
          >
            🎆
          </span>
          <span
            className="absolute -bottom-2 -left-4 text-2xl animate-firework-sparkle pointer-events-none"
            style={{ animationDelay: '1.2s' }}
          >
            🌟
          </span>
          <span
            className="absolute -bottom-2 -right-4 text-2xl animate-firework-sparkle pointer-events-none"
            style={{ animationDelay: '0.9s' }}
          >
            🎉
          </span>

          <div className="w-24 h-24 sm:w-28 sm:h-28 bg-gradient-to-tr from-amber-400 to-orange-400 rounded-3xl flex items-center justify-center text-5xl sm:text-6xl shadow-xl animate-soft-bounce relative z-10 border-2 border-amber-200">
            🏆
          </div>
          <div className="absolute -top-2 -right-2 bg-yellow-400 text-yellow-950 p-2 rounded-full shadow-md z-20 animate-pulse">
            <Star className="w-5 h-5 fill-yellow-900 text-yellow-900" />
          </div>
        </div>

        <div>
          <h2 className="font-display text-2xl sm:text-3xl font-black text-slate-900">
            {result.submitReason === 'TAB_SWITCH' || result.submitReason === 'TAB_CLOSED'
              ? '📋 Ujian Telah Dihentikan & Diselesaikan'
              : '🎉 Ujian Berhasil Diselesaikan!'}
          </h2>
          <p className="text-sm font-semibold text-slate-500 mt-1">
            {result.submitReason === 'TAB_SWITCH' || result.submitReason === 'TAB_CLOSED'
              ? 'Jawaban yang sudah kamu isi telah tersimpan dan terkirim ke server guru.'
              : 'Terima kasih telah mengerjakan ujian dengan jujur dan sungguh-sungguh.'}
          </p>

          {/* Interactive Firework Trigger Button */}
          <div className="flex items-center justify-center pt-3">
            <button
              id="trigger-fireworks-btn"
              type="button"
              onClick={() => triggerFireworksShow(3200)}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-amber-100 via-yellow-100 to-orange-100 hover:from-amber-200 hover:to-orange-200 border-2 border-amber-300 text-amber-950 rounded-2xl text-xs sm:text-sm font-display font-black shadow-sm transition-all active:scale-95 cursor-pointer"
              title="Klik untuk menyalakan kembang api perayaan lagi!"
            >
              <span className="text-base">🎆</span>
              <span>Nyalakan Kembang Api Perayaan!</span>
              <Sparkles className="w-4 h-4 text-amber-600 animate-spin" />
            </button>
          </div>
        </div>

        {/* Security Alert Banner if Auto-Terminated */}
        {(result.submitReason === 'TAB_SWITCH' || result.submitReason === 'TAB_CLOSED') && (
          <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-4 flex items-start space-x-3 text-red-950 text-left">
            <ShieldAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="text-xs sm:text-sm font-semibold space-y-1">
              <span className="font-bold text-red-900 block">
                Catatan Keamanan CBT:
              </span>
              <p className="text-red-800 leading-relaxed">
                {result.submitReason === 'TAB_SWITCH'
                  ? 'Ujian kamu diselesaikan secara otomatis karena sistem mendeteksi aktivitas perpindahan ke tab atau jendela lain selama ujian berlangsung.'
                  : 'Ujian kamu diselesaikan secara otomatis karena jendela atau tab ujian ditutup.'}
              </p>
            </div>
          </div>
        )}

        {/* Student Data */}
        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 text-xs sm:text-sm font-semibold text-slate-700 space-y-1.5 text-left">
          <div>Nama Peserta: <strong className="text-slate-900">{result.name}</strong></div>
          <div>Asal Sekolah: <strong className="text-slate-900">{result.school}</strong></div>
          <div>Kelas: <strong className="text-slate-900">Kelas {result.grade} SD</strong></div>
          <div>Ujian: <strong className="text-slate-900">{exam.title} ({exam.subject})</strong></div>
        </div>

        {/* Score Display (Only if exam.showScore is TRUE) */}
        {exam.showScore ? (
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-300 rounded-3xl p-6 space-y-4">
            <div className="text-xs font-black uppercase tracking-widest text-amber-800">
              Hasil Penilaian
            </div>

            {/* Big Score Number */}
            <div className="font-display text-5xl sm:text-6xl font-black text-amber-950">
              {result.score}
            </div>

            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider shadow-xs"
                 style={{
                   backgroundColor: isPassed ? '#dcfce7' : '#fee2e2',
                   color: isPassed ? '#166534' : '#991b1b',
                 }}>
              {isPassed ? <span>✓ {result.status} (Memenuhi KKM {exam.kkm})</span> : <span>✕ {result.status} (Di Bawah KKM {exam.kkm})</span>}
            </div>

            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-amber-200/80 text-xs sm:text-sm font-bold">
              <div className="bg-white/80 p-3 rounded-2xl border border-emerald-200 flex items-center justify-center space-x-2 text-emerald-800">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span>Benar: {result.correctAnswers} Soal</span>
              </div>
              <div className="bg-white/80 p-3 rounded-2xl border border-red-200 flex items-center justify-center space-x-2 text-red-800">
                <XCircle className="w-4 h-4 text-red-600" />
                <span>Salah: {result.wrongAnswers} Soal</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-5 text-blue-900 font-semibold text-sm">
            📢 Nilai kamu akan diumumkan oleh bapak/ibu guru di sekolah.
          </div>
        )}

        {/* Answer Review Accordion (If enabled by teacher) */}
        {exam.showAnswerReview && questions.length > 0 && (
          <div className="border border-slate-200 rounded-2xl overflow-hidden text-left">
            <button
              onClick={() => setShowReviewAccordion(!showReviewAccordion)}
              className="w-full bg-slate-50 px-4 py-3 flex items-center justify-between text-xs sm:text-sm font-bold text-slate-800 hover:bg-slate-100 transition-colors"
            >
              <span className="flex items-center space-x-2">
                <HelpCircle className="w-4 h-4 text-amber-600" />
                <span>Lihat Pembahasan Soal ({questions.length} Butir)</span>
              </span>
              {showReviewAccordion ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showReviewAccordion && (
              <div className="p-4 space-y-4 max-h-96 overflow-y-auto divide-y divide-slate-100">
                {questions.map((q, idx) => (
                  <div key={q.questionId} className="pt-3 first:pt-0 space-y-1.5 text-xs sm:text-sm">
                    <div className="font-bold text-slate-900">
                      Soal #{idx + 1}: {convertLatexToStandardMath(q.question)}
                    </div>
                    {q.type === 'COMPLEX_TF' && Array.isArray(q.statements) && q.statements.length > 0 ? (
                      <div className="text-xs font-semibold text-teal-950 bg-teal-50/90 p-3 rounded-xl border border-teal-200 space-y-2">
                        <div className="font-bold flex items-center space-x-1.5">
                          <span>Kunci Jawaban Pernyataan (Benar / Salah):</span>
                        </div>
                        <div className="space-y-1.5">
                          {q.statements.map((stmt, sIdx) => (
                            <div key={stmt.id || sIdx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white/80 p-2.5 rounded-lg border border-teal-100">
                              <div className="space-y-1">
                                <span className="text-slate-800">
                                  <strong className="text-teal-900">{sIdx + 1}.</strong> {stmt.text}
                                </span>
                                {stmt.imageUrl && (
                                  <div>
                                    <img
                                      src={stmt.imageUrl}
                                      alt={`Gambar pernyataan ${sIdx + 1}`}
                                      className="h-12 max-w-xs object-contain rounded border border-teal-200 bg-white p-0.5"
                                    />
                                  </div>
                                )}
                              </div>
                              <span
                                className={`px-2.5 py-0.5 rounded-md text-[11px] font-black uppercase ${
                                  stmt.isCorrectTrue
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                    : 'bg-rose-100 text-rose-800 border border-rose-300'
                                }`}
                              >
                                {stmt.isCorrectTrue ? 'Benar' : 'Salah'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : q.type === 'COMPLEX' && Array.isArray(q.correctAnswers) && q.correctAnswers.length > 0 ? (
                      <div className="text-xs font-semibold text-indigo-800 bg-indigo-50 p-2.5 rounded-xl border border-indigo-200">
                        Kunci Jawaban (PG Kompleks): <strong>Pilihan {q.correctAnswers.join(', ')}</strong>
                      </div>
                    ) : (
                      <div className="text-xs font-semibold text-emerald-700 bg-emerald-50 p-2 rounded-lg">
                        Kunci Jawaban: <strong>Pilihan {q.correctAnswer}</strong>
                      </div>
                    )}
                    {q.explanation && typeof q.explanation === 'string' && q.explanation.trim() && (
                      <div className="text-xs text-slate-600 bg-slate-50 p-2 rounded-lg italic">
                        Pembahasan: {convertLatexToStandardMath(q.explanation)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Digital Certificate of Completion Section */}
        <div
          id="digital-certificate-section"
          className="bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-500 text-white rounded-3xl p-5 sm:p-6 text-left shadow-lg border-2 border-amber-300 relative overflow-hidden"
        >
          {/* Decorative background glow */}
          <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none" />

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
            <div className="flex items-center space-x-3.5">
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-2xl shadow-sm shrink-0 border border-white/30">
                🎓
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="bg-white/25 text-amber-100 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-md">
                    Sertifikat Resmi
                  </span>
                  <span className="text-xs font-bold text-amber-100 flex items-center space-x-1">
                    <Sparkles className="w-3 h-3 text-yellow-200" />
                    <span>Certificate of Completion</span>
                  </span>
                </div>
                <h3 className="font-display font-black text-lg sm:text-xl text-white mt-0.5">
                  Sertifikat Kelulusan Siswa
                </h3>
                <p className="text-xs text-amber-100 font-medium mt-0.5">
                  Atas nama <strong>{result.name}</strong> • Nilai: <strong>{result.score}</strong> ({result.status})
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto justify-end">
              <button
                id="print-certificate-btn"
                type="button"
                onClick={() => handleOpenCertificate(true)}
                className="flex-1 sm:flex-none px-5 py-2.5 bg-white text-amber-800 hover:bg-amber-50 active:scale-98 font-display font-black text-xs sm:text-sm rounded-xl shadow-md transition-all flex items-center justify-center space-x-2 cursor-pointer"
                title="Cetak sertifikat kelulusan digital langsung atau simpan sebagai PDF"
              >
                <Printer className="w-4 h-4 text-amber-700" />
                <span>Print Certificate</span>
              </button>

              <button
                id="preview-certificate-btn"
                type="button"
                onClick={() => handleOpenCertificate(false)}
                className="flex-1 sm:flex-none px-4 py-2.5 bg-amber-700/70 hover:bg-amber-700 text-white font-bold text-xs sm:text-sm rounded-xl border border-white/30 transition-colors flex items-center justify-center space-x-1.5 cursor-pointer shadow-xs"
                title="Buka pratinjau sertifikat digital dan unduh sebagai berkas gambar"
              >
                <Award className="w-4 h-4 text-yellow-300" />
                <span>Lihat Sertifikat</span>
              </button>
            </div>
          </div>
        </div>

        {/* Download & Share Result Card Box */}
        <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-amber-50 border-2 border-blue-200 rounded-3xl p-5 sm:p-6 text-left space-y-4 shadow-xs">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center space-x-2.5">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center text-lg shadow-xs">
                📸
              </div>
              <div>
                <h4 className="font-display font-black text-slate-900 text-base sm:text-lg">
                  Simpan Kartu Hasil Ujian (PNG)
                </h4>
                <p className="text-xs text-slate-600 font-semibold">
                  Unduh gambar kartu nilai resmi untuk disimpan di galeri atau dibagikan ke orang tua.
                </p>
              </div>
            </div>
            <button
              id="preview-result-png-btn"
              type="button"
              onClick={handleOpenPreview}
              className="text-xs font-bold text-blue-700 hover:text-blue-800 bg-white px-3 py-1.5 rounded-xl border border-blue-200 shadow-2xs flex items-center space-x-1.5 transition-colors cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Lihat Pratinjau</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {/* Download Button */}
            <button
              id="download-result-png-btn"
              type="button"
              onClick={handleDownloadPng}
              disabled={downloading}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 active:scale-98 text-white rounded-2xl font-display font-extrabold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-75"
            >
              {downloading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Membuat Gambar PNG...</span>
                </>
              ) : downloadSuccess ? (
                <>
                  <Check className="w-4 h-4 text-emerald-300 stroke-[3]" />
                  <span>Berhasil Diunduh!</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Unduh Gambar Kartu (PNG)</span>
                </>
              )}
            </button>

            {/* Share / WhatsApp Button */}
            <button
              id="share-result-png-btn"
              type="button"
              onClick={handleSharePng}
              disabled={sharing}
              className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-2xl font-display font-extrabold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-75"
            >
              {sharing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Membuka Opsi Bagikan...</span>
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4" />
                  <span>Bagikan ke Orang Tua (WA)</span>
                </>
              )}
            </button>
          </div>

          {downloadSuccess && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold px-3.5 py-2 rounded-xl flex items-center space-x-2 animate-in fade-in">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Gambar kartu hasil ujian telah tersimpan di perangkat kamu!</span>
            </div>
          )}
        </div>

        {/* Back to Home Button */}
        <div>
          <button
            id="finish-to-home-btn"
            onClick={onBackToHome}
            className="w-full sm:w-auto px-8 py-3.5 bg-amber-500 hover:bg-amber-600 text-white font-display font-extrabold text-base rounded-2xl shadow-md transition-all flex items-center justify-center space-x-2 mx-auto cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>Kembali ke Beranda CBT CERIA</span>
          </button>
        </div>
      </div>

      {/* Preview Modal */}
      {showPreviewModal && previewUrl && (
        <div
          id="result-preview-modal"
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
        >
          <div className="bg-white rounded-3xl max-w-2xl w-full p-5 sm:p-6 border-2 border-amber-200 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <span className="text-xl">📸</span>
                <h4 className="font-display font-black text-slate-900 text-base">
                  Pratinjau Kartu Hasil Ujian Siswa (PNG)
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setShowPreviewModal(false)}
                className="text-slate-400 hover:text-slate-600 font-black text-lg p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="overflow-auto rounded-2xl border border-slate-200 shadow-inner bg-slate-50 flex items-center justify-center p-2">
              <img
                src={previewUrl}
                alt="Pratinjau Kartu Hasil Ujian"
                className="w-full h-auto rounded-xl object-contain shadow-xs"
              />
            </div>

            <div className="pt-2 flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowPreviewModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={() => {
                  handleDownloadPng();
                  setShowPreviewModal(false);
                }}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl flex items-center space-x-1.5 shadow-xs cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Unduh Gambar Sekarang</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Digital Certificate Modal */}
      {showCertificateModal && (
        <DigitalCertificateModal
          result={result}
          exam={exam}
          autoPrint={autoPrintCertificate}
          onClose={() => setShowCertificateModal(false)}
        />
      )}
    </div>
  );
};
