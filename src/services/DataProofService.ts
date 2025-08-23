interface DataProofRecord {
  id: string;
  date: string;
  cid: string;
  txHash?: string;
  blockHash?: string;
  status: 'pending' | 'processing' | 'success' | 'failed';
  encrypted: boolean;
  gasUsed?: number;
  gasPrice?: number;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
  processedAt?: string;
}

interface DataProofStats {
  total: number;
  pending: number;
  processing: number;
  success: number;
  failed: number;
  successRate: number;
  avgGasUsed: number;
}

interface CreateProofRequest {
  data: Record<string, any>;
  encrypted?: boolean;
  metadata?: Record<string, any>;
}

interface CreateProofResponse {
  success: boolean;
  data: {
    cid: string;
    encrypted: boolean;
    recordId: string;
  };
  message: string;
}

interface VerifyProofResponse {
  success: boolean;
  data: {
    valid: boolean;
    cid: string;
    metadata?: Record<string, any>;
    encrypted: boolean;
    createdAt: string;
  };
  message: string;
}

interface DecryptionGuide {
  steps: string[];
  requirements: string[];
  environment: string;
  keyManagement: string;
  securityNotes: string[];
}

class DataProofService {
  private baseUrl: string;
  private token: string | null;

  constructor() {
    this.baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001';
    this.token = localStorage.getItem('admin_token');
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    
    return headers;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Network error' }));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }
    return response.json();
  }

  /**
   * 创建每日数据证明
   */
  async createDailyProof(request: CreateProofRequest): Promise<CreateProofResponse> {
    const response = await fetch(`${this.baseUrl}/api/v1/data-proof/create-daily-proof`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(request),
    });
    
    return this.handleResponse<CreateProofResponse>(response);
  }

  /**
   * 验证数据证明
   */
  async verifyProof(cid: string): Promise<VerifyProofResponse> {
    const response = await fetch(`${this.baseUrl}/api/v1/data-proof/verify/${cid}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    
    return this.handleResponse<VerifyProofResponse>(response);
  }

  /**
   * 获取证明记录列表
   */
  async getRecords(params?: {
    page?: number;
    limit?: number;
    status?: string;
    startDate?: string;
    endDate?: string;
    encrypted?: boolean;
  }): Promise<{
    success: boolean;
    data: {
      records: DataProofRecord[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }> {
    const searchParams = new URLSearchParams();
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, value.toString());
        }
      });
    }
    
    const response = await fetch(`${this.baseUrl}/api/v1/data-proof/records?${searchParams}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    
    return this.handleResponse(response);
  }

  /**
   * 根据日期获取证明记录
   */
  async getRecordsByDate(date: string): Promise<{
    success: boolean;
    data: DataProofRecord[];
  }> {
    const response = await fetch(`${this.baseUrl}/api/v1/data-proof/records/by-date/${date}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    
    return this.handleResponse(response);
  }

  /**
   * 获取解密指南
   */
  async getDecryptionGuide(): Promise<{
    success: boolean;
    data: DecryptionGuide;
  }> {
    const response = await fetch(`${this.baseUrl}/api/v1/data-proof/decryption-guide`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    
    return this.handleResponse(response);
  }

  /**
   * 解密证明数据（仅管理员）
   */
  async decryptProof(cid: string): Promise<{
    success: boolean;
    data: {
      decryptedData: Record<string, any>;
      metadata: Record<string, any>;
      cid: string;
    };
  }> {
    const response = await fetch(`${this.baseUrl}/api/v1/data-proof/decrypt/${cid}`, {
      method: 'POST',
      headers: this.getHeaders(),
    });
    
    return this.handleResponse(response);
  }

  /**
   * 获取统计信息
   */
  async getStats(dateRange?: string): Promise<{
    success: boolean;
    data: DataProofStats;
  }> {
    const params = dateRange ? `?dateRange=${dateRange}` : '';
    const response = await fetch(`${this.baseUrl}/api/v1/data-proof/stats${params}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    
    return this.handleResponse(response);
  }

  /**
   * 检查服务健康状态
   */
  async checkHealth(): Promise<{
    success: boolean;
    data: {
      status: string;
      timestamp: string;
      services: Record<string, any>;
    };
  }> {
    const response = await fetch(`${this.baseUrl}/api/v1/data-proof/health`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    
    return this.handleResponse(response);
  }

  /**
   * 批量重试失败的记录
   */
  async retryFailedRecords(recordIds: string[]): Promise<{
    success: boolean;
    data: {
      retriedCount: number;
      failedCount: number;
    };
    message: string;
  }> {
    const response = await fetch(`${this.baseUrl}/api/v1/data-proof/retry`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ recordIds }),
    });
    
    return this.handleResponse(response);
  }

  /**
   * 获取交易信息
   */
  async getTransactionInfo(txHash: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/v1/data-proof/transaction/${txHash}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    
    return this.handleResponse(response);
  }

  /**
   * 验证交易数据
   */
  async verifyTransactionData(txHash: string, expectedCid?: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/v1/data-proof/verify-transaction`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        tx_hash: txHash,
        expected_cid: expectedCid
      })
    });
    
    return this.handleResponse(response);
  }

  /**
   * 获取当前Gas价格
   */
  async getCurrentGasPrice(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/v1/data-proof/gas-price`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    
    return this.handleResponse(response);
  }

  /**
   * 获取最新区块信息
   */
  async getLatestBlockInfo(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/v1/data-proof/latest-block`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    
    return this.handleResponse(response);
  }

  /**
   * 获取BscScan交易链接
   */
  getBscScanUrl(txHash: string): string {
    const isMainnet = import.meta.env.VITE_NETWORK === 'mainnet';
    const baseUrl = isMainnet 
      ? 'https://bscscan.com' 
      : 'https://testnet.bscscan.com';
    return `${baseUrl}/tx/${txHash}`;
  }

  /**
   * 获取IPFS网关链接
   */
  getIpfsUrl(cid: string): string {
    const gateway = import.meta.env.VITE_IPFS_GATEWAY || 'https://gateway.pinata.cloud';
    return `${gateway}/ipfs/${cid}`;
  }

  /**
   * 获取区块链浏览器地址链接
   */
  getAddressUrl(address: string): string {
    const isMainnet = import.meta.env.VITE_NETWORK === 'mainnet';
    const baseUrl = isMainnet 
      ? 'https://bscscan.com' 
      : 'https://testnet.bscscan.com';
    return `${baseUrl}/address/${address}`;
  }

  /**
   * 获取区块链浏览器区块链接
   */
  getBlockUrl(blockNumber: number): string {
    const isMainnet = import.meta.env.VITE_NETWORK === 'mainnet';
    const baseUrl = isMainnet 
      ? 'https://bscscan.com' 
      : 'https://testnet.bscscan.com';
    return `${baseUrl}/block/${blockNumber}`;
  }
}

export default new DataProofService();
export type {
  DataProofRecord,
  DataProofStats,
  CreateProofRequest,
  CreateProofResponse,
  VerifyProofResponse,
  DecryptionGuide,
};