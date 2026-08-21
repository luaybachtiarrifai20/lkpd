import { Plus, Trash2 } from 'lucide-react';

type EditableTableProps = {
  headers: string[];
  rows: string[][];
  onChange: (rows: string[][], headers: string[]) => void;
  disabled?: boolean;
  title?: string;
};

export function EditableTable({ headers, rows, onChange, disabled, title }: EditableTableProps) {
  const updateCell = (r: number, c: number, val: string) => {
    const next = rows.map((row) => [...row]);
    next[r][c] = val;
    onChange(next, headers);
  };

  const addRow = () => onChange([...rows, headers.map(() => '')], headers);
  const removeRow = (r: number) => onChange(rows.filter((_, i) => i !== r), headers);

  const addColumn = () => {
    const nextHeaders = [...headers, `Kolom ${headers.length + 1}`];
    const nextRows = rows.map((row) => [...row, '']);
    onChange(nextRows, nextHeaders);
  };

  const removeColumn = (c: number) => {
    if (headers.length <= 1) return;
    const nextHeaders = headers.filter((_, i) => i !== c);
    const nextRows = rows.map((row) => row.filter((_, i) => i !== c));
    onChange(nextRows, nextHeaders);
  };

  return (
    <div>
      {title && <p className="mb-2 text-sm font-semibold text-slate-700">{title}</p>}
      <div className="overflow-x-auto scrollbar-thin rounded-xl border border-slate-200">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-slate-50">
              {headers.map((h, c) => (
                <th key={c} className="whitespace-nowrap px-3 py-2.5 text-left font-semibold text-slate-700 border-b border-slate-200">
                  <div className="flex items-center gap-1.5">
                    <span>{h}</span>
                    {!disabled && headers.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeColumn(c)}
                        className="rounded-md p-0.5 text-slate-300 hover:bg-red-50 hover:text-red-500"
                        title="Hapus kolom"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </th>
              ))}
              {!disabled && (
                <th className="w-10 border-b border-slate-200">
                  <button
                    type="button"
                    onClick={addColumn}
                    className="rounded-md p-1.5 text-slate-300 hover:bg-brand-green-light hover:text-brand-green"
                    title="Tambah kolom"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </th>
              )}
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
        <div className="mt-2 flex flex-wrap gap-3">
          <button onClick={addRow} className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-green hover:text-brand-green-dark">
            <Plus className="h-4 w-4" /> Tambah baris
          </button>
          <button onClick={addColumn} className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-green hover:text-brand-green-dark">
            <Plus className="h-4 w-4" /> Tambah kolom
          </button>
        </div>
      )}
    </div>
  );
}
