import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  PieChart,
  Pie,
  Legend,
} from 'recharts';
import {
  BarChart3,
  PieChart as PieIcon,
  Award,
  Users,
  TrendingUp,
  Filter,
  LayoutGrid,
  GraduationCap,
  Sparkles,
} from 'lucide-react';
import { Result, Exam } from '../../types';

interface ScoreDistributionChartProps {
  results: Result[];
  exams?: Exam[];
  selectedExamId?: string;
  onSelectExamId?: (examId: string) => void;
  kkmThreshold?: number;
}

export const ScoreDistributionChart: React.FC<ScoreDistributionChartProps> = ({
  results,
  exams = [],
  selectedExamId = 'ALL',
  onSelectExamId,
  kkmThreshold = 75,
}) => {
  const [chartType, setChartType] = useState<'bar' | 'pie' | 'both' | 'comparison'>('both');
  const [activeExamFilter, setActiveExamFilter] = useState<string>(selectedExamId);
  const [activeGradeFilter, setActiveGradeFilter] = useState<string>('ALL');

  // Sync internal filter if prop changes
  React.useEffect(() => {
    setActiveExamFilter(selectedExamId);
  }, [selectedExamId]);

  const handleExamChange = (newExamId: string) => {
    setActiveExamFilter(newExamId);
    if (onSelectExamId) {
      onSelectExamId(newExamId);
    }
  };

  // Filtered dataset for the chart
  const relevantResults = useMemo(() => {
    return results.filter((r) => {
      const matchExam = activeExamFilter === 'ALL' || r.examId === activeExamFilter;
      const matchGrade = activeGradeFilter === 'ALL' || r.grade === activeGradeFilter;
      return matchExam && matchGrade;
    });
  }, [results, activeExamFilter, activeGradeFilter]);

  // Current active exam details for KKM if specific exam is picked
  const effectiveKKM = useMemo(() => {
    if (activeExamFilter !== 'ALL') {
      const found = exams.find((e) => e.examId === activeExamFilter);
      if (found && found.kkm) return found.kkm;
    }
    return kkmThreshold;
  }, [activeExamFilter, exams, kkmThreshold]);

  // 1. Histogram / Range Distribution Data (Bar Chart)
  const rangeDistributionData = useMemo(() => {
    const bins = [
      { range: '0 - 49', label: 'Perlu Bimbingan', min: 0, max: 49, count: 0, color: '#f43f5e' }, // Rose 500
      { range: '50 - 69', label: 'Cukup', min: 50, max: 69, count: 0, color: '#f97316' }, // Orange 500
      { range: '70 - 79', label: 'Baik', min: 70, max: 79, count: 0, color: '#eab308' }, // Yellow 500
      { range: '80 - 89', label: 'Sangat Baik', min: 80, max: 89, count: 0, color: '#3b82f6' }, // Blue 500
      { range: '90 - 100', label: 'Istimewa', min: 90, max: 100, count: 0, color: '#10b981' }, // Emerald 500
    ];

    relevantResults.forEach((r) => {
      const score = Math.max(0, Math.min(100, r.score));
      const bin = bins.find((b) => score >= b.min && score <= b.max) || bins[0];
      bin.count += 1;
    });

    const total = relevantResults.length;
    return bins.map((b) => ({
      ...b,
      percentage: total > 0 ? Math.round((b.count / total) * 100) : 0,
    }));
  }, [relevantResults]);

  // 2. Mastery / Ketuntasan Data (Pie Chart)
  const masteryPieData = useMemo(() => {
    const passedCount = relevantResults.filter((r) => r.score >= effectiveKKM).length;
    const failedCount = relevantResults.length - passedCount;
    const total = relevantResults.length;

    return [
      {
        name: `Lulus (≥${effectiveKKM})`,
        value: passedCount,
        percentage: total > 0 ? Math.round((passedCount / total) * 100) : 0,
        color: '#10b981', // emerald-500
      },
      {
        name: `Belum Lulus (<${effectiveKKM})`,
        value: failedCount,
        percentage: total > 0 ? Math.round((failedCount / total) * 100) : 0,
        color: '#f97316', // orange-500
      },
    ];
  }, [relevantResults, effectiveKKM]);

  // 3. Average Score by Grade Level (Kelas 1 - 6)
  const gradeComparisonData = useMemo(() => {
    const grades = ['1', '2', '3', '4', '5', '6'] as const;
    return grades
      .map((g) => {
        const gradeResults = results.filter((r) => {
          const matchExam = activeExamFilter === 'ALL' || r.examId === activeExamFilter;
          return matchExam && r.grade === g;
        });
        const count = gradeResults.length;
        const avg =
          count > 0
            ? Math.round(gradeResults.reduce((acc, curr) => acc + curr.score, 0) / count)
            : 0;
        return {
          grade: `Kelas ${g}`,
          rataRata: avg,
          jumlahSiswa: count,
          color: '#6366f1', // indigo-500
        };
      })
      .filter((d) => d.jumlahSiswa > 0);
  }, [results, activeExamFilter]);

  // Quick summary numbers
  const totalStudents = relevantResults.length;
  const scores = relevantResults.map((r) => r.score);
  const avgScore =
    totalStudents > 0
      ? Math.round(relevantResults.reduce((acc, curr) => acc + curr.score, 0) / totalStudents)
      : 0;
  const highestScore = scores.length > 0 ? Math.max(...scores) : 0;
  const lowestScore = scores.length > 0 ? Math.min(...scores) : 0;
  const passRate =
    totalStudents > 0
      ? Math.round(
          (relevantResults.filter((r) => r.score >= effectiveKKM).length / totalStudents) * 100
        )
      : 0;

  // Reusable Bar Chart Component
  const renderBarChart = (isSplit = false) => (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs">
        <span className="font-bold text-slate-800 flex items-center space-x-1.5">
          <BarChart3 className="w-4 h-4 text-indigo-600" />
          <span>Distribusi Skor per Kategori:</span>
        </span>
        <span className="text-slate-500 font-semibold">{totalStudents} Siswa Terdata</span>
      </div>

      <div className={`${isSplit ? 'h-60' : 'h-64 sm:h-72'} w-full`}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={rangeDistributionData}
            margin={{ top: 15, right: 15, left: -20, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis
              dataKey="range"
              tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }}
              tickLine={false}
              axisLine={{ stroke: '#cbd5e1' }}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }}
              tickLine={false}
              axisLine={{ stroke: '#cbd5e1' }}
            />
            <Tooltip
              cursor={{ fill: 'rgba(241, 245, 249, 0.7)' }}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-slate-900 text-white p-3 rounded-xl shadow-lg text-xs font-semibold space-y-1">
                      <p className="font-extrabold text-amber-400">
                        Rentang {data.range} ({data.label})
                      </p>
                      <p className="flex justify-between gap-4 text-slate-200">
                        <span>Jumlah Siswa:</span>
                        <span className="font-bold text-white">{data.count} siswa</span>
                      </p>
                      <p className="flex justify-between gap-4 text-slate-200">
                        <span>Persentase:</span>
                        <span className="font-bold text-white">{data.percentage}%</span>
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar dataKey="count" radius={[8, 8, 0, 0]} maxBarSize={52}>
              {rangeDistributionData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Legend Badges */}
      <div className="flex flex-wrap items-center justify-center gap-1.5 pt-2 border-t border-slate-100">
        {rangeDistributionData.map((b) => (
          <div
            key={b.range}
            className="flex items-center space-x-1 px-2 py-0.5 rounded-lg bg-slate-50 border border-slate-200 text-[10px] font-bold text-slate-700"
          >
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: b.color }}
            />
            <span>{b.range}</span>
            <span className="bg-white px-1.5 py-0.2 rounded text-slate-900 font-extrabold shadow-2xs">
              {b.count}
            </span>
          </div>
        ))}
      </div>
    </div>
  );

  // Reusable Pie Chart Component
  const renderPieChart = (isSplit = false) => (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs">
        <span className="font-bold text-slate-800 flex items-center space-x-1.5">
          <PieIcon className="w-4 h-4 text-emerald-600" />
          <span>Ketuntasan Belajar Siswa (KKM {effectiveKKM}):</span>
        </span>
        <span className="text-slate-500 font-semibold">Tuntas: {passRate}%</span>
      </div>

      <div className={`grid ${isSplit ? 'grid-cols-1 gap-2' : 'grid-cols-1 md:grid-cols-2 gap-4'} items-center`}>
        {/* Donut / Pie Chart */}
        <div className={`${isSplit ? 'h-52' : 'h-64 sm:h-72'} w-full flex items-center justify-center`}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={masteryPieData}
                cx="50%"
                cy="50%"
                innerRadius={isSplit ? 45 : 55}
                outerRadius={isSplit ? 75 : 85}
                paddingAngle={4}
                dataKey="value"
              >
                {masteryPieData.map((entry, index) => (
                  <Cell key={`pie-cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-slate-900 text-white p-3 rounded-xl shadow-lg text-xs font-semibold space-y-1">
                        <p className="font-extrabold" style={{ color: data.color }}>
                          {data.name}
                        </p>
                        <p className="flex justify-between gap-4 text-slate-200">
                          <span>Jumlah Siswa:</span>
                          <span className="font-bold text-white">{data.value} siswa</span>
                        </p>
                        <p className="flex justify-between gap-4 text-slate-200">
                          <span>Proporsi:</span>
                          <span className="font-bold text-white">{data.percentage}%</span>
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend
                verticalAlign="bottom"
                height={32}
                formatter={(value) => (
                  <span className="text-[11px] font-bold text-slate-700">{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Detailed Breakdown Card */}
        <div className="space-y-2 bg-slate-50/70 p-3.5 rounded-2xl border border-slate-200">
          <div className="space-y-2 text-xs">
            <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 flex items-center justify-between font-bold">
              <div className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                <span>Tuntas (≥ {effectiveKKM})</span>
              </div>
              <span className="font-display font-extrabold text-emerald-700">
                {masteryPieData[0].value} Siswa ({masteryPieData[0].percentage}%)
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-orange-50 border border-orange-200 text-orange-950 flex items-center justify-between font-bold">
              <div className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-500 shrink-0" />
                <span>Remedial (&lt; {effectiveKKM})</span>
              </div>
              <span className="font-display font-extrabold text-orange-700">
                {masteryPieData[1].value} Siswa ({masteryPieData[1].percentage}%)
              </span>
            </div>
          </div>

          <p className="text-[11px] text-slate-600 font-medium leading-relaxed pt-1">
            💡 <strong>Rekomendasi Pembelajaran:</strong>{' '}
            {passRate >= 80
              ? 'Ketuntasan klasikal sangat memuaskan! Siswa dapat melangkah ke materi pengayaan.'
              : passRate >= 60
              ? 'Sebagian besar siswa tuntas, bimbingan intensif disarankan untuk siswa yang belum tuntas.'
              : 'Disarankan remedial terstruktur dan pembahasan ulang indikator materi yang sulit.'}
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-5 sm:p-6 space-y-5">
      {/* Header section with Chart Mode Switcher & Exam Selector */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-2 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-100">
              <BarChart3 className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-display font-black text-lg text-slate-900 leading-tight">
                Visualisasi Distribusi Nilai Siswa
              </h3>
              <p className="text-xs text-slate-500 font-semibold mt-0.5">
                Pantau sebaran skor, ketuntasan KKM, dan perkembangan capaian kelas secara cepat
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls: Exam Selector, Grade Selector & Chart View Switcher */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Exam Filter Dropdown if exams are provided */}
          {exams.length > 0 && (
            <div className="relative">
              <select
                id="select-chart-exam"
                value={activeExamFilter}
                onChange={(e) => handleExamChange(e.target.value)}
                aria-label="Pilih Ujian untuk Visualisasi Data"
                className="bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:border-indigo-500 cursor-pointer pr-8"
              >
                <option value="ALL">Semua Ujian</option>
                {exams.map((ex) => (
                  <option key={ex.examId} value={ex.examId}>
                    {ex.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Grade Filter Dropdown */}
          <div className="relative">
            <select
              id="select-chart-grade"
              value={activeGradeFilter}
              onChange={(e) => setActiveGradeFilter(e.target.value)}
              aria-label="Filter Berdasarkan Jenjang Kelas"
              className="bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="ALL">Semua Jenjang</option>
              <option value="1">Kelas 1</option>
              <option value="2">Kelas 2</option>
              <option value="3">Kelas 3</option>
              <option value="4">Kelas 4</option>
              <option value="5">Kelas 5</option>
              <option value="6">Kelas 6</option>
            </select>
          </div>

          {/* Chart View Switcher Toggle Buttons */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
            <button
              type="button"
              id="chart-tab-both"
              onClick={() => setChartType('both')}
              className={`px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition-all cursor-pointer ${
                chartType === 'both'
                  ? 'bg-white text-indigo-700 shadow-2xs font-extrabold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Semua Grafik</span>
              <span className="sm:hidden">Semua</span>
            </button>

            <button
              type="button"
              id="chart-tab-bar"
              onClick={() => setChartType('bar')}
              className={`px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition-all cursor-pointer ${
                chartType === 'bar'
                  ? 'bg-white text-indigo-700 shadow-2xs font-extrabold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Batang</span>
            </button>

            <button
              type="button"
              id="chart-tab-pie"
              onClick={() => setChartType('pie')}
              className={`px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition-all cursor-pointer ${
                chartType === 'pie'
                  ? 'bg-white text-indigo-700 shadow-2xs font-extrabold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <PieIcon className="w-3.5 h-3.5" />
              <span>Pie (KKM)</span>
            </button>

            {gradeComparisonData.length > 1 && (
              <button
                type="button"
                id="chart-tab-comparison"
                onClick={() => setChartType('comparison')}
                className={`px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition-all cursor-pointer ${
                  chartType === 'comparison'
                    ? 'bg-white text-indigo-700 shadow-2xs font-extrabold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Per Kelas</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mini KPI Highlights */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
        <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-3.5">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide flex items-center space-x-1">
            <Users className="w-3 h-3 text-slate-400" />
            <span>Siswa Dinilai</span>
          </span>
          <div className="text-xl font-display font-black text-slate-900 mt-0.5">
            {totalStudents} <span className="text-xs font-semibold text-slate-500">Siswa</span>
          </div>
        </div>

        <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-3.5">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide flex items-center space-x-1">
            <TrendingUp className="w-3 h-3 text-blue-500" />
            <span>Rata-Rata Kelas</span>
          </span>
          <div className="text-xl font-display font-black text-blue-700 mt-0.5">
            {avgScore} <span className="text-xs font-semibold text-slate-500">/ 100</span>
          </div>
        </div>

        <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-3.5">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide flex items-center space-x-1">
            <Sparkles className="w-3 h-3 text-amber-500" />
            <span>Tertinggi / Terendah</span>
          </span>
          <div className="text-base sm:text-lg font-display font-black text-slate-900 mt-0.5">
            <span className="text-emerald-700">{highestScore}</span>{' '}
            <span className="text-slate-300">/</span>{' '}
            <span className="text-rose-600">{lowestScore}</span>
          </div>
        </div>

        <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-3.5">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide flex items-center space-x-1">
            <Award className="w-3 h-3 text-emerald-500" />
            <span>Ketuntasan (≥{effectiveKKM})</span>
          </span>
          <div className="text-xl font-display font-black text-emerald-700 mt-0.5">
            {passRate}% <span className="text-xs font-semibold text-slate-500">Tuntas</span>
          </div>
        </div>

        <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-3.5 col-span-2 sm:col-span-4 lg:col-span-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide flex items-center space-x-1">
            <Filter className="w-3 h-3 text-amber-500" />
            <span>KKM Acuan</span>
          </span>
          <div className="text-xl font-display font-black text-amber-700 mt-0.5">
            {effectiveKKM} <span className="text-xs font-semibold text-slate-500">Poin</span>
          </div>
        </div>
      </div>

      {/* Main Chart Area */}
      {totalStudents === 0 ? (
        <div className="py-14 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
          <BarChart3 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-bold text-slate-600">Belum ada data nilai untuk visualisasi</p>
          <p className="text-xs text-slate-400 mt-0.5">
            Data grafik akan otomatis muncul saat siswa mulai menyelesaikan ujian.
          </p>
        </div>
      ) : (
        <div className="pt-2">
          {/* Both Mode: Bar Chart and Pie Chart side by side */}
          {chartType === 'both' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-slate-50/40 p-4 rounded-2xl border border-slate-100">
                {renderBarChart(true)}
              </div>
              <div className="bg-slate-50/40 p-4 rounded-2xl border border-slate-100">
                {renderPieChart(true)}
              </div>
            </div>
          )}

          {/* Bar Chart Solo Mode */}
          {chartType === 'bar' && renderBarChart(false)}

          {/* Pie Chart Solo Mode */}
          {chartType === 'pie' && renderPieChart(false)}

          {/* Cross Grade Comparison */}
          {chartType === 'comparison' && gradeComparisonData.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700">
                  Perbandingan Rata-Rata Nilai Antar Jenjang Kelas:
                </span>
                <span className="text-slate-500 font-semibold">
                  {gradeComparisonData.length} Jenjang Kelas Terdata
                </span>
              </div>

              <div className="h-64 sm:h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={gradeComparisonData}
                    margin={{ top: 15, right: 15, left: -20, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="grade"
                      tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }}
                      tickLine={false}
                      axisLine={{ stroke: '#cbd5e1' }}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }}
                      tickLine={false}
                      axisLine={{ stroke: '#cbd5e1' }}
                    />
                    <Tooltip
                      cursor={{ fill: 'rgba(241, 245, 249, 0.6)' }}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-slate-900 text-white p-3 rounded-xl shadow-lg text-xs font-semibold space-y-1">
                              <p className="font-extrabold text-indigo-400">{data.grade}</p>
                              <p className="flex justify-between gap-4 text-slate-200">
                                <span>Rata-Rata Nilai:</span>
                                <span className="font-bold text-white">{data.rataRata} / 100</span>
                              </p>
                              <p className="flex justify-between gap-4 text-slate-200">
                                <span>Peserta Dinilai:</span>
                                <span className="font-bold text-white">
                                  {data.jumlahSiswa} siswa
                                </span>
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="rataRata" fill="#6366f1" radius={[8, 8, 0, 0]} maxBarSize={50} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
