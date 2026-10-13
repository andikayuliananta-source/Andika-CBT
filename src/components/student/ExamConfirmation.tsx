import React from 'react';
import { Rocket, ArrowLeft, AlertTriangle, Clock, BookOpen, User, School, CheckCircle2, ShieldAlert, Maximize2 } from 'lucide-react';
import { Exam, GradeLevel } from '../../types';
import { requestAppFullscreen } from '../../utils/fullscreen';

interface ExamConfirmationProps {
  exam: Exam;
  studentData: { name: string; school: string; grade: GradeLevel };
  questionsCount: number;
  onConfirmStart: () => void;
  onBack: () => void;
  loading?: boolean;
  errorMessage?: string | null;
  onResetSession?: () => void;
}

export const ExamConfirmation: React.FC<ExamConfirmationProps> = ({
  exam,
  studentData,
  questionsCount,
  onConfirmStart,
  onBack,
  loading = false,
  errorMessage = null,
  onResetSession,
}) => {
  return (
    <div className="w-full max-w-xl mx-auto p-4">
      <div className="bg-white rounded-3xl border-2 border-amber-200 shadow-xl p-6 sm:p-8 space-y-6">
        {/* Title */}
        <div className="text-center">
          <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto text-3xl mb-3 shadow-inner">
            📋
          </div>
          <h2 className="font-display text-2xl sm:text-3xl font-black text-slate-800">
            Konfirmasi Ujian
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 font-semibold mt-1">
            Periksa data dirimu dan informasi ujian sebelum memulai
          </p>
        </div>

        {/* Data Cards */}
        <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-3">
          <div className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-2">
            Identitas Peserta
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-sm">
            <div className="flex items-center space-x-2 text-slate-700">
              <User className="w-4 h-4 text-slate-400 shrink-0" />
              <span>Nama: <strong className="text-slate-900">{studentData.name}</strong></span>
            </div>
            <div className="flex items-center space-x-2 text-slate-700">
              <School className="w-4 h-4 text-slate-400 shrink-0" />
              <span>Sekolah: <strong className="text-slate-900">{studentData.school}</strong></span>
            </div>
            <div className="flex items-center space-x-2 text-slate-700">
              <span className="text-sm">🎒</span>
              <span>Kelas: <strong className="text-slate-900">Kelas {studentData.grade} SD</strong></span>
            </div>
          </div>
        </div>

        <div className="bg-amber-50/70 rounded-2xl p-5 border border-amber-200 space-y-3">
          <div className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-2">
            Informasi Ujian
          </div>
          <div className="space-y-2 text-sm">
            <div className="font-display font-bold text-slate-900 text-base">
              {exam.title}
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-slate-700 font-semibold">
              <div>Mata Pelajaran: <strong>{exam.subject}</strong></div>
              <div>Jumlah Soal: <strong>{questionsCount} Soal</strong></div>
              <div>Durasi Ujian: <strong>{exam.durationMinutes} Menit</strong></div>
              <div>Standar KKM: <strong>{exam.kkm}</strong></div>
            </div>
          </div>
        </div>

        {/* Strict Security Rules Warning */}
        <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-4 flex items-start space-x-3 text-red-950 shadow-xs">
          <ShieldAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs sm:text-sm">
            <span className="font-display font-black text-red-900 block">
              🛡️ PERATURAN KEAMANAN UJIAN (PENTING!):
            </span>
            <p className="font-semibold text-red-800 leading-relaxed">
              Dilarang keras <strong>menutup tab</strong> atau <strong>berpindah ke tab/aplikasi lain</strong> selama ujian berlangsung.
              Jika terdeteksi meninggalkan halaman ini, sistem keamanan akan <strong>LANGSUNG OTOMATIS MENYELESAIKAN & MENGIRIM UJIAN</strong>.
            </p>
          </div>
        </div>

        {/* Fullscreen Mode Informational Notice */}
        <div className="bg-sky-50 border-2 border-sky-300 rounded-2xl p-4 flex items-start space-x-3 text-sky-950 shadow-xs">
          <Maximize2 className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs sm:text-sm">
            <span className="font-display font-black text-sky-900 block">
              🔒 PENGUNCIAN LAYAR PENUH (FULLSCREEN LOCK):
            </span>
            <p className="font-medium text-sky-800 leading-relaxed">
              Saat kamu menekan tombol <strong>Mulai Ujian</strong>, layar akan <strong>otomatis terkunci ke Mode Layar Penuh (Fullscreen)</strong>. Hal ini meminimalkan gangguan dari aplikasi lain, menyembunyikan notifikasi, serta memaksimalkan ruang pandang soal dan gambar agar kamu dapat berkonsentrasi penuh.
            </p>
          </div>
        </div>

        {/* Error Alert if any */}
        {errorMessage && (
          <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-4 text-red-800 text-sm space-y-2">
            <div className="flex items-start space-x-2">
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div className="font-bold">{errorMessage}</div>
            </div>
            {onResetSession && (
              <button
                type="button"
                onClick={onResetSession}
                className="text-xs bg-red-100 hover:bg-red-200 text-red-900 font-bold py-1.5 px-3 rounded-xl transition-colors cursor-pointer"
              >
                🔄 Reset Riwayat Percobaan Siswa Ini & Coba Lagi
              </button>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
          <button
            id="confirm-back-btn"
            type="button"
            onClick={onBack}
            disabled={loading}
            className="w-full sm:w-1/3 py-3 px-4 border-2 border-slate-200 text-slate-600 font-bold rounded-2xl hover:bg-slate-50 transition-colors text-sm flex items-center justify-center space-x-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>← KEMBALI</span>
          </button>
          <button
            id="confirm-start-exam-btn"
            type="button"
            onClick={async () => {
              // Attempt fullscreen directly on user click
              await requestAppFullscreen();
              onConfirmStart();
            }}
            disabled={loading}
            className="w-full sm:w-2/3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-display font-extrabold text-base py-3.5 px-6 rounded-2xl shadow-md hover:shadow-lg transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
          >
            <Rocket className="w-5 h-5" />
            <span>{loading ? 'Menyiapkan Soal...' : '🚀 MULAI UJIAN (LAYAR PENUH)'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
