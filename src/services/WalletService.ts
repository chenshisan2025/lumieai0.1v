import { ethers } from 'ethers';

// 声明window.ethereum类型
declare global {
  interface Window {
    ethereum?: any;
  }
}

export interface WalletInfo {
  address: string;
  balance: string;
  chainId: number;
  isConnected: boolean;
}

class WalletService {
  private provider: ethers.providers.Web3Provider | null = null;
  private signer: ethers.Signer | null = null;

  /**
   * 检查是否安装了MetaMask
   */
  isMetaMaskInstalled(): boolean {
    return typeof window !== 'undefined' && typeof window.ethereum !== 'undefined';
  }

  /**
   * 连接钱包
   */
  async connectWallet(): Promise<WalletInfo | null> {
    if (!this.isMetaMaskInstalled()) {
      throw new Error('请安装MetaMask钱包');
    }

    try {
      // 请求连接钱包
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      
      // 创建provider和signer
      this.provider = new ethers.providers.Web3Provider(window.ethereum);
      this.signer = this.provider.getSigner();
      
      // 获取钱包信息
      const address = await this.signer.getAddress();
      const balance = await this.provider.getBalance(address);
      const network = await this.provider.getNetwork();
      
      return {
        address,
        balance: ethers.utils.formatEther(balance),
        chainId: network.chainId,
        isConnected: true
      };
    } catch (error) {
      console.error('Error connecting wallet:', error);
      throw error;
    }
  }

  /**
   * 断开钱包连接
   */
  disconnectWallet(): void {
    this.provider = null;
    this.signer = null;
  }

  /**
   * 获取当前连接的钱包信息
   */
  async getWalletInfo(): Promise<WalletInfo | null> {
    if (!this.provider || !this.signer) {
      return null;
    }

    try {
      const address = await this.signer.getAddress();
      const balance = await this.provider.getBalance(address);
      const network = await this.provider.getNetwork();
      
      return {
        address,
        balance: ethers.utils.formatEther(balance),
        chainId: network.chainId,
        isConnected: true
      };
    } catch (error) {
      console.error('Error getting wallet info:', error);
      return null;
    }
  }

  /**
   * 获取当前signer
   */
  getSigner(): ethers.Signer | null {
    return this.signer;
  }

  /**
   * 获取当前provider
   */
  getProvider(): ethers.providers.Web3Provider | null {
    return this.provider;
  }

