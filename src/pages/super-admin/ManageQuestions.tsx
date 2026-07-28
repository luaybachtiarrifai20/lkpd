import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  updateDoc,
  addDoc,
  orderBy,
} from "firebase/firestore";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { KEGIATAN_CONTENT } from "@/content/kegiatanContent";
import { EmptyState, Badge } from "@/components/ui";
import {
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  ChevronDown,
  ChevronRight,
  FileText,
  CheckCircle2,
  Circle,
  Type,
  List,
  Eye,
  LayoutDashboard,
  Clock,
  Users,
  BookOpen,
  Activity,
  Shield,
} from "lucide-react";
import type { Question, QuestionOption, QuestionType } from "@/lib/firebase";

// Type untuk data soal yang dikirim dari modal (tanpa kegiatan_id)
type QuestionInput = Omit<
  Question,
  "id" | "created_at" | "updated_at" | "kegiatan_id"
>;

const navItems = [
  {
    to: "/super-admin/dashboard",
    label: "Dashboard",
    icon: <LayoutDashboard className="h-5 w-5" />,
  },
  {
    to: "/super-admin/pending",
    label: "Menunggu",
    icon: <Clock className="h-5 w-5" />,
  },
  {
    to: "/super-admin/profiles",
    label: "Profiles",
    icon: <Users className="h-5 w-5" />,
  },
  {
    to: "/super-admin/kelas",
    label: "Kelas",
    icon: <BookOpen className="h-5 w-5" />,
  },
  {
    to: "/super-admin/jawaban",
    label: "Jawaban",
    icon: <FileText className="h-5 w-5" />,
  },
  {
    to: "/super-admin/kegiatan",
    label: "Kegiatan",
    icon: <Activity className="h-5 w-5" />,
  },
  {
    to: "/super-admin/admins",
    label: "Super Admins",
    icon: <Shield className="h-5 w-5" />,
  },
  {
    to: "/super-admin/questions",
    label: "Kelola Soal",
    icon: <FileText className="h-5 w-5" />,
  },
];

