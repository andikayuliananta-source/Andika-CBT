import React, { useState, useMemo } from 'react';
import {
  RotateCcw,
  Database,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  X,
  Loader2,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import { Exam, Participant } from '../../types';
import { resetParticipants, ResetParticipantsResult } from '../../services/firebase/examService';

interface ResetParticipantsModalProps {
  isOpen: boolean;
  onClose: () => void;
  exams: Exam[];
  participants: Participant[];
  initialExamId?: string;
  onResetSuccess: (result: ResetParticipantsResult) => void;
}

export const ResetParticipantsModal: React.FC<ResetParticipantsModalProps> = ({
  isOpen,
  onClose,
  exams,
  participants,
  initialExamId = 'ALL',
  onResetSuccess,
}) => {
  const [selectedExamId, setSelectedExamId] = useState<string>(initialExamId);
  const [onlyFinished, setOnlyFinished] = useState<boolean>(true);
  const [deleteResults, setDeleteResults] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Calculate target participants based on selection
  const targetParticipants = useMemo(() => {
    let filtered = participants;
    if (selectedExamId !== 'ALL') {
      filtered = filtered.filter((p) => p.examId === selectedExamId);
    }
    if (onlyFinished) {
      filtered = filtered.filter((p) => p.status === 'SUBMITTED' || p.status === 'TIMEOUT');
    }
    return filtered;
  }, [participants, selectedExamId, onlyFinished]);

  // Count participants currently in progress (active)
  const inProgressCount = useMemo(() => {
    let filtered = participants;
    if (selectedExamId !== 'ALL') {
      filtered = filtered.filter((p) => p.examId === selectedExamId);
    }
    return filtered.filter((p) => p.status === 'IN_PROGRESS').length;
  }, [participants, selectedExamId]);

  if (!isOpen) return null;

  const handleExecuteReset = async () => {
    setErrorMsg(null);
    setLoading(true);
    try {
      const result = await resetParticipants({
        examId: selectedExamId === 'ALL' ? undefined : selectedExamId,
        onlyFinished,
        deleteResults,
      });

      onResetSuccess(result);
      onClose();
    } catch (err: any) {
      console.error('Error resetting participants:', err);
      setErrorMsg(
        err.message || 'Gagal mereset peserta. Pastikan koneksi internet stabil dan hak akses aktif.'
      );
    } finally {
      setLoading(false);
    }
  };

  const selectedExamObj = exams.find((e) => e.examId === selectedExamId);

  return (
    <div
      id="reset-participants-modal"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
    >
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-7 border-2 border-amber-200 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-3.5">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-black text-lg text-slate-900 flex items-center space-x-2">
                <span>Reset Peserta & Bersihkan Database</span>
              </h3>
              <p className="text-xs text-slate-500 font-semibold">
                Kembalikan jumlah peserta ke 0 & kurangi beban kuota Firestore
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Informational Guidance */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs font-semibold text-amber-950 space-y-1.5">
          <div className="flex items-center space-x-2 font-bold text-amber-900">
            <Database className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Optimalisasi Kuota Database Firestore</span>
          </div>
          <p className="text-amber-800 leading-relaxed text-[11px]">
            Setiap siswa yang mengerjakan ujian menghasilkan dokumen peserta dan dokumen jawaban di database.
            Fitur ini menghapus sesi peserta yang sudah selesai beserta dokumen jawaban mereka agar database
            tetap ringan, hemat kuota gratis, dan tidak membebani server.
          </p>
        </div>

        {errorMsg && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3 text-xs font-bold text-rose-800 flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Filter Ujian */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold uppercase text-slate-700">
            Pilih Target Ujian
          </label>
          <select
            value={selectedExamId}
            onChange={(e) => setSelectedExamId(e.target.value)}
            disabled={loading}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-500"
          >
            <option value="ALL">🌐 Semua Ujian (Seluruh Database)</option>
            {exams.map((ex) => (
              <option key={ex.examId} value={ex.examId}>
                📝 {ex.title} ({ex.token})
              </option>
            ))}
          </select>
          <p className="text-[11px] text-slate-500 font-medium">
            {selectedExamId === 'ALL'
              ? 'Mereset peserta dari seluruh ujian yang ada di CBT CERIA.'
              : `Hanya mereset peserta untuk ujian "${selectedExamObj?.title}".`}
          </p>
        </div>

        {/* Mode Reset */}
        <div className="space-y-2">
          <label className="block text-xs font-bold uppercase text-slate-700">
            Pilihan Mode Pembersihan
          </label>

          {/* Option 1: Finished Only (Requested feature) */}
          <label
            className={`flex items-start space-x-3 p-3.5 rounded-2xl border-2 transition-all cursor-pointer ${
              onlyFinished
                ? 'bg-blue-50/70 border-blue-500 text-slate-900'
                : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
            }`}
          >
            <input
              type="radio"
              name="resetMode"
              checked={onlyFinished}
              onChange={() => setOnlyFinished(true)}
              disabled={loading}
              className="mt-1 text-blue-600 focus:ring-blue-500"
            />
            <div className="text-xs space-y-0.5">
              <div className="font-bold flex items-center space-x-1.5 text-blue-950">
                <span>Hanya Peserta yang Sudah Selesai (Rekomendasi)</span>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.5 rounded-full font-extrabold">
                  Aman
                </span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
                Hanya menghapus peserta yang statusnya telah <strong>SUBMITTED</strong> (Selesai) atau <strong>TIMEOUT</strong>.
                Peserta yang sedang aktif mengerjakan (<strong>IN_PROGRESS</strong>) aman dan <u>tidak akan terhapus</u>.
              </p>
            </div>
          </label>

          {/* Option 2: Reset All to 0 */}
          <label
            className={`flex items-start space-x-3 p-3.5 rounded-2xl border-2 transition-all cursor-pointer ${
              !onlyFinished
                ? 'bg-rose-50/70 border-rose-500 text-slate-900'
                : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
            }`}
          >
            <input
              type="radio"
              name="resetMode"
              checked={!onlyFinished}
              onChange={() => setOnlyFinished(false)}
              disabled={loading}
              className="mt-1 text-rose-600 focus:ring-rose-500"
            />
            <div className="text-xs space-y-0.5">
              <div className="font-bold flex items-center space-x-1.5 text-rose-950">
                <span>Reset Seluruh Peserta ke 0 (Total)</span>
                <span className="bg-rose-100 text-rose-800 text-[10px] px-2 py-0.5 rounded-full font-extrabold">
                  Kosongkan Total
                </span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
                Menghapus semua peserta ujian tanpa terkecuali, mengembalikan angka total peserta menjadi <strong>0</strong>.
                Gunakan mode ini sebelum ujian baru dimulai atau saat membersihkan sesi uji coba / try-out.
              </p>
            </div>
          </label>
        </div>

        {/* Opsi Tambahan: Hapus Dokumen Hasil Nilai */}
        <div className="pt-1">
          <label className="flex items-start space-x-3 p-3 bg-slate-50 border border-slate-200 rounded-2xl cursor-pointer hover:bg-slate-100/60 transition-colors">
            <input
              type="checkbox"
              checked={deleteResults}
              onChange={(e) => setDeleteResults(e.target.checked)}
              disabled={loading}
              className="mt-1 text-blue-600 rounded-md focus:ring-blue-500"
            />
            <div className="text-xs space-y-0.5">
              <span className="font-bold text-slate-900">
                Hapus juga data nilai pada Hasil Ujian (Koleksi Results)
              </span>
              <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                Jika dicentang, rekap nilai di menu &ldquo;Hasil Analisis&rdquo; juga dibersihkan agar database 100% kosong.
                Jika tidak dicentang, arsip nilai siswa tetap tersimpan untuk diunduh / diekspor.
              </p>
            </div>
          </label>
        </div>

        {/* Impact Summary Badge */}
        <div className="bg-slate-100 rounded-2xl p-4 border border-slate-200 space-y-2 text-xs">
          <div className="font-bold text-slate-800 flex items-center justify-between">
            <span>Ringkasan Tindakan Pembersihan:</span>
            <span className="font-display font-black text-blue-600 text-sm">
              {targetParticipants.length} Peserta Terpilih
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px] font-semibold text-slate-600">
            <div className="bg-white p-2.5 rounded-xl border border-slate-200">
              <span className="text-slate-400 block text-[10px]">Akan Dihapus:</span>
              <span className="font-bold text-rose-600">
                {targetParticipants.length} Sesi Peserta
              </span>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-slate-200">
              <span className="text-slate-400 block text-[10px]">Sedang Ujian (Tetap Aman):</span>
              <span className="font-bold text-emerald-600">
                {onlyFinished ? `${inProgressCount} Siswa Aktif` : '0 (Akan ikut terhapus)'}
              </span>
            </div>
          </div>

          {targetParticipants.length === 0 && (
            <p className="text-[11px] text-amber-700 font-bold bg-amber-100/60 p-2 rounded-lg">
              ℹ️ Tidak ada peserta yang berstatus selesai untuk filter ini. Database Anda sudah dalam kondisi bersih!
            </p>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end space-x-3 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 font-bold text-xs transition-colors cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleExecuteReset}
            disabled={loading || targetParticipants.length === 0}
            className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-display font-extrabold text-xs rounded-xl shadow-xs transition-colors flex items-center space-x-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Membersihkan Database...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                <span>
                  {onlyFinished
                    ? `Reset ${targetParticipants.length} Peserta Selesai`
                    : `Reset Semua Peserta ke 0`}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
