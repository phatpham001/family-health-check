import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Heart, LogOut, Users, Activity, MessageSquare, TrendingUp, Calendar, CheckCircle2, AlertCircle, Moon, Sun, UserPlus, Menu, ChevronLeft } from 'lucide-react';
import { HealthCheckTab } from './HealthCheckTab';
import { NotesTab } from './NotesTab';
import { api } from '../utils/api';
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
  const [showCreateFamily, setShowCreateFamily] = useState(false);
  const [familyName, setFamilyName] = useState('');
  const [familyMembers, setFamilyMembers] = useState<Array<{email: string, isAdmin: boolean}>>([]);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [creatorIsAdmin, setCreatorIsAdmin] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(256); // 256px = w-64
  const [isResizing, setIsResizing] = useState(false);
  const [activeTab, setActiveTab] = useState('family');
  const [selectedMemberDetail, setSelectedMemberDetail] = useState<string | null>(null);
  const [memberHealthChecks, setMemberHealthChecks] = useState<HealthCheck[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalMembers: 0,
    checkedToday: 0,
    totalChecks: 0,
    recentNotes: 0,
  });

  useEffect(() => {
    loadUserData();
  }, [token]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const newWidth = e.clientX;
      if (newWidth >= 80 && newWidth <= 400) {
        setSidebarWidth(newWidth);
        if (newWidth < 150) {
          setSidebarOpen(false);
        } else {
          setSidebarOpen(true);
        }
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  const handleResizeStart = () => {
    setIsResizing(true);
  };

  const toggleSidebar = () => {
    if (sidebarOpen) {
      setSidebarWidth(80);
      setSidebarOpen(false);
    } else {
      setSidebarWidth(256);
      setSidebarOpen(true);
    }
  };

  const loadUserData = async () => {
    console.log('=== loadUserData called ===');
    try {
      const userResponse = await api.getMe(token);
      console.log('User response:', userResponse.data);
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
        const familyData = familyResponse.data.family;
        setFamily(familyData);
        
        // Check if user is family admin
        const isFamilyAdmin = familyData.admin === userResponse.data?.id;
        if (isFamilyAdmin && userResponse.data) {
          setUser(prev => prev ? { ...prev, role: 'admin' } : prev);
        }
        
        const familyMembersResponse = await api.getFamilyMembers(token, familyData.id);
        if (familyMembersResponse.data?.members) {
          const membersList = familyMembersResponse.data.members;
          setMembers(membersList);

          const today = new Date().toISOString().split('T')[0];
          let todayCount = 0;
          let totalChecks = 0;
          const allChecks: HealthCheck[] = [];

          console.log('Today date:', today);
          console.log('Members list:', membersList);
          
          for (const member of membersList) {
            const checksResponse = await api.getHealthChecks(token, member.id);
            console.log(`Checks for member ${member.id}:`, checksResponse.data?.healthChecks);
            
            if (checksResponse.data?.healthChecks) {
              const checks = checksResponse.data.healthChecks;
              totalChecks += checks.length;
              allChecks.push(...checks);
              
              // Check both timestamp and date fields
              const hasCheckToday = checks.some((check: HealthCheck) => {
                const checkDate = check?.timestamp || check?.date;
                if (!checkDate) {
                  console.log('No date found in check:', check);
                  return false;
                }
                const checkDay = checkDate.split('T')[0];
                console.log(`Comparing: ${checkDay} === ${today}`, checkDay === today);
                return checkDay === today;
              });
              if (hasCheckToday) {
                console.log(`Member ${member.id} has check today!`);
                todayCount++;
              }
            }
          }
          
          console.log('Total checked today:', todayCount);

          allChecks.sort((a, b) => {
            const timeA = a?.timestamp ? new Date(a.timestamp).getTime() : 0;
            const timeB = b?.timestamp ? new Date(b.timestamp).getTime() : 0;
            return timeB - timeA;
          });
          setRecentChecks(allChecks.slice(0, 5));

          const newStats = {
            totalMembers: membersList.length,
            checkedToday: todayCount,
            totalChecks,
            recentNotes: 0,
          };
          console.log('Setting stats:', newStats);
          setStats(newStats);
        }
      }

      const notesResponse = await api.getNotes(token);
      if (notesResponse.data?.notes) {
        const notes = notesResponse.data.notes.slice(0, 3);
        setRecentNotes(notes);
        setStats(prev => {
          const updated = {
            ...prev,
            recentNotes: notes.length,
          };
          console.log('Updated stats with notes:', updated);
          return updated;
        });
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

  const handleSelectMember = async (memberId: string) => {
    setSelectedMemberDetail(memberId);
    try {
      const response = await api.getHealthChecks(token, memberId);
      if (response.data?.healthChecks) {
        console.log('Health checks loaded:', response.data.healthChecks);
        setMemberHealthChecks(response.data.healthChecks);
      }
    } catch (error) {
      console.error('Lỗi khi tải health checks:', error);
    }
  };

  const handleDeleteHealthCheck = async (checkId: string, memberId: string) => {
    if (!window.confirm('Bạn chắc chắn muốn xóa lượt check này?')) return;
    try {
      const response = await api.deleteHealthCheck(token, checkId);
      if (response.data?.success) {
        // Reload health checks for this member
        await handleSelectMember(memberId);
        // Reload all data
        await loadUserData();
        alert('✅ Đã xóa lượt check');
      } else if (response.error) {
        alert('❌ ' + response.error);
      }
    } catch (error) {
      console.error('Lỗi khi xóa health check:', error);
      alert('❌ Không thể xóa lượt check');
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
    if (!timestamp) return 'Không rõ';
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diff = now.getTime() - date.getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      
      if (hours < 1) return 'Vừa xong';
      if (hours < 24) return `${hours} giờ trước`;
      return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
    } catch (error) {
      return 'Không rõ';
    }
  };

  const noteIcons = {
    general: MessageSquare,
    suggestion: TrendingUp,
    warning: AlertCircle,
    reminder: Calendar,
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 flex ${isDarkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-blue-50 via-indigo-50 to-green-50'}`}>
      {/* Sidebar */}
      <div 
        className={`shadow-xl flex flex-col border-r relative select-none ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}
        style={{ width: `${sidebarWidth}px`, minWidth: '80px', maxWidth: '400px', transition: isResizing ? 'none' : 'width 0.3s' }}
      >
        {/* Sidebar Header */}
        <div className={`p-4 border-b flex items-center justify-between ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          {sidebarOpen && (
            <div className="flex items-center gap-2">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-2 rounded-lg">
                <Heart className="size-5 text-white" />
              </div>
              <span className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Family</span>
            </div>
          )}
          {sidebarOpen && (
            <button
              onClick={toggleSidebar}
              className={`p-1 rounded-lg transition-colors ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}`}
            >
              <ChevronLeft className="size-4" />
            </button>
          )}
        </div>

        {/* Sidebar Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {/* Theme Toggle - Gray */}
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className={`w-full flex items-center ${sidebarOpen ? 'gap-3 px-4' : 'justify-center px-2'} py-3 rounded-lg transition-all text-white font-medium ${isDarkMode ? 'bg-gray-600 hover:bg-gray-500' : 'bg-gray-400 hover:bg-gray-500'}`}
            title={isDarkMode ? "Chế độ sáng" : "Chế độ tối"}
          >
            {isDarkMode ? <Sun className="size-6" /> : <Moon className="size-6" />}
            {sidebarOpen && <span className="text-sm">{isDarkMode ? 'Sáng' : 'Tối'}</span>}
          </button>

          {/* My Group - Blue */}
          <button
            onClick={() => setActiveTab('family')}
            className={`w-full flex items-center ${sidebarOpen ? 'gap-3 px-4' : 'justify-center px-2'} py-3 rounded-lg transition-all text-white font-medium ${activeTab === 'family' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'}`}
            title="Nhóm của tôi"
          >
            <Users className="size-6" />
            {sidebarOpen && <span className="text-sm">Nhóm của tôi</span>}
          </button>

          {/* Create Family - Purple */}
          <button
            onClick={() => setShowCreateFamily(true)}
            className={`w-full flex items-center ${sidebarOpen ? 'gap-3 px-4' : 'justify-center px-2'} py-3 rounded-lg transition-all text-white font-medium bg-purple-500 hover:bg-purple-600`}
            title="Tạo nhóm mới"
          >
            <UserPlus className="size-6" />
            {sidebarOpen && <span className="text-sm">Tạo nhóm</span>}
          </button>

          {/* Logout - Red */}
          <button
            onClick={handleLogout}
            className={`w-full flex items-center ${sidebarOpen ? 'gap-3 px-4' : 'justify-center px-2'} py-3 rounded-lg transition-all text-white font-medium bg-red-500 hover:bg-red-600`}
            title="Đăng xuất"
          >
            <LogOut className="size-6" />
            {sidebarOpen && <span className="text-sm">Đăng xuất</span>}
          </button>

          <div className={`my-4 ${sidebarOpen ? 'border-t' : ''} ${isDarkMode ? 'border-gray-700' : 'border-gray-300'}`}></div>

          {/* Health Check Tab - Green */}
          <button
            onClick={() => setActiveTab('health')}
            className={`w-full flex items-center ${sidebarOpen ? 'gap-3 px-4' : 'justify-center px-2'} py-3 rounded-lg transition-all text-white font-medium ${activeTab === 'health' ? 'bg-green-600 hover:bg-green-700' : 'bg-green-500 hover:bg-green-600'}`}
            title="Check sức khỏe"
          >
            <Activity className="size-6" />
            {sidebarOpen && <span className="text-sm">Check sức khỏe</span>}
          </button>

          {/* Notes Tab - Amber */}
          <button
            onClick={() => setActiveTab('notes')}
            className={`w-full flex items-center ${sidebarOpen ? 'gap-3 px-4' : 'justify-center px-2'} py-3 rounded-lg transition-all text-white font-medium ${activeTab === 'notes' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-amber-500 hover:bg-amber-600'}`}
            title="Ghi chú"
          >
            <MessageSquare className="size-6" />
            {sidebarOpen && <span className="text-sm">Ghi chú</span>}
          </button>
        </nav>

        {/* User Info */}
        {sidebarOpen && (
          <div className={`p-4 border-t ${isDarkMode ? 'border-gray-700 bg-gray-700' : 'border-gray-200 bg-gray-50'}`}>
            <p className={`text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Đăng nhập với</p>
            <p className={`text-sm font-semibold truncate ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{user?.name}</p>
            <p className={`text-xs truncate ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{user?.email}</p>
          </div>
        )}

        {/* Resize Handle */}
        <div
          className={`absolute top-0 right-0 w-1 h-full cursor-ew-resize hover:bg-blue-500 transition-colors ${isResizing ? 'bg-blue-500' : ''}`}
          onMouseDown={handleResizeStart}
        />

        {/* Expand Button (when collapsed) */}
        {!sidebarOpen && (
          <button
            onClick={toggleSidebar}
            className={`absolute -right-2 top-1/2 transform -translate-y-1/2 p-0.5 rounded-full shadow-md transition-all ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-white hover:bg-gray-100 text-gray-700 border border-gray-300'}`}
            title="Mở rộng sidebar"
          >
            <Menu className="size-3" />
          </button>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-4 max-w-7xl mx-auto">
          {/* Enhanced Header */}
          <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-green-600 rounded-2xl shadow-xl p-6 mb-6">
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

          {/* Main Content */}
          {activeTab === 'family' ? (
            <div className="space-y-6 mb-6">
              {/* Family Info & Recent Activity */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Family Card */}
                <div className="lg:col-span-2">
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
                              <button
                                key={member.id}
                                onClick={() => handleSelectMember(member.id)}
                                className={`w-full flex items-center justify-between p-3 rounded cursor-pointer transition-all ${selectedMemberDetail === member.id ? (isDarkMode ? 'bg-blue-600 text-white' : 'bg-blue-100 border-blue-500') : (isDarkMode ? 'bg-gray-600 hover:bg-gray-500' : 'bg-white hover:bg-gray-50')} border ${isDarkMode ? 'border-gray-500' : 'border-blue-200'}`}
                              >
                                <div className="text-left">
                                  <p className={`font-medium ${selectedMemberDetail === member.id ? 'text-white' : (isDarkMode ? 'text-white' : 'text-gray-900')}`}>{member.name}</p>
                                  <p className={`text-xs ${selectedMemberDetail === member.id ? 'text-blue-100' : (isDarkMode ? 'text-gray-400' : 'text-gray-500')}`}>{member.relationship}</p>
                                </div>
                                <Badge className={selectedMemberDetail === member.id ? 'bg-white text-blue-600' : 'bg-blue-600'}>
                                  {member.relationship}
                                </Badge>
                              </button>
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
                </div>

                {/* Member Detail */}
                {selectedMemberDetail && (
                  <Card className={`shadow-lg border-0 transition-all ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className={`flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          <Activity className="size-5 text-green-600" />
                          Chi tiết check
                        </CardTitle>
                        <button
                          onClick={() => setSelectedMemberDetail(null)}
                          className="text-gray-500 hover:text-gray-700"
                        >
                          ✕
                        </button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {memberHealthChecks.length > 0 ? (
                        memberHealthChecks.slice(0, 5).map((check) => {
                          const translateStatus = (status: string) => {
                            const statusMap: Record<string, string> = {
                              'good': 'Tốt',
                              'normal': 'Bình thường',
                              'bad': 'Không tốt',
                            };
                            return statusMap[status] || status;
                          };
                          const selectedMember = members.find(m => m.id === selectedMemberDetail);
                          const canDelete = memberHealthChecks.length > 2;
                          
                          // Format timestamp properly
                          let displayTime = 'Không rõ thời gian';
                          if (check.timestamp || check.date) {
                            const timeStr = check.timestamp || check.date;
                            displayTime = formatDate(timeStr);
                          }
                          
                          return (
                            <div key={check.id} className={`p-3 rounded-lg border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex-1">
                                  <p className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{selectedMember?.name}</p>
                                  <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                    {displayTime}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge className="bg-green-600">{translateStatus(check.status)}</Badge>
                                  {canDelete && (
                                    <button
                                      onClick={() => handleDeleteHealthCheck(check.id, selectedMemberDetail!)}
                                      className="text-red-600 hover:text-red-700 p-1 hover:bg-red-50 rounded"
                                      title="Xóa lượt check"
                                    >
                                      ✕
                                    </button>
                                  )}
                                </div>
                              </div>
                              {check.temperature && (
                                <p className={`text-xs ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>🌡️ Nhiệt độ: {check.temperature}°C</p>
                              )}
                              {check.bloodPressure && (
                                <p className={`text-xs ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>💓 Huyết áp: {check.bloodPressure}</p>
                              )}
                              {check.note && (
                                <p className={`text-xs mt-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>📝 {check.note}</p>
                              )}
                            </div>
                          );
                        })
                      ) : (
                        <p className={`text-center py-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Chưa có dữ liệu check</p>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Recent Activity - Only show if no member selected */}
                {!selectedMemberDetail && (
                  <div className="space-y-4">
                    {/* Recent Health Checks */}
                    <Card className={`shadow-lg border-0 transition-all ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                      <CardHeader>
                        <CardTitle className={`text-gray-900 flex items-center gap-2 ${isDarkMode ? 'text-white' : ''}`}>
                          <Activity className="size-5 text-indigo-600" />
                          Chi tiết check gần đây
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {recentChecks.length > 0 ? (
                          <div className="space-y-3">
                            {recentChecks.map((check) => {
                              const memberName = getMemberName(check.memberId);
                              const translateStatus = (status: string) => {
                                const statusMap: Record<string, string> = {
                                  'good': 'Tốt',
                                  'normal': 'Bình thường',
                                  'bad': 'Không tốt',
                                };
                                return statusMap[status] || status;
                              };
                              
                              return (
                                <div key={check.id} className={`p-3 rounded-lg border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                      <div className="bg-green-100 p-1.5 rounded-lg">
                                        <CheckCircle2 className="size-4 text-green-600" />
                                      </div>
                                      <div>
                                        <p className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                          {memberName}
                                        </p>
                                        <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                          {formatDate(check.timestamp)}
                                        </p>
                                      </div>
                                    </div>
                                    <Badge className="bg-green-600">
                                      {translateStatus(check.status)}
                                    </Badge>
                                  </div>
                                  {check.temperature && (
                                    <p className={`text-xs ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                      🌡️ Nhiệt độ: {check.temperature}°C
                                    </p>
                                  )}
                                  {check.bloodPressure && (
                                    <p className={`text-xs ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                      💓 Huyết áp: {check.bloodPressure}
                                    </p>
                                  )}
                                  {check.note && (
                                    <p className={`text-xs mt-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                      📝 {check.note}
                                    </p>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className={`text-center py-8 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Chưa có dữ liệu check</p>
                        )}
                      </CardContent>
                    </Card>

                    {/* Recent Notes */}
                    {recentNotes.length > 0 && (
                      <Card className={`shadow-lg border-0 transition-all ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                        <CardHeader>
                          <CardTitle className={`text-gray-900 flex items-center gap-2 ${isDarkMode ? 'text-white' : ''}`}>
                            <MessageSquare className="size-5 text-amber-600" />
                            Ghi chú
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {recentNotes.map((note) => {
                            const NoteIcon = noteIcons[note.type as keyof typeof noteIcons] || MessageSquare;
                            return (
                              <div key={note.id} className={`p-3 rounded-lg border ${isDarkMode ? 'bg-gray-700 border-amber-600' : 'bg-amber-50 border-amber-200'}`}>
                                <div className="flex items-start gap-2 mb-2">
                                  <NoteIcon className="size-4 text-amber-600 mt-0.5" />
                                  <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{formatDate(note.createdAt)}</p>
                                </div>
                                <p className={`text-sm line-clamp-2 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>{note.content}</p>
                              </div>
                            );
                          })}
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : activeTab === 'health' ? (
            <HealthCheckTab token={token} members={members} user={user} onHealthCheckSubmitted={loadUserData} />
          ) : activeTab === 'notes' ? (
            <NotesTab token={token} />
          ) : null}
        </div>
      </div>
    </div>
  );
}
