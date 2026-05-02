import axios from 'axios';
import { useAuthStore } from '@stores/authStore';

// Determine API base URL based on environment
const API_BASE_URL = import.meta.env?.VITE_API_URL || 'https://aethera-crm-api.aetherahealthcare.workers.dev/api/v1';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - add auth token
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle errors with defensive fallback
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      useAuthStore.getState().logout();
      window.location.href = '/login';
      return Promise.reject(error);
    }

    // Log error for debugging
    console.error('API Error:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    });

    // Return safe default response for list endpoints to prevent UI crash
    const url = error.config?.url || '';
    if (error.response?.status === 500 || error.response?.status === 502 || error.response?.status === 503) {
      // For list endpoints, return empty arrays instead of crashing
      if (url.includes('/contacts') || url.includes('/organizations') || url.includes('/deals') || url.includes('/leads') || url.includes('/tasks') || url.includes('/activities') || url.includes('/providers')) {
        return {
          data: { data: [], pagination: { page: 1, per_page: 20, total: 0, total_pages: 0, has_more: false } },
          status: 200,
          statusText: 'OK',
          headers: error.response?.headers,
          config: error.config,
        };
      }
      // For other endpoints, return null data structure
      if (url.includes('/checklist') || url.includes('/pipeline') || url.includes('/dashboard') || url.includes('/document-vault') || url.includes('/payer-enrollment') || url.includes('/compliance')) {
        return {
          data: { data: null, error: error.response?.data?.error || 'Failed to load data' },
          status: 200,
          statusText: 'OK',
          headers: error.response?.headers,
          config: error.config,
        };
      }
    }

    return Promise.reject(error);
  }
);

export default api;

// API Service Functions
export const authAPI = {
  login: (username: string, password: string) =>
    api.post('/auth/login', { username, password }),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.put('/auth/change-password', { current_password: currentPassword, new_password: newPassword }),
  createAPIKey: (name?: string, scopes?: string) =>
    api.post('/auth/api-keys', { name, scopes }),
  getAPIKeys: () => api.get('/auth/api-keys'),
  revokeAPIKey: (id: string) => api.delete(`/auth/api-keys/${id}`),
};

export const contactsAPI = {
  list: (params?: any) => api.get('/contacts', { params }),
  get: (id: string) => api.get(`/contacts/${id}`),
  create: (data: any) => api.post('/contacts', data),
  update: (id: string, data: any) => api.put(`/contacts/${id}`, data),
  delete: (id: string) => api.delete(`/contacts/${id}`),
  getActivities: (id: string) => api.get(`/contacts/${id}/activities`),
  getEmails: (id: string) => api.get(`/contacts/${id}/emails`),
};

export const organizationsAPI = {
  list: (params?: any) => api.get('/organizations', { params }),
  get: (id: string) => api.get(`/organizations/${id}`),
  create: (data: any) => api.post('/organizations', data),
  update: (id: string, data: any) => api.put(`/organizations/${id}`, data),
  delete: (id: string) => api.delete(`/organizations/${id}`),
  getContacts: (id: string) => api.get(`/organizations/${id}/contacts`),
  getDeals: (id: string) => api.get(`/organizations/${id}/deals`),
};

export const leadsAPI = {
  list: (params?: any) => api.get('/leads', { params }),
  get: (id: string) => api.get(`/leads/${id}`),
  create: (data: any) => api.post('/leads', data),
  update: (id: string, data: any) => api.put(`/leads/${id}`, data),
  delete: (id: string) => api.delete(`/leads/${id}`),
  convert: (id: string) => api.post(`/leads/${id}/convert`),
};

export const dealsAPI = {
  list: (params?: any) => api.get('/deals', { params }),
  get: (id: string) => api.get(`/deals/${id}`),
  create: (data: any) => api.post('/deals', data),
  update: (id: string, data: any) => api.put(`/deals/${id}`, data),
  delete: (id: string) => api.delete(`/deals/${id}`),
  updateStage: (id: string, stage: string, probability?: number, amount?: number) =>
    api.patch(`/deals/${id}/stage`, { stage, probability, amount }),
  getPipeline: () => api.get('/deals/pipeline/overview'),
  getActivities: (id: string) => api.get(`/deals/${id}/activities`),
  // RCM Pipeline endpoints
  getPipelineStages: () => api.get('/onboarding/pipeline/stages'),
  updatePipeline: (id: string, stage: any) => api.patch(`/onboarding/deals/${id}/pipeline`, stage),
  getProviderDeals: (providerId: string) => api.get(`/deals/provider/${providerId}`),
};

