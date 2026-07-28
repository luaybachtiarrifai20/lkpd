import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, BookOpen, ClipboardList, Atom } from 'lucide-react';
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
          setAnswers(j.isi_jawaban || {});
          setStatus(j.status);
          setSavedAt(j.waktu_disimpan);
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

  const handleSaveDraft = async () => {
    if (!kegiatanId || !profile || readOnly) return;
    try {
      await upsertJawabanDraft(kegiatanId, profile.id, answers);
      setSavedAt(new Date().toISOString());
      toast('Draft tersimpan', 'success');
    } catch { toast('Gagal menyimpan', 'error'); }
  };

  const handleSubmit = async () => {
    if (!kegiatanId || !profile) return;
    try {
      await submitJawaban(kegiatanId, profile.id, answers);
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
      />

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
