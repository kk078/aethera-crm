-- ============================================
-- Aethera-CRM D1 Database Schema
-- ============================================

-- Users Table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  email TEXT,
  role TEXT DEFAULT 'admin',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_login DATETIME,
  is_active INTEGER DEFAULT 1
);

-- Organizations Table (B2B Accounts)
CREATE TABLE IF NOT EXISTS organizations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT,
  industry TEXT,
  website TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  phone TEXT,
  email TEXT,
  employee_count INTEGER,
  annual_revenue REAL,
  owner_id TEXT REFERENCES users(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Contacts Table (B2B + B2C)
CREATE TABLE IF NOT EXISTS contacts (
  id TEXT PRIMARY KEY,
  organization_id TEXT REFERENCES organizations(id),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  title TEXT,
  email TEXT,
  phone TEXT,
  mobile TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  linkedin_url TEXT,
  lead_score INTEGER,
  churn_risk INTEGER,
  owner_id TEXT REFERENCES users(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Leads Table
CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,
  source TEXT,
  status TEXT DEFAULT 'new',
  first_name TEXT,
  last_name TEXT,
  company TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  specialty TEXT,
  npi TEXT,
  taxonomy TEXT,
  lead_score INTEGER,
  score_factors TEXT,
  owner_id TEXT REFERENCES users(id),
  converted_to_contact_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Deals Table
CREATE TABLE IF NOT EXISTS deals (
  id TEXT PRIMARY KEY,
  contact_id TEXT REFERENCES contacts(id),
  organization_id TEXT REFERENCES organizations(id),
  name TEXT NOT NULL,
  stage TEXT NOT NULL,
  amount REAL,
  probability REAL,
  expected_close_date DATETIME,
  actual_close_date DATETIME,
  lost_reason TEXT,
  owner_id TEXT REFERENCES users(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Activities Table
CREATE TABLE IF NOT EXISTS activities (
  id TEXT PRIMARY KEY,
  contact_id TEXT REFERENCES contacts(id),
  deal_id TEXT REFERENCES deals(id),
  type TEXT NOT NULL,
  subject TEXT,
  description TEXT,
  status TEXT,
  due_date DATETIME,
  completed_at DATETIME,
  direction TEXT,
  email_data TEXT,
  call_data TEXT,
  owner_id TEXT REFERENCES users(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Emails Table (synced from Gmail)
CREATE TABLE IF NOT EXISTS emails (
  id TEXT PRIMARY KEY,
  message_id TEXT UNIQUE NOT NULL,
  thread_id TEXT,
  from_address TEXT NOT NULL,
  to_addresses TEXT,
  subject TEXT,
  body TEXT,
  html_body TEXT,
  direction TEXT,
  status TEXT,
  sentiment_score REAL,
  category TEXT,
  synced_at DATETIME,
  crm_record_type TEXT,
  crm_record_id TEXT,
  owner_id TEXT REFERENCES users(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Phone Calls Table (Twilio)
CREATE TABLE IF NOT EXISTS phone_calls (
  id TEXT PRIMARY KEY,
  twilio_call_sid TEXT UNIQUE,
  from_number TEXT,
  to_number TEXT,
  direction TEXT,
  status TEXT,
  duration INTEGER,
  recording_url TEXT,
  transcription TEXT,
  ai_summary TEXT,
  sentiment_score REAL,
  notes TEXT,
  contact_id TEXT REFERENCES contacts(id),
  owner_id TEXT REFERENCES users(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- NPI Providers Table (scraped/imported)
CREATE TABLE IF NOT EXISTS npi_providers (
  id TEXT PRIMARY KEY,
  npi TEXT UNIQUE NOT NULL,
  provider_type TEXT,
  first_name TEXT,
  last_name TEXT,
  organization_name TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  phone TEXT,
  fax TEXT,
  email TEXT,
  email_confidence INTEGER,
  email_source TEXT,
  specialty_primary TEXT,
  specialty_secondary TEXT,
  taxonomy_codes TEXT,
  medicaid_id TEXT,
  medicare_ptan TEXT,
  medicare_enrollment_status TEXT,
  medicaid_enrollment_status TEXT,
  caqh_id TEXT,
  caqh_status TEXT,
  caqh_expiry_date DATETIME,
  insurance_panels TEXT,
  hospital_affiliations TEXT,
  website TEXT,
  medical_license_number TEXT,
  medical_license_state TEXT,
  medical_license_expiry DATETIME,
  dea_number TEXT,
  dea_expiry DATETIME,
  board_certifications TEXT,
  medical_school TEXT,
  disciplinary_actions TEXT,
  last_verified DATETIME,
  scraped_at DATETIME,
  owner_id TEXT REFERENCES users(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Provider Claims Table
CREATE TABLE IF NOT EXISTS provider_claims (
  id TEXT PRIMARY KEY,
  npi_provider_id TEXT REFERENCES npi_providers(id),
  claimant_name TEXT,
  claimant_email TEXT,
  claimant_phone TEXT,
  verification_status TEXT DEFAULT 'pending',
  verification_code TEXT,
  verified_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Campaigns Table
CREATE TABLE IF NOT EXISTS campaigns (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT,
  status TEXT,
  start_date DATETIME,
  end_date DATETIME,
  budget REAL,
  actual_cost REAL,
  target_audience TEXT,
  owner_id TEXT REFERENCES users(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tasks Table
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending',
  priority TEXT DEFAULT 'medium',
  due_date DATETIME,
  completed_at DATETIME,
  related_type TEXT,
  related_id TEXT,
  owner_id TEXT REFERENCES users(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- AI Models Table
CREATE TABLE IF NOT EXISTS ai_models (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT,
  version TEXT,
  parameters TEXT,
  training_data_count INTEGER,
  accuracy REAL,
  last_trained DATETIME,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- AI Predictions Table
CREATE TABLE IF NOT EXISTS ai_predictions (
  id TEXT PRIMARY KEY,
  model_id TEXT REFERENCES ai_models(id),
  record_type TEXT,
  record_id TEXT,
  prediction_type TEXT,
  prediction_value REAL,
  confidence REAL,
  factors TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Integrations Table
CREATE TABLE IF NOT EXISTS integrations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  config TEXT,
  is_active INTEGER DEFAULT 1,
  last_sync DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- API Keys Table
CREATE TABLE IF NOT EXISTS api_keys (
  id TEXT PRIMARY KEY,
  key_hash TEXT UNIQUE NOT NULL,
  name TEXT,
  scopes TEXT,
  last_used DATETIME,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- OAuth Tokens Table
CREATE TABLE IF NOT EXISTS oauth_tokens (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  expiry DATETIME,
  scopes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  action TEXT NOT NULL,
  table_name TEXT,
  record_id TEXT,
  old_values TEXT,
  new_values TEXT,
  ip_address TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Workflows Table (n8n)
CREATE TABLE IF NOT EXISTS workflows (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  trigger_type TEXT,
  trigger_config TEXT,
  nodes TEXT,
  is_active INTEGER DEFAULT 1,
  last_run DATETIME,
  owner_id TEXT REFERENCES users(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Email Templates Table
CREATE TABLE IF NOT EXISTS email_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  subject TEXT,
  body TEXT NOT NULL,
  merge_fields TEXT,
  category TEXT,
  owner_id TEXT REFERENCES users(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Settings Table
CREATE TABLE IF NOT EXISTS settings (
  id TEXT PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value TEXT,
  category TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Backups Table
CREATE TABLE IF NOT EXISTS backups (
  id TEXT PRIMARY KEY,
  backup_type TEXT,
  file_path TEXT,
  file_size INTEGER,
  status TEXT,
  started_at DATETIME,
  completed_at DATETIME,
  error_message TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Rate Limits Table
CREATE TABLE IF NOT EXISTS rate_limits (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- Indexes for Performance
-- ============================================

CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);
CREATE INDEX IF NOT EXISTS idx_contacts_owner ON contacts(owner_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_score ON leads(lead_score);
CREATE INDEX IF NOT EXISTS idx_deals_stage ON deals(stage);
CREATE INDEX IF NOT EXISTS idx_deals_owner ON deals(owner_id);
CREATE INDEX IF NOT EXISTS idx_activities_contact ON activities(contact_id);
CREATE INDEX IF NOT EXISTS idx_emails_message_id ON emails(message_id);
CREATE INDEX IF NOT EXISTS idx_npi_providers_npi ON npi_providers(npi);
CREATE INDEX IF NOT EXISTS idx_npi_providers_specialty ON npi_providers(specialty_primary);
CREATE INDEX IF NOT EXISTS idx_npi_providers_state ON npi_providers(state);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_rate_limits_client ON rate_limits(client_id);
CREATE INDEX IF NOT EXISTS idx_rate_limits_created ON rate_limits(created_at);
