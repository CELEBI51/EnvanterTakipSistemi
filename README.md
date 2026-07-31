# Envanter ve Zimmet Takip Sistemi

Fabrika iç ağında, **dış internete kapalı** çalışan envanter ve zimmet takip sistemi.

- Demirbaşlı ürünler (laptop, monitör) tekil demirbaş numarasıyla
- Demirbaşsız aksesuarlar (fare, klavye, kablo) adet/koli bazlı stokla
- Çift yönlü geçmiş: bir üründen kimlere gittiği, bir personelden neler aldığı
- Kayıt asla silinmez (soft delete); hurda/kayıp gerekçesiyle geçmişe işlenir

---

## Teknoloji

| Katman | Seçim | Neden |
|---|---|---|
| Backend | Node.js 24 LTS + TypeScript + **Fastify 5** | Küçük bağımlılık ağacı, hızlı, eklenti modeli temiz |
| Veritabanı | **PostgreSQL 16/17** | Partial unique index ve CHECK constraint bu projede zorunlu |
| DB erişimi | **Drizzle ORM + `pg`** | Saf JS — kurulumda binary indirmez, migration'ları düz `.sql` |
| Parola | **`node:crypto` scrypt** | Sıfır bağımlılık; bcrypt/argon2 native derleme ister |
| Frontend | **Vite + React 19 + Tailwind 4** | Statik çıktı, SSR/telemetri yükü yok |
| Fontlar | **`@fontsource/inter`** | npm paketi; Google Fonts CDN kullanılmaz |

> **Offline altın kuralı:** `postinstall` adımında ağdan dosya indiren veya
> native modül (`.node`) içeren paketler projeye alınmaz. `node_modules`
> geliştirme makinesinden sunucuya olduğu gibi kopyalandığı için bu bir
> tercih değil, zorunluluktur. `npm run build:deploy` bunu otomatik denetler.

---

## Proje yapısı

```
entanter-takip/
├─ packages/shared/          Zod şemaları, tipler, TR etiketli sabitler
│                            (backend + frontend ORTAK — tek doğruluk kaynağı)
├─ apps/api/
│  ├─ drizzle/               Üretilmiş migration .sql dosyaları (git'te)
│  ├─ scripts/               dev-db (PGlite), smoke-test
│  └─ src/
│     ├─ config/env.ts       Zod ile doğrulanmış ortam değişkenleri
│     ├─ db/                 client, schema/, migrate, seed
│     ├─ lib/                errors, password, audit, numbering, pagination
│     ├─ plugins/            auth, cors/helmet/rate-limit, error-handler
│     └─ modules/            auth, staff, departments, categories,
│                            assets, consumables, assignments, reports
│                            (her modül: routes → service → repository)
├─ apps/web/src/
│  ├─ app/                   App, router, RequireAuth, layout
│  ├─ features/              auth, dashboard, staff, assets, consumables
│  ├─ components/ui/         Spinner, Feedback, StatusBadge, Pagination
│  └─ lib/                   api-client (refresh interceptor), format, types
├─ deploy/                   Windows kurulum paketi (bkz. deploy/00-KURULUM.md)
└─ scripts/build-deploy.mjs  Deploy paketini üretir + offline denetimi
```

**Katman kuralı:** `routes` yalnızca HTTP → `service` iş kuralları ve
transaction sınırı → `repository` Drizzle sorguları. Repository dışında ham
SQL yazılmaz; service Fastify tiplerini bilmez.

---

## Geliştirme

