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
