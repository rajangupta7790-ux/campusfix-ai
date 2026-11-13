import { Sparkles, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';

const base =
  'inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium';

export default function AiStatusBadge({ complaint }) {
  if (complaint.reviewedByAdmin) {
    return (
      <span className={`${base} bg-green-100 text-green-800`} title="An admin confirmed the final values">
        <CheckCircle2 className="h-3 w-3" />
        Reviewed
      </span>
    );
  }

  const ai = complaint.ai;
  if (ai?.status === 'success') {
    return (
      <span
        className={`${base} bg-purple-100 text-purple-800`}
        title={`AI suggests: ${ai.category}, ${ai.priority} priority`}
      >
        <Sparkles className="h-3 w-3" />
        AI suggestion
      </span>
    );
  }
  if (ai?.status === 'failed') {
    return (
      <span className={`${base} bg-red-100 text-red-800`} title={ai.errorMessage ?? 'AI analysis failed'}>
        <AlertTriangle className="h-3 w-3" />
        AI failed
      </span>
    );
  }
  return (
    <span className={`${base} bg-slate-100 text-slate-600`} title="AI analysis has not finished">
      <Clock className="h-3 w-3" />
      AI pending
    </span>
  );
}