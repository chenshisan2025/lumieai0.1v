import React, { useState, useEffect } from 'react';
import { Search, Filter, RefreshCw, CheckCircle, XCircle, Clock, Database, BarChart3, ExternalLink, Eye, Lock, Unlock, Copy, Download, Shield } from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import { useAdmin } from '@/contexts/AdminContext';
import { toast } from 'sonner';
import dataProofService, { DataProofRecord, DataProofStats, DecryptionGuide } from '../../services/DataProofService';

interface DataProofFilters {
  status: string;
  encrypted: string;
  search: string;
  dateRange: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

const AdminDataProof: React.FC = () => {
  const [records, setRecords] = useState<DataProofRecord[]>([]);
  const [stats, setStats] = useState<DataProofStats | null>(null);
  const [decryptionGuide, setDecryptionGuide] = useState<DecryptionGuide | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<DataProofFilters>({
    status: 'all',
    encrypted: 'all',
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
  const [showDecryptionGuide, setShowDecryptionGuide] = useState(false);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const [transactionInfo, setTransactionInfo] = useState<any>(null);
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [showDecryptModal, setShowDecryptModal] = useState(false);
  const [selectedDecryptRecord, setSelectedDecryptRecord] = useState<any>(null);
  const [decryptResult, setDecryptResult] = useState<any>(null);
  
  const { admin } = useAdmin();

  useEffect(() => {
    fetchRecords();
    fetchStats();
    fetchDecryptionGuide();
  }, [filters, pagination.page]);

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const response = await dataProofService.getRecords({
        page: pagination.page,
        limit: pagination.limit,
        status: filters.status === 'all' ? undefined : filters.status,
        encrypted: filters.encrypted === 'all' ? undefined : filters.encrypted === 'true',
        startDate: getDateRangeStart(filters.dateRange),
        endDate: new Date().toISOString().split('T')[0]
      });
      
      if (response.success) {
        setRecords(response.data.records);
        setPagination(prev => ({
          ...prev,
          total: response.data.total,
          totalPages: response.data.totalPages
        }));
      } else {
        toast.error('获取数据证明记录失败');
      }
    } catch (error) {
      console.error('Fetch data proof records error:', error);
      toast.error('获取数据证明记录失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await dataProofService.getStats(filters.dateRange);
      if (response.success) {
        setStats(response.data);
      }
    } catch (error) {
      console.error('Fetch data proof stats error:', error);
    }
  };

  const fetchDecryptionGuide = async () => {
    try {
      const response = await dataProofService.getDecryptionGuide();
      if (response.success) {
        setDecryptionGuide(response.data);
      }
    } catch (error) {
      console.error('Fetch decryption guide error:', error);
    }
  };

  const getDateRangeStart = (range: string): string => {
    const now = new Date();
    const days = {
      '1d': 1,
      '7d': 7,
      '30d': 30,
      '90d': 90
    }[range] || 7;
    
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    return startDate.toISOString().split('T')[0];
  };

  const handleRetrySelected = async () => {
    if (selectedRecords.length === 0) {
      toast.error('请选择要重试的记录');
      return;
    }
    
    try {
      const response = await dataProofService.retryFailedRecords(selectedRecords);
      if (response.success) {
        toast.success(`成功重试 ${response.data.retriedCount} 条记录`);
        setSelectedRecords([]);
        fetchRecords();
        fetchStats();
      } else {
        toast.error('批量重试失败');
      }
    } catch (error) {
      console.error('Retry records error:', error);
      toast.error('批量重试失败');
    }
  };

  const handleCreateProof = async () => {
    try {
      const mockData = {
        timestamp: new Date().toISOString(),
        userCount: Math.floor(Math.random() * 1000) + 100,
        transactionCount: Math.floor(Math.random() * 5000) + 500,
        systemHealth: 'healthy'
      };
      
      const response = await dataProofService.createDailyProof({
        data: mockData,
        encrypted: true,
        metadata: {
          type: 'daily_summary',
          version: '1.0',
          source: 'admin_manual'
        }
      });
      
      if (response.success) {
        toast.success(`数据证明创建成功，CID: ${response.data.cid}`);
        fetchRecords();
        fetchStats();
      } else {
        toast.error('创建数据证明失败');
      }
    } catch (error) {
      console.error('Create proof error:', error);
      toast.error('创建数据证明失败');
    }
  };

  const handleCopyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label}已复制到剪贴板`);
    } catch (error) {
      toast.error('复制失败');
    }
  };

  // 查看交易详情
  const handleViewTransaction = async (txHash: string, cid?: string) => {
    if (!txHash) {
      toast.error('交易哈希不存在');
      return;
    }

    try {
      setLoading(true);
      
      // 获取交易信息
      const txInfo = await dataProofService.getTransactionInfo(txHash);
      setTransactionInfo(txInfo);
      
      // 验证交易数据
      if (cid) {
        const verification = await dataProofService.verifyTransactionData(txHash, cid);
        setVerificationResult(verification);
      }
      
      setSelectedTransaction({ txHash, cid });
      setShowTransactionModal(true);
      
    } catch (error) {
      console.error('Error getting transaction info:', error);
      toast.error('获取交易信息失败');
    } finally {
      setLoading(false);
    }
  };

  // 关闭交易详情模态框
  const closeTransactionModal = () => {
    setShowTransactionModal(false);
    setSelectedTransaction(null);
    setTransactionInfo(null);
    setVerificationResult(null);
  };

  // 格式化时间戳
  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString('zh-CN');
  };

  // 格式化BNB值
  const formatBNB = (wei: number) => {
    return (wei / Math.pow(10, 18)).toFixed(6);
  };

  // 解密数据证明
  const handleDecryptProof = async (record: any) => {
    if (!record.cid) {
      toast.error('CID不存在，无法解密');
      return;
    }

    if (record.encryptionType === 'none') {
      toast.error('该记录未加密，无需解密');
      return;
    }

    setSelectedDecryptRecord(record);
    setShowDecryptModal(true);
  };

  // 执行解密操作
  const executeDecrypt = async () => {
    if (!selectedDecryptRecord) return;

    try {
      setLoading(true);
      
      const result = await dataProofService.decryptProof(selectedDecryptRecord.cid);
      setDecryptResult(result);
      
      toast.success('解密成功');
      
    } catch (error) {
      console.error('Error decrypting proof:', error);
      toast.error('解密失败');
    } finally {
      setLoading(false);
    }
  };

  // 关闭解密模态框
  const closeDecryptModal = () => {
    setShowDecryptModal(false);
    setSelectedDecryptRecord(null);
    setDecryptResult(null);
  };

  // 下载解密数据
  const downloadDecryptedData = () => {
    if (!decryptResult || !decryptResult.decryptedData) {
      toast.error('没有可下载的解密数据');
      return;
    }

    try {
      const blob = new Blob([JSON.stringify(decryptResult.decryptedData, null, 2)], {
        type: 'application/json'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `decrypted_data_${selectedDecryptRecord?.cid?.substring(0, 8)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('解密数据已下载');
    } catch (error) {
      console.error('Error downloading decrypted data:', error);
      toast.error('下载失败');
    }
  };

  const handleVerifyProof = async (cid: string) => {
    try {
      const response = await dataProofService.verifyProof(cid);
      if (response.success) {
        const status = response.data.valid ? '验证成功' : '验证失败';
        toast.success(`CID验证完成: ${status}`);
      } else {
        toast.error('验证失败');
      }
    } catch (error) {
      console.error('Verify proof error:', error);
      toast.error('验证失败');
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN');
  };

  const formatGas = (gas: number) => {
    return gas.toLocaleString();
  };

  const truncateHash = (hash: string, length: number = 10) => {
    return `${hash.slice(0, length)}...${hash.slice(-6)}`;
  };

  return (
    <AdminLayout>
      <div className="px-4 sm:px-6 lg:px-8">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">数据证明管理</h1>
          <p className="mt-2 text-sm text-gray-600">
            管理IPFS数据证明记录，查看CID与区块链交易哈希，支持加密数据的解密流程。
          </p>
        </div>

        {/* 统计卡片 */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="h-8 w-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                  <Database className="h-4 w-4 text-blue-600" />
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
                placeholder="搜索CID或TxHash"
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

            {/* 加密过滤 */}
            <select
              value={filters.encrypted}
              onChange={(e) => setFilters(prev => ({ ...prev, encrypted: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">全部类型</option>
              <option value="true">已加密</option>
              <option value="false">未加密</option>
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
              <option value="date">日期</option>
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
                <button
                  onClick={handleRetrySelected}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                >
                  批量重试 ({selectedRecords.length})
                </button>
              )}
              
              <button
                onClick={() => setShowDecryptionGuide(true)}
                className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                <Lock className="h-4 w-4 mr-2" />
                解密指南
              </button>
            </div>
            
            <button
              onClick={handleCreateProof}
              className="flex items-center px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700"
            >
              <Database className="h-4 w-4 mr-2" />
              创建证明
            </button>
          </div>
        </div>

        {/* 记录列表 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              数据证明记录 ({pagination.total})
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
                      日期/状态
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      CID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      交易哈希
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      加密/Gas
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
                          {record.date}
                        </div>
                        <div className="mt-1">
                          {getStatusBadge(record.status)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                            {truncateHash(record.cid)}
                          </code>
                          <button
                            onClick={() => handleCopyToClipboard(record.cid, 'CID')}
                            className="text-gray-400 hover:text-gray-600"
                            title="复制CID"
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                          <a
                            href={dataProofService.getIpfsUrl(record.cid)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800"
                            title="在IPFS网关中查看"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {record.txHash ? (
                          <div className="flex items-center space-x-2">
                            <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                              {truncateHash(record.txHash)}
                            </code>
                            <button
                              onClick={() => handleCopyToClipboard(record.txHash!, 'TxHash')}
                              className="text-gray-400 hover:text-gray-600"
                              title="复制交易哈希"
                            >
                              <Copy className="h-4 w-4" />
                            </button>
                            <button
                               onClick={() => handleViewTransaction(record.txHash!, record.cid)}
                               className="text-green-600 hover:text-green-800"
                               title="查看交易详情"
                             >
                               <Eye className="h-4 w-4" />
                             </button>
                             {(record as any).encryptionType !== 'none' && (
                               <button
                                 onClick={() => handleDecryptProof(record)}
                                 className="text-purple-600 hover:text-purple-800"
                                 title="解密数据"
                               >
                                 <Shield className="h-4 w-4" />
                               </button>
                             )}
                            <a
                               href={dataProofService.getBscScanUrl(record.txHash)}
                               target="_blank"
                               rel="noopener noreferrer"
                               className="text-blue-600 hover:text-blue-800"
                               title="在BscScan中查看"
                             >
                               <ExternalLink className="h-4 w-4" />
                             </a>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">待上链</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2 mb-1">
                          {record.encrypted ? (
                            <Lock className="h-4 w-4 text-red-600" />
                          ) : (
                            <Unlock className="h-4 w-4 text-green-600" />
                          )}
                          <span className="text-xs text-gray-500">
                            {record.encrypted ? '已加密' : '未加密'}
                          </span>
                        </div>
                        {record.gasUsed && (
                          <div className="text-xs text-gray-500">
                            Gas: {formatGas(record.gasUsed)}
                          </div>
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
                          <button
                            onClick={() => handleVerifyProof(record.cid)}
                            className="text-blue-600 hover:text-blue-900"
                            title="验证证明"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          
                          {record.status === 'failed' && (
                            <button
                              onClick={() => handleRetrySelected()}
                              className="text-green-600 hover:text-green-900"
                              title="重试"
                            >
                              <RefreshCw className="h-4 w-4" />
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

        {/* 解密指南模态框 */}
        {showDecryptionGuide && decryptionGuide && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">解密流程指南</h3>
              </div>
              
              <div className="px-6 py-4 space-y-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">解密步骤</h4>
                  <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600">
                    {decryptionGuide.steps.map((step, index) => (
                      <li key={index}>{step}</li>
                    ))}
                  </ol>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">环境要求</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                    {decryptionGuide.requirements.map((req, index) => (
                      <li key={index}>{req}</li>
                    ))}
                  </ul>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">受控环境</h4>
                  <p className="text-sm text-gray-600">{decryptionGuide.environment}</p>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">密钥管理</h4>
                  <p className="text-sm text-gray-600">{decryptionGuide.keyManagement}</p>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">安全注意事项</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                    {decryptionGuide.securityNotes.map((note, index) => (
                      <li key={index}>{note}</li>
                    ))}
                  </ul>
                </div>
              </div>
              
              <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
                <button
                  onClick={() => setShowDecryptionGuide(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  关闭
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 交易详情模态框 */}
        {showTransactionModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">交易详情</h3>
                <button
                  onClick={closeTransactionModal}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>

              {transactionInfo && (
                <div className="space-y-6">
                  {/* 基本信息 */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium mb-3">基本信息</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">交易哈希:</span>
                        <div className="mt-1 font-mono text-xs break-all">
                          {transactionInfo.transaction.hash}
                        </div>
                      </div>
                      <div>
                        <span className="font-medium">状态:</span>
                        <span className={`ml-2 px-2 py-1 rounded text-xs ${
                          transactionInfo.status === 'success' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {transactionInfo.status === 'success' ? '成功' : '失败'}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium">区块号:</span>
                        <span className="ml-2">{transactionInfo.transaction.blockNumber}</span>
                      </div>
                      <div>
                        <span className="font-medium">时间:</span>
                        <span className="ml-2">
                          {formatTimestamp(transactionInfo.block.timestamp)}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium">发送方:</span>
                        <div className="mt-1 font-mono text-xs break-all">
                          {transactionInfo.transaction.from}
                        </div>
                      </div>
                      <div>
                        <span className="font-medium">接收方:</span>
                        <div className="mt-1 font-mono text-xs break-all">
                          {transactionInfo.transaction.to}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Gas信息 */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium mb-3">Gas信息</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Gas限制:</span>
                        <span className="ml-2">{formatGas(transactionInfo.transaction.gas)}</span>
                      </div>
                      <div>
                        <span className="font-medium">Gas使用:</span>
                        <span className="ml-2">{formatGas(transactionInfo.receipt.gasUsed)}</span>
                      </div>
                      <div>
                        <span className="font-medium">Gas价格:</span>
                        <span className="ml-2">
                          {(transactionInfo.transaction.gasPrice / Math.pow(10, 9)).toFixed(2)} Gwei
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 验证结果 */}
                  {verificationResult && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-medium mb-3">数据验证</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center">
                          <span className="font-medium">交易成功:</span>
                          <span className={`ml-2 px-2 py-1 rounded text-xs ${
                            verificationResult.verification.isSuccess 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {verificationResult.verification.isSuccess ? '是' : '否'}
                          </span>
                        </div>
                        {verificationResult.verification.expectedCid && (
                          <div className="flex items-center">
                            <span className="font-medium">CID匹配:</span>
                            <span className={`ml-2 px-2 py-1 rounded text-xs ${
                              verificationResult.verification.cidMatches 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {verificationResult.verification.cidMatches ? '匹配' : '不匹配'}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 链接 */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium mb-3">相关链接</h4>
                    <div className="space-y-2">
                      <a
                        href={transactionInfo.urls.bscscan}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-blue-600 hover:text-blue-800 text-sm"
                      >
                        <ExternalLink className="h-4 w-4 mr-1" />
                        在BscScan中查看交易
                      </a>
                      <br />
                      <a
                        href={transactionInfo.urls.block}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-blue-600 hover:text-blue-800 text-sm"
                      >
                        <ExternalLink className="h-4 w-4 mr-1" />
                        在BscScan中查看区块
                      </a>
                    </div>
                  </div>
                </div>
              )}

              {loading && (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              )}
            </div>
          </div>
         )}

         {/* 解密模态框 */}
         {showDecryptModal && (
           <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
             <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
               <div className="flex justify-between items-center mb-4">
                 <h3 className="text-lg font-semibold">数据解密</h3>
                 <button
                   onClick={closeDecryptModal}
                   className="text-gray-500 hover:text-gray-700"
                 >
                   <XCircle className="h-6 w-6" />
                 </button>
               </div>

               {selectedDecryptRecord && (
                 <div className="space-y-4">
                   {/* 记录信息 */}
                   <div className="bg-gray-50 p-4 rounded-lg">
                     <h4 className="font-medium mb-3">记录信息</h4>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                       <div>
                         <span className="font-medium">CID:</span>
                         <div className="mt-1 font-mono text-xs break-all">
                           {selectedDecryptRecord.cid}
                         </div>
                       </div>
                       <div>
                         <span className="font-medium">加密类型:</span>
                         <span className="ml-2">
                           {selectedDecryptRecord.encryptionType === 'aes-256-gcm' ? 'AES-256-GCM' : selectedDecryptRecord.encryptionType}
                         </span>
                       </div>
                       <div>
                         <span className="font-medium">创建时间:</span>
                         <span className="ml-2">
                           {new Date(selectedDecryptRecord.createdAt).toLocaleString('zh-CN')}
                         </span>
                       </div>
                       <div>
                         <span className="font-medium">状态:</span>
                         <span className={`ml-2 px-2 py-1 rounded text-xs ${
                           selectedDecryptRecord.status === 'completed' 
                             ? 'bg-green-100 text-green-800' 
                             : selectedDecryptRecord.status === 'failed'
                             ? 'bg-red-100 text-red-800'
                             : 'bg-yellow-100 text-yellow-800'
                         }`}>
                           {selectedDecryptRecord.status === 'completed' ? '已完成' : 
                            selectedDecryptRecord.status === 'failed' ? '失败' : 
                            selectedDecryptRecord.status === 'processing' ? '处理中' : '待处理'}
                         </span>
                       </div>
                     </div>
                   </div>

                   {/* 解密操作 */}
                   {!decryptResult && (
                     <div className="bg-blue-50 p-4 rounded-lg">
                       <h4 className="font-medium mb-3">解密操作</h4>
                       <p className="text-sm text-gray-600 mb-4">
                         点击下方按钮开始解密过程。解密将从IPFS获取加密数据，并使用KMS中的密钥进行解密。
                       </p>
                       <button
                         onClick={executeDecrypt}
                         disabled={loading}
                         className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                       >
                         {loading ? (
                           <>
                             <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                             解密中...
                           </>
                         ) : (
                           <>
                             <Shield className="h-4 w-4 mr-2" />
                             开始解密
                           </>
                         )}
                       </button>
                     </div>
                   )}

                   {/* 解密结果 */}
                   {decryptResult && (
                     <div className="bg-green-50 p-4 rounded-lg">
                       <h4 className="font-medium mb-3">解密结果</h4>
                       <div className="space-y-3">
                         <div className="flex items-center">
                           <span className="font-medium">解密状态:</span>
                           <span className="ml-2 px-2 py-1 rounded text-xs bg-green-100 text-green-800">
                             成功
                           </span>
                         </div>
                         
                         <div>
                           <span className="font-medium">原始数据大小:</span>
                           <span className="ml-2">{decryptResult.originalSize} 字节</span>
                         </div>
                         
                         <div>
                           <span className="font-medium">解密时间:</span>
                           <span className="ml-2">
                             {new Date(decryptResult.decryptedAt).toLocaleString('zh-CN')}
                           </span>
                         </div>

                         {decryptResult.metadata && (
                           <div>
                             <span className="font-medium">元数据:</span>
                             <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-x-auto">
                               {JSON.stringify(decryptResult.metadata, null, 2)}
                             </pre>
                           </div>
                         )}

                         <div className="flex space-x-2 mt-4">
                           <button
                             onClick={downloadDecryptedData}
                             className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 flex items-center text-sm"
                           >
                             <Download className="h-4 w-4 mr-2" />
                             下载解密数据
                           </button>
                         </div>
                       </div>
                     </div>
                   )}

                   {/* 安全提示 */}
                   <div className="bg-yellow-50 p-4 rounded-lg">
                     <h4 className="font-medium mb-2 text-yellow-800">安全提示</h4>
                     <ul className="text-sm text-yellow-700 space-y-1">
                       <li>• 解密操作在受控环境中执行</li>
                       <li>• 解密密钥通过KMS安全管理</li>
                       <li>• 解密数据仅在当前会话中可用</li>
                       <li>• 请妥善保管下载的解密数据</li>
                     </ul>
                   </div>
                 </div>
               )}
             </div>
           </div>
         )}
       </div>
     </AdminLayout>
  );
};

export default AdminDataProof;