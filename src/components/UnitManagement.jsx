import React, { useState, useEffect } from 'react';
import { getUnits, getBlocks, updateUnit } from '../api/api';
import { toast } from 'react-toastify';

const UnitManagement = () => {
  const [units, setUnits] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [selectedBlock, setSelectedBlock] = useState('all');
  const [editUnit, setEditUnit] = useState(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [unitsRes, blocksRes] = await Promise.all([getUnits(), getBlocks()]);
      
      console.log('Units Data:', unitsRes.data);
      console.log('Blocks Data:', blocksRes.data);

      // Ensure data is array before setting state
      setUnits(Array.isArray(unitsRes.data) ? unitsRes.data : []);
      setBlocks(Array.isArray(blocksRes.data) ? blocksRes.data : []);
    } catch (err) {
      console.error('Error loading unit management data:', err);
      toast.error('Failed to load data from server');
      setUnits([]);
      setBlocks([]);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    try {
      await updateUnit(editUnit.id, editUnit);
      toast.success('Unit updated successfully');
      setEditUnit(null);
      loadData();
    } catch (err) {
      toast.error('Failed to update unit');
    }
  };

  // Safe filter
  const filteredUnits = Array.isArray(units)
    ? units.filter(u => {
        const blockMatch = selectedBlock === 'all' || u.blockName === selectedBlock;
        const searchMatch =
          search === '' ||
          (u.unitNumber && u.unitNumber.toLowerCase().includes(search.toLowerCase())) ||
          (u.ownerName && u.ownerName.toLowerCase().includes(search.toLowerCase()));
        return blockMatch && searchMatch;
      })
    : [];

  return (
    <div>
      <h2 className="mb-4">
        <i className="bi bi-building me-2"></i>Unit Management
      </h2>

      <div className="row mb-3">
        <div className="col-md-3">
          <select
            className="form-select"
            value={selectedBlock}
            onChange={e => setSelectedBlock(e.target.value)}
          >
            <option value="all">All Blocks</option>
            {/* Safe Array map check */}
            {Array.isArray(blocks) &&
              blocks.map(b => (
                <option key={b.id} value={b.blockName}>
                  Block {b.blockName}
                </option>
              ))}
          </select>
        </div>
        <div className="col-md-3">
          <input
            type="text"
            className="form-control"
            placeholder="Search unit or owner..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="col-md-3">
          <span className="badge bg-primary fs-6 mt-2">
            {filteredUnits.length} units
          </span>
        </div>
      </div>

      {loading ? (
        <div className="text-center my-5">
          <div className="spinner-border text-primary" role="status"></div>
          <p className="mt-2">Loading units...</p>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="table table-striped table-hover">
            <thead className="table-dark">
              <tr>
                <th>Unit No.</th>
                <th>Block</th>
                <th>Owner Name</th>
                <th>Contact</th>
                <th>Email</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUnits.length > 0 ? (
                filteredUnits.map(unit => (
                  <tr key={unit.id}>
                    <td>
                      <strong>{unit.unitNumber}</strong>
                    </td>
                    <td>
                      <span className="badge bg-info">Block {unit.blockName}</span>
                    </td>
                    <td>{unit.ownerName || <span className="text-muted">-</span>}</td>
                    <td>{unit.contactNumber || <span className="text-muted">-</span>}</td>
                    <td>{unit.email || <span className="text-muted">-</span>}</td>
                    <td>
                      <button
                        className="btn btn-sm btn-outline-primary"
                        onClick={() => setEditUnit({ ...unit })}
                      >
                        <i className="bi bi-pencil"></i> Edit
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="text-center py-4 text-muted">
                    No units found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit Unit Modal */}
      {editUnit && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Edit Unit {editUnit.unitNumber}</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setEditUnit(null)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">Owner Name</label>
                  <input
                    type="text"
                    className="form-control"
                    value={editUnit.ownerName || ''}
                    onChange={e => setEditUnit({ ...editUnit, ownerName: e.target.value })}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Contact Number</label>
                  <input
                    type="text"
                    className="form-control"
                    value={editUnit.contactNumber || ''}
                    onChange={e =>
                      setEditUnit({ ...editUnit, contactNumber: e.target.value })
                    }
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    className="form-control"
                    value={editUnit.email || ''}
                    onChange={e => setEditUnit({ ...editUnit, email: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setEditUnit(null)}>
                  Cancel
                </button>
                <button className="btn btn-primary" onClick={handleUpdate}>
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UnitManagement;