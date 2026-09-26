import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  setDoc,
  query,
  where,
  orderBy,
} from "firebase/firestore";
import { createUserWithEmailAndPassword } from "firebase/auth";
import {
  db,
  auth,
  type Profile,
  type Kelas,
  type Jawaban,
  type Kegiatan,
  type LandingPageContent,
} from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { KegiatanForm } from "@/components/forms/KegiatanForm";
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
  FlaskConical,
  Atom,
  Link2,
  // ExternalLink,
  // Youtube,
} from "lucide-react";
import { Badge, EmptyState, MoleculeField } from "@/components/ui";

type TabType =
  | "pending"
  | "profiles"
  | "kelas"
  | "jawaban"
  | "kegiatan"
  | "materi"
  | "assessment"
  | "admins"
  | "questions"
  | "landing"
  | "about";

type MateriRow = {
  id: string;
  kelas_id?: string;
  kegiatan_id?: string;
  judul?: string;
  url?: string;
  deskripsi?: string | null;
  dibuat_oleh_guru_id?: string;
  dibuat_pada?: string;
  diperbarui_pada?: string | null;
};

type AssessmentRow = {
  id: string;
  kelas_id?: string;
  kegiatan_id?: string;
  judul_kuis?: string | null;
  url_kuis?: string;
  dibuat_oleh_guru_id?: string;
  diperbarui_pada?: string | null;
};

type EditingItem = {
  id: string;
  [key: string]: unknown;
};

type TableRow = Profile | Kelas | Jawaban | Kegiatan;

function collectionForTab(tab: TabType): string {
  if (tab === "pending" || tab === "admins") return "profiles";
  if (tab === "materi") return "materi_tambahan";
  if (tab === "assessment") return "assessment_eksternal";
  return tab;
}

function toEditingItem(item: TableRow): EditingItem {
  return { ...item } as EditingItem;
}

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return "Terjadi kesalahan";
}

/** Nav items — path dipakai sebagai id tab (DashboardLayout Link) */
const navItems = [
  {
    to: "/super-admin?tab=pending",
    label: "Menunggu",
    icon: <Clock className="h-5 w-5" />,
  },
  {
    to: "/super-admin?tab=profiles",
    label: "Profiles",
    icon: <Users className="h-5 w-5" />,
  },
  {
    to: "/super-admin?tab=kelas",
    label: "Kelas",
    icon: <BookOpen className="h-5 w-5" />,
  },
  {
    to: "/super-admin?tab=jawaban",
    label: "Jawaban",
    icon: <FileText className="h-5 w-5" />,
  },
  {
    to: "/super-admin?tab=kegiatan",
    label: "Kegiatan",
    icon: <Activity className="h-5 w-5" />,
  },
  {
    to: "/super-admin?tab=materi",
    label: "Materi",
    icon: <BookOpen className="h-5 w-5" />,
  },
  {
    to: "/super-admin?tab=assessment",
    label: "Tautan E-Assessment",
    icon: <Link2 className="h-5 w-5" />,
  },
  {
    to: "/super-admin?tab=admins",
    label: "Super Admins",
    icon: <Shield className="h-5 w-5" />,
  },
  {
    to: "/super-admin?tab=landing",
    label: "Landing Page",
    icon: <LayoutDashboard className="h-5 w-5" />,
  },
  {
    to: "/super-admin/questions",
    label: "Kelola Soal",
    icon: <FileText className="h-5 w-5" />,
  },
  {
    to: "/super-admin/about",
    label: "Kelola About",
    icon: <FileText className="h-5 w-5" />,
  },
];

const TAB_TITLES: Record<TabType, string> = {
  pending: "Menunggu Persetujuan",
  profiles: "Semua Profiles",
  kelas: "Kelas",
  jawaban: "Jawaban Siswa",
  kegiatan: "Kegiatan",
  materi: "Materi Tambahan",
  assessment: "Tautan E-Assessment",
  admins: "Super Admins",
  questions: "Kelola Soal",
  landing: "Konten Landing Page",
  about: "Konten About Page",
};

function parseTab(search: string): TabType {
  const q = new URLSearchParams(search).get("tab");
  const allowed: TabType[] = [
    "pending",
    "profiles",
    "kelas",
    "jawaban",
    "kegiatan",
    "materi",
    "assessment",
    "admins",
    "questions",
    "landing",
    "about",
  ];
  if (q && (allowed as string[]).includes(q)) return q as TabType;
  return "pending";
}

