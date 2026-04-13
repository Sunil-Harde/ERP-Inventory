import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout/Layout';

// Pages 
import Login from './pages/Login/Login';
import Dashboard from './pages/Dashboard/Dashboard';
import Inventory from './pages/Inventory/Inventory';
import LowStock from './pages/LowStock/LowStock';
import Transactions from './pages/Transactions/Transactions';
import Purchase from './pages/Purchase/Purchase';
import Quality from './pages/Quality/Quality';
import RnD from './pages/RnD/RnD';
import Shop1 from './pages/Shop1/Shop1';
import Shop2 from './pages/Shop2/Shop2';
import Users from './pages/Users/Users';
import Audit from './pages/Audit/Audit';
import Analytics from './pages/Reports/Reports';
import Scan from './pages/Scan/Scan';
import RejectedItems from './pages/RejectedItems/RejectedItems';

// Inner component that reads user from AuthContext to pass userId to SocketProvider 
const AppWithSocket = () => {
  const { user } = useAuth();
  return (
    <SocketProvider userId={user?._id}>
      
      <Router>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<Login />} />

          {/* Protected Layout */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="inventory" element={<Inventory />} />
            <Route path="low-stock" element={<LowStock />} />
            <Route path="transactions" element={<Transactions />} />
            <Route path="scan" element={<Scan />} />

            {/* Purchase — Admin + Purchase Staff */}
            <Route
              path="purchase"
              element={
                <ProtectedRoute roles={['ADMIN', 'STAFF_PURCHASE']}>
                  <Purchase />
                </ProtectedRoute>
              }
            />

            {/* Quality — Admin + Quality Staff */}
            <Route
              path="quality"
              element={
                <ProtectedRoute roles={['ADMIN', 'STAFF_QUALITY']}>
                  <Quality />
                </ProtectedRoute>
              }
            />

            {/* Rejected Items — Admin + Quality Staff */}
            <Route
              path="rejected-items"
              element={
                <ProtectedRoute roles={['ADMIN', 'STAFF_QUALITY']}>
                  <RejectedItems />
                </ProtectedRoute>
              }
            />

            {/* R&D — Admin + R&D */}
            <Route
              path="rnd"
              element={
                <ProtectedRoute roles={['ADMIN', 'STAFF_RND']}>
                  <RnD />
                </ProtectedRoute>
              }
            />

            {/* Shop 1 (Approvals) — Admin + Store Staff */}
            <Route
              path="shop1"
              element={
                <ProtectedRoute roles={['ADMIN', 'STAFF_STORE']}>
                  <Shop1 />
                </ProtectedRoute>
              }
            />

            {/* Shop 2 (Production) — Admin + Store Staff */}
            <Route
              path="shop2"
              element={
                <ProtectedRoute roles={['ADMIN', 'STAFF_STORE']}>
                  <Shop2 />
                </ProtectedRoute>
              }
            />

            {/* Admin Only */}
            <Route
              path="users"
              element={
                <ProtectedRoute roles={['ADMIN']}>
                  <Users />
                </ProtectedRoute>
              }
            />
            <Route
              path="audit"
              element={
                <ProtectedRoute roles={['ADMIN']}>
                  <Audit />
                </ProtectedRoute>
              }
            />
            <Route
              path="analytics"
              element={
                <ProtectedRoute roles={['ADMIN']}>
                  <Analytics />
                </ProtectedRoute>
              }
            />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>

      {/* Toast Notifications */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#1a1d2e',
            color: '#f1f5f9',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '10px',
            fontSize: '0.875rem',
          },
          success: { iconTheme: { primary: '#22c55e', secondary: '#fff' } },
          error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
        }}
      />
    </SocketProvider>
  );
};

function App() {
  return (
    <AuthProvider>
      <AppWithSocket />
    </AuthProvider>
  );
}

export default App;