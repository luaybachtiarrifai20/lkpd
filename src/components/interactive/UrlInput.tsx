import { useState } from 'react';
import { Link as LinkIcon, X, ExternalLink } from 'lucide-react';
import { useToast } from '@/context/ToastContext';

type UrlInputProps = {
  value: string;
  onChange: (url: string) => void;
  disabled?: boolean;
  placeholder?: string;
  label?: string;
};

export function UrlInput({
  value,
  onChange,
  disabled = false,
  placeholder = 'https://example.com/file.pdf',
  label = 'URL File',
}: UrlInputProps) {
  const [inputValue, setInputValue] = useState(value);
  const { toast } = useToast();

  const handleBlur = () => {
    if (inputValue.trim() === '') {
      onChange('');
      return;
    }

    // Basic URL validation
    try {
      new URL(inputValue);
      onChange(inputValue);
    } catch {
      toast('URL tidak valid', 'error');
      setInputValue(value);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleBlur();
    }
  };

  const handleClear = () => {
    setInputValue('');
    onChange('');
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-slate-700">{label}</label>
      <div className="relative">
        <div className="relative">
          <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="url"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            placeholder={placeholder}
            className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-slate-300 focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 outline-none transition disabled:opacity-60 disabled:cursor-not-allowed"
          />
          {inputValue && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
      
      {value && (
        <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200">
          <a
            href={value}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 text-sm text-brand-green hover:text-brand-green-dark transition"
          >
            <ExternalLink className="h-4 w-4" />
            <span className="truncate max-w-[300px]">{value}</span>
          </a>
        </div>
      )}
      
      <p className="text-xs text-slate-500">
        Masukkan URL file (foto, PDF, DOC, dll) dari layanan seperti Google Drive, Dropbox, atau layanan hosting lainnya.
      </p>
    </div>
  );
}
