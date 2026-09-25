import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FlaskConical, Leaf, Atom, BarChart3, MessagesSquare, UploadCloud,
  CheckCircle2, FileEdit, Award, BookOpen, ArrowRight, Sparkles,
  GraduationCap, User, Target,
} from 'lucide-react';
import { KEGIATAN_CONTENT } from '@/content/kegiatanContent';
import type { SDGBadge } from '@/content/types';
import { collection, getDocs } from 'firebase/firestore';
import { db, type LandingPageContent } from '@/lib/firebase';
import { Footer } from '@/components/layout/Footer';
import { SDGBadgeChip } from '@/components/ui';
import { Reveal } from '@/components/ui/Reveal';
import { MoleculeField, HeroMolecule } from '@/components/ui/Molecule';

type KegiatanCard = {
  nomor: number;
  judul: string;
  subjudul?: string;
  warna: string;
  sdg: SDGBadge[];
  cakupanMateri: string[];
};

const DEFAULT_LANDING: LandingPageContent = {
  id: 'default',
  hero_title: 'LajuNalar',
  hero_subtitle: 'E-LKPD Interaktif Laju Reaksi Berbasis PBL-ESD',
  hero_description:
    'Belajar laju reaksi lewat masalah dunia nyata — rantai produksi pangan dan energi terbarukan. Latih penalaran kimia tingkat makroskopik, submikroskopik, & simbolik, plus argumentasi ilmiah kerangka TAP.',
  hero_badge: 'Penelitian Tesis Magister UNS 2026',
  hero_cta_primary: 'Mulai Belajar',
  hero_cta_secondary: 'Tentang Produk',
  features_title: 'Komponen Interaktif',
  features_description:
    'Bukan PDF statis — siswa mengisi, mengunggah, & berargumentasi langsung.',
  activities_title: 'Kegiatan Belajar',
  activities_description:
    'Tiap kegiatan berbasis masalah ESD dengan warna identitas sendiri.',
  cta_title: 'Siap mengasah penalaran kimiamu?',
  cta_description: 'Buat akun dan mulai perjalanan belajar PBL-ESD sekarang.',
  cta_primary: 'Daftar Gratis',
  cta_secondary: 'Sudah punya akun',
  hero_cards: {
    submikroskopik: { title: 'Submikroskopik', description: 'Tumbukan partikel & energi aktivasi' },
    simbolik: { title: 'Simbolik', description: 'Persamaan & grafik laju reaksi' },
    makroskopik: { title: 'Makroskopik', description: 'Gejala reaksi yang teramati' },
    argumentasi: { title: 'Argumentasi TAP', description: 'Claim–Data–Warrant–Backing' },
  },
  role_siswa: {
    items: [
      'Peta progres 2 kegiatan',
      'Isi jawaban interaktif & upload file',
      'Akses kuis via embed & QR',
      'Riwayat & nilai',
    ],
    cta_label: 'Daftar sebagai Siswa',
  },
  role_guru: {
    items: [
      'Kelola kelas & siswa',
      'Rekap progres per kegiatan',
      'Kelola link kuis eksternal',
      'Ekspor PDF individu & massal',
    ],
    cta_label: 'Daftar sebagai Guru',
  },
  feature_cards: [
    { title: 'Isian Otomatis', description: 'Textarea auto-resize dengan autosave' },
    { title: 'Tabel Isian', description: 'Spreadsheet mini untuk hipotesis & data' },
    { title: 'Upload File', description: 'Drag & drop foto, PDF, dokumen' },
    { title: 'Argumentasi TAP', description: 'Diagram alur 6 komponen argumen' },
    { title: 'Progress Tracker', description: 'Stepper PBL & roadmap kegiatan' },
    { title: 'E-Assessment', description: 'Embed kuis + QR code otomatis' },
    { title: 'Materi PBL-ESD', description: 'Sintaks 1–5 & integrasi SDG' },
    { title: 'Ekspor PDF', description: 'Lembar jawaban rapi per siswa' },
  ],
  activity_cards: [],
  diperbarui_pada: new Date().toISOString(),
};

const FEATURE_ICONS = [
  <FileEdit className="h-5 w-5" />,
  <BarChart3 className="h-5 w-5" />,
  <UploadCloud className="h-5 w-5" />,
  <MessagesSquare className="h-5 w-5" />,
  <CheckCircle2 className="h-5 w-5" />,
  <Award className="h-5 w-5" />,
  <BookOpen className="h-5 w-5" />,
  <FileEdit className="h-5 w-5" />,
];

