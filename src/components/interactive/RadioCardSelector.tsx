type Option = { id: string; label: string; deskripsi: string };

export function RadioCardSelector({
  options,
  value,
  onChange,
  disabled,
}: {
  options: Option[];
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {options.map((opt) => {
        const active = value === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            disabled={disabled}
            onClick={() => onChange(opt.id)}
            className={`text-left rounded-xl border-2 p-4 transition-all ${
              active
                ? 'border-brand-green bg-brand-green-light/60 shadow-soft'
                : 'border-slate-200 bg-white hover:border-brand-green/40 hover:bg-slate-50'
            } disabled:opacity-60 disabled:cursor-not-allowed`}
          >
            <div className="mb-2 flex items-center gap-2">
              <span
                className={`grid h-5 w-5 place-items-center rounded-full border-2 transition ${
                  active ? 'border-brand-green bg-brand-green' : 'border-slate-300'
                }`}
              >
                {active && <span className="h-2 w-2 rounded-full bg-white" />}
              </span>
              <span className="text-sm font-semibold text-slate-800">{opt.label}</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">{opt.deskripsi}</p>
          </button>
        );
      })}
    </div>
  );
}
