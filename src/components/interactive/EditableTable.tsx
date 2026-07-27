import { Plus, Trash2 } from 'lucide-react';

type EditableTableProps = {
  headers: string[];
  rows: string[][];
  onChange: (rows: string[][]) => void;
  disabled?: boolean;
  title?: string;
};

export function EditableTable({ headers, rows, onChange, disabled, title }: EditableTableProps) {
  const updateCell = (r: number, c: number, val: string) => {
    const next = rows.map((row) => [...row]);
    next[r][c] = val;
    onChange(next);
  };
  const addRow = () => onChange([...rows, headers.map(() => '')]);
  const removeRow = (r: number) => onChange(rows.filter((_, i) => i !== r));

  return (
    <div>
      {title && <p className="mb-2 text-sm font-semibold text-slate-700">{title}</p>}
      <div className="overflow-x-auto scrollbar-thin rounded-xl border border-slate-200">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-slate-50">
              {headers.map((h) => (
                <th key={h} className="whitespace-nowrap px-3 py-2.5 text-left font-semibold text-slate-700 border-b border-slate-200">
                  {h}
                </th>
              ))}
              {!disabled && <th className="w-10 border-b border-slate-200" />}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, r) => (
              <tr key={r} className={r % 2 ? 'bg-slate-50/40' : 'bg-white'}>
                {row.map((cell, c) => (
                  <td key={c} className="border-b border-slate-100 p-0">
                    <input
                      type="text"
                      value={cell}
                      disabled={disabled}
                      onChange={(e) => updateCell(r, c, e.target.value)}
                      className="w-full bg-transparent px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-300 focus:bg-brand-green-light/40 focus:outline-none disabled:text-slate-500"
                      placeholder="…"
                    />
                  </td>
                ))}
                {!disabled && (
                  <td className="border-b border-slate-100 text-center">
                    <button
                      onClick={() => removeRow(r)}
                      className="rounded-md p-1.5 text-slate-300 hover:bg-danger/10 hover:text-danger"
                      title="Hapus baris"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!disabled && (
        <button onClick={addRow} className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-brand-green hover:text-brand-green-dark">
          <Plus className="h-4 w-4" /> Tambah baris
        </button>
      )}
    </div>
  );
}
