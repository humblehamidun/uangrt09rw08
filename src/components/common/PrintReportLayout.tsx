import React from 'react';
import { formatTanggalIndonesia } from '../../utils/format';

interface PrintReportHeaderProps {
  title: string;
  periode?: string;
  subtitle?: string;
}

export const PrintReportHeader: React.FC<PrintReportHeaderProps> = ({
  title,
  periode,
  subtitle,
}) => {
  return (
    <div className="hidden print:block mb-6 text-center border-b-2 border-black pb-4 text-black">
      <div className="text-xs font-bold uppercase tracking-widest text-gray-700">
        KEUANGAN RT 09 RW 08
      </div>
      <div className="text-sm font-extrabold uppercase tracking-wide text-black">
        KELURAHAN BANGETAYU WETAN
      </div>
      <h1 className="text-lg font-black uppercase tracking-tight mt-1 text-black">
        LAPORAN {title.toUpperCase()}
      </h1>
      {periode && (
        <div className="text-xs font-semibold text-gray-800 mt-1">
          Periode: {periode}
        </div>
      )}
      {subtitle && (
        <div className="text-[11px] italic text-gray-600 mt-0.5">
          {subtitle}
        </div>
      )}
    </div>
  );
};

interface PrintReportFooterProps {
  ketuaRT?: string;
  bendahara?: string;
  lokasi?: string;
}

export const PrintReportFooter: React.FC<PrintReportFooterProps> = ({
  ketuaRT = 'H. Sugiyanto, S.E.',
  bendahara = 'Bambang Pamungkas, S.Kom.',
  lokasi = 'Semarang',
}) => {
  const now = new Date();
  const dateStr = formatTanggalIndonesia(now.toISOString().slice(0, 10), 'full');
  const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';

  return (
    <div className="hidden print:block mt-8 pt-4 text-black text-xs break-inside-avoid">
      {/* Timestamp */}
      <div className="text-[10px] text-gray-600 mb-6 italic">
        Dicetak pada: {dateStr}, {timeStr}
      </div>

      {/* Tanda Tangan */}
      <div className="flex justify-between items-start px-8">
        <div className="text-center w-56">
          <div className="font-semibold text-black">Mengetahui,</div>
          <div className="font-bold text-black mt-0.5">Ketua RT 09</div>
          <div className="h-16"></div>
          <div className="font-bold underline text-black">{ketuaRT}</div>
        </div>

        <div className="text-center w-56">
          <div className="text-gray-700">{lokasi}, {dateStr}</div>
          <div className="font-bold text-black mt-0.5">Bendahara RT 09</div>
          <div className="h-16"></div>
          <div className="font-bold underline text-black">{bendahara}</div>
        </div>
      </div>
    </div>
  );
};

interface PrintPageStyleProps {
  landscape?: boolean;
}

export const PrintPageStyle: React.FC<PrintPageStyleProps> = ({ landscape = false }) => {
  return (
    <style dangerouslySetInnerHTML={{
      __html: `
        @media print {
          @page {
            size: ${landscape ? 'A4 landscape' : 'A4 portrait'};
            margin: 8mm 8mm 12mm 8mm;
          }
          .col-nomor-rumah,
          .col-nama-warga,
          .nomor-rumah,
          .nama-warga,
          th.col-nomor-rumah,
          td.col-nomor-rumah,
          th.col-nama-warga,
          td.col-nama-warga {
            display: table-cell !important;
            visibility: visible !important;
          }
        }
      `
    }} />
  );
};
