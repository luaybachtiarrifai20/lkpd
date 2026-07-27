import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { ExternalLink, Copy, QrCode, Monitor, CheckCircle2, Info } from 'lucide-react';
import { useToast } from '@/context/ToastContext';

type EAssessmentProps = {
  url: string | null;
  judul: string | null;
  sudahMengerjakan: boolean;
  onTandai: (v: boolean) => void;
  accentColor: string;
};

export function EAssessment({ url, judul, sudahMengerjakan, onTandai, accentColor }: EAssessmentProps) {
  const [tab, setTab] = useState<'embed' | 'qr'>('embed');
  const { toast } = useToast();

  if (!url) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-6 py-10 text-center">
        <div className="mb-2 grid h-12 w-12 place-items-center rounded-xl bg-slate-100 text-slate-400">
          <QrCode className="h-6 w-6" />
        </div>
        <p className="text-sm font-semibold text-slate-600">Kuis untuk kegiatan ini belum tersedia</p>
        <p className="mt-1 text-xs text-slate-400">Guru akan menambahkan tautan kuis dari platform eksternal (Google Forms/Quizizz/dll.) segera.</p>
      </div>
    );
  }

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast('Tautan disalin', 'success');
    } catch {
      toast('Gagal menyalin tautan', 'error');
    }
  };

  return (
    <div>
      {judul && <p className="mb-3 text-sm font-semibold text-slate-700">{judul}</p>}

      <div className="mb-3 inline-flex rounded-xl border border-slate-200 bg-white p-1">
        <button
          onClick={() => setTab('embed')}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-sm font-medium transition ${
            tab === 'embed' ? 'text-white' : 'text-slate-600 hover:bg-slate-50'
          }`}
          style={tab === 'embed' ? { backgroundColor: accentColor } : undefined}
        >
          <Monitor className="h-4 w-4" /> Kerjakan di sini
        </button>
        <button
          onClick={() => setTab('qr')}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-sm font-medium transition ${
            tab === 'qr' ? 'text-white' : 'text-slate-600 hover:bg-slate-50'
          }`}
          style={tab === 'qr' ? { backgroundColor: accentColor } : undefined}
        >
          <QrCode className="h-4 w-4" /> Scan QR
        </button>
      </div>

      {tab === 'embed' ? (
        <div className="overflow-hidden rounded-xl border-2" style={{ borderColor: accentColor }}>
          <iframe
            src={url}
            title={judul || 'Kuis E-Assessment'}
            className="w-full"
            style={{ height: '640px', border: 'none' }}
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
            allow="fullscreen"
          />
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4 rounded-xl border-2 border-dashed bg-white px-6 py-8" style={{ borderColor: accentColor }}>
          <div className="rounded-2xl bg-white p-4 shadow-soft">
            <QRCodeSVG value={url} size={200} level="M" includeMargin />
          </div>
          <p className="text-sm text-slate-500">Pindai kode QR di atas untuk membuka kuis di HP-mu</p>
          <div className="flex gap-2">
            <a href={url} target="_blank" rel="noreferrer" className="btn-outline" style={{ borderColor: accentColor, color: accentColor }}>
              <ExternalLink className="h-4 w-4" /> Buka di tab baru
            </a>
            <button onClick={copyLink} className="btn-outline">
              <Copy className="h-4 w-4" /> Salin link
            </button>
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-col gap-3 rounded-xl bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-start gap-2 text-xs text-slate-500">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand-teal" />
          Skor kuismu akan muncul otomatis di platform kuis. Guru akan merekap hasilnya.
        </p>
        <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-700">
          <input
            type="checkbox"
            checked={sudahMengerjakan}
            onChange={(e) => onTandai(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-brand-green focus:ring-brand-green"
          />
          <CheckCircle2 className={`h-4 w-4 ${sudahMengerjakan ? 'text-success' : 'text-slate-300'}`} />
          Saya sudah mengerjakan kuis ini
        </label>
      </div>
    </div>
  );
}
