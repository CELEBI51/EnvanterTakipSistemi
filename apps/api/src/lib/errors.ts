/**
 * Uygulama hatalari ve PostgreSQL kisit ihlallerinin kullaniciya
 * anlamli Turkce mesajlara cevrilmesi.
 *
 * Veri butunlugunun asil garantisi veritabanindaki UNIQUE/CHECK
 * kisitlaridir; bu dosya o kisitlarin kullanici arayuzundeki karsiligidir.
 */

export class AppError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class BadRequestError extends AppError {
  constructor(message: string, details?: unknown) {
    super(400, 'BAD_REQUEST', message, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Oturum açmanız gerekiyor.') {
    super(401, 'UNAUTHORIZED', message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Bu işlem için yetkiniz yok.') {
    super(403, 'FORBIDDEN', message);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Kayıt bulunamadı.') {
    super(404, 'NOT_FOUND', message);
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: unknown) {
    super(409, 'CONFLICT', message, details);
  }
}

/** Is kurali ihlali: istek bicimsel olarak gecerli ama islem yapilamaz. */
export class BusinessRuleError extends AppError {
  constructor(message: string, details?: unknown) {
    super(422, 'BUSINESS_RULE', message, details);
  }
}

/* ------------------------------------------------------------------ */
/* PostgreSQL kisit adi -> kullanici mesaji                            */
/* ------------------------------------------------------------------ */

const CONSTRAINT_MESSAGES: Record<string, string> = {
  // Zimmet butunlugu
  uq_asset_open_assignment:
    'Bu demirbaş şu anda başka bir açık zimmette görünüyor. Önce mevcut zimmetten iade alınmalıdır.',
  chk_item_kind:
    'Zimmet satırı ya bir demirbaş ya da bir aksesuar olmalıdır; demirbaşta adet 1 olmak zorundadır.',
  chk_returned_quantity_range: 'İade edilen adet, zimmetlenen adetten fazla olamaz.',
  chk_return_consistency:
    'İade kaydı tutarsız: satır tamamen iade edilmeden iade tarihi yazılamaz.',

  // Stok butunlugu
  chk_consumables_qty_non_negative:
    'Stok adedi negatife düşemez. Talep edilen adet mevcut stoktan fazla.',
  chk_stock_movements_balance: 'Stok bakiyesi negatife düşemez.',
  chk_stock_movements_qty_nonzero: 'Stok hareketi sıfır adet olamaz.',
  chk_consumables_package_size: 'Koli içi adet en az 1 olmalıdır.',
  chk_consumables_min_stock: 'Kritik stok seviyesi negatif olamaz.',

  // Tekillik (soft delete ile uyumlu partial index'ler)
  uq_assets_tag_active: 'Bu demirbaş numarası zaten kayıtlı.',
  uq_assets_serial_active: 'Bu seri numarası zaten başka bir demirbaşa tanımlı.',
  uq_staff_employee_no_active: 'Bu sicil numarası zaten kayıtlı.',
  uq_consumables_sku_active: 'Bu stok kodu zaten kullanılıyor.',
  uq_departments_name_active: 'Bu isimde bir departman zaten var.',
  uq_departments_code_active: 'Bu departman kodu zaten kullanılıyor.',
  uq_categories_name_kind_active: 'Bu isimde bir kategori zaten var.',
  uq_users_username_active: 'Bu kullanıcı adı zaten kayıtlı.',
  uq_assignments_no: 'Bu zimmet fiş numarası zaten kullanılmış.',
};

interface PostgresError {
  code: string;
  constraint?: string;
  detail?: string;
  table?: string;
}

/** PostgreSQL SQLSTATE kodlari her zaman 5 karakterdir (23505, 40P01 ...). */
const SQLSTATE_PATTERN = /^[0-9A-Z]{5}$/;

/**
 * Gercek PostgreSQL hatasini bulur.
 *
 * Drizzle surucu hatasini `DrizzleQueryError` icine sarar; SQLSTATE kodu
 * ust seviyede degil `cause` zincirinde durur. Zincir taranmazsa her
 * unique/check ihlali 500 olarak doner ve kullanici anlamsiz bir hata gorur.
 */
function findPostgresError(error: unknown, depth = 0): PostgresError | null {
  if (depth > 5 || typeof error !== 'object' || error === null) return null;

  const candidate = error as { code?: unknown; cause?: unknown };
  if (typeof candidate.code === 'string' && SQLSTATE_PATTERN.test(candidate.code)) {
    return error as PostgresError;
  }

  return findPostgresError(candidate.cause, depth + 1);
}

/**
 * PostgreSQL hatasini AppError'a cevirir.
 * Eslesme bulunamazsa null doner ve hata 500 olarak islenir.
 */
export function mapDatabaseError(rawError: unknown): AppError | null {
  const error = findPostgresError(rawError);
  if (!error) return null;

  const constraint = error.constraint ?? '';
  const known = CONSTRAINT_MESSAGES[constraint];

  switch (error.code) {
    case '23505': // unique_violation
      return new ConflictError(known ?? 'Bu kayıt zaten mevcut.', { constraint });

    case '23514': // check_violation
      return new BusinessRuleError(known ?? 'İşlem veri bütünlüğü kurallarına aykırı.', {
        constraint,
      });

    case '23503': // foreign_key_violation
      return new ConflictError(
        'İlişkili kayıtlar bulunduğu için bu işlem yapılamıyor.',
        { constraint },
      );

    case '23502': // not_null_violation
      return new BadRequestError('Zorunlu bir alan boş bırakılamaz.', { constraint });

    case '22001': // string_data_right_truncation
      return new BadRequestError('Girilen değer izin verilen uzunluğu aşıyor.');

    case '40001': // serialization_failure
    case '40P01': // deadlock_detected
      return new ConflictError(
        'İşlem aynı anda başka bir işlemle çakıştı. Lütfen tekrar deneyin.',
      );

    default:
      return null;
  }
}
