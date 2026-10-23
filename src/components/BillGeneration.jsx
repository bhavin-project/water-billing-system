import React, { useState, useEffect, useRef } from 'react';
import api from '../api/api';
import Receipt from './Receipt';

function BillGeneration() {
    const [quarters, setQuarters] = useState([]);
    const [selectedQuarter, setSelectedQuarter] = useState(null);
    const [bills, setBills] = useState([]);
    const [payments, setPayments] = useState({});
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Print reference & state
    const receiptRef = useRef();
    const [printData, setPrintData] = useState([]);

    // Helpers to extract values safely across DTO variations
    const getUnitNumber = (bill) => {
        return bill?.unit?.unitNumber || bill?.meterReading?.unit?.unitNumber || bill?.unitNumber || `Unit #${bill?.id || ''}`;
    };

    const getUnitsConsumed = (bill) => {
        return bill?.unitsConsumed ?? bill?.meterReading?.unitsConsumed ?? 0;
    };

    const getWaterCharges = (bill) => {
        const val = bill?.currentBillAmount ?? bill?.waterCharges ?? bill?.currentCharges ?? bill?.billAmount ?? bill?.waterCharge ?? bill?.amount;
        if (val !== undefined && val !== null && val !== 0) return val;
        return getUnitsConsumed(bill) * 5;
    };

    const getPrevPending = (bill) => {
        return bill?.previousPending ?? bill?.previousDue ?? bill?.prevPending ?? bill?.pendingAmount ?? bill?.previousBalance ?? bill?.meterReading?.previousPending ?? 0;
    };

    const getTotalDue = (bill) => {
        const val = bill?.totalPayable ?? bill?.netPayable ?? bill?.totalDue ?? bill?.totalAmount ?? bill?.netDue ?? bill?.netAmount;
        if (val !== undefined && val !== null && val !== 0) return val;
        return Number(getWaterCharges(bill)) + Number(getPrevPending(bill));
    };

    const getAmountPaid = (bill) => {
        return bill?.amountPaid ?? bill?.paidAmount ?? bill?.paid ?? 0;
    };

    // 1. Fetch quarters
    useEffect(() => {
        api.get('/meter-readings/quarters')
            .then(res => {
                if (res.data && res.data.length > 0) {
                    setQuarters(res.data);
                    const active = res.data.find(q => !q.closed) || res.data[0];
                    setSelectedQuarter(active);
                }
            })
            .catch(err => console.error("Failed to load quarters", err));
    }, []);

    // 2. Fetch bills when quarter changes
    useEffect(() => {
        if (selectedQuarter) {
            loadBills();
        }
    }, [selectedQuarter]);

    const loadBills = () => {
        setLoading(true);
        api.get(`/bills/quarter/${selectedQuarter.id}`)
            .then(res => {
                const billList = res.data || [];
                setBills(billList);

                const initialForm = {};
                billList.forEach(bill => {
                    const totalDue = getTotalDue(bill);
                    const amountPaid = getAmountPaid(bill);
                    const balance = totalDue - amountPaid;

                    initialForm[bill.id] = {
                        amount: balance > 0 ? balance : 0,
                        paymentMode: 'UPI',
                        paymentDate: new Date().toISOString().split('T')[0],
                        remarks: ''
                    };
                });
                setPayments(initialForm);
            })
            .catch(err => console.error("Error loading bills", err))
            .finally(() => setLoading(false));
    };

    // 3. Generate OR Regenerate Bills for Selected Quarter
    const handleGenerateOrRegenerate = async () => {
        if (!selectedQuarter) return;
        const isRegenerate = bills.length > 0;
        const endpoint = isRegenerate
            ? `/bills/regenerate/${selectedQuarter.id}`
            : `/bills/generate/${selectedQuarter.id}`;

        try {
            setLoading(true);
            await api.post(endpoint);
            alert(
                isRegenerate
                    ? `Bills regenerated successfully for ${selectedQuarter.label}!`
                    : `Bills generated successfully for ${selectedQuarter.label}!`
            );
            loadBills();
        } catch (err) {
            console.error("Generate/Regenerate bills error:", err.response?.data || err);
            const msg =
                err.response?.data?.message ||
                err.response?.data?.error ||
                err.message;
            alert("Failed to generate bills:\n" + msg);
            setLoading(false);
        }
    };

    const handleInputChange = (billId, field, value) => {
        setPayments(prev => ({
            ...prev,
            [billId]: {
                ...prev[billId],
                [field]: value
            }
        }));
    };

    const saveSinglePayment = async (billId) => {
        const payData = payments[billId];
        if (!payData || parseFloat(payData.amount) <= 0) {
            return alert("Please enter a valid amount to pay.");
        }
        try {
            await api.post(`/payments/bill/${billId}`, {
                amount: parseFloat(payData.amount),
                paymentMode: payData.paymentMode,
                paymentDate: payData.paymentDate,
                remarks: payData.remarks
            });
            alert("Payment recorded successfully!");
            loadBills();
        } catch (err) {
            console.error("Save payment error:", err.response?.data || err);
            const msg = err.response?.data?.message || err.message;
            alert("Failed to save payment:\n" + msg);
        }
    };

    const saveAllPayments = async () => {
        const bulkPayload = [];
        bills.forEach(bill => {
            const p = payments[bill.id];
            if (p && parseFloat(p.amount) > 0) {
                bulkPayload.push({
                    billId: bill.id,
                    payment: {
                        amount: parseFloat(p.amount),
                        paymentMode: p.paymentMode,
                        paymentDate: p.paymentDate,
                        remarks: p.remarks
                    }
                });
            }
        });

        if (bulkPayload.length === 0) {
            return alert("No payments entered to save.");
        }

        try {
            try {
                await api.post('/payments/bulk', bulkPayload);
            } catch (bulkErr) {
                for (let item of bulkPayload) {
                    await api.post(`/payments/bill/${item.billId}`, item.payment);
                }
            }
            alert(`Successfully saved ${bulkPayload.length} payments!`);
            loadBills();
        } catch (err) {
            console.error("Bulk save error:", err);
            alert("Failed to save payments.");
        }
    };

    // Print single unit receipt
    const handlePrintSingle = async (bill) => {
        try {
            const res = await api.get(`/payments/bill/${bill.id}`);
            const list = res.data;
            if (list && list.length > 0) {
                const latestPayment = list[list.length - 1];
                setPrintData([{ ...latestPayment, bill: bill }]);
                setTimeout(() => window.print(), 300);
            } else {
                alert("No saved payment found yet for " + getUnitNumber(bill) + ". Please save payment first.");
            }
        } catch (err) {
            console.error("Print fetch error", err);
        }
    };

    // Print all receipts for selected quarter
    const handlePrintAll = async () => {
        try {
            const allPayments = [];
            for (let bill of bills) {
                try {
                    const res = await api.get(`/payments/bill/${bill.id}`);
                    if (res.data && res.data.length > 0) {
                        const latest = res.data[res.data.length - 1];
                        allPayments.push({ ...latest, bill: bill });
                    }
                } catch (e) {
                    // Skip bills without payments
                }
            }

            if (allPayments.length === 0) {
                return alert("No payments recorded for this quarter yet.");
            }

            setPrintData(allPayments);
            setTimeout(() => window.print(), 400);
        } catch (err) {
            console.error("Print all error", err);
        }
    };

    const filteredBills = bills.filter(bill =>
        getUnitNumber(bill).toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="container-fluid mt-3">
            <div className="d-print-none">
                <h2>Bill Generation & Payment Collection</h2>

                {/* Quarter Selection & Actions Header */}
                <div className="card p-3 my-3 shadow-sm">
                    <div className="row g-3 align-items-end">
                        <div className="col-md-3">
                            <label className="form-label fw-bold">Select Quarter</label>
                            <select
                                className="form-select"
                                value={selectedQuarter?.id || ''}
                                onChange={e => setSelectedQuarter(quarters.find(q => q.id === parseInt(e.target.value)))}
                            >
                                {quarters.map(q => (
                                    <option key={q.id} value={q.id}>{q.label}</option>
                                ))}
                            </select>
                        </div>

                        <div className="col-md-3">
                            <label className="form-label fw-bold">Search Flat</label>
                            <input
                                type="text"
                                className="form-control"
                                placeholder="e.g. A-101 or B-"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>

                        <div className="col-md-6 text-md-end d-flex flex-wrap justify-content-md-end gap-2">
                            {/* Generate OR Regenerate Bills Button */}
                            <button
                                className={`btn ${bills.length === 0 ? 'btn-success' : 'btn-warning'}`}
                                onClick={handleGenerateOrRegenerate}
                                disabled={!selectedQuarter || loading}
                            >
                                <i className={`bi ${bills.length === 0 ? 'bi-lightning-charge-fill' : 'bi-arrow-clockwise'} me-1`}></i>
                                {bills.length === 0 ? 'Generate Bills' : 'Regenerate Bills'}
                            </button>

                            <button
                                className="btn btn-primary"
                                onClick={saveAllPayments}
                                disabled={bills.length === 0}
                            >
                                <i className="bi bi-check-all me-1"></i> Save All Payments
                            </button>

                            <button
                                className="btn btn-dark"
                                onClick={handlePrintAll}
                                disabled={bills.length === 0}
                            >
                                <i className="bi bi-printer me-1"></i> Print All Receipts
                            </button>
                        </div>
                    </div>
                </div>

                {/* Empty State OR Bills Table */}
                {loading ? (
                    <div className="text-center p-5">
                        <div className="spinner-border text-primary me-2"></div>
                        Loading bills...
                    </div>
                ) : bills.length === 0 ? (
                    <div className="card p-5 text-center shadow-sm bg-light">
                        <i className="bi bi-receipt-cutoff fs-1 text-secondary mb-2"></i>
                        <h4>No Bills Generated Yet for {selectedQuarter?.label}</h4>
                        <p className="text-muted mb-3">
                            Once you have entered and saved meter readings in the <strong>Meter Readings</strong> tab, click below to generate bills for all units.
                        </p>
                        <div>
                            <button className="btn btn-success btn-lg px-4" onClick={handleGenerateOrRegenerate}>
                                <i className="bi bi-lightning-charge-fill me-2"></i>
                                Generate Bills Now
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="table-responsive">
                        <table className="table table-bordered table-striped align-middle">
                            <thead className="table-dark">
                                <tr>
                                    <th>FLAT NO</th>
                                    <th>UNITS</th>
                                    <th>WATER CHARGES</th>
                                    <th>PREV PENDING</th>
                                    <th>NET DUE</th>
                                    <th>PAID</th>
                                    <th>BALANCE</th>
                                    <th style={{ minWidth: '110px' }}>PAY AMOUNT</th>
                                    <th style={{ minWidth: '110px' }}>MODE</th>
                                    <th style={{ minWidth: '130px' }}>DATE</th>
                                    <th style={{ minWidth: '150px' }}>REF / REMARKS</th>
                                    <th style={{ minWidth: '110px' }}>ACTIONS</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredBills.map(bill => {
                                    const units = getUnitsConsumed(bill);
                                    const waterCharges = getWaterCharges(bill);
                                    const prevPending = getPrevPending(bill);
                                    const totalDue = getTotalDue(bill);
                                    const amountPaid = getAmountPaid(bill);
                                    const balance = totalDue - amountPaid;
                                    const p = payments[bill.id] || {};
                                    const unitNo = getUnitNumber(bill);

                                    return (
                                        <tr key={bill.id}>
                                            <td><strong>{unitNo}</strong></td>
                                            <td>{units}</td>
                                            <td>₹{waterCharges}</td>
                                            <td>₹{prevPending}</td>
                                            <td className="fw-bold">₹{totalDue}</td>
                                            <td className="text-success fw-bold">₹{amountPaid}</td>
                                            <td className={balance > 0 ? "text-danger fw-bold" : "text-success fw-bold"}>
                                                ₹{balance}
                                            </td>

                                            <td>
                                                <input
                                                    type="number"
                                                    className="form-control form-control-sm bg-white"
                                                    value={p.amount !== undefined ? p.amount : ''}
                                                    onChange={e => handleInputChange(bill.id, 'amount', e.target.value)}
                                                    placeholder="0"
                                                />
                                            </td>
                                            <td>
                                                <select
                                                    className="form-select form-select-sm bg-white"
                                                    value={p.paymentMode || 'UPI'}
                                                    onChange={e => handleInputChange(bill.id, 'paymentMode', e.target.value)}
                                                >
                                                    <option value="UPI">UPI</option>
                                                    <option value="Cash">Cash</option>
                                                    <option value="Cheque">Cheque</option>
                                                    <option value="Bank Transfer">Bank Transfer</option>
                                                </select>
                                            </td>
                                            <td>
                                                <input
                                                    type="date"
                                                    className="form-control form-control-sm bg-white"
                                                    value={p.paymentDate || ''}
                                                    onChange={e => handleInputChange(bill.id, 'paymentDate', e.target.value)}
                                                />
                                            </td>
                                            <td>
                                                <input
                                                    type="text"
                                                    className="form-control form-control-sm bg-white"
                                                    placeholder="UPI / Cheque No"
                                                    value={p.remarks || ''}
                                                    onChange={e => handleInputChange(bill.id, 'remarks', e.target.value)}
                                                />
                                            </td>
                                            <td>
                                                <div className="d-flex gap-1">
                                                    <button
                                                        className="btn btn-sm btn-success"
                                                        onClick={() => saveSinglePayment(bill.id)}
                                                    >
                                                        Save
                                                    </button>
                                                    <button
                                                        className="btn btn-sm btn-outline-dark"
                                                        title="Print Receipt"
                                                        onClick={() => handlePrintSingle(bill)}
                                                    >
                                                        <i className="bi bi-printer"></i>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Hidden printable receipt wrapper */}
            <div className="d-none d-print-block">
                <Receipt
                    ref={receiptRef}
                    payments={printData}
                    quarterLabel={selectedQuarter?.label}
                />
            </div>
        </div>
    );
}

export default BillGeneration;