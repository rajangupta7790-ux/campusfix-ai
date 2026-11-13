import { Wrench } from 'lucide-react';

export default function AuthCard({ title, subtitle, children, footer }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-8">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-2 text-blue-700">
          <Wrench className="h-6 w-6" />
          <span className="text-xl font-bold">CampusFix AI</span>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
          <div className="mt-5">{children}</div>
        </div>
        {footer && <p className="mt-4 text-center text-sm text-slate-600">{footer}</p>}
      </div>
    </div>
  );
}