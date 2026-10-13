import React, { useState, useEffect } from 'react';
import { User, Exam, Question, Participant, Result } from '../types';
import { TeacherSidebar, TeacherTab } from '../components/teacher/TeacherSidebar';
import { DashboardOverview } from '../components/teacher/DashboardOverview';
import { ExamManager } from '../components/teacher/ExamManager';
import { QuestionBank } from '../components/teacher/QuestionBank';
import { ExcelImporter } from '../components/teacher/ExcelImporter';
import { ResultsAnalytics } from '../components/teacher/ResultsAnalytics';
import { ParticipantMonitor } from '../components/teacher/ParticipantMonitor';
import { SettingsView } from '../components/teacher/SettingsView';
import {
  getExams,
  getParticipants,
  getAllResults,
  getQuestions,
  seedSampleSDExams,
} from '../services/firebase/examService';
import { logoutTeacher } from '../services/firebase/authService';

interface TeacherPortalProps {
  currentUser: User;
  onLogout: () => void;
  onSwitchToStudentView: () => void;
}

export const TeacherPortal: React.FC<TeacherPortalProps> = ({
  currentUser,
  onLogout,
  onSwitchToStudentView,
}) => {
  const [currentTab, setCurrentTab] = useState<TeacherTab>('dashboard');
  const [exams, setExams] = useState<Exam[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [totalQuestionsCount, setTotalQuestionsCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  // Fetch all teacher data
  const fetchData = async () => {
    try {
      setLoading(true);
      let examList = await getExams();

      // If no exams yet, seed initial SD demo exams so teacher has instant playground!
      if (examList.length === 0) {
        await seedSampleSDExams(currentUser.uid);
        examList = await getExams();
      }

      setExams(examList);

      const [partList, resList] = await Promise.all([
        getParticipants(),
        getAllResults(),
      ]);

      setParticipants(partList);
      setResults(resList);

      // Calculate questions across exams
      let qTotal = 0;
      for (const ex of examList.slice(0, 5)) {
        try {
          const qs = await getQuestions(ex.examId);
          qTotal += qs.length;
        } catch (e) {
          // ignore
        }
      }
      setTotalQuestionsCount(qTotal);
    } catch (err) {
      console.error('Error fetching teacher data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleLogout = async () => {
    try {
      await logoutTeacher();
    } catch (e) {
      // ignore
    }
    onLogout();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Top Banner for Teacher Portal */}
      <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3.5 flex items-center justify-between shadow-xs sticky top-0 z-30">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-display font-black text-xl shadow-xs">
            🎒
          </div>
          <div>
            <div className="font-display font-black text-slate-900 text-base sm:text-lg flex items-center space-x-1.5">
              <span>CBT CERIA</span>
              <span className="text-[11px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full uppercase">
                Portal Guru
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-semibold hidden sm:block">
              Sistem Penilaian Berbasis Komputer Ramah Anak SD
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {/* Active Admin Security Indicator */}
          <div className="hidden lg:flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-950 text-xs font-bold shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Administrator: <strong className="text-blue-700">{currentUser.email}</strong></span>
            <span className="bg-emerald-100 text-emerald-800 text-[10px] px-1.5 py-0.5 rounded font-black uppercase">Terkunci & Aman</span>
          </div>

          {/* Quick toggle to Student Entrance */}
          <button
            onClick={onSwitchToStudentView}
            className="px-3 py-1.5 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold text-xs transition-colors flex items-center space-x-1 cursor-pointer"
          >
            <span>👀 Ke Portal Siswa</span>
          </button>
        </div>
      </header>

      {/* Main Body with Sidebar + Content */}
      <div className="flex-1 flex flex-col md:flex-row">
        {/* Sidebar Navigation */}
        <TeacherSidebar
          currentTab={currentTab}
          onSelectTab={setCurrentTab}
          currentUser={currentUser}
          onLogout={handleLogout}
        />

        {/* Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto overflow-x-hidden">
          {loading ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-xs space-y-3">
              <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <div className="font-display font-black text-slate-800">
                Memuat Data CBT CERIA...
              </div>
            </div>
          ) : (
            <>
              {currentTab === 'dashboard' && (
                <DashboardOverview
                  exams={exams}
                  totalQuestionsCount={totalQuestionsCount}
                  participants={participants}
                  results={results}
                  onNavigateTab={setCurrentTab}
                  onOpenCreateExam={() => setCurrentTab('exams')}
                />
              )}

              {currentTab === 'exams' && (
                <ExamManager
                  exams={exams}
                  participants={participants}
                  onRefresh={fetchData}
                  currentUserUid={currentUser.uid}
                />
              )}

              {currentTab === 'questions' && <QuestionBank exams={exams} />}

              {currentTab === 'participants' && (
                <ParticipantMonitor
                  participants={participants}
                  exams={exams}
                  onRefresh={fetchData}
                />
              )}

              {currentTab === 'results' && (
                <ResultsAnalytics
                  exams={exams}
                  results={results}
                  onRefresh={fetchData}
                />
              )}

              {currentTab === 'import' && (
                <ExcelImporter
                  exams={exams}
                  onImportSuccess={() => {
                    fetchData();
                    setCurrentTab('questions');
                  }}
                />
              )}

              {currentTab === 'settings' && (
                <SettingsView
                  onRefreshAll={fetchData}
                  exams={exams}
                  participants={participants}
                />
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
};
