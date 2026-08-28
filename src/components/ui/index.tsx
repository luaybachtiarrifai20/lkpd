import type { ReactNode } from 'react';
import type { SDGBadge } from '@/content/kegiatanContent';

export { Reveal } from './Reveal';
export { MoleculeField, HeroMolecule, FlaskLoader, MoleculeConfetti } from './Molecule';

export function Badge({
  children,
  color = 'green',
  className = '',
}: {
  children: ReactNode;
  color?: 'green' | 'teal' | 'amber' | 'blue' | 'purple' | 'slate' | 'success' | 'danger';
  className?: string;
}) {
  const map: Record<string, string> = {
    green: 'bg-lab-green-light text-lab-green-dark',
    teal: 'bg-lab-teal-light text-lab-teal-dark',
    amber: 'bg-lab-amber-light text-lab-amber-dark',
    blue: 'bg-lab-cyan-light text-lab-cyan-dark',
    purple: 'bg-lab-teal-light text-lab-teal-dark',
    slate: 'bg-slate-100 text-slate-600',
    success: 'bg-lab-green-light text-lab-green-dark',
    danger: 'bg-lab-red-light text-lab-red',
  };
  return <span className={`badge ${map[color]} ${className}`}>{children}</span>;
}

export function SDGBadgeChip({ sdg }: { sdg: SDGBadge }) {
  return (
    <span
      className="badge text-white"
      style={{ backgroundColor: sdg.warna }}
      title={sdg.label}
    >
      <span className="grid h-5 w-5 place-items-center rounded-full bg-white/25 text-[10px] font-bold">
        {sdg.nomor}
      </span>
      {sdg.label}
    </span>
  );
}

export function ProgressBar({
  value,
  max = 100,
  className = '',
  showLabel = false,
}: {
  value: number;
  max?: number;
  className?: string;
  showLabel?: boolean;
}) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-gradient-to-r from-lab-teal to-lab-cyan transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel && <span className="text-xs font-semibold text-slate-600 w-9 text-right">{pct}%</span>}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white/60 px-6 py-12 text-center">
      <div className="mb-3 grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-lab-teal-light to-lab-cyan-light text-lab-teal">{icon}</div>
      <h3 className="text-base font-semibold text-slate-700">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function SectionTitle({ title, subtitle, icon }: { title: string; subtitle?: string; icon?: ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      {icon && <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-lab-teal-light to-lab-cyan-light text-lab-teal">{icon}</div>}
      <div>
        <h2 className="text-xl font-bold text-slate-800">{title}</h2>
        {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
      </div>
    </div>
  );
}
