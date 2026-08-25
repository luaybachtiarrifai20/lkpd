import { useEffect, useState, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  Link2,
  Download,
  GraduationCap,
  Plus,
  Copy,
  FileText,
  Eye,
  CheckCircle2,
  Circle,
  ArrowLeft,
  Save,
  Filter,
  UserCircle,
  FlaskConical,
  Atom,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import {
  auth,
  db,
  type Kelas,
  type Profile,
  type Jawaban,
  type TestAnswer,
  type StatusKuisSiswa,
  type AssessmentEksternal,
  type Question,
} from "@/lib/firebase";
import {
  collection,
  query,
  where,
  // orderBy,
  getDocs,
  doc,
  getDoc,
  addDoc,
  updateDoc,
} from "firebase/firestore";
// import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { KEGIATAN_CONTENT } from "@/content/kegiatanContent";
import { Badge, EmptyState } from "@/components/ui";
import { Modal } from "@/components/ui/Modal";
import { exportJawabanPDF, exportRekapPDF } from "@/lib/pdf";
import { restoreIsiJawaban } from "@/lib/answers";

const navItems = [
  {
    to: "/guru",
    label: "Dashboard",
    icon: <LayoutDashboard className="h-5 w-5" />,
  },
  {
    to: "/guru/kelas",
    label: "Kelas & Siswa",
    icon: <Users className="h-5 w-5" />,
  },
  {
    to: "/guru/rekap",
    label: "Rekap Progres",
    icon: <ClipboardList className="h-5 w-5" />,
  },
  {
    to: "/guru/assessment",
    label: "Tautan E-Assessment",
    icon: <Link2 className="h-5 w-5" />,
  },
  {
    to: "/guru/ekspor",
    label: "Ekspor Massal",
    icon: <Download className="h-5 w-5" />,
  },
  {
    to: "/guru/profil",
    label: "Profil",
    icon: <UserCircle className="h-5 w-5" />,
  },
];

/**
 * Build a mapping of kegiatan nomor -> Firestore doc id.
 * Prefer the `nomor` field (the actual ordering/identity), and fall back to
 * the document id pattern `kegiatan-<n>` only when the field is missing.
 */
function buildKegiatanMap(
  docs: { id: string; data: () => Record<string, unknown> }[],
): Record<number, string> {
  const map: Record<number, string> = {};
  docs.forEach((d) => {
    let nomor: number | undefined;
    const dataNomor = d.data()?.nomor;
    if (typeof dataNomor === "number" && !Number.isNaN(dataNomor)) {
      nomor = dataNomor;
    } else {
      const idMatch = String(d.id || "").match(/kegiatan-(\d+)/);
      if (idMatch) nomor = Number(idMatch[1]);
    }
    if (nomor !== undefined && !Number.isNaN(nomor)) map[nomor] = d.id;
  });
  return map;
}

/**
 * Build a sorted list of kegiatan (nomor, judul, subjudul) from the Firestore
 * `kegiatan` collection so dropdowns reflect the actual database contents.
 * Prefer the `nomor` field over the document id pattern.
 */
function buildKegiatanList(
  docs: { id: string; data: () => Record<string, unknown> }[],
): { nomor: number; judul: string; subjudul: string }[] {
  const list: { nomor: number; judul: string; subjudul: string }[] = [];
  docs.forEach((d) => {
    const data = d.data() as Record<string, any>;
    let nomor: number | undefined;
    const dataNomor = data?.nomor;
    if (typeof dataNomor === "number" && !Number.isNaN(dataNomor)) {
      nomor = dataNomor;
    } else {
      const idMatch = String(d.id || "").match(/kegiatan-(\d+)/);
      if (idMatch) nomor = Number(idMatch[1]);
    }
    if (nomor === undefined || Number.isNaN(nomor)) return;
    list.push({
      nomor,
      judul:
        (typeof data?.judul === "string" && data.judul) ||
        `Kegiatan ${nomor}`,
      subjudul:
        (typeof data?.subjudul === "string" && data.subjudul) || "",
    });
  });
  list.sort((a, b) => a.nomor - b.nomor);
  return list;
}

// ============ Dashboard ============
export function TeacherDashboard() {
  const { profile } = useAuth();
  const [kelas, setKelas] = useState<Kelas[]>([]);
  const [stats, setStats] = useState({ kelas: 0, siswa: 0, jawaban: 0 });

  useEffect(() => {
    if (!profile) return;
    let active = true;
    (async () => {
      const kelasSnapshot = await getDocs(
        query(collection(db, "kelas"), where("guru_id", "==", profile.id)),
      );
      if (!active) return;
      const k = kelasSnapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() }) as Kelas,
      );
      setKelas(k);
      const kIds = k.map((x: Kelas) => x.id);
      if (kIds.length) {
        const [siswaSnapshot, jawabanSnapshot] = await Promise.all([
          getDocs(
            query(
              collection(db, "profiles"),
              where("kelas_id", "in", kIds),
              where("role", "==", "siswa"),
            ),
          ),
          getDocs(collection(db, "jawaban")),
        ]);
        if (active)
          setStats({
            kelas: k.length,
            siswa: siswaSnapshot.size,
            jawaban: jawabanSnapshot.size,
          });
      } else {
        setStats({ kelas: 0, siswa: 0, jawaban: 0 });
      }
    })();
    return () => {
      active = false;
    };
  }, [profile]);

  return (
    <DashboardLayout items={navItems} role="guru">
      <div className="relative min-h-[calc(100vh-140px)] overflow-hidden rounded-3xl bg-slate-50/40 p-4 sm:p-6 md:p-8 border border-slate-100/80 shadow-soft">
        {/* Soft Ambient background glows */}
        <div className="absolute top-10 left-10 w-72 h-72 bg-brand-green-light/35 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-20 right-20 w-80 h-80 bg-brand-teal-light/40 rounded-full blur-3xl pointer-events-none" />
        {/* Dotted sains grid pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:20px_20px] opacity-40 pointer-events-none" />
        
        {/* Floating Science Doodles */}
        <div className="absolute -left-2 top-32 hidden xl:block text-brand-green/10 animate-float-slow pointer-events-none">
          <FlaskConical className="h-16 w-16" />
        </div>
        <div className="absolute -right-2 top-72 hidden xl:block text-brand-teal/15 animate-float-slower pointer-events-none">
          <Atom className="h-20 w-20" />
        </div>

        <div className="relative z-10 space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Dashboard Guru</h1>
            <p className="text-sm text-slate-500">
              Selamat datang, {profile?.nama}.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard
              icon={<Users className="h-6 w-6" />}
              label="Kelas"
              value={stats.kelas}
              color="bg-brand-green-light text-brand-green"
            />
            <StatCard
              icon={<GraduationCap className="h-6 w-6" />}
              label="Total Siswa"
              value={stats.siswa}
              color="bg-brand-teal-light text-brand-teal"
            />
            <StatCard
              icon={<FileText className="h-6 w-6" />}
              label="Jawaban Masuk"
              value={stats.jawaban}
              color="bg-brand-amber-light text-brand-amber"
            />
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800">Kelas Anda</h2>
              <Link to="/guru/kelas" className="btn-outline">
                Kelola Kelas
              </Link>
            </div>
            {kelas.length === 0 ? (
              <EmptyState
                icon={<Users className="h-7 w-7" />}
                title="Belum ada kelas"
                description="Buat kelas pertama untuk mulai mengelola siswa."
                action={
                  <Link to="/guru/kelas" className="btn-primary">
                    <Plus className="h-4 w-4" /> Buat Kelas
                  </Link>
                }
              />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {kelas.map((k) => (
                  <Link
                    key={k.id}
                    to="/guru/kelas"
                    className="card flex items-center justify-between hover:shadow-float transition">
                    <div>
                      <p className="text-sm font-bold text-slate-800">
                        {k.nama_kelas}
                      </p>
                      <p className="text-xs text-slate-500">
                        Kode: {k.kode_undangan || "-"}
                      </p>
                    </div>
                    <ArrowLeft className="h-4 w-4 rotate-180 text-slate-300" />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="card flex items-center gap-4">
      <div className={`grid h-12 w-12 place-items-center rounded-xl ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-extrabold text-slate-800">{value}</p>
        <p className="text-xs text-slate-500">{label}</p>
      </div>
    </div>
  );
}

// ============ Kelola Kelas ============
export function TeacherKelas() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [kelas, setKelas] = useState<Kelas[]>([]);
  const [selected, setSelected] = useState<Kelas | null>(null);
  const [siswa, setSiswa] = useState<Profile[]>([]);
  const [namaKelas, setNamaKelas] = useState("");
  const [open, setOpen] = useState(false);

  const loadKelas = useCallback(async () => {
    if (!profile) return;
    try {
      // Hanya where (tanpa orderBy) agar tidak butuh composite index Firestore.
      // Sort dilakukan di client.
      const snapshot = await getDocs(
        query(collection(db, "kelas"), where("guru_id", "==", profile.id)),
      );
      const list = snapshot.docs.map(
        (d) => ({ id: d.id, ...d.data() }) as Kelas,
      );
      list.sort((a, b) =>
        (b.dibuat_pada || "").localeCompare(a.dibuat_pada || ""),
      );
      setKelas(list);
    } catch (err) {
      console.error("[TeacherKelas] loadKelas error:", err);
      toast("Gagal memuat daftar kelas", "error");
    }
  }, [profile, toast]);

  const loadSiswa = useCallback(
    async (k: Kelas) => {
      try {
        // where role + kelas_id tanpa orderBy → hindari composite index
        const snapshot = await getDocs(
          query(
            collection(db, "profiles"),
            where("kelas_id", "==", k.id),
            where("role", "==", "siswa"),
          ),
        );
        const list = snapshot.docs.map(
          (d) => ({ id: d.id, ...d.data() }) as Profile,
        );
        list.sort((a, b) => (a.nama || "").localeCompare(b.nama || "", "id"));
        setSiswa(list);
      } catch (err) {
        console.error("[TeacherKelas] loadSiswa error:", err);
        toast("Gagal memuat daftar siswa", "error");
      }
    },
    [toast],
  );

  useEffect(() => {
    loadKelas();
  }, [loadKelas]);

  // const createKelas = async () => {
  //   if (!profile || !namaKelas.trim()) return;
  //   try {
  //     const kode = Math.random().toString(36).slice(2, 8).toUpperCase();
  //     await addDoc(collection(db, 'kelas'), {
  //       nama_kelas: namaKelas.trim(),
  //       guru_id: profile.id,
  //       kode_undangan: kode,
  //       dibuat_pada: new Date().toISOString(),
  //     });
  //     toast(`Kelas dibuat. Kode undangan: ${kode}`, 'success');
  //     setNamaKelas('');
  //     setOpen(false);
  //     await loadKelas();
  //   } catch (err) {
  //     console.error('[TeacherKelas] createKelas error:', err);
  //     toast(err instanceof Error ? err.message : 'Gagal membuat kelas', 'error');
  //   }
  // };

  const createKelas = async () => {
    if (!profile || !namaKelas.trim()) return;
    try {
      const kode = Math.random().toString(36).slice(2, 8).toUpperCase();
      await addDoc(collection(db, "kelas"), {
        nama_kelas: namaKelas.trim(),
        guru_id: profile.id,
        kode_undangan: kode,
        dibuat_pada: new Date().toISOString(),
      });
      toast(`Kelas dibuat. Kode undangan: ${kode}`, "success");
      setNamaKelas("");
      setOpen(false);
      await loadKelas();
    } catch (err) {
      console.error('[TeacherKelas] createKelas error:', err);
      toast(err instanceof Error ? err.message : 'Gagal membuat kelas', 'error');
    }
  };

  const copyKode = (kode: string) => {
    navigator.clipboard.writeText(kode);
    toast("Kode kelas disalin", "success");
  };

  return (
    <DashboardLayout items={navItems} role="guru">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Kelas & Siswa</h1>
            <p className="text-sm text-slate-500">
              Buat kelas dan bagikan kode undangan kepada siswa.
            </p>
          </div>
          <button onClick={() => setOpen(true)} className="btn-primary">
            <Plus className="h-4 w-4" /> Buat Kelas
          </button>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1fr_1.4fr]">
          {/* Kelas list */}
          <div className="space-y-3">
            {kelas.length === 0 ? (
              <EmptyState
                icon={<Users className="h-7 w-7" />}
                title="Belum ada kelas"
                description="Klik 'Buat Kelas' untuk memulai."
              />
            ) : (
              kelas.map((k) => (
                <button
                  key={k.id}
                  onClick={() => {
                    setSelected(k);
                    loadSiswa(k);
                  }}
                  className={`card w-full text-left transition ${selected?.id === k.id ? "border-2 border-brand-green" : "hover:shadow-float"}`}>
                  <p className="text-sm font-bold text-slate-800">
                    {k.nama_kelas}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="chip">
                      Kode:{" "}
                      <strong className="ml-1 text-brand-green">
                        {k.kode_undangan}
                      </strong>
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        copyKode(k.kode_undangan || "");
                      }}
                      className="text-slate-400 hover:text-brand-green">
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Siswa list */}
          <div className="card">
            {selected ? (
              <>
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-bold text-slate-800">
                    Siswa {selected.nama_kelas}
                  </h2>
                  <span className="chip">{siswa.length} siswa</span>
                </div>
                {siswa.length === 0 ? (
                  <EmptyState
                    icon={<GraduationCap className="h-7 w-7" />}
                    title="Belum ada siswa"
                    description={`Bagikan kode kelas ${selected.kode_undangan} agar siswa bergabung saat daftar.`}
                  />
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {siswa.map((s) => (
                      <li
                        key={s.id}
                        className="flex items-center justify-between py-2.5">
                        <div className="flex items-center gap-3">
                          <div className="grid h-9 w-9 place-items-center rounded-full bg-brand-green-light text-sm font-bold text-brand-green-dark">
                            {s.nama.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-800">
                              {s.nama}
                            </p>
                            <p className="text-xs text-slate-400">
                              {s.nisn || s.username || s.email}
                            </p>
                          </div>
                        </div>
                        <Link
                          to={`/guru/siswa/${s.id}`}
                          className="btn-ghost text-sm">
                          <Eye className="h-4 w-4" /> Lihat Jawaban
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            ) : (
              <EmptyState
                icon={<Users className="h-7 w-7" />}
                title="Pilih kelas"
                description="Pilih kelas di kiri untuk melihat daftar siswa."
              />
            )}
          </div>
        </div>
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Buat Kelas Baru"
        size="sm"
        footer={
          <>
            <button className="btn-ghost" onClick={() => setOpen(false)}>
              Batal
            </button>
            <button className="btn-primary" onClick={createKelas}>
              <Save className="h-4 w-4" /> Buat
            </button>
          </>
        }>
        <label className="label-base">Nama Kelas</label>
        <input
          className="input-base"
          value={namaKelas}
          onChange={(e) => setNamaKelas(e.target.value)}
          placeholder="Contoh: XI IPA 1"
        />
        <p className="mt-2 text-xs text-slate-400">
          Kode undangan akan dibuat otomatis untuk siswa mendaftar.
        </p>
      </Modal>
    </DashboardLayout>
  );
}

// ============ Rekap Progres ============
// ============ Rekap Progres ============
export function TeacherRekap() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [kelas, setKelas] = useState<Kelas[]>([]);
  const [selKelas, setSelKelas] = useState<string>("");
  const [selKeg, setSelKeg] = useState<string>("1");
  const [rows, setRows] = useState<
    { siswa: Profile; jawaban?: Jawaban; kuis?: StatusKuisSiswa; pretest?: TestAnswer | null; posttest?: TestAnswer | null }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [loadingKelas, setLoadingKelas] = useState(true);
  const [kegIds, setKegIds] = useState<Record<number, string>>({});
  const [kegiatanList, setKegiatanList] = useState<{ nomor: number; judul: string; subjudul: string }[]>([]);
  // const [kegiatanList, setKegiatanList] = useState<
  //   { nomor: number; judul: string; subjudul: string }[]
  // >([]);

  useEffect(() => {
    // Tunggu profile siap; pakai profile.id ATAU auth.uid
    const guruId = profile?.id || auth.currentUser?.uid;
    if (!guruId) return;

    let cancelled = false;
    (async () => {
      setLoadingKelas(true);
      try {
        // Query tanpa orderBy (hindari composite index)
        const kelasSnapshot = await getDocs(
          query(collection(db, "kelas"), where("guru_id", "==", guruId)),
        );
        let kList = kelasSnapshot.docs.map(
          (d) => ({ id: d.id, ...d.data() }) as Kelas,
        );

        // Fallback: jika kosong & profile.id beda dari auth.uid, coba auth.uid
        if (
          kList.length === 0 &&
          auth.currentUser?.uid &&
          auth.currentUser.uid !== guruId
        ) {
          const snap2 = await getDocs(
            query(
              collection(db, "kelas"),
              where("guru_id", "==", auth.currentUser.uid),
            ),
          );
          kList = snap2.docs.map((d) => ({ id: d.id, ...d.data() }) as Kelas);
        }

        kList.sort((a, b) =>
          (a.nama_kelas || "").localeCompare(b.nama_kelas || "", "id"),
        );
        if (!cancelled) setKelas(kList);

        const kegsSnapshot = await getDocs(collection(db, "kegiatan"));
        const map = buildKegiatanMap(kegsSnapshot.docs);
        const list = buildKegiatanList(kegsSnapshot.docs);
        if (!cancelled) {
          setKegIds(map);
          setKegiatanList(list);
        }
      } catch (err) {
        console.error("[TeacherRekap] load error:", err);
        toast(
          "Gagal memuat daftar kelas. Cek Console / Firestore rules.",
          "error",
        );
      } finally {
        if (!cancelled) setLoadingKelas(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [profile, toast]);

  const loadRekap = useCallback(async () => {
    if (!selKelas) return;
    setLoading(true);
    try {
      // Hanya filter kelas_id (tanpa role di query) → hindari composite index.
      // Filter role di client.
      const siswaSnapshot = await getDocs(
        query(collection(db, "profiles"), where("kelas_id", "==", selKelas)),
      );
      const siswa = siswaSnapshot.docs
        .map((d) => ({ id: d.id, ...d.data() }) as Profile)
        .filter((p) => p.role === "siswa" || !p.role);
      siswa.sort((a, b) => (a.nama || "").localeCompare(b.nama || "", "id"));

      if (siswa.length === 0) {
        setRows([]);
        return;
      }

      const sIds = siswa.map((s) => s.id);
      const kegId = kegIds[Number(selKeg)];

      // Tetap tampilkan siswa meski kegiatan belum ada di Firestore
      const jByS: Record<string, Jawaban> = {};
      const kByS: Record<string, StatusKuisSiswa> = {};
      const preByS: Record<string, TestAnswer> = {};
      const postByS: Record<string, TestAnswer> = {};

      if (kegId && sIds.length > 0) {
        // Firestore 'in' max 30 item — chunk jika perlu
        const chunk = <T,>(arr: T[], size: number) =>
          Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
            arr.slice(i * size, i * size + size),
          );

        for (const ids of chunk(sIds, 30)) {
          const [jSnapshot, kSnapshot, preSnapshot, postSnapshot] = await Promise.all([
            getDocs(
              query(
                collection(db, "jawaban"),
                where("kegiatan_id", "==", kegId),
                where("siswa_id", "in", ids),
              ),
            ),
            getDocs(
              query(
                collection(db, "status_kuis_siswa"),
                where("kegiatan_id", "==", kegId),
                where("siswa_id", "in", ids),
              ),
            ),
            getDocs(
              query(
                collection(db, "test_answers"),
                where("kegiatan_id", "==", kegId),
                where("siswa_id", "in", ids),
                where("test_type", "==", "pretest"),
              ),
            ),
            getDocs(
              query(
                collection(db, "test_answers"),
                where("kegiatan_id", "==", kegId),
                where("siswa_id", "in", ids),
                where("test_type", "==", "posttest"),
              ),
            ),
          ]);
          jSnapshot.docs.forEach((d) => {
            const data = { id: d.id, ...d.data() } as Jawaban;
            jByS[data.siswa_id] = data;
          });
          kSnapshot.docs.forEach((d) => {
            const data = { id: d.id, ...d.data() } as StatusKuisSiswa;
            kByS[data.siswa_id] = data;
          });
          preSnapshot.docs.forEach((d) => {
            const data = { id: d.id, ...d.data() } as TestAnswer;
            preByS[data.siswa_id] = data;
          });
          postSnapshot.docs.forEach((d) => {
            const data = { id: d.id, ...d.data() } as TestAnswer;
            postByS[data.siswa_id] = data;
          });
        }
      }

      setRows(
        siswa.map((s) => ({
          siswa: s,
          jawaban: jByS[s.id],
          kuis: kByS[s.id],
          pretest: preByS[s.id] ?? null,
          posttest: postByS[s.id] ?? null,
        })),
      );
    } catch (err) {
      console.error("[TeacherRekap] loadRekap error:", err);
      toast("Gagal memuat data siswa. Cek Console / Firestore rules.", "error");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [selKelas, selKeg, kegIds, toast]);

  // Load rekap begitu kelas dipilih (tidak menunggu kegIds)
  useEffect(() => {
    if (selKelas) loadRekap();
  }, [selKelas, selKeg, loadRekap]);

  const handleExportRekap = () => {
    const k = kelas.find((x) => x.id === selKelas);
    const keg = kegiatanList.find((c) => c.nomor === Number(selKeg));
    const data = rows.map((r) => ({
      nama: r.siswa.nama,
      kelas: k?.nama_kelas || "",
      kegiatan: keg?.judul || "",
      status: r.jawaban?.status || "Belum dikerjakan",
      kuis: r.kuis?.sudah_mengerjakan ? "Sudah" : "Belum",
      skorKuis: r.kuis?.skor_manual ?? null,
      waktu: r.jawaban?.waktu_dikumpulkan
        ? new Date(r.jawaban.waktu_dikumpulkan).toLocaleString("id-ID")
        : "-",
    }));
    exportRekapPDF(data, k?.nama_kelas || "Kelas");
  };

  return (
    <DashboardLayout items={navItems} role="guru">
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-slate-800">
          Rekap Progres per Kegiatan
        </h1>

        <div className="card flex flex-wrap items-end gap-3">
          <div>
            <label className="label-base">Pilih Kelas</label>
            <select
              className="input-base min-w-[180px]"
              value={selKelas}
              onChange={(e) => setSelKelas(e.target.value)}
              disabled={loadingKelas}>
              <option value="">
                {loadingKelas
                  ? "Memuat kelas…"
                  : kelas.length === 0
                    ? "— Belum ada kelas —"
                    : "— Pilih —"}
              </option>
              {kelas.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.nama_kelas}
                </option>
              ))}
            </select>
            {!loadingKelas && kelas.length === 0 && (
              <p className="mt-1 text-xs text-slate-400">
                Belum ada kelas. Buat di menu <strong>Kelas & Siswa</strong>{" "}
                dulu.
              </p>
            )}
          </div>
          <div>
            <label className="label-base">Pilih Kegiatan</label>
            <select
              className="input-base min-w-[180px]"
              value={selKeg}
              onChange={(e) => setSelKeg(e.target.value)}>
              {kegiatanList.length === 0 ? (
                <option value="">— Belum ada kegiatan —</option>
              ) : (
                kegiatanList.map((k) => (
                  <option key={k.nomor} value={k.nomor}>
                    Kegiatan {k.nomor} — {k.subjudul || k.judul}
                  </option>
                ))
              )}
            </select>
          </div>
          <button
            onClick={handleExportRekap}
            disabled={rows.length === 0}
            className="btn-outline ml-auto">
            <Download className="h-4 w-4" /> Ekspor Rekap PDF
          </button>
        </div>

        {!selKelas ? (
          <EmptyState
            icon={<Filter className="h-7 w-7" />}
            title="Pilih kelas & kegiatan"
            description={
              kelas.length === 0 && !loadingKelas
                ? "Anda belum punya kelas. Buat kelas di menu Kelas & Siswa, lalu kembali ke sini."
                : "Filter untuk melihat rekap progres siswa."
            }
          />
        ) : loading ? (
          <div className="card animate-pulse h-48" />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<Users className="h-7 w-7" />}
            title="Belum ada siswa"
            description="Belum ada siswa di kelas ini."
          />
        ) : (
          <div className="card overflow-x-auto scrollbar-thin">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left">
                  <th className="px-3 py-2.5 font-semibold text-slate-700">
                    Nama
                  </th>
                  <th className="px-3 py-2.5 font-semibold text-slate-700">
                    Status Jawaban
                  </th>
                  <th className="px-3 py-2.5 font-semibold text-slate-700">
                    Kuis
                  </th>
                  <th className="px-3 py-2.5 font-semibold text-slate-700">
                    Pretest
                  </th>
                  <th className="px-3 py-2.5 font-semibold text-slate-700">
                    Posttest
                  </th>
                  <th className="px-3 py-2.5 font-semibold text-slate-700">
                    Skor Kuis
                  </th>
                  <th className="px-3 py-2.5 font-semibold text-slate-700">
                    Waktu Kumpul
                  </th>
                  <th className="px-3 py-2.5 font-semibold text-slate-700">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.siswa.id} className="border-b border-slate-100">
                    <td className="px-3 py-2.5 font-medium text-slate-800">
                      {r.siswa.nama}
                    </td>
                    <td className="px-3 py-2.5">
                      <Badge
                        color={
                          r.jawaban?.status === "terkumpul"
                            ? "success"
                            : r.jawaban?.status === "dinilai"
                              ? "teal"
                              : r.jawaban?.status === "draft"
                                ? "amber"
                                : "slate"
                        }>
                        {r.jawaban?.status || "Belum"}
                      </Badge>
                    </td>
                    <td className="px-3 py-2.5">
                      {r.kuis?.sudah_mengerjakan ? (
                        <CheckCircle2 className="h-4 w-4 text-success" />
                      ) : (
                        <Circle className="h-4 w-4 text-slate-300" />
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-sm">
                      {r.pretest?.score != null ? r.pretest.score : "-"}
                    </td>
                    <td className="px-3 py-2.5 text-sm">
                      {r.posttest?.score != null ? r.posttest.score : "-"}
                    </td>
                    <td className="px-3 py-2.5">
                      {r.kuis?.skor_manual ?? "-"}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-slate-500">
                      {r.jawaban?.waktu_dikumpulkan
                        ? new Date(
                            r.jawaban.waktu_dikumpulkan,
                          ).toLocaleDateString("id-ID")
                        : "-"}
                    </td>
                    <td className="px-3 py-2.5">
                      <Link
                        to={`/guru/siswa/${r.siswa.id}`}
                        className="text-brand-green hover:underline text-sm">
                        Detail
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

// ============ Siswa Detail (jawaban viewer + nilai) ============
// ============ Siswa Detail (jawaban viewer + nilai) ============
export function TeacherSiswaDetail() {
  const { toast } = useToast();
  const path = window.location.pathname;
  const siswaId = path.split("/").pop() || "";
  const autoSelectDone = useRef<string | null>(null);

  const [siswa, setSiswa] = useState<Profile | null>(null);
  const [kelasNama, setKelasNama] = useState("");
  const [selKeg, setSelKeg] = useState<number>(1);
  const [jawaban, setJawaban] = useState<Jawaban | null>(null);
  const [kuis, setKuis] = useState<StatusKuisSiswa | null>(null);
  const [kegIds, setKegIds] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [kegiatanList, setKegiatanList] = useState<{ nomor: number; judul: string; subjudul: string }[]>([]);
  const [skor, setSkor] = useState("");
  const [skorKuis, setSkorKuis] = useState("");
  const [feedback, setFeedback] = useState("");
  const [testPre, setTestPre] = useState<TestAnswer | null>(null);
  const [testPost, setTestPost] = useState<TestAnswer | null>(null);
  const [skorPre, setSkorPre] = useState<string>("");
  const [feedbackPre, setFeedbackPre] = useState<string>("");
  const [skorPost, setSkorPost] = useState<string>("");
  const [feedbackPost, setFeedbackPost] = useState<string>("");
  const [pretestQuestions, setPretestQuestions] = useState<Question[]>([]);
  const [posttestQuestions, setPosttestQuestions] = useState<Question[]>([]);
  const [debugOpen, setDebugOpen] = useState(false);
  const [debugData, setDebugData] = useState<{
    jawabanDocs?: { id: string; data: any }[];
    pretestDocs?: { id: string; data: any }[];
    posttestDocs?: { id: string; data: any }[];
    allJawabanDocs?: { id: string; data: any }[];
    allTestDocs?: { id: string; data: any }[];
    selectedKegId?: string | null;
    selKeg?: number | string;
    siswaId?: string;
  }>({});

  // Ensure debugData has current selKeg and siswaId even before queries finish
  useEffect(() => {
    setDebugData((prev) => ({ ...prev, selKeg, siswaId }));
  }, [selKeg, siswaId]);

  useEffect(() => {
    (async () => {
      const sDoc = await getDoc(doc(db, "profiles", siswaId));
      setSiswa(
        sDoc.exists() ? ({ id: sDoc.id, ...sDoc.data() } as Profile) : null,
      );
      if (sDoc.exists() && sDoc.data().kelas_id) {
        const kDoc = await getDoc(doc(db, "kelas", sDoc.data().kelas_id));
        setKelasNama(kDoc.exists() ? kDoc.data().nama_kelas || "-" : "-");
      }
      const kegsSnapshot = await getDocs(collection(db, "kegiatan"));
      const map = buildKegiatanMap(kegsSnapshot.docs);
      const list = buildKegiatanList(kegsSnapshot.docs);
      setKegIds(map);
      setKegiatanList(list);
      setLoading(false);
    })();
  }, [siswaId]);

  useEffect(() => {
    if (!siswaId) return;
    (async () => {
      // Fetch ALL data for this student once, then select by kegiatan in-memory
      // to avoid mismatches between different kegiatan id formats.
      const [allJawSnapshot, allTestSnapshot, allKuisSnapshot] = await Promise.all([
        getDocs(query(collection(db, "jawaban"), where("siswa_id", "==", siswaId))),
        getDocs(query(collection(db, "test_answers"), where("siswa_id", "==", siswaId))),
        getDocs(query(collection(db, "status_kuis_siswa"), where("siswa_id", "==", siswaId))),
      ]);

      const allJaw = allJawSnapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as any[];
      const allTest = allTestSnapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as any[];
      const allKuis = allKuisSnapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as any[];

      const resolveKegNomor = (kegId: unknown): number | undefined => {
        // Prefer reverse lookup via the nomor->docId map (source of truth),
        // so renaming/renumbering nomor does not cause a mismatch.
        const match = Object.entries(kegIds).find(([, v]) => v === kegId);
        if (match) return Number(match[0]);
        const m = String(kegId ?? "").match(/kegiatan-(\d+)/);
        if (m) return Number(m[1]);
        return undefined;
      };

      // Auto-select a sensible default kegiatan ONCE per siswa. Prefer a
      // kegiatan that has a non-empty activity jawaban.
      if (autoSelectDone.current !== siswaId) {
        autoSelectDone.current = siswaId;
        const nonEmpty = allJaw.find(
          (j) =>
            j.isi_jawaban &&
            typeof j.isi_jawaban === "object" &&
            Object.keys(j.isi_jawaban).length > 0,
        );
        const pick = nonEmpty || allJaw[0] || allTest[0];
        const n = pick ? resolveKegNomor(pick.kegiatan_id) : undefined;
        if (n != null && n !== selKeg) setSelKeg(n);
      }

      // Select jawaban/test/kuis for the current selKeg.
      const primaryKegId = `kegiatan-${selKeg}`;
      const altKegId = kegIds[selKeg];
      const matchKeg = (rec: any) =>
        rec &&
        (rec.kegiatan_id === primaryKegId ||
          (altKegId && rec.kegiatan_id === altKegId));

      const jDoc = allJaw.find(matchKeg) || null;
      const kDoc = allKuis.find(matchKeg) || null;
      const preDoc = allTest.find((t) => t.test_type === "pretest" && matchKeg(t)) || null;
      const postDoc = allTest.find((t) => t.test_type === "posttest" && matchKeg(t)) || null;

      setJawaban(
        jDoc
          ? ({
              id: jDoc.id,
              ...jDoc,
              isi_jawaban: restoreIsiJawaban(jDoc.isi_jawaban),
            } as Jawaban)
          : null,
      );
      setKuis(kDoc ? ({ id: kDoc.id, ...kDoc } as StatusKuisSiswa) : null);
      setSkor(jDoc && jDoc.skor != null ? String(jDoc.skor) : "");
      setSkorKuis(kDoc && kDoc.skor_manual != null ? String(kDoc.skor_manual) : "");
      setFeedback(jDoc ? jDoc.feedback_guru || "" : "");

      setTestPre(preDoc ? ({ id: preDoc.id, ...preDoc } as TestAnswer) : null);
      setTestPost(postDoc ? ({ id: postDoc.id, ...postDoc } as TestAnswer) : null);
      setSkorPre(preDoc && preDoc.score != null ? String(preDoc.score) : "");
      setFeedbackPre(preDoc ? preDoc.feedback_guru || "" : "");
      setSkorPost(postDoc && postDoc.score != null ? String(postDoc.score) : "");
      setFeedbackPost(postDoc ? postDoc.feedback_guru || "" : "");

      // Fetch pretest & posttest questions for the selected kegiatan
      const [preQSnapshot, postQSnapshot] = await Promise.all([
        getDocs(
          query(
            collection(db, "questions"),
            where("kegiatan_id", "==", primaryKegId),
            where("test_type", "==", "pretest"),
          ),
        ),
        getDocs(
          query(
            collection(db, "questions"),
            where("kegiatan_id", "==", primaryKegId),
            where("test_type", "==", "posttest"),
          ),
        ),
      ]);
      const preQs = preQSnapshot.docs
        .map((d) => ({ id: d.id, ...d.data() } as Question))
        .sort((a, b) => (a.order || 0) - (b.order || 0));
      const postQs = postQSnapshot.docs
        .map((d) => ({ id: d.id, ...d.data() } as Question))
        .sort((a, b) => (a.order || 0) - (b.order || 0));
      setPretestQuestions(preQs);
      setPosttestQuestions(postQs);

      setDebugData({
        jawabanDocs: jDoc ? [{ id: jDoc.id, data: jDoc }] : [],
        pretestDocs: preDoc ? [{ id: preDoc.id, data: preDoc }] : [],
        posttestDocs: postDoc ? [{ id: postDoc.id, data: postDoc }] : [],
        allJawabanDocs: allJaw.map((d) => ({ id: d.id, data: d })),
        allTestDocs: allTest.map((d) => ({ id: d.id, data: d })),
        selectedKegId: primaryKegId,
        selKeg,
        siswaId,
      });
      console.debug("[TeacherSiswaDetail] debugData:", {
        jawaban: jDoc ? [{ id: jDoc.id, data: jDoc }] : [],
        pretest: preDoc ? [{ id: preDoc.id, data: preDoc }] : [],
        posttest: postDoc ? [{ id: postDoc.id, data: postDoc }] : [],
        allJawaban: allJaw.map((d) => ({ id: d.id, data: d })),
        allTest: allTest.map((d) => ({ id: d.id, data: d })),
        primaryKegId,
      });
    })();
  }, [siswaId, selKeg, kegIds]);

  const saveNilai = async () => {
    if (!jawaban) {
      toast("Belum ada jawaban untuk dinilai", "warning");
      return;
    }
    await updateDoc(doc(db, "jawaban", jawaban.id), {
      skor: skor ? Number(skor) : null,
      feedback_guru: feedback || null,
      status: "dinilai",
    });
    // also save kuis skor if any
    if (kuis && skorKuis) {
      await updateDoc(doc(db, "status_kuis_siswa", kuis.id), {
        skor_manual: Number(skorKuis),
        sudah_mengerjakan: true,
      });
    } else if (!kuis && skorKuis) {
      await addDoc(collection(db, "status_kuis_siswa"), {
        siswa_id: siswaId,
        kegiatan_id: kegIds[selKeg],
        skor_manual: Number(skorKuis),
        sudah_mengerjakan: true,
      });
    }
    toast("Nilai & feedback tersimpan", "success");
  };

  const saveTestFeedback = async (type: "pretest" | "posttest") => {
    try {
      const docRef = type === "pretest" ? testPre : testPost;
      if (!docRef) {
        toast("Belum ada jawaban test untuk disimpan", "warning");
        return;
      }
      const id = docRef.id;
      const payload: any = {};
      if (type === "pretest") {
        payload.score = skorPre ? Number(skorPre) : null;
        payload.feedback_guru = feedbackPre || null;
      } else {
        payload.score = skorPost ? Number(skorPost) : null;
        payload.feedback_guru = feedbackPost || null;
      }
      await updateDoc(doc(db, "test_answers", id), payload);
      toast(`Feedback ${type} tersimpan`, "success");
    } catch (err) {
      console.error("saveTestFeedback error:", err);
      toast("Gagal menyimpan feedback test", "error");
    }
  };

  const handleExport = () => {
    if (!jawaban || !siswa) return;
    exportJawabanPDF(jawaban, siswa, kelasNama, selKeg, kuis);
  };

  // Helper function to safely render block content
  const renderBlockContent = (block: any, jawabanData: Jawaban | null, testPre?: TestAnswer | null, testPost?: TestAnswer | null) => {
    const ansId = "id" in block ? block.id : null;
    const altId = "alasanId" in block ? block.alasanId : null;
    const efId = "pertanyaanId" in block ? block.pertanyaanId : null;
    const perId = "perencanaanId" in block ? block.perencanaanId : null;

    if (block.kind === "bagian-header") {
      return (
        <div key={block.label} className="mb-2 mt-3 text-xs font-bold uppercase tracking-wide text-slate-400">
          — {block.label} —
        </div>
      );
    }

    if (block.kind === "data-eksperimen") {
      return (
        <div key={block.title} className="mb-3">
          <p className="mb-1 text-xs font-semibold text-slate-500">
            [Data] {block.title}
          </p>
          <div className="overflow-x-auto rounded-lg border border-slate-100">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50">
                  {(block.headers || []).map((h: string) => (
                    <th key={h} className="px-2 py-1.5 text-left font-semibold text-slate-600">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(block.rows || []).map((row: { cells: string[] }, ri: number) => (
                  <tr key={ri} className="border-t border-slate-100">
                    {(row.cells || []).map((cell: string, ci: number) => (
                      <td key={ci} className="px-2 py-1.5 text-slate-600">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    if (block.kind === "diagram-submikro") {
      return (
        <div key={block.title} className="mb-3">
          <p className="text-xs font-semibold text-slate-500">
            [Diagram] {block.title}
          </p>
          <p className="text-xs text-slate-500">
            {block.kiri.label}: {block.kiri.deskripsi} | {block.kanan.label}: {block.kanan.deskripsi}
          </p>
        </div>
      );
    }

    if (block.kind === "instruksi-pengembangan") {
      return (
        <div key={block.title} className="mb-3">
          <p className="text-xs font-semibold text-slate-500">
            [Instruksi] {block.title}
          </p>
          <p className="text-xs text-slate-500">{block.body}</p>
          {block.bullets && (
            <ul className="ml-4 text-xs text-slate-500">
              {block.bullets.map((bl: string, bi: number) => (
                <li key={bi}>• {bl}</li>
              ))}
            </ul>
          )}
        </div>
      );
    }

    if (block.kind === "penalaran-level") {
      return (
        <div key="penalaran" className="mb-3">
          <p className="text-xs font-semibold text-slate-500">
            [Integrasi 3 Level]
          </p>
          <p className="text-xs text-slate-500">
            Makroskopik: {block.makroskopik} | Submikroskopik: {block.submikroskopik} | Simbolik: {block.simbolik}
          </p>
        </div>
      );
    }

    if (block.kind === "analisis-efisiensi") {
      return (
        <div key={block.title} className="mb-3">
          <p className="mb-1 text-xs font-semibold text-slate-500">
            [Tabel Efisiensi] {block.title}
          </p>
          <div className="overflow-x-auto rounded-lg border border-slate-100">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50">
                  {(block.headers || []).map((h: string) => (
                        <th key={h} className="px-2 py-1.5 text-left font-semibold text-slate-600">
                          {h}
                        </th>
                      ))}
                </tr>
              </thead>
              <tbody>
                {(block.rows || []).map((row: { cells: string[] }, ri: number) => (
                  <tr key={ri} className="border-t border-slate-100">
                    {(row.cells || []).map((cell: string, ci: number) => (
                      <td key={ci} className="px-2 py-1.5 text-slate-600">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {efId && (
            <AnswerView
              label={block.pertanyaanText}
              ans={jawabanData?.isi_jawaban?.[efId]}
            />
          )}
        </div>
      );
    }

    if (ansId) {
      const label =
        "text" in block
          ? block.text
          : "label" in block
            ? block.label
            : block.title || "";
      // try jawaban data first
      const fromJawaban = jawabanData?.isi_jawaban?.[ansId];
      if (fromJawaban !== undefined && fromJawaban !== null && String(fromJawaban).trim() !== "") {
        return <AnswerView key={ansId} label={label} ans={fromJawaban} />;
      }
      // fallback: check test pre/post answers which store by question doc id
      const fromPre = testPre?.answers?.[ansId];
      if (fromPre !== undefined && fromPre !== null && String(fromPre).trim() !== "") {
        return <AnswerView key={ansId} label={label} ans={fromPre} />;
      }
      const fromPost = testPost?.answers?.[ansId];
      if (fromPost !== undefined && fromPost !== null && String(fromPost).trim() !== "") {
        return <AnswerView key={ansId} label={label} ans={fromPost} />;
      }
      // last resort: show whatever is present (may be empty)
      return <AnswerView key={ansId} label={label} ans={jawabanData?.isi_jawaban?.[ansId]} />;
    }

    if (perId) {
      return (
        <AnswerView
          key={perId}
          label="Perencanaan Penyelidikan"
          ans={jawabanData?.isi_jawaban?.[perId]}
        />
      );
    }

    if (altId) {
      return (
        <AnswerView
          key={altId}
          label="Alasan pemilihan kasus"
          ans={jawabanData?.isi_jawaban?.[altId]}
        />
      );
    }

    return null;
  };

  if (loading)
    return (
      <DashboardLayout items={navItems} role="guru">
        <div className="card animate-pulse h-96" />
      </DashboardLayout>
    );

  const keg = KEGIATAN_CONTENT.find((k) => k.nomor === selKeg)!;

  return (
    <DashboardLayout items={navItems} role="guru">
      <div className="space-y-5">
        <Link
          to="/guru/rekap"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-brand-green">
          <ArrowLeft className="h-4 w-4" /> Rekap
        </Link>

        <div className="card">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-green-light text-lg font-bold text-brand-green-dark">
                {siswa?.nama.charAt(0)}
              </div>
              <div>
                <p className="text-lg font-bold text-slate-800">
                  {siswa?.nama}
                </p>
                <p className="text-xs text-slate-500">
                  {kelasNama} • {siswa?.nisn || siswa?.username || siswa?.email}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <select
                className="input-base"
                value={selKeg}
                onChange={(e) => setSelKeg(Number(e.target.value))}>
                {kegiatanList.length === 0 ? (
                  <option value={selKeg}>— Belum ada kegiatan di database —</option>
                ) : (
                  kegiatanList.map((k) => (
                    <option key={k.nomor} value={k.nomor}>
                      Kegiatan {k.nomor} — {k.subjudul || k.judul}
                    </option>
                  ))
                )}
              </select>
              <button
                onClick={handleExport}
                disabled={!jawaban}
                className="btn-outline">
                <Download className="h-4 w-4" /> Unduh PDF
              </button>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <button
            onClick={() => setDebugOpen((v) => !v)}
            className="btn-outline">
            {debugOpen ? "Sembunyikan Debug" : "Tampilkan Debug"}
          </button>
          {debugOpen && (
            <div className="card mt-3">
              <p className="text-xs text-slate-500 font-semibold">Debug: hasil query mentah</p>
              <div className="mt-2 text-xs text-slate-700">
                  <p className="font-semibold">Selected keg mapping</p>
                  <p className="text-xs text-slate-500">selKeg: {String(debugData.selKeg)}</p>
                  <p className="text-xs text-slate-500">selectedKegId: {String(debugData.selectedKegId)}</p>
                  <p className="text-xs text-slate-500">siswaId: {String(debugData.siswaId)}</p>

                  <p className="font-semibold mt-2">Jawaban documents ({debugData.jawabanDocs?.length || 0})</p>
                  <pre className="mt-1 overflow-x-auto text-xs">{JSON.stringify(debugData.jawabanDocs || [], null, 2)}</pre>

                  <p className="font-semibold mt-3">All jawaban for siswa ({debugData.allJawabanDocs?.length || 0})</p>
                  <pre className="mt-1 overflow-x-auto text-xs">{JSON.stringify(debugData.allJawabanDocs || [], null, 2)}</pre>

                  <p className="font-semibold mt-3">Pretest documents ({debugData.pretestDocs?.length || 0})</p>
                  <pre className="mt-1 overflow-x-auto text-xs">{JSON.stringify(debugData.pretestDocs || [], null, 2)}</pre>

                  <p className="font-semibold mt-3">Posttest documents ({debugData.posttestDocs?.length || 0})</p>
                  <pre className="mt-1 overflow-x-auto text-xs">{JSON.stringify(debugData.posttestDocs || [], null, 2)}</pre>

                  <p className="font-semibold mt-3">All test_answers for siswa ({debugData.allTestDocs?.length || 0})</p>
                  <pre className="mt-1 overflow-x-auto text-xs">{JSON.stringify(debugData.allTestDocs || [], null, 2)}</pre>
              </div>
            </div>
          )}
        </div>

        {!jawaban ? (
          <EmptyState
            icon={<FileText className="h-7 w-7" />}
            title="Belum ada jawaban"
            description="Siswa belum mengerjakan kegiatan ini."
          />
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm">
              <Badge
                color={
                  jawaban.status === "terkumpul"
                    ? "success"
                    : jawaban.status === "dinilai"
                      ? "teal"
                      : "amber"
                }>
                {jawaban.status}
              </Badge>
              <span className="text-slate-500">
                Dikumpulkan:{" "}
                {jawaban.waktu_dikumpulkan
                  ? new Date(jawaban.waktu_dikumpulkan).toLocaleString("id-ID")
                  : "-"}
              </span>
            </div>

            {/* Render jawaban read-only */}
            {keg.steps.map((step) => (
              <div key={step.id} className="card">
                <div
                  className="banner mb-3"
                  style={{ backgroundColor: keg.warna, color: "white" }}>
                  Sintaks {step.sintaks} — {step.label}
                </div>
                {step.blocks.map((block, index) => (
                  <div key={index}>
                    {renderBlockContent(block, jawaban, testPre, testPost)}
                  </div>
                ))}
              </div>
            ))}

            {/* Penilaian */}
            <div className="card">
              <h3 className="mb-3 text-lg font-bold text-slate-800">
                Penilaian & Feedback
              </h3>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="label-base">Skor Jawaban</label>
                  <input
                    type="number"
                    className="input-base"
                    value={skor}
                    onChange={(e) => setSkor(e.target.value)}
                    placeholder="0-100"
                  />
                </div>
                <div>
                  <label className="label-base">Skor Kuis (manual)</label>
                  <input
                    type="number"
                    className="input-base"
                    value={skorKuis}
                    onChange={(e) => setSkorKuis(e.target.value)}
                    placeholder="dari platform eksternal"
                  />
                </div>
                <div className="sm:col-span-3">
                  <label className="label-base">Feedback untuk Siswa</label>
                  <textarea
                    className="input-base"
                    rows={3}
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="Tulis catatan/masukan…"
                  />
                </div>
              </div>
              {/* Pretest / Posttest feedback */}
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="card">
                  <p className="text-xs font-semibold text-slate-400">Pretest</p>
                  <div className="mt-2">
                    <label className="label-base">Skor Pretest</label>
                    <input
                      type="number"
                      className="input-base"
                      value={skorPre}
                      onChange={(e) => setSkorPre(e.target.value)}
                      placeholder="Skor pretest"
                    />
                    <label className="label-base mt-2">Feedback Pretest</label>
                    <textarea
                      className="input-base"
                      rows={3}
                      value={feedbackPre}
                      onChange={(e) => setFeedbackPre(e.target.value)}
                      placeholder="Feedback untuk pretest"
                    />
                    <button onClick={() => saveTestFeedback("pretest")} className="btn-outline mt-3">Simpan Pretest</button>
                  </div>
                </div>

                <div className="card">
                  <p className="text-xs font-semibold text-slate-400">Posttest</p>
                  <div className="mt-2">
                    <label className="label-base">Skor Posttest</label>
                    <input
                      type="number"
                      className="input-base"
                      value={skorPost}
                      onChange={(e) => setSkorPost(e.target.value)}
                      placeholder="Skor posttest"
                    />
                    <label className="label-base mt-2">Feedback Posttest</label>
                    <textarea
                      className="input-base"
                      rows={3}
                      value={feedbackPost}
                      onChange={(e) => setFeedbackPost(e.target.value)}
                      placeholder="Feedback untuk posttest"
                    />
                    <button onClick={() => saveTestFeedback("posttest")} className="btn-outline mt-3">Simpan Posttest</button>
                  </div>
                </div>
              </div>
              <button onClick={saveNilai} className="btn-primary mt-4">
                <Save className="h-4 w-4" /> Simpan Nilai
              </button>
            </div>
          </div>
        )}

        {/* Jawaban Pretest & Posttest siswa */}
        {(pretestQuestions.length > 0 || posttestQuestions.length > 0) && (
          <div className="space-y-4">
            {pretestQuestions.length > 0 && (
              <div className="card">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Jawaban Pretest Siswa
                </p>
                <div className="space-y-3">
                  {pretestQuestions.map((q, i) => (
                    <div
                      key={q.id}
                      className="border-b border-slate-100 pb-3 last:border-0">
                      <p className="text-sm font-medium text-slate-700">
                        {i + 1}. {q.question_text}
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">
                        {formatTestAnswer(q, testPre?.answers?.[q.id])}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {posttestQuestions.length > 0 && (
              <div className="card">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Jawaban Posttest Siswa
                </p>
                <div className="space-y-3">
                  {posttestQuestions.map((q, i) => (
                    <div
                      key={q.id}
                      className="border-b border-slate-100 pb-3 last:border-0">
                      <p className="text-sm font-medium text-slate-700">
                        {i + 1}. {q.question_text}
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">
                        {formatTestAnswer(q, testPost?.answers?.[q.id])}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

function formatTestAnswer(q: Question, ans: unknown): string {
  if (ans == null || ans === "") return "(belum dijawab)";
  if (Array.isArray(ans)) return ans.map((v) => String(v)).join(", ");
  if (q.question_type === "pilihan_ganda" && q.options?.length) {
    const opt = q.options.find((o) => o.id === ans);
    if (opt) return `${opt.id}. ${opt.text}`;
  }
  return String(ans);
}

function AnswerView({ label, ans }: { label: string; ans: unknown }) {
  let body: React.ReactNode = null;

  if (typeof ans === "string" && ans) {
    body = <p className="whitespace-pre-wrap text-sm text-slate-700">{ans}</p>;
  } else if (Array.isArray(ans) && ans.length) {
    const parts = ans.map((v) => String(v)).filter((s) => s.trim() !== "");
    body = (
      <ol className="ml-5 list-decimal space-y-1 text-sm text-slate-700">
        {parts.map((p, i) => (
          <li key={i} className="whitespace-pre-wrap">
            {p}
          </li>
        ))}
      </ol>
    );
  } else if (ans && typeof ans === "object") {
    const a = ans as {
      rows?: unknown;
      headers?: string[];
      files?: { name: string; url: string }[];
      tap?: Record<string, string>;
    };
    if (a.rows && Array.isArray(a.rows)) {
      const headers = Array.isArray(a.headers) ? a.headers : undefined;
      body = (
        <div className="overflow-x-auto rounded-lg border border-slate-100">
          <table className="w-full text-xs">
            {headers && (
              <thead>
                <tr className="bg-slate-50">
                  {headers.map((h, i) => (
                    <th
                      key={i}
                      className="border-b border-slate-100 px-2 py-1.5 text-left font-semibold text-slate-600">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody>
              {a.rows.map((row, ri) => {
                const cells = Array.isArray(row)
                  ? row.map((c) => String(c ?? ""))
                  : row && typeof row === "object" && "cells" in row
                    ? ((row as { cells?: unknown[] }).cells || []).map((c) =>
                        String(c ?? ""),
                      )
                    : [String(row ?? "")];
                return (
                  <tr key={ri} className={ri % 2 ? "bg-slate-50/40" : ""}>
                    {cells.map((cell, ci) => (
                      <td
                        key={ci}
                        className="whitespace-pre-wrap border-b border-slate-100 px-2 py-1.5 text-slate-700">
                        {cell || "-"}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      );
    } else if (a.files) {
      body = (
        <p className="whitespace-pre-wrap text-sm text-slate-700">
          {a.files.map((f) => f.name).join("\n")}
        </p>
      );
    } else if (a.tap) {
      body = (
        <div className="space-y-1 text-sm text-slate-700">
          {Object.entries(a.tap).map(([k, v]) => (
            <p key={k} className="whitespace-pre-wrap">
              {k}: {v}
            </p>
          ))}
        </div>
      );
    }
  }

  if (body === null) {
    body = <p className="text-sm text-slate-400">(kosong)</p>;
  }

  return (
    <div className="mb-3 border-b border-slate-100 pb-3 last:border-0">
      <p className="mb-1 text-xs font-semibold text-slate-500">{label}</p>
      {body}
    </div>
  );
}

// ============ Kelola Tautan E-Assessment ============
export function TeacherAssessment() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [selKeg, setSelKeg] = useState<number>(1);
  const [kegIds, setKegIds] = useState<Record<number, string>>({});
  const [assess, setAssess] = useState<AssessmentEksternal | null>(null);
  const [judul, setJudul] = useState("");
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [allAssess, setAllAssess] = useState<
    Record<number, AssessmentEksternal | null>
  >({});

  useEffect(() => {
    (async () => {
      const kegsSnapshot = await getDocs(collection(db, "kegiatan"));
      const map = buildKegiatanMap(kegsSnapshot.docs);
      setKegIds(map);
      // fetch all assessments at once
      const assesSnapshot = await getDocs(
        collection(db, "assessment_eksternal"),
      );
      const amap: Record<number, AssessmentEksternal | null> = {};
      assesSnapshot.docs.forEach((doc) => {
        const a = doc.data() as AssessmentEksternal;
        const nomor = Number(
          Object.entries(map).find(([, id]) => id === a.kegiatan_id)?.[0] || 0,
        );
        if (nomor) amap[nomor] = a;
      });
      setAllAssess(amap);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!kegIds[selKeg]) return;
    (async () => {
      const snapshot = await getDocs(
        query(
          collection(db, "assessment_eksternal"),
          where("kegiatan_id", "==", kegIds[selKeg]),
        ),
      );
      setAssess(
        snapshot.empty
          ? null
          : ({
              id: snapshot.docs[0].id,
              ...snapshot.docs[0].data(),
            } as AssessmentEksternal),
      );
      setJudul(snapshot.empty ? "" : snapshot.docs[0].data().judul_kuis || "");
      setUrl(snapshot.empty ? "" : snapshot.docs[0].data().url_kuis);
    })();
  }, [selKeg, kegIds]);

  const save = async () => {
    if (!profile || !kegIds[selKeg]) return;
    if (!url.trim()) {
      toast("URL kuis wajib diisi", "warning");
      return;
    }
    try {
      new URL(url);
    } catch {
      toast("URL tidak valid", "error");
      return;
    }
    const payload = {
      kegiatan_id: kegIds[selKeg],
      judul_kuis: judul || null,
      url_kuis: url,
      dibuat_oleh_guru_id: profile.id,
      diperbarui_pada: new Date().toISOString(),
    };
    const existingSnapshot = await getDocs(
      query(
        collection(db, "assessment_eksternal"),
        where("kegiatan_id", "==", kegIds[selKeg]),
      ),
    );
    if (existingSnapshot.empty) {
      await addDoc(collection(db, "assessment_eksternal"), payload);
    } else {
      await updateDoc(
        doc(db, "assessment_eksternal", existingSnapshot.docs[0].id),
        payload,
      );
    }
    toast("Tautan kuis tersimpan — siswa akan melihat embed & QR", "success");
  };

  const keg = KEGIATAN_CONTENT.find((k) => k.nomor === selKeg)!;

  if (loading)
    return (
      <DashboardLayout items={navItems} role="guru">
        <div className="card animate-pulse h-96" />
      </DashboardLayout>
    );

  return (
    <DashboardLayout items={navItems} role="guru">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Kelola Tautan E-Assessment
          </h1>
          <p className="text-sm text-slate-500">
            Tempel tautan kuis dari platform eksternal (Google
            Forms/Quizizz/dll.). Sistem otomatis menampilkan embed & QR untuk
            siswa.
          </p>
        </div>

        <div className="card">
          <label className="label-base">Pilih Kegiatan</label>
          <div className="mb-4 grid gap-2 sm:grid-cols-4">
            {KEGIATAN_CONTENT.map((k) => (
              <button
                key={k.nomor}
                onClick={() => setSelKeg(k.nomor)}
                className={`relative rounded-xl border-2 p-3 text-left transition ${selKeg === k.nomor ? "" : "border-slate-200 hover:bg-slate-50"}`}
                style={
                  selKeg === k.nomor
                    ? { borderColor: k.warna, backgroundColor: k.warnaLight }
                    : undefined
                }>
                {allAssess[k.nomor] && (
                  <span
                    className="absolute right-2 top-2 grid h-5 w-5 place-items-center rounded-full bg-success/15 text-success"
                    title="Tautan sudah diisi">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  </span>
                )}
                <p className="text-xs font-semibold text-slate-400">
                  Kegiatan {k.nomor}
                </p>
                <p className="text-sm font-bold text-slate-800 leading-tight">
                  {k.subjudul}
                </p>
                <p className="mt-1 text-[11px] text-slate-400">
                  {allAssess[k.nomor] ? "Kuis siap" : "Belum ada kuis"}
                </p>
              </button>
            ))}
          </div>

          <div className="space-y-3">
            <div>
              <label className="label-base">Judul Kuis</label>
              <input
                className="input-base"
                value={judul}
                onChange={(e) => setJudul(e.target.value)}
                placeholder="Contoh: Kuis Formatif Kegiatan 1"
              />
            </div>
            <div>
              <label className="label-base">URL Kuis Eksternal</label>
              <input
                className="input-base"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://forms.gle/... atau https://quizizz.com/..."
              />
              <p className="mt-1.5 text-xs text-slate-400">
                Tempel link kuis dari Google Forms, Quizizz, Wordwall, atau
                platform sejenisnya.
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={save} className="btn-primary">
                <Save className="h-4 w-4" /> Simpan Tautan
              </button>
              {assess && (
                <span className="chip self-center">
                  Tersimpan •{" "}
                  {new Date(assess.diperbarui_pada || "").toLocaleDateString(
                    "id-ID",
                  )}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Preview */}
        {url && (
          <div className="card">
            <h3 className="mb-3 text-lg font-bold text-slate-800">
              Preview (apa yang siswa lihat)
            </h3>
            <div
              className="overflow-hidden rounded-xl border-2"
              style={{ borderColor: keg.warna }}>
              <iframe
                src={url}
                title="Preview"
                className="w-full"
                style={{ height: "420px", border: "none" }}
                sandbox="allow-scripts allow-same-origin allow-forms"
              />
            </div>
            <p className="mt-2 text-xs text-slate-400">
              Siswa juga dapat memindai kode QR dari tab "Scan QR" di halaman
              kegiatan.
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

// ============ Ekspor Massal ============
// ============ Ekspor Massal ============
export function TeacherEkspor() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [kelas, setKelas] = useState<Kelas[]>([]);
  const [selKelas, setSelKelas] = useState("");
  const [selKeg, setSelKeg] = useState("1");
  const [kegIds, setKegIds] = useState<Record<number, string>>({});
  const [rows, setRows] = useState<
    { siswa: Profile; jawaban?: Jawaban; kuis?: StatusKuisSiswa }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [loadingKelas, setLoadingKelas] = useState(true);

  // Load daftar kelas
  useEffect(() => {
    if (!profile) return;
    
    let cancelled = false;
    setLoadingKelas(true);
    
    (async () => {
      try {
        // Hapus orderBy untuk menghindari composite index
        const kelasSnapshot = await getDocs(
          query(collection(db, "kelas"), where("guru_id", "==", profile.id))
        );
        
        if (!cancelled) {
          const list = kelasSnapshot.docs.map(
            (doc) => ({ id: doc.id, ...doc.data() }) as Kelas
          );
          // Sort di client-side
          list.sort((a, b) => (a.nama_kelas || "").localeCompare(b.nama_kelas || "", "id"));
          setKelas(list);
        }
      } catch (err) {
        console.error("[TeacherEkspor] load kelas error:", err);
        toast("Gagal memuat daftar kelas", "error");
      } finally {
        if (!cancelled) setLoadingKelas(false);
      }
    })();
    
    return () => {
      cancelled = true;
    };
  }, [profile, toast]);

  // Load kegiatan IDs
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const kegsSnapshot = await getDocs(collection(db, "kegiatan"));
        if (!cancelled) {
          setKegIds(buildKegiatanMap(kegsSnapshot.docs));
        }
      } catch (err) {
        console.error("[TeacherEkspor] load kegiatan error:", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadRekap = useCallback(async () => {
    if (!selKelas || !kegIds[Number(selKeg)]) {
      setRows([]);
      return;
    }
    
    setLoading(true);
    try {
      // Query tanpa orderBy untuk menghindari composite index
      const siswaSnapshot = await getDocs(
        query(
          collection(db, "profiles"),
          where("kelas_id", "==", selKelas)
        )
      );
      
      // Filter role di client-side
      const siswa = siswaSnapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }) as Profile)
        .filter((p) => p.role === "siswa");
      
      // Sort di client-side
      siswa.sort((a, b) => (a.nama || "").localeCompare(b.nama || "", "id"));

      if (siswa.length === 0) {
        setRows([]);
        setLoading(false);
        return;
      }

      const sIds = siswa.map((s) => s.id);
      const kegId = kegIds[Number(selKeg)];
      
      const jByS: Record<string, Jawaban> = {};
      const kByS: Record<string, StatusKuisSiswa> = {};

      if (kegId && sIds.length > 0) {
        // Firestore 'in' max 30 items — chunk if needed
        const chunk = <T,>(arr: T[], size: number) =>
          Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
            arr.slice(i * size, i * size + size)
          );

        for (const ids of chunk(sIds, 30)) {
          const [jSnapshot, kSnapshot] = await Promise.all([
            getDocs(
              query(
                collection(db, "jawaban"),
                where("kegiatan_id", "==", kegId),
                where("siswa_id", "in", ids)
              )
            ),
            getDocs(
              query(
                collection(db, "status_kuis_siswa"),
                where("kegiatan_id", "==", kegId),
                where("siswa_id", "in", ids)
              )
            ),
          ]);
          
          jSnapshot.docs.forEach((d) => {
            const data = { id: d.id, ...d.data() } as Jawaban;
            jByS[data.siswa_id] = data;
          });
          
          kSnapshot.docs.forEach((d) => {
            const data = { id: d.id, ...d.data() } as StatusKuisSiswa;
            kByS[data.siswa_id] = data;
          });
        }
      }

      setRows(
        siswa.map((s) => ({
          siswa: s,
          jawaban: jByS[s.id],
          kuis: kByS[s.id],
        }))
      );
    } catch (err) {
      console.error("[TeacherEkspor] loadRekap error:", err);
      toast("Gagal memuat data siswa", "error");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [selKelas, selKeg, kegIds, toast]);

  useEffect(() => {
    loadRekap();
  }, [loadRekap]);

  const exportAll = () => {
    const k = kelas.find((x) => x.id === selKelas);
    const withJawaban = rows.filter((r) => r.jawaban);
    
    if (withJawaban.length === 0) {
      toast("Tidak ada jawaban untuk diekspor", "warning");
      return;
    }
    
    withJawaban.forEach((r) => {
      exportJawabanPDF(
        r.jawaban!,
        r.siswa,
        k?.nama_kelas || "",
        Number(selKeg),
        r.kuis
      );
    });
    
    toast(`${withJawaban.length} PDF diunduh (per siswa)`, "success");
  };

  const exportRekap = () => {
    const k = kelas.find((x) => x.id === selKelas);
    const keg = KEGIATAN_CONTENT.find((c) => c.nomor === Number(selKeg));
    
    const data = rows.map((r) => ({
      nama: r.siswa.nama,
      kelas: k?.nama_kelas || "",
      kegiatan: keg?.judul || "",
      status: r.jawaban?.status || "Belum dikerjakan",
      kuis: r.kuis?.sudah_mengerjakan ? "Sudah" : "Belum",
      skorKuis: r.kuis?.skor_manual ?? null,
      waktu: r.jawaban?.waktu_dikumpulkan
        ? new Date(r.jawaban.waktu_dikumpulkan).toLocaleString("id-ID")
        : "-",
    }));
    
    exportRekapPDF(data, k?.nama_kelas || "Kelas");
  };

  return (
    <DashboardLayout items={navItems} role="guru">
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-slate-800">Ekspor Massal</h1>

        <div className="card flex flex-wrap items-end gap-3">
          <div>
            <label className="label-base">Kelas</label>
            <select
              className="input-base min-w-[180px]"
              value={selKelas}
              onChange={(e) => setSelKelas(e.target.value)}
              disabled={loadingKelas}>
              <option value="">
                {loadingKelas 
                  ? "Memuat kelas..." 
                  : kelas.length === 0 
                    ? "— Belum ada kelas —" 
                    : "— Pilih Kelas —"}
              </option>
              {kelas.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.nama_kelas}
                </option>
              ))}
            </select>
            {!loadingKelas && kelas.length === 0 && (
              <p className="mt-1 text-xs text-amber-600">
                ⚠️ Belum ada kelas. Buat kelas di menu <strong>Kelas & Siswa</strong>.
              </p>
            )}
          </div>
          
          <div>
            <label className="label-base">Kegiatan</label>
            <select
              className="input-base min-w-[160px]"
              value={selKeg}
              onChange={(e) => setSelKeg(e.target.value)}>
              {KEGIATAN_CONTENT.map((k) => (
                <option key={k.nomor} value={k.nomor}>
                  Kegiatan {k.nomor} — {k.subjudul}
                </option>
              ))}
            </select>
          </div>
          
          <div className="ml-auto flex gap-2">
            <button
              onClick={exportAll}
              disabled={rows.length === 0 || loading}
              className="btn-primary">
              <Download className="h-4 w-4" /> Ekspor PDF per Siswa
            </button>
            <button
              onClick={exportRekap}
              disabled={rows.length === 0 || loading}
              className="btn-outline">
              <FileText className="h-4 w-4" /> Rekap Tabel PDF
            </button>
          </div>
        </div>

        {!selKelas ? (
          <EmptyState
            icon={<Download className="h-7 w-7" />}
            title="Pilih kelas & kegiatan"
            description={
              kelas.length === 0 && !loadingKelas
                ? "Anda belum memiliki kelas. Buat kelas terlebih dahulu di menu Kelas & Siswa."
                : "Pilih kelas dan kegiatan untuk mengekspor jawaban seluruh siswa."
            }
          />
        ) : loading ? (
          <div className="card animate-pulse h-40" />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<Users className="h-7 w-7" />}
            title="Belum ada siswa"
            description="Belum ada siswa di kelas ini atau belum ada yang mengerjakan kegiatan."
          />
        ) : (
          <div className="card">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm text-slate-600">
                {rows.length} siswa • {rows.filter((r) => r.jawaban).length} memiliki jawaban
              </p>
              <Badge color="teal">
                <FileText className="h-3.5 w-3.5" /> {rows.filter((r) => r.jawaban).length} siap ekspor
              </Badge>
            </div>
            
            <ul className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
              {rows.map((r) => (
                <li
                  key={r.siswa.id}
                  className="flex items-center justify-between py-2.5">
                  <div className="flex items-center gap-3">
                    <div className="grid h-8 w-8 place-items-center rounded-full bg-slate-100 text-sm font-medium text-slate-600">
                      {r.siswa.nama.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-medium text-slate-800">
                      {r.siswa.nama}
                    </span>
                  </div>
                  {r.jawaban ? (
                    <div className="flex items-center gap-2">
                      <Badge color="success">
                        <CheckCircle2 className="h-3 w-3" /> Selesai
                      </Badge>
                      <button
                        onClick={() =>
                          exportJawabanPDF(
                            r.jawaban!,
                            r.siswa,
                            kelas.find((x) => x.id === selKelas)?.nama_kelas || "",
                            Number(selKeg),
                            r.kuis
                          )
                        }
                        className="btn-ghost text-sm">
                        <Download className="h-4 w-4" /> PDF
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Circle className="h-3 w-3" /> Belum dikerjakan
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

// ============ Profil Guru ============
export function TeacherProfil() {
  const { profile } = useAuth();
  return (
    <DashboardLayout items={navItems} role="guru">
      <div className="max-w-lg space-y-6">
        <h1 className="text-2xl font-bold text-slate-800">Profil Guru</h1>
        <div className="card">
          <div className="flex items-center gap-4">
            <div className="grid h-16 w-16 place-items-center rounded-2xl bg-violet-50 text-2xl font-bold text-teacher">
              {profile?.nama?.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-lg font-bold text-slate-800">
                {profile?.nama}
              </p>
              <Badge color="purple">
                <GraduationCap className="h-3.5 w-3.5" /> Guru
              </Badge>
            </div>
          </div>
          <dl className="mt-5 grid gap-4 sm:grid-cols-2">
            <Info label="Email" value={profile?.email || "-"} />
            <Info label="Username" value={profile?.username || "-"} />
            <Info
              label="Bergabung"
              value={
                profile?.dibuat_pada
                  ? new Date(profile.dibuat_pada).toLocaleDateString("id-ID")
                  : "-"
              }
            />
          </dl>
        </div>
      </div>
    </DashboardLayout>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-sm font-medium text-slate-700">{value}</p>
    </div>
  );
}
