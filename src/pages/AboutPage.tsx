import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import {
  ArrowLeft,
  FlaskConical,
  Target,
  Leaf,
  MessagesSquare,
  GraduationCap,
  User,
  Award,
} from 'lucide-react';
import { PROJECT_IDENTITY, KEGIATAN_CONTENT } from '@/content/kegiatanContent';
import { Footer } from '@/components/layout/Footer';
import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { db, type AboutPageContent } from '@/lib/firebase';

type KegiatanCard = {
  nomor: number;
  judul: string;
  subjudul?: string;
  warna: string;
  cakupanMateri?: string[];
};

const DEFAULT_APPROACHES = [
  {
    title: 'Problem Based Learning',
    description:
      'Sintaks 1–5: Orientasi Masalah → Organisasi → Penyelidikan → Pengembangan & Penyajian → Analisis & Evaluasi.',
  },
  {
    title: 'Education for Sustainable Development',
    description:
      'Integrasi SDG 2 (Zero Hunger), SDG 6 (Air Bersih), SDG 7 (Energi Bersih), SDG 12 (Konsumsi & Produksi Bertanggung Jawab), SDG 13 (Aksi Iklim).',
  },
  {
    title: 'Argumentasi TAP',
    description:
      'Kerangka Toulmin Adaptif: Claim, Data, Warrant, Backing, Qualifier, Rebuttal.',
  },
  {
    title: 'E-Assessment Eksternal',
    description:
      'Kuis dikelola di platform pihak ketiga (Google Forms/Quizizz) via embed & QR code.',
  },
];

const DEFAULT_SISWA = [
  'Mengerjakan kegiatan secara berurutan',
  'Mengisi jawaban interaktif & upload file',
  'Mengakses kuis via embed/QR',
  'Melihat riwayat & feedback guru',
];

const DEFAULT_GURU = [
  'Mengelola kelas & daftar siswa',
  'Rekap progres & detail jawaban',
  'Kelola tautan e-assessment',
  'Ekspor PDF individu & massal',
];

const APPROACH_ICONS = [
  <Target className="h-5 w-5" />,
  <Leaf className="h-5 w-5" />,
  <MessagesSquare className="h-5 w-5" />,
  <Award className="h-5 w-5" />,
];

