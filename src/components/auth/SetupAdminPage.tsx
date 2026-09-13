import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { User, Lock, Eye, EyeOff, Loader2, CheckCircle2, AlertCircle, Building2 } from 'lucide-react';

export const SetupAdminPage: React.FC = () => {
  const { setupAdmin, isLoading } = useData();
  const [nama, setNama] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!nama.trim() || !username.trim() || !password || !confirmPassword) {
      setErrorMessage('Harap lengkapi semua data formulir setup.');
      return;
    }

    if (password.length < 5) {
      setErrorMessage('Password minimal 5 karakter untuk keamanan.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Konfirmasi password tidak cocok dengan password yang dimasukkan.');
      return;
    }

    setSubmitting(true);
    const res = await setupAdmin(nama, username, password);
    setSubmitting(false);

    if (!res.success) {
      setErrorMessage(res.message || 'Gagal mengatur administrator.');
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#F7F9FC] flex flex-col justify-center items-center p-4 font-sans select-none">
      
      <div className="w-full max-w-lg">
        
        {/* Header Branding */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#1E5AA8] text-white shadow-sm mb-3">
            <Building2 className="w-7 h-7" />
          </div>

          <h1 className="text-2xl font-extrabold tracking-tight text-[#1F2937] uppercase">
            Setup Administrator
          </h1>
          <p className="text-[#1E5AA8] font-semibold text-sm mt-0.5">
            KEUANGAN RT 09 RW 08 - Kelurahan Bangetayu Wetan
          </p>
          <p className="text-xs text-[#6B7280] mt-1.5 max-w-md mx-auto">
            Sistem mendeteksi aplikasi belum memiliki akun pengguna. Konfigurasikan akun Administrator pertama Anda di bawah ini.
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 sm:p-8 shadow-sm">
          
          <div className="flex items-center gap-2 pb-3.5 mb-5 border-b border-[#E5E7EB]">
            <CheckCircle2 className="w-5 h-5 text-[#198754]" />
            <h2 className="text-xs font-bold text-[#1F2937] uppercase tracking-wider">
              Inisialisasi Akun Pengelola Utama
            </h2>
          </div>

          {errorMessage && (
            <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-[#DC3545] text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Nama Administrator */}
            <div>
              <label htmlFor="setup-nama" className="block text-xs font-semibold text-[#1F2937] mb-1.5">
                Nama Lengkap Administrator
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#6B7280]">
                  <User className="w-4 h-4" />
                </div>
                <input
                  id="setup-nama"
                  type="text"
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  placeholder="Contoh: H. Sugiyanto / Admin RT"
                  className="w-full pl-10 pr-4 h-11 bg-white border border-[#E5E7EB] rounded-lg text-[#1F2937] placeholder-slate-400 text-sm focus:outline-none focus:border-[#1E5AA8] focus:ring-2 focus:ring-[#1E5AA8]/20 transition-all"
                  required
                />
              </div>
            </div>

            {/* Username */}
            <div>
              <label htmlFor="setup-username" className="block text-xs font-semibold text-[#1F2937] mb-1.5">
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#6B7280]">
                  <User className="w-4 h-4" />
                </div>
                <input
                  id="setup-username"
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Contoh: admin / bendahara"
                  className="w-full pl-10 pr-4 h-11 bg-white border border-[#E5E7EB] rounded-lg text-[#1F2937] placeholder-slate-400 text-sm focus:outline-none focus:border-[#1E5AA8] focus:ring-2 focus:ring-[#1E5AA8]/20 transition-all"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="setup-password" className="block text-xs font-semibold text-[#1F2937] mb-1.5">
                Password Administrator
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#6B7280]">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="setup-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimal 5 karakter..."
                  className="w-full pl-10 pr-11 h-11 bg-white border border-[#E5E7EB] rounded-lg text-[#1F2937] placeholder-slate-400 text-sm focus:outline-none focus:border-[#1E5AA8] focus:ring-2 focus:ring-[#1E5AA8]/20 transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#6B7280] hover:text-[#1F2937] focus:outline-none transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Konfirmasi Password */}
            <div>
              <label htmlFor="setup-confirm-password" className="block text-xs font-semibold text-[#1F2937] mb-1.5">
                Konfirmasi Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#6B7280]">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="setup-confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Ketik ulang password..."
                  className="w-full pl-10 pr-4 h-11 bg-white border border-[#E5E7EB] rounded-lg text-[#1F2937] placeholder-slate-400 text-sm focus:outline-none focus:border-[#1E5AA8] focus:ring-2 focus:ring-[#1E5AA8]/20 transition-all"
                  required
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                id="btn-setup-admin-submit"
                type="submit"
                disabled={submitting || isLoading}
                className="w-full h-11 px-4 rounded-lg bg-[#1E5AA8] hover:bg-[#164A87] text-white font-semibold text-sm tracking-wide uppercase shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:pointer-events-none"
              >
                {(submitting || isLoading) ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Mengonfigurasi Administrator...</span>
                  </>
                ) : (
                  <span>SIMPAN & MASUK SISTEM</span>
                )}
              </button>
            </div>

          </form>

        </div>

        {/* Security Note */}
        <div className="mt-5 text-center text-xs text-[#6B7280]">
          <p className="flex items-center justify-center gap-1.5 font-medium">
            <Lock className="w-3.5 h-3.5 text-[#198754]" />
            Keamanan Tinggi: Password dienkripsi dengan algoritma SHA-256 dan Salt.
          </p>
        </div>

      </div>

    </div>
  );
};
