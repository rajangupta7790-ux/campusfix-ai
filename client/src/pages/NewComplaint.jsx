import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { createComplaint } from '../services/complaintApi';
import { parseApiError } from '../utils/errors';
import FormField from '../components/FormField';
import Button from '../components/Button';
import Alert from '../components/Alert';

// The same limits the server enforces. The server still checks everything again.
const LIMITS = {
  title: { min: 5, max: 120, label: 'Title' },
  description: { min: 10, max: 2000, label: 'Description' },
  hostelBlock: { min: 1, max: 40, label: 'Hostel block' },
  roomNumber: { min: 1, max: 20, label: 'Room number' },
};

function validate(form) {
  const errors = {};
  for (const [name, { min, max, label }] of Object.entries(LIMITS)) {
    const length = form[name].trim().length;
    if (length < min) {
      errors[name] = min === 1 ? `${label} is required` : `${label} must be at least ${min} characters`;
    } else if (length > max) {
      errors[name] = `${label} must be at most ${max} characters`;
    }
  }
  return errors;
}

export default function NewComplaint() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: '',
    description: '',
    hostelBlock: user.hostelBlock ?? '', // pre-filled from the profile
    roomNumber: user.roomNumber ?? '',
  });
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  async function onSubmit(e) {
    e.preventDefault();
    setError('');

    const errors = validate(form);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    try {
      // Only these four fields are sent. Status, category and owner are decided by the server.
      const complaint = await createComplaint({
        title: form.title.trim(),
        description: form.description.trim(),
        hostelBlock: form.hostelBlock.trim(),
        roomNumber: form.roomNumber.trim(),
      });
      navigate(`/complaints/${complaint.id}`, {
        replace: true,
        state: { flash: 'Your complaint was submitted. You can track it here.' },
      });
    } catch (err) {
      const { message, fields } = parseApiError(err);
      setError(message);
      setFieldErrors(fields);
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-xl font-semibold text-slate-900">Report a problem</h1>
      <p className="mb-4 text-sm text-slate-500">
        Describe what is wrong and where. The maintenance team will review it.
      </p>

      <form onSubmit={onSubmit} className="space-y-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        {error && <Alert>{error}</Alert>}

        <FormField
          label="Title"
          name="title"
          required
          maxLength={LIMITS.title.max}
          value={form.title}
          onChange={onChange}
          error={fieldErrors.title}
          hint="A short headline, for example: Leaking tap in washroom"
        />

        <FormField
          label="Description"
          name="description"
          as="textarea"
          rows={5}
          required
          maxLength={LIMITS.description.max}
          value={form.description}
          onChange={onChange}
          error={fieldErrors.description}
          hint={`${form.description.length}/${LIMITS.description.max} characters`}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label="Hostel block"
            name="hostelBlock"
            required
            maxLength={LIMITS.hostelBlock.max}
            value={form.hostelBlock}
            onChange={onChange}
            error={fieldErrors.hostelBlock}
          />
          <FormField
            label="Room number"
            name="roomNumber"
            required
            maxLength={LIMITS.roomNumber.max}
            value={form.roomNumber}
            onChange={onChange}
            error={fieldErrors.roomNumber}
          />
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3">
          <Link to="/dashboard" className="text-sm font-medium text-slate-600 hover:underline">
            Cancel
          </Link>
          <Button type="submit" loading={submitting}>
            {submitting ? 'Submitting...' : 'Submit complaint'}
          </Button>
        </div>
      </form>
    </div>
  );
}