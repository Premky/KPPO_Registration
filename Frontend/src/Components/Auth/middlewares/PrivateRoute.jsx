// components/PrivateRoute.jsx
import React from 'react';
import { Navigate } from 'react-router-dom';

const PrivateRoute = ({
  user,
  allowedRoles = [],
  allowedBranches = [],
  children,
}) => {
  if (!user) return <Navigate to="/login" />;

  // ✅ Allow unrestricted access to superadmin or office_admin
  if (['superadmin', 'office_admin'].includes(user.role_name)) {
    return children;
  }

  const isAllowedRole = allowedRoles.includes(user.role_name);
  const isAllowedBranch =
    allowedBranches.length === 0 || allowedBranches.includes(user.branch_name);

  return isAllowedRole && isAllowedBranch ? children : <Navigate to="/unauthorized" />;
};

export default PrivateRoute;
