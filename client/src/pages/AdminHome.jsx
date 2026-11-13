import { useAuth } from '../context/useAuth';

export default function AdminHome() {
  const { user } = useAuth();
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6">
      <h1 className="text-lg font-semibold text-slate-900">Admin: {user.name}</h1>
      <p className="mt-1 text-sm text-slate-500">The admin dashboard is built on Day 9.</p>
    </div>
  );
}