import { useState, useEffect } from 'react';
import { doc, setDoc, getDocs, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { type KegiatanContent, type PBLStep, type ContentBlock } from '@/content/types';
import { useToast } from '@/context/ToastContext';
import { X, Save, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';

type KegiatanFormProps = {
  onSuccess?: () => void;
  onCancel?: () => void;
  initialData?: Partial<KegiatanContent>;
};

export function KegiatanForm({ onSuccess, onCancel, initialData }: KegiatanFormProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState<Partial<KegiatanContent>>({
    nomor: initialData?.nomor || 1,
    judul: initialData?.judul || '',
    subjudul: initialData?.subjudul || '',
    warna: initialData?.warna || '#10B981',
    warnaLight: initialData?.warnaLight || '#D1FAE5',
    sdg: initialData?.sdg || [],
    cakupanMateri: initialData?.cakupanMateri || [],
    tujuan: initialData?.tujuan || [],
    materi: initialData?.materi || '',
    steps: initialData?.steps || [],
  });

  const [newSdg, setNewSdg] = useState({ nomor: '', warna: '#10B981', label: '' });
  const [newCakupan, setNewCakupan] = useState('');
  const [newTujuan, setNewTujuan] = useState('');

  const [newStep, setNewStep] = useState<Partial<PBLStep>>({
    id: '',
    sintaks: 1,
    label: '',
    ringkas: '',
    blocks: [],
  });

  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());
  const [newBlock, setNewBlock] = useState<Partial<ContentBlock>>({
    kind: 'stimulus',
  });

  useEffect(() => {
    // Get next available nomor
    const getNextNomor = async () => {
      try {
        const snap = await getDocs(collection(db, 'kegiatan'));
        const nomors = snap.docs.map(d => d.data().nomor || 0);
        const maxNomor = nomors.length > 0 ? Math.max(...nomors) : 0;
        setFormData(prev => ({ ...prev, nomor: maxNomor + 1 }));
      } catch (err) {
        console.error(err);
      }
    };
    if (!initialData?.nomor) {
      getNextNomor();
    }
  }, [initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const docId = `kegiatan-${formData.nomor}`;
      await setDoc(doc(db, 'kegiatan', docId), {
        ...formData,
        nomor: formData.nomor!,
      } as KegiatanContent);

      toast('Kegiatan berhasil disimpan', 'success');
      onSuccess?.();
    } catch (err: unknown) {
      console.error(err);
      toast((err instanceof Error ? err.message : 'Gagal menyimpan kegiatan'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const addSdg = () => {
    if (newSdg.nomor && newSdg.label) {
      setFormData((prev: Partial<KegiatanContent>) => ({
        ...prev,
        sdg: [...(prev.sdg || []), { ...newSdg, nomor: Number(newSdg.nomor) }]
      }));
      setNewSdg({ nomor: '', warna: '#10B981', label: '' });
    }
  };

  const removeSdg = (index: number) => {
    setFormData((prev: Partial<KegiatanContent>) => ({
      ...prev,
      sdg: prev.sdg?.filter((_: unknown, i: number) => i !== index) || []
    }));
  };

  const addCakupan = () => {
    if (newCakupan) {
      setFormData((prev: Partial<KegiatanContent>) => ({
        ...prev,
        cakupanMateri: [...(prev.cakupanMateri || []), newCakupan]
      }));
      setNewCakupan('');
    }
  };

  const removeCakupan = (index: number) => {
    setFormData((prev: Partial<KegiatanContent>) => ({
      ...prev,
      cakupanMateri: prev.cakupanMateri?.filter((_: unknown, i: number) => i !== index) || []
    }));
  };

  const addTujuan = () => {
    if (newTujuan) {
      setFormData((prev: Partial<KegiatanContent>) => ({
        ...prev,
        tujuan: [...(prev.tujuan || []), newTujuan]
      }));
      setNewTujuan('');
    }
  };

  const removeTujuan = (index: number) => {
    setFormData((prev: Partial<KegiatanContent>) => ({
      ...prev,
      tujuan: prev.tujuan?.filter((_: unknown, i: number) => i !== index) || []
    }));
  };

  const addStep = () => {
    if (newStep.label && newStep.ringkas) {
      const step: PBLStep = {
        id: newStep.id || `step-${Date.now()}`,
        sintaks: newStep.sintaks || 1,
        label: newStep.label,
        ringkas: newStep.ringkas,
        blocks: [],
      };
      setFormData((prev: Partial<KegiatanContent>) => ({
        ...prev,
        steps: [...(prev.steps || []), step]
      }));
      setNewStep({
        id: '',
        sintaks: (newStep.sintaks || 1) + 1 > 5 ? 1 : (newStep.sintaks || 1) + 1,
        label: '',
        ringkas: '',
        blocks: [],
      });
    }
  };

  const removeStep = (index: number) => {
    setFormData((prev: Partial<KegiatanContent>) => ({
      ...prev,
      steps: prev.steps?.filter((_: unknown, i: number) => i !== index) || []
    }));
  };

  const toggleStepExpansion = (stepId: string) => {
    setExpandedSteps(prev => {
      const newSet = new Set(prev);
      if (newSet.has(stepId)) {
        newSet.delete(stepId);
      } else {
        newSet.add(stepId);
      }
      return newSet;
    });
  };

  const addBlockToStep = (stepIndex: number) => {
    const blockId = `block-${Date.now()}`;
    let block: ContentBlock;

    switch (newBlock.kind) {
      case 'stimulus':
        block = {
          kind: 'stimulus',
          title: (newBlock as any).title || '',
          body: (newBlock as any).body || '',
          mediaUrl: (newBlock as any).mediaUrl,
          mediaType: (newBlock as any).mediaType,
        };
        break;
      case 'masalah':
        block = {
          kind: 'masalah',
          title: (newBlock as any).title || '',
          body: (newBlock as any).body || '',
          mediaUrl: (newBlock as any).mediaUrl,
          mediaType: (newBlock as any).mediaType,
        };
        break;
      case 'pertanyaan':
        block = {
          kind: 'pertanyaan',
          id: blockId,
          text: (newBlock as any).text || '',
          hint: (newBlock as any).hint,
        };
        break;
      case 'instruksi-pengembangan':
        block = {
          kind: 'instruksi-pengembangan',
          title: (newBlock as any).title || '',
          body: (newBlock as any).body || '',
          bullets: (newBlock as any).bullets || [],
        };
        break;
      default:
        block = {
          kind: 'stimulus',
          title: '',
          body: '',
        };
    }

    setFormData((prev: Partial<KegiatanContent>) => {
      const newSteps = [...(prev.steps || [])];
      newSteps[stepIndex] = {
        ...newSteps[stepIndex],
        blocks: [...(newSteps[stepIndex].blocks || []), block]
      };
      return { ...prev, steps: newSteps };
    });

    setNewBlock({ kind: 'stimulus' });
  };

  const removeBlockFromStep = (stepIndex: number, blockIndex: number) => {
    setFormData((prev: Partial<KegiatanContent>) => {
      const newSteps = [...(prev.steps || [])];
      newSteps[stepIndex] = {
        ...newSteps[stepIndex],
        blocks: newSteps[stepIndex].blocks?.filter((_: unknown, i: number) => i !== blockIndex) || []
      };
      return { ...prev, steps: newSteps };
    });
  };

  return (
    <div className="card p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-slate-800">
          {initialData?.nomor ? 'Edit Kegiatan' : 'Tambah Kegiatan Baru'}
        </h2>
        {onCancel && (
          <button onClick={onCancel} className="text-slate-400 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Nomor */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Nomor Kegiatan</label>
          <input
            type="number"
            value={formData.nomor}
            onChange={(e) => setFormData({ ...formData, nomor: Number(e.target.value) })}
            className="input-base"
            required
          />
        </div>

        {/* Judul */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Judul</label>
          <input
            type="text"
            value={formData.judul}
            onChange={(e) => setFormData({ ...formData, judul: e.target.value })}
            className="input-base"
            required
            placeholder="Contoh: Kegiatan 1 - Laju Reaksi"
          />
        </div>

        {/* Subjudul */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Subjudul</label>
          <input
            type="text"
            value={formData.subjudul}
            onChange={(e) => setFormData({ ...formData, subjudul: e.target.value })}
            className="input-base"
            placeholder="Contoh: Mengamati Laju Reaksi"
          />
        </div>

        {/* Warna */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Warna Utama</label>
            <input
              type="color"
              value={formData.warna}
              onChange={(e) => setFormData({ ...formData, warna: e.target.value })}
              className="w-full h-10 rounded border border-slate-300"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Warna Light</label>
            <input
              type="color"
              value={formData.warnaLight}
              onChange={(e) => setFormData({ ...formData, warnaLight: e.target.value })}
              className="w-full h-10 rounded border border-slate-300"
            />
          </div>
        </div>

        {/* SDG Badges */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">SDG Badges</label>
          <div className="space-y-2 mb-3">
            {formData.sdg?.map((sdg: { nomor: number; warna: string; label: string }, index: number) => (
              <div key={index} className="flex items-center gap-2 p-2 bg-slate-50 rounded">
                <span className="text-xs font-semibold px-2 py-1 rounded" style={{ backgroundColor: sdg.warna, color: 'white' }}>
                  {sdg.nomor}
                </span>
                <span className="text-sm">{sdg.label}</span>
                <button
                  type="button"
                  onClick={() => removeSdg(index)}
                  className="ml-auto text-red-500 hover:text-red-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="Nomor"
              value={newSdg.nomor}
              onChange={(e) => setNewSdg({ ...newSdg, nomor: e.target.value })}
              className="input-base w-20"
            />
            <input
              type="color"
              value={newSdg.warna}
              onChange={(e) => setNewSdg({ ...newSdg, warna: e.target.value })}
              className="w-10 h-10 rounded border border-slate-300"
            />
            <input
              type="text"
              placeholder="Label"
              value={newSdg.label}
              onChange={(e) => setNewSdg({ ...newSdg, label: e.target.value })}
              className="input-base flex-1"
            />
            <button
              type="button"
              onClick={addSdg}
              className="px-3 py-2 bg-slate-200 hover:bg-slate-300 rounded text-sm"
            >
              Tambah
            </button>
          </div>
        </div>

        {/* Cakupan Materi */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Cakupan Materi</label>
          <div className="space-y-2 mb-3">
            {formData.cakupanMateri?.map((item: string, index: number) => (
              <div key={index} className="flex items-center gap-2 p-2 bg-slate-50 rounded">
                <span className="text-sm">{item}</span>
                <button
                  type="button"
                  onClick={() => removeCakupan(index)}
                  className="ml-auto text-red-500 hover:text-red-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Tambah cakupan materi"
              value={newCakupan}
              onChange={(e) => setNewCakupan(e.target.value)}
              className="input-base flex-1"
            />
            <button
              type="button"
              onClick={addCakupan}
              className="px-3 py-2 bg-slate-200 hover:bg-slate-300 rounded text-sm"
            >
              Tambah
            </button>
          </div>
        </div>

        {/* Tujuan */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Tujuan Pembelajaran</label>
          <div className="space-y-2 mb-3">
            {formData.tujuan?.map((item: string, index: number) => (
              <div key={index} className="flex items-center gap-2 p-2 bg-slate-50 rounded">
                <span className="text-sm">{item}</span>
                <button
                  type="button"
                  onClick={() => removeTujuan(index)}
                  className="ml-auto text-red-500 hover:text-red-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Tambah tujuan"
              value={newTujuan}
              onChange={(e) => setNewTujuan(e.target.value)}
              className="input-base flex-1"
            />
            <button
              type="button"
              onClick={addTujuan}
              className="px-3 py-2 bg-slate-200 hover:bg-slate-300 rounded text-sm"
            >
              Tambah
            </button>
          </div>
        </div>

        {/* Materi */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Materi</label>
          <textarea
            value={formData.materi}
            onChange={(e) => setFormData({ ...formData, materi: e.target.value })}
            rows={4}
            className="input-base"
            placeholder="Deskripsi materi kegiatan..."
          />
        </div>

        {/* PBL Steps */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Sintaks PBL (Steps 1-5)</label>
          <div className="space-y-3 mb-4">
            {formData.steps?.map((step: PBLStep, stepIndex: number) => (
              <div key={step.id} className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="p-4 bg-slate-50 flex justify-between items-start">
                  <div className="flex items-center gap-2 flex-1">
                    <span className="px-2 py-1 bg-brand-green text-white text-xs font-bold rounded">
                      Sintaks {step.sintaks}
                    </span>
                    <span className="font-semibold text-slate-800">{step.label}</span>
                    <p className="text-sm text-slate-600 truncate">{step.ringkas}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => toggleStepExpansion(step.id)}
                      className="text-slate-500 hover:text-slate-700"
                    >
                      {expandedSteps.has(step.id) ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeStep(stepIndex)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {expandedSteps.has(step.id) && (
                  <div className="p-4 border-t border-slate-200 bg-white">
                    <div className="mb-4">
                      <h5 className="text-sm font-semibold text-slate-700 mb-2">Content Blocks ({step.blocks?.length || 0})</h5>
                      {step.blocks?.length === 0 ? (
                        <p className="text-xs text-slate-500 italic">Belum ada blocks</p>
                      ) : (
                        <div className="space-y-2">
                          {step.blocks?.map((block: ContentBlock, blockIndex: number) => (
                            <div key={blockIndex} className="p-3 bg-slate-50 rounded border border-slate-200">
                              <div className="flex justify-between items-start mb-1">
                                <span className="text-xs font-semibold text-slate-600 uppercase">{block.kind}</span>
                                <button
                                  type="button"
                                  onClick={() => removeBlockFromStep(stepIndex, blockIndex)}
                                  className="text-red-500 hover:text-red-700"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                              <p className="text-sm text-slate-700">
                                {'title' in block && block.title ? (
                                  <strong>{block.title}</strong>
                                ) : 'text' in block ? (
                                  <strong>{(block as any).text}</strong>
                                ) : null}
                              </p>
                              <p className="text-xs text-slate-500 truncate">
                                {'body' in block ? block.body : ''}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-100 space-y-2">
                      <h5 className="text-xs font-semibold text-blue-800">Tambah Block Baru</h5>
                      <select
                        value={newBlock.kind}
                        onChange={(e) => setNewBlock({ kind: e.target.value as any })}
                        className="input-base text-sm"
                      >
                        <option value="stimulus">Stimulus</option>
                        <option value="masalah">Masalah</option>
                        <option value="pertanyaan">Pertanyaan</option>
                        <option value="instruksi-pengembangan">Instruksi Pengembangan</option>
                      </select>

                      {newBlock.kind === 'stimulus' || newBlock.kind === 'masalah' ? (
                        <>
                          <input
                            type="text"
                            placeholder="Title"
                            value={(newBlock as any).title || ''}
                            onChange={(e) => setNewBlock({ ...newBlock, title: e.target.value })}
                            className="input-base text-sm"
                          />
                          <textarea
                            placeholder="Body"
                            value={(newBlock as any).body || ''}
                            onChange={(e) => setNewBlock({ ...newBlock, body: e.target.value })}
                            rows={2}
                            className="input-base text-sm"
                          />
                          <input
                            type="text"
                            placeholder="Media URL (opsional)"
                            value={(newBlock as any).mediaUrl || ''}
                            onChange={(e) => setNewBlock({ ...newBlock, mediaUrl: e.target.value })}
                            className="input-base text-sm"
                          />
                          <select
                            value={(newBlock as any).mediaType || ''}
                            onChange={(e) => setNewBlock({ ...newBlock, mediaType: e.target.value as any })}
                            className="input-base text-sm"
                          >
                            <option value="">Tanpa Media</option>
                            <option value="image">Image</option>
                            <option value="youtube">YouTube</option>
                          </select>
                        </>
                      ) : newBlock.kind === 'pertanyaan' ? (
                        <>
                          <textarea
                            placeholder="Pertanyaan"
                            value={(newBlock as any).text || ''}
                            onChange={(e) => setNewBlock({ ...newBlock, text: e.target.value })}
                            rows={2}
                            className="input-base text-sm"
                          />
                          <input
                            type="text"
                            placeholder="Hint (opsional)"
                            value={(newBlock as any).hint || ''}
                            onChange={(e) => setNewBlock({ ...newBlock, hint: e.target.value })}
                            className="input-base text-sm"
                          />
                        </>
                      ) : newBlock.kind === 'instruksi-pengembangan' ? (
                        <>
                          <input
                            type="text"
                            placeholder="Title"
                            value={(newBlock as any).title || ''}
                            onChange={(e) => setNewBlock({ ...newBlock, title: e.target.value })}
                            className="input-base text-sm"
                          />
                          <textarea
                            placeholder="Body"
                            value={(newBlock as any).body || ''}
                            onChange={(e) => setNewBlock({ ...newBlock, body: e.target.value })}
                            rows={2}
                            className="input-base text-sm"
                          />
                        </>
                      ) : null}

                      <button
                        type="button"
                        onClick={() => addBlockToStep(stepIndex)}
                        className="w-full px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-xs font-medium"
                      >
                        <Plus className="h-3 w-3 inline mr-1" /> Tambah Block
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="p-4 bg-blue-50 rounded-lg border border-blue-100 space-y-3">
            <h4 className="text-sm font-semibold text-blue-800">Tambah Step Baru</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Sintaks (1-5)</label>
                <select
                  value={newStep.sintaks}
                  onChange={(e) => setNewStep({ ...newStep, sintaks: Number(e.target.value) })}
                  className="input-base"
                >
                  {[1, 2, 3, 4, 5].map(n => (
                    <option key={n} value={n}>Sintaks {n}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Label Step</label>
                <input
                  type="text"
                  value={newStep.label}
                  onChange={(e) => setNewStep({ ...newStep, label: e.target.value })}
                  className="input-base"
                  placeholder="Contoh: Orientasi Masalah"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Ringkasan</label>
              <textarea
                value={newStep.ringkas}
                onChange={(e) => setNewStep({ ...newStep, ringkas: e.target.value })}
                rows={2}
                className="input-base"
                placeholder="Deskripsi singkat step ini..."
              />
            </div>
            <button
              type="button"
              onClick={addStep}
              className="w-full px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
            >
              <Plus className="h-4 w-4 inline mr-1" /> Tambah Step
            </button>
          </div>
        </div>

        {/* Note about blocks */}
        <div className="p-3 bg-green-50 rounded-lg border border-green-100">
          <p className="text-xs text-green-700">
            <strong>Info:</strong> Content blocks untuk setiap step dapat ditambahkan langsung di sini dengan mengklik tombol expand pada setiap step.
          </p>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-50"
            >
              Batal
            </button>
          )}
          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
          >
            <Save className="h-4 w-4" /> {loading ? 'Menyimpan...' : 'Simpan Kegiatan'}
          </button>
        </div>
      </form>
    </div>
  );
}
