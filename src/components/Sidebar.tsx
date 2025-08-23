import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { 
  Home, 
  Shield, 
  Database, 
  FileText, 
  Settings, 
  Users,
  BarChart3,
  Lock
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface SidebarItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  badge?: string
}

const sidebarItems: SidebarItem[] = [
  {
    name: '首页',
    href: '/',
    icon: Home,
  },
  {
    name: '数据证明',
    href: '/data-proof',
    icon: Shield,
  },
  {
    name: '上链确权',
    href: '/blockchain-proof',
    icon: Lock,
  },
  {
    name: '数据管理',
    href: '/data-management',
    icon: Database,
  },
  {
    name: '报告中心',
    href: '/reports',
    icon: FileText,
  },
  {
    name: '统计分析',
    href: '/analytics',
    icon: BarChart3,
  },
  {
    name: '用户管理',
    href: '/users',
    icon: Users,
  },
  {
    name: '系统设置',
    href: '/settings',
    icon: Settings,
  },
]

interface SidebarProps {
  className?: string
}

const Sidebar: React.FC<SidebarProps> = ({ className }) => {
  const location = useLocation()
  const pathname = location.pathname

  return (
    <div className={cn('flex flex-col w-64 bg-gray-900 text-white', className)}>
      {/* Logo区域 */}
      <div className="flex items-center justify-center h-16 bg-gray-800">
        <div className="flex items-center space-x-2">
          <Shield className="h-8 w-8 text-blue-400" />
          <span className="text-xl font-bold">LUMIE AI</span>
        </div>
      </div>

      {/* 导航菜单 */}
      <nav className="flex-1 px-4 py-6 space-y-2">
        {sidebarItems.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                'flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors duration-200',
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="font-medium">{item.name}</span>
              {item.badge && (
                <span className="ml-auto bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                  {item.badge}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* 底部信息 */}
      <div className="px-4 py-4 border-t border-gray-700">
        <div className="text-xs text-gray-400">
          <p>版本 v1.0.0</p>
          <p className="mt-1">© 2024 LUMIE AI</p>
        </div>
      </div>
    </div>
  )
}

export default Sidebar