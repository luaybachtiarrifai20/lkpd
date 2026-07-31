import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  collection, getDocs, doc, updateDoc, deleteDoc, setDoc, query, where, orderBy,
} from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { db, auth, type Profile, type Kelas, type Jawaban, type Kegiatan, type LandingPageContent, AboutPageContent } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import {
  Users,
  BookOpen,
  FileText,
  Activity,
  Shield,
  Edit,
  Trash2,
  Plus,
  Save,
  X,
  Check,
  XCircle,
  Clock,
  LayoutDashboard,
  Eye,
} from 'lucide-react';
import { Badge, EmptyState } from '@/components/ui';

type TabType = 'pending' | 'profiles' | 'kelas' | 'jawaban' | 'kegiatan' | 'admins' | 'questions' | 'landing' | 'about';

type EditingItem = {
  id: string;
  [key: string]: unknown;
};

type TableRow = Profile | Kelas | Jawaban | Kegiatan;

function collectionForTab(tab: TabType): string {
  if (tab === 'pending' || tab === 'admins') return 'profiles';
  return tab;
}

function toEditingItem(item: TableRow): EditingItem {
  return { ...item } as EditingItem;
}

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  return 'Terjadi kesalahan';
}

/** Nav items — path dipakai sebagai id tab (DashboardLayout Link) */
const navItems = [
  { to: '/super-admin?tab=pending', label: 'Menunggu', icon: <Clock className="h-5 w-5" /> },
  { to: '/super-admin?tab=profiles', label: 'Profiles', icon: <Users className="h-5 w-5" /> },
  { to: '/super-admin?tab=kelas', label: 'Kelas', icon: <BookOpen className="h-5 w-5" /> },
  { to: '/super-admin?tab=jawaban', label: 'Jawaban', icon: <FileText className="h-5 w-5" /> },
  { to: '/super-admin?tab=kegiatan', label: 'Kegiatan', icon: <Activity className="h-5 w-5" /> },
  { to: '/super-admin?tab=admins', label: 'Super Admins', icon: <Shield className="h-5 w-5" /> },
  { to: '/super-admin?tab=landing', label: 'Landing Page', icon: <LayoutDashboard className="h-5 w-5" /> },
  { to: '/super-admin/questions', label: 'Kelola Soal', icon: <FileText className="h-5 w-5" /> },
  { to: '/super-admin/about', label: 'Kelola About', icon: <FileText className="h-5 w-5" /> }
];

const TAB_TITLES: Record<TabType, string> = {
  pending: 'Menunggu Persetujuan',
  profiles: 'Semua Profiles',
  kelas: 'Kelas',
  jawaban: 'Jawaban Siswa',
  kegiatan: 'Kegiatan',
  admins: 'Super Admins',
  questions: 'Kelola Soal',
  landing: 'Konten Landing Page',
  about: 'Konten About Page'
};

function parseTab(search: string): TabType {
  const q = new URLSearchParams(search).get('tab');
  const allowed: TabType[] = ['pending', 'profiles', 'kelas', 'jawaban', 'kegiatan', 'admins', 'questions', 'landing', 'about'];
  if (q && (allowed as string[]).includes(q)) return q as TabType;
  return 'pending';
}

