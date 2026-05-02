import { Hono } from 'hono';
import { generateId } from '../utils/helpers';
import type { AppEnv } from '../types';

export const seedRoutes = new Hono<AppEnv>();

// Florida providers seed data
const floridaProviders = [
  {
    npi: '100300000X',
    provider_type: 'organization',
    organization_name: 'Florida Aging Specialists Group',
    first_name: null, last_name: null,
    address: '1200 S Miami Ave', city: 'Miami', state: 'FL', zip: '33130',
    phone: '(305) 555-0101', email: 'contact@floridaagerspecialists.com',
    specialty_primary: 'Geriatrics', taxonomy_codes: JSON.stringify(['111NI0001X']),
    website: 'https://floridaagerspecialists.com',
  },
  {
    npi: '100300001A',
    provider_type: 'individual', organization_name: null,
    first_name: 'Sarah', last_name: 'Johnson',
    address: '4000 NE 4th St', city: 'Miami', state: 'FL', zip: '33137',
    phone: '(305) 555-0102', email: 'sarah.johnson@agingcare.com',
    specialty_primary: 'Geriatrics', taxonomy_codes: JSON.stringify(['111NI0001X']),
  },
  {
    npi: '100300002B',
    provider_type: 'individual', organization_name: null,
    first_name: 'Michael', last_name: 'Roberts',
    address: '5500 Biscayne Blvd', city: 'Miami', state: 'FL', zip: '33137',
    phone: '(305) 555-0103', email: 'm.roberts@seniorcarefl.com',
    specialty_primary: 'Geriatrics', taxonomy_codes: JSON.stringify(['111NI0001X']),
  },
  {
    npi: '100300003C',
    provider_type: 'individual', organization_name: null,
    first_name: 'Emily', last_name: 'Chen',
    address: '8900 NW 4th St', city: 'Miami Gardens', state: 'FL', zip: '33056',
    phone: '(305) 555-0104', email: 'emily.chen@aginghealth.com',
    specialty_primary: 'Geriatrics', taxonomy_codes: JSON.stringify(['111NI0001X']),
  },
  {
    npi: '100300004D',
    provider_type: 'organization', organization_name: 'South Florida Geriatrics Associates',
    first_name: null, last_name: null,
    address: '2000 S State Rd 7', city: 'Homestead', state: 'FL', zip: '33030',
    phone: '(305) 555-0105', email: 'info@southflgeriatrics.com',
    specialty_primary: 'Geriatrics', taxonomy_codes: JSON.stringify(['111NI0001X']),
  },
  {
    npi: '200300000X',
    provider_type: 'individual', organization_name: null,
    first_name: 'James', last_name: 'Williams',
    address: '1600 NW 1st Ave', city: 'Miami', state: 'FL', zip: '33128',
    phone: '(305) 555-0201', email: 'james.williams@cardiologyfl.com',
    specialty_primary: 'Cardiology', taxonomy_codes: JSON.stringify(['208B00000X']),
    website: 'https://cardiologyfl.com',
  },
  {
    npi: '200300001Y',
    provider_type: 'individual', organization_name: null,
    first_name: 'Lisa', last_name: 'Martinez',
    address: '4400 Bayside Dr', city: 'Tampa', state: 'FL', zip: '33611',
    phone: '(813) 555-0202', email: 'lisa.martinez@tampacardiology.com',
    specialty_primary: 'Cardiology', taxonomy_codes: JSON.stringify(['208B00000X']),
  },
  {
    npi: '200300002A',
    provider_type: 'organization', organization_name: 'Florida Heart Institute',
    first_name: null, last_name: null,
    address: '501 S Bougainvillea Ave', city: 'Orlando', state: 'FL', zip: '32806',
    phone: '(407) 555-0203', email: 'info@floridaheartinstitute.com',
    specialty_primary: 'Cardiology', taxonomy_codes: JSON.stringify(['208B00000X']),
  },
  {
    npi: '200300003B',
    provider_type: 'individual', organization_name: null,
    first_name: 'Robert', last_name: 'Garcia',
    address: '3000 Clinical Dr', city: 'Tampa', state: 'FL', zip: '33613',
    phone: '(813) 555-0204', email: 'robert.garcia@cardiologists.com',
    specialty_primary: 'Cardiology', taxonomy_codes: JSON.stringify(['208B00000X']),
  },
  {
    npi: '200300004C',
    provider_type: 'individual', organization_name: null,
    first_name: 'Patricia', last_name: 'Thompson',
    address: '8000 US Highway 1', city: 'Jupiter', state: 'FL', zip: '33458',
    phone: '(561) 555-0205', email: 'patricia.thompson@palmbeachheart.com',
    specialty_primary: 'Cardiology', taxonomy_codes: JSON.stringify(['208B00000X']),
  },
  {
    npi: '208200000X',
    provider_type: 'individual', organization_name: null,
    first_name: 'Alan', last_name: 'Brown',
    address: '1200 NW 12th Ave', city: 'Miami', state: 'FL', zip: '33125',
    phone: '(305) 555-0301', email: 'alan.brown@svmcfl.com',
    specialty_primary: 'Heart Surgery', taxonomy_codes: JSON.stringify(['208200000X']),
  },
  {
    npi: '208200001Y',
    provider_type: 'individual', organization_name: null,
    first_name: 'Jennifer', last_name: 'Lee',
    address: '601 SW 8th St', city: 'Fort Lauderdale', state: 'FL', zip: '33301',
    phone: '(954) 555-0302', email: 'jennifer.lee@baptisthealth.net',
    specialty_primary: 'Heart Surgery', taxonomy_codes: JSON.stringify(['208200000X']),
  },
  {
    npi: '208200002A',
    provider_type: 'organization', organization_name: 'Florida Cardiac Surgery Center',
    first_name: null, last_name: null,
    address: '4001 N Northlake Blvd', city: 'Orlando', state: 'FL', zip: '32804',
    phone: '(407) 555-0303', email: 'info@floridacardiacsurgery.com',
    specialty_primary: 'Heart Surgery', taxonomy_codes: JSON.stringify(['208200000X']),
  },
  {
    npi: '208200003B',
    provider_type: 'individual', organization_name: null,
    first_name: 'David', last_name: 'Wilson',
    address: '2001 E Central Blvd', city: 'Orlando', state: 'FL', zip: '32803',
    phone: '(407) 555-0304', email: 'david.wilson@orlandohealth.com',
    specialty_primary: 'Heart Surgery', taxonomy_codes: JSON.stringify(['208200000X']),
  },
  {
    npi: '208000000X',
    provider_type: 'individual', organization_name: null,
    first_name: 'Maria', last_name: 'Rodriguez',
    address: '1200 SW 8th St', city: 'Miami', state: 'FL', zip: '33135',
    phone: '(305) 555-0401', email: 'maria.rodriguez@miamicancer.com',
    specialty_primary: 'Oncology', taxonomy_codes: JSON.stringify(['208000000X']),
  },
  {
    npi: '208000001Y',
    provider_type: 'individual', organization_name: null,
    first_name: 'William', last_name: 'Anderson',
    address: '4500 N Nebraska Ave', city: 'Tampa', state: 'FL', zip: '33603',
    phone: '(813) 555-0402', email: 'william.anderson@tampacancer.com',
    specialty_primary: 'Oncology', taxonomy_codes: JSON.stringify(['208000000X']),
  },
  {
    npi: '208000002A',
    provider_type: 'organization', organization_name: 'Florida Cancer Specialists',
    first_name: null, last_name: null,
    address: '8000 Federal Park Dr', city: 'Tampa', state: 'FL', zip: '33604',
    phone: '(813) 555-0403', email: 'info@floridacancerspecialists.com',
    specialty_primary: 'Oncology', taxonomy_codes: JSON.stringify(['208000000X']),
  },
  {
    npi: '208000003B',
    provider_type: 'individual', organization_name: null,
    first_name: 'Karen', last_name: 'Thomas',
    address: '600 Clinical Center Dr', city: 'Orlando', state: 'FL', zip: '32806',
    phone: '(407) 555-0404', email: 'karen.thomas@orlandocancer.com',
    specialty_primary: 'Oncology', taxonomy_codes: JSON.stringify(['208000000X']),
  },
  {
    npi: '208000004C',
    provider_type: 'individual', organization_name: null,
    first_name: 'Richard', last_name: 'Jackson',
    address: '9000 N Old Aggie Rd', city: 'Gainesville', state: 'FL', zip: '32608',
    phone: '(352) 555-0405', email: 'richard.jackson@ufhealth.org',
    specialty_primary: 'Oncology', taxonomy_codes: JSON.stringify(['208000000X']),
  },
  {
    npi: '208N00000X',
    provider_type: 'individual', organization_name: null,
    first_name: 'Daniel', last_name: 'Harris',
    address: '1200 NW 14th St', city: 'Gainesville', state: 'FL', zip: '32603',
    phone: '(352) 555-0501', email: 'daniel.harris@neurofl.com',
    specialty_primary: 'Neurology', taxonomy_codes: JSON.stringify(['208N00000X']),
  },
  {
    npi: '208N00001Y',
    provider_type: 'individual', organization_name: null,
    first_name: 'Laura', last_name: 'Martinez',
    address: '2500 NW 1st Ave', city: 'Miami', state: 'FL', zip: '33127',
    phone: '(305) 555-0502', email: 'laura.martinez@neurologycenter.com',
    specialty_primary: 'Neurology', taxonomy_codes: JSON.stringify(['208N00000X']),
  },
  {
    npi: '208N00002A',
    provider_type: 'organization', organization_name: 'Florida Neurological Associates',
    first_name: null, last_name: null,
    address: '4001 N Northlake Blvd', city: 'Orlando', state: 'FL', zip: '32804',
    phone: '(407) 555-0503', email: 'info@floridanurology.com',
    specialty_primary: 'Neurology', taxonomy_codes: JSON.stringify(['208N00000X']),
  },
  {
    npi: '208N00003B',
    provider_type: 'individual', organization_name: null,
    first_name: 'Paul', last_name: 'Garcia',
    address: '801 N University Dr', city: 'Pembroke Pines', state: 'FL', zip: '33024',
    phone: '(954) 555-0504', email: 'paul.garcia@neurospecialists.com',
    specialty_primary: 'Neurology', taxonomy_codes: JSON.stringify(['208N00000X']),
  },
  {
    npi: '208Q00000X',
    provider_type: 'individual', organization_name: null,
    first_name: 'Kevin', last_name: 'Smith',
    address: '1200 SW 16th St', city: 'Miami', state: 'FL', zip: '33130',
    phone: '(305) 555-0601', email: 'kevin.smith@neurosurgeryfl.com',
    specialty_primary: 'Neurosurgery', taxonomy_codes: JSON.stringify(['208Q00000X']),
  },
  {
    npi: '208Q00001Y',
    provider_type: 'individual', organization_name: null,
    first_name: 'Amanda', last_name: 'Johnson',
    address: '601 SW 8th St', city: 'Fort Lauderdale', state: 'FL', zip: '33301',
    phone: '(954) 555-0602', email: 'amanda.johnson@neurosurgcenter.com',
    specialty_primary: 'Neurosurgery', taxonomy_codes: JSON.stringify(['208Q00000X']),
  },
  {
    npi: '208Q00002A',
    provider_type: 'organization', organization_name: 'Florida Neurosurgery Institute',
    first_name: null, last_name: null,
    address: '4001 N Northlake Blvd', city: 'Orlando', state: 'FL', zip: '32804',
    phone: '(407) 555-0603', email: 'info@floridaneurosurgery.com',
    specialty_primary: 'Neurosurgery', taxonomy_codes: JSON.stringify(['208Q00000X']),
  },
  {
    npi: '208Q00003B',
    provider_type: 'individual', organization_name: null,
    first_name: 'Steven', last_name: 'White',
    address: '301 S Main St', city: 'Orlando', state: 'FL', zip: '32801',
    phone: '(407) 555-0604', email: 'steven.white@orlandoneurosurgery.com',
    specialty_primary: 'Neurosurgery', taxonomy_codes: JSON.stringify(['208Q00000X']),
  },
  {
    npi: '208P00000X',
    provider_type: 'individual', organization_name: null,
    first_name: 'Thomas', last_name: 'Brown',
    address: '2500 NW 7th Ave', city: 'Miami', state: 'FL', zip: '33127',
    phone: '(305) 555-0701', email: 'thomas.brown@orthofl.com',
    specialty_primary: 'Orthopedics', taxonomy_codes: JSON.stringify(['208P00000X']),
  },
  {
    npi: '208P00001Y',
    provider_type: 'individual', organization_name: null,
    first_name: 'Michelle', last_name: 'Davis',
    address: '4500 N Nebraska Ave', city: 'Tampa', state: 'FL', zip: '33603',
    phone: '(813) 555-0702', email: 'michelle.davis@tampaorthopedic.com',
    specialty_primary: 'Orthopedics', taxonomy_codes: JSON.stringify(['208P00000X']),
  },
  {
    npi: '208P00002A',
    provider_type: 'organization', organization_name: 'Florida Orthopedic Center',
    first_name: null, last_name: null,
    address: '8000 Federal Park Dr', city: 'Tampa', state: 'FL', zip: '33604',
    phone: '(813) 555-0703', email: 'info@floridaorthopedic.com',
    specialty_primary: 'Orthopedics', taxonomy_codes: JSON.stringify(['208P00000X']),
  },
  {
    npi: '208P00003B',
    provider_type: 'individual', organization_name: null,
    first_name: 'Robert', last_name: 'Miller',
    address: '601 W Vine Ave', city: 'Orlando', state: 'FL', zip: '32801',
    phone: '(407) 555-0704', email: 'robert.miller@orthospecialists.com',
    specialty_primary: 'Orthopedics', taxonomy_codes: JSON.stringify(['208P00000X']),
  },
  {
    npi: '208P00004C',
    provider_type: 'individual', organization_name: null,
    first_name: 'Jessica', last_name: 'Wilson',
    address: '9000 N Old Aggie Rd', city: 'Gainesville', state: 'FL', zip: '32608',
    phone: '(352) 555-0705', email: 'jessica.wilson@uforthopedics.com',
    specialty_primary: 'Orthopedics', taxonomy_codes: JSON.stringify(['208P00000X']),
  },
  {
    npi: '208T00000X',
    provider_type: 'individual', organization_name: null,
    first_name: 'Mark', last_name: 'Taylor',
    address: '1200 S Dixie Fry Rd', city: 'Coral Gables', state: 'FL', zip: '33146',
    phone: '(305) 555-0801', email: 'mark.taylor@urologyfl.com',
    specialty_primary: 'Urology', taxonomy_codes: JSON.stringify(['208T00000X']),
  },
  {
    npi: '208T00001Y',
    provider_type: 'individual', organization_name: null,
    first_name: 'Susan', last_name: 'Moore',
    address: '4001 N Northlake Blvd', city: 'Orlando', state: 'FL', zip: '32804',
    phone: '(407) 555-0802', email: 'susan.moore@uromedical.com',
    specialty_primary: 'Urology', taxonomy_codes: JSON.stringify(['208T00000X']),
  },
  {
    npi: '208T00002A',
    provider_type: 'organization', organization_name: 'Florida Urology Associates',
    first_name: null, last_name: null,
    address: '501 S Bougainvillea Ave', city: 'Orlando', state: 'FL', zip: '32806',
    phone: '(407) 555-0803', email: 'info@floridaurology.com',
    specialty_primary: 'Urology', taxonomy_codes: JSON.stringify(['208T00000X']),
  },
  {
    npi: '208T00003B',
    provider_type: 'individual', organization_name: null,
    first_name: 'James', last_name: 'Jackson',
    address: '3000 Clinical Dr', city: 'Tampa', state: 'FL', zip: '33613',
    phone: '(813) 555-0804', email: 'james.jackson@tampaurology.com',
    specialty_primary: 'Urology', taxonomy_codes: JSON.stringify(['208T00000X']),
  },
  {
    npi: '207L00000X',
    provider_type: 'individual', organization_name: null,
    first_name: 'Nancy', last_name: 'Anderson',
    address: '1200 SW 16th St', city: 'Miami', state: 'FL', zip: '33130',
    phone: '(305) 555-0901', email: 'nancy.anderson@pulmonologyfl.com',
    specialty_primary: 'Pulmonology', taxonomy_codes: JSON.stringify(['207L00000X']),
  },
  {
    npi: '207L00001Y',
    provider_type: 'individual', organization_name: null,
    first_name: 'George', last_name: 'Thomas',
    address: '4500 N Nebraska Ave', city: 'Tampa', state: 'FL', zip: '33603',
    phone: '(813) 555-0902', email: 'george.thomas@tampapulmonary.com',
    specialty_primary: 'Pulmonology', taxonomy_codes: JSON.stringify(['207L00000X']),
  },
  {
    npi: '207L00002A',
    provider_type: 'organization', organization_name: 'Florida Pulmonary Specialists',
    first_name: null, last_name: null,
    address: '8000 Federal Park Dr', city: 'Tampa', state: 'FL', zip: '33604',
    phone: '(813) 555-0903', email: 'info@floridapulmonary.com',
    specialty_primary: 'Pulmonology', taxonomy_codes: JSON.stringify(['207L00000X']),
  },
  {
    npi: '207L00003B',
    provider_type: 'individual', organization_name: null,
    first_name: 'Diana', last_name: 'Harris',
    address: '601 W Vine Ave', city: 'Orlando', state: 'FL', zip: '32801',
    phone: '(407) 555-0904', email: 'diana.harris@orlandopulmonary.com',
    specialty_primary: 'Pulmonology', taxonomy_codes: JSON.stringify(['207L00000X']),
  },
  {
    npi: '208W00000X',
    provider_type: 'individual', organization_name: null,
    first_name: 'Brian', last_name: 'Martin',
    address: '2500 NW 7th Ave', city: 'Miami', state: 'FL', zip: '33127',
    phone: '(305) 555-1001', email: 'brian.martin@lungsurgeryfl.com',
    specialty_primary: 'Lung Surgery', taxonomy_codes: JSON.stringify(['208W00000X']),
  },
  {
    npi: '208W00001Y',
    provider_type: 'individual', organization_name: null,
    first_name: 'Olivia', last_name: 'Garcia',
    address: '601 SW 8th St', city: 'Fort Lauderdale', state: 'FL', zip: '33301',
    phone: '(954) 555-1002', email: 'olivia.garcia@lunginstitute.com',
    specialty_primary: 'Lung Surgery', taxonomy_codes: JSON.stringify(['208W00000X']),
  },
  {
    npi: '208W00002A',
    provider_type: 'organization', organization_name: 'Florida Thoracic Surgery Center',
    first_name: null, last_name: null,
    address: '4001 N Northlake Blvd', city: 'Orlando', state: 'FL', zip: '32804',
    phone: '(407) 555-1003', email: 'info@floridathoracicsurgery.com',
    specialty_primary: 'Lung Surgery', taxonomy_codes: JSON.stringify(['208W00000X']),
  },
  {
    npi: '207K00000X',
    provider_type: 'individual', organization_name: null,
    first_name: 'Steven', last_name: 'Roberts',
    address: '1600 NW 1st Ave', city: 'Miami', state: 'FL', zip: '33128',
    phone: '(305) 555-1101', email: 'steven.roberts@gastrofl.com',
    specialty_primary: 'Gastroenterology', taxonomy_codes: JSON.stringify(['207K00000X']),
  },
  {
    npi: '207K00001Y',
    provider_type: 'individual', organization_name: null,
    first_name: 'Elizabeth', last_name: 'Kim',
    address: '4001 N Northlake Blvd', city: 'Orlando', state: 'FL', zip: '32804',
    phone: '(407) 555-1102', email: 'elizabeth.kim@orlandogastro.com',
    specialty_primary: 'Gastroenterology', taxonomy_codes: JSON.stringify(['207K00000X']),
  },
  {
    npi: '207K00002A',
    provider_type: 'organization', organization_name: 'Florida Gastroenterology Associates',
    first_name: null, last_name: null,
    address: '501 S Bougainvillea Ave', city: 'Orlando', state: 'FL', zip: '32806',
    phone: '(407) 555-1103', email: 'info@floridagastro.com',
    specialty_primary: 'Gastroenterology', taxonomy_codes: JSON.stringify(['207K00000X']),
  },
  {
    npi: '207K00003B',
    provider_type: 'individual', organization_name: null,
    first_name: 'Andrew', last_name: 'Wilson',
    address: '3000 Clinical Dr', city: 'Tampa', state: 'FL', zip: '33613',
    phone: '(813) 555-1104', email: 'andrew.wilson@tampegastro.com',
    specialty_primary: 'Gastroenterology', taxonomy_codes: JSON.stringify(['207K00000X']),
  },
  {
    npi: '208U00000X',
    provider_type: 'individual', organization_name: null,
    first_name: 'Christopher', last_name: 'Lee',
    address: '1200 NW 12th Ave', city: 'Miami', state: 'FL', zip: '33125',
    phone: '(305) 555-1201', email: 'christopher.lee@gisurgeryfl.com',
    specialty_primary: 'GI Surgery', taxonomy_codes: JSON.stringify(['208U00000X']),
  },
  {
    npi: '208U00001Y',
    provider_type: 'individual', organization_name: null,
    first_name: 'Sophia', last_name: 'Gonzalez',
    address: '601 SW 8th St', city: 'Fort Lauderdale', state: 'FL', zip: '33301',
    phone: '(954) 555-1202', email: 'sophia.gonzalez@gisurgerycenter.com',
    specialty_primary: 'GI Surgery', taxonomy_codes: JSON.stringify(['208U00000X']),
  },
  {
    npi: '208U00002A',
    provider_type: 'organization', organization_name: 'Florida GI Surgery Institute',
    first_name: null, last_name: null,
    address: '4001 N Northlake Blvd', city: 'Orlando', state: 'FL', zip: '32804',
    phone: '(407) 555-1203', email: 'info@floridagisurgery.com',
    specialty_primary: 'GI Surgery', taxonomy_codes: JSON.stringify(['208U00000X']),
  },
  {
    npi: '208U00003B',
    provider_type: 'individual', organization_name: null,
    first_name: 'Matthew', last_name: 'Brown',
    address: '2001 E Central Blvd', city: 'Orlando', state: 'FL', zip: '32803',
    phone: '(407) 555-1204', email: 'matthew.brown@orlandogisurgery.com',
    specialty_primary: 'GI Surgery', taxonomy_codes: JSON.stringify(['208U00000X']),
  },
];

