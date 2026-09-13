import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { 
  FileText, 
  Search, 
  Download, 
  Clock, 
  User, 
  Shield, 
  Activity,
  Calendar,
  Filter
} from 'lucide-react';
import { formatTanggalIndonesia, downloadCSV } from '../../utils/format';

export const AuditLogView: React.FC = () => {
  const { data } = useData();

  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [activityFilter, setActivityFilter] = useState('All');

  // Unique activity types
  const activityTypes = useMemo(() => {
    const set = new Set(data.auditLogs.map(l => l.aktivitas));
    return Array.from(set).sort();
  }, [data.auditLogs]);

  // Filtered audit logs
  const filteredLogs = useMemo(() => {
    return data.auditLogs.filter(log => {
      if (roleFilter !== 'All' && log.role !== roleFilter) return false;
      if (activityFilter !== 'All' && log.aktivitas !== activityFilter) return false;
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (
        log.aktivitas.toLowerCase().includes(term) ||
        log.detail.toLowerCase().includes(term) ||
        log.pengguna.toLowerCase().includes(term) ||
        log.username.toLowerCase().includes(term) ||
        log.tanggal.includes(term)
      );
    });
  }, [data.auditLogs, roleFilter, activityFilter, searchTerm]);

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['No', 'Tanggal', 'Waktu', 'Pengguna', 'Username', 'Role', 'Aktivitas', 'Detail'];
    const rows = filteredLogs.map((l, idx) => [
      idx + 1,
      l.tanggal,
      l.waktu,
      l.pengguna,
      l.username,
      l.role,
      l.aktivitas,
      l.detail,
    ]);
    downloadCSV(`audit-log-rt09-${new Date().toISOString().split('T')[0]}`, headers, rows);
  };

  return (
    <div id="view-audit-log" className="space-y-6 animate-in fade-in duration-300">
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-slate-900/70 border border-slate-800 shadow-md">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">AUDIT LOG SISTEM</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Pencatatan riwayat aktivitas penting: autentikasi, transaksi, dan perubahan data secara transparan
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleExportCSV}
          disabled={filteredLogs.length === 0}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 shadow-md transition-colors disabled:opacity-50"
        >
          <Download className="w-4 h-4 text-emerald-400" />
          Export CSV Audit Log
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari aktivitas, pengguna, atau detail..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 text-[11px]">Role:</span>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 focus:outline-none focus:border-purple-500 font-medium"
            >
              <option value="All">Semua Role</option>
              <option value="Admin">Admin</option>
              <option value="Bendahara">Bendahara</option>
              <option value="Ketua RT">Ketua RT</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 text-[11px]">Jenis Aktivitas:</span>
            <select
              value={activityFilter}
              onChange={(e) => setActivityFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 focus:outline-none focus:border-purple-500 font-medium max-w-xs"
            >
              <option value="All">Semua Aktivitas</option>
              {activityTypes.map(act => (
                <option key={act} value={act}>{act}</option>
              ))}
            </select>
          </div>

          <div className="text-[11px] text-slate-400 px-2">
            Total: <strong className="text-white font-mono">{filteredLogs.length}</strong> log
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="rounded-2xl bg-slate-900/60 border border-slate-800 overflow-hidden shadow-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="px-4 py-3.5 w-12 text-center">No</th>
                <th className="px-4 py-3.5 whitespace-nowrap">Tanggal & Waktu</th>
                <th className="px-4 py-3.5">Pengguna</th>
                <th className="px-4 py-3.5">Role</th>
                <th className="px-4 py-3.5">Aktivitas</th>
                <th className="px-4 py-3.5 min-w-[280px]">Detail Aktivitas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-500">
                    <Activity className="w-8 h-8 mx-auto mb-2 text-slate-600 opacity-50" />
                    Belum ada riwayat aktivitas yang tercatat.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log, idx) => (
                  <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3 text-center text-slate-400 font-mono">
                      {idx + 1}
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap text-slate-300 font-mono text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                        <span>{formatTanggalIndonesia(log.tanggal, 'short')}</span>
                        <span className="text-purple-400 font-semibold">{log.waktu}</span>
                      </div>
                    </td>

                    <td className="px-4 py-3 font-medium text-white">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>{log.pengguna}</span>
                        <span className="text-[10px] font-mono text-cyan-400/80">(@{log.username})</span>
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                        log.role === 'Admin'
                          ? 'bg-purple-500/10 text-purple-400 border border-purple-500/30'
                          : log.role === 'Bendahara'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                      }`}>
                        <Shield className="w-2.5 h-2.5" />
                        {log.role}
                      </span>
                    </td>

                    <td className="px-4 py-3 font-semibold text-white">
                      <span className={`px-2 py-0.5 rounded-md text-[11px] ${
                        log.aktivitas.includes('Hapus') || log.aktivitas.includes('Bersihkan')
                          ? 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
                          : log.aktivitas.includes('Tambah') || log.aktivitas.includes('Mencatat')
                          ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                          : log.aktivitas.includes('Login') || log.aktivitas.includes('Logout')
                          ? 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/20'
                          : 'bg-slate-800 text-slate-300 border border-slate-700'
                      }`}>
                        {log.aktivitas}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-slate-300 text-xs">
                      {log.detail}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
