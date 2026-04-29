import { webcrypto } from 'crypto';

async function hashPassword(password, salt) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + salt);
  const hashBuffer = await webcrypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return salt + ':' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function createAdminUser() {
  const salt = webcrypto.randomUUID().substring(0, 16);
  const password = 'Aetherahealthcare@2026';
  const passwordHash = await hashPassword(password, salt);
  
  console.log('Generated password hash:');
  console.log(passwordHash);
  
  console.log('\nRun this SQL command:');
  console.log(`INSERT INTO users (id, username, email, password_hash, role, is_active, created_at) 
VALUES ('admin-001', 'aethera', 'admin@aethera-crm.com', '${passwordHash}', 'admin', 1, CURRENT_TIMESTAMP);`);
}

createAdminUser().catch(console.error);
