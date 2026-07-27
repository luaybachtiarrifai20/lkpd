import { PROJECT_IDENTITY } from '@/content/kegiatanContent';
import { FlaskConical } from 'lucide-react';

export function Footer() {
  return (
    <footer className="mt-12 border-t border-slate-100 bg-white">
      <div className="mx-auto max-w-content px-4 py-6 sm:px-6">
        <div className="flex flex-col items-start justify-between gap-3 text-xs text-slate-400 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <FlaskConical className="h-4 w-4 text-brand-green" />
            <span className="font-semibold text-slate-500">{PROJECT_IDENTITY.namaProduk}</span>
            <span className="hidden sm:inline">— {PROJECT_IDENTITY.tagline}</span>
          </div>
          <div className="text-left sm:text-right leading-relaxed">
            <p>{PROJECT_IDENTITY.pengembang} • {PROJECT_IDENTITY.programStudi}</p>
            <p>{PROJECT_IDENTITY.sumberDana} • {PROJECT_IDENTITY.tahun}</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
