import { useEffect, useState, useRef, useCallback } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ExternalLink,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Download,
  RotateCcw,
  FileText,
} from "lucide-react";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import type { MateriItem } from "./MateriKonten";

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

function toEmbeddablePdfUrl(url: string) {
  try {
    const fileMatch = url.match(/drive\.google\.com\/file\/d\/([^/]+)/);
    if (fileMatch?.[1]) {
      return `https://drive.google.com/file/d/${fileMatch[1]}/preview`;
    }
    const openMatch = url.match(/drive\.google\.com\/open\?id=([^&]+)/);
    if (openMatch?.[1]) {
      return `https://drive.google.com/file/d/${openMatch[1]}/preview`;
    }
    const docMatch = url.match(/docs\.google\.com\/document\/d\/([^/]+)/);
    if (docMatch?.[1]) {
      return `https://docs.google.com/document/d/${docMatch[1]}/preview`;
    }
  } catch {
    /* ignore */
  }
  return url;
}

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
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-white px-3 py-2">
        <div className="flex items-center gap-1">
          <button type="button" onClick={zoomOut} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100" title="Zoom out">
            <ZoomOut className="h-4 w-4" />
          </button>
          <span className="min-w-[3rem] text-center text-xs font-semibold text-slate-600">{zoom}%</span>
          <button type="button" onClick={zoomIn} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100" title="Zoom in">
            <ZoomIn className="h-4 w-4" />
          </button>
          <button type="button" onClick={zoomReset} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100" title="Reset zoom">
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
        <div className="flex items-center gap-1">
          <button type="button" onClick={handleDownload} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100">
            <Download className="h-4 w-4" /> Unduh
          </button>
          <button type="button" onClick={toggleFullscreen} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100">
            {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            {fullscreen ? "Keluar" : "Penuh"}
          </button>
          <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-brand-green hover:bg-brand-green/10">
            <ExternalLink className="h-4 w-4" /> Tab baru
          </a>
        </div>
      </div>
      <div className="relative flex-1 overflow-auto bg-slate-200/80" style={{ height: fullscreen ? "100%" : "70vh" }}>
        <div
          className="origin-top-left transition-transform duration-150"
          style={{ width: `${zoom}%`, height: `${zoom}%`, minWidth: "100%", minHeight: "100%" }}>
          <iframe
            src={embedUrl}
            title={title}
            className="h-full w-full bg-white"
            style={{ minHeight: fullscreen ? "100vh" : "70vh", border: "none" }}
          />
        </div>
      </div>
    </div>
  );
}

type MateriDetailProps = {
  role: "siswa" | "guru";
  navItems: { to: string; label: string; icon: React.ReactNode }[];
  listPath: string; // "/siswa/materi" | "/guru/materi"
};

export function MateriDetail({ role, navItems, listPath }: MateriDetailProps) {
  const { id } = useParams<{ id: string }>();
  const [materi, setMateri] = useState<MateriItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(false);
      try {
        const snap = await getDoc(doc(db, "materi_tambahan", id));
        if (cancelled) return;
        if (!snap.exists()) {
          setError(true);
          setMateri(null);
        } else {
          setMateri({ id: snap.id, ...snap.data() } as MateriItem);
        }
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <DashboardLayout items={navItems} role={role}>
      <div className="space-y-4">
        <Link
          to={listPath}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-brand-green">
          <ArrowLeft className="h-4 w-4" /> Kembali ke daftar materi
        </Link>

        {loading ? (
          <div className="card animate-pulse h-96" />
        ) : error || !materi ? (
          <div className="card text-center py-12">
            <FileText className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-3 text-slate-500">Materi tidak ditemukan.</p>
            <Link to={listPath} className="btn-primary mt-4 inline-flex">
              Kembali
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">{materi.judul}</h1>
              {materi.deskripsi && (
                <p className="mt-1 text-sm text-slate-500">{materi.deskripsi}</p>
              )}
            </div>

            {isYoutubeUrl(materi.url) ? (
              <div className="overflow-hidden rounded-xl border border-slate-200 aspect-video">
                <iframe
                  src={toYoutubeEmbed(materi.url)}
                  title={materi.judul}
                  className="h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            ) : isPdfUrl(materi.url) ? (
              <PdfViewer url={materi.url} title={materi.judul} />
            ) : (
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <iframe
                  src={materi.url}
                  title={materi.judul}
                  className="w-full bg-white"
                  style={{ height: "70vh", border: "none" }}
                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                />
                <div className="border-t bg-slate-50 px-3 py-2 flex justify-end">
                  <a
                    href={materi.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-semibold text-brand-green hover:underline inline-flex items-center gap-1">
                    <ExternalLink className="h-3.5 w-3.5" /> Buka di tab baru
                  </a>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}