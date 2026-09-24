import React, { useState, useEffect, useCallback } from 'react';
import { getBlocks, getQuarters, createQuarter, getReadingFormData, saveSingleReading, saveBulkReadings } from '../api/api';
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
        loadInitialData();
    }, []);

    const loadInitialData = async () => {
        try {
            const [blocksRes, quartersRes] = await Promise.all([getBlocks(), getQuarters()]);
            setBlocks(blocksRes.data);
            setQuarters(quartersRes.data);
        } catch (err) {
            toast.error('Failed to load data');
        }
    };

    const handleCreateQuarter = async () => {
        try {
            await createQuarter({ year: parseInt(newYear), quarterNumber: parseInt(newQNum) });
            toast.success('Quarter created successfully');
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
                isDirty: false,
                isSaving: false,
                error: null
            })));
        } catch (err) {
            toast.error('Failed to load reading data');
        } finally {
            setLoading(false);
        }
    }, []);

    const handleQuarterChange = (quarterId) => {
        setSelectedQuarter(quarterId);
        if (quarterId) {
            loadFormData(quarterId, selectedBlock);
        } else {
            setFormData(null);
            setReadings([]);
        }
    };

    const handleBlockChange = (blockId) => {
        setSelectedBlock(blockId);
        if (selectedQuarter) {
            loadFormData(selectedQuarter, blockId);
        }
    };

    // ===== Handle current reading change - auto calculate everything =====
    const handleCurrentReadingChange = (index, value) => {
        const updated = [...readings];
        const numValue = parseFloat(value) || 0;
        updated[index].editCurrentReading = numValue;
        updated[index].isDirty = true;

        // Auto calculate
        const prevReading = updated[index].previousReading;
        const consumed = numValue - prevReading;

        if (consumed < 0) {
            updated[index].error = 'Current reading cannot be less than previous reading';
            updated[index].unitsConsumed = 0;
            updated[index].estimatedAmount = 0;
        } else {
            updated[index].error = null;
            updated[index].unitsConsumed = consumed;
            updated[index].estimatedAmount = consumed * parseFloat(formData.currentRate);
        }

        setReadings(updated);
    };

    // ===== Save single reading inline =====
    const handleSaveSingle = async (index) => {
        const reading = readings[index];
        if (reading.error) {
            toast.warning('Fix errors before saving');
            return;
        }
        if (reading.locked) {
            toast.warning('This reading is locked (bill already generated)');
            return;
        }

        setSavingIndex(index);
        try {
            const result = await saveSingleReading({
                unitId: reading.unitId,
                quarterId: parseInt(selectedQuarter),
                currentReading: reading.editCurrentReading
            });
            toast.success(`${reading.unitNumber} - Saved! (${result.data.unitsConsumed} units)`);

            // Update the reading in state
            const updated = [...readings];
            updated[index] = {
                ...updated[index],
                ...result.data,
                editCurrentReading: result.data.currentReading,
                isDirty: false,
                hasReading: true,
                error: null
            };
            setReadings(updated);
        } catch (err) {
            toast.error(err.response?.data?.message || `Failed to save ${reading.unitNumber}`);
        } finally {
            setSavingIndex(-1);
        }
    };

    // ===== Save all dirty readings at once =====
    const handleSaveAll = async () => {
        const dirtyReadings = readings.filter(r => r.isDirty && !r.error && !r.locked);
        if (dirtyReadings.length === 0) {
            toast.info('No changes to save');
            return;
        }

        setSaving(true);
        try {
            await saveBulkReadings({
                quarterId: parseInt(selectedQuarter),
                readings: dirtyReadings.map(r => ({
                    unitId: r.unitId,
                    currentReading: r.editCurrentReading
                }))
            });
            toast.success(`${dirtyReadings.length} readings saved successfully!`);
            // Reload fresh data
            loadFormData(selectedQuarter, selectedBlock);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to save readings');
        } finally {
            setSaving(false);
        }
    };

    // ===== Filter readings =====
    const filteredReadings = readings.filter(r => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        return r.unitNumber.toLowerCase().includes(term) ||
            (r.ownerName && r.ownerName.toLowerCase().includes(term));
    });

    // ===== Summary calculations =====
    const summary = {
        total: readings.length,
        entered: readings.filter(r => r.hasReading).length,
        pending: readings.filter(r => !r.hasReading).length,
        dirty: readings.filter(r => r.isDirty && !r.error).length,
        totalUnitsConsumed: readings.reduce((sum, r) => sum + (r.unitsConsumed || 0), 0),
        totalAmount: readings.reduce((sum, r) => sum + (r.estimatedAmount || 0), 0)
    };

    return (
        <div>
            <h2 className="mb-4">
                <i className="bi bi-speedometer me-2"></i>
                Meter Reading Entry
            </h2>

            {/* ===== Selection Controls ===== */}
            <div className="card mb-3">
                <div className="card-body">
                    <div className="row g-3 align-items-end">
                        <div className="col-md-3">
                            <label className="form-label fw-bold">Select Quarter</label>
                            <div className="input-group">
                                <select className="form-select" value={selectedQuarter}
                                        onChange={e => handleQuarterChange(e.target.value)}>
                                    <option value="">-- Select Quarter --</option>
                                    {quarters.map(q => (
                                        <option key={q.id} value={q.id}>{q.label}</option>
                                    ))}
                                </select>
                                <button className="btn btn-outline-secondary"
                                        onClick={() => setShowCreateQuarter(!showCreateQuarter)}
                                        title="Create new quarter">
                                    <i className="bi bi-plus-lg"></i>
                                </button>
                            </div>
                        </div>
                        <div className="col-md-2">
                            <label className="form-label fw-bold">Block</label>
                            <select className="form-select" value={selectedBlock}
                                    onChange={e => handleBlockChange(e.target.value)}>
                                <option value="">All Blocks</option>
                                {blocks.map(b => (
                                    <option key={b.id} value={b.id}>Block {b.blockName}</option>
                                ))}
                            </select>
                        </div>
                        <div className="col-md-3">
                            <label className="form-label fw-bold">Search</label>
                            <input type="text" className="form-control" placeholder="Search unit/owner..."
                                   value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                        </div>
                        <div className="col-md-2">
                            {formData && (
                                <div className="text-center">
                                    <small className="text-muted d-block">Rate/Unit</small>
                                    <span className="badge bg-warning text-dark fs-6">
                                        {formatCurrency(formData.currentRate)}
                                    </span>
                                </div>
                            )}
                        </div>
                        <div className="col-md-2">
                            <button className="btn btn-success w-100" onClick={handleSaveAll}
                                    disabled={saving || summary.dirty === 0}>
                                {saving ?
                                    <><span className="spinner-border spinner-border-sm me-1"></span> Saving...</> :
                                    <><i className="bi bi-save-fill me-1"></i> Save All ({summary.dirty})</>
                                }
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* ===== Create Quarter Form ===== */}
            {showCreateQuarter && (
                <div className="card mb-3 border-primary">
                    <div className="card-body">
                        <h6 className="card-title">Create New Quarter</h6>
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
                                    <option value="1">Q1 (January - March)</option>
                                    <option value="2">Q2 (April - June)</option>
                                    <option value="3">Q3 (July - September)</option>
                                    <option value="4">Q4 (October - December)</option>
                                </select>
                            </div>
                            <div className="col-md-3">
                                <button className="btn btn-primary me-2" onClick={handleCreateQuarter}>
                                    <i className="bi bi-plus-circle me-1"></i> Create
                                </button>
                                <button className="btn btn-outline-secondary"
                                        onClick={() => setShowCreateQuarter(false)}>Cancel</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ===== Summary Cards ===== */}
            {formData && (
                <div className="row g-2 mb-3">
                    <div className="col">
                        <div className="card text-center border-primary">
                            <div className="card-body py-2">
                                <small className="text-muted">Total Units</small>
                                <h5 className="mb-0 text-primary">{summary.total}</h5>
                            </div>
                        </div>
                    </div>
                    <div className="col">
                        <div className="card text-center border-success">
                            <div className="card-body py-2">
                                <small className="text-muted">Entered</small>
                                <h5 className="mb-0 text-success">{summary.entered}</h5>
                            </div>
                        </div>
                    </div>
                    <div className="col">
                        <div className="card text-center border-warning">
                            <div className="card-body py-2">
                                <small className="text-muted">Pending</small>
                                <h5 className="mb-0 text-warning">{summary.pending}</h5>
                            </div>
                        </div>
                    </div>
                    <div className="col">
                        <div className="card text-center border-info">
                            <div className="card-body py-2">
                                <small className="text-muted">Unsaved Changes</small>
                                <h5 className="mb-0 text-info">{summary.dirty}</h5>
                            </div>
                        </div>
                    </div>
                    <div className="col">
                        <div className="card text-center border-dark">
                            <div className="card-body py-2">
                                <small className="text-muted">Total Units Consumed</small>
                                <h5 className="mb-0">{summary.totalUnitsConsumed.toFixed(1)}</h5>
                            </div>
                        </div>
                    </div>
                    <div className="col">
                        <div className="card text-center border-success">
                            <div className="card-body py-2">
                                <small className="text-muted">Estimated Total</small>
                                <h5 className="mb-0 text-success">{formatCurrency(summary.totalAmount)}</h5>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ===== Loading ===== */}
            {loading && (
                <div className="text-center py-5">
                    <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Loading...</span>
                    </div>
                    <p className="mt-2">Loading readings...</p>
                </div>
            )}

            {/* ===== Readings Table ===== */}
            {!loading && filteredReadings.length > 0 && (
                <div className="table-responsive">
                    <table className="table table-bordered table-hover align-middle">
                        <thead className="table-dark sticky-top">
                            <tr>
                                <th style={{width: '40px'}}>#</th>
                                <th style={{width: '80px'}}>Unit</th>
                                <th style={{width: '50px'}}>Block</th>
                                <th>Owner</th>
                                <th style={{width: '120px'}} className="text-center">
                                    Previous Reading
                                    <br/><small className="fw-normal">(Auto-fetched)</small>
                                </th>
                                <th style={{width: '140px'}} className="text-center bg-warning text-dark">
                                    Current Reading
                                    <br/><small className="fw-normal">✏️ Enter Here</small>
                                </th>
                                <th style={{width: '100px'}} className="text-center">
                                    Units Used
                                    <br/><small className="fw-normal">(Auto)</small>
                                </th>
                                <th style={{width: '110px'}} className="text-center">
                                    Amount (₹)
                                    <br/><small className="fw-normal">(Auto)</small>
                                </th>
                                <th style={{width: '80px'}} className="text-center">Status</th>
                                <th style={{width: '80px'}} className="text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredReadings.map((r, idx) => (
                                <tr key={r.unitId}
                                    className={`
                                        ${r.error ? 'table-danger' : ''}
                                        ${r.isDirty && !r.error ? 'table-warning' : ''}
                                        ${r.locked ? 'table-secondary' : ''}
                                        ${r.hasReading && !r.isDirty ? 'table-success' : ''}
                                    `}>
                                    <td className="text-muted">{idx + 1}</td>
                                    <td><strong>{r.unitNumber}</strong></td>
                                    <td>
                                        <span className={`badge ${r.blockName === 'A' ? 'bg-primary' : 'bg-info'}`}>
                                            {r.blockName}
                                        </span>
                                    </td>
                                    <td>{r.ownerName || <span className="text-muted">-</span>}</td>
                                    <td className="text-center">
                                        <span className="badge bg-secondary fs-6">
                                            {r.previousReading}
                                        </span>
                                    </td>
                                    <td>
                                        <input
                                            type="number"
                                            className={`form-control form-control-sm text-center fw-bold
                                                ${r.error ? 'is-invalid' : ''}
                                                ${r.isDirty && !r.error ? 'border-warning border-2' : ''}
                                            `}
                                            value={r.editCurrentReading}
                                            onChange={e => handleCurrentReadingChange(
                                                readings.indexOf(r), e.target.value
                                            )}
                                            disabled={r.locked}
                                            style={{ fontSize: '1.1em' }}
                                        />
                                        {r.error && (
                                            <div className="invalid-feedback" style={{ fontSize: '0.7em' }}>
                                                {r.error}
                                            </div>
                                        )}
                                    </td>
                                    <td className="text-center">
                                        <span className={`badge fs-6 ${r.unitsConsumed > 0 ? 'bg-primary' : 'bg-light text-dark'}`}>
                                            {r.unitsConsumed ? r.unitsConsumed.toFixed(1) : '0'}
                                        </span>
                                    </td>
                                    <td className="text-center fw-bold">
                                        {r.estimatedAmount ? formatCurrency(r.estimatedAmount) : '₹0.00'}
                                    </td>
                                    <td className="text-center">
                                        {r.locked && (
                                            <span className="badge bg-dark" title="Bill generated - locked">
                                                <i className="bi bi-lock-fill"></i> Locked
                                            </span>
                                        )}
                                        {!r.locked && r.hasReading && !r.isDirty && (
                                            <span className="badge bg-success">
                                                <i className="bi bi-check-circle"></i> Saved
                                            </span>
                                        )}
                                        {!r.locked && r.isDirty && (
                                            <span className="badge bg-warning text-dark">
                                                <i className="bi bi-pencil"></i> Modified
                                            </span>
                                        )}
                                        {!r.locked && !r.hasReading && !r.isDirty && (
                                            <span className="badge bg-light text-muted">
                                                Pending
                                            </span>
                                        )}
                                    </td>
                                    <td className="text-center">
                                        {!r.locked && r.isDirty && !r.error && (
                                            <button
                                                className="btn btn-sm btn-outline-success"
                                                onClick={() => handleSaveSingle(readings.indexOf(r))}
                                                disabled={savingIndex === readings.indexOf(r)}
                                                title="Save this reading">
                                                {savingIndex === readings.indexOf(r) ? (
                                                    <span className="spinner-border spinner-border-sm"></span>
                                                ) : (
                                                    <i className="bi bi-check-lg"></i>
                                                )}
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="table-dark">
                            <tr>
                                <td colSpan="6" className="text-end fw-bold">TOTALS:</td>
                                <td className="text-center fw-bold">
                                    {summary.totalUnitsConsumed.toFixed(1)}
                                </td>
                                <td className="text-center fw-bold">
                                    {formatCurrency(summary.totalAmount)}
                                </td>
                                <td colSpan="2"></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            )}

            {/* ===== No quarter selected ===== */}
            {!selectedQuarter && !loading && (
                <div className="text-center py-5 text-muted">
                    <i className="bi bi-arrow-up-circle fs-1"></i>
                    <h4 className="mt-3">Select a Quarter to start entering readings</h4>
                    <p>Previous readings will be auto-fetched. Just enter current meter readings.</p>
                </div>
            )}
        </div>
    );
};

export default MeterReading;