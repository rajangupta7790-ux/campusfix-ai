export default function FormField({ label, name, error, hint, as: Component = 'input', ...inputProps }) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-slate-700">
        {label}
      </label>
      <Component
        id={name}
        name={name}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${name}-error` : undefined}
        className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm shadow-sm outline-none focus:ring-2 focus:ring-blue-500 ${
          error ? 'border-red-400' : 'border-slate-300'
        }`}
        {...inputProps}
      />
      {hint && !error && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
      {error && (
        <p id={`${name}-error`} className="mt-1 text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}