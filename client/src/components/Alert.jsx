const styles = {
  error: 'border-red-200 bg-red-50 text-red-800',
  success: 'border-green-200 bg-green-50 text-green-800',
  info: 'border-blue-200 bg-blue-50 text-blue-800',
};

export default function Alert({ type = 'error', children }) {
  return (
    <div
      role={type === 'error' ? 'alert' : 'status'}
      className={`rounded-md border px-3 py-2 text-sm ${styles[type]}`}
    >
      {children}
    </div>
  );
}