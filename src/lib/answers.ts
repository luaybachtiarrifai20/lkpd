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

export async function fetchJawaban(kegiatanId: string, siswaId: string) {
  const q = query(
    collection(db, "jawaban"),
    where("kegiatan_id", "==", kegiatanId),
    where("siswa_id", "==", siswaId),
  );
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  return { id: doc.id, ...doc.data() } as Jawaban;
}

export async function upsertJawabanDraft(
  kegiatanId: string,
  siswaId: string,
  isi: Record<string, AnswerValue>,
) {
  const existing = await fetchJawaban(kegiatanId, siswaId);
  const payload = {
    kegiatan_id: kegiatanId,
    siswa_id: siswaId,
    isi_jawaban: isi,
    status: "draft" as const,
    waktu_disimpan: new Date().toISOString(),
  };

  if (existing) {
    await updateDoc(doc(db, "jawaban", existing.id), payload);
    return { ...existing, ...payload } as Jawaban;
  } else {
    const docRef = await addDoc(collection(db, "jawaban"), payload);
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
    isi_jawaban: isi,
    status: "terkumpul" as const,
    waktu_dikumpulkan: new Date().toISOString(),
    waktu_disimpan: new Date().toISOString(),
  };

  if (existing) {
    await updateDoc(doc(db, "jawaban", existing.id), payload);
    return { ...existing, ...payload } as Jawaban;
  } else {
    const docRef = await addDoc(collection(db, "jawaban"), payload);
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
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Jawaban[];
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
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Jawaban[];
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
