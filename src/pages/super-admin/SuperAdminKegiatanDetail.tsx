/**
 * Halaman detail + edit kegiatan — Super Admin
 * Route: /super-admin/kegiatan/:id
 *
 * Memakai ActivityRenderer dengan editMode=true
 * (edit teks per bagian, termasuk link YouTube — bukan JSON).
 */
import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Activity,
  BookOpen,
  Hash,
  Palette,
  Loader2,
  Users,
  FileText,
  Shield,
  Clock,
  FileQuestion,
} from "lucide-react";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  updateDoc,
  setDoc,
} from "firebase/firestore";
import { db, type Kegiatan as KegiatanDoc } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ActivityRenderer } from "@/components/interactive/ActivityRenderer";
import { type KegiatanContent } from "@/content/types";
import { KEGIATAN_CONTENT } from "@/content/kegiatanContent";
import { fetchAssessment } from "@/lib/answers";
import { EmptyState, Badge } from "@/components/ui";

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
    to: "/super-admin?tab=admins",
    label: "Super Admins",
    icon: <Shield className="h-5 w-5" />,
  },
  {
    to: "/super-admin/questions",
    label: "Kelola Soal",
    icon: <FileQuestion className="h-5 w-5" />,
  },
];

export function SuperAdminKegiatanDetail() {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [kegiatan, setKegiatan] = useState<KegiatanContent | null>(null);
  const [docId, setDocId] = useState<string | null>(null);
  const [assessmentUrl, setAssessmentUrl] = useState<string | null>(null);
  const [assessmentJudul, setAssessmentJudul] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [contentSaving, setContentSaving] = useState(false);

  useEffect(() => {
    if (profile && profile.role !== "super_admin") {
      navigate("/super-admin/login");
    }
  }, [profile, navigate]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      setNotFound(false);
      try {
        let kId: string | null = null;
        let content: KegiatanContent | null = null;

        const byId = await getDoc(doc(db, "kegiatan", id));
        if (byId.exists()) {
          kId = byId.id;
          const raw = byId.data();
          if (raw.steps) {
            content = raw as KegiatanContent;
          } else {
            const base = KEGIATAN_CONTENT.find((k) => k.nomor === raw.nomor);
            content = base
              ? {
                  ...base,
                  judul: raw.judul || base.judul,
                  warna: raw.warna_tema || base.warna,
                }
              : null;
          }
        } else {
          const nomor = Number(id);
          if (!Number.isNaN(nomor)) {
            const snap = await getDocs(
              query(collection(db, "kegiatan"), where("nomor", "==", nomor)),
            );
            if (!snap.empty) {
              const d = snap.docs[0];
              kId = d.id;
              const raw = d.data();
              content = raw.steps
                ? (raw as KegiatanContent)
                : KEGIATAN_CONTENT.find((k) => k.nomor === nomor) || null;
            } else {
              content = KEGIATAN_CONTENT.find((k) => k.nomor === nomor) || null;
              // belum ada di Firestore — simpan nanti akan create
              kId = null;
            }
          }
        }

        if (!content) {
          if (!cancelled) setNotFound(true);
          return;
        }

        if (!cancelled) {
          setKegiatan(content);
          setDocId(kId);
        }

        if (kId) {
          try {
            const a = await fetchAssessment(kId);
            if (!cancelled) {
              setAssessmentUrl(a?.url_kuis || null);
              setAssessmentJudul(a?.judul_kuis || null);
            }
          } catch {
            /* optional */
          }
        }
      } catch (err) {
        console.error("[SuperAdminKegiatanDetail]", err);
        if (!cancelled) setNotFound(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleSaveContent = async () => {
    if (!kegiatan) return;
    setContentSaving(true);
    try {
      // Payload: simpan full KegiatanContent ke Firestore agar siswa baca dari DB
      const payload = {
        ...kegiatan,
        nomor: kegiatan.nomor,
        judul: kegiatan.judul,
        deskripsi: kegiatan.subjudul || null,
        warna_tema: kegiatan.warna || null,
        // steps, tujuan, materi, sdg, dll ikut tersimpan
        diupdate_pada: new Date().toISOString(),
      };

      if (docId) {
        await updateDoc(doc(db, "kegiatan", docId), payload);
      } else {
        // Buat dokumen baru berdasarkan nomor
        const ref = doc(collection(db, "kegiatan"));
        await setDoc(ref, { ...payload, id: ref.id });
        setDocId(ref.id);
      }
      toast("Konten kegiatan berhasil disimpan", "success");
    } catch (err) {
      console.error(err);
      toast("Gagal menyimpan konten", "error");
    } finally {
      setContentSaving(false);
    }
  };

  return (
    <DashboardLayout items={navItems} role="super_admin">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link to="/super-admin?tab=kegiatan" className="btn-ghost shrink-0">
            <ArrowLeft className="h-4 w-4" /> Kembali ke daftar
          </Link>
          <Badge color="purple">Mode Edit Super Admin</Badge>
        </div>

        {loading ? (
          <div className="card flex items-center justify-center gap-2 py-16 text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin" /> Memuat detail kegiatan…
          </div>
        ) : notFound || !kegiatan ? (
          <EmptyState
            icon={<Activity className="h-7 w-7" />}
            title="Kegiatan tidak ditemukan"
            description="ID atau nomor kegiatan tidak valid. Pastikan data sudah di-seed."
            action={
              <Link to="/super-admin?tab=kegiatan" className="btn-primary">
                Kembali ke daftar
              </Link>
            }
          />
        ) : (
          <>
            <div className="card flex flex-wrap items-center gap-4 text-sm text-slate-600 border-l-4 border-purple-500">
              <span className="inline-flex items-center gap-1.5">
                <Hash className="h-4 w-4 text-slate-400" />
                <span className="font-mono text-xs">
                  {docId || "(belum di DB)"}
                </span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Activity className="h-4 w-4 text-slate-400" /> Nomor{" "}
                {kegiatan.nomor}
              </span>
              {kegiatan.warna && (
                <span className="inline-flex items-center gap-1.5">
                  <Palette className="h-4 w-4 text-slate-400" />
                  <span
                    className="inline-block h-3 w-3 rounded-full ring-2 ring-white shadow"
                    style={{ backgroundColor: kegiatan.warna }}
                  />
                  {kegiatan.warna}
                </span>
              )}
            </div>

            <ActivityRenderer
              kegiatan={kegiatan}
              answers={{}}
              onUpdate={() => {}}
              status="preview"
              savedAt={null}
              assessmentUrl={assessmentUrl}
              assessmentJudul={assessmentJudul}
              kuisDone={false}
              editMode
              onContentChange={setKegiatan}
              onSaveContent={handleSaveContent}
              contentSaving={contentSaving}
            />
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
