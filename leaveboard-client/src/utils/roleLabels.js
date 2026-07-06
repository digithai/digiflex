export const getRoleLabel = (role) => {
  const roleLabels = {
    'superadmin': 'Superadmin',
    'tenant_admin': 'Tenant Admin',
    'approver': 'Approver',
    'user': 'User',
  };
  return roleLabels[role] || role;
};

export const getAvailableRoles = (currentUserRole) => {
  if (currentUserRole === 'superadmin') {
    return [
      { value: 'tenant_admin', label: 'Tenant Admin' },
      { value: 'approver', label: 'Approver' },
      { value: 'user', label: 'User' },
    ];
  }
  if (currentUserRole === 'tenant_admin') {
    return [
      { value: 'approver', label: 'Approver' },
      { value: 'user', label: 'User' },
    ];
  }
  return [];
};
