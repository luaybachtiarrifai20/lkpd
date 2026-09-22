import { useEffect, useState, useRef, useCallback } from "react";
import {
  BookOpen,
  ExternalLink,
  Youtube,
  FileText,
  ArrowRight,
  X,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Download,
  RotateCcw,
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

  // File langsung
  if (/\.pdf(\?|#|$)/i.test(u)) return true;
  if (u.includes("application/pdf")) return true;

  // Google Drive / Docs (hampir selalu dokumen yang bisa di-embed)
  if (u.includes("drive.google.com/file/")) return true;
  if (u.includes("drive.google.com/open")) return true;
  if (u.includes("docs.google.com/document")) return true;
  if (u.includes("docs.google.com/presentation")) return true;
  if (u.includes("docs.google.com/spreadsheets")) return false; // opsional

  // Host lain yang sering dipakai untuk PDF
  if (u.includes("dropbox.com") && u.includes(".pdf")) return true;
  if (u.includes("firebase") && u.includes(".pdf")) return true;

  return false;
}

function isYoutubeUrl(url: string) {
  return /youtube\.com|youtu\.be/i.test(url || "");
}

function toYoutubeEmbed(url: string) {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) {
      return `https://www.youtube.com/embed/${u.pathname.slice(1)}`;
    }
    const id = u.searchParams.get("v");
    if (id) return `https://www.youtube.com/embed/${id}`;
  } catch {
    /* ignore */
  }
  return url;
}

