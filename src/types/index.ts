// User & Family types
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  createdAt: string;
}

export interface Family {
  id: string;
  name: string;
  admin: string;
  members: FamilyMember[];
  createdBy?: string;
  createdAt?: string;
}

export interface FamilyMember {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'member';
  joinedAt?: string;
}

// Member types
export interface Member {
  id: string;
  name: string;
  relationship: string;
  createdAt: string;
}

// Health Check types
export interface HealthCheck {
  id: string;
  memberId: string;
  status: string;
  note: string;
  date: string;
  timestamp: string;
  temperature?: string;
  bloodPressure?: string;
}

// Note types
export interface Note {
  id: string;
  content: string;
  type: 'general' | 'suggestion' | 'warning' | 'reminder';
  createdBy: string;
  createdAt: string;
}

// API Response types
export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
}

// Stats types
export interface DashboardStats {
  totalMembers: number;
  checkedToday: number;
  totalChecks: number;
  recentNotes: number;
}
