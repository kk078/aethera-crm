-- Florida Providers Seed Data
-- Generated for Aethera-CRM D1 Database
-- Check if providers exist before inserting to avoid duplicates

-- Only insert if no Florida providers exist
INSERT INTO npi_providers (id, npi, provider_type, first_name, last_name, organization_name, address, city, state, zip, phone, email, specialty_primary, taxonomy_codes, website, scraped_at, owner_id)
SELECT '00000000-0000-0000-0000-000000000001', '100300000X', 'organization', NULL, NULL, 'Florida Aging Specialists Group', '1200 S Miami Ave', 'Miami', 'FL', '33130', '(305) 555-0101', 'contact@floridaagerspecialists.com', 'Geriatrics', '["111NI0001X"]', 'https://floridaagerspecialists.com', CURRENT_TIMESTAMP, NULL
WHERE NOT EXISTS (SELECT 1 FROM npi_providers WHERE state = 'FL' AND npi = '100300000X');

INSERT INTO npi_providers (id, npi, provider_type, first_name, last_name, organization_name, address, city, state, zip, phone, email, specialty_primary, taxonomy_codes, website, scraped_at, owner_id)
SELECT '00000000-0000-0000-0000-000000000002', '100300001A', 'individual', 'Sarah', 'Johnson', NULL, '4000 NE 4th St', 'Miami', 'FL', '33137', '(305) 555-0102', 'sarah.johnson@agingcare.com', 'Geriatrics', '["111NI0001X"]', NULL, CURRENT_TIMESTAMP, NULL
WHERE NOT EXISTS (SELECT 1 FROM npi_providers WHERE state = 'FL' AND npi = '100300001A');

INSERT INTO npi_providers (id, npi, provider_type, first_name, last_name, organization_name, address, city, state, zip, phone, email, specialty_primary, taxonomy_codes, website, scraped_at, owner_id)
SELECT '00000000-0000-0000-0000-000000000003', '100300002B', 'individual', 'Michael', 'Roberts', NULL, '5500 Biscayne Blvd', 'Miami', 'FL', '33137', '(305) 555-0103', 'm.roberts@seniorcarefl.com', 'Geriatrics', '["111NI0001X"]', NULL, CURRENT_TIMESTAMP, NULL
WHERE NOT EXISTS (SELECT 1 FROM npi_providers WHERE state = 'FL' AND npi = '100300002B');

INSERT INTO npi_providers (id, npi, provider_type, first_name, last_name, organization_name, address, city, state, zip, phone, email, specialty_primary, taxonomy_codes, website, scraped_at, owner_id)
SELECT '00000000-0000-0000-0000-000000000004', '100300003C', 'individual', 'Emily', 'Chen', NULL, '8900 NW 4th St', 'Miami Gardens', 'FL', '33056', '(305) 555-0104', 'emily.chen@aginghealth.com', 'Geriatrics', '["111NI0001X"]', NULL, CURRENT_TIMESTAMP, NULL
WHERE NOT EXISTS (SELECT 1 FROM npi_providers WHERE state = 'FL' AND npi = '100300003C');

INSERT INTO npi_providers (id, npi, provider_type, first_name, last_name, organization_name, address, city, state, zip, phone, email, specialty_primary, taxonomy_codes, website, scraped_at, owner_id)
SELECT '00000000-0000-0000-0000-000000000005', '100300004D', 'organization', NULL, NULL, 'South Florida Geriatrics Associates', '2000 S State Rd 7', 'Homestead', 'FL', '33030', '(305) 555-0105', 'info@southflgeriatrics.com', 'Geriatrics', '["111NI0001X"]', NULL, CURRENT_TIMESTAMP, NULL
WHERE NOT EXISTS (SELECT 1 FROM npi_providers WHERE state = 'FL' AND npi = '100300004D');

INSERT INTO npi_providers (id, npi, provider_type, first_name, last_name, organization_name, address, city, state, zip, phone, email, specialty_primary, taxonomy_codes, website, scraped_at, owner_id)
SELECT '00000000-0000-0000-0000-000000000006', '200300000X', 'individual', 'James', 'Williams', NULL, '1600 NW 1st Ave', 'Miami', 'FL', '33128', '(305) 555-0201', 'james.williams@cardiologyfl.com', 'Cardiology', '["208B00000X"]', 'https://cardiologyfl.com', CURRENT_TIMESTAMP, NULL
WHERE NOT EXISTS (SELECT 1 FROM npi_providers WHERE state = 'FL' AND npi = '200300000X');

