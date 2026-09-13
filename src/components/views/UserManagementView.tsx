import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { AppUser, UserRole, UserStatus } from '../../types';
import { 
  Users, 
  UserPlus, 
  Search, 
  Edit3, 
  Trash2, 
  KeyRound, 
  Shield, 
  CheckCircle2, 
  XCircle, 
  Eye, 
  EyeOff, 
  AlertCircle,
  Clock
} from 'lucide-react';
import { ConfirmModal } from '../common/ConfirmModal';
import { formatTanggalIndonesia } from '../../utils/format';

export const UserManagementView: React.FC = () => {
  const { data, currentUser, addUser, updateUser, deleteUser, toggleUserStatus } = useData();

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');

  // Form Modal (Add / Edit)
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [formNama, setFormNama] = useState('');
  const [formUsername, setFormUsername] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formConfirmPassword, setFormConfirmPassword] = useState('');
  const [formRole, setFormRole] = useState<UserRole>('Bendahara');
  const [formStatus, setFormStatus] = useState<UserStatus>('Aktif');
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState('');

  // Reset Password Modal
  const [resetModalUser, setResetModalUser] = useState<AppUser | null>(null);
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');
  const [resetError, setResetError] = useState('');

  // Delete Confirm Modal
  const [userToDelete, setUserToDelete] = useState<AppUser | null>(null);

  // Filtered users list
  const filteredUsers = useMemo(() => {
    return data.users.filter(u => {
      if (roleFilter !== 'All' && u.role !== roleFilter) return false;
      if (statusFilter !== 'All' && u.status !== statusFilter) return false;
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (
        u.nama.toLowerCase().includes(term) ||
        u.username.toLowerCase().includes(term) ||
        u.role.toLowerCase().includes(term)
      );
    });
  }, [data.users, roleFilter, statusFilter, searchTerm]);

  // Open Add Modal
  const handleOpenAdd = () => {
    setEditingUser(null);
    setFormNama('');
    setFormUsername('');
    setFormPassword('');
    setFormConfirmPassword('');
    setFormRole('Bendahara');
    setFormStatus('Aktif');
    setShowPassword(false);
    setFormError('');
    setIsFormOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (user: AppUser) => {
    setEditingUser(user);
    setFormNama(user.nama);
    setFormUsername(user.username);
    setFormPassword('');
    setFormConfirmPassword('');
    setFormRole(user.role);
    setFormStatus(user.status);
    setShowPassword(false);
    setFormError('');
    setIsFormOpen(true);
  };

  // Save Add / Edit
  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formNama.trim() || !formUsername.trim()) {
      setFormError('Nama lengkap dan username wajib diisi.');
      return;
    }

    if (!editingUser) {
      // Adding new user
      if (!formPassword || formPassword.length < 5) {
        setFormError('Password baru minimal 5 karakter.');
        return;
      }
      if (formPassword !== formConfirmPassword) {
        setFormError('Konfirmasi password tidak cocok.');
        return;
      }

      const res = await addUser({
        nama: formNama.trim(),
        username: formUsername.trim(),
        role: formRole,
        status: formStatus,
      }, formPassword);

      if (!res.success) {
        setFormError(res.message || 'Gagal menambahkan pengguna.');
        return;
      }
    } else {
      // Editing existing user
      let newPass: string | undefined = undefined;
      if (formPassword.trim().length > 0) {
        if (formPassword.length < 5) {
          setFormError('Password baru minimal 5 karakter.');
          return;
        }
        if (formPassword !== formConfirmPassword) {
          setFormError('Konfirmasi password tidak cocok.');
          return;
        }
        newPass = formPassword;
      }

      const res = await updateUser(editingUser.id, {
        nama: formNama.trim(),
        username: formUsername.trim(),
        role: formRole,
        status: formStatus,
      }, newPass);

      if (!res.success) {
        setFormError(res.message || 'Gagal memperbarui pengguna.');
        return;
      }
    }

    setIsFormOpen(false);
  };

  // Save Reset Password
  const handleSaveResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');

    if (!resetModalUser) return;
    if (resetNewPassword.length < 5) {
      setResetError('Password baru minimal 5 karakter.');
      return;
    }
    if (resetNewPassword !== resetConfirmPassword) {
      setResetError('Konfirmasi password tidak cocok.');
      return;
    }

    const res = await updateUser(resetModalUser.id, {}, resetNewPassword);
    if (!res.success) {
      setResetError(res.message || 'Gagal mereset password.');
      return;
    }

    setResetModalUser(null);
    setResetNewPassword('');
    setResetConfirmPassword('');
  };

  return (
    <div id="view-user-management" className="space-y-6 animate-in fade-in duration-300">
      
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-slate-900/70 border border-slate-800 shadow-md">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">MANAJEMEN PENGGUNA</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Kelola hak akses akun Administrator, Bendahara, dan Ketua RT 09 RW 08
              </p>
            </div>
          </div>
        </div>

        <button
          id="btn-add-user"
          type="button"
          onClick={handleOpenAdd}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-lg shadow-emerald-950/40 transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          + Tambah Pengguna
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama, username, atau role..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 text-[11px]">Role:</span>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 focus:outline-none focus:border-emerald-500 font-medium"
            >
              <option value="All">Semua Role</option>
              <option value="Admin">Admin</option>
              <option value="Bendahara">Bendahara</option>
              <option value="Ketua RT">Ketua RT</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 text-[11px]">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 focus:outline-none focus:border-emerald-500 font-medium"
            >
              <option value="All">Semua Status</option>
              <option value="Aktif">Aktif</option>
              <option value="Nonaktif">Nonaktif</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="rounded-2xl bg-slate-900/60 border border-slate-800 overflow-hidden shadow-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="px-4 py-3.5 w-12 text-center">No</th>
                <th className="px-4 py-3.5">Nama Pengguna</th>
                <th className="px-4 py-3.5">Username</th>
                <th className="px-4 py-3.5">Role</th>
                <th className="px-4 py-3.5 text-center">Status</th>
                <th className="px-4 py-3.5">Terakhir Login</th>
                <th className="px-4 py-3.5 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-500">
                    Tidak ditemukan pengguna yang sesuai kriteria pencarian.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user, idx) => {
                  const isCurrent = currentUser?.id === user.id;
                  return (
                    <tr 
                      key={user.id} 
                      className={`hover:bg-slate-800/30 transition-colors ${
                        user.status === 'Nonaktif' ? 'opacity-60' : ''
                      }`}
                    >
                      <td className="px-4 py-3 text-center text-slate-400 font-mono">
                        {idx + 1}
                      </td>

                      <td className="px-4 py-3">
                        <div className="font-semibold text-white flex items-center gap-1.5">
                          {user.nama}
                          {isCurrent && (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px]">
                              Anda
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3 font-mono text-cyan-300">
                        @{user.username}
                      </td>

                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                          user.role === 'Admin'
                            ? 'bg-purple-500/10 text-purple-400 border border-purple-500/30'
                            : user.role === 'Bendahara'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                        }`}>
                          <Shield className="w-3 h-3" />
                          {user.role}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => toggleUserStatus(user.id)}
                          disabled={isCurrent}
                          title={isCurrent ? 'Tidak dapat menonaktifkan akun sendiri' : 'Klik untuk mengubah status'}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all ${
                            user.status === 'Aktif'
                              ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/60 hover:bg-rose-950/60 hover:text-rose-400'
                              : 'bg-rose-950/60 text-rose-400 border border-rose-800/60 hover:bg-emerald-950/60 hover:text-emerald-400'
                          } ${isCurrent ? 'cursor-not-allowed opacity-80' : ''}`}
                        >
                          {user.status === 'Aktif' ? (
                            <>
                              <CheckCircle2 className="w-3 h-3" />
                              Aktif
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3 h-3" />
                              Nonaktif
                            </>
                          )}
                        </button>
                      </td>

                      <td className="px-4 py-3 text-slate-400 font-mono text-[11px]">
                        {user.lastLogin ? (
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-slate-500" />
                            <span>{formatTanggalIndonesia(user.lastLogin.split('T')[0], 'short')} {user.lastLogin.split('T')[1]?.substring(0, 5)}</span>
                          </div>
                        ) : (
                          '-'
                        )}
                      </td>

                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Edit */}
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(user)}
                            title="Edit Pengguna"
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          {/* Reset Password */}
                          <button
                            type="button"
                            onClick={() => {
                              setResetModalUser(user);
                              setResetNewPassword('');
                              setResetConfirmPassword('');
                              setResetError('');
                            }}
                            title="Reset Password"
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 hover:text-amber-300 transition-colors"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                          </button>

                          {/* Hapus */}
                          <button
                            type="button"
                            onClick={() => setUserToDelete(user)}
                            disabled={isCurrent}
                            title={isCurrent ? 'Tidak dapat menghapus akun sendiri' : 'Hapus Pengguna'}
                            className="p-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 hover:text-rose-300 transition-colors disabled:opacity-30 disabled:pointer-events-none"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Add / Edit User */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95">
            
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-400" />
                {editingUser ? 'Edit Pengguna' : 'Tambah Pengguna Baru'}
              </h3>
              <button
                onClick={() => setIsFormOpen(false)}
                className="text-slate-400 hover:text-white text-xs p-1"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="m-5 mb-0 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2 text-rose-400 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveUser} className="p-5 space-y-4 text-xs">
              
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  value={formNama}
                  onChange={(e) => setFormNama(e.target.value)}
                  placeholder="Contoh: Bambang Pamungkas"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Username</label>
                <input
                  type="text"
                  value={formUsername}
                  onChange={(e) => setFormUsername(e.target.value)}
                  placeholder="Contoh: bendahara_rt09"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-emerald-500 font-mono"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Role</label>
                  <select
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value as UserRole)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Admin">Admin</option>
                    <option value="Bendahara">Bendahara</option>
                    <option value="Ketua RT">Ketua RT</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Status</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as UserStatus)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Aktif">Aktif</option>
                    <option value="Nonaktif">Nonaktif</option>
                  </select>
                </div>
              </div>

              {/* Password section */}
              <div className="pt-2 border-t border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-slate-300 font-semibold">
                    {editingUser ? 'Ganti Password (Kosongkan jika tidak diubah)' : 'Password'}
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-slate-400 hover:text-slate-200 text-[11px] flex items-center gap-1"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    <span>{showPassword ? 'Sembunyikan' : 'Lihat'}</span>
                  </button>
                </div>

                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  placeholder={editingUser ? 'Masukkan password baru...' : 'Minimal 5 karakter...'}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-emerald-500"
                  required={!editingUser}
                />

                {(formPassword.length > 0 || !editingUser) && (
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Konfirmasi Password</label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={formConfirmPassword}
                      onChange={(e) => setFormConfirmPassword(e.target.value)}
                      placeholder="Ketik ulang password..."
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-emerald-500"
                      required={!editingUser || formPassword.length > 0}
                    />
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-lg shadow-emerald-950/40 transition-colors"
                >
                  {editingUser ? 'Perbarui Pengguna' : 'Simpan Pengguna'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* Modal Reset Password */}
      {resetModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-amber-400" />
                Reset Password
              </h3>
              <button
                onClick={() => setResetModalUser(null)}
                className="text-slate-400 hover:text-white text-xs p-1"
              >
                ✕
              </button>
            </div>

            <div className="px-5 pt-4">
              <p className="text-xs text-slate-400">
                Atur ulang password untuk akun <strong className="text-white">{resetModalUser.nama}</strong> (@{resetModalUser.username}):
              </p>
            </div>

            {resetError && (
              <div className="m-5 mb-0 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2 text-rose-400 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{resetError}</span>
              </div>
            )}

            <form onSubmit={handleSaveResetPassword} className="p-5 space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Password Baru</label>
                <input
                  type="password"
                  value={resetNewPassword}
                  onChange={(e) => setResetNewPassword(e.target.value)}
                  placeholder="Minimal 5 karakter..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Konfirmasi Password Baru</label>
                <input
                  type="password"
                  value={resetConfirmPassword}
                  onChange={(e) => setResetConfirmPassword(e.target.value)}
                  placeholder="Ketik ulang password..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setResetModalUser(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold shadow-lg shadow-amber-950/40 transition-colors"
                >
                  Reset Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Delete Modal */}
      {userToDelete && (
        <ConfirmModal
          isOpen={!!userToDelete}
          title="Hapus Pengguna?"
          message={`Apakah Anda yakin ingin menghapus akun pengguna "${userToDelete.nama}" (@${userToDelete.username})? Tindakan ini tidak dapat dibatalkan.`}
          confirmText="Ya, Hapus"
          cancelText="Batal"
          isDestructive={true}
          onConfirm={() => {
            deleteUser(userToDelete.id);
            setUserToDelete(null);
          }}
          onCancel={() => setUserToDelete(null)}
        />
      )}

    </div>
  );
};
