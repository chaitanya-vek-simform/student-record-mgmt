import { useEffect, useState } from 'react';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { getProfile, updateProfile } from '../services/api';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8).optional().or(z.literal('')),
});

const Profile = () => {
  const [form, setForm] = useState({ email: '', password: '' });
  const [role, setRole] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await getProfile();
        setForm((prev) => ({ ...prev, email: data.email }));
        setRole(data.role);
      } catch {
        toast.error('Failed to load profile');
      }
    };
    load();
  }, []);

  const onSubmit = async (e) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }

    const payload = { email: parsed.data.email };
    if (parsed.data.password) payload.password = parsed.data.password;

    setLoading(true);
    try {
      await updateProfile(payload);
      toast.success('Profile updated');
      setForm((prev) => ({ ...prev, password: '' }));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Profile update failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container form-container">
      <header className="page-header">
        <h2>Profile</h2>
        <p className="text-muted">Role: {role || '...'}</p>
      </header>
      <form onSubmit={onSubmit} className="form">
        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input id="email" className="form-control" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <div className="form-group">
          <label htmlFor="password">New Password (optional)</label>
          <input id="password" type="password" className="form-control" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </div>
        <button type="submit" disabled={loading} className="btn btn-primary">{loading ? 'Saving...' : 'Save Profile'}</button>
      </form>
    </div>
  );
};

export default Profile;
