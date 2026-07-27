import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  LayoutDashboard, History, User as UserIcon,
  ArrowRight, CheckCircle2, FileEdit, Clock, Award, Sparkles,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { KEGIATAN_CONTENT } from '@/content/kegiatanContent';
import { supabase, type Jawaban, type StatusKuisSiswa } from '@/lib/supabase';
import { SDGBadgeChip, EmptyState, Badge } from '@/components/ui';

const navItems = [
  { to: '/siswa', label: 'Dashboard', icon: <LayoutDashboard className="h-5 w-5" /> },
  { to: '/siswa/riwayat', label: 'Riwayat & Nilai', icon: <History className="h-5 w-5" /> },
  { to: '/siswa/profil', label: 'Profil', icon: <UserIcon className="h-5 w-5" /> },
];

type Row = { jawaban?: Jawaban; kuis?: StatusKuisSiswa };

export function StudentDashboard() {
  const { profile } = useAuth();
  const [rows, setRows] = useState<Record<number, Row>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    let active = true;
    (async () => {
      setLoading(true);
      const [jRes, kRes] = await Promise.all([
        supabase.from('jawaban').select('*').eq('siswa_id', profile.id),
        supabase.from('status_kuis_siswa').select('*').eq('siswa_id', profile.id),
      ]);
      if (!active) return;
      const jByKeg = ((jRes.data as Jawaban[]) || []).reduce<Record<string, Jawaban>>((acc, j) => {
        acc[j.kegiatan_id] = j; return acc;
      }, {});
      const kByKeg = ((kRes.data as StatusKuisSiswa[]) || []).reduce<Record<string, StatusKuisSiswa>>((acc, k) => {
        acc[k.kegiatan_id] = k; return acc;
      }, {});
      const { data: kegs } = await supabase.from('kegiatan').select('id, nomor');
      if (!active) return;
      const newRows: Record<number, Row> = {};
      (kegs || []).forEach((k: { id: string; nomor: number }) => {
        newRows[k.nomor] = { jawaban: jByKeg[k.id], kuis: kByKeg[k.id] };
      });
      setRows(newRows);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [profile]);

  const statusMeta = (status?: Jawaban['status']) => {
    switch (status) {
      case 'terkumpul': return { label: 'Terkumpul', cls: 'bg-success/10 text-success', icon: <CheckCircle2 className="h-3.5 w-3.5" /> };
      case 'dinilai': return { label: 'Dinilai', cls: 'bg-brand-teal-light text-brand-teal-dark', icon: <Award className="h-3.5 w-3.5" /> };
      case 'draft': return { label: 'Draft', cls: 'bg-brand-amber-light text-[#B26A00]', icon: <FileEdit className="h-3.5 w-3.5" /> };
      default: return { label: 'Belum dikerjakan', cls: 'bg-slate-100 text-slate-500', icon: <Clock className="h-3.5 w-3.5" /> };
    }
  };

  const totalDone = Object.values(rows).filter((r) => r.jawaban?.status === 'terkumpul' || r.jawaban?.status === 'dinilai').length;

  return (
    <DashboardLayout items={navItems} role="siswa" >
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Halo, {profile?.nama?.split(' ')[0]}!</h1>
          <p className="text-sm text-slate-500">Lanjutkan perjalanan belajar Laju Reaksi berbasis PBL-ESD.</p>
        </div>

        {/* Overall progress */}
        <div className="card bg-gradient-to-br from-brand-green to-brand-teal text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/80">Progres Keseluruhan</p>
              <p className="text-3xl font-extrabold">{totalDone}/4 Kegiatan</p>
            </div>
            <Sparkles className="h-10 w-10 text-white/70" />
          </div>
          <div className="mt-4">
            <div className="h-2.5 overflow-hidden rounded-full bg-white/25">
              <div className="h-full rounded-full bg-white transition-all" style={{ width: `${(totalDone / 4) * 100}%` }} />
            </div>
          </div>
        </div>

        {/* Roadmap */}
        <div>
          <h2 className="mb-3 text-lg font-bold text-slate-800">Peta Progres Kegiatan</h2>
          {loading ? (
            <div className="card animate-pulse h-40" />
          ) : (
            <div className="relative space-y-4">
              {/* connecting vertical line */}
              <div className="absolute left-6 top-8 bottom-8 w-0.5 bg-gradient-to-b from-brand-green/30 via-brand-teal/30 to-brand-teal/20 hidden sm:block" />
              {KEGIATAN_CONTENT.map((k) => {
                const row = rows[k.nomor];
                const status = statusMeta(row?.jawaban?.status);
                const kuisDone = row?.kuis?.sudah_mengerjakan;
                const isDone = row?.jawaban?.status === 'terkumpul' || row?.jawaban?.status === 'dinilai';
                return (
                  <Link
                    key={k.nomor}
                    to={`/siswa/kegiatan/${k.nomor}`}
                    className="group relative flex items-stretch gap-4"
                  >
                    {/* node */}
                    <div className="relative z-10 flex flex-col items-center pt-5">
                      <div
                        className={`grid h-12 w-12 shrink-0 place-items-center rounded-full text-lg font-bold text-white shadow-soft transition ${isDone ? 'ring-4 ring-offset-2' : ''}`}
                        style={{ backgroundColor: k.warna, boxShadow: isDone ? `0 0 0 4px ${k.warna}25` : undefined }}
                      >
                        {isDone ? <CheckCircle2 className="h-6 w-6" /> : k.nomor}
                      </div>
                    </div>
                    {/* card */}
                    <div
                      className="flex-1 overflow-hidden rounded-2xl bg-white p-5 shadow-soft transition group-hover:shadow-float"
                      style={{ borderTop: `3px solid ${k.warna}` }}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Kegiatan {k.nomor}</p>
                          <h3 className="text-sm font-bold leading-snug text-slate-800">{k.judul.replace(/^Kegiatan \d+\s*[—-]\s*/, '')}</h3>
                          <p className="text-xs text-slate-500">{k.subjudul}</p>
                        </div>
                        <span className={`badge ${status.cls}`}>{status.icon} {status.label}</span>
                      </div>

                      {/* cakupan materi chips */}
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {k.cakupanMateri.map((m) => (
                          <span key={m} className="chip">{m}</span>
                        ))}
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-3">
                        {k.sdg.map((s) => <SDGBadgeChip key={s.nomor} sdg={s} />)}
                      </div>

                      <div className="mt-3 flex items-center justify-between border-t border-slate-50 pt-3">
                        <div className="flex items-center gap-3 text-xs text-slate-500">
                          <span className="inline-flex items-center gap-1">
                            <CheckCircle2 className={`h-3.5 w-3.5 ${kuisDone ? 'text-success' : 'text-slate-300'}`} />
                            Kuis {kuisDone ? 'selesai' : 'belum'}
                          </span>
                          <span className="inline-flex items-center gap-1 text-slate-400">
                            {k.steps.length} tahap PBL
                          </span>
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
    </DashboardLayout>
  );
}

export function StudentRiwayat() {
  const { profile } = useAuth();
  const [list, setList] = useState<{ nomor: number; jawaban?: Jawaban; kuis?: StatusKuisSiswa }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    let active = true;
    (async () => {
      const { data: kegs } = await supabase.from('kegiatan').select('id, nomor, judul').order('nomor');
      const [jRes, kRes] = await Promise.all([
        supabase.from('jawaban').select('*').eq('siswa_id', profile.id),
        supabase.from('status_kuis_siswa').select('*').eq('siswa_id', profile.id),
      ]);
      if (!active) return;
      const jByKeg = (jRes.data as Jawaban[] || []).reduce<Record<string, Jawaban>>((a, j) => { a[j.kegiatan_id] = j; return a; }, {});
      const kByKeg = (kRes.data as StatusKuisSiswa[] || []).reduce<Record<string, StatusKuisSiswa>>((a, k) => { a[k.kegiatan_id] = k; return a; }, {});
      setList((kegs || []).map((k: { id: string; nomor: number; judul: string }) => ({ nomor: k.nomor, jawaban: jByKeg[k.id], kuis: kByKeg[k.id] })));
      setLoading(false);
    })();
    return () => { active = false; };
  }, [profile]);

  return (
    <DashboardLayout items={navItems} role="siswa">
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-slate-800">Riwayat & Nilai</h1>
        {loading ? <div className="card animate-pulse h-40" /> : list.length === 0 ? (
          <EmptyState icon={<History className="h-7 w-7" />} title="Belum ada riwayat" description="Kerjakan kegiatan untuk melihat riwayat di sini." />
        ) : (
          <div className="space-y-3">
            {list.map((item) => {
              const k = KEGIATAN_CONTENT.find((c) => c.nomor === item.nomor)!;
              return (
                <div key={item.nomor} className="card flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between" style={{ borderLeft: `4px solid ${k.warna}` }}>
                  <div>
                    <p className="text-xs font-semibold text-slate-400">Kegiatan {item.nomor}</p>
                    <p className="text-sm font-bold text-slate-800">{k.subjudul}</p>
                    <p className="text-xs text-slate-500">
                      Jawaban: {item.jawaban?.status || 'Belum dikerjakan'} • Kuis: {item.kuis?.sudah_mengerjakan ? 'Selesai' : 'Belum'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {item.jawaban?.skor != null && <Badge color="teal"><Award className="h-3.5 w-3.5" /> Skor: {item.jawaban.skor}</Badge>}
                    {item.kuis?.skor_manual != null && <Badge color="amber"><Award className="h-3.5 w-3.5" /> Kuis: {item.kuis.skor_manual}</Badge>}
                    <Link to={`/siswa/kegiatan/${item.nomor}`} className="btn-outline">Lihat</Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

export function StudentProfil() {
  const { profile } = useAuth();
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
              <p className="text-lg font-bold text-slate-800">{profile?.nama}</p>
              <Badge color="blue"><UserIcon className="h-3.5 w-3.5" /> Siswa</Badge>
            </div>
          </div>
          <dl className="mt-5 grid gap-4 sm:grid-cols-2">
            <Info label="Email" value={profile?.email || '-'} />
            <Info label="Username/NISN" value={profile?.username || profile?.nisn || '-'} />
            <Info label="NISN" value={profile?.nisn || '-'} />
            <Info label="Bergabung" value={profile?.dibuat_pada ? new Date(profile.dibuat_pada).toLocaleDateString('id-ID') : '-'} />
          </dl>
        </div>
      </div>
    </DashboardLayout>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-medium text-slate-700">{value}</p>
    </div>
  );
}
