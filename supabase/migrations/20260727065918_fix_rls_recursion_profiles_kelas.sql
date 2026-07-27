-- =========================================================
-- Fix infinite recursion in RLS policies
--
-- Root cause: profiles SELECT policy references kelas, and
-- kelas SELECT policy references profiles — creating an
-- infinite recursion that throws a 500 error on every query.
--
-- Fix: Break the cycle.
--   1) kelas SELECT: allow a guru to read their own classes by
--      checking guru_id = auth.uid() directly (no subquery).
--   2) profiles SELECT: allow self-read by id = auth.uid(),
--      and allow a guru to read profiles of students in their
--      class — but do the class-ownership check WITHOUT
--      recursing into profiles. We use a SECURITY DEFINER
--      function that reads kelas.guru_id directly.
-- =========================================================

-- ---------------------------------------------------------
-- Helper function: returns true if the given kelas_id belongs
-- to the current user (guru). Runs as the function owner
-- (postgres), so it bypasses RLS and avoids recursion.
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION is_kelas_owner(kelas_uuid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM kelas
    WHERE kelas.id = kelas_uuid
      AND kelas.guru_id = auth.uid()
  );
$$;

-- ---------------------------------------------------------
-- kelas: guru can read their own classes; siswa can read the
-- class they belong to (by kelas_id on their own profile row,
-- which is safe because profiles self-read is allowed).
-- ---------------------------------------------------------
DROP POLICY IF EXISTS "select_kelas" ON kelas;
CREATE POLICY "select_kelas" ON kelas FOR SELECT
  TO authenticated USING (
    guru_id = auth.uid()
    OR id IN (
      SELECT p.kelas_id FROM profiles p
      WHERE p.id = auth.uid() AND p.kelas_id IS NOT NULL
    )
  );

-- ---------------------------------------------------------
-- profiles: self-read (id = auth.uid()) OR guru reads
-- students in their class via the SECURITY DEFINER helper.
-- No more subquery into kelas with a subquery into profiles.
-- ---------------------------------------------------------
DROP POLICY IF EXISTS "select_profiles" ON profiles;
CREATE POLICY "select_profiles" ON profiles FOR SELECT
  TO authenticated USING (
    id = auth.uid()
    OR (
      profiles.kelas_id IS NOT NULL
      AND is_kelas_owner(profiles.kelas_id)
    )
  );
