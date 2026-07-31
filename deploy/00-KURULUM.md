# Kurulum Kılavuzu — Envanter ve Zimmet Takip Sistemi

Bu klasör, **internete bağlı olmayan** fabrika sunucusuna kurulum için gereken
her şeyi içerir. Sunucuda `npm install` çalıştırmanız **gerekmez**; tüm
bağımlılıklar hazır halde gelir.

**Hedef ortam:** Windows Server 2019 / 2022 / 2025 · Yönetici yetkisi gerekir.

---

## Kurulumdan önce (internetli makinede yapılır)

`deploy\installers\` klasörüne şu iki dosyayı indirin:

| Dosya | Nereden |
|---|---|
| `node-v24.x.x-x64.msi` | nodejs.org → LTS → Windows Installer (.msi) 64-bit |
| `postgresql-17.x-windows-x64.exe` | enterprisedb.com → PostgreSQL Windows x86-64 installer |

Sonra `deploy\` klasörünün **tamamını** sunucuya kopyalayın
(ağ paylaşımı, USB veya RDP ile). Önerilen konum: `C:\EntanterTakip\`

---

## Sunucuda kurulum

Tüm adımlar **Yönetici olarak açılmış PowerShell** ile yapılır.

Script'lerin çalışabilmesi için ilk komut olarak:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```

### Adım 0 — Node.js ve PostgreSQL kurulumu

`installers\` klasöründeki iki dosyayı sırayla çalıştırın.

- **Node.js:** varsayılan ayarlarla kurun.
- **PostgreSQL:** kurulum sırasında `postgres` kullanıcısına vereceğiniz
  parolayı **not edin** — bir sonraki adımda gerekecek.
  "Stack Builder" adımını atlayabilirsiniz (internet ister).

Kurulum sonrası PowerShell'i **kapatıp yeniden açın** (PATH güncellensin), sonra:

```powershell
node --version
```

### Adım 1 — Veritabanını oluştur

```powershell
cd C:\EntanterTakip\scripts
.\01-install-db.ps1
```

`postgres` parolasını, ardından uygulama için **yeni bir parola** belirlemenizi
ister. Bu parolayı not edin.

### Adım 2 — Yapılandırma

```powershell
.\02-configure.ps1
```

- Sunucunun yerel IP adresini onaylarsınız (kullanıcılar bu adresi yazacak).
- Adım 1'de belirlediğiniz veritabanı parolasını girersiniz.
- JWT gizli anahtarları **otomatik ve rastgele** üretilir.

> **Dikkat:** Arayüz, API adresini build sırasında içine gömer. Script size
> beklenen `VITE_API_URL` değerini yazar. Paket başka bir adresle build
> edildiyse arayüz API'ye ulaşamaz — bu durumda geliştirme makinesinde
> doğru adresle yeniden build alınmalıdır.

### Adım 3 — Şema ve başlangıç verisi

```powershell
.\03-migrate-seed.ps1
```

Ekrana yazılan **yönetici parolasını not edin**. İlk girişte değiştirilmesi
zorunludur; değiştirilmeden sistemin diğer bölümleri kullanılamaz.

### Adım 4 — Windows servisleri

```powershell
.\04-install-services.ps1
```

İki servis kurulur ve otomatik başlar:

| Servis | Görev | Port |
|---|---|---|
| `EntanterTakipAPI` | REST API | 3001 |
| `EntanterTakipWeb` | Web arayüzü | 3000 |

Sunucu yeniden başladığında ikisi de kendiliğinden ayağa kalkar.

### Adım 5 — Güvenlik duvarı

```powershell
.\05-firewall.ps1
```

Portlar **yalnızca fabrika alt ağına** açılır, tüm arayüzlere değil.

### Adım 6 — Yedekleme (atlamayın)

```powershell
.\backup.ps1 -RegisterTask
```

Her gün 22:00'de otomatik yedek alınır, 30 günden eski yedekler silinir.

> Zimmet geçmişi geri getirilemez bir veridir. Yedekleri düzenli olarak
> **başka bir diske veya sunucuya** kopyalayın — aynı diskteki yedek,
> disk arızasında işe yaramaz.

---

## Kurulum doğrulaması

```powershell
# 1) API ayakta ve veritabanına ulaşıyor mu?
curl.exe http://localhost:3001/api/health
# Beklenen: {"status":"ok","database":"up",...}

# 2) Servisler çalışıyor mu?
Get-Service EntanterTakip*

# 3) Arayüz açılıyor mu?
Start-Process http://localhost:3000
```

Son olarak **başka bir bilgisayardan** tarayıcıda `http://<sunucu-ip>:3000`
adresini açıp giriş yapın.

---

## Güncelleme

Yeni sürüm geldiğinde:

```powershell
Stop-Service EntanterTakipAPI, EntanterTakipWeb

# Yeni paketteki app\ klasörünü mevcut app\ üzerine kopyalayın.
# .env dosyasına DOKUNMAYIN.

cd C:\EntanterTakip\scripts
.\03-migrate-seed.ps1          # migration idempotenttir, güvenlidir

Start-Service EntanterTakipAPI, EntanterTakipWeb
```

---

## Sorun giderme

| Belirti | Kontrol |
|---|---|
| `health` → `"database":"down"` | PostgreSQL servisi çalışıyor mu? `.env` içindeki `DATABASE_URL` parolası doğru mu? |
| Arayüz açılıyor, giriş çalışmıyor | `.env` içindeki `CORS_ORIGINS`, tarayıcıya yazdığınız adresle **birebir** aynı olmalı (port dahil). |
| Başka PC'den erişilemiyor | Adım 5 çalıştırıldı mı? Alt ağ doğru mu? |
| Servis başlamıyor | Olay Görüntüleyici → Windows Günlükleri → Uygulama; ayrıca `app\api\daemon\` altındaki log dosyaları. |
| Parola unutuldu | Veritabanında `authorized_users` tablosundan ilgili kullanıcı silinip `03-migrate-seed.ps1` tekrar çalıştırılır (yeni parola üretilir). |

### Servisleri kaldırma

```powershell
cd C:\EntanterTakip
node service\services.cjs uninstall
```

---

## Bu sistem hakkında bilinmesi gerekenler

- **Kayıtlar asla silinmez.** Hurda, kayıp ve işten ayrılma dahil her şey
  "pasifleştirme" olarak işlenir; geçmiş sorgulanabilir kalır.
- **Dış internet erişimi yoktur ve gerekmez.** Yazı tipleri, ikonlar ve tüm
  kütüphaneler uygulamanın içine gömülüdür.
- **Veri bütünlüğü veritabanı seviyesinde korunur.** Bir demirbaşın aynı anda
  iki kişide görünmesi veya stokun eksiye düşmesi, uygulama hatası olsa bile
  PostgreSQL tarafından engellenir.
