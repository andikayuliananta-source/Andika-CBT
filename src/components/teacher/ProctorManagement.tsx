import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  UserPlus,
  Search,
  KeyRound,
  Trash2,
  Edit2,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  RefreshCw,
  AlertCircle,
  School,
  Lock,
} from 'lucide-react';
import { Proctor } from '../../types';
import {
  getProctors,
  createProctor,
  updateProctor,
  deleteProctor,
  seedDefaultProctorIfNone,
} from '../../services/firebase/proctorService';

interface ProctorManagementProps {
  currentUserUid: string;
}

export const ProctorManagement: React.FC<ProctorManagementProps> = ({ currentUserUid }) => {
  const [proctors, setProctors] = useState<Proctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProctor, setEditingProctor] = useState<Proctor | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    name: '',
    roomOrLab: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Delete confirmation
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchProctorsList = async () => {
    try {
      setLoading(true);
      await seedDefaultProctorIfNone();
      const list = await getProctors();
      setProctors(list);
    } catch (err: any) {
      console.error('Failed to load proctors:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProctorsList();
  }, []);

  const handleOpenAdd = () => {
    setFormData({
      username: '',
      password: '',
      name: '',
      roomOrLab: '',
    });
    setFormError(null);
    setEditingProctor(null);
    setShowAddModal(true);
  };

  const handleOpenEdit = (p: Proctor) => {
    setEditingProctor(p);
    setFormData({
      username: p.username,
      password: p.password,
      name: p.name,
      roomOrLab: p.roomOrLab || '',
    });
    setFormError(null);
    setShowAddModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const username = formData.username.trim().toLowerCase();
    const password = formData.password.trim();
    const name = formData.name.trim();

    if (!username) {
      setFormError('Username wajib diisi.');
      return;
    }
    if (!/^[a-z0-9_.-]+$/.test(username)) {
      setFormError('Username hanya boleh berisi huruf kecil, angka, titik, atau garis bawah (_).');
      return;
    }
    if (!password || password.length < 4) {
      setFormError('Password minimal 4 karakter.');
      return;
    }
    if (!name) {
      setFormError('Nama lengkap proktor wajib diisi.');
      return;
    }

    try {
      setFormSubmitting(true);
      if (editingProctor) {
        await updateProctor(editingProctor.proctorId, {
          name,
          password,
          roomOrLab: formData.roomOrLab.trim() || 'Semua Ruangan',
        });
        setSuccessMessage(`Akun proktor "${username}" berhasil diperbarui!`);
      } else {
        await createProctor({
          username,
          password,
          name,
          roomOrLab: formData.roomOrLab.trim() || 'Semua Ruangan',
          createdBy: currentUserUid,
        });
        setSuccessMessage(`Akun proktor baru "${username}" berhasil dibuat!`);
      }

      setShowAddModal(false);
      await fetchProctorsList();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setFormError(err?.message || 'Gagal menyimpan akun proktor.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleToggleStatus = async (p: Proctor) => {
    const newStatus = p.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await updateProctor(p.proctorId, { status: newStatus });
      setProctors((prev) =>
        prev.map((item) => (item.proctorId === p.proctorId ? { ...item, status: newStatus } : item))
      );
    } catch (err) {
      alert('Gagal mengubah status proktor.');
    }
  };

  const handleDelete = async (proctorId: string) => {
    try {
      await deleteProctor(proctorId);
      setDeletingId(null);
      setSuccessMessage('Akun proktor berhasil dihapus.');
      fetchProctorsList();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      alert('Gagal menghapus proktor.');
    }
  };

  const filteredProctors = proctors.filter(
    (p) =>
      p.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.roomOrLab && p.roomOrLab.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-500 text-white flex items-center justify-center font-display font-black text-2xl shadow-sm shrink-0">
            🛡️
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="font-display font-black text-2xl text-slate-800 tracking-tight">
                Manajemen Proktor
              </h2>
              <span className="bg-emerald-100 text-emerald-800 text-xs font-black px-2.5 py-0.5 rounded-full uppercase">
                Pengawas Ujian
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
              Kelola kredensial login (Username & Password) untuk petugas proktor di ruangan atau lab komputer.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={fetchProctorsList}
            className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
            title="Muat ulang data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
          </button>
          <button
            type="button"
            onClick={handleOpenAdd}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-xs sm:text-sm font-display font-extrabold shadow-sm transition-all flex items-center space-x-2 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Tambah Akun Proktor</span>
          </button>
        </div>
      </div>

      {/* Success Notification */}
      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-2xl flex items-center space-x-3 text-xs sm:text-sm font-bold animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Quick Testing Helper Card */}
      <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-sky-50 border border-emerald-200 rounded-2xl p-4 text-xs font-medium text-emerald-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center space-x-3">
          <span className="text-xl">💡</span>
          <div>
            <div className="font-extrabold text-emerald-900">
              Kredensial Demo Proktor Siap Pakai:
            </div>
            <div className="text-emerald-800/90 text-[11px] mt-0.5">
              Username: <strong className="font-mono bg-white/70 px-1.5 py-0.5 rounded border border-emerald-200">proktor1</strong> • Password: <strong className="font-mono bg-white/70 px-1.5 py-0.5 rounded border border-emerald-200">proktor123</strong>
            </div>
          </div>
        </div>
        <div className="text-[11px] font-bold text-emerald-700 bg-white/80 px-3 py-1.5 rounded-xl border border-emerald-200 shrink-0 self-start sm:self-auto">
          🛡️ Akses Terisolasi: Reset Peserta & Pantau Ujian
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari username, nama proktor, ruangan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-emerald-500 focus:bg-white transition-all font-medium"
          />
        </div>
        <div className="text-xs text-slate-500 font-bold self-end sm:self-auto">
          Total: <span className="text-slate-800 font-black">{filteredProctors.length}</span> Akun Proktor
        </div>
      </div>

      {/* Table of Proctors */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-xs font-bold text-slate-600">Memuat daftar proktor...</p>
          </div>
        ) : filteredProctors.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto text-2xl">
              🛡️
            </div>
            <h3 className="font-display font-black text-slate-700 text-base">
              Belum Ada Akun Proktor
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto font-medium">
              Buat akun proktor pertama untuk memberi akses pengawas ruang ujian melakukan reset sesi dan memantau siswa.
            </p>
            <button
              type="button"
              onClick={handleOpenAdd}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              + Buat Akun Proktor
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-black uppercase text-[11px] tracking-wider">
                  <th className="py-3.5 px-4 sm:px-6">Proktor</th>
                  <th className="py-3.5 px-4">Username</th>
                  <th className="py-3.5 px-4">Password</th>
                  <th className="py-3.5 px-4">Penempatan Ruangan</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right sm:pr-6">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProctors.map((p) => (
                  <tr key={p.proctorId} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-4 px-4 sm:px-6">
                      <div className="flex items-center space-x-3">
                        <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 font-display font-black flex items-center justify-center shrink-0">
                          🛡️
                        </div>
                        <div>
                          <div className="font-bold text-slate-900">{p.name}</div>
                          <div className="text-[11px] text-slate-400">
                            ID: <span className="font-mono">{p.proctorId.slice(-6)}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-4 font-mono font-bold text-emerald-700">
                      @{p.username}
                    </td>

                    <td className="py-4 px-4">
                      <span className="font-mono bg-slate-100 px-2 py-1 rounded text-slate-700 text-xs border border-slate-200 font-semibold">
                        {p.password}
                      </span>
                    </td>

                    <td className="py-4 px-4 text-slate-600 font-medium">
                      <span className="inline-flex items-center space-x-1 bg-teal-50 text-teal-800 px-2 py-0.5 rounded-md text-xs font-bold border border-teal-200">
                        <School className="w-3 h-3" />
                        <span>{p.roomOrLab || 'Semua Ruangan'}</span>
                      </span>
                    </td>

                    <td className="py-4 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(p)}
                        className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-black cursor-pointer transition-all ${
                          p.status === 'ACTIVE'
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                        }`}
                        title="Klik untuk toggle status"
                      >
                        {p.status === 'ACTIVE' ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>AKTIF</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3.5 h-3.5 text-slate-400" />
                            <span>NONAKTIF</span>
                          </>
                        )}
                      </button>
                    </td>

                    <td className="py-4 px-4 text-right sm:pr-6">
                      <div className="flex items-center justify-end space-x-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(p)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                          title="Edit Proktor"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingId(p.proctorId)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                          title="Hapus Proktor"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Add / Edit Proctor */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center text-lg">
                  🛡️
                </div>
                <div>
                  <h3 className="font-display font-black text-lg text-slate-900">
                    {editingProctor ? 'Edit Akun Proktor' : 'Tambah Akun Proktor Baru'}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Akses khusus pengawas ruang ujian CBT
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Lengkap Proktor <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Budi Santoso, S.Kom"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-emerald-500 focus:bg-white font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Username Login <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs">
                    @
                  </span>
                  <input
                    type="text"
                    required
                    disabled={Boolean(editingProctor)}
                    placeholder="proktor_lab1"
                    value={formData.username}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        username: e.target.value.toLowerCase().replace(/[^a-z0-9_.-]/g, ''),
                      })
                    }
                    className="w-full pl-8 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-emerald-500 focus:bg-white font-mono font-bold disabled:opacity-60"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Huruf kecil, angka, garis bawah (_). Tidak dapat diubah setelah dibuat.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Password Login <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={4}
                    placeholder="Minimal 4 karakter"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-emerald-500 focus:bg-white font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Keterangan Ruangan / Laboratorium
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Lab Komputer 1 / Ruang 04"
                  value={formData.roomOrLab}
                  onChange={(e) => setFormData({ ...formData, roomOrLab: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-emerald-500 focus:bg-white font-medium"
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-display font-extrabold shadow-sm transition-all flex items-center space-x-2 disabled:opacity-60 cursor-pointer"
                >
                  {formSubmitting ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  <span>{editingProctor ? 'Simpan Perubahan' : 'Buat Akun Proktor'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 text-center space-y-4 shadow-xl border border-slate-100 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto text-2xl">
              🗑️
            </div>
            <h3 className="font-display font-black text-slate-800 text-base">
              Hapus Akun Proktor Ini?
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Akun proktor ini tidak akan dapat login lagi ke Dashboard Proktor.
            </p>
            <div className="pt-2 flex items-center justify-center space-x-2">
              <button
                type="button"
                onClick={() => setDeletingId(null)}
                className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-bold cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => handleDelete(deletingId)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
