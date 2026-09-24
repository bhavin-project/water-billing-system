import React, { useState, useEffect } from 'react';
import { getQuarters, getBlocks, generateBills, getBillsByQuarter, getBillsByQuarterAndBlock, getBillsByQuarterAndStatus } from '../api/api';
import { toast } from 'react-toastify';
import { formatCurrency, getStatusBadge, formatDate } from '../utils/helpers';
import { useNavigate } from 'react-router-dom';

const BillGeneration = () => {
  const [quarters, setQuarters] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [selectedQuarter, setSelectedQuarter] = useState('');
  const [selectedBlock, setSelectedBlock] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [bills, setBills] = useState([]);
  const [generating, setGenerating] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([getQuarters(), getBlocks()]).then(([qRes, bRes]) => {
      setQuarters(qRes.data);
      setBlocks(bRes.data);
    });
  }, []);

  const loadBills = async () => {
    if (!selectedQuarter) return;
    try {
      let res;
      if (selectedStatus !== 'all') {
        res = await getBillsByQuarterAndStatus(selectedQuarter, selectedStatus);
      } else if (selectedBlock !== 'all') {
        const block = blocks.find(b => b.blockName === selectedBlock);
        res = await getBillsByQuarterAndBlock(selectedQuarter, block.id);
      } else {
        res = await getBillsByQuarter(selectedQuarter);
      }
      setBills(res.data);
    } catch (err) {
      toast.error('Failed to load bills');
    }
  };

  useEffect(() => {
    loadBills();
  }, [selectedQuarter, selectedBlock, selectedStatus]);

  const handleGenerate = async () => {
    if (!selectedQuarter) {
      toast.warning('Please select a quarter');
      return;
    }
    setGenerating(true);
    try {
      const res = await generateBills(selectedQuarter);
      toast.success(res.data.message + ` (${res.data.count} bills)`);
      loadBills();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate bills');
    } finally {
      setGenerating(false);
    }
  };

  const totalBilled = bills.reduce((sum, b) => sum + parseFloat(b.netAmount || 0), 0);
  const totalPaid = bills.reduce((sum, b) => sum + parseFloat(b.amountPaid || 0), 0);
  const totalOutstanding = bills.reduce((sum, b) => sum + parseFloat(b.balanceAmount > 0 ? b.balanceAmount : 0), 0);

  return (
    <div>
      <h2 className="mb-4"><i className="bi bi-receipt me-2"></i>Bill Generation & Management</h2>

      <div className="row mb-3">
        <div className="col-md-3">
          <label className="form-label">Quarter</label>
          <select className="form-select" value={selectedQuarter}
                  onChange={e => setSelectedQuarter(e.target.value)}>
            <option value="">Select Quarter</option>
            {quarters.map(q => (
              <option key={q.id} value={q.id}>{q.label}</option>
            ))}
          </select>
        </div>
        <div className="col-md-2">
          <label className="form-label">Block</label>
          <select className="form-select" value={selectedBlock}
                  onChange={e => setSelectedBlock(e.target.value)}>
            <option value="all">All</option>
            {blocks.map(b => (
              <option key={b.id} value={b.blockName}>Block {b.blockName}</option>
            ))}
          </select>
        </div>
        <div className="col-md-2">
          <label className="form-label">Status</label>
          <select className="form-select" value={selectedStatus}
                  onChange={e => setSelectedStatus(e.target.value)}>
            <option value="all">All</option>
            <option value="GENERATED">Generated</option>
            <option value="PAID">Paid</option>
            <option value="PARTIALLY_PAID">Partially Paid</option>
            <option value="UNPAID">Unpaid</option>
            <option value="OVERPAID">Overpaid</option>
          </select>
        </div>
        <div className="col-md-3 d-flex align-items-end">
          <button className="btn btn-primary me-2" onClick={handleGenerate}
                  disabled={generating || !selectedQuarter}>
            {generating ? <span className="spinner-border spinner-border-sm me-1"></span> : null}
            <i className="bi bi-lightning me-1"></i> Generate Bills
          </button>
        </div>
      </div>

      {bills.length > 0 && (
        <>
          <div className="row mb-3">
            <div className="col-md-3">
              <div className="card bg-primary text-white">
                <div className="card-body text-center">
                  <small>Total Billed</small>
                  <h5>{formatCurrency(totalBilled)}</h5>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card bg-success text-white">
                <div className="card-body text-center">
                  <small>Total Collected</small>
                  <h5>{formatCurrency(totalPaid)}</h5>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card bg-danger text-white">
                <div className="card-body text-center">
                  <small>Outstanding</small>
                  <h5>{formatCurrency(totalOutstanding)}</h5>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card bg-info text-white">
                <div className="card-body text-center">
                  <small>Bills Count</small>
                  <h5>{bills.length}</h5>
                </div>
              </div>
            </div>
          </div>

          <div className="table-responsive">
            <table className="table table-striped table-hover table-bordered">
              <thead className="table-dark">
                <tr>
                  <th>#</th>
                  <th>Bill No.</th>
                  <th>Unit</th>
                  <th>Owner</th>
                  <th>Prev Read</th>
                  <th>Curr Read</th>
                  <th>Units</th>
                  <th>Rate</th>
                  <th>Amount</th>
                  <th>Prev Bal</th>
                  <th>Net Amount</th>
                  <th>Paid</th>
                  <th>Balance</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {bills.map((bill, idx) => (
                  <tr key={bill.id}>
                    <td>{idx + 1}</td>
                    <td><small>{bill.billNumber}</small></td>
                    <td><strong>{bill.unitNumber}</strong></td>
                    <td>{bill.ownerName}</td>
                    <td>{bill.previousReading}</td>
                    <td>{bill.currentReading}</td>
                    <td>{bill.unitsConsumed}</td>
                    <td>{formatCurrency(bill.ratePerUnit)}</td>
                    <td>{formatCurrency(bill.totalAmount)}</td>
                    <td>{formatCurrency(bill.previousBalance)}</td>
                    <td><strong>{formatCurrency(bill.netAmount)}</strong></td>
                    <td className="text-success">{formatCurrency(bill.amountPaid)}</td>
                    <td className={parseFloat(bill.balanceAmount) > 0 ? 'text-danger fw-bold' : 'text-success'}>
                      {formatCurrency(bill.balanceAmount)}
                    </td>
                    <td>
                      <span className={`badge ${getStatusBadge(bill.status)}`}>{bill.status}</span>
                    </td>
                    <td>
                      {bill.status !== 'PAID' && bill.status !== 'OVERPAID' && (
                        <button className="btn btn-sm btn-success"
                                onClick={() => navigate('/payments', { state: { billId: bill.id } })}>
                          <i className="bi bi-cash"></i>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default BillGeneration;