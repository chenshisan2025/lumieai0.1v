import React, { useState, useEffect } from 'react';
import { Save, RefreshCw, Download, Upload, Database, Mail, Shield, Server, AlertTriangle, CheckCircle, XCircle, Settings as SettingsIcon } from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import { useAdmin } from '@/contexts/AdminContext';
import { toast } from 'sonner';

interface SystemSettings {
  general: {
    siteName: string;
    siteDescription: string;
    contactEmail: string;
    maintenanceMode: boolean;
    registrationEnabled: boolean;
    maxUsersPerDay: number;
  };
  security: {
    passwordMinLength: number;
    sessionTimeout: number;
    maxLoginAttempts: number;
    twoFactorRequired: boolean;
    ipWhitelist: string[];
  };
  blockchain: {
    networkUrl: string;
    contractAddress: string;
    gasLimit: number;
    gasPrice: string;
    confirmationBlocks: number;
  };
  email: {
    smtpHost: string;
    smtpPort: number;
    smtpUser: string;
    smtpPassword: string;
    fromEmail: string;
    fromName: string;
  };
  rewards: {
    defaultRewardAmount: number;
    maxRewardPerUser: number;
    rewardCooldown: number;
    autoRewardEnabled: boolean;
  };
}

interface SystemStatus {
  database: {
    status: 'healthy' | 'warning' | 'error';
    responseTime: number;
    connections: number;
    lastBackup: string;
  };
  blockchain: {
    status: 'healthy' | 'warning' | 'error';
    blockHeight: number;
    networkLatency: number;
    gasPrice: string;
  };
  email: {
    status: 'healthy' | 'warning' | 'error';
    lastSent: string;
    queueSize: number;
  };
  storage: {
    status: 'healthy' | 'warning' | 'error';
    usedSpace: number;
    totalSpace: number;
    freeSpace: number;
  };
}

interface SystemLog {
  id: string;
  level: 'info' | 'warning' | 'error';
  message: string;
  timestamp: string;
  source: string;
  details?: any;
}

interface BackupInfo {
  id: string;
  filename: string;
  size: number;
  createdAt: string;
  type: 'manual' | 'automatic';
  status: 'completed' | 'failed' | 'in_progress';
}

