const styles = {
  Low: 'bg-slate-100 text-slate-700',
  Medium: 'bg-amber-100 text-amber-800',
  High: 'bg-red-100 text-red-800',
};

export default function PriorityBadge({ priority }) {
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${
        styles[priority] ?? 'bg-slate-100 text-slate-700'
      }`}
    >
      {priority}
    </span>
  );
}