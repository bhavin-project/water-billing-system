import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import UnitManagement from './components/UnitManagement';
import MeterReading from './components/MeterReading';
import BillGeneration from './components/BillGeneration';
import PaymentEntry from './components/PaymentEntry';
import Receipt from './components/Receipt';
import Reports from './components/Reports';
import RateConfig from './components/RateConfig';

function App() {
  return (
    <Router>
      <ToastContainer position="top-right" autoClose={3000} />
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/units" element={<UnitManagement />} />
          <Route path="/meter-readings" element={<MeterReading />} />
          <Route path="/bills" element={<BillGeneration />} />
          <Route path="/payments" element={<PaymentEntry />} />
          <Route path="/receipt/:paymentId" element={<Receipt />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/rates" element={<RateConfig />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;