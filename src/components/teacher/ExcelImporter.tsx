import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { Upload, Download, CheckCircle, AlertTriangle, FileSpreadsheet, Loader2, Sparkles, Calculator, AlertCircle } from 'lucide-react';
import { Exam, Question } from '../../types';
import { downloadQuestionImportTemplate } from '../../services/exportService';
import { importQuestionsBatch } from '../../services/firebase/examService';
import { convertLatexToStandardMath } from '../../utils/mathFormatter';

interface ExcelImporterProps {
  exams: Exam[];
  onImportSuccess: () => void;
}

interface ParsedImportRow {
  index: number;
  question: string;
  imageUrl?: string;
  optionA: string;
  optionB: string;
  optionC?: string;
  optionD?: string;
  correctAnswer: 'A' | 'B' | 'C' | 'D';
  weight: number;
  explanation?: string;
  isValid: boolean;
  errors: string[];
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

          const rawAnswer = String(item.correct_answer || item.kunci || '').trim().toUpperCase();
          const weightNum = Number(item.weight || item.bobot) || 20;

          if (!qText) errors.push('Teks pertanyaan kosong');
          if (!optA) errors.push('Pilihan A kosong');
          if (!optB) errors.push('Pilihan B kosong');
          if (!['A', 'B', 'C', 'D'].includes(rawAnswer)) {
            errors.push('Kunci jawaban harus A, B, C, atau D');
          }

          const isValid = errors.length === 0;

          return {
            index: idx + 1,
            question: qText,
            imageUrl: item.gambar ? String(item.gambar).trim() : undefined,
            optionA: optA,
            optionB: optB,
            optionC: optC,
            optionD: optD,
            correctAnswer: (rawAnswer as any) || 'A',
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
          optionA: r.optionA,
          optionB: r.optionB,
          correctAnswer: r.correctAnswer,
          weight: Number(r.weight) || 1,
        };
        if (r.imageUrl && String(r.imageUrl).trim()) item.imageUrl = String(r.imageUrl).trim();
        if (r.optionC && String(r.optionC).trim()) item.optionC = String(r.optionC).trim();
        if (r.optionD && String(r.optionD).trim()) item.optionD = String(r.optionD).trim();
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
                  <th className="py-2.5 px-3">Pertanyaan</th>
                  <th className="py-2.5 px-3">Kunci</th>
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
                    <td className="py-2.5 px-3">
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
                    <td className="py-2.5 px-3 max-w-xs truncate">{row.question}</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                      {row.correctAnswer}
                    </td>
                    <td className="py-2.5 px-3">{row.weight}</td>
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