export const activitiesAPI = {
  list: (params?: any) => api.get('/activities', { params }),
  get: (id: string) => api.get(`/activities/${id}`),
  create: (data: any) => api.post('/activities', data),
  update: (id: string, data: any) => api.put(`/activities/${id}`, data),
  delete: (id: string) => api.delete(`/activities/${id}`),
  getByContact: (contactId: string) => api.get(`/activities/contact/${contactId}`),
  getByDeal: (dealId: string) => api.get(`/activities/deal/${dealId}`),
};

export const tasksAPI = {
  list: (params?: any) => api.get('/tasks', { params }),
  get: (id: string) => api.get(`/tasks/${id}`),
  create: (data: any) => api.post('/tasks', data),
  update: (id: string, data: any) => api.put(`/tasks/${id}`, data),
  delete: (id: string) => api.delete(`/tasks/${id}`),
  getByStatus: (status: string) => api.get(`/tasks/status/${status}`),
  getOverdue: () => api.get('/tasks/overdue/list'),
};

export const campaignsAPI = {
  list: (params?: any) => api.get('/campaigns', { params }),
  get: (id: string) => api.get(`/campaigns/${id}`),
  create: (data: any) => api.post('/campaigns', data),
  update: (id: string, data: any) => api.put(`/campaigns/${id}`, data),
  delete: (id: string) => api.delete(`/campaigns/${id}`),
};

export const providersAPI = {
  list: (params?: any) => api.get('/providers', { params }),
  get: (npi: string) => api.get(`/providers/${npi}`),
  getById: (id: string) => api.get(`/providers/id/${id}`),
  searchNPPES: (params: any) => api.post('/providers/search/nppes', params),
  import: (npiData: any) => api.post('/providers/import', { npi_data: npiData }),
  update: (id: string, data: any) => api.put(`/providers/${id}`, data),
  delete: (id: string) => api.delete(`/providers/${id}`),
  claim: (npi: string, data: any) => api.post(`/providers/${npi}/claim`, data),
  verifyClaim: (id: string, code: string) => api.post(`/providers/claims/${id}/verify`, { verification_code: code }),
  getStats: () => api.get('/providers/stats/summary'),
};

export const emailsAPI = {
  list: (params?: any) => api.get('/emails', { params }),
  get: (id: string) => api.get(`/emails/${id}`),
  send: (data: any) => api.post('/emails/send', data),
  getThread: (threadId: string) => api.get(`/emails/thread/${threadId}`),
  getTemplates: () => api.get('/emails/templates'),
  createTemplate: (data: any) => api.post('/emails/templates', data),
  updateTemplate: (id: string, data: any) => api.put(`/emails/templates/${id}`, data),
  deleteTemplate: (id: string) => api.delete(`/emails/templates/${id}`),
  getAnalytics: () => api.get('/emails/analytics/summary'),
  getSmtpConfig: () => api.get('/emails/smtp/config'),
  saveSmtpConfig: (data: any) => api.put('/emails/smtp/config', data),
  testSmtp: (to: string) => api.post('/emails/smtp/test', { to }),
  setup: () => api.post('/emails/setup', {}),

  // Gmail OAuth endpoints
  getOAuthConfig: () => api.get('/emails/oauth/config'),
  saveOAuthConfig: (data: any) => api.put('/emails/oauth/config', data),
  getAuthUrl: () => api.post('/emails/oauth/auth-url', {}),
  exchangeToken: (code: string) => api.post('/emails/oauth/token', { code }),
  refreshToken: () => api.post('/emails/oauth/refresh', {}),
};

export const twilioAPI = {
  makeCall: (toNumber: string, fromNumber?: string) => api.post('/twilio/calls', { to_number: toNumber, from_number: fromNumber }),
  sendSMS: (toNumber: string, body: string) => api.post('/twilio/sms', { to_number: toNumber, body }),
  getCall: (sid: string) => api.get(`/twilio/calls/${sid}`),
  getRecording: (sid: string) => api.get(`/twilio/recordings/${sid}`),
  getCallLogs: (params?: any) => api.get('/twilio/calls/log', { params }),
  getUsage: () => api.get('/twilio/usage/stats'),
  getConfig: () => api.get('/twilio/config'),
  saveConfig: (data: any) => api.put('/twilio/config', data),
  setOutcome: (id: string, data: any) => api.patch(`/twilio/calls/${id}/outcome`, data),
  getToken: () => api.post('/twilio/token'),
};

