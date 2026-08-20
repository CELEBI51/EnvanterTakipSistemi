# Deployment Talimatları — EnvanterTakip

## Gereksinimler (Windows Server)
- Node.js 18+
- PM2 (`npm install -g pm2`)
- pm2-windows-startup (`npm install -g pm2-windows-startup`)
- IIS + URL Rewrite Module + ARR (Application Request Routing)
- PostgreSQL

## 1. Backend Kurulumu

cd server
npm install
npx prisma generate
npx prisma migrate deploy
npm run prisma:generate

## 2. PM2 ile Backend Başlatma

cd server
pm2 start ecosystem.config.js --env production
pm2 save

## 3. Windows Başlangıcına Ekleme

pm2-startup install
pm2 save

## 4. Frontend Build ve IIS

cd client
npm install
npm run build

IIS'te yeni site oluştur:
- Physical path: client/dist
- Binding: domain adı veya IP
- web.config otomatik dist içine kopyalanır (vite public klasöründen)

## 5. server/.env Production Değerleri

PORT=4001
DATABASE_URL="postgresql://[user]:[pass]@localhost:[port]/envanter?schema=public"
JWT_SECRET=[güvenli-rastgele-string]
FRONTEND_URL="https://[server-domain-veya-ip]"
SMTP_HOST=[mail-server-ip]
SMTP_PORT=25
SMTP_USER=
SMTP_PASS=
SMTP_FROM=[gonderen@domain]
NODE_ENV=production

## 6. IIS ARR Ayarı

IIS Manager > Server > Application Request Routing > Enable Proxy işaretli olmalı
