import React, { useState } from 'react';
import {
  ShieldCheck,
  KeyRound,
  User,
  Eye,
  EyeOff,
  ArrowLeft,
  AlertCircle,
  LogIn,
  Sparkles,
  School,
  Lock,
} from 'lucide-react';
import { ProctorSession } from '../../types';
import { loginProctor } from '../../services/firebase/proctorService';

interface ProctorLoginProps {
  onSuccess: (session: ProctorSession) => void;
  onBackToHome: () => void;
}

export const ProctorLogin: React.FC<ProctorLoginProps> = ({
  onSuccess,
  onBackToHome,
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!username.trim() || !password.trim()) {
      setErrorMessage('Harap masukkan Username dan Password proktor.');
      return;
    }

    setLoading(true);
    try {
      const session = await loginProctor(username, password);
      onSuccess(session);
    } catch (err: any) {
      setErrorMessage(
        err?.message || 'Login proktor gagal. Pastikan username dan password benar.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleUseDemoCredentials = () => {
    setUsername('proktor1');
    setPassword('proktor123');
    setErrorMessage(null);
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 bg-[#FCFDFD]">
      <div className="max-w-md w-full bg-white rounded-3xl border-2 border-emerald-200/90 p-6 sm:p-8 shadow-xl space-y-6">
        {/* Top Header */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-emerald-500 to-teal-500 text-white flex items-center justify-center font-display font-black text-3xl shadow-sm mx-auto">
            🛡️
          </div>
          <div className="flex items-center justify-center space-x-1.5">
            <h1 className="font-display font-black text-2xl text-slate-900 tracking-tight">
              Portal Proktor
            </h1>
            <Sparkles className="w-4 h-4 text-emerald-500 fill-emerald-400" />
          </div>
          <p className="text-xs text-slate-500 font-medium">
            Masuk dengan akun pengawas yang telah dibuat oleh Guru/Administrator CBT CERIA.
          </p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-xs font-bold flex items-center space-x-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Username Proktor
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                @
              </span>
              <input
                type="text"
                required
                autoFocus
                placeholder="proktor1"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().trim())}
                className="w-full pl-9 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-mono font-bold text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Password
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-mono text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl font-display font-black text-sm shadow-md transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-60"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : (
              <LogIn className="w-4 h-4" />
            )}
            <span>{loading ? 'Memvalidasi...' : 'Masuk Dashboard Proktor'}</span>
          </button>
        </form>

        {/* Quick Testing Helper */}
        <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-3.5 text-center space-y-1.5">
          <div className="text-[11px] text-emerald-900 font-extrabold flex items-center justify-center space-x-1">
            <span>💡</span>
            <span>Uji Coba Cepat (Akun Demo):</span>
          </div>
          <button
            type="button"
            onClick={handleUseDemoCredentials}
            className="text-xs font-mono font-bold text-emerald-800 bg-white px-3 py-1 rounded-lg border border-emerald-300 shadow-2xs hover:bg-emerald-100 transition-colors cursor-pointer"
          >
            Gunakan Akun: proktor1 / proktor123
          </button>
        </div>

        {/* Back to Home Action */}
        <div className="pt-2 border-t border-slate-100 text-center">
          <button
            type="button"
            onClick={onBackToHome}
            className="inline-flex items-center space-x-1.5 text-xs font-bold text-slate-500 hover:text-emerald-700 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Beranda</span>
          </button>
        </div>
      </div>
    </div>
  );
};
