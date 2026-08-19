import app from './app.js';
import dotenv from 'dotenv';
import { initLicenseExpiryJob } from './jobs/licenseExpiry.job.js';
import { initCriticalStockJob } from './jobs/criticalStock.job.js';

dotenv.config();

const PORT = process.env.PORT || 4001;

app.listen(PORT, () => {
  console.log(`[Backend] Demirbaş Takip API Server listening on port ${PORT}`);
  initLicenseExpiryJob();
  initCriticalStockJob();
});

