import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Heart, LogOut, Users, Activity, MessageSquare, TrendingUp, Calendar, CheckCircle2, AlertCircle, Moon, Sun } from 'lucide-react';
import { MembersTab } from './MembersTab';
import { HealthCheckTab } from './HealthCheckTab';
import { NotesTab } from './NotesTab';
import { api } from '../utils/api';
import { Badge } from './ui/badge';
import type { Member, HealthCheck, Note, DashboardStats, User, Family } from '../types';
// import { supabase } from '../utils/supabase-client';

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
  const [showCreateFamily, setShowCreateFamily] = useState(false);
  const [familyName, setFamilyName] = useState('');
  const [familyMembers, setFamilyMembers] = useState<Array<{email: string, isAdmin: boolean}>>([]);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [creatorIsAdmin, setCreatorIsAdmin] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);
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
      if (userResponse.data) {
        const userData = userResponse.data;
        setUser({
          id: userData.id,
          email: userData.email,
          name: userData.name,
          role: (userData.role || 'user') as 'admin' | 'user',
          createdAt: userData.created_at,
        });
      }

      const familyResponse = await api.getFamily(token);
      if (familyResponse.data?.family) {
        setFamily(familyResponse.data.family);
        
        // Load family members
        const familyMembersResponse = await api.getFamilyMembers(token, familyResponse.data.family.id);
        if (familyMembersResponse.data?.members) {
          const membersList = familyMembersResponse.data.members;
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

  const handleLogout = () => {
    onLogout();
  };

  const handleAddMember = () => {
    if (newMemberEmail) {
      setFamilyMembers([...familyMembers, { email: newMemberEmail, isAdmin: false }]);
      setNewMemberEmail('');
    }
  };

  const handleCreateFamily = async () => {
    if (!familyName) return;
    try {
      const response = await api.createFamily(token, familyName, familyMembers, creatorIsAdmin);
      if (response.data) {
        setShowCreateFamily(false);
        setFamilyName('');
        setFamilyMembers([]);
        setCreatorIsAdmin(true);
        setLoading(true);
        await loadUserData();
      } else if (response.error) {
        alert('Lỗi: ' + response.error);
      }
    } catch (error) {
      console.error('Error creating family:', error);
      alert('Lỗi khi tạo nhóm');
    }
  };

  const handleDeleteFamily = async () => {
    if (!family || !window.confirm('Bạn chắc chắn muốn xóa nhóm này?')) return;
    try {
      const response = await api.deleteFamily(token, family.id);
      if (response.data?.success) {
        setFamily(null);
        setMembers([]);
        await loadUserData();
      } else if (response.error) {
        alert('Lỗi: ' + response.error);
      }
    } catch (error) {
      console.error('Error deleting family:', error);
      alert('Lỗi khi xóa nhóm');
    }
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
    <div className={`min-h-screen transition-colors duration-300 ${isDarkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-blue-50 via-indigo-50 to-green-50'}`}>
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
            <div className="flex gap-2">
              <Button 
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="bg-white text-blue-600 hover:bg-gray-100 font-semibold shadow-lg"
                title={isDarkMode ? "Chế độ sáng" : "Chế độ tối"}
              >
                {isDarkMode ? <Sun className="size-4" /> : <Moon className="size-4" />}
              </Button>
              <Button 
                onClick={() => setShowCreateFamily(true)}
                className="bg-white text-blue-600 hover:bg-gray-100 font-semibold shadow-lg"
              >
                <Users className="size-4 mr-2" />
                Tạo nhóm
              </Button>
              <Button 
                onClick={handleLogout}
                className="bg-white text-blue-600 hover:bg-gray-100 font-semibold shadow-lg"
              >
                <LogOut className="size-4 mr-2" />
                Đăng xuất
              </Button>
            </div>
          </div>
        </div>

        {/* Create Family Modal */}
        {showCreateFamily && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-md bg-white shadow-2xl">
              <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-t-lg">
                <CardTitle className="text-white">Tạo nhóm gia đình</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                <div>
                  <label className="text-sm font-semibold text-gray-800">Tên nhóm</label>
                  <input 
                    type="text" 
                    value={familyName}
                    onChange={(e) => setFamilyName(e.target.value)}
                    placeholder="Gia đình của tôi"
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg mt-2 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-gray-900 placeholder-gray-400"
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-gray-800">Thêm thành viên</label>
                  <div className="flex gap-2 mt-2">
                    <input 
                      type="email" 
                      value={newMemberEmail}
                      onChange={(e) => setNewMemberEmail(e.target.value)}
                      placeholder="email@example.com"
                      className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-gray-900 placeholder-gray-400"
                    />
                    <Button onClick={handleAddMember} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold">Thêm</Button>
                  </div>
                </div>

                {familyMembers.length > 0 && (
                  <div>
                    <label className="text-sm font-semibold text-gray-800">Danh sách thành viên</label>
                    <div className="space-y-2 mt-2 max-h-40 overflow-y-auto">
                      {familyMembers.map((member, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-gradient-to-r from-blue-50 to-purple-50 p-3 rounded-lg border border-blue-200">
                          <span className="text-sm font-medium text-gray-800">{member.email}</span>
                          <div className="flex items-center gap-2">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input 
                                type="checkbox" 
                                checked={member.isAdmin}
                                onChange={(e) => {
                                  const updated = [...familyMembers];
                                  updated[idx].isAdmin = e.target.checked;
                                  setFamilyMembers(updated);
                                }}
                                className="w-4 h-4 accent-blue-600 cursor-pointer"
                              />
                              <span className="text-xs font-medium text-gray-700">Admin</span>
                            </label>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => setFamilyMembers(familyMembers.filter((_, i) => i !== idx))}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 font-semibold"
                            >
                              Xóa
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-300 rounded-lg p-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={creatorIsAdmin}
                      onChange={(e) => setCreatorIsAdmin(e.target.checked)}
                      className="w-5 h-5 accent-blue-600 cursor-pointer"
                    />
                    <span className="text-sm font-semibold text-gray-800">Bạn là admin nhóm</span>
                  </label>
                  <p className="text-xs text-gray-600 mt-2 ml-8">Bỏ chọn nếu bạn không muốn làm admin</p>
                </div>

                <div className="flex gap-2 justify-end pt-4 border-t border-gray-200">
                  <Button variant="outline" onClick={() => setShowCreateFamily(false)} className="border-2 border-gray-300 text-gray-700 hover:bg-gray-100 font-semibold">Hủy</Button>
                  <Button onClick={handleCreateFamily} className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold">Tạo</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className={`border-0 shadow-lg transition-all ${isDarkMode ? 'bg-gray-800' : 'bg-gradient-to-br from-blue-50 to-white'}`}>
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

          <Card className={`border-0 shadow-lg transition-all ${isDarkMode ? 'bg-gray-800' : 'bg-gradient-to-br from-green-50 to-white'}`}>
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

          <Card className={`border-0 shadow-lg transition-all ${isDarkMode ? 'bg-gray-800' : 'bg-gradient-to-br from-indigo-50 to-white'}`}>
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

          <Card className={`border-0 shadow-lg transition-all ${isDarkMode ? 'bg-gray-800' : 'bg-gradient-to-br from-amber-50 to-white'}`}>
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
            <Card className={`shadow-lg border-0 transition-all ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
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
              <Card className={`shadow-lg border-0 transition-all ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
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
            <Tabs defaultValue="family" className="space-y-4">
              <TabsList className={`grid w-full h-full ${user?.role === 'admin' ? 'grid-cols-4' : 'grid-cols-3'} shadow-md p-1 rounded-xl transition-all ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                <TabsTrigger 
                  value="family"
                  className="rounded-lg transition-all duration-300 ease-in-out hover:bg-blue-500/10 hover:text-blue-700"
                >
                  <Users className="size-4 mr-2" />
                  Nhóm của tôi
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
                {user?.role === 'admin' && (
                  <TabsTrigger 
                    value="manage"
                    className="rounded-lg transition-all duration-300 ease-in-out hover:bg-purple-500/10 hover:text-purple-700"
                  >
                    <Users className="size-4 mr-2" />
                    Quản lý
                  </TabsTrigger>
                )}
              </TabsList>

              <TabsContent value="family" className="mt-0">
                <Card className={`shadow-lg border-0 transition-all ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className={`flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      <Users className="size-5 text-blue-600" />
                      Nhóm của tôi
                    </CardTitle>
                    {family && family.admin === user?.id && (
                      <button 
                        onClick={handleDeleteFamily}
                        className="!px-4 !py-2 !bg-red-600 hover:!bg-red-700 !text-white !font-semibold !rounded-lg !transition-colors"
                      >
                        Xóa nhóm
                      </button>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {family ? (
                      <div className={`border-2 border-blue-300 rounded-lg p-4 ${isDarkMode ? 'bg-gray-700' : 'bg-blue-50'}`}>
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h3 className={`font-bold text-lg ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{family.name}</h3>
                            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{members.length} thành viên</p>
                          </div>
                        </div>
                        <div className="space-y-2">
                          {members.map(member => (
                            <div key={member.id} className={`flex items-center justify-between p-2 rounded ${isDarkMode ? 'bg-gray-600' : 'bg-white'} border ${isDarkMode ? 'border-gray-500' : 'border-blue-200'}`}>
                              <div>
                                <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{member.name}</p>
                                <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{member.email}</p>
                              </div>
                              <Badge className={member.role === 'admin' ? 'bg-purple-600' : 'bg-blue-600'}>
                                {member.role === 'admin' ? 'Admin' : 'Thành viên'}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className={`text-center py-8 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        <p>Bạn chưa tham gia nhóm nào</p>
                        <p className="text-sm mt-2">Tạo nhóm mới hoặc chờ lời mời từ admin</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="health" className="mt-0">
                <HealthCheckTab token={token} />
              </TabsContent>

              <TabsContent value="notes" className="mt-0">
                <NotesTab token={token} />
              </TabsContent>

              {user?.role === 'admin' && (
                <TabsContent value="manage" className="mt-0">
                  <Card className={`shadow-lg border-0 transition-all ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                    <CardHeader>
                      <CardTitle className="text-gray-900">Quản lý gia đình</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h3 className="font-semibold text-blue-900 mb-2">Thành viên gia đình</h3>
                        <p className="text-sm text-blue-700 mb-4">Tổng cộng: {stats.totalMembers} thành viên</p>
                        <div className="space-y-2">
                          {members.map(member => (
                            <div key={member.id} className="flex items-center justify-between bg-white p-3 rounded-lg border border-blue-100">
                              <div>
                                <p className="font-medium text-gray-900">{member.name}</p>
                                <p className="text-xs text-gray-500">{member.relationship}</p>
                              </div>
                              <Badge variant="outline">{member.relationship}</Badge>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                        <h3 className="font-semibold text-purple-900 mb-2">Mời thành viên</h3>
                        <p className="text-sm text-purple-700 mb-4">Mời người khác tham gia gia đình của bạn</p>
                        <div className="flex gap-2">
                          <input 
                            type="email" 
                            placeholder="Nhập email" 
                            className="flex-1 px-3 py-2 border border-purple-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                          />
                          <Button className="bg-purple-600 hover:bg-purple-700">Mời</Button>
                        </div>
                      </div>

                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <h3 className="font-semibold text-green-900 mb-2">Thống kê</h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-2xl font-bold text-green-600">{stats.totalMembers}</p>
                            <p className="text-xs text-green-700">Tổng thành viên</p>
                          </div>
                          <div>
                            <p className="text-2xl font-bold text-green-600">{stats.totalChecks}</p>
                            <p className="text-xs text-green-700">Tổng check</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              )}
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}
