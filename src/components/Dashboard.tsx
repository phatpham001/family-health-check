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
  const [stats, setStats] = useState<DashboardStats>({
    totalMembers: 0,
    checkedToday: 0,
    totalChecks: 0,
    recentNotes: 0,
  });

  useEffect(() => {
    loadUserData();
  }, [token]);

  const loadUserData = async () => {
    try {
      const userResponse = await api.getMe(token);
      if (userResponse.data?.user) {
        setUser(userResponse.data.user);
      }

      const familyResponse = await api.getFamily(token);
      if (familyResponse.data?.family) {
        setFamily(familyResponse.data.family);
      }

      // Load members
      const membersResponse = await api.getMembers(token);
      if (membersResponse.data?.members) {
        const membersList = membersResponse.data.members;
        setMembers(membersList);

        // Load health checks for all members
        const today = new Date().toISOString().split('T')[0];
        let todayCount = 0;
        let totalChecks = 0;
        const allChecks: HealthCheck[] = [];

        for (const member of membersList) {
          const checksResponse = await api.getHealthChecks(token, member.id);
          if (checksResponse.data?.healthChecks) {
            const checks = checksResponse.data.healthChecks;
            totalChecks += checks.length;
            allChecks.push(...checks);
            
            const hasCheckToday = checks.some((check: HealthCheck) => 
              check.timestamp.split('T')[0] === today
            );
            if (hasCheckToday) todayCount++;
          }
        }

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
      if (notesResponse.data?.notes) {
        const notes = notesResponse.data.notes.slice(0, 3);
        setRecentNotes(notes);
        setStats(prev => ({
          ...prev,
          recentNotes: notes.length,
        }));
      }
    } catch (error) {
      console.error('Lỗi khi tải dữ liệu:', error);
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-green-50">
      <div className="container mx-auto p-4 max-w-7xl">
        {/* Enhanced Header */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-green-600 rounded-2xl shadow-xl p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl">
                <Heart className="size-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">Sức khỏe gia đình</h1>
                <p className="text-blue-100 mt-1 text-left">
                  Xin chào, <span className="font-semibold">{user?.name}</span> 👋
                </p>
              </div>
            </div>
            <Button 
              variant="secondary" 
              onClick={handleLogout}
              className="bg-white/20 hover:bg-white/30 text-white border-white/30"
            >
              <LogOut className="size-4 mr-2" />
              Đăng xuất
            </Button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Thành viên</p>
                  <p className="text-3xl font-bold text-blue-600 mt-2">{stats.totalMembers}</p>
                </div>
                <div className="bg-blue-100 p-3 rounded-xl">
                  <Users className="size-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-green-200 bg-gradient-to-br from-green-50 to-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Check hôm nay</p>
                  <p className="text-3xl font-bold text-green-600 mt-2">
                    {stats.checkedToday}/{stats.totalMembers}
                  </p>
                </div>
                <div className="bg-green-100 p-3 rounded-xl">
                  <CheckCircle2 className="size-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-indigo-200 bg-gradient-to-br from-indigo-50 to-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Tổng số check</p>
                  <p className="text-3xl font-bold text-indigo-600 mt-2">{stats.totalChecks}</p>
                </div>
                <div className="bg-indigo-100 p-3 rounded-xl">
                  <Activity className="size-6 text-indigo-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Ghi chú mới</p>
                  <p className="text-3xl font-bold text-amber-600 mt-2">{stats.recentNotes}</p>
                </div>
                <div className="bg-amber-100 p-3 rounded-xl">
                  <MessageSquare className="size-6 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content - Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Recent Activity - Left Column */}
          <div className="lg:col-span-1 space-y-4">
            {/* Recent Health Checks */}
            <Card className="shadow-lg">
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
                      <div key={check.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                        <div className="bg-green-100 p-2 rounded-lg">
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
            {recentNotes.length > 0 && (
              <Card className="shadow-lg border-amber-200">
                <CardHeader>
                  <CardTitle className="text-gray-900 flex items-center gap-2">
                    <MessageSquare className="size-5 text-amber-600" />
                    Ghi chú mới
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {recentNotes.map((note) => {
                    const NoteIcon = noteIcons[note.type as keyof typeof noteIcons] || MessageSquare;
                    return (
                      <div key={note.id} className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                        <div className="flex items-start gap-2 mb-2">
                          <NoteIcon className="size-4 text-amber-600 mt-0.5" />
                          <p className="text-xs text-gray-500">{formatDate(note.createdAt)}</p>
                        </div>
                        <p className="text-sm text-gray-700 line-clamp-2">{note.content}</p>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Main Tabs - Right Column */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="members" className="space-y-4">
              <TabsList className="grid w-full h-full grid-cols-3 bg-white shadow-md p-1 rounded-xl">
                <TabsTrigger 
                  value="members"
                  className="rounded-lg transition-all duration-300 ease-in-out hover:bg-blue-500/10 hover:text-blue-700"
                >
                  <Users className="size-4 mr-2" />
                  Thành viên
                </TabsTrigger>
                <TabsTrigger 
                  value="health"
                  className="rounded-lg mx-2 transition-all duration-300 ease-in-out hover:bg-green-500/10 hover:text-green-700"
                >
                  <Activity className="size-4 mr-2" />
                  Check sức khỏe
                </TabsTrigger>
                <TabsTrigger 
                  value="notes"
                  className="rounded-lg transition-all duration-300 ease-in-out hover:bg-amber-500/10 hover:text-amber-700"
                >
                  <MessageSquare className="size-4 mr-2" />
                  Ghi chú
                </TabsTrigger>
              </TabsList>

              <TabsContent value="members" className="mt-0">
                <MembersTab token={token} />
              </TabsContent>

              <TabsContent value="health" className="mt-0">
                <HealthCheckTab token={token} />
              </TabsContent>

              <TabsContent value="notes" className="mt-0">
                <NotesTab token={token} />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}
