import React, { forwardRef } from 'react';
import { amountToWords } from '../utils/numberToWords';
import './Receipt.css';

const Receipt = forwardRef(({ payments, quarterLabel }, ref) => {
    if (!payments || payments.length === 0) return null;

    // Split payments into groups of 3 for 3-per-page printing
    const triplets = [];
    for (let i = 0; i < payments.length; i += 3) {
        triplets.push(payments.slice(i, i + 3));
    }

    return (
        <div ref={ref} className="receipt-print-container">
            {triplets.map((group, pageIndex) => (
                <div key={pageIndex} className="receipt-page">
                    {group.map((payment, index) => {
                        const bill = payment.bill || {};
                        const unitNumber =
                            bill.unit?.unitNumber ||
                            bill.meterReading?.unit?.unitNumber ||
                            bill.unitNumber ||
                            payment.unitNumber ||
                            '____';

                        const payAmount = Number(
                            payment.amount ??
                            payment.amountPaid ??
                            payment.amount_paid ??
                            bill.amountPaid ??
                            0
                        );

                        let formattedDate = '';
                        if (payment.paymentDate) {
                            const parts = String(payment.paymentDate).split('-');
                            formattedDate =
                                parts.length === 3
                                    ? `${parts[2]}/${parts[1]}/${parts[0]}`
                                    : payment.paymentDate;
                        } else {
                            const today = new Date();
                            formattedDate = `${String(today.getDate()).padStart(2, '0')}/${String(
                                today.getMonth() + 1
                            ).padStart(2, '0')}/${today.getFullYear()}`;
                        }

                        return (
                            <div key={payment.id || `${pageIndex}-${index}`} className="receipt-box">
                                <div className="receipt-header">
                                    <h2 className="society-title">
                                        Silicone Vally Co-Op. Housing Service Society Ltd.
                                    </h2>
                                    <p className="reg-no">
                                        Redg. No. NDHN / GNR / 6614 / 2012 Dt. 27-03-2012
                                    </p>
                                    <p className="address">
                                        Block No. 132, Opp. Vasant Bahar Flat, Kudasan, Gandhinagar - 382419
                                    </p>
                                </div>

                                <div className="receipt-meta-row">
                                    <div className="receipt-no">
                                        Receipt No.{' '}
                                        <span className="receipt-no-val">
                                            {payment.receiptNumber || '_____'}
                                        </span>
                                    </div>
                                    <div className="receipt-badge">RECEIPT</div>
                                    <div className="receipt-date">
                                        Date :{' '}
                                        <span className="underline-val handwritten-val">
                                            {formattedDate}
                                        </span>
                                    </div>
                                </div>

                                <div className="receipt-body">
                                    <div className="line-row">
                                        <span>Received with thanks from Shri</span>
                                        <span className="line-fill"></span>
                                    </div>

                                    <div className="line-row">
                                        <span>Flat / Shop No.</span>
                                        <span className="underline-val handwritten-val">{unitNumber}</span>
                                        <span>against AMC /</span>
                                        <span className="water-bill-check">✓ Water Bill</span>
                                        <span>/ Sale of Scrap / Rent of Office</span>
                                    </div>

                                    <div className="line-row">
                                        <span>Equipment for the year / Month</span>
                                        <span className="underline-val handwritten-val">
                                            {quarterLabel || ''}
                                        </span>
                                    </div>

                                    <div className="line-row">
                                        <span>sum of rupees</span>
                                        <span className="line-fill handwritten-val">
                                            {amountToWords(payAmount)}
                                        </span>
                                    </div>

                                    <div className="line-row">
                                        <span>By Cash / Cheque No. / UPI Tr. No.</span>
                                        <span
                                            className="line-fill handwritten-val"
                                            style={{ maxWidth: '220px' }}
                                        >
                                            {payment.remarks || payment.paymentMode || ''}
                                        </span>
                                        <span style={{ marginLeft: '6px' }}>Bank</span>
                                        <span className="line-fill"></span>
                                    </div>
                                </div>

                                <div className="receipt-footer">
                                    <div className="amount-box-container">
                                        <div className="amount-box">
                                            <div className="rupee-sym">₹</div>
                                            <div className="amount-num">{payAmount}/-</div>
                                        </div>
                                        <div className="cheque-note">
                                            Cheque is subject to Realisation.
                                        </div>
                                    </div>

                                    <div className="sig-container">
                                        <div className="sig-box"></div>
                                        <div className="sig-title">Authorised Signatory</div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ))}
        </div>
    );
});

export default Receipt;