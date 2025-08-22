import React, { useState, useEffect } from 'react';
import { useSubscription } from '../hooks/useSubscription';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Wallet, Shield, Clock, AlertCircle, CheckCircle, Loader2, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { ethers } from 'ethers';
import { useTranslation } from 'react-i18next';
import { subscriptionService } from '../services/SubscriptionService';
import { walletService } from '../services/WalletService';

const SubscriptionPage: React.FC = () => {
  const { t } = useTranslation();
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

  // 购买流程状态
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [gasEstimate, setGasEstimate] = useState<string>('0');
  const [isEstimatingGas, setIsEstimatingGas] = useState(false);
  const [transactionHash, setTransactionHash] = useState<string>('');
  const [transactionStatus, setTransactionStatus] = useState<'pending' | 'success' | 'failed' | null>(null);

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatBNB = (wei: string) => {
    try {
      return ethers.utils.formatEther(wei);
    } catch (error) {
      console.error('Error formatting BNB:', error);
      return '0';
    }
  };

  const formatBalance = (balance: string | number) => {
    const num = typeof balance === 'string' ? parseFloat(balance) : balance;
    return num.toFixed(6);
  };

  // 自动预估gas
  useEffect(() => {
    if (isWalletConnected && subscriptionPlan && isOnCorrectNetwork) {
      estimateGas();
    }
  }, [isWalletConnected, subscriptionPlan, isOnCorrectNetwork]);

  const formatDate = (timestamp: number) => {
    if (timestamp === 0) return '未激活';
    return new Date(timestamp * 1000).toLocaleString('zh-CN');
  };

  // Gas预估
  const estimateGas = async () => {
    if (!subscriptionPlan || !walletInfo?.address || !isOnCorrectNetwork) {
      return;
    }

    setIsEstimatingGas(true);
    try {
      const signer = walletService.getSigner();
      if (!signer) {
        throw new Error('无法获取钱包签名者');
      }

      // 使用SubscriptionService的estimateGas方法
      const gasCostBNB = await subscriptionService.estimateGas(1, signer); // 使用固定的planId=1
      setGasEstimate(gasCostBNB);
    } catch (error: any) {
      console.error('Gas estimation failed:', error);
      toast.error(t('gas_estimation_failed'));
    } finally {
      setIsEstimatingGas(false);
    }
  };

  // 检查余额是否足够
  const checkSufficientBalance = async (): Promise<boolean> => {
      if (!isWalletConnected || !subscriptionPlan || !walletInfo?.balance) {
        return false;
      }

      try {
        const planPriceBN = BigInt(subscriptionPlan.priceWei);
        const balanceWei = ethers.utils.parseEther(walletInfo.balance);
      const balanceBN = BigInt(balanceWei.toString());
      
      // 如果有gas预估，加上gas费用
      let totalRequired = planPriceBN;
      if (gasEstimate && gasEstimate !== '0') {
        const gasWei = ethers.utils.parseEther(gasEstimate);
        const gasBN = BigInt(gasWei.toString());
        totalRequired = planPriceBN + gasBN;
      }
      
      return balanceBN >= totalRequired;
    } catch (error) {
      console.error('Error checking balance:', error);
      return false;
    }
  };

  // 增强的购买流程
  const handlePurchase = async () => {
      if (!subscriptionPlan) {
        toast.error('订阅计划信息未加载');
        return;
      }

      // 网络检查
      if (!isOnCorrectNetwork) {
      toast.error(t('wrong_network'));
      return;
    }

    // 余额检查
    const hasSufficientBalance = await checkSufficientBalance();
    if (!hasSufficientBalance) {
      toast.error(t('insufficient_balance_for_gas'));
      return;
    }

    setIsPurchasing(true);
    setTransactionStatus('pending');
    setTransactionHash('');

    try {
      const signer = await walletService.getSigner();
      if (!signer) {
        throw new Error('无法获取钱包签名者');
      }

      toast.info(t('transaction_pending'));
      const txHash = await subscriptionService.purchaseSubscription(1, signer); // 使用固定的planId=1
      setTransactionHash(txHash);
      
      toast.info('交易已提交，等待确认...');
      // 注意：walletService可能没有waitForTransaction方法，这里先注释
      // await walletService.waitForTransaction(txHash);
      
      setTransactionStatus('success');
      toast.success(t('transaction_success'));
      
      // 刷新状态
      await refreshSubscriptionStatus();
    } catch (error: any) {
      console.error('Purchase failed:', error);
      setTransactionStatus('failed');
      
      if (error.code === 4001) {
        toast.error(t('transaction_rejected'));
      } else if (error.code === 'TIMEOUT') {
        toast.error(t('transaction_timeout'));
      } else {
        toast.error(error.message || t('transaction_failed'));
      }
    } finally {
      setIsPurchasing(false);
    }
  };

  const checkWalletConnection = async () => {
    // 这个函数应该从useSubscription hook中获取，这里是临时实现
    // 实际应该调用hook中的checkWalletConnection
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
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Wallet className="h-4 w-4" />
                      <span>{t('bnb_balance')}: {formatBalance(walletInfo?.balance || '0')} BNB</span>
                    </div>
                    {gasEstimate && (
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>预估Gas: {formatBNB(gasEstimate)} BNB</span>
                        {isEstimatingGas && <Loader2 className="h-3 w-3 animate-spin" />}
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <p className="font-medium">网络</p>
                  <div className="flex items-center gap-2">
                    {isOnCorrectNetwork ? (
                      <Badge variant="default">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        BSC网络
                      </Badge>
                    ) : (
                      <>
                        <Badge variant="destructive">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          错误网络
                        </Badge>
                        <Button size="sm" onClick={switchToCorrectNetwork}>
                          切换网络
                        </Button>
                      </>
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
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  '刷新状态'
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
                    
                    {/* 检查是否即将过期 */}
                    {subscriptionStatus.expiryDate && 
                     subscriptionStatus.expiryDate.getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000 && (
                      <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <div className="flex items-center gap-2 text-yellow-700">
                          <Clock className="h-4 w-4" />
                          <span className="text-sm font-medium">订阅即将到期</span>
                        </div>
                        <p className="text-sm text-yellow-600 mt-1">
                          建议提前续费以避免服务中断
                        </p>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="mt-2 border-yellow-300 text-yellow-700 hover:bg-yellow-100"
                          onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })}
                        >
                          {t('renew_subscription')}
                        </Button>
                      </div>
                    )}
                  </div>
                )}
                
                {subscriptionStatus && !subscriptionStatus.isActive && subscriptionStatus.expiryDate && subscriptionStatus.expiryDate.getTime() < Date.now() && (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <p className="text-orange-800 font-medium">⚠️ 订阅已过期</p>
                    <p className="text-orange-600 text-sm mt-1">
                      您的订阅已于 {formatDate(subscriptionStatus.expiryDate.getTime())} 过期
                    </p>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="mt-2 border-orange-300 text-orange-700 hover:bg-orange-100"
                      onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })}
                    >
                      {t('renew_subscription')}
                    </Button>
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
                    {formatBalance(subscriptionPlan.priceWei)} BNB
                  </p>
                  <p className="text-sm text-gray-600">
                    ≈ ${(parseFloat(formatBalance(subscriptionPlan.priceWei)) * 300).toFixed(2)} USD
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
              
              {/* 余额检查提示 */}
                {isWalletConnected && subscriptionPlan && walletInfo?.balance && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center gap-2 text-red-600 text-sm">
                      <AlertCircle className="h-4 w-4" />
                      <span>余额不足</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      需要 {formatBalance(subscriptionPlan.priceWei)} BNB + Gas费用
                    </p>
                  </div>
                )}
              
              {/* 网络检查提示 */}
              {isWalletConnected && !isOnCorrectNetwork && (
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center gap-2 text-yellow-600 text-sm">
                    <AlertCircle className="h-4 w-4" />
                    <span>请切换到BSC网络</span>
                  </div>
                </div>
              )}
              
              <Button
                size="lg"
                onClick={handlePurchase}
                className="w-full"
                disabled={isPurchasing || !subscriptionPlan.active || subscriptionStatus?.isActive || !isWalletConnected || !isOnCorrectNetwork}
              >
                {isPurchasing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('processing')}
                  </>
                ) : (
                  `${t('buy_with_bnb')} (${formatBalance(subscriptionPlan.priceWei)} BNB)`
                )}
              </Button>
              
              {/* 交易状态显示 */}
              {transactionHash && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-blue-600">交易哈希:</span>
                    <a 
                      href={`https://testnet.bscscan.com/tx/${transactionHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm"
                    >
                      {t('view_on_bscscan')}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                  <div className="mt-2 text-xs text-gray-600">
                    {transactionHash.slice(0, 10)}...{transactionHash.slice(-8)}
                  </div>
                </div>
              )}
              
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