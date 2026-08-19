import {
  db,
  type Jawaban,
  type AssessmentEksternal,
  type StatusKuisSiswa,
  type AnswerValue,
} from "@/lib/firebase";
import {
  doc,
  getDoc,
  setDoc,
  getDocs,
  collection,
  query,
  where,
  orderBy,
  addDoc,
  updateDoc,
} from "firebase/firestore";

/**
 * Firestore does NOT support nested arrays (e.g. `string[][]`).
 * Table answers are stored as `{ rows: string[][] }`, so before writing we
 * convert each row array into a `{ cells: string[] }` map (arrays of maps are
 * allowed). On read we convert them back to `string[][]`.
 */

function sanitizeAnswerValue(value: AnswerValue): AnswerValue {
  if (value === null || value === undefined) return null;
  if (Array.isArray(value)) {
    return value.map((v) => sanitizeAnswerValue(v as AnswerValue)) as string[];
  }
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      if (
        k === "rows" &&
        Array.isArray(v) &&
        v.some((row) => Array.isArray(row))
      ) {
        out[k] = v.map((row) =>
          Array.isArray(row) ? { cells: row.map((c) => String(c ?? "")) } : row,
        );
      } else {
        out[k] = sanitizeAnswerValue(v as AnswerValue);
      }
    }
    return out as AnswerValue;
  }
  return value;
}

function restoreAnswerValue(value: AnswerValue): AnswerValue {
  if (value === null || value === undefined) return null;
  if (Array.isArray(value)) {
    return value.map((v) => restoreAnswerValue(v as AnswerValue)) as string[];
  }
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      if (k === "rows" && Array.isArray(v)) {
        out[k] = v.map((row) => {
          if (Array.isArray(row)) return row.map((c) => String(c ?? ""));
          if (row && typeof row === "object") {
            const r = row as Record<string, unknown>;
            if (Array.isArray(r.cells)) {
              return (r.cells as unknown[]).map((c) => String(c ?? ""));
            }
            return Object.values(r).map((x) => String(x ?? ""));
          }
          return row;
        });
      } else {
        out[k] = restoreAnswerValue(v as AnswerValue);
      }
    }
    return out as AnswerValue;
  }
  return value;
}

function sanitizeIsiJawaban(isi: Record<string, AnswerValue>) {
  const out: Record<string, AnswerValue> = {};
  for (const [k, v] of Object.entries(isi)) out[k] = sanitizeAnswerValue(v);
  return out;
}

export function restoreIsiJawaban(
  isi: Record<string, AnswerValue> | null | undefined,
): Record<string, AnswerValue> {
  if (!isi) return {};
  const out: Record<string, AnswerValue> = {};
  for (const [k, v] of Object.entries(isi)) out[k] = restoreAnswerValue(v);
  return out;
}

export async function fetchJawaban(kegiatanId: string, siswaId: string) {
  const q = query(
    collection(db, "jawaban"),
    where("kegiatan_id", "==", kegiatanId),
    where("siswa_id", "==", siswaId),
  );
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
    isi_jawaban: restoreIsiJawaban(data.isi_jawaban),
  } as Jawaban;
}

export async function upsertJawabanDraft(
  kegiatanId: string,
  siswaId: string,
  isi: Record<string, AnswerValue>,
) {
  const existing = await fetchJawaban(kegiatanId, siswaId);
  const now = new Date().toISOString();
  const safeIsi = sanitizeIsiJawaban(isi);

  if (existing) {
    // Preserve existing status (do not downgrade 'terkumpul'/'dinilai' back to 'draft')
    const payload = {
      isi_jawaban: safeIsi,
      waktu_disimpan: now,
      ...(existing.status === "draft" ? { status: "draft" as const } : {}),
    };
    await updateDoc(doc(db, "jawaban", existing.id), payload);
    console.debug(
      "[upsertJawabanDraft] updated jawaban:",
      existing.id,
      payload,
    );
    return { ...existing, ...payload } as Jawaban;
  } else {
    const payload = {
      kegiatan_id: kegiatanId,
      siswa_id: siswaId,
      isi_jawaban: safeIsi,
      status: "draft" as const,
      waktu_disimpan: now,
    };
    const docRef = await addDoc(collection(db, "jawaban"), payload);
    console.debug("[upsertJawabanDraft] created jawaban:", docRef.id, payload);
    return { id: docRef.id, ...payload } as Jawaban;
  }
}

