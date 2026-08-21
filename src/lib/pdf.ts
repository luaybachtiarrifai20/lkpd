import { jsPDF } from "jspdf";
import { KEGIATAN_CONTENT } from "@/content/kegiatanContent";
import { PROJECT_IDENTITY } from "@/content/kegiatanContent";
import type { Jawaban, Profile } from "@/lib/firebase";
import type { StatusKuisSiswa } from "@/lib/firebase";

function formatDate(iso?: string | null) {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("id-ID", {
    dateStyle: "long",
    timeStyle: "short",
  });
}

// Export jawaban 1 siswa 1 kegiatan ke PDF
export function exportJawabanPDF(
  jawaban: Jawaban,
  siswa: Profile,
  kelasNama: string,
  kegiatanNomor: number,
  statusKuis?: StatusKuisSiswa | null,
  sekolah?: string,
) {
  const keg = KEGIATAN_CONTENT.find((k) => k.nomor === kegiatanNomor);
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 40;
  let y = margin;

  const ensureSpace = (h: number) => {
    if (y + h > pageH - margin - 24) {
      doc.addPage();
      y = margin;
    }
  };

  const writeText = (
    text: string,
    opts: {
      size?: number;
      bold?: boolean;
      color?: [number, number, number];
      maxW?: number;
    } = {},
  ) => {
    const size = opts.size || 10;
    const maxW = opts.maxW || pageW - margin * 2;
    doc.setFont("helvetica", opts.bold ? "bold" : "normal");
    doc.setFontSize(size);
    if (opts.color) doc.setTextColor(...opts.color);
    else doc.setTextColor(33, 41, 46);
    const lines = doc.splitTextToSize(text, maxW);
    for (const line of lines) {
      ensureSpace(size + 4);
      doc.text(line, margin, y);
      y += size + 4;
    }
  };

  const divider = () => {
    ensureSpace(10);
    doc.setDrawColor(220, 224, 227);
    doc.line(margin, y, pageW - margin, y);
    y += 12;
  };

  // Kop
  writeText(sekolah || "LajuNalar — E-LKPD Laju Reaksi", {
    size: 14,
    bold: true,
    color: [27, 94, 32],
  });
  writeText(PROJECT_IDENTITY.namaProduk, { size: 9, color: [90, 100, 105] });
  divider();
  writeText(`Kegiatan: ${keg?.judul || "Kegiatan"}`, { size: 12, bold: true });
  writeText(
    `Siswa: ${siswa.nama}  |  Kelas: ${kelasNama}  |  Status: ${jawaban.status}`,
    { size: 10 },
  );
  writeText(`Dikumpulkan: ${formatDate(jawaban.waktu_dikumpulkan)}`, {
    size: 9,
    color: [90, 100, 105],
  });
  divider();

  // Jawaban per step
  if (keg) {
    keg.steps.forEach((step) => {
      writeText(`Sintaks PBL ${step.sintaks} — ${step.label}`, {
        size: 11,
        bold: true,
        color: [27, 94, 32],
      });
      y += 4;
      step.blocks.forEach((block) => {
        // Blocks with their own answer id
        const ansId = "id" in block ? block.id : null;
        const altId = "alasanId" in block ? block.alasanId : null;
        const efId = "pertanyaanId" in block ? block.pertanyaanId : null;
        const perId = "perencanaanId" in block ? block.perencanaanId : null;

        // Section headers / info-only blocks (no answer expected)
        if (block.kind === "bagian-header") {
          writeText(`— ${block.label} —`, {
            size: 10,
            bold: true,
            color: [90, 100, 105],
          });
          return;
        }
        if (block.kind === "data-eksperimen") {
          writeText(`[Data] ${block.title}`, {
            size: 10,
            bold: true,
            color: [55, 71, 79],
          });
          writeText(`Headers: ${block.headers.join(" | ")}`, {
            size: 9,
            color: [90, 100, 105],
          });
          block.rows.forEach((r) =>
            writeText(r.join(" | "), { size: 9, color: [90, 100, 105] }),
          );
          return;
        }
        if (block.kind === "diagram-submikro") {
          writeText(`[Diagram] ${block.title}`, {
            size: 10,
            bold: true,
            color: [55, 71, 79],
          });
          writeText(`  ${block.kiri.label}: ${block.kiri.deskripsi}`, {
            size: 9,
            color: [90, 100, 105],
          });
          writeText(`  ${block.kanan.label}: ${block.kanan.deskripsi}`, {
            size: 9,
            color: [90, 100, 105],
          });
          return;
        }
        if (block.kind === "instruksi-pengembangan") {
          writeText(`[Instruksi] ${block.title}`, {
            size: 10,
            bold: true,
            color: [55, 71, 79],
          });
          writeText(block.body, { size: 9, color: [90, 100, 105] });
          if (block.bullets)
            block.bullets.forEach((b) =>
              writeText(`  • ${b}`, { size: 9, color: [90, 100, 105] }),
            );
          return;
        }
        if (block.kind === "penalaran-level") {
          writeText("[Integrasi Penalaran Kimia — 3 Level]", {
            size: 10,
            bold: true,
            color: [55, 71, 79],
          });
          writeText(`  Makroskopik: ${block.makroskopik}`, {
            size: 9,
            color: [90, 100, 105],
          });
          writeText(`  Submikroskopik: ${block.submikroskopik}`, {
            size: 9,
            color: [90, 100, 105],
          });
          writeText(`  Simbolik: ${block.simbolik}`, {
            size: 9,
            color: [90, 100, 105],
          });
          return;
        }
        if (block.kind === "analisis-efisiensi") {
          writeText(`[Tabel Efisiensi] ${block.title}`, {
            size: 10,
            bold: true,
            color: [55, 71, 79],
          });
          writeText(`  ${block.headers.join(" | ")}`, {
            size: 9,
            color: [90, 100, 105],
          });
          block.rows.forEach((r) =>
            writeText(`  ${r.join(" | ")}`, { size: 9, color: [90, 100, 105] }),
          );
          if (efId) {
            writeText(`  ${block.pertanyaanText}`, { size: 10, bold: true });
            const ans = jawaban.isi_jawaban[efId];
            renderAnswer(doc, ans, (t) =>
              writeText(`  Jawaban: ${t || "(kosong)"}`, {
                size: 10,
                color: [55, 71, 79],
              }),
            );
          }
          return;
        }

        // Standard answer blocks
        if (ansId) {
          const qText =
            "text" in block
              ? block.text
              : "label" in block
                ? block.label
                : block.title || "";
          if (qText) writeText(`• ${qText}`, { size: 10, bold: true });
          const ans = jawaban.isi_jawaban[ansId];
          renderAnswer(doc, ans, (t) =>
            writeText(`  Jawaban: ${t || "(kosong)"}`, {
              size: 10,
              color: [55, 71, 79],
            }),
          );
          // Image upload for analitis/input-hitung with allowImage
          if ("allowImage" in block && block.allowImage) {
            const imgAns = jawaban.isi_jawaban[`${ansId}_img`];
            if (imgAns)
              renderAnswer(doc, imgAns, (t) =>
                writeText(`  Lampiran: ${t}`, {
                  size: 9,
                  color: [90, 100, 105],
                }),
              );
          }
        }
        // Perencanaan text for tabel-org
        if (perId) {
          writeText(`  Perencanaan Penyelidikan:`, { size: 10, bold: true });
          const ans = jawaban.isi_jawaban[perId];
          renderAnswer(doc, ans, (t) =>
            writeText(`  ${t || "(kosong)"}`, {
              size: 10,
              color: [55, 71, 79],
            }),
          );
        }
        // Alasan for alternatif-kasus
        if (altId) {
          writeText(`  Alasan pemilihan:`, { size: 10, bold: true });
          const ans = jawaban.isi_jawaban[altId];
          renderAnswer(doc, ans, (t) =>
            writeText(`  ${t || "(kosong)"}`, {
              size: 10,
              color: [55, 71, 79],
            }),
          );
        }
      });
      y += 6;
    });
  }

  // Skor & feedback
  divider();
  writeText("Penilaian", { size: 12, bold: true });
  writeText(`Skor: ${jawaban.skor != null ? jawaban.skor : "Belum dinilai"}`, {
    size: 10,
  });
  writeText(`Feedback guru: ${jawaban.feedback_guru || "-"}`, { size: 10 });
  if (statusKuis) {
    writeText(
      `Kuis: ${statusKuis.sudah_mengerjakan ? "Sudah dikerjakan" : "Belum"} | Skor kuis (manual): ${statusKuis.skor_manual ?? "Belum direkap"}`,
      { size: 10 },
    );
  } else {
    writeText(
      "Kuis: Kuis dikerjakan di platform eksternal — skor belum direkap",
      { size: 10, color: [120, 120, 120] },
    );
  }

  // Footer page numbers
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `${PROJECT_IDENTITY.namaProduk} • Halaman ${i}/${pageCount}`,
      margin,
      pageH - 20,
    );
  }

  doc.save(
    `Jawaban_${siswa.nama.replace(/\s/g, "_")}_Kegiatan${keg?.nomor || ""}.pdf`,
  );
}

