import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import './index.css';

// Customer pages
import Login from './pages/customer/Login';
import Register from './pages/customer/Register';
import Dashboard from './pages/customer/Dashboard';
import BookShipment from './pages/customer/BookShipment';
import Orders from './pages/customer/Orders';
import OrderDetail from './pages/customer/OrderDetail';
import AddressBook from './pages/customer/AddressBook';
import CustomerLayout from './components/customer/CustomerLayout';

// Admin pages
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminOrders from './pages/admin/AdminOrders';
import AdminOrderDetail from './pages/admin/AdminOrderDetail';
import AdminDirectBooking from './pages/admin/AdminDirectBooking';
import AdminCustomers from './pages/admin/AdminCustomers';
import AdminBilling from './pages/admin/AdminBilling';
import AdminMIS from './pages/admin/AdminMIS';
import AdminTeam from './pages/admin/AdminTeam';
import AdminSettings from './pages/admin/AdminSettings';
import AdminLayout from './components/admin/AdminLayout';

function CustomerRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex h-screen items-center justify-center"><Spinner /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'CUSTOMER') return <Navigate to="/admin" replace />;
  return children;
}

function AdminRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex h-screen items-center justify-center"><Spinner /></div>;
  if (!user) return <Navigate to="/admin/login" replace />;
  if (!['ADMIN', 'SUPER_ADMIN'].includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

function Spinner() {
  return <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-200 border-t-blue-600" />;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected customer routes — CustomerLayout renders <Outlet /> */}
          <Route path="/" element={<CustomerRoute><CustomerLayout /></CustomerRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="book" element={<BookShipment />} />
            <Route path="orders" element={<Orders />} />
            <Route path="orders/:docketNo" element={<OrderDetail />} />
            <Route path="addresses" element={<AddressBook />} />
          </Route>

          {/* Admin public */}
          <Route path="/admin/login" element={<AdminLogin />} />

          {/* Admin protected */}
          <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
            <Route index element={<AdminDashboard />} />
            <Route path="orders" element={<AdminOrders />} />
            <Route path="orders/:id" element={<AdminOrderDetail />} />
            <Route path="bookings/direct" element={<AdminDirectBooking />} />
            <Route path="customers" element={<AdminCustomers />} />
            <Route path="billing" element={<AdminBilling />} />
            <Route path="mis" element={<AdminMIS />} />
            <Route path="team" element={<AdminTeam />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
