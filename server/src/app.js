import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import authRoutes from './modules/auth/auth.routes.js';
import userRoutes from './modules/users/users.routes.js';
import hardwareRoutes from './modules/hardware/hardware.routes.js';
import licenseRoutes from './modules/licenses/license.routes.js';
import reportsRoutes from './modules/reports/reports.routes.js';
import accessoryRoutes from './modules/accessories/accessories.routes.js';
import categoryRoutes from './modules/categories/categories.routes.js';
import attachmentRoutes from './modules/attachments/attachments.routes.js';
import consumableRoutes from './modules/consumables/consumable.routes.js';
import componentRoutes from './modules/components/component.routes.js';
import maintenanceRoutes from './modules/maintenance/maintenance.routes.js';
import assignmentRoutes from './modules/assignments/assignments.routes.js';
import returnRoutes from './modules/returns/returns.routes.js';
import employeeRoutes from './modules/employees/employees.routes.js';
import unitRoutes from './modules/units/units.routes.js';
import notificationRoutes from './modules/notifications/notifications.routes.js';
import { errorHandler } from './middlewares/error.middleware.js';

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'Demirbaş Takip Sistemi API Server is running',
    timestamp: new Date().toISOString(),
  });
});

// Auth, User, Hardware, License, Reports, Accessories, Categories, Attachments, Consumables, Components, Maintenance, Assignment, Return, Employee, Unit ve Notification API Rotaları
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/hardware', hardwareRoutes);
app.use('/api/licenses', licenseRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/accessories', accessoryRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/attachments', attachmentRoutes);
app.use('/api/consumables', consumableRoutes);
app.use('/api/components', componentRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/returns', returnRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/units', unitRoutes);
app.use('/api/notifications', notificationRoutes);

// Global Error Handler Middleware
app.use(errorHandler);

export default app;
