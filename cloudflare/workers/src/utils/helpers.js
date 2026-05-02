/**
 * Utility Helper Functions
 */
// ============================================
// ID Generation
// ============================================
export function generateId() {
    return crypto.randomUUID();
}
// ============================================
// Date Utilities
// ============================================
export function formatDate(date) {
    return date.toISOString();
}
export function parseDate(dateString) {
    return new Date(dateString);
}
export function getDaysUntil(dateString) {
    const targetDate = new Date(dateString);
    const today = new Date();
    const diffTime = targetDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}
export function isOverdue(dateString) {
    return getDaysUntil(dateString) < 0;
}
// ============================================
// String Utilities
// ============================================
export function slugify(text) {
    return text
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
}
export function truncate(text, length) {
    if (text.length <= length)
        return text;
    return text.slice(0, length) + '...';
}
export function capitalize(text) {
    return text.charAt(0).toUpperCase() + text.slice(1);
}
export function camelToSnake(str) {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}
export function camelToKebab(str) {
    return str.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);
}
// ============================================
// Number Utilities
// ============================================
export function formatCurrency(amount, currency = 'USD') {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
    }).format(amount);
}
export function formatNumber(num) {
    return new Intl.NumberFormat('en-US').format(num);
}
export function calculatePercentage(value, total) {
    if (total === 0)
        return 0;
    return Math.round((value / total) * 100);
}
// ============================================
// Array Utilities
// ============================================
export function chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
        chunks.push(array.slice(i, i + size));
    }
    return chunks;
}
export function uniqueArray(array) {
    return Array.from(new Set(array));
}
export function shuffleArray(array) {
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
export function pick(obj, keys) {
    const result = {};
    for (const key of keys) {
        if (key in obj) {
            result[key] = obj[key];
        }
    }
    return result;
}
export function omit(obj, keys) {
    const result = { ...obj };
    for (const key of keys) {
        delete result[key];
    }
    return result;
}
export function isEmpty(obj) {
    return Object.keys(obj).length === 0;
}
// ============================================
// Phone Number Utilities
// ============================================
export function formatPhoneNumber(phone) {
    const cleaned = phone.replace(/\D/g, '');
    const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
    if (match) {
        return `(${match[1]}) ${match[2]}-${match[3]}`;
    }
    return phone;
}
export function isValidPhone(phone) {
    const cleaned = phone.replace(/\D/g, '');
    return cleaned.length >= 10 && cleaned.length <= 15;
}
// ============================================
// Email Utilities
// ============================================
export function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}
export function extractDomain(email) {
    const parts = email.split('@');
    return parts.length === 2 ? parts[1] : '';
}
export function generateEmailPattern(firstName, lastName, domain) {
    const patterns = [];
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
export function isValidNPI(npi) {
    if (!/^\d{10}$/.test(npi))
        return false;
    // NPI checksum validation
    const digits = npi.split('').map(Number);
    let sum = 0;
    for (let i = 0; i < 9; i++) {
        sum += digits[i] * (i % 2 + 1);
    }
    const checkDigit = (10 - (sum % 10)) % 10;
    return checkDigit === digits[9];
}
export function extractNPIChecksum(npi) {
    return parseInt(npi.charAt(9));
}
// ============================================
// Pagination Utilities
// ============================================
export function calculatePagination(page, perPage, total) {
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
export function buildSearchQuery(searchTerm, columns) {
    if (!searchTerm)
        return '';
    const searchPatterns = columns.map(col => `${col} LIKE ?`);
    const searchValue = `%${searchTerm}%`;
    return `(${searchPatterns.join(' OR ')})`;
}
export function getSearchBindings(searchTerm, columns) {
    if (!searchTerm)
        return [];
    return Array(columns.length).fill(`%${searchTerm}%`);
}
// ============================================
// Cache Utilities
// ============================================
export function generateCacheKey(prefix, ...args) {
    return `${prefix}:${args.map(arg => JSON.stringify(arg)).join(':')}`;
}
export function isCacheExpired(cacheTime, ttl) {
    return Date.now() - cacheTime > ttl;
}
// ============================================
// Database Utilities (Safe Query Wrapper)
// ============================================
// Safe query wrapper that never throws - always returns empty array on error
export async function safeD1Query(db, sql, bindings = []) {
    try {
        const result = await db.prepare(sql).bind(...bindings).all();
        return result.results || [];
    }
    catch (error) {
        console.error('[SAFE-D1-QUERY] Query failed:', error?.message || error);
        return [];
    }
}
// Safe query first wrapper
export async function safeD1First(db, sql, bindings = []) {
    try {
        const result = await db.prepare(sql).bind(...bindings).first();
        return result || null;
    }
    catch (error) {
        console.error('[SAFE-D1-FIRST] Query failed:', error?.message || error);
        return null;
    }
}
// Safe execute wrapper
export async function safeD1Execute(db, sql, bindings = []) {
    try {
        await db.prepare(sql).bind(...bindings).run();
    }
    catch (error) {
        console.error('[SAFE-D1-EXECUTE] Query failed:', error?.message || error);
        // Don't throw - fail silently to prevent UI crash
    }
}
/**
 * Schema-aware D1 query that detects missing tables and returns mock data when needed
 * This prevents 500 errors and allows graceful degradation
 */
export async function safeD1QuerySchemaAware(db, sql, bindings = []) {
    try {
        const result = await db.prepare(sql).bind(...bindings).all();
        return {
            data: result.results || [],
            status: 'success',
        };
    }
    catch (error) {
        const errorMessage = error?.message || error;
        console.error('[SAFE-D1-QUERY-SCHEMA] Query failed:', errorMessage);
        // Detect if table is missing
        const isTableMissing = errorMessage.includes('no such table') || errorMessage.includes('no such column');
        // For missing tables, return empty result with pending status
        // This allows the frontend to gracefully handle the missing table case
        return {
            data: [],
            status: 'pending',
            error: isTableMissing ? 'Database migration pending' : 'Database query failed',
            tableMissing: isTableMissing,
        };
    }
}
/**
 * Schema-aware D1 first query
 */
export async function safeD1FirstSchemaAware(db, sql, bindings = []) {
    try {
        const result = await db.prepare(sql).bind(...bindings).first();
        return {
            data: result || null,
            status: 'success',
        };
    }
    catch (error) {
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
export async function getDatabaseTableList(db) {
    try {
        const result = await db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
        return result.results?.map((r) => r.name) || [];
    }
    catch (error) {
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
export const ROUTE_TABLE_MAP = {
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
    // Onboarding
    '/onboarding': 'onboarding_checklists',
    '/onboarding/:id': 'onboarding_checklists',
    // Document Vault
    '/document-vault': 'document_vault',
    '/document-vault/:id': 'document_vault',
    // Technical Setup
    '/technical-setup': 'technical_setup',
    '/technical-setup/:id': 'technical_setup',
    // Payer Enrollment
    '/payer-enrollment': 'payer_enrollment',
    '/payer-enrollment/:id': 'payer_enrollment',
    // Compliance
    '/compliance': 'compliance',
    '/compliance/:id': 'compliance',
    // Call Queue
    '/call-queue': 'call_queue',
    '/call-queue/:id': 'call_queue',
    // Call Analytics
    '/call-analytics': 'phone_calls',
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
export function getTableForRoute(path) {
    // Remove /api/v1 prefix if present
    const cleanPath = path.replace('/api/v1', '');
    // Check exact match first
    if (ROUTE_TABLE_MAP[cleanPath]) {
        return ROUTE_TABLE_MAP[cleanPath];
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
        }
        else if (route.endsWith('/:id')) {
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
 */
export async function checkTableExists(db, tableName) {
    try {
        const result = await db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='${tableName}'`).all();
        if (result.results && result.results.length > 0) {
            return 'ok';
        }
        return 'migration_pending';
    }
    catch (error) {
        console.error('[CHECK-TABLE] Error checking table existence:', error?.message || error);
        return 'migration_pending';
    }
}
export async function getRouteMigrationStatus(db, path) {
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
