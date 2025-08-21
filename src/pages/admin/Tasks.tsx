import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit, Trash2, Gift, Users, CheckCircle, Clock, Target, Award } from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import { useAdmin } from '@/contexts/AdminContext';
import { toast } from 'sonner';

interface Task {
  id: string;
  title: string;
  description: string;
  type: 'daily' | 'weekly' | 'monthly' | 'special';
  category: 'social' | 'trading' | 'learning' | 'referral' | 'other';
  status: 'active' | 'inactive' | 'completed';
  requirements: any;
  rewards: {
    points: number;
    tokens?: number;
    badges?: string[];
    items?: string[];
  };
  startDate?: string;
  endDate?: string;
  maxCompletions?: number;
  currentCompletions: number;
  createdAt: string;
  updatedAt: string;
}

interface UserTask {
  id: string;
  userId: string;
  userEmail: string;
  taskId: string;
  taskTitle: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  progress: number;
  completedAt?: string;
  createdAt: string;
}

interface Reward {
  id: string;
  userId: string;
  userEmail: string;
  taskId?: string;
  taskTitle?: string;
  type: 'points' | 'tokens' | 'badge' | 'item';
  amount?: number;
  itemName?: string;
  description: string;
  status: 'pending' | 'distributed' | 'failed';
  createdAt: string;
  distributedAt?: string;
}

interface TaskStats {
  totalTasks: number;
  activeTasks: number;
  completedTasks: number;
  totalCompletions: number;
  totalRewards: number;
  pendingRewards: number;
}

const AdminTasks: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'tasks' | 'user-tasks' | 'rewards'>('tasks');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [userTasks, setUserTasks] = useState<UserTask[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [stats, setStats] = useState<TaskStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    type: 'all',
    category: 'all'
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });
  
  const { admin } = useAdmin();

  useEffect(() => {
    fetchData();
    fetchStats();
  }, [activeTab, filters, pagination.page]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('admin_token');
      
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        search: filters.search,
        status: filters.status,
        type: filters.type,
        category: filters.category
      });
      
      let endpoint = '';
      switch (activeTab) {
        case 'tasks':
          endpoint = `/api/admin/tasks?${params}`;
          break;
        case 'user-tasks':
          endpoint = `/api/admin/tasks/user-tasks?${params}`;
          break;
        case 'rewards':
          endpoint = `/api/admin/tasks/rewards?${params}`;
          break;
      }
      
      const response = await fetch(endpoint, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const result = await response.json();
        
        switch (activeTab) {
          case 'tasks':
            setTasks(result.data.tasks);
            break;
          case 'user-tasks':
            setUserTasks(result.data.userTasks);
            break;
          case 'rewards':
            setRewards(result.data.rewards);
            break;
        }
        
        setPagination(prev => ({
          ...prev,
          total: result.data.total,
          totalPages: result.data.totalPages
        }));
      } else {
        toast.error('获取数据失败');
      }
    } catch (error) {
      console.error('Fetch data error:', error);
      toast.error('获取数据失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch('/api/admin/tasks/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const result = await response.json();
        setStats(result.data);
      }
    } catch (error) {
      console.error('Fetch stats error:', error);
    }
  };

  const handleCreateTask = async (taskData: Partial<Task>) => {
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch('/api/admin/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(taskData)
      });
      
      if (response.ok) {
        toast.success('任务创建成功');
        setShowTaskModal(false);
        fetchData();
        fetchStats();
      } else {
        toast.error('任务创建失败');
      }
    } catch (error) {
      console.error('Create task error:', error);
      toast.error('任务创建失败');
    }
  };

  const handleUpdateTask = async (taskId: string, taskData: Partial<Task>) => {
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch(`/api/admin/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(taskData)
      });
      
      if (response.ok) {
        toast.success('任务更新成功');
        setShowTaskModal(false);
        setEditingTask(null);
        fetchData();
        fetchStats();
      } else {
        toast.error('任务更新失败');
      }
    } catch (error) {
      console.error('Update task error:', error);
      toast.error('任务更新失败');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('确定要删除这个任务吗？')) return;
    
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch(`/api/admin/tasks/${taskId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        toast.success('任务删除成功');
        fetchData();
        fetchStats();
      } else {
        toast.error('任务删除失败');
      }
    } catch (error) {
      console.error('Delete task error:', error);
      toast.error('任务删除失败');
    }
  };

  const handleCompleteUserTask = async (userTaskId: string) => {
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch(`/api/admin/tasks/user-tasks/${userTaskId}/complete`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        toast.success('任务完成成功');
        fetchData();
        fetchStats();
      } else {
        toast.error('任务完成失败');
      }
    } catch (error) {
      console.error('Complete user task error:', error);
      toast.error('任务完成失败');
    }
  };

  const handleBatchRewards = async (rewardIds: string[]) => {
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch('/api/admin/tasks/rewards/batch-distribute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ rewardIds })
      });
      
      if (response.ok) {
        toast.success('批量发放成功');
        fetchData();
        fetchStats();
      } else {
        toast.error('批量发放失败');
      }
    } catch (error) {
      console.error('Batch rewards error:', error);
      toast.error('批量发放失败');
    }
  };

  const getStatusBadge = (status: string, type: 'task' | 'user-task' | 'reward') => {
    const configs = {
      task: {
        active: { label: '活跃', className: 'bg-green-100 text-green-800' },
        inactive: { label: '未激活', className: 'bg-gray-100 text-gray-800' },
        completed: { label: '已完成', className: 'bg-blue-100 text-blue-800' }
      },
      'user-task': {
        pending: { label: '待开始', className: 'bg-yellow-100 text-yellow-800' },
        in_progress: { label: '进行中', className: 'bg-blue-100 text-blue-800' },
        completed: { label: '已完成', className: 'bg-green-100 text-green-800' },
        failed: { label: '失败', className: 'bg-red-100 text-red-800' }
      },
      reward: {
        pending: { label: '待发放', className: 'bg-yellow-100 text-yellow-800' },
        distributed: { label: '已发放', className: 'bg-green-100 text-green-800' },
        failed: { label: '发放失败', className: 'bg-red-100 text-red-800' }
      }
    } as const;
    
    const typeConfig = configs[type];
    const config = (typeConfig as any)[status] || { label: status, className: 'bg-gray-100 text-gray-800' };
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
        {config.label}
      </span>
    );
  };

  const getTypeBadge = (type: string) => {
    const typeConfig = {
      daily: { label: '每日', className: 'bg-blue-100 text-blue-800' },
      weekly: { label: '每周', className: 'bg-purple-100 text-purple-800' },
      monthly: { label: '每月', className: 'bg-green-100 text-green-800' },
      special: { label: '特殊', className: 'bg-yellow-100 text-yellow-800' }
    };
    
    const config = typeConfig[type as keyof typeof typeConfig] || typeConfig.daily;
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
        {config.label}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN');
  };

  const formatRewards = (rewards: Task['rewards']) => {
    const parts = [];
    if (rewards.points) parts.push(`${rewards.points} 积分`);
    if (rewards.tokens) parts.push(`${rewards.tokens} 代币`);
    if (rewards.badges?.length) parts.push(`${rewards.badges.length} 徽章`);
    if (rewards.items?.length) parts.push(`${rewards.items.length} 物品`);
    return parts.join(', ') || '无奖励';
  };

  return (
    <AdminLayout>
      <div className="px-4 sm:px-6 lg:px-8">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">任务与奖励管理</h1>
          <p className="mt-2 text-sm text-gray-600">
            管理系统任务、用户任务进度和奖励发放。
          </p>
        </div>

        {/* 统计卡片 */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="h-8 w-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                  <Target className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">总任务</p>
                  <p className="text-xl font-bold text-gray-900">{stats.totalTasks}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="h-8 w-8 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">活跃任务</p>
                  <p className="text-xl font-bold text-gray-900">{stats.activeTasks}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="h-8 w-8 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                  <Clock className="h-4 w-4 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">已完成</p>
                  <p className="text-xl font-bold text-gray-900">{stats.completedTasks}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="h-8 w-8 bg-yellow-100 rounded-lg flex items-center justify-center mr-3">
                  <Users className="h-4 w-4 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">总完成次数</p>
                  <p className="text-xl font-bold text-gray-900">{stats.totalCompletions}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="h-8 w-8 bg-red-100 rounded-lg flex items-center justify-center mr-3">
                  <Gift className="h-4 w-4 text-red-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">总奖励</p>
                  <p className="text-xl font-bold text-gray-900">{stats.totalRewards}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="h-8 w-8 bg-orange-100 rounded-lg flex items-center justify-center mr-3">
                  <Award className="h-4 w-4 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">待发放</p>
                  <p className="text-xl font-bold text-gray-900">{stats.pendingRewards}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 标签页 */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {[
                { key: 'tasks', label: '任务管理', icon: Target },
                { key: 'user-tasks', label: '用户任务', icon: Users },
                { key: 'rewards', label: '奖励记录', icon: Gift }
              ].map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key as any)}
                  className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === key
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* 搜索和过滤 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* 搜索框 */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="搜索任务或用户"
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 状态过滤 */}
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">全部状态</option>
              {activeTab === 'tasks' && (
                <>
                  <option value="active">活跃</option>
                  <option value="inactive">未激活</option>
                  <option value="completed">已完成</option>
                </>
              )}
              {activeTab === 'user-tasks' && (
                <>
                  <option value="pending">待开始</option>
                  <option value="in_progress">进行中</option>
                  <option value="completed">已完成</option>
                  <option value="failed">失败</option>
                </>
              )}
              {activeTab === 'rewards' && (
                <>
                  <option value="pending">待发放</option>
                  <option value="distributed">已发放</option>
                  <option value="failed">发放失败</option>
                </>
              )}
            </select>

            {/* 类型过滤 */}
            {activeTab === 'tasks' && (
              <select
                value={filters.type}
                onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">全部类型</option>
                <option value="daily">每日</option>
                <option value="weekly">每周</option>
                <option value="monthly">每月</option>
                <option value="special">特殊</option>
              </select>
            )}

            {/* 分类过滤 */}
            {activeTab === 'tasks' && (
              <select
                value={filters.category}
                onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">全部分类</option>
                <option value="social">社交</option>
                <option value="trading">交易</option>
                <option value="learning">学习</option>
                <option value="referral">推荐</option>
                <option value="other">其他</option>
              </select>
            )}
          </div>

          {/* 操作按钮 */}
          <div className="mt-4 flex items-center justify-between">
            <div className="flex space-x-2">
              {activeTab === 'tasks' && (
                <button
                  onClick={() => setShowTaskModal(true)}
                  className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  创建任务
                </button>
              )}
              
              {activeTab === 'rewards' && (
                <button
                  onClick={() => {
                    const pendingRewards = rewards.filter(r => r.status === 'pending').map(r => r.id);
                    if (pendingRewards.length > 0) {
                      handleBatchRewards(pendingRewards);
                    } else {
                      toast.error('没有待发放的奖励');
                    }
                  }}
                  className="flex items-center px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700"
                >
                  <Gift className="h-4 w-4 mr-2" />
                  批量发放
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 数据列表 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              {activeTab === 'tasks' && `任务列表 (${pagination.total})`}
              {activeTab === 'user-tasks' && `用户任务 (${pagination.total})`}
              {activeTab === 'rewards' && `奖励记录 (${pagination.total})`}
            </h3>
          </div>

          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-sm text-gray-500">加载中...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              {/* 任务列表 */}
              {activeTab === 'tasks' && (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        任务信息
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        类型/状态
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        奖励
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        完成情况
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        时间
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        操作
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {tasks.map((task) => (
                      <tr key={task.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">{task.title}</div>
                          <div className="text-sm text-gray-500">{task.description}</div>
                          <div className="text-xs text-gray-400 mt-1">{task.category}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="space-y-1">
                            {getTypeBadge(task.type)}
                            {getStatusBadge(task.status, 'task')}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatRewards(task.rewards)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div>
                            {task.currentCompletions} / {task.maxCompletions || '∞'}
                          </div>
                          <div className="text-xs text-gray-500">
                            完成率: {task.maxCompletions ? 
                              ((task.currentCompletions / task.maxCompletions) * 100).toFixed(1) : 0}%
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div>创建: {formatDate(task.createdAt)}</div>
                          {task.endDate && (
                            <div>截止: {formatDate(task.endDate)}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => {
                                setEditingTask(task);
                                setShowTaskModal(true);
                              }}
                              className="text-blue-600 hover:text-blue-900"
                              title="编辑"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteTask(task.id)}
                              className="text-red-600 hover:text-red-900"
                              title="删除"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* 用户任务列表 */}
              {activeTab === 'user-tasks' && (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        用户信息
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        任务信息
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        状态/进度
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        时间
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        操作
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {userTasks.map((userTask) => (
                      <tr key={userTask.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {userTask.userEmail}
                          </div>
                          <div className="text-sm text-gray-500">
                            ID: {userTask.userId.slice(0, 8)}...
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">
                            {userTask.taskTitle}
                          </div>
                          <div className="text-sm text-gray-500">
                            任务ID: {userTask.taskId.slice(0, 8)}...
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="space-y-1">
                            {getStatusBadge(userTask.status, 'user-task')}
                            <div className="text-sm text-gray-500">
                              进度: {userTask.progress}%
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div>开始: {formatDate(userTask.createdAt)}</div>
                          {userTask.completedAt && (
                            <div>完成: {formatDate(userTask.completedAt)}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          {userTask.status === 'in_progress' && (
                            <button
                              onClick={() => handleCompleteUserTask(userTask.id)}
                              className="text-green-600 hover:text-green-900"
                              title="标记完成"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* 奖励记录列表 */}
              {activeTab === 'rewards' && (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        用户信息
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        奖励信息
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        任务信息
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        状态
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        时间
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {rewards.map((reward) => (
                      <tr key={reward.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {reward.userEmail}
                          </div>
                          <div className="text-sm text-gray-500">
                            ID: {reward.userId.slice(0, 8)}...
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">
                            {reward.type === 'points' && `${reward.amount} 积分`}
                            {reward.type === 'tokens' && `${reward.amount} 代币`}
                            {reward.type === 'badge' && `徽章: ${reward.itemName}`}
                            {reward.type === 'item' && `物品: ${reward.itemName}`}
                          </div>
                          <div className="text-sm text-gray-500">
                            {reward.description}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {reward.taskTitle ? (
                            <>
                              <div className="text-sm font-medium text-gray-900">
                                {reward.taskTitle}
                              </div>
                              <div className="text-sm text-gray-500">
                                {reward.taskId?.slice(0, 8)}...
                              </div>
                            </>
                          ) : (
                            <span className="text-sm text-gray-500">手动发放</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(reward.status, 'reward')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div>创建: {formatDate(reward.createdAt)}</div>
                          {reward.distributedAt && (
                            <div>发放: {formatDate(reward.distributedAt)}</div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* 分页 */}
          {pagination.totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  显示 {(pagination.page - 1) * pagination.limit + 1} 到{' '}
                  {Math.min(pagination.page * pagination.limit, pagination.total)} 条，
                  共 {pagination.total} 条记录
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                    disabled={pagination.page === 1}
                    className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    上一页
                  </button>
                  <span className="px-3 py-1 text-sm">
                    {pagination.page} / {pagination.totalPages}
                  </span>
                  <button
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                    disabled={pagination.page === pagination.totalPages}
                    className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    下一页
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 任务创建/编辑模态框 */}
      {showTaskModal && (
        <TaskModal
          task={editingTask}
          onClose={() => {
            setShowTaskModal(false);
            setEditingTask(null);
          }}
          onSave={(taskData) => {
            if (editingTask) {
              handleUpdateTask(editingTask.id, taskData);
            } else {
              handleCreateTask(taskData);
            }
          }}
        />
      )}
    </AdminLayout>
  );
};

// 任务创建/编辑模态框组件
interface TaskModalProps {
  task?: Task | null;
  onClose: () => void;
  onSave: (taskData: Partial<Task>) => void;
}

const TaskModal: React.FC<TaskModalProps> = ({ task, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    title: task?.title || '',
    description: task?.description || '',
    type: task?.type || 'daily',
    category: task?.category || 'other',
    status: task?.status || 'active',
    requirements: task?.requirements || {},
    rewards: task?.rewards || { points: 0 },
    startDate: task?.startDate || '',
    endDate: task?.endDate || '',
    maxCompletions: task?.maxCompletions || 0
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          {task ? '编辑任务' : '创建任务'}
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                任务标题
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                任务类型
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as any }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="daily">每日</option>
                <option value="weekly">每周</option>
                <option value="monthly">每月</option>
                <option value="special">特殊</option>
              </select>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              任务描述
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                分类
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value as any }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="social">社交</option>
                <option value="trading">交易</option>
                <option value="learning">学习</option>
                <option value="referral">推荐</option>
                <option value="other">其他</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                状态
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as any }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="active">活跃</option>
                <option value="inactive">未激活</option>
                <option value="completed">已完成</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                最大完成次数
              </label>
              <input
                type="number"
                value={formData.maxCompletions}
                onChange={(e) => setFormData(prev => ({ ...prev, maxCompletions: parseInt(e.target.value) || 0 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="0"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                开始时间
              </label>
              <input
                type="datetime-local"
                value={formData.startDate}
                onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                结束时间
              </label>
              <input
                type="datetime-local"
                value={formData.endDate}
                onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              奖励积分
            </label>
            <input
              type="number"
              value={formData.rewards.points}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                rewards: { ...prev.rewards, points: parseInt(e.target.value) || 0 }
              }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="0"
            />
          </div>
          
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              {task ? '更新' : '创建'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminTasks;