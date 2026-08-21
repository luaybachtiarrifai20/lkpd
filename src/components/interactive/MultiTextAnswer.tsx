import { useState } from "react";
import { Plus, Trash2, Check, Loader2 } from "lucide-react";

type MultiTextAnswerProps = {
  value: string | string[];
  onChange: (v: string[]) => void;
  disabled?: boolean;
  rows?: number;
  placeholder?: string;
  hint?: string;
  savedAt?: string | null;
};

/**
 * Jawaban teks dengan banyak kolom. Siswa dapat menambah/menghapus kolom
 * jawaban, dan nilai disimpan sebagai string[] (array of columns).
 */
export function MultiTextAnswer({
  value,
  onChange,
  disabled = false,
  rows = 3,
  placeholder = "Tulis jawabanmu di sini…",
  hint,
  savedAt,
}: MultiTextAnswerProps) {
  const [focused, setFocused] = useState(false);

  const cols: string[] = Array.isArray(value)
    ? value
    : typeof value === "string" && value !== ""
      ? [value]
      : [""];

  const update = (index: number, val: string) => {
    const next = [...cols];
    next[index] = val;
    onChange(next);
  };

  const add = () => onChange([...cols, ""]);
  const remove = (index: number) => {
    if (cols.length <= 1) return;
    onChange(cols.filter((_, i) => i !== index));
  };

  return (
    <div>
      <div className="space-y-2">
        {cols.map((col, i) => (
          <div key={i} className="flex items-start gap-2">
            <div className="flex-1">
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Jawaban {i + 1}
              </label>
              <textarea
                className="input-base resize-y leading-relaxed disabled:bg-slate-50 disabled:text-slate-500"
                rows={rows}
                value={col}
                disabled={disabled}
                placeholder={placeholder}
                onChange={(e) => update(i, e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
              />
            </div>
            {!disabled && cols.length > 1 && (
              <button
                type="button"
                onClick={() => remove(i)}
                className="mt-6 rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-500"
                title="Hapus kolom jawaban"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
      </div>

      {!disabled && (
        <button
          type="button"
          onClick={add}
          className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-brand-green hover:text-brand-green-dark"
        >
          <Plus className="h-4 w-4" /> Tambah Kolom Jawaban
        </button>
      )}

      <div className="mt-1.5 flex items-center justify-between">
        {hint && focused ? (
          <p className="text-xs text-slate-400">{hint}</p>
        ) : (
          <span className="text-xs text-slate-400">
            {savedAt ? (
              <span className="inline-flex items-center gap-1 text-success">
                <Check className="h-3 w-3" /> Tersimpan otomatis
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-slate-400">
                <Loader2 className="h-3 w-3 animate-spin opacity-0" /> Menyimpan…
              </span>
            )}
          </span>
        )}
      </div>
    </div>
  );
}
