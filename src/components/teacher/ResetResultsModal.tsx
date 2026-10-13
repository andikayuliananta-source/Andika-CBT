import React, { useState, useMemo } from 'react';
import {
  RotateCcw,
  Database,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  X,
  Loader2,
  FileSpreadsheet,
  Users,
  ShieldAlert,
} from 'lucide-react';
import { Exam, Result } from '../../types';
import { resetExamResults, ResetExamResultsResult } from '../../services/firebase/examService';
import { exportResultsToExcel } from '../../services/exportService';

interface ResetResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  exams: Exam[];
  results: Result[];
  initialExamId?: string;
  preselectedResultIds?: string[];
  onResetSuccess: (result: ResetExamResultsResult) => void;
}

export const ResetResultsModal: React.FC<ResetResultsModalProps> = ({
  isOpen,
  onClose,
  exams,
  results,
  initialExamId = 'ALL',
  preselectedResultIds = [],
  onResetSuccess,
}) => {
  const [selectedExamId, setSelectedExamId] = useState<string>(initialExamId);
  const [mode, setMode] = useState<'SELECTED' | 'EXAM'>(
    preselectedResultIds.length > 0 ? 'SELECTED' : 'EXAM'
  );
  const [resetParticipantSessions, setResetParticipantSessions] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Results to be deleted based on selection
  const targetResults = useMemo(() => {
    if (mode === 'SELECTED' && preselectedResultIds.length > 0) {
      return results.filter((r) => preselectedResultIds.includes(r.resultId));
    }
    if (selectedExamId !== 'ALL') {
      return results.filter((r) => r.examId === selectedExamId);
    }
    return results;
  }, [results, mode, preselectedResultIds, selectedExamId]);

  if (!isOpen) return null;

  const selectedExamObj = exams.find((e) => e.examId === selectedExamId);

  const handleBackupExcel = () => {
    const examTitle =
      selectedExamId !== 'ALL' && selectedExamObj
        ? selectedExamObj.title
        : 'Semua_Ujian_Cadangan';
    exportResultsToExcel(examTitle, targetResults);
  };

  const handleExecuteReset = async () => {
    if (targetResults.length === 0) {
      setErrorMsg('Tidak ada data hasil ujian yang sesuai kriteria untuk direset.');
      return;
    }

    setErrorMsg(null);
    setLoading(true);
    try {
      const result = await resetExamResults({
        examId: mode === 'EXAM' && selectedExamId !== 'ALL' ? selectedExamId : undefined,
        resultIds: mode === 'SELECTED' ? preselectedResultIds : undefined,
        resetParticipantSessions,
      });

      onResetSuccess(result);
      onClose();
    } catch (err: any) {
      console.error('Error resetting exam results:', err);
      setErrorMsg(
        err.message || 'Gagal mereset hasil ujian. Periksa koneksi internet dan hak akses admin.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      id="reset-results-modal"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
    >
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 border-2 border-rose-200 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-3.5">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-black text-lg text-slate-900 flex items-center space-x-2">
                <span>Reset Hasil Ujian Siswa</span>
              </h3>
              <p className="text-xs text-slate-500 font-semibold">
                Hapus rekapitulasi nilai dan izinkan siswa untuk mengerjakan ulang
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
        <div className="bg-rose-50/80 border border-rose-200 rounded-2xl p-4 text-xs font-semibold text-rose-950 space-y-2">
          <div className="flex items-center space-x-2 font-bold text-rose-900">
            <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
            <span>Manajemen Riwayat & Remedial Ujian</span>
          </div>
          <p className="text-rose-800 leading-relaxed text-[11px]">
            Fitur ini digunakan saat guru ingin mengosongkan nilai ujian (misalnya setelah masa try out atau
            untuk keperluan remedial/ujian susulan). Sesi pengerjaan siswa akan dibersihkan agar siswa dapat
            masuk kembali tanpa terhalang status &quot;Sudah Selesai&quot;.
          </p>
        </div>

        {errorMsg && (
          <div className="bg-rose-100 border border-rose-300 rounded-2xl p-3 text-xs font-bold text-rose-900 flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Mode Selector if preselected items exist */}
        {preselectedResultIds.length > 0 && (
          <div className="flex bg-slate-100 p-1 rounded-2xl gap-1 text-xs font-bold">
            <button
              type="button"
              onClick={() => setMode('SELECTED')}
              className={`flex-1 py-2 px-3 rounded-xl transition-colors ${
                mode === 'SELECTED'
                  ? 'bg-white text-rose-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Hanya Siswa Terpilih ({preselectedResultIds.length})
            </button>
            <button
              type="button"
              onClick={() => setMode('EXAM')}
              className={`flex-1 py-2 px-3 rounded-xl transition-colors ${
                mode === 'EXAM'
                  ? 'bg-white text-rose-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Berdasarkan Ujian / Semua
            </button>
          </div>
        )}

        {/* Filter Target Ujian (if mode === 'EXAM') */}
        {mode === 'EXAM' && (
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase text-slate-700">
              Pilih Target Ujian
            </label>
            <select
              value={selectedExamId}
              onChange={(e) => setSelectedExamId(e.target.value)}
              disabled={loading}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-rose-500"
            >
              <option value="ALL">🌐 Semua Ujian ({results.length} Total Nilai)</option>
              {exams.map((ex) => {
                const countForExam = results.filter((r) => r.examId === ex.examId).length;
                return (
                  <option key={ex.examId} value={ex.examId}>
                    📝 {ex.title} ({countForExam} nilai)
                  </option>
                );
              })}
            </select>
          </div>
        )}

        {/* Option: Reset participant session as well */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2">
          <label className="flex items-start space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={resetParticipantSessions}
              onChange={(e) => setResetParticipantSessions(e.target.checked)}
              disabled={loading}
              className="mt-0.5 text-rose-600 rounded-md focus:ring-rose-500 w-4 h-4 cursor-pointer"
            />
            <div className="text-xs space-y-0.5">
              <span className="font-bold text-slate-900 block">
                Izinkan Siswa Mengerjakan Ulang (Reset Sesi & Jawaban)
              </span>
              <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
                Membersihkan sesi peserta di Firestore serta menghapus kunci ujian lokal, sehingga siswa
                dapat memasukkan token dan memulai ujian baru tanpa terblokir.
              </p>
            </div>
          </label>
        </div>

        {/* Target Statistics Box */}
        <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-amber-900 flex items-center space-x-1.5">
              <Users className="w-4 h-4 text-amber-700" />
              <span>Jumlah Hasil yang Akan Direset:</span>
            </span>
            <span className="font-display font-black text-amber-950 text-sm bg-amber-100 px-2.5 py-0.5 rounded-lg border border-amber-300">
              {targetResults.length} data nilai
            </span>
          </div>

          {targetResults.length > 0 && (
            <div className="pt-2 border-t border-amber-200/60 flex items-center justify-between text-[11px] font-semibold text-amber-800">
              <span>Unduh rekap sebelum reset jika diperlukan:</span>
              <button
                type="button"
                onClick={handleBackupExcel}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2.5 py-1 rounded-lg flex items-center space-x-1 shadow-2xs transition-colors cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Backup Excel</span>
              </button>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex items-center justify-end space-x-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-xs transition-colors cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleExecuteReset}
            disabled={loading || targetResults.length === 0}
            className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-display font-black text-xs transition-all flex items-center space-x-2 shadow-xs cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Memproses Reset...</span>
              </>
            ) : (
              <>
                <RotateCcw className="w-4 h-4" />
                <span>Reset {targetResults.length} Hasil Ujian</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
