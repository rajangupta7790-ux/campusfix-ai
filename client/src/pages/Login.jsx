import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { parseApiError } from '../utils/errors';
import AuthCard from '../components/AuthCard';
import FormField from '../components/FormField';
import Button from '../components/Button';
import Alert from '../components/Alert';

export default function Login() {
  const { login, sessionExpired } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setFieldErrors({});
    setSubmitting(true);
    try {
      await login({ email: form.email.trim(), password: form.password });
      // On success the route guard redirects us, so there is nothing else to do here
    } catch (err) {
      const { message, fields } = parseApiError(err);
      setError(message);
      setFieldErrors(fields);
      setSubmitting(false);
    }
  }

  return (
    <AuthCard
      title="Log in"
      subtitle="Use your campus account to report and track problems."
      footer={
        <>
          New here?{' '}
          <Link to="/register" className="font-medium text-blue-600 hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        {sessionExpired && <Alert type="info">Your session ended. Please log in again.</Alert>}
        {error && <Alert>{error}</Alert>}

        <FormField
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={form.email}
          onChange={onChange}
          error={fieldErrors.email}
        />
        <FormField
          label="Password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={form.password}
          onChange={onChange}
          error={fieldErrors.password}
        />

        <Button type="submit" loading={submitting} className="w-full">
          {submitting ? 'Logging in...' : 'Log in'}
        </Button>
      </form>
    </AuthCard>
  );
}