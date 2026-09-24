import React, { useState, useEffect } from 'react';
import { getQuarters, getBillsByQuarter, recordPayment, getBillById } from '../api/api';
import { toast } from 'react-toastify';
import { formatCurrency } from '../utils/helpers';
import { useNavigate, useLocation } from 'react-router-dom';

const PaymentEntry = () => {
  const [quarters, setQuarters] = useState([]);
  const [selectedQuarter, setSelectedQuarter] = useState('');
  const [bills, setBills] = useState([]);
  const [selectedBill, setSelectedBill] = useState(null);
  const [payment, setPayment] = useState({
    billId: '',
    amountPaid: '',
    paymentMode: 'CASH',
    transactionNumber: '',
    paymentDate: new Date().toISOString().split('T')[0],
    remarks: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    getQuarters().then(res => setQuarters(res.data));
    if (location.state?.billId) {
      loadBillDetails(location.state.billId);
    }
  }, []);

  const loadBillDetails = async (billId) => {
    try {
      const res = await getBillById(billId);
      setSelectedBill(res.data);
      setPayment(prev => ({
        ...prev,
        billId: billId,
        amountPaid: res.data.balanceAmount
      }));
    } catch (err) {
      toast.error('Failed to load bill');
    }
  };

  const loadBills = async (quarterId) => {
    setSelectedQuarter(quarterId);
    if (!quarterId) return;
    try {
      const res = await getBillsByQuarter(quarterId);
      // Show only unpaid/partially paid bills
      setBills(res.data.filter(b => b.status !== 'PAID' && b.status !== 'OVERPAID' && b.status !== 'CANCELLED'));
    } catch (err) {
      toast.error('Failed to load bills');
    }
  };

  const handleBillSelect = (billId) => {
    const bill = bills.find(b => b.id === parseInt(billId));
    setSelectedBill(bill);
    setPayment(prev => ({
      ...prev,
      billId: billId,
      amountPaid: bill ? bill.balanceAmount : ''
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!payment.billId || !payment.amountPaid) {
      toast.warning('Please fill required fields');
      return;
    }
    setSubmitting(true);
    try {
      const res = await recordPayment({
        ...payment,
        billId: parseInt(payment.billId),
        amountPaid: parseFloat(payment.amountPaid)
      });
      toast.success(`Payment recorded! Receipt: ${res.data.receiptNumber}`);
      navigate(`/receipt/${res.data.paymentId}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record payment');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <h2 className="mb-4"><i className="bi bi-cash-stack me-2"></i>Record Payment</h2>

      <div className="row">
        <div className="col-md-6">
          <div className="card">
            <div className="card-body">
              <form onSubmit={handleSubmit}>
                {!location.state?.billId && (
                  <>
                    <div className="mb-3">
                      <label className="form-label">Quarter</label>
                      <select className="form-select" value={selectedQuarter}
                              onChange={e => loadBills(e.target.value)}>
                        <option value="">Select Quarter</option>
                        {quarters.map(q => (
                          <option key={q.id} value={q.id}>{q.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Select Bill</label>
                      <select className="form-select" value={payment.billId}
                              onChange={e => handleBillSelect(e.target.value)}>
                        <option value="">Select Bill</option>
                        {bills.map(b => (
                          <option key={b.id} value={b.id}>
                            {b.unitNumber} - {b.ownerName} - {formatCurrency(b.balanceAmount)} due
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                )}

                <div className="mb-3">
                  <label className="form-label">Amount Paid (₹)</label>
                  <input type="number" step="0.01" className="form-control"
                         value={payment.amountPaid}
                         onChange={e => setPayment({ ...payment, amountPaid: e.target.value })}
                         required />
                  <small className="text-muted">
                    Can be more or less than due amount
                  </small>
                </div>

                <div className="mb-3">
                  <label className="form-label">Payment Mode</label>
                  <select className="form-select" value={payment.paymentMode}
                          onChange={e => setPayment({ ...payment, paymentMode: e.target.value })}>
                    <option value="CASH">Cash</option>
                    <option value="ONLINE">Online</option>
                    <option value="UPI">UPI</option>
                    <option value="CHEQUE">Cheque</option>
                  </select>
                </div>

                {payment.paymentMode !== 'CASH' && (
                  <div className="mb-3">
                    <label className="form-label">Transaction Number</label>
                    <input type="text" className="form-control"
                           value={payment.transactionNumber}
                           onChange={e => setPayment({ ...payment, transactionNumber: e.target.value })} />
                  </div>
                )}

                <div className="mb-3">
                  <label className="form-label">Payment Date</label>
                  <input type="date" className="form-control"
                         value={payment.paymentDate}
                         onChange={e => setPayment({ ...payment, paymentDate: e.target.value })} />
                </div>

                <div className="mb-3">
                  <label className="form-label">Remarks</label>
                  <textarea className="form-control" rows="2"
                            value={payment.remarks}
                            onChange={e => setPayment({ ...payment, remarks: e.target.value })} />
                </div>

                <button type="submit" className="btn btn-success btn-lg w-100" disabled={submitting}>
                  {submitting ? 'Processing...' : '💰 Record Payment'}
                </button>
              </form>
            </div>
          </div>
        </div>

        <div className="col-md-6">
          {selectedBill && (
            <div className="card">
              <div className="card-header bg-primary text-white">
                <h5 className="mb-0">Bill Details</h5>
              </div>
              <div className="card-body">
                <table className="table table-borderless">
                  <tbody>
                    <tr><td className="text-muted">Bill Number:</td><td><strong>{selectedBill.billNumber}</strong></td></tr>
                    <tr><td className="text-muted">Unit:</td><td>{selectedBill.unitNumber} (Block {selectedBill.blockName})</td></tr>
                    <tr><td className="text-muted">Owner:</td><td>{selectedBill.ownerName}</td></tr>
                    <tr><td className="text-muted">Quarter:</td><td>{selectedBill.quarterLabel}</td></tr>
                    <tr><td className="text-muted">Previous Reading:</td><td>{selectedBill.previousReading}</td></tr>
                    <tr><td className="text-muted">Current Reading:</td><td>{selectedBill.currentReading}</td></tr>
                    <tr><td className="text-muted">Units Consumed:</td><td><strong>{selectedBill.unitsConsumed}</strong></td></tr>
                    <tr><td className="text-muted">Rate/Unit:</td><td>{formatCurrency(selectedBill.ratePerUnit)}</td></tr>
                    <tr><td className="text-muted">Bill Amount:</td><td>{formatCurrency(selectedBill.totalAmount)}</td></tr>
                    <tr><td className="text-muted">Previous Balance:</td><td>{formatCurrency(selectedBill.previousBalance)}</td></tr>
                    <tr><td className="text-muted">Net Amount:</td><td className="fw-bold fs-5">{formatCurrency(selectedBill.netAmount)}</td></tr>
                    <tr><td className="text-muted">Already Paid:</td><td className="text-success">{formatCurrency(selectedBill.amountPaid)}</td></tr>
                    <tr><td className="text-muted">Balance Due:</td><td className="text-danger fw-bold fs-5">{formatCurrency(selectedBill.balanceAmount)}</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentEntry;