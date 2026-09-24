import React, { useState, useEffect } from 'react';
import { getDashboard } from '../api/api';
import { formatCurrency } from '../utils/helpers';

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const res = await getDashboard();
      setData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="text-center mt-5"><div className="spinner-border"></div></div>;
  if (!data) return <div className="alert alert-warning">No data available</div>;

  const cards = [
    { title: 'Total Units', value: data.totalUnits, icon: 'bi-building', color: 'primary' },
    { title: 'Current Quarter', value: data.currentQuarter || 'N/A', icon: 'bi-calendar', color: 'info' },
    { title: 'Bills Generated', value: data.currentQuarterBills || 0, icon: 'bi-receipt', color: 'secondary' },
    { title: 'Paid', value: data.currentQuarterPaid || 0, icon: 'bi-check-circle', color: 'success' },
    { title: 'Unpaid', value: data.currentQuarterUnpaid || 0, icon: 'bi-x-circle', color: 'danger' },
    { title: 'Total Billed', value: formatCurrency(data.currentQuarterTotalBilled), icon: 'bi-currency-rupee', color: 'warning' },
    { title: 'Collected', value: formatCurrency(data.currentQuarterCollected), icon: 'bi-cash', color: 'success' },
    { title: 'Outstanding', value: formatCurrency(data.currentQuarterOutstanding), icon: 'bi-exclamation-triangle', color: 'danger' },
  ];

  return (
    <div>
      <h2 className="mb-4"><i className="bi bi-speedometer2 me-2"></i>Dashboard</h2>
      <div className="row g-3">
        {cards.map((card, idx) => (
          <div className="col-md-3" key={idx}>
            <div className={`card border-${card.color} h-100`}>
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <h6 className="text-muted">{card.title}</h6>
                    <h4 className={`text-${card.color} mb-0`}>{card.value}</h4>
                  </div>
                  <i className={`bi ${card.icon} fs-1 text-${card.color} opacity-50`}></i>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      {data.totalOutstandingAllTime && (
        <div className="row mt-4">
          <div className="col-md-6">
            <div className="card border-danger">
              <div className="card-body text-center">
                <h5 className="text-muted">Total Outstanding (All Time)</h5>
                <h2 className="text-danger">{formatCurrency(data.totalOutstandingAllTime)}</h2>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;