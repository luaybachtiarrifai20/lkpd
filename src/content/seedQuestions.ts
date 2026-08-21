import { collection, addDoc, getDocs } from "firebase/firestore";
import { db, type QuestionType } from "@/lib/firebase";

export type SeedQuestion = {
  kegiatan: number;
  test_type: "pretest" | "posttest";
  question_type: QuestionType;
  question_text: string;
  options?: { id: string; text: string; isCorrect: boolean }[];
  correct_answer?: string;
  points: number;
};

const opt = (id: string, text: string, isCorrect = false) => ({
  id,
  text,
  isCorrect,
});

/**
 * Soal pretest & posttest untuk setiap kegiatan (kegiatan 1–4).
 * Jawaban benar (untuk pilihan ganda) ditandai lewat `isCorrect` dan `correct_answer`.
 */
export const SEED_QUESTIONS: SeedQuestion[] = [
  // ===== Kegiatan 1 — Pengaruh Suhu terhadap Laju Reaksi =====
  // Pretest
  {
    kegiatan: 1,
    test_type: "pretest",
    question_type: "pilihan_ganda",
    question_text:
      "Faktor utama yang menyebabkan makanan lebih cepat basi pada suhu ruang adalah…",
    options: [
      opt("a", "Warna kemasan makanan"),
      opt("b", "Suhu penyimpanan", true),
      opt("c", "Bentuk wadah"),
      opt("d", "Merek makanan"),
    ],
    correct_answer: "b",
    points: 10,
  },
  {
    kegiatan: 1,
    test_type: "pretest",
    question_type: "pilihan_ganda",
    question_text:
      "Menurut teori tumbukan, kenaikan suhu menyebabkan partikel memiliki…",
    options: [
      opt("a", "Energi kinetik lebih besar", true),
      opt("b", "Massa lebih besar"),
      opt("c", "Muatan lebih besar"),
      opt("d", "Volume lebih besar"),
    ],
    correct_answer: "a",
    points: 10,
  },
  {
    kegiatan: 1,
    test_type: "pretest",
    question_type: "pilihan_ganda",
    question_text: "Laju reaksi didefinisikan sebagai…",
    options: [
      opt("a", "Massa zat per satuan volume"),
      opt("b", "Perubahan konsentrasi reaktan/produk per satuan waktu", true),
      opt("c", "Jumlah partikel per satuan luas"),
      opt("d", "Energi per satuan massa"),
    ],
    correct_answer: "b",
    points: 10,
  },
  {
    kegiatan: 1,
    test_type: "pretest",
    question_type: "essay",
    question_text:
      "Jelaskan mengapa peningkatan suhu dapat mempercepat laju pembusukan makanan berdasarkan teori tumbukan.",
    points: 20,
  },
  {
    kegiatan: 1,
    test_type: "pretest",
    question_type: "essay",
    question_text:
      "Tuliskan satuan yang umum digunakan untuk menyatakan laju reaksi.",
    points: 10,
  },
  // Posttest
  {
    kegiatan: 1,
    test_type: "posttest",
    question_type: "pilihan_ganda",
    question_text:
      "Energi minimum yang harus dimiliki partikel agar tumbukan menghasilkan reaksi disebut…",
    options: [
      opt("a", "Energi potensial"),
      opt("b", "Energi kinetik"),
      opt("c", "Energi aktivasi", true),
      opt("d", "Energi ikatan"),
    ],
    correct_answer: "c",
    points: 10,
  },
  {
    kegiatan: 1,
    test_type: "posttest",
    question_type: "pilihan_ganda",
    question_text: "Tumbukan efektif adalah tumbukan yang…",
    options: [
      opt("a", "Terjadi antar partikel apa pun"),
      opt("b", "Memiliki energi ≥ energi aktivasi dan orientasi tepat", true),
      opt("c", "Terjadi pada suhu rendah"),
      opt("d", "Tidak menghasilkan produk"),
    ],
    correct_answer: "b",
    points: 10,
  },
  {
    kegiatan: 1,
    test_type: "posttest",
    question_type: "pilihan_ganda",
    question_text:
      "Jika 10 gram makanan membusuk dalam 2 hari, laju pembusukannya adalah…",
    options: [
      opt("a", "2 gram/hari"),
      opt("b", "5 gram/hari", true),
      opt("c", "10 gram/hari"),
      opt("d", "20 gram/hari"),
    ],
    correct_answer: "b",
    points: 10,
  },
  {
    kegiatan: 1,
    test_type: "posttest",
    question_type: "essay",
    question_text:
      "Hitung laju pembusukan makanan pada suhu 5 °C jika 10 gram makanan membusuk dalam 5 hari.",
    points: 20,
  },
  {
    kegiatan: 1,
    test_type: "posttest",
    question_type: "essay",
    question_text:
      "Berikan dua rekomendasi penyimpanan makanan untuk mengurangi food waste beserta alasannya.",
    points: 20,
  },

  // ===== Kegiatan 2 — Pengaruh Konsentrasi terhadap Laju Reaksi =====
  // Pretest
  {
    kegiatan: 2,
    test_type: "pretest",
    question_type: "pilihan_ganda",
    question_text: "Peningkatan konsentrasi pereaksi akan…",
    options: [
      opt("a", "Menurunkan jumlah partikel"),
      opt("b", "Meningkatkan frekuensi tumbukan efektif", true),
      opt("c", "Menurunkan energi aktivasi"),
      opt("d", "Memperbesar volume larutan"),
    ],
    correct_answer: "b",
    points: 10,
  },
  {
    kegiatan: 2,
    test_type: "pretest",
    question_type: "pilihan_ganda",
    question_text: "Orde reaksi menunjukkan…",
    options: [
      opt("a", "Jumlah total partikel"),
      opt("b", "Pangkat konsentrasi dalam persamaan laju", true),
      opt("c", "Massa molar pereaksi"),
      opt("d", "Waktu reaksi berlangsung"),
    ],
    correct_answer: "b",
    points: 10,
  },
  {
    kegiatan: 2,
    test_type: "pretest",
    question_type: "pilihan_ganda",
    question_text: "Persamaan laju v = k[A][B] memiliki orde total…",
    options: [opt("a", "0"), opt("b", "1"), opt("c", "2", true), opt("d", "3")],
    correct_answer: "c",
    points: 10,
  },
  {
    kegiatan: 2,
    test_type: "pretest",
    question_type: "essay",
    question_text: "Jelaskan pengertian konsentrasi larutan.",
    points: 10,
  },
  {
    kegiatan: 2,
    test_type: "pretest",
    question_type: "essay",
    question_text:
      "Mengapa konsentrasi koagulan yang lebih tinggi dapat mempercepat proses penjernihan limbah?",
    points: 20,
  },
  // Posttest
  {
    kegiatan: 2,
    test_type: "posttest",
    question_type: "pilihan_ganda",
    question_text: "Tetapan laju reaksi (k) dipengaruhi oleh…",
    options: [
      opt("a", "Konsentrasi pereaksi"),
      opt("b", "Suhu dan katalis", true),
      opt("c", "Volume wadah"),
      opt("d", "Warna larutan"),
    ],
    correct_answer: "b",
    points: 10,
  },
  {
    kegiatan: 2,
    test_type: "posttest",
    question_type: "pilihan_ganda",
    question_text: "Satuan tetapan laju untuk reaksi orde dua adalah…",
    options: [
      opt("a", "s⁻¹"),
      opt("b", "L·mol⁻¹·s⁻¹", true),
      opt("c", "mol·L⁻¹"),
      opt("d", "L·s⁻¹"),
    ],
    correct_answer: "b",
    points: 10,
  },
  {
    kegiatan: 2,
    test_type: "posttest",
    question_type: "essay",
    question_text:
      "Diketahui v = k[koagulan][limbah]. Jika [koagulan] dilipatgandakan dua kali sedangkan [limbah] tetap, bagaimana perubahan laju reaksinya? Jelaskan.",
    points: 20,
  },
  {
    kegiatan: 2,
    test_type: "posttest",
    question_type: "pilihan_ganda",
    question_text: "Menurut teori tumbukan, konsentrasi tinggi berarti…",
    options: [
      opt("a", "Partikel lebih sedikit per satuan volume"),
      opt(
        "b",
        "Lebih banyak partikel per satuan volume sehingga frekuensi tumbukan meningkat",
        true,
      ),
      opt("c", "Energi aktivasi menjadi nol"),
      opt("d", "Reaksi berhenti"),
    ],
    correct_answer: "b",
    points: 10,
  },
  {
    kegiatan: 2,
    test_type: "posttest",
    question_type: "essay",
    question_text:
      "Mengapa penggunaan bahan kimia sebanyak-banyaknya tidak selalu merupakan solusi terbaik dalam pengolahan limbah?",
    points: 20,
  },

  // ===== Kegiatan 3 — Pengaruh Luas Permukaan terhadap Laju Reaksi =====
  // Pretest
  {
    kegiatan: 3,
    test_type: "pretest",
    question_type: "pilihan_ganda",
    question_text:
      "Bambu yang dipotong kecil-kecil lebih cepat terkarbonisasi karena…",
    options: [
      opt("a", "Suhunya meningkat"),
      opt("b", "Luas permukaannya lebih besar", true),
      opt("c", "Warnanya berubah"),
      opt("d", "Massa jenisnya menurun"),
    ],
    correct_answer: "b",
    points: 10,
  },
  {
    kegiatan: 3,
    test_type: "pretest",
    question_type: "pilihan_ganda",
    question_text: "Luas permukaan yang lebih besar menyebabkan…",
    options: [
      opt("a", "Frekuensi tumbukan efektif meningkat", true),
      opt("b", "Energi aktivasi meningkat"),
      opt("c", "Konsentrasi menurun"),
      opt("d", "Reaksi berhenti"),
    ],
    correct_answer: "a",
    points: 10,
  },
  {
    kegiatan: 3,
    test_type: "pretest",
    question_type: "pilihan_ganda",
    question_text:
      "Bentuk zat yang bereaksi paling cepat dengan larutan asam adalah…",
    options: [
      opt("a", "Bongkahan besar"),
      opt("b", "Serbuk", true),
      opt("c", "Lempengan"),
      opt("d", "Batang"),
    ],
    correct_answer: "b",
    points: 10,
  },
  {
    kegiatan: 3,
    test_type: "pretest",
    question_type: "essay",
    question_text:
      "Jelaskan mengapa luas permukaan memengaruhi laju reaksi berdasarkan teori tumbukan.",
    points: 20,
  },
  {
    kegiatan: 3,
    test_type: "pretest",
    question_type: "essay",
    question_text: "Sebutkan empat faktor yang memengaruhi laju reaksi.",
    points: 10,
  },
  // Posttest
  {
    kegiatan: 3,
    test_type: "posttest",
    question_type: "pilihan_ganda",
    question_text: "Hubungan antara luas permukaan dan laju reaksi adalah…",
    options: [
      opt("a", "Berbanding lurus", true),
      opt("b", "Berbanding terbalik"),
      opt("c", "Tidak berhubungan"),
      opt("d", "Selalu konstan"),
    ],
    correct_answer: "a",
    points: 10,
  },
  {
    kegiatan: 3,
    test_type: "posttest",
    question_type: "pilihan_ganda",
    question_text:
      "Untuk mempercepat proses fermentasi briket bambu, ukuran bahan sebaiknya…",
    options: [
      opt("a", "Diperbesar"),
      opt("b", "Diperkecil", true),
      opt("c", "Dibiarkan utuh"),
      opt("d", "Dilelehkan"),
    ],
    correct_answer: "b",
    points: 10,
  },
  {
    kegiatan: 3,
    test_type: "posttest",
    question_type: "essay",
    question_text:
      "Bandingkan laju reaksi antara briket berbentuk bongkahan dengan briket berbentuk serbuk, beserta alasannya.",
    points: 20,
  },
  {
    kegiatan: 3,
    test_type: "posttest",
    question_type: "pilihan_ganda",
    question_text: "Semakin kecil ukuran partikel, luas permukaan totalnya…",
    options: [
      opt("a", "Semakin besar", true),
      opt("b", "Semakin kecil"),
      opt("c", "Tetap"),
      opt("d", "Menjadi nol"),
    ],
    correct_answer: "a",
    points: 10,
  },
  {
    kegiatan: 3,
    test_type: "posttest",
    question_type: "essay",
    question_text:
      "Analisislah bagaimana pengaturan ukuran bahan baku dapat meningkatkan efisiensi produksi briket bambu.",
    points: 20,
  },

  // ===== Kegiatan 4 — Pengaruh Katalis terhadap Laju Reaksi =====
  // Pretest
  {
    kegiatan: 4,
    test_type: "pretest",
    question_type: "pilihan_ganda",
    question_text: "Katalis mempercepat laju reaksi dengan cara…",
    options: [
      opt("a", "Menurunkan energi aktivasi", true),
      opt("b", "Menaikkan energi aktivasi"),
      opt("c", "Menambah massa produk"),
      opt("d", "Mengurangi konsentrasi pereaksi"),
    ],
    correct_answer: "a",
    points: 10,
  },
  {
    kegiatan: 4,
    test_type: "pretest",
    question_type: "pilihan_ganda",
    question_text: "Setelah reaksi selesai, katalis akan…",
    options: [
      opt("a", "Habis bereaksi"),
      opt("b", "Tidak habis dan dapat digunakan kembali", true),
      opt("c", "Berubah menjadi produk"),
      opt("d", "Menguap seluruhnya"),
    ],
    correct_answer: "b",
    points: 10,
  },
  {
    kegiatan: 4,
    test_type: "pretest",
    question_type: "pilihan_ganda",
    question_text:
      "Contoh katalis yang digunakan pada reaksi transesterifikasi biodiesel adalah…",
    options: [
      opt("a", "Air"),
      opt("b", "NaOH", true),
      opt("c", "Pasir"),
      opt("d", "Minyak"),
    ],
    correct_answer: "b",
    points: 10,
  },
  {
    kegiatan: 4,
    test_type: "pretest",
    question_type: "essay",
    question_text:
      "Jelaskan peran katalis dalam reaksi transesterifikasi minyak jelantah menjadi biodiesel.",
    points: 20,
  },
  {
    kegiatan: 4,
    test_type: "pretest",
    question_type: "essay",
    question_text:
      "Mengapa penggunaan katalis secara berlebihan dapat merugikan?",
    points: 20,
  },
  // Posttest
  {
    kegiatan: 4,
    test_type: "posttest",
    question_type: "pilihan_ganda",
    question_text: "Energi aktivasi adalah…",
    options: [
      opt("a", "Energi minimum agar reaksi berlangsung", true),
      opt("b", "Energi maksimum produk"),
      opt("c", "Energi total sistem"),
      opt("d", "Energi yang hilang ke lingkungan"),
    ],
    correct_answer: "a",
    points: 10,
  },
  {
    kegiatan: 4,
    test_type: "posttest",
    question_type: "pilihan_ganda",
    question_text: "Katalis memengaruhi laju reaksi dengan mengubah…",
    options: [
      opt("a", "ΔH reaksi"),
      opt("b", "Energi aktivasi", true),
      opt("c", "Massa produk"),
      opt("d", "Konsentrasi awal"),
    ],
    correct_answer: "b",
    points: 10,
  },
  {
    kegiatan: 4,
    test_type: "posttest",
    question_type: "essay",
    question_text:
      "Jelaskan mekanisme katalis menurunkan energi aktivasi sehingga reaksi berlangsung lebih cepat.",
    points: 20,
  },
  {
    kegiatan: 4,
    test_type: "posttest",
    question_type: "pilihan_ganda",
    question_text: "Reaksi yang menggunakan katalis memiliki energi aktivasi…",
    options: [
      opt("a", "Lebih rendah", true),
      opt("b", "Lebih tinggi"),
      opt("c", "Sama dengan tanpa katalis"),
      opt("d", "Nol"),
    ],
    correct_answer: "a",
    points: 10,
  },
  {
    kegiatan: 4,
    test_type: "posttest",
    question_type: "essay",
    question_text:
      "Bagaimana menentukan jumlah katalis yang paling efisien agar biaya terkendali dan dampak lingkungan minimal?",
    points: 20,
  },
];

