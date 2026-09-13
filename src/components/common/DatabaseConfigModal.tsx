import React, { useState } from 'react';
import { Database, Cloud, CheckCircle2, Copy, Check, ExternalLink, ShieldAlert, Key } from 'lucide-react';

interface DatabaseConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DatabaseConfigModal: React.FC<DatabaseConfigModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);

  // Check if Firebase env vars are present
  const hasApiKey = Boolean(import.meta.env.VITE_FIREBASE_API_KEY);
  const hasProjectId = Boolean(import.meta.env.VITE_FIREBASE_PROJECT_ID);
  const isFirebaseConnected = hasApiKey && hasProjectId;

  const envTemplate = `# Konfigurasi Firebase / Firestore Database Online
VITE_FIREBASE_API_KEY="AIzaSy..."
VITE_FIREBASE_AUTH_DOMAIN="keuangan-rt09.firebaseapp.com"
VITE_FIREBASE_PROJECT_ID="keuangan-rt09"
VITE_FIREBASE_STORAGE_BUCKET="keuangan-rt09.appspot.com"
VITE_FIREBASE_MESSAGING_SENDER_ID="123456789"
VITE_FIREBASE_APP_ID="1:123456789:web:abcdef"`;

  const handleCopy = () => {
    navigator.clipboard.writeText(envTemplate);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-xl bg-white border border-[#E5E7EB] rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="p-5 border-b border-[#E5E7EB] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-50 text-[#1E5AA8] border border-blue-100">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#1F2937] tracking-tight">
                Status Database Online & Firebase
              </h3>
              <p className="text-xs text-[#6B7280]">
                Panduan sinkronisasi cloud & persistensi data RT 09 RW 08
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#6B7280] hover:text-[#1F2937] text-sm p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-xs text-[#1F2937] max-h-[75vh] overflow-y-auto">
          
          {/* Status Box */}
          <div className={`p-4 rounded-xl border flex items-start gap-3 ${
            isFirebaseConnected 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
              : 'bg-blue-50 border-blue-200 text-blue-900'
          }`}>
            {isFirebaseConnected ? (
              <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-[#198754]" />
            ) : (
              <Database className="w-5 h-5 shrink-0 mt-0.5 text-[#1E5AA8]" />
            )}
            <div>
              <h4 className="font-bold text-sm">
                {isFirebaseConnected ? 'Firebase Terhubung & Aktif' : 'Penyimpanan Lokal (localStorage) Aktif'}
              </h4>
              <p className="text-xs mt-1 leading-relaxed opacity-90">
                {isFirebaseConnected 
                  ? 'Konfigurasi Firebase terdeteksi dari environment variables. Sinkronisasi dokumen cloud siap digunakan.' 
                  : 'Aplikasi saat ini menggunakan penyimpanan persisten browser (localStorage). Data Anda tersimpan aman dan tidak hilang saat refresh halaman.'}
              </p>
            </div>
          </div>

          {/* Guide steps */}
          <div className="space-y-2.5">
            <h4 className="font-bold text-[#1F2937] uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-[#1E5AA8]" />
              Cara Mengaktifkan Firebase / Database Online:
            </h4>

            <ol className="space-y-2 list-decimal list-inside text-[#6B7280]">
              <li>
                Buka konsol <span className="text-[#1F2937] font-semibold">Firebase</span> (<a href="https://console.firebase.google.com" target="_blank" rel="noreferrer" className="text-[#1E5AA8] hover:underline inline-flex items-center gap-0.5">console.firebase.google.com <ExternalLink className="w-3 h-3" /></a>) dan buat project baru.
              </li>
              <li>
                Aktifkan <span className="text-[#1F2937] font-semibold">Cloud Firestore Database</span> dan <span className="text-[#1F2937] font-semibold">Authentication</span> (Email/Password).
              </li>
              <li>
                Daftarkan Web App di Project Settings untuk mendapatkan kredensial konfigurasi Firebase.
              </li>
              <li>
                Tambahkan variabel konfigurasi ke environment variables platform.
              </li>
            </ol>
          </div>

          {/* Code snippet template */}
          <div>
            <div className="flex items-center justify-between pb-1.5 px-1">
              <span className="text-[11px] text-[#6B7280] font-mono">Template .env</span>
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-[#1F2937] text-[11px] font-medium border border-[#E5E7EB] transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3 text-[#198754]" />
                    Tersalin!
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    Salin Variabel
                  </>
                )}
              </button>
            </div>
            <pre className="p-3 rounded-lg bg-[#F8FAFC] border border-[#E5E7EB] text-[#1E5AA8] font-mono text-[11px] leading-relaxed overflow-x-auto select-all">
              {envTemplate}
            </pre>
          </div>

          {/* Security Guarantee */}
          <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 flex items-start gap-2.5 text-xs text-amber-900">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
            <span>
              Kerahasiaan data terjamin: Kredensial rahasia tidak pernah disimpan langsung di dalam source code. Pengguna dapat melakukan backup mandiri berkala via menu <strong>Backup & Restore</strong>.
            </span>
          </div>

        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-[#E5E7EB] bg-[#F8FAFC] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-white border border-[#E5E7EB] hover:bg-slate-100 text-[#1F2937] font-medium text-xs transition-colors"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
};
