import React, { useState, useEffect } from 'react';
import { uploadExcel, getQuarters, saveBulkReadings } from '../api/api';
import { toast } from 'react-toastify';

const ExcelUpload = () => {
  const [file, setFile] = useState(null);
  const [quarters, setQuarters] = useState([]);
  const [selectedQuarter, setSelectedQuarter] = useState('');
  const [parsedData, setParsedData] = useState([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    getQuarters().then(res => setQuarters(res.data));
  }, []);

  const handleUpload = async () => {
    if (!file) {
      toast.warning('Please select a file');
      return;
    }
    setUploading(true);
    try {
      const res = await uploadExcel(file);
      setParsedData(res.data);
      toast.success(`Parsed ${res.data.length} readings from Excel`);
    } catch (err) {
      toast.error('Failed to parse Excel file');
    } finally {
      setUploading(false);
    }
  };

  const handleSaveReadings = async () => {
    if (!selectedQuarter) {
      toast.warning('Please select a quarter');
      return;
    }
    try {
      await saveBulkReadings({
        quarterId: parseInt(selectedQuarter),
        readings: parsedData.map(r => ({
          unitId: r.unitId,
          previousReading: r.previousReading,
          currentReading: r.currentReading
        }))
      });
      toast.success('Readings saved successfully');
      setParsedData([]);
      setFile(null);
    } catch (err) {
      toast.error('Failed to save readings');
    }
  };

  return (
    <div>
      <h2 className="mb-4"><i className="bi bi-file-earmark-excel me-2"></i>Excel Upload</h2>

      <div className="card mb-4">
        <div className="card-body">
          <h5>Upload Format</h5>
          <p className="text-muted">Excel should have columns: <strong>Unit Number | Previous Reading | Current Reading</strong></p>
          <p className="text-muted">Example: A-1 | 1250 | 1380</p>

          <div className="row g-3">
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
            <div className="col-md-4">
              <label className="form-label">Excel File (.xlsx)</label>
              <input type="file" className="form-control" accept=".xlsx,.xls"
                     onChange={e => setFile(e.target.files[0])} />
            </div>
            <div className="col-md-2 d-flex align-items-end">
              <button className="btn btn-primary" onClick={handleUpload} disabled={uploading}>
                {uploading ? 'Parsing...' : 'Parse File'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {parsedData.length > 0 && (
        <div>
          <div className="d-flex justify-content-between mb-3">
            <h5>{parsedData.length} readings parsed</h5>
            <button className="btn btn-success" onClick={handleSaveReadings}>
              <i className="bi bi-save me-1"></i> Save All Readings
            </button>
          </div>
          <div className="table-responsive">
            <table className="table table-striped">
              <thead className="table-dark">
                <tr>
                  <th>#</th>
                  <th>Unit</th>
                  <th>Block</th>
                  <th>Owner</th>
                  <th>Previous</th>
                  <th>Current</th>
                  <th>Consumed</th>
                </tr>
              </thead>
              <tbody>
                {parsedData.map((r, idx) => (
                  <tr key={idx}>
                    <td>{idx + 1}</td>
                    <td>{r.unitNumber}</td>
                    <td>{r.blockName}</td>
                    <td>{r.ownerName}</td>
                    <td>{r.previousReading}</td>
                    <td>{r.currentReading}</td>
                    <td><span className="badge bg-success">{r.unitsConsumed}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExcelUpload;