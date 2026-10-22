// import React from 'react';
// import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
// import { ToastContainer } from 'react-toastify';
// import Layout from './components/Layout';
// import Dashboard from './components/Dashboard';
// import UnitManagement from './components/UnitManagement';
// import MeterReading from './components/MeterReading';
// import BillGeneration from './components/BillGeneration';
// import PaymentEntry from './components/PaymentEntry';
// import Receipt from './components/Receipt';
// import Reports from './components/Reports';
// import RateConfig from './components/RateConfig';

// function App() {
//   return (
//     <Router>
//       <ToastContainer position="top-right" autoClose={3000} />
//       <Layout>
//         <Routes>
//           <Route path="/" element={<Dashboard />} />
//           <Route path="/units" element={<UnitManagement />} />
//           <Route path="/meter-readings" element={<MeterReading />} />
//           <Route path="/bills" element={<BillGeneration />} />
//           <Route path="/payments" element={<PaymentEntry />} />
//           <Route path="/receipt/:paymentId" element={<Receipt />} />
//           <Route path="/reports" element={<Reports />} />
//           <Route path="/rates" element={<RateConfig />} />
//         </Routes>
//       </Layout>
//     </Router>
//   );
// }

// export default App;


import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import UnitManagement from './components/UnitManagement';
import MeterReading from './components/MeterReading';
import BillGeneration from './components/BillGeneration';
import Reports from './components/Reports';
import RateConfig from './components/RateConfig';

// Protected Route Wrapper
const ProtectedRoute = ({ user, children }) => {
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return <Layout>{children}</Layout>;
};

function App() {
  const [user, setUser] = useState(() => {
    return JSON.parse(localStorage.getItem('user') || 'null');
  });

  return (
    <Router>
      <Routes>
        {/* Public Login Route */}
        <Route path="/login" element={<Login onLogin={(userData) => setUser(userData)} />} />

        {/* Protected App Routes */}
        <Route path="/" element={<ProtectedRoute user={user}><Dashboard /></ProtectedRoute>} />
        <Route path="/units" element={<ProtectedRoute user={user}><UnitManagement /></ProtectedRoute>} />
        <Route path="/meter-readings" element={<ProtectedRoute user={user}><MeterReading /></ProtectedRoute>} />
        <Route path="/bills" element={<ProtectedRoute user={user}><BillGeneration /></ProtectedRoute>} />
        <Route path="/reports" element={<ProtectedRoute user={user}><Reports /></ProtectedRoute>} />
        <Route path="/rates" element={<ProtectedRoute user={user}><RateConfig /></ProtectedRoute>} />

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;