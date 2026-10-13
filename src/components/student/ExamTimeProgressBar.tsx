import React from 'react';
import { Clock, AlertTriangle, Flame, ShieldAlert, Sparkles } from 'lucide-react';

interface ExamTimeProgressBarProps {
  timeLeftSeconds: number;
  totalDurationSeconds: number;
  formattedTime: string;
}

export const ExamTimeProgressBar: React.FC<ExamTimeProgressBarProps> = ({
  timeLeftSeconds,
  totalDurationSeconds,
  formattedTime,
}) => {
  const safeTotal = Math.max(1, totalDurationSeconds);
  const percentRemaining = Math.max(0, Math.min(100, (timeLeftSeconds / safeTotal) * 100));
  const roundedPercent = Math.round(percentRemaining);

  // Time status thresholds
  const isCritical = timeLeftSeconds <= 300; // <= 5 minutes
  const isWarning = timeLeftSeconds <= 600 && timeLeftSeconds > 300; // <= 10 minutes
  const isHalfTime = percentRemaining <= 50 && !isWarning && !isCritical;

  // Status configuration
  let statusBadge = {
    label: 'Waktu Aman',
    colorClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    barGradient: 'from-emerald-500 via-teal-500 to-emerald-600',
    glowClass: '',
  };

  if (isCritical) {
    statusBadge = {
      label: 'Kritis (< 5 Menit)',
      colorClass: 'bg-rose-100 text-rose-800 border-rose-300 animate-pulse font-black',
      barGradient: 'from-red-600 via-rose-500 to-red-700 animate-pulse',
      glowClass: 'shadow-sm shadow-rose-500/50',
    };
  } else if (isWarning) {
    statusBadge = {
      label: 'Waktu Menipis',
      colorClass: 'bg-amber-100 text-amber-900 border-amber-300 font-bold',
      barGradient: 'from-amber-500 via-orange-500 to-amber-600',
      glowClass: 'shadow-sm shadow-amber-500/30',
    };
  } else if (isHalfTime) {
    statusBadge = {
      label: 'Tersisa ≤ 50%',
      colorClass: 'bg-blue-100 text-blue-900 border-blue-300 font-bold',
      barGradient: 'from-blue-500 via-indigo-500 to-blue-600',
      glowClass: '',
    };
  }

  const totalMinutes = Math.round(safeTotal / 60);

  return (
    <div
      id="exam-time-progress-bar-container"
      className="space-y-2 bg-slate-50/90 border border-slate-200/90 rounded-2xl p-3 sm:p-3.5 transition-all shadow-2xs"
    >
      {/* Top Labels: Timer & Badges */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm">
        <div className="flex items-center space-x-2 min-w-0">
          <div
            className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 border ${
              isCritical
                ? 'bg-rose-100 text-rose-700 border-rose-300 animate-bounce'
                : isWarning
                ? 'bg-amber-100 text-amber-800 border-amber-300'
                : 'bg-indigo-100 text-indigo-700 border-indigo-200'
            }`}
          >
            {isCritical ? (
              <Flame className="w-4 h-4 text-rose-600" />
            ) : isWarning ? (
              <AlertTriangle className="w-4 h-4 text-amber-700" />
            ) : (
              <Clock className="w-4 h-4 text-indigo-700" />
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-center space-x-2">
              <span className="font-display font-black text-slate-800 text-xs sm:text-sm">
                Sisa Waktu Ujian:
              </span>
              <span
                id="realtime-countdown-digits"
                className={`font-mono font-black text-sm sm:text-base px-2 py-0.5 rounded-lg border ${
                  isCritical
                    ? 'bg-rose-50 text-rose-700 border-rose-300 animate-pulse'
                    : isWarning
                    ? 'bg-amber-50 text-amber-900 border-amber-300'
                    : 'bg-white text-slate-900 border-slate-300'
                }`}
              >
                {formattedTime}
              </span>
            </div>
          </div>
        </div>

        {/* Right Info: Status Pill & Percentage */}
        <div className="flex items-center space-x-2">
          <span
            id="time-status-pill"
            className={`text-[11px] px-2.5 py-0.5 rounded-lg border font-bold ${statusBadge.colorClass}`}
          >
            {statusBadge.label}
          </span>

          <span className="text-[11px] font-extrabold text-slate-700 bg-white border border-slate-200 px-2.5 py-0.5 rounded-lg shadow-2xs">
            {roundedPercent}% Waktu Tersisa
          </span>
        </div>
      </div>

      {/* Visual Progress Bar Track */}
      <div className="space-y-1">
        <div
          role="progressbar"
          aria-valuenow={roundedPercent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Progress Waktu Ujian Tersisa"
          className="w-full h-3 sm:h-3.5 bg-slate-200/90 rounded-full overflow-hidden p-0.5 border border-slate-300/80 shadow-inner relative"
        >
          <div
            id="exam-time-progress-bar-fill"
            style={{ width: `${percentRemaining}%` }}
            className={`h-full rounded-full bg-gradient-to-r ${statusBadge.barGradient} ${statusBadge.glowClass} transition-all duration-1000 ease-linear`}
          />
        </div>

        {/* Bottom scale labels */}
        <div className="flex justify-between items-center text-[10px] text-slate-500 font-semibold px-0.5">
          <span>0 Menit (Waktu Habis)</span>
          <span className="hidden sm:inline text-slate-400">
            • Atur ritme pengerjaan soal dengan tenang •
          </span>
          <span>Total Durasi: {totalMinutes} Menit</span>
        </div>
      </div>
    </div>
  );
};
