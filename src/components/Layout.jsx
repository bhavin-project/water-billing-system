import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

const Layout = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();

  // Retrieve user session
  const user = JSON.parse(localStorage.getItem('user') || 'null');

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/login');
  };

  const navItems = [
    { path: '/', label: 'Dashboard', icon: 'bi-speedometer2' },
    { path: '/units', label: 'Units', icon: 'bi-building' },
    { path: '/meter-readings', label: 'Meter Readings', icon: 'bi-speedometer' },
    { path: '/bills', label: 'Bill Generation & Payments', icon: 'bi-receipt' },
    { path: '/reports', label: 'Reports', icon: 'bi-bar-chart' },
    { path: '/rates', label: 'Rate Config', icon: 'bi-gear' },
  ];

  return (
    <div>
      <nav className="navbar navbar-expand-lg navbar-dark bg-primary shadow-sm">
        <div className="container-fluid">
          <Link className="navbar-brand fw-bold" to="/">
            <i className="bi bi-droplet-fill me-2"></i>
            Water Billing System
          </Link>

          <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
            <span className="navbar-toggler-icon"></span>
          </button>

          <div className="collapse navbar-collapse" id="navbarNav">
            <ul className="navbar-nav me-auto">
              {navItems.map(item => (
                <li className="nav-item" key={item.path}>
                  <Link className={`nav-link ${location.pathname === item.path ? 'active fw-bold' : ''}`} to={item.path}>
                    <i className={`bi ${item.icon} me-1`}></i>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>

            {/* User Session Info & Logout Button */}
            {user && (
              <div className="d-flex align-items-center text-white gap-3 ms-auto mt-2 mt-lg-0">
                <div className="text-end d-none d-md-block">
                  <div className="fw-bold small">{user.name}</div>
                  <span className="badge bg-light text-primary extra-small">{user.role}</span>
                </div>
                <button className="btn btn-outline-light btn-sm" onClick={handleLogout} title="Log Out">
                  <i className="bi bi-box-arrow-right me-1"></i> Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      <div className="container-fluid mt-3 px-4">
        {children}
      </div>
    </div>
  );
};

export default Layout;