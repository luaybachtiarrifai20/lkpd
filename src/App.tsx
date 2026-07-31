import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { ToastProvider } from "@/context/ToastContext";
import { LandingPage } from "@/pages/LandingPage";
import { AboutPage } from "@/pages/AboutPage";
import { AuthPage } from "@/pages/AuthPage";
import {
  StudentDashboard,
  StudentRiwayat,
  StudentProfil,
} from "@/pages/student/StudentDashboard";
import { ActivityPage } from "@/pages/student/ActivityPage";
import {
  TeacherDashboard,
  TeacherKelas,
  TeacherRekap,
  TeacherSiswaDetail,
  TeacherAssessment,
  TeacherEkspor,
  TeacherProfil,
} from "@/pages/teacher/TeacherPages";
import { SuperAdminLogin } from "@/pages/SuperAdminLogin";
import { SuperAdminDashboard } from "@/pages/SuperAdminDashboard";
import { SetupSuperAdmin } from "@/pages/SetupSuperAdmin";
import type { ReactNode } from "react";
import { ManageQuestions } from "./pages/super-admin/ManageQuestions";
import { TestPage } from "./pages/student/TestPage";
import { SuperAdminKegiatanDetail } from "./pages/super-admin/SuperAdminKegiatanDetail";
import { ManageAboutPage } from "./pages/super-admin/ManageAboutPage";

function ProtectedRoute({
  role,
  children,
}: {
  role: "siswa" | "guru";
  children: ReactNode;
}) {
  const { profile, user, loading } = useAuth();
  if (loading)
    return (
      <div className="grid min-h-screen place-items-center text-slate-400">
        Memuat…
      </div>
    );
  if (!user) return <Navigate to="/login" replace />;
  if (!profile)
    return (
      <div className="grid min-h-screen place-items-center text-slate-400">
        Memuat profil…
      </div>
    );
  if (profile.role !== role)
    return (
      <Navigate to={profile.role === "guru" ? "/guru" : "/siswa"} replace />
    );
  return <>{children}</>;
}

function SuperAdminProtectedRoute({ children }: { children: ReactNode }) {
  const { profile, user, loading } = useAuth();
  if (loading)
    return (
      <div className="grid min-h-screen place-items-center text-slate-400">
        Memuat…
      </div>
    );
  if (!user) return <Navigate to="/super-admin/login" replace />;
  if (!profile)
    return (
      <div className="grid min-h-screen place-items-center text-slate-400">
        Memuat profil…
      </div>
    );
  if (profile.role !== "super_admin") return <Navigate to="/" replace />;
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

            <Route
              path="/siswa"
              element={
                <ProtectedRoute role="siswa">
                  <StudentDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/siswa/kegiatan/:nomor"
              element={
                <ProtectedRoute role="siswa">
                  <ActivityPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/siswa/riwayat"
              element={
                <ProtectedRoute role="siswa">
                  <StudentRiwayat />
                </ProtectedRoute>
              }
            />
            <Route
              path="/siswa/profil"
              element={
                <ProtectedRoute role="siswa">
                  <StudentProfil />
                </ProtectedRoute>
              }
            />
            <Route
              path="/siswa/test/:kegiatanId/:testType"
              element={
                <ProtectedRoute role="siswa">
                  <TestPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/guru"
              element={
                <ProtectedRoute role="guru">
                  <TeacherDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/guru/kelas"
              element={
                <ProtectedRoute role="guru">
                  <TeacherKelas />
                </ProtectedRoute>
              }
            />
            <Route
              path="/guru/rekap"
              element={
                <ProtectedRoute role="guru">
                  <TeacherRekap />
                </ProtectedRoute>
              }
            />
            <Route
              path="/guru/siswa/:id"
              element={
                <ProtectedRoute role="guru">
                  <TeacherSiswaDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/guru/assessment"
              element={
                <ProtectedRoute role="guru">
                  <TeacherAssessment />
                </ProtectedRoute>
              }
            />
            <Route
              path="/guru/ekspor"
              element={
                <ProtectedRoute role="guru">
                  <TeacherEkspor />
                </ProtectedRoute>
              }
            />
            <Route
              path="/guru/profil"
              element={
                <ProtectedRoute role="guru">
                  <TeacherProfil />
                </ProtectedRoute>
              }
            />

            <Route
              path="/super-admin/kegiatan/:id"
              element={<SuperAdminKegiatanDetail />}
            />
            <Route path="/setup-super-admin" element={<SetupSuperAdmin />} />
            <Route path="/super-admin/login" element={<SuperAdminLogin />} />
            <Route
              path="/super-admin"
              element={
                <SuperAdminProtectedRoute>
                  <SuperAdminDashboard />
                </SuperAdminProtectedRoute>
              }
            />
            <Route
              path="/super-admin/questions"
              element={
                <SuperAdminProtectedRoute>
                  <ManageQuestions />
                </SuperAdminProtectedRoute>
              }
            />
            <Route path="/super-admin/about" element={<ManageAboutPage />} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}
