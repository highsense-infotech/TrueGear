import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from '../screens/auth/Login';
import Register from '../screens/auth/Register';
import SecurityDashboard from '../screens/dashboard/SecurityDashboard.tsx';
import QualityCheckDashboard from '../screens/dashboard/QualityCheckDashboard.tsx';
import QualityCheckInspection from '../screens/dashboard/QualityCheckInspection.tsx';
// import PostServiceQCDashboard from '../screens/dashboard/PostServiceQCDashboard.tsx';
// import PostServiceQCInspection from '../screens/dashboard/PostServiceQCInspection.tsx';
// import FinanceBillingDashboard from '../screens/dashboard/FinanceBillingDashboard.tsx';
// import InvoiceDetail from '../screens/dashboard/InvoiceDetail.tsx';
import ServiceAdvisorDashboard from '../screens/dashboard/ServiceAdvisorDashboard.tsx';
import ServiceAdvisorVehicleDetail from '../screens/dashboard/ServiceAdvisorVehicleDetail.tsx';
// import CustomerApprovalDashboard from '../screens/dashboard/CustomerApprovalDashboard.tsx';
// import CustomerProfileDashboard from '../screens/dashboard/CustomerProfileDashboard.tsx';
// import SparePartsDashboard from '../screens/dashboard/SparePartsDashboard.tsx';
// import TechnicianDashboard from '../screens/dashboard/TechnicianDashboard.tsx';
// import TechnicianJobDetail from '../screens/dashboard/TechnicianJobDetail.tsx';
import Profile from '../screens/profile/Profile';
import AddCustomer from '../screens/customers/AddCustomer.tsx';
import AddVehicle from '../screens/vehicles/AddVehicle';
import VehicleEntrySuccess from '../screens/vehicles/VehicleEntrySuccess';
import CreateJobCard from '../screens/vehicles/CreateJobCard';
import JobCardDetail from '../screens/vehicles/JobCardDetail';
import Settings from '../screens/settings/Settings';
import MainLayout from '../layouts/MainLayout.tsx';
import ProtectedRoute from '../components/auth/ProtectedRoute';
import { useAuth } from '../context/AuthContext';
import { ROUTES } from '../constants/routes';
import { SendEstimate } from '../screens/vehicles/SendEstimate.tsx';

const ROLE_DEFAULT_ROUTES: Record<string, string> = {
  'security-gate-keeper': ROUTES.SECURITY_DASHBOARD,
  'qc-inspector': ROUTES.QUALITY_CHECK_DASHBOARD,
  'customer': ROUTES.SERVICE_ADVISOR_DASHBOARD,
  'service-advisor': ROUTES.SERVICE_ADVISOR_DASHBOARD,
};

function RootRedirect() {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  const roleSlug = user?.role?.slug || '';
  const target = ROLE_DEFAULT_ROUTES[roleSlug] || ROUTES.SECURITY_DASHBOARD;
  return <Navigate to={target} replace />;
}

const AppRoutes: React.FC = () => (
  <BrowserRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
    <Routes>
      {/* Protected layout */}
      <Route
        path={ROUTES.HOME}
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<RootRedirect />} />

        {/* Security Gate Keeper routes */}
        <Route
          path={ROUTES.SECURITY_DASHBOARD.slice(1)}
          element={
            <ProtectedRoute allowedRoles={['security-gate-keeper']}>
              <SecurityDashboard />
            </ProtectedRoute>
          }
        >
          <Route path="add-customer" element={<AddCustomer />} />
          <Route path="add-vehicle" element={<AddVehicle />} />
          <Route path="vehicle-entry-success" element={<VehicleEntrySuccess />} />
        </Route>

        {/* QC Inspector routes */}
        <Route
          path={ROUTES.QUALITY_CHECK_DASHBOARD.slice(1)}
          element={
            <ProtectedRoute allowedRoles={['qc-inspector']}>
              <QualityCheckDashboard />
            </ProtectedRoute>
          }
        >
          <Route path="quality-check-inspection/:inspectionId" element={<QualityCheckInspection />} />
        </Route>
        {/* Service Advisor / Customer routes */}
        <Route
          path={ROUTES.SERVICE_ADVISOR_DASHBOARD.slice(1)}
          element={
            <ProtectedRoute allowedRoles={['customer', 'service-advisor']}>
              <ServiceAdvisorDashboard />
            </ProtectedRoute>
          }
        >
          <Route path="vehicle/:id" element={<ServiceAdvisorVehicleDetail />} />
          <Route path="job-card/:vehicleId" element={<CreateJobCard />} />
          <Route path="job-card-detail/:jobCardId" element={<JobCardDetail />} />
          <Route path="send-estimate/:vehicleId?" element={<SendEstimate />} />
        </Route>
        <Route path={ROUTES.PROFILE.slice(1)} element={<Profile />} />
        <Route path={ROUTES.SETTINGS.slice(1)} element={<Settings />} />
      </Route>

      {/* Public routes */}
      <Route path={ROUTES.LOGIN} element={<Login />} />
      <Route path={ROUTES.REGISTER} element={<Register />} />
    </Routes>
  </BrowserRouter>
);

export default AppRoutes;