export const aiAPI = {
  scoreLead: (leadId: string) => api.post('/ai/score/lead', { lead_id: leadId }),
  analyzeSentiment: (emailId?: string, text?: string) => api.post('/ai/analyze/sentiment', { email_id: emailId, text }),
  callAssist: (callId: string, transcription?: string) => api.post('/ai/call/assist', { call_id: callId, transcription }),
  callPreview: (npiOrPhone: string) => api.post('/ai/call-preview', { npi_or_phone: npiOrPhone }),
  getOutreachFlow: (data: { query: string; specialty?: string; current_phase?: string; conversation_log?: string[] }) =>
    api.post('/ai/outreach-flow', data),
  search: (query: string, limit?: number, filters?: any) => api.post('/ai/search', { query, limit, filters }),
  getPredictions: (type: string, id: string) => api.get(`/ai/predictions/${type}/${id}`),
  getStatus: () => api.get('/ai/status'),
  // New enhanced endpoints
  classifyIntent: (data: { query: string; specialty?: string; conversation_history?: string[] }) =>
    api.post('/ai/classify/intent', data),
  predictCallOutcome: (data: { caller_number: string; specialty?: string; call_history?: any[] }) =>
    api.post('/ai/predict/call-outcome', data),
};

export const workflowsAPI = {
  list: (params?: any) => api.get('/workflows', { params }),
  get: (id: string) => api.get(`/workflows/${id}`),
  create: (data: any) => api.post('/workflows', data),
  update: (id: string, data: any) => api.put(`/workflows/${id}`, data),
  delete: (id: string) => api.delete(`/workflows/${id}`),
  toggle: (id: string) => api.patch(`/workflows/${id}/toggle`),
  trigger: (id: string, payload?: any) => api.post(`/workflows/${id}/trigger`, { payload }),
  getExecutions: (id: string) => api.get(`/workflows/${id}/executions`),
  import: (n8nWorkflow: any, name?: string) => api.post('/workflows/import', { n8n_workflow: n8nWorkflow, name }),
  export: (id: string) => api.get(`/workflows/${id}/export`),
};

export const settingsAPI = {
  getAll: () => api.get('/settings'),
  getByCategory: (category: string) => api.get(`/settings/${category}`),
  update: (category: string, key: string, value: any) => api.put(`/settings/${category}/${key}`, { value }),
  getIntegrations: () => api.get('/settings/integrations/list'),
  getIntegration: (name: string) => api.get(`/settings/integrations/${name}`),
  updateIntegration: (name: string, data: any) => api.put(`/settings/integrations/${name}`, data),
};

export const backupAPI = {
  trigger: () => api.post('/backup/trigger'),
  list: () => api.get('/backup/list'),
  getStatus: () => api.get('/backup/status'),
  delete: (id: string) => api.delete(`/backup/${id}`),
  cleanup: () => api.post('/backup/cleanup'),
};

