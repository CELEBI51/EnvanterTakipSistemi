import { createLog } from '../services/log.service.js';

// Route Rules Definition
const ROUTE_RULES = [
  // Hardware / Varlık
  { method: 'POST', pattern: '/api/hardware/barcodes/pdf', description: "Toplu barkod PDF'i oluşturuldu", module: 'hardware', action: 'EXPORT' },
  { method: 'GET', pattern: '/api/hardware/export', description: "Varlık listesi Excel'e aktarıldı", module: 'hardware', action: 'EXPORT' },
  { method: 'POST', pattern: '/api/hardware/:id/maintenance', description: 'Bakım kaydı oluşturuldu', module: 'hardware', action: 'CREATE' },
  { method: 'POST', pattern: '/api/hardware', description: 'Yeni varlık eklendi', module: 'hardware', action: 'CREATE' },
  { method: 'PUT', pattern: '/api/hardware/:id', description: 'Varlık bilgileri güncellendi', module: 'hardware', action: 'UPDATE' },
  { method: 'DELETE', pattern: '/api/hardware/:id', description: 'Varlık silindi', module: 'hardware', action: 'DELETE' },

  // Maintenance / Bakım
  { method: 'PUT', pattern: '/api/maintenance/:id/complete', description: 'Bakım tamamlandı', module: 'maintenance', action: 'UPDATE' },

  // Assignments & Returns / Zimmet & İade
  { method: 'GET', pattern: '/api/assignments/export', description: "Zimmet listesi Excel'e aktarıldı", module: 'assignment', action: 'EXPORT' },
  { method: 'POST', pattern: '/api/assignments', description: 'Zimmet oluşturuldu', module: 'assignment', action: 'CREATE' },
  { method: 'GET', pattern: '/api/returns/export', description: "Zimmet iade listesi Excel'e aktarıldı", module: 'return', action: 'EXPORT' },
  { method: 'POST', pattern: '/api/returns', description: 'Zimmet iadesi alındı', module: 'return', action: 'CREATE' },

  // Accessories / Aksesuar
  { method: 'GET', pattern: '/api/accessories/export', description: "Aksesuar listesi Excel'e aktarıldı", module: 'accessory', action: 'EXPORT' },
  { method: 'POST', pattern: '/api/accessories/:id/restock', description: 'Aksesuar stoğu artırıldı', module: 'accessory', action: 'UPDATE' },
  { method: 'POST', pattern: '/api/accessories/:id/mark-defective', description: 'Aksesuar arızalı ayrıldı', module: 'accessory', action: 'UPDATE' },
  { method: 'POST', pattern: '/api/accessories', description: 'Aksesuar eklendi', module: 'accessory', action: 'CREATE' },
  { method: 'PUT', pattern: '/api/accessories/:id', description: 'Aksesuar güncellendi', module: 'accessory', action: 'UPDATE' },
  { method: 'DELETE', pattern: '/api/accessories/:id', description: 'Aksesuar silindi', module: 'accessory', action: 'DELETE' },

  // Consumables / Sarf Malzeme
  { method: 'GET', pattern: '/api/consumables/export', description: "Sarf malzeme listesi Excel'e aktarıldı", module: 'consumable', action: 'EXPORT' },
  { method: 'POST', pattern: '/api/consumables/:id/restock', description: 'Sarf malzeme stoğu artırıldı', module: 'consumable', action: 'UPDATE' },
  { method: 'POST', pattern: '/api/consumables/:id/issue', description: 'Sarf malzeme düşümü yapıldı', module: 'consumable', action: 'UPDATE' },
  { method: 'POST', pattern: '/api/consumables', description: 'Sarf malzeme eklendi', module: 'consumable', action: 'CREATE' },
  { method: 'PUT', pattern: '/api/consumables/:id', description: 'Sarf malzeme güncellendi', module: 'consumable', action: 'UPDATE' },
  { method: 'DELETE', pattern: '/api/consumables/:id', description: 'Sarf malzeme silindi', module: 'consumable', action: 'DELETE' },

  // Components / Bileşen
  { method: 'GET', pattern: '/api/components/export', description: "Bileşen listesi Excel'e aktarıldı", module: 'component', action: 'EXPORT' },
  { method: 'POST', pattern: '/api/components/:id/restock', description: 'Bileşen stoğu artırıldı', module: 'component', action: 'UPDATE' },
  { method: 'POST', pattern: '/api/components', description: 'Bileşen eklendi', module: 'component', action: 'CREATE' },
  { method: 'PUT', pattern: '/api/components/:id', description: 'Bileşen güncellendi', module: 'component', action: 'UPDATE' },
  { method: 'DELETE', pattern: '/api/components/:id', description: 'Bileşen silindi', module: 'component', action: 'DELETE' },

  // Licenses / Lisans
  { method: 'GET', pattern: '/api/licenses/export', description: "Lisans listesi Excel'e aktarıldı", module: 'license', action: 'EXPORT' },
  { method: 'PATCH', pattern: '/api/licenses/:id/status', description: 'Lisans durumu güncellendi', module: 'license', action: 'UPDATE' },
  { method: 'POST', pattern: '/api/licenses', description: 'Lisans eklendi', module: 'license', action: 'CREATE' },
  { method: 'PUT', pattern: '/api/licenses/:id', description: 'Lisans güncellendi', module: 'license', action: 'UPDATE' },

  // Employees / Personel
  { method: 'GET', pattern: '/api/employees/export', description: "Personel listesi Excel'e aktarıldı", module: 'employee', action: 'EXPORT' },
  { method: 'PATCH', pattern: '/api/employees/:id/status', description: 'Personel durumu güncellendi', module: 'employee', action: 'UPDATE' },
  { method: 'POST', pattern: '/api/employees', description: 'Personel eklendi', module: 'employee', action: 'CREATE' },
  { method: 'PUT', pattern: '/api/employees/:id', description: 'Personel bilgileri güncellendi', module: 'employee', action: 'UPDATE' },

  // Units / Birim
  { method: 'POST', pattern: '/api/units', description: 'Birim eklendi', module: 'unit', action: 'CREATE' },
  { method: 'PUT', pattern: '/api/units/:id', description: 'Birim güncellendi', module: 'unit', action: 'UPDATE' },
  { method: 'DELETE', pattern: '/api/units/:id', description: 'Birim pasife alındı', module: 'unit', action: 'DELETE' },

  // Categories / Kategori
  { method: 'POST', pattern: '/api/categories', description: 'Kategori eklendi', module: 'category', action: 'CREATE' },
  { method: 'PUT', pattern: '/api/categories/:id', description: 'Kategori güncellendi', module: 'category', action: 'UPDATE' },
  { method: 'DELETE', pattern: '/api/categories/:id', description: 'Kategori silindi', module: 'category', action: 'DELETE' },

  // Settings / Ayarlar
  { method: 'POST', pattern: '/api/settings/logo', description: 'Şirket logosu güncellendi', module: 'settings', action: 'UPDATE' },
  { method: 'PUT', pattern: '/api/settings/email-templates/:type', description: 'E-posta şablonu güncellendi', module: 'settings', action: 'UPDATE' },
  { method: 'GET', pattern: '/api/settings/backup', description: 'Sistem yedeği indirildi', module: 'settings', action: 'EXPORT' },
  { method: 'POST', pattern: '/api/settings/restore', description: 'Sistem yedeği yüklendi', module: 'settings', action: 'UPDATE' },
  { method: 'PUT', pattern: '/api/settings', description: 'Sistem ayarları güncellendi', module: 'settings', action: 'UPDATE' },

  // Users / Kullanıcı
  { method: 'POST', pattern: '/api/users', description: 'Kullanıcı oluşturuldu', module: 'user', action: 'CREATE' },
  { method: 'PUT', pattern: '/api/users/:id', description: 'Kullanıcı güncellendi', module: 'user', action: 'UPDATE' },
  { method: 'DELETE', pattern: '/api/users/:id', description: 'Kullanıcı silindi', module: 'user', action: 'DELETE' },

  // Import / İçe Aktarma
  { method: 'POST', pattern: '/api/import/:moduleKey/commit', description: "Excel'den toplu veri aktarıldı", module: 'import', action: 'CREATE' },
];

