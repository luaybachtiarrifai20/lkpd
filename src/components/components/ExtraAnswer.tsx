import { AnswerValue } from "@/lib/firebase";
import { MultiTextAnswer } from "../interactive/MultiTextAnswer";

type ExtraAnswer =
  | { type: "teks"; value: string | string[] }
  | { type: "tabel"; value: { rows: string[][]; headers: string[] } };

export function ExtraAnswers({
  blockId,
  answers,
  onUpdate,
  disabled,
  savedAt,
}: {
  blockId: string;
  answers: Record<string, AnswerValue>;
  onUpdate: (key: string, val: AnswerValue) => void;
  disabled?: boolean;
  savedAt?: string | null;
}) {
  const extraKey = `${blockId}__extra`;
  const extras = (Array.isArray(answers[extraKey])
    ? answers[extraKey]
    : []) as unknown as ExtraAnswer[];

  const setExtras = (next: ExtraAnswer[]) => {
    onUpdate(extraKey, next as unknown as AnswerValue);
  };

  const addTeks = () => {
    setExtras([...extras, { type: "teks", value: "" }]);
  };

  const addTabel = () => {
    setExtras([
      ...extras,
      {
        type: "tabel",
        value: {
          headers: ["Kolom 1", "Kolom 2"],
          rows: [
            ["", ""],
            ["", ""],
          ],
        },
      },
    ]);
  };

  const updateAt = (i: number, item: ExtraAnswer) => {
    const next = [...extras];
    next[i] = item;
    setExtras(next);
  };

  const removeAt = (i: number) => {
    setExtras(extras.filter((_, idx) => idx !== i));
  };

  return (
    <div className="mt-3 space-y-3">
      {extras.map((item, i) => (
        <div
          key={i}
          className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-3 relative">
          {!disabled && (
            <button
              type="button"
              onClick={() => removeAt(i)}
              className="absolute top-2 right-2 text-xs text-slate-400 hover:text-red-500"
              title="Hapus kolom jawaban">
              Hapus
            </button>
          )}
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            Kolom jawaban tambahan {i + 1} ·{" "}
            {item.type === "teks" ? "Teks" : "Tabel"}
          </p>

          {item.type === "teks" ? (
            <MultiTextAnswer
              value={item.value}
              onChange={(v) => updateAt(i, { type: "teks", value: v })}
              disabled={disabled}
              rows={3}
              savedAt={savedAt}
            />
          ) : (
            <ExtraTableEditor
              value={item.value}
              disabled={disabled}
              onChange={(v) => updateAt(i, { type: "tabel", value: v })}
            />
          )}
        </div>
      ))}

      {!disabled && (
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={addTeks} className="btn-ghost text-xs">
            + Tambah kolom jawaban (teks)
          </button>
          <button type="button" onClick={addTabel} className="btn-ghost text-xs">
            + Tambah kolom jawaban (tabel)
          </button>
        </div>
      )}
    </div>
  );
}

function ExtraTableEditor({
  value,
  onChange,
  disabled,
}: {
  value: { rows: string[][]; headers: string[] };
  onChange: (v: { rows: string[][]; headers: string[] }) => void;
  disabled?: boolean;
}) {
  const headers = value.headers?.length
    ? value.headers
    : ["Kolom 1", "Kolom 2"];
  const rows =
    value.rows?.length > 0
      ? value.rows
      : [
          ["", ""],
          ["", ""],
        ];

  const commit = (nextRows: string[][], nextHeaders: string[]) => {
    onChange({ rows: nextRows, headers: nextHeaders });
  };

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50">
              {headers.map((h, ci) => (
                <th key={ci} className="px-2 py-2 text-left border-b">
                  <input
                    className="w-full bg-transparent text-xs font-semibold focus:outline-none"
                    value={h}
                    disabled={disabled}
                    onChange={(e) => {
                      const nh = [...headers];
                      nh[ci] = e.target.value;
                      commit(rows, nh);
                    }}
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri}>
                {headers.map((_, ci) => (
                  <td key={ci} className="border-b border-slate-100 p-0">
                    <input
                      className="w-full px-2 py-2 text-sm focus:bg-brand-green-light/30 focus:outline-none"
                      value={row[ci] || ""}
                      disabled={disabled}
                      onChange={(e) => {
                        const nr = rows.map((r) => [...r]);
                        if (!nr[ri]) nr[ri] = headers.map(() => "");
                        nr[ri][ci] = e.target.value;
                        commit(nr, headers);
                      }}
                      placeholder="…"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!disabled && (
        <div className="flex gap-2">
          <button
            type="button"
            className="btn-ghost text-xs"
            onClick={() =>
              commit(
                [...rows, headers.map(() => "")],
                headers,
              )
            }>
            + Baris
          </button>
          <button
            type="button"
            className="btn-ghost text-xs"
            onClick={() => {
              const nh = [...headers, `Kolom ${headers.length + 1}`];
              commit(
                rows.map((r) => [...r, ""]),
                nh,
              );
            }}>
            + Kolom
          </button>
        </div>
      )}
    </div>
  );
}