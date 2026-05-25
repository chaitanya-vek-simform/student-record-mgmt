import { Link } from 'react-router-dom';

const NotFound = () => (
  <div className="container form-container">
    <header className="page-header"><h2>404 - Page Not Found</h2></header>
    <p className="text-muted">The page you requested does not exist.</p>
    <Link to="/students" className="btn btn-primary mt-4">Go to Students</Link>
  </div>
);

export default NotFound;
