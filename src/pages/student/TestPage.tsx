// components/Student/TestPage.tsx
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { db } from '@/lib/firebase';
import { fetchJawaban, submitJawaban } from '@/lib/answers';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  setDoc,
  updateDoc,
  addDoc,
  orderBy,
} from 'firebase/firestore';
import { KEGIATAN_CONTENT } from '@/content/kegiatanContent';
import { Badge, EmptyState } from '@/components/ui';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Circle,
  Radio,
  FileText,
  Clock,
  AlertTriangle,
  Send,
  LayoutDashboard,
} from 'lucide-react';
import type { Question, TestAnswer } from '@/lib/firebase';

const navItems = [
  { to: '/siswa', label: 'Dashboard', icon: <LayoutDashboard className="h-5 w-5" /> },
];

type TestMode = 'pretest' | 'posttest';

export function TestPage() {
  const { kegiatanId, testType } = useParams<{ kegiatanId: string; testType: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { toast } = useToast();
  // Derive mode from the URL so `/posttest` actually opens the posttest.
  const mode: TestMode = testType === 'posttest' ? 'posttest' : 'pretest';
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [remainingTime, setRemainingTime] = useState<number | null>(null);
  const [testAnswerDoc, setTestAnswerDoc] = useState<TestAnswer | null>(null);

  const kegiatan = KEGIATAN_CONTENT.find((k) => k.nomor === Number(kegiatanId));

  useEffect(() => {
    if (!profile || !kegiatanId) return;
    loadQuestions();
  }, [kegiatanId, mode, profile]);

  const loadQuestions = async () => {
    setLoading(true);
    // Reset per-test state so switching pretest/posttest doesn't leak stale data
    setSubmitted(false);
    setStartedAt(null);
    setTestAnswerDoc(null);
    setAnswers({});
    setCurrentIndex(0);
    setQuestions([]);
    try {
      const kegiatanRef = `kegiatan-${kegiatanId}`;
      const q = query(
        collection(db, 'questions'),
        where('kegiatan_id', '==', kegiatanRef),
        where('test_type', '==', mode),
        // orderBy('order', 'asc')
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Question);
      setQuestions(data);

      // Check if already submitted
      const answerSnapshot = await getDocs(
        query(
          collection(db, 'test_answers'),
          where('siswa_id', '==', profile?.id || ''),
          where('kegiatan_id', '==', kegiatanRef),
          where('test_type', '==', mode)
        )
      );

      if (!answerSnapshot.empty) {
        const docData = { id: answerSnapshot.docs[0].id, ...answerSnapshot.docs[0].data() } as TestAnswer;
        setTestAnswerDoc(docData);
        if (docData.completed) {
          setSubmitted(true);
        } else if (docData.answers) {
          setAnswers(docData.answers);
        }
        if (docData.started_at) {
          setStartedAt(docData.started_at);
        }
      }
    } catch (err) {
      console.error('Load questions error:', err);
      toast('Gagal memuat soal', 'error');
    } finally {
      setLoading(false);
    }
  };

  const startTest = async () => {
    if (!profile || !kegiatanId) return;
    try {
      const now = new Date().toISOString();
      const kegiatanRef = `kegiatan-${kegiatanId}`;

      // Check if already started
      const existing = await getDocs(
        query(
          collection(db, 'test_answers'),
          where('siswa_id', '==', profile.id),
          where('kegiatan_id', '==', kegiatanRef),
          where('test_type', '==', mode)
        )
      );

      if (existing.empty) {
        const docRef = await addDoc(collection(db, 'test_answers'), {
          siswa_id: profile.id,
          kegiatan_id: kegiatanRef,
          test_type: mode,
          answers: {},
          score: null,
          started_at: now,
          submitted_at: null,
          completed: false,
        });
        console.debug('[TestPage] created test_answers', docRef.id, { siswa_id: profile.id, kegiatan_id: kegiatanRef, test_type: mode });
      } else {
        await updateDoc(doc(db, 'test_answers', existing.docs[0].id), {
          started_at: now,
        });
      }

      setStartedAt(now);
      toast('Test dimulai!', 'success');
    } catch (err) {
      console.error('Start test error:', err);
      toast('Gagal memulai test', 'error');
    }
  };

  const handleAnswer = (questionId: string, value: string | string[]) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleSubmit = async () => {
    if (!profile || !kegiatanId) return;

    // Check if all questions answered
    const unanswered = questions.filter((q) => !answers[q.id]);
    if (unanswered.length > 0) {
      if (!confirm(`Masih ada ${unanswered.length} soal yang belum dijawab. Yakin ingin mengumpulkan?`)) {
        return;
      }
    }

    if (!confirm('Yakin ingin mengumpulkan jawaban? Tindakan ini tidak dapat dibatalkan.')) {
      return;
    }

    try {
      const kegiatanRef = `kegiatan-${kegiatanId}`;
      const answerSnapshot = await getDocs(
        query(
          collection(db, 'test_answers'),
          where('siswa_id', '==', profile?.id),
          where('kegiatan_id', '==', kegiatanRef),
          where('test_type', '==', mode)
        )
      );

      if (!answerSnapshot.empty) {
        await updateDoc(doc(db, 'test_answers', answerSnapshot.docs[0].id), {
          answers,
          submitted_at: new Date().toISOString(),
          completed: true,
        });
        console.debug('[TestPage] updated test_answers', answerSnapshot.docs[0].id, { submitted_at: new Date().toISOString() });
        // Also upsert jawaban document to include these test answers (normalize by question id)
        try {
          const kegRef = kegiatanRef;
          const existingJaw = await fetchJawaban(kegRef, profile.id);
          const mergedIsi = { ...(existingJaw?.isi_jawaban || {}), ...answers };
          await submitJawaban(kegRef, profile.id, mergedIsi);
          console.debug('[TestPage] merged test answers into jawaban', { kegiatan_id: kegRef, siswa_id: profile.id, mergedKeys: Object.keys(mergedIsi) });
        } catch (e) {
          console.error('[TestPage] failed to merge test answers into jawaban', e);
        }
      }

      setSubmitted(true);
      toast('Test berhasil dikumpulkan!', 'success');
    } catch (err) {
      console.error('Submit test error:', err);
      toast('Gagal mengumpulkan test', 'error');
    }
  };

  const getProgress = () => {
    const answered = questions.filter((q) => answers[q.id]).length;
    return { answered, total: questions.length };
  };

  if (loading) {
    return (
      <DashboardLayout items={navItems} role="siswa">
        <div className="card animate-pulse h-96" />
      </DashboardLayout>
    );
  }

  if (questions.length === 0) {
    return (
      <DashboardLayout items={navItems} role="siswa">
        <div className="space-y-6">
          <button
            onClick={() => navigate(`/siswa/kegiatan/${kegiatanId}`)}
            className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-brand-green"
          >
            <ArrowLeft className="h-4 w-4" /> Kembali ke Kegiatan
          </button>
          <EmptyState
            icon={<FileText className="h-7 w-7" />}
            title="Belum ada soal"
            description={`Belum ada soal ${mode === 'pretest' ? 'pretest' : 'posttest'} untuk kegiatan ini.`}
          />
        </div>
      </DashboardLayout>
    );
  }

  if (submitted) {
    return (
      <DashboardLayout items={navItems} role="siswa">
        <div className="space-y-6">
          <button
            onClick={() => navigate(`/siswa/kegiatan/${kegiatanId}`)}
            className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-brand-green"
          >
            <ArrowLeft className="h-4 w-4" /> Kembali ke Kegiatan
          </button>
          <div className="card text-center py-12">
            <CheckCircle2 className="h-16 w-16 text-success mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-slate-800">Test Selesai!</h2>
            <p className="text-slate-500 mt-2">
              {mode === 'pretest' ? 'Pretest' : 'Posttest'} telah dikumpulkan.
              {testAnswerDoc?.score !== null && (
                <span className="block mt-2 text-lg">
                  Skor: <strong className="text-brand-green">{testAnswerDoc?.score}</strong>
                </span>
              )}
              {testAnswerDoc?.feedback_guru && (
                <div className="mt-3 text-left">
                  <p className="text-xs font-semibold text-slate-400">Feedback Guru</p>
                  <p className="whitespace-pre-wrap text-sm text-slate-700 mt-1">{testAnswerDoc.feedback_guru}</p>
                </div>
              )}
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!startedAt) {
    return (
      <DashboardLayout items={navItems} role="siswa">
        <div className="space-y-6">
          <button
            onClick={() => navigate(`/siswa/kegiatan/${kegiatanId}`)}
            className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-brand-green"
          >
            <ArrowLeft className="h-4 w-4" /> Kembali
          </button>

          <div className="card text-center py-12">
            <div className="mx-auto w-20 h-20 rounded-full bg-brand-green-light flex items-center justify-center mb-4">
              <FileText className="h-10 w-10 text-brand-green" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800">
              {mode === 'pretest' ? 'Pretest' : 'Posttest'}
            </h2>
            <p className="text-slate-500 mt-2 max-w-md mx-auto">
              {mode === 'pretest'
                ? 'Kerjakan pretest sebelum memulai kegiatan untuk mengukur pemahaman awalmu.'
                : 'Kerjakan posttest setelah menyelesaikan kegiatan untuk mengukur pemahamanmu.'}
            </p>
            <p className="text-sm text-slate-500 mt-2">
              Jumlah soal: <strong>{questions.length}</strong> • Waktu: <strong>30 menit</strong>
            </p>
            <button onClick={startTest} className="btn-primary mt-6">
              Mulai {mode === 'pretest' ? 'Pretest' : 'Posttest'}
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const progress = getProgress();
  const currentQuestion = questions[currentIndex];

  return (
    <DashboardLayout items={navItems} role="siswa">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <button
              onClick={() => navigate(`/siswa/kegiatan/${kegiatanId}`)}
              className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-brand-green"
            >
              <ArrowLeft className="h-4 w-4" /> Kembali
            </button>
            <h1 className="text-2xl font-bold text-slate-800 mt-2">
              {mode === 'pretest' ? 'Pretest' : 'Posttest'} - {kegiatan?.subjudul}
            </h1>
          </div>
          <Badge color="teal" className="text-base px-4 py-2">
            <Clock className="h-4 w-4" /> Soal {currentIndex + 1}/{questions.length}
          </Badge>
        </div>

        {/* Progress */}
        <div className="card">
          <div className="flex justify-between text-sm text-slate-600 mb-2">
            <span>Progress</span>
            <span>{progress.answered}/{progress.total} terjawab</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-brand-green transition-all"
              style={{ width: `${(progress.answered / progress.total) * 100}%` }}
            />
          </div>
        </div>

        {/* Question */}
        <div className="card">
          <div className="mb-4 flex items-center gap-2">
            <Badge color={currentQuestion.question_type === 'pilihan_ganda' ? 'blue' : 'purple'}>
              {currentQuestion.question_type === 'pilihan_ganda' ? 'Pilihan Ganda' : 'Essay'}
            </Badge>
            <Badge color="slate">Poin: {currentQuestion.points}</Badge>
          </div>

          <p className="text-lg font-medium text-slate-800 mb-4">
            {currentIndex + 1}. {currentQuestion.question_text}
          </p>

          {currentQuestion.question_type === 'pilihan_ganda' && currentQuestion.options && (
            <div className="space-y-2">
              {currentQuestion.options.map((opt) => (
                <label
                  key={opt.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition ${
                    answers[currentQuestion.id] === opt.id
                      ? 'border-brand-green bg-brand-green-light'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name={currentQuestion.id}
                    value={opt.id}
                    checked={answers[currentQuestion.id] === opt.id}
                    onChange={() => handleAnswer(currentQuestion.id, opt.id)}
                    className="radio"
                  />
                  <span className="text-sm text-slate-700">{opt.text}</span>
                </label>
              ))}
            </div>
          )}

          {currentQuestion.question_type === 'essay' && (
            <textarea
              className="input-base w-full"
              rows={5}
              value={(answers[currentQuestion.id] as string) || ''}
              onChange={(e) => handleAnswer(currentQuestion.id, e.target.value)}
              placeholder="Tulis jawabanmu di sini..."
            />
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
            disabled={currentIndex === 0}
            className="btn-ghost disabled:opacity-40"
          >
            <ArrowLeft className="h-4 w-4" /> Sebelumnya
          </button>

          <div className="flex gap-2">
            {currentIndex < questions.length - 1 ? (
              <button
                onClick={() => setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1))}
                className="btn-primary"
              >
                Selanjutnya <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button onClick={handleSubmit} className="btn-success">
                <Send className="h-4 w-4" /> Kumpulkan
              </button>
            )}
          </div>
        </div>

        {/* Question Navigator */}
        <div className="flex flex-wrap gap-2 justify-center">
          {questions.map((q, idx) => (
            <button
              key={q.id}
              onClick={() => setCurrentIndex(idx)}
              className={`w-9 h-9 rounded-lg text-sm font-medium transition ${
                idx === currentIndex
                  ? 'bg-brand-green text-white'
                  : answers[q.id]
                  ? 'bg-brand-green-light text-brand-green-dark border border-brand-green'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {idx + 1}
            </button>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}