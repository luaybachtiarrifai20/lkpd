import { Link } from 'react-router-dom';
import { ArrowLeft, FlaskConical, Target, Leaf, MessagesSquare, GraduationCap, User, Award } from 'lucide-react';
import { PROJECT_IDENTITY, KEGIATAN_CONTENT } from '@/content/kegiatanContent';
import { Footer } from '@/components/layout/Footer';

export function AboutPage() {
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
          <Link to="/" className="btn-ghost"><ArrowLeft className="h-4 w-4" /> Beranda</Link>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <span className="badge bg-brand-green-light text-brand-green-dark">Tentang Produk</span>
        <h1 className="mt-3 text-3xl font-extrabold text-brand-green-dark">{PROJECT_IDENTITY.namaProduk}</h1>
        <p className="mt-1 text-lg font-semibold text-brand-teal-dark">{PROJECT_IDENTITY.tagline}</p>

        {/* Identitas lengkap */}
        <div className="mt-6 card">
          <h2 className="mb-4 text-lg font-bold text-slate-800">Identitas Penelitian</h2>
          <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-3">
            <Field label="Pengembang" value={PROJECT_IDENTITY.pengembang} />
            <Field label="Program Studi" value={PROJECT_IDENTITY.programStudi} />
            <Field label="Sumber Dana" value={PROJECT_IDENTITY.sumberDana} />
            <Field label="Tahun" value={PROJECT_IDENTITY.tahun} />
            <div className="sm:col-span-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Judul Penelitian</p>
              <p className="mt-1 text-sm font-medium text-slate-700 leading-relaxed">{PROJECT_IDENTITY.judulPenelitian}</p>
            </div>
          </dl>
        </div>

        {/* Deskripsi */}
        <div className="mt-6 card">
          <h2 className="mb-3 text-lg font-bold text-slate-800">Deskripsi Produk</h2>
          <p className="text-sm leading-relaxed text-slate-600">
            E-LKPD (Elektronik Lembar Kerja Peserta Didik) interaktif untuk mata pelajaran Kimia SMA topik
            <strong> Laju Reaksi</strong>. Terdiri dari 4 Kegiatan Belajar berbasis <strong>Problem Based Learning (PBL)</strong> yang
            diintegrasikan dengan prinsip <strong>Education for Sustainable Development (ESD)</strong>, dilengkapi platform
            e-assessment (kuis eksternal via embed & QR) untuk melatih <strong>penalaran kimia</strong> (makroskopik–submikroskopik–simbolik)
            dan <strong>argumentasi ilmiah</strong> (kerangka TAP: Claim, Data, Warrant, Backing, Qualifier, Rebuttal).
          </p>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            Siswa mengisi jawaban langsung di website (teks, tabel, upload gambar/grafik, argumentasi terstruktur) dan dapat
            mengunggah file sebagai bukti kerja. Guru memantau progres, memberi feedback, mengelola tautan kuis eksternal,
            dan mengekspor jawaban menjadi PDF.
          </p>
        </div>

        {/* Pendekatan */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <ApproachCard icon={<Target className="h-5 w-5" />} title="Problem Based Learning" desc="Sintaks 1–5: Orientasi Masalah → Organisasi → Penyelidikan → Pengembangan & Penyajian → Analisis & Evaluasi." />
          <ApproachCard icon={<Leaf className="h-5 w-5" />} title="Education for Sustainable Development" desc="Integrasi SDG 2 (Zero Hunger), SDG 6 (Air Bersih), SDG 7 (Energi Bersih), SDG 12 (Konsumsi & Produksi Bertanggung Jawab), SDG 13 (Aksi Iklim)." />
          <ApproachCard icon={<MessagesSquare className="h-5 w-5" />} title="Argumentasi TAP" desc="Kerangka Toulmin Adaptif: Claim, Data, Warrant, Backing, Qualifier, Rebuttal." />
          <ApproachCard icon={<Award className="h-5 w-5" />} title="E-Assessment Eksternal" desc="Kuis dikelola di platform pihak ketiga (Google Forms/Quizizz) via embed & QR code." />
        </div>

        {/* Roles */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="card">
            <div className="mb-2 flex items-center gap-2 text-student">
              <User className="h-5 w-5" /><span className="font-bold">Peran Siswa</span>
            </div>
            <ul className="space-y-1.5 text-sm text-slate-600">
              <li>• Mengerjakan 4 kegiatan secara berurutan</li>
              <li>• Mengisi jawaban interaktif & upload file</li>
              <li>• Mengakses kuis via embed/QR</li>
              <li>• Melihat riwayat & feedback guru</li>
            </ul>
          </div>
          <div className="card">
            <div className="mb-2 flex items-center gap-2 text-teacher">
              <GraduationCap className="h-5 w-5" /><span className="font-bold">Peran Guru</span>
            </div>
            <ul className="space-y-1.5 text-sm text-slate-600">
              <li>• Mengelola kelas & daftar siswa</li>
              <li>• Rekap progres & detail jawaban</li>
              <li>• Kelola tautan e-assessment</li>
              <li>• Ekspor PDF individu & massal</li>
            </ul>
          </div>
        </div>

        {/* Ringkasan 4 kegiatan */}
        <div className="mt-6 card">
          <h2 className="mb-4 text-lg font-bold text-slate-800">4 Kegiatan Belajar</h2>
          <div className="space-y-3">
            {KEGIATAN_CONTENT.map((k) => (
              <div key={k.nomor} className="flex items-start gap-3 rounded-xl border border-slate-100 p-3">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-sm font-bold text-white" style={{ backgroundColor: k.warna }}>
                  {k.nomor}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-slate-800">{k.judul.replace(/^Kegiatan \d+\s*[—-]\s*/, '')}</p>
                  <p className="text-xs text-slate-500">{k.subjudul}</p>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {k.cakupanMateri.slice(0, 4).map((m) => <span key={m} className="chip">{m}</span>)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 text-center">
          <Link to="/daftar" className="btn-primary px-6 py-3">Mulai Gunakan LajuNalar</Link>
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

function ApproachCard({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="card">
      <div className="mb-2 flex items-center gap-2 text-brand-green">
        {icon}<span className="font-bold text-slate-800">{title}</span>
      </div>
      <p className="text-sm text-slate-600 leading-relaxed">{desc}</p>
    </div>
  );
}
