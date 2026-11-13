import StatusBadge from './StatusBadge';
import { formatDate } from '../utils/format';

export default function StatusTimeline({ history }) {
  if (!history?.length) {
    return <p className="text-sm text-slate-500">No history yet.</p>;
  }

  return (
    <ol className="space-y-5 border-l border-slate-200 pl-6">
      {history.map((entry, i) => (
        <li key={`${entry.status}-${entry.changedAt}-${i}`} className="relative">
          <span className="absolute -left-[31px] top-1 h-3 w-3 rounded-full border-2 border-white bg-blue-600 ring-1 ring-blue-200" />
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={entry.status} />
            <span className="text-xs text-slate-500">{formatDate(entry.changedAt)}</span>
          </div>
          <p className="mt-1 text-xs text-slate-500">By {entry.changedBy?.name ?? 'System'}</p>
          {entry.note && <p className="mt-1 break-words text-sm text-slate-700">{entry.note}</p>}
        </li>
      ))}
    </ol>
  );
}