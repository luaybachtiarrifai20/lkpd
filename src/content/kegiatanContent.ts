// Skema konten E-LKPD LajuNalar — 4 Kegiatan Belajar berbasis PBL-ESD.
// Konten dipecah per kegiatan agar mudah dirawat.
// Edit konten tiap kegiatan pada file di ./kegiatan/kegiatanN.ts.

import type { KegiatanContent, PBLStep, ContentBlock, SDGBadge } from './types';
import { kegiatan1 } from './kegiatan/kegiatan1';
import { kegiatan2 } from './kegiatan/kegiatan2';
import { kegiatan3 } from './kegiatan/kegiatan3';
import { kegiatan4 } from './kegiatan/kegiatan4';

export type { KegiatanContent, PBLStep, ContentBlock, SDGBadge } from './types';

export const KEGIATAN_CONTENT: KegiatanContent[] = [kegiatan1, kegiatan2, kegiatan3, kegiatan4];

// Identitas proyek
export const PROJECT_IDENTITY = {
  judulPenelitian:
    'Pengembangan E-LKPD Berbasis PBL-ESD dengan Integrasi Platform E-Assessment untuk Meningkatkan Penalaran Kimia dan Argumentasi Siswa pada Materi Laju Reaksi',
  namaProduk: 'LajuNalar',
  tagline: 'E-LKPD Interaktif Laju Reaksi Berbasis PBL-ESD',
  pengembang: 'Bela Anisa Putri',
  programStudi: 'Magister Pendidikan Kimia, Universitas Sebelas Maret (UNS)',
  sumberDana: 'Hibah Penelitian Tesis Magister UNS 2026',
  tahun: '2026',
} as const;

export const TAP_COMPONENTS: ReadonlyArray<{
  key: string; label: string; indo: string; color: string; light: string; desc: string;
}> = [
  { key: 'claim', label: 'Claim', indo: 'Klaim', color: '#1565C0', light: '#E3F2FD', desc: 'Pernyataan posisimu' },
  { key: 'data', label: 'Data', indo: 'Data', color: '#00695C', light: '#E0F2F1', desc: 'Bukti pendukung' },
  { key: 'warrant', label: 'Warrant', indo: 'Jaminan', color: '#F9A825', light: '#FFF8E1', desc: 'Kaitan data-klaim' },
  { key: 'backing', label: 'Backing', indo: 'Pendukung', color: '#6A1B9A', light: '#F3E5F5', desc: 'Dasar teori' },
  { key: 'qualifier', label: 'Qualifier', indo: 'Kualifikasi', color: '#37474F', light: '#ECEFF1', desc: 'Batasan klaim' },
  { key: 'rebuttal', label: 'Rebuttal', indo: 'Bantahan', color: '#E53935', light: '#FFEBEE', desc: 'Penyanggahan' },
];

// Re-export supaya file lama yang mengimpor tipe dari sini tetap kompatibel
export type _PBLStep = PBLStep;
export type _ContentBlock = ContentBlock;
export type _SDGBadge = SDGBadge;
