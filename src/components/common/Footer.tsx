import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer id="cbt-footer" className="mt-auto border-t border-amber-200/60 bg-amber-100/40 py-6 px-4 text-center">
      <div className="max-w-5xl mx-auto flex flex-col items-center justify-center space-y-2">
        <div className="flex items-center space-x-2 text-amber-900 font-bold text-base">
          <span className="text-xl">🌟</span>
          <span>CBT CERIA</span>
          <span className="text-xs bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full font-semibold">SD Edition</span>
        </div>
        <p className="text-xs text-amber-800/80 font-medium">
          Belajar • Berlatih • Ujian • Berprestasi
        </p>
        <div className="pt-2 border-t border-amber-200/40 w-full max-w-md">
          <p className="text-xs font-bold text-slate-700">
            © 2026 CBT CERIA
          </p>
          <p className="text-xs text-slate-600 font-medium">
            By Andika Yuliananta, S.Pd.
          </p>
        </div>
      </div>
    </footer>
  );
};
