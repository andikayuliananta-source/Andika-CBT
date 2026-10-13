import React, { useState, useMemo } from 'react';
import {
  Download,
  FileSpreadsheet,
  FileText,
  Search,
  Filter,
  Trophy,
  ArrowUpDown,
  CheckCircle2,
  XCircle,
  BarChart2,
  PieChart,
  RotateCcw,
  RefreshCw,
  Trash2,
  AlertTriangle,
  Loader2,
  CheckSquare,
  Square,
  X,
  ShieldAlert,
} from 'lucide-react';
import { Result, Exam } from '../../types';
import { exportResultsToExcel, exportResultsToPdf } from '../../services/exportService';
import {
  deleteSingleResult,
  ResetExamResultsResult,
} from '../../services/firebase/examService';
import { ScoreDistributionChart } from './ScoreDistributionChart';
import { ResetResultsModal } from './ResetResultsModal';

interface ResultsAnalyticsProps {
  exams: Exam[];
  results: Result[];
  onRefresh?: () => void | Promise<void>;
}

export const ResultsAnalytics: React.FC<ResultsAnalyticsProps> = ({
  exams,
  results,
  onRefresh,
}) => {
  const [selectedExamId, setSelectedExamId] = useState<string>('ALL');
  const [gradeFilter, setGradeFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'score' | 'name' | 'time'>('time');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Modal & Selection States
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [selectedResultIds, setSelectedResultIds] = useState<Set<string>>(new Set());
  const [targetSingleResult, setTargetSingleResult] = useState<Result | null>(null);
  const [singleResetResetSession, setSingleResetResetSession] = useState(true);
  const [isDeletingSingle, setIsDeletingSingle] = useState(false);
  const [singleErrorMsg, setSingleErrorMsg] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Status message notification banner
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Filtered Results
  const filteredResults = useMemo(() => {
    return results.filter((r) => {
      const matchExam = selectedExamId === 'ALL' || r.examId === selectedExamId;
      const matchGrade = gradeFilter === 'ALL' || r.grade === gradeFilter;
      const matchStatus = statusFilter === 'ALL' || r.status === statusFilter;
      const matchSearch =
        r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.school.toLowerCase().includes(searchTerm.toLowerCase());
      return matchExam && matchGrade && matchStatus && matchSearch;
    });
  }, [results, selectedExamId, gradeFilter, statusFilter, searchTerm]);

  // Sorted Results
  const sortedResults = useMemo(() => {
    return [...filteredResults].sort((a, b) => {
      if (sortBy === 'score') {
        return sortOrder === 'asc' ? a.score - b.score : b.score - a.score;
      }
      if (sortBy === 'name') {
        return sortOrder === 'asc'
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      }
      // time
      const timeA = new Date(a.finishedAt || a.createdAt).getTime();
      const timeB = new Date(b.finishedAt || b.createdAt).getTime();
      return sortOrder === 'asc' ? timeA - timeB : timeB - timeA;
    });
  }, [filteredResults, sortBy, sortOrder]);

  // Paginated slices
  const totalPages = Math.ceil(sortedResults.length / itemsPerPage) || 1;
  const paginatedResults = sortedResults.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Analytics Metrics
  const metrics = useMemo(() => {
    if (filteredResults.length === 0) {
      return { total: 0, highest: 0, lowest: 0, average: 0, passed: 0, failed: 0 };
    }
    const scores = filteredResults.map((r) => r.score);
    const total = scores.length;
    const highest = Math.max(...scores);
    const lowest = Math.min(...scores);
    const average = Math.round(scores.reduce((a, b) => a + b, 0) / total);
    const passed = filteredResults.filter((r) => r.status === 'LULUS').length;
    const failed = total - passed;
    return { total, highest, lowest, average, passed, failed };
  }, [filteredResults]);

  // Active target exam object for export naming
  const activeExam =
    selectedExamId !== 'ALL'
      ? exams.find((e) => e.examId === selectedExamId) || exams[0]
      : exams[0] || {
          examId: 'all',
          title: 'Semua Ujian',
          subject: 'Semua Mata Pelajaran',
          grade: '6',
          phase: 'C',
          description: '',
          token: 'CERIA',
          startAt: '',
          endAt: '',
          durationMinutes: 60,
          kkm: 75,
          status: 'ACTIVE',
          showScore: true,
          showAnswerReview: true,
          shuffleQuestions: false,
          shuffleOptions: false,
          createdBy: 'admin',
          createdAt: '',
          updatedAt: '',
        };

  const handleExportExcel = () => {
    exportResultsToExcel(activeExam.title, sortedResults);
  };

  const handleExportPdf = () => {
    exportResultsToPdf(activeExam, sortedResults);
  };

  const handleExportSelectedExcel = () => {
    const selectedList = results.filter((r) => selectedResultIds.has(r.resultId));
    if (selectedList.length === 0) return;
    exportResultsToExcel(`${activeExam.title}_Pilihan`, selectedList);
  };

  const handleManualRefresh = async () => {
    if (!onRefresh) return;
    setIsRefreshing(true);
    try {
      await onRefresh();
      setStatusMessage({
        type: 'success',
        text: 'Data hasil ujian berhasil diperbarui dari database.',
      });
      setTimeout(() => setStatusMessage(null), 3000);
    } catch {
      setStatusMessage({
        type: 'error',
        text: 'Gagal memperbarui data hasil ujian.',
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  // Checkbox helpers
  const handleToggleSelectAllPage = () => {
    const pageIds = paginatedResults.map((r) => r.resultId);
    const allSelected = pageIds.every((id) => selectedResultIds.has(id));

    setSelectedResultIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        pageIds.forEach((id) => next.delete(id));
      } else {
        pageIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const handleToggleSelectRow = (resultId: string) => {
    setSelectedResultIds((prev) => {
      const next = new Set(prev);
      if (next.has(resultId)) {
        next.delete(resultId);
      } else {
        next.add(resultId);
      }
      return next;
    });
  };

  const handleClearSelection = () => {
    setSelectedResultIds(new Set());
  };

  // Bulk reset callback
  const handleResetSuccess = (result: ResetExamResultsResult) => {
    setSelectedResultIds(new Set());
    setStatusMessage({
      type: 'success',
      text: `Berhasil mereset ${result.deletedResults} hasil ujian dan ${result.deletedParticipants} sesi pengerjaan siswa dari database!`,
    });
    if (onRefresh) onRefresh();
    setTimeout(() => setStatusMessage(null), 6000);
  };

  // Single student reset execution
  const handleConfirmSingleReset = async () => {
    if (!targetSingleResult) return;
    setIsDeletingSingle(true);
    setSingleErrorMsg(null);
    try {
      await deleteSingleResult(targetSingleResult.resultId, singleResetResetSession);
      setStatusMessage({
        type: 'success',
        text: `Hasil ujian siswa "${targetSingleResult.name}" berhasil direset. Siswa kini dapat mengerjakan ujian kembali.`,
      });
      setTargetSingleResult(null);
      if (onRefresh) onRefresh();
      setTimeout(() => setStatusMessage(null), 5000);
    } catch (err: any) {
      console.error('Error resetting single result:', err);
      setSingleErrorMsg(err.message || 'Gagal mereset hasil ujian siswa.');
    } finally {
      setIsDeletingSingle(false);
    }
  };

  const isAllPageSelected =
    paginatedResults.length > 0 &&
    paginatedResults.every((r) => selectedResultIds.has(r.resultId));

  return (
    <div className="space-y-6">
      {/* Header & Export Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-display font-black text-2xl text-slate-900">
            Hasil & Analisis Ujian
          </h2>
          <p className="text-xs text-slate-500 font-semibold">
            Rekapitulasi perolehan nilai, ketuntasan belajar, ekspor laporan, dan reset hasil
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          {onRefresh && (
            <button
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-display font-bold text-xs sm:text-sm px-3 py-2.5 rounded-2xl shadow-xs transition-colors flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
              title="Perbarui data hasil ujian"
            >
              <RefreshCw className={`w-4 h-4 text-blue-600 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Segarkan</span>
            </button>
          )}

          <button
            id="btn-export-excel"
            onClick={handleExportExcel}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-display font-bold text-xs sm:text-sm px-3.5 py-2.5 rounded-2xl shadow-xs transition-colors flex items-center space-x-1.5 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>📊 Download Excel</span>
          </button>

          <button
            id="btn-export-pdf"
            onClick={handleExportPdf}
            className="bg-rose-600 hover:bg-rose-700 text-white font-display font-bold text-xs sm:text-sm px-3.5 py-2.5 rounded-2xl shadow-xs transition-colors flex items-center space-x-1.5 cursor-pointer"
          >
            <FileText className="w-4 h-4" />
            <span>📄 Download PDF</span>
          </button>

          {/* MAIN FEATURE: RESET HASIL UJIAN BUTTON */}
          <button
            id="btn-open-reset-results"
            onClick={() => setIsResetModalOpen(true)}
            className="bg-rose-50 hover:bg-rose-100 border border-rose-300 text-rose-800 font-display font-black text-xs sm:text-sm px-4 py-2.5 rounded-2xl shadow-xs transition-all flex items-center space-x-2 cursor-pointer group"
          >
            <RotateCcw className="w-4 h-4 text-rose-600 group-hover:-rotate-90 transition-transform" />
            <span>Reset Hasil Ujian</span>
          </button>
        </div>
      </div>

      {/* STATUS NOTIFICATION BANNER */}
      {statusMessage && (
        <div
          className={`p-4 rounded-2xl border text-xs font-bold flex items-center justify-between animate-in fade-in ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center space-x-2.5">
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button
            onClick={() => setStatusMessage(null)}
            className="p-1 hover:bg-black/5 rounded-lg transition-colors cursor-pointer text-slate-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ANALYTICS SUMMARY CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <div className="text-xs font-bold text-slate-500">Peserta</div>
          <div className="text-2xl font-display font-black text-slate-900 mt-1">
            {metrics.total}
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <div className="text-xs font-bold text-emerald-600">Nilai Tertinggi</div>
          <div className="text-2xl font-display font-black text-emerald-700 mt-1">
            {metrics.highest}
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <div className="text-xs font-bold text-red-600">Nilai Terendah</div>
          <div className="text-2xl font-display font-black text-red-700 mt-1">
            {metrics.lowest}
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <div className="text-xs font-bold text-blue-600">Rata-rata</div>
          <div className="text-2xl font-display font-black text-blue-700 mt-1">
            {metrics.average}
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <div className="text-xs font-bold text-emerald-700">Lulus (≥ KKM)</div>
          <div className="text-2xl font-display font-black text-emerald-600 mt-1">
            {metrics.passed}
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <div className="text-xs font-bold text-orange-700">Belum Lulus</div>
          <div className="text-2xl font-display font-black text-orange-600 mt-1">
            {metrics.failed}
          </div>
        </div>
      </div>

      {/* SCORE DISTRIBUTION & MASTERY VISUALIZATION CHARTS */}
      <ScoreDistributionChart
        results={results}
        exams={exams}
        selectedExamId={selectedExamId}
        onSelectExamId={setSelectedExamId}
        kkmThreshold={activeExam.kkm || 75}
      />

      {/* Filters and Search Toolbar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-wrap gap-3 items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama siswa atau sekolah..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Exam Filter */}
        <select
          value={selectedExamId}
          onChange={(e) => setSelectedExamId(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700"
        >
          <option value="ALL">Semua Ujian</option>
          {exams.map((ex) => (
            <option key={ex.examId} value={ex.examId}>
              {ex.title}
            </option>
          ))}
        </select>

        {/* Grade Filter */}
        <select
          value={gradeFilter}
          onChange={(e) => setGradeFilter(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700"
        >
          <option value="ALL">Semua Kelas</option>
          <option value="1">Kelas 1</option>
          <option value="2">Kelas 2</option>
          <option value="3">Kelas 3</option>
          <option value="4">Kelas 4</option>
          <option value="5">Kelas 5</option>
          <option value="6">Kelas 6</option>
        </select>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700"
        >
          <option value="ALL">Semua Status</option>
          <option value="LULUS">Lulus</option>
          <option value="BELUM LULUS">Belum Lulus</option>
        </select>
      </div>

      {/* BATCH ACTION BAR WHEN CHECKBOXES ARE SELECTED */}
      {selectedResultIds.size > 0 && (
        <div className="bg-rose-50 border-2 border-rose-300 rounded-2xl p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3 animate-in fade-in shadow-xs">
          <div className="flex items-center space-x-2 text-xs font-bold text-rose-950">
            <CheckSquare className="w-4 h-4 text-rose-600" />
            <span>
              Terpilih <strong>{selectedResultIds.size} siswa</strong> dari tabel hasil ujian
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleExportSelectedExcel}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-1.5 rounded-xl shadow-2xs transition-colors flex items-center space-x-1 cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Download Excel ({selectedResultIds.size})</span>
            </button>

            <button
              onClick={() => setIsResetModalOpen(true)}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-3.5 py-1.5 rounded-xl shadow-2xs transition-colors flex items-center space-x-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset {selectedResultIds.size} Hasil Terpilih</span>
            </button>

            <button
              onClick={handleClearSelection}
              className="bg-white border border-rose-200 hover:bg-rose-100 text-rose-800 font-bold text-xs px-2.5 py-1.5 rounded-xl transition-colors cursor-pointer"
            >
              Batal
            </button>
          </div>
        </div>
      )}

      {/* RESULTS DATA TABLE */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 uppercase font-bold text-slate-500">
              <tr>
                {/* Select All on Current Page */}
                <th className="py-3 px-3 text-center w-10">
                  <input
                    type="checkbox"
                    checked={isAllPageSelected}
                    onChange={handleToggleSelectAllPage}
                    className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 cursor-pointer"
                    title="Pilih semua pada halaman ini"
                  />
                </th>
                <th className="py-3 px-3 text-center">No</th>
                <th
                  onClick={() => {
                    setSortBy('name');
                    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                  }}
                  className="py-3 px-4 cursor-pointer hover:text-slate-900"
                >
                  <div className="flex items-center space-x-1">
                    <span>Nama Siswa</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3 px-4">Asal Sekolah</th>
                <th className="py-3 px-4">Kelas</th>
                <th className="py-3 px-4 text-center">Benar</th>
                <th className="py-3 px-4 text-center">Salah</th>
                <th
                  onClick={() => {
                    setSortBy('score');
                    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                  }}
                  className="py-3 px-4 text-center cursor-pointer hover:text-slate-900"
                >
                  <div className="flex items-center justify-center space-x-1">
                    <span>Nilai</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Waktu Selesai</th>
                <th className="py-3 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-semibold">
              {paginatedResults.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-slate-400 font-semibold">
                    Belum ada data hasil ujian yang sesuai.
                  </td>
                </tr>
              ) : (
                paginatedResults.map((r, idx) => {
                  const isSelected = selectedResultIds.has(r.resultId);
                  return (
                    <tr
                      key={r.resultId}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isSelected ? 'bg-rose-50/40' : ''
                      }`}
                    >
                      <td className="py-3 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectRow(r.resultId)}
                          className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 cursor-pointer"
                        />
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-slate-900">
                        {(currentPage - 1) * itemsPerPage + idx + 1}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">{r.name}</td>
                      <td className="py-3 px-4">{r.school}</td>
                      <td className="py-3 px-4">
                        <span className="bg-amber-100 text-amber-900 px-2 py-0.5 rounded font-bold text-[10px]">
                          Kelas {r.grade} SD
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-emerald-600">
                        {r.correctAnswers}
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-red-600">
                        {r.wrongAnswers}
                      </td>
                      <td className="py-3 px-4 text-center font-display font-black text-sm text-slate-900">
                        {r.score}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex flex-col items-center space-y-0.5">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                              r.status === 'LULUS'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {r.status}
                          </span>
                          {r.submitReason === 'TAB_SWITCH' && (
                            <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 text-[9px] font-bold">
                              ⚠️ Pindah Tab
                            </span>
                          )}
                          {r.submitReason === 'TAB_CLOSED' && (
                            <span className="px-1.5 py-0.2 rounded bg-rose-100 text-rose-900 text-[9px] font-bold">
                              ⚠️ Tutup Tab
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right text-[11px] text-slate-500">
                        {r.finishedAt
                          ? new Date(r.finishedAt).toLocaleTimeString('id-ID', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '-'}
                      </td>
                      {/* ACTION COLUMN: INDIVIDUAL RESET BUTTON */}
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => setTargetSingleResult(r)}
                          className="p-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 transition-colors cursor-pointer group shadow-2xs"
                          title={`Reset hasil ujian ${r.name}`}
                        >
                          <RotateCcw className="w-3.5 h-3.5 group-hover:-rotate-90 transition-transform" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-600">
          <div>
            Menampilkan {paginatedResults.length} dari {sortedResults.length} data
          </div>
          <div className="flex items-center space-x-1">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
            >
              Sebelumnya
            </button>
            <span className="px-3 py-1.5 bg-slate-100 rounded-lg">
              {currentPage} / {totalPages}
            </span>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
            >
              Berikutnya
            </button>
          </div>
        </div>
      </div>

      {/* BULK / EXAM RESET RESULTS MODAL */}
      <ResetResultsModal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        exams={exams}
        results={results}
        initialExamId={selectedExamId}
        preselectedResultIds={Array.from(selectedResultIds)}
        onResetSuccess={handleResetSuccess}
      />

      {/* SINGLE STUDENT RESET CONFIRMATION MODAL */}
      {targetSingleResult && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border-2 border-rose-200 shadow-2xl space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display font-black text-base text-slate-900">
                    Reset Hasil Siswa
                  </h3>
                  <p className="text-xs text-slate-500 font-semibold">
                    Hapus nilai dan izinkan siswa ujian ulang
                  </p>
                </div>
              </div>
              <button
                onClick={() => setTargetSingleResult(null)}
                disabled={isDeletingSingle}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {singleErrorMsg && (
              <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3 text-xs font-bold text-rose-800 flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{singleErrorMsg}</span>
              </div>
            )}

            {/* Target Student Details */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Nama Siswa:</span>
                <span className="font-bold text-slate-900">{targetSingleResult.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Sekolah & Kelas:</span>
                <span className="font-bold text-slate-800">
                  {targetSingleResult.school} (Kelas {targetSingleResult.grade} SD)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Nilai Akhir:</span>
                <span className="font-display font-black text-slate-900">
                  {targetSingleResult.score} ({targetSingleResult.status})
                </span>
              </div>
            </div>

            {/* Option to clear session as well */}
            <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-3 space-y-1">
              <label className="flex items-start space-x-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={singleResetResetSession}
                  onChange={(e) => setSingleResetResetSession(e.target.checked)}
                  disabled={isDeletingSingle}
                  className="mt-0.5 text-rose-600 rounded focus:ring-rose-500 cursor-pointer"
                />
                <div className="text-xs">
                  <span className="font-bold text-amber-950 block">
                    Izinkan Siswa Mengerjakan Ulang
                  </span>
                  <p className="text-[11px] text-amber-800 leading-tight">
                    Bersihkan status pengerjaan agar siswa dapat login kembali dan mengulang ujian dari awal.
                  </p>
                </div>
              </label>
            </div>

            {/* Actions */}
            <div className="pt-2 flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => setTargetSingleResult(null)}
                disabled={isDeletingSingle}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-xs transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmSingleReset}
                disabled={isDeletingSingle}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-display font-black text-xs transition-all flex items-center space-x-1.5 shadow-xs cursor-pointer"
              >
                {isDeletingSingle ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Mereset...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Ya, Reset Hasil Siswa</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
