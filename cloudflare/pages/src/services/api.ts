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

// Response interceptor - handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      useAuthStore.getState().logout();
      window.location.href = '/login';
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