INSERT INTO npi_providers (id, npi, provider_type, first_name, last_name, organization_name, address, city, state, zip, phone, email, specialty_primary, taxonomy_codes, website, scraped_at, owner_id)
SELECT '00000000-0000-0000-0000-000000000007', '200300001Y', 'individual', 'Lisa', 'Martinez', NULL, '4400 Bayside Dr', 'Tampa', 'FL', '33611', '(813) 555-0202', 'lisa.martinez@tampacardiology.com', 'Cardiology', '["208B00000X"]', NULL, CURRENT_TIMESTAMP, NULL
WHERE NOT EXISTS (SELECT 1 FROM npi_providers WHERE state = 'FL' AND npi = '200300001Y');

INSERT INTO npi_providers (id, npi, provider_type, first_name, last_name, organization_name, address, city, state, zip, phone, email, specialty_primary, taxonomy_codes, website, scraped_at, owner_id)
SELECT '00000000-0000-0000-0000-000000000008', '200300002A', 'organization', NULL, NULL, 'Florida Heart Institute', '501 S Bougainvillea Ave', 'Orlando', 'FL', '32806', '(407) 555-0203', 'info@floridaheartinstitute.com', 'Cardiology', '["208B00000X"]', NULL, CURRENT_TIMESTAMP, NULL
WHERE NOT EXISTS (SELECT 1 FROM npi_providers WHERE state = 'FL' AND npi = '200300002A');

INSERT INTO npi_providers (id, npi, provider_type, first_name, last_name, organization_name, address, city, state, zip, phone, email, specialty_primary, taxonomy_codes, website, scraped_at, owner_id)
SELECT '00000000-0000-0000-0000-000000000009', '200300003B', 'individual', 'Robert', 'Garcia', NULL, '3000 Clinical Dr', 'Tampa', 'FL', '33613', '(813) 555-0204', 'robert.garcia@cardiologists.com', 'Cardiology', '["208B00000X"]', NULL, CURRENT_TIMESTAMP, NULL
WHERE NOT EXISTS (SELECT 1 FROM npi_providers WHERE state = 'FL' AND npi = '200300003B');

INSERT INTO npi_providers (id, npi, provider_type, first_name, last_name, organization_name, address, city, state, zip, phone, email, specialty_primary, taxonomy_codes, website, scraped_at, owner_id)
SELECT '00000000-0000-0000-0000-000000000010', '200300004C', 'individual', 'Patricia', 'Thompson', NULL, '8000 US Highway 1', 'Jupiter', 'FL', '33458', '(561) 555-0205', 'patricia.thompson@palmbeachheart.com', 'Cardiology', '["208B00000X"]', NULL, CURRENT_TIMESTAMP, NULL
WHERE NOT EXISTS (SELECT 1 FROM npi_providers WHERE state = 'FL' AND npi = '200300004C');

INSERT INTO npi_providers (id, npi, provider_type, first_name, last_name, organization_name, address, city, state, zip, phone, email, specialty_primary, taxonomy_codes, website, scraped_at, owner_id)
SELECT '00000000-0000-0000-0000-000000000011', '208200000X', 'individual', 'Alan', 'Brown', NULL, '1200 NW 12th Ave', 'Miami', 'FL', '33125', '(305) 555-0301', 'alan.brown@svmcfl.com', 'Heart Surgery', '["208200000X"]', NULL, CURRENT_TIMESTAMP, NULL
WHERE NOT EXISTS (SELECT 1 FROM npi_providers WHERE state = 'FL' AND npi = '208200000X');

INSERT INTO npi_providers (id, npi, provider_type, first_name, last_name, organization_name, address, city, state, zip, phone, email, specialty_primary, taxonomy_codes, website, scraped_at, owner_id)
SELECT '00000000-0000-0000-0000-000000000012', '208200001Y', 'individual', 'Jennifer', 'Lee', NULL, '601 SW 8th St', 'Fort Lauderdale', 'FL', '33301', '(954) 555-0302', 'jennifer.lee@baptisthealth.net', 'Heart Surgery', '["208200000X"]', NULL, CURRENT_TIMESTAMP, NULL
WHERE NOT EXISTS (SELECT 1 FROM npi_providers WHERE state = 'FL' AND npi = '208200001Y');

INSERT INTO npi_providers (id, npi, provider_type, first_name, last_name, organization_name, address, city, state, zip, phone, email, specialty_primary, taxonomy_codes, website, scraped_at, owner_id)
SELECT '00000000-0000-0000-0000-000000000013', '208200002A', 'organization', NULL, NULL, 'Florida Cardiac Surgery Center', '4001 N Northlake Blvd', 'Orlando', 'FL', '32804', '(407) 555-0303', 'info@floridacardiacsurgery.com', 'Heart Surgery', '["208200000X"]', NULL, CURRENT_TIMESTAMP, NULL
WHERE NOT EXISTS (SELECT 1 FROM npi_providers WHERE state = 'FL' AND npi = '208200002A');

