import React, { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Circle,
  Save,
  Send,
  BookOpen,
  Target,
  Atom,
  BarChart3,
  MessagesSquare,
  UploadCloud,
  ClipboardList,
  Microscope,
  AlertTriangle,
  Lock,
  FlaskConical,
  Pencil,
  X,
  Check,
  FileQuestion,
} from "lucide-react";
import {
  type KegiatanContent,
  type ContentBlock,
  type PBLStep,
} from "@/content/types";
import {
  type AnswerValue,
  type Jawaban,
  type UploadedFile,
} from "@/lib/firebase";
import { TextAnswer } from "./TextAnswer";
import { EditableTable } from "./EditableTable";
import { FileUpload } from "./FileUpload";
import { ArgumentationTAP } from "./ArgumentationTAP";
import { RadioCardSelector } from "./RadioCardSelector";
import { EAssessment } from "./EAssessment";
import { SDGBadgeChip, Badge } from "@/components/ui";
import { Link } from "react-router-dom";

const stepIcons = [
  <AlertTriangle className="h-4 w-4" />,
  <ClipboardList className="h-4 w-4" />,
  <Microscope className="h-4 w-4" />,
  <UploadCloud className="h-4 w-4" />,
  <MessagesSquare className="h-4 w-4" />,
];

export interface ActivityRendererProps {
  kegiatan: KegiatanContent;
  answers: Record<string, AnswerValue>;
  onUpdate: (key: string, val: AnswerValue) => void;
  status: Jawaban["status"] | "preview";
  savedAt: string | null;
  saving?: boolean;
  onSaveDraft?: () => void;
  onSubmit?: () => void;
  assessmentUrl?: string | null;
  assessmentJudul?: string | null;
  kuisDone?: boolean;
  onTandaiKuis?: (done: boolean) => void;
  /**
   * Mode Super Admin: konten bisa diedit per bagian (bukan JSON).
   * Perubahan dikirim lewat onContentChange.
   */
  editMode?: boolean;
  /** Dipanggil setiap konten kegiatan berubah (hanya jika editMode) */
  onContentChange?: (next: KegiatanContent) => void;
  /** Simpan konten ke database (tombol di action bar) */
  onSaveContent?: () => void;
  contentSaving?: boolean;
}

