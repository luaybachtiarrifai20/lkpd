import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  LayoutDashboard, Users, ClipboardList, Link2, Download, GraduationCap,
  Plus, Copy, FileText, Eye, CheckCircle2, Circle, ArrowLeft,
  Save, Filter, UserCircle,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { supabase, type Kelas, type Profile, type Jawaban, type StatusKuisSiswa, type AssessmentEksternal } from '@/lib/supabase';
import { KEGIATAN_CONTENT } from '@/content/kegiatanContent';
import { Badge, EmptyState } from '@/components/ui';
import { Modal } from '@/components/ui/Modal';
import { exportJawabanPDF, exportRekapPDF } from '@/lib/pdf';

const navItems = [
  { to: '/guru', label: 'Dashboard', icon: <LayoutDashboard className="h-5 w-5" /> },
  { to: '/guru/kelas', label: 'Kelas & Siswa', icon: <Users className="h-5 w-5" /> },
  { to: '/guru/rekap', label: 'Rekap Progres', icon: <ClipboardList className="h-5 w-5" /> },
  { to: '/guru/assessment', label: 'Tautan E-Assessment', icon: <Link2 className="h-5 w-5" /> },
  { to: '/guru/ekspor', label: 'Ekspor Massal', icon: <Download className="h-5 w-5" /> },
  { to: '/guru/profil', label: 'Profil', icon: <UserCircle className="h-5 w-5" /> },
];

