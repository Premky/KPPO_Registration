export const menuAccess = {
  visitor: {
    office_superadmin: [
      '/visitor/create_visitor',
      '/visitor/view_employee',
    ],
    superadmin: 'all',
    clerk: 'all',
    null:'all',
    undefined:'all',
  },
  emp: {
    office_superadmin: [
      '/emp/create_employee',
      '/emp/view_employee',
    ],
    superadmin: 'all',
    clerk: 'all',
    null:'all',
    undefined:'all',
  }
};
