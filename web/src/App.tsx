import { useEffect, useState } from 'react';

import { fetchDashboardData, type DashboardData } from './api';
import { DayCloseView } from './views/DayCloseView';
import { InventoryView } from './views/InventoryView';
import { RevenueView } from './views/RevenueView';
import { TodayView } from './views/TodayView';
import { supabase } from './supabase';
import { THEME_LABEL, useTheme } from './theme';

type ViewId = 'today' | 'revenue' | 'dayclose' | 'inventory';

const VIEWS: { id: ViewId; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'revenue', label: 'Revenue' },
  { id: 'dayclose', label: 'Day close' },
  { id: 'inventory', label: 'Inventory' },
];

function ThemeToggle() {
  const { theme, cycleTheme } = useTheme();
  return (
    <button className="btn btn-ghost" onClick={cycleTheme} title={`Theme: ${THEME_LABEL[theme]}`}>
      {theme === 'dark' ? '☀ Light' : theme === 'light' ? '🌙 Dark' : '⚙ System'}
    </button>
  );
}

function SignInScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-card-top">
          <ThemeToggle />
        </div>
        <div className="brand-mark">WF</div>
        <h1 className="auth-title">WashFlow</h1>
        <p className="auth-sub">Manager dashboard</p>
        <form onSubmit={handleSignIn} className="auth-form">
          <label className="field">
            <span>Email</span>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <label className="field">
            <span>Password</span>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
          {error && <p className="form-error">{error}</p>}
          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <p className="auth-hint">Manager and admin accounts only.</p>
      </div>
    </div>
  );
}

function Dashboard() {
  const [view, setView] = useState<ViewId>('today');
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ email: string | undefined; role: string | null }>({
    email: undefined,
    role: null,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: authData } = await supabase.auth.getUser();
      if (cancelled) return;
      setUser({
        email: authData.user?.email,
        role: (authData.user?.app_metadata?.role as string | null) ?? null,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function load() {
    setError(null);
    setLoading(true);
    try {
      const next = await fetchDashboardData();
      setData(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
  }

  return (
    <div className="shell">
      <header className="topbar">
        <div className="topbar-brand">
          <span className="brand-mark small">WF</span>
          <span className="topbar-title">WashFlow Dashboard</span>
        </div>
        <div className="topbar-actions">
          <span className="user-chip">{user.email}</span>
          {user.role && <span className="role-chip">{user.role}</span>}
          <ThemeToggle />
          <button className="btn btn-ghost" onClick={handleSignOut}>
            Sign out
          </button>
        </div>
      </header>

      <nav className="tabs">
        {VIEWS.map(({ id, label }) => (
          <button
            key={id}
            className={`tab${view === id ? ' active' : ''}`}
            onClick={() => setView(id)}
          >
            {label}
          </button>
        ))}
        <div className="tabs-spacer" />
        <button className="btn btn-ghost" onClick={load} disabled={loading}>
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </nav>

      <main className="content">
        {error && (
          <div className="banner banner-error">
            <span>{error}</span>
          </div>
        )}
        {!data && !error && loading && <div className="empty">Loading dashboard…</div>}
        {data &&
          (view === 'today' ? (
            <TodayView data={data} />
          ) : view === 'revenue' ? (
            <RevenueView data={data} />
          ) : view === 'dayclose' ? (
            <DayCloseView data={data} />
          ) : (
            <InventoryView data={data} />
          ))}
      </main>
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(!!session);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  if (session === null) {
    return <div className="empty">Loading…</div>;
  }
  return session ? <Dashboard /> : <SignInScreen />;
}
