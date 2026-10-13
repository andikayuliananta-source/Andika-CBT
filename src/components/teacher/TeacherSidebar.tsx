import React from 'react';
import {
  LayoutDashboard,
  BookOpen,
  FileQuestion,
  Users,
  BarChart3,
  FileSpreadsheet,
  Settings,
  LogOut,
  Sparkles,
} from 'lucide-react';
import { User } from '../../types';

export type TeacherTab =
  | 'dashboard'
  | 'exams'
  | 'questions'
  | 'participants'
  | 'results'
  | 'import'
  | 'settings';

interface TeacherSidebarProps {
  currentTab: TeacherTab;
  onSelectTab: (tab: TeacherTab) => void;
  currentUser: User | null;
  onLogout: () => void;
}

export const TeacherSidebar: React.FC<TeacherSidebarProps> = ({
  currentTab,
  onSelectTab,
  currentUser,
  onLogout,
}) => {
  const menuItems: { tab: TeacherTab; label: string; icon: React.ReactNode }[] = [
    { tab: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
    { tab: 'exams', label: 'Ujian', icon: <BookOpen className="w-5 h-5" /> },
    { tab: 'questions', label: 'Bank Soal', icon: <FileQuestion className="w-5 h-5" /> },
    { tab: 'participants', label: 'Peserta', icon: <Users className="w-5 h-5" /> },
    { tab: 'results', label: 'Hasil Ujian', icon: <BarChart3 className="w-5 h-5" /> },
    { tab: 'import', label: 'Import Soal', icon: <FileSpreadsheet className="w-5 h-5" /> },
    { tab: 'settings', label: 'Pengaturan', icon: <Settings className="w-5 h-5" /> },
  ];

  return (
    <aside className="w-full md:w-64 bg-white border-r border-slate-200 flex flex-col shrink-0">
      {/* Teacher Profile Banner */}
      <div className="p-4 border-b border-slate-100 flex items-center space-x-3 bg-gradient-to-r from-blue-50 to-indigo-50/50">
        <div className="w-11 h-11 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-display font-black text-lg shadow-xs shrink-0">
          👑
        </div>
        <div className="overflow-hidden">
          <div className="text-xs font-black text-slate-900 truncate">
            {currentUser?.name || 'Andika Yuliananta, S.Pd.'}
          </div>
          <div className="text-[10px] font-bold text-blue-700 truncate">
            {currentUser?.email || 'andika.yuliananta@gmail.com'}
          </div>
          <div className="text-[9px] font-black text-emerald-800 bg-emerald-100/90 px-1.5 py-0.5 rounded-md inline-flex items-center space-x-1 mt-1">
            <span>🛡️ Admin Eksklusif</span>
          </div>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="p-3 space-y-1 flex-1 overflow-y-auto">
        {menuItems.map((item) => {
          const isActive = currentTab === item.tab;
          return (
            <button
              key={item.tab}
              id={`sidebar-tab-${item.tab}`}
              onClick={() => onSelectTab(item.tab)}
              className={`w-full flex items-center space-x-3 px-3.5 py-3 rounded-2xl text-xs sm:text-sm font-bold transition-all text-left cursor-pointer ${
                isActive
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <div className={isActive ? 'text-white' : 'text-slate-400'}>
                {item.icon}
              </div>
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Bottom Logout Action */}
      <div className="p-3 border-t border-slate-100">
        <button
          id="sidebar-logout-btn"
          onClick={onLogout}
          className="w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
        >
          <LogOut className="w-5 h-5 text-red-500" />
          <span>🚪 Logout</span>
        </button>
      </div>
    </aside>
  );
};