export function ActivityRenderer({
  kegiatan,
  answers,
  onUpdate,
  status,
  savedAt,
  saving = false,
  onSaveDraft,
  onSubmit,
  assessmentUrl,
  assessmentJudul,
  kuisDone = false,
  onTandaiKuis,
  editMode = false,
  onContentChange,
  onSaveContent,
  contentSaving = false,
}: ActivityRendererProps) {
  const [activeStep, setActiveStep] = useState(0);

  const readOnly =
    status === "terkumpul" || status === "dinilai" || status === "preview";

  const steps = kegiatan.steps || [];
  const current = steps[activeStep];

  const stepCompletion = steps.map((s) => {
    const keys = s.blocks.map((b) => blockKey(b)).filter(Boolean) as string[];
    return keys.some((k) => {
      const v = answers[k];
      if (v == null) return false;
      if (typeof v === "string") return v.trim().length > 0;
      if (Array.isArray(v)) return v.some((x) => String(x).trim());
      return true;
    });
  });
  const completedCount = stepCompletion.filter(Boolean).length;
  const totalSteps = steps.length > 0 ? steps.length + 1 : 1;
  const overallPct = Math.round(
    ((completedCount + (kuisDone ? 1 : 0)) / totalSteps) * 100,
  );

  /** Helper: patch field di root kegiatan */
  const patchRoot = <K extends keyof KegiatanContent>(
    key: K,
    value: KegiatanContent[K],
  ) => {
    if (!editMode || !onContentChange) return;
    onContentChange({ ...kegiatan, [key]: value });
  };

  /** Helper: patch step by index */
  const patchStep = (stepIndex: number, patch: Partial<PBLStep>) => {
    if (!editMode || !onContentChange) return;
    const nextSteps = steps.map((s, i) =>
      i === stepIndex ? { ...s, ...patch } : s,
    );
    onContentChange({ ...kegiatan, steps: nextSteps });
  };

  /** Helper: patch block di dalam step */
  const patchBlock = (
    stepIndex: number,
    blockIndex: number,
    patch: Partial<ContentBlock> & Record<string, unknown>,
  ) => {
    if (!editMode || !onContentChange) return;
    const nextSteps = steps.map((s, si) => {
      if (si !== stepIndex) return s;
      const nextBlocks = s.blocks.map((b, bi) => {
        if (bi !== blockIndex) return b;
        return { ...b, ...patch } as ContentBlock;
      });
      return { ...s, blocks: nextBlocks };
    });
    onContentChange({ ...kegiatan, steps: nextSteps });
  };

  return (
    <div className="space-y-5">
      {/* Header banner */}
      <div
        className="overflow-hidden rounded-2xl shadow-soft"
        style={{ backgroundColor: kegiatan.warna }}>
        <div className="px-5 py-6 sm:px-7">
          <div className="flex flex-wrap items-start justify-between gap-3 text-white">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-white/70">
                Kegiatan {kegiatan.nomor}
              </p>
              {editMode ? (
                <div className="mt-2 space-y-2">
                  <AdminTextInput
                    label="Judul"
                    value={kegiatan.judul || ""}
                    onChange={(v) => patchRoot("judul", v)}
                    light
                  />
                  <AdminTextInput
                    label="Subjudul"
                    value={kegiatan.subjudul || ""}
                    onChange={(v) => patchRoot("subjudul", v)}
                    light
                  />
                  <AdminTextInput
                    label="Warna tema (hex)"
                    value={kegiatan.warna || ""}
                    onChange={(v) => patchRoot("warna", v)}
                    light
                  />
                </div>
              ) : (
                <>
                  <h1
                    className="mt-1 text-2xl font-extrabold sm:text-3xl"
                    style={{ color: "white" }}>
                    {kegiatan.judul?.replace(/^Kegiatan \d+\s*[—-]\s*/, "")}
                  </h1>
                  <p className="mt-1 text-sm text-white/85">
                    {kegiatan.subjudul}
                  </p>
                </>
              )}
              <div className="mt-3 flex flex-wrap gap-1.5">
                {kegiatan.sdg?.map((s) => (
                  <SDGBadgeChip key={s.nomor} sdg={s} />
                ))}
              </div>
            </div>
            {readOnly && status !== "preview" && (
              <span className="badge bg-white/20 text-white">
                <Lock className="h-3.5 w-3.5" />{" "}
                {status === "dinilai" ? "Dinilai" : "Terkumpul"}
              </span>
            )}
            {status === "preview" && !editMode && (
              <span className="badge bg-white/20 text-white">
                <Lock className="h-3.5 w-3.5" /> Preview
              </span>
            )}
            {editMode && (
              <span className="badge bg-white/20 text-white">
                <Pencil className="h-3.5 w-3.5" /> Mode Edit
              </span>
            )}
          </div>
          {!editMode && (
            <div className="mt-4 max-w-md">
              <div className="mb-1 flex justify-between text-xs text-white/80">
                <span>Progres kegiatan</span>
                <span>{overallPct}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/25">
                <div
                  className="h-full rounded-full bg-white transition-all"
                  style={{ width: `${overallPct}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Materi & Tujuan accordion */}
      <details className="card group" open={editMode || undefined}>
        <summary className="flex cursor-pointer items-center justify-between list-none">
          <span className="flex items-center gap-2 font-bold text-slate-800">
            <BookOpen className="h-5 w-5 text-brand-green" /> Materi & Tujuan
            Pembelajaran
          </span>
          <span className="text-slate-400 group-open:rotate-180 transition">
            ▾
          </span>
        </summary>
        <div className="mt-4 space-y-4">
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Cakupan Materi
            </p>
            {editMode ? (
              <AdminTextArea
                label="Cakupan (pisahkan dengan koma)"
                value={(kegiatan.cakupanMateri || []).join(", ")}
                onChange={(v) =>
                  patchRoot(
                    "cakupanMateri",
                    v
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  )
                }
              />
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {kegiatan.cakupanMateri?.map((m) => (
                  <span key={m} className="chip">
                    {m}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div>
            <p className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-slate-700">
              <Target className="h-4 w-4 text-brand-teal" /> Tujuan Pembelajaran
            </p>
            {editMode ? (
              <AdminTextArea
                label="Tujuan (satu baris = satu tujuan)"
                value={(kegiatan.tujuan || []).join("\n")}
                onChange={(v) =>
                  patchRoot(
                    "tujuan",
                    v
                      .split("\n")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  )
                }
                rows={5}
              />
            ) : (
              <ol className="ml-6 list-decimal space-y-1 text-sm text-slate-600">
                {kegiatan.tujuan?.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ol>
            )}
          </div>
          <div>
            <p className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-slate-700">
              <FlaskConical className="h-4 w-4 text-brand-green" /> Materi
              Singkat
            </p>
            {editMode ? (
              <AdminTextArea
                label="Materi"
                value={kegiatan.materi || ""}
                onChange={(v) => patchRoot("materi", v)}
                rows={6}
              />
            ) : (
              <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                {kegiatan.materi}
              </p>
            )}
          </div>
        </div>
      </details>

      <div className="grid gap-5 lg:grid-cols-[260px_1fr]">
        {/* Sidebar stepper */}
        <aside className="lg:sticky lg:top-[80px] lg:self-start">
          <div className="card-tight">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Sintaks PBL
            </p>
            <ol className="space-y-1">
              {steps.map((s, i) => {
                const done = stepCompletion[i];
                const active = i === activeStep;
                return (
                  <li key={s.id || i}>
                    <button
                      type="button"
                      onClick={() => setActiveStep(i)}
                      className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm transition ${
                        active
                          ? "bg-brand-green-light text-brand-green-dark font-semibold"
                          : "text-slate-600 hover:bg-slate-50"
                      }`}>
                      <span
                        className={`shrink-0 ${done ? "text-success" : "text-slate-300"}`}>
                        {done ? (
                          <CheckCircle2 className="h-5 w-5" />
                        ) : (
                          <Circle className="h-5 w-5" />
                        )}
                      </span>
                      <span className="flex-1">
                        <span className="block text-[11px] font-semibold text-slate-400">
                          Sintaks {s.sintaks}
                        </span>
                        <span className="block leading-tight">{s.label}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
              {steps.length > 0 && !editMode && (
                <li>
                  <button
                    type="button"
                    onClick={() => setActiveStep(steps.length)}
                    className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm transition ${
                      activeStep === steps.length
                        ? "bg-brand-green-light text-brand-green-dark font-semibold"
                        : "text-slate-600 hover:bg-slate-50"
                    }`}>
                    <span
                      className={`shrink-0 ${kuisDone ? "text-success" : "text-slate-300"}`}>
                      {kuisDone ? (
                        <CheckCircle2 className="h-5 w-5" />
                      ) : (
                        <Circle className="h-5 w-5" />
                      )}
                    </span>
                    <span className="flex-1">
                      <span className="block text-[11px] font-semibold text-slate-400">
                        E-Assessment
                      </span>
                      <span className="block leading-tight">
                        Uji Pemahamanmu
                      </span>
                    </span>
                  </button>
                </li>
              )}
            </ol>
          </div>
        </aside>

        {/* Main step content */}
        <div className="min-w-0">
          {activeStep < steps.length ? (
            <StepContent
              step={current}
              stepIndex={activeStep}
              kegiatan={kegiatan}
              answers={answers}
              onUpdate={onUpdate}
              readOnly={readOnly}
              savedAt={savedAt}
              editMode={editMode}
              onPatchStep={patchStep}
              onPatchBlock={patchBlock}
            />
          ) : steps.length > 0 ? (
            <div className="card animate-fade-in">
              <div
                className="banner mb-4"
                style={{ backgroundColor: kegiatan.warna }}>
                <BarChart3 className="h-5 w-5" /> E-Assessment — Uji Pemahamanmu
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                <Link
                  to={`/siswa/test/${kegiatan.nomor}/pretest`}
                  className="btn-outline text-sm">
                  <FileQuestion className="h-4 w-4" /> Kerjakan Pretest
                </Link>
                <Link
                  to={`/siswa/test/${kegiatan.nomor}/posttest`}
                  className="btn-outline text-sm">
                  <FileQuestion className="h-4 w-4" /> Kerjakan Posttest
                </Link>
              </div>
            </div>
          ) : (
            <div className="card text-center py-12 text-slate-500">
              Belum ada steps kegiatan
            </div>
          )}

          {/* Step nav */}
          {steps.length > 0 && (
            <div className="mt-5 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setActiveStep((s) => Math.max(0, s - 1))}
                disabled={activeStep === 0}
                className="btn-ghost disabled:opacity-40">
                <ArrowLeft className="h-4 w-4" /> Sebelumnya
              </button>
              {activeStep < steps.length ? (
                <button
                  type="button"
                  onClick={() =>
                    setActiveStep((s) => Math.min(steps.length, s + 1))
                  }
                  className="btn-outline">
                  Berikutnya <ArrowRight className="h-4 w-4" />
                </button>
              ) : (
                <span className="text-xs text-slate-400">Tahap akhir</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Action bar */}
      <div className="sticky bottom-4 z-30 flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-white/95 px-4 py-3 shadow-float backdrop-blur">
        {editMode ? (
          <>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Pencil className="h-3.5 w-3.5 text-purple-500" />
              Edit konten per bagian — perubahan lokal sampai Anda simpan
            </div>
            <div className="flex gap-2">
              {onSaveContent && (
                <button
                  type="button"
                  onClick={onSaveContent}
                  disabled={contentSaving}
                  className="btn-primary">
                  {contentSaving ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Simpan Konten
                </button>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              {saving ? (
                <span className="inline-flex items-center gap-1">
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-brand-green border-t-transparent" />{" "}
                  Menyimpan…
                </span>
              ) : savedAt ? (
                <span className="inline-flex items-center gap-1 text-success">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Tersimpan otomatis
                </span>
              ) : (
                <span>Belum disimpan</span>
              )}
              {readOnly && status !== "preview" && (
                <Badge color="slate">
                  <Lock className="h-3 w-3" /> {status}
                </Badge>
              )}
            </div>
            <div className="flex gap-2">
              {onSaveDraft && (
                <button
                  onClick={onSaveDraft}
                  disabled={readOnly}
                  className="btn-outline">
                  <Save className="h-4 w-4" /> Simpan Draft
                </button>
              )}
              {!readOnly && onSubmit ? (
                <button onClick={onSubmit} className="btn-primary">
                  <Send className="h-4 w-4" /> Kumpulkan Jawaban
                </button>
              ) : status !== "preview" ? (
                <span className="text-xs text-slate-400">
                  Jawaban terkumpul — menunggu penilaian guru
                </span>
              ) : (
                <span className="text-xs text-slate-400">Mode Preview</span>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ========== Step content ========== */

function StepContent({
  step,
  stepIndex,
  kegiatan,
  answers,
  onUpdate,
  readOnly,
  savedAt,
  editMode,
  onPatchStep,
  onPatchBlock,
}: {
  step: PBLStep;
  stepIndex: number;
  kegiatan: KegiatanContent;
  answers: Record<string, AnswerValue>;
  onUpdate: (key: string, val: AnswerValue) => void;
  readOnly: boolean;
  savedAt: string | null;
  editMode: boolean;
  onPatchStep: (stepIndex: number, patch: Partial<PBLStep>) => void;
  onPatchBlock: (
    stepIndex: number,
    blockIndex: number,
    patch: Partial<ContentBlock> & Record<string, unknown>,
  ) => void;
}) {
  return (
    <div className="animate-fade-in space-y-5">
      <div className="banner" style={{ backgroundColor: kegiatan.warna }}>
        {stepIcons[(step.sintaks || 1) - 1]} Sintaks PBL {step.sintaks} —{" "}
        {step.label}
      </div>

      {editMode ? (
        <div className="card space-y-3 border-purple-100 bg-purple-50/30">
          <p className="text-xs font-semibold uppercase tracking-wide text-purple-600">
            Edit sintaks ini
          </p>
          <AdminTextInput
            label="Label sintaks"
            value={step.label || ""}
            onChange={(v) => onPatchStep(stepIndex, { label: v })}
          />
          <AdminTextArea
            label="Ringkasan / deskripsi"
            value={step.ringkas || ""}
            onChange={(v) => onPatchStep(stepIndex, { ringkas: v })}
            rows={2}
          />
        </div>
      ) : (
        <p className="text-sm text-slate-500">{step.ringkas}</p>
      )}

      {step.blocks?.map((block, i) => (
        <BlockRenderer
          key={i}
          block={block}
          blockIndex={i}
          stepIndex={stepIndex}
          kegiatan={kegiatan}
          answers={answers}
          onUpdate={onUpdate}
          readOnly={readOnly}
          savedAt={savedAt}
          editMode={editMode}
          onPatchBlock={onPatchBlock}
        />
      ))}
    </div>
  );
}

function blockKey(b: ContentBlock): string | null {
  if ("id" in b) return b.id;
  return null;
}

function renderMedia(block: ContentBlock) {
  if ("mediaUrl" in block && block.mediaUrl) {
    if (block.mediaType === "youtube") {
      const getYoutubeId = (url: string) => {
        const match = url.match(
          /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?]+)/,
        );
        return match ? match[1] : null;
      };
      const videoId = getYoutubeId(block.mediaUrl);
      if (videoId) {
        return (
          <div className="mt-3 aspect-video rounded-xl overflow-hidden shadow-sm">
            <iframe
              width="100%"
              height="100%"
              src={`https://www.youtube.com/embed/${videoId}`}
              title="YouTube video player"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        );
      }
      return (
        <p className="mt-2 text-xs text-amber-600">
          URL YouTube tidak valid: {block.mediaUrl}
        </p>
      );
    } else if (block.mediaType === "image") {
      return (
        <div className="mt-3 rounded-xl overflow-hidden shadow-sm">
          <img
            src={block.mediaUrl}
            alt="Media"
            className="w-full h-auto object-cover"
          />
        </div>
      );
    }
  }
  return null;
}

/* ========== Admin field helpers ========== */

function AdminTextInput({
  label,
  value,
  onChange,
  light = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  light?: boolean;
}) {
  return (
    <label className="block">
      <span
        className={`mb-1 block text-[11px] font-semibold uppercase tracking-wide ${
          light ? "text-white/70" : "text-purple-600"
        }`}>
        {label}
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={
          light
            ? "w-full rounded-lg border border-white/30 bg-white/15 px-3 py-2 text-sm text-white placeholder:text-white/50 outline-none focus:border-white/60"
            : "input-base text-sm"
        }
      />
    </label>
  );
}

function AdminTextArea({
  label,
  value,
  onChange,
  rows = 3,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-purple-600">
        {label}
      </span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className="input-base text-sm"
      />
    </label>
  );
}

/** Panel edit media (YouTube / image) — selalu tampil di editMode */
function AdminMediaFields({
  block,
  onPatch,
}: {
  block: ContentBlock & {
    mediaUrl?: string;
    mediaType?: string;
    caption?: string;
    title?: string;
  };
  onPatch: (patch: Record<string, unknown>) => void;
}) {
  const mediaType = block.mediaType || "youtube";
  return (
    <div className="mt-3 space-y-2 rounded-xl border border-dashed border-purple-200 bg-purple-50/40 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-purple-600">
        Media (YouTube / Gambar)
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onPatch({ mediaType: "youtube" })}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
            mediaType === "youtube"
              ? "bg-purple-600 text-white"
              : "bg-white text-slate-600 border border-slate-200"
          }`}>
          YouTube
        </button>
        <button
          type="button"
          onClick={() => onPatch({ mediaType: "image" })}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
            mediaType === "image"
              ? "bg-purple-600 text-white"
              : "bg-white text-slate-600 border border-slate-200"
          }`}>
          Gambar
        </button>
        {block.mediaUrl && (
          <button
            type="button"
            onClick={() => onPatch({ mediaUrl: "", mediaType: undefined })}
            className="rounded-lg px-3 py-1.5 text-xs font-semibold text-red-600 bg-red-50">
            Hapus media
          </button>
        )}
      </div>
      <AdminTextInput
        label={mediaType === "image" ? "URL gambar" : "Link YouTube"}
        value={block.mediaUrl || ""}
        onChange={(v) =>
          onPatch({ mediaUrl: v, mediaType: mediaType || "youtube" })
        }
      />
      <AdminTextInput
        label="Caption (opsional)"
        value={block.caption || ""}
        onChange={(v) => onPatch({ caption: v })}
      />
      {block.mediaUrl &&
        renderMedia({
          ...block,
          mediaType: mediaType as "youtube" | "image",
        } as ContentBlock)}
    </div>
  );
}