INSERT INTO npi_providers (id, npi, provider_type, first_name, last_name, organization_name, address, city, state, zip, phone, email, specialty_primary, taxonomy_codes, website, scraped_at, owner_id)
SELECT '00000000-0000-0000-0000-000000000014', '208200003B', 'individual', 'David', 'Wilson', NULL, '2001 E Central Blvd', 'Orlando', 'FL', '32803', '(407) 555-0304', 'david.wilson@orlandohealth.com', 'Heart Surgery', '["208200000X"]', NULL, CURRENT_TIMESTAMP, NULL
WHERE NOT EXISTS (SELECT 1 FROM npi_providers WHERE state = 'FL' AND npi = '208200003B');

INSERT INTO npi_providers (id, npi, provider_type, first_name, last_name, organization_name, address, city, state, zip, phone, email, specialty_primary, taxonomy_codes, website, scraped_at, owner_id)
SELECT '00000000-0000-0000-0000-000000000015', '208000000X', 'individual', 'Maria', 'Rodriguez', NULL, '1200 SW 8th St', 'Miami', 'FL', '33135', '(305) 555-0401', 'maria.rodriguez@miamicancer.com', 'Oncology', '["208000000X"]', NULL, CURRENT_TIMESTAMP, NULL
WHERE NOT EXISTS (SELECT 1 FROM npi_providers WHERE state = 'FL' AND npi = '208000000X');

INSERT INTO npi_providers (id, npi, provider_type, first_name, last_name, organization_name, address, city, state, zip, phone, email, specialty_primary, taxonomy_codes, website, scraped_at, owner_id)
SELECT '00000000-0000-0000-0000-000000000016', '208000001Y', 'individual', 'William', 'Anderson', NULL, '4500 N Nebraska Ave', 'Tampa', 'FL', '33603', '(813) 555-0402', 'william.anderson@tampacancer.com', 'Oncology', '["208000000X"]', NULL, CURRENT_TIMESTAMP, NULL
WHERE NOT EXISTS (SELECT 1 FROM npi_providers WHERE state = 'FL' AND npi = '208000001Y');

INSERT INTO npi_providers (id, npi, provider_type, first_name, last_name, organization_name, address, city, state, zip, phone, email, specialty_primary, taxonomy_codes, website, scraped_at, owner_id)
SELECT '00000000-0000-0000-0000-000000000017', '208000002A', 'organization', NULL, NULL, 'Florida Cancer Specialists', '8000 Federal Park Dr', 'Tampa', 'FL', '33604', '(813) 555-0403', 'info@floridacancerspecialists.com', 'Oncology', '["208000000X"]', NULL, CURRENT_TIMESTAMP, NULL
WHERE NOT EXISTS (SELECT 1 FROM npi_providers WHERE state = 'FL' AND npi = '208000002A');

INSERT INTO npi_providers (id, npi, provider_type, first_name, last_name, organization_name, address, city, state, zip, phone, email, specialty_primary, taxonomy_codes, website, scraped_at, owner_id)
SELECT '00000000-0000-0000-0000-000000000018', '208000003B', 'individual', 'Karen', 'Thomas', NULL, '600 Clinical Center Dr', 'Orlando', 'FL', '32806', '(407) 555-0404', 'karen.thomas@orlandocancer.com', 'Oncology', '["208000000X"]', NULL, CURRENT_TIMESTAMP, NULL
WHERE NOT EXISTS (SELECT 1 FROM npi_providers WHERE state = 'FL' AND npi = '208000003B');

INSERT INTO npi_providers (id, npi, provider_type, first_name, last_name, organization_name, address, city, state, zip, phone, email, specialty_primary, taxonomy_codes, website, scraped_at, owner_id)
SELECT '00000000-0000-0000-0000-000000000019', '208000004C', 'individual', 'Richard', 'Jackson', NULL, '9000 N Old Aggie Rd', 'Gainesville', 'FL', '32608', '(352) 555-0405', 'richard.jackson@ufhealth.org', 'Oncology', '["208000000X"]', NULL, CURRENT_TIMESTAMP, NULL
WHERE NOT EXISTS (SELECT 1 FROM npi_providers WHERE state = 'FL' AND npi = '208000004C');

