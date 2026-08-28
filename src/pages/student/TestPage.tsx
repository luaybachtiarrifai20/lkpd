// components/Student/TestPage.tsx
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { db } from '@/lib/firebase';
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
import { Badge, EmptyState, MoleculeField } from '@/components/ui';
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
  Plus,
  Trash2,
  FlaskConical,
  Atom,
  Microscope,
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
  const [kegiatanRef, setKegiatanRef] = useState<string>(
    `kegiatan-${kegiatanId}`,
  );

  // Support both numeric `nomor` (e.g. "2") and slug form (e.g. "kegiatan-2")
  const parsedNomor = kegiatanId
    ? Number(String(kegiatanId).replace(/^kegiatan-/, ''))
    : NaN;
  const kegiatan = KEGIATAN_CONTENT.find((k) => k.nomor === parsedNomor);
  console.debug('[TestPage] kegiatan lookup:', { kegiatanId, parsedNomor, kegiatan: kegiatan?.nomor });

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
      // Resolve the actual kegiatan doc id by `nomor` (robust to random/auto ids)
      let kegDocId: string | null = null;
      if (!isNaN(parsedNomor)) {
        try {
          const kegSnap = await getDocs(
            query(collection(db, 'kegiatan'), where('nomor', '==', parsedNomor)),
          );
          if (!kegSnap.empty) kegDocId = kegSnap.docs[0].id;
        } catch (err) {
          console.error('Resolve kegiatan error:', err);
        }
      }

      console.debug('[TestPage] loadQuestions params:', { rawKegiatanId: kegiatanId, mode, parsedNomor, kegDocId });

      // Primary candidate = actual kegiatan doc id; legacy fallbacks below.
      const candidates: string[] = [];
      if (kegDocId) candidates.push(kegDocId);
      candidates.push(`kegiatan-${parsedNomor}`);
      candidates.push(String(parsedNomor));
      const unique = Array.from(new Set(candidates));

      console.debug('[TestPage] loadQuestions candidates for kegiatan_id:', unique);

      let data: Question[] = [];
      // Query by the real doc id first (avoids collisions between kegiatan)
      if (kegDocId) {
        const q = query(
          collection(db, 'questions'),
          where('kegiatan_id', '==', kegDocId),
          where('test_type', '==', mode),
        );
        const snapshot = await getDocs(q);
        data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Question);
        console.debug('[TestPage] primary (doc id) questions:', snapshot.size);
      }

      // Fallback to legacy convention only if the doc id query returned nothing
      if (data.length === 0) {
        const q = query(
          collection(db, 'questions'),
          where('kegiatan_id', 'in', unique),
          where('test_type', '==', mode),
        );
        const snapshot = await getDocs(q);
        data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Question);
        console.debug('[TestPage] fallback questions snapshot.size:', snapshot.size, 'docs:', snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
      }

      setQuestions(data);
      // Use the kegiatan_id from the questions themselves (source of truth)
      const resolvedKegId = (data.length > 0 && data[0].kegiatan_id) || kegDocId || unique[0] || '';
      setKegiatanRef(resolvedKegId);
      console.debug('[TestPage] resolved kegiatan_id:', resolvedKegId, {
        candidates: unique,
        firstQuestionKegId: data[0]?.kegiatan_id,
      });

      // Check if already submitted
      const answerSnapshot = await getDocs(
        query(
          collection(db, 'test_answers'),
          where('siswa_id', '==', profile?.id || ''),
          where('kegiatan_id', '==', resolvedKegId),
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
      const kegId = questions[0]?.kegiatan_id || kegiatanRef || (kegiatanId && kegiatanId.startsWith('kegiatan-') ? kegiatanId : `kegiatan-${kegiatanId}`);

      // Check if already started
      const existing = await getDocs(
        query(
          collection(db, 'test_answers'),
          where('siswa_id', '==', profile.id),
          where('kegiatan_id', '==', kegId),
          where('test_type', '==', mode)
        )
      );

      if (existing.empty) {
        const docRef = await addDoc(collection(db, 'test_answers'), {
          siswa_id: profile.id,
          kegiatan_id: kegId,
          test_type: mode,
          answers: {},
          score: null,
          started_at: now,
          submitted_at: null,
          completed: false,
        });
        console.debug('[TestPage] created test_answers', docRef.id, { siswa_id: profile.id, kegiatan_id: kegId, test_type: mode });
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

  // Essay answers are stored as string[] so students can add/remove columns.
  const getEssayAnswers = (questionId: string): string[] => {
    const val = answers[questionId];
    if (Array.isArray(val)) return val;
    if (typeof val === 'string' && val !== '') return [val];
    return [''];
  };

  const updateEssayColumn = (questionId: string, index: number, value: string) => {
    const cols = getEssayAnswers(questionId);
    const next = [...cols];
    next[index] = value;
    handleAnswer(questionId, next);
  };

  const addEssayColumn = (questionId: string) => {
    const cols = getEssayAnswers(questionId);
    handleAnswer(questionId, [...cols, '']);
  };

  const removeEssayColumn = (questionId: string, index: number) => {
    const cols = getEssayAnswers(questionId);
    if (cols.length <= 1) return;
    handleAnswer(questionId, cols.filter((_, i) => i !== index));
  };

  const isAnswered = (q: Question): boolean => {
    const val = answers[q.id];
    if (Array.isArray(val)) return val.some((v) => v && String(v).trim() !== '');
    return typeof val === 'string' && val.trim() !== '';
  };

  const handleSubmit = async () => {
    if (!profile || !kegiatanId) return;

    // Check if all questions answered
    const unanswered = questions.filter((q) => !isAnswered(q));
    if (unanswered.length > 0) {
      if (!confirm(`Masih ada ${unanswered.length} soal yang belum dijawab. Yakin ingin mengumpulkan?`)) {
        return;
      }
    }

    if (!confirm('Yakin ingin mengumpulkan jawaban? Tindakan ini tidak dapat dibatalkan.')) {
      return;
    }

    try {
      const kegId = questions[0]?.kegiatan_id || kegiatanRef || (kegiatanId && kegiatanId.startsWith('kegiatan-') ? kegiatanId : `kegiatan-${kegiatanId}`);
      const answerSnapshot = await getDocs(
        query(
          collection(db, 'test_answers'),
          where('siswa_id', '==', profile?.id),
          where('kegiatan_id', '==', kegId),
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
      }

      setSubmitted(true);
      toast('Test berhasil dikumpulkan!', 'success');
    } catch (err) {
      console.error('Submit test error:', err);
      toast('Gagal mengumpulkan test', 'error');
    }
  };

  const getProgress = () => {
    const answered = questions.filter(isAnswered).length;
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
        <div className="relative min-h-[calc(100vh-140px)] overflow-hidden rounded-3xl bg-slate-50/40 p-4 sm:p-6 md:p-8 border border-slate-100/80 shadow-soft">
          <MoleculeField className="opacity-70" />
          {/* Soft Ambient background glows */}
          <div className="absolute top-10 left-10 w-72 h-72 bg-brand-green-light/35 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-20 right-20 w-80 h-80 bg-brand-teal-light/40 rounded-full blur-3xl pointer-events-none" />
          {/* Dotted sains grid pattern */}
          <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:20px_20px] opacity-40 pointer-events-none" />
          
          {/* Floating Science Doodles */}
          <div className="absolute -left-2 top-32 hidden xl:block text-brand-green/10 animate-float-slow pointer-events-none">
            <FlaskConical className="h-16 w-16" />
          </div>
          <div className="absolute -right-2 top-72 hidden xl:block text-brand-teal/15 animate-float-slower pointer-events-none">
            <Atom className="h-20 w-20" />
          </div>

          <div className="relative z-10 space-y-6">
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
        </div>
      </DashboardLayout>
    );
  }

  if (!startedAt) {
    return (
      <DashboardLayout items={navItems} role="siswa">
        <div className="relative min-h-[calc(100vh-140px)] overflow-hidden rounded-3xl bg-slate-50/40 p-4 sm:p-6 md:p-8 border border-slate-100/80 shadow-soft">
          {/* Soft Ambient background glows */}
          <div className="absolute top-10 left-10 w-72 h-72 bg-brand-green-light/35 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-20 right-20 w-80 h-80 bg-brand-teal-light/40 rounded-full blur-3xl pointer-events-none" />
          {/* Dotted sains grid pattern */}
          <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:20px_20px] opacity-40 pointer-events-none" />
          
          {/* Floating Science Doodles */}
          <div className="absolute -left-2 top-32 hidden xl:block text-brand-green/10 animate-float-slow pointer-events-none">
            <FlaskConical className="h-16 w-16" />
          </div>
          <div className="absolute -right-2 top-72 hidden xl:block text-brand-teal/15 animate-float-slower pointer-events-none">
            <Atom className="h-20 w-20" />
          </div>

          <div className="relative z-10 space-y-6">
            <button
              onClick={() => navigate(`/siswa/kegiatan/${kegiatanId}`)}
              className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-brand-green"
            >
              <ArrowLeft className="h-4 w-4" /> Kembali
            </button>

            <div className="card text-center py-12">
              <div className="mx-auto w-20 h-20 rounded-full bg-brand-green-light flex items-center justify-center mb-4">
                <FlaskConical className="h-10 w-10 text-brand-green" />
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
        </div>
      </DashboardLayout>
    );
  }

  const progress = getProgress();
  const currentQuestion = questions[currentIndex];

  return (
    <DashboardLayout items={navItems} role="siswa">
      <div className="relative min-h-[calc(100vh-140px)] overflow-hidden rounded-3xl bg-slate-50/40 p-4 sm:p-6 md:p-8 border border-slate-100/80 shadow-soft">
        {/* Soft Ambient background glows */}
        <div className="absolute top-10 left-10 w-72 h-72 bg-brand-green-light/35 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-20 right-20 w-80 h-80 bg-brand-teal-light/40 rounded-full blur-3xl pointer-events-none" />
        {/* Dotted sains grid pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:20px_20px] opacity-40 pointer-events-none" />
        
        {/* Floating Science Doodles */}
        <div className="absolute -left-2 top-32 hidden xl:block text-brand-green/10 animate-float-slow pointer-events-none">
          <FlaskConical className="h-16 w-16" />
        </div>
        <div className="absolute -right-2 top-72 hidden xl:block text-brand-teal/15 animate-float-slower pointer-events-none">
          <Atom className="h-20 w-20" />
        </div>

        <div className="relative z-10 space-y-6">
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
              <div className="space-y-3">
                {getEssayAnswers(currentQuestion.id).map((col, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <div className="flex-1">
                      <label className="mb-1 block text-xs font-semibold text-slate-500">
                        Jawaban {idx + 1}
                      </label>
                      <textarea
                        className="input-base w-full"
                        rows={3}
                        value={col}
                        onChange={(e) => updateEssayColumn(currentQuestion.id, idx, e.target.value)}
                        placeholder={`Tulis jawaban ke-${idx + 1} di sini...`}
                      />
                    </div>
                    {getEssayAnswers(currentQuestion.id).length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeEssayColumn(currentQuestion.id, idx)}
                        className="mt-6 rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-500"
                        title="Hapus kolom jawaban"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => addEssayColumn(currentQuestion.id)}
                  className="btn-outline text-sm"
                >
                  <Plus className="h-4 w-4" /> Tambah Kolom Jawaban
                </button>
              </div>
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
      </div>
    </DashboardLayout>
  );
}