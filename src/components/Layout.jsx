import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Layout = ({ children }) => {
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'Dashboard', icon: 'bi-speedometer2' },
    { path: '/units', label: 'Units', icon: 'bi-building' },
    { path: '/meter-readings', label: 'Meter Readings', icon: 'bi-speedometer' },
    { path: '/excel-upload', label: 'Excel Upload', icon: 'bi-file-earmark-excel' },
    { path: '/bills', label: 'Bills', icon: 'bi-receipt' },
    { path: '/payments', label: 'Payments', icon: 'bi-cash-stack' },
    { path: '/reports', label: 'Reports', icon: 'bi-bar-chart' },
    { path: '/rates', label: 'Rate Config', icon: 'bi-gear' },
  ];

  return (
    <div>
      <nav className="navbar navbar-expand-lg navbar-dark bg-primary">
        <div className="container-fluid">
          <Link className="navbar-brand" to="/">
            <i className="bi bi-droplet-fill me-2"></i>
            Water Billing System
          </Link>
          <button className="navbar-toggler" type="button" data-bs-toggle="collapse"
                  data-bs-target="#navbarNav">
            <span className="navbar-toggler-icon"></span>
          </button>
          <div className="collapse navbar-collapse" id="navbarNav">
            <ul className="navbar-nav">
              {navItems.map(item => (
                <li className="nav-item" key={item.path}>
                  <Link className={`nav-link ${location.pathname === item.path ? 'active fw-bold' : ''}`}
                        to={item.path}>
                    <i className={`bi ${item.icon} me-1`}></i>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
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