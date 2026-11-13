import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { homePathFor } from '../utils/roles';
import Spinner from './Spinner';

// A guard for the screen only. The backend checks permissions again on every request.
export default function ProtectedRoute({ role, children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <Spinner label="Checking your session..." />;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  if (role && user.role !== role) return <Navigate to={homePathFor(user)} replace />;
  return children;
}