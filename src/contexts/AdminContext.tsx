import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { toast } from 'sonner';

interface Admin {
  id: string;
  username: string;
  email: string;
  role: 'super_admin' | 'admin' | 'analyst';
  avatar?: string;
  lastLoginAt?: string;
}

interface AdminContextType {
  admin: Admin | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  updateProfile: (data: Partial<Admin>) => Promise<boolean>;
  changePassword: (oldPassword: string, newPassword: string) => Promise<boolean>;
  hasPermission: (requiredRoles: string[]) => boolean;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (context === undefined) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
};

interface AdminProviderProps {
  children: ReactNode;
}

export const AdminProvider: React.FC<AdminProviderProps> = ({ children }) => {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 检查本地存储的token
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('admin_token');
      if (token) {
        try {
          const response = await fetch('/api/admin/auth/verify', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            setAdmin(data.data.admin);
          } else {
            localStorage.removeItem('admin_token');
          }
        } catch (error) {
          console.error('Auth check failed:', error);
          localStorage.removeItem('admin_token');
        }
      }
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        localStorage.setItem('admin_token', data.data.token);
        setAdmin(data.data.admin);
        toast.success('登录成功');
        return true;
      } else {
        toast.error(data.error || '登录失败');
        return false;
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error('登录失败，请检查网络连接');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('admin_token');
    setAdmin(null);
    toast.success('已退出登录');
  };

  const updateProfile = async (data: Partial<Admin>): Promise<boolean> => {
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch('/api/admin/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setAdmin(prev => prev ? { ...prev, ...data } : null);
        toast.success('个人信息更新成功');
        return true;
      } else {
        toast.error(result.error || '更新失败');
        return false;
      }
    } catch (error) {
      console.error('Update profile error:', error);
      toast.error('更新失败，请检查网络连接');
      return false;
    }
  };

  const changePassword = async (oldPassword: string, newPassword: string): Promise<boolean> => {
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch('/api/admin/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ oldPassword, newPassword })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast.success('密码修改成功');
        return true;
      } else {
        toast.error(result.error || '密码修改失败');
        return false;
      }
    } catch (error) {
      console.error('Change password error:', error);
      toast.error('密码修改失败，请检查网络连接');
      return false;
    }
  };

  const hasPermission = (requiredRoles: string[]): boolean => {
    if (!admin) return false;
    return requiredRoles.includes(admin.role);
  };

  const value: AdminContextType = {
    admin,
    isLoading,
    login,
    logout,
    updateProfile,
    changePassword,
    hasPermission
  };

  return (
    <AdminContext.Provider value={value}>
      {children}
    </AdminContext.Provider>
  );
};

export default AdminProvider;