import { TAP_COMPONENTS } from '@/content/kegiatanContent';
import { ArrowRight } from 'lucide-react';

type TAPProps = {
  value: Record<string, string>;
  onChange: (v: Record<string, string>) => void;
  kasus: string;
  disabled?: boolean;
};

export function ArgumentationTAP({ value, onChange, kasus, disabled }: TAPProps) {
  const update = (key: string, val: string) => onChange({ ...value, [key]: val });
  const [claim, data, warrant, backing, qualifier, rebuttal] = TAP_COMPONENTS;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Kasus</p>
        <p className="mt-1 text-sm font-medium text-slate-700">{kasus}</p>
      </div>

      {/* Claim → Data → Warrant flow */}
      <div className="grid gap-3 md:grid-cols-3">
        <TapBox comp={claim} value={value.claim || ''} onChange={(v) => update('claim', v)} disabled={disabled} />
        <div className="hidden md:flex items-center justify-center pt-6 text-slate-300">
          <ArrowRight className="h-6 w-6" />
        </div>
        <TapBox comp={data} value={value.data || ''} onChange={(v) => update('data', v)} disabled={disabled} />
      </div>
      <div className="hidden md:flex justify-center -my-1 text-slate-300">
        <ArrowRight className="h-6 w-6 rotate-90" />
      </div>
      <TapBox comp={warrant} value={value.warrant || ''} onChange={(v) => update('warrant', v)} disabled={disabled} />
      <div className="grid gap-3 md:grid-cols-2">
        <TapBox comp={backing} value={value.backing || ''} onChange={(v) => update('backing', v)} disabled={disabled} />
        <TapBox comp={qualifier} value={value.qualifier || ''} onChange={(v) => update('qualifier', v)} disabled={disabled} />
      </div>
      <TapBox comp={rebuttal} value={value.rebuttal || ''} onChange={(v) => update('rebuttal', v)} disabled={disabled} />
    </div>
  );
}

function TapBox({
  comp,
  value,
  onChange,
  disabled,
}: {
  comp: { key: string; label: string; indo: string; color: string; light: string; desc: string };
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <div
      className="rounded-xl border-2 p-3.5 transition"
      style={{ borderColor: comp.color, backgroundColor: comp.light }}
    >
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="grid h-6 w-6 place-items-center rounded-md text-xs font-bold text-white" style={{ backgroundColor: comp.color }}>
            {comp.label[0]}
          </span>
          <div>
            <p className="text-sm font-bold leading-tight" style={{ color: comp.color }}>{comp.label}</p>
            <p className="text-[11px] text-slate-600">{comp.indo}</p>
          </div>
        </div>
        <span className="text-[11px] text-slate-500">{comp.desc}</span>
      </div>
      <textarea
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        placeholder={`Tulis ${comp.label.toLowerCase()}…`}
        rows={2}
        className="w-full resize-none rounded-lg border border-white/70 bg-white/90 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-white focus:outline-none focus:ring-2 focus:ring-white/60 disabled:bg-white/50"
      />
    </div>
  );
}
