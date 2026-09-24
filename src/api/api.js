import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Blocks
export const getBlocks = () => api.get('/blocks');

// Units
export const getUnits = () => api.get('/units');
export const getUnitsByBlock = (blockId) => api.get(`/units/block/${blockId}`);
export const updateUnit = (id, data) => api.put(`/units/${id}`, data);

// Quarters
export const getQuarters = () => api.get('/meter-readings/quarters');
export const createQuarter = (data) => api.post('/meter-readings/quarters', data);

// Meter Readings (Manual Entry + Auto Calculations)
export const getReadingFormData = (quarterId, blockId) => {
  let url = `/meter-readings/form-data/${quarterId}`;
  if (blockId) url += `?blockId=${blockId}`;
  return api.get(url);
};
export const saveSingleReading = (data) => api.post('/meter-readings/save', data);
export const saveBulkReadings = (data) => api.post('/meter-readings/save-all', data);
export const getReadingsByQuarter = (quarterId) => api.get(`/meter-readings/quarter/${quarterId}`);
export const getReadingsByUnit = (unitId) => api.get(`/meter-readings/unit/${unitId}`);

// Bills
export const generateBills = (quarterId) => api.post(`/bills/generate/${quarterId}`);
export const getBillsByQuarter = (quarterId) => api.get(`/bills/quarter/${quarterId}`);
export const getBillsByQuarterAndBlock = (quarterId, blockId) =>
  api.get(`/bills/quarter/${quarterId}/block/${blockId}`);
export const getBillsByQuarterAndStatus = (quarterId, status) =>
  api.get(`/bills/quarter/${quarterId}/status/${status}`);
export const getBillsByUnit = (unitId) => api.get(`/bills/unit/${unitId}`);
export const getBillById = (id) => api.get(`/bills/${id}`);

// Payments & Receipts
export const recordPayment = (data) => api.post('/payments', data);
export const getReceipt = (paymentId) => api.get(`/payments/receipt/${paymentId}`);
export const getReceiptByNumber = (receiptNumber) => api.get(`/payments/receipt/number/${receiptNumber}`);
export const getPaymentsByQuarter = (quarterId) => api.get(`/payments/quarter/${quarterId}`);
export const getPaymentsByUnit = (unitId) => api.get(`/payments/unit/${unitId}`);

// Reports & Dashboard
export const getDashboard = () => api.get('/reports/dashboard');
export const getQuarterReport = (quarterId) => api.get(`/reports/quarter/${quarterId}`);

// Rates
export const getRates = () => api.get('/rates');
export const getActiveRate = () => api.get('/rates/active');
export const addRate = (data) => api.post('/rates', data);

export default api;