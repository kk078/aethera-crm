import { generateId } from './helpers';
// ErrorLogger service for centralized webhook error logging
export class ErrorLogger {
    db;
    source;
    constructor(db, source = 'twilio-webhook') {
        this.db = db;
        this.source = source;
    }
    async logError(error, payload) {
        try {
            const id = generateId();
            const message = error instanceof Error ? error.message : String(error);
            const stackTrace = error instanceof Error ? error.stack : undefined;
            await this.db.prepare(`
        INSERT INTO system_logs (id, level, source, message, payload, stack_trace, created_at)
        VALUES (?, 'ERROR', ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `).bind(id, this.source, message, payload ? JSON.stringify(payload) : null, stackTrace || null).run();
        }
        catch (e) {
            // Silently fail - if system logging fails, we don't want to cascade
            console.error('Failed to log error to system_logs:', e);
        }
    }
    async logWarning(message, payload) {
        try {
            const id = generateId();
            await this.db.prepare(`
        INSERT INTO system_logs (id, level, source, message, payload, created_at)
        VALUES (?, 'WARNING', ?, ?, ?, CURRENT_TIMESTAMP)
      `).bind(id, this.source, message, payload ? JSON.stringify(payload) : null).run();
        }
        catch (e) {
            console.error('Failed to log warning to system_logs:', e);
        }
    }
    async logInfo(message, payload) {
        try {
            const id = generateId();
            await this.db.prepare(`
        INSERT INTO system_logs (id, level, source, message, payload, created_at)
        VALUES (?, 'INFO', ?, ?, ?, CURRENT_TIMESTAMP)
      `).bind(id, this.source, message, payload ? JSON.stringify(payload) : null).run();
        }
        catch (e) {
            console.error('Failed to log info to system_logs:', e);
        }
    }
    static async logToSystem(db, level, source, message, payload) {
        try {
            const id = generateId();
            await db.prepare(`
        INSERT INTO system_logs (id, level, source, message, payload, created_at)
        VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `).bind(id, level, source, message, payload ? JSON.stringify(payload) : null).run();
        }
        catch (e) {
            console.error('Failed to log to system_logs:', e);
        }
    }
}
