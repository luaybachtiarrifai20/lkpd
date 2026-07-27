import { useEffect, useRef, useState } from 'react';
import { Check, Loader2 } from 'lucide-react';

type TextAnswerProps = {
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  maxLength?: number;
  disabled?: boolean;
  hint?: string;
  savedAt?: string | null;
};

export function TextAnswer({
  value,
  onChange,
  placeholder = 'Tulis jawabanmu di sini…',
  rows = 3,
  maxLength = 2000,
  disabled = false,
  hint,
  savedAt,
}: TextAnswerProps) {
  const taRef = useRef<HTMLTextAreaElement>(null);
  const [focused, setFocused] = useState(false);

  const autoResize = () => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.max(el.scrollHeight, rows * 24 + 16)}px`;
  };

  useEffect(autoResize, [value, rows]);

  return (
    <div>
      <div className="relative">
        <textarea
          ref={taRef}
          className="input-base resize-none leading-relaxed disabled:bg-slate-50 disabled:text-slate-500"
          rows={rows}
          value={value}
          maxLength={maxLength}
          disabled={disabled}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
      </div>
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
        <span className={`text-xs ${value.length > maxLength * 0.9 ? 'text-brand-amber' : 'text-slate-400'}`}>
          {value.length}/{maxLength}
        </span>
      </div>
    </div>
  );
}
