import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ROUTES } from '../../constants/routes';

interface Props {
  children: React.ReactNode;
  requiredPermission?: { resource: string; action: string };
}

const ProtectedRoute: React.FC<Props> = ({ children, requiredPermission }) => {
  const { isAuthenticated, hasPermission } = useAuth();
  const location = useLocation();

  // Not logged in — redirect to login
  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />;
  }

  // Permission check — if requiredPermission specified, verify user has it (super-admin bypasses via hasPermission)
  if (requiredPermission && !hasPermission(requiredPermission.resource, requiredPermission.action)) {
    return <Navigate to={ROUTES.NO_ACCESS} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