export function LandingPage() {
  const [kegiatanList, setKegiatanList] = useState<KegiatanCard[]>(KEGIATAN_CONTENT);
  const [content, setContent] = useState<LandingPageContent>(DEFAULT_LANDING);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        // 1) Konten landing dari Super Admin
        const landingSnap = await getDocs(collection(db, 'landing_page'));
        if (active && !landingSnap.empty) {
          const dbData = landingSnap.docs[0].data() as Partial<LandingPageContent>;
          setContent({
            ...DEFAULT_LANDING,
            ...dbData,
            hero_cards: {
              ...DEFAULT_LANDING.hero_cards,
              ...(dbData.hero_cards || {}),
            },
            role_siswa: {
              ...DEFAULT_LANDING.role_siswa,
              ...(dbData.role_siswa || {}),
            },
            role_guru: {
              ...DEFAULT_LANDING.role_guru,
              ...(dbData.role_guru || {}),
            },
            feature_cards: dbData.feature_cards?.length
              ? dbData.feature_cards
              : DEFAULT_LANDING.feature_cards,
            activity_cards: dbData.activity_cards || DEFAULT_LANDING.activity_cards,
            id: landingSnap.docs[0].id,
          });
        }

        // 2) Kegiatan (tetap dari collection kegiatan)
        const snap = await getDocs(collection(db, 'kegiatan'));
        const fromDb = snap.docs
          .map((d) => {
            const data = d.data();
            return {
              nomor: Number(data.nomor ?? 0),
              judul: data.judul || '',
              subjudul: data.subjudul || '',
              warna: data.warna || '#2E7D32',
              sdg: Array.isArray(data.sdg) ? data.sdg : [],
              cakupanMateri: Array.isArray(data.cakupanMateri)
                ? data.cakupanMateri
                : [],
            } as KegiatanCard;
          })
          .filter((k) => k.nomor > 0)
          .sort((a, b) => a.nomor - b.nomor);

        if (active && fromDb.length > 0) {
          setKegiatanList(fromDb);
        }
      } catch (err) {
        console.error('[LandingPage] gagal memuat data:', err);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-bg flex items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-lab-teal border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-bg">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-lab-teal/10 bg-white/80 backdrop-blur-md transition-shadow">
        <div className="mx-auto flex max-w-content items-center justify-between px-4 py-3 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="relative grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-lab-teal to-lab-cyan text-white shadow-glow transition-transform group-hover:scale-105">
              <FlaskConical className="h-5 w-5" />
              <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-lab-amber animate-pulse-glow" />
            </div>
            <div>
              <p className="text-base font-bold leading-tight text-lab-teal-dark font-heading">
                {content.hero_title || 'LajuNalar'}
              </p>
              <p className="text-[11px] leading-tight text-slate-400">
                E-LKPD Laju Reaksi PBL-ESD
              </p>
            </div>
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            <a href="#fitur" className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-lab-teal-light/50 hover:text-lab-teal-dark">
              Fitur
            </a>
            <a href="#kegiatan" className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-lab-teal-light/50 hover:text-lab-teal-dark">
              Kegiatan
            </a>
            <Link to="/tentang" className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-lab-teal-light/50 hover:text-lab-teal-dark">
              Tentang
            </Link>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/login" className="btn-outline bubble-hover">
              Masuk
            </Link>
            <Link to="/daftar" className="btn-primary bubble-hover">
              Daftar
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-mesh-lab">
        <MoleculeField className="opacity-70" />
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-lab-teal/10 blur-3xl" />
        <div className="absolute -left-24 bottom-0 h-72 w-72 rounded-full bg-lab-amber/8 blur-3xl" />
        <div className="relative mx-auto max-w-content px-4 py-16 sm:px-6 sm:py-24">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div className="animate-fade-up">
              <span className="badge bg-white/80 text-lab-teal-dark shadow-soft border border-lab-teal/10">
                <Sparkles className="h-3.5 w-3.5 text-lab-amber" />{' '}
                {content.hero_badge}
              </span>
              <h1 className="mt-4 text-5xl font-extrabold leading-tight text-lab-teal-dark font-heading sm:text-6xl">
                {content.hero_title}
              </h1>
              <p className="mt-2 text-lg font-semibold text-lab-cyan-dark">
                {content.hero_subtitle}
              </p>
              <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-600">
                {content.hero_description}
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link to="/daftar" className="btn-primary bubble-hover text-base px-5 py-3">
                  {content.hero_cta_primary} <ArrowRight className="h-4 w-4" />
                </Link>
                <Link to="/tentang" className="btn-outline bubble-hover text-base px-5 py-3">
                  {content.hero_cta_secondary}
                </Link>
              </div>
              <div className="mt-8 flex flex-wrap items-center gap-4 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1.5">
                  <Leaf className="h-4 w-4 text-lab-green" /> Berbasis ESD
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Target className="h-4 w-4 text-lab-teal" /> Sintaks PBL 1–5
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <MessagesSquare className="h-4 w-4 text-lab-amber" /> Argumentasi TAP
                </span>
              </div>
            </div>

            <div className="relative hidden lg:block animate-fade-in">
              <div className="relative mx-auto aspect-square max-w-md">
                <HeroMolecule className="h-full w-full drop-shadow-[0_8px_32px_rgba(13,148,136,0.25)]" />
                <div className="absolute left-0 top-1/4 animate-float" style={{ animationDelay: '0.5s' }}>
                  <FeatureChip
                    icon={<Atom className="h-4 w-4" />}
                    title={content.hero_cards?.submikroskopik?.title || 'Submikroskopik'}
                    color="bg-lab-cyan-light text-lab-cyan-dark"
                  />
                </div>
                <div className="absolute right-0 top-1/3 animate-float-slow">
                  <FeatureChip
                    icon={<BarChart3 className="h-4 w-4" />}
                    title={content.hero_cards?.simbolik?.title || 'Simbolik'}
                    color="bg-lab-amber-light text-lab-amber-dark"
                  />
                </div>
                <div className="absolute bottom-1/4 left-1/4 animate-float" style={{ animationDelay: '1.2s' }}>
                  <FeatureChip
                    icon={<FlaskConical className="h-4 w-4" />}
                    title={content.hero_cards?.makroskopik?.title || 'Makroskopik'}
                    color="bg-lab-green-light text-lab-green-dark"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Roles */}
      <section className="mx-auto max-w-content px-4 py-12 sm:px-6">
        <Reveal>
          <div className="grid gap-5 md:grid-cols-2">
            <RoleCard
              icon={<User className="h-6 w-6" />}
              role="Siswa"
              color="text-lab-cyan-dark bg-lab-cyan-light"
              items={content.role_siswa?.items || DEFAULT_LANDING.role_siswa.items}
              cta={{
                to: '/daftar',
                label: content.role_siswa?.cta_label || 'Daftar sebagai Siswa',
              }}
            />
            <RoleCard
              icon={<GraduationCap className="h-6 w-6" />}
              role="Guru"
              color="text-lab-teal-dark bg-lab-teal-light"
              items={content.role_guru?.items || DEFAULT_LANDING.role_guru.items}
              cta={{
                to: '/daftar',
                label: content.role_guru?.cta_label || 'Daftar sebagai Guru',
              }}
            />
          </div>
        </Reveal>
      </section>

      {/* Features */}
      <section id="fitur" className="bg-white py-14">
        <div className="mx-auto max-w-content px-4 sm:px-6">
          <Reveal>
            <div className="mb-8 text-center">
              <h2 className="text-2xl font-bold text-lab-teal-dark font-heading sm:text-3xl">
                {content.features_title}
              </h2>
              <p className="mt-2 text-slate-500">{content.features_description}</p>
            </div>
          </Reveal>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {(content.feature_cards || []).map((f, i) => (
              <Reveal key={`${f.title}-${i}`} delay={i * 60}>
                <FeatureMini
                  icon={FEATURE_ICONS[i % FEATURE_ICONS.length]}
                  title={f.title}
                  desc={f.description}
                />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Activities */}
      <section id="kegiatan" className="mx-auto max-w-content px-4 py-14 sm:px-6">
        <Reveal>
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold text-lab-teal-dark font-heading sm:text-3xl">
              {kegiatanList.length} {content.activities_title || 'Kegiatan Belajar'}
            </h2>
            <p className="mt-2 text-slate-500">{content.activities_description}</p>
          </div>
        </Reveal>
        <div className="grid gap-5 sm:grid-cols-2">
          {kegiatanList.map((k, i) => (
            <Reveal key={k.nomor} delay={i * 80}>
              <div
                className="group relative overflow-hidden rounded-2xl bg-white p-5 shadow-card transition-all duration-300 hover:shadow-float hover:-translate-y-1"
                style={{ borderTop: `4px solid ${k.warna}` }}
              >
                <div
                  className="mb-3 grid h-11 w-11 place-items-center rounded-xl text-sm font-bold text-white shadow-soft transition-transform group-hover:scale-110"
                  style={{ backgroundColor: k.warna }}
                >
                  {k.nomor}
                </div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  Kegiatan {k.nomor}
                </p>
                <h3 className="mt-1 text-sm font-bold leading-snug text-slate-800">
                  {k.judul.replace(/^Kegiatan \d+\s*[—-]\s*/, '')}
                </h3>
                <p className="mt-1 text-xs text-slate-500">{k.subjudul}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {k.sdg.map((s) => (
                    <SDGBadgeChip key={s.nomor} sdg={s} />
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap gap-1">
                  {k.cakupanMateri.slice(0, 3).map((m) => (
                    <span key={m} className="chip">
                      {m}
                    </span>
                  ))}
                  {k.cakupanMateri.length > 3 && (
                    <span className="chip">+{k.cakupanMateri.length - 3}</span>
                  )}
                </div>
                <span className="absolute -right-2 -top-2 text-6xl font-black opacity-5 text-slate-400 font-heading">
                  {i + 1}
                </span>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden bg-gradient-to-r from-brand-green-dark to-brand-green-light py-14">
        <MoleculeField className="opacity-30" />
        <div className="relative mx-auto max-w-content px-4 text-center sm:px-6">
          <Reveal>
            <h2 className="text-2xl font-bold text-black font-heading sm:text-3xl">
              {content.cta_title}
            </h2>
            <p className="mt-2 text-black/80">{content.cta_description}</p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                to="/daftar"
                className="btn bubble-hover bg-white text-lab-teal-dark hover:bg-white/90 text-base px-5 py-3 shadow-float"
              >
                {content.cta_primary} <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/login"
                className="btn bubble-hover border border-white/40 text-black hover:bg-white/10 text-base px-5 py-3"
              >
                {content.cta_secondary}
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      <Footer />
    </div>
  );
}

function FeatureChip({
  icon,
  title,
  color,
}: {
  icon: React.ReactNode;
  title: string;
  color: string;
}) {
  return (
    <div
      className={`flex items-center gap-2 rounded-xl ${color} px-3 py-2 shadow-card backdrop-blur-sm`}
    >
      {icon}
      <span className="text-xs font-bold">{title}</span>
    </div>
  );
}

function FeatureMini({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="rounded-2xl border border-lab-teal/8 bg-neutral-bg p-4 transition-all duration-300 hover:border-lab-teal/30 hover:bg-white hover:shadow-card hover:-translate-y-0.5">
      <div className="mb-2 grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-lab-teal-light to-lab-cyan-light text-lab-teal">
        {icon}
      </div>
      <p className="text-sm font-semibold text-slate-800">{title}</p>
      <p className="mt-0.5 text-xs text-slate-500">{desc}</p>
    </div>
  );
}

function RoleCard({
  icon,
  role,
  color,
  items,
  cta,
}: {
  icon: React.ReactNode;
  role: string;
  color: string;
  items: string[];
  cta: { to: string; label: string };
}) {
  return (
    <div className="card hover:shadow-float transition-all duration-300">
      <div className="flex items-center gap-3">
        <div className={`grid h-12 w-12 place-items-center rounded-xl ${color} shadow-soft`}>
          {icon}
        </div>
        <h3 className="text-lg font-bold text-slate-800 font-heading">Untuk {role}</h3>
      </div>
      <ul className="mt-4 space-y-2">
        {items.map((it) => (
          <li key={it} className="flex items-center gap-2 text-sm text-slate-600">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-lab-green" /> {it}
          </li>
        ))}
      </ul>
      <Link to={cta.to} className="btn-outline bubble-hover mt-5 w-full">
        {cta.label} <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}