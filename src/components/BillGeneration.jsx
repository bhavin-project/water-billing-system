import React, { useState, useEffect, useRef } from 'react';
import api from '../api/api';
import Receipt from './Receipt';

function BillGeneration() {
    const [quarters, setQuarters] = useState([]);
    const [selectedQuarter, setSelectedQuarter] = useState(null);
    const [bills, setBills] = useState([]);
    const [payments, setPayments] = useState({});
    const [loading, setLoading] = useState(false);

    // Print reference & state
    const receiptRef = useRef();
    const [printData, setPrintData] = useState([]);

    // Helpers to extract values safely with fallback logic
    const getUnitNumber = (bill) => {
        return bill?.unit?.unitNumber || bill?.meterReading?.unit?.unitNumber || bill?.unitNumber || `Unit #${bill?.id || ''}`;
    };

    const getUnitsConsumed = (bill) => {
        return bill?.unitsConsumed ?? bill?.meterReading?.unitsConsumed ?? 0;
    };

    const getWaterCharges = (bill) => {
        if (bill?.waterCharges !== undefined && bill?.waterCharges !== null && bill?.waterCharges !== 0) return bill.waterCharges;
        if (bill?.currentCharges !== undefined && bill?.currentCharges !== null && bill?.currentCharges !== 0) return bill.currentCharges;
        if (bill?.billAmount !== undefined && bill?.billAmount !== null && bill?.billAmount !== 0) return bill.billAmount;
        if (bill?.waterCharge !== undefined && bill?.waterCharge !== null && bill?.waterCharge !== 0) return bill.waterCharge;
        if (bill?.amount !== undefined && bill?.amount !== null && bill?.amount !== 0) return bill.amount;
        
        // Fallback: calculate using units * rate (e.g. 5) if available
        const units = getUnitsConsumed(bill);
        return units * 5; 
    };

    const getPrevPending = (bill) => {
        return bill?.previousPending ?? bill?.prevPending ?? bill?.pendingAmount ?? bill?.previousBalance ?? bill?.meterReading?.previousPending ?? 0;
    };

    const getTotalDue = (bill) => {
        if (bill?.totalDue !== undefined && bill?.totalDue !== null && bill?.totalDue !== 0) return bill.totalDue;
        if (bill?.totalAmount !== undefined && bill?.totalAmount !== null && bill?.totalAmount !== 0) return bill.totalAmount;
        if (bill?.netDue !== undefined && bill?.netDue !== null && bill?.netDue !== 0) return bill.netDue;
        if (bill?.netAmount !== undefined && bill?.netAmount !== null && bill?.netAmount !== 0) return bill.netAmount;
        
        // Fallback calculation: Water Charges + Previous Pending
        return getWaterCharges(bill) + getPrevPending(bill);
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
            .catch(err => {
                // Fallback attempt to /quarters endpoint
                api.get('/quarters')
                    .then(res => {
                        if (res.data && res.data.length > 0) {
                            setQuarters(res.data);
                            setSelectedQuarter(res.data.find(q => !q.closed) || res.data[0]);
                        }
                    })
                    .catch(e => console.error("Failed to load quarters", e));
            });
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
                
                // Initialize payment forms allowing user to edit freely
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
            console.error("Save payment error:", err);
            alert("Failed to save payment.");
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
                // Fallback: post payments sequentially if bulk endpoint fails
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

    // Print receipt for individual unit
    const handlePrintSingle = async (bill) => {
        try {
            const res = await api.get(`/payments/bill/${bill.id}`);
            const list = res.data;
            if (list && list.length > 0) {
                const latestPayment = list[list.length - 1];
                setPrintData([{ ...latestPayment, bill: bill }]);
                setTimeout(() => window.print(), 300);
            } else {
                const p = payments[bill.id];
                if (p && parseFloat(p.amount) > 0) {
                    setPrintData([{
                        amount: parseFloat(p.amount),
                        paymentMode: p.paymentMode,
                        paymentDate: p.paymentDate,
                        remarks: p.remarks,
                        receiptNumber: 'PENDING',
                        bill: bill
                    }]);
                    setTimeout(() => window.print(), 300);
                } else {
                    alert("No payments recorded yet for " + getUnitNumber(bill));
                }
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
                    // Ignore single bill fetch errors
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

    return (
        <div className="container-fluid mt-3">
            <div className="d-print-none">
                <h2>Bill Generation & Payment Collection</h2>

                {/* Quarter Selection Header */}
                <div className="card p-3 my-3 shadow-sm">
                    <div className="row align-items-end">
                        <div className="col-md-4">
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
                        <div className="col-md-8 text-end mt-3 mt-md-0">
                            <button className="btn btn-primary me-2" onClick={saveAllPayments}>
                                <i className="bi bi-check-all"></i> Save All Payments
                            </button>
                            <button className="btn btn-dark" onClick={handlePrintAll}>
                                <i className="bi bi-printer"></i> Print All Receipts
                            </button>
                        </div>
                    </div>
                </div>

                {/* Data Table */}
                {loading ? (
                    <div className="text-center p-5">Loading bills...</div>
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
                                {bills.map(bill => {
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
                                            
                                            {/* Editable Payment Inputs (ALWAYS ENABLED) */}
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