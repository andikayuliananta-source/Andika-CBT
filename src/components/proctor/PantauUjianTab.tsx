import React, { useState, useEffect } from 'react';
import {
  Users,
  Activity,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  RefreshCw,
  AlertTriangle,
  Radio,
  School,
  GraduationCap,
  ShieldAlert,
} from 'lucide-react';
import { Exam, Participant } from '../../types';

interface PantauUjianTabProps {
  exams: Exam[];
  participants: Participant[];
  selectedExamId: string;
  onSelectExamId: (examId: string) => void;
  onRefreshData: () => Promise<void>;
  onNavigateToReset?: (participant: Participant) => void;
}

export const PantauUjianTab: React.FC<PantauUjianTabProps> = ({
  exams,
  participants,
  selectedExamId,
  onSelectExamId,
  onRefreshData,
  onNavigateToReset,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isLiveActive, setIsLiveActive] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Auto-refresh interval (every 12 seconds for live monitoring)
  useEffect(() => {
    if (!isLiveActive) return;
    const interval = setInterval(() => {
      onRefreshData().catch(() => {});
    }, 12000);
    return () => clearInterval(interval);
  }, [isLiveActive, onRefreshData]);

  const handleManualRefresh = async () => {
    setRefreshing(true);
    try {
      await onRefreshData();
    } finally {
      setRefreshing(false);
    }
  };

  // Filter participants
  const filteredParticipants = participants.filter((p) => {
    const matchExam = selectedExamId === 'ALL' || p.examId === selectedExamId;
    const matchSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.school.toLowerCase().includes(searchQuery.toLowerCase());
    return matchExam && matchSearch;
  });

  // Calculate statistics
  const totalCount = filteredParticipants.length;
  const inProgressCount = filteredParticipants.filter((p) => p.status === 'IN_PROGRESS').length;
  const submittedCount = filteredParticipants.filter((p) => p.status === 'SUBMITTED').length;
  const violationCount = filteredParticipants.filter((p) => (p.tabSwitchCount || 0) > 0).length;

  return (
    <div className="space-y-6">
      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Peserta */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center text-xl shrink-0">
            👥
          </div>
          <div>
            <div className="text-2xl font-display font-black text-slate-900">{totalCount}</div>
            <div className="text-xs text-slate-500 font-bold">Total Peserta</div>
          </div>
        </div>

        {/* Sedang Mengerjakan */}
        <div className="bg-white rounded-3xl p-5 border border-emerald-200 shadow-xs flex items-center space-x-4 bg-gradient-to-br from-white to-emerald-50/40">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center text-xl shrink-0 shadow-xs animate-pulse">
            ✍️
          </div>
          <div>
            <div className="text-2xl font-display font-black text-emerald-800">{inProgressCount}</div>
            <div className="text-xs text-emerald-700 font-bold flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              <span>Sedang Mengerjakan</span>
            </div>
          </div>
        </div>

        {/* Selesai / Dikirim */}
        <div className="bg-white rounded-3xl p-5 border border-blue-200 shadow-xs flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center text-xl shrink-0 shadow-xs">
            🏁
          </div>
          <div>
            <div className="text-2xl font-display font-black text-blue-900">{submittedCount}</div>
            <div className="text-xs text-slate-500 font-bold">Ujian Selesai</div>
          </div>
        </div>

        {/* Pelanggaran / Pindah Tab */}
        <div className="bg-white rounded-3xl p-5 border border-amber-200 shadow-xs flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center text-xl shrink-0">
            ⚠️
          </div>
          <div>
            <div className="text-2xl font-display font-black text-amber-900">{violationCount}</div>
            <div className="text-xs text-slate-500 font-bold">Peringatan Pindah Tab</div>
          </div>
        </div>
      </div>

      {/* Control & Live Indicator Bar */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-center gap-3 flex-1">
          {/* Exam Filter */}
          <div className="w-full sm:w-64">
            <select
              value={selectedExamId}
              onChange={(e) => onSelectExamId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-800 focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="ALL">🔍 Pantau Semua Ujian</option>
              {exams.map((ex) => (
                <option key={ex.examId} value={ex.examId}>
                  {ex.title} ({ex.token})
                </option>
              ))}
            </select>
          </div>

          {/* Search Field */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nama peserta..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-emerald-500 focus:bg-white font-medium"
            />
          </div>
        </div>

        {/* Live Tracking Controls */}
        <div className="flex items-center space-x-3 self-end md:self-auto">
          <button
            type="button"
            onClick={() => setIsLiveActive(!isLiveActive)}
            className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center space-x-1.5 cursor-pointer transition-colors ${
              isLiveActive
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                : 'bg-slate-100 text-slate-500'
            }`}
            title="Klik untuk menyalakan/mematikan pembaruan otomatis"
          >
            <Radio className={`w-3.5 h-3.5 ${isLiveActive ? 'text-emerald-600 animate-pulse' : ''}`} />
            <span>{isLiveActive ? 'Live Auto-Sync (12s)' : 'Sinkronisasi Manual'}</span>
          </button>

          <button
            type="button"
            onClick={handleManualRefresh}
            className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
            title="Segarkan data sekarang"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-emerald-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Real-time Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        {filteredParticipants.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto text-2xl">
              📡
            </div>
            <h3 className="font-display font-black text-slate-700 text-base">
              Tidak Ada Aktivitas Siswa
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto font-medium">
              Siswa yang sedang memasukkan token dan membuka lembar ujian akan muncul secara otomatis di tabel monitoring ini.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-black uppercase text-[11px] tracking-wider">
                  <th className="py-3.5 px-4 sm:px-6">Peserta</th>
                  <th className="py-3.5 px-4">Ujian & Token</th>
                  <th className="py-3.5 px-4">Waktu Mulai</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-center">Integritas Ujian</th>
                  <th className="py-3.5 px-4 text-right sm:pr-6">Kondisi Sesi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredParticipants.map((p) => {
                  const examObj = exams.find((e) => e.examId === p.examId);
                  const isSubmitted = p.status === 'SUBMITTED';
                  const tabSwitches = p.tabSwitchCount || 0;

                  return (
                    <tr key={p.participantId} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-4 px-4 sm:px-6">
                        <div className="flex items-center space-x-3">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center font-display font-black shrink-0 ${
                              isSubmitted
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {isSubmitted ? '✔️' : '📝'}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900">{p.name}</div>
                            <div className="text-[11px] text-slate-500">
                              {p.school} • Kelas {p.grade}
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
                        {p.finishedAt && (
                          <div className="text-[10px] text-blue-600 font-semibold">
                            Selesai:{' '}
                            {new Date(p.finishedAt).toLocaleTimeString('id-ID', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        )}
                      </td>

                      <td className="py-4 px-4 text-center">
                        <span
                          className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-[11px] font-black ${
                            isSubmitted
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-emerald-100 text-emerald-800 animate-pulse'
                          }`}
                        >
                          {isSubmitted ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                              <span>Selesai Mengerjakan</span>
                            </>
                          ) : (
                            <>
                              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                              <span>Sedang Mengerjakan</span>
                            </>
                          )}
                        </span>
                      </td>

                      <td className="py-4 px-4 text-center">
                        {tabSwitches > 0 ? (
                          <span className="inline-flex items-center space-x-1 bg-red-100 text-red-700 px-2.5 py-0.5 rounded-md text-xs font-black">
                            <ShieldAlert className="w-3.5 h-3.5 text-red-600" />
                            <span>{tabSwitches}x Pindah Jendela</span>
                          </span>
                        ) : (
                          <span className="text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md text-xs font-bold border border-emerald-200">
                            Fokus di Layar Ujian
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-4 text-right sm:pr-6">
                        <span className="text-xs font-bold text-slate-500">
                          {isSubmitted ? (
                            <span className="text-blue-700">Terkirim ke Server</span>
                          ) : (
                            <span className="text-emerald-700 font-extrabold">Online / Aktif</span>
                          )}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
