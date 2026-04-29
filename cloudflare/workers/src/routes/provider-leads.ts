import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { generateId } from '../utils/helpers';
import type { AppEnv } from '../types';

export const providerLeadRoutes = new Hono<AppEnv>();

const HUNTER_API_KEY = '7ea3059b39f04e839768eb764df7e06c1af24984';

// Hunter.io email finder API
async function findEmail(domain: string, firstName?: string, lastName?: string): Promise<any> {
  try {
    const url = new URL('https://api.hunter.io/v2/email-finder');
    url.searchParams.append('domain', domain);
    if (firstName) url.searchParams.append('first_name', firstName);
    if (lastName) url.searchParams.append('last_name', lastName);
    url.searchParams.append('api_key', HUNTER_API_KEY);

    const response = await fetch(url.toString());
    const data: { data?: { email?: string; score?: number } } = await response.json();
    return data.data || null;
  } catch (error) {
    console.error('Hunter.io error:', error);
    return null;
  }
}

// Hunter.io email verifier API
async function verifyEmail(email: string): Promise<any> {
  try {
    const url = `https://api.hunter.io/v2/email-verifier?email=${encodeURIComponent(email)}&api_key=${HUNTER_API_KEY}`;
    const response = await fetch(url);
    const data: { data?: { email?: string; score?: number } } = await response.json();
    return data.data || null;
  } catch (error) {
    console.error('Hunter verification error:', error);
    return null;
  }
}

// Convert provider to lead
providerLeadRoutes.post('/:npi/lead', async (c) => {
  const { npi } = c.req.param();
  const user = c.get('user');
  const db = (c as any).env.DB as any;

  let stmt: any = db.prepare(`
    SELECT npi, provider_type, first_name, last_name, organization_name,
           specialty_primary, email, phone, address, city, state, zip,
           medicare_enrollment_status, medicaid_enrollment_status, website
    FROM npi_providers WHERE npi = ?
  `);
  stmt = stmt.bind(npi);
  const provider = await stmt.first();

  if (!provider) {
    throw new HTTPException(404, { message: 'Provider not found' });
  }

  stmt = db.prepare(`
    SELECT id FROM leads WHERE npi = ?
  `);
  stmt = stmt.bind(npi);
  const existingLead = await stmt.first();

  if (existingLead) {
    throw new HTTPException(409, { message: 'Lead already exists for this provider' });
  }

  const id = generateId();

  stmt = db.prepare(`
    INSERT INTO leads (
      id, source, status, first_name, last_name, company, email, phone,
      address, specialty, npi, owner_id, created_at, updated_at, lead_score
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'), ?)
  `) as any;
  stmt = stmt.bind(id);
  stmt = stmt.bind('provider_directory');
  stmt = stmt.bind('new');
  stmt = stmt.bind(provider.first_name || null);
  stmt = stmt.bind(provider.last_name || null);
  stmt = stmt.bind(provider.organization_name || null);
  stmt = stmt.bind(provider.email || null);
  stmt = stmt.bind(provider.phone || null);
  stmt = stmt.bind(provider.address || null);
  stmt = stmt.bind(provider.specialty_primary || null);
  stmt = stmt.bind(provider.npi);
  stmt = stmt.bind(user?.id);
  stmt = stmt.bind(50);
  await stmt.run();

  return c.json({
    message: 'Provider converted to lead successfully',
    data: {
      id,
      npi: provider.npi,
      name: provider.organization_name || `${provider.first_name || ''} ${provider.last_name || ''}`.trim(),
      email: provider.email,
      phone: provider.phone,
      specialty: provider.specialty_primary,
    },
  });
});

// Check if provider is already a lead
providerLeadRoutes.get('/:npi/lead', async (c) => {
  const { npi } = c.req.param();
  const db = (c as any).env.DB as any;
  let stmt: any = db.prepare(`
    SELECT id, status FROM leads WHERE npi = ?
  `);
  stmt = stmt.bind(npi);
  const lead = await stmt.first();

  return c.json({
    data: {
      is_lead: !!lead,
      lead: lead || null,
    },
  });
});

// Scrape/Find email for provider using Hunter.io
providerLeadRoutes.post('/:npi/scrape-email', async (c) => {
  const { npi } = c.req.param();
  const db = (c as any).env.DB as any;
  let stmt: any = db.prepare(`
    SELECT npi, provider_type, first_name, last_name, organization_name,
           specialty_primary, email, phone, address, city, state, website
    FROM npi_providers WHERE npi = ?
  `);
  stmt = stmt.bind(npi);
  const provider = await stmt.first();

  if (!provider) {
    throw new HTTPException(404, { message: 'Provider not found' });
  }

  // Already has email
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

  // Try Hunter.io if website exists
  let hunterResult = null;
  if (provider.website) {
    try {
      const domain = new URL(provider.website.startsWith('http') ? provider.website : `https://${provider.website}`).hostname;
      hunterResult = await findEmail(domain, provider.first_name, provider.last_name);
    } catch (e) {
      console.log('Invalid website URL, trying domain generation');
    }
  }

  // Try generic domain based on organization name
  if (!hunterResult && provider.organization_name) {
    const cleanName = provider.organization_name.toLowerCase().replace(/[^a-z0-9]/g, '');
    hunterResult = await findEmail(`${cleanName}.com`);
  }

  // If Hunter found something
  if (hunterResult && hunterResult.email) {
    // Update the provider in database
    stmt = db.prepare(`
      UPDATE npi_providers SET email = ?, updated_at = datetime('now')
      WHERE npi = ?
    `) as any;
    stmt = stmt.bind(hunterResult.email);
    stmt = stmt.bind(npi);
    await stmt.run();

    return c.json({
      data: {
        email: hunterResult.email,
        source: 'hunter.io',
        confidence: hunterResult.score || 80,
        scraped_at: new Date().toISOString(),
        provider_np: {
          first_name: provider.first_name,
          last_name: provider.last_name,
          organization_name: provider.organization_name,
          phone: provider.phone,
        }
      }
    });
  }

  // Fallback: generate patterns
  const patterns = generatePotentialEmails(provider);

  return c.json({
    data: {
      npi: provider.npi,
      name: provider.organization_name || `${provider.first_name || ''} ${provider.last_name || ''}`.trim(),
      current_email: provider.email,
      hunter_found: false,
      generated_patterns: patterns,
      source: 'generated',
      confidence: 20,
      scraped_at: new Date().toISOString(),
      note: 'Email not found via Hunter.io. Try contacting provider by phone first.',
    }
  });
});

// Update lead with scraped email
providerLeadRoutes.patch('/:npi/lead', async (c) => {
  const { npi } = c.req.param();
  const body = await c.req.json();
  const db = (c as any).env.DB as any;

  let stmt: any = db.prepare(`
    SELECT id FROM leads WHERE npi = ?
  `);
  stmt = stmt.bind(npi);
  const lead = await stmt.first();

  if (!lead) {
    throw new HTTPException(404, { message: 'Lead not found' });
  }

  if (body.email) {
    stmt = db.prepare(`
      UPDATE leads SET email = ?, updated_at = datetime('now') WHERE npi = ?
    `) as any;
    stmt = stmt.bind(body.email);
    stmt = stmt.bind(npi);
    await stmt.run();
  }

  if (body.phone) {
    stmt = db.prepare(`
      UPDATE leads SET phone = ?, updated_at = datetime('now') WHERE npi = ?
    `) as any;
    stmt = stmt.bind(body.phone);
    stmt = stmt.bind(npi);
    await stmt.run();
  }

  return c.json({ message: 'Lead updated successfully' });
});

// Delete provider from leads - now marks as deleted instead of hard delete
providerLeadRoutes.delete('/:npi/lead', async (c) => {
  const { npi } = c.req.param();
  const db = (c as any).env.DB as any;
  let stmt: any = db.prepare(`
    UPDATE leads SET deleted_at = datetime('now'), status = 'deleted' WHERE npi = ?
  `);
  stmt = stmt.bind(npi);
  const result = await stmt.run();

  return c.json({
    message: 'Lead removed successfully (marked as deleted)',
    deleted: result.success,
  });
});

function generatePotentialEmails(provider: any): Array<{email: string, pattern: string, confidence: number}> {
  const emails: Array<{email: string, pattern: string, confidence: number}> = [];

  const name = provider.organization_name || `${provider.first_name || ''}${provider.last_name || ''}`.trim();
  if (!name) return emails;

  const clean = name.toLowerCase().replace(/[^a-z0-9]/g, '');

  emails.push(
    { email: `info@${clean}.com`, pattern: 'info@{name}.com', confidence: 25 },
    { email: `contact@${clean}.com`, pattern: 'contact@{name}.com', confidence: 25 },
    { email: `admin@${clean}.com`, pattern: 'admin@{name}.com', confidence: 15 },
  );

  const city = (provider.city || '').toLowerCase().replace(/[^a-z]/gi, '');
  if (city) {
    emails.push(
      { email: `${clean}@${city}medical.com`, pattern: '{name}@{city}medical.com', confidence: 10 },
    );
  }

  return emails;
}

export default providerLeadRoutes;
