import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './components/Login';
import Dashboard from './pages/Dashboard';
import CmDashboard from './pages/CmDashboard';
import CmSkuDetail from './pages/CmSkuDetail';
import SedForApproval from './pages/SedForApproval';
import GeneratePdf from './pages/GeneratePdf';
import UploadData from './pages/UploadData';

import './assets/css/styles.css';
import './assets/css/remix-icon.css';
import './assets/css/multi-select.css';
import './assets/css/pagination.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Navigate to="/cm-dashboard" replace />} />
          <Route path="/dashboard" element={<Navigate to="/cm-dashboard" replace />} />
          <Route path="/dasbboard" element={<Navigate to="/cm-dashboard" replace />} />
          <Route path="/cm-dashboard" element={
            <ProtectedRoute>
              <CmDashboard />
            </ProtectedRoute>
          } />
          <Route path="/cm/:cmCode" element={
            <ProtectedRoute>
              <CmSkuDetail />
            </ProtectedRoute>
          } />
          <Route path="/sedforapproval" element={
            <ProtectedRoute>
              <SedForApproval />
            </ProtectedRoute>
          } />
          <Route path="/generate-pdf" element={
            <ProtectedRoute>
              <GeneratePdf />
            </ProtectedRoute>
          } />
          <Route path="/upload-data" element={
            <ProtectedRoute>
              <UploadData />
            </ProtectedRoute>
          } />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
