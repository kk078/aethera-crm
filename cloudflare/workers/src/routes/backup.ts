import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { generateId } from '../utils/helpers';
import type { AppEnv } from '../types';

export const backupRoutes = new Hono<AppEnv>();

// Trigger manual backup
backupRoutes.post('/trigger', async (c) => {
  const user = c.get('user');
  
  if (!user || user.role !== 'admin') {
    throw new HTTPException(403, { message: 'Admin access required' });
  }

  const backupId = generateId();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const fileName = `backup_${timestamp}.sql`;

  // Create backup record
  await ((c as any).env as any).DB.prepare(`
    INSERT INTO backups (id, backup_type, file_path, status, started_at)
    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
  `)
    .bind(backupId, 'manual', fileName, 'in_progress')
    .run();

  try {
    // Export database schema and data
    const tables = [
      'users', 'organizations', 'contacts', 'leads', 'deals', 
      'activities', 'emails', 'phone_calls', 'npi_providers',
      'campaigns', 'tasks', 'ai_models', 'ai_predictions',
      'integrations', 'api_keys', 'oauth_tokens', 'audit_logs',
      'workflows', 'email_templates', 'settings'
    ];

    const exportData: string[] = [];
    
    for (const table of tables) {
      const result = await ((c as any).env as any).DB.prepare(`SELECT * FROM ${table}`).all();
      if (result && result.length > 0) {
        exportData.push(`-- Table: ${table}`);
        for (const row of result) {
          const columns = Object.keys(row).join(', ');
          const values = Object.values(row).map(v => 
            typeof v === 'string' ? `'${v.replace(/'/g, "''")}'` : v
          ).join(', ');
          exportData.push(`INSERT INTO ${table} (${columns}) VALUES (${values});`);
        }
      }
    }

    const sqlContent = exportData.join('\n');

    // Store backup in R2
    await c.env.STORAGE.put(fileName, sqlContent);

    // Update backup record
    await ((c as any).env as any).DB.prepare(`
      UPDATE backups 
      SET status = 'completed', 
          completed_at = CURRENT_TIMESTAMP,
          file_size = ?
      WHERE id = ?
    `)
      .bind(sqlContent.length, backupId)
      .run();

    return c.json({
      message: 'Backup completed successfully',
      data: {
        id: backupId,
        file_name: fileName,
        size: sqlContent.length,
        created_at: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    await ((c as any).env as any).DB.prepare(`
      UPDATE backups 
      SET status = 'failed', 
          completed_at = CURRENT_TIMESTAMP,
          error_message = ?
      WHERE id = ?
    `)
      .bind(error.message, backupId)
      .run();

    throw new HTTPException(500, { message: `Backup failed: ${error.message}` });
  }
});

// List backups
backupRoutes.get('/list', async (c) => {
  const user = c.get('user');
  
  if (!user || user.role !== 'admin') {
    throw new HTTPException(403, { message: 'Admin access required' });
  }

  const backups = await ((c as any).env as any).DB.prepare(`
    SELECT * FROM backups 
    ORDER BY created_at DESC
    LIMIT 50
  `).all();

  return c.json({
    data: backups || [],
  });
});

// Get backup status
backupRoutes.get('/status', async (c) => {
  const lastBackup = await ((c as any).env as any).DB.prepare(`
    SELECT * FROM backups 
    ORDER BY created_at DESC 
    LIMIT 1
  `).first();

  const pendingBackups = await ((c as any).env as any).DB.prepare(`
    SELECT COUNT(*) as count FROM backups 
    WHERE status = 'in_progress'
  `).first();

  return c.json({
    data: {
      last_backup: lastBackup,
      pending_count: pendingBackups?.count || 0,
      backup_schedule: '0 2 * * *', // 2 AM EST daily
      retention_days: 60,
    },
  });
});

// Delete old backup
backupRoutes.delete('/:id', async (c) => {
  const user = c.get('user');
  const { id } = c.req.param();
  
  if (!user || user.role !== 'admin') {
    throw new HTTPException(403, { message: 'Admin access required' });
  }

  const backup = await ((c as any).env as any).DB.prepare('SELECT * FROM backups WHERE id = ?').bind(id).first();
  
  if (!backup) {
    throw new HTTPException(404, { message: 'Backup not found' });
  }

  // Delete from R2
  try {
    await c.env.STORAGE.delete(backup.file_path);
  } catch (error) {
    console.error('Error deleting backup file:', error);
  }

  // Delete record
  await ((c as any).env as any).DB.prepare('DELETE FROM backups WHERE id = ?').bind(id).run();

  return c.json({
    message: 'Backup deleted successfully',
  });
});

// Cleanup old backups (beyond retention period)
backupRoutes.post('/cleanup', async (c) => {
  const user = c.get('user');
  
  if (!user || user.role !== 'admin') {
    throw new HTTPException(403, { message: 'Admin access required' });
  }

  const retentionDays = 60;
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

  const oldBackups = await ((c as any).env as any).DB.prepare(`
    SELECT * FROM backups 
    WHERE created_at < ? AND status = 'completed'
  `)
    .bind(cutoffDate.toISOString())
    .all();

  let deletedCount = 0;

  for (const backup of oldBackups || []) {
    try {
      await c.env.STORAGE.delete(backup.file_path);
      await ((c as any).env as any).DB.prepare('DELETE FROM backups WHERE id = ?').bind(backup.id).run();
      deletedCount++;
    } catch (error) {
      console.error(`Error deleting backup ${backup.id}:`, error);
    }
  }

  return c.json({
    message: `Cleanup completed. Deleted ${deletedCount} old backups.`,
    data: {
      deleted_count: deletedCount,
      retention_days: retentionDays,
      cutoff_date: cutoffDate.toISOString(),
    },
  });
});
