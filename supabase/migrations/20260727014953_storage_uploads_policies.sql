/*
# Storage policies for uploads bucket

1. Changes
- Menambahkan kebijakan storage (RLS) pada bucket `uploads` agar pengguna terautentikasi dapat mengunggah & membaca file jawaban siswa.
- File bersifat publik dibaca (getPublicUrl), tetapi unggah hanya untuk pengguna terautentikasi.

2. Security
- SELECT/READ publik (file jawaban perlu diakses guru & siswa via URL publik).
- INSERT/UPDATE/DELETE hanya untuk pengguna terautentikasi.
*/

DROP POLICY IF EXISTS "uploads_read_public" ON storage.objects;
CREATE POLICY "uploads_read_public" ON storage.objects FOR SELECT
  TO anon, authenticated USING (bucket_id = 'uploads');

DROP POLICY IF EXISTS "uploads_insert_auth" ON storage.objects;
CREATE POLICY "uploads_insert_auth" ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (bucket_id = 'uploads');

DROP POLICY IF EXISTS "uploads_update_auth" ON storage.objects;
CREATE POLICY "uploads_update_auth" ON storage.objects FOR UPDATE
  TO authenticated USING (bucket_id = 'uploads') WITH CHECK (bucket_id = 'uploads');

DROP POLICY IF EXISTS "uploads_delete_auth" ON storage.objects;
CREATE POLICY "uploads_delete_auth" ON storage.objects FOR DELETE
  TO authenticated USING (bucket_id = 'uploads');