export function SuperAdminDashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<TabType>(() =>
    typeof window !== 'undefined' ? parseTab(window.location.search) : 'pending'
  );
  const [loading, setLoading] = useState(true);

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [kelas, setKelas] = useState<Kelas[]>([]);
  const [jawaban, setJawaban] = useState<Jawaban[]>([]);
  const [kegiatan, setKegiatan] = useState<Kegiatan[]>([]);
  const [landingContent, setLandingContent] = useState<LandingPageContent | null>(null);
  const [aboutContent, setAboutContent] = useState<AboutPageContent | null>(null);

  const [editingItem, setEditingItem] = useState<EditingItem | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);

  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [newAdminName, setNewAdminName] = useState('');
  const [creatingAdmin, setCreatingAdmin] = useState(false);

  // Sync tab dari URL (saat klik sidebar Link)
  useEffect(() => {
    const onPop = () => setActiveTab(parseTab(window.location.search));
    window.addEventListener('popstate', onPop);
    // juga pantau klik navigasi react-router
    const id = setInterval(() => {
      const t = parseTab(window.location.search);
      setActiveTab((prev) => (prev !== t ? t : prev));
    }, 300);
    return () => {
      window.removeEventListener('popstate', onPop);
      clearInterval(id);
    };
  }, []);

  useEffect(() => {
    if (profile?.role !== 'super_admin') {
      navigate('/super-admin/login');
      return;
    }
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, activeTab, navigate]);

  const loadData = async () => {
    setLoading(true);
    try {
      switch (activeTab) {
        case 'profiles': {
          const snap = await getDocs(collection(db, 'profiles'));
          setProfiles(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Profile)));
          break;
        }
        case 'kelas': {
          try {
            const snap = await getDocs(query(collection(db, 'kelas'), orderBy('nama_kelas')));
            setKelas(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Kelas)));
          } catch {
            const snap = await getDocs(collection(db, 'kelas'));
            const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Kelas));
            list.sort((a, b) => (a.nama_kelas || '').localeCompare(b.nama_kelas || '', 'id'));
            setKelas(list);
          }
          break;
        }
        case 'jawaban': {
          const snap = await getDocs(collection(db, 'jawaban'));
          setJawaban(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Jawaban)));
          break;
        }
        case 'kegiatan': {
          const snap = await getDocs(collection(db, 'kegiatan'));
          setKegiatan(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Kegiatan)));
          break;
        }
        case 'admins': {
          const snap = await getDocs(
            query(collection(db, 'profiles'), where('role', '==', 'super_admin'))
          );
          setProfiles(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Profile)));
          break;
        }
        case 'pending': {
          const snap = await getDocs(
            query(collection(db, 'profiles'), where('status', '==', 'pending'))
          );
          setProfiles(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Profile)));
          break;
        }
        case 'landing': {
          const defaultContent: LandingPageContent = {
            id: 'default',
            hero_title: 'LajuNalar',
            hero_subtitle: 'E-LKPD Interaktif Laju Reaksi Berbasis PBL-ESD',
            hero_description: 'Belajar laju reaksi lewat masalah dunia nyata — food waste, limbah cair, biomassa, dan biodiesel B35.',
            hero_badge: 'Penelitian Tesis Magister UNS 2026',
            hero_cta_primary: 'Mulai Belajar',
            hero_cta_secondary: 'Tentang Produk',
            features_title: 'Komponen Interaktif',
            features_description: 'Bukan PDF statis — siswa mengisi, mengunggah, & berargumentasi langsung.',
            activities_title: '4 Kegiatan Belajar',
            activities_description: 'Tiap kegiatan berbasis masalah ESD dengan warna identitas sendiri.',
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
              items: ['Peta progres 4 kegiatan', 'Isi jawaban interaktif & upload file', 'Akses kuis via embed & QR', 'Riwayat & nilai'],
              cta_label: 'Daftar sebagai Siswa',
            },
            role_guru: {
              items: ['Kelola kelas & siswa', 'Rekap progres per kegiatan', 'Kelola link kuis eksternal', 'Ekspor PDF individu & massal'],
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
            activity_cards: [
              { title: 'Mengapa Makanan Cepat Basi?', description: 'Pengaruh Suhu terhadap Laju Reaksi' },
              { title: 'Dilema Limbah Cair Industri', description: 'Pengaruh Konsentrasi & Luas Permukaan terhadap Laju Reaksi' },
              { title: 'Biomassa dan Energi Alternatif', description: 'Pengaruh Katalis terhadap Laju Reaksi' },
              { title: 'Menilik Efisiensi Biodiesel B35', description: 'Persamaan Laju Reaksi dan Orde Reaksi' },
            ],
            diperbarui_pada: new Date().toISOString(),
          };

          const snap = await getDocs(collection(db, 'landing_page'));
          if (!snap.empty) {
            const dbData = snap.docs[0].data() as Partial<LandingPageContent>;
            setLandingContent({
              ...defaultContent,
              ...dbData,
              hero_cards: {
                ...defaultContent.hero_cards,
                ...(dbData.hero_cards || {}),
              },
              role_siswa: {
                ...defaultContent.role_siswa,
                ...(dbData.role_siswa || {}),
              },
              role_guru: {
                ...defaultContent.role_guru,
                ...(dbData.role_guru || {}),
              },
              feature_cards: dbData.feature_cards || defaultContent.feature_cards,
              activity_cards: dbData.activity_cards || defaultContent.activity_cards,
              id: snap.docs[0].id,
            } as LandingPageContent);
          } else {
            await setDoc(doc(db, 'landing_page', 'default'), defaultContent);
            setLandingContent(defaultContent);
          }
          break;
        }
      }
    } catch (err: unknown) {
      console.error(err);
      toast('Gagal memuat data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item: TableRow) => {
    setEditingItem(toEditingItem(item));
    setEditModalOpen(true);
  };

  const handleSave = async () => {
    if (!editingItem) return;
    try {
      const coll = collectionForTab(activeTab);
      const { id, ...payload } = editingItem;
      await updateDoc(doc(db, coll, id), payload);
      toast('Data berhasil diperbarui', 'success');
      setEditModalOpen(false);
      setEditingItem(null);
      loadData();
    } catch (err: unknown) {
      console.error(err);
      toast('Gagal memperbarui data', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Yakin ingin menghapus data ini?')) return;
    try {
      await deleteDoc(doc(db, collectionForTab(activeTab), id));
      toast('Data berhasil dihapus', 'success');
      loadData();
    } catch (err: unknown) {
      console.error(err);
      toast('Gagal menghapus data', 'error');
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await updateDoc(doc(db, 'profiles', id), { status: 'active' });
      toast('User berhasil diaktifkan. Mereka sekarang bisa login.', 'success');
      loadData();
    } catch (err: unknown) {
      console.error(err);
      toast('Gagal mengaktifkan user', 'error');
    }
  };

  const handleReject = async (id: string) => {
    if (!confirm('Yakin ingin menolak pendaftaran user ini?')) return;
    try {
      await updateDoc(doc(db, 'profiles', id), { status: 'rejected' });
      toast('User ditolak.', 'success');
      loadData();
    } catch (err: unknown) {
      console.error(err);
      toast('Gagal menolak user', 'error');
    }
  };

  const handleCreateAdmin = async () => {
    if (!newAdminEmail || !newAdminPassword || !newAdminName) {
      toast('Semua field harus diisi', 'warning');
      return;
    }
    setCreatingAdmin(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        newAdminEmail,
        newAdminPassword
      );
      const uid = userCredential.user.uid;
      await setDoc(doc(db, 'profiles', uid), {
        id: uid,
        nama: newAdminName,
        role: 'super_admin',
        email: newAdminEmail,
        username: null,
        nisn: null,
        kelas_id: null,
        status: 'active',
        dibuat_pada: new Date().toISOString(),
      });
      toast('Super admin berhasil dibuat', 'success');
      setNewAdminEmail('');
      setNewAdminPassword('');
      setNewAdminName('');
      setEditModalOpen(false);
      loadData();
    } catch (err: unknown) {
      console.error(err);
      toast(getErrorMessage(err) || 'Gagal membuat super admin', 'error');
    } finally {
      setCreatingAdmin(false);
    }
  };

  const handleFieldChange = (key: string, raw: string, originalValue: unknown) => {
    if (!editingItem) return;
    let newValue: unknown = raw;
    try {
      if (typeof originalValue === 'object' && originalValue !== null) {
        newValue = JSON.parse(raw) as unknown;
      } else if (typeof originalValue === 'number') {
        newValue = Number(raw);
      }
    } catch {
      /* keep string */
    }
    setEditingItem({ ...editingItem, [key]: newValue });
  };

  /** Klik sidebar: update tab tanpa full reload */
  const selectTab = (tab: TabType) => {
    setActiveTab(tab);
    navigate(`/super-admin?tab=${tab}`, { replace: true });
  };

  const data: TableRow[] =
    activeTab === 'profiles' || activeTab === 'pending' || activeTab === 'admins'
      ? profiles
      : activeTab === 'kelas'
        ? kelas
        : activeTab === 'jawaban'
          ? jawaban
          : kegiatan;

  return (
    <DashboardLayout items={navItems} role="super_admin">
      <div className="space-y-6">
        {/* Header halaman */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">{TAB_TITLES[activeTab]}</h1>
            <p className="text-sm text-slate-500">
              {activeTab === 'pending'
                ? 'Setujui atau tolak pendaftaran guru & siswa.'
                : 'Kelola data sistem LajuNalar.'}
            </p>
          </div>
          {activeTab === 'admins' && (
            <button
              type="button"
              onClick={() => {
                setEditingItem(null);
                setEditModalOpen(true);
              }}
              className="btn-primary"
            >
              <Plus className="h-4 w-4" /> Tambah Admin
            </button>
          )}
        </div>

        {/* Tab chips (mobile-friendly, sinkron dengan sidebar) */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {(
            [
              { id: 'pending' as TabType, label: 'Menunggu', icon: Clock },
              { id: 'profiles' as TabType, label: 'Profiles', icon: Users },
              { id: 'kelas' as TabType, label: 'Kelas', icon: BookOpen },
              { id: 'jawaban' as TabType, label: 'Jawaban', icon: FileText },
              { id: 'kegiatan' as TabType, label: 'Kegiatan', icon: Activity },
              { id: 'admins' as TabType, label: 'Admins', icon: Shield },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => selectTab(t.id)}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold whitespace-nowrap transition ${
                activeTab === t.id
                  ? 'bg-purple-600 text-white shadow-soft'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              <t.icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          ))}
        </div>

        {activeTab === 'pending' && (
          <div className="card border-l-4 border-amber-400 bg-amber-50/40 text-sm text-slate-600">
            Guru dan siswa tanpa kode kelas valid muncul di sini. Siswa dengan{' '}
            <strong>kode undangan</strong> valid otomatis aktif.
          </div>
        )}

        {/* Landing Page Editor */}
        {activeTab === 'landing' && landingContent && (
          <div className="card space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-slate-800">Hero Section</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Judul Utama</label>
                  <input
                    type="text"
                    value={landingContent.hero_title}
                    onChange={(e) => setLandingContent({ ...landingContent, hero_title: e.target.value })}
                    className="input-base"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Subjudul</label>
                  <input
                    type="text"
                    value={landingContent.hero_subtitle}
                    onChange={(e) => setLandingContent({ ...landingContent, hero_subtitle: e.target.value })}
                    className="input-base"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Deskripsi</label>
                <textarea
                  value={landingContent.hero_description}
                  onChange={(e) => setLandingContent({ ...landingContent, hero_description: e.target.value })}
                  rows={3}
                  className="input-base"
                />
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Badge</label>
                  <input
                    type="text"
                    value={landingContent.hero_badge}
                    onChange={(e) => setLandingContent({ ...landingContent, hero_badge: e.target.value })}
                    className="input-base"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">CTA Primary</label>
                  <input
                    type="text"
                    value={landingContent.hero_cta_primary}
                    onChange={(e) => setLandingContent({ ...landingContent, hero_cta_primary: e.target.value })}
                    className="input-base"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">CTA Secondary</label>
                  <input
                    type="text"
                    value={landingContent.hero_cta_secondary}
                    onChange={(e) => setLandingContent({ ...landingContent, hero_cta_secondary: e.target.value })}
                    className="input-base"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-bold text-slate-800">Features Section</h3>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Judul</label>
                <input
                  type="text"
                  value={landingContent.features_title}
                  onChange={(e) => setLandingContent({ ...landingContent, features_title: e.target.value })}
                  className="input-base"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Deskripsi</label>
                <textarea
                  value={landingContent.features_description}
                  onChange={(e) => setLandingContent({ ...landingContent, features_description: e.target.value })}
                  rows={2}
                  className="input-base"
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-bold text-slate-800">Activities Section</h3>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Judul</label>
                <input
                  type="text"
                  value={landingContent.activities_title}
                  onChange={(e) => setLandingContent({ ...landingContent, activities_title: e.target.value })}
                  className="input-base"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Deskripsi</label>
                <textarea
                  value={landingContent.activities_description}
                  onChange={(e) => setLandingContent({ ...landingContent, activities_description: e.target.value })}
                  rows={2}
                  className="input-base"
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-bold text-slate-800">CTA Section</h3>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Judul</label>
                <input
                  type="text"
                  value={landingContent.cta_title}
                  onChange={(e) => setLandingContent({ ...landingContent, cta_title: e.target.value })}
                  className="input-base"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Deskripsi</label>
                <textarea
                  value={landingContent.cta_description}
                  onChange={(e) => setLandingContent({ ...landingContent, cta_description: e.target.value })}
                  rows={2}
                  className="input-base"
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">CTA Primary</label>
                  <input
                    type="text"
                    value={landingContent.cta_primary}
                    onChange={(e) => setLandingContent({ ...landingContent, cta_primary: e.target.value })}
                    className="input-base"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">CTA Secondary</label>
                  <input
                    type="text"
                    value={landingContent.cta_secondary}
                    onChange={(e) => setLandingContent({ ...landingContent, cta_secondary: e.target.value })}
                    className="input-base"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-bold text-slate-800">Hero Cards</h3>
              <div className="grid gap-4 md:grid-cols-2">
                {landingContent.hero_cards && Object.entries(landingContent.hero_cards).map(([key, card]) => (
                  <div key={key} className="space-y-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1 capitalize">{key}</label>
                    <input
                      type="text"
                      value={card.title}
                      onChange={(e) => setLandingContent({
                        ...landingContent,
                        hero_cards: {
                          ...landingContent.hero_cards,
                          [key]: { ...card, title: e.target.value }
                        }
                      })}
                      className="input-base mb-2"
                      placeholder="Title"
                    />
                    <textarea
                      value={card.description}
                      onChange={(e) => setLandingContent({
                        ...landingContent,
                        hero_cards: {
                          ...landingContent.hero_cards,
                          [key]: { ...card, description: e.target.value }
                        }
                      })}
                      rows={2}
                      className="input-base"
                      placeholder="Description"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-bold text-slate-800">Role Cards</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Siswa Items (satu per baris)</label>
                  <textarea
                    value={landingContent.role_siswa?.items?.join('\n') || ''}
                    onChange={(e) => setLandingContent({
                      ...landingContent,
                      role_siswa: {
                        ...landingContent.role_siswa,
                        items: e.target.value.split('\n').map(s => s.trim()).filter(Boolean)
                      }
                    })}
                    rows={4}
                    className="input-base"
                  />
                  <input
                    type="text"
                    value={landingContent.role_siswa?.cta_label || ''}
                    onChange={(e) => setLandingContent({
                      ...landingContent,
                      role_siswa: { ...landingContent.role_siswa, cta_label: e.target.value }
                    })}
                    className="input-base"
                    placeholder="CTA Label"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Guru Items (satu per baris)</label>
                  <textarea
                    value={landingContent.role_guru?.items?.join('\n') || ''}
                    onChange={(e) => setLandingContent({
                      ...landingContent,
                      role_guru: {
                        ...landingContent.role_guru,
                        items: e.target.value.split('\n').map(s => s.trim()).filter(Boolean)
                      }
                    })}
                    rows={4}
                    className="input-base"
                  />
                  <input
                    type="text"
                    value={landingContent.role_guru?.cta_label || ''}
                    onChange={(e) => setLandingContent({
                      ...landingContent,
                      role_guru: { ...landingContent.role_guru, cta_label: e.target.value }
                    })}
                    className="input-base"
                    placeholder="CTA Label"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-bold text-slate-800">Feature Cards</h3>
              <div className="space-y-3">
                {landingContent.feature_cards?.map((card, index) => (
                  <div key={index} className="grid gap-2 md:grid-cols-2 p-3 bg-slate-50 rounded-lg">
                    <input
                      type="text"
                      value={card.title}
                      onChange={(e) => {
                        const newCards = [...landingContent.feature_cards];
                        newCards[index] = { ...card, title: e.target.value };
                        setLandingContent({ ...landingContent, feature_cards: newCards });
                      }}
                      className="input-base"
                      placeholder="Title"
                    />
                    <input
                      type="text"
                      value={card.description}
                      onChange={(e) => {
                        const newCards = [...landingContent.feature_cards];
                        newCards[index] = { ...card, description: e.target.value };
                        setLandingContent({ ...landingContent, feature_cards: newCards });
                      }}
                      className="input-base"
                      placeholder="Description"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={async () => {
                  try {
                    await updateDoc(doc(db, 'landing_page', landingContent.id), {
                      ...landingContent,
                      diperbarui_pada: new Date().toISOString(),
                    });
                    toast('Konten landing page berhasil diperbarui', 'success');
                  } catch (err) {
                    console.error(err);
                    toast('Gagal memperbarui konten', 'error');
                  }
                }}
                className="btn-primary"
              >
                <Save className="h-4 w-4" /> Simpan Perubahan
              </button>
            </div>
          </div>
        )}

        {/* Konten tabel */}
        <div className="card overflow-hidden p-0">
          {loading ? (
            <div className="animate-pulse h-48 m-6 rounded-xl bg-slate-100" />
          ) : data.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={
                  activeTab === 'pending' ? (
                    <Clock className="h-7 w-7" />
                  ) : activeTab === 'kelas' ? (
                    <BookOpen className="h-7 w-7" />
                  ) : (
                    <LayoutDashboard className="h-7 w-7" />
                  )
                }
                title={activeTab === 'pending' ? 'Tidak ada user menunggu' : 'Tidak ada data'}
                description={
                  activeTab === 'pending'
                    ? 'Semua pendaftaran sudah diproses.'
                    : 'Belum ada data pada kategori ini.'
                }
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left">
                    {activeTab === 'profiles' && (
                      <>
                        <th className="px-4 py-3 font-semibold text-slate-700">Nama</th>
                        <th className="px-4 py-3 font-semibold text-slate-700">Role</th>
                        <th className="px-4 py-3 font-semibold text-slate-700">Email</th>
                        <th className="px-4 py-3 font-semibold text-slate-700">Status</th>
                        <th className="px-4 py-3 font-semibold text-slate-700">Kelas ID</th>
                      </>
                    )}
                    {activeTab === 'kelas' && (
                      <>
                        <th className="px-4 py-3 font-semibold text-slate-700">Nama Kelas</th>
                        <th className="px-4 py-3 font-semibold text-slate-700">Guru ID</th>
                        <th className="px-4 py-3 font-semibold text-slate-700">Kode Undangan</th>
                      </>
                    )}
                    {activeTab === 'jawaban' && (
                      <>
                        <th className="px-4 py-3 font-semibold text-slate-700">Kegiatan ID</th>
                        <th className="px-4 py-3 font-semibold text-slate-700">Siswa ID</th>
                        <th className="px-4 py-3 font-semibold text-slate-700">Status</th>
                        <th className="px-4 py-3 font-semibold text-slate-700">Skor</th>
                      </>
                    )}
                    {activeTab === 'kegiatan' && (
                      <>
                        <th className="px-4 py-3 font-semibold text-slate-700">Nomor</th>
                        <th className="px-4 py-3 font-semibold text-slate-700">Judul</th>
                        <th className="px-4 py-3 font-semibold text-slate-700">Deskripsi</th>
                      </>
                    )}
                    {activeTab === 'pending' && (
                      <>
                        <th className="px-4 py-3 font-semibold text-slate-700">Nama</th>
                        <th className="px-4 py-3 font-semibold text-slate-700">Role</th>
                        <th className="px-4 py-3 font-semibold text-slate-700">Email</th>
                        <th className="px-4 py-3 font-semibold text-slate-700">Username / NISN</th>
                        <th className="px-4 py-3 font-semibold text-slate-700">Dibuat</th>
                      </>
                    )}
                    {activeTab === 'admins' && (
                      <>
                        <th className="px-4 py-3 font-semibold text-slate-700">Nama</th>
                        <th className="px-4 py-3 font-semibold text-slate-700">Email</th>
                      </>
                    )}
                    <th className="px-4 py-3 text-right font-semibold text-slate-700">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((item) => (
                    <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50/80">
                      {activeTab === 'profiles' && (
                        <>
                          <td className="px-4 py-3 font-medium text-slate-800">
                            {(item as Profile).nama}
                          </td>
                          <td className="px-4 py-3">
                            <RoleBadge role={(item as Profile).role} />
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {(item as Profile).email || '-'}
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge status={(item as Profile).status} />
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-slate-500">
                            {(item as Profile).kelas_id || '-'}
                          </td>
                        </>
                      )}
                      {activeTab === 'kelas' && (
                        <>
                          <td className="px-4 py-3 font-medium text-slate-800">
                            {(item as Kelas).nama_kelas}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-slate-500">
                            {(item as Kelas).guru_id}
                          </td>
                          <td className="px-4 py-3">
                            <span className="chip font-mono">
                              {(item as Kelas).kode_undangan || '-'}
                            </span>
                          </td>
                        </>
                      )}
                      {activeTab === 'jawaban' && (
                        <>
                          <td className="px-4 py-3 font-mono text-xs">
                            {(item as Jawaban).kegiatan_id}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs">
                            {(item as Jawaban).siswa_id}
                          </td>
                          <td className="px-4 py-3">
                            <Badge
                              color={
                                (item as Jawaban).status === 'terkumpul'
                                  ? 'success'
                                  : (item as Jawaban).status === 'dinilai'
                                    ? 'teal'
                                    : 'amber'
                              }
                            >
                              {(item as Jawaban).status}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">{(item as Jawaban).skor ?? '-'}</td>
                        </>
                      )}
                      {activeTab === 'kegiatan' && (
                        <>
                          <td className="px-4 py-3">
                            <Link
                              to={`/super-admin/kegiatan/${item.id}`}
                              className="font-semibold text-brand-green hover:underline"
                            >
                              {(item as Kegiatan).nomor}
                            </Link>
                          </td>
                          <td className="px-4 py-3">
                            <Link
                              to={`/super-admin/kegiatan/${item.id}`}
                              className="font-medium text-slate-800 hover:text-brand-green transition"
                            >
                              {(item as Kegiatan).judul}
                            </Link>
                          </td>
                          <td className="px-4 py-3 text-slate-500 max-w-xs truncate">
                            {(item as Kegiatan).deskripsi || '-'}
                          </td>
                        </>
                      )}
                      {activeTab === 'pending' && (
                        <>
                          <td className="px-4 py-3 font-medium text-slate-800">
                            {(item as Profile).nama}
                          </td>
                          <td className="px-4 py-3">
                            <RoleBadge role={(item as Profile).role} />
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {(item as Profile).email || '-'}
                          </td>
                          <td className="px-4 py-3 text-slate-500">
                            {(item as Profile).username || (item as Profile).nisn || '-'}
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-400">
                            {(item as Profile).dibuat_pada
                              ? new Date((item as Profile).dibuat_pada).toLocaleString('id-ID')
                              : '-'}
                          </td>
                        </>
                      )}
                      {activeTab === 'admins' && (
                        <>
                          <td className="px-4 py-3 font-medium text-slate-800">
                            {(item as Profile).nama}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {(item as Profile).email}
                          </td>
                        </>
                      )}
                      <td className="px-4 py-3 text-right">
                        {activeTab === 'pending' ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleApprove(item.id)}
                              className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition"
                            >
                              <Check className="h-3.5 w-3.5" /> Aktifkan
                            </button>
                            <button
                              type="button"
                              onClick={() => handleReject(item.id)}
                              className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 transition"
                            >
                              <XCircle className="h-3.5 w-3.5" /> Tolak
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-0.5">
                            {activeTab === 'kegiatan' && (
                              <Link
                                to={`/super-admin/kegiatan/${item.id}`}
                                title="Lihat detail"
                                className="p-1.5 text-slate-400 hover:text-brand-green hover:bg-brand-green/10 rounded-lg transition"
                              >
                                <Eye className="h-4 w-4" />
                              </Link>
                            )}
                            <button
                              type="button"
                              onClick={() => handleEdit(item)}
                              className="p-1.5 text-slate-400 hover:text-brand-green hover:bg-brand-green/10 rounded-lg transition"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(item.id)}
                              className="p-1.5 text-slate-400 hover:text-danger hover:bg-danger/10 rounded-lg transition"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {editModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="card w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-float p-0">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h3 className="text-lg font-bold text-slate-800">
                {activeTab === 'admins' && !editingItem ? 'Tambah Super Admin' : 'Edit Data'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setEditModalOpen(false);
                  setEditingItem(null);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-5">
              {activeTab === 'admins' && !editingItem ? (
                <div className="space-y-4">
                  <div>
                    <label className="label-base">Nama</label>
                    <input
                      type="text"
                      value={newAdminName}
                      onChange={(e) => setNewAdminName(e.target.value)}
                      className="input-base"
                      placeholder="Nama lengkap"
                    />
                  </div>
                  <div>
                    <label className="label-base">Email</label>
                    <input
                      type="email"
                      value={newAdminEmail}
                      onChange={(e) => setNewAdminEmail(e.target.value)}
                      className="input-base"
                      placeholder="admin@contoh.com"
                    />
                  </div>
                  <div>
                    <label className="label-base">Password</label>
                    <input
                      type="password"
                      value={newAdminPassword}
                      onChange={(e) => setNewAdminPassword(e.target.value)}
                      className="input-base"
                      placeholder="••••••••"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleCreateAdmin}
                    disabled={creatingAdmin}
                    className="btn-primary w-full"
                  >
                    {creatingAdmin ? 'Membuat…' : 'Buat Super Admin'}
                  </button>
                </div>
              ) : (
                editingItem && (
                  <div className="space-y-4">
                    {Object.entries(editingItem).map(([key, value]) => {
                      if (key === 'id') return null;
                      return (
                        <div key={key}>
                          <label className="label-base capitalize">
                            {key.replace(/_/g, ' ')}
                          </label>
                          <textarea
                            value={
                              typeof value === 'object' && value !== null
                                ? JSON.stringify(value, null, 2)
                                : String(value ?? '')
                            }
                            onChange={(e) => handleFieldChange(key, e.target.value, value)}
                            rows={3}
                            className="input-base font-mono text-sm"
                          />
                        </div>
                      );
                    })}
                    <button type="button" onClick={handleSave} className="btn-primary w-full">
                      <Save className="h-4 w-4" /> Simpan Perubahan
                    </button>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

function RoleBadge({ role }: { role: Profile['role'] | string }) {
  const color =
    role === 'super_admin' ? 'purple' : role === 'guru' ? 'blue' : 'success';
  return <Badge color={color as 'purple' | 'blue' | 'success'}>{role}</Badge>;
}

function StatusBadge({ status }: { status?: Profile['status'] | string }) {
  const color =
    status === 'active' ? 'success' : status === 'pending' ? 'amber' : 'danger';
  return (
    <Badge color={color as 'success' | 'amber' | 'danger'}>{status || '-'}</Badge>
  );
}