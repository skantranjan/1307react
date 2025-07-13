import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import CmDashboard from './pages/CmDashboard';
import CmSkuDetail from './pages/CmSkuDetail';
import SedForApproval from './pages/SedForApproval';

import './assets/css/styles.css';
import './assets/css/remix-icon.css';
import './assets/css/multi-select.css';
import './assets/css/pagination.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/cm-dashboard" replace />} />
        <Route path="/dashboard" element={<Navigate to="/cm-dashboard" replace />} />
        <Route path="/dasbboard" element={<Navigate to="/cm-dashboard" replace />} />
        <Route path="/cm-dashboard" element={<CmDashboard />} />
        <Route path="/cm/:cmCode" element={<CmSkuDetail />} />
        <Route path="/sedforapproval" element={<SedForApproval />} />
      </Routes>
    </Router>
  );
}

export default App;
