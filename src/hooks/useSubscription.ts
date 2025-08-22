import { useState, useEffect, useCallback } from 'react';
import { subscriptionService, SubscriptionStatus, SubscriptionPlan } from '../services/SubscriptionService';
import { walletService, WalletInfo } from '../services/WalletService';
import { toast } from 'sonner';

export interface UseSubscriptionReturn {
  // 钱包状态
  walletInfo: WalletInfo | null;
  isWalletConnected: boolean;
  isConnecting: boolean;
  
  // 订阅状态
  subscriptionStatus: SubscriptionStatus | null;
  subscriptionPlan: SubscriptionPlan | null;
  isLoadingSubscription: boolean;
  
  // 操作方法
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  refreshSubscriptionStatus: () => Promise<void>;
  purchaseSubscription: (planId: number) => Promise<void>;
  
  // 网络状态
  isOnCorrectNetwork: boolean;
  switchToCorrectNetwork: () => Promise<void>;
}

export function useSubscription(): UseSubscriptionReturn {
  const [walletInfo, setWalletInfo] = useState<WalletInfo | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);
  const [subscriptionPlan, setSubscriptionPlan] = useState<SubscriptionPlan | null>(null);
  const [isLoadingSubscription, setIsLoadingSubscription] = useState(false);
  const [isOnCorrectNetwork, setIsOnCorrectNetwork] = useState(false);

  // 检查钱包连接状态
  const checkWalletConnection = useCallback(async () => {
    try {
      const info = await walletService.getWalletInfo();
      setWalletInfo(info);
      
      if (info) {
        const isCorrectNetwork = await walletService.isOnBSCNetwork();
        setIsOnCorrectNetwork(isCorrectNetwork);
      }
    } catch (error) {
      console.error('Error checking wallet connection:', error);
      setWalletInfo(null);
      setIsOnCorrectNetwork(false);
    }
  }, []);

  // 连接钱包
  const connectWallet = useCallback(async () => {
    if (!walletService.isMetaMaskInstalled()) {
      toast.error('请安装MetaMask钱包');
      return;
    }

    setIsConnecting(true);
    try {
      const info = await walletService.connectWallet();
      setWalletInfo(info);
      
      if (info) {
        const isCorrectNetwork = await walletService.isOnBSCNetwork();
        setIsOnCorrectNetwork(isCorrectNetwork);
        
        if (!isCorrectNetwork) {
          toast.warning('请切换到BSC网络');
        } else {
          toast.success('钱包连接成功');
        }
      }
    } catch (error: any) {
      console.error('Error connecting wallet:', error);
      toast.error(error.message || '连接钱包失败');
    } finally {
      setIsConnecting(false);
    }
  }, []);

  // 断开钱包连接
  const disconnectWallet = useCallback(() => {
    walletService.disconnectWallet();
    setWalletInfo(null);
    setSubscriptionStatus(null);
    setIsOnCorrectNetwork(false);
    toast.info('钱包已断开连接');
  }, []);

  // 切换到正确的网络
  const switchToCorrectNetwork = useCallback(async () => {
    try {
      await walletService.switchToBSCNetwork();
      setIsOnCorrectNetwork(true);
      toast.success('已切换到BSC网络');
    } catch (error: any) {
      console.error('Error switching network:', error);
      toast.error(error.message || '切换网络失败');
    }
  }, []);

  // 刷新订阅状态
  const refreshSubscriptionStatus = useCallback(async () => {
    if (!walletInfo?.address) {
      setSubscriptionStatus(null);
      return;
    }

    setIsLoadingSubscription(true);
    try {
      const status = await subscriptionService.getSubscriptionStatus(walletInfo.address);
      setSubscriptionStatus(status);
    } catch (error) {
      console.error('Error refreshing subscription status:', error);
      toast.error('获取订阅状态失败');
    } finally {
      setIsLoadingSubscription(false);
    }
  }, [walletInfo?.address]);

  // 购买订阅
  const purchaseSubscription = useCallback(async (planId: number) => {
    if (!walletInfo?.isConnected) {
      toast.error('请先连接钱包');
      return;
    }

    if (!isOnCorrectNetwork) {
      toast.error('请切换到BSC网络');
      return;
    }

    const signer = walletService.getSigner();
    if (!signer) {
      toast.error('无法获取钱包签名者');
      return;
    }

    try {
      toast.info('正在处理购买请求...');
      const txHash = await subscriptionService.purchaseSubscription(planId, signer);
      
      toast.info('交易已提交，等待确认...');
      await walletService.waitForTransaction(txHash);
      
      toast.success('订阅购买成功！');
      
      // 刷新订阅状态和钱包余额
      await Promise.all([
        refreshSubscriptionStatus(),
        checkWalletConnection()
      ]);
    } catch (error: any) {
      console.error('Error purchasing subscription:', error);
      toast.error(error.message || '购买订阅失败');
    }
  }, [walletInfo?.isConnected, isOnCorrectNetwork, refreshSubscriptionStatus, checkWalletConnection]);

  // 加载订阅计划信息
  const loadSubscriptionPlan = useCallback(async () => {
    try {
      const plan = await subscriptionService.getPlan(1); // 默认加载计划ID为1的订阅
      setSubscriptionPlan(plan);
    } catch (error) {
      console.error('Error loading subscription plan:', error);
    }
  }, []);

  // 监听钱包事件
  useEffect(() => {
    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        disconnectWallet();
      } else {
        checkWalletConnection();
      }
    };

    const handleChainChanged = () => {
      checkWalletConnection();
    };

    walletService.onAccountsChanged(handleAccountsChanged);
    walletService.onChainChanged(handleChainChanged);

    return () => {
      walletService.removeAllListeners();
    };
  }, [checkWalletConnection, disconnectWallet]);

  // 初始化
  useEffect(() => {
    checkWalletConnection();
    loadSubscriptionPlan();
  }, [checkWalletConnection, loadSubscriptionPlan]);

  // 当钱包连接且在正确网络时，刷新订阅状态
  useEffect(() => {
    if (walletInfo?.isConnected && isOnCorrectNetwork) {
      refreshSubscriptionStatus();
    }
  }, [walletInfo?.isConnected, isOnCorrectNetwork, refreshSubscriptionStatus]);

  return {
    // 钱包状态
    walletInfo,
    isWalletConnected: !!walletInfo?.isConnected,
    isConnecting,
    
    // 订阅状态
    subscriptionStatus,
    subscriptionPlan,
    isLoadingSubscription,
    
    // 操作方法
    connectWallet,
    disconnectWallet,
    refreshSubscriptionStatus,
    purchaseSubscription,
    
    // 网络状态
    isOnCorrectNetwork,
    switchToCorrectNetwork,
  };
}