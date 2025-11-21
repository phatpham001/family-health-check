import { useState, useEffect } from 'react';
import { LoginPage } from './components/LoginPage';
import { Dashboard } from './components/Dashboard';
import { supabase } from './utils/supabase-client';
import './app.css'
import './index.css'

export default function App() {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        setToken(session.access_token);
      }
    } catch (error) {
      console.error('Lỗi khi kiểm tra session:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSuccess = (accessToken: string) => {
    setToken(accessToken);
  };

  const handleLogout = () => {
    setToken(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-green-50">
        <div className="text-center">
          <div className="animate-pulse text-4xl mb-4">❤️</div>
          <p className="text-gray-600">Đang tải...</p>
        </div>
      </div>
    );
  }

  if (!token) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  return <Dashboard token={token} onLogout={handleLogout} />;
}
