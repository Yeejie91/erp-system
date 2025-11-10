import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { login as authLogin, initDefaultAdmin } from '../services/auth';
import { logOperation } from '../services/logger';
import { LogAction } from '../types';
import { usePermissions } from '../utils/permissions';

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
  loading: boolean;
  hasPermission: (permission: string) => boolean;
  canView: (module: string) => boolean;
  canCreate: (module: string) => boolean;
  canUpdate: (module: string) => boolean;
  canDelete: (module: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 检查本地存储的会话
    const initAuth = async () => {
      try {
        // 初始化默认管理员账户
        await initDefaultAdmin();
        
        const savedUser = localStorage.getItem('currentUser');
        if (savedUser) {
          setUser(JSON.parse(savedUser));
        }
      } catch (error) {
        console.error('初始化认证失败:', error);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const loggedInUser = await authLogin(username, password);
      
      if (loggedInUser) {
        setUser(loggedInUser);
        localStorage.setItem('currentUser', JSON.stringify(loggedInUser));
        
        // 记录登录日志
        await logOperation({
          userId: loggedInUser.id,
          userName: loggedInUser.username,
          action: LogAction.LOGIN,
          module: '系统',
          description: `${loggedInUser.username} 登录系统`,
        });
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('登录失败:', error);
      return false;
    }
  };

  const logout = async () => {
    if (user) {
      // 记录登出日志
      await logOperation({
        userId: user.id,
        userName: user.username,
        action: LogAction.LOGOUT,
        module: '系统',
        description: `${user.username} 退出系统`,
      });
    }
    
    setUser(null);
    localStorage.removeItem('currentUser');
  };

  // 获取权限检查函数
  const permissions = usePermissions(user?.role || 'staff' as any);

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        isAuthenticated: !!user,
        loading,
        hasPermission: permissions.hasPermission,
        canView: permissions.canView,
        canCreate: permissions.canCreate,
        canUpdate: permissions.canUpdate,
        canDelete: permissions.canDelete,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// 权限检查Hook
export function usePermission(permission: string): boolean {
  const { user } = useAuth();
  if (!user) return false;
  
  // 简化的权限检查，基于用户角色
  const rolePermissions = {
    'owner': true,
    'manager': true,
    'cashier': true,
    'warehouse': true,
    'staff': false
  };
  
  return rolePermissions[user.role] ?? false;
}

