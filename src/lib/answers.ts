import { supabase, type Jawaban, type AssessmentEksternal, type StatusKuisSiswa, type AnswerValue } from '@/lib/supabase';

export async function fetchJawaban(kegiatanId: string, siswaId: string) {
  const { data, error } = await supabase
    .from('jawaban')
    .select('*')
    .eq('kegiatan_id', kegiatanId)
    .eq('siswa_id', siswaId)
    .maybeSingle();
  if (error) throw error;
  return data as Jawaban | null;
}

export async function upsertJawabanDraft(kegiatanId: string, siswaId: string, isi: Record<string, AnswerValue>) {
  const payload = {
    kegiatan_id: kegiatanId,
    siswa_id: siswaId,
    isi_jawaban: isi,
    status: 'draft' as const,
    waktu_disimpan: new Date().toISOString(),
  };
  const { data, error } = await supabase
    .from('jawaban')
    .upsert(payload, { onConflict: 'kegiatan_id,siswa_id' })
    .select()
    .maybeSingle();
  if (error) throw error;
  return data as Jawaban;
}

export async function submitJawaban(kegiatanId: string, siswaId: string, isi: Record<string, AnswerValue>) {
  const { data, error } = await supabase
    .from('jawaban')
    .upsert(
      {
        kegiatan_id: kegiatanId,
        siswa_id: siswaId,
        isi_jawaban: isi,
        status: 'terkumpul',
        waktu_dikumpulkan: new Date().toISOString(),
        waktu_disimpan: new Date().toISOString(),
      },
      { onConflict: 'kegiatan_id,siswa_id' },
    )
    .select()
    .maybeSingle();
  if (error) throw error;
  return data as Jawaban;
}

export async function fetchAssessment(kegiatanId: string) {
  const { data, error } = await supabase
    .from('assessment_eksternal')
    .select('*')
    .eq('kegiatan_id', kegiatanId)
    .maybeSingle();
  if (error) throw error;
  return data as AssessmentEksternal | null;
}

export async function fetchStatusKuis(kegiatanId: string, siswaId: string) {
  const { data, error } = await supabase
    .from('status_kuis_siswa')
    .select('*')
    .eq('kegiatan_id', kegiatanId)
    .eq('siswa_id', siswaId)
    .maybeSingle();
  if (error) throw error;
  return data as StatusKuisSiswa | null;
}

export async function upsertStatusKuis(kegiatanId: string, siswaId: string, sudah: boolean) {
  const { data, error } = await supabase
    .from('status_kuis_siswa')
    .upsert(
      { kegiatan_id: kegiatanId, siswa_id: siswaId, sudah_mengerjakan: sudah, waktu_ditandai: new Date().toISOString() },
      { onConflict: 'kegiatan_id,siswa_id' },
    )
    .select()
    .maybeSingle();
  if (error) throw error;
  return data as StatusKuisSiswa;
}

export async function fetchAllJawabanSiswa(siswaId: string) {
  const { data, error } = await supabase.from('jawaban').select('*').eq('siswa_id', siswaId);
  if (error) throw error;
  return (data as Jawaban[]) || [];
}

export async function fetchAllStatusKuisSiswa(siswaId: string) {
  const { data, error } = await supabase.from('status_kuis_siswa').select('*').eq('siswa_id', siswaId);
  if (error) throw error;
  return (data as StatusKuisSiswa[]) || [];
}

// Teacher helpers
export async function fetchKelasGuru(guruId: string) {
  const { data, error } = await supabase.from('kelas').select('*').eq('guru_id', guruId).order('dibuat_pada', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function fetchSiswaKelas(kelasId: string) {
  const { data, error } = await supabase.from('profiles').select('*').eq('kelas_id', kelasId).eq('role', 'siswa').order('nama');
  if (error) throw error;
  return data || [];
}

export async function fetchJawabanKelas(kegiatanId: string, siswaIds: string[]) {
  if (siswaIds.length === 0) return [];
  const { data, error } = await supabase.from('jawaban').select('*').eq('kegiatan_id', kegiatanId).in('siswa_id', siswaIds);
  if (error) throw error;
  return (data as Jawaban[]) || [];
}

export async function fetchStatusKuisKelas(kegiatanId: string, siswaIds: string[]) {
  if (siswaIds.length === 0) return [];
  const { data, error } = await supabase.from('status_kuis_siswa').select('*').eq('kegiatan_id', kegiatanId).in('siswa_id', siswaIds);
  if (error) throw error;
  return (data as StatusKuisSiswa[]) || [];
}
