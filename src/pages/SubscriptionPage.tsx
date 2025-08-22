import React from 'react';
import { useSubscription } from '../hooks/useSubscription';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Wallet, Shield, Clock, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const SubscriptionPage: React.FC = () => {
  const {
    walletInfo,
    isWalletConnected,
    isConnecting,
    subscriptionStatus,
    subscriptionPlan,
    isLoadingSubscription,
    connectWallet,
    disconnectWallet,
    refreshSubscriptionStatus,
    purchaseSubscription,
    isOnCorrectNetwork,
    switchToCorrectNetwork,
  } = useSubscription();

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatBNB = (wei: string) => {
    try {
      const bnb = parseFloat(wei) / Math.pow(10, 18);
      return bnb.toFixed(4);
    } catch {
      return '0.0000';
    }
  };

  const formatDate = (timestamp: number) => {
    if (timestamp === 0) return '未激活';
    return new Date(timestamp * 1000).toLocaleString('zh-CN');
  };

  const handlePurchase = async () => {
    if (!subscriptionPlan) {
      toast.error('订阅计划信息未加载');
      return;
    }
    await purchaseSubscription(1); // 使用planId 1
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('已复制到剪贴板');
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">订阅管理</h1>
        <p className="text-gray-600">管理您的区块链订阅服务</p>
      </div>

      {/* 钱包连接状态 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            钱包连接
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!isWalletConnected ? (
            <div className="text-center py-4">
              <p className="text-gray-600 mb-4">请连接您的MetaMask钱包以继续</p>
              <Button 
                onClick={connectWallet} 
                disabled={isConnecting}
                className="w-full sm:w-auto"
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    连接中...
                  </>
                ) : (
                  '连接钱包'
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">钱包地址</p>
                  <p 
                    className="text-sm text-gray-600 cursor-pointer hover:text-blue-600"
                    onClick={() => copyToClipboard(walletInfo?.address || '')}
                    title="点击复制完整地址"
                  >
                    {formatAddress(walletInfo?.address || '')}
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={disconnectWallet}>
                  断开连接
                </Button>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">余额</p>
                  <p className="text-sm text-gray-600">
                    {formatBNB(walletInfo?.balance || '0')} BNB
                  </p>
                </div>
                <div>
                  <p className="font-medium">网络</p>
                  <div className="flex items-center gap-2">
                    {isOnCorrectNetwork ? (
                      <Badge variant="default" className="bg-green-100 text-green-800">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        BSC测试网
                      </Badge>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Badge variant="destructive">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          错误网络
                        </Badge>
                        <Button size="sm" onClick={switchToCorrectNetwork}>
                          切换网络
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 订阅状态 */}
      {isWalletConnected && isOnCorrectNetwork && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              订阅状态
              <Button 
                variant="outline" 
                size="sm" 
                onClick={refreshSubscriptionStatus}
                disabled={isLoadingSubscription}
              >
                {isLoadingSubscription ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  '刷新'
                )}
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingSubscription ? (
              <div className="text-center py-4">
                <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                <p className="text-gray-600">加载订阅状态中...</p>
              </div>
            ) : subscriptionStatus ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">订阅状态</p>
                    <div className="flex items-center gap-2 mt-1">
                      {subscriptionStatus.isActive ? (
                        <Badge variant="default" className="bg-green-100 text-green-800">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          已激活
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          未激活
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="font-medium">到期时间</p>
                    <p className="text-sm text-gray-600 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {subscriptionStatus.expiryDate ? formatDate(subscriptionStatus.expiryDate.getTime()) : 'N/A'}
                    </p>
                  </div>
                </div>
                
                {subscriptionStatus.isActive && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-green-800 font-medium">✅ 您的订阅服务正常运行</p>
                    <p className="text-green-600 text-sm mt-1">
                      订阅将于 {subscriptionStatus.expiryDate ? formatDate(subscriptionStatus.expiryDate.getTime()) : 'N/A'} 到期
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-gray-600">无法获取订阅状态</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 订阅计划 */}
      {subscriptionPlan && isWalletConnected && isOnCorrectNetwork && (
        <Card>
          <CardHeader>
            <CardTitle>订阅计划</CardTitle>
            <CardDescription>
              选择适合您的订阅计划
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold">{subscriptionPlan.name}</h3>
                  <p className="text-gray-600">有效期：{subscriptionPlan.periodDays} 天</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">
                    {formatBNB(subscriptionPlan.priceWei)} BNB
                  </p>
                  <p className="text-sm text-gray-600">
                    ≈ ${(parseFloat(formatBNB(subscriptionPlan.priceWei)) * 300).toFixed(2)} USD
                  </p>
                </div>
              </div>
              
              <div className="space-y-2 mb-6">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm">完整功能访问权限</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm">优先客户支持</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm">无限制使用</span>
                </div>
              </div>
              
              <Button 
                onClick={handlePurchase}
                className="w-full"
                disabled={!subscriptionPlan.active || subscriptionStatus?.isActive}
              >
                {subscriptionStatus?.isActive ? '已订阅' : 
                 !subscriptionPlan.active ? '暂不可用' : 
                 `购买订阅 - ${formatBNB(subscriptionPlan.priceWei)} BNB`}
              </Button>
              
              {!subscriptionPlan.active && (
                <p className="text-sm text-gray-500 text-center mt-2">
                  此订阅计划暂时不可用
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 调试信息 */}
      {process.env.NODE_ENV === 'development' && (
        <Card className="mt-6 border-dashed">
          <CardHeader>
            <CardTitle className="text-sm">调试信息</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs bg-gray-100 p-4 rounded overflow-auto">
              {JSON.stringify({
                walletInfo,
                subscriptionStatus,
                subscriptionPlan,
                isOnCorrectNetwork
              }, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SubscriptionPage;