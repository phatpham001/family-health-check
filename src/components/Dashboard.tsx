import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Heart, LogOut, Users, Activity, MessageSquare } from 'lucide-react';
import { MembersTab } from './MembersTab';
import { HealthCheckTab } from './HealthCheckTab';
import { NotesTab } from './NotesTab';
import { api } from '../utils/api';
import { supabase } from '../utils/supabase-client';

interface DashboardProps {
  token: string;
  onLogout: () => void;
}

export function Dashboard({ token, onLogout }: DashboardProps) {
  const [user, setUser] = useState<any>(null);
  const [family, setFamily] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      <div className="container mx-auto p-4 max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-r from-blue-500 to-green-500 p-2 rounded-lg">
              <Heart className="size-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl">Sức khỏe gia đình</h1>
              <p className="text-sm text-gray-600">Xin chào, {user?.name}</p>
            </div>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="size-4 mr-2" />
            Đăng xuất
          </Button>
        </div>

        {/* Family Info Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{family?.name || 'Gia đình của bạn'}</CardTitle>
            <CardDescription>
              Theo dõi sức khỏe của các thành viên trong gia đình
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Main Tabs */}
        <Tabs defaultValue="members" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="members">
              <Users className="size-4 mr-2" />
              Thành viên
            </TabsTrigger>
            <TabsTrigger value="health">
              <Activity className="size-4 mr-2" />
              Check sức khỏe
            </TabsTrigger>
            <TabsTrigger value="notes">
              <MessageSquare className="size-4 mr-2" />
              Ghi chú
            </TabsTrigger>
          </TabsList>

          <TabsContent value="members">
            <MembersTab token={token} />
          </TabsContent>

          <TabsContent value="health">
            <HealthCheckTab token={token} />
          </TabsContent>

          <TabsContent value="notes">
            <NotesTab token={token} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
