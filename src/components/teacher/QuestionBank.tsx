import React, { useState, useEffect, useRef } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  Copy,
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  BookOpen,
  Check,
  ListChecks,
  CheckSquare,
  ZoomIn,
  X,
  Link2,
  FileImage,
  Sparkles,
  RefreshCw,
  Calculator,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  Table,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Eye,
  Pilcrow,
} from 'lucide-react';
import { Exam, Question, QuestionType, QuestionStatement } from '../../types';
import {
  getQuestions,
  addQuestion,
  updateQuestion,
  deleteQuestion,
  uploadQuestionImage,
} from '../../services/firebase/examService';
import { compressImageFile, formatBytes } from '../../utils/imageCompressor';
import { QuestionImage } from '../common/QuestionImage';
import {
  convertLatexToStandardMath,
  hasLatexCode,
  MATH_CBT_GUIDELINES,
  QUICK_MATH_SYMBOLS,
} from '../../utils/mathFormatter';
import {
  convertNewlinesToBreakTags,
  convertBreakTagsToNewlines,
  formatQuestionDisplay,
  insertTextAtCursor,
} from '../../utils/textFormatter';

interface QuestionBankProps {
  exams: Exam[];
}

export const QuestionBank: React.FC<QuestionBankProps> = ({ exams }) => {
  const [selectedExamId, setSelectedExamId] = useState<string>(
    exams[0]?.examId || ''
  );
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);

  // Modal form states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);

  // Form Fields
  const [questionType, setQuestionType] = useState<QuestionType>('SINGLE');
  const [questionText, setQuestionText] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imageMeta, setImageMeta] = useState<{ width?: number; height?: number; sizeText?: string } | null>(null);
  const [imageInputMode, setImageInputMode] = useState<'upload' | 'url'>('upload');
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [previewImageZoom, setPreviewImageZoom] = useState<string | null>(null);
  const [optionA, setOptionA] = useState('');
  const [optionB, setOptionB] = useState('');
  const [optionC, setOptionC] = useState('');
  const [optionD, setOptionD] = useState('');
  const [correctAnswer, setCorrectAnswer] = useState<'A' | 'B' | 'C' | 'D'>('A');
  const [correctAnswersComplex, setCorrectAnswersComplex] = useState<('A' | 'B' | 'C' | 'D')[]>(['A']);
  const [statements, setStatements] = useState<QuestionStatement[]>([
    { id: 's1', text: '', isCorrectTrue: true },
    { id: 's2', text: '', isCorrectTrue: false },
    { id: 's3', text: '', isCorrectTrue: true },
  ]);
  const [activeStatementIndex, setActiveStatementIndex] = useState<number | null>(null);
  const [weight, setWeight] = useState(20);
  const [explanation, setExplanation] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showMathGuide, setShowMathGuide] = useState(true);
  const [questionEditorTab, setQuestionEditorTab] = useState<'edit' | 'preview'>('edit');
  const questionTextareaRef = useRef<HTMLTextAreaElement>(null);
  const [activeField, setActiveField] = useState<
    'question' | 'optionA' | 'optionB' | 'optionC' | 'optionD' | 'explanation' | 'statement'
  >('question');

  // Check if any field contains raw LaTeX code
  const detectedLatex =
    hasLatexCode(questionText) ||
    hasLatexCode(optionA) ||
    hasLatexCode(optionB) ||
    hasLatexCode(optionC) ||
    hasLatexCode(optionD) ||
    hasLatexCode(explanation) ||
    statements.some((s) => hasLatexCode(s.text));

  // Insert standard math symbol or formula into the currently focused field (cursor-aware)
  const handleInsertMathSymbol = (sym: string) => {
    if (activeField === 'question') {
      if (questionTextareaRef.current) {
        const res = insertTextAtCursor(questionTextareaRef.current, sym);
        if (res) {
          setQuestionText(res.newText);
          setTimeout(() => {
            if (questionTextareaRef.current) {
              questionTextareaRef.current.focus();
              questionTextareaRef.current.setSelectionRange(res.selectionStart, res.selectionEnd);
            }
          }, 10);
          return;
        }
      }
      setQuestionText((prev) => prev + sym);
    } else if (activeField === 'optionA') {
      setOptionA((prev) => prev + sym);
    } else if (activeField === 'optionB') {
      setOptionB((prev) => prev + sym);
    } else if (activeField === 'optionC') {
      setOptionC((prev) => prev + sym);
    } else if (activeField === 'optionD') {
      setOptionD((prev) => prev + sym);
    } else if (activeField === 'explanation') {
      setExplanation((prev) => prev + sym);
    } else if (activeField === 'statement' && activeStatementIndex !== null) {
      setStatements((prev) =>
        prev.map((s, idx) =>
          idx === activeStatementIndex ? { ...s, text: s.text + sym } : s
        )
      );
    }
  };

  // WYSIWYG formatting toolbar actions for the question textarea
  const handleApplyFormat = (before: string, after: string = '') => {
    if (activeField === 'question' && questionTextareaRef.current) {
      const res = insertTextAtCursor(questionTextareaRef.current, before, after);
      if (res) {
        setQuestionText(res.newText);
        setTimeout(() => {
          if (questionTextareaRef.current) {
            questionTextareaRef.current.focus();
            questionTextareaRef.current.setSelectionRange(res.selectionStart, res.selectionEnd);
          }
        }, 10);
        return;
      }
    }
    handleInsertMathSymbol(before + after);
  };

  // Convert all LaTeX in current inputs into web CBT friendly text
  const handleConvertAllLatex = () => {
    setQuestionText((prev) => convertLatexToStandardMath(prev));
    setOptionA((prev) => convertLatexToStandardMath(prev));
    setOptionB((prev) => convertLatexToStandardMath(prev));
    setOptionC((prev) => (prev ? convertLatexToStandardMath(prev) : ''));
    setOptionD((prev) => (prev ? convertLatexToStandardMath(prev) : ''));
    setExplanation((prev) => (prev ? convertLatexToStandardMath(prev) : ''));
    setStatements((prev) =>
      prev.map((s) => ({
        ...s,
        text: convertLatexToStandardMath(s.text),
      }))
    );
  };

  // Refresh questions for current exam
  const fetchQuestions = async (examId: string) => {
    if (!examId) return;
    setLoading(true);
    try {
      const qList = await getQuestions(examId);
      setQuestions(qList);
    } catch (err) {
      console.error('Fetch questions error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!selectedExamId && exams.length > 0) {
      setSelectedExamId(exams[0].examId);
    }
  }, [exams, selectedExamId]);

  useEffect(() => {
    if (selectedExamId) {
      fetchQuestions(selectedExamId);
    }
  }, [selectedExamId]);

  // Process and compress image file instantly (< 50ms)
  const processImageFile = async (file: File) => {
    setImageError(null);
    setUploadingImage(true);
    try {
      const res = await compressImageFile(file, {
        maxDimension: 960,
        quality: 0.82,
        maxFileSizeMb: 10,
      });
      setImageUrl(res.dataUrl);
      setImageMeta({
        width: res.width,
        height: res.height,
        sizeText: formatBytes(res.sizeBytes),
      });
    } catch (err: any) {
      console.error('Image compression error:', err);
      setImageError(err.message || 'Gagal memproses gambar. Pastikan format JPG, PNG, WEBP, atau GIF.');
    } finally {
      setUploadingImage(false);
    }
  };

  // Handle image upload from computer file picker
  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processImageFile(file);
    e.target.value = ''; // Reset input to allow selecting same file if desired
  };

  // Listen for clipboard paste (Ctrl+V / Cmd+V) when modal is open
  useEffect(() => {
    if (!isModalOpen) return;
    const handlePaste = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement;
      // Don't intercept if user is typing/pasting text into text inputs
      if (
        (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA') &&
        imageInputMode !== 'url'
      ) {
        // If it's pure text being pasted into text field, let default paste happen
        if (!e.clipboardData?.types.includes('Files')) {
          return;
        }
      }

      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            e.preventDefault();
            setImageInputMode('upload');
            processImageFile(file);
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isModalOpen, imageInputMode]);

  const openCreateModal = () => {
    setEditingQuestion(null);
    setQuestionType('SINGLE');
    setQuestionText('');
    setQuestionEditorTab('edit');
    setImageUrl('');
    setImageMeta(null);
    setImageError(null);
    setImageInputMode('upload');
    setIsDraggingOver(false);
    setOptionA('');
    setOptionB('');
    setOptionC('');
    setOptionD('');
    setCorrectAnswer('A');
    setCorrectAnswersComplex(['A']);
    setStatements([
      { id: 's1', text: '', imageUrl: '', isCorrectTrue: true },
      { id: 's2', text: '', imageUrl: '', isCorrectTrue: false },
      { id: 's3', text: '', imageUrl: '', isCorrectTrue: true },
    ]);
    setActiveStatementIndex(null);
    setWeight(20);
    setExplanation('');
    setIsModalOpen(true);
  };

  const openEditModal = (q: Question) => {
    setEditingQuestion(q);
    setQuestionEditorTab('edit');
    const isCompTF = q.type === 'COMPLEX_TF' || (Array.isArray(q.statements) && q.statements.length > 0);
    const isComp = q.type === 'COMPLEX' || (Array.isArray(q.correctAnswers) && q.correctAnswers.length > 1);
    
    if (isCompTF) {
      setQuestionType('COMPLEX_TF');
    } else if (isComp) {
      setQuestionType('COMPLEX');
    } else {
      setQuestionType('SINGLE');
    }

    // Convert any stored <br> tags into standard newlines \n for editing in textarea
    const rawQuestion = typeof q.question === 'string' ? q.question : String(q.question || '');
    setQuestionText(convertBreakTagsToNewlines(rawQuestion));
    
    const safeImg = typeof q.imageUrl === 'string' ? q.imageUrl : '';
    setImageUrl(safeImg);
    setImageError(null);
    setIsDraggingOver(false);

    if (safeImg) {
      if (safeImg.startsWith('data:')) {
        const estBytes = Math.round((safeImg.length * 3) / 4);
        setImageMeta({ sizeText: formatBytes(estBytes) });
        setImageInputMode('upload');
      } else {
        setImageMeta(null);
        setImageInputMode('url');
      }
    } else {
      setImageMeta(null);
      setImageInputMode('upload');
    }

    setOptionA(typeof q.optionA === 'string' ? q.optionA : String(q.optionA || ''));
    setOptionB(typeof q.optionB === 'string' ? q.optionB : String(q.optionB || ''));
    setOptionC(typeof q.optionC === 'string' ? q.optionC : '');
    setOptionD(typeof q.optionD === 'string' ? q.optionD : '');
    setCorrectAnswer(q.correctAnswer || 'A');
    setCorrectAnswersComplex(
      Array.isArray(q.correctAnswers) && q.correctAnswers.length > 0
        ? q.correctAnswers
        : [q.correctAnswer || 'A']
    );

    if (q.statements && Array.isArray(q.statements) && q.statements.length > 0) {
      setStatements(
        q.statements.map((s, idx) => ({
          id: s.id || `s${idx + 1}`,
          text: convertBreakTagsToNewlines(typeof s.text === 'string' ? s.text : String(s.text || '')),
          imageUrl: typeof s.imageUrl === 'string' ? s.imageUrl : '',
          isCorrectTrue: typeof s.isCorrectTrue === 'boolean' ? s.isCorrectTrue : true,
        }))
      );
    } else {
      setStatements([
        { id: 's1', text: '', imageUrl: '', isCorrectTrue: true },
        { id: 's2', text: '', imageUrl: '', isCorrectTrue: false },
        { id: 's3', text: '', imageUrl: '', isCorrectTrue: true },
      ]);
    }
    setActiveStatementIndex(null);

    setWeight(q.weight || 20);
    setExplanation(convertBreakTagsToNewlines(typeof q.explanation === 'string' ? q.explanation : ''));
    setIsModalOpen(true);
  };

  const toggleComplexOption = (key: 'A' | 'B' | 'C' | 'D') => {
    setCorrectAnswersComplex((prev) => {
      if (prev.includes(key)) {
        return prev.filter((k) => k !== key);
      } else {
        return [...prev, key].sort();
      }
    });
  };

  const handleAddStatement = () => {
    if (statements.length >= 8) {
      alert('Maksimal 8 pernyataan per butir soal.');
      return;
    }
    const nextNum = statements.length + 1;
    const nextId = `s_${Date.now()}_${nextNum}`;
    setStatements((prev) => [...prev, { id: nextId, text: '', imageUrl: '', isCorrectTrue: true }]);
  };

  const handleRemoveStatement = (index: number) => {
    if (statements.length <= 2) {
      alert('Pilihan ganda kompleks model pernyataan minimal harus memiliki 2 pernyataan.');
      return;
    }
    setStatements((prev) => prev.filter((_, idx) => idx !== index));
    if (activeStatementIndex === index) {
      setActiveStatementIndex(null);
      setActiveField('question');
    }
  };

  const handleUpdateStatementText = (index: number, text: string) => {
    setStatements((prev) =>
      prev.map((s, idx) => (idx === index ? { ...s, text } : s))
    );
  };

  const handleUpdateStatementImage = (index: number, imageUrl: string) => {
    setStatements((prev) =>
      prev.map((s, idx) => (idx === index ? { ...s, imageUrl } : s))
    );
  };

  const handleToggleStatementKey = (index: number, isCorrectTrue: boolean) => {
    setStatements((prev) =>
      prev.map((s, idx) => (idx === index ? { ...s, isCorrectTrue } : s))
    );
  };

  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionText.trim()) {
      alert('Teks pertanyaan harus diisi!');
      return;
    }

    if (questionType === 'COMPLEX_TF') {
      if (statements.length < 2) {
        alert('Untuk Pilihan Ganda Kompleks (Benar/Salah), minimal harus ada 2 pernyataan!');
        return;
      }
      const hasEmptyStatement = statements.some((s) => !s.text.trim());
      if (hasEmptyStatement) {
        alert('Semua teks pernyataan harus diisi!');
        return;
      }
    } else {
      if (!optionA.trim() || !optionB.trim()) {
        alert('Pertanyaan dan minimal pilihan A & B harus diisi!');
        return;
      }
      if (questionType === 'COMPLEX' && correctAnswersComplex.length === 0) {
        alert('Untuk Pilihan Ganda Kompleks, pilih minimal 1 kunci jawaban yang benar!');
        return;
      }
    }

    setSubmitting(true);
    try {
      const sortedComplex = [...correctAnswersComplex].sort();
      const primaryAnswer =
        questionType === 'COMPLEX_TF'
          ? 'A'
          : questionType === 'COMPLEX'
          ? sortedComplex[0] || 'A'
          : correctAnswer;

      // Automatically convert any LaTeX formatting into clean web CBT standard text
      const cleanQuestion = convertLatexToStandardMath(questionText.trim());
      const cleanExplanation = explanation.trim() ? convertLatexToStandardMath(explanation.trim()) : '';

      // Convert all newlines (\n) to <br> tags before saving to Firestore so paragraphs and line breaks are preserved
      const finalQuestion = convertNewlinesToBreakTags(cleanQuestion);
      const finalExplanation = cleanExplanation ? convertNewlinesToBreakTags(cleanExplanation) : '';

      const payload: Omit<Question, 'questionId' | 'examId' | 'createdAt' | 'updatedAt'> = {
        number: editingQuestion ? editingQuestion.number : questions.length + 1,
        question: finalQuestion,
        type: questionType,
        optionA: questionType === 'COMPLEX_TF' ? 'Benar' : convertLatexToStandardMath(optionA.trim()),
        optionB: questionType === 'COMPLEX_TF' ? 'Salah' : convertLatexToStandardMath(optionB.trim()),
        correctAnswer: primaryAnswer,
        weight: Number(weight) || 1,
      };

      if (questionType === 'COMPLEX_TF') {
        payload.statements = statements.map((s, idx) => ({
          id: s.id || `s${idx + 1}`,
          text: convertNewlinesToBreakTags(convertLatexToStandardMath(s.text.trim())),
          ...(s.imageUrl && s.imageUrl.trim() ? { imageUrl: s.imageUrl.trim() } : {}),
          isCorrectTrue: Boolean(s.isCorrectTrue),
        }));
      } else if (questionType === 'COMPLEX') {
        payload.correctAnswers = sortedComplex;
      }

      if (questionType !== 'COMPLEX_TF') {
        const cleanOptionC = optionC.trim() ? convertLatexToStandardMath(optionC.trim()) : '';
        const cleanOptionD = optionD.trim() ? convertLatexToStandardMath(optionD.trim()) : '';

        if (cleanOptionC) {
          payload.optionC = cleanOptionC;
        } else if (editingQuestion) {
          payload.optionC = '';
        }

        if (cleanOptionD) {
          payload.optionD = cleanOptionD;
        } else if (editingQuestion) {
          payload.optionD = '';
        }
      } else if (editingQuestion) {
        payload.optionC = '';
        payload.optionD = '';
      }

      if (imageUrl.trim()) {
        payload.imageUrl = imageUrl.trim();
      } else if (editingQuestion) {
        payload.imageUrl = '';
      }

      if (finalExplanation) {
        payload.explanation = finalExplanation;
      } else if (editingQuestion) {
        payload.explanation = '';
      }

      if (editingQuestion) {
        await updateQuestion(selectedExamId, editingQuestion.questionId, payload);
      } else {
        await addQuestion(selectedExamId, payload);
      }

      setIsModalOpen(false);
      fetchQuestions(selectedExamId);
    } catch (err: any) {
      console.error('Error saving question:', err);
      alert('Gagal menyimpan butir soal: ' + (err?.message || 'Terjadi kesalahan sistem'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (questionId: string) => {
    if (confirm('Hapus butir soal ini?')) {
      try {
        await deleteQuestion(selectedExamId, questionId);
        fetchQuestions(selectedExamId);
      } catch (err: any) {
        alert('Gagal menghapus butir soal: ' + (err?.message || 'Terjadi kesalahan'));
      }
    }
  };

  const handleDuplicate = async (q: Question) => {
    try {
      const dupPayload: Omit<Question, 'questionId' | 'examId' | 'createdAt' | 'updatedAt'> = {
        number: questions.length + 1,
        question: `${q.question} (Salinan)`,
        type: q.type || 'SINGLE',
        optionA: q.optionA,
        optionB: q.optionB,
        correctAnswer: q.correctAnswer,
        weight: q.weight || 1,
      };
      if (q.type === 'COMPLEX' && q.correctAnswers) {
        dupPayload.correctAnswers = q.correctAnswers;
      }
      if (q.type === 'COMPLEX_TF' && q.statements) {
        dupPayload.statements = q.statements.map((s) => ({ ...s }));
      }
      if (q.imageUrl) dupPayload.imageUrl = q.imageUrl;
      if (q.optionC) dupPayload.optionC = q.optionC;
      if (q.optionD) dupPayload.optionD = q.optionD;
      if (q.explanation) dupPayload.explanation = q.explanation;

      await addQuestion(selectedExamId, dupPayload);
      fetchQuestions(selectedExamId);
    } catch (err: any) {
      console.error('Error duplicating question:', err);
      alert('Gagal menduplikasi soal: ' + (err?.message || 'Terjadi kesalahan'));
    }
  };

  const currentExam = exams.find((e) => e.examId === selectedExamId);

  return (
    <div className="space-y-6">
      {/* Header & Exam Selector */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display font-black text-2xl text-slate-900">
            Bank Soal Ujian
          </h2>
          <p className="text-xs text-slate-500 font-semibold">
            Kelola teks pertanyaan, gambar ilustrasi, opsi jawaban, dan kunci penilaian
          </p>
        </div>

        {selectedExamId && (
          <button
            onClick={openCreateModal}
            className="bg-amber-500 hover:bg-amber-600 text-white font-display font-extrabold text-sm px-5 py-2.5 rounded-2xl shadow-xs transition-colors flex items-center space-x-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Soal</span>
          </button>
        )}
      </div>

      {/* Select Exam Dropdown Card */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <label className="text-xs font-bold text-slate-700 uppercase shrink-0">
          Pilih Ujian:
        </label>
        <select
          value={selectedExamId}
          onChange={(e) => setSelectedExamId(e.target.value)}
          className="w-full sm:max-w-md bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs sm:text-sm font-bold text-slate-900 focus:outline-none focus:border-amber-500"
        >
          {exams.map((ex) => (
            <option key={ex.examId} value={ex.examId}>
              {ex.title} (Kelas {ex.grade} SD - {ex.subject})
            </option>
          ))}
        </select>
        {currentExam && (
          <span className="text-xs font-bold text-amber-800 bg-amber-100 px-3 py-1 rounded-xl">
            Token: <strong className="font-mono">{currentExam.token}</strong> • {questions.length} Butir Soal
          </span>
        )}
      </div>

      {/* Questions List */}
      <div className="space-y-4">
        {loading ? (
          <div className="bg-white rounded-3xl p-12 text-center text-slate-400 font-semibold">
            Memuat butir soal...
          </div>
        ) : questions.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 text-slate-400 font-semibold space-y-2">
            <div className="text-4xl">📝</div>
            <div>Belum ada butir soal pada ujian ini. Silakan tambah soal!</div>
          </div>
        ) : (
          questions.map((q, idx) => (
            <div
              key={q.questionId}
              className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4"
            >
              {/* Top bar of question */}
              <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-display font-extrabold text-sm text-slate-800 bg-slate-100 px-3 py-1 rounded-xl">
                    Nomor {idx + 1}
                  </span>
                  {q.type === 'COMPLEX_TF' ? (
                    <span className="text-[11px] font-extrabold text-teal-800 bg-teal-50 border border-teal-200 px-2.5 py-1 rounded-xl flex items-center space-x-1">
                      <Table className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                      <span>PG Kompleks (Pernyataan B/S)</span>
                    </span>
                  ) : q.type === 'COMPLEX' ? (
                    <span className="text-[11px] font-extrabold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-xl flex items-center space-x-1">
                      <ListChecks className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                      <span>PG Kompleks</span>
                    </span>
                  ) : (
                    <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-xl">
                      PG Biasa
                    </span>
                  )}
                  <span className="text-xs font-bold text-slate-500">
                    Bobot: {q.weight} Poin
                  </span>
                </div>

                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => handleDuplicate(q)}
                    title="Duplikasi Soal"
                    className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => openEditModal(q)}
                    title="Edit Soal"
                    className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(q.questionId)}
                    title="Hapus Soal"
                    className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Question Text */}
              <div
                className="font-bold text-slate-900 text-sm sm:text-base leading-relaxed whitespace-pre-wrap break-words"
                style={{
                  whiteSpace: 'pre-wrap',
                  overflowWrap: 'break-word',
                  wordBreak: 'break-word',
                }}
              >
                {formatQuestionDisplay(typeof q.question === 'string' ? q.question : String(q.question || ''))}
              </div>

              {/* Image with Lazy Loading and Fallback UI */}
              {q.imageUrl && typeof q.imageUrl === 'string' && q.imageUrl.trim() && (
                <QuestionImage
                  src={q.imageUrl}
                  alt="Ilustrasi Soal"
                  onZoom={() => setPreviewImageZoom(q.imageUrl || null)}
                  className="max-w-xs p-1"
                />
              )}

              {/* Options list / Statements list */}
              {q.type === 'COMPLEX_TF' && Array.isArray(q.statements) && q.statements.length > 0 ? (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-200">
                  <div className="bg-slate-100/80 px-4 py-2 flex items-center justify-between text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">
                    <span>Daftar Pernyataan Soal</span>
                    <span>Kunci Jawaban</span>
                  </div>
                  {q.statements.map((stmt, sIdx) => (
                    <div
                      key={stmt.id || sIdx}
                      className="px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                    >
                      <div className="flex items-start space-x-2 flex-1 min-w-0">
                        <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5 sm:mt-0">
                          {sIdx + 1}
                        </span>
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <span className="font-semibold text-slate-800 leading-snug block">
                            {stmt.text}
                          </span>
                          {stmt.imageUrl && (
                            <div className="pt-0.5">
                              <img
                                src={stmt.imageUrl}
                                alt={`Gambar pernyataan ${sIdx + 1}`}
                                onClick={() => setPreviewImageZoom(stmt.imageUrl || null)}
                                className="h-14 max-w-xs object-contain rounded-lg border border-slate-200 bg-white p-1 cursor-pointer hover:border-amber-400 shadow-2xs transition-all"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                      <span
                        className={`inline-flex items-center space-x-1 px-3 py-1 rounded-xl text-xs font-black uppercase shrink-0 self-start sm:self-auto ${
                          stmt.isCorrectTrue
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-rose-100 text-rose-800 border border-rose-300'
                        }`}
                      >
                        {stmt.isCorrectTrue ? (
                          <>
                            <Check className="w-3.5 h-3.5 stroke-[3] text-emerald-600" />
                            <span>Benar</span>
                          </>
                        ) : (
                          <>
                            <X className="w-3.5 h-3.5 stroke-[3] text-rose-600" />
                            <span>Salah</span>
                          </>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-semibold text-slate-700">
                  {(['A', 'B', 'C', 'D'] as const).map((key) => {
                    const rawVal =
                      key === 'A'
                        ? q.optionA
                        : key === 'B'
                        ? q.optionB
                        : key === 'C'
                        ? q.optionC
                        : q.optionD;

                    const val = typeof rawVal === 'string' ? rawVal : (rawVal ? String(rawVal) : '');

                    if (!val && (key === 'C' || key === 'D')) return null;

                    const isComplex = q.type === 'COMPLEX' || (Array.isArray(q.correctAnswers) && q.correctAnswers.length > 1);
                    const isCorrect = isComplex
                      ? (Array.isArray(q.correctAnswers) ? q.correctAnswers : [q.correctAnswer]).includes(key)
                      : q.correctAnswer === key;

                    return (
                      <div
                        key={key}
                        className={`p-2.5 rounded-xl border flex items-center space-x-2.5 ${
                          isCorrect
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-bold'
                            : 'bg-slate-50/60 border-slate-200'
                        }`}
                      >
                        <span
                          className={`w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 ${
                            isCorrect ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {key}
                        </span>
                        <span className="truncate">{val}</span>
                        {isCorrect && (
                          <span className="text-[10px] text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded ml-auto font-black uppercase flex items-center space-x-1">
                            <Check className="w-3 h-3 stroke-[3]" />
                            <span>Kunci</span>
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Explanation if any */}
              {q.explanation && typeof q.explanation === 'string' && q.explanation.trim() && (
                <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-100 italic">
                  💡 <strong>Pembahasan:</strong> {q.explanation}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* CREATE / EDIT QUESTION MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-7 border-2 border-amber-200 shadow-2xl max-h-[90vh] overflow-y-auto space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-display font-black text-xl text-slate-900">
                {editingQuestion ? 'Edit Butir Soal' : 'Tambah Butir Soal'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveQuestion} className="space-y-4 text-xs font-semibold">
              {/* Model Input Soal Switcher */}
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <label className="block text-slate-700 font-bold uppercase text-[11px] tracking-wider">
                    Model Input Soal
                  </label>
                  <span className="text-[11px] text-slate-500 font-medium">
                    {questionType === 'COMPLEX_TF'
                      ? 'Pilihan ganda kompleks pernyataan (siswa menjawab tiap pernyataan Benar atau Salah)'
                      : questionType === 'COMPLEX'
                      ? 'Pilihan ganda kompleks multi-jawaban (memilih lebih dari 1 opsi yang benar)'
                      : 'Pilihan ganda biasa (hanya 1 opsi jawaban yang benar)'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-0.5">
                  <button
                    type="button"
                    onClick={() => setQuestionType('SINGLE')}
                    className={`py-2 px-2.5 rounded-xl font-bold flex items-center justify-center space-x-1.5 border-2 transition-all cursor-pointer text-xs ${
                      questionType === 'SINGLE'
                        ? 'bg-amber-500 border-amber-600 text-white shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>PG Biasa</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setQuestionType('COMPLEX')}
                    className={`py-2 px-2.5 rounded-xl font-bold flex items-center justify-center space-x-1.5 border-2 transition-all cursor-pointer text-xs ${
                      questionType === 'COMPLEX'
                        ? 'bg-indigo-600 border-indigo-700 text-white shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <ListChecks className="w-4 h-4 shrink-0" />
                    <span>PG Kompleks</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setQuestionType('COMPLEX_TF')}
                    className={`py-2 px-2.5 rounded-xl font-bold flex items-center justify-center space-x-1.5 border-2 transition-all cursor-pointer text-xs ${
                      questionType === 'COMPLEX_TF'
                        ? 'bg-teal-600 border-teal-700 text-white shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <Table className="w-4 h-4 shrink-0" />
                    <span>PG Kompleks (B/S)</span>
                  </button>
                </div>
              </div>

              {/* CBT Web Math Standards & Quick Insert Bar */}
              <div className="bg-sky-50/90 border border-sky-200 rounded-2xl p-3.5 space-y-3 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-7 h-7 rounded-lg bg-sky-600 text-white flex items-center justify-center font-bold text-xs shadow-2xs">
                      ∑
                    </div>
                    <div>
                      <h4 className="font-display font-extrabold text-xs text-sky-950 uppercase tracking-wide flex items-center gap-1.5">
                        <span>Format Rumus Matematika Ramah CBT Web</span>
                        <span className="text-[10px] font-bold bg-sky-200/80 text-sky-800 px-2 py-0.2 rounded-full lowercase">
                          bebas latex
                        </span>
                      </h4>
                      <p className="text-[11px] text-sky-800/90 font-medium leading-tight">
                        Tuliskan rumus & simbol dengan teks standar agar tampil sempurna di layar ujian siswa SD
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowMathGuide(!showMathGuide)}
                    className="text-sky-700 hover:text-sky-950 font-bold text-[11px] flex items-center space-x-1 px-2 py-1 rounded-lg hover:bg-sky-100 transition-colors cursor-pointer"
                  >
                    <span>{showMathGuide ? 'Tutup Panduan' : 'Lihat Panduan'}</span>
                    {showMathGuide ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {/* The 4 Core Rules Requested by User */}
                {showMathGuide && (
                  <div className="space-y-2 pt-1 border-t border-sky-100">
                    <div className="bg-amber-50/90 border border-amber-300/80 rounded-xl p-2.5 text-xs text-amber-950 font-medium">
                      <p className="font-bold text-amber-900 mb-1 flex items-center space-x-1.5">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>Aturan Penulisan Rumus CBT Web:</span>
                      </p>
                      <p className="text-[11.5px] leading-relaxed text-slate-700">
                        <strong>Jangan gunakan format LaTeX</strong> (seperti <code className="bg-amber-100 px-1 py-0.5 rounded text-amber-900 font-mono text-[10px]">\frac{`{}`}</code>, <code className="bg-amber-100 px-1 py-0.5 rounded text-amber-900 font-mono text-[10px]">\text{`{}`}</code>, <code className="bg-amber-100 px-1 py-0.5 rounded text-amber-900 font-mono text-[10px]">$</code>). Tuliskan semua rumus dan simbol matematika menggunakan teks standar yang ramah CBT web:
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {/* Rule 1: Pecahan */}
                      <div className="bg-white p-2.5 rounded-xl border border-sky-100 shadow-2xs space-y-0.5">
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-slate-800">🍰 Pecahan</span>
                          <span className="font-mono font-bold text-sky-600 bg-sky-50 px-1.5 py-0.5 rounded text-[11px]">3/8</span>
                        </div>
                        <p className="text-[11px] text-slate-600">
                          Gunakan format slash. <strong>Contoh: 3/8</strong>, 1/2, 3/4
                        </p>
                      </div>

                      {/* Rule 2: Pangkat / Luas / Volume */}
                      <div className="bg-white p-2.5 rounded-xl border border-sky-100 shadow-2xs space-y-0.5">
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-slate-800">📐 Pangkat / Luas / Volume</span>
                          <span className="font-mono font-bold text-sky-600 bg-sky-50 px-1.5 py-0.5 rounded text-[11px]">cm2 / cm²</span>
                        </div>
                        <p className="text-[11px] text-slate-600">
                          Tuliskan <strong>cm2</strong> atau <strong>cm3</strong> (atau Unicode: <strong>cm²</strong>, <strong>cm³</strong>)
                        </p>
                      </div>

                      {/* Rule 3: Derajat */}
                      <div className="bg-white p-2.5 rounded-xl border border-sky-100 shadow-2xs space-y-0.5">
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-slate-800">☀️ Derajat</span>
                          <span className="font-mono font-bold text-sky-600 bg-sky-50 px-1.5 py-0.5 rounded text-[11px]">° / derajat</span>
                        </div>
                        <p className="text-[11px] text-slate-600">
                          Gunakan simbol <strong>°</strong> atau kata <strong>'derajat'</strong> (contoh: 90° atau 90 derajat)
                        </p>
                      </div>

                      {/* Rule 4: Perkalian & Pembagian */}
                      <div className="bg-white p-2.5 rounded-xl border border-sky-100 shadow-2xs space-y-0.5">
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-slate-800">✖️ Perkalian / Pembagian</span>
                          <span className="font-mono font-bold text-sky-600 bg-sky-50 px-1.5 py-0.5 rounded text-[11px]">x, * dan :</span>
                        </div>
                        <p className="text-[11px] text-slate-600">
                          Gunakan <strong>x</strong> atau <strong>*</strong> dan <strong>:</strong> (contoh: 12 x 4 : 2 = 24)
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Quick Symbol Insertion Palette */}
                <div className="pt-2 border-t border-sky-100">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] mb-1.5">
                    <span className="font-bold text-slate-700 flex items-center space-x-1.5">
                      <span>Sisip Cepat ke Kolom:</span>
                      <span className="text-sky-800 font-extrabold bg-sky-100 px-2 py-0.5 rounded-md">
                        {activeField === 'question' ? 'Teks Pertanyaan' :
                         activeField === 'optionA' ? 'Pilihan A' :
                         activeField === 'optionB' ? 'Pilihan B' :
                         activeField === 'optionC' ? 'Pilihan C' :
                         activeField === 'optionD' ? 'Pilihan D' :
                         activeField === 'statement' ? `Pernyataan #${(activeStatementIndex ?? 0) + 1}` : 'Pembahasan'}
                      </span>
                    </span>
                    <span className="text-[10px] text-slate-400">Klik tombol untuk langsung menyisipkan rumus</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {/* Pecahan */}
                    <button
                      type="button"
                      onClick={() => handleInsertMathSymbol('3/8')}
                      title="Sisipkan pecahan 3/8"
                      className="px-2 py-1 bg-white hover:bg-sky-50 text-sky-900 border border-sky-200 rounded-lg text-xs font-mono font-bold shadow-2xs cursor-pointer active:scale-95"
                    >
                      3/8
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInsertMathSymbol('1/2')}
                      title="Sisipkan pecahan 1/2"
                      className="px-2 py-1 bg-white hover:bg-sky-50 text-sky-900 border border-sky-200 rounded-lg text-xs font-mono font-bold shadow-2xs cursor-pointer active:scale-95"
                    >
                      1/2
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInsertMathSymbol('3/4')}
                      title="Sisipkan pecahan 3/4"
                      className="px-2 py-1 bg-white hover:bg-sky-50 text-sky-900 border border-sky-200 rounded-lg text-xs font-mono font-bold shadow-2xs cursor-pointer active:scale-95"
                    >
                      3/4
                    </button>

                    {/* Satuan Luas & Volume */}
                    <button
                      type="button"
                      onClick={() => handleInsertMathSymbol('cm²')}
                      title="Sisipkan cm² (sentimeter persegi)"
                      className="px-2 py-1 bg-white hover:bg-sky-50 text-sky-900 border border-sky-200 rounded-lg text-xs font-mono font-bold shadow-2xs cursor-pointer active:scale-95"
                    >
                      cm²
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInsertMathSymbol('cm³')}
                      title="Sisipkan cm³ (sentimeter kubik)"
                      className="px-2 py-1 bg-white hover:bg-sky-50 text-sky-900 border border-sky-200 rounded-lg text-xs font-mono font-bold shadow-2xs cursor-pointer active:scale-95"
                    >
                      cm³
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInsertMathSymbol('m²')}
                      title="Sisipkan m² (meter persegi)"
                      className="px-2 py-1 bg-white hover:bg-sky-50 text-sky-900 border border-sky-200 rounded-lg text-xs font-mono font-bold shadow-2xs cursor-pointer active:scale-95"
                    >
                      m²
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInsertMathSymbol('²')}
                      title="Sisipkan pangkat dua (²)"
                      className="px-2 py-1 bg-white hover:bg-sky-50 text-sky-900 border border-sky-200 rounded-lg text-xs font-mono font-bold shadow-2xs cursor-pointer active:scale-95"
                    >
                      ²
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInsertMathSymbol('³')}
                      title="Sisipkan pangkat tiga (³)"
                      className="px-2 py-1 bg-white hover:bg-sky-50 text-sky-900 border border-sky-200 rounded-lg text-xs font-mono font-bold shadow-2xs cursor-pointer active:scale-95"
                    >
                      ³
                    </button>

                    {/* Derajat */}
                    <button
                      type="button"
                      onClick={() => handleInsertMathSymbol('°')}
                      title="Sisipkan simbol derajat (°)"
                      className="px-2 py-1 bg-white hover:bg-sky-50 text-sky-900 border border-sky-200 rounded-lg text-xs font-bold shadow-2xs cursor-pointer active:scale-95"
                    >
                      ° (Derajat)
                    </button>

                    {/* Operator Perkalian & Pembagian */}
                    <button
                      type="button"
                      onClick={() => handleInsertMathSymbol(' x ')}
                      title="Sisipkan perkalian x"
                      className="px-2.5 py-1 bg-white hover:bg-sky-50 text-sky-900 border border-sky-200 rounded-lg text-xs font-bold font-mono shadow-2xs cursor-pointer active:scale-95"
                    >
                      x
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInsertMathSymbol(' : ')}
                      title="Sisipkan pembagian :"
                      className="px-2.5 py-1 bg-white hover:bg-sky-50 text-sky-900 border border-sky-200 rounded-lg text-xs font-bold font-mono shadow-2xs cursor-pointer active:scale-95"
                    >
                      :
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInsertMathSymbol(' * ')}
                      title="Sisipkan perkalian *"
                      className="px-2.5 py-1 bg-white hover:bg-sky-50 text-sky-900 border border-sky-200 rounded-lg text-xs font-bold font-mono shadow-2xs cursor-pointer active:scale-95"
                    >
                      *
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInsertMathSymbol(' = ')}
                      title="Sisipkan sama dengan ="
                      className="px-2.5 py-1 bg-white hover:bg-sky-50 text-sky-900 border border-sky-200 rounded-lg text-xs font-bold font-mono shadow-2xs cursor-pointer active:scale-95"
                    >
                      =
                    </button>

                    {/* Simbol Matematika Lainnya */}
                    <button
                      type="button"
                      onClick={() => handleInsertMathSymbol('√')}
                      title="Sisipkan akar √"
                      className="px-2 py-1 bg-white hover:bg-sky-50 text-sky-900 border border-sky-200 rounded-lg text-xs font-bold shadow-2xs cursor-pointer active:scale-95"
                    >
                      √
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInsertMathSymbol('≤')}
                      title="Kurang dari sama dengan"
                      className="px-2 py-1 bg-white hover:bg-sky-50 text-sky-900 border border-sky-200 rounded-lg text-xs font-bold shadow-2xs cursor-pointer active:scale-95"
                    >
                      ≤
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInsertMathSymbol('≥')}
                      title="Lebih dari sama dengan"
                      className="px-2 py-1 bg-white hover:bg-sky-50 text-sky-900 border border-sky-200 rounded-lg text-xs font-bold shadow-2xs cursor-pointer active:scale-95"
                    >
                      ≥
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInsertMathSymbol('≠')}
                      title="Tidak sama dengan"
                      className="px-2 py-1 bg-white hover:bg-sky-50 text-sky-900 border border-sky-200 rounded-lg text-xs font-bold shadow-2xs cursor-pointer active:scale-95"
                    >
                      ≠
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInsertMathSymbol('π')}
                      title="Pi"
                      className="px-2 py-1 bg-white hover:bg-sky-50 text-sky-900 border border-sky-200 rounded-lg text-xs font-bold shadow-2xs cursor-pointer active:scale-95"
                    >
                      π
                    </button>
                  </div>
                </div>

                {/* Auto-detect LaTeX Banner if present */}
                {detectedLatex && (
                  <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-rose-900 animate-in fade-in">
                    <div className="flex items-start space-x-2">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <div>
                        <strong className="block text-rose-950 font-bold">
                          Terdeteksi kode LaTeX di dalam input!
                        </strong>
                        <p className="text-[11px] text-rose-800">
                          Format LaTeX tidak dapat dibaca oleh siswa di CBT web. Konversi sekarang ke teks standar (contoh: 3/8, cm², cm³, 90°, x, :).
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleConvertAllLatex}
                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg shadow-xs transition-colors shrink-0 cursor-pointer flex items-center space-x-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Konversi Otomatis ke Teks Ramah CBT</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Question Text with Simple WYSIWYG / Paragraph Toolbar */}
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center justify-between gap-1.5">
                  <label className="block text-slate-800 font-extrabold uppercase text-[11px] tracking-wider">
                    Teks Pertanyaan (Mendukung Enter / Baris Baru & Paragraf)
                  </label>
                  <div className="flex items-center space-x-1">
                    <button
                      type="button"
                      onClick={() => setQuestionEditorTab(questionEditorTab === 'edit' ? 'preview' : 'edit')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center space-x-1.5 border transition-all cursor-pointer ${
                        questionEditorTab === 'preview'
                          ? 'bg-amber-100 text-amber-950 border-amber-300 shadow-2xs'
                          : 'bg-white text-slate-600 border-slate-200 hover:text-slate-900'
                      }`}
                    >
                      <Eye className="w-3.5 h-3.5 text-amber-600" />
                      <span>{questionEditorTab === 'preview' ? 'Kembali ke Editor' : 'Pratinjau Tampilan Siswa'}</span>
                    </button>
                  </div>
                </div>

                {/* WYSIWYG Action Toolbar */}
                <div className="bg-slate-100 border border-slate-200 rounded-t-xl px-2.5 py-1.5 flex flex-wrap items-center gap-1.5 text-xs">
                  <div className="flex items-center space-x-1 pr-2 border-r border-slate-200">
                    <button
                      type="button"
                      onClick={() => handleApplyFormat('**', '**')}
                      title="Teks Tebal (Bold)"
                      className="px-2 py-1 bg-white hover:bg-slate-200 text-slate-800 font-black rounded-md border border-slate-300 shadow-2xs cursor-pointer flex items-center space-x-0.5"
                    >
                      <Bold className="w-3.5 h-3.5" />
                      <span>B</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyFormat('*', '*')}
                      title="Teks Miring (Italic)"
                      className="px-2 py-1 bg-white hover:bg-slate-200 text-slate-800 italic font-serif font-bold rounded-md border border-slate-300 shadow-2xs cursor-pointer flex items-center space-x-0.5"
                    >
                      <Italic className="w-3.5 h-3.5" />
                      <span>I</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyFormat('<u>', '</u>')}
                      title="Garis Bawah (Underline)"
                      className="px-2 py-1 bg-white hover:bg-slate-200 text-slate-800 underline font-bold rounded-md border border-slate-300 shadow-2xs cursor-pointer flex items-center space-x-0.5"
                    >
                      <Underline className="w-3.5 h-3.5" />
                      <span>U</span>
                    </button>
                  </div>

                  <div className="flex items-center space-x-1 pr-2 border-r border-slate-200">
                    <button
                      type="button"
                      onClick={() => handleApplyFormat('\n\n', '')}
                      title="Sisipkan Paragraf Baru (2x Enter)"
                      className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-950 font-bold rounded-md border border-amber-300 shadow-2xs cursor-pointer flex items-center space-x-1"
                    >
                      <Pilcrow className="w-3.5 h-3.5 text-amber-700" />
                      <span>Paragraf Baru</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyFormat('\n• ', '')}
                      title="Sisipkan Poin / Buletin"
                      className="px-2 py-1 bg-white hover:bg-slate-200 text-slate-800 font-bold rounded-md border border-slate-300 shadow-2xs cursor-pointer flex items-center space-x-1"
                    >
                      <List className="w-3.5 h-3.5 text-slate-600" />
                      <span>Poin (•)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyFormat('\n1. ', '')}
                      title="Sisipkan Nomor Daftar"
                      className="px-2 py-1 bg-white hover:bg-slate-200 text-slate-800 font-bold rounded-md border border-slate-300 shadow-2xs cursor-pointer flex items-center space-x-1"
                    >
                      <ListOrdered className="w-3.5 h-3.5 text-slate-600" />
                      <span>Nomor (1.)</span>
                    </button>
                  </div>

                  <span className="text-[11px] text-slate-500 font-medium ml-auto hidden sm:inline">
                    Enter otomatis dikonversi ke &lt;br&gt; saat disimpan
                  </span>
                </div>

                {questionEditorTab === 'preview' ? (
                  <div className="p-4 bg-amber-50/40 border border-slate-200 rounded-b-xl min-h-[140px] max-h-60 overflow-y-auto space-y-2">
                    <div className="text-[11px] font-extrabold text-amber-900 uppercase tracking-wide flex items-center space-x-1">
                      <Eye className="w-3.5 h-3.5 text-amber-600" />
                      <span>Tampilan di Layar Ujian Siswa:</span>
                    </div>
                    <div
                      className="text-sm font-bold text-slate-800 leading-relaxed whitespace-pre-wrap break-words bg-white p-3.5 rounded-xl border border-amber-200 shadow-xs"
                      style={{
                        whiteSpace: 'pre-wrap',
                        overflowWrap: 'break-word',
                        wordBreak: 'break-word',
                      }}
                    >
                      {formatQuestionDisplay(questionText) || (
                        <span className="text-slate-400 italic">Belum ada teks pertanyaan...</span>
                      )}
                    </div>
                  </div>
                ) : (
                  <textarea
                    ref={questionTextareaRef}
                    rows={5}
                    required
                    value={questionText}
                    onFocus={() => setActiveField('question')}
                    onChange={(e) => setQuestionText(e.target.value)}
                    placeholder="Tuliskan pertanyaan di sini...&#10;Tekan Enter untuk baris baru atau paragraf baru.&#10;Format spasi, baris baru, dan paragraf akan tersimpan utuh ke database!"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-t-0 border-slate-200 rounded-b-xl text-slate-900 focus:outline-none focus:border-amber-500 font-medium text-sm leading-relaxed whitespace-pre-wrap"
                    style={{
                      whiteSpace: 'pre-wrap',
                      overflowWrap: 'break-word',
                    }}
                  />
                )}

                <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
                  <span>💡 Tips: Tekan <strong>Enter</strong> untuk membuat baris baru. Tekan Enter 2 kali untuk jarak antar paragraf.</span>
                  <span>{questionText.split('\n').filter(Boolean).length} baris / paragraf</span>
                </div>
              </div>

              {/* Image Upload for Question */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                  <div>
                    <label className="block text-slate-800 font-bold uppercase text-xs">
                      Gambar Soal (Diagram / Ilustrasi / Peta)
                    </label>
                    <p className="text-[11px] text-slate-500 font-medium">
                      Opsional • Membantu visualisasi soal untuk siswa SD
                    </p>
                  </div>

                  {/* Mode Selector */}
                  <div className="flex items-center space-x-1 bg-slate-200/80 p-0.5 rounded-lg text-xs self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={() => setImageInputMode('upload')}
                      className={`px-2.5 py-1 rounded-md font-bold transition-all flex items-center space-x-1 ${
                        imageInputMode === 'upload'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Unggah / Tempel</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setImageInputMode('url')}
                      className={`px-2.5 py-1 rounded-md font-bold transition-all flex items-center space-x-1 ${
                        imageInputMode === 'url'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Link2 className="w-3.5 h-3.5" />
                      <span>Tautan URL</span>
                    </button>
                  </div>
                </div>

                {/* Error Banner */}
                {imageError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-semibold flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                    <span className="flex-1">{imageError}</span>
                    <button
                      type="button"
                      onClick={() => setImageError(null)}
                      className="text-red-400 hover:text-red-600 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Upload or Drop Mode */}
                {imageInputMode === 'upload' ? (
                  <div>
                    {!imageUrl ? (
                      <div
                        onDragOver={(e) => {
                          e.preventDefault();
                          setIsDraggingOver(true);
                        }}
                        onDragLeave={() => setIsDraggingOver(false)}
                        onDrop={(e) => {
                          e.preventDefault();
                          setIsDraggingOver(false);
                          const file = e.dataTransfer.files?.[0];
                          if (file) processImageFile(file);
                        }}
                        className={`border-2 border-dashed rounded-xl p-5 text-center transition-all ${
                          isDraggingOver
                            ? 'border-amber-500 bg-amber-50/70'
                            : 'border-slate-300 bg-white hover:border-slate-400'
                        }`}
                      >
                        {uploadingImage ? (
                          <div className="flex flex-col items-center justify-center py-2 space-y-2">
                            <RefreshCw className="w-6 h-6 text-amber-500 animate-spin" />
                            <p className="text-xs font-bold text-slate-700">
                              Memproses & mengompres gambar secepat kilat...
                            </p>
                            <span className="text-[10px] text-slate-400">
                              Mengoptimalkan format & ukuran untuk CBT
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center space-y-2.5">
                            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
                              <ImageIcon className="w-5 h-5" />
                            </div>
                            <div>
                              <label className="inline-flex items-center space-x-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl cursor-pointer shadow-xs transition-colors">
                                <Upload className="w-3.5 h-3.5" />
                                <span>Pilih Gambar dari Komputer</span>
                                <input
                                  type="file"
                                  accept="image/*,.jpg,.jpeg,.png,.webp,.gif,.bmp"
                                  onChange={handleImageFileChange}
                                  className="hidden"
                                />
                              </label>
                            </div>
                            <p className="text-[11px] text-slate-500 font-medium">
                              Atau seret & lepas berkas ke sini, atau langsung{' '}
                              <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded text-slate-700 font-bold text-[10px]">
                                Ctrl + V
                              </kbd>{' '}
                              untuk menempel screenshot.
                            </p>
                            <span className="inline-flex items-center space-x-1 text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              <Sparkles className="w-3 h-3" />
                              <span>Kompresi Otomatis Cepat (Maks. 10MB)</span>
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Preview of Attached Image */
                      <div className="p-3 bg-white rounded-xl border border-slate-200 flex flex-col sm:flex-row items-center gap-4">
                        <div
                          onClick={() => setPreviewImageZoom(imageUrl)}
                          className="relative group w-32 h-24 bg-slate-100 rounded-lg overflow-hidden border border-slate-200 shrink-0 cursor-zoom-in flex items-center justify-center"
                        >
                          <img
                            src={imageUrl}
                            alt="Pratinjau Gambar Soal"
                            className="w-full h-full object-contain p-1"
                          />
                          <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                            <ZoomIn className="w-5 h-5" />
                          </div>
                        </div>

                        <div className="flex-1 space-y-1.5 text-center sm:text-left w-full">
                          <div className="flex flex-wrap items-center gap-1.5 justify-center sm:justify-start">
                            <span className="text-xs font-bold text-slate-900">
                              Gambar Terpasang
                            </span>
                            <span className="inline-flex items-center space-x-1 text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-md">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>Siap Ditampilkan</span>
                            </span>
                          </div>

                          {imageMeta && (
                            <p className="text-[11px] text-slate-500 font-medium">
                              {imageMeta.width && imageMeta.height ? (
                                <span>{imageMeta.width} × {imageMeta.height} px • </span>
                              ) : null}
                              {imageMeta.sizeText ? (
                                <span className="font-semibold text-slate-700">{imageMeta.sizeText} • </span>
                              ) : null}
                              <span className="text-amber-700 font-semibold">Optimal & Cepat di CBT</span>
                            </p>
                          )}

                          <div className="flex items-center gap-2 pt-1 justify-center sm:justify-start">
                            <button
                              type="button"
                              onClick={() => setPreviewImageZoom(imageUrl)}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg flex items-center space-x-1 cursor-pointer"
                            >
                              <ZoomIn className="w-3.5 h-3.5" />
                              <span>Lihat Penuh</span>
                            </button>

                            <label className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-xs rounded-lg cursor-pointer flex items-center space-x-1 border border-amber-200">
                              <Upload className="w-3.5 h-3.5" />
                              <span>Ganti</span>
                              <input
                                type="file"
                                accept="image/*,.jpg,.jpeg,.png,.webp,.gif,.bmp"
                                onChange={handleImageFileChange}
                                className="hidden"
                              />
                            </label>

                            <button
                              type="button"
                              onClick={() => {
                                setImageUrl('');
                                setImageMeta(null);
                              }}
                              className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs rounded-lg flex items-center space-x-1 border border-red-200 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Hapus</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* URL Input Mode */
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <div className="relative flex-1">
                        <input
                          type="url"
                          value={imageUrl}
                          onChange={(e) => {
                            setImageUrl(e.target.value);
                            setImageMeta(null);
                          }}
                          placeholder="https://contoh.com/gambar-soal.png"
                          className="w-full px-3 py-2 pl-8 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-amber-500"
                        />
                        <Link2 className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
                      </div>
                      {imageUrl && (
                        <button
                          type="button"
                          onClick={() => {
                            setImageUrl('');
                            setImageMeta(null);
                          }}
                          className="px-2.5 py-2 text-red-600 hover:bg-red-50 rounded-xl font-bold text-xs cursor-pointer"
                        >
                          Hapus
                        </button>
                      )}
                    </div>
                    {imageUrl && (
                      <div className="p-2 bg-white rounded-xl border border-slate-200 max-w-xs">
                        <img
                          src={imageUrl}
                          alt="Preview Tautan Gambar"
                          className="max-h-32 rounded-lg object-contain mx-auto"
                          onError={() => setImageError('Gambar dari URL ini tidak dapat dimuat. Periksa tautan URL kembali.')}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Options or Statements Section based on Model Input Soal */}
              {questionType === 'COMPLEX_TF' ? (
                /* Statements (Benar / Salah) Builder */
                <div className="space-y-3 bg-teal-50/50 p-4 rounded-2xl border-2 border-teal-200">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-teal-200/80 pb-3">
                    <div>
                      <h4 className="font-display font-black text-teal-950 text-xs sm:text-sm uppercase tracking-wide flex items-center space-x-1.5">
                        <Table className="w-4 h-4 text-teal-700" />
                        <span>Daftar Pernyataan & Kunci Jawaban (Benar / Salah)</span>
                      </h4>
                      <p className="text-[11px] text-teal-800 font-medium">
                        Tuliskan pernyataan pada setiap baris dan tentukan kunci jawabannya apakah <strong>Benar (B)</strong> atau <strong>Salah (S)</strong>.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddStatement}
                      className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center space-x-1 shrink-0 self-start sm:self-auto cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Tambah Pernyataan</span>
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {statements.map((stmt, idx) => (
                      <div
                        key={stmt.id || idx}
                        className="bg-white p-3 rounded-xl border border-teal-200/90 shadow-2xs space-y-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-teal-900 text-xs flex items-center space-x-1.5">
                            <span className="w-5 h-5 rounded-md bg-teal-100 text-teal-800 flex items-center justify-center text-[11px] font-black">
                              {idx + 1}
                            </span>
                            <span>Pernyataan {idx + 1}</span>
                          </span>

                          <div className="flex items-center space-x-2">
                            <span className="text-[10px] text-slate-500 font-bold uppercase hidden xs:inline">
                              Kunci:
                            </span>
                            <div className="inline-flex rounded-lg p-0.5 bg-slate-100 border border-slate-200">
                              <button
                                type="button"
                                onClick={() => handleToggleStatementKey(idx, true)}
                                className={`px-2.5 py-1 rounded-md text-xs font-black transition-all flex items-center space-x-1 cursor-pointer ${
                                  stmt.isCorrectTrue
                                    ? 'bg-emerald-600 text-white shadow-xs'
                                    : 'text-slate-600 hover:text-emerald-700'
                                }`}
                              >
                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                                <span>Benar</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleToggleStatementKey(idx, false)}
                                className={`px-2.5 py-1 rounded-md text-xs font-black transition-all flex items-center space-x-1 cursor-pointer ${
                                  !stmt.isCorrectTrue
                                    ? 'bg-rose-600 text-white shadow-xs'
                                    : 'text-slate-600 hover:text-rose-700'
                                }`}
                              >
                                <X className="w-3.5 h-3.5 stroke-[3]" />
                                <span>Salah</span>
                              </button>
                            </div>

                            {statements.length > 2 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveStatement(idx)}
                                title="Hapus baris pernyataan ini"
                                className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        <textarea
                          rows={2}
                          required
                          value={stmt.text}
                          onFocus={() => {
                            setActiveField('statement');
                            setActiveStatementIndex(idx);
                          }}
                          onChange={(e) => handleUpdateStatementText(idx, e.target.value)}
                          placeholder={`Tuliskan pernyataan ${idx + 1}... (contoh: Kubus memiliki 6 sisi berbentuk persegi kongruen)`}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-teal-500 font-medium text-xs"
                        />

                        {/* Optional Image for Statement */}
                        <div className="pt-2 border-t border-slate-100 flex flex-col gap-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-slate-700 flex items-center space-x-1.5">
                              <ImageIcon className="w-3.5 h-3.5 text-teal-600" />
                              <span>Gambar Pernyataan (Opsional)</span>
                            </span>
                            {stmt.imageUrl && (
                              <button
                                type="button"
                                onClick={() => handleUpdateStatementImage(idx, '')}
                                className="text-[11px] font-bold text-rose-600 hover:text-rose-700 hover:underline flex items-center space-x-1 cursor-pointer"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>Hapus Gambar</span>
                              </button>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <div className="relative flex-1">
                              <input
                                type="url"
                                value={stmt.imageUrl || ''}
                                onChange={(e) => handleUpdateStatementImage(idx, e.target.value)}
                                placeholder="Link URL gambar (https://... atau klik tombol Unggah)"
                                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-teal-500 font-medium text-xs"
                              />
                              <Link2 className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                            </div>

                            <label className="px-2.5 py-1.5 bg-white hover:bg-teal-50 text-teal-800 border border-teal-300 hover:border-teal-500 rounded-lg text-xs font-bold flex items-center space-x-1 cursor-pointer shrink-0 transition-colors shadow-2xs">
                              <Upload className="w-3.5 h-3.5 text-teal-600" />
                              <span>Unggah</span>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (!file) return;
                                  try {
                                    const res = await compressImageFile(file, {
                                      maxDimension: 800,
                                      quality: 0.82,
                                      maxFileSizeMb: 8,
                                    });
                                    handleUpdateStatementImage(idx, res.dataUrl);
                                  } catch (err: any) {
                                    alert(err.message || 'Gagal memproses gambar pernyataan');
                                  }
                                  e.target.value = '';
                                }}
                              />
                            </label>
                          </div>

                          {stmt.imageUrl && (
                            <div className="flex items-center space-x-2.5 pt-1 bg-teal-50/70 p-2 rounded-lg border border-teal-200">
                              <img
                                src={stmt.imageUrl}
                                alt={`Pratinjau Gambar Pernyataan ${idx + 1}`}
                                className="h-14 max-w-xs object-contain rounded border border-teal-300 bg-white p-0.5 shadow-2xs cursor-pointer hover:border-amber-400"
                                onClick={() => setPreviewImageZoom(stmt.imageUrl || null)}
                              />
                              <span className="text-[10px] text-teal-900 font-semibold">
                                Gambar siap ditampilkan pada butir pernyataan {idx + 1}. Klik untuk perbesar.
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="pt-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-teal-200/60">
                    <p className="text-[11px] text-teal-850 font-medium">
                      * Siswa akan menjawab tiap baris pernyataan dengan memilih <strong>Benar</strong> atau <strong>Salah</strong>.
                    </p>
                    <div className="flex items-center space-x-2">
                      <label className="text-slate-700 font-bold uppercase text-xs whitespace-nowrap">
                        Bobot Nilai:
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={100}
                        required
                        value={weight}
                        onChange={(e) => setWeight(Number(e.target.value))}
                        className="w-24 px-3 py-1.5 bg-white border border-teal-300 rounded-xl text-slate-900 focus:outline-none font-black text-xs"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {/* Options Inputs */}
                  <div className="space-y-2.5">
                    <label className="block text-slate-700 font-bold uppercase">
                      Pilihan Jawaban
                    </label>

                    {/* Pilihan A */}
                    <div className="flex items-center space-x-2">
                      <span className="w-8 h-8 rounded-lg bg-amber-100 text-amber-900 font-bold flex items-center justify-center shrink-0">
                        A
                      </span>
                      <input
                        type="text"
                        required
                        value={optionA}
                        onFocus={() => setActiveField('optionA')}
                        onChange={(e) => setOptionA(e.target.value)}
                        placeholder="Pilihan A (contoh: 3/8 atau 144 cm²)"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-amber-500 font-semibold"
                      />
                    </div>

                    {/* Pilihan B */}
                    <div className="flex items-center space-x-2">
                      <span className="w-8 h-8 rounded-lg bg-amber-100 text-amber-900 font-bold flex items-center justify-center shrink-0">
                        B
                      </span>
                      <input
                        type="text"
                        required
                        value={optionB}
                        onFocus={() => setActiveField('optionB')}
                        onChange={(e) => setOptionB(e.target.value)}
                        placeholder="Pilihan B (contoh: 5/8 atau 100 cm²)"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-amber-500 font-semibold"
                      />
                    </div>

                    {/* Pilihan C */}
                    <div className="flex items-center space-x-2">
                      <span className="w-8 h-8 rounded-lg bg-amber-100 text-amber-900 font-bold flex items-center justify-center shrink-0">
                        C
                      </span>
                      <input
                        type="text"
                        value={optionC}
                        onFocus={() => setActiveField('optionC')}
                        onChange={(e) => setOptionC(e.target.value)}
                        placeholder="Pilihan C (opsional untuk benar/salah)"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-amber-500 font-semibold"
                      />
                    </div>

                    {/* Pilihan D */}
                    <div className="flex items-center space-x-2">
                      <span className="w-8 h-8 rounded-lg bg-amber-100 text-amber-900 font-bold flex items-center justify-center shrink-0">
                        D
                      </span>
                      <input
                        type="text"
                        value={optionD}
                        onFocus={() => setActiveField('optionD')}
                        onChange={(e) => setOptionD(e.target.value)}
                        placeholder="Pilihan D (opsional)"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-amber-500 font-semibold"
                      />
                    </div>
                  </div>

                  {/* Kunci Jawaban & Bobot */}
                  {questionType === 'SINGLE' ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-700 font-bold uppercase mb-1">
                          Kunci Jawaban Benar
                        </label>
                        <select
                          value={correctAnswer}
                          onChange={(e) => setCorrectAnswer(e.target.value as any)}
                          className="w-full px-3.5 py-2.5 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-950 font-black focus:outline-none"
                        >
                          <option value="A">Pilihan A</option>
                          <option value="B">Pilihan B</option>
                          <option value="C">Pilihan C</option>
                          <option value="D">Pilihan D</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-slate-700 font-bold uppercase mb-1">
                          Bobot Nilai Soal
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={100}
                          required
                          value={weight}
                          onChange={(e) => setWeight(Number(e.target.value))}
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none font-bold"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3 bg-indigo-50/50 p-3.5 rounded-2xl border border-indigo-200">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <div>
                          <label className="block text-indigo-950 font-black uppercase text-[11px] tracking-wide">
                            Kunci Jawaban Benar (Pilihan Ganda Kompleks)
                          </label>
                          <p className="text-[11px] text-indigo-800/80 font-semibold">
                            Centang semua pilihan yang merupakan jawaban benar (bisa 2 atau lebih).
                          </p>
                        </div>
                        <span className="text-[11px] font-extrabold text-indigo-900 bg-indigo-100/90 border border-indigo-200 px-2.5 py-0.5 rounded-lg shrink-0 self-start sm:self-auto">
                          Kunci: {correctAnswersComplex.length > 0 ? correctAnswersComplex.join(', ') : 'Belum dipilih'}
                        </span>
                      </div>

                      {/* Complex checkboxes */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {(['A', 'B', 'C', 'D'] as const).map((key) => {
                          const isChecked = correctAnswersComplex.includes(key);
                          const optLabel =
                            key === 'A'
                              ? optionA
                              : key === 'B'
                              ? optionB
                              : key === 'C'
                              ? optionC
                              : optionD;

                          return (
                            <button
                              key={key}
                              type="button"
                              onClick={() => toggleComplexOption(key)}
                              className={`p-2.5 rounded-xl border-2 font-bold flex items-center justify-between transition-all cursor-pointer select-none text-left ${
                                isChecked
                                  ? 'bg-emerald-500 border-emerald-600 text-white shadow-xs'
                                  : 'bg-white border-indigo-200 text-slate-700 hover:border-indigo-400 hover:bg-indigo-50/40'
                              }`}
                            >
                              <div className="flex items-center space-x-2 min-w-0">
                                <span
                                  className={`w-6 h-6 rounded-lg text-xs font-black flex items-center justify-center shrink-0 ${
                                    isChecked
                                      ? 'bg-white text-emerald-700 shadow-2xs'
                                      : 'bg-slate-100 text-slate-700 border border-slate-300'
                                  }`}
                                >
                                  {key}
                                </span>
                                <span className="truncate text-xs">
                                  {optLabel ? optLabel : `Opsi ${key}`}
                                </span>
                              </div>
                              {isChecked ? (
                                <Check className="w-4 h-4 text-white stroke-[3] shrink-0 ml-1" />
                              ) : (
                                <span className="w-4 h-4 rounded border border-slate-300 bg-white shrink-0 ml-1" />
                              )}
                            </button>
                          );
                        })}
                      </div>

                      <div>
                        <label className="block text-slate-700 font-bold uppercase mb-1">
                          Bobot Nilai Soal
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={100}
                          required
                          value={weight}
                          onChange={(e) => setWeight(Number(e.target.value))}
                          className="w-full sm:w-48 px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none font-bold"
                        />
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Explanation */}
              <div>
                <label className="block text-slate-700 font-bold uppercase mb-1">
                  Pembahasan Soal (Tampil saat review)
                </label>
                <textarea
                  rows={2}
                  value={explanation}
                  onFocus={() => setActiveField('explanation')}
                  onChange={(e) => setExplanation(e.target.value)}
                  placeholder="Penjelasan langkah penyelesaian soal... (contoh: Luas persegi = 12 cm x 12 cm = 144 cm²)"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Modal Actions */}
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
                  className="px-6 py-2 bg-amber-500 hover:bg-amber-600 text-white font-display font-extrabold rounded-xl shadow-xs transition-colors"
                >
                  {submitting ? 'Menyimpan...' : 'Simpan Soal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lightbox for Previewing Image in Full Size */}
      {previewImageZoom && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setPreviewImageZoom(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] bg-white rounded-2xl overflow-hidden shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-3 border-b border-slate-100 bg-slate-50">
              <span className="font-bold text-xs text-slate-700 flex items-center space-x-1.5">
                <ImageIcon className="w-4 h-4 text-amber-500" />
                <span>Pratinjau Gambar Soal Penuh</span>
              </span>
              <button
                type="button"
                onClick={() => setPreviewImageZoom(null)}
                className="p-1 rounded-lg hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 flex items-center justify-center overflow-auto max-h-[80vh] bg-slate-900/5">
              <QuestionImage
                src={previewImageZoom}
                alt="Gambar Soal Ukuran Penuh"
                allowZoom={false}
                className="w-full border-0 bg-transparent p-0 shadow-none"
                imgClassName="max-h-[75vh]"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
