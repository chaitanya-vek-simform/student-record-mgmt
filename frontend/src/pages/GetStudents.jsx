import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getStudents, deleteStudent } from '../services/api';
import { isAdmin } from '../services/auth';
import toast from 'react-hot-toast';

const GetStudents = () => {
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState('');
    const admin = isAdmin();

    const fetchStudents = async (query = '') => {
        try {
            const response = await getStudents(query);
            setStudents(response.data);
            setLoading(false);
        } catch {
            setError('Failed to fetch students.');
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStudents();
    }, []);

    const handleDelete = async (id, name) => {
        if (!window.confirm(`Are you sure you want to delete "${name}"?`)) return;
        try {
            await deleteStudent(id);
            setStudents(prev => prev.filter(s => s.id !== id));
            toast.success('Student deleted');
        } catch {
            toast.error('Failed to delete student.');
        }
    };

    const handleSearch = async (e) => {
        e.preventDefault();
        setLoading(true);
        await fetchStudents(search.trim());
    };

    if (loading) return <div className="loading">Loading students...</div>;
    if (error) return <div className="error">{error}</div>;

    return (
        <div className="container">
            <header className="page-header">
                <h2>Students List</h2>
                {admin && <Link to="/create" className="btn btn-primary">Add New Student</Link>}
            </header>

            <form onSubmit={handleSearch} className="search-row">
                <input
                    type="text"
                    value={search}
                    className="form-control"
                    placeholder="Search by name or department"
                    onChange={(e) => setSearch(e.target.value)}
                />
                <button className="btn btn-secondary" type="submit">Search</button>
            </form>

            {students.length === 0 ? (
                <div className="empty-state">No students found. Add one!</div>
            ) : (
                <div className="table-responsive">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Name</th>
                                <th>Department</th>
                                <th>Created At</th>
                                {admin && <th>Actions</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {students.map(student => (
                                <tr key={student.id}>
                                    <td>{student.id}</td>
                                    <td>{student.name}</td>
                                    <td>{student.department}</td>
                                    <td>{new Date(student.created_at).toLocaleDateString()}</td>
                                    {admin && (
                                        <td>
                                            <Link to={`/update/${student.id}`} state={{ student }} className="btn btn-secondary btn-sm">
                                                Edit
                                            </Link>
                                            {' '}
                                            <button onClick={() => handleDelete(student.id, student.name)} className="btn btn-danger btn-sm">
                                                Delete
                                            </button>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default GetStudents;
