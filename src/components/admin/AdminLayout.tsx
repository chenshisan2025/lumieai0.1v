import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Anchor,
  CheckSquare,
  Megaphone,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  Shield,
  User,
  ChevronDown
} from 'lucide-react';
import { useAdmin } from '@/contexts/AdminContext';
import { toast } from 'sonner';

interface AdminLayoutProps {
  children: React.ReactNode;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { admin, logout } = useAdmin();

  const navigation = [
    {
      name: '仪表盘',
      href: '/admin/dashboard',
      icon: LayoutDashboard,
      roles: ['super_admin', 'admin', 'analyst']
    },
    {
      name: '用户管理',
      href: '/admin/users',
      icon: Users,
      roles: ['super_admin', 'admin']
    },
    {
      name: '锚定记录',
      href: '/admin/anchoring',
      icon: Anchor,
      roles: ['super_admin', 'admin', 'analyst']
    },
    {
      name: '任务与奖励',
      href: '/admin/tasks',
      icon: CheckSquare,
      roles: ['super_admin', 'admin']
    },
    {
      name: '公告管理',
      href: '/admin/announcements',
      icon: Megaphone,
      roles: ['super_admin', 'admin']
    },
    {
      name: '报告系统',
      href: '/admin/reports',
      icon: BarChart3,
      roles: ['super_admin', 'admin', 'analyst']
    },
    {
      name: '系统设置',
      href: '/admin/settings',
      icon: Settings,
      roles: ['super_admin']
    }
  ];

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  const getRoleName = (role: string) => {
    const roleNames = {
      super_admin: '超级管理员',
      admin: '管理员',
      analyst: '数据分析师'
    };
    return roleNames[role as keyof typeof roleNames] || role;
  };

  const filteredNavigation = navigation.filter(item => 
    admin && item.roles.includes(admin.role)
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 移动端侧边栏遮罩 */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* 侧边栏 */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-blue-900 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex items-center justify-between h-16 px-6 bg-blue-800">
          <div className="flex items-center">
            <div className="h-8 w-8 bg-yellow-400 rounded-full flex items-center justify-center mr-3">
              <Shield className="h-5 w-5 text-blue-900" />
            </div>
            <span className="text-white font-bold text-lg">Lumie Admin</span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-white hover:text-gray-300"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* 导航菜单 */}
        <nav className="mt-8 px-4">
          <div className="space-y-2">
            {filteredNavigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`group flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                    isActive
                      ? 'bg-blue-800 text-yellow-400'
                      : 'text-blue-100 hover:bg-blue-800 hover:text-white'
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon className={`mr-3 h-5 w-5 ${
                    isActive ? 'text-yellow-400' : 'text-blue-300 group-hover:text-white'
                  }`} />
                  {item.name}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* 用户信息 */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <div className="relative">
            <button
              onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
              className="w-full flex items-center px-4 py-3 text-sm text-blue-100 hover:bg-blue-800 rounded-lg transition-colors"
            >
              <div className="h-8 w-8 bg-blue-700 rounded-full flex items-center justify-center mr-3">
                <User className="h-4 w-4 text-blue-200" />
              </div>
              <div className="flex-1 text-left">
                <div className="font-medium">{admin?.username}</div>
                <div className="text-xs text-blue-300">{getRoleName(admin?.role || '')}</div>
              </div>
              <ChevronDown className="h-4 w-4 text-blue-300" />
            </button>

            {/* 用户下拉菜单 */}
            {profileDropdownOpen && (
              <div className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-lg shadow-lg border border-gray-200 py-2">
                <button
                  onClick={() => {
                    setProfileDropdownOpen(false);
                    navigate('/admin/profile');
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                >
                  <User className="h-4 w-4 mr-2" />
                  个人资料
                </button>
                <button
                  onClick={() => {
                    setProfileDropdownOpen(false);
                    handleLogout();
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  退出登录
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 主内容区域 */}
      <div className="lg:pl-64">
        {/* 顶部导航栏 */}
        <div className="sticky top-0 z-40 bg-white shadow-sm border-b border-gray-200">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-gray-500 hover:text-gray-700"
            >
              <Menu className="h-6 w-6" />
            </button>
            
            <div className="flex-1 lg:hidden" />
            
            {/* 右侧内容 */}
            <div className="flex items-center space-x-4">
              <div className="hidden lg:block text-sm text-gray-500">
                欢迎回来，{admin?.username}
              </div>
            </div>
          </div>
        </div>

        {/* 页面内容 */}
        <main className="flex-1">
          <div className="py-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;