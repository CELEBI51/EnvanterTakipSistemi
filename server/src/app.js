import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import authRoutes from './modules/auth/auth.routes.js';
import userRoutes from './modules/users/users.routes.js';
import hardwareRoutes from './modules/hardware/hardware.routes.js';
import softwareRoutes from './modules/software/software.routes.js';
import reportsRoutes from './modules/reports/reports.routes.js';

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

// Auth, User, Hardware, Software ve Reports Modülleri API Rotaları
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/hardware', hardwareRoutes);
app.use('/api/software', softwareRoutes);
app.use('/api/reports', reportsRoutes);

export default app;
