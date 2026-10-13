import React from 'react';
import { Sparkles, GraduationCap, School, LogOut, ArrowLeft } from 'lucide-react';
import { User } from '../../types';

interface NavbarProps {
  currentView?: 'landing' | 'student' | 'teacher' | 'LANDING' | 'STUDENT_TOKEN' | 'STUDENT_CONFIRM' | 'STUDENT_EXAM' | 'STUDENT_RESULT' | 'TEACHER_PORTAL' | string;
  onNavigate?: (view: 'landing' | 'student' | 'teacher') => void;
  onGoHome?: () => void;
  onOpenStudentPortal?: () => void;
  onOpenTeacherPortal?: () => void;
  currentUser?: User | null;
  onLogout?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView = 'landing',
  onNavigate,
  onGoHome,
  onOpenStudentPortal,
  onOpenTeacherPortal,
  currentUser,
  onLogout,
}) => {
  const isLanding = currentView === 'landing' || currentView === 'LANDING';

  const handleHome = () => {
    if (onGoHome) {
      onGoHome();
    } else if (onNavigate) {
      onNavigate('landing');
    }
  };

  const handleStudent = () => {
    if (onOpenStudentPortal) {
      onOpenStudentPortal();
    } else if (onNavigate) {
      onNavigate('student');
    }
  };

  const handleTeacher = () => {
    if (onOpenTeacherPortal) {
      onOpenTeacherPortal();
    } else if (onNavigate) {
      onNavigate('teacher');
    }
  };

  return (
    <header id="main-header" className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-amber-200/70 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo and Brand */}
        <div
          id="brand-logo-btn"
          onClick={handleHome}
          className="flex items-center space-x-3 cursor-pointer group select-none"
        >
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-400 to-orange-400 flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="font-display font-extrabold text-xl sm:text-2xl text-amber-950 tracking-tight">
                CBT CERIA
              </span>
              <Sparkles className="w-4 h-4 text-amber-500 fill-amber-400 animate-pulse" />
            </div>
            <p className="text-[10px] text-amber-700/80 font-semibold tracking-wide hidden sm:block">
              Computer Based Test Ceria
            </p>
          </div>
        </div>

        {/* Portal Switching / Actions */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {!isLanding && (
            <button
              id="back-to-home-btn"
              type="button"
              onClick={handleHome}
              className="flex items-center space-x-1.5 text-xs sm:text-sm font-bold text-slate-600 hover:text-amber-600 px-3 py-1.5 rounded-xl hover:bg-amber-50 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Beranda</span>
            </button>
          )}

          {isLanding && (
            <div className="flex items-center space-x-2">
              <button
                id="header-student-btn"
                type="button"
                onClick={handleStudent}
                className="flex items-center space-x-1.5 text-xs sm:text-sm font-bold bg-amber-100/80 text-amber-900 hover:bg-amber-200/80 px-3.5 py-1.5 rounded-xl transition-all cursor-pointer"
              >
                <span>🎓</span>
                <span>Siswa</span>
              </button>
              <button
                id="header-teacher-btn"
                type="button"
                onClick={handleTeacher}
                className="flex items-center space-x-1.5 text-xs sm:text-sm font-bold bg-blue-600 text-white hover:bg-blue-700 px-3.5 py-1.5 rounded-xl shadow-xs transition-all cursor-pointer"
                title="Portal Guru & Administrator Terlindungi"
              >
                <span>🔐</span>
                <span>Guru / Admin</span>
              </button>
            </div>
          )}

          {currentView === 'teacher' && currentUser && (
            <div className="flex items-center space-x-2">
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-xs font-bold text-slate-800">{currentUser.name}</span>
                <span className="text-[10px] text-blue-600 font-semibold uppercase">{currentUser.role}</span>
              </div>
              <button
                id="teacher-logout-btn"
                onClick={onLogout}
                title="Keluar"
                className="flex items-center space-x-1 text-xs font-bold text-red-600 hover:bg-red-50 p-2 rounded-xl border border-red-200 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Keluar</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
