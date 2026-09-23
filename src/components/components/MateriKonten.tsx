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
import { collection, query, where, getDocs } from "firebase/firestore";
import { EmptyState } from "@/components/ui";
import { KEGIATAN_CONTENT } from "@/content/kegiatanContent";

export type MateriItem = {
  id: string;
  kegiatan_id: string;
  kelas_id?: string | null;
  judul: string;
  url: string;
  deskripsi?: string | null;
  dibuat_pada?: string;
};

type KegiatanOption = {
  nomor: number;
  id: string;
  judul: string;
  subjudul: string;
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
  onlyGlobal?: boolean;
  /** Base path detail, contoh: "/siswa/materi" atau "/guru/materi" */
  detailBasePath: string;
};

export function MateriKonten({
  title = "Materi",
  description = "Pilih kegiatan, lalu buka materi. Detail dibuka di halaman terpisah.",
  onlyGlobal = true,
  detailBasePath,
}: MateriKontenProps) {
  const [kegiatanList, setKegiatanList] = useState<KegiatanOption[]>([]);
  const [selKeg, setSelKeg] = useState<number | "">("");
  const [materiList, setMateriList] = useState<MateriItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMateri, setLoadingMateri] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const kegsSnap = await getDocs(collection(db, "kegiatan"));
        if (cancelled) return;
        const list = kegsSnap.docs
          .map((d) => {
            const data = d.data();
            return {
              id: d.id,
              nomor: (data.nomor as number) ?? 0,
              judul: (data.judul as string) || "",
              subjudul: (data.subjudul as string) || "",
            };
          })
          .filter((k) => k.nomor > 0)
          .sort((a, b) => a.nomor - b.nomor);

        const finalList: KegiatanOption[] =
          list.length > 0
            ? list
            : KEGIATAN_CONTENT.map((k) => ({
                id: `kegiatan-${k.nomor}`,
                nomor: k.nomor,
                judul: k.judul,
                subjudul: k.subjudul,
              }));

        setKegiatanList(finalList);
        if (finalList.length > 0) setSelKeg(finalList[0].nomor);
      } catch (err) {
        console.error("[MateriKonten] load kegiatan error:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (selKeg === "") {
      setMateriList([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoadingMateri(true);
      try {
        const keg = kegiatanList.find((k) => k.nomor === selKeg);
        const kegId = keg?.id || `kegiatan-${selKeg}`;
        const snap = await getDocs(
          query(
            collection(db, "materi_tambahan"),
            where("kegiatan_id", "==", kegId),
          ),
        );
        if (cancelled) return;

        let list = snap.docs.map(
          (d) => ({ id: d.id, ...d.data() }) as MateriItem,
        );
        if (onlyGlobal) list = list.filter((m) => !m.kelas_id);
        list.sort((a, b) =>
          (b.dibuat_pada || "").localeCompare(a.dibuat_pada || ""),
        );
        setMateriList(list);
      } catch (err) {
        console.error("[MateriKonten] load materi error:", err);
        if (!cancelled) setMateriList([]);
      } finally {
        if (!cancelled) setLoadingMateri(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selKeg, kegiatanList, onlyGlobal]);

  if (loading) return <div className="card animate-pulse h-96" />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">{title}</h1>
        <p className="text-sm text-slate-500">{description}</p>
      </div>

      <div className="card">
        <label className="label-base">Pilih Kegiatan</label>
        <select
          className="input-base min-w-[240px]"
          value={selKeg}
          onChange={(e) => setSelKeg(Number(e.target.value))}>
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

      {loadingMateri ? (
        <div className="card animate-pulse h-40" />
      ) : materiList.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="h-7 w-7" />}
          title="Belum ada materi"
          description="Belum ada materi untuk kegiatan ini."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {materiList.map((m) => (
            <Link
              key={m.id}
              to={`${detailBasePath}/${m.id}`}
              className="card text-left group hover:shadow-float transition border-l-4 border-brand-teal">
              <div className="flex items-start gap-3">
                <div
                  className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${iconWrapClass(m.url)}`}>
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