INSERT INTO npi_providers (id, npi, provider_type, first_name, last_name, organization_name, address, city, state, zip, phone, email, specialty_primary, taxonomy_codes, website, scraped_at, owner_id)
SELECT '00000000-0000-0000-0000-000000000020', '208N00000X', 'individual', 'Daniel', 'Harris', NULL, '1200 NW 14th St', 'Gainesville', 'FL', '32603', '(352) 555-0501', 'daniel.harris@neurofl.com', 'Neurology', '["208N00000X"]', NULL, CURRENT_TIMESTAMP, NULL
WHERE NOT EXISTS (SELECT 1 FROM npi_providers WHERE state = 'FL' AND npi = '208N00000X');

INSERT INTO npi_providers (id, npi, provider_type, first_name, last_name, organization_name, address, city, state, zip, phone, email, specialty_primary, taxonomy_codes, website, scraped_at, owner_id)
SELECT '00000000-0000-0000-0000-000000000021', '208N00001Y', 'individual', 'Laura', 'Martinez', NULL, '2500 NW 1st Ave', 'Miami', 'FL', '33127', '(305) 555-0502', 'laura.martinez@neurologycenter.com', 'Neurology', '["208N00000X"]', NULL, CURRENT_TIMESTAMP, NULL
WHERE NOT EXISTS (SELECT 1 FROM npi_providers WHERE state = 'FL' AND npi = '208N00001Y');

INSERT INTO npi_providers (id, npi, provider_type, first_name, last_name, organization_name, address, city, state, zip, phone, email, specialty_primary, taxonomy_codes, website, scraped_at, owner_id)
SELECT '00000000-0000-0000-0000-000000000022', '208N00002A', 'organization', NULL, NULL, 'Florida Neurological Associates', '4001 N Northlake Blvd', 'Orlando', 'FL', '32804', '(407) 555-0503', 'info@floridanurology.com', 'Neurology', '["208N00000X"]', NULL, CURRENT_TIMESTAMP, NULL
WHERE NOT EXISTS (SELECT 1 FROM npi_providers WHERE state = 'FL' AND npi = '208N00002A');

INSERT INTO npi_providers (id, npi, provider_type, first_name, last_name, organization_name, address, city, state, zip, phone, email, specialty_primary, taxonomy_codes, website, scraped_at, owner_id)
SELECT '00000000-0000-0000-0000-000000000023', '208N00003B', 'individual', 'Paul', 'Garcia', NULL, '801 N University Dr', 'Pembroke Pines', 'FL', '33024', '(954) 555-0504', 'paul.garcia@neurospecialists.com', 'Neurology', '["208N00000X"]', NULL, CURRENT_TIMESTAMP, NULL
WHERE NOT EXISTS (SELECT 1 FROM npi_providers WHERE state = 'FL' AND npi = '208N00003B');

INSERT INTO npi_providers (id, npi, provider_type, first_name, last_name, organization_name, address, city, state, zip, phone, email, specialty_primary, taxonomy_codes, website, scraped_at, owner_id)
SELECT '00000000-0000-0000-0000-000000000024', '208Q00000X', 'individual', 'Kevin', 'Smith', NULL, '1200 SW 16th St', 'Miami', 'FL', '33130', '(305) 555-0601', 'kevin.smith@neurosurgeryfl.com', 'Neurosurgery', '["208Q00000X"]', NULL, CURRENT_TIMESTAMP, NULL
WHERE NOT EXISTS (SELECT 1 FROM npi_providers WHERE state = 'FL' AND npi = '208Q00000X');

INSERT INTO npi_providers (id, npi, provider_type, first_name, last_name, organization_name, address, city, state, zip, phone, email, specialty_primary, taxonomy_codes, website, scraped_at, owner_id)
SELECT '00000000-0000-0000-0000-000000000025', '208Q00001Y', 'individual', 'Amanda', 'Johnson', NULL, '601 SW 8th St', 'Fort Lauderdale', 'FL', '33301', '(954) 555-0602', 'amanda.johnson@neurosurgcenter.com', 'Neurosurgery', '["208Q00000X"]', NULL, CURRENT_TIMESTAMP, NULL
WHERE NOT EXISTS (SELECT 1 FROM npi_providers WHERE state = 'FL' AND npi = '208Q00001Y');

