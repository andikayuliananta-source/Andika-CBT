import React, { useState } from 'react';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Copy,
  CheckCircle2,
  XCircle,
  ToggleLeft,
  ToggleRight,
  Sparkles,
  Calendar,
  Clock,
  Shuffle,
  Eye,
  BookOpen,
  RotateCcw,
} from 'lucide-react';
import { Exam, ExamStatus, GradeLevel, CurriculumPhase, Participant } from '../../types';
import {
  createExam,
  updateExam,
  deleteExam,
  duplicateExam,
} from '../../services/firebase/examService';
import { ResetParticipantsModal } from './ResetParticipantsModal';

interface ExamManagerProps {
  exams: Exam[];
  participants?: Participant[];
  onRefresh: () => void;
  currentUserUid: string;
}

export const ExamManager: React.FC<ExamManagerProps> = ({
  exams,
  participants = [],
  onRefresh,
  currentUserUid,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [gradeFilter, setGradeFilter] = useState<string>('ALL');

  // Reset Participant Modal State
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetTargetExamId, setResetTargetExamId] = useState<string>('ALL');
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExam, setEditingExam] = useState<Exam | null>(null);

  // Form Fields
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [grade, setGrade] = useState<GradeLevel>('6');
  const [phase, setPhase] = useState<CurriculumPhase>('C');
  const [description, setDescription] = useState('');
  const [token, setToken] = useState('');
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [kkm, setKkm] = useState(75);
  const [status, setStatus] = useState<ExamStatus>('ACTIVE');
  const [showScore, setShowScore] = useState(true);
  const [showAnswerReview, setShowAnswerReview] = useState(true);
  const [shuffleQuestions, setShuffleQuestions] = useState(false);
  const [shuffleOptions, setShuffleOptions] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Auto-generate token helper
  const handleGenerateToken = () => {
    const prefixes = ['CERIA', 'MAT', 'IPA', 'IPS', 'BINA', 'UJIAN'];
    const randomPrefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const randomDigits = Math.floor(10 + Math.random() * 90);
    setToken(`${randomPrefix}${grade}A${randomDigits}`);
  };

  // Auto-heal any active exam whose endAt is in the past so Firestore data is always fresh
  React.useEffect(() => {
    exams.forEach((ex) => {
      if (ex.status === 'ACTIVE' && ex.endAt && new Date(ex.endAt) < new Date()) {
        const futureEndAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
        updateExam(ex.examId, { endAt: futureEndAt })
          .then(() => onRefresh())
          .catch(() => {});
      }
    });
  }, [exams, onRefresh]);

  const openCreateModal = () => {
    setEditingExam(null);
    setTitle('');
    setSubject('Matematika');
    setGrade('6');
    setPhase('C');
    setDescription('');
    handleGenerateToken();
    setStartAt(new Date().toISOString().slice(0, 16));
    setEndAt(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16));
    setDurationMinutes(60);
    setKkm(75);
    setStatus('ACTIVE');
    setShowScore(true);
    setShowAnswerReview(true);
    setShuffleQuestions(false);
    setShuffleOptions(false);
    setIsModalOpen(true);
  };

  const openEditModal = (ex: Exam) => {
    setEditingExam(ex);
    setTitle(ex.title);
    setSubject(ex.subject);
    setGrade(ex.grade);
    setPhase(ex.phase);
    setDescription(ex.description || '');
    setToken(ex.token);
    setStartAt(ex.startAt ? new Date(ex.startAt).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16));
    setEndAt(
      ex.endAt && new Date(ex.endAt) > new Date()
        ? new Date(ex.endAt).toISOString().slice(0, 16)
        : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16)
    );
    setDurationMinutes(ex.durationMinutes || 60);
    setKkm(ex.kkm || 75);
    setStatus(ex.status);
    setShowScore(ex.showScore ?? true);
    setShowAnswerReview(ex.showAnswerReview ?? true);
    setShuffleQuestions(ex.shuffleQuestions ?? false);
    setShuffleOptions(ex.shuffleOptions ?? false);
    setIsModalOpen(true);
  };

  const handleSaveExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !token.trim()) return;

    setSubmitting(true);
    try {
      const payload = {
        title: title.trim(),
        subject: subject.trim(),
        grade,
        phase,
        description: description.trim(),
        token: token.trim().toUpperCase(),
        startAt: startAt ? new Date(startAt).toISOString() : new Date().toISOString(),
        endAt:
          status === 'ACTIVE'
            ? (endAt && new Date(endAt) > new Date()
                ? new Date(endAt).toISOString()
                : new Date(Date.now() + 365 * 86400000).toISOString())
            : (endAt ? new Date(endAt).toISOString() : new Date(Date.now() + 365 * 86400000).toISOString()),
        durationMinutes: Number(durationMinutes),
        kkm: Number(kkm),
        status,
        showScore,
        showAnswerReview,
        shuffleQuestions,
        shuffleOptions,
        createdBy: currentUserUid || 'guru_cbt',
      };

      if (editingExam) {
        await updateExam(editingExam.examId, payload);
      } else {
        await createExam(payload);
      }

      setIsModalOpen(false);
      onRefresh();
    } catch (err) {
      alert('Gagal menyimpan ujian. Pastikan format isian benar.');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteExam = async (examId: string, examTitle: string) => {
    if (confirm(`Apakah Anda yakin ingin menghapus ujian "${examTitle}" beserta seluruh soalnya?`)) {
      try {
        await deleteExam(examId);
        onRefresh();
      } catch (err) {
        alert('Gagal menghapus ujian.');
      }
    }
  };

  const handleDuplicateExam = async (examId: string) => {
    try {
      await duplicateExam(examId, currentUserUid);
      onRefresh();
    } catch (err) {
      alert('Gagal menduplikasi ujian.');
    }
  };

  const handleToggleStatus = async (exam: Exam) => {
    const nextStatus: ExamStatus = exam.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      const updates: Partial<Exam> = { status: nextStatus };
      if (nextStatus === 'ACTIVE') {
        updates.endAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
      }
      await updateExam(exam.examId, updates);
      onRefresh();
    } catch (err) {
      alert('Gagal mengubah status ujian.');
    }
  };

  // Filtered exams
  const filteredExams = exams.filter((ex) => {
    const matchSearch =
      ex.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ex.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ex.token.toLowerCase().includes(searchTerm.toLowerCase());
    const matchGrade = gradeFilter === 'ALL' || ex.grade === gradeFilter;
    return matchSearch && matchGrade;
  });

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-display font-black text-2xl text-slate-900">
            Manajemen Ujian
          </h2>
          <p className="text-xs text-slate-500 font-semibold">
            Kelola jadwal, durasi, KKM, dan token ujian siswa
          </p>
        </div>

        <button
          id="btn-add-exam-modal"
          onClick={openCreateModal}
          className="bg-blue-600 hover:bg-blue-700 text-white font-display font-extrabold text-sm px-5 py-2.5 rounded-2xl shadow-xs transition-colors flex items-center space-x-2 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Ujian</span>
        </button>
      </div>

      {/* Action Success Toast */}
      {actionSuccessMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-950 px-4 py-3 rounded-2xl flex items-center space-x-2 text-xs font-bold animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama ujian, mapel, atau token..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-xs font-bold text-slate-500 shrink-0">Filter Kelas:</span>
          <select
            value={gradeFilter}
            onChange={(e) => setGradeFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:border-blue-500"
          >
            <option value="ALL">Semua Kelas</option>
            <option value="1">Kelas 1 SD</option>
            <option value="2">Kelas 2 SD</option>
            <option value="3">Kelas 3 SD</option>
            <option value="4">Kelas 4 SD</option>
            <option value="5">Kelas 5 SD</option>
            <option value="6">Kelas 6 SD</option>
          </select>
        </div>
      </div>

      {/* Exam Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredExams.length === 0 ? (
          <div className="col-span-2 bg-white rounded-3xl p-12 text-center border border-slate-200 text-slate-400 font-semibold space-y-2">
            <div className="text-4xl">📚</div>
            <div>Belum ada ujian yang sesuai filter.</div>
          </div>
        ) : (
          filteredExams.map((ex) => {
            const examParts = participants.filter((p) => p.examId === ex.examId);
            const finishedParts = examParts.filter(
              (p) => p.status === 'SUBMITTED' || p.status === 'TIMEOUT'
            ).length;

            return (
              <div
                key={ex.examId}
                className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs hover:shadow-md transition-all space-y-4 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="bg-amber-100 text-amber-900 font-extrabold text-[11px] px-2.5 py-0.5 rounded-md">
                        Kelas {ex.grade} SD (Fase {ex.phase})
                      </span>
                      <span className="text-xs font-bold text-slate-500">• {ex.subject}</span>
                    </div>

                    {/* Status badge */}
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        ex.status === 'ACTIVE'
                          ? 'bg-emerald-100 text-emerald-800'
                          : ex.status === 'DRAFT'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {ex.status}
                    </span>
                  </div>

                  <h3 className="font-display font-extrabold text-base sm:text-lg text-slate-900 leading-snug">
                    {ex.title}
                  </h3>
                  {ex.description && (
                    <p className="text-xs text-slate-500 line-clamp-2 mt-1 font-medium">
                      {ex.description}
                    </p>
                  )}

                  {/* Exam Specs info */}
                  <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-100 text-xs font-semibold text-slate-600">
                    <div className="flex items-center space-x-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>Durasi: <strong>{ex.durationMinutes} Menit</strong></span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <span>🎯 KKM: <strong>{ex.kkm}</strong></span>
                    </div>
                    <div className="flex items-center justify-between col-span-2 pt-1 border-t border-slate-50">
                      <div className="flex items-center space-x-1">
                        <span>🔑 Token: </span>
                        <span className="font-mono font-black bg-amber-50 text-amber-900 px-2 py-0.5 rounded border border-amber-200">
                          {ex.token}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-bold">
                        👥 {examParts.length} Peserta {finishedParts > 0 ? `(${finishedParts} selesai)` : ''}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  {/* Status toggle */}
                  <button
                    onClick={() => handleToggleStatus(ex)}
                    className={`flex items-center space-x-1 font-bold px-2 py-1 rounded-lg transition-colors cursor-pointer ${
                      ex.status === 'ACTIVE'
                        ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                        : 'text-slate-600 bg-slate-100 hover:bg-slate-200'
                    }`}
                  >
                    {ex.status === 'ACTIVE' ? <ToggleRight className="w-4 h-4 text-emerald-600" /> : <ToggleLeft className="w-4 h-4 text-slate-400" />}
                    <span>{ex.status === 'ACTIVE' ? 'Aktif' : 'Nonaktif'}</span>
                  </button>

                  <div className="flex items-center space-x-1">
                    {/* Reset Participants for this exam */}
                    <button
                      onClick={() => {
                        setResetTargetExamId(ex.examId);
                        setIsResetModalOpen(true);
                      }}
                      title="Reset Peserta Ujian Ini (Hemat Kuota Database)"
                      className="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleDuplicateExam(ex.examId)}
                      title="Duplikasi Ujian"
                      className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => openEditModal(ex)}
                      title="Edit Ujian"
                      className="p-1.5 text-slate-600 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteExam(ex.examId, ex.title)}
                      title="Hapus Ujian"
                      className="p-1.5 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* CREATE / EDIT EXAM MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-7 border-2 border-blue-200 shadow-2xl max-h-[90vh] overflow-y-auto space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-display font-black text-xl text-slate-900">
                {editingExam ? 'Edit Data Ujian' : 'Tambah Ujian Baru'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveExam} className="space-y-4 text-xs font-semibold">
              <div>
                <label className="block text-slate-700 font-bold uppercase mb-1">
                  Nama Ujian
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Contoh: Penilaian Harian Matematika Bab Pecahan"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-blue-500 font-bold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold uppercase mb-1">
                    Mata Pelajaran
                  </label>
                  <input
                    type="text"
                    required
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Matematika, IPA, dll"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold uppercase mb-1">
                    Kelas SD
                  </label>
                  <select
                    value={grade}
                    onChange={(e) => setGrade(e.target.value as GradeLevel)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-blue-500 font-bold"
                  >
                    <option value="1">Kelas 1</option>
                    <option value="2">Kelas 2</option>
                    <option value="3">Kelas 3</option>
                    <option value="4">Kelas 4</option>
                    <option value="5">Kelas 5</option>
                    <option value="6">Kelas 6</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-bold uppercase mb-1">
                    Fase Kurikulum
                  </label>
                  <select
                    value={phase}
                    onChange={(e) => setPhase(e.target.value as CurriculumPhase)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-blue-500 font-bold"
                  >
                    <option value="A">Fase A (Kelas 1-2)</option>
                    <option value="B">Fase B (Kelas 3-4)</option>
                    <option value="C">Fase C (Kelas 5-6)</option>
                  </select>
                </div>
              </div>

              {/* Token & Durasi & KKM */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-700 font-bold uppercase">Token Ujian</label>
                    <button
                      type="button"
                      onClick={handleGenerateToken}
                      className="text-[11px] text-blue-600 font-bold hover:underline"
                    >
                      Acak
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    value={token}
                    onChange={(e) => setToken(e.target.value.toUpperCase())}
                    placeholder="Contoh: MAT6A26"
                    className="w-full px-3.5 py-2.5 bg-amber-50 border border-amber-300 rounded-xl text-amber-950 font-mono font-black focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold uppercase mb-1">
                    Durasi (Menit)
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={240}
                    required
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-blue-500 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold uppercase mb-1">
                    KKM (Nilai Kelulusan)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    required
                    value={kkm}
                    onChange={(e) => setKkm(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-blue-500 font-bold"
                  />
                </div>
              </div>

              {/* Deskripsi */}
              <div>
                <label className="block text-slate-700 font-bold uppercase mb-1">
                  Deskripsi / Petunjuk Pengerjaan
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Petunjuk khusus untuk siswa..."
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Status Ujian */}
              <div>
                <label className="block text-slate-700 font-bold uppercase mb-1">
                  Status Ujian
                </label>
                <div className="flex gap-2">
                  {(['ACTIVE', 'DRAFT', 'FINISHED', 'INACTIVE'] as ExamStatus[]).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setStatus(st)}
                      className={`px-3 py-1.5 rounded-xl font-extrabold text-[11px] border transition-colors ${
                        status === st
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Jadwal & Ketersediaan Token */}
              <div className="bg-blue-50/70 rounded-2xl p-4 border border-blue-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-blue-950 font-bold uppercase text-[11px] flex items-center space-x-1.5">
                    <Calendar className="w-3.5 h-3.5 text-blue-600" />
                    <span>Jadwal & Ketersediaan Token</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setStartAt(new Date().toISOString().slice(0, 16));
                      setEndAt(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16));
                    }}
                    className="text-[11px] text-blue-700 font-extrabold hover:underline cursor-pointer"
                  >
                    ⚡ Set 1 Tahun (Selalu Aktif)
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Mulai Ujian</label>
                    <input
                      type="datetime-local"
                      value={startAt}
                      onChange={(e) => setStartAt(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-semibold text-slate-800 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Batas Selesai Ujian</label>
                    <input
                      type="datetime-local"
                      value={endAt}
                      onChange={(e) => setEndAt(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-semibold text-slate-800 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <p className="text-[11px] text-blue-900/80 font-semibold leading-relaxed">
                  💡 <strong>Catatan:</strong> Selama Status Ujian adalah <strong>ACTIVE (Aktif)</strong>, siswa di portal siswa selalu dapat memasukkan token dan mengerjakan ujian tanpa terhalang tanggal kadaluarsa.
                </p>
              </div>

              {/* Checkboxes Settings */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-2.5">
                <div className="text-slate-800 font-bold uppercase text-[11px] mb-1">
                  Pengaturan Tampilan & Pengacakan
                </div>
                <label className="flex items-center space-x-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showScore}
                    onChange={(e) => setShowScore(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600"
                  />
                  <span>Tampilkan nilai langsung kepada siswa setelah ujian selesai</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showAnswerReview}
                    onChange={(e) => setShowAnswerReview(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600"
                  />
                  <span>Tampilkan pembahasan kunci jawaban kepada siswa</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={shuffleQuestions}
                    onChange={(e) => setShuffleQuestions(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600"
                  />
                  <span>Acak urutan butir soal</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={shuffleOptions}
                    onChange={(e) => setShuffleOptions(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600"
                  />
                  <span>Acak pilihan jawaban (A, B, C, D)</span>
                </label>
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-display font-extrabold rounded-xl shadow-xs transition-colors"
                >
                  {submitting ? 'Menyimpan...' : 'Simpan Ujian'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Participants Modal */}
      <ResetParticipantsModal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        exams={exams}
        participants={participants}
        initialExamId={resetTargetExamId}
        onResetSuccess={(res) => {
          setActionSuccessMsg(
            `Sukses mereset ${res.deletedParticipants} peserta dan ${res.deletedAnswers} dokumen jawaban di Firestore!`
          );
          onRefresh();
          setTimeout(() => setActionSuccessMsg(null), 5000);
        }}
      />
    </div>
  );
};
