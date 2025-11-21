import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Plus, MessageSquare, Loader2, Lightbulb, AlertCircle, Clipboard } from 'lucide-react';
import { api } from '../utils/api';
import { Badge } from './ui/badge';
import type { Note } from '../types';

interface NotesTabProps {
  token: string;
}

const noteTypes = {
  general: { label: 'Chung', icon: MessageSquare, color: 'bg-blue-100 text-blue-700 border-blue-200' },
  suggestion: { label: 'Ý kiến', icon: Lightbulb, color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  warning: { label: 'Chú ý', icon: AlertCircle, color: 'bg-red-100 text-red-700 border-red-200' },
  reminder: { label: 'Nhắc nhở', icon: Clipboard, color: 'bg-green-100 text-green-700 border-green-200' },
};

export function NotesTab({ token }: NotesTabProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  
  // Form state
  const [content, setContent] = useState('');
  const [type, setType] = useState<string>('general');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadNotes();
  }, [token]);

  const loadNotes = async () => {
    setLoading(true);
    try {
      const response = await api.getNotes(token);
      if (response.data?.notes) {
        setNotes(response.data.notes);
      }
    } catch (error) {
      console.error('Lỗi khi tải ghi chú:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setSubmitting(true);
    try {
      const response = await api.createNote(token, content, type);

      if (response.data?.note) {
        setNotes([response.data.note, ...notes]);
        setContent('');
        setType('general');
        setDialogOpen(false);
      } else if (response.error) {
        alert(response.error);
      }
    } catch (error) {
      console.error('Lỗi khi tạo ghi chú:', error);
      alert('Không thể lưu ghi chú');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="size-8 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-gray-900">Ghi chú & Ý kiến</CardTitle>
              <CardDescription className="text-gray-600">
                Ghi lại các ý kiến, chú ý, nhắc nhở cho cả gia đình
              </CardDescription>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="size-4 mr-2" />
                  Thêm ghi chú
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-gray-900">Tạo ghi chú mới</DialogTitle>
                  <DialogDescription className="text-gray-600">
                    Thêm ý kiến, chú ý hoặc nhắc nhở cho gia đình
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-gray-700">Loại ghi chú</Label>
                    <Select value={type} onValueChange={setType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general">💬 Chung</SelectItem>
                        <SelectItem value="suggestion">💡 Ý kiến</SelectItem>
                        <SelectItem value="warning">⚠️ Chú ý</SelectItem>
                        <SelectItem value="reminder">📋 Nhắc nhở</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="content" className="text-gray-700">Nội dung *</Label>
                    <Textarea
                      id="content"
                      placeholder="Viết ghi chú của bạn..."
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      rows={5}
                      required
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
                      Lưu
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
      </Card>

      {notes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <MessageSquare className="size-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">Chưa có ghi chú nào</p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="size-4 mr-2" />
              Tạo ghi chú đầu tiên
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => {
            const noteConfig = noteTypes[note.type as keyof typeof noteTypes] || noteTypes.general;
            const NoteIcon = noteConfig.icon;

            return (
              <Card key={note.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-full ${noteConfig.color} flex-shrink-0`}>
                      <NoteIcon className="size-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className={noteConfig.color}>
                          {noteConfig.label}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {note.createdBy} • {formatDate(note.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-800 whitespace-pre-wrap">{note.content}</p>
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
