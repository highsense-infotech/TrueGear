import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from '../screens/auth/Login';
import Register from '../screens/auth/Register';
import NoAccess from '../screens/auth/NoAccess';
import SecurityDashboard from '../screens/dashboard/SecurityDashboard.tsx';
import QualityCheckDashboard from '../screens/dashboard/QualityCheckDashboard.tsx';
import QualityCheckInspection from '../screens/dashboard/QualityCheckInspection.tsx';
// import PostServiceQCDashboard from '../screens/dashboard/PostServiceQCDashboard.tsx';
// import PostServiceQCInspection from '../screens/dashboard/PostServiceQCInspection.tsx';
import FinanceBillingDashboard from '../screens/dashboard/FinanceBillingDashboard.tsx';
import InvoiceDetail from '../screens/dashboard/InvoiceDetail.tsx';
import GatePassScan from '../screens/dashboard/GatePassScan.tsx';
import ServiceAdvisorDashboard from '../screens/dashboard/ServiceAdvisorDashboard.tsx';
import ServiceAdvisorVehicleDetail from '../screens/dashboard/ServiceAdvisorVehicleDetail.tsx';
import CustomerApprovalDashboard from '../screens/dashboard/CustomerApprovalDashboard.tsx';
import CustomerProfileDashboard from '../screens/dashboard/CustomerProfileDashboard.tsx';
import SparePartsDashboard from '../screens/dashboard/SparePartsDashboard.tsx';
import TechnicianDashboard from '../screens/dashboard/TechnicianDashboard.tsx';
import TechnicianJobDetail from '../screens/dashboard/TechnicianJobDetail.tsx';
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
import { MODULES, ACTIONS } from '../constants/permissions';
import { SendEstimate } from '../screens/vehicles/SendEstimate.tsx';
import UserManagement from '../screens/admin/UserManagement.tsx';
import ModelServiceTypeAssignment from '../screens/admin/ModelServiceTypeAssignment.tsx';
import ForemanDashboard from '../screens/dashboard/ForemanDashboard.tsx';
import WorkshopBays from '../screens/admin/WorkshopBays.tsx';
import QcOutInspectionDashboard from '../screens/dashboard/QcOutInspectionDashboard.tsx';
import WashbayDashboard from '../screens/dashboard/WashbayDashboard.tsx';
import WarrantyStore from '../screens/dashboard/WarrantyStore.tsx';
// import QCOutDashboard from '../screens/dashboard/QCOutDashboard.tsx';
// import QCOutInspection from '../screens/dashboard/QCOutInspection.tsx';
import VehicleOutDashboard from '../screens/dashboard/VehicleOutDashboard.tsx';
import VehicleOutInspection from '../screens/dashboard/VehicleOutInspection.tsx';
import AppointmentDashboard from '../screens/dashboard/AppointmentDashboard.tsx';
import Vehicle360Dashboard from '../screens/dashboard/Vehicle360Dashboard.tsx';
import Vehicle360VehicleDetail from '../screens/dashboard/Vehicle360VehicleDetail.tsx';
import { AppointmentWizardProvider } from '../context/AppointmentWizardContext';
import AppointmentCustomerSearch from '../screens/appointments/AppointmentCustomerSearch.tsx';
import AppointmentVehicleDetails from '../screens/appointments/AppointmentVehicleDetails.tsx';
import AppointmentServiceDetails from '../screens/appointments/AppointmentServiceDetails.tsx';
import AppointmentSlotSelection from '../screens/appointments/AppointmentSlotSelection.tsx';
import AppointmentReview from '../screens/appointments/AppointmentReview.tsx';
import AppointmentSuccess from '../screens/appointments/AppointmentSuccess.tsx';

