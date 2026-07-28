import { useRef, useState } from 'react';
import { UploadCloud, FileText, Image as ImageIcon, X, Loader2, FileEdit } from 'lucide-react';
import { storage } from '@/lib/firebase';
import type { UploadedFile } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useToast } from '@/context/ToastContext';
import * as mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

type FileUploadProps = {
  value: UploadedFile[];
  onChange: (files: UploadedFile[]) => void;
  disabled?: boolean;
  maxMB?: number;
  bucket?: string;
  pathPrefix?: string;
  enableTextExtraction?: boolean;
};

const ACCEPTED = '.jpg,.jpeg,.png,.pdf,.docx,.doc';

export function FileUpload({
  value,
  onChange,
  disabled,
  maxMB = 10,
  bucket = 'uploads',
  pathPrefix = 'jawaban',
  enableTextExtraction = false,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [extractingText, setExtractingText] = useState(false);
  const { toast } = useToast();

  const extractTextFromPDF = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let text = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items.map((item: any) => item.str).join(' ');
      text += pageText + '\n';
    }
    return text;
  };

  const extractTextFromDOCX = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  };

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const file = fileList[0];
    if (file.size > maxMB * 1024 * 1024) {
      toast(`Ukuran file melebihi ${maxMB} MB`, 'error');
      return;
    }
    setUploading(true);
    let extractedText = '';
    
    // Extract text if enabled and file is PDF or DOCX
    if (enableTextExtraction) {
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext === 'pdf' || ext === 'docx') {
        setExtractingText(true);
        try {
          if (ext === 'pdf') {
            extractedText = await extractTextFromPDF(file);
          } else if (ext === 'docx') {
            extractedText = await extractTextFromDOCX(file);
          }
          toast('Teks berhasil diekstrak', 'success');
        } catch (err) {
          console.error('Text extraction error:', err);
          toast('Gagal mengekstrak teks', 'warning');
        } finally {
          setExtractingText(false);
        }
      }
    }

    try {
      const ext = file.name.split('.').pop();
      const fileName = `${pathPrefix}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const storageRef = ref(storage, `${bucket}/${fileName}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      onChange([...value, { name: file.name, url, type: file.type, size: file.size, textContent: extractedText || undefined }]);
      toast('File berhasil diunggah', 'success');
    } catch (err) {
      console.error(err);
      toast('Gagal mengunggah file. Pastikan storage sudah dikonfigurasi.', 'error');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const removeFile = (idx: number) => onChange(value.filter((_, i) => i !== idx));
  const fmtSize = (b: number) => (b < 1024 * 1024 ? `${(b / 1024).toFixed(0)} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`);

  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); if (!disabled) handleFiles(e.dataTransfer.files); }}
        className={`rounded-xl border-2 border-dashed px-4 py-6 text-center transition ${
          dragging ? 'border-brand-green bg-brand-green-light/50' : 'border-slate-200 bg-slate-50/50'
        } ${disabled ? 'opacity-60' : 'cursor-pointer hover:border-brand-green/60'}`}
        onClick={() => !disabled && inputRef.current?.click()}
      >
        <input ref={inputRef} type="file" accept={ACCEPTED} className="hidden" disabled={disabled} onChange={(e) => handleFiles(e.target.files)} />
        {uploading || extractingText ? (
          <div className="flex flex-col items-center gap-2 text-brand-green">
            <Loader2 className="h-7 w-7 animate-spin" />
            <p className="text-sm font-medium">{extractingText ? 'Mengekstrak teks…' : 'Mengunggah…'}</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1.5">
            <UploadCloud className="h-7 w-7 text-brand-green" />
            <p className="text-sm font-medium text-slate-700">Tarik file ke sini atau klik untuk memilih</p>
            <p className="text-xs text-slate-400">JPG/PNG/PDF/DOCX • maks {maxMB} MB{enableTextExtraction ? ' • Teks akan diekstrak dari PDF/DOCX' : ''}</p>
          </div>
        )}
      </div>

      {value.length > 0 && (
        <ul className="mt-3 space-y-2">
          {value.map((f, i) => (
            <li key={i} className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5">
              <div className="flex items-center gap-3">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-green-light text-brand-green">
                  {f.type.startsWith('image') ? <ImageIcon className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
                </div>
                <div className="min-w-0 flex-1">
                  <a href={f.url} target="_blank" rel="noreferrer" className="block truncate text-sm font-medium text-slate-700 hover:text-brand-green" title={f.name}>
                    {f.name}
                  </a>
                  <p className="text-xs text-slate-400">{fmtSize(f.size)}</p>
                </div>
                {!disabled && (
                  <button onClick={() => removeFile(i)} className="rounded-md p-1.5 text-slate-300 hover:bg-danger/10 hover:text-danger">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              {enableTextExtraction && f.textContent && (
                <div className="mt-2">
                  <div className="mb-1 flex items-center gap-2">
                    <FileEdit className="h-4 w-4 text-brand-green" />
                    <span className="text-xs font-medium text-slate-600">Teks yang diekstrak:</span>
                  </div>
                  <textarea
                    value={f.textContent}
                    onChange={(e) => {
                      const newValue = [...value];
                      newValue[i] = { ...f, textContent: e.target.value };
                      onChange(newValue);
                    }}
                    disabled={disabled}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:border-brand-green focus:outline-none focus:ring-1 focus:ring-brand-green disabled:opacity-60"
                    rows={4}
                    placeholder="Teks yang diekstrak dari file..."
                  />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
