import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, CheckCircle2, Circle, Save, Send,
  BookOpen, Target, Atom, BarChart3, MessagesSquare,
  UploadCloud, ClipboardList, Microscope, AlertTriangle, Lock, FlaskConical,
} from 'lucide-react';
import { KEGIATAN_CONTENT, type KegiatanContent, type ContentBlock, type PBLStep } from '@/content/kegiatanContent';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { supabase, type AnswerValue, type Jawaban } from '@/lib/supabase';
import {
  fetchJawaban, upsertJawabanDraft, submitJawaban,
  fetchAssessment, fetchStatusKuis, upsertStatusKuis,
} from '@/lib/answers';
import { TextAnswer } from '@/components/interactive/TextAnswer';
import { EditableTable } from '@/components/interactive/EditableTable';
import { FileUpload } from '@/components/interactive/FileUpload';
import { ArgumentationTAP } from '@/components/interactive/ArgumentationTAP';
import { RadioCardSelector } from '@/components/interactive/RadioCardSelector';
import { EAssessment } from '@/components/interactive/EAssessment';
import { ConfirmModal } from '@/components/ui/Modal';
import { SDGBadgeChip, Badge } from '@/components/ui';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

const navItems = [
  { to: '/siswa', label: 'Dashboard', icon: <BookOpen className="h-5 w-5" /> },
  { to: '/siswa/riwayat', label: 'Riwayat & Nilai', icon: <ClipboardList className="h-5 w-5" /> },
  { to: '/siswa/profil', label: 'Profil', icon: <Atom className="h-5 w-5" /> },
];

const stepIcons = [
  <AlertTriangle className="h-4 w-4" />,
  <ClipboardList className="h-4 w-4" />,
  <Microscope className="h-4 w-4" />,
  <UploadCloud className="h-4 w-4" />,
  <MessagesSquare className="h-4 w-4" />,
];

