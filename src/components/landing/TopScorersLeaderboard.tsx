import React, { useState, useEffect, useCallback } from 'react';
import {
  Trophy,
  Medal,
  Crown,
  Star,
  Sparkles,
  RefreshCw,
  Award,
  Users,
  CheckCircle2,
  GraduationCap,
  Flame,
  Rocket,
  Search,
} from 'lucide-react';
import { Result, Exam } from '../../types';
import { getTopScorers, getExams } from '../../services/firebase/examService';

interface TopScorersLeaderboardProps {
  onStartExam?: () => void;
}

export const TopScorersLeaderboard: React.FC<TopScorersLeaderboardProps> = ({
  onStartExam,
}) => {
  const [results, setResults] = useState<Result[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string>('ALL');
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Map examId -> Exam title & subject for fast lookup
  const examMap = React.useMemo(() => {
    const map = new Map<string, Exam>();
    exams.forEach((ex) => map.set(ex.examId, ex));
    return map;
  }, [exams]);

  const loadLeaderboardData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setRefreshing(true);
    try {
      const [fetchedExams, fetchedScores] = await Promise.all([
        getExams(),
        getTopScorers({
          examId: selectedExamId !== 'ALL' ? selectedExamId : undefined,
          limitCount: 10,
        }),
      ]);
      setExams(fetchedExams);
      setResults(fetchedScores);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Failed to load top scorers leaderboard:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedExamId]);

  useEffect(() => {
    loadLeaderboardData();
  }, [loadLeaderboardData]);

  // Separate Top 3 podium from ranks 4-10
  const top1 = results[0] || null;
  const top2 = results[1] || null;
  const top3 = results[2] || null;
  const runnerUps = results.slice(3);

  const getExamInfo = (examId: string) => {
    const exam = examMap.get(examId);
    if (!exam) return { title: 'Ujian CBT', subject: 'Umum' };
    return { title: exam.title, subject: exam.subject };
  };

  return (
    <section
      id="top-scorers-leaderboard-section"
      className="mt-6 mb-2 max-w-4xl mx-auto w-full text-left"
    >
      <div className="bg-white/95 backdrop-blur-sm rounded-3xl border-2 border-amber-300 shadow-xl overflow-hidden">
        {/* Header Ribbon */}
        <div className="bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 px-5 sm:px-8 py-5 text-white relative overflow-hidden">
          {/* Subtle background stars */}
          <div className="absolute top-2 right-4 text-white/20 text-6xl pointer-events-none select-none font-bold">
            ★
          </div>
          <div className="absolute bottom-1 right-24 text-white/15 text-4xl pointer-events-none select-none font-bold">
            ★
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
            <div className="space-y-1">
              <div className="inline-flex items-center space-x-1.5 bg-black/20 text-amber-100 px-3 py-1 rounded-full text-xs font-bold backdrop-blur-xs">
                <Crown className="w-3.5 h-3.5 text-yellow-300 fill-yellow-300" />
                <span>Bintang Prestasi CBT CERIA</span>
                <Sparkles className="w-3 h-3 text-yellow-200" />
              </div>

              <h2 className="text-2xl sm:text-3xl font-display font-black tracking-tight text-white flex items-center gap-2">
                <span>Papan Juara Siswa (Top Scorers)</span>
                <span className="text-2xl">🏆</span>
              </h2>

              <p className="text-xs sm:text-sm text-amber-100 font-medium max-w-xl">
                Daftar perolehan nilai tertinggi siswa SD dari pengerjaan ujian CBT di Firestore.
                Berlatihlah dengan rajin dan raih posisimu di puncak!
              </p>
            </div>

            {/* Refresh & Live indicator */}
            <div className="flex items-center gap-2 self-start md:self-center">
              <button
                id="refresh-leaderboard-btn"
                type="button"
                onClick={() => loadLeaderboardData(true)}
                disabled={refreshing}
                className="bg-white/20 hover:bg-white/30 active:scale-95 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer disabled:opacity-60 border border-white/30"
                title="Perbarui data papan juara dari Firestore"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-yellow-200' : ''}`} />
                <span>{refreshing ? 'Memuat...' : 'Perbarui'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Filter Bar & Last Updated */}
        <div className="bg-amber-50/70 px-5 sm:px-8 py-3 border-b border-amber-200/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-2 flex-1 min-w-[240px]">
            <span className="font-bold text-amber-950 flex items-center space-x-1 shrink-0">
              <Search className="w-3.5 h-3.5 text-amber-700" />
              <span>Pilih Ujian:</span>
            </span>

            <select
              id="filter-leaderboard-exam-select"
              value={selectedExamId}
              onChange={(e) => setSelectedExamId(e.target.value)}
              className="bg-white border border-amber-300 text-slate-800 rounded-xl px-3 py-1.5 text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-amber-500 shadow-2xs max-w-xs truncate"
            >
              <option value="ALL">🌟 Semua Ujian & Mata Pelajaran</option>
              {exams.map((ex) => (
                <option key={ex.examId} value={ex.examId}>
                  {ex.title} (Kelas {ex.grade} SD)
                </option>
              ))}
            </select>
          </div>

          <div className="text-slate-500 font-medium flex items-center space-x-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>
              {lastUpdated
                ? `Update: ${lastUpdated.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`
                : 'Sinkronisasi Firestore'}
            </span>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-5 sm:p-8 space-y-6">
          {loading ? (
            /* Loading Skeleton */
            <div className="py-12 flex flex-col items-center justify-center space-y-4 text-center">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-600 animate-bounce shadow-sm">
                <Trophy className="w-6 h-6 text-amber-500 animate-pulse" />
              </div>
              <p className="text-sm font-bold text-amber-950">
                Mengambil data perolehan nilai juara dari Firestore...
              </p>
              <div className="w-48 h-2 bg-amber-100 rounded-full overflow-hidden">
                <div className="w-1/2 h-full bg-amber-500 rounded-full animate-pulse" />
              </div>
            </div>
          ) : results.length === 0 ? (
            /* Encouraging Empty State */
            <div className="py-12 px-4 text-center space-y-4 max-w-md mx-auto">
              <div className="w-16 h-16 rounded-3xl bg-amber-100 border-2 border-amber-300 flex items-center justify-center text-3xl mx-auto shadow-xs">
                ⭐
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-display font-black text-slate-800">
                  Belum Ada Nilai Ujian Tercatat
                </h3>
                <p className="text-xs text-slate-600 font-medium">
                  Jadilah siswa pertama yang menyelesaikan ujian ini dan raih posisi juara #1 di
                  Papan Juara!
                </p>
              </div>

              {onStartExam && (
                <button
                  id="leaderboard-start-exam-empty-btn"
                  type="button"
                  onClick={onStartExam}
                  className="bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl shadow-md transition-transform active:scale-95 inline-flex items-center space-x-1.5 cursor-pointer"
                >
                  <Rocket className="w-4 h-4" />
                  <span>Mulai Kerjakan Ujian Sekarang</span>
                </button>
              )}
            </div>
          ) : (
            <>
              {/* TOP 3 PODIUM SECTION */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs sm:text-sm font-extrabold text-amber-950 uppercase tracking-wider flex items-center space-x-1.5">
                    <Medal className="w-4 h-4 text-amber-600" />
                    <span>Podium 3 Besar Juara Kelas</span>
                  </h3>
                  <span className="text-[11px] font-bold text-slate-500">
                    Nilai Tertinggi SD
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 items-end pt-2">
                  {/* PODIUM 2 (Silver) */}
                  {top2 ? (
                    <div className="order-2 md:order-1 bg-gradient-to-b from-slate-50 via-white to-slate-100/90 rounded-2xl p-4 border-2 border-slate-300 shadow-sm relative flex flex-col justify-between hover:shadow-md transition-shadow">
                      <div className="absolute -top-3.5 left-4 bg-slate-200 text-slate-800 border border-slate-300 font-display font-black text-xs px-2.5 py-0.5 rounded-full flex items-center space-x-1 shadow-2xs">
                        <span>🥈</span>
                        <span>Juara 2</span>
                      </div>

                      <div className="pt-2 text-center space-y-1">
                        <div className="w-12 h-12 mx-auto rounded-full bg-slate-200 border-2 border-slate-300 flex items-center justify-center text-xl shadow-2xs">
                          🥈
                        </div>
                        <h4 className="font-display font-extrabold text-sm sm:text-base text-slate-900 truncate">
                          {top2.name}
                        </h4>
                        <p className="text-[11px] text-slate-600 font-semibold truncate">
                          {top2.school || 'SD'} • Kelas {top2.grade}
                        </p>
                        <p className="text-[10px] text-slate-500 font-medium truncate">
                          {getExamInfo(top2.examId).title}
                        </p>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-slate-200 flex items-center justify-between text-xs">
                        <span className="text-[10px] font-bold text-slate-500">Skor Akhir</span>
                        <span className="font-display font-black text-lg text-slate-900 bg-slate-200/80 px-2.5 py-0.5 rounded-lg">
                          {top2.score}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="order-2 md:order-1 hidden md:block bg-slate-50/50 rounded-2xl p-4 border border-dashed border-slate-300 text-center py-8">
                      <p className="text-xs text-slate-400 font-medium">Posisi Juara 2 Menunggumu</p>
                    </div>
                  )}

                  {/* PODIUM 1 (Gold / Champion) */}
                  {top1 && (
                    <div className="order-1 md:order-2 bg-gradient-to-b from-amber-100/90 via-yellow-50 to-amber-50 rounded-3xl p-5 border-3 border-amber-400 shadow-md relative flex flex-col justify-between transform md:-translate-y-2 hover:shadow-lg transition-transform">
                      {/* Golden Crown Badge */}
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-500 to-yellow-500 text-white font-display font-black text-xs px-3.5 py-1 rounded-full flex items-center space-x-1.5 shadow-sm border border-amber-200">
                        <Crown className="w-3.5 h-3.5 fill-yellow-200 text-yellow-200 animate-pulse" />
                        <span>🏆 JUARA 1 UTAMA</span>
                      </div>

                      <div className="pt-2 text-center space-y-1.5">
                        <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-tr from-amber-400 to-yellow-300 border-4 border-white shadow-md flex items-center justify-center text-3xl">
                          🥇
                        </div>
                        <h4 className="font-display font-black text-base sm:text-lg text-amber-950 truncate px-1">
                          {top1.name}
                        </h4>
                        <div className="inline-flex items-center space-x-1 text-xs font-bold text-amber-900 bg-amber-200/70 px-2.5 py-0.5 rounded-full">
                          <GraduationCap className="w-3.5 h-3.5 text-amber-800" />
                          <span>{top1.school || 'SD'} • Kelas {top1.grade}</span>
                        </div>
                        <p className="text-[11px] text-amber-800 font-semibold truncate pt-0.5">
                          {getExamInfo(top1.examId).title}
                        </p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-amber-200 flex items-center justify-between text-xs">
                        <span className="text-[11px] font-black uppercase text-amber-800 flex items-center space-x-1">
                          <Flame className="w-3.5 h-3.5 text-orange-500 fill-orange-500" />
                          <span>Nilai Sempurna</span>
                        </span>
                        <span className="font-display font-black text-2xl text-amber-950 bg-amber-300/80 px-3 py-0.5 rounded-xl shadow-2xs">
                          {top1.score}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* PODIUM 3 (Bronze) */}
                  {top3 ? (
                    <div className="order-3 bg-gradient-to-b from-orange-50 via-white to-amber-50/70 rounded-2xl p-4 border-2 border-amber-300/80 shadow-sm relative flex flex-col justify-between hover:shadow-md transition-shadow">
                      <div className="absolute -top-3.5 left-4 bg-amber-200 text-amber-950 border border-amber-300 font-display font-black text-xs px-2.5 py-0.5 rounded-full flex items-center space-x-1 shadow-2xs">
                        <span>🥉</span>
                        <span>Juara 3</span>
                      </div>

                      <div className="pt-2 text-center space-y-1">
                        <div className="w-12 h-12 mx-auto rounded-full bg-amber-100 border-2 border-amber-300 flex items-center justify-center text-xl shadow-2xs">
                          🥉
                        </div>
                        <h4 className="font-display font-extrabold text-sm sm:text-base text-slate-900 truncate">
                          {top3.name}
                        </h4>
                        <p className="text-[11px] text-slate-600 font-semibold truncate">
                          {top3.school || 'SD'} • Kelas {top3.grade}
                        </p>
                        <p className="text-[10px] text-slate-500 font-medium truncate">
                          {getExamInfo(top3.examId).title}
                        </p>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-amber-200/80 flex items-center justify-between text-xs">
                        <span className="text-[10px] font-bold text-slate-500">Skor Akhir</span>
                        <span className="font-display font-black text-lg text-amber-950 bg-amber-200/70 px-2.5 py-0.5 rounded-lg">
                          {top3.score}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="order-3 hidden md:block bg-slate-50/50 rounded-2xl p-4 border border-dashed border-slate-300 text-center py-8">
                      <p className="text-xs text-slate-400 font-medium">Posisi Juara 3 Menunggumu</p>
                    </div>
                  )}
                </div>
              </div>

              {/* RUNNER-UPS (RANKS 4 - 10) */}
              {runnerUps.length > 0 && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs sm:text-sm font-extrabold text-slate-800 uppercase tracking-wider flex items-center space-x-1.5">
                      <Star className="w-4 h-4 text-amber-500 fill-amber-400" />
                      <span>Bintang Berprestasi (Peringkat 4 - 10)</span>
                    </h3>
                    <span className="text-[11px] font-bold text-slate-500">
                      {runnerUps.length} Siswa Lainnya
                    </span>
                  </div>

                  <div className="space-y-2">
                    {runnerUps.map((res, index) => {
                      const rank = index + 4;
                      const examInfo = getExamInfo(res.examId);
                      return (
                        <div
                          key={res.resultId || `${res.participantId}_${rank}`}
                          className="bg-slate-50/90 hover:bg-amber-50/60 border border-slate-200 hover:border-amber-300 rounded-2xl p-3 sm:px-4 flex items-center justify-between gap-3 transition-colors text-xs"
                        >
                          <div className="flex items-center space-x-3 min-w-0">
                            <div className="w-7 h-7 rounded-xl bg-slate-200 font-display font-black text-slate-700 flex items-center justify-center shrink-0 text-xs">
                              #{rank}
                            </div>
                            <div className="min-w-0">
                              <h5 className="font-display font-extrabold text-slate-900 truncate sm:text-sm">
                                {res.name}
                              </h5>
                              <p className="text-[11px] text-slate-500 font-medium truncate">
                                {res.school || 'SD'} • Kelas {res.grade} •{' '}
                                <span className="text-slate-700 font-semibold">{examInfo.title}</span>
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center space-x-3 shrink-0">
                            <div className="hidden sm:flex items-center space-x-1 text-[11px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>{res.correctAnswers}/{res.totalQuestions} Soal</span>
                            </div>

                            <div className="bg-amber-100 text-amber-950 font-display font-black text-sm sm:text-base px-2.5 py-1 rounded-xl shadow-2xs border border-amber-200">
                              {res.score}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Encouragement & Call-to-action Footer Banner */}
              <div className="bg-gradient-to-r from-blue-50 via-sky-50 to-indigo-50 border border-blue-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-blue-950 flex items-center justify-center sm:justify-start space-x-1.5">
                    <Award className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>Semua Siswa Bisa Berprestasi!</span>
                  </p>
                  <p className="text-[11px] text-slate-600 font-medium">
                    Belajar tekun, cermati setiap butir soal, dan catatkan namamu di Papan Juara CBT Ceria.
                  </p>
                </div>

                {onStartExam && (
                  <button
                    id="leaderboard-cta-portal-btn"
                    type="button"
                    onClick={onStartExam}
                    className="bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-extrabold text-xs px-4 py-2 rounded-xl shadow-sm transition-all inline-flex items-center space-x-1.5 shrink-0 cursor-pointer"
                  >
                    <Rocket className="w-3.5 h-3.5" />
                    <span>Ikuti Ujian Sekarang</span>
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
};
