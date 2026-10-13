import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Clock } from 'lucide-react';
import { ExamTimeProgressBar } from './ExamTimeProgressBar';

export interface ExamLiveTimerProps {
  endAt: string;
  startedAt?: string;
  durationMinutes: number;
  onTimeUp: () => void;
  onTimeWarning?: (msg: string) => void;
}

export const ExamLiveTimer: React.FC<ExamLiveTimerProps> = React.memo(({
  endAt,
  startedAt,
  durationMinutes,
  onTimeUp,
  onTimeWarning,
}) => {
  const [timeLeftSeconds, setTimeLeftSeconds] = useState<number>(() => {
    const endMs = new Date(endAt).getTime();
    return Math.max(0, Math.floor((endMs - Date.now()) / 1000));
  });

  const alerted10Min = useRef(false);
  const alerted5Min = useRef(false);
  const alerted1Min = useRef(false);
  const isTimeUpRef = useRef(false);

  const totalDurationSeconds = useMemo(() => {
    const startMs = new Date(startedAt || '').getTime();
    const endMs = new Date(endAt).getTime();
    const diffSec = Math.floor((endMs - startMs) / 1000);
    if (!isNaN(diffSec) && diffSec > 0) return diffSec;
    return (durationMinutes || 60) * 60;
  }, [startedAt, endAt, durationMinutes]);

  useEffect(() => {
    const interval = setInterval(() => {
      const endMs = new Date(endAt).getTime();
      const diffSec = Math.max(0, Math.floor((endMs - Date.now()) / 1000));
      setTimeLeftSeconds(diffSec);

      // Warning thresholds
      if (diffSec <= 600 && diffSec > 590 && !alerted10Min.current) {
        alerted10Min.current = true;
        onTimeWarning?.('Waktu ujian tersisa 10 menit!');
      } else if (diffSec <= 300 && diffSec > 290 && !alerted5Min.current) {
        alerted5Min.current = true;
        onTimeWarning?.('Waktu ujian tersisa 5 menit! Segera periksa kembali jawabanmu.');
      } else if (diffSec <= 60 && diffSec > 50 && !alerted1Min.current) {
        alerted1Min.current = true;
        onTimeWarning?.('Perhatian! Waktu tersisa 1 menit lagi.');
      }

      // Auto submit when time is up
      if (diffSec <= 0 && !isTimeUpRef.current) {
        isTimeUpRef.current = true;
        clearInterval(interval);
        onTimeUp();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [endAt, onTimeUp, onTimeWarning]);

  const minutes = Math.floor(timeLeftSeconds / 60);
  const seconds = timeLeftSeconds % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  const isCritical = timeLeftSeconds <= 300;

  return (
    <>
      {/* 1. Topmost Viewport Edge Live Time Progress Line (Fixed top) */}
      <div
        id="viewport-top-time-progress-bar"
        className="fixed top-0 left-0 right-0 z-50 h-1 sm:h-1.5 bg-slate-200/90 pointer-events-none"
      >
        <div
          style={{
            width: `${Math.max(
              0,
              Math.min(100, (timeLeftSeconds / Math.max(1, totalDurationSeconds)) * 100)
            )}%`,
          }}
          className={`h-full transition-all duration-1000 ease-linear shadow-xs ${
            isCritical
              ? 'bg-rose-600 animate-pulse'
              : timeLeftSeconds <= 600
              ? 'bg-amber-500'
              : 'bg-emerald-500'
          }`}
        />
      </div>

      {/* 2. Visual Time Progress Bar in Header */}
      <div className="mt-3 pt-3 border-t border-slate-100">
        <ExamTimeProgressBar
          timeLeftSeconds={timeLeftSeconds}
          totalDurationSeconds={totalDurationSeconds}
          formattedTime={formattedTime}
        />
      </div>
    </>
  );
});

ExamLiveTimer.displayName = 'ExamLiveTimer';

export interface ExamHeaderBadgeTimerProps {
  endAt: string;
}

export const ExamHeaderBadgeTimer: React.FC<ExamHeaderBadgeTimerProps> = React.memo(({ endAt }) => {
  const [timeLeftSeconds, setTimeLeftSeconds] = useState<number>(() => {
    const endMs = new Date(endAt).getTime();
    return Math.max(0, Math.floor((endMs - Date.now()) / 1000));
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const endMs = new Date(endAt).getTime();
      const diffSec = Math.max(0, Math.floor((endMs - Date.now()) / 1000));
      setTimeLeftSeconds(diffSec);
    }, 1000);
    return () => clearInterval(interval);
  }, [endAt]);

  const minutes = Math.floor(timeLeftSeconds / 60);
  const seconds = timeLeftSeconds % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  const isCritical = timeLeftSeconds <= 300;

  return (
    <div
      id="exam-header-badge-timer"
      className={`flex items-center space-x-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl font-mono font-black text-sm sm:text-lg shadow-xs border-2 shrink-0 select-none ${
        isCritical
          ? 'bg-red-100 text-red-700 border-red-300 animate-pulse'
          : 'bg-amber-100/90 text-amber-950 border-amber-300'
      }`}
    >
      <Clock className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-amber-700 shrink-0" />
      <span>⏱️ {formattedTime}</span>
    </div>
  );
});

ExamHeaderBadgeTimer.displayName = 'ExamHeaderBadgeTimer';
