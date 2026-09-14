import { Warga } from '../types';

export interface WargaInfo {
  nomorRumah: string;
  namaWarga: string;
  id?: string;
}

/**
 * Standard getWargaInfo helper as mandated by requirements:
 * Resolves nomorRumah and namaWarga from Data Warga using wargaId as foreign key reference.
 * If wargaId not found or missing, safely falls back to name matching or provided defaults.
 * NEVER returns undefined, null, or empty string — returns "-" if missing.
 */
export function getWargaInfo(
  wargaList: Warga[] | undefined | null,
  wargaId?: string | null,
  fallbackName?: string | null,
  fallbackRumah?: string | null
): WargaInfo {
  const safeList = Array.isArray(wargaList) ? wargaList : [];

  // 1. Primary lookup by wargaId
  if (wargaId && typeof wargaId === 'string' && wargaId.trim()) {
    const cleanId = wargaId.trim();
    const foundById = safeList.find(w => w.id === cleanId);
    if (foundById) {
      const nomorRumah = (foundById.nomorRumah || '').trim();
      const namaWarga = (foundById.namaWarga || foundById.nama || '').trim();
      return {
        id: foundById.id,
        nomorRumah: nomorRumah || '-',
        namaWarga: namaWarga || '-',
      };
    }
  }

  // 2. Secondary fallback by name (e.g. legacy records where only name is present)
  if (fallbackName && typeof fallbackName === 'string' && fallbackName.trim()) {
    const cleanName = fallbackName.trim().toLowerCase();
    const foundByName = safeList.find(w => {
      const wNama = (w.namaWarga || w.nama || '').trim().toLowerCase();
      return wNama === cleanName;
    });

    if (foundByName) {
      const nomorRumah = (foundByName.nomorRumah || '').trim();
      const namaWarga = (foundByName.namaWarga || foundByName.nama || '').trim();
      return {
        id: foundByName.id,
        nomorRumah: nomorRumah || (fallbackRumah ? fallbackRumah.trim() : '-'),
        namaWarga: namaWarga || fallbackName.trim(),
      };
    }
  }

  // 3. Tertiary fallback by house number if available
  if (fallbackRumah && typeof fallbackRumah === 'string' && fallbackRumah.trim()) {
    const cleanRumah = fallbackRumah.trim().toLowerCase();
    const foundByRumah = safeList.find(w => (w.nomorRumah || '').trim().toLowerCase() === cleanRumah);
    if (foundByRumah) {
      const nomorRumah = (foundByRumah.nomorRumah || '').trim();
      const namaWarga = (foundByRumah.namaWarga || foundByRumah.nama || '').trim();
      return {
        id: foundByRumah.id,
        nomorRumah: nomorRumah || fallbackRumah.trim(),
        namaWarga: namaWarga || (fallbackName ? fallbackName.trim() : '-'),
      };
    }
  }

  // 4. Safe defaults: NEVER return undefined or null or blank
  const finalRumah = fallbackRumah && typeof fallbackRumah === 'string' && fallbackRumah.trim() ? fallbackRumah.trim() : '-';
  const finalNama = fallbackName && typeof fallbackName === 'string' && fallbackName.trim() ? fallbackName.trim() : '-';

  return {
    nomorRumah: finalRumah,
    namaWarga: finalNama,
  };
}

/**
 * Creates an optimized lookup map for quick, repeated resolution of wargaInfo
 */
export function createWargaLookup(wargaList: Warga[] | undefined | null) {
  const safeList = Array.isArray(wargaList) ? wargaList : [];
  const idMap = new Map<string, WargaInfo>();
  const nameMap = new Map<string, WargaInfo>();
  const rumahMap = new Map<string, WargaInfo>();

  for (const w of safeList) {
    const nomorRumah = (w.nomorRumah || '').trim() || '-';
    const namaWarga = (w.namaWarga || w.nama || '').trim() || '-';
    const info: WargaInfo = { id: w.id, nomorRumah, namaWarga };

    if (w.id) idMap.set(w.id, info);
    if (w.nama) nameMap.set(w.nama.trim().toLowerCase(), info);
    if (w.namaWarga) nameMap.set(w.namaWarga.trim().toLowerCase(), info);
    if (w.nomorRumah) rumahMap.set(w.nomorRumah.trim().toLowerCase(), info);
  }

  return (wargaId?: string | null, fallbackName?: string | null, fallbackRumah?: string | null): WargaInfo => {
    if (wargaId && idMap.has(wargaId)) {
      return idMap.get(wargaId)!;
    }
    if (fallbackName && nameMap.has(fallbackName.trim().toLowerCase())) {
      return nameMap.get(fallbackName.trim().toLowerCase())!;
    }
    if (fallbackRumah && rumahMap.has(fallbackRumah.trim().toLowerCase())) {
      return rumahMap.get(fallbackRumah.trim().toLowerCase())!;
    }
    return {
      nomorRumah: fallbackRumah && fallbackRumah.trim() ? fallbackRumah.trim() : '-',
      namaWarga: fallbackName && fallbackName.trim() ? fallbackName.trim() : '-',
    };
  };
}
