import { type ReactNode, useState } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import {
  FlaskConical, LogOut, Menu, X, GraduationCap, User,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Footer } from './Footer';

type NavItem = { to: string; label: string; icon: ReactNode };

export function DashboardLayout({
  items,
  role,
  children,
}: {
  items: NavItem[];
  role: 'siswa' | 'guru';
  children?: ReactNode;
}) {
  const { profile, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const roleBadge = role === 'guru'
    ? { label: 'Guru', cls: 'bg-violet-50 text-teacher', icon: <GraduationCap className="h-3.5 w-3.5" /> }
    : { label: 'Siswa', cls: 'bg-blue-50 text-student', icon: <User className="h-3.5 w-3.5" /> };

  const isActive = (to: string) => location.pathname === to || location.pathname.startsWith(to + '/');

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const SidebarContent = (
    <nav className="flex flex-col gap-1">
      {items.map((item) => (
        <Link
          key={item.to}
          to={item.to}
          onClick={() => setOpen(false)}
          className={`sidebar-item ${isActive(item.to) ? 'sidebar-item-active' : ''}`}
        >
          <span className="shrink-0">{item.icon}</span>
          <span className="truncate">{item.label}</span>
        </Link>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen bg-neutral-bg">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-slate-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-content items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <button className="lg:hidden text-slate-500" onClick={() => setOpen(true)}>
              <Menu className="h-5 w-5" />
            </button>
            <Link to="/" className="flex items-center gap-2">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-brand-green text-white">
                <FlaskConical className="h-5 w-5" />
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-bold leading-tight text-brand-green-dark">LajuNalar</p>
                <p className="text-[11px] leading-tight text-slate-400">E-LKPD Laju Reaksi</p>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-2.5">
            <span className={`badge ${roleBadge.cls}`}>
              {roleBadge.icon} {roleBadge.label}
            </span>
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold leading-tight text-slate-700">{profile?.nama}</p>
              <p className="text-[11px] leading-tight text-slate-400">{profile?.username || profile?.email}</p>
            </div>
            <div className="grid h-9 w-9 place-items-center rounded-full bg-brand-green-light text-sm font-bold text-brand-green-dark">
              {profile?.nama?.charAt(0).toUpperCase() || '?'}
            </div>
            <button onClick={handleSignOut} title="Keluar" className="rounded-lg p-2 text-slate-400 hover:bg-slate-50 hover:text-danger">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-content px-4 sm:px-6">
        {/* Desktop sidebar */}
        <aside className="sticky top-[65px] hidden h-[calc(100vh-65px)] w-64 shrink-0 py-6 pr-4 lg:block">
          <div className="rounded-2xl border border-slate-100 bg-white p-3 shadow-soft">
            {SidebarContent}
          </div>
        </aside>

        {/* Mobile drawer */}
        {open && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setOpen(false)} />
            <div className="absolute left-0 top-0 h-full w-72 bg-white p-4 shadow-float animate-fade-in">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-sm font-bold text-brand-green-dark">Menu</span>
                <button onClick={() => setOpen(false)} className="text-slate-400"><X className="h-5 w-5" /></button>
              </div>
              {SidebarContent}
            </div>
          </div>
        )}

        {/* Main */}
        <main className="min-w-0 flex-1 py-6">
          {children ?? <Outlet />}
        </main>
      </div>

      <Footer />
    </div>
  );
}
