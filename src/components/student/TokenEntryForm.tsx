import React, { useState } from 'react';
import { Rocket, School, User as UserIcon, Key, CheckCircle, AlertCircle, Loader2, BookOpen, Clock, ArrowLeft } from 'lucide-react';
import { Exam, GradeLevel } from '../../types';
import { getExamByToken, getQuestions, DEFAULT_DEMO_QUESTIONS } from '../../services/firebase/examService';

interface TokenEntryFormProps {
  onSuccess?: (exam: Exam, studentData: { name: string; school: string; grade: GradeLevel }, questionsCount?: number) => void;
  onExamVerified?: (exam: Exam, studentData: { name: string; school: string; grade: GradeLevel }, questionsCount?: number) => void;
  onBack?: () => void;
  initialToken?: string;
}

export const TokenEntryForm: React.FC<TokenEntryFormProps> = ({
  onSuccess,
  onExamVerified,
  onBack,
  initialToken = '',
}) => {
  const [name, setName] = useState('');
  const [school, setSchool] = useState('');
  const [grade, setGrade] = useState<GradeLevel>('6');
  const [token, setToken] = useState(initialToken);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Preview verified exam
  const [verifiedExam, setVerifiedExam] = useState<Exam | null>(null);
  const [verifiedQuestionsCount, setVerifiedQuestionsCount] = useState<number>(0);

  const handleValidateToken = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Form field validations
    if (!name.trim()) {
      setErrorMessage('Nama lengkap tidak boleh kosong ya! 😊');
      return;
    }
    if (!school.trim()) {
      setErrorMessage('Asal sekolah harus diisi.');
      return;
    }
    if (!token.trim()) {
      setErrorMessage('Masukkan token ujian yang diberikan oleh gurumu.');
      return;
    }

    setLoading(true);
    try {
      const result = await getExamByToken(token);
      if (result.error || !result.exam) {
        setErrorMessage(result.error || 'Token ujian tidak ditemukan.');
        setVerifiedExam(null);
        setLoading(false);
        return;
      }

      // Check if student has a finished flag in local storage
      const normName = name.trim().toLowerCase();
      const finishedKey = `cbt_finished_${result.exam.examId}_${normName}`;
      if (localStorage.getItem(finishedKey) === 'true') {
        // Clean it up or warn user
        localStorage.removeItem(finishedKey);
        localStorage.removeItem(`cbt_session_${result.exam.examId}`);
      }

      // Fetch questions count for preview
      let questions = await getQuestions(result.exam.examId);
      if (questions.length === 0) {
        questions = DEFAULT_DEMO_QUESTIONS;
      }
      setVerifiedExam(result.exam);
      setVerifiedQuestionsCount(questions.length);
    } catch (err) {
      setErrorMessage('Terjadi kendala saat memeriksa token. Silakan periksa kembali.');
      setVerifiedExam(null);
    } finally {
      setLoading(false);
    }
  };

  const handleProceedToConfirmation = () => {
    if (verifiedExam) {
      const callback = onSuccess || onExamVerified;
      if (callback) {
        callback(
          verifiedExam,
          { name: name.trim(), school: school.trim(), grade },
          verifiedQuestionsCount > 0 ? verifiedQuestionsCount : 5
        );
      }
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto p-4">
      {/* Student Entry Card */}
      <div className="bg-white rounded-3xl border-2 border-amber-200/90 shadow-lg p-6 sm:p-8">
        {/* Back to Home Button */}
        {onBack && (
          <div className="mb-4">
            <button
              id="token-back-to-home-btn"
              type="button"
              onClick={onBack}
              className="inline-flex items-center space-x-2 text-xs sm:text-sm font-bold text-slate-500 hover:text-amber-600 transition-colors py-1 px-3 rounded-xl hover:bg-amber-50 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Kembali ke Beranda</span>
            </button>
          </div>
        )}

        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto text-3xl mb-3 shadow-inner">
            🎓
          </div>
          <h2 className="font-display text-2xl sm:text-3xl font-black text-slate-800">
            Masuk Ujian Siswa
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 font-semibold mt-1">
            Isi datamu dengan teliti sebelum memulai ya!
          </p>
        </div>

        {/* Error notification */}
        {errorMessage && (
          <div className="mb-6 bg-red-50 border-2 border-red-200 text-red-700 px-4 py-3 rounded-2xl flex items-start space-x-3 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0 text-red-500 mt-0.5" />
            <div className="font-bold">{errorMessage}</div>
          </div>
        )}

        {!verifiedExam ? (
          <form onSubmit={handleValidateToken} className="space-y-4">
            {/* Nama Lengkap */}
            <div>
              <label htmlFor="student-name" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Nama Lengkap
              </label>
              <div className="relative">
                <UserIcon className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="student-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Masukkan nama lengkap"
                  className="w-full pl-11 pr-4 py-3 bg-amber-50/40 border-2 border-slate-200 rounded-2xl text-sm font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-400 focus:bg-white transition-colors"
                />
              </div>
            </div>

            {/* Asal Sekolah */}
            <div>
              <label htmlFor="student-school" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Asal Sekolah
              </label>
              <div className="relative">
                <School className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="student-school"
                  type="text"
                  required
                  value={school}
                  onChange={(e) => setSchool(e.target.value)}
                  placeholder="Masukkan nama sekolah"
                  className="w-full pl-11 pr-4 py-3 bg-amber-50/40 border-2 border-slate-200 rounded-2xl text-sm font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-400 focus:bg-white transition-colors"
                />
              </div>
            </div>

            {/* Kelas */}
            <div>
              <label htmlFor="student-grade" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Kelas
              </label>
              <select
                id="student-grade"
                value={grade}
                onChange={(e) => setGrade(e.target.value as GradeLevel)}
                className="w-full px-4 py-3 bg-amber-50/40 border-2 border-slate-200 rounded-2xl text-sm font-bold text-slate-800 focus:outline-none focus:border-amber-400 focus:bg-white transition-colors cursor-pointer"
              >
                <option value="1">Kelas 1</option>
                <option value="2">Kelas 2</option>
                <option value="3">Kelas 3</option>
                <option value="4">Kelas 4</option>
                <option value="5">Kelas 5</option>
                <option value="6">Kelas 6</option>
              </select>
            </div>

            {/* Token Ujian */}
            <div>
              <label htmlFor="student-token" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Token Ujian
              </label>
              <div className="relative">
                <Key className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-amber-500" />
                <input
                  id="student-token"
                  type="text"
                  required
                  value={token}
                  onChange={(e) => setToken(e.target.value.toUpperCase())}
                  placeholder="Masukkan token ujian"
                  className="w-full pl-11 pr-4 py-3 bg-amber-50/60 border-2 border-amber-300 rounded-2xl text-base font-mono font-black text-amber-950 placeholder-amber-400 tracking-wider uppercase focus:outline-none focus:border-amber-500 focus:bg-white transition-colors"
                />
              </div>
            </div>

            {/* Submit Token Button */}
            <button
              id="student-submit-token-btn"
              type="submit"
              disabled={loading}
              className="w-full mt-4 bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-white font-display font-extrabold text-lg py-3.5 px-6 rounded-2xl shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Memeriksa Token...</span>
                </>
              ) : (
                <>
                  <Rocket className="w-5 h-5" />
                  <span>🚀 MULAI UJIAN</span>
                </>
              )}
            </button>
          </form>
        ) : (
          /* SUCCESS VERIFICATION CARD */
          <div className="space-y-6">
            <div className="bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-5 text-emerald-950">
              <div className="flex items-center space-x-2 text-emerald-700 font-bold mb-3">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
                <span className="text-sm uppercase tracking-wide">Ujian Ditemukan!</span>
              </div>

              <h3 className="text-xl font-display font-black text-slate-900 mb-1">
                {verifiedExam.title}
              </h3>
              <p className="text-xs font-bold text-emerald-800 mb-4">
                Mata Pelajaran: {verifiedExam.subject}
              </p>

              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-emerald-200/80 text-xs font-semibold text-slate-700">
                <div className="flex items-center space-x-1.5">
                  <span className="text-base">🏫</span>
                  <span>Kelas: <strong>Kelas {verifiedExam.grade} SD</strong></span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <BookOpen className="w-4 h-4 text-emerald-700" />
                  <span>Jumlah Soal: <strong>{verifiedQuestionsCount} Butir</strong></span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <Clock className="w-4 h-4 text-emerald-700" />
                  <span>Durasi: <strong>{verifiedExam.durationMinutes} Menit</strong></span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="text-base">🎯</span>
                  <span>KKM: <strong>{verifiedExam.kkm}</strong></span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                id="reset-token-btn"
                type="button"
                onClick={() => setVerifiedExam(null)}
                className="w-full sm:w-1/3 py-3 px-4 border-2 border-slate-200 text-slate-600 font-bold rounded-2xl hover:bg-slate-50 transition-colors text-sm"
              >
                Ganti Token
              </button>
              <button
                id="student-ready-btn"
                type="button"
                onClick={handleProceedToConfirmation}
                className="w-full sm:w-2/3 bg-emerald-600 hover:bg-emerald-700 text-white font-display font-extrabold text-base py-3 px-6 rounded-2xl shadow-md hover:shadow-lg transition-all flex items-center justify-center space-x-2"
              >
                <CheckCircle className="w-5 h-5" />
                <span>✓ Saya Siap, Mulai Ujian</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
