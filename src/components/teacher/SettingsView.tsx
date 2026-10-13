import React, { useState } from 'react';
import {
  Settings,
  School,
  Sparkles,
  CheckCircle,
  Database,
  ShieldCheck,
  Heart,
  RotateCcw,
  Trash2,
  AlertTriangle,
  Users,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { Exam, Participant } from '../../types';
import {
  seedSampleSDExams,
  resetFinishedParticipants,
  resetAllParticipants,
  ResetParticipantsResult,
} from '../../services/firebase/examService';
import { ResetParticipantsModal } from './ResetParticipantsModal';

interface SettingsViewProps {
  onRefreshAll: () => void;
  exams?: Exam[];
  participants?: Participant[];
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  onRefreshAll,
  exams = [],
  participants = [],
}) => {
  const [appName, setAppName] = useState('CBT CERIA');
  const [schoolName, setSchoolName] = useState('SD Negeri Indonesia');
  const [defaultDuration, setDefaultDuration] = useState(60);
  const [defaultKkm, setDefaultKkm] = useState(75);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [seedMsg, setSeedMsg] = useState<string | null>(null);

  // Database Reset State
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resettingQuick, setResettingQuick] = useState(false);
  const [resetResultBanner, setResetResultBanner] = useState<string | null>(null);
  const [resetErrorBanner, setResetErrorBanner] = useState<string | null>(null);

  const totalParticipants = participants.length;
  const finishedParticipants = participants.filter(
    (p) => p.status === 'SUBMITTED' || p.status === 'TIMEOUT'
  ).length;
  const inProgressParticipants = participants.filter((p) => p.status === 'IN_PROGRESS').length;

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleSeedDemoData = async () => {
    setSeeding(true);
    setSeedMsg(null);
    try {
      await seedSampleSDExams('guru_demo_andika');
      setSeedMsg('Berhasil memuat contoh ujian SD lengkap (Matematika & IPA Fase C)!');
      onRefreshAll();
    } catch (err) {
      setSeedMsg('Gagal memuat data demo.');
    } finally {
      setSeeding(false);
    }
  };

  const handleQuickResetFinished = async () => {
    if (finishedParticipants === 0) {
      alert('Tidak ada peserta dengan status selesai untuk dibersihkan.');
      return;
    }

    const confirm = window.confirm(
      `Apakah Anda yakin ingin menghapus ${finishedParticipants} data peserta yang telah selesai beserta dokumen jawabannya dari database Firestore?`
    );
    if (!confirm) return;

    setResettingQuick(true);
    setResetResultBanner(null);
    setResetErrorBanner(null);
    try {
      const res = await resetFinishedParticipants(undefined, false);
      setResetResultBanner(
        `Sukses! ${res.deletedParticipants} peserta selesai dan ${res.deletedAnswers} dokumen jawaban berhasil dibersihkan dari Firestore.`
      );
      onRefreshAll();
    } catch (err: any) {
      setResetErrorBanner(err.message || 'Gagal mereset peserta.');
    } finally {
      setResettingQuick(false);
    }
  };

  const handleQuickResetAllToZero = async () => {
    if (totalParticipants === 0) {
      alert('Jumlah peserta saat ini sudah 0.');
      return;
    }

    const confirm = window.confirm(
      `PERINGATAN: Anda akan menghapus SELURUH peserta (${totalParticipants} peserta) dan mengembalikan total peserta menjadi 0.\n\nLanjutkan?`
    );
    if (!confirm) return;

    setResettingQuick(true);
    setResetResultBanner(null);
    setResetErrorBanner(null);
    try {
      const res = await resetAllParticipants(undefined, false);
      setResetResultBanner(
        `Sukses! Seluruh peserta (${res.deletedParticipants} peserta, ${res.deletedAnswers} dokumen jawaban) telah dibersihkan. Jumlah peserta kini kembali 0.`
      );
      onRefreshAll();
    } catch (err: any) {
      setResetErrorBanner(err.message || 'Gagal mereset seluruh peserta.');
    } finally {
      setResettingQuick(false);
    }
  };

  const handleModalResetSuccess = (res: ResetParticipantsResult) => {
    setResetResultBanner(
      `Sukses! ${res.deletedParticipants} peserta dan ${res.deletedAnswers} dokumen jawaban berhasil dibersihkan dari database Firestore.`
    );
    onRefreshAll();
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h2 className="font-display font-black text-2xl text-slate-900">
          Pengaturan Sistem
        </h2>
        <p className="text-xs text-slate-500 font-semibold">
          Konfigurasi identitas sekolah, nilai standar ujian, dan pemeliharaan database Firestore
        </p>
      </div>

      {savedSuccess && (
        <div className="bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-4 text-emerald-950 flex items-center space-x-2 text-xs font-bold animate-in fade-in">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          <span>Pengaturan berhasil disimpan.</span>
        </div>
      )}

      {/* Main Settings Form */}
      <form
        onSubmit={handleSaveSettings}
        className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-xs space-y-4 text-xs font-semibold"
      >
        <h3 className="font-display font-extrabold text-base text-slate-900 border-b border-slate-100 pb-2 flex items-center space-x-2">
          <School className="w-4 h-4 text-blue-600" />
          <span>Identitas Sekolah & Aplikasi</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-slate-700 font-bold uppercase mb-1">
              Nama Aplikasi
            </label>
            <input
              type="text"
              value={appName}
              onChange={(e) => setAppName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-blue-500 font-bold"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-bold uppercase mb-1">
              Nama Sekolah / Gugus
            </label>
            <input
              type="text"
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-blue-500 font-bold"
            />
          </div>
        </div>

        <h3 className="font-display font-extrabold text-base text-slate-900 border-b border-slate-100 pb-2 pt-2 flex items-center space-x-2">
          <Settings className="w-4 h-4 text-amber-600" />
          <span>Standar Ujian Default</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-slate-700 font-bold uppercase mb-1">
              Durasi Default (Menit)
            </label>
            <input
              type="number"
              value={defaultDuration}
              onChange={(e) => setDefaultDuration(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none font-bold"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-bold uppercase mb-1">
              Standar KKM Default
            </label>
            <input
              type="number"
              value={defaultKkm}
              onChange={(e) => setDefaultKkm(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none font-bold"
            />
          </div>
        </div>

        <div className="pt-3 border-t border-slate-100 flex justify-end">
          <button
            type="submit"
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-display font-extrabold rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            Simpan Pengaturan
          </button>
        </div>
      </form>

      {/* DATABASE MAINTENANCE & PARTICIPANT RESET CARD (USER REQUEST) */}
      <div
        id="database-maintenance-section"
        className="bg-white rounded-3xl p-6 sm:p-7 border-2 border-amber-200 shadow-xs space-y-4 text-xs font-semibold"
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2.5 text-slate-900 font-display font-black text-base">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div>Pemeliharaan Database & Kuota Firestore</div>
              <p className="text-[11px] text-slate-500 font-normal">
                Reset peserta kembali ke 0 agar riwayat jawaban lama tidak membebani kapasitas database
              </p>
            </div>
          </div>
          <span className="bg-amber-100 text-amber-900 text-[10px] font-black px-2.5 py-1 rounded-full uppercase">
            Fitur Pemeliharaan
          </span>
        </div>

        {/* Database Status Pills */}
        <div className="grid grid-cols-3 gap-2.5">
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 text-center">
            <span className="text-[10px] uppercase text-slate-400 font-bold block">Total Peserta</span>
            <span className="font-display font-black text-xl text-slate-900">{totalParticipants}</span>
          </div>
          <div className="bg-emerald-50 p-3 rounded-2xl border border-emerald-200 text-center">
            <span className="text-[10px] uppercase text-emerald-600 font-bold block">Selesai Ujian</span>
            <span className="font-display font-black text-xl text-emerald-700">{finishedParticipants}</span>
          </div>
          <div className="bg-blue-50 p-3 rounded-2xl border border-blue-200 text-center">
            <span className="text-[10px] uppercase text-blue-600 font-bold block">Sedang Ujian</span>
            <span className="font-display font-black text-xl text-blue-700">{inProgressParticipants}</span>
          </div>
        </div>

        <p className="text-slate-600 leading-relaxed text-[11px] font-medium bg-amber-50/50 p-3 rounded-2xl border border-amber-100">
          💡 <strong>Mengapa perlu direset?</strong> Dalam Firestore, setiap jawaban siswa disimpan sebagai subkoleksi dokumen. Menghapus peserta yang telah menyelesaikan ujian membersihkan ribuan dokumen riwayat pengerjaan, sehingga database tetap berkecepatan tinggi, hemat kuota gratis, dan jumlah peserta kembali 0 untuk sesi ujian berikutnya.
        </p>

        {resetResultBanner && (
          <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-2xl text-emerald-900 flex items-center space-x-2 text-xs font-bold animate-in fade-in">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{resetResultBanner}</span>
          </div>
        )}

        {resetErrorBanner && (
          <div className="bg-rose-50 border border-rose-200 p-3.5 rounded-2xl text-rose-900 flex items-center space-x-2 text-xs font-bold animate-in fade-in">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{resetErrorBanner}</span>
          </div>
        )}

        {/* Maintenance Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
          <button
            type="button"
            onClick={handleQuickResetFinished}
            disabled={resettingQuick || finishedParticipants === 0}
            className="flex-1 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-display font-black text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {resettingQuick ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RotateCcw className="w-4 h-4" />
            )}
            <span>Reset Peserta yang Sudah Selesai ({finishedParticipants})</span>
          </button>

          <button
            type="button"
            onClick={handleQuickResetAllToZero}
            disabled={resettingQuick || totalParticipants === 0}
            className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-800 font-display font-black text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Trash2 className="w-4 h-4 text-rose-600" />
            <span>Reset Seluruh Peserta ke 0</span>
          </button>

          <button
            type="button"
            onClick={() => setIsResetModalOpen(true)}
            className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
          >
            <span>Opsi Lanjutan</span>
          </button>
        </div>
      </div>

      {/* Database Sample Seeder */}
      <div className="bg-amber-50/70 rounded-3xl p-6 border-2 border-amber-200 space-y-3">
        <div className="flex items-center space-x-2 text-amber-950 font-display font-extrabold text-base">
          <Database className="w-5 h-5 text-amber-600" />
          <span>Contoh Soal & Ujian Bawaan (Demo Seeder)</span>
        </div>
        <p className="text-xs text-amber-900 font-semibold leading-relaxed">
          Ingin langsung mencoba simulasi ujian siswa tanpa membuat soal satu per satu?
          Klik tombol di bawah untuk membuat ujian contoh Matematika & IPA SD Fase C dengan soal lengkap dan token siap pakai.
        </p>
        <button
          onClick={handleSeedDemoData}
          disabled={seeding}
          className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-display font-black text-xs rounded-xl shadow-xs transition-colors flex items-center space-x-2 cursor-pointer disabled:opacity-50"
        >
          <Sparkles className="w-4 h-4" />
          <span>{seeding ? 'Membuat Data Ujian...' : 'Muat Contoh Ujian & Bank Soal SD'}</span>
        </button>
        {seedMsg && (
          <div className="text-xs font-bold text-amber-900 bg-white/80 p-2.5 rounded-xl border border-amber-300">
            {seedMsg}
          </div>
        )}
      </div>

      {/* Developer and Copyright Information */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center space-x-2 text-slate-900 font-display font-extrabold text-base">
          <ShieldCheck className="w-5 h-5 text-emerald-600" />
          <span>Informasi Aplikasi & Lisensi</span>
        </div>
        <div className="text-xs text-slate-600 font-semibold space-y-1.5 leading-relaxed">
          <p>
            <strong>CBT CERIA</strong> dirancang khusus untuk memenuhi kebutuhan asesmen digital sekolah dasar di Indonesia dengan antarmuka yang ramah anak, intuitif, dan responsif.
          </p>
          <div className="pt-2 border-t border-slate-100 flex items-center space-x-2 text-slate-700 font-bold">
            <Heart className="w-4 h-4 text-rose-500 fill-rose-500 shrink-0" />
            <span>Hak Cipta: © 2026 CBT CERIA By Andika Yuliananta, S.Pd.</span>
          </div>
        </div>
      </div>

      {/* Modal for Advanced Reset Options */}
      <ResetParticipantsModal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        exams={exams}
        participants={participants}
        initialExamId="ALL"
        onResetSuccess={handleModalResetSuccess}
      />
    </div>
  );
};
