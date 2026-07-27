/*
# E-LKPD LajuNalar — Skema Database Inti

Membuat seluruh tabel untuk platform E-LKPD interaktif Laju Reaksi berbasis PBL-ESD.

1. Tabel Baru
- `kelas`: kelas yang dikelola guru (nama, guru pemilik, kode undangan).
- `profiles`: profil pengguna (siswa/guru) tertaut ke auth.users, dengan kelas_id untuk siswa.
- `kegiatan`: 4 Kegiatan Belajar Laju Reaksi (metadata + konten JSON).
- `jawaban`: dokumen jawaban satu siswa per kegiatan (JSONB isi_jawaban, status draft/terkumpul/dinilai, skor, feedback).
- `assessment_eksternal`: tautan kuis eksternal (Google Forms/Quizizz) per kegiatan untuk embed + QR.
- `status_kuis_siswa`: penanda siswa sudah mengerjakan kuis + skor manual input guru.

2. Keamanan (RLS)
- Semua tabel mengaktifkan RLS.
- Aplikasi memiliki layar masuk (siswa & guru) → kebijakan `TO authenticated`.
- Siswa hanya melihat data miliknya; guru melihat data siswa di kelasnya.
- Konten kegiatan & tautan assessment dapat dibaca semua pengguna terautentikasi; hanya guru yang mengubah.

3. Catatan
- Relasi siklus kelas↔profiles ditangani dengan membuat kelas dulu tanpa FK guru, lalu menambah FK setelah profiles ada.
- Seeding 4 kegiatan dilakukan di migration terpisah.
*/

-- =========================================================
-- kelas (dibuat tanpa FK guru dulu untuk menghindari siklus)
-- =========================================================
CREATE TABLE IF NOT EXISTS kelas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nama_kelas text NOT NULL,
  guru_id uuid NOT NULL,
  kode_undangan text UNIQUE,
  dibuat_pada timestamptz DEFAULT now()
);

-- =========================================================
-- profiles
-- =========================================================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nama text NOT NULL,
  role text NOT NULL CHECK (role IN ('siswa','guru')),
  email text,
  username text,
  nisn text,
  kelas_id uuid REFERENCES kelas(id) ON DELETE SET NULL,
  dibuat_pada timestamptz DEFAULT now()
);

-- Tambah FK guru_id ke profiles setelah profiles ada
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'kelas_guru_id_fkey' AND table_name = 'kelas'
  ) THEN
    ALTER TABLE kelas
      ADD CONSTRAINT kelas_guru_id_fkey
      FOREIGN KEY (guru_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- =========================================================
-- kegiatan
-- =========================================================
CREATE TABLE IF NOT EXISTS kegiatan (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nomor int NOT NULL UNIQUE,
  judul text NOT NULL,
  deskripsi text,
  warna_tema text,
  sdg_badges jsonb DEFAULT '[]'::jsonb,
  tujuan text,
  materi text,
  dibuat_pada timestamptz DEFAULT now()
);

-- =========================================================
-- jawaban (satu dokumen per siswa per kegiatan)
-- =========================================================
CREATE TABLE IF NOT EXISTS jawaban (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kegiatan_id uuid NOT NULL REFERENCES kegiatan(id) ON DELETE CASCADE,
  siswa_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  isi_jawaban jsonb DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','terkumpul','dinilai')),
  skor int,
  feedback_guru text,
  waktu_disimpan timestamptz DEFAULT now(),
  waktu_dikumpulkan timestamptz,
  UNIQUE(kegiatan_id, siswa_id)
);

-- =========================================================
-- assessment_eksternal (link kuis pihak ketiga per kegiatan)
-- =========================================================
CREATE TABLE IF NOT EXISTS assessment_eksternal (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kegiatan_id uuid NOT NULL REFERENCES kegiatan(id) ON DELETE CASCADE,
  judul_kuis text,
  url_kuis text,
  dibuat_oleh_guru_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  diperbarui_pada timestamptz DEFAULT now()
);

-- =========================================================
-- status_kuis_siswa
-- =========================================================
CREATE TABLE IF NOT EXISTS status_kuis_siswa (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  siswa_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  kegiatan_id uuid NOT NULL REFERENCES kegiatan(id) ON DELETE CASCADE,
  sudah_mengerjakan boolean DEFAULT false,
  skor_manual int,
  catatan_guru text,
  waktu_ditandai timestamptz,
  UNIQUE(siswa_id, kegiatan_id)
);

-- =========================================================
-- Indexes
-- =========================================================
CREATE INDEX IF NOT EXISTS idx_profiles_kelas ON profiles(kelas_id);
CREATE INDEX IF NOT EXISTS idx_jawaban_siswa ON jawaban(siswa_id);
CREATE INDEX IF NOT EXISTS idx_jawaban_kegiatan ON jawaban(kegiatan_id);
CREATE INDEX IF NOT EXISTS idx_status_kuis_siswa ON status_kuis_siswa(siswa_id);
CREATE INDEX IF NOT EXISTS idx_assessment_kegiatan ON assessment_eksternal(kegiatan_id);

-- =========================================================
-- RLS: aktifkan di semua tabel
-- =========================================================
ALTER TABLE kelas ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE kegiatan ENABLE ROW LEVEL SECURITY;
ALTER TABLE jawaban ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_eksternal ENABLE ROW LEVEL SECURITY;
ALTER TABLE status_kuis_siswa ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- Kebijakan kelas
-- =========================================================
DROP POLICY IF EXISTS "select_kelas" ON kelas;
CREATE POLICY "select_kelas" ON kelas FOR SELECT
  TO authenticated USING (
    guru_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.kelas_id = kelas.id)
  );

