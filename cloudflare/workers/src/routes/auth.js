import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { SignJWT } from 'jose';
import { loginSchema } from '../utils/validation';
export const authRoutes = new Hono();
// Simple password hash using Web Crypto API (SHA-256 + salt)
async function hashPassword(password, salt) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password + salt);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return salt + ':' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
async function verifyPassword(password, hash) {
    try {
        const parts = hash.split(':');
        if (parts.length !== 2)
            return false;
        const salt = parts[0];
        const expectedHash = parts[1];
        const computedHash = await hashPassword(password, salt);
        return computedHash === hash;
    }
    catch {
        return false;
    }
}
// Login endpoint
authRoutes.post('/login', async (c) => {
    try {
        const body = await c.req.json();
        const validated = loginSchema.parse(body);
        // Find user by username
        const user = await c.env.DB.prepare('SELECT * FROM users WHERE username = ? AND is_active = 1')
            .bind(validated.username)
            .first();
        if (!user) {
            throw new HTTPException(401, { message: 'Invalid credentials' });
        }
        // Verify password
        const isValid = await verifyPassword(validated.password, user.password_hash);
        if (!isValid) {
            throw new HTTPException(401, { message: 'Invalid credentials' });
        }
        // Update last login
        await c.env.DB.prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?')
            .bind(user.id)
            .run();
        // Generate JWT token
        const jwtSecret = new TextEncoder().encode(c.env.JWT_SECRET);
        const token = await new SignJWT({
            username: user.username,
            email: user.email,
            role: user.role,
        })
            .setProtectedHeader({ alg: 'HS256' })
            .setSubject(user.id)
            .setIssuedAt()
            .setExpirationTime(`${c.env.JWT_EXPIRY_HOURS}h`)
            .sign(jwtSecret);
        // Log audit
        await c.env.DB.prepare(`INSERT INTO audit_logs (user_id, action, table_name, record_id, ip_address)
       VALUES (?, ?, ?, ?, ?)`)
            .bind(user.id, 'login', 'users', user.id, c.req.header('CF-Connecting-IP') || 'unknown')
            .run();
        return c.json({
            message: 'Login successful',
            data: {
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    role: user.role,
                },
                token,
                expires_in: parseInt(c.env.JWT_EXPIRY_HOURS) * 3600,
            },
        });
    }
    catch (error) {
        if (error.message === 'Invalid credentials') {
            throw error;
        }
        throw new HTTPException(400, { message: error.message || 'Login failed' });
    }
});
// Logout endpoint
authRoutes.post('/logout', async (c) => {
    const user = c.get('user');
    if (user) {
        await c.env.DB.prepare(`INSERT INTO audit_logs (user_id, action, ip_address)
       VALUES (?, ?, ?)`)
            .bind(user.id, 'logout', c.req.header('CF-Connecting-IP') || 'unknown')
            .run();
    }
    return c.json({ message: 'Logout successful' });
});
// Get current user - handles auth internally
authRoutes.get('/me', async (c) => {
    try {
        const authHeader = c.req.header('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new HTTPException(401, { message: 'Authorization header required' });
        }
        const token = authHeader.split(' ')[1];
        const jwtSecret = new TextEncoder().encode(c.env.JWT_SECRET);
        const { jwtVerify } = await import('jose');
        const { payload } = await jwtVerify(token, jwtSecret);
        // Get user from database to include email
        const userResult = await c.env.DB.prepare('SELECT id, username, email, role FROM users WHERE id = ?').bind(payload.sub).first();
        if (!userResult) {
            throw new HTTPException(401, { message: 'User not found' });
        }
        const user = {
            id: userResult.id,
            username: userResult.username,
            email: userResult.email,
            role: userResult.role,
        };
        return c.json({
            data: user,
        });
    }
    catch (error) {
        throw new HTTPException(401, { message: 'Invalid or expired token' });
    }
});
// Create initial admin user (only if no users exist)
authRoutes.post('/setup', async (c) => {
    try {
        // Check if users already exist
        const existingUser = await c.env.DB.prepare('SELECT id FROM users LIMIT 1').first();
        if (existingUser) {
            throw new HTTPException(400, { message: 'System already configured' });
        }
        // Generate salted hash for admin password
        const salt = crypto.randomUUID().substring(0, 16);
        const adminPassword = c.env.ADMIN_USERNAME === 'aethera'
            ? 'Aetherahealthcare@2026'
            : 'ChangeMe123!';
        const passwordHash = await hashPassword(adminPassword, salt);
        const adminId = crypto.randomUUID();
        await c.env.DB.prepare(`INSERT INTO users (id, username, email, password_hash, role, is_active, created_at)
       VALUES (?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP)`)
            .bind(adminId, c.env.ADMIN_USERNAME, 'admin@aethera-crm.com', passwordHash, 'admin')
            .run();
        return c.json({
            message: 'Admin user created successfully',
            data: {
                username: c.env.ADMIN_USERNAME,
                role: 'admin',
            },
        });
    }
    catch (error) {
        throw new HTTPException(400, { message: error.message || 'Setup failed' });
    }
});
