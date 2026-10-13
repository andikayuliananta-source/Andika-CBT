import React, { useState } from 'react';
import {
  Mail,
  Lock,
  LogIn,
  Loader2,
  ShieldCheck,
  ShieldAlert,
  Globe,
  Copy,
  Check,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Crown,
} from 'lucide-react';
import {
  loginTeacherWithEmail,
  loginTeacherWithGoogle,
  isAuthorizedAdminEmail,
  PRIMARY_ADMIN_EMAIL,
  PRIMARY_ADMIN_NAME,
} from '../../services/firebase/authService';
import { User } from '../../types';

interface TeacherAuthModalProps {
  isOpen?: boolean;
  onSuccess: (user: User) => void;
  onCancel: () => void;
}

export const TeacherAuthModal: React.FC<TeacherAuthModalProps> = ({
  isOpen = true,
  onSuccess,
  onCancel,
}) => {
  const [email, setEmail] = useState(PRIMARY_ADMIN_EMAIL);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showDomainGuide, setShowDomainGuide] = useState(false);
  const [copiedDomain, setCopiedDomain] = useState(false);

  if (!isOpen) return null;

  const currentHostname = typeof window !== 'undefined' ? window.location.hostname : '';

  const handleCopyHostname = () => {
    if (!currentHostname) return;
    navigator.clipboard.writeText(currentHostname);
    setCopiedDomain(true);
    setTimeout(() => setCopiedDomain(false), 2500);
  };

  // Email & Password login exclusively for Pak Andika
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!isAuthorizedAdminEmail(cleanEmail)) {
      setErrorMsg(
        `Akses Ditolak: Portal Guru CBT CERIA dikunci secara EKSKLUSIF untuk Administrator Tunggal (${PRIMARY_ADMIN_EMAIL}). Akun "${cleanEmail}" tidak diizinkan masuk demi keamanan data ujian.`
      );
      return;
    }

    setLoading(true);
    try {
      const userObj = await loginTeacherWithEmail(cleanEmail, password);
      onSuccess(userObj);
    } catch (err: any) {
      console.warn('Auth notice:', err);
      setErrorMsg(err.message || 'Gagal masuk. Periksa kembali kata sandi administrator Anda.');
    } finally {
      setLoading(false);
    }
  };

  // Google OAuth with graceful fallback for unauthorized domain or blocked popups
  const handleGoogleLogin = async () => {
    setErrorMsg(null);
    setLoading(true);
    try {
      const res = await loginTeacherWithGoogle();
      onSuccess(res.user);
    } catch (err: any) {
      console.warn('Google auth warning:', err);
      const isDomainIssue =
        err?.code === 'auth/unauthorized-domain' ||
        String(err?.message || '').includes('unauthorized-domain');

      if (isDomainIssue) {
        setShowDomainGuide(true);
      }
      setErrorMsg(
        err.message ||
          'Gagal masuk via Google. Anda dapat masuk menggunakan email dan kata sandi administrator di atas.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      id="teacher-auth-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-4 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-blue-700 text-white flex items-center justify-center shadow-md shrink-0">
            <Crown className="w-6 h-6 text-amber-300 fill-amber-300" />
          </div>
          <div>
            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-black uppercase tracking-wider">
              <span>👑 Administrator Tunggal</span>
            </span>
            <h3 className="font-display text-xl sm:text-2xl font-black text-slate-900 mt-0.5">
              Portal Guru & Pengawas
            </h3>
            <p className="text-xs text-slate-500 font-semibold">
              CBT CERIA • Khusus {PRIMARY_ADMIN_NAME}
            </p>
          </div>
        </div>

        {/* Administrator Exclusive Notice Card */}
        <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-2xl flex items-start space-x-2.5">
          <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <div className="text-[11px] text-slate-700 leading-relaxed font-semibold">
            Portal ini dilindungi secara eksklusif. Hanya akun terdaftar{' '}
            <span className="font-black text-blue-900 underline">{PRIMARY_ADMIN_EMAIL}</span> yang dapat mengelola ujian dan bank soal.
          </div>
        </div>

        {/* Error message */}
        {errorMsg && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-xs font-bold flex items-start space-x-2 animate-in fade-in">
            <ShieldAlert className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <div className="leading-snug">{errorMsg}</div>
          </div>
        )}

        {/* Email & Password Login Form (Primary) */}
        <form onSubmit={handleSubmit} className="space-y-3 pt-1">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Email Administrator
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="admin-email-input"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={PRIMARY_ADMIN_EMAIL}
                className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold focus:outline-none focus:border-blue-500 focus:bg-white text-slate-900 transition-colors"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-700 uppercase">
                Kata Sandi
              </label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center space-x-1 cursor-pointer"
              >
                {showPassword ? (
                  <>
                    <EyeOff className="w-3.5 h-3.5" />
                    <span>Sembunyikan</span>
                  </>
                ) : (
                  <>
                    <Eye className="w-3.5 h-3.5" />
                    <span>Lihat</span>
                  </>
                )}
              </button>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="admin-password-input"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan kata sandi terdaftar"
                className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
              />
            </div>
          </div>

          <button
            id="admin-email-login-btn"
            type="submit"
            disabled={loading || !email.trim() || !password}
            className="w-full py-3 bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white font-display font-black text-xs sm:text-sm rounded-xl shadow-md transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <LogIn className="w-4 h-4 text-amber-400" />
                <span>Masuk ke Portal Guru</span>
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="relative flex py-1 items-center">
          <div className="flex-grow border-t border-slate-200"></div>
          <span className="flex-shrink mx-3 text-[10px] font-bold text-slate-400 uppercase">
            Atau Masuk via Google
          </span>
          <div className="flex-grow border-t border-slate-200"></div>
        </div>

        {/* Google sign-in button */}
        <button
          id="admin-google-login-btn"
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full py-2.5 px-3 border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors flex items-center justify-center space-x-2 cursor-pointer shadow-2xs"
        >
          <Globe className="w-4 h-4 text-blue-500" />
          <span>Masuk via Google ({PRIMARY_ADMIN_EMAIL})</span>
        </button>

        {/* Domain Helper Accordion */}
        <div className="border border-slate-200 rounded-xl bg-slate-50/80 overflow-hidden text-xs">
          <button
            type="button"
            onClick={() => setShowDomainGuide(!showDomainGuide)}
            className="w-full p-2.5 flex items-center justify-between text-left font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <div className="flex items-center space-x-1.5">
              <Globe className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span className="text-[11px]">Bantuan Masalah (auth/unauthorized-domain)?</span>
            </div>
            {showDomainGuide ? (
              <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
            )}
          </button>

          {showDomainGuide && (
            <div className="p-3 border-t border-slate-200 space-y-2 text-[11px] text-slate-600 bg-white">
              <p>
                Pesan <code className="bg-red-50 text-red-600 px-1 py-0.5 rounded font-mono">auth/unauthorized-domain</code> muncul jika domain deployment saat ini belum didaftarkan di Firebase Console.
              </p>

              <div className="p-2 bg-slate-100 rounded-lg flex items-center justify-between">
                <span className="font-mono text-[10px] text-slate-800 truncate mr-2 select-all">
                  {currentHostname || 'ais-dev-...run.app'}
                </span>
                <button
                  type="button"
                  onClick={handleCopyHostname}
                  className="px-2 py-1 bg-white hover:bg-slate-200 border border-slate-300 rounded text-[10px] font-bold text-slate-700 flex items-center space-x-1 shrink-0 cursor-pointer"
                >
                  {copiedDomain ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span>Tersalin</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Salin Domain</span>
                    </>
                  )}
                </button>
              </div>

              <div className="space-y-1 text-[10px] text-slate-500">
                <p className="font-bold text-slate-700">Langkah Menambahkan di Firebase Console:</p>
                <ol className="list-decimal list-inside space-y-0.5">
                  <li>Buka Firebase Console &rarr; Authentication &rarr; Settings.</li>
                  <li>Di menu <strong>Authorized domains</strong>, klik <strong>Add domain</strong>.</li>
                  <li>Tempelkan domain di atas, lalu klik <strong>Save</strong>.</li>
                </ol>
              </div>

              <a
                href="https://console.firebase.google.com/project/dark-karst-5xctm/authentication/settings"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center space-x-1 text-blue-600 hover:text-blue-800 font-bold text-[10px] mt-1"
              >
                <span>Buka Pengaturan Firebase Console</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
        </div>

        {/* Footer / Cancel */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
          <span className="text-[11px] text-slate-400 font-semibold italic">
            🔒 Khusus Administrator Eksklusif.
          </span>
          <button
            id="admin-modal-cancel-btn"
            type="button"
            onClick={onCancel}
            className="text-slate-500 hover:text-slate-700 font-bold px-2 py-1 cursor-pointer"
          >
            Batal
          </button>
        </div>
      </div>
    </div>
  );
};
