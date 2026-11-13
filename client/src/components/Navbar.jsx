import { Link, NavLink, useNavigate } from 'react-router-dom';
import { LogOut, Wrench } from 'lucide-react';
import { useAuth } from '../context/useAuth';
import { homePathFor } from '../utils/roles';

const linkClass = ({ isActive }) =>
  `rounded-md px-3 py-1.5 text-sm font-medium ${
    isActive ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100'
  }`;

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 px-4 py-3">
        <Link to={homePathFor(user)} className="flex items-center gap-2 font-bold text-blue-700">
          <Wrench className="h-5 w-5" />
          CampusFix AI
        </Link>

        <nav className="flex items-center gap-1">
          {user?.role === 'student' && (
            <>
              <NavLink to="/dashboard" className={linkClass}>
                My complaints
              </NavLink>
              <NavLink to="/complaints/new" className={linkClass}>
                New complaint
              </NavLink>
            </>
          )}
          <span className="ml-2 hidden text-sm text-slate-500 sm:inline">{user?.name}</span>
          <button
            onClick={handleLogout}
            className="ml-1 inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            <LogOut className="h-4 w-4" />
            Log out
          </button>
        </nav>
      </div>
    </header>
  );
}