import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { updateProviderSchema, paginationSchema } from '../utils/validation';
import { generateId, calculatePagination } from '../utils/helpers';
export const providersRoutes = new Hono();
// List providers (public endpoint for directory)
providersRoutes.get('/', async (c) => {
    try {
        const query = c.req.query();
        console.log('Provider route called with query:', query);
        const page = parseInt(query.page || '1');
        const perPage = parseInt(query.per_page || '20');
        const pagination = paginationSchema.parse({
            page: isNaN(page) ? 1 : page,
            per_page: isNaN(perPage) ? 20 : perPage,
            sort: query.sort || 'last_name',
            order: query.order || 'desc',
            search: query.search,
        });
        console.log('Pagination:', pagination);
        const db = c.env.DB;
        // Get base query results first, then filter in memory
        const offset = (pagination.page - 1) * pagination.per_page;
        const sortCol = pagination.sort || 'last_name';
        const sortOrder = pagination.order || 'desc';
        // First get total count
        console.log('Testing query...');
        let countStmt = db.prepare('SELECT COUNT(*) as total FROM npi_providers');
        const countResult = await countStmt.first();
        const total = countResult?.total || 0;
        console.log('Count result:', countResult);
        // Get paginated results - use D1's native limit/offset without bind params
        let listStmt = db.prepare(`SELECT id, npi, first_name, last_name, organization_name,
    specialty_primary, phone, email, city, state
    FROM npi_providers
    ORDER BY ${sortCol} ${sortOrder}`);
        const resultsRaw = await listStmt.all();
        const dataArray = Array.isArray(resultsRaw) ? resultsRaw : resultsRaw.results || [];
        console.log('Results count:', dataArray.length);
        // Filter by email/phone filter (must have email or phone, not null and not empty)
        let filteredData = dataArray.filter((p) => ((p.email !== null && p.email !== '') || (p.phone !== null && p.phone !== '')));
        console.log('After email/phone filter count:', filteredData.length);
        // Filter by query params in memory
        if (query.specialty) {
            filteredData = filteredData.filter((p) => p.specialty_primary === query.specialty);
        }
        if (query.state) {
            filteredData = filteredData.filter((p) => p.state === query.state);
        }
        if (query.city) {
            filteredData = filteredData.filter((p) => p.city === query.city);
        }
        if (query.insurance) {
            filteredData = filteredData.filter((p) => p.insurance_panels && p.insurance_panels.includes(query.insurance));
        }
        if (pagination.search) {
            const searchLower = pagination.search.toLowerCase();
            filteredData = filteredData.filter((p) => p.first_name?.toLowerCase().includes(searchLower) ||
                p.last_name?.toLowerCase().includes(searchLower) ||
                p.organization_name?.toLowerCase().includes(searchLower) ||
                p.specialty_primary?.toLowerCase().includes(searchLower));
        }
        console.log('Filtered count:', filteredData.length);
        // Calculate pagination for the filtered data
        const filteredTotal = filteredData.length;
        const filteredOffset = (pagination.page - 1) * pagination.per_page;
        const paginatedResults = filteredData.slice(filteredOffset, filteredOffset + pagination.per_page);
        console.log('Paginated results count:', paginatedResults.length);
        const paginationInfo = calculatePagination(pagination.page, pagination.per_page, filteredTotal);
        return c.json({
            data: paginatedResults,
            pagination: {
                page: paginationInfo.page,
                per_page: paginationInfo.perPage,
                total: paginationInfo.total,
                total_pages: paginationInfo.totalPages,
                has_more: paginationInfo.hasMore,
            },
        });
    }
    catch (error) {
        console.error('Provider list error:', error);
        return c.json({
            error: error.message || 'Unknown error',
            stack: error.stack || undefined
        }, 500);
    }
});
// Get single provider (public)
providersRoutes.get('/:npi', async (c) => {
    const { npi } = c.req.param();
    const isPublic = true;
    const db = c.env.DB;
    let stmt = db.prepare(`
    SELECT id, npi, provider_type, first_name, last_name, organization_name,
           address, city, state, zip, phone, fax, email,
           specialty_primary, specialty_secondary, taxonomy_codes,
           hospital_affiliations, medicare_enrollment_status, medicaid_enrollment_status,
           board_certifications, medical_school, disciplinary_actions, website
    FROM npi_providers
    WHERE npi = ?
  `);
    stmt = stmt.bind(npi);
    const provider = await stmt.first();
    if (!provider) {
        throw new HTTPException(404, { message: 'Provider not found' });
    }
    if (isPublic) {
        return c.json({
            data: {
                ...provider,
                medicare_ptan: undefined,
                medicaid_id: undefined,
                caqh_id: undefined,
                dea_number: undefined,
            },
        });
    }
    return c.json({ data: provider });
});
// Get provider by ID (admin only)
providersRoutes.get('/id/:id', async (c) => {
    const user = c.get('user');
    if (!user || user.role !== 'admin') {
        throw new HTTPException(403, { message: 'Admin access required' });
    }
    const { id } = c.req.param();
    const db = c.env.DB;
    let stmt = db.prepare('SELECT * FROM npi_providers WHERE id = ?');
    stmt = stmt.bind(id);
    const provider = await stmt.first();
    if (!provider) {
        throw new HTTPException(404, { message: 'Provider not found' });
    }
    return c.json({ data: provider });
});
// Search NPPES API (public endpoint)
providersRoutes.post('/search/nppes', async (c) => {
    const user = c.get('user');
    const body = await c.req.json();
    const { npi, first_name, last_name, organization_name, specialty, state, zipcode } = body;
    const params = new URLSearchParams();
    if (npi)
        params.append('number', npi);
    if (first_name)
        params.append('first_name', first_name);
    if (last_name)
        params.append('last_name', last_name);
    if (organization_name)
        params.append('organization_name', organization_name);
    if (specialty)
        params.append('taxonomy_description', specialty);
    if (state)
        params.append('states', state);
    if (zipcode)
        params.append('postal_code', zipcode);
    params.append('limit', '50');
    try {
        const response = await fetch(`https://npiregistry.cms.hhs.gov/api/?${params.toString()}`, {
            headers: {
                'Accept': 'application/json',
            },
        });
        if (!response.ok) {
            throw new HTTPException(500, { message: 'NPPES API request failed' });
        }
        const data = await response.json();
        return c.json({
            data: data.results || [],
            total: data.result_count || 0,
        });
    }
    catch (error) {
        throw new HTTPException(500, { message: `NPPES API error: ${error.message}` });
    }
});
// Import provider from NPPES (admin only)
providersRoutes.post('/import', async (c) => {
    const user = c.get('user');
    if (!user) {
        throw new HTTPException(401, { message: 'Authentication required' });
    }
    if (user.role !== 'admin') {
        throw new HTTPException(403, { message: 'Admin access required' });
    }
    const body = await c.req.json();
    const { npi_data } = body;
    if (!npi_data || !npi_data.number) {
        throw new HTTPException(400, { message: 'NPI number required' });
    }
    const db = c.env.DB;
    let stmt = db.prepare('SELECT id FROM npi_providers WHERE npi = ?');
    stmt = stmt.bind(npi_data.number);
    const existing = await stmt.first();
    if (existing) {
        throw new HTTPException(400, { message: 'Provider with this NPI already exists' });
    }
    let finalData = npi_data;
    if (!npi_data.basic) {
        const nppesUrl = `https://npiregistry.cms.hhs.gov/api/?version=2.1&number=${npi_data.number}`;
        try {
            const nppesResponse = await fetch(nppesUrl, { headers: { Accept: 'application/json' } });
            const nppesData = await nppesResponse.json();
            if (nppesData.results && nppesData.results.length > 0) {
                finalData = nppesData.results[0];
            }
        }
        catch (e) {
            console.error('Failed to fetch NPPES data:', e);
        }
    }
    const id = generateId();
    const basic = finalData.basic || {};
    const addresses = finalData.addresses || [];
    const taxonomies = finalData.taxonomies || [];
    const practiceAddress = addresses.find((a) => a.address_purpose === 'LOCATION') || addresses[0] || {};
    const primaryTaxonomy = taxonomies.find((t) => t.primary) || taxonomies[0] || {};
    const providerType = (finalData.enumeration_type === 'NPI-1') ? 'individual' : 'organization';
    stmt = db.prepare(`
    INSERT INTO npi_providers (id, npi, provider_type, first_name, last_name, organization_name,
                              address, city, state, zip, phone, fax, specialty_primary, taxonomy_codes,
                              scraped_at, owner_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?)
  `);
    stmt = stmt.bind(id);
    stmt = stmt.bind(finalData.number);
    stmt = stmt.bind(providerType);
    stmt = stmt.bind(basic.first_name || null);
    stmt = stmt.bind(basic.last_name || null);
    stmt = stmt.bind(basic.organization_name || null);
    stmt = stmt.bind(practiceAddress.address_1 || null);
    stmt = stmt.bind(practiceAddress.city || null);
    stmt = stmt.bind(practiceAddress.state || null);
    stmt = stmt.bind(practiceAddress.postal_code || null);
    stmt = stmt.bind(practiceAddress.telephone_number || null);
    stmt = stmt.bind(practiceAddress.fax_number || null);
    stmt = stmt.bind(primaryTaxonomy.desc || null);
    stmt = stmt.bind(JSON.stringify(taxonomies));
    stmt = stmt.bind(user?.id);
    await stmt.run();
    stmt = db.prepare(`INSERT INTO audit_logs (user_id, action, table_name, record_id) VALUES (?, ?, ?, ?)`);
    stmt = stmt.bind(user?.id);
    stmt = stmt.bind('import');
    stmt = stmt.bind('npi_providers');
    stmt = stmt.bind(id);
    await stmt.run();
    stmt = db.prepare('SELECT * FROM npi_providers WHERE id = ?');
    stmt = stmt.bind(id);
    const provider = await stmt.first();
    return c.json({
        message: 'Provider imported successfully',
        data: provider,
    }, 201);
});
// Update provider
providersRoutes.put('/:id', async (c) => {
    const user = c.get('user');
    const { id } = c.req.param();
    const body = await c.req.json();
    const validated = updateProviderSchema.parse(body);
    const db = c.env.DB;
    let existingStmt = db.prepare('SELECT * FROM npi_providers WHERE id = ?');
    existingStmt = existingStmt.bind(id);
    const existing = await existingStmt.first();
    if (!existing) {
        throw new HTTPException(404, { message: 'Provider not found' });
    }
    const updates = [];
    const bindings = [];
    for (const [key, value] of Object.entries(validated)) {
        if (value !== undefined) {
            updates.push(`${key} = ?`);
            bindings.push(value);
        }
    }
    if (updates.length === 0) {
        throw new HTTPException(400, { message: 'No fields to update' });
    }
    updates.push('updated_at = CURRENT_TIMESTAMP');
    bindings.push(id);
    let stmt = db.prepare(`UPDATE npi_providers SET ${updates.join(', ')} WHERE id = ?`);
    for (const b of bindings) {
        stmt = stmt.bind(b);
    }
    await stmt.run();
    stmt = db.prepare('SELECT * FROM npi_providers WHERE id = ?');
    stmt = stmt.bind(id);
    const provider = await stmt.first();
    return c.json({
        message: 'Provider updated successfully',
        data: provider,
    });
});
// Delete provider
providersRoutes.delete('/:id', async (c) => {
    const user = c.get('user');
    const { id } = c.req.param();
    if (!user || user.role !== 'admin') {
        throw new HTTPException(403, { message: 'Admin access required' });
    }
    const db = c.env.DB;
    let existingStmt = db.prepare('SELECT * FROM npi_providers WHERE id = ?');
    existingStmt = existingStmt.bind(id);
    const existing = await existingStmt.first();
    if (!existing) {
        throw new HTTPException(404, { message: 'Provider not found' });
    }
    let deleteStmt = db.prepare('DELETE FROM npi_providers WHERE id = ?');
    deleteStmt = deleteStmt.bind(id);
    await deleteStmt.run();
    let auditStmt = db.prepare(`INSERT INTO audit_logs (user_id, action, table_name, record_id) VALUES (?, ?, ?, ?)`);
    auditStmt = auditStmt.bind(user?.id);
    auditStmt = auditStmt.bind('delete');
    auditStmt = auditStmt.bind('npi_providers');
    auditStmt = auditStmt.bind(id);
    await auditStmt.run();
    return c.json({ message: 'Provider deleted successfully' });
});
// Claim provider profile (public)
providersRoutes.post('/:npi/claim', async (c) => {
    const { npi } = c.req.param();
    const body = await c.req.json();
    const { claimant_name, claimant_email, claimant_phone } = body;
    if (!claimant_name || !claimant_email) {
        throw new HTTPException(400, { message: 'Name and email required' });
    }
    const db = c.env.DB;
    let stmt = db.prepare('SELECT id FROM npi_providers WHERE npi = ?');
    stmt = stmt.bind(npi);
    const provider = await stmt.first();
    if (!provider) {
        throw new HTTPException(404, { message: 'Provider not found' });
    }
    const claimId = generateId();
    const verificationCode = Math.random().toString(36).substring(2, 10).toUpperCase();
    stmt = db.prepare(`
    INSERT INTO provider_claims (id, npi_provider_id, claimant_name, claimant_email, claimant_phone, verification_code)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
    stmt = stmt.bind(claimId);
    stmt = stmt.bind(provider.id);
    stmt = stmt.bind(claimant_name);
    stmt = stmt.bind(claimant_email);
    stmt = stmt.bind(claimant_phone || null);
    stmt = stmt.bind(verificationCode);
    await stmt.run();
    return c.json({
        message: 'Claim request submitted. Please check your email for verification.',
        data: {
            id: claimId,
            verification_code_sent: true,
        },
    }, 201);
});
// Verify provider claim
providersRoutes.post('/claims/:id/verify', async (c) => {
    const { id } = c.req.param();
    const body = await c.req.json();
    const { verification_code } = body;
    const db = c.env.DB;
    let stmt = db.prepare('SELECT * FROM provider_claims WHERE id = ?');
    stmt = stmt.bind(id);
    const claim = await stmt.first();
    if (!claim) {
        throw new HTTPException(404, { message: 'Claim not found' });
    }
    if (claim.verification_code !== verification_code) {
        throw new HTTPException(400, { message: 'Invalid verification code' });
    }
    if (claim.verification_status === 'verified') {
        throw new HTTPException(400, { message: 'Claim already verified' });
    }
    stmt = db.prepare(`
    UPDATE provider_claims
    SET verification_status = 'verified', verified_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);
    stmt = stmt.bind(id);
    await stmt.run();
    return c.json({
        message: 'Claim verified successfully',
        data: claim,
    });
});
// Get provider statistics
providersRoutes.get('/stats/summary', async (c) => {
    const user = c.get('user');
    if (!user || user.role !== 'admin') {
        throw new HTTPException(403, { message: 'Admin access required' });
    }
    const db = c.env.DB;
    let statsStmt = db.prepare(`
    SELECT
      COUNT(*) as total_providers,
      COUNT(CASE WHEN email IS NOT NULL AND email != '' THEN 1 END) as with_email,
      COUNT(CASE WHEN medicare_enrollment_status = 'active' THEN 1 END) as medicare_active,
      COUNT(CASE WHEN medicaid_enrollment_status = 'active' THEN 1 END) as medicaid_active,
      COUNT(DISTINCT specialty_primary) as specialties_count,
      COUNT(DISTINCT state) as states_count
    FROM npi_providers
  `);
    const stats = await statsStmt.first();
    let bySpecialtyStmt = db.prepare(`
    SELECT specialty_primary, COUNT(*) as count
    FROM npi_providers
    WHERE specialty_primary IS NOT NULL
    GROUP BY specialty_primary
    ORDER BY count DESC
    LIMIT 10
  `);
    const bySpecialty = await bySpecialtyStmt.all();
    let byStateStmt = db.prepare(`
    SELECT state, COUNT(*) as count
    FROM npi_providers
    WHERE state IS NOT NULL
    GROUP BY state
    ORDER BY count DESC
    LIMIT 10
  `);
    const byState = await byStateStmt.all();
    return c.json({
        data: {
            summary: stats,
            by_specialty: bySpecialty || [],
            by_state: byState || [],
        },
    });
});
