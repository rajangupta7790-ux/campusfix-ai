import { useAuth } from '../context/useAuth';

export default function StudentDashboard() {
  const { user } = useAuth();
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6">
      <h1 className="text-lg font-semibold text-slate-900">Welcome, {user.name}</h1>
      <p className="mt-1 text-sm text-slate-500">Your complaints will appear here in Part B.</p>
    </div>
  );
}