import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { getReceipt } from '../api/api';
import { formatCurrency, formatDate } from '../utils/helpers';
import { useReactToPrint } from 'react-to-print';

const Receipt = () => {
  const { paymentId } = useParams();
  const [receipt, setReceipt] = useState(null);
  const printRef = useRef();

  useEffect(() => {
    loadReceipt();
  }, [paymentId]);

  const loadReceipt = async () => {
    try {
      const res = await getReceipt(paymentId);
      setReceipt(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
  });

  if (!receipt) return <div className="text-center mt-5"><div className="spinner-border"></div></div>;

  return (
    <div>
      <div className="d-flex justify-content-between mb-3">
        <h2><i className="bi bi-receipt me-2"></i>Payment Receipt</h2>
        <button className="btn btn-primary" onClick={handlePrint}>
          <i className="bi bi-printer me-1"></i> Print Receipt
        </button>
      </div>

      <div ref={printRef} className="card" style={{ maxWidth: '700px', margin: '0 auto' }}>
        <div className="card-body p-4">
          <div className="text-center border-bottom pb-3 mb-3">
            <h3 className="mb-1">{receipt.societyName || 'Society Water Billing'}</h3>
            <p className="text-muted mb-0">Water Bill Payment Receipt</p>
          </div>

          <div className="row mb-3">
            <div className="col-6">
              <strong>Receipt No:</strong> {receipt.receiptNumber}
            </div>
            <div className="col-6 text-end">
              <strong>Date:</strong> {formatDate(receipt.paymentDate)}
            </div>
          </div>

          <div className="border p-3 mb-3 bg-light">
            <div className="row">
              <div className="col-6">
                <p><strong>Unit No:</strong> {receipt.unitNumber}</p>
                <p><strong>Block:</strong> {receipt.blockName}</p>
                <p className="mb-0"><strong>Owner:</strong> {receipt.ownerName}</p>
              </div>
              <div className="col-6">
                <p><strong>Bill No:</strong> {receipt.billNumber}</p>
                <p><strong>Quarter:</strong> {receipt.quarterLabel}</p>
                <p className="mb-0"><strong>Payment:</strong> {receipt.paymentMode}
                  {receipt.transactionNumber && ` (${receipt.transactionNumber})`}
                </p>
              </div>
            </div>
          </div>

          <table className="table table-bordered mb-3">
            <tbody>
              <tr>
                <td>Previous Reading</td>
                <td className="text-end">{receipt.previousReading}</td>
              </tr>
              <tr>
                <td>Current Reading</td>
                <td className="text-end">{receipt.currentReading}</td>
              </tr>
              <tr>
                <td>Units Consumed</td>
                <td className="text-end"><strong>{receipt.unitsConsumed}</strong></td>
              </tr>
              <tr>
                <td>Rate per Unit</td>
                <td className="text-end">{formatCurrency(receipt.ratePerUnit)}</td>
              </tr>
              <tr>
                <td>Bill Amount</td>
                <td className="text-end">{formatCurrency(receipt.totalBillAmount)}</td>
              </tr>
              <tr>
                <td>Previous Balance</td>
                <td className="text-end">{formatCurrency(receipt.previousBalance)}</td>
              </tr>
              <tr className="table-primary">
                <td><strong>Net Amount</strong></td>
                <td className="text-end"><strong>{formatCurrency(receipt.netAmount)}</strong></td>
              </tr>
              <tr className="table-success">
                <td><strong>Amount Paid (This Payment)</strong></td>
                <td className="text-end"><strong>{formatCurrency(receipt.amountPaid)}</strong></td>
              </tr>
              <tr>
                <td>Total Paid So Far</td>
                <td className="text-end">{formatCurrency(receipt.totalPaidSoFar)}</td>
              </tr>
              <tr className={parseFloat(receipt.balanceAmount) > 0 ? 'table-danger' : 'table-success'}>
                <td><strong>Balance Amount</strong></td>
                <td className="text-end"><strong>{formatCurrency(receipt.balanceAmount)}</strong></td>
              </tr>
            </tbody>
          </table>

          <div className="row mt-5">
            <div className="col-6">
              <p className="border-top pt-2">Received By</p>
            </div>
            <div className="col-6 text-end">
              <p className="border-top pt-2">Resident Signature</p>
            </div>
          </div>

          <div className="text-center text-muted mt-3">
            <small>This is a computer-generated receipt</small>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Receipt;