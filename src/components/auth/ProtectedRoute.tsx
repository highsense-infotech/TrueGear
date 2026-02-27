import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ROUTES } from '../../constants/routes';

interface Props {
  children: React.ReactNode;
  allowedRoles?: string[];
}

const ROLE_DEFAULT_ROUTES: Record<string, string> = {
  'super-admin': ROUTES.SECURITY_DASHBOARD,
  'security-gate-keeper': ROUTES.SECURITY_DASHBOARD,
  'qc-inspector': ROUTES.QUALITY_CHECK_DASHBOARD,
  'customer': ROUTES.SERVICE_ADVISOR_DASHBOARD,
  'service-advisor': ROUTES.SERVICE_ADVISOR_DASHBOARD,
};

const ProtectedRoute: React.FC<Props> = ({ children, allowedRoles }) => {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  // Not logged in — redirect to login
  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />;
  }

  // Role check — if allowedRoles specified, verify user has one (super-admin bypasses)
  if (allowedRoles && allowedRoles.length > 0 && user?.role?.slug) {
    if (user.role.slug !== 'super-admin' && !allowedRoles.includes(user.role.slug)) {
      const fallback = ROLE_DEFAULT_ROUTES[user.role.slug] || ROUTES.LOGIN;
      return <Navigate to={fallback} replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
