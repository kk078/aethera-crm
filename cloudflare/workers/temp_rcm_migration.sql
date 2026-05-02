-- ============================================
-- RCM Pipeline Migration for Aethera CRM
-- Adds onboarding checklists, document vault, and pipeline stages
-- ============================================

-- Create onboarding_checklists table
CREATE TABLE IF NOT EXISTS onboarding_checklists (
  id TEXT PRIMARY KEY,
  deal_id TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  baas_executed INTEGER DEFAULT 0,
  baas_signed_date DATETIME,
  service_agreement_executed INTEGER DEFAULT 0,
  service_agreement_signed_date DATETIME,
  edi_enrollment_status TEXT DEFAULT 'pending',
  clearinghouse_integration_status TEXT DEFAULT 'pending',
  clearinghouse_name TEXT,
  test_transactions_sent INTEGER DEFAULT 0,
  production_transactions_enabled INTEGER DEFAULT 0,
  npi_verification_status TEXT DEFAULT 'pending',
  caqh_verification_status TEXT DEFAULT 'pending',
  payer_linking_status TEXT DEFAULT 'pending',
  credentialing_complete INTEGER DEFAULT 0,
  credentialing_complete_date DATETIME,
  overall_status TEXT DEFAULT 'in_progress',
  last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create document_vault table for provider document tracking
CREATE TABLE IF NOT EXISTS document_vault (
  id TEXT PRIMARY KEY,
  provider_id TEXT NOT NULL REFERENCES npi_providers(id),
  deal_id TEXT REFERENCES deals(id),
  document_type TEXT NOT NULL,
  document_name TEXT,
  document_path TEXT,
  uploaded_at DATETIME,
  status TEXT DEFAULT 'pending',
  reviewed_by TEXT REFERENCES users(id),
  reviewed_at DATETIME,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Add onboarding_status column to npi_providers if not exists
-- Using table recreation approach for SQLite compatibility

-- Create a temp table to track if we need to add column
CREATE TABLE IF NOT EXISTS temp_check_columns (id INTEGER);

-- Add onboarding_status to deals table (already exists from previous migration)
-- Update existing deals to have onboarding_stage defaults
UPDATE deals SET onboarding_stage = 'initial' WHERE onboarding_stage IS NULL OR onboarding_stage = '';

-- Add pipeline_stage column to deals table if not exists
-- SQLite doesn't support ADD COLUMN IF NOT EXISTS, so we need a different approach

-- Check if column exists and add it if not
-- We'll use a workaround: create a temp table with the new structure

CREATE TABLE IF NOT EXISTS deals_new (
  id TEXT PRIMARY KEY,
  contact_id TEXT REFERENCES contacts(id),
  organization_id TEXT REFERENCES organizations(id),
  provider_id TEXT REFERENCES npi_providers(id),
  name TEXT NOT NULL,
  pipeline_stage TEXT DEFAULT 'qualified',
  onboarding_stage TEXT DEFAULT 'initial',
  stage TEXT,
  amount REAL,
  probability REAL,
  expected_close_date DATETIME,
  actual_close_date DATETIME,
  lost_reason TEXT,
  owner_id TEXT REFERENCES users(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Copy data from old table if columns don't exist yet
INSERT INTO deals_new (id, contact_id, organization_id, name, stage, amount, probability, expected_close_date, actual_close_date, lost_reason, owner_id, created_at, updated_at)
SELECT id, contact_id, organization_id, name, stage, amount, probability, expected_close_date, actual_close_date, lost_reason, owner_id, created_at, updated_at
FROM deals
WHERE (SELECT COUNT(*) FROM pragma_table_info('deals') WHERE name = 'pipeline_stage') = 0;

-- Drop old table and rename new one
DROP TABLE IF EXISTS deals;
ALTER TABLE deals_new RENAME TO deals;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_deals_pipeline_stage ON deals(pipeline_stage);
CREATE INDEX IF NOT EXISTS idx_deals_onboarding_stage ON deals(onboarding_stage);
CREATE INDEX IF NOT EXISTS idx_onboarding_checklist_deal_id ON onboarding_checklists(deal_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_checklist_provider_id ON onboarding_checklists(provider_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_checklist_status ON onboarding_checklists(overall_status);

-- Update existing deals to have pipeline_stage
UPDATE deals SET pipeline_stage = 'qualified' WHERE pipeline_stage IS NULL OR pipeline_stage = '';
UPDATE deals SET onboarding_stage = 'initial' WHERE onboarding_stage IS NULL OR onboarding_stage = '';
