import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, MapPin, UserCheck } from 'lucide-react';
import { getComplaint, withdrawComplaint } from '../services/complaintApi';
import { parseApiError } from '../utils/errors';
import { formatDate } from '../utils/format';
import { useFlash } from '../utils/useFlash';
import StatusBadge from '../components/StatusBadge';
import PriorityBadge from '../components/PriorityBadge';
import StatusTimeline from '../components/StatusTimeline';
import Spinner from '../components/Spinner';
import Alert from '../components/Alert';
import Button from '../components/Button';
import EmptyState from '../components/EmptyState';

export default function ComplaintDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const flash = useFlash();
  const [reload, setReload] = useState(0);
  const [result, setResult] = useState({ key: null, complaint: null, error: '', notFound: false });
  const [withdrawing, setWithdrawing] = useState(false);
  const [actionError, setActionError] = useState('');

  const key = `${id}|${reload}`;
  const loading = result.key !== key;

  useEffect(() => {
    let active = true;
    getComplaint(id)
      .then((complaint) => active && setResult({ key, complaint, error: '', notFound: false }))
      .catch((err) => {
        if (!active) return;
        const status = err.response?.status;
        setResult({
          key,
          complaint: null,
          error: parseApiError(err).message,
          // The server answers 404 for missing OR someone else's complaint, and 400 for a bad id
          notFound: status === 404 || status === 400,
        });
      });
    return () => {
      active = false;
    };
  }, [key, id]);

  async function onWithdraw() {
    if (!window.confirm('Withdraw this complaint? This cannot be undone.')) return;
    setActionError('');
    setWithdrawing(true);
    try {
      await withdrawComplaint(id);
      navigate('/dashboard', { replace: true, state: { flash: 'Your complaint was withdrawn.' } });
    } catch (err) {
      setActionError(parseApiError(err).message);
      setWithdrawing(false);
    }
  }

  if (loading) return <Spinner label="Loading complaint..." />;

  if (result.notFound) {
    return (
      <EmptyState title="Complaint not found" text="It may have been withdrawn, or the link is wrong.">
        <Link to="/dashboard" className="text-sm font-medium text-blue-600 hover:underline">
          Back to my complaints
        </Link>
      </EmptyState>
    );
  }

  if (result.error) {
    return (
      <div className="space-y-3">
        <Alert>{result.error}</Alert>
        <Button variant="secondary" onClick={() => setReload((n) => n + 1)}>
          Try again
        </Button>
      </div>
    );
  }

  const c = result.complaint;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link to="/dashboard" className="inline-flex items-center gap-1 text-sm text-slate-600 hover:underline">
        <ArrowLeft className="h-4 w-4" />
        My complaints
      </Link>

      {flash && <Alert type="success">{flash}</Alert>}
      {actionError && <Alert>{actionError}</Alert>}

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h1 className="break-words text-xl font-semibold text-slate-900">{c.title}</h1>
          <StatusBadge status={c.status} />
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-4 w-4" />
            Block {c.hostelBlock}, Room {c.roomNumber}
          </span>
          <span>Submitted {formatDate(c.createdAt)}</span>
          {c.assignedTo && (
            <span className="inline-flex items-center gap-1">
              <UserCheck className="h-4 w-4" />
              Assigned to {c.assignedTo.name}
            </span>
          )}
        </div>

        <h2 className="mt-5 text-sm font-semibold text-slate-700">Description</h2>
        <p className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-700">{c.description}</p>

        <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-slate-100 pt-4 text-sm">
          <span className="inline-flex items-center gap-2 text-slate-600">
            Category <strong className="font-medium text-slate-900">{c.category}</strong>
          </span>
          <span className="inline-flex items-center gap-2 text-slate-600">
            Priority <PriorityBadge priority={c.priority} />
          </span>
          <span className="text-xs text-slate-400">Set by the maintenance team after review</span>
        </div>

        {c.status === 'Open' && (
          <div className="mt-5 border-t border-slate-100 pt-4">
            <Button variant="secondary" loading={withdrawing} onClick={onWithdraw}>
              Withdraw complaint
            </Button>
          </div>
        )}
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-slate-900">Status history</h2>
        <StatusTimeline history={c.statusHistory} />
      </section>
    </div>
  );
}