// Seed Florida providers endpoint - update existing providers with email if needed
seedRoutes.post('/florida-providers', async (c) => {
  const db = (c as any).env.DB as any;

  // Check existing count
  let checkStmt: any = db.prepare('SELECT COUNT(*) as count FROM npi_providers WHERE state = ?');
  checkStmt = checkStmt.bind('FL');
  const existing = await checkStmt.first();
  const existingCount = existing?.count || 0;

  // Insert or update providers
  let updatedCount = 0;
  for (const provider of floridaProviders) {
    try {
      // First check if provider exists
      let checkExistingStmt: any = db.prepare('SELECT id FROM npi_providers WHERE npi = ?');
      checkExistingStmt = checkExistingStmt.bind(provider.npi);
      const existingProvider = await checkExistingStmt.first();

      if (existingProvider) {
        // Update existing provider with email - overwrite if not set
        let updateStmt: any = db.prepare(`
          UPDATE npi_providers
          SET email = ?, phone = ?, specialty_primary = ?
          WHERE npi = ?
        `);
        updateStmt = updateStmt.bind(provider.email);
        updateStmt = updateStmt.bind(provider.phone);
        updateStmt = updateStmt.bind(provider.specialty_primary);
        updateStmt = updateStmt.bind(provider.npi);
        const result = await updateStmt.run();
        console.log('Update result for NPI', provider.npi, ':', result);
        // D1 run() returns { success: true }, so we count it as processed
        updatedCount++;
      } else {
        // Insert new provider
        const id = generateId();
        let insertStmt: any = db.prepare(`
          INSERT INTO npi_providers (
            id, npi, provider_type, first_name, last_name, organization_name,
            address, city, state, zip, phone, email, specialty_primary,
            taxonomy_codes, website, scraped_at, owner_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?)
        `);
        insertStmt = insertStmt.bind(id);
        insertStmt = insertStmt.bind(provider.npi);
        insertStmt = insertStmt.bind(provider.provider_type);
        insertStmt = insertStmt.bind(provider.first_name);
        insertStmt = insertStmt.bind(provider.last_name);
        insertStmt = insertStmt.bind(provider.organization_name);
        insertStmt = insertStmt.bind(provider.address);
        insertStmt = insertStmt.bind(provider.city);
        insertStmt = insertStmt.bind(provider.state);
        insertStmt = insertStmt.bind(provider.zip);
        insertStmt = insertStmt.bind(provider.phone);
        insertStmt = insertStmt.bind(provider.email);
        insertStmt = insertStmt.bind(provider.specialty_primary);
        insertStmt = insertStmt.bind(provider.taxonomy_codes);
        insertStmt = insertStmt.bind(provider.website || null);
        insertStmt = insertStmt.bind((c.get('user') as any)?.id || null);
        await insertStmt.run();
        updatedCount++;
      }
    } catch (e) {
      console.error('Error processing provider:', provider.npi, e);
    }
  }

  // Re-check count after updates
  checkStmt = db.prepare('SELECT COUNT(*) as count FROM npi_providers WHERE state = ?');
  checkStmt = checkStmt.bind('FL');
  const newExisting = await checkStmt.first();
  const finalCount = newExisting?.count || 0;

  return c.json({
    message: `Successfully processed Florida providers`,
    data: {
      total_in_batch: floridaProviders.length,
      updated_or_inserted: updatedCount,
      final_count: finalCount,
    },
  }, 201);
});

