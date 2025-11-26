import type { User, Family, Member, HealthCheck, Note } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

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
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers,
    };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      console.error(`API error on ${endpoint}:`, data);
      return { error: data.detail || data.error || 'Đã xảy ra lỗi' };
    }

    return { data };
  } catch (error) {
    console.error(`Network error on ${endpoint}:`, error);
    return { error: 'Lỗi kết nối mạng' };
  }
}

export const api = {
  signup: (email: string, password: string, name: string): Promise<ApiResponse<{ access_token: string }>> =>
    apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    }),

  login: (email: string, password: string): Promise<ApiResponse<{ access_token: string }>> =>
    apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  getMe: (token: string): Promise<ApiResponse<{ id: string; email: string; name: string; role: string; created_at: string }>> =>
    apiRequest('/users/me', {}, token),

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

  deleteHealthCheck: (token: string, checkId: string): Promise<ApiResponse<{ success: boolean }>> =>
    apiRequest(`/health-checks/${checkId}`, {
      method: 'DELETE',
    }, token),

  createNote: (token: string, content: string, type: string): Promise<ApiResponse<{ note: Note }>> =>
    apiRequest('/notes', {
      method: 'POST',
      body: JSON.stringify({ content, type }),
    }, token),

  getNotes: (token: string): Promise<ApiResponse<{ notes: Note[] }>> =>
    apiRequest('/notes', {}, token),

  inviteUser: (token: string, email: string): Promise<ApiResponse<{ invitation: any }>> =>
    apiRequest('/family/invite', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }, token),

  getInvitations: (token: string): Promise<ApiResponse<{ invitations: any[] }>> =>
    apiRequest('/family/invitations', {}, token),

  acceptInvitation: (token: string, invitationId: string): Promise<ApiResponse<{ status: string }>> =>
    apiRequest(`/family/invitations/${invitationId}/accept`, {
      method: 'POST',
    }, token),

  deleteFamily: (token: string, familyId: string): Promise<ApiResponse<{ success: boolean }>> =>
    apiRequest(`/family/${familyId}`, {
      method: 'DELETE',
    }, token),

  createFamily: (token: string, name: string, members: Array<{email: string, isAdmin: boolean}>, creatorIsAdmin: boolean = true): Promise<ApiResponse<{ family: any }>> =>
    apiRequest('/family/create', {
      method: 'POST',
      body: JSON.stringify({ name, members, creatorIsAdmin }),
    }, token),

  addFamilyMember: (token: string, familyId: string, email: string, isAdmin: boolean): Promise<ApiResponse<{ member: any }>> =>
    apiRequest(`/family/${familyId}/members`, {
      method: 'POST',
      body: JSON.stringify({ email, isAdmin }),
    }, token),

  getFamilyMembers: (token: string, familyId: string): Promise<ApiResponse<{ members: any[] }>> =>
    apiRequest(`/family/${familyId}/members`, {}, token),
};
