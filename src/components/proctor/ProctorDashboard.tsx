import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  RotateCcw,
  Activity,
  BarChart3,
  LogOut,
  RefreshCw,
  School,
  Sparkles,
  ArrowLeft,
} from 'lucide-react';
import { ProctorSession, Exam, Participant, Result } from '../../types';
import { ResetPesertaTab } from './ResetPesertaTab';
import { PantauUjianTab } from './PantauUjianTab';
import { HasilUjianTab } from './HasilUjianTab';
import { getExams, getParticipants, getAllResults } from '../../services/firebase/examService';

interface ProctorDashboardProps {
  proctorSession: ProctorSession;
  onLogout: () => void;
  onGoHome: () => void;
}

type ProctorTab = 'reset' | 'monitor' | 'results';

export const ProctorDashboard: React.FC<ProctorDashboardProps> = ({
  proctorSession,
  onLogout,
  onGoHome,
}) => {
  const [currentTab, setCurrentTab] = useState<ProctorTab>('reset');
  const [exams, setExams] = useState<Exam[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [examList, partList, resList] = await Promise.all([
        getExams(),
        getParticipants(),
        getAllResults(),
      ]);
      setExams(examList);
      setParticipants(partList);
      setResults(resList);
    } catch (err) {
      console.error('Failed to load proctor data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Top Header */}
      <header className="bg-white border-b border-emerald-200/80 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Brand & Proctor Identity */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-500 text-white flex items-center justify-center font-display font-black text-xl shadow-xs">
              🛡️
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-display font-black text-lg text-slate-900 tracking-tight">
                  CBT CERIA
                </span>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] uppercase font-black px-2 py-0.5 rounded-full border border-emerald-200">
                  Portal Proktor
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium hidden sm:block">
                Pengawasan & Pengendalian Sesi Ruang Ujian
              </p>
            </div>
          </div>

          {/* Right Action: Proctor Info + Logout */}
          <div className="flex items-center space-x-3">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-black text-slate-900">{proctorSession.name}</span>
              <span className="text-[10px] text-emerald-700 font-bold">
                {proctorSession.roomOrLab || 'Pengawas Ruangan'} • @{proctorSession.username}
              </span>
            </div>

            <button
              type="button"
              onClick={onLogout}
              className="flex items-center space-x-1.5 text-xs font-bold text-red-600 hover:bg-red-50 px-3 py-2 rounded-xl border border-red-200 transition-colors cursor-pointer"
              title="Keluar dari Portal Proktor"
            >
              <LogOut className="w-4 h-4 text-red-500" />
              <span>Keluar</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs (3 Dedicated Features) */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center space-x-2 border-t border-slate-100 py-2 overflow-x-auto">
          <button
            type="button"
            id="proctor-tab-reset"
            onClick={() => setCurrentTab('reset')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-display font-black transition-all flex items-center space-x-2 cursor-pointer shrink-0 ${
              currentTab === 'reset'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <RotateCcw className="w-4 h-4" />
            <span>1. Reset Peserta</span>
          </button>

          <button
            type="button"
            id="proctor-tab-monitor"
            onClick={() => setCurrentTab('monitor')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-display font-black transition-all flex items-center space-x-2 cursor-pointer shrink-0 ${
              currentTab === 'monitor'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>2. Pantau Ujian (Real-time)</span>
          </button>

          <button
            type="button"
            id="proctor-tab-results"
            onClick={() => setCurrentTab('results')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-display font-black transition-all flex items-center space-x-2 cursor-pointer shrink-0 ${
              currentTab === 'results'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>3. Hasil Ujian (Rekap)</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {loading ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-xs space-y-3">
            <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <div className="font-display font-black text-slate-800">
              Menghubungkan ke Data Ruang Ujian...
            </div>
          </div>
        ) : (
          <>
            {currentTab === 'reset' && (
              <ResetPesertaTab
                exams={exams}
                participants={participants}
                selectedExamId={selectedExamId}
                onSelectExamId={setSelectedExamId}
                onRefreshData={fetchData}
              />
            )}

            {currentTab === 'monitor' && (
              <PantauUjianTab
                exams={exams}
                participants={participants}
                selectedExamId={selectedExamId}
                onSelectExamId={setSelectedExamId}
                onRefreshData={fetchData}
                onNavigateToReset={() => setCurrentTab('reset')}
              />
            )}

            {currentTab === 'results' && (
              <HasilUjianTab
                exams={exams}
                results={results}
                selectedExamId={selectedExamId}
                onSelectExamId={setSelectedExamId}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
};