INSERT INTO npi_providers (id, npi, provider_type, first_name, last_name, organization_name, address, city, state, zip, phone, email, specialty_primary, taxonomy_codes, website, scraped_at, owner_id)
SELECT '00000000-0000-0000-0000-000000000026', '208Q00002A', 'organization', NULL, NULL, 'Florida Neurosurgery Institute', '4001 N Northlake Blvd', 'Orlando', 'FL', '32804', '(407) 555-0603', 'info@floridaneurosurgery.com', 'Neurosurgery', '["208Q00000X"]', NULL, CURRENT_TIMESTAMP, NULL
WHERE NOT EXISTS (SELECT 1 FROM npi_providers WHERE state = 'FL' AND npi = '208Q00002A');

INSERT INTO npi_providers (id, npi, provider_type, first_name, last_name, organization_name, address, city, state, zip, phone, email, specialty_primary, taxonomy_codes, website, scraped_at, owner_id)
SELECT '00000000-0000-0000-0000-000000000027', '208Q00003B', 'individual', 'Steven', 'White', NULL, '301 S Main St', 'Orlando', 'FL', '32801', '(407) 555-0604', 'steven.white@orlandoneurosurgery.com', 'Neurosurgery', '["208Q00000X"]', NULL, CURRENT_TIMESTAMP, NULL
WHERE NOT EXISTS (SELECT 1 FROM npi_providers WHERE state = 'FL' AND npi = '208Q00003B');

INSERT INTO npi_providers (id, npi, provider_type, first_name, last_name, organization_name, address, city, state, zip, phone, email, specialty_primary, taxonomy_codes, website, scraped_at, owner_id)
SELECT '00000000-0000-0000-0000-000000000028', '208P00000X', 'individual', 'Thomas', 'Brown', NULL, '2500 NW 7th Ave', 'Miami', 'FL', '33127', '(305) 555-0701', 'thomas.brown@orthofl.com', 'Orthopedics', '["208P00000X"]', NULL, CURRENT_TIMESTAMP, NULL
WHERE NOT EXISTS (SELECT 1 FROM npi_providers WHERE state = 'FL' AND npi = '208P00000X');

INSERT INTO npi_providers (id, npi, provider_type, first_name, last_name, organization_name, address, city, state, zip, phone, email, specialty_primary, taxonomy_codes, website, scraped_at, owner_id)
SELECT '00000000-0000-0000-0000-000000000029', '208P00001Y', 'individual', 'Michelle', 'Davis', NULL, '4500 N Nebraska Ave', 'Tampa', 'FL', '33603', '(813) 555-0702', 'michelle.davis@tampaorthopedic.com', 'Orthopedics', '["208P00000X"]', NULL, CURRENT_TIMESTAMP, NULL
WHERE NOT EXISTS (SELECT 1 FROM npi_providers WHERE state = 'FL' AND npi = '208P00001Y');

INSERT INTO npi_providers (id, npi, provider_type, first_name, last_name, organization_name, address, city, state, zip, phone, email, specialty_primary, taxonomy_codes, website, scraped_at, owner_id)
SELECT '00000000-0000-0000-0000-000000000030', '208P00002A', 'organization', NULL, NULL, 'Florida Orthopedic Center', '8000 Federal Park Dr', 'Tampa', 'FL', '33604', '(813) 555-0703', 'info@floridaorthopedic.com', 'Orthopedics', '["208P00000X"]', NULL, CURRENT_TIMESTAMP, NULL
WHERE NOT EXISTS (SELECT 1 FROM npi_providers WHERE state = 'FL' AND npi = '208P00002A');

INSERT INTO npi_providers (id, npi, provider_type, first_name, last_name, organization_name, address, city, state, zip, phone, email, specialty_primary, taxonomy_codes, website, scraped_at, owner_id)
SELECT '00000000-0000-0000-0000-000000000031', '208P00003B', 'individual', 'Robert', 'Miller', NULL, '601 W Vine Ave', 'Orlando', 'FL', '32801', '(407) 555-0704', 'robert.miller@orthospecialists.com', 'Orthopedics', '["208P00000X"]', NULL, CURRENT_TIMESTAMP, NULL
WHERE NOT EXISTS (SELECT 1 FROM npi_providers WHERE state = 'FL' AND npi = '208P00003B');

INSERT INTO npi_providers (id, npi, provider_type, first_name, last_name, organization_name, address, city, state, zip, phone, email, specialty_primary, taxonomy_codes, website, scraped_at, owner_id)
SELECT '00000000-0000-0000-0000-000000000032', '208P00004C', 'individual', 'Jessica', 'Wilson', NULL, '9000 N Old Aggie Rd', 'Gainesville', 'FL', '32608', '(352) 555-0705', 'jessica.wilson@uforthopedics.com', 'Orthopedics', '["208P00000X"]', NULL, CURRENT_TIMESTAMP, NULL
WHERE NOT EXISTS (SELECT 1 FROM npi_providers WHERE state = 'FL' AND npi = '208P00004C');

