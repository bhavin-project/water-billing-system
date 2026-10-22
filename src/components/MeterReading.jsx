import React, { useState, useEffect, useCallback } from 'react';
import {
  getBlocks, getQuarters, createQuarter,
  getReadingFormData, saveSingleReading, saveBulkReadings,
  unlockReading, lockReading, regenerateBills
} from '../api/api';
import { toast } from 'react-toastify';
import { formatCurrency } from '../utils/helpers';

const MeterReading = () => {
  const [blocks, setBlocks] = useState([]);
  const [quarters, setQuarters] = useState([]);
  const [selectedQuarter, setSelectedQuarter] = useState('');
  const [selectedBlock, setSelectedBlock] = useState('');
  const [formData, setFormData] = useState(null);
  const [readings, setReadings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingIndex, setSavingIndex] = useState(-1);
  const [showCreateQuarter, setShowCreateQuarter] = useState(false);
  const [newYear, setNewYear] = useState(new Date().getFullYear());
  const [newQNum, setNewQNum] = useState(Math.ceil((new Date().getMonth() + 1) / 3));
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    Promise.all([getBlocks(), getQuarters()]).then(([bRes, qRes]) => {
      setBlocks(bRes.data);
      setQuarters(qRes.data);
    });
  }, []);

  const handleCreateQuarter = async () => {
    try {
      await createQuarter({ year: parseInt(newYear), quarterNumber: parseInt(newQNum) });
      toast.success('Quarter created');
      setShowCreateQuarter(false);
      const res = await getQuarters();
      setQuarters(res.data);
    } catch (err) {
      toast.error('Failed to create quarter');
    }
  };

  const loadFormData = useCallback(async (quarterId, blockId) => {
    if (!quarterId) return;
    setLoading(true);
    try {
      const res = await getReadingFormData(quarterId, blockId || null);
      setFormData(res.data);
      setReadings(res.data.readings.map(r => ({
        ...r,
        editCurrentReading: r.currentReading,
        editPreviousPending: r.previousPending !== undefined ? r.previousPending : 0,
        isDirty: false,
        error: null
      })));
    } catch (err) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleQuarterChange = (qId) => {
    setSelectedQuarter(qId);
    if (qId) loadFormData(qId, selectedBlock);
    else { setFormData(null); setReadings([]); }
  };

  const handleBlockChange = (bId) => {
    setSelectedBlock(bId);
    if (selectedQuarter) loadFormData(selectedQuarter, bId);
  };

  // ===== Current Reading Input Handler =====
  const handleCurrReadingChange = (index, value) => {
    const updated = [...readings];
    const numVal = parseFloat(value) || 0;
    updated[index].editCurrentReading = numVal;
    updated[index].isDirty = true;
    recalculate(updated, index);
    setReadings(updated);
  };

  // ===== Previous Pending Input Handler (Editable) =====
  const handlePrevPendingChange = (index, value) => {
    const updated = [...readings];
    const numVal = parseFloat(value) || 0;
    updated[index].editPreviousPending = numVal;
    updated[index].isDirty = true;
    recalculate(updated, index);
    setReadings(updated);
  };

  // ===== Dynamic Recalculation =====
  const recalculate = (arr, idx) => {
    const r = arr[idx];
    const prevReading = parseFloat(r.previousReading) || 0;
    const currReading = parseFloat(r.editCurrentReading) || 0;
    const consumed = currReading - prevReading;
    const rate = parseFloat(formData?.currentRate) || 0;
    const prevPending = parseFloat(r.editPreviousPending) || 0;

    if (consumed < 0) {
      r.error = 'Current < Previous';
      r.unitsConsumed = 0;
      r.estimatedBill = 0;
    } else {
      r.error = null;
      r.unitsConsumed = consumed;
      r.estimatedBill = consumed * rate;
    }

    r.netAmountDue = r.estimatedBill + prevPending;
    r.balance = r.netAmountDue - parseFloat(r.amountPaid || 0);
  };

  // ===== Save Single Reading =====
  const handleSaveSingle = async (index) => {
    const r = readings[index];
    if (r.error) { toast.warning('Fix errors first'); return; }

    setSavingIndex(index);
    try {
      const result = await saveSingleReading({
        unitId: r.unitId,
        quarterId: parseInt(selectedQuarter),
        currentReading: parseFloat(r.editCurrentReading),
        previousPending: parseFloat(r.editPreviousPending || 0)
      });
      toast.success(`${r.unitNumber} saved and locked!`);
      loadFormData(selectedQuarter, selectedBlock);
    } catch (err) {
      console.error('Save error:', err);
      const msg = err.response?.data?.message || err.message || 'Save failed';
      toast.error(msg);
    } finally {
      setSavingIndex(-1);
    }
  };

 // ===== Save All Modified =====
  const handleSaveAll = async () => {
    const dirty = readings.filter(r => r.isDirty && !r.error);
    if (dirty.length === 0) { toast.info('No changes to save'); return; }

    setSaving(true);
    try {
      await saveBulkReadings({
        quarterId: parseInt(selectedQuarter),
        readings: dirty.map(r => ({
          unitId: r.unitId,
          currentReading: parseFloat(r.editCurrentReading),
          previousPending: parseFloat(r.editPreviousPending || 0)
        }))
      });
      toast.success(`${dirty.length} readings saved!`);
      loadFormData(selectedQuarter, selectedBlock);
    } catch (err) {
      console.error('Save all error:', err);
      const msg = err.response?.data?.message || err.message || 'Save all failed';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };


  // ===== UNLOCK (Edit Mode) =====
  const handleUnlock = async (index) => {
    const r = readings[index];
    if (!r.id) {
      const updated = [...readings];
      updated[index].locked = false;
      updated[index].isDirty = true;
      setReadings(updated);
      toast.info(`${r.unitNumber} is now editable`);
      return;
    }

    try {
      await unlockReading(r.id);
      const updated = [...readings];
      updated[index].locked = false;
      updated[index].isDirty = true;
      setReadings(updated);
      toast.info(`${r.unitNumber} unlocked for editing`);
    } catch (err) {
      console.error('Unlock error:', err);
      const updated = [...readings];
      updated[index].locked = false;
      updated[index].isDirty = true;
      setReadings(updated);
      toast.warn(`${r.unitNumber} unlocked locally`);
    }
  };

  // ===== LOCK =====
  const handleLock = async (index) => {
    const r = readings[index];
    if (!r.id) {
      const updated = [...readings];
      updated[index].locked = true;
      setReadings(updated);
      return;
    }

    try {
      await lockReading(r.id);
      const updated = [...readings];
      updated[index].locked = true;
      updated[index].isDirty = false;
      setReadings(updated);
      toast.success(`${r.unitNumber} locked`);
    } catch (err) {
      toast.error('Failed to lock');
    }
  };

  // ===== REGENERATE BILLS =====
  const handleRegenerateBills = async () => {
    if (!window.confirm('⚠️ This will update all existing bills for this quarter with current readings and pending balances. Continue?')) {
      return;
    }
    try {
      const res = await regenerateBills(selectedQuarter);
      toast.success(res.data.message || 'Bills regenerated successfully');
      loadFormData(selectedQuarter, selectedBlock);
    } catch (err) {
      console.error('Regenerate error:', err);
      const msg = err.response?.data?.message || err.message || 'Regeneration failed';
      toast.error(msg);
    }
  };

  const filteredReadings = readings.filter(r => {
    if (!searchTerm) return true;
    const t = searchTerm.toLowerCase();
    return r.unitNumber.toLowerCase().includes(t) ||
      (r.ownerName && r.ownerName.toLowerCase().includes(t));
  });

  const summary = {
    total: readings.length,
    entered: readings.filter(r => r.hasReading).length,
    pending: readings.filter(r => !r.hasReading).length,
    dirty: readings.filter(r => r.isDirty && !r.error).length,
    locked: readings.filter(r => r.locked).length,
    totalConsumed: readings.reduce((s, r) => s + (r.unitsConsumed || 0), 0),
    totalEstimated: readings.reduce((s, r) => s + (r.estimatedBill || 0), 0),
    totalPrevPending: readings.reduce((s, r) => s + parseFloat(r.editPreviousPending || 0), 0),
    totalPaid: readings.reduce((s, r) => s + parseFloat(r.amountPaid || 0), 0),
    totalBalance: readings.reduce((s, r) => s + parseFloat(r.balance || 0), 0),
  };

  return (
    <div>
      <h2 className="mb-4"><i className="bi bi-speedometer me-2"></i>Meter Reading & Billing</h2>

      {/* Controls */}
      <div className="card mb-3">
        <div className="card-body">
          <div className="row g-3 align-items-end">
            <div className="col-md-2">
              <label className="form-label fw-bold">Quarter</label>
              <div className="input-group">
                <select className="form-select" value={selectedQuarter}
                        onChange={e => handleQuarterChange(e.target.value)}>
                  <option value="">-- Select --</option>
                  {quarters.map(q => <option key={q.id} value={q.id}>{q.label}</option>)}
                </select>
                <button className="btn btn-outline-secondary"
                        onClick={() => setShowCreateQuarter(!showCreateQuarter)}>
                  <i className="bi bi-plus-lg"></i>
                </button>
              </div>
            </div>
            <div className="col-md-2">
              <label className="form-label fw-bold">Block</label>
              <select className="form-select" value={selectedBlock}
                      onChange={e => handleBlockChange(e.target.value)}>
                <option value="">All</option>
                {blocks.map(b => <option key={b.id} value={b.id}>Block {b.blockName}</option>)}
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label fw-bold">Search</label>
              <input type="text" className="form-control" placeholder="Unit/Owner..."
                     value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
            <div className="col-md-1 text-center">
              <small className="text-muted d-block">Rate</small>
              <span className="badge bg-warning text-dark fs-6">
                {formData ? formatCurrency(formData.currentRate) : '-'}
              </span>
            </div>
            <div className="col-md-2">
              <button className="btn btn-success w-100" onClick={handleSaveAll}
                      disabled={saving || summary.dirty === 0}>
                {saving ? <span className="spinner-border spinner-border-sm me-1"></span> : null}
                <i className="bi bi-save-fill me-1"></i> Save All ({summary.dirty})
              </button>
            </div>
            <div className="col-md-3">
              {formData?.billsGenerated && (
                <button className="btn btn-outline-danger w-100" onClick={handleRegenerateBills}>
                  <i className="bi bi-arrow-repeat me-1"></i> Regenerate Bills
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Create Quarter Modal */}
      {showCreateQuarter && (
        <div className="card mb-3 border-primary">
          <div className="card-body">
            <div className="row g-2 align-items-end">
              <div className="col-md-2">
                <label className="form-label">Year</label>
                <input type="number" className="form-control"
                       value={newYear} onChange={e => setNewYear(e.target.value)} />
              </div>
              <div className="col-md-3">
                <label className="form-label">Quarter</label>
                <select className="form-select" value={newQNum}
                        onChange={e => setNewQNum(e.target.value)}>
                  <option value="1">Q1 (Jan-Mar)</option>
                  <option value="2">Q2 (Apr-Jun)</option>
                  <option value="3">Q3 (Jul-Sep)</option>
                  <option value="4">Q4 (Oct-Dec)</option>
                </select>
              </div>
              <div className="col-md-3">
                <button className="btn btn-primary me-2" onClick={handleCreateQuarter}>Create</button>
                <button className="btn btn-outline-secondary"
                        onClick={() => setShowCreateQuarter(false)}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      {formData && (
        <div className="row g-2 mb-3">
          {[
            { label: 'Units', value: summary.total, color: 'primary' },
            { label: 'Readings Done', value: summary.entered, color: 'success' },
            { label: 'Pending', value: summary.pending, color: 'warning' },
            { label: 'Locked', value: summary.locked, color: 'dark' },
            { label: 'Unsaved', value: summary.dirty, color: 'info' },
            { label: 'Prev Pending', value: formatCurrency(summary.totalPrevPending), color: 'secondary' },
            { label: 'Est. Bill Total', value: formatCurrency(summary.totalEstimated), color: 'primary' },
            { label: 'Total Paid', value: formatCurrency(summary.totalPaid), color: 'success' },
            { label: 'Total Balance', value: formatCurrency(summary.totalBalance), color: 'danger' },
          ].map((c, i) => (
            <div className="col" key={i}>
              <div className={`card text-center border-${c.color}`}>
                <div className="card-body py-2">
                  <small className="text-muted">{c.label}</small>
                  <h6 className={`mb-0 text-${c.color}`}>{c.value}</h6>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      {!loading && filteredReadings.length > 0 && (
        <div className="table-responsive">
          <table className="table table-bordered table-hover align-middle" style={{ fontSize: '0.85rem' }}>
            <thead className="table-dark sticky-top">
              <tr>
                <th>#</th>
                <th>Unit</th>
                <th>Block</th>
                <th>Owner</th>
                <th className="text-center bg-secondary">Prev Reading<br/><small>(From DB)</small></th>
                <th className="text-center bg-warning text-dark">Curr Reading<br/><small>✏️ Enter</small></th>
                <th className="text-center">Units<br/><small>(Auto)</small></th>
                <th className="text-center">Est. Bill<br/><small>(Auto)</small></th>
                <th className="text-center bg-info text-dark">Prev Pending (₹)<br/><small>✏️ Editable</small></th>
                <th className="text-center">Net Due<br/><small>(Auto)</small></th>
                <th className="text-center">Paid</th>
                <th className="text-center">Balance<br/><small>(+Due / -Credit)</small></th>
                <th className="text-center">Status</th>
                <th className="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredReadings.map((r, idx) => {
                const realIdx = readings.indexOf(r);
                return (
                  <tr key={r.unitId} className={`
                    ${r.error ? 'table-danger' : ''}
                    ${r.isDirty && !r.error ? 'table-warning' : ''}
                    ${r.locked ? 'table-secondary' : ''}
                    ${r.hasReading && !r.isDirty && !r.locked ? 'table-success' : ''}
                  `}>
                    <td>{idx + 1}</td>
                    <td><strong>{r.unitNumber}</strong></td>
                    <td><span className={`badge ${r.blockName === 'A' ? 'bg-primary' : 'bg-info'}`}>{r.blockName}</span></td>
                    <td>{r.ownerName || '-'}</td>

                    {/* 1. Previous Reading: READ ONLY (from DB) */}
                    <td className="text-center">
                      <span className="badge bg-secondary fs-6">{r.previousReading}</span>
                    </td>

                    {/* 2. Current Reading: EDITABLE */}
                    <td>
                      <input type="number" className={`form-control form-control-sm text-center fw-bold
                        ${r.error ? 'is-invalid' : ''} ${r.isDirty && !r.error ? 'border-warning border-2' : ''}`}
                             value={r.editCurrentReading}
                             onChange={e => handleCurrReadingChange(realIdx, e.target.value)}
                             disabled={r.locked}
                             style={{ width: '90px' }} />
                      {r.error && <div className="text-danger" style={{ fontSize: '0.7em' }}>{r.error}</div>}
                    </td>

                    {/* Units Consumed (Auto) */}
                    <td className="text-center">
                      <span className="badge bg-primary">{(r.unitsConsumed || 0).toFixed(1)}</span>
                    </td>

                    {/* Estimated Bill (Auto) */}
                    <td className="text-center fw-bold">
                      {formatCurrency(r.estimatedBill)}
                    </td>

                    {/* 3. Previous Pending: EDITABLE */}
                    <td>
                      <input type="number" step="0.01" className="form-control form-control-sm text-center fw-bold text-danger"
                             value={r.editPreviousPending}
                             onChange={e => handlePrevPendingChange(realIdx, e.target.value)}
                             disabled={r.locked}
                             style={{ width: '100px' }} />
                    </td>

                    {/* Net Due (Auto) */}
                    <td className="text-center fw-bold">
                      {formatCurrency(r.netAmountDue)}
                    </td>

                    {/* Paid */}
                    <td className="text-center text-success fw-bold">
                      {formatCurrency(r.amountPaid)}
                    </td>

                    {/* Balance: +ve = Due, -ve = Credit */}
                    <td className={`text-center fw-bold fs-6 ${
                      parseFloat(r.balance) > 0 ? 'text-danger' :
                      parseFloat(r.balance) < 0 ? 'text-success' : 'text-muted'
                    }`}>
                      {formatCurrency(r.balance)}
                      {parseFloat(r.balance) < 0 && <><br /><small className="text-success">(Credit)</small></>}
                    </td>

                    {/* Status */}
                    <td className="text-center">
                      {r.locked && <span className="badge bg-dark"><i className="bi bi-lock-fill"></i> Locked</span>}
                      {!r.locked && r.hasReading && !r.isDirty && <span className="badge bg-success"><i className="bi bi-check-circle"></i> Saved</span>}
                      {!r.locked && r.isDirty && <span className="badge bg-warning text-dark"><i className="bi bi-pencil"></i> Modified</span>}
                      {!r.locked && !r.hasReading && !r.isDirty && <span className="badge bg-light text-muted">Pending</span>}
                    </td>

                    {/* Actions */}
                    <td className="text-center">
                      <div className="btn-group btn-group-sm">
                        {r.locked && (
                          <button className="btn btn-outline-warning" onClick={() => handleUnlock(realIdx)}
                                  title="Unlock to edit current reading or pending amount">
                            <i className="bi bi-unlock"></i> Edit
                          </button>
                        )}
                        {!r.locked && r.isDirty && !r.error && (
                          <button className="btn btn-outline-success"
                                  onClick={() => handleSaveSingle(realIdx)}
                                  disabled={savingIndex === realIdx}
                                  title="Save and lock">
                            {savingIndex === realIdx ?
                              <span className="spinner-border spinner-border-sm"></span> :
                              <><i className="bi bi-check-lg"></i> Save</>
                            }
                          </button>
                        )}
                        {!r.locked && !r.isDirty && (
                          <button className="btn btn-outline-dark" onClick={() => handleLock(realIdx)}
                                  title="Lock this row">
                            <i className="bi bi-lock"></i> Lock
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="table-dark">
              <tr>
                <td colSpan="6" className="text-end fw-bold">TOTALS:</td>
                <td className="text-center fw-bold">{summary.totalConsumed.toFixed(1)}</td>
                <td className="text-center fw-bold">{formatCurrency(summary.totalEstimated)}</td>
                <td className="text-center fw-bold text-warning">{formatCurrency(summary.totalPrevPending)}</td>
                <td className="text-center fw-bold">{formatCurrency(summary.totalEstimated + summary.totalPrevPending)}</td>
                <td className="text-center fw-bold text-success">{formatCurrency(summary.totalPaid)}</td>
                <td className={`text-center fw-bold ${summary.totalBalance > 0 ? 'text-danger' : 'text-success'}`}>
                  {formatCurrency(summary.totalBalance)}
                </td>
                <td colSpan="2"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
};

export default MeterReading;