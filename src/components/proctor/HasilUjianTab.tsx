import React, { useState } from 'react';
import {
  Download,
  Search,
  Filter,
  Trophy,
  CheckCircle2,
  XCircle,
  FileSpreadsheet,
  Calendar,
  School,
  GraduationCap,
  Sparkles,
  BarChart,
} from 'lucide-react';
import { Exam, Result } from '../../types';

interface HasilUjianTabProps {
  exams: Exam[];
  results: Result[];
  selectedExamId: string;
  onSelectExamId: (examId: string) => void;
}

export const HasilUjianTab: React.FC<HasilUjianTabProps> = ({
  exams,
  results,
  selectedExamId,
  onSelectExamId,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [passFilter, setPassFilter] = useState<'ALL' | 'LULUS' | 'BELUM LULUS'>('ALL');

  // Filter results
  const filteredResults = results.filter((r) => {
    const matchExam = selectedExamId === 'ALL' || r.examId === selectedExamId;
    const matchSearch =
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.school.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = passFilter === 'ALL' || r.status === passFilter;
    return matchExam && matchSearch && matchStatus;
  });

  // Analytics summary
  const totalStudents = filteredResults.length;
  const passedStudents = filteredResults.filter((r) => r.status === 'LULUS').length;
  const failedStudents = filteredResults.filter((r) => r.status === 'BELUM LULUS').length;
  const averageScore =
    totalStudents > 0
      ? Math.round(filteredResults.reduce((acc, curr) => acc + (curr.score || 0), 0) / totalStudents)
      : 0;
  const highestScore =
    totalStudents > 0 ? Math.max(...filteredResults.map((r) => r.score || 0)) : 0;

  // Export to CSV / Excel helper
  const handleExportCSV = () => {
    if (filteredResults.length === 0) {
      alert('Tidak ada data hasil ujian untuk diunduh.');
      return;
    }

    const headers = [
      'No',
      'Nama Siswa',
      'Asal Sekolah',
      'Kelas',
      'ID Ujian',
      'Judul Ujian',
      'Nilai Akhir',
      'Status Kelulusan',
      'Jawaban Benar',
      'Jawaban Salah',
      'Total Soal',
      'Waktu Selesai',
    ];

    const rows = filteredResults.map((r, idx) => {
      const exObj = exams.find((e) => e.examId === r.examId);
      const finishedDate = r.finishedAt
        ? new Date(r.finishedAt).toLocaleString('id-ID')
        : '-';

      return [
        idx + 1,
        `"${r.name.replace(/"/g, '""')}"`,
        `"${r.school.replace(/"/g, '""')}"`,
        `"${r.grade}"`,
        `"${r.examId}"`,
        `"${(exObj?.title || r.examId).replace(/"/g, '""')}"`,
        r.score,
        `"${r.status}"`,
        r.correctAnswers,
        r.wrongAnswers,
        r.totalQuestions,
        `"${finishedDate}"`,
      ].join(',');
    });

    // Add UTF-8 BOM so Excel opens Indonesian characters cleanly
    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    const cleanDate = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.setAttribute('download', `Rekap_Nilai_CBT_CERIA_${cleanDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Hasil */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center text-xl shrink-0">
            📊
          </div>
          <div>
            <div className="text-2xl font-display font-black text-slate-900">{totalStudents}</div>
            <div className="text-xs text-slate-500 font-bold">Total Nilai Masuk</div>
          </div>
        </div>

        {/* Rata-Rata Nilai */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center text-xl shrink-0">
            ⭐
          </div>
          <div>
            <div className="text-2xl font-display font-black text-slate-900">{averageScore}</div>
            <div className="text-xs text-slate-500 font-bold">Rata-Rata Nilai</div>
          </div>
        </div>

        {/* Lulus KKM */}
        <div className="bg-white rounded-3xl p-5 border border-emerald-200 shadow-xs flex items-center space-x-4 bg-emerald-50/30">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center text-xl shrink-0 shadow-xs">
            🎉
          </div>
          <div>
            <div className="text-2xl font-display font-black text-emerald-800">{passedStudents}</div>
            <div className="text-xs text-emerald-700 font-bold">Siswa Lulus KKM</div>
          </div>
        </div>

        {/* Nilai Tertinggi */}
        <div className="bg-white rounded-3xl p-5 border border-purple-200 shadow-xs flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center text-xl shrink-0">
            🏆
          </div>
          <div>
            <div className="text-2xl font-display font-black text-purple-900">{highestScore}</div>
            <div className="text-xs text-slate-500 font-bold">Nilai Tertinggi</div>
          </div>
        </div>
      </div>

      {/* Control and Filter Bar */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-center gap-3 flex-1">
          {/* Exam Filter */}
          <div className="w-full sm:w-64">
            <select
              value={selectedExamId}
              onChange={(e) => onSelectExamId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-800 focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="ALL">🔍 Semua Rekap Ujian</option>
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
              placeholder="Cari nama siswa / sekolah..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-emerald-500 focus:bg-white font-medium"
            />
          </div>
        </div>

        {/* Right side: Status Filter + Export Button */}
        <div className="flex items-center space-x-2 shrink-0 self-end lg:self-auto">
          <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl">
            {(['ALL', 'LULUS', 'BELUM LULUS'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setPassFilter(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  passFilter === st
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {st === 'ALL' ? 'Semua' : st === 'LULUS' ? 'Lulus' : 'Belum Lulus'}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleExportCSV}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-xs sm:text-sm font-display font-extrabold shadow-sm transition-all flex items-center space-x-2 cursor-pointer"
            title="Unduh rekapitulasi nilai format CSV untuk Microsoft Excel"
          >
            <Download className="w-4 h-4" />
            <span>Unduh Excel / CSV</span>
          </button>
        </div>
      </div>

      {/* Results Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        {filteredResults.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto text-2xl">
              📝
            </div>
            <h3 className="font-display font-black text-slate-700 text-base">
              Belum Ada Nilai yang Terkumpul
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto font-medium">
              Hasil ujian akan tercatat otomatis saat siswa menekan tombol "Kirim Jawaban" atau batas waktu ujian berakhir.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-black uppercase text-[11px] tracking-wider">
                  <th className="py-3.5 px-4 sm:px-6">Peringkat & Siswa</th>
                  <th className="py-3.5 px-4">Ujian</th>
                  <th className="py-3.5 px-4 text-center">Jawaban Benar / Salah</th>
                  <th className="py-3.5 px-4 text-center">Skor Akhir</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right sm:pr-6">Waktu Selesai</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredResults.map((r, idx) => {
                  const examObj = exams.find((e) => e.examId === r.examId);
                  const isPassed = r.status === 'LULUS';

                  return (
                    <tr key={r.resultId} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-4 px-4 sm:px-6">
                        <div className="flex items-center space-x-3">
                          <span className="w-6 text-center font-display font-black text-slate-400 text-xs">
                            #{idx + 1}
                          </span>
                          <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 font-display font-black flex items-center justify-center shrink-0">
                            🎓
                          </div>
                          <div>
                            <div className="font-bold text-slate-900">{r.name}</div>
                            <div className="text-[11px] text-slate-500">
                              {r.school} • Kelas {r.grade}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        <div className="font-bold text-slate-800 text-xs">
                          {examObj?.title || r.examId}
                        </div>
                        {examObj?.kkm && (
                          <div className="text-[10px] text-slate-400">
                            KKM: <strong className="text-slate-600">{examObj.kkm}</strong>
                          </div>
                        )}
                      </td>

                      <td className="py-4 px-4 text-center">
                        <div className="inline-flex items-center space-x-2 text-xs font-bold">
                          <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            ✓ {r.correctAnswers} Benar
                          </span>
                          <span className="text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                            ✗ {r.wrongAnswers} Salah
                          </span>
                        </div>
                      </td>

                      <td className="py-4 px-4 text-center">
                        <span className="font-display font-black text-lg text-slate-900">
                          {r.score}
                        </span>
                        <span className="text-[10px] text-slate-400 font-bold block">/ 100</span>
                      </td>

                      <td className="py-4 px-4 text-center">
                        <span
                          className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-[11px] font-black ${
                            isPassed
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {isPassed ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>LULUS</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3.5 h-3.5 text-red-600" />
                              <span>BELUM LULUS</span>
                            </>
                          )}
                        </span>
                      </td>

                      <td className="py-4 px-4 text-right sm:pr-6 text-slate-500 font-medium text-xs">
                        {r.finishedAt
                          ? new Date(r.finishedAt).toLocaleTimeString('id-ID', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '-'}
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
