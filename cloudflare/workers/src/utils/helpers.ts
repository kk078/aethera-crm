/**
 * Utility Helper Functions
 */

// ============================================
// ID Generation
// ============================================

export function generateId(): string {
  return crypto.randomUUID();
}

// ============================================
// Date Utilities
// ============================================

export function formatDate(date: Date): string {
  return date.toISOString();
}

export function parseDate(dateString: string): Date {
  return new Date(dateString);
}

export function getDaysUntil(dateString: string): number {
  const targetDate = new Date(dateString);
  const today = new Date();
  const diffTime = targetDate.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function isOverdue(dateString: string): boolean {
  return getDaysUntil(dateString) < 0;
}

// ============================================
// String Utilities
// ============================================

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

export function truncate(text: string, length: number): string {
  if (text.length <= length) return text;
  return text.slice(0, length) + '...';
}

export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

export function camelToKebab(str: string): string {
  return str.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);
}

// ============================================
// Number Utilities
// ============================================

export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num);
}

export function calculatePercentage(value: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((value / total) * 100);
}

// ============================================
// Array Utilities
// ============================================

export function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

export function uniqueArray<T>(array: T[]): T[] {
  return Array.from(new Set(array));
}

export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// ============================================
// Object Utilities
// ============================================

export function pick<T extends object, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
  const result = {} as Pick<T, K>;
  for (const key of keys) {
    if (key in obj) {
      result[key] = obj[key];
    }
  }
  return result;
}

export function omit<T extends object, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> {
  const result = { ...obj };
  for (const key of keys) {
    delete result[key];
  }
  return result as Omit<T, K>;
}

export function isEmpty(obj: object): boolean {
  return Object.keys(obj).length === 0;
}

// ============================================
// Phone Number Utilities
// ============================================

export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
  if (match) {
    return `(${match[1]}) ${match[2]}-${match[3]}`;
  }
  return phone;
}

export function isValidPhone(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length >= 10 && cleaned.length <= 15;
}

// ============================================
// Email Utilities
// ============================================

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function extractDomain(email: string): string {
  const parts = email.split('@');
  return parts.length === 2 ? parts[1] : '';
}

export function generateEmailPattern(firstName: string, lastName: string, domain: string): string[] {
  const patterns: string[] = [];
  const first = firstName.toLowerCase();
  const last = lastName.toLowerCase();
  
  patterns.push(`${first}.${last}@${domain}`);
  patterns.push(`${first}${last}@${domain}`);
  patterns.push(`${first.charAt(0)}${last}@${domain}`);
  patterns.push(`${first}@${domain}`);
  
  return patterns;
}

// ============================================
// NPI Utilities
// ============================================

export function isValidNPI(npi: string): boolean {
  if (!/^\d{10}$/.test(npi)) return false;
  
  // NPI checksum validation
  const digits = npi.split('').map(Number);
  let sum = 0;
  
  for (let i = 0; i < 9; i++) {
    sum += digits[i] * (i % 2 + 1);
  }
  
  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit === digits[9];
}

export function extractNPIChecksum(npi: string): number {
  return parseInt(npi.charAt(9));
}

// ============================================
// Pagination Utilities
// ============================================

export function calculatePagination(
  page: number,
  perPage: number,
  total: number
): {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
} {
  const totalPages = Math.ceil(total / perPage);
  const hasMore = page < totalPages;
  
  return {
    page,
    perPage,
    total,
    totalPages,
    hasMore,
  };
}

// ============================================
// Search Utilities
// ============================================

export function buildSearchQuery(
  searchTerm: string,
  columns: string[]
): string {
  if (!searchTerm) return '';
  
  const searchPatterns = columns.map(col => `${col} LIKE ?`);
  const searchValue = `%${searchTerm}%`;
  
  return `(${searchPatterns.join(' OR ')})`;
}

export function getSearchBindings(searchTerm: string, columns: string[]): string[] {
  if (!searchTerm) return [];
  return Array(columns.length).fill(`%${searchTerm}%`);
}

// ============================================
// Cache Utilities
// ============================================

export function generateCacheKey(prefix: string, ...args: any[]): string {
  return `${prefix}:${args.map(arg => JSON.stringify(arg)).join(':')}`;
}

export function isCacheExpired(cacheTime: number, ttl: number): boolean {
  return Date.now() - cacheTime > ttl;
}

// ============================================
// Database Utilities (Safe Query Wrapper)
// ============================================

// Safe query wrapper that never throws - always returns empty array on error
export async function safeD1Query<T = any>(
  db: any,
  sql: string,
  bindings: any[] = []
): Promise<T[]> {
  try {
    const result = await db.prepare(sql).bind(...bindings).all();
    return result.results || [];
  } catch (error: any) {
    console.error('[SAFE-D1-QUERY] Query failed:', error?.message || error);
    return [];
  }
}