export function AboutPage() {
  const [content, setContent] = useState<AboutPageContent | null>(null);
  const [kegiatanList, setKegiatanList] = useState<KegiatanCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        // Konten About dari Firestore
        const aboutSnap = await getDoc(doc(db, 'about_page', 'default'));
        if (aboutSnap.exists()) {
          setContent({ id: aboutSnap.id, ...aboutSnap.data() } as AboutPageContent);
        }

        // Kegiatan dari Firestore
        const kegSnap = await getDocs(collection(db, 'kegiatan'));
        const fromDb = kegSnap.docs
          .map((d) => {
            const data = d.data();
            return {
              nomor: data.nomor ?? parseInt(String(d.id).replace(/\D/g, '') || '0', 10),
              judul: data.judul || '',
              subjudul: data.subjudul || '',
              warna: data.warna || '#2E7D32',
              cakupanMateri: Array.isArray(data.cakupanMateri) ? data.cakupanMateri : [],
            } as KegiatanCard;
          })
          .filter((k) => k.nomor > 0)
          .sort((a, b) => a.nomor - b.nomor);

        if (fromDb.length > 0) {
          setKegiatanList(fromDb);
        } else {
          setKegiatanList(
            KEGIATAN_CONTENT.map((k) => ({
              nomor: k.nomor,
              judul: k.judul,
              subjudul: k.subjudul,
              warna: k.warna,
              cakupanMateri: k.cakupanMateri,
            })),
          );
        }
      } catch (err) {
        console.error('Failed to fetch about/kegiatan:', err);
        setKegiatanList(
          KEGIATAN_CONTENT.map((k) => ({
            nomor: k.nomor,
            judul: k.judul,
            subjudul: k.subjudul,
            warna: k.warna,
            cakupanMateri: k.cakupanMateri,
          })),
        );
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const badge = content?.badge || 'Tentang Produk';
  const deskripsi1 =
    content?.deskripsi_1 ||
    `E-LKPD (Elektronik Lembar Kerja Peserta Didik) interaktif untuk mata pelajaran Kimia SMA topik Laju Reaksi. Terdiri dari kegiatan belajar berbasis Problem Based Learning (PBL) yang diintegrasikan dengan prinsip Education for Sustainable Development (ESD), dilengkapi platform e-assessment (kuis eksternal via embed & QR) untuk melatih penalaran kimia (makroskopik–submikroskopik–simbolik) dan argumentasi ilmiah (kerangka TAP: Claim, Data, Warrant, Backing, Qualifier, Rebuttal).`;
  const deskripsi2 =
    content?.deskripsi_2 ||
    `Siswa mengisi jawaban langsung di website (teks, tabel, upload gambar/grafik, argumentasi terstruktur) dan dapat mengunggah file sebagai bukti kerja. Guru memantau progres, memberi feedback, mengelola tautan kuis eksternal, dan mengekspor jawaban menjadi PDF.`;
  const approaches =
    content?.approaches?.length ? content.approaches : DEFAULT_APPROACHES;
  const roleSiswa = content?.role_siswa_items?.length
    ? content.role_siswa_items
    : DEFAULT_SISWA;
  const roleGuru = content?.role_guru_items?.length
    ? content.role_guru_items
    : DEFAULT_GURU;
  const kegiatanTitle =
    content?.kegiatan_section_title ||
    `${kegiatanList.length || 4} Kegiatan Belajar`;

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-bg flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-green" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-bg">
      <header className="sticky top-0 z-40 border-b border-slate-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-content items-center justify-between px-4 py-3 sm:px-6">
          <Link to="/" className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-brand-green text-white">
              <FlaskConical className="h-5 w-5" />
            </div>
            <span className="text-sm font-bold text-brand-green-dark">LajuNalar</span>
          </Link>
          <Link to="/" className="btn-ghost">
            <ArrowLeft className="h-4 w-4" /> Beranda
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <span className="badge bg-brand-green-light text-brand-green-dark">{badge}</span>
        <h1 className="mt-3 text-3xl font-extrabold text-brand-green-dark">
          {PROJECT_IDENTITY.namaProduk}
        </h1>
        <p className="mt-1 text-lg font-semibold text-brand-teal-dark">
          {PROJECT_IDENTITY.tagline}
        </p>

        {/* Identitas (tetap dari PROJECT_IDENTITY — bisa dipindah ke DB nanti) */}
        <div className="mt-6 card">
          <h2 className="mb-4 text-lg font-bold text-slate-800">Identitas Penelitian</h2>
          <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-3">
            <Field label="Pengembang" value={PROJECT_IDENTITY.pengembang} />
            <Field label="Program Studi" value={PROJECT_IDENTITY.programStudi} />
            <Field label="Sumber Dana" value={PROJECT_IDENTITY.sumberDana} />
            <Field label="Tahun" value={PROJECT_IDENTITY.tahun} />
            <div className="sm:col-span-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Judul Penelitian
              </p>
              <p className="mt-1 text-sm font-medium text-slate-700 leading-relaxed">
                {PROJECT_IDENTITY.judulPenelitian}
              </p>
            </div>
          </dl>
        </div>

        {/* Deskripsi — editable */}
        <div className="mt-6 card">
          <h2 className="mb-3 text-lg font-bold text-slate-800">Deskripsi Produk</h2>
          <p className="text-sm leading-relaxed text-slate-600 whitespace-pre-wrap">
            {deskripsi1}
          </p>
          <p className="mt-3 text-sm leading-relaxed text-slate-600 whitespace-pre-wrap">
            {deskripsi2}
          </p>
        </div>

        {/* Pendekatan — editable */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {approaches.map((a, i) => (
            <ApproachCard
              key={i}
              icon={APPROACH_ICONS[i % APPROACH_ICONS.length]}
              title={a.title}
              desc={a.description}
            />
          ))}
        </div>

        {/* Roles — editable */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="card">
            <div className="mb-2 flex items-center gap-2 text-student">
              <User className="h-5 w-5" />
              <span className="font-bold">Peran Siswa</span>
            </div>
            <ul className="space-y-1.5 text-sm text-slate-600">
              {roleSiswa.map((it) => (
                <li key={it}>• {it}</li>
              ))}
            </ul>
          </div>
          <div className="card">
            <div className="mb-2 flex items-center gap-2 text-teacher">
              <GraduationCap className="h-5 w-5" />
              <span className="font-bold">Peran Guru</span>
            </div>
            <ul className="space-y-1.5 text-sm text-slate-600">
              {roleGuru.map((it) => (
                <li key={it}>• {it}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* Kegiatan — dari Firestore */}
        <div className="mt-6 card">
          <h2 className="mb-4 text-lg font-bold text-slate-800">{kegiatanTitle}</h2>
          {kegiatanList.length === 0 ? (
            <p className="text-sm text-slate-500">Belum ada data kegiatan.</p>
          ) : (
            <div className="space-y-3">
              {kegiatanList.map((k) => (
                <div
                  key={k.nomor}
                  className="flex items-start gap-3 rounded-xl border border-slate-100 p-3"
                >
                  <div
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-sm font-bold text-white"
                    style={{ backgroundColor: k.warna }}
                  >
                    {k.nomor}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-slate-800">
                      {(k.judul || '').replace(/^Kegiatan \d+\s*[—-]\s*/, '')}
                    </p>
                    <p className="text-xs text-slate-500">{k.subjudul}</p>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {(k.cakupanMateri || []).slice(0, 4).map((m) => (
                        <span key={m} className="chip">
                          {m}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-8 text-center">
          <Link to="/daftar" className="btn-primary px-6 py-3">
            Mulai Gunakan LajuNalar
          </Link>
        </div>
      </div>

      <Footer />
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-medium text-slate-700">{value}</p>
    </div>
  );
}

function ApproachCard({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="card">
      <div className="mb-2 flex items-center gap-2 text-brand-green">
        {icon}
        <span className="font-bold text-slate-800">{title}</span>
      </div>
      <p className="text-sm text-slate-600 leading-relaxed">{desc}</p>
    </div>
  );
}