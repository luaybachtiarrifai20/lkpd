import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export type Profile = {
  id: string;
  nama: string;
  role: 'siswa' | 'guru';
  email: string | null;
  username: string | null;
  nisn: string | null;
  kelas_id: string | null;
  dibuat_pada: string;
};

export type Kelas = {
  id: string;
  nama_kelas: string;
  guru_id: string;
  kode_undangan: string | null;
  dibuat_pada: string;
};

export type Kegiatan = {
  id: string;
  nomor: number;
  judul: string;
  deskripsi: string | null;
  warna_tema: string | null;
  sdg_badges: { nomor: number; warna: string; label: string }[];
  tujuan: string | null;
  materi: string | null;
};

export type JawabanStatus = 'draft' | 'terkumpul' | 'dinilai';

export type Jawaban = {
  id: string;
  kegiatan_id: string;
  siswa_id: string;
  isi_jawaban: Record<string, AnswerValue>;
  status: JawabanStatus;
  skor: number | null;
  feedback_guru: string | null;
  waktu_disimpan: string | null;
  waktu_dikumpulkan: string | null;
};

export type AnswerValue =
  | string
  | string[]
  | { rows: string[][] }
  | { files: UploadedFile[] }
  | { tap: Record<string, string> }
  | null;

export type UploadedFile = {
  name: string;
  url: string;
  type: string;
  size: number;
};

export type AssessmentEksternal = {
  id: string;
  kegiatan_id: string;
  judul_kuis: string | null;
  url_kuis: string | null;
  dibuat_oleh_guru_id: string | null;
  diperbarui_pada: string | null;
};

export type StatusKuisSiswa = {
  id: string;
  siswa_id: string;
  kegiatan_id: string;
  sudah_mengerjakan: boolean;
  skor_manual: number | null;
  catatan_guru: string | null;
  waktu_ditandai: string | null;
};