export function ManageQuestions() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [selectedKegiatan, setSelectedKegiatan] = useState<number | null>(null);
  const [selectedTestType, setSelectedTestType] = useState<
    "pretest" | "posttest"
  >("pretest");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (profile?.role !== "super_admin") return;
    loadQuestions();
  }, [selectedKegiatan, selectedTestType, profile]);

  // ManageQuestions.tsx - loadQuestions tanpa orderBy

  const loadQuestions = async () => {
    if (!selectedKegiatan) {
      setQuestions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const kegiatanId = `kegiatan-${selectedKegiatan}`;
      // Hapus orderBy untuk sementara
      const q = query(
        collection(db, "questions"),
        where("kegiatan_id", "==", kegiatanId),
        where("test_type", "==", selectedTestType),
        // orderBy('order', 'asc') - DIHAPUS SEMENTARA
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() }) as Question,
      );

      // Sort di client-side
      data.sort((a, b) => (a.order || 0) - (b.order || 0));
      setQuestions(data);
    } catch (err) {
      console.error("Load questions error:", err);
      toast("Gagal memuat soal", "error");
    } finally {
      setLoading(false);
    }
  };

  // Perbaiki: menerima QuestionInput (tanpa kegiatan_id)
  const handleSaveQuestion = async (questionData: QuestionInput) => {
    try {
      const kegiatanId = `kegiatan-${selectedKegiatan}`;

      // Tambahkan kegiatan_id di sini
      const payload = {
        ...questionData,
        kegiatan_id: kegiatanId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      if (editingQuestion) {
        await updateDoc(doc(db, "questions", editingQuestion.id), {
          ...payload,
          updated_at: new Date().toISOString(),
        });
        toast("Soal berhasil diperbarui", "success");
      } else {
        await addDoc(collection(db, "questions"), payload);
        toast("Soal berhasil ditambahkan", "success");
      }

      setIsModalOpen(false);
      setEditingQuestion(null);
      loadQuestions();
    } catch (err) {
      console.error("Save question error:", err);
      toast("Gagal menyimpan soal", "error");
    }
  };

  const handleDeleteQuestion = async (id: string) => {
    if (!confirm("Yakin ingin menghapus soal ini?")) return;
    try {
      await deleteDoc(doc(db, "questions", id));
      toast("Soal berhasil dihapus", "success");
      loadQuestions();
    } catch (err) {
      console.error("Delete question error:", err);
      toast("Gagal menghapus soal", "error");
    }
  };

  return (
    <DashboardLayout items={navItems} role="super_admin">
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              Kelola Soal Uji Pemahaman
            </h1>
            <p className="text-sm text-slate-500">
              Buat dan kelola soal pretest dan posttest per kegiatan
            </p>
          </div>
        </div>

        {/* Filter */}
        <div className="card flex flex-wrap items-end gap-3">
          <div>
            <label className="label-base">Pilih Kegiatan</label>
            <select
              className="input-base min-w-[180px]"
              value={selectedKegiatan || ""}
              onChange={(e) => setSelectedKegiatan(Number(e.target.value))}>
              <option value="">— Pilih Kegiatan —</option>
              {KEGIATAN_CONTENT.map((k) => (
                <option key={k.nomor} value={k.nomor}>
                  Kegiatan {k.nomor} — {k.subjudul}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label-base">Tipe Test</label>
            <div className="flex gap-1 rounded-lg border border-slate-200 p-1">
              <button
                onClick={() => setSelectedTestType("pretest")}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                  selectedTestType === "pretest"
                    ? "bg-brand-green text-white"
                    : "text-slate-600 hover:bg-slate-50"
                }`}>
                Pretest
              </button>
              <button
                onClick={() => setSelectedTestType("posttest")}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                  selectedTestType === "posttest"
                    ? "bg-brand-teal text-white"
                    : "text-slate-600 hover:bg-slate-50"
                }`}>
                Posttest
              </button>
            </div>
          </div>
          <button
            onClick={() => {
              setEditingQuestion(null);
              setIsModalOpen(true);
            }}
            disabled={!selectedKegiatan}
            className="btn-primary ml-auto">
            <Plus className="h-4 w-4" /> Tambah Soal
          </button>
        </div>

        {/* Questions List */}
        {!selectedKegiatan ? (
          <EmptyState
            icon={<FileText className="h-7 w-7" />}
            title="Pilih kegiatan"
            description="Pilih kegiatan dan tipe test untuk mulai mengelola soal."
          />
        ) : loading ? (
          <div className="card animate-pulse h-40" />
        ) : questions.length === 0 ? (
          <EmptyState
            icon={<FileText className="h-7 w-7" />}
            title="Belum ada soal"
            description={`Belum ada soal untuk ${selectedTestType} kegiatan ini.`}
            action={
              <button
                onClick={() => {
                  setEditingQuestion(null);
                  setIsModalOpen(true);
                }}
                className="btn-primary">
                <Plus className="h-4 w-4" /> Tambah Soal Pertama
              </button>
            }
          />
        ) : (
          <div className="space-y-3">
            {questions.map((q, index) => (
              <QuestionCard
                key={q.id}
                question={q}
                index={index}
                onEdit={() => {
                  setEditingQuestion(q);
                  setIsModalOpen(true);
                }}
                onDelete={() => handleDeleteQuestion(q.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modal Tambah/Edit Soal */}
      {isModalOpen && (
        <QuestionModal
          question={editingQuestion}
          testType={selectedTestType}
          onSave={handleSaveQuestion}
          onClose={() => {
            setIsModalOpen(false);
            setEditingQuestion(null);
          }}
        />
      )}
    </DashboardLayout>
  );
}

// ============ Question Card Component ============
function QuestionCard({
  question,
  index,
  onEdit,
  onDelete,
}: {
  question: Question;
  index: number;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="card hover:shadow-float transition">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge
              color={
                question.question_type === "pilihan_ganda" ? "blue" : "purple"
              }>
              {question.question_type === "pilihan_ganda" ? (
                <List className="h-3 w-3" />
              ) : (
                <Type className="h-3 w-3" />
              )}
              {question.question_type === "pilihan_ganda"
                ? "Pilihan Ganda"
                : "Essay"}
            </Badge>
            <Badge color="slate">Skor: {question.points}</Badge>
          </div>
          <p className="mt-2 font-medium text-slate-800">
            {index + 1}. {question.question_text}
          </p>
          {question.options && expanded && (
            <div className="mt-3 space-y-1">
              {question.options.map((opt) => (
                <div key={opt.id} className="flex items-center gap-2 text-sm">
                  {opt.isCorrect ? (
                    <CheckCircle2 className="h-4 w-4 text-success" />
                  ) : (
                    <Circle className="h-4 w-4 text-slate-300" />
                  )}
                  <span
                    className={
                      opt.isCorrect
                        ? "font-medium text-success"
                        : "text-slate-600"
                    }>
                    {opt.text}
                  </span>
                </div>
              ))}
            </div>
          )}
          {question.correct_answer && expanded && (
            <p className="mt-2 text-sm text-success">
              <span className="font-medium">Kunci Jawaban:</span>{" "}
              {question.correct_answer}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg transition">
            {expanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
          <button
            onClick={onEdit}
            className="p-1.5 text-slate-400 hover:text-brand-green hover:bg-brand-green/10 rounded-lg transition">
            <Edit className="h-4 w-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 text-slate-400 hover:text-danger hover:bg-danger/10 rounded-lg transition">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ============ Question Modal Component ============
// Perbaiki type di sini
function QuestionModal({
  question,
  testType,
  onSave,
  onClose,
}: {
  question: Question | null;
  testType: "pretest" | "posttest";
  onSave: (data: QuestionInput) => void; // <-- Gunakan QuestionInput
  onClose: () => void;
}) {
  const [questionType, setQuestionType] = useState<QuestionType>(
    question?.question_type || "pilihan_ganda",
  );
  const [questionText, setQuestionText] = useState(
    question?.question_text || "",
  );
  const [options, setOptions] = useState<QuestionOption[]>(
    question?.options || [
      { id: "a", text: "", isCorrect: false },
      { id: "b", text: "", isCorrect: false },
      { id: "c", text: "", isCorrect: false },
      { id: "d", text: "", isCorrect: false },
    ],
  );
  const [correctAnswer, setCorrectAnswer] = useState(
    question?.correct_answer || "",
  );
  const [points, setPoints] = useState(question?.points || 10);

  // ManageQuestions.tsx - Perbaiki handleSubmit di QuestionModal

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!questionText.trim()) {
      alert("Teks soal wajib diisi");
      return;
    }

    if (questionType === "pilihan_ganda") {
      const hasCorrect = options.some((o) => o.isCorrect);
      if (!hasCorrect) {
        alert("Pilih minimal satu jawaban benar");
        return;
      }
      const hasEmpty = options.some((o) => !o.text.trim());
      if (hasEmpty) {
        alert("Semua opsi jawaban harus diisi");
        return;
      }
    } else {
      if (!correctAnswer.trim()) {
        alert("Kunci jawaban wajib diisi");
        return;
      }
    }

    // === FIX: Hanya kirim options jika pilihan_ganda, kirim correct_answer jika essay ===
    const payload: QuestionInput = {
      test_type: testType,
      question_type: questionType,
      question_text: questionText.trim(),
      points,
      order: question?.order || 0,
    };

    // Tambahkan field sesuai tipe soal
    if (questionType === "pilihan_ganda") {
      payload.options = options; // options hanya untuk pilihan_ganda
    } else {
      payload.correct_answer = correctAnswer.trim(); // correct_answer hanya untuk essay
    }

    onSave(payload);
  };

  const updateOption = (
    id: string,
    field: "text" | "isCorrect",
    value: string | boolean,
  ) => {
    setOptions((prev) =>
      prev.map((opt) => {
        if (opt.id === id) {
          if (field === "isCorrect") {
            return { ...opt, isCorrect: value as boolean };
          }
          if (field === "text") {
            return { ...opt, text: value as string };
          }
          return opt;
        }
        if (field === "isCorrect" && value === true) {
          return { ...opt, isCorrect: false };
        }
        return opt;
      }),
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10">
          <h3 className="text-lg font-semibold text-slate-800">
            {question ? "Edit Soal" : "Tambah Soal"}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Tipe Soal */}
          <div>
            <label className="label-base">Tipe Soal</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setQuestionType("pilihan_ganda")}
                className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition ${
                  questionType === "pilihan_ganda"
                    ? "border-brand-green bg-brand-green-light text-brand-green-dark"
                    : "border-slate-200 text-slate-600 hover:border-slate-300"
                }`}>
                <List className="h-4 w-4 inline mr-2" />
                Pilihan Ganda
              </button>
              <button
                type="button"
                onClick={() => setQuestionType("essay")}
                className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition ${
                  questionType === "essay"
                    ? "border-purple-500 bg-purple-50 text-purple-700"
                    : "border-slate-200 text-slate-600 hover:border-slate-300"
                }`}>
                <Type className="h-4 w-4 inline mr-2" />
                Essay
              </button>
            </div>
          </div>

          {/* Teks Soal */}
          <div>
            <label className="label-base">Teks Soal</label>
            <textarea
              className="input-base"
              rows={3}
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              placeholder="Tulis pertanyaan di sini..."
              required
            />
          </div>

          {/* Opsi untuk Pilihan Ganda */}
          {questionType === "pilihan_ganda" && (
            <div>
              <label className="label-base">Opsi Jawaban</label>
              <div className="space-y-2">
                {options.map((opt) => (
                  <div key={opt.id} className="flex items-center gap-2">
                    <span className="w-8 text-sm font-semibold text-slate-500">
                      {opt.id.toUpperCase()}
                    </span>
                    <input
                      type="text"
                      className="input-base flex-1"
                      value={opt.text}
                      onChange={(e) =>
                        updateOption(opt.id, "text", e.target.value)
                      }
                      placeholder={`Opsi ${opt.id.toUpperCase()}`}
                    />
                    <label className="flex items-center gap-1.5 text-sm text-slate-600">
                      <input
                        type="radio"
                        name="correct_option"
                        checked={opt.isCorrect}
                        onChange={() => updateOption(opt.id, "isCorrect", true)}
                      />
                      Benar
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Kunci Jawaban untuk Essay */}
          {questionType === "essay" && (
            <div>
              <label className="label-base">Kunci Jawaban</label>
              <textarea
                className="input-base"
                rows={2}
                value={correctAnswer}
                onChange={(e) => setCorrectAnswer(e.target.value)}
                placeholder="Tulis kunci jawaban..."
                required
              />
            </div>
          )}

          {/* Poin */}
          <div>
            <label className="label-base">Poin</label>
            <input
              type="number"
              className="input-base max-w-[120px]"
              value={points}
              onChange={(e) => setPoints(Number(e.target.value))}
              min={1}
              max={100}
              required
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
            <button type="button" onClick={onClose} className="btn-ghost">
              Batal
            </button>
            <button type="submit" className="btn-primary">
              <Save className="h-4 w-4" /> {question ? "Perbarui" : "Simpan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
