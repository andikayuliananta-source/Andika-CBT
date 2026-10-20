import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import {
  Upload,
  Download,
  CheckCircle,
  AlertTriangle,
  FileSpreadsheet,
  Loader2,
  Sparkles,
  Calculator,
  AlertCircle,
  Table,
  ListChecks,
  Check,
  X,
  Image as ImageIcon,
} from 'lucide-react';
import { Exam, Question, QuestionType, QuestionStatement } from '../../types';
import { downloadQuestionImportTemplate } from '../../services/exportService';
import { importQuestionsBatch } from '../../services/firebase/examService';
import { convertLatexToStandardMath } from '../../utils/mathFormatter';

interface ExcelImporterProps {
  exams: Exam[];
  onImportSuccess: () => void;
}

interface ParsedImportRow {
  index: number;
  type: QuestionType;
  question: string;
  imageUrl?: string;
  optionA: string;
  optionB: string;
  optionC?: string;
  optionD?: string;
  statements?: QuestionStatement[];
  correctAnswer: 'A' | 'B' | 'C' | 'D';
  correctAnswers?: ('A' | 'B' | 'C' | 'D')[];
  weight: number;
  explanation?: string;
  isValid: boolean;
  errors: string[];
}

function extractStatementKeyFromAnswer(rawAnswer: string, index1Based: number, keyLetter?: string): string {
  if (!rawAnswer) return 'B';
  const clean = rawAnswer.trim().toUpperCase();

  // Pattern 1: "1:B, 2:S" or "A:B, B:S"
  if (clean.includes(':')) {
    const pairs = clean.split(/[,;\n]+/);
    for (const pair of pairs) {
      const parts = pair.split(':').map((s) => s.trim());
      if (parts.length >= 2) {
        const k = parts[0];
        const v = parts[1];
        if (
          (k === String(index1Based) || (keyLetter && k === keyLetter.toUpperCase())) &&
          v
        ) {
          return v.startsWith('S') ? 'S' : 'B';
        }
      }
    }
  }

  // Pattern 2: "B, S, B, S" or "Benar, Salah, Benar"
  const tokens = clean.split(/[,;\s/|-]+/).filter(Boolean);
  if (tokens.length >= index1Based) {
    const tok = tokens[index1Based - 1];
    return tok.startsWith('S') ? 'S' : 'B';
  }

  // Pattern 3: String like "BSBS" or "BBS"
  if (/^[BS]+$/.test(clean) && clean.length >= index1Based) {
    return clean[index1Based - 1];
  }

  return 'B';
}

