import React from 'react';
import { Rocket, BookOpen, Trophy, Star, Sparkles, CheckCircle2, ShieldCheck, Laptop } from 'lucide-react';
import { TopScorersLeaderboard } from '../components/landing/TopScorersLeaderboard';

interface LandingPageProps {
  onSelectPortal: (portal: 'student' | 'teacher') => void;
  onStartDemoExam?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onSelectPortal,
  onStartDemoExam = () => onSelectPortal('student'),
}) => {
  return (
    <div className="flex-1 flex flex-col justify-center py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto w-full text-center space-y-8">
        {/* Playful Hero Header */}
        <div className="space-y-3">
          <div className="inline-flex items-center space-x-2 bg-amber-100/90 text-amber-900 px-4 py-1.5 rounded-full text-xs sm:text-sm font-bold shadow-xs">
            <span>✨</span>
            <span>Aplikasi Ujian Berbasis Komputer Ramah Anak SD</span>
            <span>✨</span>
          </div>

          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-extrabold text-slate-800 tracking-tight leading-tight">
            Selamat Datang di <span className="text-amber-500">CBT CERIA!</span> 🎉
          </h1>

          <p className="text-lg sm:text-xl font-bold text-amber-800/90">
            "Belajar • Berlatih • Ujian • Berprestasi"
          </p>

          <p className="max-w-xl mx-auto text-sm sm:text-base text-slate-600 font-medium">
            Platform ujian online ceria dan interaktif khusus siswa Sekolah Dasar se-Indonesia.
            Mengerjakan soal jadi menyenangkan, aman, dan mudah!
          </p>
        </div>

        {/* Cheerful Graphic Illustration Card */}
        <div className="relative mx-auto max-w-2xl bg-gradient-to-br from-amber-100 via-orange-50 to-sky-50 rounded-3xl p-6 sm:p-8 border-2 border-amber-200/80 shadow-md overflow-hidden">
          {/* Decorative floating badges */}
          <div className="absolute -top-3 -left-3 bg-yellow-400 text-yellow-950 font-bold px-3 py-1 rounded-full text-xs rotate-[-8deg] shadow-sm flex items-center space-x-1">
            <Star className="w-3.5 h-3.5 fill-yellow-950" />
            <span>Pasti Bisa!</span>
          </div>
          <div className="absolute top-4 right-4 bg-emerald-500 text-white font-bold px-3 py-1 rounded-full text-xs rotate-[6deg] shadow-sm flex items-center space-x-1">
            <Trophy className="w-3.5 h-3.5" />
            <span>Juara Kelas</span>
          </div>

          {/* Central Animated Illustration / Mascot */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 my-2">
            <div className="w-32 h-32 sm:w-40 sm:h-40 bg-white rounded-3xl border-4 border-amber-300 shadow-sm flex flex-col items-center justify-center p-4 relative group hover:scale-105 transition-transform">
              <div className="text-5xl sm:text-6xl animate-soft-bounce">
                🧑‍🎓
              </div>
              <div className="flex items-center space-x-1 mt-2 text-xs font-extrabold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">
                <Laptop className="w-3.5 h-3.5" />
                <span>Siswa SD Cerdas</span>
              </div>
            </div>

            <div className="text-left space-y-2 max-w-xs">
              <div className="flex items-center space-x-2 text-xs font-bold text-slate-700">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Tanpa ribet bikin akun (pakai token ujian)</span>
              </div>
              <div className="flex items-center space-x-2 text-xs font-bold text-slate-700">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Autosave jawaban tersimpan otomatis</span>
              </div>
              <div className="flex items-center space-x-2 text-xs font-bold text-slate-700">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Tombol besar, tulisan jelas, bebas pusing</span>
              </div>
              <div className="flex items-center space-x-2 text-xs font-bold text-slate-700">
                <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
                <span>Penilaian jujur, aman, dan transparan</span>
              </div>
            </div>
          </div>
        </div>

        {/* TWO PRIMARY PORTALS (MANDATORY PROMINENT BUTTONS) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 max-w-2xl mx-auto pt-2">
          {/* PORTAL SISWA */}
          <button
            id="portal-siswa-card-btn"
            onClick={() => onSelectPortal('student')}
            className="group relative bg-gradient-to-b from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-white rounded-3xl p-6 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-1 text-center border-4 border-amber-300 flex flex-col items-center justify-between"
          >
            <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center text-4xl mb-3 group-hover:scale-110 transition-transform">
              🎓
            </div>
            <div>
              <h2 className="font-display text-2xl font-black tracking-wide text-white drop-shadow-xs">
                PORTAL SISWA
              </h2>
              <p className="text-amber-100 text-xs font-semibold mt-1">
                Masukkan nama, kelas, & token untuk mulai mengerjakan soal
              </p>
            </div>
            <div className="mt-4 bg-white text-amber-900 font-extrabold px-6 py-2.5 rounded-full text-sm shadow-sm group-hover:bg-amber-100 flex items-center space-x-2">
              <Rocket className="w-4 h-4 text-amber-600" />
              <span>Mulai sebagai Siswa</span>
            </div>
          </button>

          {/* PORTAL GURU */}
          <button
            id="portal-guru-card-btn"
            onClick={() => onSelectPortal('teacher')}
            className="group relative bg-gradient-to-b from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white rounded-3xl p-6 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-1 text-center border-4 border-blue-400 flex flex-col items-center justify-between"
          >
            <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center text-4xl mb-3 group-hover:scale-110 transition-transform">
              👨‍🏫
            </div>
            <div>
              <h2 className="font-display text-2xl font-black tracking-wide text-white drop-shadow-xs">
                PORTAL GURU
              </h2>
              <p className="text-blue-100 text-xs font-semibold mt-1">
                Kelola ujian, bank soal, pantau siswa, & unduh rekap nilai
              </p>
            </div>
            <div className="mt-4 bg-white text-blue-900 font-extrabold px-6 py-2.5 rounded-full text-sm shadow-sm group-hover:bg-blue-100 flex items-center space-x-2">
              <BookOpen className="w-4 h-4 text-blue-600" />
              <span>Masuk sebagai Guru</span>
            </div>
          </button>
        </div>

        {/* Quick Demo Test Action Banner */}
        <div className="pt-2">
          <div className="inline-flex flex-wrap items-center justify-center gap-2 bg-white/80 border border-amber-200 px-4 py-2 rounded-2xl text-xs text-slate-700 font-semibold shadow-xs">
            <span>💡 Coba langsung soal demo Matematika Kelas 6:</span>
            <button
              id="quick-demo-token-btn"
              onClick={onStartDemoExam}
              className="bg-amber-100 text-amber-900 hover:bg-amber-200 font-extrabold px-2.5 py-1 rounded-lg transition-colors inline-flex items-center space-x-1"
            >
              <span>Token:</span>
              <span className="font-mono underline">MAT6A26</span>
              <span>🚀</span>
            </button>
          </div>
        </div>

        {/* Top Scorers Leaderboard Component */}
        <TopScorersLeaderboard onStartExam={() => onSelectPortal('student')} />
      </div>
    </div>
  );
};