// Safe query first wrapper
export async function safeD1First<T = any>(
  db: any,
  sql: string,
  bindings: any[] = []
): Promise<T | null> {
  try {
    const result = await db.prepare(sql).bind(...bindings).first();
    return result || null;
  } catch (error: any) {
    console.error('[SAFE-D1-FIRST] Query failed:', error?.message || error);
    return null;
  }
}

// Safe execute wrapper
export async function safeD1Execute(
  db: any,
  sql: string,
  bindings: any[] = []
): Promise<void> {
  try {
    await db.prepare(sql).bind(...bindings).run();
  } catch (error: any) {
    console.error('[SAFE-D1-EXECUTE] Query failed:', error?.message || error);
    // Don't throw - fail silently to prevent UI crash
  }
}

// ============================================
// Schema-Aware Database Accessor
// ============================================

/**
 * Schema-aware safe query wrapper
 * Returns a structured response that includes status for migration detection
 */
export interface SchemaAwareQueryResult<T = any> {
  data: T;
  status: 'success' | 'pending' | 'error';
  error?: string;
  tableMissing?: boolean;
}

/**
 * Standardized API response structure
 * Ensures consistent response format across all endpoints
 */
export interface StandardizedResponse<T = any> {
  data: T | null;
  error: string | null;
  meta: {
    schema_version: string;
    table_status: 'ready' | 'missing';
  };
}

/**
 * Schema-aware D1 query that detects missing tables and returns mock data when needed
 * This prevents 500 errors and allows graceful degradation
 */
export async function safeD1QuerySchemaAware<T = any>(
  db: any,
  sql: string,
  bindings: any[] = []
): Promise<SchemaAwareQueryResult<T[]>> {
  try {
    const result = await db.prepare(sql).bind(...bindings).all();
    return {
      data: result.results || [],
      status: 'success',
    };
  } catch (error: any) {
    const errorMessage = error?.message || error;
    console.error('[SAFE-D1-QUERY-SCHEMA] Query failed:', errorMessage);

    // Detect if table is missing
    const isTableMissing = errorMessage.includes('no such table') || errorMessage.includes('no such column');

    // For missing tables, return empty result with pending status
    // This allows the frontend to gracefully handle the missing table case
    return {
      data: [] as T[],
      status: 'pending',
      error: isTableMissing ? 'Database migration pending' : 'Database query failed',
      tableMissing: isTableMissing,
    };
  }
}

/**
 * Schema-aware D1 first query
 */
export async function safeD1FirstSchemaAware<T = any>(
  db: any,
  sql: string,
  bindings: any[] = []
): Promise<SchemaAwareQueryResult<T | null>> {
  try {
    const result = await db.prepare(sql).bind(...bindings).first();
    return {
      data: result || null,
      status: 'success',
    };
  } catch (error: any) {
    const errorMessage = error?.message || error;
    console.error('[SAFE-D1-FIRST-SCHEMA] Query failed:', errorMessage);

    const isTableMissing = errorMessage.includes('no such table') || errorMessage.includes('no such column');

    return {
      data: null,
      status: 'pending',
      error: isTableMissing ? 'Database migration pending' : 'Database query failed',
      tableMissing: isTableMissing,
    };
  }
}

/**
 * Get list of all tables in the database
 * Used for diagnostic purposes to identify missing tables
 */
export async function getDatabaseTableList(db: any): Promise<string[]> {
  try {
    const result = await db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
    return result.results?.map((r: any) => r.name) || [];
  } catch (error: any) {
    console.error('[GET-TABLES] Failed to get table list:', error?.message || error);
    return [];
  }
}

// ============================================
// Schema Sentinel - Route to Table Mapping
// ============================================

/**
 * Map API routes to their primary database tables
 * Used by schema sentinel middleware to check table existence before route execution
 */