### Gereksinimler
Node.js 24+. **PostgreSQL kurmanıza gerek yok** — geliştirme için PGlite
(PostgreSQL'in WebAssembly derlemesi) bir TCP soketi üzerinden sunulur.
Sahte bir katman değildir: CHECK constraint'ler ve transaction'lar gerçek
PostgreSQL motoru tarafından uygulanır.

```bash
npm install
cp apps/api/.env.example apps/api/.env    # değerleri doldurun
cp apps/web/.env.example apps/web/.env
```

### Çalıştırma (üç ayrı terminal)

```bash
npm run dev:db
```

```bash
npm run db:migrate && npm run db:seed && npm run dev:api
```

```bash
npm run dev:web
```

- API → http://localhost:3001
- Arayüz → http://localhost:3000

> `dev:db` kullanırken `apps/api/.env` içinde `DB_POOL_MAX=1` olmalıdır.
> PGlite tek bağlantı destekler. Gerçek PostgreSQL'de bu değer 10'dur.

### Doğrulama

```bash
npm run smoke -- <admin-parolasi>
```

Çalışan API'ye karşı 38 senaryo koşar: zimmet/iade akışı, kısmi iade,
çift yönlü geçmiş ve **veritabanı kısıtlarının gerçekten tuttuğu** —
aynı demirbaşın iki kez zimmetlenememesi, stokun eksiye düşememesi,
başarısız işlemin tam geri alınması.

### Diğer komutlar

```bash
npm run typecheck        # tüm workspace'ler
npm run db:generate      # şema değişince yeni migration üret
npm run build            # shared + api + web derle
npm run build:deploy     # sunucuya taşınacak deploy/ paketini üret
```

---

## Kurulum (fabrika sunucusu)

`npm run build:deploy` çalıştırın, ardından **[deploy/00-KURULUM.md](deploy/00-KURULUM.md)**
adımlarını izleyin.

---

## Veri modeli hakkında

**Demirbaşlı / demirbaşsız ayrımı iki ayrı tabloyla çözüldü**
(`assets` / `consumables`), zimmet satırında (`assignment_items`) bir CHECK
constraint ile birleşiyorlar. Tek tablo + `type` kolonu tercih edilmedi:
o durumda demirbaş numarası ve seri no tekilliği veritabanı seviyesinde
garanti edilemezdi.

Veri bütünlüğü **uygulama katmanına bırakılmadı**:

| Kural | Nerede uygulanıyor |
|---|---|
| Bir demirbaş aynı anda tek açık zimmette | `uq_asset_open_assignment` (partial unique index) |
| Satır ya demirbaş ya sarf; demirbaşta adet = 1 | `chk_item_kind` |
| İade adedi zimmet adedini aşamaz | `chk_returned_quantity_range` |
| Stok eksiye düşemez | `chk_consumables_qty_non_negative` |
| Soft delete'e rağmen numara tekil | `uq_assets_tag_active` ve benzerleri |

Ayrıca zimmet kaydına **departman snapshot'ı** yazılır; personel sonradan
departman değiştirse bile geçmiş kayıt bozulmaz.

---

## İleride eklenecekler için kurallar

- **PDF zimmet tutanağı:** Puppeteer/Chromium **kullanılmayacak** (kurulumda
  ~150 MB tarayıcı indirir, izole ortamda kırılır). `pdfmake` veya
  `@react-pdf/renderer` + repoya gömülü Türkçe font. `GET /api/assignments/:id`
  yanıtı PDF'te gereken tüm alanları zaten içeriyor.
- **QR / el terminali:** `GET /api/assets/lookup/:tag` hazır ve büyük-küçük
  harf duyarsız. Barkod okuyucular klavye emülasyonu yapar; arama kutuları
  "yazılan metin + Enter" ile çalışacak şekilde tasarlandı.
- **LDAP / Active Directory:** Kimlik doğrulamanın tek giriş noktası
  `auth.service.ts` içindeki `login`'dir. İkinci bir sağlayıcı buranın arkasına
  eklenir. `staff.external_ref` ve `authorized_users.auth_source` alanları
  şimdiden ayrıldı; AD kullanıcısında `password_hash` NULL olabilir.
- **Excel/CSV içe aktarma:** Şema hazır. Örnek bir dışa aktarma dosyası
  geldiğinde import uç noktası eklenebilir.
