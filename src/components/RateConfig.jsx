import React, { useState, useEffect } from 'react';
import { getRates, addRate } from '../api/api';
import { toast } from 'react-toastify';
import { formatCurrency, formatDate } from '../utils/helpers';

const RateConfig = () => {
  const [rates, setRates] = useState([]);
  const [newRate, setNewRate] = useState({
    ratePerUnit: '',
    effectiveFrom: new Date().toISOString().split('T')[0],
    description: ''
  });
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    loadRates();
  }, []);

  const loadRates = async () => {
    try {
      const res = await getRates();
      setRates(res.data);
    } catch (err) {
      toast.error('Failed to load rates');
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      await addRate({
        ratePerUnit: parseFloat(newRate.ratePerUnit),
        effectiveFrom: newRate.effectiveFrom,
        description: newRate.description
      });
      toast.success('Rate added successfully');
      setShowForm(false);
      setNewRate({ ratePerUnit: '', effectiveFrom: new Date().toISOString().split('T')[0], description: '' });
      loadRates();
    } catch (err) {
      toast.error('Failed to add rate');
    }
  };

  return (
    <div>
      <h2 className="mb-4"><i className="bi bi-gear me-2"></i>Rate Configuration</h2>

      <div className="mb-3">
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          <i className="bi bi-plus me-1"></i> Add New Rate
        </button>
      </div>

      {showForm && (
        <div className="card mb-4">
          <div className="card-body">
            <form onSubmit={handleAdd}>
              <div className="row g-3">
                <div className="col-md-3">
                  <label className="form-label">Rate per Unit (₹)</label>
                  <input type="number" step="0.01" className="form-control"
                         value={newRate.ratePerUnit}
                         onChange={e => setNewRate({ ...newRate, ratePerUnit: e.target.value })}
                         required />
                </div>
                <div className="col-md-3">
                  <label className="form-label">Effective From</label>
                  <input type="date" className="form-control"
                         value={newRate.effectiveFrom}
                         onChange={e => setNewRate({ ...newRate, effectiveFrom: e.target.value })}
                         required />
                </div>
                <div className="col-md-4">
                  <label className="form-label">Description</label>
                  <input type="text" className="form-control"
                         value={newRate.description}
                         onChange={e => setNewRate({ ...newRate, description: e.target.value })} />
                </div>
                <div className="col-md-2 d-flex align-items-end">
                  <button type="submit" className="btn btn-success me-2">Save</button>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="table-responsive">
        <table className="table table-striped">
          <thead className="table-dark">
            <tr>
              <th>#</th>
              <th>Rate per Unit</th>
              <th>Effective From</th>
              <th>Effective To</th>
              <th>Status</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            {rates.map((rate, idx) => (
              <tr key={rate.id} className={rate.active ? 'table-success' : ''}>
                <td>{idx + 1}</td>
                <td><strong>{formatCurrency(rate.ratePerUnit)}</strong></td>
                <td>{formatDate(rate.effectiveFrom)}</td>
                <td>{rate.effectiveTo ? formatDate(rate.effectiveTo) : 'Current'}</td>
                <td>
                  <span className={`badge ${rate.active ? 'bg-success' : 'bg-secondary'}`}>
                    {rate.active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td>{rate.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RateConfig;