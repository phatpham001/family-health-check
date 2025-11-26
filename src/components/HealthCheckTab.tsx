import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { CheckCircle2, Circle, Loader2, Activity, TrendingUp } from 'lucide-react';
import { api } from '../utils/api';
import { Checkbox } from './ui/checkbox';
import { Badge } from './ui/badge';
import type { Member, HealthCheck, User } from '../types';

interface HealthCheckTabProps {
  token: string;
  members?: Member[];
  user?: User | null;
  onHealthCheckSubmitted?: () => void;
}

const healthCheckItems = [
  { id: 'temperature', label: 'Đo nhiệt độ', hasInput: true, inputType: 'number', placeholder: '36.5°C' },
  { id: 'bloodPressure', label: 'Đo huyết áp', hasInput: true, inputType: 'text', placeholder: '120/80' },
  { id: 'breakfast', label: 'Đã ăn sáng', hasInput: false },
  { id: 'lunch', label: 'Đã ăn trưa', hasInput: false },
  { id: 'dinner', label: 'Đã ăn tối', hasInput: false },
  { id: 'exercise', label: 'Vận động/thể dục', hasInput: false },
  { id: 'medicine', label: 'Uống thuốc đầy đủ', hasInput: false },
  { id: 'sleep', label: 'Ngủ đủ giấc', hasInput: false },
];

const feelingOptions = [
  { value: 'good', label: '😊 Tốt', color: 'text-green-600' },
  { value: 'normal', label: '😐 Bình thường', color: 'text-yellow-600' },
  { value: 'bad', label: '😟 Không tốt', color: 'text-red-600' },
];

