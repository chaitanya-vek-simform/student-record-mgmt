import { BrowserRouter as Router, Navigate, Route, Routes, Link, useNavigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import GetStudents from './pages/GetStudents';
import CreateStudent from './pages/CreateStudent';
import UpdateStudent from './pages/UpdateStudent';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import NotFound from './pages/NotFound';
import { clearAuth, getToken, getUser } from './services/auth';

const ProtectedRoute = ({ children, roles }) => {
  const token = getToken();
  const user = getUser();

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/students" replace />;
  }

  return children;
};

const HomeRoute = () => (getToken() ? <Navigate to="/students" replace /> : <Navigate to="/login" replace />);

const NavBar = () => {
  const navigate = useNavigate();
  const user = getUser();

  const handleLogout = () => {
    clearAuth();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="navbar-brand">Student Management System</div>
      {user && (
        <div className="nav-links">
          <Link to="/students" className="btn btn-text">Students</Link>
          <Link to="/dashboard" className="btn btn-text">Dashboard</Link>
          <Link to="/profile" className="btn btn-text">Profile</Link>
          <button onClick={handleLogout} className="btn btn-danger btn-sm">Logout</button>
        </div>
      )}
    </nav>
  );
};

function App() {
  return (
    <Router>
      <div className="app-layout">
        <NavBar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<HomeRoute />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route
              path="/students"
              element={(
                <ProtectedRoute>
                  <GetStudents />
                </ProtectedRoute>
              )}
            />
            <Route
              path="/create"
              element={(
                <ProtectedRoute roles={['admin']}>
                  <CreateStudent />
                </ProtectedRoute>
              )}
            />
            <Route
              path="/update/:id"
              element={(
                <ProtectedRoute roles={['admin']}>
                  <UpdateStudent />
                </ProtectedRoute>
              )}
            />
            <Route
              path="/dashboard"
              element={(
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              )}
            />
            <Route
              path="/profile"
              element={(
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              )}
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
        <Toaster position="top-right" />
      </div>
    </Router>
  );
}

export default App;