// Ordered list of routes — first one the user has view permission for becomes their home
const PERMISSION_ROUTES = [
  // Appointment goes first so receptionists (who also have GATE_ENTRY for walk-ins)
  // land on their primary screen. Security Gate Keeper has no APPOINTMENT perm so
  // they still fall through to SECURITY_DASHBOARD.
  { resource: MODULES.APPOINTMENT, action: ACTIONS.VIEW, path: ROUTES.APPOINTMENT_DASHBOARD },
  { resource: MODULES.GATE_ENTRY, action: ACTIONS.VIEW, path: ROUTES.SECURITY_DASHBOARD },
  { resource: MODULES.QC_INSPECTION, action: ACTIONS.VIEW, path: ROUTES.QUALITY_CHECK_DASHBOARD },
  { resource: MODULES.JOB_CARD, action: ACTIONS.VIEW, path: ROUTES.SERVICE_ADVISOR_DASHBOARD },
  { resource: MODULES.PARTS_MANAGER, action: ACTIONS.VIEW, path: ROUTES.SPARE_PARTS_DASHBOARD },
  { resource: MODULES.ROLE_MANAGEMENT, action: ACTIONS.VIEW, path: ROUTES.USER_MANAGEMENT },
  { resource: MODULES.VEHICLE_OUT, action: ACTIONS.VIEW, path: ROUTES.VEHICLE_OUT_DASHBOARD },
  { resource: MODULES.VEHICLE_360, action: ACTIONS.VIEW, path: ROUTES.VEHICLE_360_DASHBOARD },
  { resource: MODULES.CUSTOMER_PROFILE, action: ACTIONS.VIEW, path: ROUTES.CUSTOMER_PROFILE_DASHBOARD },
  { resource: MODULES.TECHNICIAN, action: ACTIONS.VIEW, path: ROUTES.TECHNICIAN_DASHBOARD },
  { resource: MODULES.WORKSHOP, action: ACTIONS.VIEW, path: ROUTES.FOREMAN_DASHBOARD },
  { resource: MODULES.QC_OUT, action: ACTIONS.VIEW, path: ROUTES.QC_OUT_INSPECTION_DASHBOARD },
  { resource: MODULES.WASHBAY, action: ACTIONS.VIEW, path: ROUTES.WASHBAY_DASHBOARD },
  { resource: MODULES.WARRANTY, action: ACTIONS.VIEW, path: ROUTES.WARRANTY_STORE },
  { resource: MODULES.INVOICING, action: ACTIONS.VIEW, path: ROUTES.FINANCE_BILLING_DASHBOARD },
  { resource: MODULES.GATE_RELEASE, action: ACTIONS.VIEW, path: ROUTES.GATE_RELEASE },
];