INSERT INTO npi_providers (id, npi, provider_type, first_name, last_name, organization_name, address, city, state, zip, phone, email, specialty_primary, taxonomy_codes, website, scraped_at, owner_id)
SELECT '00000000-0000-0000-0000-000000000033', '208T00000X', 'individual', 'Mark', 'Taylor', NULL, '1200 S Dixie Fry Rd', 'Coral Gables', 'FL', '33146', '(305) 555-0801', 'mark.taylor@urologyfl.com', 'Urology', '["208T00000X"]', NULL, CURRENT_TIMESTAMP, NULL
WHERE NOT EXISTS (SELECT 1 FROM npi_providers WHERE state = 'FL' AND npi = '208T00000X');

INSERT INTO npi_providers (id, npi, provider_type, first_name, last_name, organization_name, address, city, state, zip, phone, email, specialty_primary, taxonomy_codes, website, scraped_at, owner_id)
SELECT '00000000-0000-0000-0000-000000000034', '208T00001Y', 'individual', 'Susan', 'Moore', NULL, '4001 N Northlake Blvd', 'Orlando', 'FL', '32804', '(407) 555-0802', 'susan.moore@uromedical.com', 'Urology', '["208T00000X"]', NULL, CURRENT_TIMESTAMP, NULL
WHERE NOT EXISTS (SELECT 1 FROM npi_providers WHERE state = 'FL' AND npi = '208T00001Y');

INSERT INTO npi_providers (id, npi, provider_type, first_name, last_name, organization_name, address, city, state, zip, phone, email, specialty_primary, taxonomy_codes, website, scraped_at, owner_id)
SELECT '00000000-0000-0000-0000-000000000035', '208T00002A', 'organization', NULL, NULL, 'Florida Urology Associates', '501 S Bougainvillea Ave', 'Orlando', 'FL', '32806', '(407) 555-0803', 'info@floridaurology.com', 'Urology', '["208T00000X"]', NULL, CURRENT_TIMESTAMP, NULL
WHERE NOT EXISTS (SELECT 1 FROM npi_providers WHERE state = 'FL' AND npi = '208T00002A');

INSERT INTO npi_providers (id, npi, provider_type, first_name, last_name, organization_name, address, city, state, zip, phone, email, specialty_primary, taxonomy_codes, website, scraped_at, owner_id)
SELECT '00000000-0000-0000-0000-000000000036', '208T00003B', 'individual', 'James', 'Jackson', NULL, '3000 Clinical Dr', 'Tampa', 'FL', '33613', '(813) 555-0804', 'james.jackson@tampaurology.com', 'Urology', '["208T00000X"]', NULL, CURRENT_TIMESTAMP, NULL
WHERE NOT EXISTS (SELECT 1 FROM npi_providers WHERE state = 'FL' AND npi = '208T00003B');

INSERT INTO npi_providers (id, npi, provider_type, first_name, last_name, organization_name, address, city, state, zip, phone, email, specialty_primary, taxonomy_codes, website, scraped_at, owner_id)
SELECT '00000000-0000-0000-0000-000000000037', '207L00000X', 'individual', 'Nancy', 'Anderson', NULL, '1200 SW 16th St', 'Miami', 'FL', '33130', '(305) 555-0901', 'nancy.anderson@pulmonologyfl.com', 'Pulmonology', '["207L00000X"]', NULL, CURRENT_TIMESTAMP, NULL
WHERE NOT EXISTS (SELECT 1 FROM npi_providers WHERE state = 'FL' AND npi = '207L00000X');

INSERT INTO npi_providers (id, npi, provider_type, first_name, last_name, organization_name, address, city, state, zip, phone, email, specialty_primary, taxonomy_codes, website, scraped_at, owner_id)
SELECT '00000000-0000-0000-0000-000000000038', '207L00001Y', 'individual', 'George', 'Thomas', NULL, '4500 N Nebraska Ave', 'Tampa', 'FL', '33603', '(813) 555-0902', 'george.thomas@tampapulmonary.com', 'Pulmonology', '["207L00000X"]', NULL, CURRENT_TIMESTAMP, NULL
WHERE NOT EXISTS (SELECT 1 FROM npi_providers WHERE state = 'FL' AND npi = '207L00001Y');

