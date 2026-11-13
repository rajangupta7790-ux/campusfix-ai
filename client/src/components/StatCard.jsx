import { Link } from 'react-router-dom';

const tones = {
  slate: 'text-slate-900',
  amber: 'text-amber-600',
  blue: 'text-blue-600',
  indigo: 'text-indigo-600',
  green: 'text-green-600',
  purple: 'text-purple-600',
};

export default function StatCard({ label, value, tone = 'slate', to }) {
  const content = (
    <>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-3xl font-bold ${tones[tone]}`}>{value}</p>
    </>
  );
  const classes = 'rounded-lg border border-slate-200 bg-white p-4 shadow-sm';

  return to ? (
    <Link to={to} className={`${classes} block hover:border-blue-300 hover:shadow`}>
      {content}
    </Link>
  ) : (
    <div className={classes}>{content}</div>
  );
}