import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { generateId } from '../utils/helpers';
import type { AppEnv } from '../types';

// Email scraper routes
export const scraperRoutes = new Hono<AppEnv>();

// Scrape email for a provider
scraperRoutes.post('/email/:npi', async (c) => {
  const { npi } = c.req.param();
  const user = c.get('user');

  // Get the provider from database
  const provider = await ((c as any).env as any).DB.prepare(`
    SELECT npi, provider_type, first_name, last_name, organization_name,
           specialty_primary, email, phone, address, city, state
    FROM npi_providers WHERE npi = ?
  `).bind(npi).first();

  if (!provider) {
    throw new HTTPException(404, { message: 'Provider not found' });
  }

  // Already has email - return it
  if (provider.email) {
    return c.json({
      data: {
        email: provider.email,
        source: 'database',
        confidence: 100,
        scraped_at: new Date().toISOString(),
      }
    });
  }

  // Generate potential email patterns based on provider data
  const potentialEmails = generateEmailPatterns(provider);

  // In production, you would:
  // 1. Check various APIs (Hunter.io, Snov.io, etc.)
  // 2. Scrape practice websites
  // 3. Check industry databases
  // For now, return potential patterns
  
  return c.json({
    data: {
      emails: potentialEmails,
      source: 'generated',
      confidence: 30,
      scraped_at: new Date().toISOString(),
      message: 'Email not found in database. Generated potential patterns based on provider information.',
    }
  });
});

// Generate email patterns function
function generateEmailPatterns(provider: any): Array<{email: string, pattern: string, confidence: number}> {
  const emails: Array<{email: string, pattern: string, confidence: number}> = [];
  
  const name = provider.organization_name || `${provider.first_name || ''}${provider.last_name || ''}`.trim();
  const city = (provider.city || '').toLowerCase().replace(/[^a-z]/g, '');
  const specialty = (provider.specialty_primary || '').toLowerCase().replace(/[^a-z]/g, '');
  
  if (!name) return emails;
  
  const cleanName = name.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
  
  // Pattern 1: info@name.com
  emails.push({
    email: `info@${cleanName}.com`,
    pattern: 'info@{cleanName}.com',
    confidence: 20,
  });
  
  // Pattern 2: contact@name.com
  emails.push({
    email: `contact@${cleanName}.com`,
    pattern: 'contact@{cleanName}.com',
    confidence: 20,
  });
  
  // Pattern 3: name@city+specialty.com (if city exists)
  if (city) {
    emails.push({
      email: `${cleanName}@${city}health.com`,
      pattern: '{name}@{city}health.com',
      confidence: 15,
    });
  }
  
  // Pattern 4: admin@name.com
  emails.push({
    email: `admin@${cleanName}.com`,
    pattern: 'admin@{cleanName}.com',
    confidence: 15,
  });
  
  return emails;
}

export default scraperRoutes;