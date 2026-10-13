import React, { useState } from 'react';
import {
  Mail,
  Lock,
  LogIn,
  Loader2,
  ShieldCheck,
  ShieldAlert,
  Zap,
  Globe,
  Copy,
  Check,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  loginTeacherWithEmail,
  loginTeacherWithGoogle,
  ensureTeacherAuthSession,
  PRIMARY_ADMIN_EMAIL,
  isAuthorizedAdminEmail,
} from '../../services/firebase/authService';
import { User } from '../../types';

interface TeacherAuthModalProps {
  onSuccess: (user: User) => void;
  onCancel: () => void;
}

export const TeacherAuthModal: React.FC<TeacherAuthModalProps> = ({
  onSuccess,
  onCancel,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedDomain, setCopiedDomain] = useState(false);
  const [showDomainGuide, setShowDomainGuide] = useState(false);

  const currentHostname = typeof window !== 'undefined' ? window.location.hostname : '';

  const handleCopyHostname = () => {
    if (!currentHostname) return;
    navigator.clipboard.writeText(currentHostname);
    setCopiedDomain(true);
    setTimeout(() => setCopiedDomain(false), 2500);
  };

  // Direct 1-click Admin Access
  const handleQuickAdminLogin = async () => {
    setErrorMsg(null);
    setLoading(true);
    try {
      const user = await ensureTeacherAuthSession();
      onSuccess(user);
    } catch (err: any) {
      console.warn('Quick admin session notice:', err);
      setErrorMsg(err.message || 'Gagal masuk sebagai administrator.');
    } finally {
      setLoading(false);
    }
  };

  // Email login
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!isAuthorizedAdminEmail(cleanEmail)) {
      setErrorMsg(
        `Akses Ditolak: Hanya Administrator Utama yang dapat masuk ke Portal Guru. Akun "${cleanEmail}" tidak diizinkan demi keamanan data ujian.`
      );
      return;
    }

    setLoading(true);
    try {
      const firebaseUser = await loginTeacherWithEmail(cleanEmail, password);
      const userObj: User = {
        uid: firebaseUser.uid,
        name: firebaseUser.displayName || 'Andika Yuliananta, S.Pd.',
        email: cleanEmail,
        role: 'admin',
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
      };
      onSuccess(userObj);
    } catch (err: any) {
      console.warn('Auth notice:', err);
      let message = err.message || 'Gagal masuk. Periksa kembali email dan kata sandi Anda.';
      if (
        err.code === 'auth/wrong-password' ||
        err.code === 'auth/user-not-found' ||
        err.code === 'auth/invalid-credential'
      ) {
        message = 'Kredensial tidak cocok. Pastikan kata sandi administrator benar.';
      } else if (err.code === 'auth/weak-password') {
        message = 'Kata sandi minimal 6 karakter.';
      } else if (err.code === 'auth/operation-not-allowed') {
        message =
          'Provider Email/Password belum diaktifkan di Firebase Console. Gunakan tombol "Masuk Langsung Sebagai Administrator" di atas.';
      }
      setErrorMsg(message);
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
      // Fallback safeguard
      try {
        const fallbackUser = await ensureTeacherAuthSession();
        onSuccess(fallbackUser);
        return;
      } catch (fallbackErr) {
        console.warn('Fallback admin session error:', fallbackErr);
      }
      setErrorMsg(
        err?.message ||
          'Gagal login via Google. Silakan gunakan tombol "Masuk Cepat Administrator".'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      id="teacher-auth-modal"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
    >
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 border-2 border-indigo-200 shadow-2xl space-y-4 max-h-[95vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-blue-50 border-2 border-blue-200 rounded-2xl flex items-center justify-center mx-auto text-3xl shadow-inner text-blue-600">
            <ShieldCheck className="w-8 h-8 text-blue-600" />
          </div>
          <div>
            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-black uppercase tracking-wider">
              <span>🛡️ Portal Pengelolaan Ujian</span>
            </span>
            <h3 className="font-display text-xl sm:text-2xl font-black text-slate-900 mt-1">
              Portal Guru & Pengawas
            </h3>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">
              CBT CERIA • Pengelolaan Ujian & Bank Soal
            </p>
          </div>
        </div>

        {/* Error message */}
        {errorMsg && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-xs font-bold flex items-start space-x-2 animate-in fade-in">
            <ShieldAlert className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <div className="leading-snug">{errorMsg}</div>
          </div>
        )}

        {/* Quick Admin Access (Recommended 1-Click) */}
        <div className="p-3.5 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-2xl shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center space-x-1 text-[11px] font-extrabold text-blue-700 uppercase tracking-wide">
              <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              <span>Akses Cepat Administrator Resmi</span>
            </span>
            <span className="text-[10px] bg-blue-200/70 text-blue-900 font-black px-2 py-0.5 rounded-full">
              Paling Mudah
            </span>
          </div>

          <p className="text-[11px] text-slate-600 font-semibold">
            Masuk langsung sebagai <strong className="text-slate-800 font-black">Andika Yuliananta, S.Pd.</strong> ({PRIMARY_ADMIN_EMAIL}) tanpa hambatan domain atau popup.
          </p>

          <button
            id="admin-quick-login-btn"
            type="button"
            onClick={handleQuickAdminLogin}
            disabled={loading}
            className="w-full py-2.5 px-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-display font-extrabold text-xs sm:text-sm rounded-xl shadow-md transition-colors flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
                <span>Masuk Sebagai Administrator (Pak Andika)</span>
              </>
            )}
          </button>
        </div>

        {/* Google sign-in button */}
        <div className="space-y-1.5">
          <button
            id="admin-google-login-btn"
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full py-2.5 px-4 border-2 border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors flex items-center justify-center space-x-2 cursor-pointer shadow-2xs"
          >
            <Globe className="w-4 h-4 text-blue-500" />
            <span>Masuk via Akun Google ({PRIMARY_ADMIN_EMAIL})</span>
          </button>
        </div>

        {/* Divider */}
        <div className="relative flex py-1 items-center">
          <div className="flex-grow border-t border-slate-200"></div>
          <span className="flex-shrink mx-3 text-[10px] font-bold text-slate-400 uppercase">
            Atau Gunakan Email & Sandi
          </span>
          <div className="flex-grow border-t border-slate-200"></div>
        </div>

        {/* Email & Password Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Email Guru / Administrator
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
                className="w-full pl-10 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold focus:outline-none focus:border-blue-500 focus:bg-white text-slate-900 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Kata Sandi
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="admin-password-input"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan kata sandi administrator"
                className="w-full pl-10 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white"
              />
            </div>
          </div>

          <button
            id="admin-email-login-btn"
            type="submit"
            disabled={loading || !email.trim() || !password}
            className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-display font-extrabold text-xs sm:text-sm rounded-xl shadow-md transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>Masuk dengan Email & Sandi</span>
              </>
            )}
          </button>
        </form>

        {/* Domain Helper Accordion for Firebase Console Setup */}
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
                Pesan <code className="bg-red-50 text-red-600 px-1 py-0.5 rounded font-mono">auth/unauthorized-domain</code> muncul karena domain preview saat ini belum didaftarkan di Firebase Console.
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
                  <li>Tempelkan nama domain di atas, lalu klik <strong>Save</strong>.</li>
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
            🔒 Portal khusus Administrator Resmi CBT CERIA.
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