export function HealthCheckTab({ token, members: propMembers = [], user: propUser = null, onHealthCheckSubmitted }: HealthCheckTabProps) {
  const [selectedMember, setSelectedMember] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [healthChecks, setHealthChecks] = useState<Record<string, HealthCheck[]>>({});
  const [activeTab, setActiveTab] = useState<'check' | 'results'>('check');

  // Form state
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  const [feeling, setFeeling] = useState<string>('good');
  const [note, setNote] = useState('');

  useEffect(() => {
    // Load health checks khi component mount hoặc khi members thay đổi
    if (propMembers.length > 0 && token) {
      loadHealthChecks();
    } else {
      setLoading(false);
    }
  }, [token, propMembers]);

  useEffect(() => {
    // Set default selected member
    if (propUser?.id) {
      setSelectedMember(propUser.id);
    } else if (propMembers.length > 0) {
      setSelectedMember(propMembers[0].id);
    }
  }, [propMembers, propUser]);

  useEffect(() => {
    // Reset form khi chọn member mới
    resetForm();
  }, [selectedMember]);

  const loadHealthChecks = async () : Promise<void>=> {
    try {
      if (propMembers.length === 0 || !token) {
        setLoading(false);
        return;
      }

      setLoading(true);
      // Load health checks for all members
      const checksData: Record<string, HealthCheck[]> = {};
      for (const member of propMembers) {
        try {
          const checksResponse = await api.getHealthChecks(token, member.id);
          if (checksResponse.data?.healthChecks) {
            checksData[member.id] = checksResponse.data.healthChecks;
          }
        } catch (err) {
          console.error(`Lỗi khi tải health checks cho ${member.name}:`, err);
        }
      }
      setHealthChecks(checksData);
      setLoading(false);
    } catch (error) {
      console.error('Lỗi khi tải dữ liệu:', error);
      setLoading(false);
    }
  };

  const resetForm = () => {
    setCheckedItems({});
    setInputValues({});
    setFeeling('good');
    setNote('');
  };

  const handleCheckItem = (itemId: string, checked: boolean) => {
    setCheckedItems(prev => ({ ...prev, [itemId]: checked }));
  };

  const handleInputChange = (itemId: string, value: string) => {
    setInputValues(prev => ({ ...prev, [itemId]: value }));
  };

  const handleSubmit = async () => {
    if (!selectedMember) return;

    setSubmitting(true);
    try {
      const response = await api.createHealthCheck(
        token,
        selectedMember,
        feeling,
        note,
        inputValues.temperature || '',
        inputValues.bloodPressure || ''
      );

      if (response.data?.healthCheck) {
        // Thành công - reset form và thông báo
        alert('✅ Đã lưu thông tin sức khỏe!');
        resetForm();
        
        // Reload health checks
        await loadHealthChecks();
        
        // Notify parent component to refresh
        if (onHealthCheckSubmitted) {
          onHealthCheckSubmitted();
        }
      } else if (response.error) {
        alert('❌ ' + response.error);
      }
    } catch (error) {
      console.error('Lỗi khi lưu health check:', error);
      alert('❌ Không thể lưu thông tin');
    } finally {
      setSubmitting(false);
    }
  };

  const checkedCount = Object.values(checkedItems).filter(Boolean).length;
  const totalItems = healthCheckItems.length;

  if (propMembers.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Activity className="size-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600 mb-2">Chưa có thành viên nào</p>
          <p className="text-sm text-gray-500">
            Hãy tạo nhóm và thêm thành viên trước
          </p>
        </CardContent>
      </Card>
    );
  }

  const currentMember = propMembers.find(m => m.id === selectedMember);
  const isCurrentUser = propUser?.id === selectedMember;
  const memberChecks = healthChecks[selectedMember] || [];
  const todayCheck = memberChecks.find(c => c?.timestamp && c.timestamp.split('T')[0] === new Date().toISOString().split('T')[0]);

  const formatDate = (timestamp: string) => {
    if (!timestamp) return 'Không rõ';
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diff = now.getTime() - date.getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      
      if (hours < 1) return 'Vừa xong';
      if (hours < 24) return `${hours} giờ trước`;
      return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: '2-digit' });
    } catch (error) {
      return 'Không rõ';
    }
  };

  const translateStatus = (status: string) => {
    const statusMap: Record<string, string> = {
      'good': 'Tốt',
      'normal': 'Bình thường',
      'bad': 'Không tốt',
    };
    return statusMap[status] || status;
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-gray-900">Check sức khỏe hàng ngày</CardTitle>
          <CardDescription className="text-gray-600">
            Tự check cho bản thân hoặc xem kết quả của người thân
          </CardDescription>
        </CardHeader>
      </Card>

      {loading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="size-8 animate-spin text-gray-400" />
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Tab selector */}
          <div className="flex gap-2">
            <Button
              variant={activeTab === 'check' ? 'default' : 'outline'}
              onClick={() => setActiveTab('check')}
              className="flex-1"
            >
              <CheckCircle2 className="size-4 mr-2" />
              Check sức khỏe
            </Button>
            <Button
              variant={activeTab === 'results' ? 'default' : 'outline'}
              onClick={() => setActiveTab('results')}
              className="flex-1"
            >
              <TrendingUp className="size-4 mr-2" />
              Xem kết quả
            </Button>
          </div>

      {activeTab === 'check' && (
        <>
          {/* Member selector - chỉ hiển thị khi check */}
          {propUser?.role === 'admin' ? (
            <div className="flex gap-2 overflow-x-auto pb-2">
              {propMembers.map((member) => (
                <Button
                  key={member.id}
                  variant={selectedMember === member.id ? 'default' : 'outline'}
                  onClick={() => setSelectedMember(member.id)}
                  className="whitespace-nowrap"
                >
                  {member.name}
                  {propUser?.id === member.id && <Badge className="ml-2 bg-blue-600">Bạn</Badge>}
                </Button>
              ))}
            </div>
          ) : (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Check cho:</strong> {propUser?.name} (Bạn chỉ có thể check cho chính mình)
              </p>
            </div>
          )}
        </>
      )}

      {activeTab === 'check' && (
        <>
          {/* Check form */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg text-gray-900">
                    Check cho: {currentMember?.name}
                    {isCurrentUser && <Badge className="ml-2 bg-green-600">Chính bạn</Badge>}
                  </CardTitle>
                  <CardDescription className="text-gray-600">
                    Đã hoàn thành {checkedCount}/{totalItems} mục
                  </CardDescription>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-semibold text-gray-900">
                    {Math.round((checkedCount / totalItems) * 100)}%
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
          {/* Cảm giác chung */}
          <div className="space-y-2">
            <Label className="text-gray-700">Cảm giác hôm nay *</Label>
            <Select value={feeling} onValueChange={setFeeling}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {feelingOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    <span className={option.color}>{option.label}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Danh sách check items */}
          <div className="space-y-3">
            <Label className="text-gray-700">Các mục cần check</Label>
            <div className="space-y-3">
              {healthCheckItems.map((item) => (
                <div key={item.id} className="space-y-2">
                  <div className="flex items-center gap-3 p-3 rounded-lg border hover:bg-gray-50 transition-colors">
                    <Checkbox
                      id={item.id}
                      checked={checkedItems[item.id] || false}
                      onCheckedChange={(checked) => handleCheckItem(item.id, checked as boolean)}
                    />
                    <Label
                      htmlFor={item.id}
                      className="flex-1 cursor-pointer text-gray-700"
                    >
                      {item.label}
                    </Label>
                    {checkedItems[item.id] && (
                      <CheckCircle2 className="size-5 text-green-500" />
                    )}
                  </div>
                  
                  {item.hasInput && checkedItems[item.id] && (
                    <div className="ml-9">
                      <Input
                        type={item.inputType}
                        placeholder={item.placeholder}
                        value={inputValues[item.id] || ''}
                        onChange={(e) => handleInputChange(item.id, e.target.value)}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Ghi chú */}
          <div className="space-y-2">
            <Label htmlFor="note" className="text-gray-700">Ghi chú thêm</Label>
            <Textarea
              id="note"
              placeholder="Triệu chứng, cảm giác bất thường, hoặc ghi chú khác..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
            />
          </div>

            {/* Submit button */}
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              size="lg"
              className="w-full"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Đang lưu...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 size-5" />
                  Hoàn thành
                </>
              )}
            </Button>
          </CardContent>
        </Card>
        </>
      )}

          {activeTab === 'results' && (
            <>
              {/* Results view */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {propMembers.map((member) => {
                  const memberChecks = healthChecks[member.id] || [];
                  const todayCheck = memberChecks.find(c => c?.timestamp && c.timestamp.split('T')[0] === new Date().toISOString().split('T')[0]);
                  const lastCheck = memberChecks[0];

                  return (
                    <Card key={member.id} className="border-2">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-lg text-gray-900">{member.name}</CardTitle>
                            <CardDescription className="text-gray-600">{member.relationship}</CardDescription>
                          </div>
                          {todayCheck && (
                            <Badge className="bg-green-600">Đã check hôm nay</Badge>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {todayCheck ? (
                          <>
                            <div className="space-y-2">
                              <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                <span className="text-sm font-medium text-gray-700">Cảm giác:</span>
                                <span className="text-sm font-semibold text-gray-900">{translateStatus(todayCheck.status)}</span>
                              </div>
                              {todayCheck.temperature && (
                                <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                  <span className="text-sm font-medium text-gray-700">Nhiệt độ:</span>
                                  <span className="text-sm font-semibold text-gray-900">{todayCheck.temperature}°C</span>
                                </div>
                              )}
                              {todayCheck.bloodPressure && (
                                <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                  <span className="text-sm font-medium text-gray-700">Huyết áp:</span>
                                  <span className="text-sm font-semibold text-gray-900">{todayCheck.bloodPressure}</span>
                                </div>
                              )}
                              {todayCheck.note && (
                                <div className="p-2 bg-blue-50 rounded border border-blue-200">
                                  <p className="text-xs font-medium text-gray-700 mb-1">Ghi chú:</p>
                                  <p className="text-sm text-gray-700">{todayCheck.note}</p>
                                </div>
                              )}
                            </div>
                            <div className="text-xs text-gray-500 pt-2 border-t">
                              Cập nhật: {todayCheck?.timestamp ? formatDate(todayCheck.timestamp) : 'Không rõ'}
                            </div>
                          </>
                        ) : (
                          <div className="text-center py-6">
                            <Circle className="size-8 text-gray-300 mx-auto mb-2" />
                            <p className="text-sm text-gray-500">Chưa check hôm nay</p>
                            {lastCheck?.timestamp && (
                              <p className="text-xs text-gray-400 mt-2">
                                Lần cuối: {formatDate(lastCheck.timestamp)}
                              </p>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
