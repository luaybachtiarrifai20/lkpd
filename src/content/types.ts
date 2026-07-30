// Tipe bersama untuk skema konten E-LKPD.
// Konten naskah lengkap mengikuti struktur PBL 1-5 + e-assessment.

export type SDGBadge = { nomor: number; warna: string; label: string };

export type PBLStep = {
  id: string;
  sintaks: number;
  label: string;
  ringkas: string;
  blocks: ContentBlock[];
};

export type ContentBlock =
  | { kind: 'stimulus'; title: string; body: string; mediaUrl?: string; mediaType?: 'image' | 'youtube' }
  | { kind: 'masalah'; title: string; body: string; mediaUrl?: string; mediaType?: 'image' | 'youtube' }
  | { kind: 'media'; title?: string; mediaUrl: string; mediaType: 'image' | 'youtube'; caption?: string }
  | { kind: 'pertanyaan'; id: string; text: string; hint?: string }
  | { kind: 'tabel-org'; id: string; headers: string[]; rowCount: number; title: string; perencanaanId?: string; perencanaanText?: string }
  | { kind: 'data-eksperimen'; title: string; headers: string[]; rows: { cells: string[] }[]; note?: string }
  | { kind: 'input-hitung'; id: string; label: string; unit?: string; allowImage?: boolean }
  | { kind: 'analitis'; id: string; text: string; allowImage?: boolean }
  | { kind: 'diagram-submikro'; title: string; kiri: { label: string; deskripsi: string }; kanan: { label: string; deskripsi: string } }
  | { kind: 'instruksi-pengembangan'; title: string; body: string; bullets?: string[] }
  | { kind: 'upload-hasil'; id: string; title: string; body: string }
  | { kind: 'alternatif-kasus'; id: string; title: string; options: { id: string; label: string; deskripsi: string }[]; alasanId: string }
  | { kind: 'argumentasi-tap'; id: string; title: string; kasus: string }
  | { kind: 'bagian-header'; label: string }
  | { kind: 'analisis-efisiensi'; id: string; title: string; headers: string[]; rows: { cells: string[] }[]; pertanyaanId: string; pertanyaanText: string }
  | { kind: 'tabel-integrasi'; id: string; title: string; headers: string[]; leftCol: string[]; rowCount: number }
  | { kind: 'analisis-prediksi'; id: string; title: string; kondisi: string[]; pertanyaanText: string }
  | { kind: 'penalaran-level'; makroskopik: string; submikroskopik: string; simbolik: string; levels?: { title: string; desc: string; color?: string }[] };

export type KegiatanContent = {
  nomor: number;
  judul: string;
  subjudul: string;
  warna: string;
  warnaLight: string;
  sdg: SDGBadge[];
  cakupanMateri: string[];
  tujuan: string[];
  materi: string;
  steps: PBLStep[];
};

export const TAP_COMPONENTS = [
  { key: 'claim', label: 'Claim', indo: 'Klaim', color: '#1565C0', light: '#E3F2FD', desc: 'Pernyataan posisimu' },
  { key: 'data', label: 'Data', indo: 'Data', color: '#00695C', light: '#E0F2F1', desc: 'Bukti pendukung' },
  { key: 'warrant', label: 'Warrant', indo: 'Jaminan', color: '#F9A825', light: '#FFF8E1', desc: 'Kaitan data-klaim' },
  { key: 'backing', label: 'Backing', indo: 'Pendukung', color: '#6A1B9A', light: '#F3E5F5', desc: 'Dasar teori' },
  { key: 'qualifier', label: 'Qualifier', indo: 'Kualifikasi', color: '#37474F', light: '#ECEFF1', desc: 'Batasan klaim' },
  { key: 'rebuttal', label: 'Rebuttal', indo: 'Bantahan', color: '#E53935', light: '#FFEBEE', desc: 'Penyanggahan' },
] as const;
