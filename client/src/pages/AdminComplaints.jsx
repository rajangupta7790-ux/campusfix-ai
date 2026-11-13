import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import { listComplaints } from '../services/adminApi';
import { parseApiError } from '../utils/errors';
import { STATUSES, CATEGORIES, PRIORITIES } from '../utils/constants';
import ComplaintTable from '../components/ComplaintTable';
import Pagination from '../components/Pagination';
import EmptyState from '../components/EmptyState';
import Spinner from '../components/Spinner';
import Alert from '../components/Alert';
import Button from '../components/Button';

const selectClass = 'rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm';

function FilterSelect({ label, value, options, onChange }) {
  return (
    <label className="flex items-center gap-2 text-sm text-slate-600">
      {label}
      <select value={value} onChange={(e) => onChange(e.target.value)} className={selectClass}>
        <option value="">All</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

export default function AdminComplaints() {
  // The filters live in the URL, so Back, refresh and bookmarks all work
  const [searchParams, setSearchParams] = useSearchParams();
  const [reload, setReload] = useState(0);
  const [result, setResult] = useState({ key: null, data: null, error: '' });

  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10) || 1);
  const status = searchParams.get('status') ?? '';
  const category = searchParams.get('category') ?? '';
  const priority = searchParams.get('priority') ?? '';
  const search = searchParams.get('search') ?? '';
  const hasFilters = Boolean(status || category || priority || search);

  const key = `${searchParams.toString()}|${reload}`;
  const loading = result.key !== key;

  useEffect(() => {
    let active = true;
    listComplaints({
      page,
      limit: 10,
      status: status || undefined,
      category: category || undefined,
      priority: priority || undefined,
      search: search || undefined,
    })
      .then((data) => active && setResult({ key, data, error: '' }))
      .catch((err) => active && setResult({ key, data: null, error: parseApiError(err).message }));
    return () => {
      active = false;
    };
  }, [key, page, status, category, priority, search]);

  // Change some parameters. Any change except the page itself goes back to page 1.
  function update(changes) {
    const next = new URLSearchParams(searchParams);
    for (const [name, value] of Object.entries(changes)) {
      if (value) next.set(name, String(value));
      else next.delete(name);
    }
    if (!('page' in changes)) next.delete('page');
    setSearchParams(next);
  }

  function onSearch(e) {
    e.preventDefault();
    const value = String(new FormData(e.currentTarget).get('search') ?? '').trim();
    update({ search: value });
  }

  const complaints = result.data?.complaints ?? [];
  const pagination = result.data?.pagination;

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-xl font-semibold text-slate-900">All complaints</h1>
        <p className="text-sm text-slate-500">Search, filter and open any complaint.</p>
      </div>

      <div className="mb-4 space-y-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
        {/* key={search} resets the box when the URL changes (for example "Clear filters") */}
        <form key={search} onSubmit={onSearch} className="flex gap-2">
          <input
            name="search"
            type="search"
            maxLength={100}
            defaultValue={search}
            placeholder="Search title or description"
            aria-label="Search complaints"
            className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
          <Button type="submit">
            <Search className="h-4 w-4" />
            Search
          </Button>
        </form>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <FilterSelect label="Status" value={status} options={STATUSES} onChange={(v) => update({ status: v })} />
          <FilterSelect label="Category" value={category} options={CATEGORIES} onChange={(v) => update({ category: v })} />
          <FilterSelect label="Priority" value={priority} options={PRIORITIES} onChange={(v) => update({ priority: v })} />
          {hasFilters && (
            <button onClick={() => setSearchParams({})} className="text-sm font-medium text-blue-600 hover:underline">
              Clear filters
            </button>
          )}
        </div>
      </div>

      {loading && <Spinner label="Loading complaints..." />}

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
          title={hasFilters ? 'No complaints match' : 'No complaints yet'}
          text={hasFilters ? 'Try different filters or a different search.' : 'New complaints will appear here.'}
        >
          {hasFilters && (
            <button onClick={() => setSearchParams({})} className="text-sm font-medium text-blue-600 hover:underline">
              Clear filters
            </button>
          )}
        </EmptyState>
      )}

      {!loading && !result.error && complaints.length > 0 && (
        <>
          <p className="mb-2 text-xs text-slate-500">
            {pagination.total} complaint{pagination.total === 1 ? '' : 's'} found
          </p>
          <ComplaintTable complaints={complaints} />
          <Pagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            onChange={(p) => update({ page: p > 1 ? p : '' })}
          />
        </>
      )}
    </div>
  );
}