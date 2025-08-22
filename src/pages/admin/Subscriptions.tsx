import React, { useState, useEffect } from 'react';
import { CreditCard, DollarSign, Calendar, CheckCircle, XCircle, Copy, ExternalLink, Wallet, TrendingUp, Plus, Edit, ToggleLeft, Shield } from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import { toast } from 'sonner';
import { ethers } from 'ethers';
import SubscriptionManagerABI from '@/contracts/SubscriptionManager.json';

// 合约配置
const SUBSCRIPTION_MANAGER_ADDRESS = import.meta.env.VITE_SUBSCRIPTION_MANAGER_ADDRESS || '0x9c7920f113B27De6a57bbCF53D6111cbA5532498';
const BSC_TESTNET_RPC_URL = import.meta.env.VITE_BSC_TESTNET_RPC_URL || 'https://data-seed-prebsc-1-s1.binance.org:8545/';
const BSC_TESTNET_CHAIN_ID = 97;

interface SubscriptionPlan {
  planId: number;
  priceWei: string;
  periodDays: number;
  active: boolean;
  name: string;
}

interface ContractRevenue {
  totalRevenue: string;
  contractBalance: string;
}

const Subscriptions: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'plans' | 'revenue'>('plans');
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [revenue, setRevenue] = useState<ContractRevenue | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 初始化provider和contract
  const provider = new ethers.providers.JsonRpcProvider(BSC_TESTNET_RPC_URL);
  const contract = new ethers.Contract(
    SUBSCRIPTION_MANAGER_ADDRESS,
    SubscriptionManagerABI.abi,
    provider
  );

  // 加载订阅计划数据
  const loadPlans = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // 获取下一个计划ID来确定有多少个计划
      const nextPlanId = await contract.nextPlanId();
      const planCount = nextPlanId.toNumber() - 1;
      
      const plansData: SubscriptionPlan[] = [];
      
      for (let i = 1; i <= planCount; i++) {
        try {
          const planData = await contract.getPlan(i);
          plansData.push({
            planId: i,
            priceWei: planData.priceWei.toString(),
            periodDays: planData.periodDays.toNumber(),
            active: planData.active,
            name: getPlanName(i, planData.periodDays)
          });
        } catch (err) {
          console.warn(`Failed to load plan ${i}:`, err);
        }
      }
      
      setPlans(plansData);
    } catch (err) {
      console.error('Failed to load plans:', err);
      setError('加载订阅计划失败');
    } finally {
      setLoading(false);
    }
  };

  // 加载收入数据
  const loadRevenue = async () => {
    try {
      const [totalRevenue, contractBalance] = await Promise.all([
        contract.totalRevenue(),
        provider.getBalance(SUBSCRIPTION_MANAGER_ADDRESS)
      ]);
      
      setRevenue({
        totalRevenue: totalRevenue.toString(),
        contractBalance: contractBalance.toString()
      });
    } catch (err) {
      console.error('Failed to load revenue:', err);
      setError('加载收入数据失败');
    }
  };

  useEffect(() => {
    loadPlans();
    loadRevenue();
  }, []);

  // 复制到剪贴板
  const copyToClipboard = (text: string, label: string = '内容') => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success(`${label}已复制到剪贴板`);
    }).catch(() => {
      toast.error('复制失败');
    });
  };

  // 格式化BNB金额
  const formatBNB = (weiAmount: string) => {
    return parseFloat(ethers.utils.formatEther(weiAmount)).toFixed(4);
  };

  // 获取计划名称
  const getPlanName = (planId: number, periodDays: number) => {
    const planNames: { [key: number]: string } = {
      1: '基础版',
      2: '专业版', 
      3: '企业版'
    };
    return planNames[planId] || `${periodDays}天计划`;
  };

  // Hardhat脚本命令
  const scriptCommands = {
    addPlan: `npx hardhat run scripts/addSubscriptionPlan.js --network bnbt`,
    updatePlan: `npx hardhat run scripts/updateSubscriptionPlan.js --network bnbt`,
    pausePlan: `npx hardhat run scripts/pauseSubscriptionPlan.js --network bnbt`,
    withdraw: `npx hardhat run scripts/withdrawSubscriptionFunds.js --network bnbt`,
    pause: `npx hardhat run scripts/pauseSubscriptionManager.js --network bnbt`,
    unpause: `npx hardhat run scripts/unpauseSubscriptionManager.js --network bnbt`
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
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
          <h1 className="text-2xl font-bold text-gray-900">订阅管理</h1>
          <p className="mt-2 text-sm text-gray-600">
            管理订阅计划、查看收入统计和执行链上操作脚本。
          </p>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <XCircle className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">错误</h3>
                <div className="mt-2 text-sm text-red-700">{error}</div>
              </div>
            </div>
          </div>
        )}

        {/* 标签页导航 */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('plans')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'plans'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <CreditCard className="w-4 h-4 inline mr-2" />
              订阅计划
            </button>
            <button
              onClick={() => setActiveTab('revenue')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'revenue'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <TrendingUp className="w-4 h-4 inline mr-2" />
              订阅收入
            </button>
          </nav>
        </div>

        {/* 订阅计划标签页 */}
        {activeTab === 'plans' && (
          <div className="space-y-6">
            {/* 计划列表 */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  当前订阅计划
                </h3>
                
                {plans.length === 0 ? (
                  <div className="text-center py-8">
                    <CreditCard className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">暂无订阅计划</h3>
                    <p className="mt-1 text-sm text-gray-500">使用下方脚本添加新的订阅计划。</p>
                  </div>
                ) : (
                  <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                    <table className="min-w-full divide-y divide-gray-300">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            计划ID
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            价格 (BNB)
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            周期 (天)
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            状态
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            计划名称
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {plans.map((plan) => (
                          <tr key={plan.planId}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              #{plan.planId}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatBNB(plan.priceWei)} BNB
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {plan.periodDays} 天
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {plan.active ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  启用
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                  <XCircle className="w-3 h-3 mr-1" />
                                  禁用
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {plan.name}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* 脚本指引 */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  链上操作脚本
                </h3>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center">
                    <XCircle className="h-5 w-5 text-yellow-600 mr-2" />
                    <p className="text-yellow-800 font-medium">重要提醒</p>
                  </div>
                  <p className="text-yellow-700 mt-2 text-sm">
                    所有链上写操作需要通过多签钱包或Owner账户执行，管理后台仅提供脚本指引，不直接发送交易。
                  </p>
                </div>
                
                <div className="space-y-4">
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                      <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                      添加新订阅计划
                    </h4>
                    <p className="text-sm text-gray-600 mb-2">创建新的订阅计划，需要指定价格(BNB)和周期(天)</p>
                    <div className="bg-gray-50 rounded p-3 font-mono text-sm">
                      <div className="flex items-center justify-between">
                        <code>{scriptCommands.addPlan}</code>
                        <button
                          onClick={() => copyToClipboard(scriptCommands.addPlan, '添加计划命令')}
                          className="ml-2 p-1 text-gray-500 hover:text-gray-700"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-gray-500">
                      参数说明：--price (BNB价格) --period (订阅天数) --network (网络)
                    </div>
                  </div>
                  
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                      <Calendar className="h-4 w-4 mr-2 text-blue-600" />
                      更新订阅计划
                    </h4>
                    <p className="text-sm text-gray-600 mb-2">修改现有订阅计划的价格或周期</p>
                    <div className="bg-gray-50 rounded p-3 font-mono text-sm">
                      <div className="flex items-center justify-between">
                        <code>{scriptCommands.updatePlan}</code>
                        <button
                          onClick={() => copyToClipboard(scriptCommands.updatePlan, '更新计划命令')}
                          className="ml-2 p-1 text-gray-500 hover:text-gray-700"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-gray-500">
                      参数说明：--plan-id (计划ID) --price (新价格) --period (新周期)
                    </div>
                  </div>
                  
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                      <XCircle className="h-4 w-4 mr-2 text-orange-600" />
                      暂停/恢复计划
                    </h4>
                    <p className="text-sm text-gray-600 mb-2">切换订阅计划的启用状态</p>
                    <div className="bg-gray-50 rounded p-3 font-mono text-sm">
                      <div className="flex items-center justify-between">
                        <code>{scriptCommands.pausePlan}</code>
                        <button
                          onClick={() => copyToClipboard(scriptCommands.pausePlan, '暂停计划命令')}
                          className="ml-2 p-1 text-gray-500 hover:text-gray-700"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-gray-500">
                      参数说明：--plan-id (要切换状态的计划ID)
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-800 mb-2">执行前准备</h4>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• 确保已配置正确的私钥或连接多签钱包</li>
                    <li>• 检查网络配置和RPC连接</li>
                    <li>• 验证合约地址：{SUBSCRIPTION_MANAGER_ADDRESS}</li>
                    <li>• 确保账户有足够的BNB支付Gas费用</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 订阅收入标签页 */}
        {activeTab === 'revenue' && (
          <div className="space-y-6">
            {/* 收入统计卡片 */}
            {revenue && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <TrendingUp className="h-6 w-6 text-green-400" />
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">
                            累计收入
                          </dt>
                          <dd className="text-lg font-medium text-gray-900">
                            {formatBNB(revenue.totalRevenue)} BNB
                          </dd>
                          <dd className="text-xs text-gray-500">
                            自合约部署以来
                          </dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <Wallet className="h-6 w-6 text-blue-400" />
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">
                            合约余额
                          </dt>
                          <dd className="text-lg font-medium text-gray-900">
                            {formatBNB(revenue.contractBalance)} BNB
                          </dd>
                          <dd className="text-xs text-gray-500">
                            可提取金额
                          </dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <DollarSign className="h-6 w-6 text-purple-400" />
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">
                            已提取
                          </dt>
                          <dd className="text-lg font-medium text-gray-900">
                            {(parseFloat(formatBNB(revenue.totalRevenue)) - parseFloat(formatBNB(revenue.contractBalance))).toFixed(4)} BNB
                          </dd>
                          <dd className="text-xs text-gray-500">
                            历史提取总额
                          </dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 合约信息 */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  合约信息
                </h3>
                
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-2">合约地址</p>
                      <div className="flex items-center space-x-2">
                        <code className="text-sm bg-gray-100 px-2 py-1 rounded font-mono">
                          {SUBSCRIPTION_MANAGER_ADDRESS}
                        </code>
                        <button
                          onClick={() => copyToClipboard(SUBSCRIPTION_MANAGER_ADDRESS, '合约地址')}
                          className="p-1 text-gray-500 hover:text-gray-700"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-2">网络</p>
                      <p className="text-sm text-gray-900 font-mono">BSC Testnet (Chain ID: {BSC_TESTNET_CHAIN_ID})</p>
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <a
                      href={`https://testnet.bscscan.com/address/${SUBSCRIPTION_MANAGER_ADDRESS}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      在 BscScan 上查看合约详情
                      <ExternalLink className="h-4 w-4 ml-1" />
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* 资金提取说明 */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  资金提取说明
                </h3>
                
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center mb-3">
                    <Shield className="h-5 w-5 text-orange-600 mr-2" />
                    <h4 className="font-medium text-orange-800">安全提醒</h4>
                  </div>
                  <div className="text-sm text-orange-700 space-y-2">
                    <p>• 合约资金提取需要通过多签钱包或Owner账户执行</p>
                    <p>• 建议定期提取资金以降低合约风险</p>
                    <p>• 提取操作会触发事件记录，便于审计追踪</p>
                    <p>• 确保账户有足够的BNB支付Gas费用</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="border border-yellow-200 bg-yellow-50 rounded-lg p-4">
                    <h4 className="font-medium text-yellow-800 mb-2">提现合约余额</h4>
                    <div className="bg-white rounded p-3 font-mono text-sm">
                      <div className="flex items-center justify-between">
                        <code>{scriptCommands.withdraw}</code>
                        <button
                          onClick={() => copyToClipboard(scriptCommands.withdraw, '提现命令')}
                          className="ml-2 p-1 text-gray-500 hover:text-gray-700"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-yellow-700">
                      参数说明：--amount (提取金额，单位BNB) --to (接收地址)
                    </div>
                  </div>
                  
                  <div className="border border-red-200 bg-red-50 rounded-lg p-4">
                    <h4 className="font-medium text-red-800 mb-2">紧急暂停合约</h4>
                    <div className="bg-white rounded p-3 font-mono text-sm">
                      <div className="flex items-center justify-between">
                        <code>{scriptCommands.pause}</code>
                        <button
                          onClick={() => copyToClipboard(scriptCommands.pause, '暂停合约命令')}
                          className="ml-2 p-1 text-gray-500 hover:text-gray-700"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-red-700">
                      暂停后将禁止所有订阅操作，仅用于紧急情况
                    </div>
                  </div>
                  
                  <div className="border border-green-200 bg-green-50 rounded-lg p-4">
                    <h4 className="font-medium text-green-800 mb-2">恢复合约</h4>
                    <div className="bg-white rounded p-3 font-mono text-sm">
                      <div className="flex items-center justify-between">
                        <code>{scriptCommands.unpause}</code>
                        <button
                          onClick={() => copyToClipboard(scriptCommands.unpause, '恢复合约命令')}
                          className="ml-2 p-1 text-gray-500 hover:text-gray-700"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-green-700">
                      恢复合约正常运行，允许用户订阅
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default Subscriptions;