export function ActivityPage() {
  const { nomor } = useParams();
  const { profile } = useAuth();
  const { toast } = useToast();
  const nomorNum = Number(nomor);
  const kegiatan = KEGIATAN_CONTENT.find((k) => k.nomor === nomorNum);

  const [kegiatanId, setKegiatanId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [status, setStatus] = useState<Jawaban['status']>('draft');
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState(0);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Assessment state
  const [assessmentUrl, setAssessmentUrl] = useState<string | null>(null);
  const [assessmentJudul, setAssessmentJudul] = useState<string | null>(null);
  const [kuisDone, setKuisDone] = useState(false);

  const readOnly = status === 'terkumpul' || status === 'dinilai';

  // Load kegiatan id + existing jawaban + assessment
  useEffect(() => {
    if (!profile || !kegiatan) return;
    let active = true;
    (async () => {
      setLoading(true);
      const { data: keg } = await supabase.from('kegiatan').select('id').eq('nomor', nomorNum).maybeSingle();
      if (!active) return;
      const kId = keg?.id ?? null;
      setKegiatanId(kId);
      if (!kId) { setLoading(false); return; }

      const [j, a, sk] = await Promise.all([
        fetchJawaban(kId, profile.id),
        fetchAssessment(kId),
        fetchStatusKuis(kId, profile.id),
      ]);
      if (!active) return;
      if (j) {
        setAnswers(j.isi_jawaban || {});
        setStatus(j.status);
        setSavedAt(j.waktu_disimpan);
      }
      setAssessmentUrl(a?.url_kuis || null);
      setAssessmentJudul(a?.judul_kuis || null);
      setKuisDone(sk?.sudah_mengerjakan || false);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [profile, kegiatan, nomorNum]);

  // Debounced autosave
  const debouncedSave = useMemo(() => {
    let t: ReturnType<typeof setTimeout>;
    return (val: Record<string, AnswerValue>) => {
      clearTimeout(t);
      t = setTimeout(async () => {
        if (!kegiatanId || !profile || readOnly) return;
        setSaving(true);
        try {
          await upsertJawabanDraft(kegiatanId, profile.id, val);
          setSavedAt(new Date().toISOString());
        } catch (err) {
          console.error(err);
        } finally {
          setSaving(false);
        }
      }, 2000);
    };
  }, [kegiatanId, profile, readOnly]);

  const updateAnswer = useCallback((key: string, val: AnswerValue) => {
    setAnswers((prev) => {
      const next = { ...prev, [key]: val };
      debouncedSave(next);
      return next;
    });
  }, [debouncedSave]);

  const handleSubmit = async () => {
    if (!kegiatanId || !profile) return;
    try {
      await submitJawaban(kegiatanId, profile.id, answers);
      setStatus('terkumpul');
      toast('Jawaban berhasil dikumpulkan!', 'success');
    } catch (err) {
      console.error(err);
      toast('Gagal mengumpulkan jawaban', 'error');
    }
  };

  const handleTandaiKuis = async (v: boolean) => {
    if (!kegiatanId || !profile) return;
    setKuisDone(v);
    try {
      await upsertStatusKuis(kegiatanId, profile.id, v);
      toast(v ? 'Kuis ditandai selesai' : 'Status kuis diubah', 'success');
    } catch (err) {
      console.error(err);
      toast('Gagal memperbarui status kuis', 'error');
    }
  };

  if (!kegiatan) {
    return (
      <DashboardLayout items={navItems} role="siswa">
        <div className="card text-center py-12">
          <p className="text-slate-500">Kegiatan tidak ditemukan.</p>
          <Link to="/siswa" className="btn-primary mt-4">Kembali ke Dashboard</Link>
        </div>
      </DashboardLayout>
    );
  }

  if (loading) {
    return (
      <DashboardLayout items={navItems} role="siswa">
        <div className="card animate-pulse h-96" />
      </DashboardLayout>
    );
  }

  const steps = kegiatan.steps;
  const current = steps[activeStep];

  // completion calc: how many steps have at least one filled answer
  const stepCompletion = steps.map((s) => {
    const keys = s.blocks.map((b) => blockKey(b)).filter(Boolean) as string[];
    return keys.some((k) => {
      const v = answers[k];
      if (v == null) return false;
      if (typeof v === 'string') return v.trim().length > 0;
      if (Array.isArray(v)) return v.some((x) => String(x).trim());
      return true;
    });
  });
  const completedCount = stepCompletion.filter(Boolean).length;
  const overallPct = Math.round(((completedCount + (kuisDone ? 1 : 0)) / (steps.length + 1)) * 100);

  return (
    <DashboardLayout items={navItems} role="siswa">
      <div className="space-y-5">
        <Link to="/siswa" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-brand-green">
          <ArrowLeft className="h-4 w-4" /> Dashboard
        </Link>

        {/* Header banner */}
        <div className="overflow-hidden rounded-2xl shadow-soft" style={{ backgroundColor: kegiatan.warna }}>
          <div className="px-5 py-6 sm:px-7">
            <div className="flex flex-wrap items-start justify-between gap-3 text-white">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-white/70">Kegiatan {kegiatan.nomor}</p>
                <h1 className="mt-1 text-2xl font-extrabold sm:text-3xl" style={{ color: 'white' }}>{kegiatan.judul.replace(/^Kegiatan \d+\s*[—-]\s*/, '')}</h1>
                <p className="mt-1 text-sm text-white/85">{kegiatan.subjudul}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {kegiatan.sdg.map((s) => <SDGBadgeChip key={s.nomor} sdg={s} />)}
                </div>
              </div>
              {readOnly && (
                <span className="badge bg-white/20 text-white"><Lock className="h-3.5 w-3.5" /> {status === 'dinilai' ? 'Dinilai' : 'Terkumpul'}</span>
              )}
            </div>
            <div className="mt-4 max-w-md">
              <div className="mb-1 flex justify-between text-xs text-white/80">
                <span>Progres kegiatan</span><span>{overallPct}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/25">
                <div className="h-full rounded-full bg-white transition-all" style={{ width: `${overallPct}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* Materi & Tujuan accordion */}
        <details className="card group">
          <summary className="flex cursor-pointer items-center justify-between list-none">
            <span className="flex items-center gap-2 font-bold text-slate-800"><BookOpen className="h-5 w-5 text-brand-green" /> Materi & Tujuan Pembelajaran</span>
            <span className="text-slate-400 group-open:rotate-180 transition">▾</span>
          </summary>
          <div className="mt-4 space-y-4">
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">Cakupan Materi</p>
              <div className="flex flex-wrap gap-1.5">
                {kegiatan.cakupanMateri.map((m) => (
                  <span key={m} className="chip">{m}</span>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-slate-700"><Target className="h-4 w-4 text-brand-teal" /> Tujuan Pembelajaran</p>
              <ol className="ml-6 list-decimal space-y-1 text-sm text-slate-600">
                {kegiatan.tujuan.map((t, i) => <li key={i}>{t}</li>)}
              </ol>
            </div>
            <div>
              <p className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-slate-700"><FlaskConical className="h-4 w-4 text-brand-green" /> Materi Singkat</p>
              <p className="text-sm text-slate-600 leading-relaxed">{kegiatan.materi}</p>
            </div>
          </div>
        </details>

        <div className="grid gap-5 lg:grid-cols-[260px_1fr]">
          {/* Sidebar stepper */}
          <aside className="lg:sticky lg:top-[80px] lg:self-start">
            <div className="card-tight">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Sintaks PBL</p>
              <ol className="space-y-1">
                {steps.map((s, i) => {
                  const done = stepCompletion[i];
                  const active = i === activeStep;
                  return (
                    <li key={s.id}>
                      <button
                        onClick={() => setActiveStep(i)}
                        className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm transition ${
                          active ? 'bg-brand-green-light text-brand-green-dark font-semibold' : 'text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <span className={`shrink-0 ${done ? 'text-success' : 'text-slate-300'}`}>
                          {done ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
                        </span>
                        <span className="flex-1">
                          <span className="block text-[11px] font-semibold text-slate-400">Sintaks {s.sintaks}</span>
                          <span className="block leading-tight">{s.label}</span>
                        </span>
                      </button>
                    </li>
                  );
                })}
                <li>
                  <button
                    onClick={() => setActiveStep(steps.length)}
                    className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm transition ${
                      activeStep === steps.length ? 'bg-brand-green-light text-brand-green-dark font-semibold' : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span className={`shrink-0 ${kuisDone ? 'text-success' : 'text-slate-300'}`}>
                      {kuisDone ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
                    </span>
                    <span className="flex-1">
                      <span className="block text-[11px] font-semibold text-slate-400">E-Assessment</span>
                      <span className="block leading-tight">Uji Pemahamanmu</span>
                    </span>
                  </button>
                </li>
              </ol>
            </div>
          </aside>

          {/* Main step content */}
          <div className="min-w-0">
            {activeStep < steps.length ? (
              <StepContent
                step={current}
                kegiatan={kegiatan}
                answers={answers}
                onUpdate={updateAnswer}
                readOnly={readOnly}
                savedAt={savedAt}
              />
            ) : (
              <div className="card animate-fade-in">
                <div className="banner mb-4" style={{ backgroundColor: kegiatan.warna }}>
                  <BarChart3 className="h-5 w-5" /> E-Assessment — Uji Pemahamanmu
                </div>
                <EAssessment
                  url={assessmentUrl}
                  judul={assessmentJudul}
                  sudahMengerjakan={kuisDone}
                  onTandai={handleTandaiKuis}
                  accentColor={kegiatan.warna}
                />
              </div>
            )}

            {/* Step nav */}
            <div className="mt-5 flex items-center justify-between">
              <button
                onClick={() => setActiveStep((s) => Math.max(0, s - 1))}
                disabled={activeStep === 0}
                className="btn-ghost disabled:opacity-40"
              >
                <ArrowLeft className="h-4 w-4" /> Sebelumnya
              </button>
              {activeStep < steps.length ? (
                <button onClick={() => setActiveStep((s) => Math.min(steps.length, s + 1))} className="btn-outline">
                  Berikutnya <ArrowRight className="h-4 w-4" />
                </button>
              ) : (
                <span className="text-xs text-slate-400">Tahap akhir</span>
              )}
            </div>
          </div>
        </div>

        {/* Action bar */}
        <div className="sticky bottom-4 z-30 flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-white/95 px-4 py-3 shadow-float backdrop-blur">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            {saving ? (
              <span className="inline-flex items-center gap-1"><span className="h-3 w-3 animate-spin rounded-full border-2 border-brand-green border-t-transparent" /> Menyimpan…</span>
            ) : savedAt ? (
              <span className="inline-flex items-center gap-1 text-success"><CheckCircle2 className="h-3.5 w-3.5" /> Tersimpan otomatis</span>
            ) : (
              <span>Belum disimpan</span>
            )}
            {readOnly && <Badge color="slate"><Lock className="h-3 w-3" /> {status}</Badge>}
          </div>
          <div className="flex gap-2">
            <button
              onClick={async () => {
                if (!kegiatanId || !profile || readOnly) return;
                try {
                  await upsertJawabanDraft(kegiatanId, profile.id, answers);
                  setSavedAt(new Date().toISOString());
                  toast('Draft tersimpan', 'success');
                } catch { toast('Gagal menyimpan', 'error'); }
              }}
              disabled={readOnly}
              className="btn-outline"
            >
              <Save className="h-4 w-4" /> Simpan Draft
            </button>
            {!readOnly ? (
              <button onClick={() => setSubmitOpen(true)} className="btn-primary">
                <Send className="h-4 w-4" /> Kumpulkan Jawaban
              </button>
            ) : (
              <span className="text-xs text-slate-400">Jawaban terkumpul — menunggu penilaian guru</span>
            )}
          </div>
        </div>
      </div>

      <ConfirmModal
        open={submitOpen}
        onClose={() => setSubmitOpen(false)}
        onConfirm={handleSubmit}
        title="Kumpulkan Jawaban?"
        message="Setelah dikumpulkan, jawaban tidak dapat diubah lagi kecuali guru membuka kembali. Pastikan seluruh tahap sudah kamu kerjakan."
        confirmText="Ya, Kumpulkan"
        cancelText="Periksa Lagi"
      />
    </DashboardLayout>
  );
}

function StepContent({
  step, kegiatan, answers, onUpdate, readOnly, savedAt,
}: {
  step: PBLStep;
  kegiatan: KegiatanContent;
  answers: Record<string, AnswerValue>;
  onUpdate: (key: string, val: AnswerValue) => void;
  readOnly: boolean;
  savedAt: string | null;
}) {
  return (
    <div className="animate-fade-in space-y-5">
      <div className="banner" style={{ backgroundColor: kegiatan.warna }}>
        {stepIcons[step.sintaks - 1]} Sintaks PBL {step.sintaks} — {step.label}
      </div>
      <p className="text-sm text-slate-500">{step.ringkas}</p>

      {step.blocks.map((block, i) => (
        <BlockRenderer
          key={i}
          block={block}
          kegiatan={kegiatan}
          answers={answers}
          onUpdate={onUpdate}
          readOnly={readOnly}
          savedAt={savedAt}
        />
      ))}
    </div>
  );
}

function blockKey(b: ContentBlock): string | null {
  if ('id' in b) return b.id;
  return null;
}

function BlockRenderer({
  block, kegiatan, answers, onUpdate, readOnly, savedAt,
}: {
  block: ContentBlock;
  kegiatan: KegiatanContent;
  answers: Record<string, AnswerValue>;
  onUpdate: (key: string, val: AnswerValue) => void;
  readOnly: boolean;
  savedAt: string | null;
}) {
  switch (block.kind) {
    case 'stimulus':
      return (
        <div className="rounded-xl bg-slate-50 p-4">
          <p className="mb-1 text-sm font-semibold text-slate-700">{block.title}</p>
          <p className="text-sm leading-relaxed text-slate-600">{block.body}</p>
        </div>
      );
    case 'masalah':
      return (
        <div className="rounded-xl bg-brand-amber-light p-4">
          <p className="mb-1 flex items-center gap-2 text-sm font-bold text-[#B26A00]">
            <AlertTriangle className="h-4 w-4" /> {block.title}
          </p>
          <p className="text-sm leading-relaxed text-slate-700">{block.body}</p>
        </div>
      );
    case 'pertanyaan':
      return (
        <div className="card">
          <p className="mb-2.5 text-sm font-medium text-slate-700">{block.text}</p>
          <TextAnswer
            id={block.id}
            value={(answers[block.id] as string) || ''}
            onChange={(v) => onUpdate(block.id, v)}
            disabled={readOnly}
            hint={block.hint}
            savedAt={savedAt}
          />
        </div>
      );
    case 'tabel-org':
      return (
        <div className="space-y-4">
          <div className="card">
            <EditableTable
              headers={block.headers}
              title={block.title}
              rows={(answers[block.id] as { rows: string[][] })?.rows || Array.from({ length: block.rowCount }, () => block.headers.map(() => ''))}
              onChange={(rows) => onUpdate(block.id, { rows })}
              disabled={readOnly}
            />
          </div>
          {block.perencanaanId && (
            <div className="card">
              <p className="mb-2.5 text-sm font-medium text-slate-700">{block.perencanaanText}</p>
              <TextAnswer
                id={block.perencanaanId}
                value={(answers[block.perencanaanId] as string) || ''}
                onChange={(v) => onUpdate(block.perencanaanId!, v)}
                disabled={readOnly}
                rows={4}
                savedAt={savedAt}
              />
            </div>
          )}
        </div>
      );
    case 'data-eksperimen':
      return (
        <div className="card">
          <p className="mb-2 text-sm font-semibold text-slate-700">{block.title}</p>
          <div className="overflow-x-auto scrollbar-thin rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50">
                  {block.headers.map((h) => (
                    <th key={h} className="whitespace-nowrap px-3 py-2.5 text-left font-semibold text-slate-700 border-b border-slate-200">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {block.rows.map((row, r) => (
                  <tr key={r} className={r % 2 ? 'bg-slate-50/40' : ''}>
                    {row.map((cell, c) => (
                      <td key={c} className="px-3 py-2.5 text-slate-700 border-b border-slate-100">{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {block.note && <p className="mt-2 text-xs text-slate-400">{block.note}</p>}
        </div>
      );
    case 'input-hitung':
      return (
        <div className="card space-y-3">
          <p className="text-sm font-medium text-slate-700">{block.label}{block.unit && <span className="ml-1 text-xs text-slate-400">({block.unit})</span>}</p>
          <input
            type="text"
            className="input-base"
            value={(answers[block.id] as string) || ''}
            disabled={readOnly}
            placeholder="Hasil perhitungan…"
            onChange={(e) => onUpdate(block.id, e.target.value)}
          />
          {block.allowImage && (
            <div>
              <p className="mb-2 text-xs font-medium text-slate-500">Unggah foto grafik/perhitungan tulis tangan (opsional)</p>
              <FileUpload
                value={(answers[`${block.id}_img`] as { files: import('@/lib/supabase').UploadedFile[] })?.files || []}
                onChange={(files) => onUpdate(`${block.id}_img`, { files })}
                disabled={readOnly}
                pathPrefix={`kegiatan-${kegiatan.nomor}`}
              />
            </div>
          )}
        </div>
      );
    case 'diagram-submikro':
      return (
        <div className="card">
          <p className="mb-3 text-sm font-semibold text-slate-700">{block.title}</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <DiagramCol label={block.kiri.label} desc={block.kiri.deskripsi} color="#37474F" />
            <DiagramCol label={block.kanan.label} desc={block.kanan.deskripsi} color={kegiatan.warna} />
          </div>
          <div className="mt-3 flex items-center justify-center gap-2 text-slate-300">
            <ArrowRight className="hidden h-6 w-6 sm:block" />
          </div>
        </div>
      );
    case 'analitis':
      return (
        <div className="card">
          <p className="mb-2.5 flex items-start gap-2 text-sm font-medium text-slate-700">
            <Microscope className="mt-0.5 h-4 w-4 shrink-0 text-brand-teal" /> {block.text}
          </p>
          <TextAnswer
            id={block.id}
            value={(answers[block.id] as string) || ''}
            onChange={(v) => onUpdate(block.id, v)}
            disabled={readOnly}
            rows={4}
            savedAt={savedAt}
          />
          {block.allowImage && (
            <div className="mt-3">
              <p className="mb-2 text-xs font-medium text-slate-500">Unggah foto grafik/perhitungan tulis tangan (opsional)</p>
              <FileUpload
                value={(answers[`${block.id}_img`] as { files: import('@/lib/supabase').UploadedFile[] })?.files || []}
                onChange={(files) => onUpdate(`${block.id}_img`, { files })}
                disabled={readOnly}
                pathPrefix={`kegiatan-${kegiatan.nomor}`}
              />
            </div>
          )}
        </div>
      );
    case 'instruksi-pengembangan':
      return (
        <div className="rounded-xl bg-brand-teal-light p-4">
          <p className="mb-1 flex items-center gap-2 text-sm font-bold text-brand-teal-dark"><UploadCloud className="h-4 w-4" /> {block.title}</p>
          <p className="text-sm leading-relaxed text-slate-700">{block.body}</p>
          {block.bullets && (
            <ul className="mt-2 ml-6 list-disc space-y-1 text-sm text-slate-700">
              {block.bullets.map((b, i) => <li key={i}>{b}</li>)}
            </ul>
          )}
        </div>
      );
    case 'upload-hasil':
      return (
        <div className="card">
          <p className="mb-1 text-sm font-semibold text-slate-700">{block.title}</p>
          <p className="mb-3 text-xs text-slate-500">{block.body}</p>
          <FileUpload
            value={(answers[block.id] as { files: import('@/lib/supabase').UploadedFile[] })?.files || []}
            onChange={(files) => onUpdate(block.id, { files })}
            disabled={readOnly}
            pathPrefix={`kegiatan-${kegiatan.nomor}`}
          />
        </div>
      );
    case 'alternatif-kasus':
      return (
        <div className="card space-y-4">
          <p className="text-sm font-semibold text-slate-700">{block.title}</p>
          <RadioCardSelector
            options={block.options}
            value={(answers[block.id] as string) || ''}
            onChange={(v) => onUpdate(block.id, v)}
            disabled={readOnly}
          />
          <div>
            <p className="mb-1.5 text-xs font-medium text-slate-500">Alasan pilihanmu</p>
            <TextAnswer
              id={block.alasanId}
              value={(answers[block.alasanId] as string) || ''}
              onChange={(v) => onUpdate(block.alasanId, v)}
              disabled={readOnly}
              rows={3}
              savedAt={savedAt}
            />
          </div>
        </div>
      );
    case 'argumentasi-tap':
      return (
        <div className="card">
          <p className="mb-1 flex items-center gap-2 text-sm font-bold text-slate-800"><MessagesSquare className="h-4 w-4 text-brand-amber" /> {block.title}</p>
          <p className="mb-3 text-xs text-slate-500">Susun argumentasi ilmiahmu dengan kerangka TAP (Toulmin Adaptif).</p>
          <ArgumentationTAP
            value={(answers[block.id] as { tap: Record<string, string> })?.tap || {}}
            onChange={(tap) => onUpdate(block.id, { tap })}
            kasus={block.kasus}
            disabled={readOnly}
          />
        </div>
      );
    case 'penalaran-level':
      return (
        <div className="card">
          <p className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-800"><Atom className="h-4 w-4 text-brand-teal" /> Integrasi Penalaran Kimia — 3 Level Representasi</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <LevelCard icon={<Microscope className="h-5 w-5" />} title="Makroskopik" desc={block.makroskopik} color="bg-brand-green-light text-brand-green" />
            <LevelCard icon={<Atom className="h-5 w-5" />} title="Submikroskopik" desc={block.submikroskopik} color="bg-brand-teal-light text-brand-teal" />
            <LevelCard icon={<BarChart3 className="h-5 w-5" />} title="Simbolik" desc={block.simbolik} color="bg-brand-amber-light text-brand-amber" />
          </div>
        </div>
      );
    case 'bagian-header':
      return (
        <div className="flex items-center gap-3 pt-2">
          <span className="h-px flex-1 bg-slate-200" />
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-slate-500">{block.label}</span>
          <span className="h-px flex-1 bg-slate-200" />
        </div>
      );
    case 'analisis-efisiensi':
      return (
        <div className="card space-y-4">
          <p className="text-sm font-semibold text-slate-700">{block.title}</p>
          <div className="overflow-x-auto scrollbar-thin rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50">
                  {block.headers.map((h) => (
                    <th key={h} className="whitespace-nowrap px-3 py-2.5 text-left font-semibold text-slate-700 border-b border-slate-200">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {block.rows.map((row, r) => (
                  <tr key={r} className={r % 2 ? 'bg-slate-50/40' : ''}>
                    {row.map((cell, c) => (
                      <td key={c} className="px-3 py-2.5 text-slate-700 border-b border-slate-100">{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div>
            <p className="mb-2.5 text-sm font-medium text-slate-700">{block.pertanyaanText}</p>
            <TextAnswer
              id={block.pertanyaanId}
              value={(answers[block.pertanyaanId] as string) || ''}
              onChange={(v) => onUpdate(block.pertanyaanId, v)}
              disabled={readOnly}
              rows={4}
              savedAt={savedAt}
            />
          </div>
        </div>
      );
    case 'tabel-integrasi':
      return (
        <div className="card">
          <p className="mb-2 text-sm font-semibold text-slate-700">{block.title}</p>
          <div className="overflow-x-auto scrollbar-thin rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50">
                  {block.headers.map((h) => (
                    <th key={h} className="whitespace-nowrap px-3 py-2.5 text-left font-semibold text-slate-700 border-b border-slate-200">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {block.leftCol.map((left, r) => (
                  <tr key={r} className={r % 2 ? 'bg-slate-50/40' : ''}>
                    <td className="px-3 py-2.5 text-slate-700 border-b border-slate-100 font-medium">{left}</td>
                    {block.headers.slice(1).map((_, c) => (
                      <td key={c} className="px-3 py-2.5 border-b border-slate-100 p-0">
                        <input
                          type="text"
                          disabled={readOnly}
                          value={(answers[block.id] as { rows: string[][] })?.rows?.[r]?.[c] || ''}
                          onChange={(e) => {
                            const cur = (answers[block.id] as { rows: string[][] })?.rows || Array.from({ length: block.leftCol.length }, () => block.headers.slice(1).map(() => ''));
                            const next = cur.map((row) => [...row]);
                            if (!next[r]) next[r] = block.headers.slice(1).map(() => '');
                            next[r][c] = e.target.value;
                            onUpdate(block.id, { rows: next });
                          }}
                          className="w-full bg-transparent px-3 py-2.5 text-sm text-slate-800 focus:bg-brand-green-light/40 focus:outline-none disabled:text-slate-500"
                          placeholder="…"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    case 'analisis-prediksi':
      return (
        <div className="card space-y-4">
          <p className="text-sm font-semibold text-slate-700">{block.title}</p>
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Kondisi</p>
            <ul className="ml-5 list-disc space-y-1 text-sm text-slate-700">
              {block.kondisi.map((k, i) => <li key={i}>{k}</li>)}
            </ul>
          </div>
          <div>
            <p className="mb-2.5 text-sm font-medium text-slate-700">{block.pertanyaanText}</p>
            <TextAnswer
              id={block.id}
              value={(answers[block.id] as string) || ''}
              onChange={(v) => onUpdate(block.id, v)}
              disabled={readOnly}
              rows={4}
              savedAt={savedAt}
            />
          </div>
        </div>
      );
    default:
      return null;
  }
}

function DiagramCol({ label, desc, color }: { label: string; desc: string; color: string }) {
  return (
    <div className="rounded-xl border-2 p-4" style={{ borderColor: color }}>
      <p className="text-sm font-bold" style={{ color }}>{label}</p>
      <p className="mt-1 text-xs text-slate-600">{desc}</p>
      <div className="mt-3 flex h-20 items-center justify-center rounded-lg bg-slate-50 text-slate-300">
        <Atom className="h-8 w-8" />
      </div>
    </div>
  );
}

function LevelCard({ icon, title, desc, color }: { icon: React.ReactNode; title: string; desc: string; color: string }) {
  return (
    <div className="rounded-xl border border-slate-100 p-3.5">
      <div className={`mb-2 inline-grid h-9 w-9 place-items-center rounded-lg ${color}`}>{icon}</div>
      <p className="text-sm font-bold text-slate-800">{title}</p>
      <p className="mt-1 text-xs text-slate-500 leading-relaxed">{desc}</p>
    </div>
  );
}
