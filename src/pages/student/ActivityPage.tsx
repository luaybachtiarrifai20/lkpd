import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, BookOpen, ClipboardList, Atom, FlaskConical, Sparkles } from 'lucide-react';
import { type KegiatanContent } from '@/content/types';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { db, type AnswerValue, type Jawaban } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import {
  fetchJawaban, upsertJawabanDraft, submitJawaban,
  fetchAssessment, fetchStatusKuis, upsertStatusKuis,
} from '@/lib/answers';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ActivityRenderer } from '@/components/interactive/ActivityRenderer';
import { ConfirmModal } from '@/components/ui/Modal';

const navItems = [
  { to: '/siswa', label: 'Dashboard', icon: <BookOpen className="h-5 w-5" /> },
  { to: '/siswa/riwayat', label: 'Riwayat & Nilai', icon: <ClipboardList className="h-5 w-5" /> },
  { to: '/siswa/profil', label: 'Profil', icon: <Atom className="h-5 w-5" /> },
];

export function ActivityPage() {
  const { nomor } = useParams();
  const { profile } = useAuth();
  const { toast } = useToast();
  const nomorNum = Number(nomor);

  const [kegiatan, setKegiatan] = useState<KegiatanContent | null>(null);
  const [kegiatanId, setKegiatanId] = useState<string | null>(null);
  
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [status, setStatus] = useState<Jawaban['status']>('draft');
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [skor, setSkor] = useState<number | null>(null);
  const [feedbackGuru, setFeedbackGuru] = useState<string | null>(null);
  
  const [submitOpen, setSubmitOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Assessment state
  const [assessmentUrl, setAssessmentUrl] = useState<string | null>(null);
  const [assessmentJudul, setAssessmentJudul] = useState<string | null>(null);
  const [kuisDone, setKuisDone] = useState(false);

  const readOnly = status === 'terkumpul' || status === 'dinilai';

  // Refs for autosave: keep latest answers in sync & allow cancelling the timer
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const answersRef = useRef<Record<string, AnswerValue>>({});

  // Load kegiatan id + existing jawaban + assessment
  useEffect(() => {
    if (!profile || isNaN(nomorNum)) return;
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const kegsSnapshot = await getDocs(query(collection(db, 'kegiatan'), where('nomor', '==', nomorNum)));
        if (!active) return;
        
        if (kegsSnapshot.empty) {
          setLoading(false);
          return;
        }

        const kDoc = kegsSnapshot.docs[0];
        const kId = kDoc.id;
        const kegData = kDoc.data() as KegiatanContent;
        
        setKegiatanId(kId);
        setKegiatan(kegData);

        const [j, a, sk] = await Promise.all([
          fetchJawaban(kId, profile.id),
          fetchAssessment(kId),
          fetchStatusKuis(kId, profile.id),
        ]);
        if (!active) return;
        
        if (j) {
          const loaded = j.isi_jawaban || {};
          setAnswers(loaded);
          answersRef.current = loaded;
          setStatus(j.status);
          setSavedAt(j.waktu_disimpan);
          setSkor(j.skor ?? null);
          setFeedbackGuru(j.feedback_guru ?? null);
        } else {
          setSkor(null);
          setFeedbackGuru(null);
          answersRef.current = {};
        }
        setAssessmentUrl(a?.url_kuis || null);
        setAssessmentJudul(a?.judul_kuis || null);
        setKuisDone(sk?.sudah_mengerjakan || false);
      } catch (err) {
        console.error('Error fetching kegiatan:', err);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [profile, nomorNum]);

  // Debounced autosave (timer kept in a ref so it can be cancelled on submit/save)
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  const scheduleAutosave = useCallback(
    (val: Record<string, AnswerValue>) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        saveTimerRef.current = null;
        if (!kegiatanId || !profile || readOnly) return;
        setSaving(true);
        upsertJawabanDraft(kegiatanId, profile.id, val)
          .then(() => setSavedAt(new Date().toISOString()))
          .catch((err) => console.error(err))
          .finally(() => setSaving(false));
      }, 2000);
    },
    [kegiatanId, profile, readOnly],
  );

  const updateAnswer = useCallback(
    (key: string, val: AnswerValue) => {
      const next = { ...answersRef.current, [key]: val };
      answersRef.current = next;
      setAnswers(next);
      scheduleAutosave(next);
    },
    [scheduleAutosave],
  );

  const cancelAutosave = () => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
  };

  const handleSaveDraft = async () => {
    if (!kegiatanId || !profile || readOnly) return;
    cancelAutosave();
    try {
      await upsertJawabanDraft(kegiatanId, profile.id, answersRef.current);
      setSavedAt(new Date().toISOString());
      toast('Draft tersimpan', 'success');
    } catch { toast('Gagal menyimpan', 'error'); }
  };

  const handleSubmit = async () => {
    if (!kegiatanId || !profile) return;
    cancelAutosave();
    try {
      await submitJawaban(kegiatanId, profile.id, answersRef.current);
      setStatus('terkumpul');
      setSubmitOpen(false);
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

  if (loading) {
    return (
      <DashboardLayout items={navItems} role="siswa">
        <div className="card animate-pulse h-96" />
      </DashboardLayout>
    );
  }

  if (!kegiatan) {
    return (
      <DashboardLayout items={navItems} role="siswa">
        <div className="card text-center py-12">
          <p className="text-slate-500">Kegiatan tidak ditemukan di database.</p>
          <p className="text-xs text-slate-400 mt-2">Pastikan Super Admin telah melakukan Seeding Data.</p>
          <Link to="/siswa" className="btn-primary mt-4">Kembali ke Dashboard</Link>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout items={navItems} role="siswa">
      <div className="relative min-h-[calc(100vh-140px)] overflow-hidden rounded-3xl bg-slate-50/40 p-4 sm:p-6 md:p-8 border border-slate-100/80 shadow-soft">
        {/* Soft Ambient background glows */}
        <div className="absolute top-10 left-10 w-72 h-72 bg-brand-green-light/40 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-20 right-20 w-80 h-80 bg-brand-teal-light/45 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-amber-100/30 rounded-full blur-2xl pointer-events-none" />
        
        {/* Dotted sains grid pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:20px_20px] opacity-50 pointer-events-none" />
        
        {/* Floating Science Doodles */}
        <div className="absolute -left-2 top-32 hidden xl:block text-brand-green/10 animate-float-slow pointer-events-none">
          <FlaskConical className="h-16 w-16" />
        </div>
        <div className="absolute -right-2 top-72 hidden xl:block text-brand-teal/15 animate-float-slower pointer-events-none">
          <Atom className="h-20 w-20" />
        </div>
        <div className="absolute -left-4 bottom-48 hidden xl:block text-brand-amber/15 animate-float-medium pointer-events-none">
          <Sparkles className="h-14 w-14" />
        </div>

        {/* Content wrapper with higher z-index */}
        <div className="relative z-10">
          <div className="mb-5">
            <Link to="/siswa" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-brand-green">
              <ArrowLeft className="h-4 w-4" /> Dashboard
            </Link>
          </div>
          
          <ActivityRenderer 
            kegiatan={kegiatan}
            answers={answers}
            onUpdate={updateAnswer}
            status={status}
            savedAt={savedAt}
            saving={saving}
            onSaveDraft={handleSaveDraft}
            onSubmit={() => setSubmitOpen(true)}
            assessmentUrl={assessmentUrl}
            assessmentJudul={assessmentJudul}
            kuisDone={kuisDone}
            onTandaiKuis={handleTandaiKuis}
            skor={skor}
            feedback={feedbackGuru}
          />
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
