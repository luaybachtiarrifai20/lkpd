import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  BookOpen,
  ExternalLink,
  Youtube,
  FileText,
  ArrowRight,
} from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import { EmptyState } from "@/components/ui";

export type MateriItem = {
  id: string;
  kegiatan_id?: string | null;
  kelas_id?: string | null;
  judul: string;
  url: string;
  deskripsi?: string | null;
  dibuat_pada?: string;
};

function isPdfUrl(url: string) {
  const u = (url || "").toLowerCase();
  if (!u) return false;
  if (/\.pdf(\?|#|$)/i.test(u)) return true;
  if (u.includes("application/pdf")) return true;
  if (u.includes("drive.google.com/file/")) return true;
  if (u.includes("drive.google.com/open")) return true;
  if (u.includes("docs.google.com/document")) return true;
  return false;
}

function isYoutubeUrl(url: string) {
  return /youtube\.com|youtu\.be/i.test(url || "");
}

function iconForUrl(url: string) {
  if (isPdfUrl(url)) return <FileText className="h-5 w-5" />;
  if (isYoutubeUrl(url)) return <Youtube className="h-5 w-5" />;
  return <ExternalLink className="h-5 w-5" />;
}

function iconWrapClass(url: string) {
  if (isPdfUrl(url)) return "bg-rose-50 text-rose-600";
  if (isYoutubeUrl(url)) return "bg-red-50 text-red-500";
  return "bg-brand-teal-light text-brand-teal";
}

function actionLabel(url: string) {
  if (isPdfUrl(url)) return "Lihat PDF";
  if (isYoutubeUrl(url)) return "Tonton video";
  return "Buka materi";
}

export type MateriKontenProps = {
  title?: string;
  description?: string;
  /** Base path detail: "/siswa/materi" atau "/guru/materi" */
  detailBasePath: string;
};

export function MateriKonten({
  title = "Materi",
  description = "Daftar materi pembelajaran. Klik card untuk membuka detail.",
  detailBasePath,
}: MateriKontenProps) {
  const [materiList, setMateriList] = useState<MateriItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const snap = await getDocs(collection(db, "materi_tambahan"));
        if (cancelled) return;

        // Semua materi global (tanpa kelas_id). kegiatan_id diabaikan.
        const list = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }) as MateriItem)
          .filter((m) => !m.kelas_id);

        list.sort((a, b) =>
          (b.dibuat_pada || "").localeCompare(a.dibuat_pada || ""),
        );
        setMateriList(list);
      } catch (err) {
        console.error("[MateriKonten] load error:", err);
        if (!cancelled) setMateriList([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return <div className="card animate-pulse h-96" />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">{title}</h1>
        <p className="text-sm text-slate-500">{description}</p>
      </div>

      {materiList.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="h-7 w-7" />}
          title="Belum ada materi"
          description="Super Admin belum menambahkan materi."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {materiList.map((m) => (
            <Link
              key={m.id}
              to={`${detailBasePath}/${m.id}`}
              className="card text-left group hover:shadow-float transition border-l-4 border-brand-teal"
            >
              <div className="flex items-start gap-3">
                <div
                  className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${iconWrapClass(m.url)}`}
                >
                  {iconForUrl(m.url)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-slate-800 group-hover:text-brand-green transition">
                    {m.judul}
                  </p>
                  {m.deskripsi && (
                    <p className="mt-0.5 text-xs text-slate-500 line-clamp-2">
                      {m.deskripsi}
                    </p>
                  )}
                  <p className="mt-1.5 text-[11px] text-brand-green font-medium inline-flex items-center gap-1">
                    {actionLabel(m.url)} <ArrowRight className="h-3 w-3" />
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}