  /**
   * 切换到BSC网络（优先主网，fallback到测试网）
   */
  async switchToBSCNetwork(): Promise<boolean> {
    if (!this.isMetaMaskInstalled()) {
      throw new Error('请安装MetaMask钱包');
    }

    // 优先尝试切换到BSC主网
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x38' }], // BSC Mainnet chainId: 56 (0x38)
      });
      return true;
    } catch (switchError: any) {
      // 如果主网不存在，添加BSC主网
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: '0x38',
                chainName: 'BSC Mainnet',
                nativeCurrency: {
                  name: 'BNB',
                  symbol: 'BNB',
                  decimals: 18,
                },
                rpcUrls: ['https://bsc-dataseed.binance.org/'],
                blockExplorerUrls: ['https://bscscan.com/'],
              },
            ],
          });
          return true;
        } catch (addError) {
          console.log('BSC主网添加失败，尝试测试网:', addError);
          // Fallback到测试网
          return await this.switchToBSCTestnet();
        }
      } else {
        console.log('BSC主网切换失败，尝试测试网:', switchError);
        // Fallback到测试网
        return await this.switchToBSCTestnet();
      }
    }
  }

  /**
   * 切换到BSC测试网
   */
  async switchToBSCTestnet(): Promise<boolean> {
    if (!this.isMetaMaskInstalled()) {
      throw new Error('请安装MetaMask钱包');
    }

    try {
      // 尝试切换到BSC测试网
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x61' }], // BSC Testnet chainId: 97 (0x61)
      });
      return true;
    } catch (switchError: any) {
      // 如果网络不存在，添加BSC测试网
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: '0x61',
                chainName: 'BSC Testnet',
                nativeCurrency: {
                  name: 'BNB',
                  symbol: 'BNB',
                  decimals: 18,
                },
                rpcUrls: ['https://data-seed-prebsc-1-s1.binance.org:8545/'],
                blockExplorerUrls: ['https://testnet.bscscan.com/'],
              },
            ],
          });
          return true;
        } catch (addError) {
          console.error('Error adding BSC Testnet:', addError);
          throw addError;
        }
      } else {
        console.error('Error switching to BSC Testnet:', switchError);
        throw switchError;
      }
    }
  }

  /**
   * 检查当前是否在BSC网络（主网或测试网）
   */
  async isOnBSCNetwork(): Promise<boolean> {
    if (!this.provider) {
      return false;
    }

    try {
      const network = await this.provider.getNetwork();
      return network.chainId === 56 || network.chainId === 97; // BSC Mainnet (56) or Testnet (97)
    } catch (error) {
      console.error('Error checking network:', error);
      return false;
    }
  }

  /**
   * 检查当前是否在BSC测试网
   */
  async isOnBSCTestnet(): Promise<boolean> {
    if (!this.provider) {
      return false;
    }

    try {
      const network = await this.provider.getNetwork();
      return network.chainId === 97; // BSC Testnet chainId
    } catch (error) {
      console.error('Error checking network:', error);
      return false;
    }
  }

  /**
   * 检查当前是否在BSC主网
   */
  async isOnBSCMainnet(): Promise<boolean> {
    if (!this.provider) {
      return false;
    }

    try {
      const network = await this.provider.getNetwork();
      return network.chainId === 56; // BSC Mainnet chainId
    } catch (error) {
      console.error('Error checking network:', error);
      return false;
    }
  }

  /**
   * 获取当前网络信息
   */
  async getCurrentNetwork(): Promise<{ chainId: number; name: string } | null> {
    if (!this.provider) {
      return null;
    }

    try {
      const network = await this.provider.getNetwork();
      let name = 'Unknown Network';
      
      switch (network.chainId) {
        case 56:
          name = 'BSC Mainnet';
          break;
        case 97:
          name = 'BSC Testnet';
          break;
        case 1:
          name = 'Ethereum Mainnet';
          break;
        default:
          name = `Chain ${network.chainId}`;
      }
      
      return {
        chainId: network.chainId,
        name
      };
    } catch (error) {
      console.error('Error getting network info:', error);
      return null;
    }
  }

  /**
   * 监听账户变化
   */
  onAccountsChanged(callback: (accounts: string[]) => void): void {
    if (this.isMetaMaskInstalled()) {
      window.ethereum.on('accountsChanged', callback);
    }
  }

  /**
   * 监听网络变化
   */
  onChainChanged(callback: (chainId: string) => void): void {
    if (this.isMetaMaskInstalled()) {
      window.ethereum.on('chainChanged', callback);
    }
  }

  /**
   * 移除事件监听器
   */
  removeAllListeners(): void {
    if (this.isMetaMaskInstalled()) {
      window.ethereum.removeAllListeners('accountsChanged');
      window.ethereum.removeAllListeners('chainChanged');
    }
  }

  /**
   * 强制验证当前网络是否为BSC网络（主网或测试网）
   * @throws {Error} 如果不在BSC网络则抛出错误
   */
  async enforceCorrectNetwork(): Promise<void> {
    if (!this.provider) {
      throw new Error('Provider not available');
    }

    try {
      const network = await this.provider.getNetwork();
      const BSC_MAINNET_CHAIN_ID = 56;
      const BSC_TESTNET_CHAIN_ID = 97;
      
      if (network.chainId !== BSC_MAINNET_CHAIN_ID && network.chainId !== BSC_TESTNET_CHAIN_ID) {
        const networkInfo = await this.getCurrentNetwork();
        throw new Error(`错误的网络！当前网络: ${networkInfo?.name || network.chainId}，请切换到BSC网络 (主网 Chain ID: ${BSC_MAINNET_CHAIN_ID} 或测试网 Chain ID: ${BSC_TESTNET_CHAIN_ID})`);
      }
    } catch (error) {
      console.error('Network validation failed:', error);
      throw error;
    }
  }

  /**
   * 发送BNB交易（带网络校验）
   */
  async sendBNB(to: string, amount: string): Promise<string> {
    if (!this.signer) {
      throw new Error('钱包未连接');
    }

    // 强制验证网络
    await this.enforceCorrectNetwork();

    try {
      const tx = await this.signer.sendTransaction({
        to,
        value: ethers.utils.parseEther(amount)
      });

      return tx.hash;
    } catch (error) {
      console.error('Error sending BNB:', error);
      throw error;
    }
  }

  /**
   * 等待交易确认
   */
  async waitForTransaction(txHash: string, confirmations: number = 1): Promise<ethers.providers.TransactionReceipt> {
    if (!this.provider) {
      throw new Error('Provider not available');
    }

    return await this.provider.waitForTransaction(txHash, confirmations);
  }
}

// 导出单例实例
export const walletService = new WalletService();
export default WalletService;