function RootRedirect() {
  const { isAuthenticated, hasPermission } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  const target = PERMISSION_ROUTES.find((r) => hasPermission(r.resource, r.action));
  return <Navigate to={target?.path ?? ROUTES.NO_ACCESS} replace />;
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
            <ProtectedRoute requiredPermission={{ resource: MODULES.GATE_ENTRY, action: ACTIONS.VIEW }}>
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
            <ProtectedRoute requiredPermission={{ resource: MODULES.QC_INSPECTION, action: ACTIONS.VIEW }}>
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
            <ProtectedRoute requiredPermission={{ resource: MODULES.JOB_CARD, action: ACTIONS.VIEW }}>
              <ServiceAdvisorDashboard />
            </ProtectedRoute>
          }
        >
          <Route path="vehicle/:id" element={<ServiceAdvisorVehicleDetail />} />
          <Route path="job-card/:vehicleId" element={<CreateJobCard />} />
          <Route path="job-card-detail/:jobCardId" element={<JobCardDetail />} />
          <Route path="send-estimate/:vehicleId?" element={<SendEstimate />} />
        </Route>

        {/* Parts Manager routes */}
        <Route
          path={ROUTES.SPARE_PARTS_DASHBOARD.slice(1)}
          element={
            <ProtectedRoute requiredPermission={{ resource: MODULES.PARTS_MANAGER, action: ACTIONS.VIEW }}>
              <SparePartsDashboard />
            </ProtectedRoute>
          }
        />

        {/* User Management — ROLE_MANAGEMENT:view required */}
        <Route
          path={ROUTES.USER_MANAGEMENT.slice(1)}
          element={
            <ProtectedRoute requiredPermission={{ resource: MODULES.ROLE_MANAGEMENT, action: ACTIONS.VIEW }}>
              <UserManagement />
            </ProtectedRoute>
          }
        />

        {/* Vehicle Out Dashboard */}
        <Route
          path={ROUTES.VEHICLE_OUT_DASHBOARD.slice(1)}
          element={
            <ProtectedRoute requiredPermission={{ resource: MODULES.VEHICLE_OUT, action: ACTIONS.VIEW }}>
              <VehicleOutDashboard />
            </ProtectedRoute>
          }
        >
          <Route path="inspection/:vehicleId" element={<VehicleOutInspection />} />
        </Route>

        {/* Appointment Dashboard — APPOINTMENT:view required */}
        <Route
          path={ROUTES.APPOINTMENT_DASHBOARD.slice(1)}
          element={
            <ProtectedRoute requiredPermission={{ resource: MODULES.APPOINTMENT, action: ACTIONS.VIEW }}>
              <AppointmentWizardProvider>
                <AppointmentDashboard />
              </AppointmentWizardProvider>
            </ProtectedRoute>
          }
        >
          <Route path="create/customer" element={<AppointmentCustomerSearch />} />
          <Route path="create/vehicle"  element={<AppointmentVehicleDetails />} />
          <Route path="create/service"  element={<AppointmentServiceDetails />} />
          <Route path="create/slot"     element={<AppointmentSlotSelection />} />
          <Route path="create/review"   element={<AppointmentReview />} />
          <Route path="create/success"  element={<AppointmentSuccess />} />
        </Route>

        {/* Vehicle 360 — VEHICLE_360:view required (admin only) */}
        <Route
          path={ROUTES.VEHICLE_360_DASHBOARD.slice(1)}
          element={
            <ProtectedRoute requiredPermission={{ resource: MODULES.VEHICLE_360, action: ACTIONS.VIEW }}>
              <Vehicle360Dashboard />
            </ProtectedRoute>
          }
        >
          <Route path=":vehicleId" element={<Vehicle360VehicleDetail />} />
        </Route>

        {/* Technician — TECHNICIAN:view required */}
        <Route
          path={ROUTES.TECHNICIAN_DASHBOARD.slice(1)}
          element={
            <ProtectedRoute requiredPermission={{ resource: MODULES.TECHNICIAN, action: ACTIONS.VIEW }}>
              <TechnicianDashboard />
            </ProtectedRoute>
          }
        />

        {/* Foreman — WORKSHOP:view required */}
        <Route
          path={ROUTES.FOREMAN_DASHBOARD.slice(1)}
          element={
            <ProtectedRoute requiredPermission={{ resource: MODULES.WORKSHOP, action: ACTIONS.VIEW }}>
              <ForemanDashboard />
            </ProtectedRoute>
          }
        />

        {/* Workshop Bays master — WORKSHOP:edit required (admin/foreman) */}
        <Route
          path={ROUTES.WORKSHOP_BAYS.slice(1)}
          element={
            <ProtectedRoute requiredPermission={{ resource: MODULES.WORKSHOP, action: ACTIONS.EDIT }}>
              <WorkshopBays />
            </ProtectedRoute>
          }
        />

        {/* Phase 5 — QC Out inspection (QC inspector + foreman) */}
        <Route
          path={ROUTES.QC_OUT_INSPECTION_DASHBOARD.slice(1)}
          element={
            <ProtectedRoute requiredPermission={{ resource: MODULES.QC_OUT, action: ACTIONS.VIEW }}>
              <QcOutInspectionDashboard />
            </ProtectedRoute>
          }
        />

        {/* Phase 5 — Washbay queue (foreman + receptionist) */}
        <Route
          path={ROUTES.WASHBAY_DASHBOARD.slice(1)}
          element={
            <ProtectedRoute requiredPermission={{ resource: MODULES.WASHBAY, action: ACTIONS.VIEW }}>
              <WashbayDashboard />
            </ProtectedRoute>
          }
        />

        {/* Phase 6 — Warranty Store (parts manager) */}
        <Route
          path={ROUTES.WARRANTY_STORE.slice(1)}
          element={
            <ProtectedRoute requiredPermission={{ resource: MODULES.WARRANTY, action: ACTIONS.VIEW }}>
              <WarrantyStore />
            </ProtectedRoute>
          }
        />

        {/* Phase 7 — Finance billing + invoice detail */}
        <Route
          path={ROUTES.FINANCE_BILLING_DASHBOARD.slice(1)}
          element={
            <ProtectedRoute requiredPermission={{ resource: MODULES.INVOICING, action: ACTIONS.VIEW }}>
              <FinanceBillingDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.FINANCE_INVOICE_DETAIL.slice(1)}
          element={
            <ProtectedRoute requiredPermission={{ resource: MODULES.INVOICING, action: ACTIONS.VIEW }}>
              <InvoiceDetail />
            </ProtectedRoute>
          }
        />

        {/* Phase 7 — Gate release (security) */}
        <Route
          path={ROUTES.GATE_RELEASE.slice(1)}
          element={
            <ProtectedRoute requiredPermission={{ resource: MODULES.GATE_RELEASE, action: ACTIONS.VIEW }}>
              <GatePassScan />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.TECHNICIAN_JOB_DETAIL.slice(1)}
          element={
            <ProtectedRoute requiredPermission={{ resource: MODULES.TECHNICIAN, action: ACTIONS.VIEW }}>
              <TechnicianJobDetail />
            </ProtectedRoute>
          }
        />

        {/* Customer Profile Dashboard — CUSTOMER_PROFILE:view required */}
        <Route
          path={ROUTES.CUSTOMER_PROFILE_DASHBOARD.slice(1)}
          element={
            <ProtectedRoute requiredPermission={{ resource: MODULES.CUSTOMER_PROFILE, action: ACTIONS.VIEW }}>
              <CustomerProfileDashboard />
            </ProtectedRoute>
          }
        />

        {/* Model Service Type Assignment — ROLE_MANAGEMENT:view required */}
        <Route
          path={ROUTES.MODEL_SERVICE_TYPE.slice(1)}
          element={
            <ProtectedRoute requiredPermission={{ resource: MODULES.ROLE_MANAGEMENT, action: ACTIONS.VIEW }}>
              <ModelServiceTypeAssignment />
            </ProtectedRoute>
          }
        />

        <Route path={ROUTES.PROFILE.slice(1)} element={<Profile />} />
        <Route path={ROUTES.SETTINGS.slice(1)} element={<Settings />} />
        <Route path={ROUTES.NO_ACCESS.slice(1)} element={<NoAccess />} />
      </Route>

      {/* Public routes */}
      <Route path={ROUTES.LOGIN} element={<Login />} />
      <Route path={ROUTES.REGISTER} element={<Register />} />
      <Route path="/customer-approval/:token" element={<CustomerApprovalDashboard />} />
    </Routes>
  </BrowserRouter>
);

export default AppRoutes;