export function SuperAdminDashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [materiList, setMateriList] = useState<MateriRow[]>([]);
  const [materiJudul, setMateriJudul] = useState("");
  const [materiUrl, setMateriUrl] = useState("");
  const [materiDeskripsi, setMateriDeskripsi] = useState("");
  // const [materiKegiatanId, setMateriKegiatanId] = useState("");
  const [savingMateri, setSavingMateri] = useState(false);

  const [activeTab, setActiveTab] = useState<TabType>(() =>
    typeof window !== "undefined"
      ? parseTab(window.location.search)
      : "pending",
  );
  const [loading, setLoading] = useState(true);

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [kelas, setKelas] = useState<Kelas[]>([]);
  const [jawaban, setJawaban] = useState<Jawaban[]>([]);
  const [kegiatan, setKegiatan] = useState<Kegiatan[]>([]);
  const [landingContent, setLandingContent] =
    useState<LandingPageContent | null>(null);

  // const [materiList, setMateriList] = useState<MateriRow[]>([]);
  const [assessmentList, setAssessmentList] = useState<AssessmentRow[]>([]);
  const [detailItem, setDetailItem] = useState<
    (MateriRow | AssessmentRow) | null
  >(null);
  const [assessJudul, setAssessJudul] = useState("");
  const [assessUrl, setAssessUrl] = useState("");
  const [assessKelasIds, setAssessKelasIds] = useState<string[]>([]); // multi
  const [kelasAll, setKelasAll] = useState<Kelas[]>([]);
  const [savingAssess, setSavingAssess] = useState(false);
  const [detailType, setDetailType] = useState<"materi" | "assessment" | null>(
    null,
  );
  const [kelasMap, setKelasMap] = useState<
    Record<string, { nama: string; guru_id?: string }>
  >({});
  const [guruMap, setGuruMap] = useState<Record<string, string>>({}); // id → nama

  const [editingItem, setEditingItem] = useState<EditingItem | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);

  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminPassword, setNewAdminPassword] = useState("lkpd123");
  const [newAdminName, setNewAdminName] = useState("");
  const [newAdminRole, setNewAdminRole] = useState<
    "siswa" | "guru" | "super_admin"
  >("siswa");
  const [newAdminUsername, setNewAdminUsername] = useState("");
  const [newAdminNisn, setNewAdminNisn] = useState("");
  const [newAdminKelasId, setNewAdminKelasId] = useState("");
  const [creatingAdmin, setCreatingAdmin] = useState(false);

  const [showKegiatanForm, setShowKegiatanForm] = useState(false);

  function namaKelasList(a: AssessmentRow): string {
    const ids: string[] = Array.isArray((a as any).kelas_ids)
      ? (a as any).kelas_ids
      : (a as any).kelas_id
        ? [(a as any).kelas_id]
        : [];
    if (ids.length === 0) return "—";
    return ids.map((id) => kelasMap[id]?.nama || id).join(", ");
  }

  function namaGuruList(a: AssessmentRow): string {
    const ids: string[] = Array.isArray((a as any).kelas_ids)
      ? (a as any).kelas_ids
      : (a as any).kelas_id
        ? [(a as any).kelas_id]
        : [];
    if (ids.length === 0) return "—";
    const names = new Set<string>();
    ids.forEach((id) => {
      const gid = kelasMap[id]?.guru_id;
      if (gid) names.add(guruMap[gid] || gid);
    });
    // fallback: field lama dibuat_oleh_guru_id
    if (names.size === 0 && (a as any).dibuat_oleh_guru_id) {
      const gid = (a as any).dibuat_oleh_guru_id;
      names.add(guruMap[gid] || gid);
    }
    return names.size ? [...names].join(", ") : "—";
  }

  // Sync tab dari URL (saat klik sidebar Link)
  useEffect(() => {
    const onPop = () => setActiveTab(parseTab(window.location.search));
    window.addEventListener("popstate", onPop);
    // juga pantau klik navigasi react-router
    const id = setInterval(() => {
      const t = parseTab(window.location.search);
      setActiveTab((prev) => (prev !== t ? t : prev));
    }, 300);
    return () => {
      window.removeEventListener("popstate", onPop);
      clearInterval(id);
    };
  }, []);

  useEffect(() => {
    if (profile?.role !== "super_admin") {
      navigate("/super-admin/login");
      return;
    }
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, activeTab, navigate]);

  const loadData = async () => {
    setLoading(true);
    try {
      switch (activeTab) {
        case "profiles": {
          const snap = await getDocs(collection(db, "profiles"));
          setProfiles(
            snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Profile),
          );
          // Also load kelas for dropdown
          try {
            const kelasSnap = await getDocs(
              query(collection(db, "kelas"), orderBy("nama_kelas")),
            );
            setKelas(
              kelasSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Kelas),
            );
          } catch {
            const kelasSnap = await getDocs(collection(db, "kelas"));
            const list = kelasSnap.docs.map(
              (d) => ({ id: d.id, ...d.data() }) as Kelas,
            );
            list.sort((a, b) =>
              (a.nama_kelas || "").localeCompare(b.nama_kelas || "", "id"),
            );
            setKelas(list);
          }
          break;
        }
        case "kelas": {
          try {
            const snap = await getDocs(
              query(collection(db, "kelas"), orderBy("nama_kelas")),
            );
            setKelas(
              snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Kelas),
            );
          } catch {
            const snap = await getDocs(collection(db, "kelas"));
            const list = snap.docs.map(
              (d) => ({ id: d.id, ...d.data() }) as Kelas,
            );
            list.sort((a, b) =>
              (a.nama_kelas || "").localeCompare(b.nama_kelas || "", "id"),
            );
            setKelas(list);
          }
          break;
        }
        case "jawaban": {
          const snap = await getDocs(collection(db, "jawaban"));
          setJawaban(
            snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Jawaban),
          );
          break;
        }
        case "kegiatan": {
          const snap = await getDocs(collection(db, "kegiatan"));
          setKegiatan(
            snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Kegiatan),
          );
          break;
        }
        case "admins": {
          const snap = await getDocs(
            query(
              collection(db, "profiles"),
              where("role", "==", "super_admin"),
            ),
          );
          setProfiles(
            snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Profile),
          );
          break;
        }
        case "materi": {
          const snap = await getDocs(collection(db, "materi_tambahan"));
          const list = snap.docs.map(
            (d) => ({ id: d.id, ...d.data() }) as MateriRow,
          );
          list.sort((a, b) =>
            (b.dibuat_pada || "").localeCompare(a.dibuat_pada || ""),
          );
          setMateriList(list);
          break;
        }

        // di case 'assessment':
        case "assessment": {
          const [aSnap, kSnap, pSnap] = await Promise.all([
            getDocs(collection(db, "assessment_eksternal")),
            getDocs(collection(db, "kelas")),
            getDocs(
              query(collection(db, "profiles"), where("role", "==", "guru")),
            ),
          ]);

          const list = aSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
          list.sort((a: any, b: any) =>
            (b.diperbarui_pada || "").localeCompare(a.diperbarui_pada || ""),
          );
          setAssessmentList(list as AssessmentRow[]);

          const kMap: Record<string, { nama: string; guru_id?: string }> = {};
          kSnap.docs.forEach((d) => {
            const data = d.data();
            kMap[d.id] = {
              nama: data.nama_kelas || d.id,
              guru_id: data.guru_id,
            };
          });
          setKelasMap(kMap);
          setKelasAll(
            kSnap.docs
              .map((d) => ({ id: d.id, ...d.data() }) as Kelas)
              .sort((a, b) =>
                (a.nama_kelas || "").localeCompare(b.nama_kelas || "", "id"),
              ),
          );

          const gMap: Record<string, string> = {};
          pSnap.docs.forEach((d) => {
            gMap[d.id] = (d.data().nama as string) || d.id;
          });
          setGuruMap(gMap);
          break;
        }
        case "pending": {
          const snap = await getDocs(
            query(collection(db, "profiles"), where("status", "==", "pending")),
          );
          setProfiles(
            snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Profile),
          );
          break;
        }
        case "landing": {
          const defaultContent: LandingPageContent = {
            id: "default",
            hero_title: "LajuNalar",
            hero_subtitle: "E-LKPD Interaktif Laju Reaksi Berbasis PBL-ESD",
            hero_description:
              "Belajar laju reaksi lewat masalah dunia nyata — food waste, limbah cair, biomassa, dan biodiesel B35.",
            hero_badge: "Penelitian Tesis Magister UNS 2026",
            hero_cta_primary: "Mulai Belajar",
            hero_cta_secondary: "Tentang Produk",
            features_title: "Komponen Interaktif",
            features_description:
              "Bukan PDF statis — siswa mengisi, mengunggah, & berargumentasi langsung.",
            activities_title: "4 Kegiatan Belajar",
            activities_description:
              "Tiap kegiatan berbasis masalah ESD dengan warna identitas sendiri.",
            cta_title: "Siap mengasah penalaran kimiamu?",
            cta_description:
              "Buat akun dan mulai perjalanan belajar PBL-ESD sekarang.",
            cta_primary: "Daftar Gratis",
            cta_secondary: "Sudah punya akun",
            hero_cards: {
              submikroskopik: {
                title: "Submikroskopik",
                description: "Tumbukan partikel & energi aktivasi",
              },
              simbolik: {
                title: "Simbolik",
                description: "Persamaan & grafik laju reaksi",
              },
              makroskopik: {
                title: "Makroskopik",
                description: "Gejala reaksi yang teramati",
              },
              argumentasi: {
                title: "Argumentasi TAP",
                description: "Claim–Data–Warrant–Backing",
              },
            },
            role_siswa: {
              items: [
                "Peta progres 4 kegiatan",
                "Isi jawaban interaktif & upload file",
                "Akses kuis via embed & QR",
                "Riwayat & nilai",
              ],
              cta_label: "Daftar sebagai Siswa",
            },
            role_guru: {
              items: [
                "Kelola kelas & siswa",
                "Rekap progres per kegiatan",
                "Kelola link kuis eksternal",
                "Ekspor PDF individu & massal",
              ],
              cta_label: "Daftar sebagai Guru",
            },
            feature_cards: [
              {
                title: "Isian Otomatis",
                description: "Textarea auto-resize dengan autosave",
              },
              {
                title: "Tabel Isian",
                description: "Spreadsheet mini untuk hipotesis & data",
              },
              {
                title: "Upload File",
                description: "Drag & drop foto, PDF, dokumen",
              },
              {
                title: "Argumentasi TAP",
                description: "Diagram alur 6 komponen argumen",
              },
              {
                title: "Progress Tracker",
                description: "Stepper PBL & roadmap kegiatan",
              },
              {
                title: "E-Assessment",
                description: "Embed kuis + QR code otomatis",
              },
              {
                title: "Materi PBL-ESD",
                description: "Sintaks 1–5 & integrasi SDG",
              },
              {
                title: "Ekspor PDF",
                description: "Lembar jawaban rapi per siswa",
              },
            ],
            activity_cards: [
              {
                title: "Mengapa Makanan Cepat Basi?",
                description: "Pengaruh Suhu terhadap Laju Reaksi",
              },
              {
                title: "Dilema Limbah Cair Industri",
                description:
                  "Pengaruh Konsentrasi & Luas Permukaan terhadap Laju Reaksi",
              },
              {
                title: "Biomassa dan Energi Alternatif",
                description: "Pengaruh Katalis terhadap Laju Reaksi",
              },
              {
                title: "Menilik Efisiensi Biodiesel B35",
                description: "Persamaan Laju Reaksi dan Orde Reaksi",
              },
            ],
            diperbarui_pada: new Date().toISOString(),
          };

          const snap = await getDocs(collection(db, "landing_page"));
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
              feature_cards:
                dbData.feature_cards || defaultContent.feature_cards,
              activity_cards:
                dbData.activity_cards || defaultContent.activity_cards,
              id: snap.docs[0].id,
            } as LandingPageContent);
          } else {
            await setDoc(doc(db, "landing_page", "default"), defaultContent);
            setLandingContent(defaultContent);
          }
          break;
        }
      }
    } catch (err: unknown) {
      console.error(err);
      toast("Gagal memuat data", "error");
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
      toast("Data berhasil diperbarui", "success");
      setEditModalOpen(false);
      setEditingItem(null);
      loadData();
    } catch (err: unknown) {
      console.error(err);
      toast("Gagal memperbarui data", "error");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Yakin ingin menghapus data ini?")) return;
    try {
      await deleteDoc(doc(db, collectionForTab(activeTab), id));
      toast("Data berhasil dihapus", "success");
      loadData();
    } catch (err: unknown) {
      console.error(err);
      toast("Gagal menghapus data", "error");
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await updateDoc(doc(db, "profiles", id), { status: "active" });
      toast("User berhasil diaktifkan. Mereka sekarang bisa login.", "success");
      loadData();
    } catch (err: unknown) {
      console.error(err);
      toast("Gagal mengaktifkan user", "error");
    }
  };

  const handleReject = async (id: string) => {
    if (!confirm("Yakin ingin menolak pendaftaran user ini?")) return;
    try {
      await updateDoc(doc(db, "profiles", id), { status: "rejected" });
      toast("User ditolak.", "success");
      loadData();
    } catch (err: unknown) {
      console.error(err);
      toast("Gagal menolak user", "error");
    }
  };

  const handleCreateAdmin = async () => {
    if (!newAdminEmail || !newAdminPassword || !newAdminName) {
      toast("Nama, email, dan password harus diisi", "warning");
      return;
    }
    if (newAdminRole === "siswa" && !newAdminUsername) {
      toast("Username/NISN harus diisi untuk siswa", "warning");
      return;
    }
    setCreatingAdmin(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        newAdminEmail,
        newAdminPassword,
      );
      const uid = userCredential.user.uid;

      const profileData: Partial<Profile> = {
        id: uid,
        nama: newAdminName,
        role: newAdminRole,
        email: newAdminEmail,
        username: newAdminUsername || null,
        nisn: newAdminRole === "siswa" ? newAdminNisn || null : null,
        kelas_id: newAdminRole === "siswa" ? newAdminKelasId || null : null,
        status: "active",
        dibuat_pada: new Date().toISOString(),
      };

      await setDoc(doc(db, "profiles", uid), profileData);
      toast(
        `User ${newAdminRole} berhasil dibuat dengan password: lkpd123`,
        "success",
      );

      // Reset form
      setNewAdminEmail("");
      setNewAdminPassword("lkpd123");
      setNewAdminName("");
      setNewAdminRole("siswa");
      setNewAdminUsername("");
      setNewAdminNisn("");
      setNewAdminKelasId("");
      setEditModalOpen(false);
      loadData();
    } catch (err: unknown) {
      console.error(err);
      toast(getErrorMessage(err) || "Gagal membuat user", "error");
    } finally {
      setCreatingAdmin(false);
    }
  };

  const handleFieldChange = (
    key: string,
    raw: string,
    originalValue: unknown,
  ) => {
    if (!editingItem) return;
    let newValue: unknown = raw;
    try {
      if (typeof originalValue === "object" && originalValue !== null) {
        newValue = JSON.parse(raw) as unknown;
      } else if (typeof originalValue === "number") {
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
    activeTab === "profiles" ||
    activeTab === "pending" ||
    activeTab === "admins"
      ? profiles
      : activeTab === "kelas"
        ? kelas
        : activeTab === "jawaban"
          ? jawaban
          : activeTab === "kegiatan"
            ? kegiatan
            : [];

  return (
    <DashboardLayout items={navItems} role="super_admin">
      <div className="relative min-h-[calc(100vh-140px)] overflow-hidden rounded-3xl bg-slate-50/40 p-4 sm:p-6 md:p-8 border border-slate-100/80 shadow-soft">
        <MoleculeField className="opacity-70" />
        {/* Soft Ambient background glows */}
        <div className="absolute top-10 left-10 w-72 h-72 bg-purple-100/35 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-20 right-20 w-80 h-80 bg-brand-teal-light/40 rounded-full blur-3xl pointer-events-none" />
        {/* Dotted sains grid pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:20px_20px] opacity-40 pointer-events-none" />

        {/* Floating Science Doodles */}
        <div className="absolute -left-2 top-32 hidden xl:block text-purple-600/10 animate-float-slow pointer-events-none">
          <FlaskConical className="h-16 w-16" />
        </div>
        <div className="absolute -right-2 top-72 hidden xl:block text-brand-teal/15 animate-float-slower pointer-events-none">
          <Atom className="h-20 w-20" />
        </div>

        <div className="relative z-10 space-y-6">
          {/* Header halaman */}
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">
                {TAB_TITLES[activeTab]}
              </h1>
              <p className="text-sm text-slate-500">
                {activeTab === "pending"
                  ? "Setujui atau tolak pendaftaran guru & siswa."
                  : "Kelola data sistem LajuNalar."}
              </p>
            </div>
            {activeTab === "admins" && (
              <button
                type="button"
                onClick={() => {
                  setEditingItem(null);
                  setEditModalOpen(true);
                }}
                className="btn-primary">
                <Plus className="h-4 w-4" /> Tambah Admin
              </button>
            )}
            {activeTab === "profiles" && (
              <button
                type="button"
                onClick={() => {
                  setEditingItem(null);
                  setEditModalOpen(true);
                }}
                className="btn-primary">
                <Plus className="h-4 w-4" /> Tambah User
              </button>
            )}
          </div>

          {/* Tab chips (mobile-friendly, sinkron dengan sidebar) */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {(
              [
                { id: "pending" as TabType, label: "Menunggu", icon: Clock },
                { id: "profiles" as TabType, label: "Profiles", icon: Users },
                { id: "kelas" as TabType, label: "Kelas", icon: BookOpen },
                { id: "jawaban" as TabType, label: "Jawaban", icon: FileText },
                {
                  id: "kegiatan" as TabType,
                  label: "Kegiatan",
                  icon: Activity,
                },
                { id: "materi" as TabType, label: "Materi", icon: BookOpen },
                {
                  id: "assessment" as TabType,
                  label: "E-Assessment",
                  icon: Link2,
                },
                { id: "admins" as TabType, label: "Admins", icon: Shield },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => selectTab(t.id)}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold whitespace-nowrap transition ${
                  activeTab === t.id
                    ? "bg-purple-600 text-white shadow-soft"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                }`}>
                <t.icon className="h-3.5 w-3.5" />
                {t.label}
              </button>
            ))}
          </div>

          {activeTab === "pending" && (
            <div className="card border-l-4 border-amber-400 bg-amber-50/40 text-sm text-slate-600">
              Guru dan siswa tanpa kode kelas valid muncul di sini. Siswa dengan{" "}
              <strong>kode undangan</strong> valid otomatis aktif.
            </div>
          )}
          {activeTab === "profiles" && (
            <div className="card border-l-4 border-purple-400 bg-purple-50/40 text-sm text-slate-600">
              Kelola semua user dan tambahkan user baru dengan berbagai role.
              Password default adalah <strong>lkpd123</strong>.
            </div>
          )}

          {/* Landing Page Editor */}
          {activeTab === "landing" && landingContent && (
            <div className="card space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-slate-800">
                  Hero Section
                </h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Judul Utama
                    </label>
                    <input
                      type="text"
                      value={landingContent.hero_title}
                      onChange={(e) =>
                        setLandingContent({
                          ...landingContent,
                          hero_title: e.target.value,
                        })
                      }
                      className="input-base"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Subjudul
                    </label>
                    <input
                      type="text"
                      value={landingContent.hero_subtitle}
                      onChange={(e) =>
                        setLandingContent({
                          ...landingContent,
                          hero_subtitle: e.target.value,
                        })
                      }
                      className="input-base"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Deskripsi
                  </label>
                  <textarea
                    value={landingContent.hero_description}
                    onChange={(e) =>
                      setLandingContent({
                        ...landingContent,
                        hero_description: e.target.value,
                      })
                    }
                    rows={3}
                    className="input-base"
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Badge
                    </label>
                    <input
                      type="text"
                      value={landingContent.hero_badge}
                      onChange={(e) =>
                        setLandingContent({
                          ...landingContent,
                          hero_badge: e.target.value,
                        })
                      }
                      className="input-base"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      CTA Primary
                    </label>
                    <input
                      type="text"
                      value={landingContent.hero_cta_primary}
                      onChange={(e) =>
                        setLandingContent({
                          ...landingContent,
                          hero_cta_primary: e.target.value,
                        })
                      }
                      className="input-base"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      CTA Secondary
                    </label>
                    <input
                      type="text"
                      value={landingContent.hero_cta_secondary}
                      onChange={(e) =>
                        setLandingContent({
                          ...landingContent,
                          hero_cta_secondary: e.target.value,
                        })
                      }
                      className="input-base"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-bold text-slate-800">
                  Features Section
                </h3>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Judul
                  </label>
                  <input
                    type="text"
                    value={landingContent.features_title}
                    onChange={(e) =>
                      setLandingContent({
                        ...landingContent,
                        features_title: e.target.value,
                      })
                    }
                    className="input-base"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Deskripsi
                  </label>
                  <textarea
                    value={landingContent.features_description}
                    onChange={(e) =>
                      setLandingContent({
                        ...landingContent,
                        features_description: e.target.value,
                      })
                    }
                    rows={2}
                    className="input-base"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-bold text-slate-800">
                  Activities Section
                </h3>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Judul
                  </label>
                  <input
                    type="text"
                    value={landingContent.activities_title}
                    onChange={(e) =>
                      setLandingContent({
                        ...landingContent,
                        activities_title: e.target.value,
                      })
                    }
                    className="input-base"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Deskripsi
                  </label>
                  <textarea
                    value={landingContent.activities_description}
                    onChange={(e) =>
                      setLandingContent({
                        ...landingContent,
                        activities_description: e.target.value,
                      })
                    }
                    rows={2}
                    className="input-base"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-bold text-slate-800">
                  CTA Section
                </h3>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Judul
                  </label>
                  <input
                    type="text"
                    value={landingContent.cta_title}
                    onChange={(e) =>
                      setLandingContent({
                        ...landingContent,
                        cta_title: e.target.value,
                      })
                    }
                    className="input-base"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Deskripsi
                  </label>
                  <textarea
                    value={landingContent.cta_description}
                    onChange={(e) =>
                      setLandingContent({
                        ...landingContent,
                        cta_description: e.target.value,
                      })
                    }
                    rows={2}
                    className="input-base"
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      CTA Primary
                    </label>
                    <input
                      type="text"
                      value={landingContent.cta_primary}
                      onChange={(e) =>
                        setLandingContent({
                          ...landingContent,
                          cta_primary: e.target.value,
                        })
                      }
                      className="input-base"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      CTA Secondary
                    </label>
                    <input
                      type="text"
                      value={landingContent.cta_secondary}
                      onChange={(e) =>
                        setLandingContent({
                          ...landingContent,
                          cta_secondary: e.target.value,
                        })
                      }
                      className="input-base"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-bold text-slate-800">Hero Cards</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  {landingContent.hero_cards &&
                    Object.entries(landingContent.hero_cards).map(
                      ([key, card]) => (
                        <div key={key} className="space-y-2">
                          <label className="block text-sm font-medium text-slate-700 mb-1 capitalize">
                            {key}
                          </label>
                          <input
                            type="text"
                            value={card.title}
                            onChange={(e) =>
                              setLandingContent({
                                ...landingContent,
                                hero_cards: {
                                  ...landingContent.hero_cards,
                                  [key]: { ...card, title: e.target.value },
                                },
                              })
                            }
                            className="input-base mb-2"
                            placeholder="Title"
                          />
                          <textarea
                            value={card.description}
                            onChange={(e) =>
                              setLandingContent({
                                ...landingContent,
                                hero_cards: {
                                  ...landingContent.hero_cards,
                                  [key]: {
                                    ...card,
                                    description: e.target.value,
                                  },
                                },
                              })
                            }
                            rows={2}
                            className="input-base"
                            placeholder="Description"
                          />
                        </div>
                      ),
                    )}
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-bold text-slate-800">Role Cards</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Siswa Items (satu per baris)
                    </label>
                    <textarea
                      value={landingContent.role_siswa?.items?.join("\n") || ""}
                      onChange={(e) =>
                        setLandingContent({
                          ...landingContent,
                          role_siswa: {
                            ...landingContent.role_siswa,
                            items: e.target.value
                              .split("\n")
                              .map((s) => s.trim())
                              .filter(Boolean),
                          },
                        })
                      }
                      rows={4}
                      className="input-base"
                    />
                    <input
                      type="text"
                      value={landingContent.role_siswa?.cta_label || ""}
                      onChange={(e) =>
                        setLandingContent({
                          ...landingContent,
                          role_siswa: {
                            ...landingContent.role_siswa,
                            cta_label: e.target.value,
                          },
                        })
                      }
                      className="input-base"
                      placeholder="CTA Label"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Guru Items (satu per baris)
                    </label>
                    <textarea
                      value={landingContent.role_guru?.items?.join("\n") || ""}
                      onChange={(e) =>
                        setLandingContent({
                          ...landingContent,
                          role_guru: {
                            ...landingContent.role_guru,
                            items: e.target.value
                              .split("\n")
                              .map((s) => s.trim())
                              .filter(Boolean),
                          },
                        })
                      }
                      rows={4}
                      className="input-base"
                    />
                    <input
                      type="text"
                      value={landingContent.role_guru?.cta_label || ""}
                      onChange={(e) =>
                        setLandingContent({
                          ...landingContent,
                          role_guru: {
                            ...landingContent.role_guru,
                            cta_label: e.target.value,
                          },
                        })
                      }
                      className="input-base"
                      placeholder="CTA Label"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-bold text-slate-800">
                  Feature Cards
                </h3>
                <div className="space-y-3">
                  {landingContent.feature_cards?.map((card, index) => (
                    <div
                      key={index}
                      className="grid gap-2 md:grid-cols-2 p-3 bg-slate-50 rounded-lg">
                      <input
                        type="text"
                        value={card.title}
                        onChange={(e) => {
                          const newCards = [...landingContent.feature_cards];
                          newCards[index] = { ...card, title: e.target.value };
                          setLandingContent({
                            ...landingContent,
                            feature_cards: newCards,
                          });
                        }}
                        className="input-base"
                        placeholder="Title"
                      />
                      <input
                        type="text"
                        value={card.description}
                        onChange={(e) => {
                          const newCards = [...landingContent.feature_cards];
                          newCards[index] = {
                            ...card,
                            description: e.target.value,
                          };
                          setLandingContent({
                            ...landingContent,
                            feature_cards: newCards,
                          });
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
                      await updateDoc(
                        doc(db, "landing_page", landingContent.id),
                        {
                          ...landingContent,
                          diperbarui_pada: new Date().toISOString(),
                        },
                      );
                      toast(
                        "Konten landing page berhasil diperbarui",
                        "success",
                      );
                    } catch (err) {
                      console.error(err);
                      toast("Gagal memperbarui konten", "error");
                    }
                  }}
                  className="btn-primary">
                  <Save className="h-4 w-4" /> Simpan Perubahan
                </button>
              </div>
            </div>
          )}

          {/* ===== MATERI TAMBAHAN ===== */}
          {activeTab === "materi" && (
            <div className="space-y-4">
              <div className="card space-y-3">
                <h3 className="text-lg font-bold text-slate-800">
                  Tambah Materi
                </h3>
                <p className="text-xs text-slate-500">
                  Materi tampil untuk semua guru & siswa (tanpa terikat
                  kegiatan).
                </p>

                <div>
                  <label className="label-base">Judul</label>
                  <input
                    className="input-base"
                    value={materiJudul}
                    onChange={(e) => setMateriJudul(e.target.value)}
                    placeholder="Judul materi"
                  />
                </div>

                <div>
                  <label className="label-base">
                    URL (PDF / YouTube / link lain)
                  </label>
                  <input
                    className="input-base"
                    value={materiUrl}
                    onChange={(e) => setMateriUrl(e.target.value)}
                    placeholder="https://..."
                  />
                </div>

                <div>
                  <label className="label-base">Deskripsi (opsional)</label>
                  <textarea
                    className="input-base"
                    rows={2}
                    value={materiDeskripsi}
                    onChange={(e) => setMateriDeskripsi(e.target.value)}
                  />
                </div>

                <button
                  type="button"
                  disabled={savingMateri}
                  className="btn-primary"
                  onClick={async () => {
                    if (!materiJudul.trim() || !materiUrl.trim()) {
                      toast("Judul dan URL wajib diisi", "warning");
                      return;
                    }
                    try {
                      new URL(materiUrl.trim());
                    } catch {
                      toast("URL tidak valid", "error");
                      return;
                    }
                    setSavingMateri(true);
                    try {
                      const now = new Date().toISOString();
                      await setDoc(doc(collection(db, "materi_tambahan")), {
                        // tanpa kegiatan_id & tanpa kelas_id
                        judul: materiJudul.trim(),
                        url: materiUrl.trim(),
                        deskripsi: materiDeskripsi.trim() || null,
                        dibuat_oleh_guru_id: profile?.id || null,
                        dibuat_oleh_role: "super_admin",
                        dibuat_pada: now,
                        diperbarui_pada: now,
                      });
                      toast("Materi ditambahkan", "success");
                      setMateriJudul("");
                      setMateriUrl("");
                      setMateriDeskripsi("");
                      loadData();
                    } catch (err) {
                      console.error(err);
                      toast("Gagal menambah materi", "error");
                    } finally {
                      setSavingMateri(false);
                    }
                  }}>
                  <Plus className="h-4 w-4" />
                  {savingMateri ? "Menyimpan…" : "Tambah Materi"}
                </button>
              </div>

              {/* Tabel list materi — kolom Kegiatan ID bisa dihapus */}
              <div className="card overflow-hidden p-0">
                {loading ? (
                  <div className="animate-pulse h-48 m-6 rounded-xl bg-slate-100" />
                ) : materiList.length === 0 ? (
                  <div className="p-6">
                    <EmptyState
                      icon={<BookOpen className="h-7 w-7" />}
                      title="Belum ada materi"
                      description="Tambahkan materi di form di atas."
                    />
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-left">
                          <th className="px-4 py-3 font-semibold text-slate-700">
                            Judul
                          </th>
                          <th className="px-4 py-3 font-semibold text-slate-700">
                            URL
                          </th>
                          <th className="px-4 py-3 font-semibold text-slate-700">
                            Dibuat
                          </th>
                          <th className="px-4 py-3 text-right font-semibold text-slate-700">
                            Aksi
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {materiList.map((m) => (
                          <tr
                            key={m.id}
                            className="border-b border-slate-100 hover:bg-slate-50/80">
                            <td className="px-4 py-3 font-medium text-slate-800">
                              {m.judul || "-"}
                            </td>
                            <td className="px-4 py-3 max-w-[220px] truncate text-xs">
                              <a
                                href={m.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-brand-green hover:underline">
                                {m.url || "-"}
                              </a>
                            </td>
                            <td className="px-4 py-3 text-xs text-slate-400">
                              {m.dibuat_pada
                                ? new Date(m.dibuat_pada).toLocaleString(
                                    "id-ID",
                                  )
                                : "-"}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button
                                type="button"
                                onClick={async () => {
                                  if (!confirm("Hapus materi ini?")) return;
                                  try {
                                    await deleteDoc(
                                      doc(db, "materi_tambahan", m.id),
                                    );
                                    toast("Materi dihapus", "success");
                                    setMateriList((prev) =>
                                      prev.filter((x) => x.id !== m.id),
                                    );
                                  } catch {
                                    toast("Gagal menghapus", "error");
                                  }
                                }}
                                className="p-1.5 text-slate-400 hover:text-danger hover:bg-danger/10 rounded-lg">
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ===== TAUtan E-ASSESSMENT ===== */}
          {activeTab === "assessment" && (
            <div className="card overflow-hidden p-0">
              {loading ? (
                <div className="animate-pulse h-48 m-6 rounded-xl bg-slate-100" />
              ) : assessmentList.length === 0 ? (
                <div className="p-6">
                  <EmptyState
                    icon={<Link2 className="h-7 w-7" />}
                    title="Belum ada tautan"
                    description="Guru belum menambahkan tautan e-assessment."
                  />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-left">
                        <th className="px-4 py-3 font-semibold text-slate-700">
                          Judul Kuis
                        </th>
                        <th className="px-4 py-3 font-semibold text-slate-700">
                          URL
                        </th>
                        <th className="px-4 py-3 font-semibold text-slate-700">
                          Kelas
                        </th>
                        <th className="px-4 py-3 font-semibold text-slate-700">
                          Kegiatan ID
                        </th>
                        <th className="px-4 py-3 font-semibold text-slate-700">
                          Guru
                        </th>
                        <th className="px-4 py-3 font-semibold text-slate-700">
                          Diperbarui
                        </th>
                        <th className="px-4 py-3 text-right font-semibold text-slate-700">
                          Aksi
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {assessmentList.map((a) => (
                        <tr
                          key={a.id}
                          className="border-b border-slate-100 hover:bg-slate-50/80">
                          <td className="px-4 py-3 font-medium text-slate-800">
                            {a.judul_kuis || "-"}
                          </td>
                          <td className="px-4 py-3 max-w-[200px] truncate">
                            <a
                              href={a.url_kuis}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-brand-green hover:underline text-xs">
                              {a.url_kuis || "-"}
                            </a>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-700">
                            {namaKelasList(a)}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-slate-500">
                            {a.kegiatan_id || "-"}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-700">
                            {namaGuruList(a)}
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-400">
                            {a.diperbarui_pada
                              ? new Date(a.diperbarui_pada).toLocaleString(
                                  "id-ID",
                                )
                              : "-"}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-0.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setDetailItem(a);
                                  setDetailType("assessment");
                                }}
                                className="p-1.5 text-slate-400 hover:text-brand-green hover:bg-brand-green/10 rounded-lg transition"
                                title="Detail">
                                <Eye className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={async () => {
                                  if (
                                    !confirm("Hapus tautan e-assessment ini?")
                                  )
                                    return;
                                  try {
                                    await deleteDoc(
                                      doc(db, "assessment_eksternal", a.id),
                                    );
                                    toast("Tautan dihapus", "success");
                                    setAssessmentList((prev) =>
                                      prev.filter((x) => x.id !== a.id),
                                    );
                                  } catch (err) {
                                    console.error(err);
                                    toast("Gagal menghapus", "error");
                                  }
                                }}
                                className="p-1.5 text-slate-400 hover:text-danger hover:bg-danger/10 rounded-lg transition"
                                title="Hapus">
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Form tambah */}
          <div className="card space-y-3">
            <h3 className="text-lg font-bold text-slate-800">
              Tambah E-Assessment
            </h3>

            <div>
              <label className="label-base">Judul Kuis</label>
              <input
                className="input-base"
                value={assessJudul}
                onChange={(e) => setAssessJudul(e.target.value)}
                placeholder="Contoh: Kuis Formatif Minggu 1"
              />
            </div>

            <div>
              <label className="label-base">URL Kuis</label>
              <input
                className="input-base"
                value={assessUrl}
                onChange={(e) => setAssessUrl(e.target.value)}
                placeholder="https://forms.gle/... atau https://quizizz.com/..."
              />
            </div>

            <div>
              <label className="label-base">
                Kelas (pilih satu atau lebih)
              </label>
              <div className="mt-1 max-h-48 overflow-y-auto rounded-xl border border-slate-200 p-2 space-y-1">
                {kelasAll.length === 0 ? (
                  <p className="text-xs text-slate-400 px-1">
                    Belum ada kelas.
                  </p>
                ) : (
                  kelasAll.map((k) => {
                    const checked = assessKelasIds.includes(k.id);
                    return (
                      <label
                        key={k.id}
                        className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-slate-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            setAssessKelasIds((prev) =>
                              checked
                                ? prev.filter((id) => id !== k.id)
                                : [...prev, k.id],
                            );
                          }}
                          className="rounded border-slate-300"
                        />
                        <span>{k.nama_kelas}</span>
                      </label>
                    );
                  })
                )}
              </div>
              <p className="mt-1 text-xs text-slate-400">
                {assessKelasIds.length} kelas dipilih
              </p>
            </div>

            <button
              type="button"
              disabled={savingAssess}
              className="btn-primary"
              onClick={async () => {
                if (!assessJudul.trim() || !assessUrl.trim()) {
                  toast("Judul dan URL wajib diisi", "warning");
                  return;
                }
                if (assessKelasIds.length === 0) {
                  toast("Pilih minimal satu kelas", "warning");
                  return;
                }
                try {
                  new URL(assessUrl.trim());
                } catch {
                  toast("URL tidak valid", "error");
                  return;
                }
                setSavingAssess(true);
                try {
                  await setDoc(doc(collection(db, "assessment_eksternal")), {
                    judul_kuis: assessJudul.trim(),
                    url_kuis: assessUrl.trim(),
                    kelas_ids: assessKelasIds, // ← array multi-kelas
                    dibuat_oleh_role: "super_admin",
                    dibuat_oleh_guru_id: profile?.id || null,
                    diperbarui_pada: new Date().toISOString(),
                  });
                  toast("E-Assessment ditambahkan", "success");
                  setAssessJudul("");
                  setAssessUrl("");
                  setAssessKelasIds([]);
                  loadData();
                } catch (err) {
                  console.error(err);
                  toast("Gagal menyimpan", "error");
                } finally {
                  setSavingAssess(false);
                }
              }}>
              <Plus className="h-4 w-4" />
              {savingAssess ? "Menyimpan…" : "Tambah Assessment"}
            </button>
          </div>

          {/* Konten tabel */}
          <div className="card overflow-hidden p-0">
            {activeTab === "kegiatan" && (
              <div className="p-4 border-b border-slate-200 flex justify-end">
                <button
                  onClick={() => setShowKegiatanForm(true)}
                  className="btn-primary text-sm">
                  <Plus className="h-4 w-4" /> Tambah Kegiatan
                </button>
              </div>
            )}
            {showKegiatanForm && (
              <div className="p-6">
                <KegiatanForm
                  onSuccess={() => {
                    setShowKegiatanForm(false);
                    loadData();
                  }}
                  onCancel={() => setShowKegiatanForm(false)}
                />
              </div>
            )}
            {loading ? (
              <div className="animate-pulse h-48 m-6 rounded-xl bg-slate-100" />
            ) : data.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  icon={
                    activeTab === "pending" ? (
                      <Clock className="h-7 w-7" />
                    ) : activeTab === "kelas" ? (
                      <BookOpen className="h-7 w-7" />
                    ) : (
                      <LayoutDashboard className="h-7 w-7" />
                    )
                  }
                  title={
                    activeTab === "pending"
                      ? "Tidak ada user menunggu"
                      : "Tidak ada data"
                  }
                  description={
                    activeTab === "pending"
                      ? "Semua pendaftaran sudah diproses."
                      : "Belum ada data pada kategori ini."
                  }
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-left">
                      {activeTab === "profiles" && (
                        <>
                          <th className="px-4 py-3 font-semibold text-slate-700">
                            Nama
                          </th>
                          <th className="px-4 py-3 font-semibold text-slate-700">
                            Role
                          </th>
                          <th className="px-4 py-3 font-semibold text-slate-700">
                            Email
                          </th>
                          <th className="px-4 py-3 font-semibold text-slate-700">
                            Status
                          </th>
                          <th className="px-4 py-3 font-semibold text-slate-700">
                            Kelas ID
                          </th>
                        </>
                      )}
                      {activeTab === "kelas" && (
                        <>
                          <th className="px-4 py-3 font-semibold text-slate-700">
                            Nama Kelas
                          </th>
                          <th className="px-4 py-3 font-semibold text-slate-700">
                            Guru ID
                          </th>
                          <th className="px-4 py-3 font-semibold text-slate-700">
                            Kode Undangan
                          </th>
                        </>
                      )}
                      {activeTab === "jawaban" && (
                        <>
                          <th className="px-4 py-3 font-semibold text-slate-700">
                            Kegiatan ID
                          </th>
                          <th className="px-4 py-3 font-semibold text-slate-700">
                            Siswa ID
                          </th>
                          <th className="px-4 py-3 font-semibold text-slate-700">
                            Status
                          </th>
                          <th className="px-4 py-3 font-semibold text-slate-700">
                            Skor
                          </th>
                        </>
                      )}
                      {activeTab === "kegiatan" && (
                        <>
                          <th className="px-4 py-3 font-semibold text-slate-700">
                            Nomor
                          </th>
                          <th className="px-4 py-3 font-semibold text-slate-700">
                            Judul
                          </th>
                          <th className="px-4 py-3 font-semibold text-slate-700">
                            Deskripsi
                          </th>
                        </>
                      )}
                      {activeTab === "pending" && (
                        <>
                          <th className="px-4 py-3 font-semibold text-slate-700">
                            Nama
                          </th>
                          <th className="px-4 py-3 font-semibold text-slate-700">
                            Role
                          </th>
                          <th className="px-4 py-3 font-semibold text-slate-700">
                            Email
                          </th>
                          <th className="px-4 py-3 font-semibold text-slate-700">
                            Username / NISN
                          </th>
                          <th className="px-4 py-3 font-semibold text-slate-700">
                            Dibuat
                          </th>
                        </>
                      )}
                      {activeTab === "admins" && (
                        <>
                          <th className="px-4 py-3 font-semibold text-slate-700">
                            Nama
                          </th>
                          <th className="px-4 py-3 font-semibold text-slate-700">
                            Email
                          </th>
                        </>
                      )}
                      <th className="px-4 py-3 text-right font-semibold text-slate-700">
                        Aksi
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((item) => (
                      <tr
                        key={item.id}
                        className="border-b border-slate-100 hover:bg-slate-50/80">
                        {activeTab === "profiles" && (
                          <>
                            <td className="px-4 py-3 font-medium text-slate-800">
                              {(item as Profile).nama}
                            </td>
                            <td className="px-4 py-3">
                              <RoleBadge role={(item as Profile).role} />
                            </td>
                            <td className="px-4 py-3 text-slate-600">
                              {(item as Profile).email || "-"}
                            </td>
                            <td className="px-4 py-3">
                              <StatusBadge status={(item as Profile).status} />
                            </td>
                            <td className="px-4 py-3 font-mono text-xs text-slate-500">
                              {(item as Profile).kelas_id || "-"}
                            </td>
                          </>
                        )}
                        {activeTab === "kelas" && (
                          <>
                            <td className="px-4 py-3 font-medium text-slate-800">
                              {(item as Kelas).nama_kelas}
                            </td>
                            <td className="px-4 py-3 font-mono text-xs text-slate-500">
                              {(item as Kelas).guru_id}
                            </td>
                            <td className="px-4 py-3">
                              <span className="chip font-mono">
                                {(item as Kelas).kode_undangan || "-"}
                              </span>
                            </td>
                          </>
                        )}
                        {activeTab === "jawaban" && (
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
                                  (item as Jawaban).status === "terkumpul"
                                    ? "success"
                                    : (item as Jawaban).status === "dinilai"
                                      ? "teal"
                                      : "amber"
                                }>
                                {(item as Jawaban).status}
                              </Badge>
                            </td>
                            <td className="px-4 py-3">
                              {(item as Jawaban).skor ?? "-"}
                            </td>
                          </>
                        )}
                        {activeTab === "kegiatan" && (
                          <>
                            <td className="px-4 py-3">
                              <Link
                                to={`/super-admin/kegiatan/${item.id}`}
                                className="font-semibold text-brand-green hover:underline">
                                {(item as Kegiatan).nomor}
                              </Link>
                            </td>
                            <td className="px-4 py-3">
                              <Link
                                to={`/super-admin/kegiatan/${item.id}`}
                                className="font-medium text-slate-800 hover:text-brand-green transition">
                                {(item as Kegiatan).judul}
                              </Link>
                            </td>
                            <td className="px-4 py-3 text-slate-500 max-w-xs truncate">
                              {(item as Kegiatan).deskripsi || "-"}
                            </td>
                          </>
                        )}
                        {activeTab === "pending" && (
                          <>
                            <td className="px-4 py-3 font-medium text-slate-800">
                              {(item as Profile).nama}
                            </td>
                            <td className="px-4 py-3">
                              <RoleBadge role={(item as Profile).role} />
                            </td>
                            <td className="px-4 py-3 text-slate-600">
                              {(item as Profile).email || "-"}
                            </td>
                            <td className="px-4 py-3 text-slate-500">
                              {(item as Profile).username ||
                                (item as Profile).nisn ||
                                "-"}
                            </td>
                            <td className="px-4 py-3 text-xs text-slate-400">
                              {(item as Profile).dibuat_pada
                                ? new Date(
                                    (item as Profile).dibuat_pada,
                                  ).toLocaleString("id-ID")
                                : "-"}
                            </td>
                          </>
                        )}
                        {activeTab === "admins" && (
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
                          {activeTab === "pending" ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleApprove(item.id)}
                                className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition">
                                <Check className="h-3.5 w-3.5" /> Aktifkan
                              </button>
                              <button
                                type="button"
                                onClick={() => handleReject(item.id)}
                                className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 transition">
                                <XCircle className="h-3.5 w-3.5" /> Tolak
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end gap-0.5">
                              {activeTab === "kegiatan" && (
                                <Link
                                  to={`/super-admin/kegiatan/${item.id}`}
                                  title="Lihat detail"
                                  className="p-1.5 text-slate-400 hover:text-brand-green hover:bg-brand-green/10 rounded-lg transition">
                                  <Eye className="h-4 w-4" />
                                </Link>
                              )}
                              <button
                                type="button"
                                onClick={() => handleEdit(item)}
                                className="p-1.5 text-slate-400 hover:text-brand-green hover:bg-brand-green/10 rounded-lg transition">
                                <Edit className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(item.id)}
                                className="p-1.5 text-slate-400 hover:text-danger hover:bg-danger/10 rounded-lg transition">
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
      </div>

      {/* Modal */}
      {editModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="card w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-float p-0">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h3 className="text-lg font-bold text-slate-800">
                {(activeTab === "admins" || activeTab === "profiles") &&
                !editingItem
                  ? "Tambah User Baru"
                  : "Edit Data"}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setEditModalOpen(false);
                  setEditingItem(null);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-5">
              {(activeTab === "admins" || activeTab === "profiles") &&
              !editingItem ? (
                <div className="space-y-4">
                  <div>
                    <label className="label-base">Role</label>
                    <select
                      value={newAdminRole}
                      onChange={(e) =>
                        setNewAdminRole(
                          e.target.value as "siswa" | "guru" | "super_admin",
                        )
                      }
                      className="input-base">
                      <option value="siswa">Siswa</option>
                      <option value="guru">Guru</option>
                      <option value="super_admin">Super Admin</option>
                    </select>
                  </div>
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
                      placeholder="user@contoh.com"
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
                    <p className="text-xs text-slate-500 mt-1">
                      Password default: lkpd123
                    </p>
                  </div>
                  {newAdminRole === "siswa" && (
                    <>
                      <div>
                        <label className="label-base">Username / NISN</label>
                        <input
                          type="text"
                          value={newAdminUsername}
                          onChange={(e) => setNewAdminUsername(e.target.value)}
                          className="input-base"
                          placeholder="Username atau NISN"
                        />
                      </div>
                      <div>
                        <label className="label-base">NISN (opsional)</label>
                        <input
                          type="text"
                          value={newAdminNisn}
                          onChange={(e) => setNewAdminNisn(e.target.value)}
                          className="input-base"
                          placeholder="Nomor Induk Siswa Nasional"
                        />
                      </div>
                      <div>
                        <label className="label-base">Kelas (opsional)</label>
                        <select
                          value={newAdminKelasId}
                          onChange={(e) => setNewAdminKelasId(e.target.value)}
                          className="input-base">
                          <option value="">Pilih Kelas</option>
                          {kelas.map((k) => (
                            <option key={k.id} value={k.id}>
                              {k.nama_kelas}
                            </option>
                          ))}
                        </select>
                      </div>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={handleCreateAdmin}
                    disabled={creatingAdmin}
                    className="btn-primary w-full">
                    {creatingAdmin
                      ? "Membuat…"
                      : `Buat ${newAdminRole === "super_admin" ? "Super Admin" : newAdminRole === "guru" ? "Guru" : "Siswa"}`}
                  </button>
                </div>
              ) : (
                editingItem && (
                  <div className="space-y-4">
                    {Object.entries(editingItem).map(([key, value]) => {
                      if (key === "id") return null;
                      return (
                        <div key={key}>
                          <label className="label-base capitalize">
                            {key.replace(/_/g, " ")}
                          </label>
                          <textarea
                            value={
                              typeof value === "object" && value !== null
                                ? JSON.stringify(value, null, 2)
                                : String(value ?? "")
                            }
                            onChange={(e) =>
                              handleFieldChange(key, e.target.value, value)
                            }
                            rows={3}
                            className="input-base font-mono text-sm"
                          />
                        </div>
                      );
                    })}
                    <button
                      type="button"
                      onClick={handleSave}
                      className="btn-primary w-full">
                      <Save className="h-4 w-4" /> Simpan Perubahan
                    </button>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      )}
      {/* Modal Detail Materi / Assessment */}
      {detailItem && detailType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="card w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-float p-0">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h3 className="text-lg font-bold text-slate-800">
                {detailType === "materi"
                  ? "Detail Materi"
                  : "Detail Tautan E-Assessment"}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setDetailItem(null);
                  setDetailType(null);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-5 space-y-3 text-sm">
              {detailType === "materi" && (
                <>
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase">
                      Judul
                    </p>
                    <p className="font-medium text-slate-800">
                      {(detailItem as MateriRow).judul || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase">
                      URL
                    </p>
                    <a
                      href={(detailItem as MateriRow).url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand-green hover:underline break-all">
                      {(detailItem as MateriRow).url || "-"}
                    </a>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase">
                      Deskripsi
                    </p>
                    <p className="text-slate-600 whitespace-pre-wrap">
                      {(detailItem as MateriRow).deskripsi || "-"}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs font-semibold text-slate-400 uppercase">
                        Kelas ID
                      </p>
                      <p className="font-mono text-xs">
                        {(detailItem as MateriRow).kelas_id || "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-400 uppercase">
                        Kegiatan ID
                      </p>
                      <p className="font-mono text-xs">
                        {(detailItem as MateriRow).kegiatan_id || "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-400 uppercase">
                        Guru ID
                      </p>
                      <p className="font-mono text-xs">
                        {(detailItem as MateriRow).dibuat_oleh_guru_id || "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-400 uppercase">
                        Dibuat
                      </p>
                      <p className="text-xs">
                        {(detailItem as MateriRow).dibuat_pada
                          ? new Date(
                              (detailItem as MateriRow).dibuat_pada!,
                            ).toLocaleString("id-ID")
                          : "-"}
                      </p>
                    </div>
                  </div>
                </>
              )}
              {detailType === "assessment" && (
                <>
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase">
                      Judul Kuis
                    </p>
                    <p className="font-medium text-slate-800">
                      {(detailItem as AssessmentRow).judul_kuis || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase">
                      URL Kuis
                    </p>
                    <a
                      href={(detailItem as AssessmentRow).url_kuis}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand-green hover:underline break-all">
                      {(detailItem as AssessmentRow).url_kuis || "-"}
                    </a>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs font-semibold text-slate-400 uppercase">
                        Kelas ID
                      </p>
                      <p className="font-mono text-xs">
                        {(detailItem as AssessmentRow).kelas_id || "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-400 uppercase">
                        Kegiatan ID
                      </p>
                      <p className="font-mono text-xs">
                        {(detailItem as AssessmentRow).kegiatan_id || "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-400 uppercase">
                        Guru ID
                      </p>
                      <p className="font-mono text-xs">
                        {(detailItem as AssessmentRow).dibuat_oleh_guru_id ||
                          "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-400 uppercase">
                        Diperbarui
                      </p>
                      <p className="text-xs">
                        {(detailItem as AssessmentRow).diperbarui_pada
                          ? new Date(
                              (detailItem as AssessmentRow).diperbarui_pada!,
                            ).toLocaleString("id-ID")
                          : "-"}
                      </p>
                    </div>
                  </div>
                </>
              )}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setDetailItem(null);
                    setDetailType(null);
                  }}
                  className="btn-outline flex-1">
                  Tutup
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (!confirm("Yakin hapus data ini?")) return;
                    try {
                      const coll =
                        detailType === "materi"
                          ? "materi_tambahan"
                          : "assessment_eksternal";
                      await deleteDoc(doc(db, coll, detailItem.id));
                      toast("Data dihapus", "success");
                      if (detailType === "materi") {
                        setMateriList((prev) =>
                          prev.filter((x) => x.id !== detailItem.id),
                        );
                      } else {
                        setAssessmentList((prev) =>
                          prev.filter((x) => x.id !== detailItem.id),
                        );
                      }
                      setDetailItem(null);
                      setDetailType(null);
                    } catch (err) {
                      console.error(err);
                      toast("Gagal menghapus", "error");
                    }
                  }}
                  className="btn-primary flex-1 bg-red-600 hover:bg-red-700">
                  <Trash2 className="h-4 w-4" /> Hapus
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

function RoleBadge({ role }: { role: Profile["role"] | string }) {
  const color =
    role === "super_admin" ? "purple" : role === "guru" ? "blue" : "success";
  return <Badge color={color as "purple" | "blue" | "success"}>{role}</Badge>;
}

function StatusBadge({ status }: { status?: Profile["status"] | string }) {
  const color =
    status === "active" ? "success" : status === "pending" ? "amber" : "danger";
  return (
    <Badge color={color as "success" | "amber" | "danger"}>
      {status || "-"}
    </Badge>
  );
}