// ============ Dashboard ============
export function TeacherDashboard() {
  const { profile } = useAuth();
  const [kelas, setKelas] = useState<Kelas[]>([]);
  const [stats, setStats] = useState({ kelas: 0, siswa: 0, jawaban: 0 });

  useEffect(() => {
    if (!profile) return;
    let active = true;
    (async () => {
      const { data: k } = await supabase.from('kelas').select('*').eq('guru_id', profile.id);
      if (!active) return;
      setKelas(k || []);
      const kIds = (k || []).map((x) => x.id);
      if (kIds.length) {
        const [{ count: siswa }, { count: jawaban }] = await Promise.all([
          supabase.from('profiles').select('id', { count: 'exact', head: true }).in('kelas_id', kIds).eq('role', 'siswa'),
          supabase.from('jawaban').select('id', { count: 'exact', head: true }),
        ]);
        if (active) setStats({ kelas: k?.length || 0, siswa: siswa || 0, jawaban: jawaban || 0 });
      } else {
        setStats({ kelas: 0, siswa: 0, jawaban: 0 });
      }
    })();
    return () => { active = false; };
  }, [profile]);

  return (
    <DashboardLayout items={navItems} role="guru">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Dashboard Guru</h1>
          <p className="text-sm text-slate-500">Selamat datang, {profile?.nama}.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard icon={<Users className="h-6 w-6" />} label="Kelas" value={stats.kelas} color="bg-brand-green-light text-brand-green" />
          <StatCard icon={<GraduationCap className="h-6 w-6" />} label="Total Siswa" value={stats.siswa} color="bg-brand-teal-light text-brand-teal" />
          <StatCard icon={<FileText className="h-6 w-6" />} label="Jawaban Masuk" value={stats.jawaban} color="bg-brand-amber-light text-brand-amber" />
        </div>

        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-800">Kelas Anda</h2>
            <Link to="/guru/kelas" className="btn-outline">Kelola Kelas</Link>
          </div>
          {kelas.length === 0 ? (
            <EmptyState icon={<Users className="h-7 w-7" />} title="Belum ada kelas" description="Buat kelas pertama untuk mulai mengelola siswa." action={<Link to="/guru/kelas" className="btn-primary"><Plus className="h-4 w-4" /> Buat Kelas</Link>} />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {kelas.map((k) => (
                <Link key={k.id} to="/guru/kelas" className="card flex items-center justify-between hover:shadow-float transition">
                  <div>
                    <p className="text-sm font-bold text-slate-800">{k.nama_kelas}</p>
                    <p className="text-xs text-slate-500">Kode: {k.kode_undangan || '-'}</p>
                  </div>
                  <ArrowLeft className="h-4 w-4 rotate-180 text-slate-300" />
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <div className="card flex items-center gap-4">
      <div className={`grid h-12 w-12 place-items-center rounded-xl ${color}`}>{icon}</div>
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
  const [namaKelas, setNamaKelas] = useState('');
  const [open, setOpen] = useState(false);

  const loadKelas = useCallback(async () => {
    if (!profile) return;
    const { data } = await supabase.from('kelas').select('*').eq('guru_id', profile.id).order('dibuat_pada', { ascending: false });
    setKelas(data || []);
  }, [profile]);

  const loadSiswa = useCallback(async (k: Kelas) => {
    const { data } = await supabase.from('profiles').select('*').eq('kelas_id', k.id).eq('role', 'siswa').order('nama');
    setSiswa(data as Profile[] || []);
  }, []);

  useEffect(() => { loadKelas(); }, [loadKelas]);

  const createKelas = async () => {
    if (!profile || !namaKelas.trim()) return;
    const kode = Math.random().toString(36).slice(2, 8).toUpperCase();
    const { error } = await supabase.from('kelas').insert({ nama_kelas: namaKelas, guru_id: profile.id, kode_undangan: kode }).select().maybeSingle();
    if (error) { toast('Gagal membuat kelas', 'error'); return; }
    toast('Kelas dibuat', 'success');
    setNamaKelas(''); setOpen(false); loadKelas();
  };

  const copyKode = (kode: string) => {
    navigator.clipboard.writeText(kode);
    toast('Kode kelas disalin', 'success');
  };

  return (
    <DashboardLayout items={navItems} role="guru">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Kelas & Siswa</h1>
            <p className="text-sm text-slate-500">Buat kelas dan bagikan kode undangan kepada siswa.</p>
          </div>
          <button onClick={() => setOpen(true)} className="btn-primary"><Plus className="h-4 w-4" /> Buat Kelas</button>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1fr_1.4fr]">
          {/* Kelas list */}
          <div className="space-y-3">
            {kelas.length === 0 ? (
              <EmptyState icon={<Users className="h-7 w-7" />} title="Belum ada kelas" description="Klik 'Buat Kelas' untuk memulai." />
            ) : (
              kelas.map((k) => (
                <button
                  key={k.id}
                  onClick={() => { setSelected(k); loadSiswa(k); }}
                  className={`card w-full text-left transition ${selected?.id === k.id ? 'border-2 border-brand-green' : 'hover:shadow-float'}`}
                >
                  <p className="text-sm font-bold text-slate-800">{k.nama_kelas}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="chip">Kode: <strong className="ml-1 text-brand-green">{k.kode_undangan}</strong></span>
                    <button onClick={(e) => { e.stopPropagation(); copyKode(k.kode_undangan || ''); }} className="text-slate-400 hover:text-brand-green"><Copy className="h-3.5 w-3.5" /></button>
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
                  <h2 className="text-lg font-bold text-slate-800">Siswa {selected.nama_kelas}</h2>
                  <span className="chip">{siswa.length} siswa</span>
                </div>
                {siswa.length === 0 ? (
                  <EmptyState icon={<GraduationCap className="h-7 w-7" />} title="Belum ada siswa" description={`Bagikan kode kelas ${selected.kode_undangan} agar siswa bergabung saat daftar.`} />
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {siswa.map((s) => (
                      <li key={s.id} className="flex items-center justify-between py-2.5">
                        <div className="flex items-center gap-3">
                          <div className="grid h-9 w-9 place-items-center rounded-full bg-brand-green-light text-sm font-bold text-brand-green-dark">{s.nama.charAt(0)}</div>
                          <div>
                            <p className="text-sm font-semibold text-slate-800">{s.nama}</p>
                            <p className="text-xs text-slate-400">{s.nisn || s.username || s.email}</p>
                          </div>
                        </div>
                        <Link to={`/guru/siswa/${s.id}`} className="btn-ghost text-sm"><Eye className="h-4 w-4" /> Lihat Jawaban</Link>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            ) : (
              <EmptyState icon={<Users className="h-7 w-7" />} title="Pilih kelas" description="Pilih kelas di kiri untuk melihat daftar siswa." />
            )}
          </div>
        </div>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Buat Kelas Baru" size="sm"
        footer={<><button className="btn-ghost" onClick={() => setOpen(false)}>Batal</button><button className="btn-primary" onClick={createKelas}><Save className="h-4 w-4" /> Buat</button></>}>
        <label className="label-base">Nama Kelas</label>
        <input className="input-base" value={namaKelas} onChange={(e) => setNamaKelas(e.target.value)} placeholder="Contoh: XI IPA 1" />
        <p className="mt-2 text-xs text-slate-400">Kode undangan akan dibuat otomatis untuk siswa mendaftar.</p>
      </Modal>
    </DashboardLayout>
  );
}

// ============ Rekap Progres ============
export function TeacherRekap() {
  const { profile } = useAuth();
  const [kelas, setKelas] = useState<Kelas[]>([]);
  const [selKelas, setSelKelas] = useState<string>('');
  const [selKeg, setSelKeg] = useState<string>('1');
  const [rows, setRows] = useState<{ siswa: Profile; jawaban?: Jawaban; kuis?: StatusKuisSiswa }[]>([]);
  const [loading, setLoading] = useState(false);
  const [kegIds, setKegIds] = useState<Record<number, string>>({});

  useEffect(() => {
    if (!profile) return;
    (async () => {
      const { data: k } = await supabase.from('kelas').select('*').eq('guru_id', profile.id).order('nama_kelas');
      setKelas(k || []);
      const { data: kegs } = await supabase.from('kegiatan').select('id, nomor');
      const map: Record<number, string> = {};
      (kegs || []).forEach((g: { id: string; nomor: number }) => { map[g.nomor] = g.id; });
      setKegIds(map);
    })();
  }, [profile]);

  const loadRekap = useCallback(async () => {
    if (!selKelas) return;
    setLoading(true);
    const { data: siswa } = await supabase.from('profiles').select('*').eq('kelas_id', selKelas).eq('role', 'siswa').order('nama');
    const sIds = (siswa || []).map((s) => s.id);
    const kegId = kegIds[Number(selKeg)];
    if (!kegId || sIds.length === 0) { setRows([]); setLoading(false); return; }
    const [jRes, kRes] = await Promise.all([
      supabase.from('jawaban').select('*').eq('kegiatan_id', kegId).in('siswa_id', sIds),
      supabase.from('status_kuis_siswa').select('*').eq('kegiatan_id', kegId).in('siswa_id', sIds),
    ]);
    const jByS = (jRes.data as Jawaban[] || []).reduce<Record<string, Jawaban>>((a, j) => { a[j.siswa_id] = j; return a; }, {});
    const kByS = (kRes.data as StatusKuisSiswa[] || []).reduce<Record<string, StatusKuisSiswa>>((a, k) => { a[k.siswa_id] = k; return a; }, {});
    setRows((siswa as Profile[] || []).map((s) => ({ siswa: s, jawaban: jByS[s.id], kuis: kByS[s.id] })));
    setLoading(false);
  }, [selKelas, selKeg, kegIds]);

  useEffect(() => { if (selKelas && kegIds[Number(selKeg)]) loadRekap(); }, [selKelas, selKeg, kegIds, loadRekap]);

  const handleExportRekap = () => {
    const k = kelas.find((x) => x.id === selKelas);
    const keg = KEGIATAN_CONTENT.find((c) => c.nomor === Number(selKeg));
    const data = rows.map((r) => ({
      nama: r.siswa.nama,
      kelas: k?.nama_kelas || '',
      kegiatan: keg?.judul || '',
      status: r.jawaban?.status || 'Belum dikerjakan',
      kuis: r.kuis?.sudah_mengerjakan ? 'Sudah' : 'Belum',
      skorKuis: r.kuis?.skor_manual ?? null,
      waktu: r.jawaban?.waktu_dikumpulkan ? new Date(r.jawaban.waktu_dikumpulkan).toLocaleString('id-ID') : '-',
    }));
    exportRekapPDF(data, k?.nama_kelas || 'Kelas');
  };

  return (
    <DashboardLayout items={navItems} role="guru">
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-slate-800">Rekap Progres per Kegiatan</h1>

        <div className="card flex flex-wrap items-end gap-3">
          <div>
            <label className="label-base">Pilih Kelas</label>
            <select className="input-base min-w-[180px]" value={selKelas} onChange={(e) => setSelKelas(e.target.value)}>
              <option value="">— Pilih —</option>
              {kelas.map((k) => <option key={k.id} value={k.id}>{k.nama_kelas}</option>)}
            </select>
          </div>
          <div>
            <label className="label-base">Pilih Kegiatan</label>
            <select className="input-base min-w-[180px]" value={selKeg} onChange={(e) => setSelKeg(e.target.value)}>
              {KEGIATAN_CONTENT.map((k) => <option key={k.nomor} value={k.nomor}>Kegiatan {k.nomor} — {k.subjudul}</option>)}
            </select>
          </div>
          <button onClick={handleExportRekap} disabled={rows.length === 0} className="btn-outline ml-auto"><Download className="h-4 w-4" /> Ekspor Rekap PDF</button>
        </div>

        {!selKelas ? (
          <EmptyState icon={<Filter className="h-7 w-7" />} title="Pilih kelas & kegiatan" description="Filter untuk melihat rekap progres siswa." />
        ) : loading ? (
          <div className="card animate-pulse h-48" />
        ) : rows.length === 0 ? (
          <EmptyState icon={<Users className="h-7 w-7" />} title="Belum ada siswa" description="Belum ada siswa di kelas ini." />
        ) : (
          <div className="card overflow-x-auto scrollbar-thin">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left">
                  <th className="px-3 py-2.5 font-semibold text-slate-700">Nama</th>
                  <th className="px-3 py-2.5 font-semibold text-slate-700">Status Jawaban</th>
                  <th className="px-3 py-2.5 font-semibold text-slate-700">Kuis</th>
                  <th className="px-3 py-2.5 font-semibold text-slate-700">Skor Kuis</th>
                  <th className="px-3 py-2.5 font-semibold text-slate-700">Waktu Kumpul</th>
                  <th className="px-3 py-2.5 font-semibold text-slate-700">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.siswa.id} className="border-b border-slate-100">
                    <td className="px-3 py-2.5 font-medium text-slate-800">{r.siswa.nama}</td>
                    <td className="px-3 py-2.5">
                      <Badge color={r.jawaban?.status === 'terkumpul' ? 'success' : r.jawaban?.status === 'dinilai' ? 'teal' : r.jawaban?.status === 'draft' ? 'amber' : 'slate'}>
                        {r.jawaban?.status || 'Belum'}
                      </Badge>
                    </td>
                    <td className="px-3 py-2.5">{r.kuis?.sudah_mengerjakan ? <CheckCircle2 className="h-4 w-4 text-success" /> : <Circle className="h-4 w-4 text-slate-300" />}</td>
                    <td className="px-3 py-2.5">{r.kuis?.skor_manual ?? '-'}</td>
                    <td className="px-3 py-2.5 text-xs text-slate-500">{r.jawaban?.waktu_dikumpulkan ? new Date(r.jawaban.waktu_dikumpulkan).toLocaleDateString('id-ID') : '-'}</td>
                    <td className="px-3 py-2.5">
                      <Link to={`/guru/siswa/${r.siswa.id}`} className="text-brand-green hover:underline text-sm">Detail</Link>
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
export function TeacherSiswaDetail() {
  const { toast } = useToast();
  const path = window.location.pathname;
  const siswaId = path.split('/').pop() || '';

  const [siswa, setSiswa] = useState<Profile | null>(null);
  const [kelasNama, setKelasNama] = useState('');
  const [selKeg, setSelKeg] = useState<number>(1);
  const [jawaban, setJawaban] = useState<Jawaban | null>(null);
  const [kuis, setKuis] = useState<StatusKuisSiswa | null>(null);
  const [kegIds, setKegIds] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [skor, setSkor] = useState('');
  const [skorKuis, setSkorKuis] = useState('');
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    (async () => {
      const { data: s } = await supabase.from('profiles').select('*').eq('id', siswaId).maybeSingle();
      setSiswa(s as Profile | null);
      if (s?.kelas_id) {
        const { data: k } = await supabase.from('kelas').select('nama_kelas').eq('id', s.kelas_id).maybeSingle();
        setKelasNama(k?.nama_kelas || '-');
      }
      const { data: kegs } = await supabase.from('kegiatan').select('id, nomor');
      const map: Record<number, string> = {};
      (kegs || []).forEach((g: { id: string; nomor: number }) => { map[g.nomor] = g.id; });
      setKegIds(map);
      setLoading(false);
    })();
  }, [siswaId]);

  useEffect(() => {
    if (!siswaId || !kegIds[selKeg]) return;
    (async () => {
      const kegId = kegIds[selKeg];
      const [jRes, kRes] = await Promise.all([
        supabase.from('jawaban').select('*').eq('kegiatan_id', kegId).eq('siswa_id', siswaId).maybeSingle(),
        supabase.from('status_kuis_siswa').select('*').eq('kegiatan_id', kegId).eq('siswa_id', siswaId).maybeSingle(),
      ]);
      setJawaban(jRes.data as Jawaban | null);
      setKuis(kRes.data as StatusKuisSiswa | null);
      setSkor(jRes.data?.skor != null ? String(jRes.data.skor) : '');
      setSkorKuis(kRes.data?.skor_manual != null ? String(kRes.data.skor_manual) : '');
      setFeedback(jRes.data?.feedback_guru || '');
    })();
  }, [siswaId, selKeg, kegIds]);

  const saveNilai = async () => {
    if (!jawaban) { toast('Belum ada jawaban untuk dinilai', 'warning'); return; }
    const { error } = await supabase.from('jawaban').update({
      skor: skor ? Number(skor) : null,
      feedback_guru: feedback || null,
      status: 'dinilai',
    }).eq('id', jawaban.id);
    if (error) { toast('Gagal menyimpan nilai', 'error'); return; }
    // also save kuis skor if any
    if (kuis && skorKuis) {
      await supabase.from('status_kuis_siswa').update({ skor_manual: Number(skorKuis), sudah_mengerjakan: true }).eq('id', kuis.id);
    } else if (!kuis && skorKuis) {
      await supabase.from('status_kuis_siswa').upsert({ siswa_id: siswaId, kegiatan_id: kegIds[selKeg], skor_manual: Number(skorKuis), sudah_mengerjakan: true }, { onConflict: 'siswa_id,kegiatan_id' });
    }
    toast('Nilai & feedback tersimpan', 'success');
  };

  const handleExport = () => {
    if (!jawaban || !siswa) return;
    exportJawabanPDF(jawaban, siswa, kelasNama, selKeg, kuis);
  };

  if (loading) return <DashboardLayout items={navItems} role="guru"><div className="card animate-pulse h-96" /></DashboardLayout>;

  const keg = KEGIATAN_CONTENT.find((k) => k.nomor === selKeg)!;

  return (
    <DashboardLayout items={navItems} role="guru">
      <div className="space-y-5">
        <Link to="/guru/rekap" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-brand-green"><ArrowLeft className="h-4 w-4" /> Rekap</Link>

        <div className="card">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-green-light text-lg font-bold text-brand-green-dark">{siswa?.nama.charAt(0)}</div>
              <div>
                <p className="text-lg font-bold text-slate-800">{siswa?.nama}</p>
                <p className="text-xs text-slate-500">{kelasNama} • {siswa?.nisn || siswa?.username || siswa?.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <select className="input-base" value={selKeg} onChange={(e) => setSelKeg(Number(e.target.value))}>
                {KEGIATAN_CONTENT.map((k) => <option key={k.nomor} value={k.nomor}>Kegiatan {k.nomor} — {k.subjudul}</option>)}
              </select>
              <button onClick={handleExport} disabled={!jawaban} className="btn-outline"><Download className="h-4 w-4" /> Unduh PDF</button>
            </div>
          </div>
        </div>

        {!jawaban ? (
          <EmptyState icon={<FileText className="h-7 w-7" />} title="Belum ada jawaban" description="Siswa belum mengerjakan kegiatan ini." />
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm">
              <Badge color={jawaban.status === 'terkumpul' ? 'success' : jawaban.status === 'dinilai' ? 'teal' : 'amber'}>{jawaban.status}</Badge>
              <span className="text-slate-500">Dikumpulkan: {jawaban.waktu_dikumpulkan ? new Date(jawaban.waktu_dikumpulkan).toLocaleString('id-ID') : '-'}</span>
            </div>

            {/* Render jawaban read-only */}
            {keg.steps.map((step) => (
              <div key={step.id} className="card">
                <div className="banner mb-3" style={{ backgroundColor: keg.warna, color: 'white' }}>Sintaks {step.sintaks} — {step.label}</div>
                {step.blocks.map((b, i) => {
                  const ansId = 'id' in b ? b.id : null;
                  const altId = 'alasanId' in b ? b.alasanId : null;
                  const efId = 'pertanyaanId' in b ? b.pertanyaanId : null;
                  const perId = 'perencanaanId' in b ? b.perencanaanId : null;

                  if (b.kind === 'bagian-header') return <div key={i} className="mb-2 mt-3 text-xs font-bold uppercase tracking-wide text-slate-400">— {b.label} —</div>;
                  if (b.kind === 'data-eksperimen') {
                    return (
                      <div key={i} className="mb-3">
                        <p className="mb-1 text-xs font-semibold text-slate-500">[Data] {b.title}</p>
                        <div className="overflow-x-auto rounded-lg border border-slate-100"><table className="w-full text-xs">
                          <thead><tr className="bg-slate-50">{b.headers.map((h) => <th key={h} className="px-2 py-1.5 text-left font-semibold text-slate-600">{h}</th>)}</tr></thead>
                          <tbody>{b.rows.map((r, ri) => <tr key={ri} className="border-t border-slate-100">{r.map((c, ci) => <td key={ci} className="px-2 py-1.5 text-slate-600">{c}</td>)}</tr>)}</tbody>
                        </table></div>
                      </div>
                    );
                  }
                  if (b.kind === 'diagram-submikro') {
                    return <div key={i} className="mb-3"><p className="text-xs font-semibold text-slate-500">[Diagram] {b.title}</p><p className="text-xs text-slate-500">{b.kiri.label}: {b.kiri.deskripsi} | {b.kanan.label}: {b.kanan.deskripsi}</p></div>;
                  }
                  if (b.kind === 'instruksi-pengembangan') {
                    return <div key={i} className="mb-3"><p className="text-xs font-semibold text-slate-500">[Instruksi] {b.title}</p><p className="text-xs text-slate-500">{b.body}</p>{b.bullets && <ul className="ml-4 text-xs text-slate-500">{b.bullets.map((bl, bi) => <li key={bi}>• {bl}</li>)}</ul>}</div>;
                  }
                  if (b.kind === 'penalaran-level') {
                    return <div key={i} className="mb-3"><p className="text-xs font-semibold text-slate-500">[Integrasi 3 Level]</p><p className="text-xs text-slate-500">Makroskopik: {b.makroskopik} | Submikroskopik: {b.submikroskopik} | Simbolik: {b.simbolik}</p></div>;
                  }
                  if (b.kind === 'analisis-efisiensi') {
                    return (
                      <div key={i} className="mb-3">
                        <p className="mb-1 text-xs font-semibold text-slate-500">[Tabel Efisiensi] {b.title}</p>
                        <div className="overflow-x-auto rounded-lg border border-slate-100"><table className="w-full text-xs">
                          <thead><tr className="bg-slate-50">{b.headers.map((h) => <th key={h} className="px-2 py-1.5 text-left font-semibold text-slate-600">{h}</th>)}</tr></thead>
                          <tbody>{b.rows.map((r, ri) => <tr key={ri} className="border-t border-slate-100">{r.map((c, ci) => <td key={ci} className="px-2 py-1.5 text-slate-600">{c}</td>)}</tr>)}</tbody>
                        </table></div>
                        {efId && <AnswerView label={b.pertanyaanText} ans={jawaban.isi_jawaban[efId]} />}
                      </div>
                    );
                  }

                  if (ansId) {
                    const label = 'text' in b ? b.text : 'label' in b ? b.label : b.title || '';
                    return <AnswerView key={i} label={label} ans={jawaban.isi_jawaban[ansId]} />;
                  }
                  if (perId) return <AnswerView key={i} label="Perencanaan Penyelidikan" ans={jawaban.isi_jawaban[perId]} />;
                  if (altId) return <AnswerView key={i} label="Alasan pemilihan kasus" ans={jawaban.isi_jawaban[altId]} />;
                  return null;
                })}
              </div>
            ))}

            {/* Penilaian */}
            <div className="card">
              <h3 className="mb-3 text-lg font-bold text-slate-800">Penilaian & Feedback</h3>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="label-base">Skor Jawaban</label>
                  <input type="number" className="input-base" value={skor} onChange={(e) => setSkor(e.target.value)} placeholder="0-100" />
                </div>
                <div>
                  <label className="label-base">Skor Kuis (manual)</label>
                  <input type="number" className="input-base" value={skorKuis} onChange={(e) => setSkorKuis(e.target.value)} placeholder="dari platform eksternal" />
                </div>
                <div className="sm:col-span-3">
                  <label className="label-base">Feedback untuk Siswa</label>
                  <textarea className="input-base" rows={3} value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="Tulis catatan/masukan…" />
                </div>
              </div>
              <button onClick={saveNilai} className="btn-primary mt-4"><Save className="h-4 w-4" /> Simpan Nilai</button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

function AnswerView({ label, ans }: { label: string; ans: unknown }) {
  let content = '(kosong)';
  if (typeof ans === 'string' && ans) content = ans;
  else if (Array.isArray(ans) && ans.length) content = ans.join(', ');
  else if (ans && typeof ans === 'object') {
    const a = ans as { rows?: string[][]; files?: { name: string; url: string }[]; tap?: Record<string, string> };
    if (a.rows) content = a.rows.map((r) => r.join(' | ')).join('\n');
    else if (a.files) content = a.files.map((f) => f.name).join('\n');
    else if (a.tap) content = Object.entries(a.tap).map(([k, v]) => `${k}: ${v}`).join('\n');
  }
  return (
    <div className="mb-3 border-b border-slate-100 pb-3 last:border-0">
      <p className="mb-1 text-xs font-semibold text-slate-500">{label}</p>
      <p className="whitespace-pre-wrap text-sm text-slate-700">{content}</p>
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
  const [judul, setJudul] = useState('');
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [allAssess, setAllAssess] = useState<Record<number, AssessmentEksternal | null>>({});

  useEffect(() => {
    (async () => {
      const { data: kegs } = await supabase.from('kegiatan').select('id, nomor');
      const map: Record<number, string> = {};
      (kegs || []).forEach((g: { id: string; nomor: number }) => { map[g.nomor] = g.id; });
      setKegIds(map);
      // fetch all assessments at once
      const { data: asses } = await supabase.from('assessment_eksternal').select('*');
      const amap: Record<number, AssessmentEksternal | null> = {};
      (asses as AssessmentEksternal[] || []).forEach((a) => {
        const nomor = Number(Object.entries(map).find(([, id]) => id === a.kegiatan_id)?.[0] || 0);
        if (nomor) amap[nomor] = a;
      });
      setAllAssess(amap);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!kegIds[selKeg]) return;
    (async () => {
      const { data } = await supabase.from('assessment_eksternal').select('*').eq('kegiatan_id', kegIds[selKeg]).maybeSingle();
      setAssess(data as AssessmentEksternal | null);
      setJudul(data?.judul_kuis || '');
      setUrl(data?.url_kuis || '');
    })();
  }, [selKeg, kegIds]);

  const save = async () => {
    if (!profile || !kegIds[selKeg]) return;
    if (!url.trim()) { toast('URL kuis wajib diisi', 'warning'); return; }
    try {
      new URL(url);
    } catch {
      toast('URL tidak valid', 'error'); return;
    }
    const payload = { kegiatan_id: kegIds[selKeg], judul_kuis: judul || null, url_kuis: url, dibuat_oleh_guru_id: profile.id, diperbarui_pada: new Date().toISOString() };
    const { error } = await supabase.from('assessment_eksternal').upsert(payload, { onConflict: 'kegiatan_id' });
    if (error) { toast('Gagal menyimpan', 'error'); return; }
    toast('Tautan kuis tersimpan — siswa akan melihat embed & QR', 'success');
  };

  const keg = KEGIATAN_CONTENT.find((k) => k.nomor === selKeg)!;

  if (loading) return <DashboardLayout items={navItems} role="guru"><div className="card animate-pulse h-96" /></DashboardLayout>;

  return (
    <DashboardLayout items={navItems} role="guru">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Kelola Tautan E-Assessment</h1>
          <p className="text-sm text-slate-500">Tempel tautan kuis dari platform eksternal (Google Forms/Quizizz/dll.). Sistem otomatis menampilkan embed & QR untuk siswa.</p>
        </div>

        <div className="card">
          <label className="label-base">Pilih Kegiatan</label>
          <div className="mb-4 grid gap-2 sm:grid-cols-4">
            {KEGIATAN_CONTENT.map((k) => (
              <button
                key={k.nomor}
                onClick={() => setSelKeg(k.nomor)}
                className={`relative rounded-xl border-2 p-3 text-left transition ${selKeg === k.nomor ? '' : 'border-slate-200 hover:bg-slate-50'}`}
                style={selKeg === k.nomor ? { borderColor: k.warna, backgroundColor: k.warnaLight } : undefined}
              >
                {allAssess[k.nomor] && (
                  <span className="absolute right-2 top-2 grid h-5 w-5 place-items-center rounded-full bg-success/15 text-success" title="Tautan sudah diisi">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  </span>
                )}
                <p className="text-xs font-semibold text-slate-400">Kegiatan {k.nomor}</p>
                <p className="text-sm font-bold text-slate-800 leading-tight">{k.subjudul}</p>
                <p className="mt-1 text-[11px] text-slate-400">{allAssess[k.nomor] ? 'Kuis siap' : 'Belum ada kuis'}</p>
              </button>
            ))}
          </div>

          <div className="space-y-3">
            <div>
              <label className="label-base">Judul Kuis</label>
              <input className="input-base" value={judul} onChange={(e) => setJudul(e.target.value)} placeholder="Contoh: Kuis Formatif Kegiatan 1" />
            </div>
            <div>
              <label className="label-base">URL Kuis Eksternal</label>
              <input className="input-base" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://forms.gle/... atau https://quizizz.com/..." />
              <p className="mt-1.5 text-xs text-slate-400">Tempel link kuis dari Google Forms, Quizizz, Wordwall, atau platform sejenisnya.</p>
            </div>
            <div className="flex gap-2">
              <button onClick={save} className="btn-primary"><Save className="h-4 w-4" /> Simpan Tautan</button>
              {assess && <span className="chip self-center">Tersimpan • {new Date(assess.diperbarui_pada || '').toLocaleDateString('id-ID')}</span>}
            </div>
          </div>
        </div>

        {/* Preview */}
        {url && (
          <div className="card">
            <h3 className="mb-3 text-lg font-bold text-slate-800">Preview (apa yang siswa lihat)</h3>
            <div className="overflow-hidden rounded-xl border-2" style={{ borderColor: keg.warna }}>
              <iframe src={url} title="Preview" className="w-full" style={{ height: '420px', border: 'none' }} sandbox="allow-scripts allow-same-origin allow-forms" />
            </div>
            <p className="mt-2 text-xs text-slate-400">Siswa juga dapat memindai kode QR dari tab "Scan QR" di halaman kegiatan.</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

// ============ Ekspor Massal ============
export function TeacherEkspor() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [kelas, setKelas] = useState<Kelas[]>([]);
  const [selKelas, setSelKelas] = useState('');
  const [selKeg, setSelKeg] = useState('1');
  const [kegIds, setKegIds] = useState<Record<number, string>>({});
  const [rows, setRows] = useState<{ siswa: Profile; jawaban?: Jawaban; kuis?: StatusKuisSiswa }[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!profile) return;
    (async () => {
      const { data: k } = await supabase.from('kelas').select('*').eq('guru_id', profile.id).order('nama_kelas');
      setKelas(k || []);
      const { data: kegs } = await supabase.from('kegiatan').select('id, nomor');
      const map: Record<number, string> = {};
      (kegs || []).forEach((g: { id: string; nomor: number }) => { map[g.nomor] = g.id; });
      setKegIds(map);
    })();
  }, [profile]);

  const load = useCallback(async () => {
    if (!selKelas || !kegIds[Number(selKeg)]) return;
    setLoading(true);
    const { data: siswa } = await supabase.from('profiles').select('*').eq('kelas_id', selKelas).eq('role', 'siswa').order('nama');
    const sIds = (siswa || []).map((s) => s.id);
    if (sIds.length === 0) { setRows([]); setLoading(false); return; }
    const [jRes, kRes] = await Promise.all([
      supabase.from('jawaban').select('*').eq('kegiatan_id', kegIds[Number(selKeg)]).in('siswa_id', sIds),
      supabase.from('status_kuis_siswa').select('*').eq('kegiatan_id', kegIds[Number(selKeg)]).in('siswa_id', sIds),
    ]);
    const jByS = (jRes.data as Jawaban[] || []).reduce<Record<string, Jawaban>>((a, j) => { a[j.siswa_id] = j; return a; }, {});
    const kByS = (kRes.data as StatusKuisSiswa[] || []).reduce<Record<string, StatusKuisSiswa>>((a, k) => { a[k.siswa_id] = k; return a; }, {});
    setRows((siswa as Profile[] || []).map((s) => ({ siswa: s, jawaban: jByS[s.id], kuis: kByS[s.id] })));
    setLoading(false);
  }, [selKelas, selKeg, kegIds]);

  useEffect(() => { load(); }, [load]);

  const exportAll = () => {
    const k = kelas.find((x) => x.id === selKelas);
    const withJawaban = rows.filter((r) => r.jawaban);
    if (withJawaban.length === 0) { toast('Tidak ada jawaban untuk diekspor', 'warning'); return; }
    withJawaban.forEach((r) => {
      exportJawabanPDF(r.jawaban!, r.siswa, k?.nama_kelas || '', Number(selKeg), r.kuis);
    });
    toast(`${withJawaban.length} PDF diunduh (per siswa)`, 'success');
  };

  const exportRekap = () => {
    const k = kelas.find((x) => x.id === selKelas);
    const keg = KEGIATAN_CONTENT.find((c) => c.nomor === Number(selKeg));
    const data = rows.map((r) => ({
      nama: r.siswa.nama, kelas: k?.nama_kelas || '', kegiatan: keg?.judul || '',
      status: r.jawaban?.status || 'Belum dikerjakan',
      kuis: r.kuis?.sudah_mengerjakan ? 'Sudah' : 'Belum',
      skorKuis: r.kuis?.skor_manual ?? null,
      waktu: r.jawaban?.waktu_dikumpulkan ? new Date(r.jawaban.waktu_dikumpulkan).toLocaleString('id-ID') : '-',
    }));
    exportRekapPDF(data, k?.nama_kelas || 'Kelas');
  };

  return (
    <DashboardLayout items={navItems} role="guru">
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-slate-800">Ekspor Massal</h1>

        <div className="card flex flex-wrap items-end gap-3">
          <div>
            <label className="label-base">Kelas</label>
            <select className="input-base min-w-[180px]" value={selKelas} onChange={(e) => setSelKelas(e.target.value)}>
              <option value="">— Pilih —</option>
              {kelas.map((k) => <option key={k.id} value={k.id}>{k.nama_kelas}</option>)}
            </select>
          </div>
          <div>
            <label className="label-base">Kegiatan</label>
            <select className="input-base min-w-[160px]" value={selKeg} onChange={(e) => setSelKeg(e.target.value)}>
              {KEGIATAN_CONTENT.map((k) => <option key={k.nomor} value={k.nomor}>Kegiatan {k.nomor} — {k.subjudul}</option>)}
            </select>
          </div>
          <div className="ml-auto flex gap-2">
            <button onClick={exportAll} disabled={rows.length === 0} className="btn-primary"><Download className="h-4 w-4" /> Ekspor PDF per Siswa</button>
            <button onClick={exportRekap} disabled={rows.length === 0} className="btn-outline"><FileText className="h-4 w-4" /> Rekap Tabel PDF</button>
          </div>
        </div>

        {!selKelas ? (
          <EmptyState icon={<Download className="h-7 w-7" />} title="Pilih kelas & kegiatan" description="Pilih untuk mengekspor jawaban seluruh siswa." />
        ) : loading ? (
          <div className="card animate-pulse h-40" />
        ) : (
          <div className="card">
            <p className="mb-3 text-sm text-slate-600">{rows.length} siswa • {rows.filter((r) => r.jawaban).length} memiliki jawaban</p>
            <ul className="divide-y divide-slate-100">
              {rows.map((r) => (
                <li key={r.siswa.id} className="flex items-center justify-between py-2.5">
                  <span className="text-sm font-medium text-slate-800">{r.siswa.nama}</span>
                  {r.jawaban ? <button onClick={() => exportJawabanPDF(r.jawaban!, r.siswa, kelas.find((x) => x.id === selKelas)?.nama_kelas || '', Number(selKeg), r.kuis)} className="btn-ghost text-sm"><Download className="h-4 w-4" /> PDF</button> : <span className="text-xs text-slate-400">Belum kerja</span>}
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
              <p className="text-lg font-bold text-slate-800">{profile?.nama}</p>
              <Badge color="purple"><GraduationCap className="h-3.5 w-3.5" /> Guru</Badge>
            </div>
          </div>
          <dl className="mt-5 grid gap-4 sm:grid-cols-2">
            <Info label="Email" value={profile?.email || '-'} />
            <Info label="Username" value={profile?.username || '-'} />
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
