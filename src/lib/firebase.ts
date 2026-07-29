import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export type Profile = {
  id: string;
  nama: string;
  role: "siswa" | "guru" | "super_admin";
  email: string | null;
  username: string | null;
  nisn: string | null;
  kelas_id: string | null;
  status: "pending" | "active" | "rejected";
  dibuat_pada: string;
};

// lib/firebase.ts - Tambahkan tipe berikut

export type QuestionType = "pilihan_ganda" | "essay";

export type QuestionOption = {
  id: string;
  text: string;
  isCorrect: boolean;
};

// lib/firebase.ts
export type Question = {
  id: string;
  kegiatan_id: string; // Wajib ada
  test_type: "pretest" | "posttest";
  question_type: QuestionType;
  question_text: string;
  options?: QuestionOption[];
  correct_answer?: string;
  points: number;
  order: number;
  created_at: string;
  updated_at: string;
};

export type TestAnswer = {
  id: string;
  siswa_id: string;
  kegiatan_id: string;
  test_type: "pretest" | "posttest";
  answers: Record<string, string | string[]>; // question_id -> answer
  score: number | null;
  submitted_at: string | null;
  started_at: string | null;
  completed: boolean;
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

export type JawabanStatus = "draft" | "terkumpul" | "dinilai";

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
  | { tap: Record<string, string> }
  | null;

export type UploadedFile = {
  name: string;
  url: string;
  type: string;
  size: number;
  textContent?: string;
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

export type LandingPageContent = {
  id: string;
  hero_title: string;
  hero_subtitle: string;
  hero_description: string;
  hero_badge: string;
  hero_cta_primary: string;
  hero_cta_secondary: string;
  features_title: string;
  features_description: string;
  activities_title: string;
  activities_description: string;
  cta_title: string;
  cta_description: string;
  cta_primary: string;
  cta_secondary: string;
  // Hero cards
  hero_cards: {
    submikroskopik: { title: string; description: string };
    simbolik: { title: string; description: string };
    makroskopik: { title: string; description: string };
    argumentasi: { title: string; description: string };
  };
  // Role cards
  role_siswa: { items: string[]; cta_label: string };
  role_guru: { items: string[]; cta_label: string };
  // Feature mini cards
  feature_cards: Array<{ title: string; description: string }>;
  // Activity cards
  activity_cards?: Array<{ title: string; description: string }>;
  diperbarui_pada: string;
};
