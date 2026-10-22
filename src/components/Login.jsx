import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/api';

function Login({ onLogin }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const res = await api.post('/auth/login', { username, password });
            const userData = res.data;
            
            // Save login session
            localStorage.setItem('user', JSON.stringify(userData));
            if (onLogin) onLogin(userData);
            
            navigate('/');
        } catch (err) {
            console.error("Login failed:", err);
            setError(err.response?.data?.message || "Invalid username or password");
        } finally {
            setLoading(false);
        }
    };

    // Helper for quick user selector
    const quickSelect = (u, p) => {
        setUsername(u);
        setPassword(p);
    };

    return (
        <div className="d-flex justify-content-center align-items-center vh-100 bg-light">
            <div className="card shadow-lg p-4" style={{ width: '420px', borderRadius: '12px' }}>
                <div className="text-center mb-4">
                    <div className="bg-primary text-white rounded-circle d-inline-flex justify-content-center align-items-center mb-2" style={{ width: '60px', height: '60px' }}>
                        <i className="bi bi-droplet-fill fs-2"></i>
                    </div>
                    <h3 className="fw-bold text-primary mb-1">Silicone Vally</h3>
                    <p className="text-muted small">Water Billing Management System</p>
                </div>

                {error && (
                    <div className="alert alert-danger py-2 small" role="alert">
                        <i className="bi bi-exclamation-triangle-fill me-2"></i>{error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="mb-3">
                        <label className="form-label fw-semibold">Username</label>
                        <div className="input-group">
                            <span className="input-group-text"><i className="bi bi-person"></i></span>
                            <input 
                                type="text" 
                                className="form-control" 
                                placeholder="Enter username" 
                                value={username} 
                                onChange={e => setUsername(e.target.value)} 
                                required 
                            />
                        </div>
                    </div>

                    <div className="mb-4">
                        <label className="form-label fw-semibold">Password</label>
                        <div className="input-group">
                            <span className="input-group-text"><i className="bi bi-lock"></i></span>
                            <input 
                                type="password" 
                                className="form-control" 
                                placeholder="Enter password" 
                                value={password} 
                                onChange={e => setPassword(e.target.value)} 
                                required 
                            />
                        </div>
                    </div>

                    <button type="submit" className="btn btn-primary w-100 py-2 fw-bold" disabled={loading}>
                        {loading ? 'Authenticating...' : 'Log In'}
                    </button>
                </form>

                {/* Quick login shortcuts for convenience */}
                <div className="mt-4 pt-3 border-top text-center d-none">
                    <p className="text-muted extra-small mb-2 fw-semibold">QUICK DEMO ACCOUNTS</p>
                    <div className="d-flex justify-content-between gap-1">
                        <button className="btn btn-sm btn-outline-secondary flex-fill" onClick={() => quickSelect('admin', 'admin123')}>
                            Admin
                        </button>
                        <button className="btn btn-sm btn-outline-secondary flex-fill" onClick={() => quickSelect('operator', 'oper123')}>
                            Operator
                        </button>
                        <button className="btn btn-sm btn-outline-secondary flex-fill" onClick={() => quickSelect('treasurer', 'treas123')}>
                            Treasurer
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Login;