export const ROUTE_TABLE_MAP: Record<string, string> = {
  // Contacts
  '/contacts': 'contacts',
  '/contacts/:id': 'contacts',

  // Organizations
  '/organizations': 'organizations',
  '/organizations/:id': 'organizations',

  // Leads
  '/leads': 'leads',
  '/leads/:id': 'leads',

  // Deals
  '/deals': 'deals',
  '/deals/:id': 'deals',

  // Activities
  '/activities': 'activities',
  '/activities/:id': 'activities',

  // Emails
  '/emails': 'emails',
  '/emails/:id': 'emails',

  // Providers
  '/providers': 'npi_providers',
  '/providers/:id': 'npi_providers',

  // Campaigns
  '/campaigns': 'campaigns',
  '/campaigns/:id': 'campaigns',

  // Tasks
  '/tasks': 'tasks',
  '/tasks/:id': 'tasks',

  // Workflows
  '/workflows': 'workflows',
  '/workflows/:id': 'workflows',

  // Settings
  '/settings': 'settings',
  '/settings/:id': 'settings',

  // Backup
  '/backup': 'backups',
  '/backup/:id': 'backups',

  // Onboarding (exact + wildcard for sub-routes)
  '/onboarding': 'onboarding_checklists',
  '/onboarding/*': 'onboarding_checklists',
  '/onboarding/:id': 'onboarding_checklists',

  // Document Vault (exact + wildcard for sub-routes)
  '/document-vault': 'document_vault',
  '/document-vault/*': 'document_vault',
  '/document-vault/:id': 'document_vault',

  // Technical Setup (exact + wildcard for sub-routes)
  '/technical-setup': 'technical_setup',
  '/technical-setup/*': 'technical_setup',
  '/technical-setup/:id': 'technical_setup',

  // Payer Enrollment (exact + wildcard for sub-routes)
  '/payer-enrollment': 'payer_enrollment',
  '/payer-enrollment/*': 'payer_enrollment',
  '/payer-enrollment/:id': 'payer_enrollment',

  // Compliance (exact + wildcard for sub-routes)
  '/compliance': 'compliance',
  '/compliance/*': 'compliance',
  '/compliance/:id': 'compliance',

  // Call Queue (exact + wildcard for sub-routes)
  '/call-queue': 'call_queue',
  '/call-queue/*': 'call_queue',
  '/call-queue/:id': 'call_queue',

  // Call Analytics (exact + wildcard for sub-routes)
  '/call-analytics': 'phone_calls',
  '/call-analytics/*': 'phone_calls',
  '/call-analytics/:id': 'phone_calls',

  // Debug (no table check needed - diagnostic route)
  '/debug': null,
  '/debug/:id': null,

  // Onboarding Configuration (no table check needed)
  '/onboarding/statuses': null,
  '/onboarding/pipeline/stages': null,
};

/**
 * Extract table name from a route path
 * Handles wildcards and parameterized routes
 */
export function getTableForRoute(path: string): string | null {
  // Remove /api/v1 prefix if present
  const cleanPath = path.replace('/api/v1', '');

  // Check exact match first (including null for routes that should skip table check)
  const exactTable = ROUTE_TABLE_MAP[cleanPath];
  if (exactTable !== undefined) {
    return exactTable;
  }

  // Check for prefix match (e.g., /contacts/* matches /contacts)
  // Only match routes that explicitly end with '/*' (wildcard) or '/:id'
  for (const [route, table] of Object.entries(ROUTE_TABLE_MAP)) {
    // Only match wildcard routes (ending with /*) or explicit /:id routes
    if (route.endsWith('/*')) {
      const baseRoute = route.replace(/\/\*$/, '');
      if (cleanPath.startsWith(baseRoute + '/')) {
        return table;
      }
    } else if (route.endsWith('/:id')) {
      const baseRoute = route.replace(/\/:id$/, '');
      if (cleanPath === baseRoute || cleanPath.startsWith(baseRoute + '/')) {
        return table;
      }
    }
  }

  return null;
}

/**
 * Check if a table exists in the database
 * Uses parameterized query to prevent SQL injection
 */
export async function checkTableExists(db: any, tableName: string): Promise<'ok' | 'migration_pending'> {
  // Validate tableName to prevent SQL injection
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tableName)) {
    return 'migration_pending';
  }

  try {
    const query = "SELECT name FROM sqlite_master WHERE type='table' AND name=?";
    const result = await db.prepare(query).bind(tableName).all();

    if (result.results && result.results.length > 0) {
      return 'ok';
    }
    return 'migration_pending';
  } catch (error: any) {
    return 'migration_pending';
  }
}

/**
 * Get migration pending status for a route
 * Returns table status and skeleton response if table is missing
 */
export interface MigrationStatus {
  tableStatus: 'ready' | 'missing';
  tableName: string | null;
  needsMigration: boolean;
}

export async function getRouteMigrationStatus(db: any, path: string): Promise<MigrationStatus> {
  const tableName = getTableForRoute(path);
  if (!tableName) {
    return { tableStatus: 'ready', tableName: null, needsMigration: false };
  }

  const status = await checkTableExists(db, tableName);
  return {
    tableStatus: status === 'ok' ? 'ready' : 'missing',
    tableName: tableName,
    needsMigration: status === 'migration_pending',
  };
}
