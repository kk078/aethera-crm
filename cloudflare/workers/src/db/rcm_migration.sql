-- ============================================
-- RCM Onboarding Migration
-- ============================================

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

-- Technical Setup Table (tracks provider technical implementation)
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

-- ============================================
-- Indexes for Performance
-- ============================================

CREATE INDEX IF NOT EXISTS idx_onboarding_checklist_deal_id ON onboarding_checklists(deal_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_checklist_provider_id ON onboarding_checklists(provider_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_checklist_status ON onboarding_checklists(overall_status);

CREATE INDEX IF NOT EXISTS idx_document_vault_provider_id ON document_vault(provider_id);
CREATE INDEX IF NOT EXISTS idx_document_vault_deal_id ON document_vault(deal_id);
CREATE INDEX IF NOT EXISTS idx_document_vault_status ON document_vault(status);
CREATE INDEX IF NOT EXISTS idx_document_vault_type ON document_vault(document_type);

CREATE INDEX IF NOT EXISTS idx_technical_setup_provider ON technical_setup(provider_id);
CREATE INDEX IF NOT EXISTS idx_technical_setup_status ON technical_setup(era_enrollment_status);
CREATE INDEX IF NOT EXISTS idx_technical_setup_complete ON technical_setup(setup_complete);

CREATE INDEX IF NOT EXISTS idx_payer_enrollment_provider_id ON payer_enrollment(npi_provider_id);
CREATE INDEX IF NOT EXISTS idx_payer_enrollment_status ON payer_enrollment(enrollment_status);
CREATE INDEX IF NOT EXISTS idx_payer_enrollment_payer_name ON payer_enrollment(payer_name);

CREATE INDEX IF NOT EXISTS idx_compliance_provider_id ON compliance(provider_id);
CREATE INDEX IF NOT EXISTS idx_compliance_status ON compliance(compliance_status);

CREATE INDEX IF NOT EXISTS idx_call_queue_status ON call_queue(status);
CREATE INDEX IF NOT EXISTS idx_call_queue_priority ON call_queue(priority);
CREATE INDEX IF NOT EXISTS idx_call_queue_assigned ON call_queue(assigned_agent_id);

CREATE INDEX IF NOT EXISTS idx_provider_availability_available ON provider_availability(is_available);
CREATE INDEX IF NOT EXISTS idx_provider_availability_calls ON provider_availability(current_call_count);

CREATE INDEX IF NOT EXISTS idx_call_annotations_call ON call_annotations(call_id);
CREATE INDEX IF NOT EXISTS idx_call_annotations_user ON call_annotations(user_id);

CREATE INDEX IF NOT EXISTS idx_call_recordings_reviewed ON call_recordings(reviewed_by);
CREATE INDEX IF NOT EXISTS idx_call_recordings_rating ON call_recordings(rating);

CREATE INDEX IF NOT EXISTS idx_call_predictions_call ON call_predictions(call_id);
CREATE INDEX IF NOT EXISTS idx_call_predictions_probability ON call_predictions(success_probability);

CREATE INDEX IF NOT EXISTS idx_scheduled_calls_date ON scheduled_calls(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_scheduled_calls_status ON scheduled_calls(status);

CREATE INDEX IF NOT EXISTS idx_team_shifts_user ON team_shifts(user_id);
CREATE INDEX IF NOT EXISTS idx_team_shifts_status ON team_shifts(status);

CREATE INDEX IF NOT EXISTS idx_call_translations_call ON call_translations(call_id);
CREATE INDEX IF NOT EXISTS idx_call_translations_languages ON call_translations(source_language, target_language);
