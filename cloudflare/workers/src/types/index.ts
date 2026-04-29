import { Hono } from 'hono';

// D1 Statement Types
interface D1Statement {
  bind(...args: any[]): D1Statement;
  first<T = any>(): Promise<T | null>;
  all<T = any>(): Promise<{ results: T[] }>;
  run<T = any>(): Promise<T>;
}

interface D1Database {
  prepare(query: string): D1Statement;
}

// User Types
export interface User {
  id: string;
  username: string;
  email?: string;
  role: 'admin' | 'user' | 'readonly';
}

// App Environment Types - simplified for Hono compatibility
export type AppEnv = {
  Bindings: {
    DB: D1Database;
    STORAGE?: any;
    AI?: any;
    QUEUE_EMAIL_SYNC?: any;
    QUEUE_AI_JOBS?: any;
    QUEUE_SCRAPING?: any;
    JWT_SECRET: string;
    JWT_EXPIRY_HOURS: string;
    ADMIN_USERNAME: string;
    FRONTEND_URL: string;
    API_RATE_LIMIT_REQUESTS: string;
    API_RATE_LIMIT_WINDOW_MS: string;
    ENVIRONMENT: string;
    TWILIO_ACCOUNT_SID?: string;
    TWILIO_AUTH_TOKEN?: string;
    TWILIO_PHONE_NUMBER?: string;
    TWILIO_API_KEY_SID?: string;
    TWILIO_API_KEY_SECRET?: string;
  };
  Variables: {
    user?: User;
    apiKey?: string;
    dbInitialized?: boolean;
  };
};

// Type exports
export type App = Hono<AppEnv>;

// Pagination Types
export interface PaginationParams {
  page: number;
  per_page: number;
  sort?: string;
  order?: 'asc' | 'desc';
  search?: string;
  status?: string;
  priority?: string;
  type?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
    has_more: boolean;
  };
}

// API Response Types
export interface APIResponse<T> {
  data: T;
  meta?: {
    total?: number;
    page?: number;
    per_page?: number;
    total_pages?: number;
  };
  message?: string;
}