export const ExcelImporter: React.FC<ExcelImporterProps> = ({
  exams,
  onImportSuccess,
}) => {
  const [selectedExamId, setSelectedExamId] = useState<string>(exams[0]?.examId || '');
  const [parsedRows, setParsedRows] = useState<ParsedImportRow[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importSuccessCount, setImportSuccessCount] = useState<number | null>(null);

  // Handle Excel/CSV file upload & parsing
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setImportSuccessCount(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rawData: any[] = XLSX.utils.sheet_to_json(ws);

        const rows: ParsedImportRow[] = rawData.map((item, idx) => {
          const errors: string[] = [];

          // Sanitize math expressions to standard CBT web format
          const rawQ = String(item.pertanyaan || item.question || '').trim();
          const rawA = String(item.option_a || item.pilihan_a || '').trim();
          const rawB = String(item.option_b || item.pilihan_b || '').trim();
          const rawC = item.option_c || item.pilihan_c ? String(item.option_c || item.pilihan_c).trim() : undefined;
          const rawD = item.option_d || item.pilihan_d ? String(item.option_d || item.pilihan_d).trim() : undefined;
          const rawExp = item.explanation || item.pembahasan ? String(item.explanation || item.pembahasan).trim() : undefined;

          const qText = convertLatexToStandardMath(rawQ);
          const optA = convertLatexToStandardMath(rawA);
          const optB = convertLatexToStandardMath(rawB);
          const optC = rawC ? convertLatexToStandardMath(rawC) : undefined;
          const optD = rawD ? convertLatexToStandardMath(rawD) : undefined;
          const explanation = rawExp ? convertLatexToStandardMath(rawExp) : undefined;

          const rawAnswer = String(item.correct_answer || item.kunci || item.kunci_jawaban || '').trim().toUpperCase();
          const weightNum = Number(item.weight || item.bobot) || 20;

          // Determine question type
          const rawTypeStr = String(
            item.tipe_soal || item.jenis_soal || item.tipe || item.type || item.model || ''
          ).trim().toUpperCase();

          let rowType: QuestionType = 'SINGLE';
          if (
            rawTypeStr.includes('PERNYATAAN') ||
            rawTypeStr.includes('BENAR') ||
            rawTypeStr.includes('SALAH') ||
            rawTypeStr.includes('TF') ||
            rawTypeStr.includes('B/S') ||
            rawTypeStr.includes('BS') ||
            rawTypeStr === 'COMPLEX_TF'
          ) {
            rowType = 'COMPLEX_TF';
          } else if (
            rawTypeStr.includes('KOMPLEKS') ||
            rawTypeStr.includes('COMPLEX') ||
            rawTypeStr.includes('MULTI')
          ) {
            rowType = 'COMPLEX';
          } else if (item.pernyataan_1 !== undefined || item.pernyataan1 !== undefined) {
            rowType = 'COMPLEX_TF';
          } else if (
            rawAnswer &&
            (rawAnswer.match(/[A-D]/g) || []).length > 1 &&
            !rawAnswer.includes('B') &&
            !rawAnswer.includes('S')
          ) {
            rowType = 'COMPLEX';
          }

          if (!qText) {
            errors.push('Teks pertanyaan kosong');
          }

          let statements: QuestionStatement[] | undefined = undefined;
          let complexAnswers: ('A' | 'B' | 'C' | 'D')[] | undefined = undefined;
          let primaryAnswer: 'A' | 'B' | 'C' | 'D' = 'A';

          if (rowType === 'COMPLEX_TF') {
            const stmts: QuestionStatement[] = [];

            // Case 1: Separate statement columns pernyataan_1, pernyataan_2, etc.
            if (item.pernyataan_1 !== undefined || item.pernyataan1 !== undefined) {
              for (let i = 1; i <= 8; i++) {
                const text = String(item[`pernyataan_${i}`] ?? item[`pernyataan${i}`] ?? '').trim();
                if (!text) continue;
                const img = String(
                  item[`gambar_pernyataan_${i}`] ??
                  item[`gambar_pernyataan${i}`] ??
                  item[`gambar_${i}`] ??
                  item[`gambar${i}`] ??
                  item[`link_gambar_${i}`] ??
                  ''
                ).trim();
                let keyVal = String(item[`kunci_${i}`] ?? item[`kunci${i}`] ?? '').trim().toUpperCase();
                if (!keyVal && rawAnswer) {
                  keyVal = extractStatementKeyFromAnswer(rawAnswer, i, String(i));
                }
                const isCorrectTrue = keyVal.startsWith('B') || keyVal.startsWith('T') || keyVal === '1';
                stmts.push({
                  id: `s${i}`,
                  text: convertLatexToStandardMath(text),
                  ...(img ? { imageUrl: img } : {}),
                  isCorrectTrue,
                });
              }
            } else {
              // Case 2: Using option_a ... option_d columns as statements
              const candidateOptions = [
                { key: 'A', text: rawA, img: item.gambar_a ?? item.gambar_pilihan_a ?? item.gambar_1 },
                { key: 'B', text: rawB, img: item.gambar_b ?? item.gambar_pilihan_b ?? item.gambar_2 },
                { key: 'C', text: rawC, img: item.gambar_c ?? item.gambar_pilihan_c ?? item.gambar_3 },
                { key: 'D', text: rawD, img: item.gambar_d ?? item.gambar_pilihan_d ?? item.gambar_4 },
              ];
              candidateOptions.forEach((cand, cIdx) => {
                if (!cand.text) return;
                const i = cIdx + 1;
                let keyVal = String(
                  item[`kunci_${cand.key.toLowerCase()}`] ??
                  item[`kunci_${i}`] ??
                  item[`kunci${i}`] ??
                  ''
                ).trim().toUpperCase();
                if (!keyVal && rawAnswer) {
                  keyVal = extractStatementKeyFromAnswer(rawAnswer, i, cand.key);
                }
                const isCorrectTrue = keyVal.startsWith('B') || keyVal.startsWith('T') || keyVal === '1';
                const img = cand.img ? String(cand.img).trim() : '';
                stmts.push({
                  id: `s${i}`,
                  text: convertLatexToStandardMath(cand.text),
                  ...(img ? { imageUrl: img } : {}),
                  isCorrectTrue,
                });
              });
            }

            if (stmts.length < 2) {
              errors.push('Soal pernyataan B/S minimal harus memiliki 2 butir pernyataan.');
            }
            statements = stmts;
            primaryAnswer = 'A';
          } else if (rowType === 'COMPLEX') {
            if (!optA) errors.push('Pilihan A kosong');
            if (!optB) errors.push('Pilihan B kosong');

            const matches = (rawAnswer.match(/[A-D]/g) || []).map((k) => k as 'A' | 'B' | 'C' | 'D');
            const uniqueKeys = Array.from(new Set(matches)).sort();
            if (uniqueKeys.length === 0) {
              errors.push('Kunci jawaban PG Kompleks minimal harus memilih 1 opsi (contoh: A,C)');
            }
            complexAnswers = uniqueKeys;
            primaryAnswer = uniqueKeys[0] || 'A';
          } else {
            // SINGLE choice
            if (!optA) errors.push('Pilihan A kosong');
            if (!optB) errors.push('Pilihan B kosong');
            if (!['A', 'B', 'C', 'D'].includes(rawAnswer)) {
              errors.push('Kunci jawaban harus A, B, C, atau D');
            }
            primaryAnswer = (['A', 'B', 'C', 'D'].includes(rawAnswer) ? rawAnswer : 'A') as 'A' | 'B' | 'C' | 'D';
          }

          const isValid = errors.length === 0;

          return {
            index: idx + 1,
            type: rowType,
            question: qText,
            imageUrl: item.gambar ? String(item.gambar).trim() : undefined,
            optionA: rowType === 'COMPLEX_TF' ? 'Benar' : optA,
            optionB: rowType === 'COMPLEX_TF' ? 'Salah' : optB,
            optionC: rowType === 'COMPLEX_TF' ? undefined : optC,
            optionD: rowType === 'COMPLEX_TF' ? undefined : optD,
            statements,
            correctAnswer: primaryAnswer,
            correctAnswers: complexAnswers,
            weight: weightNum,
            explanation,
            isValid,
            errors,
          };
        });

        setParsedRows(rows);
      } catch (err) {
        alert('Gagal membaca file Excel. Pastikan format file benar.');
      }
    };
    reader.readAsBinaryString(file);
  };

  const validRows = parsedRows.filter((r) => r.isValid);
  const hasErrors = parsedRows.some((r) => !r.isValid);

  const handleCommitImport = async () => {
    if (!selectedExamId || validRows.length === 0) return;

    setImporting(true);
    try {
      const payload: Omit<Question, 'questionId' | 'examId' | 'createdAt' | 'updatedAt'>[] = validRows.map((r, i) => {
        const item: Omit<Question, 'questionId' | 'examId' | 'createdAt' | 'updatedAt'> = {
          number: i + 1,
          question: r.question,
          type: r.type,
          optionA: r.optionA,
          optionB: r.optionB,
          correctAnswer: r.correctAnswer,
          weight: Number(r.weight) || 20,
        };
        if (r.type === 'COMPLEX_TF' && r.statements) {
          item.statements = r.statements;
        } else if (r.type === 'COMPLEX' && r.correctAnswers) {
          item.correctAnswers = r.correctAnswers;
        }
        if (r.optionC) item.optionC = r.optionC;
        if (r.optionD) item.optionD = r.optionD;
        if (r.imageUrl && String(r.imageUrl).trim()) item.imageUrl = String(r.imageUrl).trim();
        if (r.explanation && String(r.explanation).trim()) item.explanation = String(r.explanation).trim();
        return item;
      });

      const count = await importQuestionsBatch(selectedExamId, payload);
      setImportSuccessCount(count);
      setParsedRows([]);
      setFileName(null);
      onImportSuccess();
    } catch (err: any) {
      console.error('Error importing questions:', err);
      alert('Gagal mengimpor soal ke database: ' + (err?.message || 'Terjadi kesalahan sistem'));
    } finally {
      setImporting(false);
    }
  };

  const selectedExam = exams.find((e) => e.examId === selectedExamId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-display font-black text-2xl text-slate-900">
            Import Soal dari Excel
          </h2>
          <p className="text-xs text-slate-500 font-semibold">
            Unggah file Excel (XLSX) untuk menambahkan banyak soal secara instan
          </p>
        </div>

        <button
          id="btn-download-excel-template"
          onClick={downloadQuestionImportTemplate}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-display font-extrabold text-xs sm:text-sm px-4 py-2.5 rounded-2xl shadow-xs transition-colors flex items-center space-x-2 cursor-pointer"
        >
          <Download className="w-4 h-4" />
          <span>Unduh Template Excel</span>
        </button>
      </div>

      {/* Target Exam Selector */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <label className="text-xs font-bold text-slate-700 uppercase shrink-0">
          Tujuan Ujian:
        </label>
        <select
          value={selectedExamId}
          onChange={(e) => setSelectedExamId(e.target.value)}
          className="w-full sm:max-w-md bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs sm:text-sm font-bold text-slate-900 focus:outline-none focus:border-blue-500"
        >
          {exams.map((ex) => (
            <option key={ex.examId} value={ex.examId}>
              {ex.title} (Kelas {ex.grade} SD - {ex.subject})
            </option>
          ))}
        </select>
      </div>

      {/* CBT Web Math Standards Guidance Card */}
      <div className="bg-sky-50/90 border border-sky-200 rounded-2xl p-4 space-y-2.5 shadow-2xs">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded-lg bg-sky-600 text-white flex items-center justify-center font-bold text-xs shadow-2xs">
            ∑
          </div>
          <div>
            <h4 className="font-display font-extrabold text-xs text-sky-950 uppercase tracking-wide">
              Panduan Format Rumus Matematika di Excel (Ramah CBT Web)
            </h4>
            <p className="text-[11px] text-sky-800 font-medium">
              Sistem akan otomatis membersihkan kode LaTeX saat diimpor, namun pastikan mengikuti panduan standar berikut:
            </p>
          </div>
        </div>

        <div className="bg-amber-50/90 border border-amber-300/80 rounded-xl p-2.5 text-xs text-amber-950 font-medium">
          <p className="text-[11.5px] leading-relaxed text-slate-700">
            <strong>Jangan gunakan format LaTeX</strong> (seperti <code className="bg-amber-100 px-1 py-0.5 rounded text-amber-900 font-mono text-[10px]">\frac{`{}`}</code>, <code className="bg-amber-100 px-1 py-0.5 rounded text-amber-900 font-mono text-[10px]">\text{`{}`}</code>, <code className="bg-amber-100 px-1 py-0.5 rounded text-amber-900 font-mono text-[10px]">$</code>). Tuliskan semua rumus dan simbol matematika menggunakan teks standar yang ramah CBT web:
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 text-xs">
          <div className="bg-white p-2.5 rounded-xl border border-sky-100 shadow-2xs">
            <span className="font-extrabold text-slate-800 block">🍰 Pecahan</span>
            <p className="text-[11px] text-slate-600 mt-0.5">
              Gunakan format slash. Contoh: <strong className="text-sky-700 font-mono">3/8</strong>, 1/2, 3/4
            </p>
          </div>
          <div className="bg-white p-2.5 rounded-xl border border-sky-100 shadow-2xs">
            <span className="font-extrabold text-slate-800 block">📐 Pangkat / Luas / Volume</span>
            <p className="text-[11px] text-slate-600 mt-0.5">
              Tuliskan <strong className="text-sky-700 font-mono">cm2</strong> atau <strong className="text-sky-700 font-mono">cm3</strong> (atau Unicode: <strong className="text-sky-700">cm²</strong>, <strong className="text-sky-700">cm³</strong>)
            </p>
          </div>
          <div className="bg-white p-2.5 rounded-xl border border-sky-100 shadow-2xs">
            <span className="font-extrabold text-slate-800 block">☀️ Derajat</span>
            <p className="text-[11px] text-slate-600 mt-0.5">
              Gunakan simbol <strong className="text-sky-700">°</strong> atau kata <strong className="text-sky-700">'derajat'</strong> (contoh: 90°, 45 derajat)
            </p>
          </div>
          <div className="bg-white p-2.5 rounded-xl border border-sky-100 shadow-2xs">
            <span className="font-extrabold text-slate-800 block">✖️ Perkalian / Pembagian</span>
            <p className="text-[11px] text-slate-600 mt-0.5">
              Gunakan <strong className="text-sky-700 font-mono">x</strong> atau <strong className="text-sky-700 font-mono">*</strong> dan <strong className="text-sky-700 font-mono">:</strong> (contoh: 12 x 4 : 2 = 24)
            </p>
          </div>
        </div>
      </div>

      {/* Model Soal Import Guidance Card */}
      <div className="bg-teal-50/90 border border-teal-200 rounded-2xl p-4 space-y-2.5 shadow-2xs">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded-lg bg-teal-600 text-white flex items-center justify-center font-bold text-xs shadow-2xs">
            <Table className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-display font-extrabold text-xs text-teal-950 uppercase tracking-wide">
              Mendukung 3 Model Soal di Excel (PG Biasa, PG Kompleks, & PG Pernyataan Benar/Salah)
            </h4>
            <p className="text-[11px] text-teal-800 font-medium">
              Sistem mengenali tipe soal otomatis dari kolom <code className="bg-teal-100 px-1 py-0.5 rounded text-teal-900 font-mono font-bold">tipe_soal</code> atau struktur pilihan:
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-xs">
          <div className="bg-white p-3 rounded-xl border border-teal-100 shadow-2xs space-y-1">
            <div className="flex items-center space-x-1.5 font-bold text-amber-900 text-xs">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              <span>1. PG Biasa (Single Choice)</span>
            </div>
            <p className="text-[11px] text-slate-600 leading-snug">
              Isi <code className="text-slate-800 font-mono">tipe_soal: BIASA</code>, pilihan di kolom <code className="font-mono">option_a</code> s/d <code className="font-mono">option_d</code>, dan kunci jawaban tunggal (<strong className="text-amber-700">A, B, C, atau D</strong>).
            </p>
          </div>

          <div className="bg-white p-3 rounded-xl border border-teal-100 shadow-2xs space-y-1">
            <div className="flex items-center space-x-1.5 font-bold text-indigo-900 text-xs">
              <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
              <span>2. PG Kompleks (Multi Jawaban)</span>
            </div>
            <p className="text-[11px] text-slate-600 leading-snug">
              Isi <code className="text-slate-800 font-mono">tipe_soal: KOMPLEKS</code>, pilihan di <code className="font-mono">option_a</code> s/d <code className="font-mono">option_d</code>, dan kunci jawaban multi opsi (<strong className="text-indigo-700">contoh: A,C</strong> atau <strong className="text-indigo-700">A,B,D</strong>).
            </p>
          </div>

          <div className="bg-white p-3 rounded-xl border border-teal-100 shadow-2xs space-y-1">
            <div className="flex items-center space-x-1.5 font-bold text-teal-900 text-xs">
              <span className="w-2 h-2 rounded-full bg-teal-500"></span>
              <span>3. PG Pernyataan (Benar / Salah)</span>
            </div>
            <p className="text-[11px] text-slate-600 leading-snug">
              Isi <code className="text-slate-800 font-mono">tipe_soal: PERNYATAAN</code>. Tulis butir pernyataan di <code className="font-mono">option_a</code> s/d <code className="font-mono">d</code> (atau <code className="font-mono">pernyataan_1</code> s/d <code className="font-mono">4</code>). Kunci urutan B/S: <strong className="text-teal-700">B,S,B</strong> atau <strong className="text-teal-700">1:B, 2:S</strong>. Tambahkan link gambar pernyataan pada kolom <code className="font-mono">gambar_a</code> s/d <code className="font-mono">d</code>!
            </p>
          </div>
        </div>
      </div>

      {/* Upload Drag & Drop Box */}
      <div className="bg-white rounded-3xl p-8 border-2 border-dashed border-blue-200 text-center space-y-4 shadow-xs hover:border-blue-400 transition-colors">
        <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto text-3xl">
          <FileSpreadsheet className="w-8 h-8" />
        </div>

        <div>
          <h3 className="font-display font-black text-lg text-slate-900">
            Pilih File Excel Soal
          </h3>
          <p className="text-xs text-slate-500 font-semibold mt-1">
            Format file didukung: .xlsx, .xls, atau .csv
          </p>
        </div>

        <label className="inline-flex items-center space-x-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-display font-black text-sm rounded-2xl cursor-pointer shadow-sm transition-colors">
          <Upload className="w-4 h-4" />
          <span>{fileName ? `Ganti File (${fileName})` : 'Pilih File dari Komputer'}</span>
          <input
            type="file"
            accept=".xlsx, .xls, .csv"
            onChange={handleFileUpload}
            className="hidden"
          />
        </label>
      </div>

      {/* Success Banner */}
      {importSuccessCount !== null && (
        <div className="bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-4 text-emerald-950 flex items-center space-x-3 text-sm font-bold">
          <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>
            Berhasil mengimpor {importSuccessCount} butir soal ke ujian "{selectedExam?.title}".
          </span>
        </div>
      )}

      {/* PREVIEW IMPORT TABLE */}
      {parsedRows.length > 0 && (
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-display font-black text-lg text-slate-900">
                PREVIEW IMPORT
              </h3>
              <p className="text-xs text-slate-500 font-semibold">
                Total: {parsedRows.length} Soal • Valid: {validRows.length} • Error: {parsedRows.length - validRows.length}
              </p>
            </div>

            <button
              id="btn-commit-import"
              onClick={handleCommitImport}
              disabled={importing || validRows.length === 0}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-display font-black text-sm rounded-xl shadow-xs transition-colors flex items-center space-x-2 disabled:opacity-50 cursor-pointer"
            >
              {importing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4" />
              )}
              <span>IMPORT SOAL ({validRows.length})</span>
            </button>
          </div>

          <div className="overflow-x-auto max-h-96">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 uppercase font-bold text-slate-500">
                <tr>
                  <th className="py-2.5 px-3">No</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Tipe Soal</th>
                  <th className="py-2.5 px-3">Pertanyaan</th>
                  <th className="py-2.5 px-3">Kunci Jawaban</th>
                  <th className="py-2.5 px-3">Bobot</th>
                  <th className="py-2.5 px-3">Keterangan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold">
                {parsedRows.map((row) => (
                  <tr
                    key={row.index}
                    className={row.isValid ? 'hover:bg-slate-50' : 'bg-red-50/50'}
                  >
                    <td className="py-2.5 px-3 font-bold text-slate-900">{row.index}</td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {row.isValid ? (
                        <span className="inline-flex items-center text-emerald-700 font-black text-[11px] bg-emerald-100 px-2 py-0.5 rounded">
                          ✓ Valid
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-red-700 font-black text-[11px] bg-red-100 px-2 py-0.5 rounded">
                          ⚠ Error
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {row.type === 'COMPLEX_TF' ? (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-extrabold bg-teal-50 text-teal-800 border border-teal-200">
                          <Table className="w-3 h-3 text-teal-600 shrink-0" />
                          <span>PG B/S</span>
                        </span>
                      ) : row.type === 'COMPLEX' ? (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-200">
                          <ListChecks className="w-3 h-3 text-indigo-600 shrink-0" />
                          <span>PG Kompleks</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                          PG Biasa
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 max-w-xs">
                      <div className="truncate font-bold text-slate-800">{row.question}</div>
                      {row.type === 'COMPLEX_TF' && row.statements && (
                        <div className="text-[10px] text-teal-700 font-semibold flex items-center gap-1.5 mt-0.5">
                          <span>{row.statements.length} butir pernyataan</span>
                          {row.statements.some((s) => s.imageUrl) && (
                            <span className="inline-flex items-center gap-0.5 text-blue-600 font-bold bg-blue-50 px-1 py-0.2 rounded border border-blue-200">
                              <ImageIcon className="w-2.5 h-2.5" />
                              <span>ada gambar</span>
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {row.type === 'COMPLEX_TF' && row.statements ? (
                        <div className="flex flex-wrap items-center gap-1">
                          {row.statements.map((s, sIdx) => (
                            <span
                              key={s.id || sIdx}
                              className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-bold ${
                                s.isCorrectTrue
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : 'bg-rose-100 text-rose-800 border border-rose-300'
                              }`}
                            >
                              {sIdx + 1}:{s.isCorrectTrue ? 'B' : 'S'}
                            </span>
                          ))}
                        </div>
                      ) : row.type === 'COMPLEX' && row.correctAnswers ? (
                        <span className="font-mono font-bold text-indigo-800 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                          {row.correctAnswers.join(', ')}
                        </span>
                      ) : (
                        <span className="font-mono font-bold text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          {row.correctAnswer}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-bold">{row.weight}</td>
                    <td className="py-2.5 px-3 text-[11px] text-slate-500">
                      {row.isValid ? (
                        <span className="text-emerald-700">Siap diimpor</span>
                      ) : (
                        <span className="text-red-600 font-bold">{row.errors.join(', ')}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
