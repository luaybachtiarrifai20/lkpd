import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FlaskConical, ArrowLeft, Loader2, User, GraduationCap, LogIn } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/context/AuthContext';

export function AuthPage({ mode }: { mode: 'login' | 'daftar' }) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { profile, session, loading: authLoading, refreshAuth } = useAuth();
  const isLogin = mode === 'login';

  const [role, setRole] = useState<'siswa' | 'guru'>('siswa');
  const [nama, setNama] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [nisn, setNisn] = useState('');
  const [kodeKelas, setKodeKelas] = useState('');
  const [loading, setLoading] = useState(false);

  // Redirect to dashboard once session + profile are loaded in context.
  // This is the reactive path (covers already-authenticated visits and
  // the post-login refreshAuth() update).
  useEffect(() => {
    if (authLoading) return;
    if (session && profile) {
      const dest = profile.role === 'guru' ? '/guru' : '/siswa';
      console.log('[AuthPage] useEffect redirect ->', dest);
      navigate(dest, { replace: true });
    }
  }, [authLoading, session, profile, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (!data.session) throw new Error('Login berhasil tapi sesi tidak ditemukan');

        console.log('[AuthPage] signIn success, uid:', data.user.id);

        // Force-refresh auth context: getSession() + profile query, fully awaited.
        // This guarantees ProtectedRoute sees session+profile before we navigate.
        const prof = await refreshAuth();
        console.log('[AuthPage] refreshAuth returned profile:', prof?.role);

        toast('Selamat datang kembali!', 'success');

        if (prof?.role) {
          const dest = prof.role === 'guru' ? '/guru' : '/siswa';
          console.log('[AuthPage] navigating to:', dest);
          navigate(dest, { replace: true });
        } else {
          // Profile missing — hard reload to login as fallback.
          console.error('[AuthPage] No profile after refreshAuth');
          toast('Profil tidak ditemukan. Hubungi guru/admin.', 'error');
        }
      } else {
        if (password.length < 6) throw new Error('Kata sandi minimal 6 karakter');

        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        const uid = data.user?.id;
        if (!uid) throw new Error('Gagal mendaftar akun');

        let kelasId: string | null = null;
        if (role === 'siswa' && kodeKelas.trim()) {
          const { data: kelas } = await supabase
            .from('kelas')
            .select('id')
            .eq('kode_undangan', kodeKelas.trim())
            .maybeSingle();
          if (kelas) kelasId = kelas.id;
        }

        const { error: profErr } = await supabase.from('profiles').insert({
          id: uid,
          nama,
          role,
          email,
          username: username || null,
          nisn: role === 'siswa' ? nisn || null : null,
          kelas_id: kelasId,
        });

        if (profErr) {
          console.error('[AuthPage] profile insert error:', profErr);
          toast('Akun dibuat, tapi profil gagal disimpan. Hubungi guru/admin.', 'warning');
        } else {
          console.log('[AuthPage] signup success, refreshAuth as:', role);
          // Refresh context so ProtectedRoute sees the new profile, then navigate.
          await refreshAuth();
          toast(`Selamat datang, ${nama}!`, 'success');
          const dest = role === 'guru' ? '/guru' : '/siswa';
          navigate(dest, { replace: true });
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Terjadi kesalahan';
      console.error('[AuthPage] error:', msg);
      toast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-green-light via-white to-brand-teal-light">
      <header className="mx-auto flex max-w-content items-center justify-between px-4 py-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-brand-green text-white">
            <FlaskConical className="h-5 w-5" />
          </div>
          <span className="text-sm font-bold text-brand-green-dark">LajuNalar</span>
        </Link>
        <Link to="/" className="btn-ghost"><ArrowLeft className="h-4 w-4" /> Beranda</Link>
      </header>

      <div className="mx-auto flex max-w-md flex-col px-4 py-6 sm:px-6">
        <div className="card animate-fade-in">
          <div className="mb-5 text-center">
            <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-brand-green text-white">
              {isLogin ? <LogIn className="h-6 w-6" /> : <FlaskConical className="h-6 w-6" />}
            </div>
            <h1 className="text-xl font-bold text-slate-800">{isLogin ? 'Masuk ke LajuNalar' : 'Buat Akun Baru'}</h1>
            <p className="mt-1 text-sm text-slate-500">{isLogin ? 'Gunakan email & kata sandi akunmu' : 'Lengkapi data di bawah untuk mulai belajar'}</p>
          </div>

          {!isLogin && (
            <div className="mb-4">
              <p className="label-base">Saya mendaftar sebagai</p>
              <div className="grid grid-cols-2 gap-2">
                <RoleBtn active={role === 'siswa'} onClick={() => setRole('siswa')} icon={<User className="h-4 w-4" />} label="Siswa" color="text-student" activeCls="border-student bg-blue-50" />
                <RoleBtn active={role === 'guru'} onClick={() => setRole('guru')} icon={<GraduationCap className="h-4 w-4" />} label="Guru" color="text-teacher" activeCls="border-teacher bg-violet-50" />
              </div>
            </div>
          )}

          <form onSubmit={submit} className="space-y-3.5">
            {!isLogin && (
              <div>
                <label className="label-base">Nama Lengkap</label>
                <input className="input-base" value={nama} onChange={(e) => setNama(e.target.value)} required placeholder="Nama lengkap" />
              </div>
            )}
            <div>
              <label className="label-base">Email</label>
              <input type="email" className="input-base" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="email@contoh.com" />
            </div>
            <div>
              <label className="label-base">Kata Sandi</label>
              <input type="password" className="input-base" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" />
            </div>
            {!isLogin && (
              <>
                <div>
                  <label className="label-base">Username {role === 'siswa' ? '(NISN/username)' : ''}</label>
                  <input className="input-base" value={username} onChange={(e) => setUsername(e.target.value)} placeholder={role === 'siswa' ? 'NISN atau username' : 'Username'} />
                </div>
                {role === 'siswa' && (
                  <>
                    <div>
                      <label className="label-base">NISN <span className="font-normal text-slate-400">(opsional)</span></label>
                      <input className="input-base" value={nisn} onChange={(e) => setNisn(e.target.value)} placeholder="Nomor Induk Siswa Nasional" />
                    </div>
                    <div>
                      <label className="label-base">Kode Kelas <span className="font-normal text-slate-400">(opsional)</span></label>
                      <input className="input-base" value={kodeKelas} onChange={(e) => setKodeKelas(e.target.value)} placeholder="Kode undangan dari guru" />
                    </div>
                  </>
                )}
              </>
            )}
            <button type="submit" disabled={loading} className="btn-primary w-full py-3">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : isLogin ? 'Masuk' : 'Daftar'}
            </button>
          </form>

          <p className="mt-4 text-center text-sm text-slate-500">
            {isLogin ? 'Belum punya akun? ' : 'Sudah punya akun? '}
            <Link to={isLogin ? '/daftar' : '/login'} className="font-semibold text-brand-green hover:text-brand-green-dark">
              {isLogin ? 'Daftar di sini' : 'Masuk di sini'}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function RoleBtn({
  active, onClick, icon, label, color, activeCls,
}: {
  active: boolean; onClick: () => void; icon: React.ReactNode; label: string; color: string; activeCls: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-center gap-2 rounded-xl border-2 px-4 py-2.5 text-sm font-semibold transition ${
        active ? activeCls : 'border-slate-200 text-slate-500 hover:bg-slate-50'
      }`}
    >
      <span className={color}>{icon}</span> {label}
    </button>
  );
}
