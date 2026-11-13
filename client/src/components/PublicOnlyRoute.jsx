import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { homePathFor } from '../utils/roles';
import Spinner from './Spinner';

export default function PublicOnlyRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <Spinner label="Checking your session..." />;
  if (user) return <Navigate to={location.state?.from?.pathname || homePathFor(user)} replace />;
  return children;
}