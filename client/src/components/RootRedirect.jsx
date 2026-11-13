import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { homePathFor } from '../utils/roles';
import Spinner from './Spinner';

export default function RootRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <Spinner label="Loading..." />;
  return <Navigate to={user ? homePathFor(user) : '/login'} replace />;
}