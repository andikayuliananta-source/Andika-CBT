import React from 'react';
import { BookOpen, FileQuestion, Users, Trophy, Plus, ArrowRight, Copy, Check, ExternalLink, RotateCcw, Database } from 'lucide-react';
import { Exam, Result, Participant } from '../../types';
import { TeacherTab } from './TeacherSidebar';
import { ScoreDistributionChart } from './ScoreDistributionChart';

interface DashboardOverviewProps {
  exams: Exam[];
  totalQuestionsCount: number;
  participants: Participant[];
  results: Result[];
  onNavigateTab: (tab: TeacherTab) => void;
  onOpenCreateExam: () => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  exams,
  totalQuestionsCount,
  participants,
  results,
  onNavigateTab,
  onOpenCreateExam,
}) => {
  const [copiedToken, setCopiedToken] = React.useState<string | null>(null);

  // Compute stats
  const totalExams = exams.length;
  const totalParticipants = participants.length;
  const finishedParticipantsCount = participants.filter(
    (p) => p.status === 'SUBMITTED' || p.status === 'TIMEOUT'
  ).length;
  const averageScore =
    results.length > 0
      ? Math.round(results.reduce((acc, curr) => acc + curr.score, 0) / results.length)
      : 0;

  const handleCopyToken = (token: string) => {
    navigator.clipboard.writeText(token);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-amber-500 rounded-3xl p-6 sm:p-8 text-white shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <h2 className="font-display text-2xl sm:text-3xl font-black">
            Selamat datang, Guru! 👋
          </h2>
          <p className="text-blue-100 text-xs sm:text-sm font-semibold max-w-xl">
            Pantau dan kelola seluruh aktivitas penilaian online SD dengan mudah, cepat, dan terpercaya di portal CBT CERIA.
          </p>
        </div>

        <button
          id="dash-create-exam-btn"
          onClick={onOpenCreateExam}
          className="bg-white text-blue-900 hover:bg-blue-50 font-display font-extrabold text-sm px-5 py-3 rounded-2xl shadow-sm transition-all flex items-center space-x-2 shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4 text-blue-600" />
          <span>Tambah Ujian Baru</span>
        </button>
      </div>

      {/* 4 STATS CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Ujian */}
        <div
          onClick={() => onNavigateTab('exams')}
          className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:border-blue-300 transition-all cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center text-xl mb-3 group-hover:scale-110 transition-transform">
            📚
          </div>
          <div className="text-2xl sm:text-3xl font-display font-black text-slate-900">
            {totalExams}
          </div>
          <div className="text-xs font-bold text-slate-500 mt-0.5">
            Total Ujian
          </div>
        </div>

        {/* Total Soal */}
        <div
          onClick={() => onNavigateTab('questions')}
          className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:border-amber-300 transition-all cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center text-xl mb-3 group-hover:scale-110 transition-transform">
            📝
          </div>
          <div className="text-2xl sm:text-3xl font-display font-black text-slate-900">
            {totalQuestionsCount}
          </div>
          <div className="text-xs font-bold text-slate-500 mt-0.5">
            Total Soal
          </div>
        </div>

        {/* Total Peserta */}
        <div
          onClick={() => onNavigateTab('participants')}
          className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:border-purple-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
              👨‍🎓
            </div>
            {finishedParticipantsCount > 0 && (
              <span className="bg-emerald-50 text-emerald-700 text-[10px] font-black px-2 py-0.5 rounded-full border border-emerald-200">
                {finishedParticipantsCount} Selesai
              </span>
            )}
          </div>
          <div className="text-2xl sm:text-3xl font-display font-black text-slate-900">
            {totalParticipants}
          </div>
          <div className="text-xs font-bold text-slate-500 mt-0.5 flex items-center justify-between">
            <span>Total Peserta</span>
            <span className="text-[10px] text-blue-600 group-hover:underline">Kelola & Reset</span>
          </div>
        </div>

        {/* Rata-rata Nilai */}
        <div
          onClick={() => onNavigateTab('results')}
          className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:border-emerald-300 transition-all cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-xl mb-3 group-hover:scale-110 transition-transform">
            🏆
          </div>
          <div className="text-2xl sm:text-3xl font-display font-black text-slate-900">
            {averageScore}
          </div>
          <div className="text-xs font-bold text-slate-500 mt-0.5">
            Rata-rata Nilai
          </div>
        </div>
      </div>

      {/* QUICK ACTIONS BANNER */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          onClick={() => onNavigateTab('questions')}
          className="bg-white p-4 rounded-2xl border border-slate-200 hover:border-amber-400 hover:bg-amber-50/20 text-left transition-all flex items-center justify-between"
        >
          <div>
            <div className="font-bold text-sm text-slate-900">📝 Bank Soal</div>
            <div className="text-xs text-slate-500 mt-0.5">Kelola butir soal & kunci</div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400" />
        </button>

        <button
          onClick={() => onNavigateTab('import')}
          className="bg-white p-4 rounded-2xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/20 text-left transition-all flex items-center justify-between"
        >
          <div>
            <div className="font-bold text-sm text-slate-900">📥 Import Excel</div>
            <div className="text-xs text-slate-500 mt-0.5">Upload soal sekaligus</div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400" />
        </button>

        <button
          onClick={() => onNavigateTab('results')}
          className="bg-white p-4 rounded-2xl border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/20 text-left transition-all flex items-center justify-between"
        >
          <div>
            <div className="font-bold text-sm text-slate-900">📊 Hasil & Nilai</div>
            <div className="text-xs text-slate-500 mt-0.5">Rekapitulasi & Export PDF/Excel</div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400" />
        </button>
      </div>

      {/* Database Maintenance Banner */}
      {finishedParticipantsCount > 0 && (
        <div className="bg-amber-50/90 border border-amber-200 rounded-3xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-slate-900 flex items-center space-x-2">
                <span>Terdapat {finishedParticipantsCount} peserta yang telah menyelesaikan ujian</span>
                <span className="bg-amber-100 text-amber-800 text-[10px] px-2 py-0.5 rounded-full font-extrabold">
                  Optimalisasi Database
                </span>
              </div>
              <p className="text-slate-600 text-[11px] font-medium mt-0.5">
                Reset peserta kembali ke 0 untuk mengosongkan riwayat jawaban selesai dan menjaga kuota database Firestore tetap hemat.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigateTab('participants')}
            className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-display font-extrabold text-xs rounded-xl shadow-xs transition-colors flex items-center space-x-1.5 shrink-0 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset Peserta Selesai</span>
          </button>
        </div>
      )}

      {/* VISUALISASI DISTRIBUSI NILAI SISWA */}
      <ScoreDistributionChart results={results} exams={exams} />

      {/* RECENT EXAMS TABLE */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display font-black text-lg text-slate-900">
              Daftar Ujian Terbaru
            </h3>
            <p className="text-xs text-slate-500 font-semibold">
              Status ujian, token siswa, dan ringkasan pengelolaan
            </p>
          </div>
          <button
            onClick={() => onNavigateTab('exams')}
            className="text-xs font-bold text-blue-600 hover:underline flex items-center space-x-1"
          >
            <span>Lihat Semua Ujian</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-bold uppercase tracking-wider">
                <th className="py-3 px-4">Nama Ujian</th>
                <th className="py-3 px-4">Mata Pelajaran</th>
                <th className="py-3 px-4">Kelas</th>
                <th className="py-3 px-4">Token Siswa</th>
                <th className="py-3 px-4">Durasi</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-semibold">
              {exams.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 font-semibold">
                    Belum ada ujian yang dibuat. Silakan buat ujian baru!
                  </td>
                </tr>
              ) : (
                exams.slice(0, 5).map((ex) => (
                  <tr key={ex.examId} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      {ex.title}
                    </td>
                    <td className="py-3.5 px-4">{ex.subject}</td>
                    <td className="py-3.5 px-4">
                      <span className="bg-amber-100 text-amber-900 px-2 py-0.5 rounded font-bold text-[11px]">
                        Kelas {ex.grade} SD
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => handleCopyToken(ex.token)}
                        title="Salin Token"
                        className="inline-flex items-center space-x-1 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-lg font-mono font-bold text-slate-800 transition-colors"
                      >
                        <span>{ex.token}</span>
                        {copiedToken === ex.token ? (
                          <Check className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <Copy className="w-3 h-3 text-slate-400" />
                        )}
                      </button>
                    </td>
                    <td className="py-3.5 px-4">{ex.durationMinutes} Menit</td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          ex.status === 'ACTIVE'
                            ? 'bg-emerald-100 text-emerald-800'
                            : ex.status === 'DRAFT'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {ex.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => onNavigateTab('questions')}
                        className="text-blue-600 hover:text-blue-800 font-bold text-xs"
                      >
                        Kelola Soal
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
