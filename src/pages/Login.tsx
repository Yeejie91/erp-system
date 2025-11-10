import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const success = await login(username, password);
      
      if (success) {
        navigate('/');
      } else {
        setError('用户名或密码错误');
      }
    } catch (err) {
      setError('登录失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-8">
        {/* Logo和标题 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-full mb-4">
            <LogIn className="text-primary-600" size={32} />
          </div>
          <h1 className="text-3xl font-bold text-gray-800">半亩天光</h1>
          <p className="text-gray-600 mt-2">企业管理系统</p>
        </div>

        {/* 登录表单 */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 错误提示 */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
              <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
              <div className="flex-1">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          )}

          {/* 用户名 */}
          <div>
            <label htmlFor="username" className="label">
              用户名
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="input"
              placeholder="请输入用户名"
              required
              autoFocus
              disabled={loading}
            />
          </div>

          {/* 密码 */}
          <div>
            <label htmlFor="password" className="label">
              密码
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
              placeholder="请输入密码"
              required
              disabled={loading}
            />
          </div>

          {/* 登录按钮 */}
          <button
            type="submit"
            className="btn btn-primary w-full flex items-center justify-center space-x-2"
            disabled={loading}
          >
            <LogIn size={20} />
            <span>{loading ? '登录中...' : '登录'}</span>
          </button>
        </form>

        {/* 默认账号提示 */}
        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800 font-semibold mb-2">💡 首次使用默认账号：</p>
          <div className="text-sm text-blue-700 space-y-1">
            <p>用户名: <code className="bg-blue-100 px-2 py-0.5 rounded">admin</code></p>
            <p>密码: <code className="bg-blue-100 px-2 py-0.5 rounded">admin123</code></p>
          </div>
          <p className="text-xs text-blue-600 mt-2">⚠️ 登录后请及时修改密码</p>
        </div>

        {/* 版权信息 */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>Spark of Wisdom Centre</p>
          <p className="text-xs mt-1">© 2024 半亩天光. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}

