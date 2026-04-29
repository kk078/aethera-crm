import { D1Database } from '@cloudflare/workers-types';

export async function initializeDatabase(db: D1Database): Promise<void> {
  try {
    // Check if database is already initialized
    const result = await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'").first();
    
    if (!result) {
      console.log('Database not initialized, running schema...');
      // Database schema will be created via wrangler d1 execute command
      // This is just a runtime check
    }

    // Seed admin user if not exists
    await seedAdminUser(db);
    
    console.log('Database initialization complete');
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  }
}

async function seedAdminUser(db: D1Database): Promise<void> {
  try {
    const existingUser = await db.prepare('SELECT id FROM users WHERE username = ?').bind('aethera').first();
    
    if (!existingUser) {
      // Hash password using Web Crypto API instead of bcrypt
      const password = 'Aetherahealthcare@2026';
      const encoder = new TextEncoder();
      const passwordData = encoder.encode(password);
      const hashBuffer = await crypto.subtle.digest('SHA-256', passwordData);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const passwordHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      
      await db.prepare(`
        INSERT INTO users (id, username, password_hash, email, role, is_active)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(
        crypto.randomUUID(),
        'aethera',
        passwordHash,
        'info@aetherahealthcare.com',
        'admin',
        1
      ).run();
      
      console.log('Admin user seeded successfully');
    }
  } catch (error) {
    console.error('Error seeding admin user:', error);
  }
}

export async function createDatabaseTables(db: D1Database): Promise<void> {
  // This function would read the schema.sql file and execute it
  // For now, tables are created via wrangler d1 execute command
  console.log('Table creation handled via wrangler CLI');
}
