import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { Download, Calendar, Users, TrendingUp, Award, Anchor, Activity, FileText, Filter } from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import { useAdmin } from '@/contexts/AdminContext';
import { toast } from 'sonner';

interface ReportData {
  userGrowth: {
    date: string;
    newUsers: number;
    totalUsers: number;
    activeUsers: number;
  }[];
  taskCompletion: {
    date: string;
    completedTasks: number;
    totalTasks: number;
    completionRate: number;
  }[];
  rewardDistribution: {
    date: string;
    totalRewards: number;
    uniqueRecipients: number;
    averageReward: number;
  }[];
  anchoringRecords: {
    date: string;
    totalRecords: number;
    successfulRecords: number;
    failedRecords: number;
    successRate: number;
  }[];
  systemActivity: {
    date: string;
    apiCalls: number;
    errorRate: number;
    responseTime: number;
  }[];
}

interface ComprehensiveReport {
  summary: {
    totalUsers: number;
    activeUsers: number;
    totalTasks: number;
    completedTasks: number;
    totalRewards: number;
    totalAnchoring: number;
    successfulAnchoring: number;
    systemUptime: number;
  };
  trends: {
    userGrowthRate: number;
    taskCompletionRate: number;
    rewardGrowthRate: number;
    anchoringSuccessRate: number;
  };
  topMetrics: {
    mostActiveUsers: Array<{ userId: string; username: string; activityCount: number }>;
    popularTasks: Array<{ taskId: string; title: string; completionCount: number }>;
    topRewards: Array<{ rewardType: string; totalAmount: number; recipientCount: number }>;
  };
}

const AdminReports: React.FC = () => {
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [comprehensiveReport, setComprehensiveReport] = useState<ComprehensiveReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [reportType, setReportType] = useState('daily');
  
  const { admin } = useAdmin();

  useEffect(() => {
    fetchReportData();
    fetchComprehensiveReport();
  }, [dateRange, reportType]);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('admin_token');
      
      const params = new URLSearchParams({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        interval: reportType
      });
      
      const [userGrowth, taskCompletion, rewardDistribution, anchoringRecords, systemActivity] = await Promise.all([
        fetch(`/api/admin/reports/user-growth?${params}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }).then(res => res.json()),
        fetch(`/api/admin/reports/task-completion?${params}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }).then(res => res.json()),
        fetch(`/api/admin/reports/reward-distribution?${params}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }).then(res => res.json()),
        fetch(`/api/admin/reports/anchoring-records?${params}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }).then(res => res.json()),
        fetch(`/api/admin/reports/system-activity?${params}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }).then(res => res.json())
      ]);
      
      setReportData({
        userGrowth: userGrowth.data || [],
        taskCompletion: taskCompletion.data || [],
        rewardDistribution: rewardDistribution.data || [],
        anchoringRecords: anchoringRecords.data || [],
        systemActivity: systemActivity.data || []
      });
    } catch (error) {
      console.error('Fetch report data error:', error);
      toast.error('获取报告数据失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchComprehensiveReport = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      
      const params = new URLSearchParams({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
      });
      
      const response = await fetch(`/api/admin/reports/comprehensive?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const result = await response.json();
        setComprehensiveReport(result.data);
      }
    } catch (error) {
      console.error('Fetch comprehensive report error:', error);
    }
  };

  const exportReport = async (format: 'csv' | 'pdf' | 'excel') => {
    try {
      const token = localStorage.getItem('admin_token');
      
      const params = new URLSearchParams({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        format,
        type: activeTab
      });
      
      const response = await fetch(`/api/admin/reports/export?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `report_${activeTab}_${dateRange.startDate}_${dateRange.endDate}.${format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success('报告导出成功');
      } else {
        toast.error('报告导出失败');
      }
    } catch (error) {
      console.error('Export report error:', error);
      toast.error('报告导出失败');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN');
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('zh-CN').format(num);
  };

  const formatPercentage = (num: number) => {
    return `${(num * 100).toFixed(1)}%`;
  };

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

  const tabs = [
    { id: 'overview', label: '概览', icon: TrendingUp },
    { id: 'users', label: '用户增长', icon: Users },
    { id: 'tasks', label: '任务完成', icon: Award },
    { id: 'rewards', label: '奖励分发', icon: Award },
    { id: 'anchoring', label: '锚定记录', icon: Anchor },
    { id: 'system', label: '系统活跃度', icon: Activity }
  ];

  return (
    <AdminLayout>
      <div className="px-4 sm:px-6 lg:px-8">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">数据报告</h1>
          <p className="mt-2 text-sm text-gray-600">
            查看系统运营数据和分析报告。
          </p>
        </div>

        {/* 过滤器和导出 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                开始日期
              </label>
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                结束日期
              </label>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                报告类型
              </label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="daily">每日</option>
                <option value="weekly">每周</option>
                <option value="monthly">每月</option>
              </select>
            </div>
            
            <div className="flex items-end space-x-2">
              <button
                onClick={() => exportReport('csv')}
                className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                <Download className="h-4 w-4 mr-1" />
                CSV
              </button>
              <button
                onClick={() => exportReport('excel')}
                className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                <Download className="h-4 w-4 mr-1" />
                Excel
              </button>
              <button
                onClick={() => exportReport('pdf')}
                className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                <Download className="h-4 w-4 mr-1" />
                PDF
              </button>
            </div>
          </div>
        </div>

        {/* 标签页导航 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="p-6">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-sm text-gray-500">加载中...</p>
              </div>
            ) : (
              <div>
                {/* 概览标签页 */}
                {activeTab === 'overview' && comprehensiveReport && (
                  <div className="space-y-6">
                    {/* 关键指标 */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-6 text-white">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-blue-100">总用户数</p>
                            <p className="text-2xl font-bold">{formatNumber(comprehensiveReport.summary.totalUsers)}</p>
                            <p className="text-sm text-blue-100">
                              活跃用户: {formatNumber(comprehensiveReport.summary.activeUsers)}
                            </p>
                          </div>
                          <Users className="h-8 w-8 text-blue-200" />
                        </div>
                      </div>
                      
                      <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-6 text-white">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-green-100">任务完成</p>
                            <p className="text-2xl font-bold">{formatNumber(comprehensiveReport.summary.completedTasks)}</p>
                            <p className="text-sm text-green-100">
                              总任务: {formatNumber(comprehensiveReport.summary.totalTasks)}
                            </p>
                          </div>
                          <Award className="h-8 w-8 text-green-200" />
                        </div>
                      </div>
                      
                      <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-lg p-6 text-white">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-yellow-100">奖励发放</p>
                            <p className="text-2xl font-bold">{formatNumber(comprehensiveReport.summary.totalRewards)}</p>
                            <p className="text-sm text-yellow-100">
                              增长率: {formatPercentage(comprehensiveReport.trends.rewardGrowthRate)}
                            </p>
                          </div>
                          <Award className="h-8 w-8 text-yellow-200" />
                        </div>
                      </div>
                      
                      <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg p-6 text-white">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-purple-100">锚定成功率</p>
                            <p className="text-2xl font-bold">{formatPercentage(comprehensiveReport.trends.anchoringSuccessRate)}</p>
                            <p className="text-sm text-purple-100">
                              成功: {formatNumber(comprehensiveReport.summary.successfulAnchoring)}
                            </p>
                          </div>
                          <Anchor className="h-8 w-8 text-purple-200" />
                        </div>
                      </div>
                    </div>

                    {/* 趋势图表 */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="bg-gray-50 rounded-lg p-6">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">增长趋势</h3>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">用户增长率</span>
                            <span className={`text-sm font-medium ${
                              comprehensiveReport.trends.userGrowthRate > 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {comprehensiveReport.trends.userGrowthRate > 0 ? '+' : ''}
                              {formatPercentage(comprehensiveReport.trends.userGrowthRate)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">任务完成率</span>
                            <span className="text-sm font-medium text-blue-600">
                              {formatPercentage(comprehensiveReport.trends.taskCompletionRate)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">奖励增长率</span>
                            <span className={`text-sm font-medium ${
                              comprehensiveReport.trends.rewardGrowthRate > 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {comprehensiveReport.trends.rewardGrowthRate > 0 ? '+' : ''}
                              {formatPercentage(comprehensiveReport.trends.rewardGrowthRate)}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-gray-50 rounded-lg p-6">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">系统状态</h3>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">系统正常运行时间</span>
                            <span className="text-sm font-medium text-green-600">
                              {formatPercentage(comprehensiveReport.summary.systemUptime)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">锚定成功率</span>
                            <span className="text-sm font-medium text-blue-600">
                              {formatPercentage(comprehensiveReport.trends.anchoringSuccessRate)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 排行榜 */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      <div className="bg-white border border-gray-200 rounded-lg p-6">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">最活跃用户</h3>
                        <div className="space-y-3">
                          {comprehensiveReport.topMetrics.mostActiveUsers.map((user, index) => (
                            <div key={user.userId} className="flex items-center justify-between">
                              <div className="flex items-center">
                                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                                  index === 0 ? 'bg-yellow-100 text-yellow-800' :
                                  index === 1 ? 'bg-gray-100 text-gray-800' :
                                  index === 2 ? 'bg-orange-100 text-orange-800' :
                                  'bg-blue-100 text-blue-800'
                                }`}>
                                  {index + 1}
                                </span>
                                <span className="ml-3 text-sm text-gray-900">{user.username}</span>
                              </div>
                              <span className="text-sm font-medium text-gray-600">
                                {formatNumber(user.activityCount)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <div className="bg-white border border-gray-200 rounded-lg p-6">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">热门任务</h3>
                        <div className="space-y-3">
                          {comprehensiveReport.topMetrics.popularTasks.map((task, index) => (
                            <div key={task.taskId} className="flex items-center justify-between">
                              <div className="flex items-center">
                                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                                  index === 0 ? 'bg-yellow-100 text-yellow-800' :
                                  index === 1 ? 'bg-gray-100 text-gray-800' :
                                  index === 2 ? 'bg-orange-100 text-orange-800' :
                                  'bg-blue-100 text-blue-800'
                                }`}>
                                  {index + 1}
                                </span>
                                <span className="ml-3 text-sm text-gray-900 truncate">{task.title}</span>
                              </div>
                              <span className="text-sm font-medium text-gray-600">
                                {formatNumber(task.completionCount)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <div className="bg-white border border-gray-200 rounded-lg p-6">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">热门奖励</h3>
                        <div className="space-y-3">
                          {comprehensiveReport.topMetrics.topRewards.map((reward, index) => (
                            <div key={reward.rewardType} className="flex items-center justify-between">
                              <div className="flex items-center">
                                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                                  index === 0 ? 'bg-yellow-100 text-yellow-800' :
                                  index === 1 ? 'bg-gray-100 text-gray-800' :
                                  index === 2 ? 'bg-orange-100 text-orange-800' :
                                  'bg-blue-100 text-blue-800'
                                }`}>
                                  {index + 1}
                                </span>
                                <span className="ml-3 text-sm text-gray-900">{reward.rewardType}</span>
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-medium text-gray-900">
                                  {formatNumber(reward.totalAmount)}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {formatNumber(reward.recipientCount)} 人
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 用户增长标签页 */}
                {activeTab === 'users' && reportData && (
                  <div className="space-y-6">
                    <div className="h-80">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">用户增长趋势</h3>
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={reportData.userGrowth}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" tickFormatter={formatDate} />
                          <YAxis />
                          <Tooltip labelFormatter={formatDate} />
                          <Area type="monotone" dataKey="newUsers" stackId="1" stroke={COLORS[0]} fill={COLORS[0]} name="新用户" />
                          <Area type="monotone" dataKey="activeUsers" stackId="2" stroke={COLORS[1]} fill={COLORS[1]} name="活跃用户" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                    
                    <div className="h-80">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">累计用户数</h3>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={reportData.userGrowth}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" tickFormatter={formatDate} />
                          <YAxis />
                          <Tooltip labelFormatter={formatDate} />
                          <Line type="monotone" dataKey="totalUsers" stroke={COLORS[2]} strokeWidth={2} name="总用户数" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* 任务完成标签页 */}
                {activeTab === 'tasks' && reportData && (
                  <div className="space-y-6">
                    <div className="h-80">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">任务完成情况</h3>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={reportData.taskCompletion}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" tickFormatter={formatDate} />
                          <YAxis />
                          <Tooltip labelFormatter={formatDate} />
                          <Bar dataKey="completedTasks" fill={COLORS[1]} name="已完成任务" />
                          <Bar dataKey="totalTasks" fill={COLORS[0]} name="总任务数" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    
                    <div className="h-80">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">任务完成率</h3>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={reportData.taskCompletion}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" tickFormatter={formatDate} />
                          <YAxis tickFormatter={formatPercentage} />
                          <Tooltip labelFormatter={formatDate} formatter={(value: number) => formatPercentage(value)} />
                          <Line type="monotone" dataKey="completionRate" stroke={COLORS[3]} strokeWidth={2} name="完成率" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* 奖励分发标签页 */}
                {activeTab === 'rewards' && reportData && (
                  <div className="space-y-6">
                    <div className="h-80">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">奖励分发趋势</h3>
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={reportData.rewardDistribution}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" tickFormatter={formatDate} />
                          <YAxis />
                          <Tooltip labelFormatter={formatDate} />
                          <Area type="monotone" dataKey="totalRewards" stroke={COLORS[2]} fill={COLORS[2]} name="总奖励" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="h-80">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">获奖用户数</h3>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={reportData.rewardDistribution}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" tickFormatter={formatDate} />
                            <YAxis />
                            <Tooltip labelFormatter={formatDate} />
                            <Bar dataKey="uniqueRecipients" fill={COLORS[4]} name="获奖用户" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      
                      <div className="h-80">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">平均奖励</h3>
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={reportData.rewardDistribution}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" tickFormatter={formatDate} />
                            <YAxis />
                            <Tooltip labelFormatter={formatDate} />
                            <Line type="monotone" dataKey="averageReward" stroke={COLORS[5]} strokeWidth={2} name="平均奖励" />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                )}

                {/* 锚定记录标签页 */}
                {activeTab === 'anchoring' && reportData && (
                  <div className="space-y-6">
                    <div className="h-80">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">锚定记录统计</h3>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={reportData.anchoringRecords}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" tickFormatter={formatDate} />
                          <YAxis />
                          <Tooltip labelFormatter={formatDate} />
                          <Bar dataKey="successfulRecords" fill={COLORS[1]} name="成功记录" />
                          <Bar dataKey="failedRecords" fill={COLORS[3]} name="失败记录" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    
                    <div className="h-80">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">锚定成功率</h3>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={reportData.anchoringRecords}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" tickFormatter={formatDate} />
                          <YAxis tickFormatter={formatPercentage} />
                          <Tooltip labelFormatter={formatDate} formatter={(value: number) => formatPercentage(value)} />
                          <Line type="monotone" dataKey="successRate" stroke={COLORS[0]} strokeWidth={2} name="成功率" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* 系统活跃度标签页 */}
                {activeTab === 'system' && reportData && (
                  <div className="space-y-6">
                    <div className="h-80">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">API调用量</h3>
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={reportData.systemActivity}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" tickFormatter={formatDate} />
                          <YAxis />
                          <Tooltip labelFormatter={formatDate} />
                          <Area type="monotone" dataKey="apiCalls" stroke={COLORS[0]} fill={COLORS[0]} name="API调用" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="h-80">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">错误率</h3>
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={reportData.systemActivity}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" tickFormatter={formatDate} />
                            <YAxis tickFormatter={formatPercentage} />
                            <Tooltip labelFormatter={formatDate} formatter={(value: number) => formatPercentage(value)} />
                            <Line type="monotone" dataKey="errorRate" stroke={COLORS[3]} strokeWidth={2} name="错误率" />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                      
                      <div className="h-80">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">响应时间</h3>
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={reportData.systemActivity}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" tickFormatter={formatDate} />
                            <YAxis />
                            <Tooltip labelFormatter={formatDate} formatter={(value: number) => `${value}ms`} />
                            <Line type="monotone" dataKey="responseTime" stroke={COLORS[2]} strokeWidth={2} name="响应时间" />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminReports;