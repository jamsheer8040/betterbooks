import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { ApiResponse } from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT token from localStorage to every request
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Response interceptor to unwrap data and handle 401 unauthenticated
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      if (!window.location.pathname.includes('/login')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// High-level typed API service
export const api = {
  // Auth
  auth: {
    login: (credentials: { email: string; password: string }) =>
      apiClient.post<ApiResponse<{ token: string; user: any }>>('/auth/login', credentials).then(r => r.data),
    register: (data: any) =>
      apiClient.post<ApiResponse<{ token: string; user: any }>>('/auth/register', data).then(r => r.data),
    me: () =>
      apiClient.get<ApiResponse<any>>('/auth/me').then(r => r.data),
  },

  // Customers
  customers: {
    list: (params?: any) => apiClient.get<ApiResponse<any[]>>('/customers', { params }).then(r => r.data),
    get: (id: string) => apiClient.get<ApiResponse<any>>(`/customers/${id}`).then(r => r.data),
    create: (data: any) => apiClient.post<ApiResponse<any>>('/customers', data).then(r => r.data),
    update: (id: string, data: any) => apiClient.put<ApiResponse<any>>(`/customers/${id}`, data).then(r => r.data),
    delete: (id: string) => apiClient.delete<ApiResponse<any>>(`/customers/${id}`).then(r => r.data),
    addDocument: (id: string, doc: any) => apiClient.post<ApiResponse<any>>(`/customers/${id}/documents`, doc).then(r => r.data),
    deleteDocument: (id: string, docId: string) => apiClient.delete<ApiResponse<any>>(`/customers/${id}/documents/${docId}`).then(r => r.data),
  },

  // Filings
  filings: {
    list: (params?: any) => apiClient.get<ApiResponse<any[]>>('/filings', { params }).then(r => r.data),
    getMatrix: (year?: number) => apiClient.get<ApiResponse<any>>('/filings/matrix', { params: { year } }).then(r => r.data),
    get: (id: string) => apiClient.get<ApiResponse<any>>(`/filings/${id}`).then(r => r.data),
    create: (data: any) => apiClient.post<ApiResponse<any>>('/filings', data).then(r => r.data),
    update: (id: string, data: any) => apiClient.put<ApiResponse<any>>(`/filings/${id}`, data).then(r => r.data),
    delete: (id: string) => apiClient.delete<ApiResponse<any>>(`/filings/${id}`).then(r => r.data),
    updateMilestone: (data: any) => apiClient.post<ApiResponse<any>>('/filings/milestones', data).then(r => r.data),
  },

  // Invoices
  invoices: {
    list: (params?: any) => apiClient.get<ApiResponse<any[]>>('/invoices', { params }).then(r => r.data),
    get: (id: string) => apiClient.get<ApiResponse<any>>(`/invoices/${id}`).then(r => r.data),
    create: (data: any) => apiClient.post<ApiResponse<any>>('/invoices', data).then(r => r.data),
    update: (id: string, data: any) => apiClient.put<ApiResponse<any>>(`/invoices/${id}`, data).then(r => r.data),
    cancel: (id: string, data?: any) => apiClient.post<ApiResponse<any>>(`/invoices/${id}/cancel`, data).then(r => r.data),
  },

  // Payments
  payments: {
    list: (params?: any) => apiClient.get<ApiResponse<any[]>>('/payments', { params }).then(r => r.data),
    create: (data: any) => apiClient.post<ApiResponse<any>>('/payments', data).then(r => r.data),
  },

  // Funds
  funds: {
    list: (params?: any) => apiClient.get<ApiResponse<any[]>>('/funds', { params }).then(r => r.data),
    deposit: (data: any) => apiClient.post<ApiResponse<any>>('/funds/deposit', data).then(r => r.data),
    getBalance: (customerId: string) => apiClient.get<ApiResponse<any>>(`/funds/balance/${customerId}`).then(r => r.data),
  },

  // Ledger
  ledger: {
    list: (params?: any) => apiClient.get<ApiResponse<any[]>>('/ledger', { params }).then(r => r.data),
    summary: (params?: any) => apiClient.get<ApiResponse<any>>('/ledger/summary', { params }).then(r => r.data),
  },

  // Wallets
  wallets: {
    list: () => apiClient.get<ApiResponse<any[]>>('/wallets').then(r => r.data),
    get: (id: string) => apiClient.get<ApiResponse<any>>(`/wallets/${id}`).then(r => r.data),
    create: (data: any) => apiClient.post<ApiResponse<any>>('/wallets', data).then(r => r.data),
    update: (id: string, data: any) => apiClient.put<ApiResponse<any>>(`/wallets/${id}`, data).then(r => r.data),
    delete: (id: string) => apiClient.delete<ApiResponse<any>>(`/wallets/${id}`).then(r => r.data),
    transfer: (data: any) => apiClient.post<ApiResponse<any>>('/wallets/transfer', data).then(r => r.data),
  },

  // Agents & Portal
  agents: {
    list: () => apiClient.get<ApiResponse<any[]>>('/agents').then(r => r.data),
    get: (id: string) => apiClient.get<ApiResponse<any>>(`/agents/${id}`).then(r => r.data),
    create: (data: any) => apiClient.post<ApiResponse<any>>('/agents', data).then(r => r.data),
    update: (id: string, data: any) => apiClient.put<ApiResponse<any>>(`/agents/${id}`, data).then(r => r.data),
    delete: (id: string) => apiClient.delete<ApiResponse<any>>(`/agents/${id}`).then(r => r.data),
    portal: () => apiClient.get<ApiResponse<any>>('/agents/portal').then(r => r.data),
  },

  // Commissions
  commissions: {
    list: (params?: any) => apiClient.get<ApiResponse<any[]>>('/commissions', { params }).then(r => r.data),
    create: (data: any) => apiClient.post<ApiResponse<any>>('/commissions', data).then(r => r.data),
    updateStatus: (id: string, status: string) => apiClient.patch<ApiResponse<any>>(`/commissions/${id}/status`, { status }).then(r => r.data),
    delete: (id: string) => apiClient.delete<ApiResponse<any>>(`/commissions/${id}`).then(r => r.data),
  },

  // Products & Services
  products: {
    list: () => apiClient.get<ApiResponse<any[]>>('/products').then(r => r.data),
    create: (data: any) => apiClient.post<ApiResponse<any>>('/products', data).then(r => r.data),
    update: (id: string, data: any) => apiClient.put<ApiResponse<any>>(`/products/${id}`, data).then(r => r.data),
    delete: (id: string) => apiClient.delete<ApiResponse<any>>(`/products/${id}`).then(r => r.data),
  },

  // Company Settings
  company: {
    get: () => apiClient.get<ApiResponse<any>>('/company/settings').then(r => r.data),
    update: (data: any) => apiClient.put<ApiResponse<any>>('/company/settings', data).then(r => r.data),
  },

  // Users
  users: {
    list: () => apiClient.get<ApiResponse<any[]>>('/users-admin/users').then(r => r.data),
    create: (data: any) => apiClient.post<ApiResponse<any>>('/users-admin/users', data).then(r => r.data),
    update: (id: string, data: any) => apiClient.put<ApiResponse<any>>(`/users-admin/users/${id}`, data).then(r => r.data),
    delete: (id: string) => apiClient.delete<ApiResponse<any>>(`/users-admin/users/${id}`).then(r => r.data),
  },

  // User Admin
  usersAdmin: {
    listUsers: () => apiClient.get<ApiResponse<any[]>>('/users-admin/users').then(r => r.data),
    createUser: (data: any) => apiClient.post<ApiResponse<any>>('/users-admin/users', data).then(r => r.data),
    updateUser: (id: string, data: any) => apiClient.put<ApiResponse<any>>(`/users-admin/users/${id}`, data).then(r => r.data),
    deleteUser: (id: string) => apiClient.delete<ApiResponse<any>>(`/users-admin/users/${id}`).then(r => r.data),
    listTypes: () => apiClient.get<ApiResponse<any[]>>('/users-admin/types').then(r => r.data),
    createType: (data: any) => apiClient.post<ApiResponse<any>>('/users-admin/types', data).then(r => r.data),
    updateType: (id: string, data: any) => apiClient.put<ApiResponse<any>>(`/users-admin/types/${id}`, data).then(r => r.data),
    deleteType: (id: string) => apiClient.delete<ApiResponse<any>>(`/users-admin/types/${id}`).then(r => r.data),
  },

  // File Upload
  upload: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post<ApiResponse<{ fileUrl: string; filename: string }>>('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data);
  },
};
