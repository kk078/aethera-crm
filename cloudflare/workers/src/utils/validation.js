import { z } from 'zod';
// ============================================
// Zod Validation Schemas
// ============================================
// User Schemas
export const createUserSchema = z.object({
    username: z.string().min(3).max(50),
    email: z.string().email(),
    password: z.string().min(8),
    role: z.enum(['admin', 'user', 'readonly']).optional(),
});
export const updateUserSchema = createUserSchema.partial();
export const loginSchema = z.object({
    username: z.string(),
    password: z.string(),
});
// Organization Schemas
export const createOrganizationSchema = z.object({
    name: z.string().min(1).max(255),
    type: z.string().optional(),
    industry: z.string().optional(),
    website: z.string().url().optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zip: z.string().optional(),
    employee_count: z.number().optional(),
    annual_revenue: z.number().optional(),
});
export const updateOrganizationSchema = createOrganizationSchema.partial();
// Contact Schemas
export const createContactSchema = z.object({
    organization_id: z.string().uuid().optional(),
    first_name: z.string().min(1).max(100),
    last_name: z.string().min(1).max(100),
    title: z.string().optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    mobile: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zip: z.string().optional(),
    linkedin_url: z.string().url().optional(),
});
export const updateContactSchema = createContactSchema.partial();
// Lead Schemas
export const createLeadSchema = z.object({
    source: z.string().optional(),
    status: z.enum(['new', 'contacted', 'qualified', 'converted', 'lost']).optional(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    company: z.string().optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
    specialty: z.string().optional(),
    npi: z.string().optional(),
    taxonomy: z.string().optional(),
});
export const updateLeadSchema = createLeadSchema.partial();
// Deal Schemas
export const createDealSchema = z.object({
    contact_id: z.string().uuid().optional(),
    organization_id: z.string().uuid().optional(),
    name: z.string().min(1).max(255),
    stage: z.string(),
    amount: z.number().optional(),
    probability: z.number().min(0).max(100).optional(),
    expected_close_date: z.string().optional(),
});
export const updateDealSchema = createDealSchema.partial();
// Activity Schemas
export const createActivitySchema = z.object({
    contact_id: z.string().uuid().optional(),
    deal_id: z.string().uuid().optional(),
    type: z.enum(['call', 'email', 'task', 'meeting', 'note']),
    subject: z.string().optional(),
    description: z.string().optional(),
    status: z.string().optional(),
    due_date: z.string().optional(),
    direction: z.enum(['inbound', 'outbound', 'internal']).optional(),
});
export const updateActivitySchema = createActivitySchema.partial();
// Email Schemas
export const createEmailSchema = z.object({
    to: z.string().email(),
    subject: z.string().optional(),
    body: z.string(),
    crm_record_type: z.string().optional(),
    crm_record_id: z.string().optional(),
});
export const emailTemplateSchema = z.object({
    name: z.string().min(1).max(255),
    subject: z.string().optional(),
    body: z.string().min(1),
    category: z.string().optional(),
});
// Provider Schemas
export const createProviderSchema = z.object({
    npi: z.string().length(10),
    provider_type: z.string().optional(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    organization_name: z.string().optional(),
    specialty_primary: z.string().optional(),
    specialty_secondary: z.string().optional(),
    phone: z.string().optional(),
    fax: z.string().optional(),
    email: z.string().email().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zip: z.string().optional(),
    website: z.string().optional(),
    medical_license_number: z.string().optional(),
    medical_license_state: z.string().optional(),
    board_certifications: z.string().optional(),
    medical_school: z.string().optional(),
    hospital_affiliations: z.string().optional(),
    medicare_enrollment_status: z.string().optional(),
    medicaid_enrollment_status: z.string().optional(),
});
export const updateProviderSchema = createProviderSchema.partial();
// Task Schemas
export const createTaskSchema = z.object({
    title: z.string().min(1).max(255),
    description: z.string().optional(),
    status: z.string().optional(),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
    due_date: z.string().optional(),
    related_type: z.string().optional(),
    related_id: z.string().optional(),
});
export const updateTaskSchema = createTaskSchema.partial();
// Campaign Schemas
export const createCampaignSchema = z.object({
    name: z.string().min(1).max(255),
    type: z.string().optional(),
    status: z.string().optional(),
    start_date: z.string().optional(),
    end_date: z.string().optional(),
    budget: z.number().optional(),
    target_audience: z.string().optional(),
});
export const updateCampaignSchema = createCampaignSchema.partial();
// API Key Schemas
export const createAPIKeySchema = z.object({
    name: z.string().optional(),
    scopes: z.string().optional(),
});
// Workflow Schemas
export const createWorkflowSchema = z.object({
    name: z.string().min(1).max(255),
    description: z.string().optional(),
    trigger_type: z.string(),
    trigger_config: z.string(),
    nodes: z.string(),
});
export const updateWorkflowSchema = createWorkflowSchema.partial();
// Gmail Relay Config Schema
export const gmailRelayConfigSchema = z.object({
    relay_url: z.string().url(),
    api_key: z.string().min(1),
    from_email: z.string().email().optional(),
    from_name: z.string().optional(),
    use_relay: z.boolean().optional(),
});
// Twilio Config Schema
export const twilioConfigSchema = z.object({
    account_sid: z.string().min(1),
    auth_token: z.string().min(1),
    phone_number: z.string().min(1),
    enabled: z.boolean().optional(),
});
// Call Outcome Schema
export const callOutcomeSchema = z.object({
    outcome: z.enum(['interested', 'not_interested', 'followup_scheduled', 'voicemail_left', 'wrong_number', 'no_answer']),
    notes: z.string().optional(),
});
// Call Preview Schema
export const callPreviewSchema = z.object({
    npi_or_phone: z.string().min(1),
});
// Outreach Flow Schema
export const outreachFlowRequestSchema = z.object({
    query: z.string().min(1),
    specialty: z.string().optional().default('General Practice'),
    current_phase: z.string().optional().default('hook'),
    conversation_log: z.array(z.string()).optional().default([]),
});
// Pagination Schema
export const paginationSchema = z.object({
    page: z.number().min(1).default(1),
    per_page: z.number().min(1).max(100).default(20),
    sort: z.string().optional(),
    order: z.enum(['asc', 'desc']).default('desc'),
    search: z.string().optional(),
    type: z.string().optional(),
    status: z.string().optional(),
    priority: z.string().optional(),
    stage: z.string().optional(),
});
