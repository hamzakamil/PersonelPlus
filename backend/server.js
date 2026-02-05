const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config({ path: require('path').join(__dirname, '.env') });

// Debug: SMTP ayarlarını logla (başlangıçta)
console.log('SMTP Config:', {
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: process.env.SMTP_SECURE,
  user: process.env.SMTP_USER ? 'SET' : 'NOT SET',
  pass: process.env.SMTP_PASS ? 'SET' : 'NOT SET'
});

// Error handling setup (en basta olmali)
const { setupUncaughtExceptionHandler } = require('./middleware/errorHandler');
setupUncaughtExceptionHandler();

const app = express();

// Middleware - CORS yapılandırması (Mobil uygulama desteği dahil)
app.use(cors({
  origin: [
    'http://localhost:5173',      // Vue.js development
    'http://localhost:3000',      // Backend (self)
    'http://10.0.2.2:3000',       // Android Emulator -> Host
    'http://127.0.0.1:3000',      // Localhost alternative
    /^http:\/\/192\.168\.\d+\.\d+:\d+$/, // Local network (gerçek cihaz testi)
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Swagger API Documentation
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'PYS API Dokümantasyonu'
}));

// Swagger JSON endpoint
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// Static files
const path = require('path');
const fs = require('fs');
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Ensure uploads directories exist
const uploadsDirs = [
  'uploads',
  'uploads/leaves',
  'uploads/employment',
  'uploads/employment/contracts',
  'uploads/employment/resignations',
  'uploads/employment/severance',
  'uploads/bordro',
  'uploads/bordro-pdf'  // Zaman damgalı PDF'ler için
];
uploadsDirs.forEach(dir => {
  const dirPath = path.join(__dirname, dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
});

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/personel_yonetim', {
  serverSelectionTimeoutMS: 5000, // 5 saniye timeout
  socketTimeoutMS: 45000,
})
.then(() => {
  console.log('MongoDB bağlantısı başarılı')
})
.catch(err => {
  console.error('MongoDB bağlantı hatası:', err);
});

// MongoDB bağlantı durumunu kontrol et
mongoose.connection.on('error', (err) => {
  console.error('MongoDB bağlantı hatası:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB bağlantısı kesildi');
});

// Routes
const authRoutes = require('./routes/auth');
const dealerRoutes = require('./routes/dealers');
const companyRoutes = require('./routes/companies');
const departmentRoutes = require('./routes/departments');
const employeeRoutes = require('./routes/employees');
const workingPermitRoutes = require('./routes/workingPermits');
const workingHoursRoutes = require('./routes/workingHours');
const settingsRoutes = require('./routes/settings');
const globalSettingsRoutes = require('./routes/globalSettings');
const attendanceTemplateRoutes = require('./routes/attendanceTemplates');
const attendanceRoutes = require('./routes/attendances');
const leaveRequestRoutes = require('./routes/leaveRequests');
const leaveBalanceRoutes = require('./routes/leaveBalances');
const leaveLedgerRoutes = require('./routes/leaveLedger');
const weekendSettingsRoutes = require('./routes/weekendSettings');
const checkInRoutes = require('./routes/checkIns');
const workplaceRoutes = require('./routes/workplaces');
const leaveTypeRoutes = require('./routes/leaveTypes');
const managerRoutes = require('./routes/managers');
const employmentRoutes = require('./routes/employment');
const companyHolidaysRoutes = require('./routes/companyHolidays');
const dashboardRoutes = require('./routes/dashboard');
const requestsRoutes = require('./routes/requests');
const whatsappRoutes = require('./routes/whatsapp');
const leavesRoutes = require('./routes/leaves');
const rolesRoutes = require('./routes/roles');
const permissionsRoutes = require('./routes/permissions');
const usersRoutes = require('./routes/users');
const puantajRoutes = require('./routes/puantaj');
const packagesRoutes = require('./routes/packages');
const subscriptionsRoutes = require('./routes/subscriptions');
const paymentsRoutes = require('./routes/payments');
const messagesRoutes = require('./routes/messages');
const notificationsRoutes = require('./routes/notifications');
const advanceRequestsRoutes = require('./routes/advanceRequests');
const adminRoutes = require('./routes/admin');
const supportRoutes = require('./routes/support');
const sgkMeslekKodlariRoutes = require('./routes/sgkMeslekKodlari');
const additionalPaymentTypesRoutes = require('./routes/additionalPaymentTypes');
const companyPaymentTypesRoutes = require('./routes/companyPaymentTypes');
const employeePaymentsRoutes = require('./routes/employeePayments');
const yearlyTaxLimitsRoutes = require('./routes/yearlyTaxLimits');
const overtimeRequestsRoutes = require('./routes/overtimeRequests');
const commissionsRoutes = require('./routes/commissions');
const campaignsRoutes = require('./routes/campaigns');
const invoicesRoutes = require('./routes/invoices');
const attendanceSummaryRoutes = require('./routes/attendance-summary');
const bordroRoutes = require('./routes/bordro');

app.use('/api/auth', authRoutes);
app.use('/api/dealers', dealerRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/working-permits', workingPermitRoutes);
app.use('/api/working-hours', workingHoursRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/global-settings', globalSettingsRoutes);
app.use('/api/attendance-templates', attendanceTemplateRoutes);
app.use('/api/attendances', attendanceRoutes);
app.use('/api/leave-requests', leaveRequestRoutes);
app.use('/api/leave-balances', leaveBalanceRoutes);
app.use('/api/leave-ledger', leaveLedgerRoutes);
app.use('/api/weekend-settings', weekendSettingsRoutes);
app.use('/api/check-ins', checkInRoutes);
app.use('/api/workplaces', workplaceRoutes);
app.use('/api/leave-types', leaveTypeRoutes);
app.use('/api/managers', managerRoutes);
app.use('/api/employment', employmentRoutes);
app.use('/api/company-holidays', companyHolidaysRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/requests', requestsRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/leave', leavesRoutes);
app.use('/api/roles', rolesRoutes);
app.use('/api/permissions', permissionsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/puantaj', puantajRoutes);
app.use('/api/packages', packagesRoutes);
app.use('/api/subscriptions', subscriptionsRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/advance-requests', advanceRequestsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/sgk-meslek-kodlari', sgkMeslekKodlariRoutes);
app.use('/api/additional-payment-types', additionalPaymentTypesRoutes);
app.use('/api/companies', companyPaymentTypesRoutes); // /api/companies/:companyId/payment-types
app.use('/api/employees', employeePaymentsRoutes); // /api/employees/:employeeId/payments
app.use('/api/employee-payments', employeePaymentsRoutes); // /api/employee-payments/bulk-assign, /api/employee-payments/company/:companyId/summary
app.use('/api/yearly-tax-limits', yearlyTaxLimitsRoutes);
app.use('/api/overtime-requests', overtimeRequestsRoutes);
app.use('/api/commissions', commissionsRoutes);
app.use('/api/campaigns', campaignsRoutes);
app.use('/api/invoices', invoicesRoutes);
app.use('/api/attendance-summary', attendanceSummaryRoutes);
app.use('/api/bordro', bordroRoutes);

// Error handling middleware
const { errorHandler, notFoundHandler, setupUnhandledRejectionHandler } = require('./middleware/errorHandler');

// Tanimlanmamis route'lar icin 404
app.use(notFoundHandler);

// Global error handler (en sonda olmali)
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`Server ${PORT} portunda calisiyor`);
});

// Unhandled promise rejection handler
setupUnhandledRejectionHandler(server);

