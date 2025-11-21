import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Heart, Loader2 } from 'lucide-react';
import { supabase } from '../utils/supabase-client';
import { api } from '../utils/api';

interface LoginPageProps {
  onLoginSuccess: (token: string) => void;
}

export function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        // Đăng nhập
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) {
          setError('Email hoặc mật khẩu không đúng');
          setLoading(false);
          return;
        }

        if (data.session?.access_token) {
          onLoginSuccess(data.session.access_token);
        }
      } else {
        // Đăng ký
        if (!name) {
          setError('Vui lòng nhập tên của bạn');
          setLoading(false);
          return;
        }

        const { error: signupError } = await api.signup(email, password, name);

        if (signupError) {
          setError(signupError);
          setLoading(false);
          return;
        }

        // Tự động đăng nhập sau khi đăng ký
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) {
          setError('Đăng ký thành công! Vui lòng đăng nhập');
          setIsLogin(true);
          setLoading(false);
          return;
        }

        if (data.session?.access_token) {
          onLoginSuccess(data.session.access_token);
        }
      }
    } catch (err) {
      setError('Đã xảy ra lỗi, vui lòng thử lại');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-green-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-gradient-to-r from-blue-500 to-green-500 p-3 rounded-full">
              <Heart className="size-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl text-gray-900">
            {isLogin ? 'Đăng nhập' : 'Tạo tài khoản'}
          </CardTitle>
          <CardDescription className="text-gray-600">
            {isLogin
              ? 'Theo dõi sức khỏe gia đình mỗi ngày'
              : 'Bắt đầu quản lý sức khỏe gia đình'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="name" className="text-gray-700">Tên của bạn</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Nguyễn Văn A"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required={!isLogin}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-700">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="example@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-700">Mật khẩu</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
              {isLogin ? 'Đăng nhập' : 'Tạo tài khoản'}
            </Button>

            <div className="text-center text-sm text-gray-700">
              {isLogin ? (
                <p>
                  Chưa có tài khoản?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setIsLogin(false);
                      setError('');
                    }}
                    className="text-blue-600 hover:underline font-medium"
                  >
                    Đăng ký ngay
                  </button>
                </p>
              ) : (
                <p>
                  Đã có tài khoản?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setIsLogin(true);
                      setError('');
                    }}
                    className="text-blue-600 hover:underline font-medium"
                  >
                    Đăng nhập
                  </button>
                </p>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
