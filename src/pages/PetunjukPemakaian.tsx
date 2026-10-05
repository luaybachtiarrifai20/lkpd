import { useEffect, useState } from "react";
import { BookOpen, CheckCircle2, GraduationCap, User } from "lucide-react";
import { doc, getDoc } from "firebase/firestore";
import { db, type PetunjukPemakaianContent } from "@/lib/firebase";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

type NavItem = { to: string; label: string; icon: React.ReactNode };

const DEFAULT: PetunjukPemakaianContent = {
  id: "default",
  judul_siswa: "Petunjuk Pemakaian",
  deskripsi_siswa: "Panduan singkat menggunakan LajuNalar sebagai siswa.",
  langkah_siswa: [
    "Daftar sebagai siswa dengan mengisi Nama Lengkap, Email, Kata Sandi, dan Kode Kelas dari guru.",
    "Login menggunakan email dan kata sandi yang telah didaftarkan.",
    "Pelajari materi tambahan pada menu Materi.",
    "Kerjakan kegiatan pembelajaran sesuai sintaks PBL.",
    "Isi jawaban, tabel, unggah file, dan lengkapi argumentasi sesuai petunjuk.",
    "Simpan draft, lalu Kumpulkan jawaban setelah seluruh tahap selesai.",
    "Akses kuis eksternal pada menu E-Assessment sesuai kelas Anda.",
    "Lihat nilai dan feedback guru melalui menu Riwayat & Nilai.",
  ],
  tips_siswa: [
    "Pastikan kode kelas benar saat daftar agar langsung aktif.",
    "Manfaatkan autosave; tetap klik Simpan Draft sebelum meninggalkan halaman.",
    "Setelah dikumpulkan, jawaban tidak bisa diubah kecuali dibuka lagi oleh guru.",
  ],
  judul_guru: "Petunjuk Pemakaian",
  deskripsi_guru: "Panduan singkat menggunakan LajuNalar sebagai guru.",
  langkah_guru: [
    "Daftar sebagai guru (menunggu persetujuan Super Admin), lalu login.",
    "Buat kelas di menu Kelas & Siswa, bagikan kode undangan kepada siswa.",
    "Pantau progres siswa per kegiatan di menu Rekap Progres.",
    "Buka detail jawaban siswa, beri skor, dan tuliskan feedback.",
    "Lihat materi yang disediakan Super Admin pada menu Materi.",
    "Akses tautan E-Assessment yang berlaku untuk kelas Anda.",
    "Ekspor jawaban individu atau rekap massal melalui menu Ekspor Massal.",
    "Kelola profil dan ubah password di menu Profil.",
  ],
  tips_guru: [
    "Bagikan kode undangan kelas agar siswa dapat bergabung.",
    "Cek Rekap Progres secara berkala untuk memantau penyelesaian siswa.",
    "Gunakan Ekspor Massal untuk mengunduh jawaban dalam bentuk PDF.",
  ],
  diperbarui_pada: new Date().toISOString(),
};

type Props = {
  role: "siswa" | "guru";
  navItems: NavItem[];
};

export function PetunjukPemakaian({ role, navItems }: Props) {
  const [content, setContent] = useState<PetunjukPemakaianContent>(DEFAULT);
  const [loading, setLoading] = useState(true);
  const isSiswa = role === "siswa";

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const snap = await getDoc(doc(db, "petunjuk_pemakaian", "default"));
        if (!cancelled && snap.exists()) {
          setContent({ ...DEFAULT, ...snap.data(), id: snap.id } as PetunjukPemakaianContent);
        }
      } catch (err) {
        console.error("[PetunjukPemakaian]", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const judul = isSiswa ? content.judul_siswa : content.judul_guru;
  const deskripsi = isSiswa ? content.deskripsi_siswa : content.deskripsi_guru;
  const langkah = isSiswa ? content.langkah_siswa : content.langkah_guru;
  const tips = isSiswa ? content.tips_siswa : content.tips_guru;

  if (loading) {
    return (
      <DashboardLayout items={navItems} role={role}>
        <div className="card animate-pulse h-64" />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout items={navItems} role={role}>
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{judul}</h1>
          <p className="mt-1 text-sm text-slate-500">{deskripsi}</p>
        </div>

        <div className="card">
          <div className="mb-4 flex items-center gap-2">
            <div
              className={`grid h-10 w-10 place-items-center rounded-xl ${
                isSiswa ? "bg-blue-50 text-student" : "bg-violet-50 text-teacher"
              }`}
            >
              {isSiswa ? <User className="h-5 w-5" /> : <GraduationCap className="h-5 w-5" />}
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">
                {isSiswa ? "Untuk Siswa" : "Untuk Guru"}
              </p>
              <p className="text-xs text-slate-500">Ikuti langkah berurutan</p>
            </div>
          </div>

          <ol className="space-y-3">
            {(langkah || []).map((text, i) => (
              <li key={i} className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-green-light text-xs font-bold text-brand-green-dark">
                  {i + 1}
                </span>
                <p className="pt-0.5 text-sm leading-relaxed text-slate-700">{text}</p>
              </li>
            ))}
          </ol>
        </div>

        <div className="card border border-brand-teal/20 bg-brand-teal-light/20">
          <div className="flex items-start gap-3">
            <BookOpen className="mt-0.5 h-5 w-5 shrink-0 text-brand-teal" />
            <div>
              <p className="text-sm font-semibold text-slate-800">Tips</p>
              <ul className="mt-2 space-y-1.5 text-sm text-slate-600">
                {(tips || []).map((t, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}