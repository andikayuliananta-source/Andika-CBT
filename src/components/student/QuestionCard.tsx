import React from 'react';
import {
  Flag,
  Check,
  ChevronLeft,
  ChevronRight,
  Send,
  LayoutGrid,
  ListChecks,
  CheckCircle2,
  Database,
  HardDrive,
} from 'lucide-react';
import { StudentSafeQuestion } from '../../types';
import { convertLatexToStandardMath } from '../../utils/mathFormatter';
import { QuestionImage } from '../common/QuestionImage';

export interface QuestionCardProps {
  question: StudentSafeQuestion;
  currentIndex: number;
  totalQuestions: number;
  currentAnswer: string;
  currentMarked: boolean;
  fontSize: 'normal' | 'large';
  onChangeFontSize: (size: 'normal' | 'large') => void;
  onSelectOption: (key: string) => void;
  onToggleMark: () => void;
  onJumpToNextMarked: () => void;
  markedCount: number;
  onPreviewImage: (url: string) => void;
  lastSavedTime: string | null;
  unsyncedDraftCount: number;
  onSyncDrafts: () => void;
  isSyncingDrafts: boolean;
  onNavigatePrev: () => void;
  onNavigateNext: () => void;
  onOpenMobilePalette: () => void;
  onOpenSubmitModal: () => void;
  isSubmitting: boolean;
}

