import { ethers } from 'ethers';
import { walletService } from './WalletService';
import SubscriptionManagerABI from '../contracts/SubscriptionManager.json';

// SubscriptionManager合约ABI
const SUBSCRIPTION_MANAGER_ABI = SubscriptionManagerABI.abi;

// 环境变量配置
const BSC_TESTNET_RPC_URL = import.meta.env.VITE_BSC_TESTNET_RPC_URL || 'https://data-seed-prebsc-1-s1.binance.org:8545/';
const SUBSCRIPTION_MANAGER_ADDRESS = import.meta.env.VITE_SUBSCRIPTION_MANAGER_ADDRESS || '0xF87A47426Fc5718456d69a347320f5aebF250Ea9';

export interface SubscriptionPlan {
  priceWei: string;
  periodDays: number;
  active: boolean;
  name: string;
}

export interface SubscriptionStatus {
  isActive: boolean;
  expiryTimestamp: number;
  expiryDate: Date | null;
}

class SubscriptionService {
  private provider: ethers.providers.JsonRpcProvider;
  private contract: ethers.Contract;

  constructor() {
    this.provider = new ethers.providers.JsonRpcProvider(BSC_TESTNET_RPC_URL);
    this.contract = new ethers.Contract(
      SUBSCRIPTION_MANAGER_ADDRESS,
      SUBSCRIPTION_MANAGER_ABI,
      this.provider
    );
  }

  /**
   * 检查用户订阅是否激活
   * @param userAddress 用户钱包地址
   * @returns 是否激活
   */
  async isActive(userAddress: string): Promise<boolean> {
    try {
      const isActive = await this.contract.isActive(userAddress);
      return isActive;
    } catch (error) {
      console.error('Error checking subscription status:', error);
      return false;
    }
  }

  /**
   * 获取用户订阅到期时间戳
   * @param userAddress 用户钱包地址
   * @returns 到期时间戳（秒）
   */
  async subscriptionUntil(userAddress: string): Promise<number> {
    try {
      const timestamp = await this.contract.subscriptionUntil(userAddress);
      return timestamp.toNumber();
    } catch (error) {
      console.error('Error getting subscription expiry:', error);
      return 0;
    }
  }

  /**
   * 获取用户完整订阅状态
   * @param userAddress 用户钱包地址
   * @returns 订阅状态信息
   */
  async getSubscriptionStatus(userAddress: string): Promise<SubscriptionStatus> {
    try {
      const [isActive, expiryTimestamp] = await Promise.all([
        this.isActive(userAddress),
        this.subscriptionUntil(userAddress)
      ]);

      return {
        isActive,
        expiryTimestamp,
        expiryDate: expiryTimestamp > 0 ? new Date(expiryTimestamp * 1000) : null
      };
    } catch (error) {
      console.error('Error getting subscription status:', error);
      return {
        isActive: false,
        expiryTimestamp: 0,
        expiryDate: null
      };
    }
  }

  /**
   * 获取订阅计划信息
   * @param planId 计划ID
   * @returns 计划信息
   */
  async getPlan(planId: number): Promise<SubscriptionPlan | null> {
    try {
      const plan = await this.contract.plans(planId);
      return {
        priceWei: plan.priceWei.toString(),
        periodDays: plan.periodDays.toNumber(),
        active: plan.active,
        name: plan.name
      };
    } catch (error) {
      console.error('Error getting plan:', error);
      return null;
    }
  }

  /**
   * 购买订阅（需要连接钱包）
   * @param planId 计划ID
   * @param signer 签名者（连接的钱包）
   * @returns 交易哈希
   */
  async purchaseSubscription(planId: number, signer: ethers.Signer): Promise<string> {
    try {
      // 强制验证网络
      await walletService.enforceCorrectNetwork();
      
      const contractWithSigner = this.contract.connect(signer);
      const plan = await this.getPlan(planId);
      
      if (!plan || !plan.active) {
        throw new Error('Plan not found or not active');
      }

      const tx = await contractWithSigner.purchase(planId, {
        value: plan.priceWei
      });

      return tx.hash;
    } catch (error) {
      console.error('Error purchasing subscription:', error);
      throw error;
    }
  }

  /**
   * 格式化BNB金额
   * @param weiAmount Wei金额
   * @returns 格式化的BNB金额字符串
   */
  formatBNBAmount(weiAmount: string): string {
    return ethers.utils.formatEther(weiAmount);
  }

  /**
   * 获取合约地址
   * @returns 合约地址
   */
  getContractAddress(): string {
    return SUBSCRIPTION_MANAGER_ADDRESS;
  }

  /**
   * 获取网络信息
   * @returns 网络信息
   */
  async getNetworkInfo() {
    try {
      const network = await this.provider.getNetwork();
      return {
        name: network.name,
        chainId: network.chainId
      };
    } catch (error) {
      console.error('Error getting network info:', error);
      return null;
    }
  }
}

// 导出单例实例
export const subscriptionService = new SubscriptionService();
export default SubscriptionService;