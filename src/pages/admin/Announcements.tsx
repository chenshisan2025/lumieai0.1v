import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit, Trash2, Eye, EyeOff, Pin, PinOff, Send, Calendar, Users, TrendingUp } from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import { useAdmin } from '@/contexts/AdminContext';
import { toast } from 'sonner';

interface Announcement {
  id: string;
  title: string;
  content: string;
  type: 'system' | 'maintenance' | 'feature' | 'promotion' | 'warning';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'draft' | 'published' | 'archived';
  isPinned: boolean;
  targetAudience: 'all' | 'members' | 'vip' | 'new_users';
  publishedAt?: string;
  expiresAt?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  viewCount: number;
  clickCount: number;
}

interface AnnouncementStats {
  total: number;
  published: number;
  draft: number;
  pinned: number;
  todayPublished: number;
  byType: Record<string, number>;
  byPriority: Record<string, number>;
}

const AdminAnnouncements: React.FC = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [stats, setStats] = useState<AnnouncementStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    type: 'all',
    priority: 'all'
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });
  
  const { admin } = useAdmin();

  useEffect(() => {
    fetchAnnouncements();
    fetchStats();
  }, [filters, pagination.page]);

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('admin_token');
      
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        search: filters.search,
        status: filters.status,
        type: filters.type,
        priority: filters.priority
      });
      
      const response = await fetch(`/api/admin/announcements?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const result = await response.json();
        setAnnouncements(result.data.announcements);
        setPagination(prev => ({
          ...prev,
          total: result.data.total,
          totalPages: result.data.totalPages
        }));
      } else {
        toast.error('获取公告列表失败');
      }
    } catch (error) {
      console.error('Fetch announcements error:', error);
      toast.error('获取公告列表失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch('/api/admin/announcements/stats', {
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

  const handleCreateAnnouncement = async (announcementData: Partial<Announcement>) => {
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch('/api/admin/announcements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(announcementData)
      });
      
      if (response.ok) {
        toast.success('公告创建成功');
        setShowModal(false);
        fetchAnnouncements();
        fetchStats();
      } else {
        toast.error('公告创建失败');
      }
    } catch (error) {
      console.error('Create announcement error:', error);
      toast.error('公告创建失败');
    }
  };

  const handleUpdateAnnouncement = async (id: string, announcementData: Partial<Announcement>) => {
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch(`/api/admin/announcements/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(announcementData)
      });
      
      if (response.ok) {
        toast.success('公告更新成功');
        setShowModal(false);
        setEditingAnnouncement(null);
        fetchAnnouncements();
        fetchStats();
      } else {
        toast.error('公告更新失败');
      }
    } catch (error) {
      console.error('Update announcement error:', error);
      toast.error('公告更新失败');
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    if (!confirm('确定要删除这个公告吗？')) return;
    
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch(`/api/admin/announcements/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        toast.success('公告删除成功');
        fetchAnnouncements();
        fetchStats();
      } else {
        toast.error('公告删除失败');
      }
    } catch (error) {
      console.error('Delete announcement error:', error);
      toast.error('公告删除失败');
    }
  };

  const handlePublishAnnouncement = async (id: string, publish: boolean) => {
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch(`/api/admin/announcements/${id}/${publish ? 'publish' : 'unpublish'}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        toast.success(publish ? '公告发布成功' : '公告撤回成功');
        fetchAnnouncements();
        fetchStats();
      } else {
        toast.error(publish ? '公告发布失败' : '公告撤回失败');
      }
    } catch (error) {
      console.error('Publish announcement error:', error);
      toast.error(publish ? '公告发布失败' : '公告撤回失败');
    }
  };

  const handlePinAnnouncement = async (id: string, pin: boolean) => {
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch(`/api/admin/announcements/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action: pin ? 'pin' : 'unpin',
          announcementIds: [id]
        })
      });
      
      if (response.ok) {
        toast.success(pin ? '公告置顶成功' : '取消置顶成功');
        fetchAnnouncements();
        fetchStats();
      } else {
        toast.error(pin ? '公告置顶失败' : '取消置顶失败');
      }
    } catch (error) {
      console.error('Pin announcement error:', error);
      toast.error(pin ? '公告置顶失败' : '取消置顶失败');
    }
  };

  const handleBatchOperation = async (action: 'publish' | 'unpublish' | 'delete' | 'pin' | 'unpin') => {
    if (selectedItems.length === 0) {
      toast.error('请选择要操作的公告');
      return;
    }
    
    if (action === 'delete' && !confirm('确定要删除选中的公告吗？')) {
      return;
    }
    
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch('/api/admin/announcements/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action,
          announcementIds: selectedItems
        })
      });
      
      if (response.ok) {
        const actionNames = {
          publish: '发布',
          unpublish: '撤回',
          delete: '删除',
          pin: '置顶',
          unpin: '取消置顶'
        };
        toast.success(`批量${actionNames[action]}成功`);
        setSelectedItems([]);
        fetchAnnouncements();
        fetchStats();
      } else {
        toast.error('批量操作失败');
      }
    } catch (error) {
      console.error('Batch operation error:', error);
      toast.error('批量操作失败');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { label: '草稿', className: 'bg-gray-100 text-gray-800' },
      published: { label: '已发布', className: 'bg-green-100 text-green-800' },
      archived: { label: '已归档', className: 'bg-yellow-100 text-yellow-800' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
        {config.label}
      </span>
    );
  };

  const getTypeBadge = (type: string) => {
    const typeConfig = {
      system: { label: '系统', className: 'bg-blue-100 text-blue-800' },
      maintenance: { label: '维护', className: 'bg-orange-100 text-orange-800' },
      feature: { label: '功能', className: 'bg-purple-100 text-purple-800' },
      promotion: { label: '推广', className: 'bg-green-100 text-green-800' },
      warning: { label: '警告', className: 'bg-red-100 text-red-800' }
    };
    
    const config = typeConfig[type as keyof typeof typeConfig] || typeConfig.system;
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
        {config.label}
      </span>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const priorityConfig = {
      low: { label: '低', className: 'bg-gray-100 text-gray-800' },
      medium: { label: '中', className: 'bg-yellow-100 text-yellow-800' },
      high: { label: '高', className: 'bg-orange-100 text-orange-800' },
      urgent: { label: '紧急', className: 'bg-red-100 text-red-800' }
    };
    
    const config = priorityConfig[priority as keyof typeof priorityConfig] || priorityConfig.medium;
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
        {config.label}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN');
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItems(announcements.map(a => a.id));
    } else {
      setSelectedItems([]);
    }
  };

  const handleSelectItem = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedItems(prev => [...prev, id]);
    } else {
      setSelectedItems(prev => prev.filter(item => item !== id));
    }
  };

  return (
    <AdminLayout>
      <div className="px-4 sm:px-6 lg:px-8">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">公告管理</h1>
          <p className="mt-2 text-sm text-gray-600">
            管理系统公告、通知和重要信息发布。
          </p>
        </div>

        {/* 统计卡片 */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="h-8 w-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                  <Calendar className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">总公告</p>
                  <p className="text-xl font-bold text-gray-900">{stats.total}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="h-8 w-8 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                  <Eye className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">已发布</p>
                  <p className="text-xl font-bold text-gray-900">{stats.published}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="h-8 w-8 bg-gray-100 rounded-lg flex items-center justify-center mr-3">
                  <Edit className="h-4 w-4 text-gray-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">草稿</p>
                  <p className="text-xl font-bold text-gray-900">{stats.draft}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="h-8 w-8 bg-yellow-100 rounded-lg flex items-center justify-center mr-3">
                  <Pin className="h-4 w-4 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">置顶</p>
                  <p className="text-xl font-bold text-gray-900">{stats.pinned}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="h-8 w-8 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                  <TrendingUp className="h-4 w-4 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">今日发布</p>
                  <p className="text-xl font-bold text-gray-900">{stats.todayPublished}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 搜索和过滤 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* 搜索框 */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="搜索公告标题或内容"
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
              <option value="draft">草稿</option>
              <option value="published">已发布</option>
              <option value="archived">已归档</option>
            </select>

            {/* 类型过滤 */}
            <select
              value={filters.type}
              onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">全部类型</option>
              <option value="system">系统</option>
              <option value="maintenance">维护</option>
              <option value="feature">功能</option>
              <option value="promotion">推广</option>
              <option value="warning">警告</option>
            </select>

            {/* 优先级过滤 */}
            <select
              value={filters.priority}
              onChange={(e) => setFilters(prev => ({ ...prev, priority: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">全部优先级</option>
              <option value="low">低</option>
              <option value="medium">中</option>
              <option value="high">高</option>
              <option value="urgent">紧急</option>
            </select>
          </div>

          {/* 操作按钮 */}
          <div className="mt-4 flex items-center justify-between">
            <div className="flex space-x-2">
              <button
                onClick={() => setShowModal(true)}
                className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                创建公告
              </button>
            </div>
            
            {selectedItems.length > 0 && (
              <div className="flex space-x-2">
                <button
                  onClick={() => handleBatchOperation('publish')}
                  className="flex items-center px-3 py-2 text-sm font-medium text-green-700 bg-green-100 rounded-lg hover:bg-green-200"
                >
                  <Send className="h-4 w-4 mr-1" />
                  批量发布
                </button>
                <button
                  onClick={() => handleBatchOperation('unpublish')}
                  className="flex items-center px-3 py-2 text-sm font-medium text-yellow-700 bg-yellow-100 rounded-lg hover:bg-yellow-200"
                >
                  <EyeOff className="h-4 w-4 mr-1" />
                  批量撤回
                </button>
                <button
                  onClick={() => handleBatchOperation('pin')}
                  className="flex items-center px-3 py-2 text-sm font-medium text-purple-700 bg-purple-100 rounded-lg hover:bg-purple-200"
                >
                  <Pin className="h-4 w-4 mr-1" />
                  批量置顶
                </button>
                <button
                  onClick={() => handleBatchOperation('delete')}
                  className="flex items-center px-3 py-2 text-sm font-medium text-red-700 bg-red-100 rounded-lg hover:bg-red-200"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  批量删除
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 公告列表 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              公告列表 ({pagination.total})
            </h3>
          </div>

          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-sm text-gray-500">加载中...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedItems.length === announcements.length && announcements.length > 0}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      公告信息
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      类型/优先级
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      状态
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      统计
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
                  {announcements.map((announcement) => (
                    <tr key={announcement.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedItems.includes(announcement.id)}
                          onChange={(e) => handleSelectItem(announcement.id, e.target.checked)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-start space-x-3">
                          {announcement.isPinned && (
                            <Pin className="h-4 w-4 text-yellow-500 mt-1 flex-shrink-0" />
                          )}
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {announcement.title}
                            </div>
                            <div className="text-sm text-gray-500 line-clamp-2">
                              {announcement.content.substring(0, 100)}...
                            </div>
                            <div className="text-xs text-gray-400 mt-1">
                              目标: {announcement.targetAudience === 'all' ? '所有用户' : 
                                    announcement.targetAudience === 'members' ? '会员' :
                                    announcement.targetAudience === 'vip' ? 'VIP用户' : '新用户'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="space-y-1">
                          {getTypeBadge(announcement.type)}
                          {getPriorityBadge(announcement.priority)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(announcement.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="space-y-1">
                          <div className="flex items-center">
                            <Eye className="h-3 w-3 text-gray-400 mr-1" />
                            {announcement.viewCount}
                          </div>
                          <div className="flex items-center">
                            <Users className="h-3 w-3 text-gray-400 mr-1" />
                            {announcement.clickCount}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div>创建: {formatDate(announcement.createdAt)}</div>
                        {announcement.publishedAt && (
                          <div>发布: {formatDate(announcement.publishedAt)}</div>
                        )}
                        {announcement.expiresAt && (
                          <div>过期: {formatDate(announcement.expiresAt)}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => {
                              setEditingAnnouncement(announcement);
                              setShowModal(true);
                            }}
                            className="text-blue-600 hover:text-blue-900"
                            title="编辑"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          
                          {announcement.status === 'draft' ? (
                            <button
                              onClick={() => handlePublishAnnouncement(announcement.id, true)}
                              className="text-green-600 hover:text-green-900"
                              title="发布"
                            >
                              <Send className="h-4 w-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handlePublishAnnouncement(announcement.id, false)}
                              className="text-yellow-600 hover:text-yellow-900"
                              title="撤回"
                            >
                              <EyeOff className="h-4 w-4" />
                            </button>
                          )}
                          
                          <button
                            onClick={() => handlePinAnnouncement(announcement.id, !announcement.isPinned)}
                            className={announcement.isPinned ? 'text-yellow-600 hover:text-yellow-900' : 'text-gray-600 hover:text-gray-900'}
                            title={announcement.isPinned ? '取消置顶' : '置顶'}
                          >
                            {announcement.isPinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                          </button>
                          
                          <button
                            onClick={() => handleDeleteAnnouncement(announcement.id)}
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

      {/* 公告创建/编辑模态框 */}
      {showModal && (
        <AnnouncementModal
          announcement={editingAnnouncement}
          onClose={() => {
            setShowModal(false);
            setEditingAnnouncement(null);
          }}
          onSave={(announcementData) => {
            if (editingAnnouncement) {
              handleUpdateAnnouncement(editingAnnouncement.id, announcementData);
            } else {
              handleCreateAnnouncement(announcementData);
            }
          }}
        />
      )}
    </AdminLayout>
  );
};

// 公告创建/编辑模态框组件
interface AnnouncementModalProps {
  announcement?: Announcement | null;
  onClose: () => void;
  onSave: (announcementData: Partial<Announcement>) => void;
}

const AnnouncementModal: React.FC<AnnouncementModalProps> = ({ announcement, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    title: announcement?.title || '',
    content: announcement?.content || '',
    type: announcement?.type || 'system',
    priority: announcement?.priority || 'medium',
    status: announcement?.status || 'draft',
    targetAudience: announcement?.targetAudience || 'all',
    expiresAt: announcement?.expiresAt || ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          {announcement ? '编辑公告' : '创建公告'}
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              公告标题
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
              公告内容
            </label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                公告类型
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as any }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="system">系统</option>
                <option value="maintenance">维护</option>
                <option value="feature">功能</option>
                <option value="promotion">推广</option>
                <option value="warning">警告</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                优先级
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as any }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="low">低</option>
                <option value="medium">中</option>
                <option value="high">高</option>
                <option value="urgent">紧急</option>
              </select>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                状态
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as any }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="draft">草稿</option>
                <option value="published">已发布</option>
                <option value="archived">已归档</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                目标用户
              </label>
              <select
                value={formData.targetAudience}
                onChange={(e) => setFormData(prev => ({ ...prev, targetAudience: e.target.value as any }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">所有用户</option>
                <option value="members">会员</option>
                <option value="vip">VIP用户</option>
                <option value="new_users">新用户</option>
              </select>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              过期时间（可选）
            </label>
            <input
              type="datetime-local"
              value={formData.expiresAt}
              onChange={(e) => setFormData(prev => ({ ...prev, expiresAt: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              {announcement ? '更新' : '创建'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminAnnouncements;