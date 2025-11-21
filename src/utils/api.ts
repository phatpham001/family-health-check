import { projectId, publicAnonKey } from './supabase/info';
import type { User, Family, Member, HealthCheck, Note } from '../types';

const API_BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-541782ba`;

export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  token?: string
): Promise<ApiResponse<T>> {
  try {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : `Bearer ${publicAnonKey}`,
      ...options.headers,
    };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      console.error(`API error on ${endpoint}:`, data);
      return { error: data.error || 'Đã xảy ra lỗi' };
    }

    return { data };
  } catch (error) {
    console.error(`Network error on ${endpoint}:`, error);
    return { error: 'Lỗi kết nối mạng' };
  }
}

export const api = {
  signup: (email: string, password: string, name: string): Promise<ApiResponse<{ user: User }>> =>
    apiRequest('/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    }),

  getMe: (token: string): Promise<ApiResponse<{ user: User }>> =>
    apiRequest('/me', {}, token),

  getFamily: (token: string): Promise<ApiResponse<{ family: Family }>> =>
    apiRequest('/family', {}, token),

  getMembers: (token: string): Promise<ApiResponse<{ members: Member[] }>> =>
    apiRequest('/members', {}, token),

  addMember: (token: string, name: string, relationship: string): Promise<ApiResponse<{ member: Member }>> =>
    apiRequest('/members', {
      method: 'POST',
      body: JSON.stringify({ name, relationship }),
    }, token),

  deleteMember: (token: string, memberId: string): Promise<ApiResponse<{ success: boolean }>> =>
    apiRequest(`/members/${memberId}`, {
      method: 'DELETE',
    }, token),

  createHealthCheck: (
    token: string,
    memberId: string,
    status: string,
    note?: string,
    temperature?: string,
    bloodPressure?: string
  ): Promise<ApiResponse<{ healthCheck: HealthCheck }>> =>
    apiRequest('/health-checks', {
      method: 'POST',
      body: JSON.stringify({ memberId, status, note, temperature, bloodPressure }),
    }, token),

  getHealthChecks: (token: string, memberId: string): Promise<ApiResponse<{ healthChecks: HealthCheck[] }>> =>
    apiRequest(`/health-checks/${memberId}`, {}, token),

  createNote: (token: string, content: string, type: string): Promise<ApiResponse<{ note: Note }>> =>
    apiRequest('/notes', {
      method: 'POST',
      body: JSON.stringify({ content, type }),
    }, token),

  getNotes: (token: string): Promise<ApiResponse<{ notes: Note[] }>> =>
    apiRequest('/notes', {}, token),
};
