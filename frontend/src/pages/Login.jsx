import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { loginUser } from '../services/api';
import { setAuth } from '../services/auth';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const Login = () => {
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
      const { data } = await loginUser(parsed.data);
      setAuth(data.token, data.user);
      toast.success('Login successful');
      navigate('/students');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container form-container">
      <header className="page-header">
        <h2>Login</h2>
        <Link to="/register" className="btn btn-text">Create account</Link>
      </header>
      <form onSubmit={onSubmit} className="form">
        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input id="email" name="email" className="form-control" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input id="password" type="password" name="password" className="form-control" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </div>
        <button disabled={loading} className="btn btn-primary" type="submit">{loading ? 'Signing in...' : 'Login'}</button>
      </form>
    </div>
  );
};

export default Login;
