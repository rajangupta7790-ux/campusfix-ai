import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { parseApiError } from '../utils/errors';
import AuthCard from '../components/AuthCard';
import FormField from '../components/FormField';
import Button from '../components/Button';
import Alert from '../components/Alert';

export default function Register() {
  const { register } = useAuth();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    hostelBlock: '',
    roomNumber: '',
  });
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setFieldErrors({});
    setSubmitting(true);

    // Never send a role. The server decides it, and it is always "student".
    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      password: form.password,
    };
    if (form.hostelBlock.trim()) payload.hostelBlock = form.hostelBlock.trim();
    if (form.roomNumber.trim()) payload.roomNumber = form.roomNumber.trim();

    try {
      await register(payload);
    } catch (err) {
      const { message, fields } = parseApiError(err);
      setError(message);
      setFieldErrors(fields);
      setSubmitting(false);
    }
  }

  return (
    <AuthCard
      title="Create your account"
      subtitle="Student accounts only. Admin accounts are created by the college."
      footer={
        <>
          Already registered?{' '}
          <Link to="/login" className="font-medium text-blue-600 hover:underline">
            Log in
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        {error && <Alert>{error}</Alert>}

        <FormField
          label="Full name"
          name="name"
          autoComplete="name"
          required
          value={form.name}
          onChange={onChange}
          error={fieldErrors.name}
        />
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
          autoComplete="new-password"
          required
          value={form.password}
          onChange={onChange}
          error={fieldErrors.password}
          hint="At least 8 characters, with a letter and a number."
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label="Hostel block (optional)"
            name="hostelBlock"
            value={form.hostelBlock}
            onChange={onChange}
            error={fieldErrors.hostelBlock}
          />
          <FormField
            label="Room number (optional)"
            name="roomNumber"
            value={form.roomNumber}
            onChange={onChange}
            error={fieldErrors.roomNumber}
          />
        </div>

        <Button type="submit" loading={submitting} className="w-full">
          {submitting ? 'Creating account...' : 'Create account'}
        </Button>
      </form>
    </AuthCard>
  );
}