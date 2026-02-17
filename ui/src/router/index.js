import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'Login',
      component: () => import('@/views/Login.vue'),
      meta: { requiresAuth: false },
    },
    {
      path: '/register',
      name: 'Register',
      component: () => import('@/views/Register.vue'),
      meta: { requiresAuth: false },
    },
    {
      path: '/activate-company',
      name: 'ActivateCompany',
      component: () => import('@/views/ActivateCompany.vue'),
      meta: { requiresAuth: false },
    },
    {
      path: '/activate-employee',
      name: 'ActivateEmployee',
      component: () => import('@/views/ActivateEmployee.vue'),
      meta: { requiresAuth: false },
    },
    {
      path: '/activate/:token',
      name: 'ActivateAccount',
      component: () => import('@/views/ActivateAccount.vue'),
      meta: { requiresAuth: false },
    },
    {
      path: '/verify-email/:token',
      name: 'VerifyEmail',
      component: () => import('@/views/VerifyEmail.vue'),
      meta: { requiresAuth: false },
    },
    {
      path: '/forgot-password',
      name: 'ForgotPassword',
      component: () => import('@/views/ForgotPassword.vue'),
      meta: { requiresAuth: false },
    },
    {
      path: '/reset-password/:token',
      name: 'ResetPassword',
      component: () => import('@/views/ResetPassword.vue'),
      meta: { requiresAuth: false },
    },
    {
      path: '/',
      component: () => import('@/layouts/DashboardLayout.vue'),
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'Dashboard',
          component: () => import('@/views/Dashboard.vue'),
        },
        {
          path: 'dealers',
          name: 'Dealers',
          component: () => import('@/views/Dealers.vue'),
          meta: { roles: ['super_admin'] },
        },
        {
          path: 'admin/health-check',
          name: 'AdminHealthCheck',
          component: () => import('@/views/AdminHealthCheck.vue'),
          meta: { roles: ['super_admin'] },
        },
        {
          path: 'companies',
          name: 'Companies',
          component: () => import('@/views/Companies.vue'),
          meta: { roles: ['super_admin', 'bayi_admin'] },
        },
        {
          path: 'settings',
          name: 'Settings',
          component: () => import('@/views/Settings.vue'),
          meta: { roles: ['bayi_admin', 'company_admin', 'resmi_muhasebe_ik'] },
        },
        {
          path: 'global-settings',
          name: 'GlobalSettings',
          component: () => import('@/views/GlobalSettings.vue'),
          meta: { roles: ['super_admin', 'bayi_admin'] },
        },
        {
          path: 'registration-requests',
          name: 'RegistrationRequests',
          component: () => import('@/views/RegistrationRequests.vue'),
          meta: { roles: ['super_admin'] },
        },
        {
          path: 'user-management',
          name: 'UserManagement',
          component: () => import('@/views/UserManagement.vue'),
          meta: { roles: ['super_admin', 'bayi_admin', 'company_admin'] },
        },
        {
          path: 'role-management',
          name: 'RoleManagement',
          component: () => import('@/views/RoleManagement.vue'),
          meta: { roles: ['super_admin', 'bayi_admin'] },
        },
        {
          path: 'whatsapp-settings',
          name: 'WhatsAppSettings',
          component: () => import('@/views/WhatsAppSettings.vue'),
          meta: { roles: ['company_admin', 'resmi_muhasebe_ik', 'super_admin', 'bayi_admin'] },
        },
        {
          path: 'official-holidays',
          name: 'OfficialHolidays',
          component: () => import('@/views/OfficialHolidays.vue'),
          meta: { roles: ['super_admin', 'bayi_admin', 'company_admin', 'resmi_muhasebe_ik'] },
        },
        {
          path: 'company-quota-management',
          name: 'CompanyQuotaManagement',
          component: () => import('@/views/CompanyQuotaManagement.vue'),
          meta: { roles: ['bayi_admin'] },
        },
        {
          path: 'company-subscriptions',
          name: 'CompanySubscriptions',
          component: () => import('@/views/CompanySubscriptions.vue'),
          meta: { roles: ['bayi_admin'] },
        },
        {
          path: 'working-permits',
          name: 'WorkingPermits',
          component: () => import('@/views/WorkingPermits.vue'),
          meta: { roles: ['super_admin', 'company_admin', 'resmi_muhasebe_ik'] },
        },
        {
          path: 'departments',
          name: 'Departments',
          component: () => import('@/views/Departments.vue'),
          meta: { roles: ['super_admin', 'bayi_admin', 'company_admin', 'resmi_muhasebe_ik'] },
        },
        {
          path: 'manager-assignment',
          name: 'ManagerAssignment',
          component: () => import('@/views/ManagerAssignment.vue'),
          meta: { roles: ['super_admin', 'bayi_admin', 'company_admin', 'resmi_muhasebe_ik'] },
        },
        {
          path: 'working-hours',
          name: 'WorkingHours',
          component: () => import('@/views/WorkingHours.vue'),
          meta: { roles: ['super_admin', 'bayi_admin', 'company_admin', 'resmi_muhasebe_ik'] },
        },
        {
          path: 'employees',
          name: 'Employees',
          component: () => import('@/views/Employees.vue'),
          meta: { roles: ['super_admin', 'bayi_admin', 'company_admin', 'resmi_muhasebe_ik'] },
        },
        {
          path: 'puantaj',
          name: 'Puantaj',
          component: () => import('@/views/Puantaj.vue'),
          meta: { roles: ['super_admin', 'bayi_admin', 'company_admin', 'resmi_muhasebe_ik'] },
        },
        {
          path: 'puantaj-templates',
          name: 'PuantajTemplates',
          component: () => import('@/views/PuantajTemplates.vue'),
          meta: { roles: ['super_admin', 'bayi_admin', 'company_admin', 'resmi_muhasebe_ik'] },
        },
        {
          path: 'employee-settings/:id',
          name: 'EmployeeSettings',
          component: () => import('@/views/EmployeeSettings.vue'),
          meta: { roles: ['super_admin', 'bayi_admin', 'company_admin', 'resmi_muhasebe_ik'] },
        },
        {
          path: 'attendance-templates',
          name: 'AttendanceTemplates',
          component: () => import('@/views/AttendanceTemplates.vue'),
          meta: { roles: ['super_admin', 'company_admin', 'resmi_muhasebe_ik'] },
        },
        {
          path: 'attendance-calendar',
          name: 'AttendanceCalendar',
          component: () => import('@/views/AttendanceCalendar.vue'),
          meta: { roles: ['super_admin', 'bayi_admin', 'company_admin', 'resmi_muhasebe_ik'] },
        },
        {
          path: 'attendance-dashboard',
          name: 'AttendanceDashboard',
          component: () => import('@/views/AttendanceDashboard.vue'),
          meta: { roles: ['super_admin', 'bayi_admin', 'company_admin', 'resmi_muhasebe_ik'] },
        },
        {
          path: 'leave-requests',
          name: 'LeaveRequests',
          component: () => import('@/views/LeaveRequests.vue'),
          meta: {
            roles: [
              'super_admin',
              'bayi_admin',
              'company_admin',
              'resmi_muhasebe_ik',
              'employee',
            ],
          },
        },
        {
          path: 'reports',
          name: 'Reports',
          component: () => import('@/views/Reports.vue'),
          meta: {
            roles: [
              'super_admin',
              'bayi_admin',
              'company_admin',
              'resmi_muhasebe_ik',
            ],
          },
        },
        {
          path: 'advance-requests',
          name: 'AdvanceRequests',
          component: () => import('@/views/AdvanceRequests.vue'),
          meta: {
            roles: [
              'super_admin',
              'bayi_admin',
              'company_admin',
              'resmi_muhasebe_ik',
              'employee',
              'hr_manager',
              'department_manager',
            ],
          },
        },
        {
          path: 'advance-requests/create',
          name: 'CreateAdvanceRequest',
          component: () => import('@/views/CreateAdvanceRequest.vue'),
          meta: { roles: ['employee'] },
        },
        {
          path: 'overtime-requests',
          name: 'OvertimeRequests',
          component: () => import('@/views/OvertimeRequests.vue'),
          meta: {
            roles: [
              'super_admin',
              'bayi_admin',
              'company_admin',
              'resmi_muhasebe_ik',
              'hr_manager',
              'department_manager',
            ],
          },
        },
        {
          path: 'notifications',
          name: 'Notifications',
          component: () => import('@/views/Notifications.vue'),
          meta: { requiresAuth: true },
        },
        {
          path: 'support',
          name: 'Support',
          component: () => import('@/views/Support.vue'),
          meta: { roles: ['super_admin', 'bayi_admin', 'company_admin', 'resmi_muhasebe_ik'] },
        },
        {
          path: 'messages',
          name: 'Messages',
          component: () => import('@/views/Messages.vue'),
          meta: { requiresAuth: true },
        },
        {
          path: 'leave-reports',
          name: 'LeaveReports',
          component: () => import('@/views/LeaveReports.vue'),
          meta: {
            roles: [
              'super_admin',
              'bayi_admin',
              'company_admin',
              'resmi_muhasebe_ik',
            ],
          },
        },
        {
          path: 'my-leaves',
          name: 'MyLeaves',
          component: () => import('@/views/MyLeaves.vue'),
          meta: { roles: ['employee'] },
        },
        {
          path: 'my-account',
          name: 'MyAccount',
          component: () => import('@/views/MyAccount.vue'),
          meta: { roles: ['employee'] },
        },
        {
          path: 'approvals',
          name: 'Approvals',
          component: () => import('@/views/Approvals.vue'),
          meta: {
            roles: ['super_admin', 'bayi_admin', 'company_admin', 'resmi_muhasebe_ik', 'employee'],
          },
        },
        {
          path: 'leave-balances',
          name: 'LeaveBalances',
          component: () => import('@/views/LeaveBalances.vue'),
          meta: {
            roles: ['super_admin', 'bayi_admin', 'company_admin', 'resmi_muhasebe_ik', 'employee'],
          },
        },
        {
          path: 'leave-ledger',
          name: 'LeaveLedger',
          component: () => import('@/views/LeaveLedger.vue'),
          meta: {
            roles: ['super_admin', 'bayi_admin', 'company_admin', 'resmi_muhasebe_ik', 'employee'],
          },
        },
        {
          path: 'leave-summary',
          name: 'LeaveSummary',
          component: () => import('@/views/LeaveSummary.vue'),
          meta: {
            roles: ['super_admin', 'bayi_admin', 'company_admin', 'resmi_muhasebe_ik', 'employee'],
          },
        },
        {
          path: 'employee-leave-types',
          name: 'EmployeeLeaveTypes',
          component: () => import('@/views/EmployeeLeaveTypes.vue'),
          meta: { roles: ['employee'] },
        },
        {
          path: 'leaves/employee-summary',
          name: 'EmployeeLeavesSummary',
          component: () => import('@/views/Leaves/EmployeeLeavesSummary.vue'),
          meta: { roles: ['super_admin', 'bayi_admin', 'company_admin', 'resmi_muhasebe_ik'] },
        },
        {
          path: 'leaves/annual-calculation',
          name: 'AnnualLeaveCalculation',
          component: () => import('@/views/Leaves/AnnualLeaveCalculation.vue'),
          meta: {
            roles: ['super_admin', 'bayi_admin', 'company_admin', 'resmi_muhasebe_ik', 'employee'],
          },
        },
        {
          path: 'weekend-settings',
          name: 'WeekendSettings',
          component: () => import('@/views/WeekendSettings.vue'),
          meta: { roles: ['super_admin', 'bayi_admin', 'company_admin', 'resmi_muhasebe_ik'] },
        },
        {
          path: 'holiday-calendar',
          name: 'HolidayCalendar',
          component: () => import('@/views/HolidayCalendar.vue'),
          meta: { roles: ['company_admin', 'resmi_muhasebe_ik'] },
        },
        {
          path: 'employment/hire',
          name: 'HireEmployee',
          component: () => import('@/views/employment/HireEmployee.vue'),
          meta: { roles: ['super_admin', 'bayi_admin', 'company_admin', 'resmi_muhasebe_ik'] },
        },
        {
          path: 'employment/terminate',
          name: 'TerminateEmployee',
          component: () => import('@/views/employment/TerminateEmployee.vue'),
          meta: { roles: ['super_admin', 'bayi_admin', 'company_admin', 'resmi_muhasebe_ik'] },
        },
        {
          path: 'employment/list',
          name: 'EmploymentList',
          component: () => import('@/views/employment/EmploymentList.vue'),
          meta: { roles: ['super_admin', 'bayi_admin', 'company_admin', 'resmi_muhasebe_ik'] },
        },
        // Bordro Routes
        {
          path: 'bordro-upload',
          name: 'BordroUpload',
          component: () => import('@/views/bordro/BordroUpload.vue'),
          meta: { roles: ['super_admin', 'bayi_admin'] },
        },
        {
          path: 'bordro-list',
          name: 'BordroList',
          component: () => import('@/views/bordro/BordroList.vue'),
          meta: { roles: ['super_admin', 'bayi_admin'] },
        },
        {
          path: 'my-bordros',
          name: 'MyBordros',
          component: () => import('@/views/MyBordros.vue'),
          meta: { roles: ['employee'] },
        },
        {
          path: 'bordro-approval',
          name: 'BordroApproval',
          component: () => import('@/views/bordro/BordroApproval.vue'),
          meta: { roles: ['company_admin', 'resmi_muhasebe_ik'] },
        },
        {
          path: 'bordro/:id',
          name: 'BordroDetail',
          component: () => import('@/views/bordro/BordroDetail.vue'),
          meta: { roles: ['super_admin', 'bayi_admin', 'company_admin', 'employee'] },
        },
        {
          path: 'bordro-stats',
          name: 'BordroApprovalStats',
          component: () => import('@/views/bordro/BordroApprovalStats.vue'),
          meta: {
            roles: [
              'super_admin',
              'bayi_admin',
              'company_admin',
              'resmi_muhasebe_ik',
            ],
          },
        },
        {
          path: 'bordro-rejections',
          name: 'BordroRejections',
          component: () => import('@/views/bordro/BordroRejections.vue'),
          meta: {
            roles: [
              'super_admin',
              'bayi_admin',
              'company_admin',
              'resmi_muhasebe_ik',
            ],
          },
        },
        {
          path: 'bordro-company-list',
          name: 'BordroCompanyList',
          component: () => import('@/views/bordro/BordroCompanyList.vue'),
          meta: {
            roles: [
              'super_admin',
              'bayi_admin',
              'company_admin',
              'resmi_muhasebe_ik',
            ],
          },
        },
        // Abonelik Sistemi Routes
        {
          path: 'subscription',
          name: 'SubscriptionPurchase',
          component: () => import('@/views/SubscriptionPurchase.vue'),
          meta: { roles: ['bayi_admin'] },
        },
        {
          path: 'package-management',
          name: 'PackageManagement',
          component: () => import('@/views/PackageManagement.vue'),
          meta: { roles: ['super_admin'] },
        },
        {
          path: 'subscriptions',
          name: 'SubscriptionManagement',
          component: () => import('@/views/SubscriptionManagement.vue'),
          meta: { roles: ['super_admin'] },
        },
        {
          path: 'payments',
          name: 'PaymentHistory',
          component: () => import('@/views/PaymentHistory.vue'),
          meta: { roles: ['super_admin'] },
        },
        {
          path: 'revenue-analytics',
          name: 'RevenueAnalytics',
          component: () => import('@/views/RevenueAnalytics.vue'),
          meta: { roles: ['super_admin'] },
        },
        {
          path: 'commission-management',
          name: 'CommissionManagement',
          component: () => import('@/views/CommissionManagement.vue'),
          meta: { roles: ['super_admin'] },
        },
        {
          path: 'my-commissions',
          name: 'MyCommissions',
          component: () => import('@/views/MyCommissions.vue'),
          meta: { roles: ['bayi_admin'] },
        },
        {
          path: 'campaign-management',
          name: 'CampaignManagement',
          component: () => import('@/views/CampaignManagement.vue'),
          meta: { roles: ['super_admin'] },
        },
        {
          path: 'invoice-management',
          name: 'InvoiceManagement',
          component: () => import('@/views/InvoiceManagement.vue'),
          meta: { roles: ['super_admin'] },
        },
        {
          path: 'my-invoices',
          name: 'MyInvoices',
          component: () => import('@/views/MyInvoices.vue'),
          meta: { roles: ['bayi_admin'] },
        },
      ],
    },
    // Ödeme Sonuç Sayfaları (Auth gerektirmeyen)
    {
      path: '/subscription/success',
      name: 'SubscriptionSuccess',
      component: () => import('@/views/subscription/SubscriptionSuccess.vue'),
      meta: { requiresAuth: false },
    },
    {
      path: '/subscription/failed',
      name: 'SubscriptionFailed',
      component: () => import('@/views/subscription/SubscriptionFailed.vue'),
      meta: { requiresAuth: false },
    },
    {
      path: '/subscription/callback',
      name: 'SubscriptionCallback',
      component: () => import('@/views/subscription/SubscriptionCallback.vue'),
      meta: { requiresAuth: false },
    },
  ],
});

router.beforeEach((to, from, next) => {
  const authStore = useAuthStore();

  // Allow activation and registration pages without auth
  if (
    to.name === 'ActivateCompany' ||
    to.name === 'ActivateEmployee' ||
    to.name === 'ActivateAccount' ||
    to.name === 'Register' ||
    to.name === 'VerifyEmail' ||
    to.name === 'ResetPassword'
  ) {
    next();
    return;
  }

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    next('/login');
  } else if (to.meta.requiresAuth === false && authStore.isAuthenticated) {
    next('/');
  } else if (
    to.meta.roles &&
    !to.meta.roles.includes(authStore.user?.role?.name || authStore.user?.role)
  ) {
    next('/');
  } else {
    next();
  }
});

export default router;