DROP POLICY IF EXISTS "insert_kelas" ON kelas;
CREATE POLICY "insert_kelas" ON kelas FOR INSERT
  TO authenticated WITH CHECK (guru_id = auth.uid());

DROP POLICY IF EXISTS "update_kelas" ON kelas;
CREATE POLICY "update_kelas" ON kelas FOR UPDATE
  TO authenticated USING (guru_id = auth.uid()) WITH CHECK (guru_id = auth.uid());

DROP POLICY IF EXISTS "delete_kelas" ON kelas;
CREATE POLICY "delete_kelas" ON kelas FOR DELETE
  TO authenticated USING (guru_id = auth.uid());

-- =========================================================
-- Kebijakan profiles
-- =========================================================
DROP POLICY IF EXISTS "select_profiles" ON profiles;
CREATE POLICY "select_profiles" ON profiles FOR SELECT
  TO authenticated USING (
    id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM kelas k
      WHERE k.guru_id = auth.uid()
        AND k.id = profiles.kelas_id
    )
  );

DROP POLICY IF EXISTS "insert_profiles" ON profiles;
CREATE POLICY "insert_profiles" ON profiles FOR INSERT
  TO authenticated WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "update_profiles" ON profiles;
CREATE POLICY "update_profiles" ON profiles FOR UPDATE
  TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- =========================================================
-- Kebijakan kegiatan (konten publik untuk terautentikasi)
-- =========================================================
DROP POLICY IF EXISTS "select_kegiatan" ON kegiatan;
CREATE POLICY "select_kegiatan" ON kegiatan FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_kegiatan_guru" ON kegiatan;
CREATE POLICY "insert_kegiatan_guru" ON kegiatan FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'guru')
  );

DROP POLICY IF EXISTS "update_kegiatan_guru" ON kegiatan;
CREATE POLICY "update_kegiatan_guru" ON kegiatan FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'guru')
  );

-- =========================================================
-- Kebijakan jawaban
-- =========================================================
DROP POLICY IF EXISTS "select_jawaban" ON jawaban;
CREATE POLICY "select_jawaban" ON jawaban FOR SELECT
  TO authenticated USING (
    siswa_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles p
      JOIN kelas k ON p.kelas_id = k.id
      WHERE p.id = jawaban.siswa_id AND k.guru_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "insert_jawaban" ON jawaban;
CREATE POLICY "insert_jawaban" ON jawaban FOR INSERT
  TO authenticated WITH CHECK (siswa_id = auth.uid());

DROP POLICY IF EXISTS "update_jawaban" ON jawaban;
CREATE POLICY "update_jawaban" ON jawaban FOR UPDATE
  TO authenticated USING (
    siswa_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles p
      JOIN kelas k ON p.kelas_id = k.id
      WHERE p.id = jawaban.siswa_id AND k.guru_id = auth.uid()
    )
  ) WITH CHECK (
    siswa_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles p
      JOIN kelas k ON p.kelas_id = k.id
      WHERE p.id = jawaban.siswa_id AND k.guru_id = auth.uid()
    )
  );

-- =========================================================
-- Kebijakan assessment_eksternal
-- =========================================================
DROP POLICY IF EXISTS "select_assessment" ON assessment_eksternal;
CREATE POLICY "select_assessment" ON assessment_eksternal FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_assessment_guru" ON assessment_eksternal;
CREATE POLICY "insert_assessment_guru" ON assessment_eksternal FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'guru')
  );

DROP POLICY IF EXISTS "update_assessment_guru" ON assessment_eksternal;
CREATE POLICY "update_assessment_guru" ON assessment_eksternal FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'guru')
  );

DROP POLICY IF EXISTS "delete_assessment_guru" ON assessment_eksternal;
CREATE POLICY "delete_assessment_guru" ON assessment_eksternal FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'guru')
  );

-- =========================================================
-- Kebijakan status_kuis_siswa
-- =========================================================
DROP POLICY IF EXISTS "select_status_kuis" ON status_kuis_siswa;
CREATE POLICY "select_status_kuis" ON status_kuis_siswa FOR SELECT
  TO authenticated USING (
    siswa_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles p
      JOIN kelas k ON p.kelas_id = k.id
      WHERE p.id = status_kuis_siswa.siswa_id AND k.guru_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "insert_status_kuis" ON status_kuis_siswa;
CREATE POLICY "insert_status_kuis" ON status_kuis_siswa FOR INSERT
  TO authenticated WITH CHECK (siswa_id = auth.uid());

DROP POLICY IF EXISTS "update_status_kuis" ON status_kuis_siswa;
CREATE POLICY "update_status_kuis" ON status_kuis_siswa FOR UPDATE
  TO authenticated USING (
    siswa_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles p
      JOIN kelas k ON p.kelas_id = k.id
      WHERE p.id = status_kuis_siswa.siswa_id AND k.guru_id = auth.uid()
    )
  ) WITH CHECK (
    siswa_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles p
      JOIN kelas k ON p.kelas_id = k.id
      WHERE p.id = status_kuis_siswa.siswa_id AND k.guru_id = auth.uid()
    )
  );
