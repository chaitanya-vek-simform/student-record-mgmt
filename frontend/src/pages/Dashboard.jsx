import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { getDashboardStats } from '../services/api';

const Dashboard = () => {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await getDashboardStats();
        setStats(data);
      } catch {
        toast.error('Failed to load dashboard stats');
      }
    };
    load();
  }, []);

  if (!stats) return <div className="loading">Loading dashboard...</div>;

  return (
    <div className="container">
      <header className="page-header"><h2>Dashboard</h2></header>
      <div className="stats-grid">
        <div className="stat-card"><p className="text-muted">Total Students</p><h3>{stats.totalStudents}</h3></div>
        <div className="stat-card"><p className="text-muted">Your Created Students</p><h3>{stats.myStudents}</h3></div>
        <div className="stat-card"><p className="text-muted">Your Role</p><h3>{stats.role}</h3></div>
      </div>
    </div>
  );
};

export default Dashboard;
