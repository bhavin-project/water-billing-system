import React, { useState, useEffect, useRef } from 'react';
import { getQuarters, getBlocks, getQuarterReport, getBillsByUnit, getPaymentsByUnit, getUnits } from '../api/api';
import { toast } from 'react-toastify';
import { formatCurrency, getStatusBadge, formatDate } from '../utils/helpers';
import { useReactToPrint } from 'react-to-print';

const Reports = () => {
  const [quarters, setQuarters] = useState([]);
  const [units, setUnits] = useState([]);
  const [selectedQuarter, setSelectedQuarter] = useState('');
  const [selectedUnit, setSelectedUnit] = useState('');
  const [reportType, setReportType] = useState('quarter');
  const [report, setReport] = useState(null);
  const [unitBills, setUnitBills] = useState([]);
  const [unitPayments, setUnitPayments] = useState([]);
  const printRef = useRef();

  useEffect(() => {
    Promise.all([getQuarters(), getUnits()]).then(([qRes, uRes]) => {
      setQuarters(qRes.data);
      setUnits(uRes.data);
    });
  }, []);

  const loadQuarterReport = async (quarterId) => {
    setSelectedQuarter(quarterId);
    if (!quarterId) return;
    try {
      const res = await getQuarterReport(quarterId);
      setReport(res.data);
    } catch (err) {
      toast.error('Failed to load report');
    }
  };

  const loadUnitHistory = async (unitId) => {
    setSelectedUnit(unitId);
    if (!unitId) return;
    try {
      const [billsRes, paymentsRes] = await Promise.all([
        getBillsByUnit(unitId),
        getPaymentsByUnit(unitId)
      ]);
      setUnitBills(billsRes.data);
      setUnitPayments(paymentsRes.data);
    } catch (err) {
      toast.error('Failed to load unit history');
    }
  };

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
  });

  return (
    <div>
      <h2 className="mb-4"><i className="bi bi-bar-chart me-2"></i>Reports</h2>

      <div className="row mb-4">
        <div className="col-md-3">
          <label className="form-label">Report Type</label>
          <select className="form-select" value={reportType}
                  onChange={e => { setReportType(e.target.value); setReport(null); setUnitBills([]); }}>
            <option value="quarter">Quarter-wise Report</option>
            <option value="unit">Unit History</option>
          </select>
        </div>

        {reportType === 'quarter' && (
          <div className="col-md-3">
            <label className="form-label">Quarter</label>
            <select className="form-select" value={selectedQuarter}
                    onChange={e => loadQuarterReport(e.target.value)}>
              <option value="">Select Quarter</option>
              {quarters.map(q => (
                <option key={q.id} value={q.id}>{q.label}</option>
              ))}
            </select>
          </div>
        )}

        {reportType === 'unit' && (
          <div className="col-md-3">
            <label className="form-label">Unit</label>
            <select className="form-select" value={selectedUnit}
                    onChange={e => loadUnitHistory(e.target.value)}>
              <option value="">Select Unit</option>
              {units.map(u => (
                <option key={u.id} value={u.id}>{u.unitNumber} - {u.ownerName}</option>
              ))}
            </select>
          </div>
        )}

        <div className="col-md-2 d-flex align-items-end">
          <button className="btn btn-outline-primary" onClick={handlePrint}>
            <i className="bi bi-printer me-1"></i> Print
          </button>
        </div>
      </div>

      <div ref={printRef}>
        {/* Quarter Report */}
        {reportType === 'quarter' && report && (
          <div>
            <div className="card mb-3">
              <div className="card-header bg-primary text-white">
                <h5 className="mb-0">Quarter Report: {report.quarterLabel}</h5>
              </div>
              <div className="card-body">
                <div className="row text-center">
                  <div className="col-md-2">
                    <h6 className="text-muted">Total Units</h6>
                    <h4>{report.totalUnits}</h4>
                  </div>
                  <div className="col-md-2">
                    <h6 className="text-muted">Bills Generated</h6>
                    <h4>{report.billsGenerated}</h4>
                  </div>
                  <div className="col-md-2">
                    <h6 className="text-muted">Paid</h6>
                    <h4 className="text-success">{report.paidCount}</h4>
                  </div>
                  <div className="col-md-2">
                    <h6 className="text-muted">Partially Paid</h6>
                    <h4 className="text-warning">{report.partiallyPaidCount}</h4>
                  </div>
                  <div className="col-md-2">
                    <h6 className="text-muted">Unpaid</h6>
                    <h4 className="text-danger">{report.unpaidCount}</h4>
                  </div>
                </div>
                <hr />
                <div className="row text-center">
                  <div className="col-md-4">
                    <h6 className="text-muted">Total Billed</h6>
                    <h4>{formatCurrency(report.totalBilled)}</h4>
                  </div>
                  <div className="col-md-4">
                    <h6 className="text-muted">Collected</h6>
                    <h4 className="text-success">{formatCurrency(report.totalCollected)}</h4>
                  </div>
                  <div className="col-md-4">
                    <h6 className="text-muted">Outstanding</h6>
                    <h4 className="text-danger">{formatCurrency(report.totalOutstanding)}</h4>
                  </div>
                </div>
              </div>
            </div>

            <div className="table-responsive">
              <table className="table table-striped table-bordered table-sm">
                <thead className="table-dark">
                  <tr>
                    <th>#</th>
                    <th>Unit</th>
                    <th>Block</th>
                    <th>Owner</th>
                    <th>Units Used</th>
                    <th>Bill Amount</th>
                    <th>Prev Balance</th>
                    <th>Net Amount</th>
                    <th>Paid</th>
                    <th>Balance</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {report.bills.map((bill, idx) => (
                    <tr key={bill.id}>
                      <td>{idx + 1}</td>
                      <td><strong>{bill.unitNumber}</strong></td>
                      <td>{bill.blockName}</td>
                      <td>{bill.ownerName}</td>
                      <td>{bill.unitsConsumed}</td>
                      <td>{formatCurrency(bill.totalAmount)}</td>
                      <td>{formatCurrency(bill.previousBalance)}</td>
                      <td><strong>{formatCurrency(bill.netAmount)}</strong></td>
                      <td className="text-success">{formatCurrency(bill.amountPaid)}</td>
                      <td className={parseFloat(bill.balanceAmount) > 0 ? 'text-danger fw-bold' : ''}>
                        {formatCurrency(bill.balanceAmount)}
                      </td>
                      <td><span className={`badge ${getStatusBadge(bill.status)}`}>{bill.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Unit History */}
        {reportType === 'unit' && unitBills.length > 0 && (
          <div>
            <h5>Bill History</h5>
            <div className="table-responsive mb-4">
              <table className="table table-striped table-bordered">
                <thead className="table-dark">
                  <tr>
                    <th>Quarter</th>
                    <th>Bill No</th>
                    <th>Units Used</th>
                    <th>Rate</th>
                    <th>Amount</th>
                    <th>Prev Balance</th>
                    <th>Net Amount</th>
                    <th>Paid</th>
                    <th>Balance</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {unitBills.map(bill => (
                    <tr key={bill.id}>
                      <td>{bill.quarterLabel}</td>
                      <td><small>{bill.billNumber}</small></td>
                      <td>{bill.unitsConsumed}</td>
                      <td>{formatCurrency(bill.ratePerUnit)}</td>
                      <td>{formatCurrency(bill.totalAmount)}</td>
                      <td>{formatCurrency(bill.previousBalance)}</td>
                      <td><strong>{formatCurrency(bill.netAmount)}</strong></td>
                      <td className="text-success">{formatCurrency(bill.amountPaid)}</td>
                      <td className={parseFloat(bill.balanceAmount) > 0 ? 'text-danger' : ''}>
                        {formatCurrency(bill.balanceAmount)}
                      </td>
                      <td><span className={`badge ${getStatusBadge(bill.status)}`}>{bill.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h5>Payment History</h5>
            <div className="table-responsive">
              <table className="table table-striped table-bordered">
                <thead className="table-dark">
                  <tr>
                    <th>Receipt No</th>
                    <th>Quarter</th>
                    <th>Date</th>
                    <th>Amount Paid</th>
                    <th>Mode</th>
                    <th>Transaction No</th>
                    <th>Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {unitPayments.map(p => (
                    <tr key={p.id}>
                      <td>{p.receiptNumber}</td>
                      <td>{p.quarterLabel}</td>
                      <td>{formatDate(p.paymentDate)}</td>
                      <td className="text-success fw-bold">{formatCurrency(p.amountPaid)}</td>
                      <td>{p.paymentMode}</td>
                      <td>{p.transactionNumber || '-'}</td>
                      <td>{p.remarks || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Reports;