function renderAnswer(doc: jsPDF, ans: unknown, write: (text: string) => void) {
  if (ans == null) {
    write("(kosong)");
    return;
  }
  if (typeof ans === "string") {
    write(ans);
    return;
  }
  if (Array.isArray(ans)) {
    write(ans.join(", "));
    return;
  }
  if (typeof ans === "object") {
    const a = ans as {
      rows?: unknown;
      headers?: string[];
      files?: { name: string; url: string }[];
      tap?: Record<string, string>;
    };
    if (a.rows && Array.isArray(a.rows)) {
      if (Array.isArray(a.headers) && a.headers.length > 0) {
        write(a.headers.map((h) => String(h ?? "")).join(" | "));
      }
      write(`[Tabel ${a.rows.length} baris]`);
      a.rows.forEach((row) => {
        if (Array.isArray(row)) {
          write(row.map((c) => String(c ?? "")).join(" | "));
        } else if (row && typeof row === "object" && "cells" in row) {
          write(
            ((row as { cells?: unknown[] }).cells || [])
              .map((c) => String(c ?? ""))
              .join(" | "),
          );
        } else {
          write(String(row ?? ""));
        }
      });
      return;
    }
    if (a.files) {
      write(`[File terunggah: ${a.files.length}]`);
      a.files.forEach((f) => write(`- ${f.name} (${f.url})`));
      return;
    }
    if (a.tap) {
      Object.entries(a.tap).forEach(([k, v]) => write(`${k}: ${v}`));
      return;
    }
  }
  write("(kosong)");
}

// Export rekap kelas ke PDF (tabel ringkas)
export function exportRekapPDF(
  rows: {
    nama: string;
    kelas: string;
    kegiatan: string;
    status: string;
    kuis: string;
    skorKuis: string | number | null;
    waktu: string;
  }[],
  kelasNama: string,
) {
  const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "landscape" });
  let y = 40;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(27, 94, 32);
  doc.text(`Rekap Nilai Kelas ${kelasNama}`, 40, y);
  y += 16;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(90, 100, 105);
  doc.text(
    `${PROJECT_IDENTITY.namaProduk} • ${formatDate(new Date().toISOString())}`,
    40,
    y,
  );
  y += 20;

  const cols = [
    "Nama",
    "Kegiatan",
    "Status Jawaban",
    "Status Kuis",
    "Skor Kuis",
    "Waktu",
  ];
  const widths = [120, 140, 100, 90, 70, 160];
  let x = 40;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setFillColor(232, 245, 233);
  doc.rect(
    x,
    y - 10,
    widths.reduce((a, b) => a + b, 0),
    18,
    "F",
  );
  cols.forEach((c, i) => {
    doc.text(c, x + 4, y);
    x += widths[i];
  });
  y += 16;

  doc.setFont("helvetica", "normal");
  rows.forEach((r) => {
    if (y > doc.internal.pageSize.getHeight() - 40) {
      doc.addPage();
      y = 40;
    }
    x = 40;
    [
      r.nama,
      r.kegiatan,
      r.status,
      r.kuis,
      String(r.skorKuis ?? "-"),
      r.waktu,
    ].forEach((val, i) => {
      doc.text(String(val).slice(0, 40), x + 4, y);
      x += widths[i];
    });
    y += 14;
  });

  doc.save(`Rekap_Kelas_${kelasNama.replace(/\s/g, "_")}.pdf`);
}