export async function submitJawaban(
  kegiatanId: string,
  siswaId: string,
  isi: Record<string, AnswerValue>,
) {
  const existing = await fetchJawaban(kegiatanId, siswaId);
  const payload = {
    kegiatan_id: kegiatanId,
    siswa_id: siswaId,
    isi_jawaban: sanitizeIsiJawaban(isi),
    status: "terkumpul" as const,
    waktu_dikumpulkan: new Date().toISOString(),
    waktu_disimpan: new Date().toISOString(),
  };

  if (existing) {
    await updateDoc(doc(db, "jawaban", existing.id), payload);
    console.debug("[submitJawaban] updated jawaban:", existing.id, payload);
    return { ...existing, ...payload } as Jawaban;
  } else {
    const docRef = await addDoc(collection(db, "jawaban"), payload);
    console.debug("[submitJawaban] created jawaban:", docRef.id, payload);
    return { id: docRef.id, ...payload } as Jawaban;
  }
}

export async function fetchAssessment(kegiatanId: string) {
  const q = query(
    collection(db, "assessment_eksternal"),
    where("kegiatan_id", "==", kegiatanId),
  );
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  return { id: doc.id, ...doc.data() } as AssessmentEksternal;
}

export async function fetchStatusKuis(kegiatanId: string, siswaId: string) {
  const q = query(
    collection(db, "status_kuis_siswa"),
    where("kegiatan_id", "==", kegiatanId),
    where("siswa_id", "==", siswaId),
  );
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  return { id: doc.id, ...doc.data() } as StatusKuisSiswa;
}

export async function upsertStatusKuis(
  kegiatanId: string,
  siswaId: string,
  sudah: boolean,
) {
  const existing = await fetchStatusKuis(kegiatanId, siswaId);
  const payload = {
    kegiatan_id: kegiatanId,
    siswa_id: siswaId,
    sudah_mengerjakan: sudah,
    waktu_ditandai: new Date().toISOString(),
  };

  if (existing) {
    await updateDoc(doc(db, "status_kuis_siswa", existing.id), payload);
    return { ...existing, ...payload } as StatusKuisSiswa;
  } else {
    const docRef = await addDoc(collection(db, "status_kuis_siswa"), payload);
    return { id: docRef.id, ...payload } as StatusKuisSiswa;
  }
}

export async function fetchAllJawabanSiswa(siswaId: string) {
  const q = query(collection(db, "jawaban"), where("siswa_id", "==", siswaId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      isi_jawaban: restoreIsiJawaban(data.isi_jawaban),
    } as Jawaban;
  });
}

export async function fetchAllStatusKuisSiswa(siswaId: string) {
  const q = query(
    collection(db, "status_kuis_siswa"),
    where("siswa_id", "==", siswaId),
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as StatusKuisSiswa[];
}

// Teacher helpers
export async function fetchKelasGuru(guruId: string) {
  const q = query(
    collection(db, "kelas"),
    where("guru_id", "==", guruId),
    orderBy("dibuat_pada", "desc"),
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

export async function fetchSiswaKelas(kelasId: string) {
  const q = query(
    collection(db, "profiles"),
    where("kelas_id", "==", kelasId),
    where("role", "==", "siswa"),
    orderBy("nama"),
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

export async function fetchJawabanKelas(
  kegiatanId: string,
  siswaIds: string[],
) {
  if (siswaIds.length === 0) return [];
  const q = query(
    collection(db, "jawaban"),
    where("kegiatan_id", "==", kegiatanId),
    where("siswa_id", "in", siswaIds),
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      isi_jawaban: restoreIsiJawaban(data.isi_jawaban),
    } as Jawaban;
  });
}

export async function fetchStatusKuisKelas(
  kegiatanId: string,
  siswaIds: string[],
) {
  if (siswaIds.length === 0) return [];
  const q = query(
    collection(db, "status_kuis_siswa"),
    where("kegiatan_id", "==", kegiatanId),
    where("siswa_id", "in", siswaIds),
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as StatusKuisSiswa[];
}
