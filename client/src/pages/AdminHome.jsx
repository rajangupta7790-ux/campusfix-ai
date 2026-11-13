import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getStats } from '../services/adminApi';
import { parseApiError } from '../utils/errors';
import { useAuth } from '../context/useAuth';
import StatCard from '../components/StatCard';
import { CategoryChart, TrendChart } from '../components/AdminCharts';
import EmptyState from '../components/EmptyState';
import Spinner from '../components/Spinner';
import Alert from '../components/Alert';
import Button from '../components/Button';

export default function AdminHome() {
  const { user } = useAuth();
  const [reload, setReload] = useState(0);
  const [result, setResult] = useState({ key: null, stats: null, error: '' });

  const key = String(reload);
  const loading = result.key !== key;

  useEffect(() => {
    let active = true;
    getStats()
      .then((stats) => active && setResult({ key, stats, error: '' }))
      .catch((err) => active && setResult({ key, stats: null, error: parseApiError(err).message }));
    return () => {
      active = false;
    };
  }, [key]);

  const s = result.stats;
  const list = (status) => `/admin/complaints?status=${encodeURIComponent(status)}`;

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-xl font-semibold text-slate-900">Admin dashboard</h1>
        <p className="text-sm text-slate-500">Welcome, {user.name}. Here is the current picture.</p>
      </div>

      {loading && <Spinner label="Loading statistics..." />}

      {!loading && result.error && (
        <div className="space-y-3">
          <Alert>{result.error}</Alert>
          <Button variant="secondary" onClick={() => setReload((n) => n + 1)}>
            Try again
          </Button>
        </div>
      )}

      {!loading && s && s.total === 0 && (
        <EmptyState title="No complaints yet" text="Statistics will appear when students start reporting problems." />
      )}

      {!loading && s && s.total > 0 && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <StatCard label="Total" value={s.total} to="/admin/complaints" />
            <StatCard label="Open" value={s.byStatus.Open} tone="amber" to={list('Open')} />
            <StatCard label="Assigned" value={s.byStatus.Assigned} tone="blue" to={list('Assigned')} />
            <StatCard label="In progress" value={s.byStatus['In Progress']} tone="indigo" to={list('In Progress')} />
            <StatCard label="Resolved" value={s.byStatus.Resolved} tone="green" to={list('Resolved')} />
            <StatCard label="Needs review" value={s.unreviewed} tone="purple" to="/admin/complaints" />
          </div>

          {s.unassigned > 0 && (
            <Alert type="info">
              {s.unassigned} active complaint{s.unassigned === 1 ? ' has' : 's have'} no assignee yet.{' '}
              <Link to="/admin/complaints" className="font-medium underline">
                Open the list
              </Link>
            </Alert>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            <CategoryChart byCategory={s.byCategory} />
            <TrendChart daily={s.daily} />
          </div>
        </div>
      )}
    </div>
  );
}