import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
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
  // X,
  // Check,
  FileQuestion,
  Trash2,
  Plus,
  Award,
  ChevronDown,
  Download,
} from "lucide-react";
import {
  type KegiatanContent,
  type ContentBlock,
  type PBLStep,
  type SDGBadge,
} from "@/content/types";
import { type AnswerValue, type Jawaban } from "@/lib/firebase";
// import { TextAnswer } from "./TextAnswer";
import { MultiTextAnswer } from "./MultiTextAnswer";
import { EditableTable } from "./EditableTable";
import { UrlInput } from "./UrlInput";
import { ArgumentationTAP } from "./ArgumentationTAP";
import { RadioCardSelector } from "./RadioCardSelector";
// import { EAssessment } from "./EAssessment";
import { SDGBadgeChip, Badge } from "@/components/ui";
import { Link } from "react-router-dom";
import { ExtraAnswers } from "../components/ExtraAnswer";

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
  skor?: number | null;
  feedback?: string | null;
  editMode?: boolean;
  onContentChange?: (next: KegiatanContent) => void;
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
  skor = null,
  feedback = null,
}: ActivityRendererProps) {
  const [activeStep, setActiveStep] = useState(0);

  const readOnly =
    status === "terkumpul" || status === "dinilai" || status === "preview";

  const steps = Array.isArray(kegiatan.steps) ? kegiatan.steps : [];
  const current = steps[activeStep];

  const isFilled = (v: AnswerValue | undefined): boolean => {
    if (v == null) return false;
    if (typeof v === "string") return v.trim().length > 0;
    if (Array.isArray(v)) return v.some((x) => String(x).trim().length > 0);
    if (typeof v === "object") {
      const o = v as Record<string, unknown>;
      if (Array.isArray(o.rows)) {
        return (o.rows as string[][]).some((row) =>
          row?.some((c) => String(c ?? "").trim().length > 0),
        );
      }
      if (o.tap && typeof o.tap === "object") {
        return Object.values(o.tap as Record<string, string>).some(
          (s) => String(s ?? "").trim().length > 0,
        );
      }
      return Object.keys(o).length > 0;
    }
    return true;
  };

  const stepCompletion = steps.map((s) => {
    const keys: string[] = [];

    (s.blocks || []).forEach((b) => {
      // id utama blok
      const main = blockKey(b);
      if (main) keys.push(main);

      // field sekunder
      if ("alasanId" in b && (b as { alasanId?: string }).alasanId) {
        keys.push((b as { alasanId: string }).alasanId);
      }
      if (
        "pertanyaanId" in b &&
        (b as { pertanyaanId?: string }).pertanyaanId
      ) {
        keys.push((b as { pertanyaanId: string }).pertanyaanId);
      }

      // soal benar-salah: setiap item punya id jawaban
      if (
        b.kind === "benar-salah" &&
        Array.isArray((b as { items?: { id?: string }[] }).items)
      ) {
        (b as { items: { id?: string }[] }).items.forEach((it) => {
          if (it.id) keys.push(it.id);
        });
      }
      if (b.kind === "tabel-isian") {
        if ("id" in b && b.id) keys.push(b.id);
        if (
          "pertanyaanId" in b &&
          (b as { pertanyaanId?: string }).pertanyaanId
        )
          keys.push((b as { pertanyaanId: string }).pertanyaanId);
      }
      if (b.kind === "soal-variatif" && "id" in b && b.id) {
        keys.push(`${b.id}__match`);
        keys.push(`${b.id}__pg`);
      }
      if (b.kind === "tap-terbimbing" && "id" in b && b.id) keys.push(b.id);
      if (b.kind === "kuis-akhir") {
        (b as { bsItems?: { id: string }[] }).bsItems?.forEach((it) => {
          if (it.id) keys.push(it.id);
        });
        (b as { rumpangItems?: { id: string }[] }).rumpangItems?.forEach(
          (it) => {
            if (it.id) keys.push(it.id);
          },
        );
      }
      if (b.kind === "refleksi-pemahaman") {
        if ("id" in b && b.id) keys.push(b.id);
        if ((b as { catatanId?: string }).catatanId)
          keys.push((b as { catatanId: string }).catatanId);
      }
    });

    // contoh: selesai jika SEMUA terisi (sesuai logika kunci urutan)
    if (keys.length === 0) return true;
    return keys.every((k) => {
      const v = answers[k];
      if (v == null) return false;
      if (typeof v === "string") return v.trim().length > 0;
      if (Array.isArray(v)) return v.some((x) => String(x).trim());
      return true;
    });
  });

  /** Sintaks ke-i boleh dikerjakan jika semua sebelumnya selesai */
  const isStepUnlocked = (index: number) => {
    if (editMode) return true; // admin bebas
    for (let i = 0; i < index; i++) {
      if (!stepCompletion[i]) return false;
    }
    return true;
  };

  // Jika activeStep terkunci (mis. data berubah), mundur ke yang boleh
  useEffect(() => {
    if (!isStepUnlocked(activeStep)) {
      const firstLocked = steps.findIndex((_, i) => !isStepUnlocked(i));
      const target = Math.max(0, firstLocked === -1 ? 0 : firstLocked - 1);
      setActiveStep(target);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepCompletion.join(","), activeStep, editMode]);

  // const stepCompletion = steps.map((s) => {
  //   const keys = s.blocks.map((b) => blockKey(b)).filter(Boolean) as string[];
  //   return keys.some((k) => {
  //     const v = answers[k];
  //     if (v == null) return false;
  //     if (typeof v === "string") return v.trim().length > 0;
  //     if (Array.isArray(v)) return v.some((x) => String(x).trim());
  //     return true;
  //   });
  // });
  const completedCount = stepCompletion.filter(Boolean).length;
  const totalSteps = steps.length > 0 ? steps.length + 1 : 1;
  const overallPct = Math.round(
    ((completedCount + (kuisDone ? 1 : 0)) / totalSteps) * 100,
  );

  const patchRoot = <K extends keyof KegiatanContent>(
    key: K,
    value: KegiatanContent[K],
  ) => {
    if (!editMode || !onContentChange) return;
    onContentChange({ ...kegiatan, [key]: value });
  };

  const patchStep = (stepIndex: number, patch: Partial<PBLStep>) => {
    if (!editMode || !onContentChange) return;
    const nextSteps = steps.map((s, i) =>
      i === stepIndex ? { ...s, ...patch } : s,
    );
    onContentChange({ ...kegiatan, steps: nextSteps });
  };

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

  const addBlock = (
    stepIndex: number,
    block: ContentBlock,
    afterIndex?: number,
  ) => {
    if (!editMode || !onContentChange) return;
    const nextSteps = steps.map((s, si) => {
      if (si !== stepIndex) return s;
      const nextBlocks = [...s.blocks];
      const pos = afterIndex != null ? afterIndex + 1 : nextBlocks.length;
      nextBlocks.splice(pos, 0, block);
      return { ...s, blocks: nextBlocks };
    });
    onContentChange({ ...kegiatan, steps: nextSteps });
  };

  const removeBlock = (stepIndex: number, blockIndex: number) => {
    if (!editMode || !onContentChange) return;
    const nextSteps = steps.map((s, si) => {
      if (si !== stepIndex) return s;
      return { ...s, blocks: s.blocks.filter((_, bi) => bi !== blockIndex) };
    });
    onContentChange({ ...kegiatan, steps: nextSteps });
  };

  return (
    <div className="space-y-5">
      {/* Header banner */}
      <div
        className="overflow-hidden rounded-xl sm:rounded-2xl shadow-soft relative"
        style={{ backgroundColor: kegiatan.warna }}>
        <div className="absolute right-4 sm:right-6 bottom-[-20px] text-white/10 pointer-events-none">
          <FlaskConical className="h-16 w-16 sm:h-28 sm:w-28" />
        </div>
        <div className="absolute left-1/3 top-[-10px] text-white/5 pointer-events-none hidden sm:block">
          <Atom className="h-16 w-16 animate-pulse" />
        </div>
        <div className="px-3 py-4 sm:px-7 sm:py-6 relative z-10">
          <div className="flex flex-wrap items-start justify-between gap-2 sm:gap-3 text-white">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wide text-white/70">
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
                    className="mt-0.5 text-lg font-extrabold sm:text-2xl md:text-3xl leading-snug"
                    style={{ color: "white" }}>
                    {kegiatan.judul?.replace(/^Kegiatan \d+\s*[—-]\s*/, "")}
                  </h1>
                  <p className="mt-0.5 text-xs sm:text-sm text-white/85">
                    {kegiatan.subjudul}
                  </p>
                </>
              )}
              {editMode ? (
                <AdminSDGEditor
                  items={Array.isArray(kegiatan.sdg) ? kegiatan.sdg : []}
                  onChange={(next) => patchRoot("sdg", next)}
                />
              ) : (
                <div className="mt-2 sm:mt-3 flex flex-wrap gap-1 sm:gap-1.5">
                  {Array.isArray(kegiatan.sdg) &&
                    kegiatan.sdg.map((s) => (
                      <SDGBadgeChip key={s.nomor} sdg={s} />
                    ))}
                </div>
              )}
            </div>
            {readOnly && status !== "preview" && (
              <span className="badge bg-white/20 text-white text-[10px] sm:text-xs">
                <Lock className="h-3 w-3 sm:h-3.5 sm:w-3.5" />{" "}
                {status === "dinilai" ? "Dinilai" : "Terkumpul"}
              </span>
            )}
            {status === "preview" && !editMode && (
              <span className="badge bg-white/20 text-white text-[10px] sm:text-xs">
                <Lock className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> Preview
              </span>
            )}
            {editMode && (
              <span className="badge bg-white/20 text-white text-[10px] sm:text-xs">
                <Pencil className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> Mode Edit
              </span>
            )}
          </div>
          {!editMode && (
            <div className="mt-3 sm:mt-4 max-w-md">
              <div className="mb-1 flex justify-between text-[10px] sm:text-xs text-white/80">
                <span>Progres kegiatan</span>
                <span>{overallPct}%</span>
              </div>
              <div className="h-1.5 sm:h-2 overflow-hidden rounded-full bg-white/25">
                <div
                  className="h-full rounded-full bg-white transition-all"
                  style={{ width: `${overallPct}%` }}
                />
              </div>
            </div>
          )}

          {!editMode && (skor != null || (feedback && feedback.trim())) && (
            <div className="card mt-3 p-3 sm:p-4">
              <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wide text-slate-400">
                Penilaian Guru
              </p>
              <div className="mt-1.5 sm:mt-2 flex items-center gap-2 sm:gap-3">
                {skor != null ? (
                  <Badge color="teal">
                    <Award className="h-3.5 w-3.5" /> Skor: {skor}
                  </Badge>
                ) : (
                  <span className="text-xs sm:text-sm text-slate-500">
                    Belum dinilai
                  </span>
                )}
              </div>
              {feedback && feedback.trim() && (
                <div className="mt-2 sm:mt-3 whitespace-pre-wrap text-xs sm:text-sm text-slate-700">
                  {feedback}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Materi & Tujuan */}
      <details className="card group p-3 sm:p-5" open={editMode || undefined}>
        <summary className="flex cursor-pointer items-center justify-between list-none">
          <span className="flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base font-bold text-slate-800">
            <BookOpen className="h-4 w-4 sm:h-5 sm:w-5 text-brand-green" />{" "}
            Materi & Tujuan Pembelajaran
          </span>
          <span className="text-slate-400 group-open:rotate-180 transition text-sm">
            ▾
          </span>
        </summary>
        <div className="mt-3 sm:mt-4 space-y-3 sm:space-y-4">
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
        </div>
      </details>

      <div className="grid gap-3 sm:gap-5 lg:grid-cols-[240px_1fr]">
        <aside className="lg:sticky lg:top-[80px] lg:self-start">
          <div className="card-tight p-2.5 sm:p-3">
            <p className="mb-2 sm:mb-3 text-[10px] sm:text-xs font-semibold uppercase tracking-wide text-slate-400">
              Sintaks PBL
            </p>
            <ol className="space-y-0.5 sm:space-y-1">
              {steps.map((s, i) => {
                const done = stepCompletion[i];
                const active = i === activeStep;
                const unlocked = isStepUnlocked(i);
                return (
                  <li key={s.id || i}>
                    <button
                      type="button"
                      disabled={!unlocked}
                      onClick={() => unlocked && setActiveStep(i)}
                      className={`flex w-full items-center gap-2 rounded-lg sm:rounded-xl px-2.5 py-2 sm:px-3 sm:py-2.5 text-left text-xs sm:text-sm transition ${
                        !unlocked
                          ? "opacity-50 cursor-not-allowed text-slate-400"
                          : active
                            ? "bg-brand-green-light text-brand-green-dark font-semibold"
                            : "text-slate-600 hover:bg-slate-50"
                      }`}>
                      <span
                        className={`shrink-0 ${
                          done
                            ? "text-success"
                            : unlocked
                              ? "text-slate-300"
                              : "text-slate-300"
                        }`}>
                        {!unlocked ? (
                          <Lock className="h-4 w-4 sm:h-5 sm:w-5" />
                        ) : done ? (
                          <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5" />
                        ) : (
                          <Circle className="h-4 w-4 sm:h-5 sm:w-5" />
                        )}
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-[10px] sm:text-[11px] font-semibold text-slate-400">
                          Sintaks {s.sintaks}
                          {!unlocked && " · Terkunci"}
                        </span>
                        <span className="block leading-tight truncate sm:whitespace-normal">
                          {s.label}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
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
              onAddBlock={addBlock}
              onRemoveBlock={removeBlock}
            />
          ) : steps.length > 0 ? (
            <div className="space-y-4 animate-fade-in">
              {/* Card Pretest & Posttest */}
              <div className="card">
                <div
                  className="banner mb-4"
                  style={{ backgroundColor: kegiatan.warna }}>
                  <BarChart3 className="h-5 w-5" /> E-Assessment — Uji
                  Pemahamanmu
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

              {/* Card Kuis Eksternal — HANYA di tab E-Assessment */}
              {assessmentUrl && (
                <div className="card border-2 border-brand-teal/30 bg-brand-teal-light/20">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-brand-teal">
                        Kuis Eksternal
                      </p>
                      <h3 className="text-sm font-bold text-slate-800 mt-0.5">
                        {assessmentJudul || "Kuis Formatif"}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">
                        Kerjakan kuis dari platform eksternal yang disediakan
                        guru.
                      </p>
                    </div>
                    <div className="flex flex-col gap-2 items-end">
                      <a
                        href={assessmentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-primary text-sm">
                        Buka Kuis
                      </a>
                      <label className="inline-flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={kuisDone}
                          onChange={(e) => onTandaiKuis?.(e.target.checked)}
                          className="rounded border-slate-300"
                        />
                        Sudah mengerjakan
                      </label>
                    </div>
                  </div>
                  <div className="mt-3 rounded-xl border border-dashed border-slate-200 bg-white/80 px-3 py-2.5">
                    <p className="text-[11px] font-medium text-slate-400 mb-0.5">
                      Tautan
                    </p>
                    <a
                      href={assessmentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block truncate text-xs text-brand-green hover:underline break-all">
                      {assessmentUrl}
                    </a>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="card text-center py-12 text-slate-500">
              Belum ada steps kegiatan
            </div>
          )}

          {/* Step nav */}
          {steps.length > 0 && (
            <div className="mt-3 sm:mt-5 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setActiveStep((s) => Math.max(0, s - 1))}
                disabled={activeStep === 0}
                className="btn-ghost text-xs sm:text-sm px-2 sm:px-3 disabled:opacity-40">
                <ArrowLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />{" "}
                <span className="hidden xs:inline">Sebelumnya</span>
              </button>
              {activeStep < steps.length - 1 ? (
                <button
                  type="button"
                  disabled={!stepCompletion[activeStep]}
                  onClick={() => {
                    if (!stepCompletion[activeStep]) return;
                    setActiveStep((s) => Math.min(steps.length - 1, s + 1));
                  }}
                  className="btn-outline text-xs sm:text-sm px-2.5 sm:px-4 disabled:opacity-40">
                  Berikutnya{" "}
                  <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </button>
              ) : (
                <span className="text-[10px] sm:text-xs text-slate-400">
                  Tahap akhir
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Action bar */}
      <div className="sticky bottom-2 sm:bottom-4 z-30 flex items-center justify-between gap-2 sm:gap-3 rounded-xl sm:rounded-2xl border border-slate-100 bg-white/95 px-2.5 py-2 sm:px-4 sm:py-3 shadow-float backdrop-blur">
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
  onAddBlock,
  onRemoveBlock,
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
  onAddBlock: (
    stepIndex: number,
    block: ContentBlock,
    afterIndex?: number,
  ) => void;
  onRemoveBlock: (stepIndex: number, blockIndex: number) => void;
}) {
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [menuPosition, setMenuPosition] = useState({
    top: 0,
    left: 0,
    width: 0,
  });

  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const reorderBlocks = (from: number, to: number) => {
    if (!editMode || from === to || from < 0 || to < 0) return;
    const list = [...(step.blocks || [])];
    if (from >= list.length || to >= list.length) return;
    const [moved] = list.splice(from, 1);
    list.splice(to, 0, moved);
    onPatchStep(stepIndex, { blocks: list });
  };

  // --- LOGIKA PORTAL ---
  const updateMenuPosition = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + 4, // langsung di bawah tombol
        left: rect.left,
        width: rect.width,
      });
    }
  };

  useEffect(() => {
    if (addMenuOpen) {
      updateMenuPosition();

      const handleScrollResize = () => updateMenuPosition();
      window.addEventListener("scroll", handleScrollResize, true);
      window.addEventListener("resize", handleScrollResize);

      return () => {
        window.removeEventListener("scroll", handleScrollResize, true);
        window.removeEventListener("resize", handleScrollResize);
      };
    }
  }, [addMenuOpen]);
  // --- AKHIR LOGIKA PORTAL ---

  /** Generate unique ID for new blocks */
  const genId = (prefix: string) => {
    const existing = (step.blocks || [])
      .map((b) => ("id" in b ? (b as { id: string }).id : ""))
      .filter(Boolean);
    let n = existing.length + 1;
    while (existing.includes(`k${kegiatan.nomor}_${prefix}${n}`)) n++;
    return `k${kegiatan.nomor}_${prefix}${n}`;
  };

  /** Add-block options */
  const addOptions = getAddBlockOptions(step.sintaks, genId);
  const [activeSection, setActiveSection] = useState(0);

  // Reset section saat ganti sintaks
  useEffect(() => {
    setActiveSection(0);
  }, [stepIndex]);

  // Pecah blok berdasarkan bagian-header
  type SectionItem = {
    label: string;
    blocks: { block: ContentBlock; index: number }[];
  };

  const allBlocks = step.blocks || [];
  const sections: SectionItem[] = [];
  let currentSec: SectionItem = { label: "Utama", blocks: [] };

  allBlocks.forEach((block, index) => {
    if (block.kind === "bagian-header") {
      if (currentSec.blocks.length > 0) {
        sections.push(currentSec);
      }
      currentSec = {
        label:
          (block as { label?: string }).label ||
          `Bagian ${sections.length + 1}`,
        blocks: [],
      };
      return; // header tidak ikut dirender di isi section
    }
    currentSec.blocks.push({ block, index });
  });
  if (currentSec.blocks.length > 0 || sections.length === 0) {
    sections.push(currentSec);
  }

  const hasMultipleSections = sections.length > 1;
  const visibleBlocks = hasMultipleSections
    ? sections[activeSection]?.blocks || []
    : sections[0]?.blocks || [];

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
          {/* URL YouTube / website di level sintaks */}
          <AdminMediaFields
            block={
              {
                kind: "media",
                mediaUrl: step.mediaUrl || "",
                mediaType: step.mediaType || "link",
                caption: step.mediaCaption || "",
              } as ContentBlock & {
                mediaUrl?: string;
                mediaType?: string;
                caption?: string;
              }
            }
            onPatch={(patch) => {
              const next: Partial<PBLStep> = {};
              if ("mediaUrl" in patch) next.mediaUrl = patch.mediaUrl as string;
              if ("mediaType" in patch)
                next.mediaType = patch.mediaType as PBLStep["mediaType"];
              if ("caption" in patch)
                next.mediaCaption = patch.caption as string;
              onPatchStep(stepIndex, next);
            }}
          />
        </div>
      ) : (
        <div className="space-y-2">
          {step.ringkas && (
            <div className="card bg-white">
              <p className="text-sm leading-relaxed text-slate-900 whitespace-pre-wrap">
                {step.ringkas}
              </p>
            </div>
          )}
          {step.mediaUrl &&
            renderMedia({
              kind: "media",
              mediaUrl: step.mediaUrl,
              mediaType: step.mediaType || "link",
              caption: step.mediaCaption,
            } as ContentBlock)}
        </div>
      )}

      {/* Tombol section (muncul jika ada >1 bagian-header) */}
      {hasMultipleSections && (
        <div className="flex flex-wrap gap-2">
          {sections.map((sec, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActiveSection(i)}
              className={`rounded-xl px-3 py-2 text-xs sm:text-sm font-semibold transition border ${
                activeSection === i
                  ? "border-brand-green bg-brand-green-light text-brand-green-dark"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}>
              {sec.label}
            </button>
          ))}
        </div>
      )}

      {/* Blok section aktif */}
      {visibleBlocks.map(({ block, index }) => (
        <div
          key={index}
          className={`relative group/block ${
            editMode ? "cursor-default" : ""
          } ${dragIndex === index ? "opacity-50 ring-2 ring-purple-300 rounded-xl" : ""}`}
          draggable={editMode}
          onDragStart={(e) => {
            if (!editMode) return;
            setDragIndex(index);
            e.dataTransfer.effectAllowed = "move";
            e.dataTransfer.setData("text/plain", String(index));
          }}
          onDragEnd={() => setDragIndex(null)}
          onDragOver={(e) => {
            if (!editMode) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
          }}
          onDrop={(e) => {
            if (!editMode) return;
            e.preventDefault();
            const from = Number(e.dataTransfer.getData("text/plain"));
            if (Number.isNaN(from)) return;
            reorderBlocks(from, index);
            setDragIndex(null);
          }}>
          {editMode && (
            <div className="mb-1 flex items-center justify-between gap-2">
              <span
                className="inline-flex cursor-grab active:cursor-grabbing items-center gap-1 rounded-lg bg-purple-50 px-2 py-1 text-[11px] font-semibold text-purple-700 select-none"
                title="Tahan lalu geser untuk mengubah urutan">
                ⋮⋮ Geser urutan
              </span>
              <div className="flex gap-1">
                <button
                  type="button"
                  className="rounded-lg border border-slate-200 px-2 py-0.5 text-[11px] text-slate-600 hover:bg-slate-50"
                  disabled={index === 0}
                  onClick={() => reorderBlocks(index, index - 1)}
                  title="Naikkan">
                  ↑
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-slate-200 px-2 py-0.5 text-[11px] text-slate-600 hover:bg-slate-50"
                  disabled={index >= (step.blocks?.length || 0) - 1}
                  onClick={() => reorderBlocks(index, index + 1)}
                  title="Turunkan">
                  ↓
                </button>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm("Hapus blok ini?")) {
                    onRemoveBlock(stepIndex, index);
                  }
                }}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-red-500 text-white shadow hover:bg-red-600"
                title="Hapus blok">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
          <BlockRenderer
            block={block}
            blockIndex={index}
            stepIndex={stepIndex}
            kegiatan={kegiatan}
            answers={answers}
            onUpdate={onUpdate}
            readOnly={readOnly}
            savedAt={savedAt}
            editMode={editMode}
            onPatchBlock={onPatchBlock}
          />
        </div>
      ))}

      {/* Add Block buttons — Menggunakan Portal */}
      {editMode && addOptions.length > 0 && (
        <div className="relative">
          <button
            ref={buttonRef}
            type="button"
            onClick={() => setAddMenuOpen((v) => !v)}
            className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-purple-200 bg-purple-50/30 px-4 py-3.5 text-sm font-semibold text-purple-600 transition-all hover:border-purple-400 hover:bg-purple-50">
            <Plus className="h-4 w-4" />
            Tambah Blok
            <ChevronDown
              className={`h-4 w-4 transition-transform ${addMenuOpen ? "rotate-180" : ""}`}
            />
          </button>

          {/* PERBAIKAN PORTAL DI SINI */}
          {addMenuOpen &&
            typeof document !== "undefined" &&
            createPortal(
              <div
                className="fixed z-[999] max-h-[350px] overflow-y-auto rounded-xl border border-purple-100 bg-white shadow-2xl animate-fade-in min-w-[200px]"
                style={{
                  top: menuPosition.top,
                  left: menuPosition.left,
                  width: menuPosition.width || 250, // Fallback jika width 0
                }}>
                {/* Pastikan addOptions terdefinisi */}
                {addOptions && addOptions.length > 0 ? (
                  addOptions.map((opt) => (
                    <button
                      key={opt.label}
                      type="button"
                      onClick={() => {
                        onAddBlock(stepIndex, opt.block);
                        setAddMenuOpen(false);
                      }}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-slate-700 transition hover:bg-purple-50 border-b border-purple-50 last:border-0">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-purple-100 text-purple-600">
                        {opt.icon}
                      </span>
                      <span>
                        <span className="block font-semibold">{opt.label}</span>
                        <span className="block text-xs text-slate-400">
                          {opt.desc}
                        </span>
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-3 text-sm text-slate-500 text-center">
                    Tidak ada opsi blok untuk sintaks ini
                  </div>
                )}
              </div>,
              document.body,
            )}
        </div>
      )}
    </div>
  );
}

/** Returns add-block menu options based on sintaks number */
function getAddBlockOptions(
  sintaks: number,
  genId: (prefix: string) => string,
): {
  label: string;
  desc: string;
  icon: React.ReactNode;
  block: ContentBlock;
}[] {
  switch (sintaks) {
    case 1:
      return [
        {
          label: "Gambar Utama / Infografis",
          desc: "Gambar besar sebelum video/narasi",
          icon: <BookOpen className="h-4 w-4" />,
          block: {
            kind: "gambar-utama",
            title: "Gambar utama / infografis masalah",
            imageUrl: "",
            caption: "",
          } as ContentBlock,
        },
        {
          label: "Narasi Masalah",
          desc: "Deskripsi narasi masalah",
          icon: <AlertTriangle className="h-4 w-4" />,
          block: { kind: "masalah", title: "Narasi Masalah", body: "" },
        },
        {
          label: "Media / Video",
          desc: "YouTube atau tautan di level sintaks / blok",
          icon: <UploadCloud className="h-4 w-4" />,
          block: {
            kind: "media",
            title: "Video / Media",
            mediaUrl: "",
            mediaType: "youtube",
            caption: "",
          } as ContentBlock,
        },
        {
          label: "Corner: Tahukah Kamu?",
          desc: "Kartu fakta singkat + label SDG",
          icon: <Atom className="h-4 w-4" />,
          block: {
            kind: "tahukah-kamu",
            title: "Corner: Tahukah Kamu?",
            body: "",
            sdgLabel: "SDG 2 / 11 / 12",
          } as ContentBlock,
        },
        {
          label: "Soal Benar / Salah",
          desc: "Beberapa pernyataan Benar/Salah + feedback",
          icon: <CheckCircle2 className="h-4 w-4" />,
          block: {
            kind: "benar-salah",
            title: "Soal Benar / Salah",
            intro: "Tandai tiap pernyataan.",
            items: [
              {
                id: genId("bs"),
                pernyataan: "",
                jawabanBenar: true,
                feedbackBenar: "Benar!",
                feedbackSalah: "Kurang tepat.",
              },
            ],
          } as ContentBlock,
        },
        {
          label: "Pertanyaan Pemantik",
          desc: "Pertanyaan uraian dengan kolom jawaban",
          icon: <AlertTriangle className="h-4 w-4" />,
          block: { kind: "pertanyaan", id: genId("p"), text: "", hint: "" },
        },
        {
          label: "Stimulus",
          desc: "Teks stimulus / konteks masalah",
          icon: <BookOpen className="h-4 w-4" />,
          block: { kind: "stimulus", title: "Amati dan Simak", body: "" },
        },
      ];
    case 2:
      return [
        {
          label: "Corner: Kamus Kimia",
          desc: "Tap istilah → definisi + gambar",
          icon: <BookOpen className="h-4 w-4" />,
          block: {
            kind: "kamus-kimia",
            title: "Corner: Kamus Kimia",
            intro: "Tap istilah untuk membuka definisi singkat dan gambar.",
            terms: [
              {
                id: genId("term"),
                label: "laju reaksi",
                definisi: "",
                imageUrl: "",
              },
              {
                id: genId("term"),
                label: "tumbukan efektif",
                definisi: "",
                imageUrl: "",
              },
              {
                id: genId("term"),
                label: "energi aktivasi",
                definisi: "",
                imageUrl: "",
              },
              {
                id: genId("term"),
                label: "orde reaksi",
                definisi: "",
                imageUrl: "",
              },
              {
                id: genId("term"),
                label: "katalis",
                definisi: "",
                imageUrl: "",
              },
            ],
          } as unknown as ContentBlock,
        },
        {
          label: "Kalimat Rumpang / Hipotesis",
          desc: "Judul + teks rumpang + kolom jawaban (judul bisa diubah)",
          icon: <Pencil className="h-4 w-4" />,
          block: {
            kind: "kalimat-rumpang",
            id: genId("kr"),
            title: "Hipotesis dengan kalimat rumpang",
            prompt:
              "Jika ukuran cacahan [ lebih kecil / lebih besar ], maka waktu pengomposan [ lebih singkat / lebih lama ], karena …",
            hint: "",
          } as unknown as ContentBlock,
        },
        {
          label: "Kartu Materi (judul + teks + gambar)",
          desc: "Satu kartu: judul, deskripsi, gambar",
          icon: <BookOpen className="h-4 w-4" />,
          block: {
            kind: "materi-card",
            title: "Konsep inti",
            body: "",
            imageUrl: "",
            imageCaption: "",
          } as ContentBlock,
        },
        {
          label: "Tabel Data (isi yang kosong)",
          desc: "Tabel sebagian terisi, siswa mengisi sel [?]",
          icon: <ClipboardList className="h-4 w-4" />,
          block: {
            kind: "tabel-isian",
            id: genId("ti"),
            title: "Tabel data: isi yang kosong",
            headers: ["Percobaan", "[A]", "[B]", "Laju"],
            rows: [
              [
                { value: "1", editable: false },
                { value: "0,1", editable: false },
                { value: "0,1", editable: false },
                { value: "2", editable: false },
              ],
              [
                { value: "2", editable: false },
                { value: "0,2", editable: false },
                { value: "0,1", editable: false },
                { value: "", editable: true },
              ],
              [
                { value: "3", editable: false },
                { value: "0,1", editable: false },
                { value: "0,2", editable: false },
                { value: "", editable: true },
              ],
            ],
            pertanyaanText:
              "Lalu tentukan orde m dan n dan tulis persamaan lajunya.",
            pertanyaanId: genId("tip"),
          } as ContentBlock,
        },
        {
          label: "Tabel Organisasi (Aktivitas)",
          desc: "Tabel diagnosis / perencanaan (sudah ada)",
          icon: <ClipboardList className="h-4 w-4" />,
          block: {
            kind: "tabel-org",
            id: genId("org"),
            headers: [
              "Apa yang sudah diketahui?",
              "Apa yang perlu diketahui?",
              "Hipotesis",
            ],
            rowCount: 3,
            title: "Aktivitas Baru",
            perencanaanId: genId("rencana"),
            perencanaanText: "",
          },
        },
        {
          label: "Soal Variatif (pasang + PG)",
          desc: "Pasangkan istilah + pilihan ganda",
          icon: <FileQuestion className="h-4 w-4" />,
          block: {
            kind: "soal-variatif",
            id: genId("sv"),
            title: "Soal variatif: pasangkan & pilihan ganda",
            intro: "Pasangkan istilah dengan pengertian, lalu kerjakan PG.",
            matching: {
              left: [
                { id: "L1", text: "Katalis" },
                { id: "L2", text: "Energi aktivasi" },
              ],
              right: [
                { id: "R1", text: "Menurunkan Ea tanpa habis bereaksi" },
                { id: "R2", text: "Energi minimum agar reaksi terjadi" },
              ],
              kunci: { L1: "R1", L2: "R2" },
            },
            pg: [
              {
                id: genId("pg"),
                pertanyaan: "Katalis mempercepat reaksi dengan cara …",
                options: [
                  { id: "a", text: "Menaikkan suhu sistem" },
                  { id: "b", text: "Menurunkan energi aktivasi" },
                  { id: "c", text: "Menambah konsentrasi produk" },
                ],
                kunciId: "b",
              },
            ],
          } as ContentBlock,
        },
      ];
    case 3:
      return [
        {
          label: "Bagian Header",
          desc: "Pemisah judul bagian (mis. Bagian A)",
          icon: <Target className="h-4 w-4" />,
          block: { kind: "bagian-header", label: "Bagian Baru" },
        },
        {
          label: "Media / Tautan",
          desc: "YouTube, gambar, atau tautan website yang bisa diklik",
          icon: <UploadCloud className="h-4 w-4" />,
          block: {
            kind: "media",
            title: "Media / Tautan",
            mediaUrl: "",
            mediaType: "youtube",
            caption: "",
          },
        },
        {
          label: "Pertanyaan Analisis",
          desc: "Pertanyaan analisis teks panjang",
          icon: <Microscope className="h-4 w-4" />,
          block: {
            kind: "analitis",
            id: genId("a"),
            text: "",
            allowImage: false,
          },
        },
        {
          label: "Input Perhitungan",
          desc: "Input dengan label dan satuan",
          icon: <BarChart3 className="h-4 w-4" />,
          block: {
            kind: "input-hitung",
            id: genId("h"),
            label: "",
            unit: "",
            allowImage: false,
          },
        },
        {
          label: "Data Eksperimen",
          desc: "Tabel data percobaan",
          icon: <FlaskConical className="h-4 w-4" />,
          block: {
            kind: "data-eksperimen",
            title: "Data Percobaan Baru",
            headers: ["Kolom 1", "Kolom 2", "Kolom 3"],
            rows: [{ cells: ["", "", ""] }],
          },
        },
        {
          label: "Diagram Submikroskopik",
          desc: "Diagram perbandingan kiri-kanan",
          icon: <Atom className="h-4 w-4" />,
          block: {
            kind: "diagram-submikro",
            title: "Diagram Baru",
            kiri: { label: "Kondisi A", deskripsi: "" },
            kanan: { label: "Kondisi B", deskripsi: "" },
          },
        },
        {
          label: "Kartu Materi (judul + teks + gambar)",
          desc: "Satu kartu: judul, deskripsi, gambar",
          icon: <BookOpen className="h-4 w-4" />,
          block: {
            kind: "materi-card",
            title: "Konsep inti",
            body: "",
            imageUrl: "",
            imageCaption: "",
          } as ContentBlock,
        },
        {
          label: "Tabel Data (isi yang kosong)",
          desc: "Tabel sebagian terisi, siswa mengisi sel [?]",
          icon: <ClipboardList className="h-4 w-4" />,
          block: {
            kind: "tabel-isian",
            id: genId("ti"),
            title: "Tabel data: isi yang kosong",
            headers: ["Percobaan", "[A]", "[B]", "Laju"],
            rows: [
              [
                { value: "1", editable: false },
                { value: "0,1", editable: false },
                { value: "0,1", editable: false },
                { value: "2", editable: false },
              ],
              [
                { value: "2", editable: false },
                { value: "0,2", editable: false },
                { value: "0,1", editable: false },
                { value: "", editable: true },
              ],
              [
                { value: "3", editable: false },
                { value: "0,1", editable: false },
                { value: "0,2", editable: false },
                { value: "", editable: true },
              ],
            ],
            pertanyaanText:
              "Lalu tentukan orde m dan n dan tulis persamaan lajunya.",
            pertanyaanId: genId("tip"),
          } as ContentBlock,
        },
        {
          label: "Soal Variatif (pasang + PG)",
          desc: "Pasangkan istilah + pilihan ganda",
          icon: <FileQuestion className="h-4 w-4" />,
          block: {
            kind: "soal-variatif",
            id: genId("sv"),
            title: "Soal variatif: pasangkan & pilihan ganda",
            intro: "Pasangkan istilah dengan pengertian, lalu kerjakan PG.",
            matching: {
              left: [
                { id: "L1", text: "Katalis" },
                { id: "L2", text: "Energi aktivasi" },
              ],
              right: [
                { id: "R1", text: "Menurunkan Ea tanpa habis bereaksi" },
                { id: "R2", text: "Energi minimum agar reaksi terjadi" },
              ],
              kunci: { L1: "R1", L2: "R2" },
            },
            pg: [
              {
                id: genId("pg"),
                pertanyaan: "Katalis mempercepat reaksi dengan cara …",
                options: [
                  { id: "a", text: "Menaikkan suhu sistem" },
                  { id: "b", text: "Menurunkan energi aktivasi" },
                  { id: "c", text: "Menambah konsentrasi produk" },
                ],
                kunciId: "b",
              },
            ],
          } as ContentBlock,
        },
      ];
    case 4:
      return [
        {
          label: "Galeri Contoh Karya",
          desc: "Kartu contoh (slide/poster/infografis) + gambar/link",
          icon: <BookOpen className="h-4 w-4" />,
          block: {
            kind: "galeri-karya",
            title: "Galeri contoh karya",
            caption:
              "Contoh dari kasus lain agar siswa punya gambaran bentuk dan isi.",
            items: [
              {
                id: genId("gk"),
                label: "Contoh slide",
                imageUrl: "",
                linkUrl: "",
              },
              {
                id: genId("gk"),
                label: "Contoh poster",
                imageUrl: "",
                linkUrl: "",
              },
              {
                id: genId("gk"),
                label: "Contoh infografis",
                imageUrl: "",
                linkUrl: "",
              },
            ],
          } as unknown as ContentBlock,
        },
        {
          label: "Kartu Materi",
          desc: "Judul + teks + gambar (sama seperti Sintaks 2/3)",
          icon: <BookOpen className="h-4 w-4" />,
          block: {
            kind: "materi-card",
            title: "Materi singkat",
            body: "",
            imageUrl: "",
            imageCaption: "",
          } as unknown as ContentBlock,
        },
        {
          label: "Daftar Periksa Isi Karya",
          desc: "Checklist rubrik singkat (siswa mencentang)",
          icon: <CheckCircle2 className="h-4 w-4" />,
          block: {
            kind: "daftar-periksa",
            id: genId("dp"),
            title: "Daftar periksa isi karya (rubrik singkat)",
            items: [
              { id: genId("dpi"), text: "Hasil data dari tabel" },
              {
                id: genId("dpi"),
                text: "Penjelasan teori tumbukan, energi aktivasi, katalis",
              },
              {
                id: genId("dpi"),
                text: "Rekomendasi kombinasi untuk UMKM",
              },
              { id: genId("dpi"), text: "Ada gambar atau grafik" },
            ],
          } as unknown as ContentBlock,
        },
        {
          label: "Kerangka Rekomendasi",
          desc: "Deskripsi + tombol unduh template",
          icon: <Download className="h-4 w-4" />, // pastikan lucide Download di-import
          block: {
            kind: "kerangka-rekomendasi",
            title: "Kerangka rekomendasi (unduh)",
            body: "Template kosong: Masalah, Data, Penjelasan, Rekomendasi, Dampak SDG.",
            downloadUrl: "",
            downloadLabel: "Unduh template",
          } as unknown as ContentBlock,
        },
        {
          label: "Instruksi Pengembangan",
          desc: "Instruksi tugas dengan bullet points",
          icon: <UploadCloud className="h-4 w-4" />,
          block: {
            kind: "instruksi-pengembangan",
            title: "Instruksi Baru",
            body: "",
            bullets: [],
          },
        },
        {
          label: "Upload Hasil",
          desc: "Kolom upload karya / file",
          icon: <UploadCloud className="h-4 w-4" />,
          block: {
            kind: "upload-hasil",
            id: genId("up"),
            title: "Unggah Karya",
            body: "",
          },
        },
      ];
    case 5:
      return [
        {
          label: "Contoh Argumen TAP",
          desc: "Tabel contoh Claim–Data–Warrant (hanya baca)",
          icon: <MessagesSquare className="h-4 w-4" />,
          block: {
            kind: "contoh-tap",
            title: "Contoh argumen TAP terpandu",
            intro:
              "Satu contoh TAP terisi penuh pada kasus lain. Muncul sebelum siswa menulis sendiri.",
            rows: [
              { label: "Claim", contoh: "Pilih penyimpanan 5 °C" },
              { label: "Data", contoh: "Waktu busuk 10 hari pada 5 °C" },
              {
                label: "Warrant",
                contoh: "Suhu rendah menurunkan frekuensi tumbukan",
              },
            ],
          } as unknown as ContentBlock,
        },
        {
          label: "Studi Kasus / Alternatif",
          desc: "Pilihan alternatif dengan alasan",
          icon: <ClipboardList className="h-4 w-4" />,
          block: {
            kind: "alternatif-kasus",
            id: genId("alt"),
            title: "Studi kasus: pilih alternatif",
            options: [
              { id: "a", label: "Alternatif A", deskripsi: "" },
              { id: "b", label: "Alternatif B", deskripsi: "" },
            ],
            alasanId: genId("alt_alasan"),
          },
        },
        {
          label: "TAP Kosong + Bantuan Kalimat",
          desc: "6 kotak TAP dengan kalimat pembuka",
          icon: <MessagesSquare className="h-4 w-4" />,
          block: {
            kind: "tap-terbimbing",
            id: genId("tapt"),
            title: "TAP kosong dengan bantuan kalimat",
            intro: "Enam kotak dengan awal kalimat sebagai petunjuk.",
            fields: [
              { key: "claim", label: "Claim", starter: "Claim: ..." },
              { key: "data", label: "Data", starter: "Data: ..." },
              {
                key: "warrant",
                label: "Warrant",
                starter: "Karena data menunjukkan ...",
              },
              {
                key: "backing",
                label: "Backing",
                starter: "Hal ini didukung oleh ...",
              },
              {
                key: "qualifier",
                label: "Qualifier",
                starter: "Pernyataan ini berlaku jika ...",
              },
              {
                key: "rebuttal",
                label: "Rebuttal",
                starter: "Namun, perlu diperhatikan ...",
              },
            ],
          } as unknown as ContentBlock,
        },
        {
          label: "Kuis Akhir Singkat",
          desc: "Benar/Salah + isian rumpang",
          icon: <FileQuestion className="h-4 w-4" />,
          block: {
            kind: "kuis-akhir",
            id: genId("ka"),
            title: "Kuis akhir singkat",
            intro:
              "Beberapa soal Benar/Salah dan isian rumpang tentang konsep inti.",
            bsItems: [
              {
                id: genId("kabs"),
                pernyataan: "Katalis menurunkan energi aktivasi.",
                jawabanBenar: true,
                feedbackBenar: "Benar!",
                feedbackSalah: "Coba ingat fungsi katalis.",
              },
              {
                id: genId("kabs"),
                pernyataan:
                  "Orde reaksi selalu sama dengan koefisien stoikiometri.",
                jawabanBenar: false,
                feedbackBenar: "Benar!",
                feedbackSalah: "Orde ditentukan dari data eksperimen.",
              },
            ],
            rumpangItems: [
              {
                id: genId("kar"),
                prompt: "Energi minimum agar partikel bereaksi disebut ...",
              },
            ],
          } as unknown as ContentBlock,
        },
        {
          label: "Refleksi Pemahaman",
          desc: "Skala 1–4 per konsep + catatan bebas",
          icon: <Target className="h-4 w-4" />,
          block: {
            kind: "refleksi-pemahaman",
            id: genId("ref"),
            title: "Refleksi pemahaman",
            intro: "Skala 1 sampai 4 untuk tiap konsep.",
            skalaMax: 4,
            konsep: [
              { id: "k1", label: "Tumbukan efektif" },
              { id: "k2", label: "Energi aktivasi" },
              { id: "k3", label: "Orde reaksi" },
              { id: "k4", label: "Katalis dan suhu optimal" },
            ],
            catatanId: genId("refcat"),
            catatanPlaceholder: "Bagian yang masih membingungkan...",
          } as unknown as ContentBlock,
        },
        {
          label: "Argumentasi TAP (bebas)",
          desc: "Kerangka TAP tanpa starter",
          icon: <MessagesSquare className="h-4 w-4" />,
          block: {
            kind: "argumentasi-tap",
            id: genId("tap"),
            title: "Argumentasi Ilmiah (TAP)",
            kasus: "",
          },
        },
        {
          label: "Penalaran Level",
          desc: "Makroskopik, Submikroskopik, Simbolik",
          icon: <Atom className="h-4 w-4" />,
          block: {
            kind: "penalaran-level",
            makroskopik: "",
            submikroskopik: "",
            simbolik: "",
          },
        },
      ];
    default:
      return [
        {
          label: "Pertanyaan",
          desc: "Pertanyaan teks umum",
          icon: <AlertTriangle className="h-4 w-4" />,
          block: { kind: "pertanyaan", id: genId("q"), text: "" },
        },
        {
          label: "Bagian Header",
          desc: "Pemisah judul bagian",
          icon: <Target className="h-4 w-4" />,
          block: { kind: "bagian-header", label: "Bagian Baru" },
        },
      ];
  }
}

function blockKey(b: ContentBlock): string | null {
  if ("id" in b) return b.id;
  return null;
}

// function renderMedia(block: ContentBlock) {
//   if ("mediaUrl" in block && block.mediaUrl) {
//     if (block.mediaType === "youtube") {
//       const getYoutubeId = (url: string) => {
//         const match = url.match(
//           /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?]+)/,
//         );
//         return match ? match[1] : null;
//       };
//       const videoId = getYoutubeId(block.mediaUrl);
//       if (videoId) {
//         return (
//           <div className="mt-3 aspect-video rounded-xl overflow-hidden shadow-sm">
//             <iframe
//               width="100%"
//               height="100%"
//               src={`https://www.youtube.com/embed/${videoId}`}
//               title="YouTube video player"
//               frameBorder="0"
//               allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
//               allowFullScreen
//             />
//           </div>
//         );
//       }
//       return (
//         <p className="mt-2 text-xs text-amber-600">
//           URL YouTube tidak valid: {block.mediaUrl}
//         </p>
//       );
//     } else if (block.mediaType === "image") {
//       return (
//         <div className="mt-3 rounded-xl overflow-hidden shadow-sm">
//           <img
//             src={block.mediaUrl}
//             alt="Media"
//             className="w-full h-auto object-cover"
//           />
//         </div>
//       );
//     }
//   }
//   return null;
// }

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
      // Fallback: tampilkan sebagai tautan jika URL YouTube tidak valid
      return (
        <a
          href={block.mediaUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-brand-teal hover:bg-brand-teal-light/40 hover:border-brand-teal transition">
          <UploadCloud className="h-4 w-4 shrink-0" />
          <span className="truncate">{block.mediaUrl}</span>
        </a>
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
    } else if (block.mediaType === "link") {
      const href =
        block.mediaUrl.startsWith("http://") ||
        block.mediaUrl.startsWith("https://")
          ? block.mediaUrl
          : `https://${block.mediaUrl}`;
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 flex items-center gap-2 rounded-xl border border-brand-teal/30 bg-brand-teal-light/30 px-4 py-3 text-sm font-semibold text-brand-teal hover:bg-brand-teal-light hover:border-brand-teal transition">
          <UploadCloud className="h-4 w-4 shrink-0" />
          <span className="truncate">
            {"caption" in block && block.caption
              ? block.caption
              : block.mediaUrl}
          </span>
          <ArrowRight className="h-4 w-4 shrink-0 ml-auto opacity-60" />
        </a>
      );
    }
  }
  return null;
}

/* ========== Admin field helpers ========== */

/** Editor untuk daftar SDG badge (angka, label/teks, warna) — add / edit / delete */
function AdminSDGEditor({
  items,
  onChange,
}: {
  items: SDGBadge[];
  onChange: (next: SDGBadge[]) => void;
}) {
  const updateItem = (index: number, patch: Partial<SDGBadge>) => {
    const next = items.map((item, i) =>
      i === index ? { ...item, ...patch } : item,
    );
    onChange(next);
  };

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const addItem = () => {
    const maxNomor =
      items.length > 0
        ? Math.max(...items.map((s) => Number(s.nomor) || 0))
        : 0;
    onChange([
      ...items,
      {
        nomor: maxNomor + 1,
        label: "Label baru",
        warna: "#2E5949",
      },
    ]);
  };

  return (
    <div className="mt-3 space-y-2">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-white/70">
        SDG / Badge (angka, teks, warna)
      </p>
      {items.map((s, i) => (
        <div
          key={i}
          className="flex flex-wrap items-center gap-2 rounded-xl border border-white/25 bg-white/10 p-2.5">
          {/* Preview warna */}
          <span
            className="h-7 w-7 shrink-0 rounded-full ring-2 ring-white/40 shadow"
            style={{ backgroundColor: s.warna || "#94a3b8" }}
            title={s.warna}
          />
          {/* Angka */}
          <input
            type="number"
            min={1}
            value={s.nomor ?? ""}
            onChange={(e) =>
              updateItem(i, {
                nomor: e.target.value === "" ? 0 : Number(e.target.value),
              })
            }
            className="w-16 rounded-lg border border-white/30 bg-white/15 px-2 py-1.5 text-sm text-white outline-none focus:border-white/60"
            placeholder="#"
            title="Angka / nomor"
          />
          {/* Label / teks */}
          <input
            type="text"
            value={s.label || ""}
            onChange={(e) => updateItem(i, { label: e.target.value })}
            className="min-w-[120px] flex-1 rounded-lg border border-white/30 bg-white/15 px-2.5 py-1.5 text-sm text-white placeholder:text-white/50 outline-none focus:border-white/60"
            placeholder="Label (mis. Katalis)"
          />
          {/* Warna hex + color picker */}
          <div className="flex items-center gap-1.5">
            <input
              type="color"
              value={
                s.warna && /^#[0-9A-Fa-f]{6}$/.test(s.warna)
                  ? s.warna
                  : "#2E5949"
              }
              onChange={(e) => updateItem(i, { warna: e.target.value })}
              className="h-8 w-8 cursor-pointer rounded border border-white/30 bg-transparent p-0.5"
              title="Pilih warna"
            />
            <input
              type="text"
              value={s.warna || ""}
              onChange={(e) => updateItem(i, { warna: e.target.value })}
              className="w-[88px] rounded-lg border border-white/30 bg-white/15 px-2 py-1.5 font-mono text-xs text-white outline-none focus:border-white/60"
              placeholder="#HEX"
            />
          </div>
          {/* Hapus */}
          <button
            type="button"
            onClick={() => removeItem(i)}
            title="Hapus badge"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-500/80 text-white hover:bg-red-500 transition">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={addItem}
        className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-white/40 px-3 py-2.5 text-xs font-semibold text-white/90 hover:border-white/70 hover:bg-white/10 transition">
        <Plus className="h-3.5 w-3.5" /> Tambah Badge / SDG
      </button>
    </div>
  );
}

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

/**
 * Normalize various row formats → { cells: string[] }[]
 * Supports:
 *  - { cells: string[] }[]          (standar)
 *  - string[][]                     (array 2D)
 *  - { col_0, col_1, ... }[]        (hasil convertToFirestoreCompatible)
 *  - object dengan key numerik / item_N
 */
function normalizeTableRows(
  rows: unknown,
  colCount?: number,
): { cells: string[] }[] {
  const inferredCols = Math.max(colCount ?? 0, 1);

  const pad = (cells: string[], n: number) => {
    const next = cells.map((c) => String(c ?? ""));
    while (next.length < n) next.push("");
    return next.slice(0, Math.max(n, 1));
  };

  /** Extract ordered cell values from a row object */
  const cellsFromObject = (row: Record<string, unknown>): string[] => {
    if (Array.isArray(row.cells)) {
      return row.cells.map((c) => String(c ?? ""));
    }

    // col_0, col_1, … (Firestore conversion)
    const colKeys = Object.keys(row)
      .filter((k) => /^col_\d+$/.test(k))
      .sort((a, b) => Number(a.slice(4)) - Number(b.slice(4)));
    if (colKeys.length > 0) {
      return colKeys.map((k) => String(row[k] ?? ""));
    }

    // item_0, item_1, … (nested-array conversion)
    const itemKeys = Object.keys(row)
      .filter((k) => /^item_\d+$/.test(k))
      .sort((a, b) => Number(a.slice(5)) - Number(b.slice(5)));
    if (itemKeys.length > 0) {
      return itemKeys.map((k) => String(row[k] ?? ""));
    }

    // Fallback: object values in key order
    return Object.values(row).map((v) => String(v ?? ""));
  };

  if (!Array.isArray(rows) || rows.length === 0) {
    return [{ cells: pad([], inferredCols) }];
  }

  const extracted = rows.map((row) => {
    if (Array.isArray(row)) {
      return row.map((c) => String(c ?? ""));
    }
    if (row && typeof row === "object") {
      return cellsFromObject(row as Record<string, unknown>);
    }
    return [String(row ?? "")];
  });

  const maxCols = Math.max(inferredCols, ...extracted.map((c) => c.length), 1);

  return extracted.map((cells) => ({ cells: pad(cells, maxCols) }));
}

/** Full table editor: headers + rows, add/remove columns & rows */
function AdminDataTableEditor({
  headers,
  rows,
  onChange,
}: {
  headers: string[];
  rows: unknown;
  onChange: (headers: string[], rows: { cells: string[] }[]) => void;
}) {
  const cols = headers?.length > 0 ? headers : ["Kolom 1"];
  const normalized = normalizeTableRows(rows, cols.length);

  const emit = (nextHeaders: string[], nextRows: { cells: string[] }[]) => {
    onChange(nextHeaders, nextRows);
  };

  const updateHeader = (ci: number, value: string) => {
    const next = [...cols];
    next[ci] = value;
    emit(next, normalized);
  };

  const addColumn = () => {
    const nextHeaders = [...cols, `Kolom ${cols.length + 1}`];
    const nextRows = normalized.map((r) => ({
      cells: [...r.cells, ""],
    }));
    emit(nextHeaders, nextRows);
  };

  const removeColumn = (ci: number) => {
    if (cols.length <= 1) return;
    const nextHeaders = cols.filter((_, i) => i !== ci);
    const nextRows = normalized.map((r) => ({
      cells: r.cells.filter((_, i) => i !== ci),
    }));
    emit(nextHeaders, nextRows);
  };

  const updateCell = (ri: number, ci: number, value: string) => {
    const nextRows = normalized.map((r, i) =>
      i === ri ? { cells: r.cells.map((c, j) => (j === ci ? value : c)) } : r,
    );
    emit(cols, nextRows);
  };

  const addRow = () => {
    emit(cols, [...normalized, { cells: cols.map(() => "") }]);
  };

  const removeRow = (ri: number) => {
    if (normalized.length <= 1) return;
    emit(
      cols,
      normalized.filter((_, i) => i !== ri),
    );
  };

  return (
    <div className="space-y-2">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-purple-600">
        Edit Tabel (header & isi)
      </p>
      <div className="overflow-x-auto rounded-xl border border-purple-200 bg-white">
        <table className="w-full min-w-[320px] text-sm">
          <thead>
            <tr className="bg-purple-50/80">
              {cols.map((h, ci) => (
                <th
                  key={ci}
                  className="relative p-1.5 border-b border-purple-100 min-w-[120px]">
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      value={h}
                      onChange={(e) => updateHeader(ci, e.target.value)}
                      className="w-full rounded-lg border border-purple-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-purple-400"
                      placeholder={`Kolom ${ci + 1}`}
                    />
                    <button
                      type="button"
                      onClick={() => removeColumn(ci)}
                      disabled={cols.length <= 1}
                      title="Hapus kolom"
                      className="shrink-0 flex h-7 w-7 items-center justify-center rounded-lg text-red-500 hover:bg-red-50 disabled:opacity-30 disabled:cursor-not-allowed">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </th>
              ))}
              <th className="w-10 p-1.5 border-b border-purple-100">
                <button
                  type="button"
                  onClick={addColumn}
                  title="Tambah kolom"
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100 text-purple-600 hover:bg-purple-200 transition">
                  <Plus className="h-4 w-4" />
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {normalized.map((row, ri) => (
              <tr key={ri} className={ri % 2 ? "bg-slate-50/50" : ""}>
                {row.cells.map((cell, ci) => (
                  <td key={ci} className="p-1.5 border-b border-slate-100">
                    <input
                      type="text"
                      value={cell}
                      onChange={(e) => updateCell(ri, ci, e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-purple-400 focus:bg-purple-50/30"
                      placeholder="…"
                    />
                  </td>
                ))}
                <td className="p-1.5 border-b border-slate-100">
                  <button
                    type="button"
                    onClick={() => removeRow(ri)}
                    disabled={normalized.length <= 1}
                    title="Hapus baris"
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-red-500 hover:bg-red-50 disabled:opacity-30 disabled:cursor-not-allowed">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button
        type="button"
        onClick={addRow}
        className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-purple-200 px-3 py-2.5 text-xs font-semibold text-purple-600 hover:border-purple-400 hover:bg-purple-50 transition">
        <Plus className="h-3.5 w-3.5" /> Tambah Baris
      </button>
    </div>
  );
}

// function AdminMediaFields({
//   block,
//   onPatch,
// }: {
//   block: ContentBlock & {
//     mediaUrl?: string;
//     mediaType?: string;
//     caption?: string;
//     title?: string;
//   };
//   onPatch: (patch: Record<string, unknown>) => void;
// }) {
//   const mediaType = block.mediaType || "youtube";
//   return (
//     <div className="mt-3 space-y-2 rounded-xl border border-dashed border-purple-200 bg-purple-50/40 p-3">
//       <p className="text-[11px] font-semibold uppercase tracking-wide text-purple-600">
//         Media (YouTube / Gambar)
//       </p>
//       <div className="flex flex-wrap gap-2">
//         <button
//           type="button"
//           onClick={() => onPatch({ mediaType: "youtube" })}
//           className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
//             mediaType === "youtube"
//               ? "bg-purple-600 text-white"
//               : "bg-white text-slate-600 border border-slate-200"
//           }`}>
//           YouTube
//         </button>
//         <button
//           type="button"
//           onClick={() => onPatch({ mediaType: "image" })}
//           className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
//             mediaType === "image"
//               ? "bg-purple-600 text-white"
//               : "bg-white text-slate-600 border border-slate-200"
//           }`}>
//           Gambar
//         </button>
//         {block.mediaUrl && (
//           <button
//             type="button"
//             onClick={() => onPatch({ mediaUrl: "", mediaType: undefined })}
//             className="rounded-lg px-3 py-1.5 text-xs font-semibold text-red-600 bg-red-50">
//             Hapus media
//           </button>
//         )}
//       </div>
//       <AdminTextInput
//         label={mediaType === "image" ? "URL gambar" : "Link YouTube"}
//         value={block.mediaUrl || ""}
//         onChange={(v) =>
//           onPatch({ mediaUrl: v, mediaType: mediaType || "youtube" })
//         }
//       />
//       <AdminTextInput
//         label="Caption (opsional)"
//         value={block.caption || ""}
//         onChange={(v) => onPatch({ caption: v })}
//       />
//       {block.mediaUrl &&
//         renderMedia({
//           ...block,
//           mediaType: mediaType as "youtube" | "image",
//         } as ContentBlock)}
//     </div>
//   );
// }

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
  const urlLabel =
    mediaType === "image"
      ? "URL gambar"
      : mediaType === "link"
        ? "URL website / tautan"
        : "Link YouTube";
  return (
    <div className="mt-3 space-y-2 rounded-xl border border-dashed border-purple-200 bg-purple-50/40 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-purple-600">
        Media (YouTube / Gambar / Tautan)
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
        <button
          type="button"
          onClick={() => onPatch({ mediaType: "link" })}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
            mediaType === "link"
              ? "bg-purple-600 text-white"
              : "bg-white text-slate-600 border border-slate-200"
          }`}>
          Tautan / Website
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
        label={urlLabel}
        value={block.mediaUrl || ""}
        onChange={(v) =>
          onPatch({ mediaUrl: v, mediaType: mediaType || "youtube" })
        }
      />
      <AdminTextInput
        label={
          mediaType === "link" ? "Teks tombol (opsional)" : "Caption (opsional)"
        }
        value={block.caption || ""}
        onChange={(v) => onPatch({ caption: v })}
      />
      {block.mediaUrl &&
        renderMedia({
          ...block,
          mediaType: mediaType as "youtube" | "image" | "link",
        } as ContentBlock)}
    </div>
  );
}

function renderRows(rows: unknown) {
  console.log("renderRows called with:", rows);

  if (!rows) {
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

  if (!Array.isArray(rows)) {
    console.error("Rows is not an array:", rows);
    if (typeof rows === "object" && rows !== null) {
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
    const firstRow = rows[0];

    if (
      typeof firstRow === "object" &&
      firstRow !== null &&
      "cells" in firstRow
    ) {
      return (rows as { cells: string[] }[]).map((row, index) => {
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

    if (Array.isArray(firstRow)) {
      return (rows as string[][]).map((row, index) => {
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

    if (typeof firstRow === "object" && firstRow !== null) {
      console.log("Rows is array of objects, trying to extract values");
      const keys = Object.keys(firstRow);
      return (rows as Record<string, any>[]).map((row, index) => {
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

function KamusKimiaBlock({
  block,
  editMode,
  patch,
}: {
  block: {
    title?: string;
    intro?: string;
    terms: Array<{
      id: string;
      label: string;
      definisi?: string;
      imageUrl?: string;
    }>;
  };
  editMode: boolean;
  patch: (p: Record<string, unknown>) => void;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const terms = block.terms || [];
  const active = terms.find((t) => t.id === openId);

  return (
    <div className="rounded-2xl border-2 border-dashed border-amber-300/80 bg-amber-50/40 p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        {editMode ? (
          <AdminTextInput
            label="Judul"
            value={block.title || ""}
            onChange={(v) => patch({ title: v })}
          />
        ) : (
          <p className="text-sm font-bold text-slate-800">
            {block.title || "Corner: Kamus Kimia"}
          </p>
        )}
        <span className="shrink-0 rounded-full bg-amber-200/80 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-800">
          Baru
        </span>
      </div>

      {editMode ? (
        <div className="space-y-3">
          <AdminTextInput
            label="Intro"
            value={block.intro || ""}
            onChange={(v) => patch({ intro: v })}
          />
          {terms.map((t, i) => (
            <div
              key={t.id}
              className="relative space-y-2 rounded-xl border border-dashed border-purple-200 p-3">
              <button
                type="button"
                className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white text-xs"
                onClick={() => {
                  patch({ terms: terms.filter((_, idx) => idx !== i) });
                }}>
                ×
              </button>
              <AdminTextInput
                label="Label tombol"
                value={t.label}
                onChange={(v) => {
                  const next = terms.map((x, idx) =>
                    idx === i ? { ...x, label: v } : x,
                  );
                  patch({ terms: next });
                }}
              />
              <AdminTextArea
                label="Definisi"
                value={t.definisi || ""}
                onChange={(v) => {
                  const next = terms.map((x, idx) =>
                    idx === i ? { ...x, definisi: v } : x,
                  );
                  patch({ terms: next });
                }}
                rows={2}
              />
              <AdminTextInput
                label="URL Gambar (opsional)"
                value={t.imageUrl || ""}
                onChange={(v) => {
                  const next = terms.map((x, idx) =>
                    idx === i ? { ...x, imageUrl: v } : x,
                  );
                  patch({ terms: next });
                }}
              />
            </div>
          ))}
          <button
            type="button"
            className="btn-ghost text-xs w-full"
            onClick={() =>
              patch({
                terms: [
                  ...terms,
                  {
                    id: `term_${Date.now()}`,
                    label: "istilah baru",
                    definisi: "",
                    imageUrl: "",
                  },
                ],
              })
            }>
            + Tambah istilah
          </button>
        </div>
      ) : (
        <>
          {block.intro && (
            <p className="text-sm text-slate-600">{block.intro}</p>
          )}
          <div className="flex flex-wrap gap-2">
            {terms.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setOpenId((id) => (id === t.id ? null : t.id))}
                className={`rounded-xl border-2 px-3 py-1.5 text-sm font-medium transition ${
                  openId === t.id
                    ? "border-brand-green bg-brand-green-light text-brand-green-dark"
                    : "border-brand-green/40 bg-white text-brand-green hover:bg-brand-green-light/40"
                }`}>
                {t.label}
              </button>
            ))}
          </div>
          {active && (
            <div className="mt-2 space-y-2 rounded-xl border border-slate-100 bg-white p-3">
              <p className="text-sm font-semibold text-slate-800">
                {active.label}
              </p>
              {active.definisi && (
                <p className="text-sm text-slate-600 whitespace-pre-wrap">
                  {active.definisi}
                </p>
              )}
              {active.imageUrl && (
                <img
                  src={active.imageUrl}
                  alt={active.label}
                  className="max-h-48 w-full rounded-lg object-contain"
                />
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
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
    case "kamus-kimia": {
      // const terms =
      //   (
      //     block as {
      //       terms?: Array<{
      //         id: string;
      //         label: string;
      //         definisi?: string;
      //         imageUrl?: string;
      //       }>;
      //     }
      //   ).terms || [];

      // state lokal per instance: id istilah yang dibuka
      // Karena BlockRenderer function component, gunakan pola sederhana dengan answers
      // ATAU komponen kecil KamusKimiaView di bawah
      return (
        <KamusKimiaBlock
          block={
            block as {
              title?: string;
              intro?: string;
              terms: Array<{
                id: string;
                label: string;
                definisi?: string;
                imageUrl?: string;
              }>;
            }
          }
          editMode={editMode}
          patch={patch}
        />
      );
    }
    case "contoh-tap": {
      const rows =
        (block as { rows?: Array<{ label: string; contoh: string }> }).rows ||
        [];
      return (
        <div className="rounded-2xl border-2 border-dashed border-amber-300/80 bg-amber-50/40 p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            {editMode ? (
              <AdminTextInput
                label="Judul"
                value={block.title || ""}
                onChange={(v) => patch({ title: v })}
              />
            ) : (
              <p className="text-sm font-bold text-slate-800">{block.title}</p>
            )}
            <span className="shrink-0 rounded-full bg-amber-200/80 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-800">
              Baru
            </span>
          </div>
          {editMode ? (
            <div className="space-y-2">
              <AdminTextArea
                label="Intro"
                value={(block as { intro?: string }).intro || ""}
                onChange={(v) => patch({ intro: v })}
                rows={2}
              />
              {rows.map((r, i) => (
                <div key={i} className="grid gap-2 sm:grid-cols-2">
                  <AdminTextInput
                    label="Label"
                    value={r.label}
                    onChange={(v) => {
                      const next = rows.map((x, idx) =>
                        idx === i ? { ...x, label: v } : x,
                      );
                      patch({ rows: next });
                    }}
                  />
                  <AdminTextInput
                    label="Contoh"
                    value={r.contoh}
                    onChange={(v) => {
                      const next = rows.map((x, idx) =>
                        idx === i ? { ...x, contoh: v } : x,
                      );
                      patch({ rows: next });
                    }}
                  />
                </div>
              ))}
              <button
                type="button"
                className="btn-ghost text-xs"
                onClick={() =>
                  patch({
                    rows: [...rows, { label: "Komponen", contoh: "" }],
                  })
                }>
                + Baris
              </button>
            </div>
          ) : (
            <>
              {(block as { intro?: string }).intro && (
                <p className="text-sm text-slate-600">
                  {(block as { intro?: string }).intro}
                </p>
              )}
              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                <table className="w-full text-sm">
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={i} className="border-b border-slate-100">
                        <td className="w-28 bg-slate-50 px-3 py-2 font-semibold text-slate-700">
                          {r.label}
                        </td>
                        <td className="px-3 py-2 text-slate-700">{r.contoh}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      );
    }

    case "tap-terbimbing": {
      const fields =
        (
          block as {
            fields?: Array<{ key: string; label: string; starter?: string }>;
          }
        ).fields || [];
      const tapVal =
        (answers[block.id] as unknown as { tap?: Record<string, string> })
          ?.tap || {};

      return (
        <div className="rounded-2xl border-2 border-dashed border-amber-300/80 bg-amber-50/40 p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            {editMode ? (
              <AdminTextInput
                label="Judul"
                value={block.title || ""}
                onChange={(v) => patch({ title: v })}
              />
            ) : (
              <p className="text-sm font-bold text-slate-800">{block.title}</p>
            )}
            <span className="shrink-0 rounded-full bg-amber-200/80 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-800">
              Baru
            </span>
          </div>
          {editMode ? (
            <div className="space-y-2">
              <AdminTextArea
                label="Intro"
                value={(block as { intro?: string }).intro || ""}
                onChange={(v) => patch({ intro: v })}
                rows={2}
              />
              {fields.map((f, i) => (
                <div key={f.key} className="grid gap-2 sm:grid-cols-2">
                  <AdminTextInput
                    label="Label"
                    value={f.label}
                    onChange={(v) => {
                      const next = fields.map((x, idx) =>
                        idx === i ? { ...x, label: v } : x,
                      );
                      patch({ fields: next });
                    }}
                  />
                  <AdminTextInput
                    label="Kalimat pembuka / placeholder"
                    value={f.starter || ""}
                    onChange={(v) => {
                      const next = fields.map((x, idx) =>
                        idx === i ? { ...x, starter: v } : x,
                      );
                      patch({ fields: next });
                    }}
                  />
                </div>
              ))}
            </div>
          ) : (
            <>
              {(block as { intro?: string }).intro && (
                <p className="text-sm text-slate-600">
                  {(block as { intro?: string }).intro}
                </p>
              )}
              <div className="space-y-2">
                {fields.map((f) => (
                  <div key={f.key}>
                    <label className="mb-1 block text-xs font-semibold text-slate-500">
                      {f.label}
                    </label>
                    <textarea
                      className="input-base min-h-[72px]"
                      disabled={readOnly}
                      placeholder={f.starter || `${f.label}: ...`}
                      value={tapVal[f.key] || ""}
                      onChange={(e) =>
                        onUpdate(block.id, {
                          tap: { ...tapVal, [f.key]: e.target.value },
                        } as AnswerValue)
                      }
                    />
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      );
    }

    case "kuis-akhir": {
      const bsItems =
        (
          block as {
            bsItems?: Array<{
              id: string;
              pernyataan: string;
              jawabanBenar: boolean;
              feedbackBenar?: string;
              feedbackSalah?: string;
            }>;
          }
        ).bsItems || [];
      const rumpangItems =
        (
          block as {
            rumpangItems?: Array<{ id: string; prompt: string }>;
          }
        ).rumpangItems || [];

      return (
        <div className="rounded-2xl border-2 border-dashed border-amber-300/80 bg-amber-50/40 p-4 space-y-4">
          <div className="flex items-start justify-between gap-2">
            {editMode ? (
              <AdminTextInput
                label="Judul"
                value={block.title || ""}
                onChange={(v) => patch({ title: v })}
              />
            ) : (
              <p className="text-sm font-bold text-slate-800">{block.title}</p>
            )}
            <span className="shrink-0 rounded-full bg-amber-200/80 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-800">
              Baru
            </span>
          </div>

          {editMode ? (
            <div className="space-y-3">
              <AdminTextArea
                label="Intro"
                value={(block as { intro?: string }).intro || ""}
                onChange={(v) => patch({ intro: v })}
                rows={2}
              />
              <p className="text-xs font-semibold text-purple-600">
                Benar / Salah
              </p>
              {bsItems.map((it, i) => (
                <div
                  key={it.id}
                  className="space-y-2 rounded-xl border border-dashed border-purple-200 p-3">
                  <AdminTextArea
                    label={`Pernyataan ${i + 1}`}
                    value={it.pernyataan}
                    onChange={(v) => {
                      const next = bsItems.map((x, idx) =>
                        idx === i ? { ...x, pernyataan: v } : x,
                      );
                      patch({ bsItems: next });
                    }}
                    rows={2}
                  />
                  <select
                    className="input-base"
                    value={it.jawabanBenar ? "benar" : "salah"}
                    onChange={(e) => {
                      const next = bsItems.map((x, idx) =>
                        idx === i
                          ? { ...x, jawabanBenar: e.target.value === "benar" }
                          : x,
                      );
                      patch({ bsItems: next });
                    }}>
                    <option value="benar">Kunci: Benar</option>
                    <option value="salah">Kunci: Salah</option>
                  </select>
                </div>
              ))}
              <button
                type="button"
                className="btn-ghost text-xs"
                onClick={() =>
                  patch({
                    bsItems: [
                      ...bsItems,
                      {
                        id: `kabs_${Date.now()}`,
                        pernyataan: "",
                        jawabanBenar: true,
                      },
                    ],
                  })
                }>
                + Soal B/S
              </button>
              <p className="text-xs font-semibold text-purple-600">
                Isian rumpang
              </p>
              {rumpangItems.map((it, i) => (
                <AdminTextArea
                  key={it.id}
                  label={`Rumpang ${i + 1}`}
                  value={it.prompt}
                  onChange={(v) => {
                    const next = rumpangItems.map((x, idx) =>
                      idx === i ? { ...x, prompt: v } : x,
                    );
                    patch({ rumpangItems: next });
                  }}
                  rows={2}
                />
              ))}
              <button
                type="button"
                className="btn-ghost text-xs"
                onClick={() =>
                  patch({
                    rumpangItems: [
                      ...rumpangItems,
                      { id: `kar_${Date.now()}`, prompt: "" },
                    ],
                  })
                }>
                + Isian rumpang
              </button>
            </div>
          ) : (
            <>
              {(block as { intro?: string }).intro && (
                <p className="text-sm text-slate-600">
                  {(block as { intro?: string }).intro}
                </p>
              )}
              {bsItems.map((it, i) => {
                const chosen = answers[it.id] as string | undefined;
                const showFb = chosen === "benar" || chosen === "salah";
                const isCorrect =
                  (chosen === "benar" && it.jawabanBenar) ||
                  (chosen === "salah" && !it.jawabanBenar);
                return (
                  <div key={it.id} className="space-y-2">
                    <p className="text-sm font-medium text-slate-800">
                      {i + 1}. {it.pernyataan}
                    </p>
                    <div className="flex gap-2">
                      {(["benar", "salah"] as const).map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          disabled={readOnly}
                          onClick={() => onUpdate(it.id, opt)}
                          className={`rounded-xl border-2 px-4 py-1.5 text-sm font-semibold ${
                            chosen === opt
                              ? "border-brand-green bg-brand-green-light text-brand-green-dark"
                              : "border-slate-200 bg-white text-slate-600"
                          }`}>
                          {opt === "benar" ? "Benar" : "Salah"}
                        </button>
                      ))}
                    </div>
                    {showFb && (
                      <p
                        className={`text-xs font-medium ${
                          isCorrect ? "text-emerald-700" : "text-amber-700"
                        }`}>
                        {isCorrect
                          ? it.feedbackBenar || "Benar!"
                          : it.feedbackSalah || "Kurang tepat."}
                      </p>
                    )}
                  </div>
                );
              })}
              {rumpangItems.map((it) => (
                <div key={it.id} className="space-y-1">
                  <p className="text-sm text-slate-700">{it.prompt}</p>
                  <MultiTextAnswer
                    value={(answers[it.id] as string | string[]) || ""}
                    onChange={(v) => onUpdate(it.id, v)}
                    disabled={readOnly}
                    rows={2}
                    savedAt={savedAt}
                  />
                </div>
              ))}
            </>
          )}
        </div>
      );
    }

    case "refleksi-pemahaman": {
      const konsep =
        (block as { konsep?: Array<{ id: string; label: string }> }).konsep ||
        [];
      const max = (block as { skalaMax?: number }).skalaMax || 4;
      const skala =
        (answers[block.id] as unknown as Record<string, number>) || {};
      const catatanId = (block as { catatanId?: string }).catatanId;

      return (
        <div className="rounded-2xl border-2 border-dashed border-amber-300/80 bg-amber-50/40 p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            {editMode ? (
              <AdminTextInput
                label="Judul"
                value={block.title || ""}
                onChange={(v) => patch({ title: v })}
              />
            ) : (
              <p className="text-sm font-bold text-slate-800">{block.title}</p>
            )}
            <span className="shrink-0 rounded-full bg-amber-200/80 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-800">
              Baru
            </span>
          </div>

          {editMode ? (
            <div className="space-y-2">
              <AdminTextInput
                label="Intro"
                value={(block as { intro?: string }).intro || ""}
                onChange={(v) => patch({ intro: v })}
              />
              {konsep.map((k, i) => (
                <AdminTextInput
                  key={k.id}
                  label={`Konsep ${i + 1}`}
                  value={k.label}
                  onChange={(v) => {
                    const next = konsep.map((x, idx) =>
                      idx === i ? { ...x, label: v } : x,
                    );
                    patch({ konsep: next });
                  }}
                />
              ))}
              <button
                type="button"
                className="btn-ghost text-xs"
                onClick={() =>
                  patch({
                    konsep: [
                      ...konsep,
                      { id: `k_${Date.now()}`, label: "Konsep baru" },
                    ],
                  })
                }>
                + Konsep
              </button>
              <AdminTextInput
                label="Placeholder catatan"
                value={
                  (block as { catatanPlaceholder?: string })
                    .catatanPlaceholder || ""
                }
                onChange={(v) => patch({ catatanPlaceholder: v })}
              />
            </div>
          ) : (
            <>
              {(block as { intro?: string }).intro && (
                <p className="text-sm text-slate-600">
                  {(block as { intro?: string }).intro}
                </p>
              )}
              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b">
                      <th className="px-3 py-2 text-left font-semibold text-slate-700">
                        Konsep
                      </th>
                      {Array.from({ length: max }, (_, n) => (
                        <th
                          key={n}
                          className="px-2 py-2 text-center font-semibold text-slate-600 w-10">
                          {n + 1}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {konsep.map((k) => (
                      <tr key={k.id} className="border-b border-slate-100">
                        <td className="px-3 py-2 text-slate-700">{k.label}</td>
                        {Array.from({ length: max }, (_, n) => {
                          const val = n + 1;
                          const selected = skala[k.id] === val;
                          return (
                            <td key={val} className="px-1 py-2 text-center">
                              <button
                                type="button"
                                disabled={readOnly}
                                onClick={() =>
                                  onUpdate(block.id, {
                                    ...skala,
                                    [k.id]: val,
                                  } as AnswerValue)
                                }
                                className={`h-7 w-7 rounded-full border text-xs font-semibold transition ${
                                  selected
                                    ? "border-brand-green bg-brand-green text-white"
                                    : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                                }`}>
                                {val}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {catatanId && (
                <MultiTextAnswer
                  value={(answers[catatanId] as string | string[]) || ""}
                  onChange={(v) => onUpdate(catatanId, v)}
                  disabled={readOnly}
                  rows={3}
                  savedAt={savedAt}
                  hint={
                    (block as { catatanPlaceholder?: string })
                      .catatanPlaceholder
                  }
                />
              )}
            </>
          )}
        </div>
      );
    }

    case "kalimat-rumpang":
      return (
        <div className="rounded-2xl border-2 border-dashed border-amber-300/80 bg-amber-50/40 p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            {editMode ? (
              <AdminTextInput
                label="Judul (bisa diubah bebas)"
                value={block.title || ""}
                onChange={(v) => patch({ title: v })}
              />
            ) : (
              <p className="text-sm font-bold text-slate-800">
                {block.title || "Kalimat rumpang"}
              </p>
            )}
            <span className="shrink-0 rounded-full bg-amber-200/80 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-800">
              Baru
            </span>
          </div>

          {editMode ? (
            <div className="space-y-2">
              <AdminTextArea
                label="Teks / kalimat rumpang"
                value={(block as { prompt?: string }).prompt || ""}
                onChange={(v) => patch({ prompt: v })}
                rows={3}
              />
              <AdminTextInput
                label="Hint (opsional)"
                value={(block as { hint?: string }).hint || ""}
                onChange={(v) => patch({ hint: v })}
              />
            </div>
          ) : (
            <>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">
                {(block as { prompt?: string }).prompt}
              </p>
              <MultiTextAnswer
                value={(answers[block.id] as string | string[]) || ""}
                onChange={(v) => onUpdate(block.id, v)}
                disabled={readOnly}
                rows={3}
                savedAt={savedAt}
                hint={(block as { hint?: string }).hint}
              />
            </>
          )}
        </div>
      );
    case "materi-card":
      return (
        <div className="rounded-2xl border-2 border-dashed border-amber-300/80 bg-amber-50/40 p-4 space-y-2">
          <div className="flex items-start justify-between gap-2">
            {editMode ? (
              <AdminTextInput
                label="Judul"
                value={block.title || ""}
                onChange={(v) => patch({ title: v })}
              />
            ) : (
              <p className="text-sm font-bold text-slate-800">{block.title}</p>
            )}
            <span className="shrink-0 rounded-full bg-amber-200/80 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-800">
              Baru
            </span>
          </div>
          {editMode ? (
            <div className="space-y-2">
              <AdminTextArea
                label="Teks / deskripsi"
                value={(block as { body?: string }).body || ""}
                onChange={(v) => patch({ body: v })}
                rows={3}
              />
              <AdminTextInput
                label="URL Gambar"
                value={(block as { imageUrl?: string }).imageUrl || ""}
                onChange={(v) => patch({ imageUrl: v })}
              />
              <AdminTextInput
                label="Caption gambar"
                value={(block as { imageCaption?: string }).imageCaption || ""}
                onChange={(v) => patch({ imageCaption: v })}
              />
            </div>
          ) : (
            <>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">
                {(block as { body?: string }).body}
              </p>
              <div className="mt-2 overflow-hidden rounded-xl bg-emerald-50/90">
                {(block as { imageUrl?: string }).imageUrl ? (
                  <img
                    src={(block as { imageUrl?: string }).imageUrl}
                    alt={block.title || ""}
                    className="max-h-64 w-full object-contain"
                  />
                ) : (
                  <div className="flex min-h-[100px] items-center justify-center px-3 py-6 text-center text-xs text-slate-500">
                    {(block as { imageCaption?: string }).imageCaption ||
                      "Gambar belum diisi Super Admin"}
                  </div>
                )}
                {(block as { imageCaption?: string }).imageCaption &&
                  (block as { imageUrl?: string }).imageUrl && (
                    <p className="px-3 py-2 text-center text-xs text-slate-500">
                      {(block as { imageCaption?: string }).imageCaption}
                    </p>
                  )}
              </div>
            </>
          )}
        </div>
      );

    case "tabel-isian": {
      const headers = (block as { headers: string[] }).headers || [];
      const rows =
        (
          block as {
            rows: Array<Array<{ value: string; editable: boolean }>>;
          }
        ).rows || [];
      const saved =
        (answers[block.id] as { cells?: string[][] } | undefined)?.cells || [];

      return (
        <div className="rounded-2xl border-2 border-dashed border-amber-300/80 bg-amber-50/40 p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            {editMode ? (
              <AdminTextInput
                label="Judul tabel"
                value={block.title || ""}
                onChange={(v) => patch({ title: v })}
              />
            ) : (
              <p className="text-sm font-bold text-slate-800">{block.title}</p>
            )}
            <span className="shrink-0 rounded-full bg-amber-200/80 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-800">
              Baru
            </span>
          </div>

          {editMode && (
            <p className="text-[11px] text-purple-600">
              Edit struktur tabel lewat JSON di bawah (headers & rows) atau
              perluas form admin nanti. Sel editable=true = diisi siswa.
            </p>
          )}

          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-amber-50">
                  {headers.map((h) => (
                    <th
                      key={h}
                      className="px-3 py-2 text-left font-semibold text-slate-700 border-b">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, ri) => (
                  <tr key={ri}>
                    {row.map((cell, ci) => (
                      <td
                        key={ci}
                        className={`border-b border-slate-100 px-2 py-1.5 ${
                          cell.editable ? "bg-amber-50/80" : ""
                        }`}>
                        {cell.editable && !editMode ? (
                          <input
                            className="w-full rounded-lg border border-amber-200 bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand-green"
                            disabled={readOnly}
                            placeholder="[?]"
                            value={saved[ri]?.[ci] ?? ""}
                            onChange={(e) => {
                              const next = rows.map((r, rii) =>
                                r.map((c, cii) =>
                                  rii === ri && cii === ci
                                    ? e.target.value
                                    : (saved[rii]?.[cii] ?? ""),
                                ),
                              );
                              // pastikan dimensi
                              rows.forEach((r, rii) => {
                                if (!next[rii]) next[rii] = r.map(() => "");
                                r.forEach((_, cii) => {
                                  if (next[rii][cii] === undefined)
                                    next[rii][cii] = saved[rii]?.[cii] ?? "";
                                });
                              });
                              next[ri][ci] = e.target.value;
                              onUpdate(block.id, { cells: next });
                            }}
                          />
                        ) : (
                          <span className="text-slate-700">
                            {cell.value || (cell.editable ? "[?]" : "")}
                          </span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {(block as { pertanyaanText?: string }).pertanyaanText && (
            <div>
              <p className="mb-2 text-sm text-slate-700">
                {(block as { pertanyaanText?: string }).pertanyaanText}
              </p>
              {!editMode &&
                (block as { pertanyaanId?: string }).pertanyaanId && (
                  <MultiTextAnswer
                    value={
                      (answers[
                        (block as { pertanyaanId: string }).pertanyaanId
                      ] as string | string[]) || ""
                    }
                    onChange={(v) =>
                      onUpdate(
                        (block as { pertanyaanId: string }).pertanyaanId,
                        v,
                      )
                    }
                    disabled={readOnly}
                    rows={3}
                    savedAt={savedAt}
                  />
                )}
            </div>
          )}
        </div>
      );
    }

    case "soal-variatif": {
      const matching = (
        block as {
          matching?: {
            left: Array<{ id: string; text: string }>;
            right: Array<{ id: string; text: string }>;
          };
        }
      ).matching;
      const pg =
        (
          block as {
            pg?: Array<{
              id: string;
              pertanyaan: string;
              options: Array<{ id: string; text: string }>;
            }>;
          }
        ).pg || [];

      const matchAns =
        (answers[`${block.id}__match`] as Record<string, string>) || {};
      const pgAns =
        (answers[`${block.id}__pg`] as Record<string, string>) || {};

      return (
        <div className="rounded-2xl border-2 border-dashed border-amber-300/80 bg-amber-50/40 p-4 space-y-4">
          <div className="flex items-center justify-between gap-2">
            {editMode ? (
              <AdminTextInput
                label="Judul"
                value={block.title || ""}
                onChange={(v) => patch({ title: v })}
              />
            ) : (
              <p className="text-sm font-bold text-slate-800">{block.title}</p>
            )}
            <span className="shrink-0 rounded-full bg-amber-200/80 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-800">
              Baru
            </span>
          </div>

          {editMode ? (
            <div className="space-y-2">
              <AdminTextArea
                label="Intro"
                value={(block as { intro?: string }).intro || ""}
                onChange={(v) => patch({ intro: v })}
                rows={2}
              />
              <p className="text-[11px] text-purple-600">
                Struktur matching & PG bisa diedit lewat Simpan konten / JSON
                lanjutan. Default sudah punya contoh 2 pasangan + 1 PG.
              </p>
            </div>
          ) : (
            <>
              {(block as { intro?: string }).intro && (
                <p className="text-sm text-slate-600">
                  {(block as { intro?: string }).intro}
                </p>
              )}

              {/* Pasangkan */}
              {matching && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Pasangkan
                  </p>
                  {matching.left.map((L) => (
                    <div
                      key={L.id}
                      className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
                      <span className="min-w-[140px] text-sm font-medium text-slate-800">
                        {L.text}
                      </span>
                      <select
                        className="input-base flex-1"
                        disabled={readOnly}
                        value={matchAns[L.id] || ""}
                        onChange={(e) =>
                          onUpdate(`${block.id}__match`, {
                            ...matchAns,
                            [L.id]: e.target.value,
                          })
                        }>
                        <option value="">— Pilih —</option>
                        {matching.right.map((R) => (
                          <option key={R.id} value={R.id}>
                            {R.text}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              )}

              {/* PG */}
              {pg.map((q, qi) => (
                <div key={q.id} className="space-y-2">
                  <p className="text-sm font-medium text-slate-800">
                    {qi + 1}. {q.pertanyaan}
                  </p>
                  <div className="space-y-1.5">
                    {q.options.map((opt) => (
                      <label
                        key={opt.id}
                        className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm transition ${
                          pgAns[q.id] === opt.id
                            ? "border-brand-green bg-brand-green-light/50"
                            : "border-slate-200 bg-white hover:bg-slate-50"
                        }`}>
                        <input
                          type="radio"
                          name={q.id}
                          disabled={readOnly}
                          checked={pgAns[q.id] === opt.id}
                          onChange={() =>
                            onUpdate(`${block.id}__pg`, {
                              ...pgAns,
                              [q.id]: opt.id,
                            })
                          }
                        />
                        {opt.text}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      );
    }
    case "gambar-utama":
      return (
        <div className="rounded-2xl border-2 border-dashed border-amber-300/80 bg-amber-50/40 p-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            {editMode ? (
              <AdminTextInput
                label="Judul"
                value={block.title || ""}
                onChange={(v) => patch({ title: v })}
              />
            ) : (
              <p className="text-sm font-bold text-slate-800">
                {block.title || "Gambar utama / infografis masalah"}
              </p>
            )}
            <span className="shrink-0 rounded-full bg-amber-200/80 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-800">
              Baru
            </span>
          </div>
          {editMode ? (
            <div className="space-y-2">
              <AdminTextInput
                label="URL Gambar"
                value={(block as { imageUrl?: string }).imageUrl || ""}
                onChange={(v) => patch({ imageUrl: v })}
              />
              <AdminTextArea
                label="Caption / deskripsi"
                value={(block as { caption?: string }).caption || ""}
                onChange={(v) => patch({ caption: v })}
                rows={2}
              />
            </div>
          ) : (block as { imageUrl?: string }).imageUrl ? (
            <figure className="overflow-hidden rounded-xl bg-white/80">
              <img
                src={(block as { imageUrl?: string }).imageUrl}
                alt={block.title || "Infografis"}
                className="max-h-80 w-full object-contain"
              />
              {(block as { caption?: string }).caption && (
                <figcaption className="px-3 py-2 text-center text-xs text-slate-600">
                  {(block as { caption?: string }).caption}
                </figcaption>
              )}
            </figure>
          ) : (
            <div className="flex min-h-[120px] items-center justify-center rounded-xl bg-emerald-50/80 px-4 text-center text-sm text-slate-500">
              {(block as { caption?: string }).caption ||
                "Gambar belum diunggah Super Admin"}
            </div>
          )}
        </div>
      );

    case "tahukah-kamu":
      return (
        <div className="rounded-2xl border-2 border-dashed border-amber-300/80 bg-amber-50/50 p-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            {editMode ? (
              <AdminTextInput
                label="Judul corner"
                value={block.title || ""}
                onChange={(v) => patch({ title: v })}
              />
            ) : (
              <p className="text-sm font-bold text-slate-800">
                {block.title || "Corner: Tahukah Kamu?"}
              </p>
            )}
            <span className="shrink-0 rounded-full bg-amber-200/80 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-800">
              Baru
            </span>
          </div>
          {editMode ? (
            <div className="space-y-2">
              <AdminTextArea
                label="Isi fakta"
                value={(block as { body?: string }).body || ""}
                onChange={(v) => patch({ body: v })}
                rows={3}
              />
              <AdminTextInput
                label="Label SDG (contoh: SDG 2 / 11 / 12)"
                value={(block as { sdgLabel?: string }).sdgLabel || ""}
                onChange={(v) => patch({ sdgLabel: v })}
              />
            </div>
          ) : (
            <>
              <p className="text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">
                {(block as { body?: string }).body}
              </p>
              {(block as { sdgLabel?: string }).sdgLabel && (
                <div className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-center text-xs font-medium text-slate-600">
                  {(block as { sdgLabel?: string }).sdgLabel}
                </div>
              )}
            </>
          )}
        </div>
      );

    case "benar-salah": {
      const items =
        (
          block as {
            items?: Array<{
              id: string;
              pernyataan: string;
              jawabanBenar: boolean;
              feedbackBenar?: string;
              feedbackSalah?: string;
            }>;
          }
        ).items || [];

      return (
        <div className="rounded-2xl border-2 border-dashed border-amber-300/80 bg-amber-50/40 p-4 space-y-4">
          <div className="flex items-center justify-between gap-2">
            {editMode ? (
              <AdminTextInput
                label="Judul"
                value={block.title || ""}
                onChange={(v) => patch({ title: v })}
              />
            ) : (
              <p className="text-sm font-bold text-slate-800">
                {block.title || "Soal Benar / Salah"}
              </p>
            )}
            <span className="shrink-0 rounded-full bg-amber-200/80 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-800">
              Baru
            </span>
          </div>

          {editMode ? (
            <div className="space-y-3">
              <AdminTextInput
                label="Intro"
                value={(block as { intro?: string }).intro || ""}
                onChange={(v) => patch({ intro: v })}
              />
              {items.map((it, i) => (
                <div
                  key={it.id || i}
                  className="space-y-2 rounded-xl border border-dashed border-purple-200 p-3 relative">
                  <button
                    type="button"
                    className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white text-xs"
                    onClick={() => {
                      const next = items.filter((_, idx) => idx !== i);
                      patch({ items: next });
                    }}>
                    ×
                  </button>
                  <AdminTextArea
                    label={`Pernyataan ${i + 1}`}
                    value={it.pernyataan}
                    onChange={(v) => {
                      const next = items.map((x, idx) =>
                        idx === i ? { ...x, pernyataan: v } : x,
                      );
                      patch({ items: next });
                    }}
                    rows={2}
                  />
                  <label className="label-base">Kunci jawaban</label>
                  <select
                    className="input-base"
                    value={it.jawabanBenar ? "benar" : "salah"}
                    onChange={(e) => {
                      const next = items.map((x, idx) =>
                        idx === i
                          ? { ...x, jawabanBenar: e.target.value === "benar" }
                          : x,
                      );
                      patch({ items: next });
                    }}>
                    <option value="benar">Benar</option>
                    <option value="salah">Salah</option>
                  </select>
                  <AdminTextInput
                    label="Feedback jika benar"
                    value={it.feedbackBenar || ""}
                    onChange={(v) => {
                      const next = items.map((x, idx) =>
                        idx === i ? { ...x, feedbackBenar: v } : x,
                      );
                      patch({ items: next });
                    }}
                  />
                  <AdminTextInput
                    label="Feedback jika salah"
                    value={it.feedbackSalah || ""}
                    onChange={(v) => {
                      const next = items.map((x, idx) =>
                        idx === i ? { ...x, feedbackSalah: v } : x,
                      );
                      patch({ items: next });
                    }}
                  />
                </div>
              ))}
              <button
                type="button"
                className="btn-ghost text-xs w-full"
                onClick={() =>
                  patch({
                    items: [
                      ...items,
                      {
                        id: `bs_${Date.now()}`,
                        pernyataan: "",
                        jawabanBenar: true,
                        feedbackBenar: "Benar!",
                        feedbackSalah: "Kurang tepat.",
                      },
                    ],
                  })
                }>
                + Tambah pernyataan
              </button>
            </div>
          ) : (
            <>
              {(block as { intro?: string }).intro && (
                <p className="text-sm text-slate-600">
                  {(block as { intro?: string }).intro}
                </p>
              )}
              <div className="space-y-4">
                {items.map((it, i) => {
                  const ansKey = it.id;
                  const chosen = answers[ansKey] as string | undefined; // "benar" | "salah"
                  const showFb = chosen === "benar" || chosen === "salah";
                  const isCorrect =
                    (chosen === "benar" && it.jawabanBenar) ||
                    (chosen === "salah" && !it.jawabanBenar);
                  return (
                    <div key={ansKey || i} className="space-y-2">
                      <p className="text-sm font-medium text-slate-800">
                        {i + 1}. {it.pernyataan}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {(["benar", "salah"] as const).map((opt) => (
                          <button
                            key={opt}
                            type="button"
                            disabled={readOnly}
                            onClick={() => onUpdate(ansKey, opt)}
                            className={`rounded-xl border-2 px-4 py-1.5 text-sm font-semibold transition ${
                              chosen === opt
                                ? opt === "benar"
                                  ? "border-brand-green bg-brand-green-light text-brand-green-dark"
                                  : "border-red-300 bg-red-50 text-red-700"
                                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                            }`}>
                            {opt === "benar" ? "Benar" : "Salah"}
                          </button>
                        ))}
                      </div>
                      {showFb && (
                        <p
                          className={`text-xs font-medium ${
                            isCorrect ? "text-emerald-700" : "text-amber-700"
                          }`}>
                          {isCorrect
                            ? it.feedbackBenar || "Benar!"
                            : it.feedbackSalah || "Kurang tepat."}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      );
    }
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
              <MultiTextAnswer
                value={(answers[block.id] as string | string[]) || ""}
                onChange={(v) => onUpdate(block.id, v)}
                disabled={readOnly}
                hint={block.hint}
                savedAt={savedAt}
              />
              <ExtraAnswers
                blockId={block.id}
                answers={answers}
                onUpdate={onUpdate}
                disabled={readOnly}
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
                  headers={
                    (answers[block.id] as { headers?: string[] } | undefined)
                      ?.headers || block.headers
                  }
                  title={block.title}
                  rows={
                    (answers[block.id] as { rows?: string[][] } | undefined)
                      ?.rows ||
                    Array.from({ length: block.rowCount }, () =>
                      block.headers.map(() => ""),
                    )
                  }
                  onChange={(rows, headers) =>
                    onUpdate(block.id, { rows, headers })
                  }
                  disabled={readOnly}
                />
              </div>
              {block.perencanaanId && (
                <div className="card">
                  <p className="mb-2.5 text-sm font-medium text-slate-700">
                    {block.perencanaanText}
                  </p>
                  <MultiTextAnswer
                    value={
                      (answers[block.perencanaanId] as string | string[]) || ""
                    }
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
            <div className="space-y-3">
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
              <AdminDataTableEditor
                headers={block.headers || []}
                rows={block.rows}
                onChange={(headers, rows) => patch({ headers, rows })}
              />
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
                      {(block.headers || []).map((h: string, hi: number) => (
                        <th
                          key={hi}
                          className="whitespace-nowrap px-3 py-2.5 text-left font-semibold text-slate-700 border-b border-slate-200">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {renderRows(
                      normalizeTableRows(
                        block.rows,
                        (block.headers || []).length,
                      ),
                    )}
                  </tbody>
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
                    URL foto grafik/perhitungan tulis tangan (opsional)
                  </p>
                  <UrlInput
                    value={(answers[`${block.id}_img`] as string) || ""}
                    onChange={(url) => onUpdate(`${block.id}_img`, url)}
                    disabled={readOnly}
                    placeholder="https://drive.google.com/file/d/..."
                    label="URL Foto"
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
              <MultiTextAnswer
                value={(answers[block.id] as string | string[]) || ""}
                onChange={(v) => onUpdate(block.id, v)}
                disabled={readOnly}
                rows={4}
                savedAt={savedAt}
              />
              {block.allowImage && (
                <div className="mt-3">
                  <p className="mb-2 text-xs font-medium text-slate-500">
                    URL foto grafik/perhitungan tulis tangan (opsional)
                  </p>
                  <UrlInput
                    value={(answers[`${block.id}_img`] as string) || ""}
                    onChange={(url) => onUpdate(`${block.id}_img`, url)}
                    disabled={readOnly}
                    placeholder="https://drive.google.com/file/d/..."
                    label="URL Foto"
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
              <UrlInput
                value={(answers[block.id] as string) || ""}
                onChange={(url) => onUpdate(block.id, url)}
                disabled={readOnly}
                placeholder="https://drive.google.com/file/d/..."
                label="URL File"
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
              <p className="text-[11px] font-semibold uppercase tracking-wide text-purple-600">
                Pilihan Alternatif
              </p>
              {(block.options || []).map((opt, i) => (
                <div
                  key={i}
                  className="space-y-2 rounded-xl border border-dashed border-purple-200 p-3 relative group/opt">
                  <button
                    type="button"
                    onClick={() => {
                      const next = [...(block.options || [])];
                      next.splice(i, 1);
                      patch({ options: next });
                    }}
                    className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white opacity-0 group-hover/opt:opacity-100 transition-opacity shadow">
                    <Trash2 className="h-3 w-3" />
                  </button>
                  <AdminTextInput
                    label={`Label Opsi ${i + 1}`}
                    value={opt.label || ""}
                    onChange={(v) => {
                      const next = [...(block.options || [])];
                      next[i] = { ...next[i], label: v };
                      patch({ options: next });
                    }}
                  />
                  <AdminTextArea
                    label={`Deskripsi Opsi ${i + 1}`}
                    value={opt.deskripsi || ""}
                    onChange={(v) => {
                      const next = [...(block.options || [])];
                      next[i] = { ...next[i], deskripsi: v };
                      patch({ options: next });
                    }}
                    rows={2}
                  />
                </div>
              ))}
              <button
                type="button"
                onClick={() => {
                  const nextId = String.fromCharCode(
                    97 + (block.options?.length || 0),
                  ); // a, b, c...
                  patch({
                    options: [
                      ...(block.options || []),
                      {
                        id: nextId,
                        label: `Alternatif ${nextId.toUpperCase()}`,
                        deskripsi: "",
                      },
                    ],
                  });
                }}
                className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-purple-200 px-3 py-2.5 text-xs font-semibold text-purple-600 hover:border-purple-400 hover:bg-purple-50 transition">
                <Plus className="h-3.5 w-3.5" /> Tambah Opsi
              </button>
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
                <MultiTextAnswer
                  value={(answers[block.alasanId] as string | string[]) || ""}
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

    case "penalaran-level": {
      const extraLevels = block.levels || [];
      const defaultLevelColors = [
        "bg-purple-100 text-purple-600",
        "bg-rose-100 text-rose-600",
        "bg-cyan-100 text-cyan-600",
        "bg-indigo-100 text-indigo-600",
      ];
      return (
        <div className="card">
          {editMode ? (
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-purple-600">
                Level Representasi — 3 Level Utama
              </p>
              {/* Built-in 3 levels */}
              <div className="space-y-2 rounded-xl border border-slate-200 p-3">
                <AdminTextInput
                  label="Judul Level 1"
                  value="Makroskopik"
                  onChange={() => {}}
                />
                <AdminTextArea
                  label="Deskripsi Makroskopik"
                  value={block.makroskopik || ""}
                  onChange={(v) => patch({ makroskopik: v })}
                />
              </div>
              <div className="space-y-2 rounded-xl border border-slate-200 p-3">
                <AdminTextInput
                  label="Judul Level 2"
                  value="Submikroskopik"
                  onChange={() => {}}
                />
                <AdminTextArea
                  label="Deskripsi Submikroskopik"
                  value={block.submikroskopik || ""}
                  onChange={(v) => patch({ submikroskopik: v })}
                />
              </div>
              <div className="space-y-2 rounded-xl border border-slate-200 p-3">
                <AdminTextInput
                  label="Judul Level 3"
                  value="Simbolik"
                  onChange={() => {}}
                />
                <AdminTextArea
                  label="Deskripsi Simbolik"
                  value={block.simbolik || ""}
                  onChange={(v) => patch({ simbolik: v })}
                />
              </div>

              {/* Dynamic extra levels */}
              {extraLevels.length > 0 && (
                <p className="text-xs font-semibold uppercase tracking-wide text-purple-600 pt-2">
                  Level Tambahan
                </p>
              )}
              {extraLevels.map((lvl, li) => (
                <div
                  key={li}
                  className="space-y-2 rounded-xl border border-dashed border-purple-200 bg-purple-50/30 p-3 relative group/lvl">
                  <button
                    type="button"
                    onClick={() => {
                      const next = extraLevels.filter((_, idx) => idx !== li);
                      patch({ levels: next });
                    }}
                    className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white opacity-0 group-hover/lvl:opacity-100 transition-opacity shadow"
                    title="Hapus level">
                    <Trash2 className="h-3 w-3" />
                  </button>
                  <AdminTextInput
                    label={`Judul Level ${li + 4}`}
                    value={lvl.title || ""}
                    onChange={(v) => {
                      const next = extraLevels.map((l, idx) =>
                        idx === li ? { ...l, title: v } : l,
                      );
                      patch({ levels: next });
                    }}
                  />
                  <AdminTextArea
                    label="Deskripsi"
                    value={lvl.desc || ""}
                    onChange={(v) => {
                      const next = extraLevels.map((l, idx) =>
                        idx === li ? { ...l, desc: v } : l,
                      );
                      patch({ levels: next });
                    }}
                  />
                </div>
              ))}

              <button
                type="button"
                onClick={() =>
                  patch({
                    levels: [...extraLevels, { title: "Level Baru", desc: "" }],
                  })
                }
                className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-purple-200 px-3 py-2.5 text-xs font-semibold text-purple-600 hover:border-purple-400 hover:bg-purple-50 transition">
                <Plus className="h-3.5 w-3.5" /> Tambah Level
              </button>
            </div>
          ) : (
            <>
              <p className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-800">
                <Atom className="h-4 w-4 text-brand-teal" /> Integrasi Penalaran
                Kimia — {3 + extraLevels.length} Level Representasi
              </p>
              <div
                className={`grid gap-3 ${extraLevels.length > 0 ? "sm:grid-cols-2 lg:grid-cols-3" : "sm:grid-cols-3"}`}>
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
                {extraLevels.map((lvl, li) => (
                  <LevelCard
                    key={li}
                    icon={<Atom className="h-5 w-5" />}
                    title={lvl.title}
                    desc={lvl.desc}
                    color={defaultLevelColors[li % defaultLevelColors.length]}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      );
    }

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
                <MultiTextAnswer
                  value={
                    (answers[block.pertanyaanId] as string | string[]) || ""
                  }
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
                <MultiTextAnswer
                  value={(answers[block.id] as string | string[]) || ""}
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
