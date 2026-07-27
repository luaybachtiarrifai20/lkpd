import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ToastProvider } from '@/context/ToastContext';
import { LandingPage } from '@/pages/LandingPage';
import { AboutPage } from '@/pages/AboutPage';
import { AuthPage } from '@/pages/AuthPage';
import { StudentDashboard, StudentRiwayat, StudentProfil } from '@/pages/student/StudentDashboard';
import { ActivityPage } from '@/pages/student/ActivityPage';
import {
  TeacherDashboard, TeacherKelas, TeacherRekap,
  TeacherSiswaDetail, TeacherAssessment, TeacherEkspor, TeacherProfil,
} from '@/pages/teacher/TeacherPages';
import type { ReactNode } from 'react';

function ProtectedRoute({ role, children }: { role: 'siswa' | 'guru'; children: ReactNode }) {
  const { profile, session, loading } = useAuth();
  // While auth state is initializing, show nothing — don't redirect.
  // Redirecting here when loading=true is the classic cause of the
  // "login succeeds but bounces back to /login" bug.
  if (loading) return <div className="grid min-h-screen place-items-center text-slate-400">Memuat…</div>;
  if (!session) return <Navigate to="/login" replace />;
  if (!profile) return <div className="grid min-h-screen place-items-center text-slate-400">Memuat profil…</div>;
  if (profile.role !== role) return <Navigate to={profile.role === 'guru' ? '/guru' : '/siswa'} replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/tentang" element={<AboutPage />} />
            <Route path="/login" element={<AuthPage mode="login" />} />
            <Route path="/daftar" element={<AuthPage mode="daftar" />} />

            <Route path="/siswa" element={<ProtectedRoute role="siswa"><StudentDashboard /></ProtectedRoute>} />
            <Route path="/siswa/kegiatan/:nomor" element={<ProtectedRoute role="siswa"><ActivityPage /></ProtectedRoute>} />
            <Route path="/siswa/riwayat" element={<ProtectedRoute role="siswa"><StudentRiwayat /></ProtectedRoute>} />
            <Route path="/siswa/profil" element={<ProtectedRoute role="siswa"><StudentProfil /></ProtectedRoute>} />

            <Route path="/guru" element={<ProtectedRoute role="guru"><TeacherDashboard /></ProtectedRoute>} />
            <Route path="/guru/kelas" element={<ProtectedRoute role="guru"><TeacherKelas /></ProtectedRoute>} />
            <Route path="/guru/rekap" element={<ProtectedRoute role="guru"><TeacherRekap /></ProtectedRoute>} />
            <Route path="/guru/siswa/:id" element={<ProtectedRoute role="guru"><TeacherSiswaDetail /></ProtectedRoute>} />
            <Route path="/guru/assessment" element={<ProtectedRoute role="guru"><TeacherAssessment /></ProtectedRoute>} />
            <Route path="/guru/ekspor" element={<ProtectedRoute role="guru"><TeacherEkspor /></ProtectedRoute>} />
            <Route path="/guru/profil" element={<ProtectedRoute role="guru"><TeacherProfil /></ProtectedRoute>} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}
