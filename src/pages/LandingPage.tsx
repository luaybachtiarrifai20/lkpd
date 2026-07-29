import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import {
  FlaskConical, Leaf, Atom, BarChart3, MessagesSquare,
  CheckCircle2, FileEdit, ArrowRight, Sparkles,
  GraduationCap, User, Target,
} from 'lucide-react';
import { KEGIATAN_CONTENT } from '@/content/kegiatanContent';
import { Footer } from '@/components/layout/Footer';
import { SDGBadgeChip } from '@/components/ui';
import { doc, getDoc } from 'firebase/firestore';
import { db, type LandingPageContent } from '@/lib/firebase';

export function LandingPage() {
  const [content, setContent] = useState<LandingPageContent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchContent = async () => {
      try {
        const docRef = doc(db, 'landing_page', 'default');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setContent({ id: docSnap.id, ...docSnap.data() } as LandingPageContent);
        }
      } catch (err) {
        console.error('Failed to fetch landing page content:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchContent();
  }, []);

  // Use content from Firestore if available, otherwise use defaults
  const heroTitle = content?.hero_title || 'LajuNalar';
  const heroSubtitle = content?.hero_subtitle || 'E-LKPD Interaktif Laju Reaksi Berbasis PBL-ESD';
  const heroDescription = content?.hero_description || 'Belajar laju reaksi lewat masalah dunia nyata — food waste, limbah cair, biomassa, dan biodiesel B35. Latih penalaran kimia tingkat makroskopik, submikroskopik, & simbolik, plus argumentasi ilmiah kerangka TAP.';
  const heroBadge = content?.hero_badge || 'Penelitian Tesis Magister UNS 2026';
  const heroCtaPrimary = content?.hero_cta_primary || 'Mulai Belajar';
  const heroCtaSecondary = content?.hero_cta_secondary || 'Tentang Produk';
  const featuresTitle = content?.features_title || 'Komponen Interaktif';
  const featuresDescription = content?.features_description || 'Bukan PDF statis — siswa mengisi, mengunggah, & berargumentasi langsung.';
  const activitiesTitle = content?.activities_title || '4 Kegiatan Belajar';
  const activitiesDescription = content?.activities_description || 'Tiap kegiatan berbasis masalah ESD dengan warna identitas sendiri.';
  const ctaTitle = content?.cta_title || 'Siap mengasah penalaran kimiamu?';
  const ctaDescription = content?.cta_description || 'Buat akun dan mulai perjalanan belajar PBL-ESD sekarang.';
  const ctaPrimary = content?.cta_primary || 'Daftar Gratis';
  const ctaSecondary = content?.cta_secondary || 'Sudah punya akun';

  // Card data with defaults
  const heroCards = content?.hero_cards || {
    submikroskopik: { title: 'Submikroskopik', description: 'Tumbukan partikel & energi aktivasi' },
    simbolik: { title: 'Simbolik', description: 'Persamaan & grafik laju reaksi' },
    makroskopik: { title: 'Makroskopik', description: 'Gejala reaksi yang teramati' },
    argumentasi: { title: 'Argumentasi TAP', description: 'Claim–Data–Warrant–Backing' },
  };
  const roleSiswa = content?.role_siswa || {
    items: ['Peta progres 4 kegiatan', 'Isi jawaban interaktif & upload file', 'Akses kuis via embed & QR', 'Riwayat & nilai'],
    cta_label: 'Daftar sebagai Siswa',
  };
  const roleGuru = content?.role_guru || {
    items: ['Kelola kelas & siswa', 'Rekap progres per kegiatan', 'Kelola link kuis eksternal', 'Ekspor PDF individu & massal'],
    cta_label: 'Daftar sebagai Guru',
  };
  const featureCards = content?.feature_cards || [
    { title: 'Isian Otomatis', description: 'Textarea auto-resize dengan autosave' },
    { title: 'Tabel Isian', description: 'Spreadsheet mini untuk hipotesis & data' },
    { title: 'Upload File', description: 'Drag & drop foto, PDF, dokumen' },
    { title: 'Argumentasi TAP', description: 'Diagram alur 6 komponen argumen' },
    { title: 'Progress Tracker', description: 'Stepper PBL & roadmap kegiatan' },
    { title: 'E-Assessment', description: 'Embed kuis + QR code otomatis' },
    { title: 'Materi PBL-ESD', description: 'Sintaks 1–5 & integrasi SDG' },
    { title: 'Ekspor PDF', description: 'Lembar jawaban rapi per siswa' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-bg flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-green" />
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-neutral-bg">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-slate-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-content items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-brand-green text-white">
              <FlaskConical className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold leading-tight text-brand-green-dark">LajuNalar</p>
              <p className="text-[11px] leading-tight text-slate-400">E-LKPD Laju Reaksi PBL-ESD</p>
            </div>
          </div>
          <nav className="hidden items-center gap-1 md:flex">
            <a href="#fitur" className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Fitur</a>
            <a href="#kegiatan" className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Kegiatan</a>
            <Link to="/tentang" className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Tentang</Link>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/login" className="btn-outline">Masuk</Link>
            <Link to="/daftar" className="btn-primary">Daftar</Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-green-light via-white to-brand-teal-light" />
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-brand-green/10 blur-3xl" />
        <div className="absolute -left-24 bottom-0 h-72 w-72 rounded-full bg-brand-teal/10 blur-3xl" />
        <div className="relative mx-auto max-w-content px-4 py-16 sm:px-6 sm:py-24">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div className="animate-fade-in">
              <span className="badge bg-white/70 text-brand-green-dark shadow-soft">
                <Sparkles className="h-3.5 w-3.5" /> {heroBadge}
              </span>
              <h1 className="mt-4 text-4xl font-extrabold leading-tight text-brand-green-dark sm:text-5xl">
                {heroTitle}
              </h1>
              <p className="mt-2 text-lg font-semibold text-brand-teal-dark">
                {heroSubtitle}
              </p>
              <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-600">
                {heroDescription}
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link to="/daftar" className="btn-primary text-base px-5 py-3">
                  {heroCtaPrimary} <ArrowRight className="h-4 w-4" />
                </Link>
                <Link to="/tentang" className="btn-outline text-base px-5 py-3">{heroCtaSecondary}</Link>
              </div>
              <div className="mt-8 flex flex-wrap items-center gap-4 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1.5"><Leaf className="h-4 w-4 text-brand-green" /> Berbasis ESD</span>
                <span className="inline-flex items-center gap-1.5"><Target className="h-4 w-4 text-brand-teal" /> Sintaks PBL 1–5</span>
                <span className="inline-flex items-center gap-1.5"><MessagesSquare className="h-4 w-4 text-brand-amber" /> Argumentasi TAP</span>
              </div>
            </div>

            {/* Visual card stack */}
            <div className="relative hidden lg:block animate-fade-in">
              <div className="grid grid-cols-2 gap-4">
                <FeatureCard icon={<Atom className="h-6 w-6" />} title={heroCards.submikroskopik.title} desc={heroCards.submikroskopik.description} color="bg-brand-teal-light text-brand-teal" />
                <FeatureCard icon={<BarChart3 className="h-6 w-6" />} title={heroCards.simbolik.title} desc={heroCards.simbolik.description} color="bg-brand-amber-light text-brand-amber" />
                <FeatureCard icon={<FlaskConical className="h-6 w-6" />} title={heroCards.makroskopik.title} desc={heroCards.makroskopik.description} color="bg-brand-green-light text-brand-green" />
                <FeatureCard icon={<MessagesSquare className="h-6 w-6" />} title={heroCards.argumentasi.title} desc={heroCards.argumentasi.description} color="bg-blue-50 text-student" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Roles */}
      <section className="mx-auto max-w-content px-4 py-12 sm:px-6">
        <div className="grid gap-5 md:grid-cols-2">
          <RoleCard
            icon={<User className="h-6 w-6" />}
            role="Siswa"
            color="text-student bg-blue-50"
            items={roleSiswa.items}
            cta={{ to: '/daftar', label: roleSiswa.cta_label }}
          />
          <RoleCard
            icon={<GraduationCap className="h-6 w-6" />}
            role="Guru"
            color="text-teacher bg-violet-50"
            items={roleGuru.items}
            cta={{ to: '/daftar', label: roleGuru.cta_label }}
          />
        </div>
      </section>

      {/* Features */}
      <section id="fitur" className="bg-white py-14">
        <div className="mx-auto max-w-content px-4 sm:px-6">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold text-brand-green-dark sm:text-3xl">{featuresTitle}</h2>
            <p className="mt-2 text-slate-500">{featuresDescription}</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {featureCards.map((card, index) => (
              <FeatureMini
                key={index}
                icon={<FileEdit className="h-5 w-5" />}
                title={card.title}
                desc={card.description}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Activities roadmap */}
      <section id="kegiatan" className="mx-auto max-w-content px-4 py-14 sm:px-6">
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-bold text-brand-green-dark sm:text-3xl">{activitiesTitle}</h2>
          <p className="mt-2 text-slate-500">{activitiesDescription}</p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {KEGIATAN_CONTENT.map((k, i) => (
            <div
              key={k.nomor}
              className="group relative overflow-hidden rounded-2xl bg-white p-5 shadow-soft transition hover:shadow-float"
              style={{ borderTop: `4px solid ${k.warna}` }}
            >
              <div
                className="mb-3 grid h-11 w-11 place-items-center rounded-xl text-sm font-bold text-white"
                style={{ backgroundColor: k.warna }}
              >
                {k.nomor}
              </div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Kegiatan {k.nomor}</p>
              <h3 className="mt-1 text-sm font-bold leading-snug text-slate-800">{k.judul.replace(/^Kegiatan \d+\s*[—-]\s*/, '')}</h3>
              <p className="mt-1 text-xs text-slate-500">{k.subjudul}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {k.sdg.map((s) => <SDGBadgeChip key={s.nomor} sdg={s} />)}
              </div>
              <div className="mt-3 flex flex-wrap gap-1">
                {k.cakupanMateri.slice(0, 3).map((m) => (
                  <span key={m} className="chip">{m}</span>
                ))}
                {k.cakupanMateri.length > 3 && <span className="chip">+{k.cakupanMateri.length - 3}</span>}
              </div>
              <span className="absolute -right-2 -top-2 text-6xl font-black opacity-5 text-slate-400">{i + 1}</span>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-r from-brand-green to-brand-teal py-14">
        <div className="mx-auto max-w-content px-4 text-center sm:px-6">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">{ctaTitle}</h2>
          <p className="mt-2 text-white/80">{ctaDescription}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link to="/daftar" className="btn bg-white text-brand-green-dark hover:bg-white/90 text-base px-5 py-3">
              {ctaPrimary} <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/login" className="btn border border-white/40 text-white hover:bg-white/10 text-base px-5 py-3">{ctaSecondary}</Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

function FeatureCard({ icon, title, desc, color }: { icon: React.ReactNode; title: string; desc: string; color: string }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-soft transition hover:shadow-float">
      <div className={`mb-3 grid h-11 w-11 place-items-center rounded-xl ${color}`}>{icon}</div>
      <p className="text-sm font-bold text-slate-800">{title}</p>
      <p className="mt-1 text-xs text-slate-500">{desc}</p>
    </div>
  );
}

function FeatureMini({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-neutral-bg p-4 transition hover:border-brand-green/30 hover:bg-white">
      <div className="mb-2 grid h-9 w-9 place-items-center rounded-lg bg-brand-green-light text-brand-green">{icon}</div>
      <p className="text-sm font-semibold text-slate-800">{title}</p>
      <p className="mt-0.5 text-xs text-slate-500">{desc}</p>
    </div>
  );
}

function RoleCard({
  icon, role, color, items, cta,
}: {
  icon: React.ReactNode; role: string; color: string; items: string[]; cta: { to: string; label: string };
}) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-soft">
      <div className="flex items-center gap-3">
        <div className={`grid h-12 w-12 place-items-center rounded-xl ${color}`}>{icon}</div>
        <h3 className="text-lg font-bold text-slate-800">Untuk {role}</h3>
      </div>
      <ul className="mt-4 space-y-2">
        {items.map((it) => (
          <li key={it} className="flex items-center gap-2 text-sm text-slate-600">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-success" /> {it}
          </li>
        ))}
      </ul>
      <Link to={cta.to} className="btn-outline mt-5 w-full">{cta.label} <ArrowRight className="h-4 w-4" /></Link>
    </div>
  );
}
