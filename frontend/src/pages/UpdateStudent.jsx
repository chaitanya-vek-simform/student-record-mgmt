import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link, useLocation } from 'react-router-dom';
import { updateStudent } from '../services/api';
import toast from 'react-hot-toast';

const UpdateStudent = () => {
    const { id } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    
    const [formData, setFormData] = useState({ name: '', department: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        // If we passed the student via React Router state (from the list page), use it
        if (location.state?.student) {
            const { name, department } = location.state.student;
            setFormData({ name, department });
        }
    }, [location]);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            await updateStudent(id, formData);
            toast.success('Student updated');
            navigate('/students');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to update student');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container form-container">
            <header className="page-header">
                <h2>Update Student #{id}</h2>
                <Link to="/students" className="btn btn-text">Back to List</Link>
            </header>

            {error && <div className="error-alert">{error}</div>}

            <form onSubmit={handleSubmit} className="form">
                <div className="form-group">
                    <label htmlFor="name">Name</label>
                    <input
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                        className="form-control"
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="department">Department</label>
                    <input
                        type="text"
                        id="department"
                        name="department"
                        value={formData.department}
                        onChange={handleChange}
                        required
                        className="form-control"
                    />
                </div>

                <button type="submit" className="btn btn-primary mt-4" disabled={loading}>
                    {loading ? 'Updating...' : 'Update Student'}
                </button>
            </form>
        </div>
    );
};

export default UpdateStudent;
