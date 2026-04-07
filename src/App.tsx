import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import Inventory from './pages/Inventory';
import MedicalRequests from './pages/MedicalRequests';
import Appointments from './pages/Appointments';
import Inquiries from './pages/Inquiries';

function ProtectedRoute({ element, permissionName }: { element: React.ReactNode, permissionName: string | null }) {
  const { user } = useAuth();
  
  if (!user) return <Navigate to="/" replace />;
  if (permissionName === null) return element; // Dashboard or unrestricted
  
  const hasPermission = user.permissions && user.permissions.includes(permissionName);
  return hasPermission ? element : <Navigate to="/dashboard" replace />;
}

function AppRoutes() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0f172a',
        color: '#94a3b8',
        fontFamily: 'Poppins, sans-serif',
        fontSize: '0.9rem',
      }}>
        Loading...
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="*" element={<Login />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<ProtectedRoute element={<Dashboard />} permissionName={null} />} />
        <Route path="appointments" element={<ProtectedRoute element={<Appointments />} permissionName="appointments" />} />
        <Route path="users" element={<ProtectedRoute element={<Users />} permissionName={null} />} />
        <Route path="requests" element={<ProtectedRoute element={<MedicalRequests />} permissionName="medical requests" />} />
        <Route path="inventory" element={<ProtectedRoute element={<Inventory />} permissionName="inventory" />} />
        <Route path="inquiries" element={<ProtectedRoute element={<Inquiries />} permissionName="inquiries" />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
