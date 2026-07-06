import { Routes, Route } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import NotAuthorized from './pages/NotAuthorized';
import ProtectedRoute from './components/ProtectedRoute';
import Approvals from './pages/Approvals';
import Holidays from './pages/Holidays';
import Team from './pages/Team';
import MyAccount from './pages/MyAccount';
import Company from './pages/Company';
import ForgotPassword from './pages/ForgotPassword';
import NotFound from './pages/NotFound';
import AuthChecker from './hooks/authChecker';
import SettingsPage from './pages/SettingsPage';
import TenantPortal from './pages/TenantPortal';

function App() {

  return (
    <>
      <AuthChecker />
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Dashboard />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={['tenant_admin', 'approver']} />}>
          <Route path="/approvals" element={<Approvals />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={['tenant_admin', 'approver']} />}>
          <Route path="/holidays" element={<Holidays />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={['tenant_admin']} />}>
          <Route path="/team" element={<Team />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={['tenant_admin']} />}>
          <Route path="/company" element={<Company />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={['tenant_admin']} />}>
          <Route path="/settings" element={<SettingsPage />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={['user']} />}>
          <Route path="/myaccount" element={<MyAccount />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={['superadmin']} />}>
          <Route path="/tenants" element={<TenantPortal />} />
        </Route>

        <Route path="/forgot-password" element={<ForgotPassword />} />
        
        <Route path="/not-authorized" element={<NotAuthorized />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}

export default App;