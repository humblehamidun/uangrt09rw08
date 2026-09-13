import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { Eye, EyeOff, Lock, User, Building2, AlertCircle, Loader2, HelpCircle } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, isLoading } = useData();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    if (!username.trim() || !password) {
      setErrorMessage('Harap masukkan username dan password.');
      return;
    }

    setSubmitting(true);
    const result = await login(username, password);
    setSubmitting(false);

    if (!result.success) {
      setErrorMessage(result.message || 'Username atau password salah. Silakan coba lagi.');
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#F7F9FC] flex flex-col justify-center items-center p-4 font-sans select-none">
      
      <div className="w-full max-w-md">
        
        {/* Header Branding */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#1E5AA8] text-white shadow-sm mb-3">
            <Building2 className="w-7 h-7" />
          </div>

          <h1 className="text-2xl font-extrabold tracking-tight text-[#1F2937] uppercase">
            KEUANGAN RT 09 RW 08
          </h1>
          <p className="text-[#1E5AA8] font-semibold text-sm mt-0.5">
            Kelurahan Bangetayu Wetan
          </p>
          <p className="text-xs text-[#6B7280] mt-1.5">
            Sistem Informasi Pengelolaan & Pembukuan Kas Warga
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 sm:p-8 shadow-sm">
          
          <div className="mb-5">
            <h2 className="text-base font-bold text-[#1F2937]">Masuk Sistem</h2>
            <p className="text-xs text-[#6B7280] mt-0.5">
              Gunakan akun Admin, Bendahara, atau Ketua RT yang terdaftar
            </p>
          </div>

          {errorMessage && (
            <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-[#DC3545] text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Username Input */}
            <div>
              <label htmlFor="login-username" className="block text-xs font-semibold text-[#1F2937] mb-1.5">
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#6B7280]">
                  <User className="w-4 h-4" />
                </div>
                <input
                  id="login-username"
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Masukkan username..."
                  className="w-full pl-10 pr-4 h-11 bg-white border border-[#E5E7EB] rounded-lg text-[#1F2937] placeholder-slate-400 text-sm focus:outline-none focus:border-[#1E5AA8] focus:ring-2 focus:ring-[#1E5AA8]/20 transition-all"
                  required
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="login-password" className="block text-xs font-semibold text-[#1F2937]">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowHelp(!showHelp)}
                  className="text-[11px] text-[#1E5AA8] hover:underline flex items-center gap-1 font-medium"
                >
                  <HelpCircle className="w-3 h-3" />
                  Lupa Password?
                </button>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#6B7280]">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan password..."
                  className="w-full pl-10 pr-11 h-11 bg-white border border-[#E5E7EB] rounded-lg text-[#1F2937] placeholder-slate-400 text-sm focus:outline-none focus:border-[#1E5AA8] focus:ring-2 focus:ring-[#1E5AA8]/20 transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#6B7280] hover:text-[#1F2937] focus:outline-none transition-colors"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Sembunyikan password' : 'Lihat password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Lupa Password Info Box */}
            {showHelp && (
              <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-xs text-[#1E5AA8] leading-relaxed">
                Silakan hubungi Administrator atau Ketua RT untuk reset password akun Anda melalui menu <strong>Manajemen Pengguna</strong>.
              </div>
            )}

            {/* Submit Button */}
            <div className="pt-2">
              <button
                id="btn-login-submit"
                type="submit"
                disabled={submitting || isLoading}
                className="w-full h-11 px-4 rounded-lg bg-[#1E5AA8] hover:bg-[#164A87] text-white font-semibold text-sm tracking-wide uppercase shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:pointer-events-none"
              >
                {(submitting || isLoading) ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Memproses...</span>
                  </>
                ) : (
                  <span>MASUK</span>
                )}
              </button>
            </div>

          </form>

        </div>

        {/* Footer info */}
        <div className="mt-6 text-center text-[11px] text-[#6B7280]">
          <p className="font-medium">Aplikasi Administrasi & Akuntansi RT 09 RW 08</p>
          <p className="mt-0.5">Kelurahan Bangetayu Wetan, Kecamatan Genuk, Kota Semarang</p>
        </div>

      </div>

    </div>
  );
};
