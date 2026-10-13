import React, { useState } from 'react';
import {
  Printer,
  Download,
  X,
  Award,
  Star,
  CheckCircle2,
  ShieldCheck,
  Loader2,
  Check,
} from 'lucide-react';
import { Result, Exam } from '../../types';
import { downloadCertificateImage } from '../../utils/generateCertificateImage';

interface DigitalCertificateModalProps {
  result: Result;
  exam: Exam;
  onClose: () => void;
  autoPrint?: boolean;
}

export const DigitalCertificateModal: React.FC<DigitalCertificateModalProps> = ({
  result,
  exam,
  onClose,
  autoPrint = false,
}) => {
  const [downloading, setDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  // Auto trigger print if requested
  React.useEffect(() => {
    if (autoPrint) {
      const timer = setTimeout(() => {
        window.print();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [autoPrint]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = async () => {
    setDownloading(true);
    setDownloadSuccess(false);
    try {
      await downloadCertificateImage(result, exam);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3500);
    } catch (err) {
      console.error('Download certificate failed:', err);
    } finally {
      setDownloading(false);
    }
  };

  const isPassed = result.score >= (exam.kkm || 75);
  const certDate = result.finishedAt || result.createdAt
    ? new Date(result.finishedAt || result.createdAt).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : new Date().toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });

  const certNumber = `CBT-${(result.resultId || result.participantId || 'CERT0001').slice(0, 8).toUpperCase()}`;

  return (
    <div
      id="certificate-print-root"
      className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in"
    >
      <div className="bg-white rounded-3xl max-w-4xl w-full border-2 border-amber-300 shadow-2xl flex flex-col my-auto max-h-[95vh] overflow-hidden">
        {/* Modal Action Bar (Hidden on print) */}
        <div className="no-print bg-slate-50 px-5 py-3.5 border-b border-slate-200 flex items-center justify-between gap-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center text-base shadow-xs">
              <Award className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-display font-black text-slate-900">
                Sertifikat Kelulusan Digital (Certificate of Completion)
              </h3>
              <p className="text-xs text-slate-500 font-semibold">
                Dapat dicetak langsung (Print / PDF) atau diunduh sebagai gambar berkualitas tinggi.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              id="print-cert-dialog-btn"
              type="button"
              onClick={handlePrint}
              className="bg-amber-500 hover:bg-amber-600 active:scale-98 text-white px-4 py-2 rounded-xl text-xs font-display font-black shadow-sm flex items-center space-x-1.5 transition-all cursor-pointer"
              title="Cetak Sertifikat ke Printer atau Simpan sebagai PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak (Print / PDF)</span>
            </button>

            <button
              id="download-cert-png-btn"
              type="button"
              onClick={handleDownload}
              disabled={downloading}
              className="bg-blue-600 hover:bg-blue-700 active:scale-98 text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow-sm flex items-center space-x-1.5 transition-all cursor-pointer disabled:opacity-75"
              title="Unduh sertifikat sebagai file gambar PNG"
            >
              {downloading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span className="hidden sm:inline">Membuat Gambar...</span>
                </>
              ) : downloadSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-300 stroke-[3]" />
                  <span>Tersimpan!</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Unduh Gambar</span>
                </>
              )}
            </button>

            <button
              id="close-cert-modal-btn"
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 p-2 rounded-xl hover:bg-slate-200 transition-colors cursor-pointer"
              title="Tutup Pratinjau Sertifikat"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Certificate Area */}
        <div className="p-4 sm:p-8 overflow-auto flex-1 flex justify-center items-center bg-slate-100/70">
          <div
            id="digital-certificate-printable"
            className="w-full max-w-3xl bg-[#FFFDF9] text-slate-900 border-8 border-amber-600 rounded-3xl p-6 sm:p-10 relative shadow-xl select-none"
            style={{ minHeight: '520px' }}
          >
            {/* Ornate Inner Borders */}
            <div className="absolute inset-2 border-2 border-amber-300 rounded-2xl pointer-events-none" />
            <div className="absolute inset-3.5 border border-blue-900/40 rounded-xl pointer-events-none" />

            {/* Corner Medallions */}
            <div className="absolute top-4 left-4 w-4 h-4 rounded-full bg-amber-500 border-2 border-amber-200" />
            <div className="absolute top-4 right-4 w-4 h-4 rounded-full bg-amber-500 border-2 border-amber-200" />
            <div className="absolute bottom-4 left-4 w-4 h-4 rounded-full bg-amber-500 border-2 border-amber-200" />
            <div className="absolute bottom-4 right-4 w-4 h-4 rounded-full bg-amber-500 border-2 border-amber-200" />

            {/* Certificate Header Emblem */}
            <div className="text-center space-y-2 relative z-10">
              <div className="inline-flex items-center space-x-2 bg-blue-950 text-amber-300 px-4 py-1 rounded-full text-[11px] font-black tracking-widest shadow-xs">
                <Star className="w-3 h-3 fill-amber-300 text-amber-300" />
                <span>CBT CERIA DIGITAL ACADEMY</span>
                <Star className="w-3 h-3 fill-amber-300 text-amber-300" />
              </div>

              <h1 className="font-serif text-2xl sm:text-4xl font-black text-slate-900 tracking-wide pt-1">
                SERTIFIKAT KELULUSAN
              </h1>
              <p className="text-[11px] sm:text-xs font-black uppercase tracking-widest text-amber-700">
                Certificate of Completion
              </p>
            </div>

            {/* Recipient Section */}
            <div className="text-center my-6 space-y-2 relative z-10">
              <p className="text-xs text-slate-500 font-medium italic">
                Dengan ini menerangkan dan memberikan apresiasi setinggi-tingginya kepada:
              </p>

              <div className="inline-block px-4">
                <h2 className="text-2xl sm:text-4xl font-display font-black text-slate-950 tracking-normal border-b-2 border-amber-500 pb-1.5 px-6">
                  {result.name || 'Nama Peserta Didik'}
                </h2>
              </div>

              <p className="text-xs sm:text-sm font-bold text-slate-700">
                {result.school || 'Sekolah Dasar'} • Kelas {result.grade || exam.grade} SD
              </p>
            </div>

            {/* Exam Details & Accomplishment */}
            <div className="text-center space-y-2 relative z-10 my-4">
              <p className="text-xs text-slate-600">
                Telah berhasil menyelesaikan evaluasi pembelajaran komputer (CBT) pada:
              </p>

              <h3 className="text-base sm:text-xl font-display font-black text-blue-950">
                {exam.title}
              </h3>

              <p className="text-xs font-semibold text-slate-600">
                Mata Pelajaran: <strong className="text-slate-900">{exam.subject}</strong> • KKM:{' '}
                <strong className="text-slate-900">{exam.kkm || 75}</strong>
              </p>
            </div>

            {/* Score & Status Highlight Box */}
            <div className="max-w-md mx-auto my-6 bg-gradient-to-r from-amber-50/90 via-yellow-50/90 to-amber-50/90 border border-amber-300 rounded-2xl p-3.5 flex items-center justify-around text-center shadow-xs relative z-10">
              <div className="space-y-0.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 block">
                  Nilai Akhir
                </span>
                <span className="text-3xl sm:text-4xl font-display font-black text-amber-950">
                  {result.score}
                </span>
              </div>

              <div className="h-10 w-px bg-amber-300/80" />

              <div className="space-y-0.5 text-left">
                <div
                  className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-black ${
                    isPassed
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-900'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{isPassed ? 'LULUS / TUNTAS' : 'SELESAI MENGERJAKAN'}</span>
                </div>
                <p className="text-[11px] text-slate-600 font-semibold pt-0.5">
                  Benar: <strong>{result.correctAnswers}</strong> dari {result.totalQuestions} soal
                </p>
              </div>
            </div>

            {/* Certificate Footer & Signatures */}
            <div className="pt-6 border-t border-amber-200/80 grid grid-cols-3 gap-2 items-end text-center relative z-10">
              {/* Left Column: Date & ID */}
              <div className="text-left space-y-1 text-[11px] text-slate-600">
                <div>
                  <span className="text-slate-400 block text-[9px] uppercase font-bold">
                    Tanggal Terbit
                  </span>
                  <span className="font-bold text-slate-800">{certDate}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[9px] uppercase font-bold">
                    Nomor Sertifikat
                  </span>
                  <span className="font-mono font-bold text-amber-900">{certNumber}</span>
                </div>
              </div>

              {/* Center Column: Golden Verification Seal */}
              <div className="flex flex-col items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-400 border-2 border-amber-200 shadow-sm flex flex-col items-center justify-center text-white text-center p-1">
                  <ShieldCheck className="w-5 h-5 text-white" />
                  <span className="text-[8px] font-black uppercase tracking-tighter mt-0.5">
                    TERVERIFIKASI
                  </span>
                </div>
              </div>

              {/* Right Column: Signature */}
              <div className="text-right space-y-1">
                <div className="h-10 flex items-end justify-end">
                  <div className="w-32 border-b-2 border-slate-400 pb-0.5" />
                </div>
                <p className="text-xs font-bold text-slate-900">Guru Pengampu</p>
                <p className="text-[10px] text-slate-500">Evaluator CBT CERIA</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Note (Hidden on print) */}
        <div className="no-print bg-slate-50 px-5 py-2.5 border-t border-slate-200 text-center text-xs text-slate-500 font-medium">
          💡 Tips: Pilih opsi <strong>"Save as PDF"</strong> pada dialog print untuk menyimpan sertifikat kelulusan ini sebagai berkas PDF.
        </div>
      </div>
    </div>
  );
};