/** Normalisasi link Drive agar bisa di-embed */
function toEmbeddablePdfUrl(url: string) {
  try {
    // https://drive.google.com/file/d/FILE_ID/view?usp=sharing
    // https://drive.google.com/file/d/FILE_ID/edit
    const fileMatch = url.match(/drive\.google\.com\/file\/d\/([^/]+)/);
    if (fileMatch?.[1]) {
      return `https://drive.google.com/file/d/${fileMatch[1]}/preview`;
    }

    // https://drive.google.com/open?id=FILE_ID
    const openMatch = url.match(/drive\.google\.com\/open\?id=([^&]+)/);
    if (openMatch?.[1]) {
      return `https://drive.google.com/file/d/${openMatch[1]}/preview`;
    }

    // https://docs.google.com/document/d/ID/edit → preview
    const docMatch = url.match(/docs\.google\.com\/document\/d\/([^/]+)/);
    if (docMatch?.[1]) {
      return `https://docs.google.com/document/d/${docMatch[1]}/preview`;
    }
  } catch {
    /* ignore */
  }
  return url;
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

// ============ PDF Viewer ============
function PdfViewer({ url, title }: { url: string; title: string }) {
  const [zoom, setZoom] = useState(100);
  const [fullscreen, setFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const embedUrl = toEmbeddablePdfUrl(url);

  const zoomIn = () => setZoom((z) => Math.min(z + 25, 200));
  const zoomOut = () => setZoom((z) => Math.max(z - 25, 50));
  const zoomReset = () => setZoom(100);

  const toggleFullscreen = useCallback(async () => {
    const el = containerRef.current;
    if (!el) return;
    try {
      if (!document.fullscreenElement) {
        await el.requestFullscreen();
        setFullscreen(true);
      } else {
        await document.exitFullscreen();
        setFullscreen(false);
      }
    } catch {
      setFullscreen((v) => !v);
    }
  }, []);

  useEffect(() => {
    const onFs = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  const handleDownload = () => {
    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.download = title.endsWith(".pdf") ? title : `${title || "materi"}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div
      ref={containerRef}
      className={`flex flex-col rounded-xl border border-slate-200 bg-slate-100 overflow-hidden ${
        fullscreen ? "fixed inset-0 z-[100] rounded-none" : ""
      }`}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-white px-3 py-2">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={zoomOut}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100"
            title="Zoom out">
            <ZoomOut className="h-4 w-4" />
          </button>
          <span className="min-w-[3rem] text-center text-xs font-semibold text-slate-600">
            {zoom}%
          </span>
          <button
            type="button"
            onClick={zoomIn}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100"
            title="Zoom in">
            <ZoomIn className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={zoomReset}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100"
            title="Reset zoom">
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleDownload}
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"
            title="Unduh PDF">
            <Download className="h-4 w-4" /> Unduh
          </button>
          <button
            type="button"
            onClick={toggleFullscreen}
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"
            title={fullscreen ? "Keluar layar penuh" : "Layar penuh"}>
            {fullscreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
            {fullscreen ? "Keluar" : "Penuh"}
          </button>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-brand-green hover:bg-brand-green/10"
            title="Buka di tab baru">
            <ExternalLink className="h-4 w-4" /> Tab baru
          </a>
        </div>
      </div>

      {/* Area PDF */}
      <div
        className="relative flex-1 overflow-auto bg-slate-200/80"
        style={{ height: fullscreen ? "100%" : "70vh" }}>
        <div
          className="origin-top-left transition-transform duration-150"
          style={{
            width: `${zoom}%`,
            height: `${zoom}%`,
            minWidth: "100%",
            minHeight: "100%",
          }}>
          <iframe
            src={embedUrl}
            title={title}
            className="h-full w-full bg-white"
            style={{
              minHeight: fullscreen ? "100vh" : "70vh",
              border: "none",
            }}
          />
        </div>
      </div>

      <p className="border-t border-slate-200 bg-white px-3 py-1.5 text-[11px] text-slate-400">
        Gunakan tombol zoom di toolbar. Beberapa host PDF juga menampilkan
        kontrol bawaan browser di dalam viewer.
      </p>
    </div>
  );
}

// ============ MateriKonten ============
export type MateriKontenProps = {
  title?: string;
  description?: string;
  /** true = hanya materi Super Admin (tanpa kelas_id) */
  onlyGlobal?: boolean;
};

export function MateriKonten({
  title = "Materi",
  description = "Materi pembelajaran per kegiatan. PDF dapat dilihat langsung dengan zoom dan unduh.",
  onlyGlobal = true,
}: MateriKontenProps) {
  const [kegiatanList, setKegiatanList] = useState<KegiatanOption[]>([]);
  const [selKeg, setSelKeg] = useState<number | "">("");
  const [materiList, setMateriList] = useState<MateriItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMateri, setLoadingMateri] = useState(false);
  const [preview, setPreview] = useState<MateriItem | null>(null);

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
        if (onlyGlobal) {
          list = list.filter((m) => !m.kelas_id);
        }
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

  if (loading) {
    return <div className="card animate-pulse h-96" />;
  }

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
          onChange={(e) => {
            setSelKeg(Number(e.target.value));
            setPreview(null);
          }}>
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
            <button
              key={m.id}
              type="button"
              onClick={() => setPreview(m)}
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
            </button>
          ))}
        </div>
      )}

      {preview && (
        <div className="card space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-slate-800">
                {preview.judul}
              </h2>
              {preview.deskripsi && (
                <p className="text-sm text-slate-500 mt-1">
                  {preview.deskripsi}
                </p>
              )}
            </div>
            <button
              type="button"
              className="btn-ghost text-sm shrink-0 inline-flex items-center gap-1"
              onClick={() => setPreview(null)}>
              <X className="h-4 w-4" /> Tutup
            </button>
          </div>

          {isYoutubeUrl(preview.url) ? (
            <div className="overflow-hidden rounded-xl border border-slate-200 aspect-video">
              <iframe
                src={toYoutubeEmbed(preview.url)}
                title={preview.judul}
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : isPdfUrl(preview.url) ? (
            <PdfViewer url={preview.url} title={preview.judul} />
          ) : (
            /* Fallback: coba tetap embed di iframe dulu */
            <PdfViewer url={preview.url} title={preview.judul} />
          )}
        </div>
      )}
    </div>
  );
}