// ActivityRenderer.tsx - Tambahkan di atas component atau di dalam file

// ActivityRenderer.tsx - Perbaiki renderRows function

function renderRows(rows: unknown) {
  console.log("renderRows called with:", rows);
  console.log("Type of rows:", typeof rows);
  console.log("Is array:", Array.isArray(rows));

  if (!rows) {
    console.log("Rows is null/undefined");
    return (
      <tr>
        <td
          colSpan={99}
          className="px-3 py-6 text-center text-sm text-slate-400">
          Tidak ada data
        </td>
      </tr>
    );
  }

  // Jika rows bukan array, coba konversi atau tampilkan error
  if (!Array.isArray(rows)) {
    console.error("Rows is not an array:", rows);

    // Coba cek apakah rows adalah object dengan properti tertentu
    if (typeof rows === "object" && rows !== null) {
      // Jika rows adalah object dengan keys numerik (seperti array-like object)
      const values = Object.values(rows);
      if (values.length > 0) {
        console.log("Converting object to array:", values);
        return renderRows(values);
      }
    }

    return (
      <tr>
        <td colSpan={99} className="px-3 py-6 text-center text-sm text-red-500">
          Error: Data tidak valid
        </td>
      </tr>
    );
  }

  if (rows.length === 0) {
    console.log("Rows is empty array");
    return (
      <tr>
        <td
          colSpan={99}
          className="px-3 py-6 text-center text-sm text-slate-400">
          Tidak ada data
        </td>
      </tr>
    );
  }

  try {
    // Cek struktur rows
    const firstRow = rows[0];
    console.log("First row:", firstRow);
    console.log("First row type:", typeof firstRow);

    // Kasus 1: rows adalah array of objects dengan properti 'cells'
    if (
      typeof firstRow === "object" &&
      firstRow !== null &&
      "cells" in firstRow
    ) {
      console.log("Rows has cells structure");
      return (rows as { cells: string[] }[]).map((row, index) => {
        // Pastikan row.cells adalah array
        if (!Array.isArray(row.cells)) {
          console.error("Row.cells is not an array:", row);
          return (
            <tr key={index} className={index % 2 ? "bg-slate-50/40" : ""}>
              <td colSpan={99} className="px-3 py-2.5 text-red-500">
                Error: cells bukan array
              </td>
            </tr>
          );
        }

        return (
          <tr key={index} className={index % 2 ? "bg-slate-50/40" : ""}>
            {row.cells.map((cell: string, c: number) => (
              <td
                key={c}
                className="px-3 py-2.5 text-slate-700 border-b border-slate-100">
                {cell || "-"}
              </td>
            ))}
          </tr>
        );
      });
    }

    // Kasus 2: rows adalah array of arrays (string[][])
    if (Array.isArray(firstRow)) {
      console.log("Rows is array of arrays");
      return (rows as string[][]).map((row, index) => {
        // Pastikan row adalah array
        if (!Array.isArray(row)) {
          console.error("Row is not an array:", row);
          return (
            <tr key={index} className={index % 2 ? "bg-slate-50/40" : ""}>
              <td colSpan={99} className="px-3 py-2.5 text-red-500">
                Error: row bukan array
              </td>
            </tr>
          );
        }

        return (
          <tr key={index} className={index % 2 ? "bg-slate-50/40" : ""}>
            {row.map((cell: string, c: number) => (
              <td
                key={c}
                className="px-3 py-2.5 text-slate-700 border-b border-slate-100">
                {cell || "-"}
              </td>
            ))}
          </tr>
        );
      });
    }

    // Kasus 3: rows adalah array of objects dengan properti lain
    if (typeof firstRow === "object" && firstRow !== null) {
      console.log("Rows is array of objects, trying to extract values");
      const keys = Object.keys(firstRow);
      console.log("Object keys:", keys);

      return (rows as Record<string, any>[]).map((row, index) => {
        // Coba ambil nilai dari object
        const values = keys.map((key) => row[key] ?? "-");
        return (
          <tr key={index} className={index % 2 ? "bg-slate-50/40" : ""}>
            {values.map((cell: any, c: number) => (
              <td
                key={c}
                className="px-3 py-2.5 text-slate-700 border-b border-slate-100">
                {String(cell) || "-"}
              </td>
            ))}
          </tr>
        );
      });
    }

    // Kasus 4: rows adalah array of primitive values
    console.log("Rows is array of primitives");
    return (
      <tr>
        <td colSpan={99} className="px-3 py-2.5 text-slate-700">
          {rows.join(", ")}
        </td>
      </tr>
    );
  } catch (error) {
    console.error("Error rendering rows:", error);
    return (
      <tr>
        <td colSpan={99} className="px-3 py-6 text-center text-sm text-red-500">
          Error rendering data: {String(error)}
        </td>
      </tr>
    );
  }
}

