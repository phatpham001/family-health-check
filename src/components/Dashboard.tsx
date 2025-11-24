import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Heart, LogOut, Users, Activity, MessageSquare, TrendingUp, Calendar, CheckCircle2, AlertCircle } from 'lucide-react';
import { MembersTab } from './MembersTab';
import { HealthCheckTab } from './HealthCheckTab';
import { NotesTab } from './NotesTab';
import { api } from '../utils/api';
import { supabase } from '../utils/supabase-client';
import { Badge } from './ui/badge';
import type { Member, HealthCheck, Note, DashboardStats, User, Family } from '../types';

interface DashboardProps {
  token: string;
  onLogout: () => void;
}

export function Dashboard({ token, onLogout }: DashboardProps) {
  const [user, setUser] = useState<User | null>(null);
  const [family, setFamily] = useState<Family | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [recentChecks, setRecentChecks] = useState<HealthCheck[]>([]);
  const [recentNotes, setRecentNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    totalMembers: 0,
    checkedToday: 0,
    totalChecks: 0,
    recentNotes: 0,
  });
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    loadUserData();
  }, [token]);

  const loadUserData = async () => {
    try {
      setError(null);
      
      const userResponse = await api.getMe(token);
      if (userResponse.error) {
        if (userResponse.error.includes('Invalid token') || userResponse.error.includes('Unauthorized')) {
          await handleLogout();
          return;
        }
        throw new Error(userResponse.error);
      }
      if (userResponse.data) {
        // Map API response to User type
        const userData = userResponse.data;
        setUser({
          id: userData.id,
          name: userData.name,
          email: userData.email,
          createdAt: userData.created_at
        });
      }

      const familyResponse = await api.getFamily(token);
      if (familyResponse.error) {
        if (familyResponse.error.includes('Invalid token') || familyResponse.error.includes('Unauthorized')) {
          await handleLogout();
          return;
        }
        throw new Error(familyResponse.error);
      }
      if (familyResponse.data?.family) {
        setFamily(familyResponse.data.family);
      }

      // Load members
      const membersResponse = await api.getMembers(token);
      if (membersResponse.error) {
        if (membersResponse.error.includes('Invalid token') || membersResponse.error.includes('Unauthorized')) {
          await handleLogout();
          return;
        }
        throw new Error(membersResponse.error);
      }
      
      if (membersResponse.data?.members) {
        const membersList = membersResponse.data.members;
        setMembers(membersList);

        // Load health checks for all members in parallel
        const today = new Date().toISOString().split('T')[0];
        const healthCheckPromises = membersList.map(member => 
          api.getHealthChecks(token, member.id)
        );
        
        const healthCheckResponses = await Promise.all(healthCheckPromises);
        
        let todayCount = 0;
        let totalChecks = 0;
        const allChecks: HealthCheck[] = [];

        healthCheckResponses.forEach((response, index) => {
          if (response.error) {
            console.warn(`Lỗi khi tải health checks cho member ${membersList[index].name}:`, response.error);
            return;
          }
          
          if (response.data?.healthChecks) {
            const checks = response.data.healthChecks;
            totalChecks += checks.length;
            allChecks.push(...checks);
            
            const hasCheckToday = checks.some((check: HealthCheck) => 
              check.timestamp.split('T')[0] === today
            );
            if (hasCheckToday) todayCount++;
          }
        });

        // Sort and get recent checks
        allChecks.sort((a, b) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        setRecentChecks(allChecks.slice(0, 5));

        setStats(prev => ({
          ...prev,
          totalMembers: membersList.length,
          checkedToday: todayCount,
          totalChecks,
        }));
      }

      // Load recent notes
      const notesResponse = await api.getNotes(token);
      if (notesResponse.error) {
        console.warn('Lỗi khi tải notes:', notesResponse.error);
      } else if (notesResponse.data?.notes) {
        const notes = notesResponse.data.notes.slice(0, 3);
        setRecentNotes(notes);
        setStats(prev => ({
          ...prev,
          recentNotes: notes.length,
        }));
      }
    } catch (error) {
      console.error('Lỗi khi tải dữ liệu:', error);
      setError(error instanceof Error ? error.message : 'Có lỗi xảy ra khi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    onLogout();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Heart className="size-12 text-blue-500 animate-pulse mx-auto mb-4" />
          <p className="text-gray-600">Đang tải...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <AlertCircle className="size-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Có lỗi xảy ra</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={() => { setError(null); loadUserData(); }} className="bg-blue-600 hover:bg-blue-700">
            Thử lại
          </Button>
        </div>
      </div>
    );
  }

  const getMemberName = (memberId: string) => {
    const member = members.find(m => m.id === memberId);
    return member?.name || 'Thành viên';
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    
    if (hours < 1) return 'Vừa xong';
    if (hours < 24) return `${hours} giờ trước`;
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
  };

  const noteIcons = {
    general: MessageSquare,
    suggestion: TrendingUp,
    warning: AlertCircle,
    reminder: Calendar,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-green-50 flex">
      {/* Sidebar Navigation - Full Height Left */}
      <div className="w-72 flex-shrink-0 bg-gradient-to-b from-slate-900 via-gray-900 to-zinc-900 shadow-2xl border-r border-slate-700">
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-r from-violet-500 to-purple-500 p-3 rounded-xl shadow-xl">
              <Heart className="size-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Sức khỏe gia đình</h2>
              <p className="text-sm text-slate-300">Xin chào, {user?.name}</p>
            </div>
          </div>
        </div>
        
        <nav className="p-6 space-y-3">
          <button
            onClick={() => setActiveTab('dashboard')}
            style={activeTab !== 'dashboard' ? { backgroundColor: 'transparent' } : {}}
            className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all duration-300 rounded-xl ${
              activeTab === 'dashboard'
                ? 'bg-gradient-to-r from-violet-500 to-purple-500 text-white shadow-xl shadow-violet-500/25'
                : 'text-slate-400 hover:bg-gradient-to-r hover:from-violet-500 hover:to-purple-500 hover:text-white hover:shadow-lg hover:shadow-violet-500/20'
            }`}
          >
            <Heart className="size-5" />
            <span className="font-semibold">Tổng quan</span>
          </button>
          
          <button
            onClick={() => setActiveTab('members')}
            className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all duration-300 rounded-xl ${
              activeTab === 'members'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-xl shadow-emerald-500/25'
                : 'text-slate-400 !bg-transparent hover:!bg-gradient-to-r hover:from-emerald-500 hover:to-teal-500 hover:text-white hover:shadow-lg hover:shadow-emerald-500/20'
            }`}
          >
            <Users className="size-5" />
            <span className="font-semibold">Thành viên</span>
          </button>
          
          <button
            onClick={() => setActiveTab('health')}
            className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all duration-300 rounded-xl ${
              activeTab === 'health'
                ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-xl shadow-blue-500/25'
                : 'text-slate-400 !bg-transparent hover:!bg-gradient-to-r hover:from-blue-500 hover:to-cyan-500 hover:text-white hover:shadow-lg hover:shadow-blue-500/20'
            }`}
          >
            <Activity className="size-5" />
            <span className="font-semibold">Check sức khỏe</span>
          </button>
          
          <button
            onClick={() => setActiveTab('notes')}
            className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all duration-300 rounded-xl ${
              activeTab === 'notes'
                ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-xl shadow-orange-500/25'
                : 'text-slate-400 !bg-transparent hover:!bg-gradient-to-r hover:from-orange-500 hover:to-amber-500 hover:text-white hover:shadow-lg hover:shadow-orange-500/20'
            }`}
          >
            <MessageSquare className="size-5" />
            <span className="font-semibold">Ghi chú</span>
          </button>
          
          <div className="pt-4 mt-4 border-t border-slate-700">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 text-left transition-all duration-300 rounded-xl text-slate-400 !bg-transparent hover:!bg-gradient-to-r hover:from-red-500 hover:to-rose-500 hover:text-white hover:shadow-xl hover:shadow-red-500/25"
            >
              <LogOut className="size-5" />
              <span className="font-semibold">Đăng xuất</span>
            </button>
          </div>
        </nav>
      </div>

      {/* Main Content Area - Right Side */}
      <div className="flex-1">
        <div className="p-4">
          {/* Enhanced Header */}
          <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-green-600 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-500 p-6 mb-6">
            <div className="flex items-center gap-4">
              <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl shadow-lg">
                <Heart className="size-8 text-white animate-pulse" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">Sức khỏe gia đình</h1>
                <p className="text-blue-100 mt-1 text-left">
                  Xin chào, <span className="font-semibold">{user?.name}</span> 👋
                </p>
              </div>
            </div>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-white backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Thành viên</p>
                    <p className="text-3xl font-bold text-blue-600 mt-2">{stats.totalMembers}</p>
                  </div>
                  <div className="bg-blue-100 p-3 rounded-xl shadow-lg">
                    <Users className="size-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-green-200 bg-gradient-to-br from-green-50 to-white backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Check hôm nay</p>
                    <p className="text-3xl font-bold text-green-600 mt-2">
                      {stats.checkedToday}/{stats.totalMembers}
                    </p>
                  </div>
                  <div className="bg-green-100 p-3 rounded-xl shadow-lg">
                    <CheckCircle2 className="size-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-indigo-200 bg-gradient-to-br from-indigo-50 to-white backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Tổng số check</p>
                    <p className="text-3xl font-bold text-indigo-600 mt-2">{stats.totalChecks}</p>
                  </div>
                  <div className="bg-indigo-100 p-3 rounded-xl shadow-lg">
                    <Activity className="size-6 text-indigo-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-white backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Ghi chú mới</p>
                    <p className="text-3xl font-bold text-amber-600 mt-2">{stats.recentNotes}</p>
                  </div>
                  <div className="bg-amber-100 p-3 rounded-xl shadow-lg">
                    <MessageSquare className="size-6 text-amber-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tab Content */}
          <div className="flex-1">
            {activeTab === 'dashboard' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Health Checks */}
                <Card className="shadow-lg bg-white border-gray-200">
                  <CardHeader>
                    <CardTitle className="text-gray-900 flex items-center gap-2">
                      <Activity className="size-5 text-indigo-600" />
                      Hoạt động gần đây
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {recentChecks.length > 0 ? (
                      <div className="space-y-3">
                        {recentChecks.map((check) => (
                          <div key={check.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-all duration-300 hover:scale-[1.02]">
                            <div className="bg-green-100 p-2 rounded-lg shadow-sm">
                              <CheckCircle2 className="size-4 text-green-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {getMemberName(check.memberId)}
                              </p>
                              <p className="text-xs text-gray-500">{formatDate(check.timestamp)}</p>
                            </div>
                            <Badge variant="outline" className="text-green-600 border-green-200">
                              {check.status}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-gray-500 py-8">Chưa có hoạt động</p>
                    )}
                  </CardContent>
                </Card>

                {/* Recent Notes */}
                <Card className="shadow-lg border-amber-200 bg-white">
                  <CardHeader>
                    <CardTitle className="text-gray-900 flex items-center gap-2">
                      <MessageSquare className="size-5 text-amber-600" />
                      Ghi chú mới
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {recentNotes.length > 0 ? (
                      recentNotes.map((note) => {
                        const NoteIcon = noteIcons[note.type as keyof typeof noteIcons] || MessageSquare;
                        return (
                          <div key={note.id} className="p-3 bg-amber-50 rounded-lg border border-amber-200 hover:shadow-md transition-all duration-300">
                            <div className="flex items-start gap-2 mb-2">
                              <NoteIcon className="size-4 text-amber-600 mt-0.5" />
                              <p className="text-xs text-gray-500">{formatDate(note.createdAt)}</p>
                            </div>
                            <p className="text-sm text-gray-700 line-clamp-2">{note.content}</p>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-center text-gray-500 py-8">Chưa có ghi chú</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === 'members' && (
              <MembersTab token={token} />
            )}

            {activeTab === 'health' && (
              <HealthCheckTab token={token} />
            )}

            {activeTab === 'notes' && (
              <NotesTab token={token} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
