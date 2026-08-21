import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  LayoutDashboard,
  History,
  User as UserIcon,
  ArrowRight,
  CheckCircle2,
  FileEdit,
  Clock,
  Award,
  Sparkles,
  BookOpen,
  KeyRound,
  Loader2,
  LogIn,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { KEGIATAN_CONTENT } from "@/content/kegiatanContent";
import {
  db,
  type Jawaban,
  type StatusKuisSiswa,
  type Kelas,
  type TestAnswer,
  type Question,
} from "@/lib/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  updateDoc,
} from "firebase/firestore";
import { SDGBadgeChip, EmptyState, Badge } from "@/components/ui";
import { Modal } from "@/components/ui/Modal";

const navItems = [
  {
    to: "/siswa",
    label: "Dashboard",
    icon: <LayoutDashboard className="h-5 w-5" />,
  },
  {
    to: "/siswa/riwayat",
    label: "Riwayat & Nilai",
    icon: <History className="h-5 w-5" />,
  },
  {
    to: "/siswa/profil",
    label: "Profil",
    icon: <UserIcon className="h-5 w-5" />,
  },
];

type Row = { jawaban?: Jawaban; kuis?: StatusKuisSiswa };

// ============ Komponen Progres Keseluruhan ============
type KegiatanMeta = {
  id: string;
  nomor: number;
  judul: string;
  subjudul?: string;
  warna: string;
  sdg?: { nomor: number; warna: string; label: string }[];
  cakupanMateri?: string[];
  stepsCount?: number;
};

type ProgresKeseluruhanProps = {
  rows: Record<number, Row>;
  loading: boolean;
  kelas?: Kelas | null;
  onBack?: () => void;
  kegiatanList: KegiatanMeta[]; // <-- baru
};

