import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Link2, ArrowRight } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { EmptyState } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";

export type AssessmentItem = {
  id: string;
  judul_kuis?: string | null;
  url_kuis?: string;
  kelas_ids?: string[];
  kelas_id?: string | null; // legacy
  diperbarui_pada?: string | null;
};

export type AssessmentKontenProps = {
  title?: string;
  description?: string;
  detailBasePath: string;
  /** "siswa" | "guru" */
  mode: "siswa" | "guru";
};

export function AssessmentKonten({
  title = "E-Assessment",
  description = "Tautan kuis sesuai kelas Anda.",
  detailBasePath,
  mode,
}: AssessmentKontenProps) {
  const { profile } = useAuth();
  const [list, setList] = useState<AssessmentItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const snap = await getDocs(collection(db, "assessment_eksternal"));
        if (cancelled) return;

        let items = snap.docs.map(
          (d) => ({ id: d.id, ...d.data() }) as AssessmentItem,
        );

        if (mode === "siswa") {
          const kid = profile.kelas_id;
          if (!kid) {
            setList([]);
            return;
          }
          items = items.filter((a) => {
            if (Array.isArray(a.kelas_ids) && a.kelas_ids.includes(kid)) return true;
            // legacy single field
            if (a.kelas_id === kid) return true;
            return false;
          });
        } else {
          // guru: kelas yang dia ajar
          const kelasSnap = await getDocs(
            query(collection(db, "kelas"), where("guru_id", "==", profile.id)),
          );
          const myKelasIds = new Set(kelasSnap.docs.map((d) => d.id));
          items = items.filter((a) => {
            if (Array.isArray(a.kelas_ids)) {
              return a.kelas_ids.some((id) => myKelasIds.has(id));
            }
            if (a.kelas_id && myKelasIds.has(a.kelas_id)) return true;
            return false;
          });
        }

        items = items.filter((a) => !!a.url_kuis);
        items.sort((a, b) =>
          (b.diperbarui_pada || "").localeCompare(a.diperbarui_pada || ""),
        );
        setList(items);
      } catch (err) {
        console.error("[AssessmentKonten]", err);
        if (!cancelled) setList([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [profile, mode]);

  if (loading) return <div className="card animate-pulse h-96" />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">{title}</h1>
        <p className="text-sm text-slate-500">{description}</p>
      </div>

      {list.length === 0 ? (
        <EmptyState
          icon={<Link2 className="h-7 w-7" />}
          title="Belum ada assessment"
          description={
            mode === "siswa"
              ? "Belum ada kuis untuk kelas Anda."
              : "Belum ada kuis untuk kelas yang Anda ajar."
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {list.map((a) => (
            <Link
              key={a.id}
              to={`${detailBasePath}/${a.id}`}
              className="card text-left group hover:shadow-float transition border-l-4 border-brand-green"
            >
              <div className="flex items-start gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-green-light text-brand-green">
                  <Link2 className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-slate-800 group-hover:text-brand-green transition">
                    {a.judul_kuis || "Kuis Eksternal"}
                  </p>
                  <p className="mt-1.5 text-[11px] text-brand-green font-medium inline-flex items-center gap-1">
                    Buka kuis <ArrowRight className="h-3 w-3" />
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