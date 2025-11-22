import { useState } from 'react';
import styled from 'styled-components';
import { Loader2 } from 'lucide-react';
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
        const { data: loginData, error: loginError } = await api.login(email, password);

        if (loginError) {
          setError(loginError);
          setLoading(false);
          return;
        }

        if (loginData?.access_token) {
          onLoginSuccess(loginData.access_token);
        }
      } else {
        // Đăng ký
        if (!name) {
          setError('Vui lòng nhập tên của bạn');
          setLoading(false);
          return;
        }

        const { data: signupData, error: signupError } = await api.signup(email, password, name);

        if (signupError) {
          setError(signupError);
          setLoading(false);
          return;
        }

        if (signupData?.access_token) {
          onLoginSuccess(signupData.access_token);
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
    <StyledWrapper>
      <div className="glitch-form-wrapper">
        <div className="form-container">
          <form className="glitch-card" onSubmit={handleSubmit}>
            <div className="card-header">
              <div className="card-title">
                <svg xmlns="http://www.w3.org/2000/svg" width={24} height={24} viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round">
                  <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                  <path d="M12 3c7.2 0 9 1.8 9 9s-1.8 9 -9 9s-9 -1.8 -9 -9s1.8 -9 9 -9" />
                  <path d="M12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0" />
                </svg>
                <span>{isLogin ? 'HỆ_THỐNG_ĐĂNG_NHẬP' : 'HỆ_THỐNG_TẠO_TÀI_KHOẢN'}</span>
              </div>
              <div className="card-dots">
                <span />
                <span />
                <span />
              </div>
            </div>

            <div className="card-body">
              {!isLogin && (
                <div className="form-group">
                  <input
                    type="text"
                    id="name"
                    name="name"
                    required
                    placeholder=" "
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                  <label htmlFor="name" className="form-label" data-text="HỌ_VÀ_TÊN">HỌ_VÀ_TÊN</label>
                </div>
              )}

              <div className="form-group">
                <input
                  type="email"
                  id="email"
                  name="email"
                  required
                  placeholder=" "
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <label htmlFor="email" className="form-label" data-text="ĐỊA_CHỈ_EMAIL">ĐỊA_CHỈ_EMAIL</label>
              </div>

              <div className="form-group">
                <input
                  type="password"
                  id="password"
                  name="password"
                  required
                  placeholder=" "
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={6}
                />
                <label htmlFor="password" className="form-label" data-text="MẬT_KHẨU">MẬT_KHẨU</label>
              </div>

              {error && (
                <div className="error-message">
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="submit-btn"
                data-text={isLogin ? 'ĐĂNG_NHẬP' : 'TẠO_TÀI_KHOẢN'}
                disabled={loading}
              >
                <span className="btn-text">
                  {loading ? (
                    <>
                      <Loader2 className="inline mr-2 size-4 animate-spin" />
                      {isLogin ? 'ĐANG XỬ LÝ...' : 'ĐANG TẠO...'}
                    </>
                  ) : (
                    isLogin ? 'ĐĂNG NHẬP' : 'TẠO TÀI KHOẢN'
                  )}
                </span>
              </button>

              <button
                type="button"
                className="toggle-btn"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError('');
                }}
              >
                {isLogin ? 'CHƯA CÓ TÀI KHOẢN? TẠO NGAY NÀO' : 'ĐÃ CÓ TÀI KHOẢN? ĐĂNG NHẬP THÔI'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </StyledWrapper>
  );
}

const StyledWrapper = styled.div`
  .glitch-form-wrapper {
    --bg-color: #0d0d0d;
    --primary-color: #00f2ea;
    --secondary-color: #a855f7;
    --text-color: #e5e5e5;
    --font-family: "Fira Code", Consolas, "Courier New", Courier, monospace;
    --glitch-anim-duration: 0.5s;

    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    font-family: var(--font-family);
    background: linear-gradient(135deg, #020205 0%, #00201c 100%);
    padding: 1rem;
  }

  .form-container {
    width: 100%;
    max-width: 600px;
  }

  .glitch-card {
    background-color: var(--bg-color);
    width: 100%;
    border: 1px solid rgba(0, 242, 234, 0.2);
    box-shadow:
      0 0 20px rgba(0, 242, 234, 0.1),
      inset 0 0 10px rgba(0, 0, 0, 0.5);
    overflow: hidden;
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background-color: rgba(0, 0, 0, 0.3);
    padding: 0.8em 1.5em;
    border-bottom: 1px solid rgba(0, 242, 234, 0.2);
  }

  .card-title {
    color: var(--primary-color);
    font-size: 0.95rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    display: flex;
    align-items: center;
    gap: 0.7em;
  }

  .card-title svg {
    width: 1.2em;
    height: 1.2em;
    stroke: var(--primary-color);
  }

  .card-dots span {
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background-color: #333;
    margin-left: 5px;
  }

  .card-body {
    padding: 2.5rem;
  }

  .form-group {
    position: relative;
    margin-bottom: 2.5rem;
  }

  .form-label {
    position: absolute;
    top: 1em;
    left: 0;
    font-size: 1.1rem;
    color: var(--primary-color);
    opacity: 0.6;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    pointer-events: none;
    transition: all 0.3s ease;
  }

  .form-group input {
    width: 100%;
    background: transparent;
    border: none;
    border-bottom: 2px solid rgba(0, 242, 234, 0.3);
    padding: 1em 0;
    font-size: 1.1rem;
    color: var(--text-color);
    font-family: inherit;
    outline: none;
    transition: border-color 0.3s ease;
  }

  .form-group input:focus {
    border-color: var(--primary-color);
  }

  .form-group input:focus + .form-label,
  .form-group input:not(:placeholder-shown) + .form-label {
    top: -1.5em;
    font-size: 0.95rem;
    opacity: 1;
  }

  .form-group input:focus + .form-label::before,
  .form-group input:focus + .form-label::after {
    content: attr(data-text);
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: var(--bg-color);
  }

  .form-group input:focus + .form-label::before {
    color: var(--secondary-color);
    animation: glitch-anim var(--glitch-anim-duration) cubic-bezier(0.25, 0.46, 0.45, 0.94) both;
  }

  .form-group input:focus + .form-label::after {
    color: var(--primary-color);
    animation: glitch-anim var(--glitch-anim-duration) cubic-bezier(0.25, 0.46, 0.45, 0.94) reverse both;
  }

  @keyframes glitch-anim {
    0% {
      transform: translate(0);
      clip-path: inset(0 0 0 0);
    }
    20% {
      transform: translate(-5px, 3px);
      clip-path: inset(50% 0 20% 0);
    }
    40% {
      transform: translate(3px, -2px);
      clip-path: inset(20% 0 60% 0);
    }
    60% {
      transform: translate(-4px, 2px);
      clip-path: inset(80% 0 5% 0);
    }
    80% {
      transform: translate(4px, -3px);
      clip-path: inset(30% 0 45% 0);
    }
    100% {
      transform: translate(0);
      clip-path: inset(0 0 0 0);
    }
  }

  .error-message {
    padding: 0.75rem;
    margin-bottom: 1rem;
    background-color: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.3);
    color: #ef4444;
    font-size: 0.9rem;
    border-radius: 4px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .submit-btn {
    width: 100%;
    padding: 1.2em;
    margin-top: 1.5rem;
    background-color: transparent;
    border: 2px solid var(--primary-color);
    color: var(--primary-color);
    font-family: inherit;
    font-size: 1.1rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.2em;
    cursor: pointer;
    position: relative;
    transition: all 0.3s;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .submit-btn:hover:not(:disabled),
  .submit-btn:focus:not(:disabled) {
    background-color: var(--primary-color);
    color: var(--bg-color);
    box-shadow: 0 0 25px var(--primary-color);
    outline: none;
  }

  .submit-btn:active:not(:disabled) {
    transform: scale(0.97);
  }

  .submit-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .submit-btn .btn-text {
    position: relative;
    z-index: 1;
    transition: opacity 0.2s ease;
  }

  .submit-btn:hover:not(:disabled) .btn-text,
  .submit-btn:focus:not(:disabled) .btn-text {
    opacity: 0;
  }

  .submit-btn::before,
  .submit-btn::after {
    content: attr(data-text);
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    background-color: var(--primary-color);
    transition: opacity 0.2s ease;
  }

  .submit-btn:hover:not(:disabled)::before,
  .submit-btn:focus:not(:disabled)::before {
    opacity: 1;
    color: var(--secondary-color);
    animation: glitch-anim var(--glitch-anim-duration) cubic-bezier(0.25, 0.46, 0.45, 0.94) both;
  }

  .submit-btn:hover:not(:disabled)::after,
  .submit-btn:focus:not(:disabled)::after {
    opacity: 1;
    color: var(--bg-color);
    animation: glitch-anim var(--glitch-anim-duration) cubic-bezier(0.25, 0.46, 0.45, 0.94) reverse both;
  }

  .toggle-btn {
    width: 100%;
    padding: 0.9em;
    margin-top: 1rem;
    background: transparent;
    border: 2px solid rgba(0, 242, 234, 0.5);
    color: var(--primary-color);
    font-family: inherit;
    font-size: 0.95rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    cursor: pointer;
    transition: all 0.3s ease;
    position: relative;
    overflow: hidden;
  }

  .toggle-btn:hover {
    border-color: var(--primary-color);
    color: var(--bg-color);
    background-color: var(--primary-color);
    box-shadow: 0 0 15px rgba(0, 242, 234, 0.4);
  }

  .toggle-btn:active {
    transform: scale(0.97);
  }

  @media (prefers-reduced-motion: reduce) {
    .form-group input:focus + .form-label::before,
    .form-group input:focus + .form-label::after,
    .submit-btn:hover::before,
    .submit-btn:focus::before,
    .submit-btn:hover::after,
    .submit-btn:focus::after {
      animation: none;
      opacity: 0;
    }

    .submit-btn:hover .btn-text {
      opacity: 1;
    }
  }
`;
