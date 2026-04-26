import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { ShieldAlert } from 'lucide-react';

export interface AuthUser {
  id: string;
  username: string; // officer_id_num
  fullName: string;
  permissions: string[];
}

interface AuthState {
  isAuthenticated: boolean;
  user: AuthUser | null;
  loading: boolean;
}

interface AuthContextType extends AuthState {
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const AUTH_STORAGE_KEY = 'plv_admin_auth_user';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [state, setState] = useState<AuthState>(() => {
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY);
      if (stored) {
        return { isAuthenticated: true, user: JSON.parse(stored), loading: false };
      }
    } catch {}
    return { isAuthenticated: false, user: null, loading: false };
  });

  const login = async (username: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      if (!username || !password) {
        return { success: false, error: 'Username and password are required' };
      }

      // Check against officers table
      const { data, error } = await supabase
        .from('officers')
        .select('*')
        .eq('officer_id_num', username)
        .eq('password', password)
        .eq('status', true)
        .maybeSingle();

      if (error) {
        console.error('Login error:', error);
        return { success: false, error: 'An error occurred during login' };
      }

      if (!data) {
        return { success: false, error: 'Invalid username or password' };
      }

      const user: AuthUser = {
        id: data.id,
        username: data.officer_id_num,
        fullName: data.officer_name || 'Officer',
        permissions: data.permissions || [],
      };

      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
      setState({ isAuthenticated: true, user, loading: false });

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error' };
    }
  };

  const logout = () => {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    setState({ isAuthenticated: false, user: null, loading: false });
  };

  useEffect(() => {
    if (!state.isAuthenticated || !state.user?.id) return;

    const subscription = supabase
      .channel(`officer_changes_${state.user.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'officers', filter: `id=eq.${state.user.id}` },
        () => {
          setShowUpdateModal(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [state.isAuthenticated, state.user?.id]);

  return (
    <AuthContext.Provider value={{ ...state, login, logout }}>
      {children}
      {showUpdateModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-sm p-8 shadow-2xl flex flex-col items-center text-center animate-in fade-in zoom-in duration-300">
            <div className="w-16 h-16 bg-red-50 dark:bg-red-500/10 text-red-500 rounded-2xl flex items-center justify-center mb-6 shadow-sm">
              <ShieldAlert size={32} />
            </div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-3">Session Expired</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 font-medium">
              Your access privileges have been modified by an administrator. For security reasons, you will be logged out to apply the changes.
            </p>
            <button
              onClick={() => {
                setShowUpdateModal(false);
                logout();
              }}
              className="w-full py-3.5 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] rounded-xl transition-all shadow-sm"
            >
              Acknowledge & Sign Out
            </button>
          </div>
        </div>
      )}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

