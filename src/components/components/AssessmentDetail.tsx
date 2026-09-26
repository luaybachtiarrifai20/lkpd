import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import type { AssessmentItem } from "./AssessmentKonten";

type Props = {
  role: "siswa" | "guru";
  navItems: { to: string; label: string; icon: React.ReactNode }[];
  listPath: string;
};

export function AssessmentDetail({ role, navItems, listPath }: Props) {
  const { id } = useParams<{ id: string }>();
  const [item, setItem] = useState<AssessmentItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const snap = await getDoc(doc(db, "assessment_eksternal", id));
        if (cancelled) return;
        if (snap.exists()) {
          setItem({ id: snap.id, ...snap.data() } as AssessmentItem);
        } else {
          setItem(null);
        }
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
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-brand-green"
        >
          <ArrowLeft className="h-4 w-4" /> Kembali ke E-Assessment
        </Link>

        {loading ? (
          <div className="card animate-pulse h-64" />
        ) : !item ? (
          <div className="card text-center py-12 text-slate-500">
            Tautan tidak ditemukan.
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">
                {item.judul_kuis || "Kuis Eksternal"}
              </h1>
              <p className="mt-1 text-xs text-slate-400 break-all">{item.url_kuis}</p>
            </div>

            <div className="flex flex-wrap gap-2">
              <a
                href={item.url_kuis}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary"
              >
                <ExternalLink className="h-4 w-4" /> Buka Kuis
              </a>
            </div>

            {item.url_kuis && (
              <div className="overflow-hidden rounded-xl border border-slate-200">
                <iframe
                  src={item.url_kuis}
                  title={item.judul_kuis || "Kuis"}
                  className="w-full bg-white"
                  style={{ height: "70vh", border: "none" }}
                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                />
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}