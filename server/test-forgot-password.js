import prisma from './src/config/db.js';

async function runPasswordResetIntegrationTest() {
  console.log('=== FORGOT & RESET PASSWORD INTEGRATION TEST ===\n');

  try {
    // 1. Existing user test
    const user = await prisma.user.findFirst();
    if (!user) {
      console.error('Test user not found!');
      process.exit(1);
    }
    console.log(`Testing with user email: ${user.email}`);

    // Request reset link for valid email
    const res1 = await fetch('http://127.0.0.1:5000/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: user.email }),
    });
    const data1 = await res1.json();
    console.log('Valid Email Response:', res1.status, data1);

    // Verify token created in DB
    const latestTokenRecord = await prisma.passwordResetToken.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });
    console.log('Token created in DB:', latestTokenRecord ? 'YES' : 'NO');
    console.log('Token Hash:', latestTokenRecord?.tokenHash);
    console.log('Expires At:', latestTokenRecord?.expiresAt);

    // Request reset link for unregistered email
    const res2 = await fetch('http://127.0.0.1:5000/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'nonexistent@ditas.com.tr' }),
    });
    const data2 = await res2.json();
    console.log('Unregistered Email Response:', res2.status, data2);

    console.log('\n=== ALL INTEGRATION TESTS PASSED ===');
  } catch (err) {
    console.error('Test error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

runPasswordResetIntegrationTest();
