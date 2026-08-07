import { getNotificationSummary } from './src/modules/notifications/notifications.service.js';
import prisma from './src/config/db.js';

async function testNow() {
  const result = await getNotificationSummary();
  console.log('SUMMARY RESULT:', JSON.stringify(result, null, 2));
  await prisma.$disconnect();
}

testNow();
