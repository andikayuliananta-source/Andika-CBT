import React, { useState } from 'react';
import {
  RotateCcw,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Unlock,
  Clock,
  School,
  UserCheck,
  ShieldAlert,
} from 'lucide-react';
import { Exam, Participant } from '../../types';
import { resetStudentSessionByProctor } from '../../services/firebase/proctorService';

interface ResetPesertaTabProps {
  exams: Exam[];
  participants: Participant[];
  selectedExamId: string;
  onSelectExamId: (examId: string) => void;
  onRefreshData: () => Promise<void>;
}

export const ResetPesertaTab: React.FC<ResetPesertaTabProps> = ({
  exams,
  participants,
  selectedExamId,
  onSelectExamId,
  onRefreshData,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'IN_PROGRESS' | 'SUBMITTED'>('ALL');
  const [resettingParticipant, setResettingParticipant] = useState<Participant | null>(null);
  const [processing, setProcessing] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Filter participants
  const filteredParticipants = participants.filter((p) => {
    const matchExam = selectedExamId === 'ALL' || p.examId === selectedExamId;
    const matchSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.school.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = statusFilter === 'ALL' || p.status === statusFilter;
    return matchExam && matchSearch && matchStatus;
  });

  const handleConfirmReset = async () => {
    if (!resettingParticipant) return;

    setProcessing(true);
    try {
      await resetStudentSessionByProctor(
        resettingParticipant.participantId,
        resettingParticipant.examId
      );
      setNotification({
        type: 'success',
        message: `Sesi login untuk siswa "${resettingParticipant.name}" berhasil direset! Siswa dapat login kembali dan seluruh jawaban sebelumnya tetap tersimpan utuh.`,
      });
      setResettingParticipant(null);
      await onRefreshData();
      setTimeout(() => setNotification(null), 6000);
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err?.message || 'Gagal mereset sesi peserta.',
      });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Information Banner */}
      <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 border border-emerald-200 rounded-3xl p-6 sm:p-7 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-display font-black text-2xl shadow-xs shrink-0">
            🔄
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="font-display font-black text-xl sm:text-2xl text-slate-800">
                Reset Sesi & Buka Kunci Peserta
              </h2>
              <span className="bg-emerald-100 text-emerald-800 text-[11px] font-black px-2.5 py-0.5 rounded-full uppercase">
                Aman & Tanpa Hapus Jawaban
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 font-medium mt-1 leading-relaxed max-w-2xl">
              Gunakan fitur ini jika komputer siswa mati mendadak, browser ter-restart, atau siswa tidak sengaja keluar/terkunci. Seluruh jawaban yang telah dikerjakan siswa tetap <strong>100% aman tersimpan</strong> di sistem cloud.
            </p>
          </div>
        </div>

        <div className="text-right shrink-0">
          <div className="text-[11px] text-emerald-800 font-extrabold bg-white/80 border border-emerald-200 px-3.5 py-2 rounded-2xl inline-block shadow-2xs">
            🛡️ Wewenang Proktor Ruang Ujian
          </div>
        </div>
      </div>

      {/* Notifications */}
      {notification && (
        <div
          className={`p-4 rounded-2xl text-xs sm:text-sm font-bold flex items-center space-x-3 border animate-in fade-in ${
            notification.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : 'bg-red-50 text-red-900 border-red-200'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
          )}
          <span className="flex-1">{notification.message}</span>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-slate-700 text-sm font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Filter and Control Bar */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-center gap-3 flex-1">
          {/* Exam Selector */}
          <div className="w-full sm:w-64 shrink-0">
            <select
              value={selectedExamId}
              onChange={(e) => onSelectExamId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-800 focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="ALL">🔍 Semua Ujian Aktif</option>
              {exams.map((ex) => (
                <option key={ex.examId} value={ex.examId}>
                  {ex.title} ({ex.token})
                </option>
              ))}
            </select>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nama siswa atau sekolah..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-emerald-500 focus:bg-white transition-all font-medium"
            />
          </div>
        </div>

        {/* Status Filter Buttons */}
        <div className="flex items-center space-x-2 shrink-0">
          <span className="text-xs text-slate-400 font-bold hidden sm:inline">Status:</span>
          {(['ALL', 'IN_PROGRESS', 'SUBMITTED'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                statusFilter === st
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st === 'ALL' ? 'Semua' : st === 'IN_PROGRESS' ? 'Sedang Mengerjakan' : 'Selesai'}
            </button>
          ))}
        </div>
      </div>

      {/* Participants Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        {filteredParticipants.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto text-2xl">
              🧑‍🎓
            </div>
            <h3 className="font-display font-black text-slate-700 text-base">
              Tidak Ada Peserta yang Ditemukan
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto font-medium">
              Pastikan siswa telah memasukkan token ujian di perangkat mereka.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-black uppercase text-[11px] tracking-wider">
                  <th className="py-3.5 px-4 sm:px-6">Nama Siswa & Sekolah</th>
                  <th className="py-3.5 px-4">Ujian</th>
                  <th className="py-3.5 px-4">Waktu Mulai</th>
                  <th className="py-3.5 px-4 text-center">Status Sesi</th>
                  <th className="py-3.5 px-4 text-center">Pelanggaran</th>
                  <th className="py-3.5 px-4 text-right sm:pr-6">Aksi Proktor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredParticipants.map((p) => {
                  const examObj = exams.find((e) => e.examId === p.examId);
                  const isSubmitted = p.status === 'SUBMITTED';
                  const isSwitched = (p.tabSwitchCount || 0) > 0;

                  return (
                    <tr key={p.participantId} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-4 px-4 sm:px-6">
                        <div className="flex items-center space-x-3">
                          <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 font-display font-black flex items-center justify-center shrink-0">
                            🎓
                          </div>
                          <div>
                            <div className="font-bold text-slate-900">{p.name}</div>
                            <div className="text-[11px] text-slate-500 flex items-center space-x-1">
                              <School className="w-3 h-3 text-slate-400" />
                              <span>{p.school}</span>
                              <span>• Kelas {p.grade}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        <div className="font-bold text-slate-800 text-xs">
                          {examObj?.title || p.examId}
                        </div>
                        {examObj?.token && (
                          <div className="text-[10px] text-slate-400 font-mono">
                            Token: {examObj.token}
                          </div>
                        )}
                      </td>

                      <td className="py-4 px-4 text-slate-600 font-medium">
                        <div className="flex items-center space-x-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>
                            {p.startedAt
                              ? new Date(p.startedAt).toLocaleTimeString('id-ID', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : '-'}
                          </span>
                        </div>
                      </td>

                      <td className="py-4 px-4 text-center">
                        <span
                          className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-black ${
                            isSubmitted
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-emerald-100 text-emerald-800 animate-pulse'
                          }`}
                        >
                          {isSubmitted ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                              <span>Selesai</span>
                            </>
                          ) : (
                            <>
                              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                              <span>Mengerjakan</span>
                            </>
                          )}
                        </span>
                      </td>

                      <td className="py-4 px-4 text-center">
                        {isSwitched ? (
                          <span className="inline-flex items-center space-x-1 bg-red-100 text-red-700 px-2 py-0.5 rounded-md text-xs font-black">
                            <ShieldAlert className="w-3.5 h-3.5 text-red-600" />
                            <span>{p.tabSwitchCount}x Pindah Tab</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs font-semibold">Tertib (0)</span>
                        )}
                      </td>

                      <td className="py-4 px-4 text-right sm:pr-6">
                        <button
                          type="button"
                          onClick={() => setResettingParticipant(p)}
                          className="bg-amber-500 hover:bg-amber-600 text-white px-3.5 py-2 rounded-xl text-xs font-display font-extrabold shadow-2xs hover:shadow-sm transition-all inline-flex items-center space-x-1.5 cursor-pointer"
                          title="Buka kunci sesi siswa tanpa menghapus jawaban"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Reset Sesi</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Confirmation Modal for Resetting Session */}
      {resettingParticipant && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 space-y-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center text-3xl mx-auto shadow-xs">
              ⚡
            </div>

            <div className="space-y-1">
              <h3 className="font-display font-black text-lg sm:text-xl text-slate-900">
                Konfirmasi Reset Sesi Siswa
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Peringatan keamanan ruang ujian CBT CERIA
              </p>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-left space-y-2">
              <div className="text-xs font-black text-amber-950 flex items-center space-x-1.5">
                <UserCheck className="w-4 h-4 text-amber-700" />
                <span>
                  {resettingParticipant.name} ({resettingParticipant.school})
                </span>
              </div>
              <p className="text-[11px] text-amber-800 leading-relaxed font-medium">
                Tindakan ini akan <strong>membuka kembali kunci login</strong> peserta sehingga siswa dapat masuk kembali ke ujian menggunakan token yang sama.
              </p>
              <div className="bg-white/90 p-2.5 rounded-xl border border-amber-300 text-[11px] text-emerald-800 font-bold flex items-center space-x-2">
                <span className="text-base">💾</span>
                <span>Seluruh jawaban yang telah diisi siswa TETAP AMAN dan TIDAK AKAN DIHAPUS.</span>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end space-x-2">
              <button
                type="button"
                disabled={processing}
                onClick={() => setResettingParticipant(null)}
                className="px-4 py-2.5 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={processing}
                onClick={handleConfirmReset}
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-display font-black shadow-sm transition-all flex items-center space-x-2 cursor-pointer disabled:opacity-60"
              >
                {processing ? (
                  <RotateCcw className="w-4 h-4 animate-spin" />
                ) : (
                  <Unlock className="w-4 h-4" />
                )}
                <span>Buka Kunci & Izinkan Masuk</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
