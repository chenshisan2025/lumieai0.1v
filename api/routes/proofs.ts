import express, { type Request, type Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

const router = express.Router();

// 模拟数据库存储
interface ProofRecord {
  id: string;
  userId: string;
  dataHash: string;
  originalData: string;
  dataType: string;
  status: 'pending' | 'committed' | 'anchored' | 'failed';
  createdAt: Date;
  committedAt?: Date;
  anchoredAt?: Date;
  transactionHash?: string;
  blockHash?: string;
  blockNumber?: number;
  merkleRoot?: string;
  merkleProof?: string[];
  metadata?: Record<string, any>;
}

interface AnchorBatchRecord {
  id: string;
  merkleRoot: string;
  dataHashes: string[];
  status: 'waiting' | 'processing' | 'completed' | 'failed';
  createdAt: Date;
  anchoredAt?: Date;
  transactionHash?: string;
  blockHash?: string;
  blockNumber?: number;
  gasUsed?: number;
  gasPrice?: string;
  metadata?: Record<string, any>;
}

// 内存存储（实际项目中应使用数据库）
const proofRecords: ProofRecord[] = [];
const anchorBatches: AnchorBatchRecord[] = [];

/**
 * 计算数据哈希
 */
function calculateDataHash(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * POST /api/proofs/daily/commit
 * 每日数据提交接口
 */
router.post('/daily/commit', async (req: Request, res: Response) => {
  try {
    const { data, dataType = 'health_data', metadata } = req.body;
    
    // 验证请求参数
    if (!data) {
      return res.status(400).json({
        success: false,
        error: 'Data is required'
      });
    }

    // 模拟用户ID（实际项目中从认证中获取）
    const userId = req.headers['user-id'] as string || 'anonymous';
    
    // 计算数据哈希
    const dataHash = calculateDataHash(data);
    
    // 检查是否已存在相同数据哈希
    const existingProof = proofRecords.find(p => p.dataHash === dataHash);
    if (existingProof) {
      return res.status(409).json({
        success: false,
        error: 'Data already exists',
        data: {
          id: existingProof.id,
          dataHash: existingProof.dataHash,
          status: existingProof.status,
          createdAt: existingProof.createdAt
        }
      });
    }
    
    // 创建存证记录
    const proofRecord: ProofRecord = {
      id: uuidv4(),
      userId,
      dataHash,
      originalData: data,
      dataType,
      status: 'committed',
      createdAt: new Date(),
      committedAt: new Date(),
      metadata
    };
    
    // 保存到内存存储
    proofRecords.push(proofRecord);
    
    // 返回成功响应
    res.status(201).json({
      success: true,
      message: 'Data committed successfully',
      data: {
        id: proofRecord.id,
        dataHash: proofRecord.dataHash,
        status: proofRecord.status,
        createdAt: proofRecord.createdAt,
        committedAt: proofRecord.committedAt
      }
    });
    
  } catch (error) {
    console.error('Error in daily commit:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * POST /api/proofs/batch/anchor
 * 批量锚定到区块链接口
 */
router.post('/batch/anchor', async (req: Request, res: Response) => {
  try {
    const { dataHashes, metadata } = req.body;
    
    // 验证请求参数
    if (!dataHashes || !Array.isArray(dataHashes) || dataHashes.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'DataHashes array is required and cannot be empty'
      });
    }
    
    // 验证所有数据哈希是否存在
    const validHashes = [];
    const invalidHashes = [];
    
    for (const hash of dataHashes) {
      const proof = proofRecords.find(p => p.dataHash === hash && p.status === 'committed');
      if (proof) {
        validHashes.push(hash);
      } else {
        invalidHashes.push(hash);
      }
    }
    
    if (validHashes.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid committed data hashes found',
        invalidHashes
      });
    }
    
    // 计算Merkle根（简化实现）
    const merkleRoot = calculateDataHash(validHashes.sort().join(''));
    
    // 创建锚定批次记录
    const batchRecord: AnchorBatchRecord = {
      id: uuidv4(),
      merkleRoot,
      dataHashes: validHashes,
      status: 'processing',
      createdAt: new Date(),
      metadata
    };
    
    // 保存批次记录
    anchorBatches.push(batchRecord);
    
    // 模拟区块链锚定过程（实际项目中调用智能合约）
    setTimeout(() => {
      // 模拟成功锚定
      batchRecord.status = 'completed';
      batchRecord.anchoredAt = new Date();
      batchRecord.transactionHash = '0x' + crypto.randomBytes(32).toString('hex');
      batchRecord.blockHash = '0x' + crypto.randomBytes(32).toString('hex');
      batchRecord.blockNumber = Math.floor(Math.random() * 1000000) + 1000000;
      batchRecord.gasUsed = Math.floor(Math.random() * 100000) + 21000;
      batchRecord.gasPrice = (Math.random() * 50 + 10).toFixed(9);
      
      // 更新相关存证记录状态
      validHashes.forEach(hash => {
        const proof = proofRecords.find(p => p.dataHash === hash);
        if (proof) {
          proof.status = 'anchored';
          proof.anchoredAt = batchRecord.anchoredAt;
          proof.transactionHash = batchRecord.transactionHash;
          proof.blockHash = batchRecord.blockHash;
          proof.blockNumber = batchRecord.blockNumber;
          proof.merkleRoot = batchRecord.merkleRoot;
        }
      });
    }, 2000); // 2秒后模拟完成
    
    // 返回成功响应
    res.status(202).json({
      success: true,
      message: 'Batch anchor initiated',
      data: {
        batchId: batchRecord.id,
        merkleRoot: batchRecord.merkleRoot,
        status: batchRecord.status,
        validHashes,
        invalidHashes,
        createdAt: batchRecord.createdAt
      }
    });
    
  } catch (error) {
    console.error('Error in batch anchor:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * GET /api/proofs/verify/:dataHash
 * 验证数据存证接口
 */
router.get('/verify/:dataHash', async (req: Request, res: Response) => {
  try {
    const { dataHash } = req.params;
    
    if (!dataHash) {
      return res.status(400).json({
        success: false,
        error: 'Data hash is required'
      });
    }
    
    // 查找存证记录
    const proofRecord = proofRecords.find(p => p.dataHash === dataHash);
    
    if (!proofRecord) {
      return res.status(404).json({
        success: false,
        error: 'Proof not found',
        data: {
          dataHash,
          isValid: false
        }
      });
    }
    
    // 查找相关的锚定批次
    const anchorBatch = anchorBatches.find(b => 
      b.dataHashes.includes(dataHash) && b.status === 'completed'
    );
    
    // 构建区块链浏览器链接
    const blockchainUrl = proofRecord.transactionHash 
      ? `https://testnet.bscscan.com/tx/${proofRecord.transactionHash}`
      : undefined;
    
    res.status(200).json({
      success: true,
      data: {
        dataHash,
        isValid: true,
        proofData: {
          id: proofRecord.id,
          status: proofRecord.status,
          dataType: proofRecord.dataType,
          createdAt: proofRecord.createdAt,
          committedAt: proofRecord.committedAt,
          anchoredAt: proofRecord.anchoredAt,
          transactionHash: proofRecord.transactionHash,
          blockHash: proofRecord.blockHash,
          blockNumber: proofRecord.blockNumber,
          merkleRoot: proofRecord.merkleRoot
        },
        anchorBatch: anchorBatch ? {
          id: anchorBatch.id,
          merkleRoot: anchorBatch.merkleRoot,
          status: anchorBatch.status,
          anchoredAt: anchorBatch.anchoredAt,
          transactionHash: anchorBatch.transactionHash,
          blockNumber: anchorBatch.blockNumber
        } : undefined,
        blockchainUrl,
        verifiedAt: new Date()
      }
    });
    
  } catch (error) {
    console.error('Error in verify proof:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * GET /api/proofs/history
 * 获取存证历史接口
 */
router.get('/history', async (req: Request, res: Response) => {
  try {
    const { 
      page = '1', 
      limit = '10', 
      status, 
      dataType,
      userId: queryUserId 
    } = req.query;
    
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;
    
    // 模拟用户ID（实际项目中从认证中获取）
    const userId = req.headers['user-id'] as string || queryUserId || 'anonymous';
    
    // 过滤记录
    let filteredRecords = proofRecords.filter(p => p.userId === userId);
    
    if (status) {
      filteredRecords = filteredRecords.filter(p => p.status === status);
    }
    
    if (dataType) {
      filteredRecords = filteredRecords.filter(p => p.dataType === dataType);
    }
    
    // 排序（最新的在前）
    filteredRecords.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    
    // 分页
    const total = filteredRecords.length;
    const paginatedRecords = filteredRecords.slice(offset, offset + limitNum);
    
    // 构建响应数据
    const historyData = paginatedRecords.map(record => ({
      id: record.id,
      dataHash: record.dataHash,
      dataType: record.dataType,
      status: record.status,
      createdAt: record.createdAt,
      committedAt: record.committedAt,
      anchoredAt: record.anchoredAt,
      transactionHash: record.transactionHash,
      blockNumber: record.blockNumber,
      blockchainUrl: record.transactionHash 
        ? `https://testnet.bscscan.com/tx/${record.transactionHash}`
        : undefined
    }));
    
    // 统计数据
    const stats = {
      totalProofs: total,
      pendingProofs: filteredRecords.filter(p => p.status === 'pending').length,
      committedProofs: filteredRecords.filter(p => p.status === 'committed').length,
      anchoredProofs: filteredRecords.filter(p => p.status === 'anchored').length,
      failedProofs: filteredRecords.filter(p => p.status === 'failed').length,
      totalBatches: anchorBatches.length,
      pendingBatches: anchorBatches.filter(b => b.status === 'processing').length,
      completedBatches: anchorBatches.filter(b => b.status === 'completed').length,
      lastAnchorTime: anchorBatches
        .filter(b => b.anchoredAt)
        .sort((a, b) => (b.anchoredAt?.getTime() || 0) - (a.anchoredAt?.getTime() || 0))[0]?.anchoredAt
    };
    
    res.status(200).json({
      success: true,
      data: {
        proofs: historyData,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum)
        },
        stats
      }
    });
    
  } catch (error) {
    console.error('Error in get history:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

export default router;