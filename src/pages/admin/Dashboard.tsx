import React, { useState, useEffect } from 'react';
import { Users, CheckSquare, Anchor, Gift, TrendingUp, TrendingDown } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import AdminLayout from '@/components/admin/AdminLayout';
import { useAdmin } from '@/contexts/AdminContext';
import { toast } from 'sonner';

interface OverviewData {
  totalUsers: number;
  totalTasks: number;
  totalAnchoring: number;
  totalAnnouncements: number;
  totalRewards: number;
  userGrowthRate: number;
  taskCompletionRate: number;
  anchoringSuccessRate: number;
}

interface ChartData {
  userGrowth: Array<{ date: string; users: number; newUsers: number }>;
  taskStats: Array<{ name: string; completed: number; pending: number }>;
  anchoringStats: Array<{ date: string; success: number; failed: number }>;
  rewardStats: Array<{ type: string; amount: number; color: string }>;
}

const AdminDashboard: React.FC = () => {
  const [overviewData, setOverviewData] = useState<OverviewData | null>(null);
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('7d');
  
  const { admin } = useAdmin();

  useEffect(() => {
    fetchDashboardData();
  }, [timeRange]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('admin_token');
      
      // 获取概览数据
      const overviewResponse = await fetch('/api/admin/dashboard/overview', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      // 获取图表数据
      const chartsResponse = await fetch(`/api/admin/dashboard/charts?timeRange=${timeRange}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (overviewResponse.ok && chartsResponse.ok) {
        const overviewResult = await overviewResponse.json();
        const chartsResult = await chartsResponse.json();
        
        setOverviewData(overviewResult.data);
        setChartData(chartsResult.data);
      } else {
        toast.error('获取仪表盘数据失败');
      }
    } catch (error) {
      console.error('Dashboard data fetch error:', error);
      toast.error('获取数据失败，请检查网络连接');
    } finally {
      setLoading(false);
    }
  };

  const StatCard: React.FC<{
    title: string;
    value: number;
    icon: React.ElementType;
    trend?: number;
    suffix?: string;
  }> = ({ title, value, icon: Icon, trend, suffix = '' }) => {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-bold text-gray-900">
              {value.toLocaleString()}{suffix}
            </p>
            {trend !== undefined && (
              <div className={`flex items-center mt-2 text-sm ${
                trend >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {trend >= 0 ? (
                  <TrendingUp className="h-4 w-4 mr-1" />
                ) : (
                  <TrendingDown className="h-4 w-4 mr-1" />
                )}
                {Math.abs(trend)}%
              </div>
            )}
          </div>
          <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
            <Icon className="h-6 w-6 text-blue-600" />
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-80 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="px-4 sm:px-6 lg:px-8">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">仪表盘</h1>
          <p className="mt-2 text-sm text-gray-600">
            欢迎回来，{admin?.username}！这里是系统概览数据。
          </p>
        </div>

        {/* 时间范围选择 */}
        <div className="mb-6">
          <div className="flex space-x-2">
            {[
              { value: '7d', label: '最近7天' },
              { value: '30d', label: '最近30天' },
              { value: '90d', label: '最近90天' }
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => setTimeRange(option.value)}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  timeRange === option.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* 统计卡片 */}
        {overviewData && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
            <StatCard
              title="总用户数"
              value={overviewData.totalUsers}
              icon={Users}
              trend={overviewData.userGrowthRate}
            />
            <StatCard
              title="总任务数"
              value={overviewData.totalTasks}
              icon={CheckSquare}
              trend={overviewData.taskCompletionRate}
              suffix="%"
            />
            <StatCard
              title="锚定记录"
              value={overviewData.totalAnchoring}
              icon={Anchor}
              trend={overviewData.anchoringSuccessRate}
              suffix="%"
            />
            <StatCard
              title="公告数量"
              value={overviewData.totalAnnouncements}
              icon={Gift}
            />
            <StatCard
              title="奖励发放"
              value={overviewData.totalRewards}
              icon={Gift}
            />
          </div>
        )}

        {/* 图表区域 */}
        {chartData && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 用户增长趋势 */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">用户增长趋势</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData.userGrowth}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="users" stroke="#3B82F6" strokeWidth={2} />
                  <Line type="monotone" dataKey="newUsers" stroke="#10B981" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* 任务完成统计 */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">任务完成统计</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData.taskStats}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="completed" fill="#10B981" />
                  <Bar dataKey="pending" fill="#F59E0B" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* 锚定记录统计 */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">锚定记录统计</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData.anchoringStats}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="success" stroke="#10B981" strokeWidth={2} />
                  <Line type="monotone" dataKey="failed" stroke="#EF4444" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* 奖励类型分布 */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">奖励类型分布</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={chartData.rewardStats}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="amount"
                  >
                    {chartData.rewardStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;