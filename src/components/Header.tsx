'use client'

import React from 'react'
import { Bell, User, Settings, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface HeaderProps {
  title?: string
  user?: {
    name: string
    email: string
    avatar?: string
  }
}

const Header: React.FC<HeaderProps> = ({ 
  title = 'LUMIE AI', 
  user = { name: 'User', email: 'user@example.com' } 
}) => {
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* 标题 */}
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        </div>

        {/* 右侧操作区 */}
        <div className="flex items-center space-x-4">
          {/* 通知按钮 */}
          <Button variant="ghost" size="sm" className="relative">
            <Bell className="h-5 w-5" />
            <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full"></span>
          </Button>

          {/* 用户菜单 */}
          <div className="flex items-center space-x-3">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">{user.name}</p>
              <p className="text-xs text-gray-500">{user.email}</p>
            </div>
            
            <div className="flex items-center space-x-2">
              {/* 用户头像 */}
              <div className="h-8 w-8 bg-blue-500 rounded-full flex items-center justify-center">
                {user.avatar ? (
                  <img 
                    src={user.avatar} 
                    alt={user.name} 
                    className="h-8 w-8 rounded-full object-cover"
                  />
                ) : (
                  <User className="h-4 w-4 text-white" />
                )}
              </div>
              
              {/* 设置按钮 */}
              <Button variant="ghost" size="sm">
                <Settings className="h-4 w-4" />
              </Button>
              
              {/* 登出按钮 */}
              <Button variant="ghost" size="sm">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header