/**
 * Menulis semua soal pretest & posttest ke koleksi `questions` di Firestore.
 * Aman dijalankan berulang: soal dengan (kegiatan, tipe, teks) yang sama akan dilewati.
 */
export async function seedQuestions(): Promise<number> {
  const now = new Date().toISOString();

  // Resolve actual kegiatan doc id by `nomor` so questions always reference the
  // real Firestore document id (works even if ids are random/auto-generated).
  const kegSnapshot = await getDocs(collection(db, "kegiatan"));
  const nomorToDocId: Record<number, string> = {};
  kegSnapshot.docs.forEach((d) => {
    const nomor = Number(d.data().nomor);
    if (!Number.isNaN(nomor)) nomorToDocId[nomor] = d.id;
  });

  // Ambil soal yang sudah ada untuk mencegah duplikasi
  const existingSnapshot = await getDocs(collection(db, "questions"));
  const existingKeys = new Set<string>();
  existingSnapshot.docs.forEach((d) => {
    const data = d.data();
    existingKeys.add(
      `${data.kegiatan_id}|${data.test_type}|${data.question_text}`,
    );
  });

  const orderCounter: Record<string, number> = {};
  let inserted = 0;

  for (const q of SEED_QUESTIONS) {
    const kegiatanId = nomorToDocId[q.kegiatan] || `kegiatan-${q.kegiatan}`;
    const key = `${kegiatanId}|${q.test_type}|${q.question_text}`;
    if (existingKeys.has(key)) continue;

    const groupKey = `${kegiatanId}:${q.test_type}`;
    orderCounter[groupKey] = (orderCounter[groupKey] || 0) + 1;

    await addDoc(collection(db, "questions"), {
      kegiatan_id: kegiatanId,
      test_type: q.test_type,
      question_type: q.question_type,
      question_text: q.question_text,
      options: q.options || null,
      correct_answer: q.correct_answer || null,
      points: q.points,
      order: orderCounter[groupKey],
      created_at: now,
      updated_at: now,
    });
    inserted++;
  }

  return inserted;
}
