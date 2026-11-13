import { Inbox } from 'lucide-react';

export default function EmptyState({ title, text, children }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-12 text-center">
      <Inbox className="mx-auto h-10 w-10 text-slate-400" />
      <h2 className="mt-3 text-base font-semibold text-slate-900">{title}</h2>
      {text && <p className="mt-1 text-sm text-slate-500">{text}</p>}
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}