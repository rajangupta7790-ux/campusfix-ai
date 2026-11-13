import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { listMyComplaints } from '../services/complaintApi';
import { parseApiError } from '../utils/errors';
import { useFlash } from '../utils/useFlash';
import ComplaintCard from '../components/ComplaintCard';
import EmptyState from '../components/EmptyState';
import Pagination from '../components/Pagination';
import Spinner from '../components/Spinner';
import Alert from '../components/Alert';
import Button from '../components/Button';

const STATUS_OPTIONS = ['Open', 'Assigned', 'In Progress', 'Resolved'];

export default function StudentDashboard() {
  const flash = useFlash();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [reload, setReload] = useState(0);
  const [result, setResult] = useState({ key: null, data: null, error: '' });

  // Whenever page, filter or reload changes, the key changes and we fetch again
  const key = `${page}|${status}|${reload}`;
  const loading = result.key !== key;

  useEffect(() => {
    let active = true; // ignore answers that arrive after we asked for something newer
    listMyComplaints({ page, limit: 10, status: status || undefined })
      .then((data) => active && setResult({ key, data, error: '' }))
      .catch((err) => active && setResult({ key, data: null, error: parseApiError(err).message }));
    return () => {
      active = false;
    };
  }, [key, page, status]);

  function changeStatus(e) {
    setStatus(e.target.value);
    setPage(1);
  }

  const complaints = result.data?.complaints ?? [];
  const pagination = result.data?.pagination;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">My complaints</h1>
          <p className="text-sm text-slate-500">Track the problems you have reported.</p>
        </div>
        <Link
          to="/complaints/new"
          className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          New complaint
        </Link>
      </div>

      {flash && (
        <div className="mb-4">
          <Alert type="success">{flash}</Alert>
        </div>
      )}

      <div className="mb-4">
        <label htmlFor="status-filter" className="mr-2 text-sm text-slate-600">
          Status
        </label>
        <select
          id="status-filter"
          value={status}
          onChange={changeStatus}
          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm"
        >
          <option value="">All</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {loading && <Spinner label="Loading your complaints..." />}

      {!loading && result.error && (
        <div className="space-y-3">
          <Alert>{result.error}</Alert>
          <Button variant="secondary" onClick={() => setReload((n) => n + 1)}>
            Try again
          </Button>
        </div>
      )}

      {!loading && !result.error && complaints.length === 0 && (
        <EmptyState
          title={status ? `No ${status} complaints` : 'No complaints yet'}
          text={
            status
              ? 'Try a different status filter.'
              : 'When something breaks in your room or hostel, report it here.'
          }
        >
          {!status && (
            <Link to="/complaints/new" className="text-sm font-medium text-blue-600 hover:underline">
              Report a problem
            </Link>
          )}
        </EmptyState>
      )}

      {!loading && !result.error && complaints.length > 0 && (
        <>
          <div className="space-y-3">
            {complaints.map((c) => (
              <ComplaintCard key={c.id} complaint={c} />
            ))}
          </div>
          <Pagination page={pagination.page} totalPages={pagination.totalPages} onChange={setPage} />
        </>
      )}
    </div>
  );
}