import { Navigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { useAdmin } from '../context/AdminContext';
import LoadingSpinner from './ui/LoadingSpinner';

export default function ProtectedAdminRoute({ children, requiredRoles = ['owner', 'admin', 'tax_agent'] }) {
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: adminLoading, role } = useAdmin();

  if (authLoading || adminLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!profile || !requiredRoles.includes(role)) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-4">
            You don't have permission to view this page.
          </p>
          <a
            href="/"
            className="inline-block rounded-lg bg-brand-blue-500 px-6 py-2.5 font-semibold text-white hover:bg-brand-blue-600 transition"
          >
            Go Home
          </a>
        </div>
      </div>
    );
  }

  return children;
}
