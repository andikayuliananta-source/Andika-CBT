import React from 'react';

export interface QuestionChipProps {
  index: number;
  isAnswered: boolean;
  isMarked: boolean;
  isActive: boolean;
  onClick: () => void;
  variant?: 'carousel' | 'grid' | 'drawer';
}

export const QuestionChip = React.memo<QuestionChipProps>(({
  index,
  isAnswered,
  isMarked,
  isActive,
  onClick,
  variant = 'grid',
}) => {
  let chipClass = 'bg-slate-100 text-slate-600 border-slate-200';
  if (isMarked) {
    chipClass = 'bg-yellow-400 text-yellow-950 border-yellow-500 font-extrabold';
  } else if (isAnswered) {
    chipClass = 'bg-emerald-500 text-white border-emerald-600 font-bold';
  }

  if (isActive) {
    chipClass += ' ring-2 ring-blue-500 ring-offset-1 border-blue-600 font-black';
    if (variant === 'carousel') {
      chipClass += ' scale-105';
    }
  }

  const sizeClass =
    variant === 'carousel'
      ? 'min-w-[36px] h-9 px-2 text-xs'
      : variant === 'drawer'
      ? 'h-11 text-sm'
      : 'w-10 h-10 text-xs hover:scale-105';

  return (
    <button
      id={`chip-q-${index}`}
      type="button"
      onClick={onClick}
      className={`${sizeClass} rounded-xl border flex items-center justify-center font-display shrink-0 transition-transform cursor-pointer ${chipClass}`}
    >
      {index + 1}
    </button>
  );
});

QuestionChip.displayName = 'QuestionChip';
