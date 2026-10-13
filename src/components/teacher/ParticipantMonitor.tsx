import React, { useState } from 'react';
import {
  Users,
  Search,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  RotateCcw,
  Trash2,
  Database,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { Participant, Exam } from '../../types';
import { ResetParticipantsModal } from './ResetParticipantsModal';
import { deleteParticipant, ResetParticipantsResult } from '../../services/firebase/examService';

interface ParticipantMonitorProps {
  participants: Participant[];
  exams: Exam[];
  onRefresh: () => void;
  initialOpenResetModal?: boolean;
}

export const ParticipantMonitor: React.FC<ParticipantMonitorProps> = ({
  participants,
  exams,
  onRefresh,
  initialOpenResetModal = false,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [examFilter, setExamFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'IN_PROGRESS' | 'SUBMITTED'>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [isResetModalOpen, setIsResetModalOpen] = useState(initialOpenResetModal);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Participant counts
  const totalCount = participants.length;
  const finishedCount = participants.filter(
    (p) => p.status === 'SUBMITTED' || p.status === 'TIMEOUT'
  ).length;
  const inProgressCount = participants.filter((p) => p.status === 'IN_PROGRESS').length;
  const tabSwitchViolations = participants.filter((p) => (p.tabSwitchCount || 0) > 0).length;

  const filtered = participants.filter((p) => {
    const matchSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.school.toLowerCase().includes(searchTerm.toLowerCase());
    const matchExam = examFilter === 'ALL' || p.examId === examFilter;
    const matchStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'SUBMITTED'
        ? p.status === 'SUBMITTED' || p.status === 'TIMEOUT'
        : p.status === 'IN_PROGRESS');
    return matchSearch && matchExam && matchStatus;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const paginatedList = filtered.slice(startIndex, startIndex + pageSize);

  const getExamTitle = (examId: string) => {
    const ex = exams.find((e) => e.examId === examId);
    return ex ? ex.title : 'Ujian CBT';
  };

  const handleResetSuccess = (result: ResetParticipantsResult) => {
    setStatusMessage({
      type: 'success',
      text: `Berhasil mereset ${result.deletedParticipants} peserta dan membersihkan ${result.deletedAnswers} dokumen jawaban di Firestore!`,
    });
    onRefresh();
    setTimeout(() => setStatusMessage(null), 6000);
  };

  const handleDeleteSingle = async (participant: Participant) => {
    const confirmDelete = window.confirm(
      `Apakah Anda yakin ingin menghapus data peserta "${participant.name}" beserta seluruh jawaban ujiannya dari database?`
    );
    if (!confirmDelete) return;

    setDeletingId(participant.participantId);
    try {
      await deleteParticipant(participant.participantId, false);
      setStatusMessage({
        type: 'success',
        text: `Data peserta "${participant.name}" berhasil dihapus dari database.`,
      });
      onRefresh();
      setTimeout(() => setStatusMessage(null), 5000);
    } catch (err: any) {
      console.error('Error deleting participant:', err);
      setStatusMessage({
        type: 'error',
        text: err.message || 'Gagal menghapus data peserta.',
      });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-display font-black text-2xl text-slate-900">
            Monitoring Peserta Ujian
          </h2>
          <p className="text-xs text-slate-500 font-semibold">
            Pantau aktivitas pengerjaan siswa secara langsung dan kelola penyimpanan database Firestore
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={onRefresh}
            className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-display font-bold text-xs sm:text-sm px-3.5 py-2.5 rounded-2xl shadow-xs transition-colors flex items-center space-x-1.5 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4 text-blue-600" />
            <span className="hidden sm:inline">Segarkan Data</span>
          </button>

          {/* Reset Participants Button (Main Feature) */}
          <button
            id="btn-open-reset-participants"
            onClick={() => setIsResetModalOpen(true)}
            className="bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-800 font-display font-black text-xs sm:text-sm px-4 py-2.5 rounded-2xl shadow-xs transition-colors flex items-center space-x-2 cursor-pointer group"
          >
            <RotateCcw className="w-4 h-4 text-rose-600 group-hover:-rotate-90 transition-transform" />
            <span>Reset Peserta Ujian</span>
          </button>
        </div>
      </div>

      {/* Success / Error Toast Notification */}
      {statusMessage && (
        <div
          className={`p-4 rounded-2xl border flex items-center space-x-2.5 text-xs font-bold animate-in fade-in slide-in-from-top-2 ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
              : 'bg-rose-50 border-rose-200 text-rose-950'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* 4 Summary Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase">Total Peserta</span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <div className="font-display font-black text-2xl text-slate-900">{totalCount}</div>
          <div className="text-[10px] text-slate-500 font-semibold mt-0.5">Tercatat di Firestore</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-emerald-600 uppercase">Selesai Ujian</span>
            <CheckCircle className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="font-display font-black text-2xl text-emerald-700">{finishedCount}</div>
          <div className="text-[10px] text-emerald-600 font-semibold mt-0.5 flex items-center justify-between">
            <span>Siap direset / dibersihkan</span>
            {finishedCount > 0 && (
              <button
                onClick={() => setIsResetModalOpen(true)}
                className="underline font-black hover:text-emerald-800 cursor-pointer"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-blue-600 uppercase">Sedang Mengerjakan</span>
            <Clock className="w-4 h-4 text-blue-500" />
          </div>
          <div className="font-display font-black text-2xl text-blue-700">{inProgressCount}</div>
          <div className="text-[10px] text-blue-500 font-semibold mt-0.5">Sesi aktif saat ini</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-amber-600 uppercase">Pindah Tab (Curang)</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="font-display font-black text-2xl text-amber-700">{tabSwitchViolations}</div>
          <div className="text-[10px] text-amber-600 font-semibold mt-0.5">Siswa terdeteksi</div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama peserta atau sekolah..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Quick Filter */}
          <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold">
            <button
              type="button"
              onClick={() => {
                setStatusFilter('ALL');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                statusFilter === 'ALL'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semua ({totalCount})
            </button>
            <button
              type="button"
              onClick={() => {
                setStatusFilter('IN_PROGRESS');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                statusFilter === 'IN_PROGRESS'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-blue-700'
              }`}
            >
              Aktif ({inProgressCount})
            </button>
            <button
              type="button"
              onClick={() => {
                setStatusFilter('SUBMITTED');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                statusFilter === 'SUBMITTED'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-emerald-700'
              }`}
            >
              Selesai ({finishedCount})
            </button>
          </div>

          <select
            value={examFilter}
            onChange={(e) => {
              setExamFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="ALL">🌐 Semua Ujian</option>
            {exams.map((ex) => (
              <option key={ex.examId} value={ex.examId}>
                {ex.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table of Participants */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 uppercase font-bold text-slate-500">
              <tr>
                <th className="py-3 px-4">No</th>
                <th className="py-3 px-4">Nama Siswa</th>
                <th className="py-3 px-4">Sekolah & Kelas</th>
                <th className="py-3 px-4">Ujian</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-center">Ganti Tab</th>
                <th className="py-3 px-4 text-right">Waktu Mulai</th>
                <th className="py-3 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-semibold">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 font-semibold space-y-2">
                    <Database className="w-8 h-8 text-slate-300 mx-auto" />
                    <div>Belum ada peserta yang aktif atau terdaftar pada filter ini.</div>
                    <p className="text-[11px] text-slate-400">
                      Jumlah peserta saat ini 0. Database bersih dan tidak terbebani dokumen lama.
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedList.map((p, idx) => (
                  <tr key={p.participantId} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">{startIndex + idx + 1}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">
                      <div>{p.name}</div>
                      <span className="text-[10px] text-slate-400 font-mono">{p.participantId}</span>
                    </td>
                    <td className="py-3 px-4">
                      <div>{p.school}</div>
                      <span className="text-[10px] text-slate-400">Kelas {p.grade} SD</span>
                    </td>
                    <td className="py-3 px-4">{getExamTitle(p.examId)}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          p.status === 'SUBMITTED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : p.status === 'IN_PROGRESS'
                            ? 'bg-blue-100 text-blue-800 animate-pulse'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {p.status === 'SUBMITTED' && <CheckCircle className="w-3 h-3" />}
                        {p.status === 'IN_PROGRESS' && <Clock className="w-3 h-3" />}
                        <span>{p.status === 'SUBMITTED' ? 'SELESAI' : p.status}</span>
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {(p.tabSwitchCount || 0) > 0 ? (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-red-100 text-red-800 font-black text-xs">
                          <AlertTriangle className="w-3 h-3 text-red-600" />
                          <span>{p.tabSwitchCount}x</span>
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs font-semibold">0x</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right text-[11px] text-slate-500">
                      {p.startedAt
                        ? new Date(p.startedAt).toLocaleTimeString('id-ID', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '-'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        title="Hapus peserta ini dari database"
                        onClick={() => handleDeleteSingle(p)}
                        disabled={deletingId === p.participantId}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar for 500+ Students */}
        {filtered.length > 0 && (
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 font-semibold">
            <div className="flex items-center space-x-2">
              <span>Menampilkan {startIndex + 1} - {Math.min(startIndex + pageSize, filtered.length)} dari {filtered.length} peserta</span>
              <span className="text-slate-300">|</span>
              <span>Baris per halaman:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-white border border-slate-200 rounded-lg px-2 py-1 font-bold text-slate-700 cursor-pointer"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={200}>200</option>
              </select>
            </div>

            <div className="flex items-center space-x-1.5">
              <button
                type="button"
                disabled={safeCurrentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none font-bold cursor-pointer"
              >
                ← Sebelumnya
              </button>
              <span className="px-3 py-1.5 bg-blue-50 text-blue-800 rounded-xl font-black">
                Hal {safeCurrentPage} dari {totalPages}
              </span>
              <button
                type="button"
                disabled={safeCurrentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none font-bold cursor-pointer"
              >
                Berikutnya →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Reset Participants Modal */}
      <ResetParticipantsModal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        exams={exams}
        participants={participants}
        initialExamId={examFilter}
        onResetSuccess={handleResetSuccess}
      />
    </div>
  );
};
