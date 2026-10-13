import React, { useState } from 'react';
import { Mail, Lock, LogIn, AlertCircle, Loader2, ShieldCheck, ShieldAlert, KeyRound } from 'lucide-react';
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

  const isEmailMatchingAdmin = isAuthorizedAdminEmail(email);

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
        name: firebaseUser.displayName || 'Administrator CBT',
        email: cleanEmail,
        role: 'admin',
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
      };
      onSuccess(userObj);
    } catch (err: any) {
      console.warn('Auth notice:', err);
      let message = err.message || 'Gagal masuk. Periksa kembali email dan kata sandi Anda.';
      if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        message = 'Kredensial tidak cocok. Pastikan kata sandi administrator benar.';
      } else if (err.code === 'auth/weak-password') {
        message = 'Kata sandi minimal 6 karakter.';
      } else if (err.code === 'auth/operation-not-allowed') {
        message = 'Provider Email/Password belum diaktifkan di Firebase Console. Anda dapat menggunakan Google Auth.';
      }
      setErrorMsg(message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setErrorMsg(null);
    setLoading(true);
    try {
      const user = await loginTeacherWithGoogle();
      onSuccess(user);
    } catch (err: any) {
      if (
        err?.code === 'auth/popup-blocked' ||
        err?.message?.includes('popup-blocked')
      ) {
        try {
          const user = await ensureTeacherAuthSession();
          onSuccess(user);
          return;
        } catch (fallbackErr) {
          console.warn('Fallback admin session error:', fallbackErr);
        }
      }
      console.warn('Google auth warning:', err);
      setErrorMsg(
        err.message ||
          'Gagal login via Google. Pastikan memilih akun Administrator resmi atau gunakan Email & Kata Sandi.'
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
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 border-2 border-indigo-200 shadow-2xl space-y-5">
        {/* Modal Header */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-blue-50 border-2 border-blue-200 rounded-2xl flex items-center justify-center mx-auto text-3xl shadow-inner text-blue-600">
            <ShieldCheck className="w-9 h-9 text-blue-600" />
          </div>
          <div>
            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-black uppercase tracking-wider">
              <span>🛡️ Portal Pengelolaan Ujian</span>
            </span>
            <h3 className="font-display text-2xl font-black text-slate-900 mt-1">
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
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
                placeholder="Masukkan email guru / admin"
                className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold focus:outline-none focus:border-blue-500 focus:bg-white text-slate-900 transition-colors"
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
                placeholder="Masukkan kata sandi"
                className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white"
              />
            </div>
          </div>

          <button
            id="admin-email-login-btn"
            type="submit"
            disabled={loading || !email.trim() || !password}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-display font-extrabold text-xs sm:text-sm rounded-xl shadow-md transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>Masuk ke Portal Guru</span>
              </>
            )}
          </button>
        </form>

        <div className="relative flex py-1 items-center">
          <div className="flex-grow border-t border-slate-200"></div>
          <span className="flex-shrink mx-3 text-[11px] font-bold text-slate-400 uppercase">
            Atau
          </span>
          <div className="flex-grow border-t border-slate-200"></div>
        </div>

        {/* Google sign-in button */}
        <button
          id="admin-google-login-btn"
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full py-2.5 px-4 border-2 border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors flex items-center justify-center space-x-2 cursor-pointer shadow-2xs"
        >
          <span>🌐</span>
          <span>Masuk via Akun Google</span>
        </button>

        {/* Registration Disabled Notice & Cancel */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
          <span className="text-[11px] text-slate-400 font-semibold italic">
            🔒 Pendaftaran publik ditutup demi keamanan bank soal.
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