INSERT INTO npi_providers (id, npi, provider_type, first_name, last_name, organization_name, address, city, state, zip, phone, email, specialty_primary, taxonomy_codes, website, scraped_at, owner_id)
SELECT '00000000-0000-0000-0000-000000000039', '207L00002A', 'organization', NULL, NULL, 'Florida Pulmonary Specialists', '8000 Federal Park Dr', 'Tampa', 'FL', '33604', '(813) 555-0903', 'info@floridapulmonary.com', 'Pulmonology', '["207L00000X"]', NULL, CURRENT_TIMESTAMP, NULL
WHERE NOT EXISTS (SELECT 1 FROM npi_providers WHERE state = 'FL' AND npi = '207L00002A');

INSERT INTO npi_providers (id, npi, provider_type, first_name, last_name, organization_name, address, city, state, zip, phone, email, specialty_primary, taxonomy_codes, website, scraped_at, owner_id)
SELECT '00000000-0000-0000-0000-000000000040', '207L00003B', 'individual', 'Diana', 'Harris', NULL, '601 W Vine Ave', 'Orlando', 'FL', '32801', '(407) 555-0904', 'diana.harris@orlandopulmonary.com', 'Pulmonology', '["207L00000X"]', NULL, CURRENT_TIMESTAMP, NULL
WHERE NOT EXISTS (SELECT 1 FROM npi_providers WHERE state = 'FL' AND npi = '207L00003B');

INSERT INTO npi_providers (id, npi, provider_type, first_name, last_name, organization_name, address, city, state, zip, phone, email, specialty_primary, taxonomy_codes, website, scraped_at, owner_id)
SELECT '00000000-0000-0000-0000-000000000041', '208W00000X', 'individual', 'Brian', 'Martin', NULL, '2500 NW 7th Ave', 'Miami', 'FL', '33127', '(305) 555-1001', 'brian.martin@lungsurgeryfl.com', 'Lung Surgery', '["208W00000X"]', NULL, CURRENT_TIMESTAMP, NULL
WHERE NOT EXISTS (SELECT 1 FROM npi_providers WHERE state = 'FL' AND npi = '208W00000X');

INSERT INTO npi_providers (id, npi, provider_type, first_name, last_name, organization_name, address, city, state, zip, phone, email, specialty_primary, taxonomy_codes, website, scraped_at, owner_id)
SELECT '00000000-0000-0000-0000-000000000042', '208W00001Y', 'individual', 'Olivia', 'Garcia', NULL, '601 SW 8th St', 'Fort Lauderdale', 'FL', '33301', '(954) 555-1002', 'olivia.garcia@lunginstitute.com', 'Lung Surgery', '["208W00000X"]', NULL, CURRENT_TIMESTAMP, NULL
WHERE NOT EXISTS (SELECT 1 FROM npi_providers WHERE state = 'FL' AND npi = '208W00001Y');

INSERT INTO npi_providers (id, npi, provider_type, first_name, last_name, organization_name, address, city, state, zip, phone, email, specialty_primary, taxonomy_codes, website, scraped_at, owner_id)
SELECT '00000000-0000-0000-0000-000000000043', '208W00002A', 'organization', NULL, NULL, 'Florida Thoracic Surgery Center', '4001 N Northlake Blvd', 'Orlando', 'FL', '32804', '(407) 555-1003', 'info@floridathoracicsurgery.com', 'Lung Surgery', '["208W00000X"]', NULL, CURRENT_TIMESTAMP, NULL
WHERE NOT EXISTS (SELECT 1 FROM npi_providers WHERE state = 'FL' AND npi = '208W00002A');

INSERT INTO npi_providers (id, npi, provider_type, first_name, last_name, organization_name, address, city, state, zip, phone, email, specialty_primary, taxonomy_codes, website, scraped_at, owner_id)
SELECT '00000000-0000-0000-0000-000000000044', '207K00000X', 'individual', 'Steven', 'Roberts', NULL, '1600 NW 1st Ave', 'Miami', 'FL', '33128', '(305) 555-1101', 'steven.roberts@gastrofl.com', 'Gastroenterology', '["207K00000X"]', NULL, CURRENT_TIMESTAMP, NULL
WHERE NOT EXISTS (SELECT 1 FROM npi_providers WHERE state = 'FL' AND npi = '207K00000X');

INSERT INTO npi_providers (id, npi, provider_type, first_name, last_name, organization_name, address, city, state, zip, phone, email, specialty_primary, taxonomy_codes, website, scraped_at, owner_id)
SELECT '00000000-0000-0000-0000-000000000045', '207K00001Y', 'individual', 'Elizabeth', 'Kim', NULL, '4001 N Northlake Blvd', 'Orlando', 'FL', '32804', '(407) 555-1102', 'elizabeth.kim@orlandogastro.com', 'Gastroenterology', '["207K00000X"]', NULL, CURRENT_TIMESTAMP, NULL
WHERE NOT EXISTS (SELECT 1 FROM npi_providers WHERE state = 'FL' AND npi = '207K00001Y');

