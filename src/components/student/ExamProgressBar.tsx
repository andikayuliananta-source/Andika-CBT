import React from 'react';
import { CheckCircle2, Bookmark, AlertCircle, Sparkles } from 'lucide-react';

interface ExamProgressBarProps {
  total: number;
  answered: number;
  marked?: number;
  currentIndex?: number;
}

export const ExamProgressBar: React.FC<ExamProgressBarProps> = ({
  total,
  answered,
  marked = 0,
  currentIndex = 0,
}) => {
  const safeTotal = Math.max(1, total);
  const percentage = Math.min(100, Math.round((answered / safeTotal) * 100));
  const unanswered = Math.max(0, safeTotal - answered);
  const isComplete = answered >= safeTotal && safeTotal > 0;

  return (
    <div
      id="exam-progress-bar-card"
      className="bg-white rounded-2xl sm:rounded-3xl border-2 border-amber-200/90 p-3.5 sm:p-4 shadow-xs space-y-2.5 transition-all"
    >
      {/* Top row: Progress labels & status */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded-xl bg-amber-100 flex items-center justify-center text-amber-900 font-bold text-xs shrink-0">
            {isComplete ? (
              <Sparkles className="w-4 h-4 text-emerald-600 animate-spin" />
            ) : (
              '📊'
            )}
          </div>
          <div>
            <span className="font-display font-black text-slate-800">
              Kemajuan Ujian
            </span>
            <span className="text-slate-500 font-semibold text-xs ml-1.5 hidden sm:inline">
              (Soal aktif: #{currentIndex + 1})
            </span>
          </div>
        </div>

        {/* Badges / Metrics */}
        <div className="flex items-center space-x-2 text-xs font-bold">
          {/* Answered counter pill */}
          <span
            id="answered-count-badge"
            className="flex items-center space-x-1 px-2.5 py-1 rounded-xl bg-emerald-100 text-emerald-900 border border-emerald-300"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>
              <strong>{answered}</strong>/{safeTotal} Terjawab
            </span>
          </span>

          {/* Marked / Review count if any */}
          {marked > 0 && (
            <span
              id="marked-count-badge"
              title={`${marked} soal ditandai untuk ditinjau (Mark for Review)`}
              className="hidden md:flex items-center space-x-1 px-2 py-1 rounded-xl bg-yellow-100 text-yellow-900 border border-yellow-300"
            >
              <Bookmark className="w-3.5 h-3.5 text-yellow-600 fill-yellow-500 shrink-0" />
              <span>{marked} Review</span>
            </span>
          )}

          {/* Unanswered count if any */}
          {unanswered > 0 && (
            <span
              id="unanswered-count-badge"
              className="hidden sm:flex items-center space-x-1 px-2 py-1 rounded-xl bg-slate-100 text-slate-700 border border-slate-200"
            >
              <AlertCircle className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span>{unanswered} Belum</span>
            </span>
          )}

          {/* Percentage badge */}
          <span
            id="progress-percentage-badge"
            className={`px-2.5 py-1 rounded-xl font-display font-black text-xs ${
              isComplete
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-amber-100 text-amber-950 border border-amber-300'
            }`}
          >
            {percentage}%
          </span>
        </div>
      </div>

      {/* Progress Track & Fill */}
      <div
        id="exam-progress-track"
        className="w-full h-3 sm:h-3.5 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200/80 shadow-inner relative"
        role="progressbar"
        aria-valuenow={percentage}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Kemajuan ujian: ${answered} dari ${safeTotal} soal terjawab (${percentage}%)`}
      >
        <div
          id="exam-progress-fill"
          className={`h-full rounded-full transition-all duration-500 ease-out flex items-center justify-end pr-1 ${
            isComplete
              ? 'bg-emerald-500 shadow-xs'
              : percentage > 50
              ? 'bg-emerald-500'
              : percentage > 25
              ? 'bg-amber-500'
              : 'bg-amber-400'
          }`}
          style={{ width: `${Math.max(percentage > 0 ? 4 : 0, percentage)}%` }}
        >
          {percentage >= 20 && (
            <span className="w-1.5 h-1.5 rounded-full bg-white/70"></span>
          )}
        </div>
      </div>

      {/* Encouraging helper message */}
      <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500">
        <span>
          {isComplete ? (
            <strong className="text-emerald-700 font-bold flex items-center gap-1">
              🎉 Luar biasa! Semua soal telah terjawab. Periksa kembali sebelum mengirim.
            </strong>
          ) : unanswered <= 3 && unanswered > 0 ? (
            <span className="text-amber-700 font-bold">
              ⚡ Hampir selesai! Tinggal {unanswered} soal lagi.
            </span>
          ) : (
            <span>
              Pilih jawaban pada setiap nomor untuk menyelesaikan ujian.
            </span>
          )}
        </span>
        <span className="text-slate-400 hidden sm:inline">
          {answered} selesai • {unanswered} tersisa
        </span>
      </div>
    </div>
  );
};