// Helper to convert route pattern like /api/hardware/:id to RegExp
function compilePattern(pattern) {
  const regexStr = '^' + pattern.replace(/:[a-zA-Z0-9_]+/g, '[^/]+') + '$';
  return new RegExp(regexStr);
}

const COMPILED_RULES = ROUTE_RULES.map((rule) => ({
  ...rule,
  regex: compilePattern(rule.pattern),
}));

// Module name fallback parser
const MODULE_MAP = {
  hardware: 'hardware',
  assignments: 'assignment',
  returns: 'return',
  accessories: 'accessory',
  consumables: 'consumable',
  components: 'component',
  licenses: 'license',
  employees: 'employee',
  users: 'user',
  settings: 'settings',
  units: 'unit',
  categories: 'category',
  maintenance: 'maintenance',
  import: 'import',
};

function parseModuleName(cleanPath) {
  const parts = cleanPath.split('/').filter(Boolean);
  if (parts.length >= 2 && parts[0] === 'api') {
    const rawKey = parts[1];
    return MODULE_MAP[rawKey] || rawKey;
  }
  if (parts.length >= 1) {
    return MODULE_MAP[parts[0]] || parts[0];
  }
  return 'system';
}

export const activityLogMiddleware = (req, res, next) => {
  const method = req.method.toUpperCase();
  const path = req.originalUrl || req.url || '';
  const cleanPath = path.split('?')[0];

  // 1. Exclude auth endpoints that are manually logged
  if (cleanPath.includes('/api/auth/login') || cleanPath.includes('/api/auth/logout')) {
    return next();
  }

  // 2. Find matching Turkish rule
  const matchedRule = COMPILED_RULES.find(
    (rule) => rule.method === method && rule.regex.test(cleanPath)
  );

  // If no matched rule AND it's a GET request, skip automatic logging
  if (!matchedRule && method === 'GET') {
    return next();
  }

  // Hook into response finish event
  res.on('finish', () => {
    // Only log successful requests (status 2xx)
    if (res.statusCode >= 200 && res.statusCode < 300) {
      let action = matchedRule?.action;
      if (!action) {
        if (method === 'POST') action = 'CREATE';
        else if (method === 'DELETE') action = 'DELETE';
        else action = 'UPDATE';
      }

      const moduleName = matchedRule?.module || parseModuleName(cleanPath);
      const email = req.user?.email || 'Anonim';

      // Use Turkish description if matched; otherwise fallback to technical description
      const description = matchedRule
        ? matchedRule.description
        : `${email} — ${method} ${cleanPath} (${res.statusCode})`;

      createLog({
        userId: req.user?.id || null,
        userEmail: req.user?.email || null,
        action,
        module: moduleName,
        description,
        ipAddress: req.ip || req.socket?.remoteAddress || null,
        statusCode: res.statusCode,
      });
    }
  });

  next();
};
