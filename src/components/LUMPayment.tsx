import React, { useState, useEffect } from 'react';
import { Coins, Loader, AlertCircle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { ethers } from 'ethers';
import { LUMTokenService } from '@/services/LUMTokenService';
import { walletService } from '@/services/WalletService';


interface LUMPaymentProps {
  amount: number;
  onPaymentSuccess: (txHash: string) => void;
  onPaymentError: (error: string) => void;
  disabled?: boolean;
}

export default function LUMPayment({ 
  amount, 
  onPaymentSuccess, 
  onPaymentError, 
  disabled = false 
}: LUMPaymentProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [lumBalance, setLumBalance] = useState<string>('0');
  const [allowance, setAllowance] = useState<string>('0');
  const [needsApproval, setNeedsApproval] = useState(true);
  const [walletConnected, setWalletConnected] = useState(false);
  const [lumService, setLumService] = useState<LUMTokenService | null>(null);
  const [currentStep, setCurrentStep] = useState<'connect' | 'approve' | 'pay'>('connect');

  // 商城合约地址 - 这里需要替换为实际的商城合约地址
  const SHOP_CONTRACT_ADDRESS = import.meta.env.VITE_SHOP_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000';

  useEffect(() => {
    initializeWallet();
  }, []);

  useEffect(() => {
    if (lumService && walletConnected) {
      checkBalanceAndAllowance();
    }
  }, [lumService, walletConnected, amount]);

  const initializeWallet = async () => {
    try {
      if (typeof window.ethereum !== 'undefined') {
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const accounts = await provider.listAccounts();
        
        if (accounts.length > 0) {
          const signer = await provider.getSigner();
          const service = new LUMTokenService();
          setLumService(service);
          setWalletConnected(true);
          setCurrentStep('approve');
        }
      }
    } catch (error) {
      console.error('Failed to initialize wallet:', error);
    }
  };

  const connectWallet = async () => {
    setIsProcessing(true);
    try {
      if (typeof window.ethereum === 'undefined') {
        throw new Error('请安装 MetaMask 钱包');
      }

      await window.ethereum.request({ method: 'eth_requestAccounts' });
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = await provider.getSigner();
      
      const service = new LUMTokenService();
      setLumService(service);
      setWalletConnected(true);
      setCurrentStep('approve');
      
      toast.success('钱包连接成功');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '钱包连接失败';
      onPaymentError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const checkBalanceAndAllowance = async () => {
    if (!lumService || !walletConnected) return;

    try {
      const signer = await walletService.getSigner();
      if (!signer) return;
      
      const userAddress = await signer.getAddress();
      const [balance, currentAllowance] = await Promise.all([
        lumService.getBalance(userAddress),
        lumService.getAllowance(userAddress, SHOP_CONTRACT_ADDRESS)
      ]);

      setLumBalance(balance.balanceFormatted);
      setAllowance(currentAllowance.toString());
      setNeedsApproval(parseFloat(currentAllowance.toString()) < amount);
      
      if (parseFloat(currentAllowance.toString()) >= amount) {
        setCurrentStep('pay');
      }
    } catch (error) {
      console.error('Failed to check balance and allowance:', error);
    }
  };

  const handleApprove = async () => {
    if (!lumService) return;

    setIsProcessing(true);
    try {
      // 使用精确授权，只授权本次购买所需的金额
      const tx = await lumService.approveExact(SHOP_CONTRACT_ADDRESS, amount.toString());
      
      toast.loading('正在处理授权交易...', { id: 'approve-tx' });
      
      if (tx.success && tx.transaction) {
        const receipt = await tx.transaction.wait();
        toast.success(`授权成功！已授权 ${formatLUM(amount)} LUM`, { id: 'approve-tx' });
        await checkBalanceAndAllowance();
        setCurrentStep('pay');
      } else {
        throw new Error(tx.error || '授权失败');
      }
    } catch (error) {
      let errorMessage = '授权失败';
      
      if (error instanceof Error) {
        if (error.message.includes('User rejected') || error.message.includes('user rejected')) {
          errorMessage = '用户取消了授权交易';
        } else if (error.message.includes('insufficient funds')) {
          errorMessage = '账户余额不足以支付Gas费用';
        } else if (error.message.includes('Network validation failed')) {
          errorMessage = '请切换到正确的网络（BSC主网）';
        } else if (error.message.includes('Wallet not connected')) {
          errorMessage = '钱包未连接，请重新连接钱包';
        } else {
          errorMessage = error.message;
        }
      }
      
      onPaymentError(errorMessage);
      toast.error(errorMessage, { id: 'approve-tx' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePayment = async () => {
    if (!lumService) return;

    setIsProcessing(true);
    try {
      // 检查余额
      if (parseFloat(lumBalance) < amount) {
        throw new Error(`LUM 余额不足。当前余额：${formatLUM(parseFloat(lumBalance))} LUM，需要：${formatLUM(amount)} LUM`);
      }

      // 检查授权
      if (parseFloat(allowance) < amount) {
        throw new Error('授权额度不足，请重新授权');
      }

      // 这里应该调用商城合约的购买方法
      // 目前先模拟转账到商城地址
      const tx = await lumService.transfer(SHOP_CONTRACT_ADDRESS, amount.toString());
      
      toast.loading('正在处理支付交易...', { id: 'payment-tx' });
      
      if (tx.success && tx.transaction) {
        const receipt = await tx.transaction.wait();
        toast.success(`支付成功！已支付 ${formatLUM(amount)} LUM`, { id: 'payment-tx' });
        onPaymentSuccess(receipt.transactionHash);
      } else {
        throw new Error(tx.error || '支付失败');
      }
    } catch (error) {
      let errorMessage = '支付失败';
      
      if (error instanceof Error) {
        if (error.message.includes('User rejected') || error.message.includes('user rejected')) {
          errorMessage = '用户取消了支付交易';
        } else if (error.message.includes('insufficient funds')) {
          errorMessage = '账户余额不足以支付Gas费用';
        } else if (error.message.includes('Network validation failed')) {
          errorMessage = '请切换到正确的网络（BSC主网）';
        } else if (error.message.includes('Wallet not connected')) {
          errorMessage = '钱包未连接，请重新连接钱包';
        } else if (error.message.includes('LUM 余额不足')) {
          errorMessage = error.message; // 保持详细的余额信息
        } else {
          errorMessage = error.message;
        }
      }
      
      onPaymentError(errorMessage);
      toast.error(errorMessage, { id: 'payment-tx' });
    } finally {
      setIsProcessing(false);
    }
  };

  const formatLUM = (value: number) => {
    return value.toFixed(4);
  };

  return (
    <div className="p-4 bg-slate-700/50 rounded-lg border border-slate-600">
      <div className="flex items-center gap-3 mb-4">
        <Coins className="w-6 h-6 text-purple-400" />
        <span className="text-white font-semibold">LUM 代币支付</span>
      </div>

      {/* 连接钱包步骤 */}
      {currentStep === 'connect' && (
        <div className="text-center py-6">
          <p className="text-slate-400 mb-4">请连接您的钱包以使用 LUM 代币支付</p>
          <button
            onClick={connectWallet}
            disabled={isProcessing || disabled}
            className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isProcessing ? (
              <Loader className="w-5 h-5 animate-spin" />
            ) : (
              <Coins className="w-5 h-5" />
            )}
            {isProcessing ? '连接中...' : '连接钱包'}
          </button>
        </div>
      )}

      {/* 授权步骤 */}
      {currentStep === 'approve' && walletConnected && (
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
            <span className="text-slate-300">LUM 余额</span>
            <span className="text-purple-400 font-bold">{formatLUM(parseFloat(lumBalance))} LUM</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
            <span className="text-slate-300">需要支付</span>
            <span className="text-white font-bold">{formatLUM(amount)} LUM</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
            <span className="text-slate-300">当前授权</span>
            <span className="text-yellow-400 font-bold">{formatLUM(parseFloat(allowance))} LUM</span>
          </div>
          
          {parseFloat(lumBalance) < amount && (
            <div className="flex items-center gap-2 p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-400" />
              <div className="flex-1">
                <p className="text-red-300 text-sm">LUM 余额不足</p>
                <p className="text-red-400 text-xs mt-1">
                  当前余额：{formatLUM(parseFloat(lumBalance))} LUM，需要：{formatLUM(amount)} LUM
                </p>
              </div>
            </div>
          )}
          
          {needsApproval && parseFloat(lumBalance) >= amount && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 p-3 bg-yellow-500/20 border border-yellow-500/50 rounded-lg">
                <AlertCircle className="w-5 h-5 text-yellow-400" />
                <div className="flex-1">
                  <p className="text-yellow-300 text-sm">需要授权 LUM 代币</p>
                  <p className="text-yellow-400 text-xs mt-1">
                    将授权 {formatLUM(amount)} LUM 用于此次购买（精确授权，安全可控）
                  </p>
                </div>
              </div>
              <button
                onClick={handleApprove}
                disabled={isProcessing || disabled || parseFloat(lumBalance) < amount}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isProcessing ? (
                  <Loader className="w-5 h-5 animate-spin" />
                ) : (
                  <CheckCircle className="w-5 h-5" />
                )}
                {isProcessing ? '授权中...' : `授权 ${formatLUM(amount)} LUM`}
              </button>
            </div>
          )}
        </div>
      )}

      {/* 支付步骤 */}
      {currentStep === 'pay' && walletConnected && !needsApproval && (
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
            <span className="text-slate-300">LUM 余额</span>
            <span className="text-purple-400 font-bold">{formatLUM(parseFloat(lumBalance))} LUM</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
            <span className="text-slate-300">支付金额</span>
            <span className="text-white font-bold">{formatLUM(amount)} LUM</span>
          </div>
          
          <div className="flex items-center gap-2 p-3 bg-green-500/20 border border-green-500/50 rounded-lg">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <p className="text-green-300 text-sm">授权完成，可以进行支付</p>
          </div>
          
          <button
            onClick={handlePayment}
            disabled={isProcessing || disabled || parseFloat(lumBalance) < amount}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isProcessing ? (
              <Loader className="w-5 h-5 animate-spin" />
            ) : (
              <Coins className="w-5 h-5" />
            )}
            {isProcessing ? '支付中...' : `支付 ${formatLUM(amount)} LUM`}
          </button>
        </div>
      )}
    </div>
  );
}