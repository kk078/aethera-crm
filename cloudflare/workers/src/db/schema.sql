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
  -- RCM workflow stage
  workflow_stage TEXT DEFAULT 'outreach',
  converted_to_contact_id TEXT,
  -- Soft delete support
  deleted_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Deals Table (RCM Pipeline)
CREATE TABLE IF NOT EXISTS deals (
  id TEXT PRIMARY KEY,
  contact_id TEXT REFERENCES contacts(id),
  organization_id TEXT REFERENCES organizations(id),
  provider_id TEXT REFERENCES npi_providers(id),
  name TEXT NOT NULL,
  pipeline_stage TEXT NOT NULL DEFAULT 'qualified',
  onboarding_stage TEXT DEFAULT 'initial',
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
  reconciled_post_call INTEGER DEFAULT 0,
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
  -- Workflow stage for RCM onboarding
  workflow_stage TEXT DEFAULT 'outreach',
  -- Compliance fields
  baas_signed INTEGER DEFAULT 0,
  last_audit_date DATETIME,
  -- Billing integration fields
  billing_integration_status TEXT DEFAULT 'not_started',
  clearinghouse_id TEXT,
  billing_npi TEXT,
  tax_id_linked INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Payer Enrollment Table (tracks carrier enrollment per provider)
CREATE TABLE IF NOT EXISTS payer_enrollment (
  id TEXT PRIMARY KEY,
  npi_provider_id TEXT NOT NULL REFERENCES npi_providers(id),
  payer_name TEXT NOT NULL,
  payer_id TEXT,
  enrollment_status TEXT DEFAULT 'pending',
  application_date DATETIME,
  approval_date DATETIME,
  effective_date DATETIME,
  contract_signed INTEGER DEFAULT 0,
  contract_signed_date DATETIME,
  test_transactions_status TEXT DEFAULT 'pending',
  production_status TEXT DEFAULT 'pending',
  error_messages TEXT,
  last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Compliance Table (tracks BAA status and audit dates)
CREATE TABLE IF NOT EXISTS compliance (
  id TEXT PRIMARY KEY,
  provider_id TEXT NOT NULL REFERENCES npi_providers(id),
  baas_signed INTEGER DEFAULT 0,
  baas_signed_date DATETIME,
  last_audit_date DATETIME,
  audit_notes TEXT,
  last_compliance_review DATETIME,
  compliance_status TEXT DEFAULT 'pending',
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

-- Onboarding Checklists Table (HIPAA-compliant - provider-linked)
CREATE TABLE IF NOT EXISTS onboarding_checklists (
  id TEXT PRIMARY KEY,
  deal_id TEXT NOT NULL REFERENCES deals(id),
  provider_id TEXT NOT NULL REFERENCES npi_providers(id),
  -- Legal items
  baas_executed INTEGER DEFAULT 0,
  baas_signed_date DATETIME,
  service_agreement_executed INTEGER DEFAULT 0,
  service_agreement_signed_date DATETIME,
  -- Technical items
  edi_enrollment_status TEXT DEFAULT 'pending',
  clearinghouse_integration_status TEXT DEFAULT 'pending',
  clearinghouse_name TEXT,
  test_transactions_sent INTEGER DEFAULT 0,
  production_transactions_enabled INTEGER DEFAULT 0,
  -- Credentialing items
  npi_verification_status TEXT DEFAULT 'pending',
  caqh_verification_status TEXT DEFAULT 'pending',
  payer_linking_status TEXT DEFAULT 'pending',
  credentialing_complete INTEGER DEFAULT 0,
  credentialing_complete_date DATETIME,
  -- Track status
  overall_status TEXT DEFAULT 'in_progress',
  last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Document Vault Table (HIPAA-compliant document tracking for providers)
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

-- System Logs Table (for webhook errors and system events)
CREATE TABLE IF NOT EXISTS system_logs (
  id TEXT PRIMARY KEY,
  level TEXT NOT NULL,
  source TEXT NOT NULL,
  message TEXT NOT NULL,
  payload TEXT,
  stack_trace TEXT,
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
  owner_id TEXT,
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
CREATE INDEX IF NOT EXISTS idx_deals_provider_id ON deals(provider_id);
CREATE INDEX IF NOT EXISTS idx_activities_contact ON activities(contact_id);
CREATE INDEX IF NOT EXISTS idx_emails_message_id ON emails(message_id);
CREATE INDEX IF NOT EXISTS idx_npi_providers_npi ON npi_providers(npi);
CREATE INDEX IF NOT EXISTS idx_npi_providers_specialty ON npi_providers(specialty_primary);
CREATE INDEX IF NOT EXISTS idx_npi_providers_state ON npi_providers(state);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_rate_limits_client ON rate_limits(client_id);
CREATE INDEX IF NOT EXISTS idx_rate_limits_created ON rate_limits(created_at);
CREATE INDEX IF NOT EXISTS idx_leads_workflow_stage ON leads(workflow_stage);
CREATE INDEX IF NOT EXISTS idx_onboarding_checklist_deal_id ON onboarding_checklists(deal_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_checklist_provider_id ON onboarding_checklists(provider_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_checklist_status ON onboarding_checklists(overall_status);
CREATE INDEX IF NOT EXISTS idx_document_vault_provider_id ON document_vault(provider_id);
CREATE INDEX IF NOT EXISTS idx_document_vault_deal_id ON document_vault(deal_id);
CREATE INDEX IF NOT EXISTS idx_document_vault_status ON document_vault(status);
CREATE INDEX IF NOT EXISTS idx_document_vault_type ON document_vault(document_type);
CREATE INDEX IF NOT EXISTS idx_tasks_related ON tasks(related_type, related_id);
CREATE INDEX IF NOT EXISTS idx_npi_providers_billing_status ON npi_providers(billing_integration_status);
CREATE INDEX IF NOT EXISTS idx_npi_providers_workflow_stage ON npi_providers(workflow_stage);
CREATE INDEX IF NOT EXISTS idx_payer_enrollment_provider_id ON payer_enrollment(npi_provider_id);
CREATE INDEX IF NOT EXISTS idx_payer_enrollment_status ON payer_enrollment(enrollment_status);
CREATE INDEX IF NOT EXISTS idx_payer_enrollment_payer_name ON payer_enrollment(payer_name);
CREATE INDEX IF NOT EXISTS idx_compliance_provider_id ON compliance(provider_id);
CREATE INDEX IF NOT EXISTS idx_compliance_status ON compliance(compliance_status);

-- ============================================
-- RCM Pipeline Indexes
-- ============================================

CREATE INDEX IF NOT EXISTS idx_deals_pipeline_stage ON deals(pipeline_stage);
CREATE INDEX IF NOT EXISTS idx_deals_onboarding_stage ON deals(onboarding_stage);

-- ============================================
-- Call Queue and Analytics Tables
-- ============================================

-- Call Queue Table
CREATE TABLE IF NOT EXISTS call_queue (
  id TEXT PRIMARY KEY,
  caller_number TEXT NOT NULL,
  intent TEXT,
  priority INTEGER DEFAULT 1,
  status TEXT DEFAULT 'pending',
  assigned_agent_id TEXT REFERENCES users(id),
  dequeued_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_call_queue_status ON call_queue(status);
CREATE INDEX IF NOT EXISTS idx_call_queue_priority ON call_queue(priority);
CREATE INDEX IF NOT EXISTS idx_call_queue_assigned ON call_queue(assigned_agent_id);

-- Provider Availability Table
CREATE TABLE IF NOT EXISTS provider_availability (
  id TEXT PRIMARY KEY,
  provider_id TEXT UNIQUE NOT NULL REFERENCES npi_providers(id),
  is_available INTEGER DEFAULT 1,
  current_call_count INTEGER DEFAULT 0,
  last_available_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_provider_availability_available ON provider_availability(is_available);
CREATE INDEX IF NOT EXISTS idx_provider_availability_calls ON provider_availability(current_call_count);

-- Call Annotations Table (for coaching)
CREATE TABLE IF NOT EXISTS call_annotations (
  id TEXT PRIMARY KEY,
  call_id TEXT NOT NULL REFERENCES phone_calls(id),
  user_id TEXT REFERENCES users(id),
  timestamp INTEGER,
  category TEXT,
  text TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_call_annotations_call ON call_annotations(call_id);
CREATE INDEX IF NOT EXISTS idx_call_annotations_user ON call_annotations(user_id);

-- Call Recordings Table
CREATE TABLE IF NOT EXISTS call_recordings (
  id TEXT PRIMARY KEY,
  call_id TEXT UNIQUE NOT NULL REFERENCES phone_calls(id),
  recording_url TEXT,
  duration INTEGER,
  size_bytes INTEGER,
  reviewed_by TEXT REFERENCES users(id),
  reviewed_at DATETIME,
  rating INTEGER,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_call_recordings_reviewed ON call_recordings(reviewed_by);
CREATE INDEX IF NOT EXISTS idx_call_recordings_rating ON call_recordings(rating);

-- Call Predictions Table
CREATE TABLE IF NOT EXISTS call_predictions (
  id TEXT PRIMARY KEY,
  call_id TEXT UNIQUE NOT NULL REFERENCES phone_calls(id),
  success_probability REAL,
  recommended_approach TEXT,
  optimal_timing TEXT,
  factors TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_call_predictions_call ON call_predictions(call_id);
CREATE INDEX IF NOT EXISTS idx_call_predictions_probability ON call_predictions(success_probability);

-- Scheduled Calls Table
CREATE TABLE IF NOT EXISTS scheduled_calls (
  id TEXT PRIMARY KEY,
  provider_id TEXT REFERENCES npi_providers(id),
  contact_id TEXT REFERENCES contacts(id),
  scheduled_date DATETIME,
  timezone TEXT DEFAULT 'UTC',
  status TEXT DEFAULT 'pending',
  meeting_url TEXT,
  created_by TEXT REFERENCES users(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_scheduled_calls_date ON scheduled_calls(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_scheduled_calls_status ON scheduled_calls(status);

-- Team Shifts Table
CREATE TABLE IF NOT EXISTS team_shifts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  start_time DATETIME NOT NULL,
  end_time DATETIME,
  status TEXT DEFAULT 'active',
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_team_shifts_user ON team_shifts(user_id);
CREATE INDEX IF NOT EXISTS idx_team_shifts_status ON team_shifts(status);

-- ============================================
-- Call Queue and Analytics Indexes
-- ============================================

CREATE INDEX IF NOT EXISTS idx_call_queue_status_priority ON call_queue(status, priority);
CREATE INDEX IF NOT EXISTS idx_call_queue_created ON call_queue(created_at);

-- Additional indexes for calendar integration
CREATE INDEX IF NOT EXISTS idx_scheduled_calls_provider ON scheduled_calls(provider_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_calls_contact ON scheduled_calls(contact_id);
CREATE INDEX IF NOT EXISTS idx_team_shifts_active ON team_shifts(status, start_time);

-- ============================================
-- Technical Setup Table (tracks provider technical implementation)
-- ============================================

CREATE TABLE IF NOT EXISTS technical_setup (
  id TEXT PRIMARY KEY,
  provider_id TEXT UNIQUE NOT NULL REFERENCES npi_providers(id),
  clearinghouse_id TEXT,
  clearinghouse_name TEXT,
  era_enrollment_status TEXT DEFAULT 'not_started',
  edi_enrollment_status TEXT DEFAULT 'not_started',
  credentialing_status TEXT DEFAULT 'pending',
  caqh_verified INTEGER DEFAULT 0,
  setup_complete INTEGER DEFAULT 0,
  completed_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_technical_setup_provider ON technical_setup(provider_id);
CREATE INDEX IF NOT EXISTS idx_technical_setup_status ON technical_setup(era_enrollment_status);
CREATE INDEX IF NOT EXISTS idx_technical_setup_complete ON technical_setup(setup_complete);

-- Call Translations Table
CREATE TABLE IF NOT EXISTS call_translations (
  id TEXT PRIMARY KEY,
  call_id TEXT UNIQUE NOT NULL REFERENCES phone_calls(id),
  source_language TEXT,
  target_language TEXT,
  translated_text TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_call_translations_call ON call_translations(call_id);
CREATE INDEX IF NOT EXISTS idx_call_translations_languages ON call_translations(source_language, target_language);