INSERT INTO npi_providers (id, npi, provider_type, first_name, last_name, organization_name, address, city, state, zip, phone, email, specialty_primary, taxonomy_codes, website, scraped_at, owner_id)
SELECT '00000000-0000-0000-0000-000000000046', '207K00002A', 'organization', NULL, NULL, 'Florida Gastroenterology Associates', '501 S Bougainvillea Ave', 'Orlando', 'FL', '32806', '(407) 555-1103', 'info@floridagastro.com', 'Gastroenterology', '["207K00000X"]', NULL, CURRENT_TIMESTAMP, NULL
WHERE NOT EXISTS (SELECT 1 FROM npi_providers WHERE state = 'FL' AND npi = '207K00002A');

INSERT INTO npi_providers (id, npi, provider_type, first_name, last_name, organization_name, address, city, state, zip, phone, email, specialty_primary, taxonomy_codes, website, scraped_at, owner_id)
SELECT '00000000-0000-0000-0000-000000000047', '207K00003B', 'individual', 'Andrew', 'Wilson', NULL, '3000 Clinical Dr', 'Tampa', 'FL', '33613', '(813) 555-1104', 'andrew.wilson@tampegastro.com', 'Gastroenterology', '["207K00000X"]', NULL, CURRENT_TIMESTAMP, NULL
WHERE NOT EXISTS (SELECT 1 FROM npi_providers WHERE state = 'FL' AND npi = '207K00003B');

INSERT INTO npi_providers (id, npi, provider_type, first_name, last_name, organization_name, address, city, state, zip, phone, email, specialty_primary, taxonomy_codes, website, scraped_at, owner_id)
SELECT '00000000-0000-0000-0000-000000000048', '208U00000X', 'individual', 'Christopher', 'Lee', NULL, '1200 NW 12th Ave', 'Miami', 'FL', '33125', '(305) 555-1201', 'christopher.lee@gisurgeryfl.com', 'GI Surgery', '["208U00000X"]', NULL, CURRENT_TIMESTAMP, NULL
WHERE NOT EXISTS (SELECT 1 FROM npi_providers WHERE state = 'FL' AND npi = '208U00000X');

INSERT INTO npi_providers (id, npi, provider_type, first_name, last_name, organization_name, address, city, state, zip, phone, email, specialty_primary, taxonomy_codes, website, scraped_at, owner_id)
SELECT '00000000-0000-0000-0000-000000000049', '208U00001Y', 'individual', 'Sophia', 'Gonzalez', NULL, '601 SW 8th St', 'Fort Lauderdale', 'FL', '33301', '(954) 555-1202', 'sophia.gonzalez@gisurgerycenter.com', 'GI Surgery', '["208U00000X"]', NULL, CURRENT_TIMESTAMP, NULL
WHERE NOT EXISTS (SELECT 1 FROM npi_providers WHERE state = 'FL' AND npi = '208U00001Y');

INSERT INTO npi_providers (id, npi, provider_type, first_name, last_name, organization_name, address, city, state, zip, phone, email, specialty_primary, taxonomy_codes, website, scraped_at, owner_id)
SELECT '00000000-0000-0000-0000-000000000050', '208U00002A', 'organization', NULL, NULL, 'Florida GI Surgery Institute', '4001 N Northlake Blvd', 'Orlando', 'FL', '32804', '(407) 555-1203', 'info@floridagisurgery.com', 'GI Surgery', '["208U00000X"]', NULL, CURRENT_TIMESTAMP, NULL
WHERE NOT EXISTS (SELECT 1 FROM npi_providers WHERE state = 'FL' AND npi = '208U00002A');

INSERT INTO npi_providers (id, npi, provider_type, first_name, last_name, organization_name, address, city, state, zip, phone, email, specialty_primary, taxonomy_codes, website, scraped_at, owner_id)
SELECT '00000000-0000-0000-0000-000000000051', '208U00003B', 'individual', 'Matthew', 'Brown', NULL, '2001 E Central Blvd', 'Orlando', 'FL', '32803', '(407) 555-1204', 'matthew.brown@orlandogisurgery.com', 'GI Surgery', '["208U00000X"]', NULL, CURRENT_TIMESTAMP, NULL
WHERE NOT EXISTS (SELECT 1 FROM npi_providers WHERE state = 'FL' AND npi = '208U00003B');