// Create technical tasks for first 5 providers
seedRoutes.post('/create-technical-tasks', async (c) => {
  const db = (c as any).env.DB as any;
  const user = c.get('user');

  // Get first 5 providers
  let stmt: any = db.prepare(`SELECT id, npi, organization_name, first_name, last_name FROM npi_providers ORDER BY created_at LIMIT 5`);
  const result: any = await stmt.all();
  const providers = result.results || [];

  const technicalTasks = [
    { title: 'Verify CAQH Profile', description: 'Confirm provider CAQH profile is complete and up to date', priority: 'high' },
    { title: 'Submit EDI to Availity', description: 'Submit EDI enrollment forms to Availity for claims processing', priority: 'high' },
    { title: 'Test ERA Posting', description: 'Verify ERA files are being received and posted correctly', priority: 'medium' },
  ];

  let tasksCreated = 0;
  for (const provider of providers) {
    for (const task of technicalTasks) {
      const taskId = generateId();
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 7); // 7 days from now

      let taskStmt: any = db.prepare(`
        INSERT INTO tasks (id, title, description, status, priority, due_date, related_type, related_id, owner_id, created_at)
        VALUES (?, ?, ?, 'pending', ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `);
      taskStmt = taskStmt.bind(taskId);
      taskStmt = taskStmt.bind(task.title);
      taskStmt = taskStmt.bind(task.description);
      taskStmt = taskStmt.bind(task.priority);
      taskStmt = taskStmt.bind(dueDate.toISOString().split('T')[0]);
      taskStmt = taskStmt.bind('provider');
      taskStmt = taskStmt.bind(provider.id);
      taskStmt = taskStmt.bind(user?.id || null);
      await taskStmt.run();
      tasksCreated++;
    }
  }

  return c.json({
    message: `Created ${tasksCreated} technical tasks for ${providers.length} providers`,
    data: { tasksCreated, providersCount: providers.length },
  }, 201);
});
