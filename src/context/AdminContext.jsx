import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';

const AdminContext = createContext(null);

const STAFF_ROLES = ['owner', 'admin', 'tax_agent'];

export function AdminProvider({ children }) {
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    let isMounted = true;

    async function fetchProfile() {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error) throw error;
        if (isMounted) setProfile(data);
      } catch (err) {
        console.error('Failed to fetch profile:', err.message);
        if (isMounted) setProfile(null);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchProfile();

    return () => {
      isMounted = false;
    };
  }, [user, authLoading]);

  const value = useMemo(() => ({
    profile,
    loading,
    role: profile?.role || 'tax_filer',
    isOwner: profile?.role === 'owner',
    isAdmin: profile?.role === 'admin' || profile?.role === 'owner',
    isStaff: STAFF_ROLES.includes(profile?.role),
    isTaxFiler: profile?.role === 'tax_filer',
  }), [profile, loading]);

  return (
    <AdminContext.Provider value={value}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const context = useContext(AdminContext);
  if (context === null) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
}