export function ProgresKeseluruhan({
  rows,
  loading,
  kegiatanList,
}: ProgresKeseluruhanProps) {
  const statusMeta = (status?: Jawaban["status"]) => {
    switch (status) {
      case "terkumpul":
        return {
          label: "Terkumpul",
          cls: "bg-success/10 text-success",
          icon: <CheckCircle2 className="h-3.5 w-3.5" />,
        };
      case "dinilai":
        return {
          label: "Dinilai",
          cls: "bg-brand-teal-light text-brand-teal-dark",
          icon: <Award className="h-3.5 w-3.5" />,
        };
      case "draft":
        return {
          label: "Draft",
          cls: "bg-brand-amber-light text-[#B26A00]",
          icon: <FileEdit className="h-3.5 w-3.5" />,
        };
      default:
        return {
          label: "Belum dikerjakan",
          cls: "bg-slate-100 text-slate-500",
          icon: <Clock className="h-3.5 w-3.5" />,
        };
    }
  };

  const totalKegiatan = kegiatanList.length || 1;
  const totalDone = kegiatanList.filter((k) => {
    const r = rows[k.nomor];
    return (
      r?.jawaban?.status === "terkumpul" || r?.jawaban?.status === "dinilai"
    );
  }).length;

  return (
    <div className="space-y-6">
      {/* ... header onBack / judul sama ... */}

      <div className="card bg-gradient-to-br from-brand-green to-brand-teal text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-white/80">Progres Keseluruhan</p>
            <p className="text-3xl font-extrabold">
              {totalDone}/{totalKegiatan} Kegiatan
            </p>
          </div>
          <Sparkles className="h-10 w-10 text-white/70" />
        </div>
        <div className="mt-4">
          <div className="h-2.5 overflow-hidden rounded-full bg-white/25">
            <div
              className="h-full rounded-full bg-white transition-all"
              style={{ width: `${(totalDone / totalKegiatan) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-bold text-slate-800">
          Peta Progres Kegiatan
        </h2>
        {loading ? (
          <div className="card animate-pulse h-40" />
        ) : kegiatanList.length === 0 ? (
          <EmptyState
            icon={<BookOpen className="h-7 w-7" />}
            title="Belum ada kegiatan"
            description="Data kegiatan belum tersedia di sistem."
          />
        ) : (
          <div className="relative space-y-4">
            <div className="absolute left-6 top-8 bottom-8 w-0.5 bg-gradient-to-b from-brand-green/30 via-brand-teal/30 to-brand-teal/20 hidden sm:block" />
            {kegiatanList.map((k) => {
              const row = rows[k.nomor];
              const status = statusMeta(row?.jawaban?.status);
              const kuisDone = row?.kuis?.sudah_mengerjakan;
              const isDone =
                row?.jawaban?.status === "terkumpul" ||
                row?.jawaban?.status === "dinilai";
              return (
                <Link
                  key={k.id || k.nomor}
                  to={`/siswa/kegiatan/${k.nomor}`}
                  className="group relative flex items-stretch gap-4">
                  <div className="relative z-10 flex flex-col items-center pt-5">
                    <div
                      className={`grid h-12 w-12 shrink-0 place-items-center rounded-full text-lg font-bold text-white shadow-soft transition ${isDone ? "ring-4 ring-offset-2" : ""}`}
                      style={{
                        backgroundColor: k.warna,
                        boxShadow: isDone
                          ? `0 0 0 4px ${k.warna}25`
                          : undefined,
                      }}>
                      {isDone ? <CheckCircle2 className="h-6 w-6" /> : k.nomor}
                    </div>
                  </div>
                  <div
                    className="flex-1 overflow-hidden rounded-2xl bg-white p-5 shadow-soft transition group-hover:shadow-float"
                    style={{ borderTop: `3px solid ${k.warna}` }}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                          Kegiatan {k.nomor}
                        </p>
                        <h3 className="text-sm font-bold leading-snug text-slate-800">
                          {(k.judul || "").replace(
                            /^Kegiatan \d+\s*[—-]\s*/,
                            "",
                          )}
                        </h3>
                        <p className="text-xs text-slate-500">{k.subjudul}</p>
                      </div>
                      <span className={`badge ${status.cls}`}>
                        {status.icon} {status.label}
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {(k.cakupanMateri || []).map((m) => (
                        <span key={m} className="chip">
                          {m}
                        </span>
                      ))}
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      {(k.sdg || []).map((s) => (
                        <SDGBadgeChip key={s.nomor} sdg={s} />
                      ))}
                    </div>

                    <div className="mt-3 flex items-center justify-between border-t border-slate-50 pt-3">
                      <div className="flex items-center gap-3 text-xs text-slate-500">
                        <span className="inline-flex items-center gap-1">
                          <CheckCircle2
                            className={`h-3.5 w-3.5 ${kuisDone ? "text-success" : "text-slate-300"}`}
                          />
                          Kuis {kuisDone ? "selesai" : "belum"}
                        </span>
                        {k.stepsCount != null && (
                          <span className="inline-flex items-center gap-1 text-slate-400">
                            {k.stepsCount} tahap PBL
                          </span>
                        )}
                      </div>
                      <span className="inline-flex items-center gap-1 text-sm font-semibold text-brand-green group-hover:gap-2 transition-all">
                        Buka <ArrowRight className="h-4 w-4" />
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ============ Dashboard Siswa ============
export function StudentDashboard() {
  const { profile, refreshAuth } = useAuth();
  const { toast } = useToast();
  const [rows, setRows] = useState<Record<number, Row>>({});
  const [loading, setLoading] = useState(true);
  const [kelas, setKelas] = useState<Kelas | null>(null);
  const [kodeInput, setKodeInput] = useState("");
  const [joining, setJoining] = useState(false);
  /** null = tampil list kelas; string = id kelas yang dibuka progres-nya */
  const [selectedKelasId, setSelectedKelasId] = useState<string | null>(null);
  const [kegiatanList, setKegiatanList] = useState<KegiatanMeta[]>([]);

  const loadKelas = useCallback(async () => {
    if (!profile?.kelas_id) {
      setKelas(null);
      return;
    }
    try {
      const snap = await getDoc(doc(db, "kelas", profile.kelas_id));
      if (snap.exists()) {
        setKelas({ id: snap.id, ...snap.data() } as Kelas);
      } else {
        setKelas(null);
      }
    } catch (err) {
      console.error("[StudentDashboard] loadKelas error:", err);
      setKelas(null);
    }
  }, [profile?.kelas_id]);

  useEffect(() => {
    loadKelas();
  }, [loadKelas]);

  useEffect(() => {
    if (!profile) return;
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const [jSnapshot, kSnapshot, kegsSnapshot] = await Promise.all([
          getDocs(
            query(
              collection(db, "jawaban"),
              where("siswa_id", "==", profile.id),
            ),
          ),
          getDocs(
            query(
              collection(db, "status_kuis_siswa"),
              where("siswa_id", "==", profile.id),
            ),
          ),
          getDocs(collection(db, "kegiatan")),
        ]);
        if (!active) return;

        const jByKeg = jSnapshot.docs.reduce<Record<string, Jawaban>>(
          (acc, d) => {
            const data = { id: d.id, ...d.data() } as Jawaban;
            acc[data.kegiatan_id] = data;
            return acc;
          },
          {},
        );
        const kByKeg = kSnapshot.docs.reduce<Record<string, StatusKuisSiswa>>(
          (acc, d) => {
            const data = { id: d.id, ...d.data() } as StatusKuisSiswa;
            acc[data.kegiatan_id] = data;
            return acc;
          },
          {},
        );

        const list: KegiatanMeta[] = kegsSnapshot.docs
          .map((d) => {
            const data = d.data();
            return {
              id: d.id,
              nomor: data.nomor ?? 0,
              judul: data.judul || "",
              subjudul: data.subjudul || "",
              warna: data.warna || "#2E7D32",
              sdg: Array.isArray(data.sdg) ? data.sdg : [],
              cakupanMateri: Array.isArray(data.cakupanMateri)
                ? data.cakupanMateri
                : [],
              stepsCount: Array.isArray(data.steps)
                ? data.steps.length
                : undefined,
            } as KegiatanMeta;
          })
          .filter((k) => k.nomor > 0)
          .sort((a, b) => a.nomor - b.nomor);

        // Fallback seed jika DB kosong
        const finalList =
          list.length > 0
            ? list
            : KEGIATAN_CONTENT.map((k) => ({
                id: `kegiatan-${k.nomor}`,
                nomor: k.nomor,
                judul: k.judul,
                subjudul: k.subjudul,
                warna: k.warna,
                sdg: k.sdg,
                cakupanMateri: k.cakupanMateri,
                stepsCount: k.steps?.length,
              }));

        setKegiatanList(finalList);

        const newRows: Record<number, Row> = {};
        finalList.forEach((k) => {
          newRows[k.nomor] = {
            jawaban: jByKeg[k.id] || jByKeg[`kegiatan-${k.nomor}`],
            kuis: kByKeg[k.id] || kByKeg[`kegiatan-${k.nomor}`],
          };
        });
        setRows(newRows);
      } catch (err) {
        console.error("[StudentDashboard] load progress error:", err);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [profile]);

  

  const joinKelas = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !kodeInput.trim()) return;
    setJoining(true);
    try {
      const kode = kodeInput.trim().toUpperCase();
      let snapshot = await getDocs(
        query(collection(db, "kelas"), where("kode_undangan", "==", kode)),
      );
      if (snapshot.empty) {
        snapshot = await getDocs(
          query(
            collection(db, "kelas"),
            where("kode_undangan", "==", kodeInput.trim()),
          ),
        );
      }

      if (snapshot.empty) {
        toast("Kode kelas tidak valid. Cek lagi kode dari guru.", "error");
        return;
      }

      const kelasDoc = snapshot.docs[0];
      const kelasId = kelasDoc.id;
      const kelasData = { id: kelasDoc.id, ...kelasDoc.data() } as Kelas;

      const updates: Record<string, unknown> = { kelas_id: kelasId };
      if (profile.status === "pending") {
        updates.status = "active";
      }
      await updateDoc(doc(db, "profiles", profile.id), updates);
      await refreshAuth();

      setKelas(kelasData);
      setKodeInput("");
      toast(`Berhasil bergabung ke kelas "${kelasData.nama_kelas}"`, "success");
    } catch (err) {
      console.error("[StudentDashboard] joinKelas error:", err);
      toast(
        err instanceof Error ? err.message : "Gagal bergabung ke kelas",
        "error",
      );
    } finally {
      setJoining(false);
    }
  };

  // View: Progres (setelah klik kelas)
  if (selectedKelasId && kelas && selectedKelasId === kelas.id) {
    return (
      <DashboardLayout items={navItems} role="siswa">
        <ProgresKeseluruhan
          rows={rows}
          loading={loading}
          kelas={kelas}
          onBack={() => setSelectedKelasId(null)}
          kegiatanList={kegiatanList}
        />
      </DashboardLayout>
    );
  }

  // View: List kelas / form gabung
  return (
    <DashboardLayout items={navItems} role="siswa">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Halo, {profile?.nama?.split(" ")[0]}!
          </h1>
          <p className="text-sm text-slate-500">
            Pilih kelas untuk melihat progres kegiatan, atau gabung dengan kode
            undangan.
          </p>
        </div>

        <div>
          <h2 className="mb-3 text-lg font-bold text-slate-800">Kelas Saya</h2>

          {kelas ? (
            <button
              type="button"
              onClick={() => setSelectedKelasId(kelas.id)}
              className="card w-full text-left transition hover:shadow-float border-l-4 border-brand-green group">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="grid h-12 w-12 place-items-center rounded-xl bg-brand-green-light text-brand-green">
                    <BookOpen className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">
                      {kelas.nama_kelas}
                    </p>
                    <p className="text-xs text-slate-500">
                      Kode:{" "}
                      <span className="font-mono font-semibold text-brand-green">
                        {kelas.kode_undangan}
                      </span>
                    </p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 text-sm font-semibold text-brand-green group-hover:gap-2 transition-all">
                  Lihat progres <ArrowRight className="h-4 w-4" />
                </span>
              </div>
            </button>
          ) : (
            <EmptyState
              icon={<BookOpen className="h-7 w-7" />}
              title="Belum ada kelas"
              description="Gabung ke kelas dengan kode undangan dari guru di bawah."
            />
          )}
        </div>

        {!kelas && (
          <div className="card border-2 border-dashed border-brand-amber/40 bg-brand-amber-light/30">
            <div className="mb-3 flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-brand-amber" />
              <h2 className="text-sm font-bold text-slate-800">
                Gabung ke Kelas
              </h2>
            </div>
            <p className="mb-3 text-xs text-slate-600">
              Masukkan <strong>kode undangan</strong> dari guru Anda. Setelah
              bergabung, kelas muncul di list di atas — klik untuk masuk ke
              progres.
            </p>
            <form
              onSubmit={joinKelas}
              className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <div className="flex-1">
                <label className="label-base">Kode Kelas</label>
                <input
                  className="input-base font-mono uppercase tracking-wider"
                  value={kodeInput}
                  onChange={(e) => setKodeInput(e.target.value)}
                  placeholder="Contoh: ABC12X"
                  required
                  maxLength={12}
                  disabled={joining}
                />
              </div>
              <button
                type="submit"
                disabled={joining || !kodeInput.trim()}
                className="btn-primary shrink-0">
                {joining ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <LogIn className="h-4 w-4" />
                )}
                {joining ? "Memproses…" : "Gabung Kelas"}
              </button>
            </form>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

// ============ Riwayat ============
export function StudentRiwayat() {
  const { profile } = useAuth();
  const [list, setList] = useState<
    {
      id: string;
      nomor: number;
      judul: string;
      subjudul: string;
      warna: string;
      jawaban?: Jawaban;
      kuis?: StatusKuisSiswa;
    }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailNomor, setDetailNomor] = useState<number | null>(null);
  const [detailJawaban, setDetailJawaban] = useState<Jawaban | null>(null);
  const [detailPre, setDetailPre] = useState<TestAnswer | null>(null);
  const [detailPost, setDetailPost] = useState<TestAnswer | null>(null);
  const [detailPreQs, setDetailPreQs] = useState<Question[]>([]);
  const [detailPostQs, setDetailPostQs] = useState<Question[]>([]);

  useEffect(() => {
    if (!profile) return;
    let active = true;
    (async () => {
      try {
        const kegsSnapshot = await getDocs(collection(db, "kegiatan"));
        const [jSnapshot, kSnapshot] = await Promise.all([
          getDocs(
            query(
              collection(db, "jawaban"),
              where("siswa_id", "==", profile.id),
            ),
          ),
          getDocs(
            query(
              collection(db, "status_kuis_siswa"),
              where("siswa_id", "==", profile.id),
            ),
          ),
        ]);
        if (!active) return;
        console.debug("[StudentRiwayat] kegiatan docs:", kegsSnapshot.docs.map((d) => ({ id: d.id, nomor: d.data().nomor })));
        console.debug("[StudentRiwayat] jawaban docs:", jSnapshot.docs.map((d) => ({ id: d.id, kegiatan_id: d.data().kegiatan_id, skor: d.data().skor, status: d.data().status })));
        console.debug("[StudentRiwayat] test_answers docs:", (await getDocs(query(collection(db, "test_answers"), where("siswa_id", "==", profile.id)))).docs.map((d) => ({ id: d.id, kegiatan_id: d.data().kegiatan_id, test_type: d.data().test_type, score: d.data().score })));
        const jByKeg = jSnapshot.docs.reduce<Record<string, Jawaban>>(
          (a, d) => {
            const data = { id: d.id, ...d.data() } as Jawaban;
            a[data.kegiatan_id] = data;
            return a;
          },
          {},
        );
        const kByKeg = kSnapshot.docs.reduce<Record<string, StatusKuisSiswa>>(
          (a, d) => {
            const data = { id: d.id, ...d.data() } as StatusKuisSiswa;
            a[data.kegiatan_id] = data;
            return a;
          },
          {},
        );
        const items = kegsSnapshot.docs.map((d) => {
          const k = d.data() as {
            nomor: number;
            judul?: string;
            subjudul?: string;
            warna?: string;
          };
          const nomor = k.nomor;
          return {
            id: d.id,
            nomor,
            judul:
              (typeof k.judul === "string" && k.judul) ||
              `Kegiatan ${nomor}`,
            subjudul:
              (typeof k.subjudul === "string" && k.subjudul) || "",
            warna: (typeof k.warna === "string" && k.warna) || "#2E7D32",
            jawaban: jByKeg[d.id] || jByKeg[`kegiatan-${nomor}`],
            kuis: kByKeg[d.id] || kByKeg[`kegiatan-${nomor}`],
          };
        });
        items.sort((a, b) => a.nomor - b.nomor);
        setList(items);
      } catch (err) {
        console.error("[StudentRiwayat] error:", err);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [profile]);

  async function openDetail(nomor: number, kegiatanDocId?: string) {
    if (!profile) return;
    setDetailNomor(nomor);
    setDetailLoading(true);
    setDetailOpen(true);
    setDetailJawaban(null);
    setDetailPre(null);
    setDetailPost(null);
    setDetailPreQs([]);
    setDetailPostQs([]);
    try {
      const candidates: string[] = [];
      if (kegiatanDocId) candidates.push(kegiatanDocId);
      candidates.push(`kegiatan-${nomor}`);
      candidates.push(String(nomor));
      // dedupe & keep order
      const unique = Array.from(new Set(candidates));
      console.debug("[StudentRiwayat] openDetail:", { nomor, kegiatanDocId, candidates: unique });

      const jawSnap = await getDocs(
        query(
          collection(db, "jawaban"),
          where("siswa_id", "==", profile.id),
          where("kegiatan_id", "in", unique),
        ),
      );
      if (!jawSnap.empty) {
        const j = jawSnap.docs[0];
        setDetailJawaban({ id: j.id, ...j.data() } as Jawaban);
      }

      const testSnap = await getDocs(
        query(
          collection(db, "test_answers"),
          where("siswa_id", "==", profile.id),
          where("kegiatan_id", "in", unique),
        ),
      );
      testSnap.docs.forEach((d) => {
        const data = { id: d.id, ...d.data() } as TestAnswer;
        if (data.test_type === "pretest") setDetailPre(data);
        if (data.test_type === "posttest") setDetailPost(data);
      });

      const preQSnap = await getDocs(
        query(
          collection(db, "questions"),
          where("kegiatan_id", "in", unique),
          where("test_type", "==", "pretest"),
        ),
      );
      const postQSnap = await getDocs(
        query(
          collection(db, "questions"),
          where("kegiatan_id", "in", unique),
          where("test_type", "==", "posttest"),
        ),
      );
      setDetailPreQs(
        preQSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Question)),
      );
      setDetailPostQs(
        postQSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Question)),
      );
    } catch (err) {
      console.error("[StudentRiwayat] openDetail error:", err);
    } finally {
      setDetailLoading(false);
    }
  }

  return (
    <DashboardLayout items={navItems} role="siswa">
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-slate-800">Riwayat & Nilai</h1>
        {loading ? (
          <div className="card animate-pulse h-40" />
        ) : list.length === 0 ? (
          <EmptyState
            icon={<History className="h-7 w-7" />}
            title="Belum ada riwayat"
            description="Kerjakan kegiatan untuk melihat riwayat di sini."
          />
        ) : (
          <div className="space-y-3">
            {list.map((item) => {
              return (
                <div
                  key={item.nomor}
                  className="card flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
                  style={{ borderLeft: `4px solid ${item.warna}` }}>
                  <div>
                    <p className="text-xs font-semibold text-slate-400">
                      Kegiatan {item.nomor}
                    </p>
                    <p className="text-sm font-bold text-slate-800">
                      {item.subjudul || item.judul}
                    </p>
                    <p className="text-xs text-slate-500">
                      Jawaban: {item.jawaban?.status || "Belum dikerjakan"} •
                      Kuis: {item.kuis?.sudah_mengerjakan ? "Selesai" : "Belum"}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {item.jawaban?.skor != null && (
                      <Badge color="teal">
                        <Award className="h-3.5 w-3.5" /> Skor:{" "}
                        {item.jawaban.skor}
                      </Badge>
                    )}
                    {item.kuis?.skor_manual != null && (
                      <Badge color="amber">
                        <Award className="h-3.5 w-3.5" /> Kuis:{" "}
                        {item.kuis.skor_manual}
                      </Badge>
                    )}
                    <div className="flex gap-2">
                      <button
                        onClick={() => openDetail(item.nomor, item.id)}
                        className="btn-outline">
                        Lihat Hasil
                      </button>
                      <Link
                        to={`/siswa/kegiatan/${item.nomor}`}
                        className="btn-ghost">
                        Buka Kegiatan
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {/* Detail modal */}
        <Modal open={detailOpen} onClose={() => setDetailOpen(false)} title={detailNomor ? `Hasil Kegiatan ${detailNomor}` : "Hasil Kegiatan"}>
          <div className="space-y-4">
            {detailLoading ? (
              <div className="card animate-pulse h-40" />
            ) : (
              <div>
                <h3 className="text-lg font-semibold">Activity</h3>
                <p className="text-sm">Skor: {detailJawaban?.skor ?? "-"}</p>
                <p className="text-sm whitespace-pre-wrap mt-2">Feedback Guru: {detailJawaban?.feedback_guru || "-"}</p>

                <hr className="my-3" />
                <h3 className="text-lg font-semibold">Pretest</h3>
                <p className="text-sm">Skor: {detailPre?.score ?? "-"}</p>
                <p className="text-sm whitespace-pre-wrap mt-2">Feedback Guru: {detailPre?.feedback_guru || "-"}</p>
                <div className="mt-2">
                  {detailPreQs.map((q) => (
                    <div key={q.id} className="mb-2">
                      <div className="text-sm font-medium">{q.question_text}</div>
                      <div className="text-sm text-slate-600">Jawaban: {String(detailPre?.answers?.[q.id] ?? "(belum)")}</div>
                    </div>
                  ))}
                </div>

                <hr className="my-3" />
                <h3 className="text-lg font-semibold">Posttest</h3>
                <p className="text-sm">Skor: {detailPost?.score ?? "-"}</p>
                <p className="text-sm whitespace-pre-wrap mt-2">Feedback Guru: {detailPost?.feedback_guru || "-"}</p>
                <div className="mt-2">
                  {detailPostQs.map((q) => (
                    <div key={q.id} className="mb-2">
                      <div className="text-sm font-medium">{q.question_text}</div>
                      <div className="text-sm text-slate-600">Jawaban: {String(detailPost?.answers?.[q.id] ?? "(belum)")}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Modal>
      </div>
    </DashboardLayout>
  );
}

// ============ Profil ============
export function StudentProfil() {
  const { profile, refreshAuth } = useAuth();
  const { toast } = useToast();
  const [kelas, setKelas] = useState<Kelas | null>(null);
  const [kodeInput, setKodeInput] = useState("");
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (!profile?.kelas_id) {
      setKelas(null);
      return;
    }
    (async () => {
      try {
        const snap = await getDoc(doc(db, "kelas", profile.kelas_id!));
        if (snap.exists()) setKelas({ id: snap.id, ...snap.data() } as Kelas);
        else setKelas(null);
      } catch {
        setKelas(null);
      }
    })();
  }, [profile?.kelas_id]);

  const joinKelas = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !kodeInput.trim()) return;
    setJoining(true);
    try {
      const kode = kodeInput.trim().toUpperCase();
      let snapshot = await getDocs(
        query(collection(db, "kelas"), where("kode_undangan", "==", kode)),
      );
      if (snapshot.empty) {
        snapshot = await getDocs(
          query(
            collection(db, "kelas"),
            where("kode_undangan", "==", kodeInput.trim()),
          ),
        );
      }
      if (snapshot.empty) {
        toast("Kode kelas tidak valid", "error");
        return;
      }
      const kelasDoc = snapshot.docs[0];
      const updates: Record<string, unknown> = { kelas_id: kelasDoc.id };
      if (profile.status === "pending") updates.status = "active";
      await updateDoc(doc(db, "profiles", profile.id), updates);
      await refreshAuth();
      setKelas({ id: kelasDoc.id, ...kelasDoc.data() } as Kelas);
      setKodeInput("");
      toast(
        `Berhasil bergabung ke kelas "${kelasDoc.data().nama_kelas}"`,
        "success",
      );
    } catch (err) {
      console.error(err);
      toast(err instanceof Error ? err.message : "Gagal bergabung", "error");
    } finally {
      setJoining(false);
    }
  };

  return (
    <DashboardLayout items={navItems} role="siswa">
      <div className="max-w-lg space-y-6">
        <h1 className="text-2xl font-bold text-slate-800">Profil Siswa</h1>
        <div className="card">
          <div className="flex items-center gap-4">
            <div className="grid h-16 w-16 place-items-center rounded-2xl bg-brand-green-light text-2xl font-bold text-brand-green-dark">
              {profile?.nama?.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-lg font-bold text-slate-800">
                {profile?.nama}
              </p>
              <Badge color="blue">
                <UserIcon className="h-3.5 w-3.5" /> Siswa
              </Badge>
            </div>
          </div>
          <dl className="mt-5 grid gap-4 sm:grid-cols-2">
            <Info label="Email" value={profile?.email || "-"} />
            <Info
              label="Username/NISN"
              value={profile?.username || profile?.nisn || "-"}
            />
            <Info label="NISN" value={profile?.nisn || "-"} />
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

        <div className="card">
          <h2 className="mb-3 text-sm font-bold text-slate-800 flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-brand-green" /> Kelas
          </h2>
          {kelas ? (
            <div className="rounded-xl bg-brand-green-light/40 px-4 py-3">
              <p className="text-sm font-bold text-slate-800">
                {kelas.nama_kelas}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                Kode:{" "}
                <span className="font-mono font-semibold text-brand-green">
                  {kelas.kode_undangan}
                </span>
              </p>
              <p className="mt-2 text-xs text-success flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" /> Sudah bergabung — tidak
                perlu kode lagi
              </p>
            </div>
          ) : (
            <form onSubmit={joinKelas} className="space-y-3">
              <p className="text-xs text-slate-500">
                Anda belum bergabung ke kelas. Masukkan kode undangan dari guru.
              </p>
              <input
                className="input-base font-mono uppercase tracking-wider"
                value={kodeInput}
                onChange={(e) => setKodeInput(e.target.value)}
                placeholder="Kode undangan"
                required
                disabled={joining}
              />
              <button
                type="submit"
                disabled={joining || !kodeInput.trim()}
                className="btn-primary w-full">
                {joining ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <LogIn className="h-4 w-4" />
                )}
                {joining ? "Memproses…" : "Gabung Kelas"}
              </button>
            </form>
          )}
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
