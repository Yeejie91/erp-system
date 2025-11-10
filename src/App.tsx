import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Inventory from './pages/Inventory';
import Purchases from './pages/Purchases';
import Sales from './pages/Sales';
import Activities from './pages/Activities';
import Invoices from './pages/Invoices';
import Finance from './pages/Finance';
import Reports from './pages/Reports';
import CustomersSimple from './pages/CustomersSimple';
import Suppliers from './pages/Suppliers';
import Users from './pages/Users';
import Logs from './pages/Logs';
import Refunds from './pages/Refunds';
import AccountsReceivable from './pages/AccountsReceivable';
import AccountsPayable from './pages/AccountsPayable';
import Spaces from './pages/Spaces';
import SpaceBookings from './pages/SpaceBookings';
import CalendarManagement from './pages/CalendarManagement';
import Members from './pages/Members';
import MembershipTierConfigPage from './pages/MembershipTierConfig';
import SystemSettings from './pages/SystemSettings';
import SystemSettingsDemo from './pages/SystemSettingsDemo';
import DataBackup from './pages/DataBackup';
import ProductReservations from './pages/ProductReservations';
import ExhibitionStock from './pages/ExhibitionStock';
import TestPage from './pages/TestPage';
import Login from './pages/Login';
import { initDB, initDefaultMembershipTierConfigs } from './services/db';
import { SystemSettingsProvider } from './contexts/SystemSettingsContext';

// 受保护的路由组件
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    // 初始化数据库和默认配置
    const initializeApp = async () => {
      try {
        await initDB();
        await initDefaultMembershipTierConfigs();
        console.log('数据库初始化成功');
      } catch (error) {
        console.error('初始化失败:', error);
      }
    };
    initializeApp();
  }, []);

  return (
    <Routes>
      {/* 登录路由 */}
      <Route 
        path="/login" 
        element={isAuthenticated ? <Navigate to="/" replace /> : <Login />} 
      />
      
      {/* 受保护的路由 */}
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <Layout>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/products" element={<Products />} />
                <Route path="/inventory" element={<Inventory />} />
                <Route path="/product-reservations" element={<ProductReservations />} />
                <Route path="/exhibition-stock" element={<ExhibitionStock />} />
                <Route path="/purchases" element={<Purchases />} />
                <Route path="/sales" element={<Sales />} />
                <Route path="/activities" element={<Activities />} />
                <Route path="/invoices" element={<Invoices />} />
                <Route path="/finance" element={<Finance />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/customers" element={<CustomersSimple />} />
                <Route path="/suppliers" element={<Suppliers />} />
                <Route path="/refunds" element={<Refunds />} />
                <Route path="/accounts-receivable" element={<AccountsReceivable />} />
                <Route path="/accounts-payable" element={<AccountsPayable />} />
                <Route path="/spaces" element={<Spaces />} />
                <Route path="/space-bookings" element={<SpaceBookings />} />
                <Route path="/calendar-management" element={<CalendarManagement />} />
                <Route path="/members" element={<Members />} />
                <Route path="/membership-tier-config" element={<MembershipTierConfigPage />} />
                <Route path="/system-settings" element={<SystemSettings />} />
                <Route path="/system-settings-demo" element={<SystemSettingsDemo />} />
                <Route path="/data-backup" element={<DataBackup />} />
                <Route path="/users" element={<Users />} />
                <Route path="/logs" element={<Logs />} />
                <Route path="/test" element={<TestPage />} />
              </Routes>
            </Layout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

function App() {
  console.log('完整ERP系统App组件开始渲染');
  
  return (
    <SystemSettingsProvider>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </SystemSettingsProvider>
  );
}

export default App;