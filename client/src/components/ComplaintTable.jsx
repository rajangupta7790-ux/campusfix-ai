import { Link } from 'react-router-dom';
import StatusBadge from './StatusBadge';
import PriorityBadge from './PriorityBadge';
import AiStatusBadge from './AiStatusBadge';
import { formatDate } from '../utils/format';

export default function ComplaintTable({ complaints }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
      <table className="w-full min-w-[960px] text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-3 py-2">Complaint</th>
            <th className="px-3 py-2">Student</th>
            <th className="px-3 py-2">Location</th>
            <th className="px-3 py-2">Category</th>
            <th className="px-3 py-2">Priority</th>
            <th className="px-3 py-2">Status</th>
            <th className="px-3 py-2">Assigned to</th>
            <th className="px-3 py-2">AI / Review</th>
            <th className="px-3 py-2">Submitted</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {complaints.map((c) => (
            <tr key={c.id} className="hover:bg-slate-50">
              <td className="max-w-[220px] px-3 py-2">
                <Link
                  to={`/admin/complaints/${c.id}`}
                  className="line-clamp-2 break-words font-medium text-blue-700 hover:underline"
                >
                  {c.title}
                </Link>
              </td>
              <td className="px-3 py-2">
                <div className="text-slate-900">{c.createdBy?.name ?? 'Unknown'}</div>
                <div className="text-xs text-slate-500">{c.createdBy?.email}</div>
              </td>
              <td className="whitespace-nowrap px-3 py-2 text-slate-600">
                {c.hostelBlock} / {c.roomNumber}
              </td>
              {/* Faded until an admin has reviewed them: they are only defaults before that */}
              <td className={`px-3 py-2 ${c.reviewedByAdmin ? 'text-slate-900' : 'text-slate-400'}`}>
                {c.category}
              </td>
              <td className={`px-3 py-2 ${c.reviewedByAdmin ? '' : 'opacity-50'}`}>
                <PriorityBadge priority={c.priority} />
              </td>
              <td className="px-3 py-2">
                <StatusBadge status={c.status} />
              </td>
              <td className="px-3 py-2 text-slate-700">
                {c.assignedTo?.name ?? <span className="text-slate-400">Unassigned</span>}
              </td>
              <td className="px-3 py-2">
                <AiStatusBadge complaint={c} />
              </td>
              <td className="whitespace-nowrap px-3 py-2 text-xs text-slate-500">
                {formatDate(c.createdAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}