export const QuestionCard = React.memo<QuestionCardProps>(({
  question,
  currentIndex,
  totalQuestions,
  currentAnswer,
  currentMarked,
  fontSize,
  onChangeFontSize,
  onSelectOption,
  onToggleMark,
  onJumpToNextMarked,
  markedCount,
  onPreviewImage,
  lastSavedTime,
  unsyncedDraftCount,
  onSyncDrafts,
  isSyncingDrafts,
  onNavigatePrev,
  onNavigateNext,
  onOpenMobilePalette,
  onOpenSubmitModal,
  isSubmitting,
}) => {
  const isComplex = question.type === 'COMPLEX';
  const complexSelections = React.useMemo(() => {
    return isComplex && currentAnswer
      ? currentAnswer.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean)
      : [];
  }, [isComplex, currentAnswer]);

  return (
    <div className="lg:col-span-3 bg-white rounded-2xl sm:rounded-3xl border-2 border-amber-200 p-3.5 sm:p-7 shadow-sm flex flex-col justify-between space-y-4 sm:space-y-6 min-h-[380px] sm:min-h-[460px]">
      <div className="space-y-3.5 sm:space-y-5">
        {/* Question Header */}
        <div className="flex items-center justify-between border-b border-amber-100 pb-2.5 sm:pb-3 gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-display font-black text-xs sm:text-base text-amber-900 bg-amber-100/80 px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-xl">
              SOAL {currentIndex + 1} / {totalQuestions}
            </span>

            {isComplex && (
              <span className="font-display font-extrabold text-[11px] sm:text-xs text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl flex items-center space-x-1">
                <ListChecks className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span>PG Kompleks</span>
              </span>
            )}

            {/* Accessibility Font Size Toggle */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              <button
                type="button"
                onClick={() => onChangeFontSize('normal')}
                title="Ukuran Tulisan Standar"
                className={`px-1.5 py-0.5 rounded text-[11px] font-bold cursor-pointer transition-all ${
                  fontSize === 'normal'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                A
              </button>
              <button
                type="button"
                onClick={() => onChangeFontSize('large')}
                title="Ukuran Tulisan Lebih Besar"
                className={`px-1.5 py-0.5 rounded text-[12px] font-black cursor-pointer transition-all ${
                  fontSize === 'large'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                A+
              </button>
            </div>

            {/* Autosave Status Indicator */}
            <div
              id="autosave-question-pill"
              className={`hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold border select-none transition-all ${
                currentAnswer
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  : 'bg-slate-50 text-slate-500 border-slate-200'
              }`}
            >
              {currentAnswer ? (
                <>
                  <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                  <span>Autosave: Tersimpan di Memori</span>
                </>
              ) : (
                <>
                  <Database className="w-3 h-3 text-slate-400 shrink-0" />
                  <span>Autosave Siaga</span>
                </>
              )}
            </div>
          </div>

          {/* Mark for Review Button */}
          <button
            id="mark-for-review-btn"
            type="button"
            onClick={onToggleMark}
            title={
              currentMarked
                ? 'Batalkan tanda review (Unmark)'
                : 'Tandai soal ini untuk ditinjau kembali sebelum menyelesaikan ujian (Mark for Review)'
            }
            className={`flex items-center space-x-1.5 px-3 sm:px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer select-none shadow-2xs ${
              currentMarked
                ? 'bg-amber-400 hover:bg-amber-500 text-amber-950 border-amber-500 shadow-xs ring-2 ring-amber-300 ring-offset-1'
                : 'bg-slate-50 hover:bg-amber-50 text-slate-700 hover:text-amber-950 border-slate-300 hover:border-amber-300'
            }`}
          >
            <Flag
              className={`w-3.5 h-3.5 shrink-0 ${
                currentMarked ? 'fill-amber-950 text-amber-950' : 'text-amber-600 fill-transparent'
              }`}
            />
            <span>{currentMarked ? 'Marked for Review ✓' : 'Mark for Review'}</span>
          </button>
        </div>

        {/* Review status notice if flagged */}
        {currentMarked && (
          <div
            id="question-flagged-review-banner"
            className="bg-amber-50 border border-amber-300/90 text-amber-950 px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between gap-2 shadow-2xs animate-in fade-in"
          >
            <div className="flex items-center space-x-2">
              <Flag className="w-3.5 h-3.5 text-amber-700 fill-amber-500 shrink-0" />
              <span>
                Soal ini <strong>ditandai untuk ditinjau</strong> (Marked for Review) sebelum selesai.
              </span>
            </div>
            {markedCount > 1 && (
              <button
                type="button"
                onClick={onJumpToNextMarked}
                className="text-[11px] font-bold text-amber-900 hover:text-amber-950 underline cursor-pointer shrink-0"
              >
                Soal review berikutnya →
              </button>
            )}
          </div>
        )}

        {/* Question Text */}
        <div
          className={`font-bold text-slate-800 leading-relaxed ${
            fontSize === 'large' ? 'text-lg sm:text-xl' : 'text-base sm:text-lg'
          }`}
        >
          {convertLatexToStandardMath(question.question)}
        </div>

        {/* Question Image */}
        {question.imageUrl && typeof question.imageUrl === 'string' && question.imageUrl.trim() && (
          <QuestionImage
            src={question.imageUrl}
            alt={`Gambar Soal Nomor ${currentIndex + 1}`}
            onZoom={() => onPreviewImage(question.imageUrl || '')}
            className="my-2 max-w-md mx-auto p-1.5"
          />
        )}

        {/* Complex Question Tip */}
        {isComplex && (
          <div className="bg-indigo-50/90 border border-indigo-200/90 text-indigo-950 px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center space-x-2.5 shadow-2xs">
            <span className="text-base shrink-0">☑️</span>
            <span className="leading-snug">
              <strong>Pilihan Ganda Kompleks:</strong> Kamu dapat memilih <strong>lebih dari 1 pilihan</strong> yang benar. Ketuk opsi untuk memilih atau membatalkan.
            </span>
          </div>
        )}

        {/* Multiple Choice Options (A, B, C, D) */}
        <div className="space-y-2 sm:space-y-3 pt-1">
          {(['A', 'B', 'C', 'D'] as const).map((key) => {
            const optionText =
              key === 'A'
                ? question.optionA
                : key === 'B'
                ? question.optionB
                : key === 'C'
                ? question.optionC
                : question.optionD;

            if (!optionText && (key === 'C' || key === 'D')) return null;

            const isSelected = isComplex
              ? complexSelections.includes(key)
              : currentAnswer.toUpperCase() === key;

            return (
              <button
                key={key}
                id={`option-${key.toLowerCase()}-btn`}
                type="button"
                onClick={() => onSelectOption(key)}
                className={`w-full text-left p-2.5 sm:p-4 rounded-xl sm:rounded-2xl border-2 transition-colors duration-150 flex items-center space-x-3 cursor-pointer select-none group min-h-[48px] ${
                  isSelected
                    ? isComplex
                      ? 'bg-indigo-50/90 border-indigo-500 shadow-sm'
                      : 'bg-amber-100/90 border-amber-500 shadow-sm'
                    : 'bg-slate-50/70 border-slate-200 hover:border-amber-300 hover:bg-amber-50/30 active:bg-amber-100/50'
                }`}
              >
                <div
                  className={`w-8 h-8 sm:w-9 sm:h-9 ${
                    isComplex ? 'rounded-lg' : 'rounded-xl'
                  } font-display font-extrabold flex items-center justify-center text-xs sm:text-sm shrink-0 transition-colors ${
                    isSelected
                      ? isComplex
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-amber-500 text-white shadow-xs'
                      : 'bg-white border-2 border-slate-300 text-slate-700 group-hover:border-amber-400'
                  }`}
                >
                  {isComplex && isSelected ? (
                    <Check className="w-5 h-5 text-white stroke-[3]" />
                  ) : (
                    key
                  )}
                </div>
                <span
                  className={`font-bold text-slate-800 flex-1 leading-snug ${
                    fontSize === 'large' ? 'text-base sm:text-lg' : 'text-sm sm:text-base'
                  }`}
                >
                  {convertLatexToStandardMath(optionText)}
                </span>
                {isComplex && (
                  <div className="shrink-0">
                    {isSelected ? (
                      <span className="text-indigo-700 bg-indigo-100/80 px-2 py-0.5 rounded-md text-[11px] font-extrabold flex items-center space-x-1">
                        <Check className="w-3 h-3 stroke-[3]" />
                        <span>Dipilih</span>
                      </span>
                    ) : (
                      <span className="text-slate-400 group-hover:text-slate-600 text-[11px] font-semibold">
                        + Pilih
                      </span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Micro-Badge Status */}
        <div className="pt-2.5 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 font-medium border-t border-slate-100">
          <div className="flex items-center space-x-2">
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                currentAnswer ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'
              }`}
            />
            <span className="text-slate-700">
              {currentAnswer ? (
                <>
                  <strong className="text-emerald-700">Autosave Aktif:</strong> Pilihan tersimpan aman
                  {lastSavedTime ? ` • ${lastSavedTime}` : ''}
                </>
              ) : (
                'Pilih salah satu jawaban di atas — otomatis tersimpan instan'
              )}
            </span>
          </div>
          {unsyncedDraftCount > 0 ? (
            <button
              type="button"
              onClick={onSyncDrafts}
              disabled={isSyncingDrafts}
              title="Klik untuk menyinkronkan draf ke server"
              className="text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-300 px-2.5 py-1 rounded-md font-bold text-[10px] flex items-center space-x-1.5 cursor-pointer transition-colors"
            >
              <HardDrive className="w-3 h-3 text-amber-700" />
              <span>
                {isSyncingDrafts ? 'Menyinkronkan...' : `${unsyncedDraftCount} Draf Offline (Klik Sinkron)`}
              </span>
            </button>
          ) : (
            <div className="text-[10px] text-slate-400 hidden sm:flex items-center space-x-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-600 inline" />
              <span>Tahan gangguan koneksi & crash</span>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Navigation Buttons */}
      <div className="pt-3 sm:pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
        <button
          id="prev-question-btn"
          type="button"
          disabled={currentIndex === 0}
          onClick={onNavigatePrev}
          className="flex items-center space-x-1 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border-2 border-slate-200 font-bold text-xs sm:text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden xs:inline">← Sebelumnya</span>
          <span className="xs:hidden">← Balik</span>
        </button>

        {/* Quick Palette Button on Mobile & Tablet */}
        <button
          type="button"
          onClick={onOpenMobilePalette}
          className="lg:hidden flex items-center space-x-1 px-2.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
        >
          <LayoutGrid className="w-3.5 h-3.5 text-slate-600" />
          <span>Daftar Soal</span>
        </button>

        {/* Jump to Next Marked for Review */}
        {markedCount > 0 && (
          <button
            id="inline-jump-review-btn"
            type="button"
            onClick={onJumpToNextMarked}
            className="hidden sm:flex items-center space-x-1.5 px-3 py-2 sm:py-2.5 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold text-xs sm:text-sm transition-colors cursor-pointer"
          >
            <Flag className="w-3.5 h-3.5 fill-amber-500 text-amber-700" />
            <span>Review ({markedCount})</span>
          </button>
        )}

        {currentIndex < totalQuestions - 1 ? (
          <button
            id="next-question-btn"
            type="button"
            onClick={onNavigateNext}
            className="flex items-center space-x-1 px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 font-display font-extrabold text-xs sm:text-sm text-white shadow-xs transition-colors cursor-pointer"
          >
            <span className="hidden xs:inline">Berikutnya →</span>
            <span className="xs:hidden">Lanjut →</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            id="open-submit-modal-btn"
            type="button"
            disabled={isSubmitting}
            onClick={onOpenSubmitModal}
            className="flex items-center space-x-1.5 px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 font-display font-black text-xs sm:text-sm text-white shadow-md transition-colors cursor-pointer disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            <span>Kirim Jawaban ✓</span>
          </button>
        )}
      </div>
    </div>
  );
});

QuestionCard.displayName = 'QuestionCard';
