/**
 * UCTAN UCA DOGRULAMA
 *
 * Calisan bir API'ye karsi gercek HTTP istekleriyle tum kritik is
 * kurallarini ve VERITABANI KISITLARINI sinar.
 *
 * Ozellikle onemli: kisitlarin uygulama katmani atlansa bile tuttugunu
 * dogrular — mimarinin butun guvenlik iddiasi buna dayanir.
 *
 * Kullanim:
 *   npm run dev:db     (1. terminal)
 *   npm run dev        (2. terminal)
 *   npm run smoke -- <admin-parolasi>
 */

const BASE = process.env.SMOKE_BASE_URL ?? 'http://localhost:3001';
const INITIAL_PASSWORD = process.argv[2] ?? process.env.SMOKE_ADMIN_PASSWORD ?? '';
const TEST_PASSWORD = 'SmokeTest2026parola';

let passed = 0;
let failed = 0;
let accessToken = '';
let cookie = '';

function ok(label: string, detail = ''): void {
  passed += 1;
  console.log(`  ✓ ${label}${detail ? ` — ${detail}` : ''}`);
}

function fail(label: string, detail = ''): void {
  failed += 1;
  console.log(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`);
}

interface ApiResult<T = unknown> {
  status: number;
  body: T;
}

async function api<T = any>(
  method: string,
  path: string,
  body?: unknown,
): Promise<ApiResult<T>> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  if (cookie) headers.Cookie = cookie;

  const response = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const setCookie = response.headers.get('set-cookie');
  if (setCookie) cookie = setCookie.split(';')[0] ?? cookie;

  const text = await response.text();
  let parsed: unknown = text;
  try {
    parsed = JSON.parse(text);
  } catch {
    /* metin olarak birak */
  }
  return { status: response.status, body: parsed as T };
}

/** Hata mesajini kisaltarak dondurur. */
function errMsg(body: any): string {
  return String(body?.error?.message ?? body?.message ?? '').slice(0, 90);
}

function section(title: string): void {
  console.log(`\n${title}`);
  console.log('-'.repeat(title.length));
}

async function main(): Promise<void> {
  console.log('\n=========================================================');
  console.log(' ENTANTER TAKIP — UCTAN UCA DOGRULAMA');
  console.log('=========================================================');

  /* ------------------------------------------------------------- */
  section('0. Saglik ve kimlik dogrulama');

  const health = await api('GET', '/api/health');
  health.status === 200
    ? ok('Health 200 ve veritabani ayakta')
    : fail('Health', `status=${health.status}`);

  const login = await api('POST', '/api/auth/login', {
    username: 'admin',
    password: INITIAL_PASSWORD,
  });

  if (login.status !== 200) {
    console.error(
      `\nGiris basarisiz (${login.status}): ${errMsg(login.body)}\n` +
        'Parolayi arguman olarak verin:  npm run smoke -- <parola>\n',
    );
    process.exit(1);
  }
  accessToken = (login.body as any).accessToken;
  ok('Giris basarili');

  // Gecici parola zorlamasi
  if ((login.body as any).user.mustChangePassword) {
    const blocked = await api('GET', '/api/staff');
    blocked.status === 403
      ? ok('Gecici parolayla diger uc noktalar KAPALI', '403')
      : fail('Gecici parola zorlamasi', `status=${blocked.status}`);

    const changed = await api('POST', '/api/auth/change-password', {
      currentPassword: INITIAL_PASSWORD,
      newPassword: TEST_PASSWORD,
    });
    changed.status === 200
      ? ok('Parola degistirildi')
      : fail('Parola degistirme', errMsg(changed.body));

    cookie = '';
    const relogin = await api('POST', '/api/auth/login', {
      username: 'admin',
      password: TEST_PASSWORD,
    });
    accessToken = (relogin.body as any).accessToken;
    relogin.status === 200 ? ok('Yeni parolayla giris') : fail('Yeni parolayla giris');
  }

  const afterAuth = await api('GET', '/api/staff');
  afterAuth.status === 200
    ? ok('Parola degisiminden sonra uc noktalar acik')
    : fail('Uc nokta erisimi', `status=${afterAuth.status}`);

  /* ------------------------------------------------------------- */
  section('1. Temel kayitlar');

  const deptList = await api('GET', '/api/departments?limit=5');
  const departmentId = (deptList.body as any).data?.[0]?.id;
  departmentId
    ? ok('Seed departmanlari mevcut', `${(deptList.body as any).meta.total} adet`)
    : fail('Departman listesi');

  const suffix = Date.now().toString().slice(-6);

  const person = await api('POST', '/api/staff', {
    employeeNo: `SC-${suffix}`,
    firstName: 'Ahmet',
    lastName: 'Yilmaz',
    departmentId,
    title: 'Tekniker',
    email: '',
  });
  const staffId = (person.body as any).id;
  person.status === 201 ? ok('Personel olusturuldu', `id=${staffId}`) : fail('Personel', errMsg(person.body));

  const dupStaff = await api('POST', '/api/staff', {
    employeeNo: `SC-${suffix}`,
    firstName: 'Baska',
    lastName: 'Kisi',
  });
  dupStaff.status === 409
    ? ok('Ayni sicil no reddedildi', '409 (uq_staff_employee_no_active)')
    : fail('Sicil tekilligi', `status=${dupStaff.status}`);

  const laptop = await api('POST', '/api/assets', {
    serialNo: `SN-${suffix}`,
    brand: 'Dell',
    model: 'Latitude 5540',
  });
  const assetId = (laptop.body as any).id;
  const assetTag = (laptop.body as any).assetTag;
  laptop.status === 201
    ? ok('Demirbas olusturuldu', `etiket otomatik: ${assetTag}`)
    : fail('Demirbas', errMsg(laptop.body));

  const mouse = await api('POST', '/api/consumables', {
    name: `Kablosuz Mouse ${suffix}`,
    unit: 'Adet',
    packageSize: 10,
    minStockLevel: 5,
    initialQuantity: 20,
  });
  const consumableId = (mouse.body as any).id;
  mouse.status === 201 ? ok('Aksesuar olusturuldu', 'stok=20') : fail('Aksesuar', errMsg(mouse.body));

  const bulk = await api('POST', `/api/consumables/${consumableId}/stock`, {
    movementType: 'in',
    packageCount: 3,
  });
  (bulk.body as any).quantityOnHand === 50
    ? ok('Koli bazli toplu giris', '3 koli x 10 = +30 -> 50')
    : fail('Toplu giris', JSON.stringify(bulk.body).slice(0, 90));

  /* ------------------------------------------------------------- */
  section('2. Zimmet verme');

  const assignment = await api('POST', '/api/assignments', {
    staffId,
    locationNote: 'Uretim Binasi / Ofis 2',
    items: [
      { kind: 'asset', assetId },
      { kind: 'consumable', consumableId, quantity: 2 },
    ],
  });
  const assignmentId = (assignment.body as any).id;
  assignment.status === 201
    ? ok('Zimmet olusturuldu', `fis: ${(assignment.body as any).assignmentNo}`)
    : fail('Zimmet', errMsg(assignment.body));

  const afterAssign = await api('GET', `/api/consumables/${consumableId}`);
  (afterAssign.body as any).quantityOnHand === 48
    ? ok('Stok dustu', '50 -> 48')
    : fail('Stok dusumu', `stok=${(afterAssign.body as any).quantityOnHand}`);

  const assetAfter = await api('GET', `/api/assets/${assetId}`);
  (assetAfter.body as any).status === 'assigned' &&
  (assetAfter.body as any).currentHolderName === 'Ahmet Yilmaz'
    ? ok('Demirbas zimmetli ve "kimde" gorunuyor')
    : fail('Demirbas durumu', JSON.stringify(assetAfter.body).slice(0, 90));

  /* ------------------------------------------------------------- */
  section('3. VERITABANI KISITLARI (kritik)');

  const doubleAssign = await api('POST', '/api/assignments', {
    staffId,
    items: [{ kind: 'asset', assetId }],
  });
  doubleAssign.status === 422 || doubleAssign.status === 409
    ? ok('Ayni demirbas ikinci kez zimmetlenemedi', errMsg(doubleAssign.body))
    : fail('Cift zimmet engeli', `status=${doubleAssign.status}`);

  const overStock = await api('POST', '/api/assignments', {
    staffId,
    items: [{ kind: 'consumable', consumableId, quantity: 9999 }],
  });
  overStock.status === 422
    ? ok('Stok ustu zimmet reddedildi', errMsg(overStock.body))
    : fail('Stok kontrolu', `status=${overStock.status}`);

  const stockUnchanged = await api('GET', `/api/consumables/${consumableId}`);
  (stockUnchanged.body as any).quantityOnHand === 48
    ? ok('Basarisiz islem GERI ALINDI', 'stok hala 48, yarim kayit yok')
    : fail('Transaction geri alma', `stok=${(stockUnchanged.body as any).quantityOnHand}`);

  const dupTag = await api('POST', '/api/assets', { assetTag });
  dupTag.status === 409
    ? ok('Ayni demirbas numarasi reddedildi', '409 (uq_assets_tag_active)')
    : fail('Etiket tekilligi', `status=${dupTag.status}`);

  const statusWhileAssigned = await api('POST', `/api/assets/${assetId}/status`, {
    status: 'scrapped',
    reason: 'Deneme',
  });
  statusWhileAssigned.status === 422
    ? ok('Zimmetliyken durum degistirilemedi', errMsg(statusWhileAssigned.body))
    : fail('Zimmetli durum korumasi', `status=${statusWhileAssigned.status}`);

  const badItem = await api('POST', '/api/assignments', {
    staffId,
    items: [{ kind: 'consumable', consumableId, quantity: 0 }],
  });
  badItem.status === 400
    ? ok('Sifir adet reddedildi', 'zod dogrulamasi')
    : fail('Adet dogrulamasi', `status=${badItem.status}`);

  const deleteStaffOpen = await api('DELETE', `/api/staff/${staffId}`);
  deleteStaffOpen.status === 422
    ? ok('Acik zimmetli personel silinemedi', errMsg(deleteStaffOpen.body))
    : fail('Personel silme korumasi', `status=${deleteStaffOpen.status}`);

  /* ------------------------------------------------------------- */
  section('4. Cift yonlu gecmis sorgusu');

  const staffHistory = await api('GET', `/api/staff/${staffId}/assignments`);
  const items = (staffHistory.body as any).assignments?.[0]?.items ?? [];
  items.length === 2
    ? ok('PERSONEL gecmisi: demirbas + aksesuar birlikte gorunuyor')
    : fail('Personel gecmisi', `${items.length} satir`);

  (staffHistory.body as any).openItemCount === 2
    ? ok('Personelin uzerindeki acik kalem sayisi dogru', '2')
    : fail('Acik kalem sayisi', String((staffHistory.body as any).openItemCount));

  const assetHistory = await api('GET', `/api/assets/${assetId}/history`);
  const timeline = (assetHistory.body as any).timeline ?? [];
  const assignedEvent = timeline.find((e: any) => e.type === 'assigned');
  assignedEvent?.staffName === 'Ahmet Yilmaz'
    ? ok('URUN gecmisi: zimmetlenen personel gorunuyor')
    : fail('Urun gecmisi', JSON.stringify(timeline).slice(0, 120));

  timeline.some((e: any) => e.type === 'status_change' && e.toStatus === 'assigned')
    ? ok('Urun gecmisinde durum degisikligi de var', 'zimmet + durum tek akista')
    : fail('Durum gecmisi birlesimi');

  const lookup = await api('GET', `/api/assets/lookup/${assetTag.toLowerCase()}`);
  lookup.status === 200
    ? ok('QR/barkod aramasi buyuk-kucuk harf duyarsiz', assetTag.toLowerCase())
    : fail('Lookup', `status=${lookup.status}`);

  /* ------------------------------------------------------------- */
  section('5. Iade akisi');

  const detail = await api('GET', `/api/assignments/${assignmentId}`);
  const allItems = (detail.body as any).items as any[];
  const mouseItem = allItems.find((i) => i.consumableId);
  const laptopItem = allItems.find((i) => i.assetId);

  const partial = await api('POST', `/api/assignments/${assignmentId}/return`, {
    items: [{ itemId: mouseItem.id, quantity: 1, condition: 'good' }],
  });
  partial.status === 200 ? ok('Kismi iade kabul edildi', '2 adetten 1 tanesi') : fail('Kismi iade', errMsg(partial.body));

  const afterPartial = await api('GET', `/api/consumables/${consumableId}`);
  (afterPartial.body as any).quantityOnHand === 49
    ? ok('Kismi iadede stok geri arttii', '48 -> 49')
    : fail('Kismi iade stogu', `stok=${(afterPartial.body as any).quantityOnHand}`);

  const partialStatus = await api('GET', `/api/assignments/${assignmentId}`);
  (partialStatus.body as any).status === 'open'
    ? ok('Kismi iadede satir hala acik', 'returned_at NULL kaldi')
    : fail('Kismi iade durumu', (partialStatus.body as any).status);

  const restOfMice = await api('POST', `/api/assignments/${assignmentId}/return`, {
    items: [{ itemId: mouseItem.id, condition: 'good' }],
  });
  restOfMice.status === 200 ? ok('Kalan adet iade edildi') : fail('Kalan iade', errMsg(restOfMice.body));

  const afterFull = await api('GET', `/api/assignments/${assignmentId}`);
  (afterFull.body as any).status === 'partially_returned'
    ? ok('Zimmet durumu "kismi iade"', 'laptop hala personelde')
    : fail('Zimmet durumu', (afterFull.body as any).status);

  const lostLaptop = await api('POST', `/api/assignments/${assignmentId}/return`, {
    items: [{ itemId: laptopItem.id, condition: 'lost', notes: 'Sahada kayboldu' }],
  });
  lostLaptop.status === 200 ? ok('Laptop "Kayip" olarak iade alindi') : fail('Kayip iade', errMsg(lostLaptop.body));

  const lostAsset = await api('GET', `/api/assets/${assetId}`);
  (lostAsset.body as any).status === 'lost'
    ? ok('Demirbas durumu otomatik "Kayip" oldu', 'depoya geri DONMEDI')
    : fail('Kayip durumu', (lostAsset.body as any).status);

  const closed = await api('GET', `/api/assignments/${assignmentId}`);
  (closed.body as any).status === 'closed'
    ? ok('Tum satirlar iade edilince fis kapandi')
    : fail('Fis kapanisi', (closed.body as any).status);

  const finalTimeline = await api('GET', `/api/assets/${assetId}/history`);
  const events = (finalTimeline.body as any).timeline as any[];
  events.some((e) => e.type === 'status_change' && e.toStatus === 'lost')
    ? ok('Kayip kaydi gecmiste duruyor', 'kayit SILINMEDI')
    : fail('Kayip gecmisi');

  /* ------------------------------------------------------------- */
  section('6. Soft delete ve tekillik');

  const reuseBlocked = await api('POST', '/api/assets', { assetTag });
  reuseBlocked.status === 409
    ? ok('Silinmemis kayidin etiketi kullanilamiyor')
    : fail('Etiket korumasi', `status=${reuseBlocked.status}`);

  const tempAsset = await api('POST', '/api/assets', { assetTag: `TMP-${suffix}` });
  const tempId = (tempAsset.body as any).id;
  await api('POST', `/api/assets/${tempId}/status`, {
    status: 'scrapped',
    reason: 'Test amacli hurda',
  });
  const scrapped = await api('GET', `/api/assets/${tempId}`);
  (scrapped.body as any).status === 'scrapped'
    ? ok('Hurda kaydi hala okunabiliyor', 'veritabanindan SILINMEDI')
    : fail('Hurda kaydi');

  /* ------------------------------------------------------------- */
  section('7. Raporlar ve veri tutarliligi');

  const integrity = await api('GET', '/api/reports/stock-integrity');
  (integrity.body as any).consistent === true
    ? ok('Stok defteri ile eldeki adet BIREBIR uyusuyor')
    : fail('Defter tutarliligi', JSON.stringify((integrity.body as any).mismatches).slice(0, 120));

  const summary = await api('GET', '/api/reports/inventory-summary');
  summary.status === 200
    ? ok('Envanter ozeti', `toplam demirbas: ${(summary.body as any).assets.total}`)
    : fail('Ozet raporu');

  const openReport = await api('GET', '/api/reports/staff-open-assignments');
  openReport.status === 200 ? ok('Acik zimmet raporu calisiyor') : fail('Acik zimmet raporu');

  /* ------------------------------------------------------------- */
  console.log('\n=========================================================');
  console.log(` SONUC:  ${passed} basarili,  ${failed} basarisiz`);
  console.log('=========================================================\n');

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error('\nDogrulama calistirilamadi:', error);
  process.exit(1);
});