function BlockRenderer({
  block,
  blockIndex,
  stepIndex,
  kegiatan,
  answers,
  onUpdate,
  readOnly,
  savedAt,
  editMode,
  onPatchBlock,
}: {
  block: ContentBlock;
  blockIndex: number;
  stepIndex: number;
  kegiatan: KegiatanContent;
  answers: Record<string, AnswerValue>;
  onUpdate: (key: string, val: AnswerValue) => void;
  readOnly: boolean;
  savedAt: string | null;
  editMode: boolean;
  onPatchBlock: (
    stepIndex: number,
    blockIndex: number,
    patch: Partial<ContentBlock> & Record<string, unknown>,
  ) => void;
}) {
  const patch = (p: Record<string, unknown>) =>
    onPatchBlock(stepIndex, blockIndex, p);

  switch (block.kind) {
    case "media":
      return (
        <div className="card">
          {editMode ? (
            <>
              <AdminTextInput
                label="Judul media"
                value={block.title || ""}
                onChange={(v) => patch({ title: v })}
              />
              <AdminMediaFields block={block} onPatch={patch} />
            </>
          ) : (
            <>
              {block.title && (
                <p className="mb-2 text-sm font-semibold text-slate-700">
                  {block.title}
                </p>
              )}
              {renderMedia(block)}
              {block.caption && (
                <p className="mt-2 text-xs text-slate-500 text-center">
                  {block.caption}
                </p>
              )}
            </>
          )}
        </div>
      );

    case "stimulus":
      return (
        <div className="rounded-xl bg-slate-50 p-4">
          {editMode ? (
            <div className="space-y-2">
              <AdminTextInput
                label="Judul stimulus"
                value={block.title || ""}
                onChange={(v) => patch({ title: v })}
              />
              <AdminTextArea
                label="Isi stimulus"
                value={block.body || ""}
                onChange={(v) => patch({ body: v })}
                rows={4}
              />
              <AdminMediaFields
                block={block as ContentBlock & { mediaUrl?: string }}
                onPatch={patch}
              />
            </div>
          ) : (
            <>
              <p className="mb-1 text-sm font-semibold text-slate-700">
                {block.title}
              </p>
              <p className="text-sm leading-relaxed text-slate-600 whitespace-pre-wrap">
                {block.body}
              </p>
              {renderMedia(block)}
            </>
          )}
        </div>
      );

    case "masalah":
      return (
        <div className="rounded-xl bg-brand-amber-light p-4">
          {editMode ? (
            <div className="space-y-2">
              <AdminTextInput
                label="Judul masalah"
                value={block.title || ""}
                onChange={(v) => patch({ title: v })}
              />
              <AdminTextArea
                label="Isi masalah"
                value={block.body || ""}
                onChange={(v) => patch({ body: v })}
                rows={4}
              />
              <AdminMediaFields
                block={block as ContentBlock & { mediaUrl?: string }}
                onPatch={patch}
              />
            </div>
          ) : (
            <>
              <p className="mb-1 flex items-center gap-2 text-sm font-bold text-[#B26A00]">
                <AlertTriangle className="h-4 w-4" /> {block.title}
              </p>
              <p className="text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">
                {block.body}
              </p>
              {renderMedia(block)}
            </>
          )}
        </div>
      );

    case "pertanyaan":
      return (
        <div className="card">
          {editMode ? (
            <div className="space-y-2">
              <AdminTextArea
                label="Teks pertanyaan"
                value={block.text || ""}
                onChange={(v) => patch({ text: v })}
                rows={3}
              />
              <AdminTextInput
                label="Hint (opsional)"
                value={block.hint || ""}
                onChange={(v) => patch({ hint: v })}
              />
            </div>
          ) : (
            <>
              <p className="mb-2.5 text-sm font-medium text-slate-700">
                {block.text}
              </p>
              <TextAnswer
                id={block.id}
                value={(answers[block.id] as string) || ""}
                onChange={(v) => onUpdate(block.id, v)}
                disabled={readOnly}
                hint={block.hint}
                savedAt={savedAt}
              />
            </>
          )}
        </div>
      );

    case "tabel-org":
      return (
        <div className="space-y-4">
          {editMode ? (
            <div className="card space-y-2">
              <AdminTextInput
                label="Judul tabel"
                value={block.title || ""}
                onChange={(v) => patch({ title: v })}
              />
              <AdminTextInput
                label="Header kolom (pisah koma)"
                value={(block.headers || []).join(", ")}
                onChange={(v) =>
                  patch({
                    headers: v
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  })
                }
              />
              {block.perencanaanId && (
                <AdminTextArea
                  label="Teks perencanaan"
                  value={block.perencanaanText || ""}
                  onChange={(v) => patch({ perencanaanText: v })}
                />
              )}
            </div>
          ) : (
            <>
              <div className="card">
                <EditableTable
                  headers={block.headers}
                  title={block.title}
                  rows={
                    (answers[block.id] as { rows: string[][] })?.rows ||
                    Array.from({ length: block.rowCount }, () =>
                      block.headers.map(() => ""),
                    )
                  }
                  onChange={(rows) => onUpdate(block.id, { rows })}
                  disabled={readOnly}
                />
              </div>
              {block.perencanaanId && (
                <div className="card">
                  <p className="mb-2.5 text-sm font-medium text-slate-700">
                    {block.perencanaanText}
                  </p>
                  <TextAnswer
                    id={block.perencanaanId}
                    value={(answers[block.perencanaanId] as string) || ""}
                    onChange={(v) => onUpdate(block.perencanaanId!, v)}
                    disabled={readOnly}
                    rows={4}
                    savedAt={savedAt}
                  />
                </div>
              )}
            </>
          )}
        </div>
      );

    case "data-eksperimen":
      return (
        <div className="card">
          {editMode ? (
            <div className="space-y-2">
              <AdminTextInput
                label="Judul data"
                value={block.title || ""}
                onChange={(v) => patch({ title: v })}
              />
              <AdminTextArea
                label="Catatan"
                value={block.note || ""}
                onChange={(v) => patch({ note: v })}
              />
              <p className="text-xs text-slate-400">
                Isi tabel (headers/rows) saat ini diedit lewat seed / struktur
                data.
              </p>
            </div>
          ) : (
            <>
              <p className="mb-2 text-sm font-semibold text-slate-700">
                {block.title}
              </p>
              <div className="overflow-x-auto scrollbar-thin rounded-xl border border-slate-200">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50">
                      {block.headers.map((h: string) => (
                        <th
                          key={h}
                          className="whitespace-nowrap px-3 py-2.5 text-left font-semibold text-slate-700 border-b border-slate-200">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>{renderRows(block.rows)}</tbody>
                </table>
              </div>
              {block.note && (
                <p className="mt-2 text-xs text-slate-400">{block.note}</p>
              )}
            </>
          )}
        </div>
      );
    case "input-hitung":
      return (
        <div className="card space-y-3">
          {editMode ? (
            <div className="space-y-2">
              <AdminTextInput
                label="Label input"
                value={block.label || ""}
                onChange={(v) => patch({ label: v })}
              />
              <AdminTextInput
                label="Unit"
                value={block.unit || ""}
                onChange={(v) => patch({ unit: v })}
              />
            </div>
          ) : (
            <>
              <p className="text-sm font-medium text-slate-700">
                {block.label}
                {block.unit && (
                  <span className="ml-1 text-xs text-slate-400">
                    ({block.unit})
                  </span>
                )}
              </p>
              <input
                type="text"
                className="input-base"
                value={(answers[block.id] as string) || ""}
                disabled={readOnly}
                placeholder="Hasil perhitungan…"
                onChange={(e) => onUpdate(block.id, e.target.value)}
              />
              {block.allowImage && (
                <div>
                  <p className="mb-2 text-xs font-medium text-slate-500">
                    Unggah foto grafik/perhitungan tulis tangan (opsional)
                  </p>
                  <FileUpload
                    value={
                      (answers[`${block.id}_img`] as { files: UploadedFile[] })
                        ?.files || []
                    }
                    onChange={(files) => onUpdate(`${block.id}_img`, { files })}
                    disabled={readOnly}
                    pathPrefix={`kegiatan-${kegiatan.nomor}`}
                  />
                </div>
              )}
            </>
          )}
        </div>
      );

    case "diagram-submikro":
      return (
        <div className="card">
          {editMode ? (
            <div className="space-y-2">
              <AdminTextInput
                label="Judul diagram"
                value={block.title || ""}
                onChange={(v) => patch({ title: v })}
              />
              <AdminTextInput
                label="Label kiri"
                value={block.kiri?.label || ""}
                onChange={(v) => patch({ kiri: { ...block.kiri, label: v } })}
              />
              <AdminTextArea
                label="Deskripsi kiri"
                value={block.kiri?.deskripsi || ""}
                onChange={(v) =>
                  patch({ kiri: { ...block.kiri, deskripsi: v } })
                }
              />
              <AdminTextInput
                label="Label kanan"
                value={block.kanan?.label || ""}
                onChange={(v) => patch({ kanan: { ...block.kanan, label: v } })}
              />
              <AdminTextArea
                label="Deskripsi kanan"
                value={block.kanan?.deskripsi || ""}
                onChange={(v) =>
                  patch({ kanan: { ...block.kanan, deskripsi: v } })
                }
              />
            </div>
          ) : (
            <>
              <p className="mb-3 text-sm font-semibold text-slate-700">
                {block.title}
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <DiagramCol
                  label={block.kiri.label}
                  desc={block.kiri.deskripsi}
                  color="#37474F"
                />
                <DiagramCol
                  label={block.kanan.label}
                  desc={block.kanan.deskripsi}
                  color={kegiatan.warna}
                />
              </div>
              <div className="mt-3 flex items-center justify-center gap-2 text-slate-300">
                <ArrowRight className="hidden h-6 w-6 sm:block" />
              </div>
            </>
          )}
        </div>
      );

    case "analitis":
      return (
        <div className="card">
          {editMode ? (
            <AdminTextArea
              label="Teks pertanyaan analitis"
              value={block.text || ""}
              onChange={(v) => patch({ text: v })}
              rows={3}
            />
          ) : (
            <>
              <p className="mb-2.5 flex items-start gap-2 text-sm font-medium text-slate-700">
                <Microscope className="mt-0.5 h-4 w-4 shrink-0 text-brand-teal" />{" "}
                {block.text}
              </p>
              <TextAnswer
                id={block.id}
                value={(answers[block.id] as string) || ""}
                onChange={(v) => onUpdate(block.id, v)}
                disabled={readOnly}
                rows={4}
                savedAt={savedAt}
              />
              {block.allowImage && (
                <div className="mt-3">
                  <p className="mb-2 text-xs font-medium text-slate-500">
                    Unggah foto grafik/perhitungan tulis tangan (opsional)
                  </p>
                  <FileUpload
                    value={
                      (answers[`${block.id}_img`] as { files: UploadedFile[] })
                        ?.files || []
                    }
                    onChange={(files) => onUpdate(`${block.id}_img`, { files })}
                    disabled={readOnly}
                    pathPrefix={`kegiatan-${kegiatan.nomor}`}
                  />
                </div>
              )}
            </>
          )}
        </div>
      );

    case "instruksi-pengembangan":
      return (
        <div className="rounded-xl bg-brand-teal-light p-4">
          {editMode ? (
            <div className="space-y-2">
              <AdminTextInput
                label="Judul instruksi"
                value={block.title || ""}
                onChange={(v) => patch({ title: v })}
              />
              <AdminTextArea
                label="Isi instruksi"
                value={block.body || ""}
                onChange={(v) => patch({ body: v })}
              />
              <AdminTextArea
                label="Bullet points (satu baris = satu poin)"
                value={(block.bullets || []).join("\n")}
                onChange={(v) =>
                  patch({
                    bullets: v
                      .split("\n")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  })
                }
              />
            </div>
          ) : (
            <>
              <p className="mb-1 flex items-center gap-2 text-sm font-bold text-brand-teal-dark">
                <UploadCloud className="h-4 w-4" /> {block.title}
              </p>
              <p className="text-sm leading-relaxed text-slate-700">
                {block.body}
              </p>
              {block.bullets && (
                <ul className="mt-2 ml-6 list-disc space-y-1 text-sm text-slate-700">
                  {block.bullets.map((b, i) => (
                    <li key={i}>{b}</li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      );

    case "upload-hasil":
      return (
        <div className="card">
          {editMode ? (
            <div className="space-y-2">
              <AdminTextInput
                label="Judul upload"
                value={block.title || ""}
                onChange={(v) => patch({ title: v })}
              />
              <AdminTextArea
                label="Deskripsi"
                value={block.body || ""}
                onChange={(v) => patch({ body: v })}
              />
            </div>
          ) : (
            <>
              <p className="mb-1 text-sm font-semibold text-slate-700">
                {block.title}
              </p>
              <p className="mb-3 text-xs text-slate-500">{block.body}</p>
              <FileUpload
                value={
                  (answers[block.id] as { files: UploadedFile[] })?.files || []
                }
                onChange={(files) => onUpdate(block.id, { files })}
                disabled={readOnly}
                pathPrefix={`kegiatan-${kegiatan.nomor}`}
              />
            </>
          )}
        </div>
      );

    case "alternatif-kasus":
      return (
        <div className="card space-y-4">
          {editMode ? (
            <div className="space-y-2">
              <AdminTextInput
                label="Judul"
                value={block.title || ""}
                onChange={(v) => patch({ title: v })}
              />
              <AdminTextArea
                label="Opsi (satu baris = satu opsi)"
                value={(block.options || []).join("\n")}
                onChange={(v) =>
                  patch({
                    options: v
                      .split("\n")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  })
                }
              />
            </div>
          ) : (
            <>
              <p className="text-sm font-semibold text-slate-700">
                {block.title}
              </p>
              <RadioCardSelector
                options={block.options}
                value={(answers[block.id] as string) || ""}
                onChange={(v) => onUpdate(block.id, v)}
                disabled={readOnly}
              />
              <div>
                <p className="mb-1.5 text-xs font-medium text-slate-500">
                  Alasan pilihanmu
                </p>
                <TextAnswer
                  id={block.alasanId}
                  value={(answers[block.alasanId] as string) || ""}
                  onChange={(v) => onUpdate(block.alasanId, v)}
                  disabled={readOnly}
                  rows={3}
                  savedAt={savedAt}
                />
              </div>
            </>
          )}
        </div>
      );

    case "argumentasi-tap":
      return (
        <div className="card">
          {editMode ? (
            <div className="space-y-2">
              <AdminTextInput
                label="Judul argumentasi"
                value={block.title || ""}
                onChange={(v) => patch({ title: v })}
              />
              <AdminTextArea
                label="Kasus / konteks"
                value={block.kasus || ""}
                onChange={(v) => patch({ kasus: v })}
              />
            </div>
          ) : (
            <>
              <p className="mb-1 flex items-center gap-2 text-sm font-bold text-slate-800">
                <MessagesSquare className="h-4 w-4 text-brand-amber" />{" "}
                {block.title}
              </p>
              <p className="mb-3 text-xs text-slate-500">
                Susun argumentasi ilmiahmu dengan kerangka TAP (Toulmin
                Adaptif).
              </p>
              <ArgumentationTAP
                value={
                  (answers[block.id] as { tap: Record<string, string> })?.tap ||
                  {}
                }
                onChange={(tap) => onUpdate(block.id, { tap })}
                kasus={block.kasus}
                disabled={readOnly}
              />
            </>
          )}
        </div>
      );

    case "penalaran-level":
      return (
        <div className="card">
          {editMode ? (
            <div className="space-y-2">
              <AdminTextArea
                label="Makroskopik"
                value={block.makroskopik || ""}
                onChange={(v) => patch({ makroskopik: v })}
              />
              <AdminTextArea
                label="Submikroskopik"
                value={block.submikroskopik || ""}
                onChange={(v) => patch({ submikroskopik: v })}
              />
              <AdminTextArea
                label="Simbolik"
                value={block.simbolik || ""}
                onChange={(v) => patch({ simbolik: v })}
              />
            </div>
          ) : (
            <>
              <p className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-800">
                <Atom className="h-4 w-4 text-brand-teal" /> Integrasi Penalaran
                Kimia — 3 Level Representasi
              </p>
              <div className="grid gap-3 sm:grid-cols-3">
                <LevelCard
                  icon={<Microscope className="h-5 w-5" />}
                  title="Makroskopik"
                  desc={block.makroskopik}
                  color="bg-brand-green-light text-brand-green"
                />
                <LevelCard
                  icon={<Atom className="h-5 w-5" />}
                  title="Submikroskopik"
                  desc={block.submikroskopik}
                  color="bg-brand-teal-light text-brand-teal"
                />
                <LevelCard
                  icon={<BarChart3 className="h-5 w-5" />}
                  title="Simbolik"
                  desc={block.simbolik}
                  color="bg-brand-amber-light text-brand-amber"
                />
              </div>
            </>
          )}
        </div>
      );

    case "bagian-header":
      return editMode ? (
        <div className="card">
          <AdminTextInput
            label="Label bagian"
            value={block.label || ""}
            onChange={(v) => patch({ label: v })}
          />
        </div>
      ) : (
        <div className="flex items-center gap-3 pt-2">
          <span className="h-px flex-1 bg-slate-200" />
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-slate-500">
            {block.label}
          </span>
          <span className="h-px flex-1 bg-slate-200" />
        </div>
      );

    case "analisis-efisiensi":
      return (
        <div className="card space-y-4">
          {editMode ? (
            <div className="space-y-2">
              <AdminTextInput
                label="Judul"
                value={block.title || ""}
                onChange={(v) => patch({ title: v })}
              />
              <AdminTextArea
                label="Teks pertanyaan"
                value={block.pertanyaanText || ""}
                onChange={(v) => patch({ pertanyaanText: v })}
              />
            </div>
          ) : (
            <>
              <p className="text-sm font-semibold text-slate-700">
                {block.title}
              </p>
              <div className="overflow-x-auto scrollbar-thin rounded-xl border border-slate-200">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50">
                      {block.headers.map((h: string) => (
                        <th
                          key={h}
                          className="whitespace-nowrap px-3 py-2.5 text-left font-semibold text-slate-700 border-b border-slate-200">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>{renderRows(block.rows)}</tbody>
                </table>
              </div>
              <div>
                <p className="mb-2.5 text-sm font-medium text-slate-700">
                  {block.pertanyaanText}
                </p>
                <TextAnswer
                  id={block.pertanyaanId}
                  value={(answers[block.pertanyaanId] as string) || ""}
                  onChange={(v) => onUpdate(block.pertanyaanId, v)}
                  disabled={readOnly}
                  rows={4}
                  savedAt={savedAt}
                />
              </div>
            </>
          )}
        </div>
      );
    case "tabel-integrasi":
      return (
        <div className="card">
          {editMode ? (
            <AdminTextInput
              label="Judul tabel integrasi"
              value={block.title || ""}
              onChange={(v) => patch({ title: v })}
            />
          ) : (
            <>
              <p className="mb-2 text-sm font-semibold text-slate-700">
                {block.title}
              </p>
              <div className="overflow-x-auto scrollbar-thin rounded-xl border border-slate-200">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50">
                      {block.headers.map((h) => (
                        <th
                          key={h}
                          className="whitespace-nowrap px-3 py-2.5 text-left font-semibold text-slate-700 border-b border-slate-200">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {block.leftCol.map((left, r) => (
                      <tr key={r} className={r % 2 ? "bg-slate-50/40" : ""}>
                        <td className="px-3 py-2.5 text-slate-700 border-b border-slate-100 font-medium">
                          {left}
                        </td>
                        {block.headers.slice(1).map((_, c) => (
                          <td
                            key={c}
                            className="px-3 py-2.5 border-b border-slate-100 p-0">
                            <input
                              type="text"
                              disabled={readOnly}
                              value={
                                (answers[block.id] as { rows: string[][] })
                                  ?.rows?.[r]?.[c] || ""
                              }
                              onChange={(e) => {
                                const cur =
                                  (answers[block.id] as { rows: string[][] })
                                    ?.rows ||
                                  Array.from(
                                    { length: block.leftCol.length },
                                    () => block.headers.slice(1).map(() => ""),
                                  );
                                const next = cur.map((row) => [...row]);
                                if (!next[r])
                                  next[r] = block.headers
                                    .slice(1)
                                    .map(() => "");
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
            </>
          )}
        </div>
      );

    case "analisis-prediksi":
      return (
        <div className="card space-y-4">
          {editMode ? (
            <div className="space-y-2">
              <AdminTextInput
                label="Judul"
                value={block.title || ""}
                onChange={(v) => patch({ title: v })}
              />
              <AdminTextArea
                label="Kondisi (satu baris = satu kondisi)"
                value={(block.kondisi || []).join("\n")}
                onChange={(v) =>
                  patch({
                    kondisi: v
                      .split("\n")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  })
                }
              />
              <AdminTextArea
                label="Teks pertanyaan"
                value={block.pertanyaanText || ""}
                onChange={(v) => patch({ pertanyaanText: v })}
              />
            </div>
          ) : (
            <>
              <p className="text-sm font-semibold text-slate-700">
                {block.title}
              </p>
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Kondisi
                </p>
                <ul className="ml-5 list-disc space-y-1 text-sm text-slate-700">
                  {block.kondisi.map((k, i) => (
                    <li key={i}>{k}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="mb-2.5 text-sm font-medium text-slate-700">
                  {block.pertanyaanText}
                </p>
                <TextAnswer
                  id={block.id}
                  value={(answers[block.id] as string) || ""}
                  onChange={(v) => onUpdate(block.id, v)}
                  disabled={readOnly}
                  rows={4}
                  savedAt={savedAt}
                />
              </div>
            </>
          )}
        </div>
      );

    default:
      return null;
  }
}

function DiagramCol({
  label,
  desc,
  color,
}: {
  label: string;
  desc: string;
  color: string;
}) {
  return (
    <div className="rounded-xl border-2 p-4" style={{ borderColor: color }}>
      <p className="text-sm font-bold" style={{ color }}>
        {label}
      </p>
      <p className="mt-1 text-xs text-slate-600">{desc}</p>
      <div className="mt-3 flex h-20 items-center justify-center rounded-lg bg-slate-50 text-slate-300">
        <Atom className="h-8 w-8" />
      </div>
    </div>
  );
}

function LevelCard({
  icon,
  title,
  desc,
  color,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-slate-100 p-3.5">
      <div
        className={`mb-2 inline-grid h-9 w-9 place-items-center rounded-lg ${color}`}>
        {icon}
      </div>
      <p className="text-sm font-bold text-slate-800">{title}</p>
      <p className="mt-1 text-xs text-slate-500 leading-relaxed">{desc}</p>
    </div>
  );
}
