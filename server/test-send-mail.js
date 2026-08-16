import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

import { sendEmail } from './src/services/mail.service.js';

async function testMail() {
  console.log('--- SMTP TEST BAŞLATILIYOR ---');
  console.log(`Host: ${process.env.SMTP_HOST}`);
  console.log(`Port: ${process.env.SMTP_PORT}`);
  console.log(`User: ${process.env.SMTP_USER}`);

  try {
    const info = await sendEmail({
      to: 'muhammet@testmail.local',
      subject: 'değiştirilmiş',
      text: 'Merhaba, nasılsınız bugün?',
      html: '<h1>selamlar</h1><p>Merhaba, bu e-posta <b>EnvanterTakip</b> sistemi üzerinden hMailServer SMTP testi için gönderilmiştir.</p>',
    });

    console.log('✅ E-posta Başarıyla Gönderildi!');
    console.log('Response:', info.response);
    console.log('MessageID:', info.messageId);
  } catch (error) {
    console.error('❌ E-posta Gönderme Hatası:', error.message);
    console.error(error);
  }
}

testMail();
