import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 text-center">
      <p className="text-5xl font-bold text-blue-600">404</p>
      <h1 className="mt-3 text-lg font-semibold text-slate-900">Page not found</h1>
      <p className="mt-1 text-sm text-slate-500">The page you are looking for does not exist.</p>
      <Link to="/" className="mt-5 text-sm font-medium text-blue-600 hover:underline">
        Go to the home page
      </Link>
    </div>
  );
}