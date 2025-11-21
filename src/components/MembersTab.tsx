import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Plus, Trash2, User, Loader2, ChevronLeft, ChevronRight, CheckCircle2, Circle, AlertCircle, Lightbulb, MessageSquare, Clipboard } from 'lucide-react';
import { api } from '../utils/api';
import { Badge } from './ui/badge';

interface Member {
  id: string;
  name: string;
  relationship: string;
  createdAt: string;
}

interface HealthCheck {
  id: string;
  memberId: string;
  status: string;
  note: string;
  date: string;
  timestamp: string;
}

interface Note {
  id: string;
  content: string;
  type: string;
  createdBy: string;
  createdAt: string;
}

interface MembersTabProps {
  token: string;
}

const noteIcons = {
  general: { icon: MessageSquare, color: 'bg-blue-100 text-blue-700' },
  suggestion: { icon: Lightbulb, color: 'bg-yellow-100 text-yellow-700' },
  warning: { icon: AlertCircle, color: 'bg-red-100 text-red-700' },
  reminder: { icon: Clipboard, color: 'bg-green-100 text-green-700' },
};

export function MembersTab({ token }: MembersTabProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [healthChecks, setHealthChecks] = useState<Record<string, HealthCheck[]>>({});
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberRelationship, setNewMemberRelationship] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Calendar state
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedMember, setSelectedMember] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [token]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load members
      const membersResponse = await api.getMembers(token);
      if (membersResponse.data?.members) {
        setMembers(membersResponse.data.members);

        // Load health checks cho từng member
        const checksPromises = membersResponse.data.members.map(async (member: Member) => {
          const checksResponse = await api.getHealthChecks(token, member.id);
          return { memberId: member.id, checks: checksResponse.data?.healthChecks || [] };
        });
        
        const checksResults = await Promise.all(checksPromises);
        const checksMap: Record<string, HealthCheck[]> = {};
        checksResults.forEach(({ memberId, checks }) => {
          checksMap[memberId] = checks;
        });
        setHealthChecks(checksMap);
      }

      // Load notes
      const notesResponse = await api.getNotes(token);
      if (notesResponse.data?.notes) {
        setNotes(notesResponse.data.notes.slice(0, 3)); // Chỉ lấy 3 notes mới nhất
      }
    } catch (error) {
      console.error('Lỗi khi tải dữ liệu:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim()) return;

    setSubmitting(true);
    try {
      const response = await api.addMember(token, newMemberName, newMemberRelationship);
      
      if (response.data?.member) {
        setMembers([...members, response.data.member]);
        setNewMemberName('');
        setNewMemberRelationship('');
        setDialogOpen(false);
      } else if (response.error) {
        alert(response.error);
      }
    } catch (error) {
      console.error('Lỗi khi thêm thành viên:', error);
      alert('Không thể thêm thành viên');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteMember = async (memberId: string) => {
    if (!confirm('Bạn có chắc muốn xóa thành viên này?')) return;

    try {
      await api.deleteMember(token, memberId);
      setMembers(members.filter(m => m.id !== memberId));
    } catch (error) {
      console.error('Lỗi khi xóa thành viên:', error);
      alert('Không thể xóa thành viên');
    }
  };

  // Calendar functions
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    return { daysInMonth, startingDayOfWeek };
  };

  const getHealthCheckForDate = (memberId: string, date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    const checks = healthChecks[memberId] || [];
    return checks.find(check => check.date === dateStr);
  };

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const monthNames = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
                      'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];
  const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="size-8 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    );
  }

  // Calendar view for selected member
  if (selectedMember) {
    const member = members.find(m => m.id === selectedMember);
    const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentDate);
    const today = new Date();
    const isCurrentMonth = currentDate.getMonth() === today.getMonth() && 
                          currentDate.getFullYear() === today.getFullYear();

    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{member?.name}</CardTitle>
                <CardDescription>{member?.relationship}</CardDescription>
              </div>
              <Button variant="outline" onClick={() => setSelectedMember(null)}>
                Quay lại
              </Button>
            </div>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <Button variant="outline" size="sm" onClick={previousMonth}>
                <ChevronLeft className="size-4" />
              </Button>
              <CardTitle>
                {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
              </CardTitle>
              <Button variant="outline" size="sm" onClick={nextMonth}>
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-2">
              {/* Day headers */}
              {dayNames.map(day => (
                <div key={day} className="text-center text-sm text-gray-500 p-2">
                  {day}
                </div>
              ))}
              
              {/* Empty cells for days before month starts */}
              {Array.from({ length: startingDayOfWeek }).map((_, i) => (
                <div key={`empty-${i}`} className="p-2" />
              ))}
              
              {/* Days of month */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                const isToday = isCurrentMonth && day === today.getDate();
                const healthCheck = getHealthCheckForDate(selectedMember, date);
                const isFuture = date > today;

                return (
                  <div
                    key={day}
                    className={`
                      p-2 border rounded-lg text-center min-h-16 flex flex-col items-center justify-center
                      ${isToday ? 'border-blue-500 bg-blue-50' : ''}
                      ${isFuture ? 'bg-gray-50 text-gray-400' : ''}
                      ${healthCheck ? 'bg-green-50 border-green-200' : ''}
                    `}
                  >
                    <div className="text-sm">{day}</div>
                    {healthCheck && (
                      <CheckCircle2 className="size-5 text-green-500 mt-1" />
                    )}
                    {!healthCheck && !isFuture && (
                      <Circle className="size-5 text-gray-300 mt-1" />
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Recent health checks */}
        <Card>
          <CardHeader>
            <CardTitle>Lịch sử check gần đây</CardTitle>
          </CardHeader>
          <CardContent>
            {healthChecks[selectedMember]?.length > 0 ? (
              <div className="space-y-2">
                {healthChecks[selectedMember].slice(0, 5).map(check => (
                  <div key={check.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="size-5 text-green-500" />
                      <div>
                        <div className="text-sm">{new Date(check.timestamp).toLocaleDateString('vi-VN')}</div>
                        {check.note && <div className="text-xs text-gray-500">{check.note}</div>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 py-4">Chưa có lịch sử check</p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main view - member list with notes
  return (
    <div className="space-y-4">
      {/* Notes section */}
      {notes.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="text-lg">📌 Ghi chú & Chú ý mới nhất</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {notes.map((note) => {
              const noteConfig = noteIcons[note.type as keyof typeof noteIcons] || noteIcons.general;
              const NoteIcon = noteConfig.icon;
              
              return (
                <div key={note.id} className="flex items-start gap-3 p-3 bg-white rounded-lg">
                  <div className={`p-2 rounded-full ${noteConfig.color} flex-shrink-0`}>
                    <NoteIcon className="size-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-gray-500 mb-1">
                      {note.createdBy} • {formatDate(note.createdAt)}
                    </div>
                    <p className="text-sm">{note.content}</p>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Thành viên gia đình</CardTitle>
              <CardDescription>
                Click vào thành viên để xem lịch check sức khỏe
              </CardDescription>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="size-4 mr-2" />
                  Thêm thành viên
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Thêm thành viên mới</DialogTitle>
                  <DialogDescription>
                    Nhập thông tin thành viên trong gia đình
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleAddMember} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="member-name">Tên thành viên *</Label>
                    <Input
                      id="member-name"
                      placeholder="Nguyễn Văn B"
                      value={newMemberName}
                      onChange={(e) => setNewMemberName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="relationship">Mối quan hệ</Label>
                    <Input
                      id="relationship"
                      placeholder="Ví dụ: Con, Bố, Mẹ, Vợ, Chồng..."
                      value={newMemberRelationship}
                      onChange={(e) => setNewMemberRelationship(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setDialogOpen(false)}
                      className="flex-1"
                    >
                      Hủy
                    </Button>
                    <Button type="submit" className="flex-1" disabled={submitting}>
                      {submitting && <Loader2 className="mr-2 size-4 animate-spin" />}
                      Thêm
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
      </Card>

      {members.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <User className="size-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">Chưa có thành viên nào</p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="size-4 mr-2" />
              Thêm thành viên đầu tiên
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {members.map((member) => {
            const memberChecks = healthChecks[member.id] || [];
            const todayCheck = getHealthCheckForDate(member.id, new Date());
            const checkCount = memberChecks.length;

            return (
              <Card
                key={member.id}
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => setSelectedMember(member.id)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="bg-blue-100 p-3 rounded-full">
                        <User className="size-6 text-blue-600" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{member.name}</CardTitle>
                        {member.relationship && (
                          <CardDescription>{member.relationship}</CardDescription>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteMember(member.id);
                      }}
                    >
                      <Trash2 className="size-4 text-red-500" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Hôm nay:</span>
                      {todayCheck ? (
                        <Badge className="bg-green-100 text-green-700">
                          <CheckCircle2 className="size-3 mr-1" />
                          Đã check
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-gray-500">
                          <Circle className="size-3 mr-1" />
                          Chưa check
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-gray-500">
                      Tổng số lần check: {checkCount}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
