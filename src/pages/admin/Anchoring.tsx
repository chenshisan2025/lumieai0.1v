import React, { useState, useEffect } from 'react';
import { Search, Filter, RefreshCw, CheckCircle, XCircle, Clock, Anchor, BarChart3 } from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import { useAdmin } from '@/contexts/AdminContext';
import { toast } from 'sonner';

interface AnchoringRecord {
  id: string;
  userId: string;
  userEmail: string;
  type: 'manual' | 'automatic' | 'scheduled';
  status: 'pending' | 'processing' | 'success' | 'failed';
  blockHash?: string;
  transactionHash?: string;
  gasUsed?: number;
  gasPrice?: number;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
  processedAt?: string;
}

interface AnchoringFilters {
  status: string;
  type: string;
  search: string;
  dateRange: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

interface AnchoringStats {
  total: number;
  pending: number;
  processing: number;
  success: number;
  failed: number;
  successRate: number;
  avgGasUsed: number;
}

const AdminAnchoring: React.FC = () => {
  const [records, setRecords] = useState<AnchoringRecord[]>([]);
  const [stats, setStats] = useState<AnchoringStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<AnchoringFilters>({
    status: 'all',
    type: 'all',
    search: '',
    dateRange: '7d',
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });
  const [selectedRecords, setSelectedRecords] = useState<string[]>([]);
  
  const { admin } = useAdmin();

  useEffect(() => {
    fetchRecords();
    fetchStats();
  }, [filters, pagination.page]);

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('admin_token');
      
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        status: filters.status,
        type: filters.type,
        search: filters.search,
        dateRange: filters.dateRange,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder
      });
      
      const response = await fetch(`/api/admin/anchoring?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const result = await response.json();
        setRecords(result.data.records);
        setPagination(prev => ({
          ...prev,
          total: result.data.total,
          totalPages: result.data.totalPages
        }));
      } else {
        toast.error('获取锚定记录失败');
      }
    } catch (error) {
      console.error('Fetch anchoring records error:', error);
      toast.error('获取锚定记录失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch(`/api/admin/anchoring/stats?dateRange=${filters.dateRange}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const result = await response.json();
        setStats(result.data);
      }
    } catch (error) {
      console.error('Fetch anchoring stats error:', error);
    }
  };

  const handleStatusUpdate = async (recordId: string, newStatus: string) => {
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch(`/api/admin/anchoring/${recordId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      
      if (response.ok) {
        toast.success('状态更新成功');
        fetchRecords();
        fetchStats();
      } else {
        toast.error('状态更新失败');
      }
    } catch (error) {
      console.error('Update status error:', error);
      toast.error('状态更新失败');
    }
  };

  const handleBatchOperation = async (operation: string) => {
    if (selectedRecords.length === 0) {
      toast.error('请选择要操作的记录');
      return;
    }
    
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch('/api/admin/anchoring/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          recordIds: selectedRecords,
          operation
        })
      });
      
      if (response.ok) {
        toast.success('批量操作成功');
        setSelectedRecords([]);
        fetchRecords();
        fetchStats();
      } else {
        toast.error('批量操作失败');
      }
    } catch (error) {
      console.error('Batch operation error:', error);
      toast.error('批量操作失败');
    }
  };

  const handleTriggerAnchoring = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch('/api/admin/anchoring/trigger', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        toast.success('锚定操作已触发');
        fetchRecords();
      } else {
        toast.error('触发锚定操作失败');
      }
    } catch (error) {
      console.error('Trigger anchoring error:', error);
      toast.error('触发锚定操作失败');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: '待处理', className: 'bg-yellow-100 text-yellow-800', icon: Clock },
      processing: { label: '处理中', className: 'bg-blue-100 text-blue-800', icon: RefreshCw },
      success: { label: '成功', className: 'bg-green-100 text-green-800', icon: CheckCircle },
      failed: { label: '失败', className: 'bg-red-100 text-red-800', icon: XCircle }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </span>
    );
  };

  const getTypeBadge = (type: string) => {
    const typeConfig = {
      manual: { label: '手动', className: 'bg-purple-100 text-purple-800' },
      automatic: { label: '自动', className: 'bg-blue-100 text-blue-800' },
      scheduled: { label: '定时', className: 'bg-green-100 text-green-800' }
    };
    
    const config = typeConfig[type as keyof typeof typeConfig] || typeConfig.manual;
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
        {config.label}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN');
  };

  const formatGas = (gas: number) => {
    return gas.toLocaleString();
  };

  return (
    <AdminLayout>
      <div className="px-4 sm:px-6 lg:px-8">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">锚定记录管理</h1>
          <p className="mt-2 text-sm text-gray-600">
            管理区块链锚定记录，监控锚定状态和性能。
          </p>
        </div>

        {/* 统计卡片 */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="h-8 w-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                  <Anchor className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">总记录</p>
                  <p className="text-xl font-bold text-gray-900">{stats.total}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="h-8 w-8 bg-yellow-100 rounded-lg flex items-center justify-center mr-3">
                  <Clock className="h-4 w-4 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">待处理</p>
                  <p className="text-xl font-bold text-gray-900">{stats.pending}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="h-8 w-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                  <RefreshCw className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">处理中</p>
                  <p className="text-xl font-bold text-gray-900">{stats.processing}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="h-8 w-8 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">成功</p>
                  <p className="text-xl font-bold text-gray-900">{stats.success}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="h-8 w-8 bg-red-100 rounded-lg flex items-center justify-center mr-3">
                  <XCircle className="h-4 w-4 text-red-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">失败</p>
                  <p className="text-xl font-bold text-gray-900">{stats.failed}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="h-8 w-8 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                  <BarChart3 className="h-4 w-4 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">成功率</p>
                  <p className="text-xl font-bold text-gray-900">{stats.successRate.toFixed(1)}%</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 搜索和过滤 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            {/* 搜索框 */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="搜索用户邮箱或哈希"
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
              <option value="pending">待处理</option>
              <option value="processing">处理中</option>
              <option value="success">成功</option>
              <option value="failed">失败</option>
            </select>

            {/* 类型过滤 */}
            <select
              value={filters.type}
              onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">全部类型</option>
              <option value="manual">手动</option>
              <option value="automatic">自动</option>
              <option value="scheduled">定时</option>
            </select>

            {/* 时间范围 */}
            <select
              value={filters.dateRange}
              onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="1d">最近1天</option>
              <option value="7d">最近7天</option>
              <option value="30d">最近30天</option>
              <option value="90d">最近90天</option>
            </select>

            {/* 排序字段 */}
            <select
              value={filters.sortBy}
              onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="createdAt">创建时间</option>
              <option value="updatedAt">更新时间</option>
              <option value="processedAt">处理时间</option>
              <option value="gasUsed">Gas消耗</option>
            </select>

            {/* 排序方向 */}
            <select
              value={filters.sortOrder}
              onChange={(e) => setFilters(prev => ({ ...prev, sortOrder: e.target.value as 'asc' | 'desc' }))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="desc">降序</option>
              <option value="asc">升序</option>
            </select>
          </div>

          {/* 操作按钮 */}
          <div className="mt-4 flex items-center justify-between">
            <div className="flex space-x-2">
              {selectedRecords.length > 0 && (
                <>
                  <button
                    onClick={() => handleBatchOperation('retry')}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                  >
                    批量重试
                  </button>
                  <button
                    onClick={() => handleBatchOperation('cancel')}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
                  >
                    批量取消
                  </button>
                </>
              )}
            </div>
            
            <button
              onClick={handleTriggerAnchoring}
              className="flex items-center px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700"
            >
              <Anchor className="h-4 w-4 mr-2" />
              触发锚定
            </button>
          </div>
        </div>

        {/* 记录列表 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              锚定记录 ({pagination.total})
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
                        checked={selectedRecords.length === records.length && records.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedRecords(records.map(r => r.id));
                          } else {
                            setSelectedRecords([]);
                          }
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      用户信息
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      类型/状态
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      区块链信息
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Gas信息
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      时间信息
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {records.map((record) => (
                    <tr key={record.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedRecords.includes(record.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedRecords(prev => [...prev, record.id]);
                            } else {
                              setSelectedRecords(prev => prev.filter(id => id !== record.id));
                            }
                          }}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {record.userEmail}
                        </div>
                        <div className="text-sm text-gray-500">
                          ID: {record.userId.slice(0, 8)}...
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="space-y-1">
                          {getTypeBadge(record.type)}
                          {getStatusBadge(record.status)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {record.blockHash && (
                          <div>区块: {record.blockHash.slice(0, 10)}...</div>
                        )}
                        {record.transactionHash && (
                          <div>交易: {record.transactionHash.slice(0, 10)}...</div>
                        )}
                        {record.errorMessage && (
                          <div className="text-red-600 text-xs">
                            错误: {record.errorMessage.slice(0, 30)}...
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {record.gasUsed && (
                          <div>消耗: {formatGas(record.gasUsed)}</div>
                        )}
                        {record.gasPrice && (
                          <div>价格: {formatGas(record.gasPrice)}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div>创建: {formatDate(record.createdAt)}</div>
                        {record.processedAt && (
                          <div>处理: {formatDate(record.processedAt)}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          {record.status === 'failed' && (
                            <button
                              onClick={() => handleStatusUpdate(record.id, 'pending')}
                              className="text-blue-600 hover:text-blue-900"
                              title="重试"
                            >
                              <RefreshCw className="h-4 w-4" />
                            </button>
                          )}
                          
                          {record.status === 'pending' && (
                            <button
                              onClick={() => handleStatusUpdate(record.id, 'cancelled')}
                              className="text-red-600 hover:text-red-900"
                              title="取消"
                            >
                              <XCircle className="h-4 w-4" />
                            </button>
                          )}
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
    </AdminLayout>
  );
};

export default AdminAnchoring;