const AdminSettings: React.FC = () => {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [systemLogs, setSystemLogs] = useState<SystemLog[]>([]);
  const [backups, setBackups] = useState<BackupInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [testResults, setTestResults] = useState<Record<string, any>>({});
  const [testing, setTesting] = useState<Record<string, boolean>>({});
  
  const { admin } = useAdmin();

  useEffect(() => {
    fetchSettings();
    fetchSystemStatus();
    fetchSystemLogs();
    fetchBackups();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('admin_token');
      
      const response = await fetch('/api/admin/settings', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const result = await response.json();
        setSettings(result.data);
      } else {
        toast.error('获取设置失败');
      }
    } catch (error) {
      console.error('Fetch settings error:', error);
      toast.error('获取设置失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchSystemStatus = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      
      const response = await fetch('/api/admin/settings/status', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const result = await response.json();
        setSystemStatus(result.data);
      }
    } catch (error) {
      console.error('Fetch system status error:', error);
    }
  };

  const fetchSystemLogs = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      
      const response = await fetch('/api/admin/settings/logs?limit=50', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const result = await response.json();
        setSystemLogs(result.data);
      }
    } catch (error) {
      console.error('Fetch system logs error:', error);
    }
  };

  const fetchBackups = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      
      const response = await fetch('/api/admin/settings/backups', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const result = await response.json();
        setBackups(result.data);
      }
    } catch (error) {
      console.error('Fetch backups error:', error);
    }
  };

  const saveSettings = async () => {
    if (!settings) return;
    
    try {
      setSaving(true);
      const token = localStorage.getItem('admin_token');
      
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(settings)
      });
      
      if (response.ok) {
        toast.success('设置保存成功');
      } else {
        const error = await response.json();
        toast.error(error.message || '设置保存失败');
      }
    } catch (error) {
      console.error('Save settings error:', error);
      toast.error('设置保存失败');
    } finally {
      setSaving(false);
    }
  };

  const testConfiguration = async (type: 'database' | 'email' | 'blockchain') => {
    try {
      setTesting(prev => ({ ...prev, [type]: true }));
      const token = localStorage.getItem('admin_token');
      
      const response = await fetch(`/api/admin/settings/test/${type}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const result = await response.json();
      setTestResults(prev => ({ ...prev, [type]: result }));
      
      if (result.success) {
        toast.success(`${type} 配置测试成功`);
      } else {
        toast.error(`${type} 配置测试失败: ${result.message}`);
      }
    } catch (error) {
      console.error(`Test ${type} error:`, error);
      toast.error(`${type} 配置测试失败`);
    } finally {
      setTesting(prev => ({ ...prev, [type]: false }));
    }
  };

  const createBackup = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      
      const response = await fetch('/api/admin/settings/backup', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        toast.success('备份创建成功');
        fetchBackups();
      } else {
        const error = await response.json();
        toast.error(error.message || '备份创建失败');
      }
    } catch (error) {
      console.error('Create backup error:', error);
      toast.error('备份创建失败');
    }
  };

  const clearLogs = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      
      const response = await fetch('/api/admin/settings/logs', {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        toast.success('日志清理成功');
        fetchSystemLogs();
      } else {
        toast.error('日志清理失败');
      }
    } catch (error) {
      console.error('Clear logs error:', error);
      toast.error('日志清理失败');
    }
  };

  const updateSettings = (section: keyof SystemSettings, field: string, value: any) => {
    if (!settings) return;
    
    setSettings(prev => ({
      ...prev!,
      [section]: {
        ...prev![section],
        [field]: value
      }
    }));
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN');
  };

  const getStatusIcon = (status: 'healthy' | 'warning' | 'error') => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
    }
  };

  const getLogLevelColor = (level: string) => {
    switch (level) {
      case 'info':
        return 'text-blue-600 bg-blue-100';
      case 'warning':
        return 'text-yellow-600 bg-yellow-100';
      case 'error':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const tabs = [
    { id: 'general', label: '常规设置', icon: SettingsIcon },
    { id: 'security', label: '安全设置', icon: Shield },
    { id: 'blockchain', label: '区块链设置', icon: Server },
    { id: 'email', label: '邮件设置', icon: Mail },
    { id: 'rewards', label: '奖励设置', icon: SettingsIcon },
    { id: 'status', label: '系统状态', icon: Database },
    { id: 'logs', label: '系统日志', icon: SettingsIcon },
    { id: 'backup', label: '备份管理', icon: Download }
  ];

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="px-4 sm:px-6 lg:px-8">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">系统设置</h1>
          <p className="mt-2 text-sm text-gray-600">
            管理系统配置和监控系统状态。
          </p>
        </div>

        {/* 标签页导航 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6 overflow-x-auto">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
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
            {/* 常规设置 */}
            {activeTab === 'general' && settings && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      网站名称
                    </label>
                    <input
                      type="text"
                      value={settings.general.siteName}
                      onChange={(e) => updateSettings('general', 'siteName', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      联系邮箱
                    </label>
                    <input
                      type="email"
                      value={settings.general.contactEmail}
                      onChange={(e) => updateSettings('general', 'contactEmail', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    网站描述
                  </label>
                  <textarea
                    value={settings.general.siteDescription}
                    onChange={(e) => updateSettings('general', 'siteDescription', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    每日最大注册用户数
                  </label>
                  <input
                    type="number"
                    value={settings.general.maxUsersPerDay}
                    onChange={(e) => updateSettings('general', 'maxUsersPerDay', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="maintenanceMode"
                      checked={settings.general.maintenanceMode}
                      onChange={(e) => updateSettings('general', 'maintenanceMode', e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="maintenanceMode" className="ml-2 block text-sm text-gray-900">
                      维护模式
                    </label>
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="registrationEnabled"
                      checked={settings.general.registrationEnabled}
                      onChange={(e) => updateSettings('general', 'registrationEnabled', e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="registrationEnabled" className="ml-2 block text-sm text-gray-900">
                      允许用户注册
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* 安全设置 */}
            {activeTab === 'security' && settings && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      密码最小长度
                    </label>
                    <input
                      type="number"
                      value={settings.security.passwordMinLength}
                      onChange={(e) => updateSettings('security', 'passwordMinLength', parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      会话超时时间（分钟）
                    </label>
                    <input
                      type="number"
                      value={settings.security.sessionTimeout}
                      onChange={(e) => updateSettings('security', 'sessionTimeout', parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      最大登录尝试次数
                    </label>
                    <input
                      type="number"
                      value={settings.security.maxLoginAttempts}
                      onChange={(e) => updateSettings('security', 'maxLoginAttempts', parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    IP白名单（每行一个IP）
                  </label>
                  <textarea
                    value={settings.security.ipWhitelist.join('\n')}
                    onChange={(e) => updateSettings('security', 'ipWhitelist', e.target.value.split('\n').filter(ip => ip.trim()))}
                    rows={5}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="192.168.1.1\n10.0.0.1"
                  />
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="twoFactorRequired"
                    checked={settings.security.twoFactorRequired}
                    onChange={(e) => updateSettings('security', 'twoFactorRequired', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="twoFactorRequired" className="ml-2 block text-sm text-gray-900">
                    强制启用双因素认证
                  </label>
                </div>
              </div>
            )}

            {/* 区块链设置 */}
            {activeTab === 'blockchain' && settings && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      网络URL
                    </label>
                    <input
                      type="url"
                      value={settings.blockchain.networkUrl}
                      onChange={(e) => updateSettings('blockchain', 'networkUrl', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      合约地址
                    </label>
                    <input
                      type="text"
                      value={settings.blockchain.contractAddress}
                      onChange={(e) => updateSettings('blockchain', 'contractAddress', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Gas限制
                    </label>
                    <input
                      type="number"
                      value={settings.blockchain.gasLimit}
                      onChange={(e) => updateSettings('blockchain', 'gasLimit', parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Gas价格
                    </label>
                    <input
                      type="text"
                      value={settings.blockchain.gasPrice}
                      onChange={(e) => updateSettings('blockchain', 'gasPrice', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      确认区块数
                    </label>
                    <input
                      type="number"
                      value={settings.blockchain.confirmationBlocks}
                      onChange={(e) => updateSettings('blockchain', 'confirmationBlocks', parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => testConfiguration('blockchain')}
                    disabled={testing.blockchain}
                    className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {testing.blockchain ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Server className="h-4 w-4 mr-2" />
                    )}
                    测试连接
                  </button>
                  
                  {testResults.blockchain && (
                    <div className={`flex items-center text-sm ${
                      testResults.blockchain.success ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {testResults.blockchain.success ? (
                        <CheckCircle className="h-4 w-4 mr-1" />
                      ) : (
                        <XCircle className="h-4 w-4 mr-1" />
                      )}
                      {testResults.blockchain.message}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 邮件设置 */}
            {activeTab === 'email' && settings && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      SMTP主机
                    </label>
                    <input
                      type="text"
                      value={settings.email.smtpHost}
                      onChange={(e) => updateSettings('email', 'smtpHost', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      SMTP端口
                    </label>
                    <input
                      type="number"
                      value={settings.email.smtpPort}
                      onChange={(e) => updateSettings('email', 'smtpPort', parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      SMTP用户名
                    </label>
                    <input
                      type="text"
                      value={settings.email.smtpUser}
                      onChange={(e) => updateSettings('email', 'smtpUser', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      SMTP密码
                    </label>
                    <input
                      type="password"
                      value={settings.email.smtpPassword}
                      onChange={(e) => updateSettings('email', 'smtpPassword', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      发件人邮箱
                    </label>
                    <input
                      type="email"
                      value={settings.email.fromEmail}
                      onChange={(e) => updateSettings('email', 'fromEmail', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      发件人姓名
                    </label>
                    <input
                      type="text"
                      value={settings.email.fromName}
                      onChange={(e) => updateSettings('email', 'fromName', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => testConfiguration('email')}
                    disabled={testing.email}
                    className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {testing.email ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Mail className="h-4 w-4 mr-2" />
                    )}
                    测试邮件发送
                  </button>
                  
                  {testResults.email && (
                    <div className={`flex items-center text-sm ${
                      testResults.email.success ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {testResults.email.success ? (
                        <CheckCircle className="h-4 w-4 mr-1" />
                      ) : (
                        <XCircle className="h-4 w-4 mr-1" />
                      )}
                      {testResults.email.message}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 奖励设置 */}
            {activeTab === 'rewards' && settings && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      默认奖励金额
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={settings.rewards.defaultRewardAmount}
                      onChange={(e) => updateSettings('rewards', 'defaultRewardAmount', parseFloat(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      每用户最大奖励
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={settings.rewards.maxRewardPerUser}
                      onChange={(e) => updateSettings('rewards', 'maxRewardPerUser', parseFloat(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      奖励冷却时间（小时）
                    </label>
                    <input
                      type="number"
                      value={settings.rewards.rewardCooldown}
                      onChange={(e) => updateSettings('rewards', 'rewardCooldown', parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="autoRewardEnabled"
                    checked={settings.rewards.autoRewardEnabled}
                    onChange={(e) => updateSettings('rewards', 'autoRewardEnabled', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="autoRewardEnabled" className="ml-2 block text-sm text-gray-900">
                    启用自动奖励发放
                  </label>
                </div>
              </div>
            )}

            {/* 系统状态 */}
            {activeTab === 'status' && systemStatus && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {/* 数据库状态 */}
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-medium text-gray-900">数据库</h3>
                      {getStatusIcon(systemStatus.database.status)}
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">响应时间:</span>
                        <span className="font-medium">{systemStatus.database.responseTime}ms</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">连接数:</span>
                        <span className="font-medium">{systemStatus.database.connections}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">最后备份:</span>
                        <span className="font-medium text-xs">{formatDate(systemStatus.database.lastBackup)}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => testConfiguration('database')}
                      disabled={testing.database}
                      className="mt-4 w-full flex items-center justify-center px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      {testing.database ? (
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Database className="h-4 w-4 mr-2" />
                      )}
                      测试连接
                    </button>
                  </div>

                  {/* 区块链状态 */}
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-medium text-gray-900">区块链</h3>
                      {getStatusIcon(systemStatus.blockchain.status)}
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">区块高度:</span>
                        <span className="font-medium">{systemStatus.blockchain.blockHeight.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">网络延迟:</span>
                        <span className="font-medium">{systemStatus.blockchain.networkLatency}ms</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Gas价格:</span>
                        <span className="font-medium">{systemStatus.blockchain.gasPrice}</span>
                      </div>
                    </div>
                  </div>

                  {/* 邮件状态 */}
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-medium text-gray-900">邮件服务</h3>
                      {getStatusIcon(systemStatus.email.status)}
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">队列大小:</span>
                        <span className="font-medium">{systemStatus.email.queueSize}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">最后发送:</span>
                        <span className="font-medium text-xs">{formatDate(systemStatus.email.lastSent)}</span>
                      </div>
                    </div>
                  </div>

                  {/* 存储状态 */}
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-medium text-gray-900">存储</h3>
                      {getStatusIcon(systemStatus.storage.status)}
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">已用空间:</span>
                        <span className="font-medium">{formatBytes(systemStatus.storage.usedSpace)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">总空间:</span>
                        <span className="font-medium">{formatBytes(systemStatus.storage.totalSpace)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">可用空间:</span>
                        <span className="font-medium">{formatBytes(systemStatus.storage.freeSpace)}</span>
                      </div>
                    </div>
                    <div className="mt-4">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: `${(systemStatus.storage.usedSpace / systemStatus.storage.totalSpace) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end">
                  <button
                    onClick={fetchSystemStatus}
                    className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    刷新状态
                  </button>
                </div>
              </div>
            )}

            {/* 系统日志 */}
            {activeTab === 'logs' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium text-gray-900">系统日志</h3>
                  <div className="flex space-x-2">
                    <button
                      onClick={fetchSystemLogs}
                      className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                    >
                      <RefreshCw className="h-4 w-4 mr-1" />
                      刷新
                    </button>
                    <button
                      onClick={clearLogs}
                      className="flex items-center px-3 py-2 text-sm font-medium text-red-700 bg-red-100 rounded-lg hover:bg-red-200"
                    >
                      清理日志
                    </button>
                  </div>
                </div>
                
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <div className="max-h-96 overflow-y-auto">
                    {systemLogs.length === 0 ? (
                      <div className="p-6 text-center text-gray-500">
                        暂无日志记录
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-200">
                        {systemLogs.map((log) => (
                          <div key={log.id} className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-1">
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                    getLogLevelColor(log.level)
                                  }`}>
                                    {log.level.toUpperCase()}
                                  </span>
                                  <span className="text-sm text-gray-500">{log.source}</span>
                                </div>
                                <p className="text-sm text-gray-900">{log.message}</p>
                                {log.details && (
                                  <pre className="mt-2 text-xs text-gray-600 bg-gray-50 p-2 rounded overflow-x-auto">
                                    {JSON.stringify(log.details, null, 2)}
                                  </pre>
                                )}
                              </div>
                              <span className="text-xs text-gray-500 ml-4">
                                {formatDate(log.timestamp)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 备份管理 */}
            {activeTab === 'backup' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium text-gray-900">备份管理</h3>
                  <button
                    onClick={createBackup}
                    className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    创建备份
                  </button>
                </div>
                
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            文件名
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            大小
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            类型
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            状态
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            创建时间
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            操作
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {backups.map((backup) => (
                          <tr key={backup.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {backup.filename}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {formatBytes(backup.size)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                backup.type === 'manual' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                              }`}>
                                {backup.type === 'manual' ? '手动' : '自动'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                backup.status === 'completed' ? 'bg-green-100 text-green-800' :
                                backup.status === 'failed' ? 'bg-red-100 text-red-800' :
                                'bg-yellow-100 text-yellow-800'
                              }`}>
                                {backup.status === 'completed' ? '完成' :
                                 backup.status === 'failed' ? '失败' : '进行中'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {formatDate(backup.createdAt)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              {backup.status === 'completed' && (
                                <button className="text-blue-600 hover:text-blue-900 mr-3">
                                  下载
                                </button>
                              )}
                              <button className="text-red-600 hover:text-red-900">
                                删除
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  {backups.length === 0 && (
                    <div className="p-6 text-center text-gray-500">
                      暂无备份记录
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 保存按钮 */}
        {['general', 'security', 'blockchain', 'email', 'rewards'].includes(activeTab) && (
          <div className="flex justify-end">
            <button
              onClick={saveSettings}
              disabled={saving}
              className="flex items-center px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {saving ? '保存中...' : '保存设置'}
            </button>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminSettings;