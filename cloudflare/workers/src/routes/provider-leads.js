import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { generateId } from '../utils/helpers';
export const providerLeadRoutes = new Hono();
const HUNTER_API_KEY = '7ea3059b39f04e839768eb764df7e06c1af24984';
// Hunter.io email finder API
async function findEmail(domain, firstName, lastName) {
    try {
        const url = new URL('https://api.hunter.io/v2/email-finder');
        url.searchParams.append('domain', domain);
        if (firstName)
            url.searchParams.append('first_name', firstName);
        if (lastName)
            url.searchParams.append('last_name', lastName);
        url.searchParams.append('api_key', HUNTER_API_KEY);
        const response = await fetch(url.toString());
        const data = await response.json();
        return data.data || null;
    }
    catch (error) {
        console.error('Hunter.io error:', error);
        return null;
    }
}
// Hunter.io email verifier API
async function verifyEmail(email) {
    try {
        const url = `https://api.hunter.io/v2/email-verifier?email=${encodeURIComponent(email)}&api_key=${HUNTER_API_KEY}`;
        const response = await fetch(url);
        const data = await response.json();
        return data.data || null;
    }
    catch (error) {
        console.error('Hunter verification error:', error);
        return null;
    }
}
// Convert provider to lead
providerLeadRoutes.post('/:npi/lead', async (c) => {
    const { npi } = c.req.param();
    const user = c.get('user');
    const db = c.env.DB;
    const provider = await db.prepare(`
    SELECT npi, provider_type, first_name, last_name, organization_name,
           specialty_primary, email, phone, address, city, state, zip,
           medicare_enrollment_status, medicaid_enrollment_status, website
    FROM npi_providers WHERE npi = ?
  `).bind(npi).first();
    if (!provider) {
        throw new HTTPException(404, { message: 'Provider not found' });
    }
    const existingLead = await db.prepare(`SELECT id FROM leads WHERE npi = ?`).bind(npi).first();
    if (existingLead) {
        throw new HTTPException(409, { message: 'Lead already exists for this provider' });
    }
    const id = generateId();
    const result = await db.prepare(`
    INSERT INTO leads (
      id, source, status, first_name, last_name, company, email, phone,
      address, specialty, npi, owner_id, created_at, updated_at, lead_score
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'), ?)
  `).bind(id, 'provider_directory', 'new', provider.first_name || null, provider.last_name || null, provider.organization_name || null, provider.email || null, provider.phone || null, provider.address || null, provider.specialty_primary || null, provider.npi, user?.id, 50).run();
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
    const db = c.env.DB;
    const lead = await db.prepare(`SELECT id, status FROM leads WHERE npi = ?`).bind(npi).first();
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
    const db = c.env.DB;
    const provider = await db.prepare(`
    SELECT npi, provider_type, first_name, last_name, organization_name,
           specialty_primary, email, phone, address, city, state, website
    FROM npi_providers WHERE npi = ?
  `).bind(npi).first();
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
        }
        catch (e) {
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
        await db.prepare(`
      UPDATE npi_providers SET email = ?, updated_at = datetime('now')
      WHERE npi = ?
    `).bind(hunterResult.email, npi).run();
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
    const db = c.env.DB;
    // Check if lead exists first
    const lead = await db.prepare(`SELECT id FROM leads WHERE npi = ?`).bind(npi).first();
    if (!lead) {
        throw new HTTPException(404, { message: 'Lead not found' });
    }
    // Update email if provided
    if (body.email) {
        await db.prepare(`
      UPDATE leads SET email = ?, updated_at = datetime('now') WHERE npi = ?
    `).bind(body.email, npi).run();
    }
    // Update phone if provided
    if (body.phone) {
        await db.prepare(`
      UPDATE leads SET phone = ?, updated_at = datetime('now') WHERE npi = ?
    `).bind(body.phone, npi).run();
    }
    return c.json({ message: 'Lead updated successfully' });
});
// Delete provider from leads - now marks as deleted instead of hard delete
providerLeadRoutes.delete('/:npi/lead', async (c) => {
    const { npi } = c.req.param();
    const db = c.env.DB;
    // Check if lead exists first
    const lead = await db.prepare(`SELECT id FROM leads WHERE npi = ?`).bind(npi).first();
    if (!lead) {
        throw new HTTPException(404, { message: 'Lead not found for this provider' });
    }
    const result = await db.prepare(`
    UPDATE leads SET deleted_at = datetime('now'), status = 'deleted' WHERE npi = ?
  `).bind(npi).run();
    return c.json({
        message: 'Lead removed successfully (marked as deleted)',
        deleted: result.success,
    });
});
function generatePotentialEmails(provider) {
    const emails = [];
    const name = provider.organization_name || `${provider.first_name || ''}${provider.last_name || ''}`.trim();
    if (!name)
        return emails;
    const clean = name.toLowerCase().replace(/[^a-z0-9]/g, '');
    emails.push({ email: `info@${clean}.com`, pattern: 'info@{name}.com', confidence: 25 }, { email: `contact@${clean}.com`, pattern: 'contact@{name}.com', confidence: 25 }, { email: `admin@${clean}.com`, pattern: 'admin@{name}.com', confidence: 15 });
    const city = (provider.city || '').toLowerCase().replace(/[^a-z]/gi, '');
    if (city) {
        emails.push({ email: `${clean}@${city}medical.com`, pattern: '{name}@{city}medical.com', confidence: 10 });
    }
    return emails;
}
export default providerLeadRoutes;