export const onboardingAPI = {
  // Checklist endpoints
  getChecklist: (dealId: string) => api.get(`/onboarding/checklist/${dealId}`),
  createChecklist: (dealId: string, data: any) => api.post(`/onboarding/checklist/${dealId}`, data),
  updateChecklistItems: (dealId: string, data: any) => api.put(`/onboarding/checklist/${dealId}/items`, data),
  getChecklistItemsByType: (dealId: string, type: string) => api.get(`/onboarding/checklist/${dealId}/items/${type}`),
  listChecklists: (params?: any) => api.get('/onboarding/checklists', { params }),
  // Pipeline endpoints
  getPipelineStages: () => api.get('/onboarding/pipeline/stages'),
  getPipelineDeals: (stage: string) => api.get(`/onboarding/pipeline/${stage}/deals`),
  getPipelineSummary: () => api.get('/onboarding/pipeline/summary'),
  // Dashboard endpoints
  getDashboardSummary: () => api.get('/onboarding/dashboard/summary'),
  // Document vault endpoints
  getDocumentsByProvider: (providerId: string) => api.get(`/onboarding/document-vault/provider/${providerId}`),
  getDocumentsByDeal: (dealId: string) => api.get(`/onboarding/document-vault/deal/${dealId}`),
  createDocument: (data: any) => api.post('/onboarding/document-vault', data),
  updateDocumentStatus: (id: string, data: any) => api.put(`/onboarding/document-vault/${id}/status`, data),
  deleteDocument: (id: string) => api.delete(`/onboarding/document-vault/${id}`),
  getDocumentSummary: () => api.get('/onboarding/document-vault/summary'),
  // Payer enrollment endpoints
  getPayerEnrollmentsByProvider: (providerId: string) => api.get(`/onboarding/payer-enrollment/provider/${providerId}`),
  getPayerEnrollmentsByDeal: (dealId: string) => api.get(`/onboarding/payer-enrollment/deal/${dealId}`),
  createPayerEnrollment: (data: any) => api.post('/onboarding/payer-enrollment', data),
  createPayerEnrollmentsBulk: (providerId: string, data: any) => api.post(`/onboarding/payer-enrollment/provider/${providerId}/bulk`, data),
  updatePayerEnrollment: (id: string, data: any) => api.put(`/onboarding/payer-enrollment/${id}`, data),
  deletePayerEnrollment: (id: string) => api.delete(`/onboarding/payer-enrollment/${id}`),
  // Onboarding providers endpoints
  listProviders: (params?: any) => api.get('/onboarding/providers/list', { params }),
  // Revenue readiness endpoints
  getRevenueReadiness: () => api.get('/onboarding/dashboard/revenue-readiness'),
  updateProviderBillingStatus: (providerId: string, data: any) => api.patch(`/onboarding/providers/${providerId}/billing-status`, data),
  // Power Stats endpoints
  getPipelineValue: () => api.get('/onboarding/dashboard/power-stats/pipeline-value'),
  getTechnicalBlockers: () => api.get('/onboarding/dashboard/power-stats/technical-blockers'),
  getCredentialingGap: () => api.get('/onboarding/dashboard/power-stats/credentialing-gap'),
  // Bottleneck endpoints
  getBottlenecks: () => api.get('/onboarding/bottlenecks'),
  // Audit endpoints
  getDataIntegrityAudit: () => api.get('/onboarding/audit/data-integrity'),
  bulkUpdateTaxId: (data: any) => api.patch('/onboarding/audit/bulk-tax-id', data),
  // Compliance endpoints
  getComplianceByProvider: (providerId: string) => api.get(`/onboarding/compliance/provider/${providerId}`),
  updateCompliance: (providerId: string, data: any) => api.post(`/onboarding/compliance/provider/${providerId}`, data),
  // Onboarding status endpoints
  getStatuses: () => api.get('/onboarding/onboarding/statuses'),
  // Technical setup endpoints
  getTechnicalSetupByProvider: (providerId: string) => api.get(`/onboarding/technical-setup/provider/${providerId}`),
  saveTechnicalSetup: (providerId: string, data: any) => api.post(`/onboarding/technical-setup/provider/${providerId}`, data),
  getTechnicalSetupTracker: () => api.get('/onboarding/technical-setup/tracker'),
  batchUpdateTechnicalSetup: (data: any) => api.patch('/onboarding/technical-setup/batch-update', data),
  // Revenue readiness endpoints
  getRevenueReadinessReport: () => api.get('/onboarding/report/revenue-readiness'),
  // Call queue endpoints
  getQueueStatus: () => api.get('/call-queue/queue/status'),
  getQueueItems: (params?: any) => api.get('/call-queue/queue/items', { params }),
  addToQueue: (data: any) => api.post('/call-queue/queue/items', data),
  updateQueueItem: (id: string, data: any) => api.patch(`/call-queue/queue/items/${id}`, data),
  removeFromQueue: (id: string) => api.delete(`/call-queue/queue/items/${id}`),
  getProviderAvailability: (params?: any) => api.get('/call-queue/availability/providers', { params }),
  setProviderAvailability: (data: any) => api.post('/call-queue/availability/providers', data),
  updateProviderAvailability: (id: string, data: any) => api.put(`/call-queue/availability/providers/${id}`, data),
  // Call analytics endpoints
  getDailyMetrics: (params?: any) => api.get('/call-analytics/metrics/daily', { params }),
  getWeeklyMetrics: () => api.get('/call-analytics/metrics/weekly'),
  getMonthlyMetrics: () => api.get('/call-analytics/metrics/monthly'),
  getTeamPerformance: () => api.get('/call-analytics/analytics/team'),
  getPipelineAnalytics: () => api.get('/call-analytics/analytics/pipeline'),
  getAIDashboardStats: () => api.get('/call-analytics/dashboard/stats'),
  getLiveDashboard: () => api.get('/call-analytics/dashboard/live'),
};
