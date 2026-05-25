import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { registerUser } from '../services/api';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const Register = () => {
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const onSubmit = async (e) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }

    setLoading(true);
    try {
      await registerUser(parsed.data);
      toast.success('Registered. Please login.');
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container form-container">
      <header className="page-header">
        <h2>Register</h2>
        <Link to="/login" className="btn btn-text">Back to login</Link>
      </header>
      <form onSubmit={onSubmit} className="form">
        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input id="email" className="form-control" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input id="password" type="password" className="form-control" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </div>
        <button disabled={loading} className="btn btn-primary" type="submit">{loading ? 'Creating...' : 'Register'}</button>
      </form>
    </div>
  );
};

export default Register;
