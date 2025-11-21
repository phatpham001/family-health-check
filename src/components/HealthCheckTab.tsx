import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { CheckCircle2, Circle, Loader2, Activity } from 'lucide-react';
import { api } from '../utils/api';
import { Checkbox } from './ui/checkbox';
import type { Member } from '../types';

interface HealthCheckTabProps {
  token: string;
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

export function HealthCheckTab({ token }: HealthCheckTabProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMember, setSelectedMember] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  const [feeling, setFeeling] = useState<string>('good');
  const [note, setNote] = useState('');

  useEffect(() => {
    loadMembers();
  }, [token]);

  useEffect(() => {
    // Reset form khi chọn member mới
    resetForm();
  }, [selectedMember]);

  const loadMembers = async () : Promise<void>=> {
    setLoading(true);
    try {
      const response = await api.getMembers(token);
      if (response.data?.members) {
        setMembers(response.data.members);
        if (response.data.members.length > 0) {
          setSelectedMember(response.data.members[0].id);
        }
      }
    } catch (error) {
      console.error('Lỗi khi tải danh sách thành viên:', error);
    } finally {
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
      // Chuẩn bị dữ liệu để gửi
      const healthData: Record<string, any> = {
        feeling,
        checkedItems,
        inputValues,
        note,
      };

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

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="size-8 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    );
  }

  if (members.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Activity className="size-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600 mb-2">Chưa có thành viên nào</p>
          <p className="text-sm text-gray-500">
            Hãy thêm thành viên ở tab "Thành viên" trước
          </p>
        </CardContent>
      </Card>
    );
  }

  const currentMember = members.find(m => m.id === selectedMember);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-gray-900">Check sức khỏe hàng ngày</CardTitle>
          <CardDescription className="text-gray-600">
            Đánh dấu các mục đã hoàn thành trong ngày
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Member selector */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {members.map((member) => (
          <Button
            key={member.id}
            variant={selectedMember === member.id ? 'default' : 'outline'}
            onClick={() => setSelectedMember(member.id)}
            className="whitespace-nowrap"
          >
            {member.name}
          </Button>
        ))}
      </div>

      {/* Check form */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg text-gray-900">Check cho: {currentMember?.name}</CardTitle>
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
    </div>
  );
}
