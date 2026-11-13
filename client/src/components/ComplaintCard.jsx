import { Link } from 'react-router-dom';
import { MapPin, UserCheck } from 'lucide-react';
import StatusBadge from './StatusBadge';
import { formatDate } from '../utils/format';

export default function ComplaintCard({ complaint }) {
  return (
    <Link
      to={`/complaints/${complaint.id}`}
      className="block rounded-lg border border-slate-200 bg-white p-4 shadow-sm hover:border-blue-300 hover:shadow"
    >
      <div className="flex items-start justify-between gap-3">
        <h2 className="break-words text-base font-semibold text-slate-900">{complaint.title}</h2>
        <StatusBadge status={complaint.status} />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
        <span className="inline-flex items-center gap-1">
          <MapPin className="h-3.5 w-3.5" />
          Block {complaint.hostelBlock}, Room {complaint.roomNumber}
        </span>
        {complaint.assignedTo && (
          <span className="inline-flex items-center gap-1">
            <UserCheck className="h-3.5 w-3.5" />
            {complaint.assignedTo.name}
          </span>
        )}
        <span>Submitted {formatDate(complaint.createdAt)}</span>
      </div>
    </Link>
  );
}