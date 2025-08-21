/**
 * 奖励分发系统路由
 */

import express, { type Request, type Response } from 'express';
import crypto from 'crypto';
import { MerkleTree } from 'merkletreejs';

const router = express.Router();

// 模拟数据库存储
interface RewardSnapshot {
  id: string;
  week_id: number;
  start_date: string;
  end_date: string;
  merkle_root: string;
  merkle_tree_json: string;
  total_users: number;
  total_rewards: string;
  status: 'generating' | 'completed' | 'failed';
  created_at: string;
  updated_at?: string;
}

interface UserReward {
  id: string;
  user_id: string;
  week_id: number;
  amount: string;
  type: 'daily' | 'weekly' | 'monthly' | 'special';
  status: 'pending' | 'claimed' | 'expired';
  merkle_proof: string[];
  leaf_index: number;
  transaction_hash?: string;
  created_at: string;
  claimed_at?: string;
  expires_at?: string;
}

interface ClaimRecord {
  id: string;
  user_id: string;
  reward_id: string;
  week_id: number;
  amount: string;
  transaction_hash: string;
  block_number: string;
  claimed_at: string;
  metadata?: any;
}

// 模拟数据存储
let rewardSnapshots: RewardSnapshot[] = [];
let userRewards: UserReward[] = [];
let claimRecords: ClaimRecord[] = [];

// 生成Merkle树的辅助函数
function generateMerkleTree(rewards: UserReward[]) {
  // 创建叶子节点：用户地址 + 奖励金额
  const leaves = rewards.map(reward => {
    const leaf = `${reward.user_id}:${reward.amount}`;
    return crypto.createHash('sha256').update(leaf).digest('hex');
  });

  // 创建Merkle树
  const tree = new MerkleTree(leaves, crypto.createHash('sha256'), { sortPairs: true });
  const root = tree.getHexRoot();

  // 为每个用户生成证明
  const rewardsWithProof = rewards.map((reward, index) => {
    const leaf = leaves[index];
    const proof = tree.getHexProof(leaf);
    return {
      ...reward,
      merkle_proof: proof,
      leaf_index: index
    };
  });

  return {
    root,
    tree: tree.toString(),
    rewards: rewardsWithProof
  };
}

// 生成每周奖励快照
router.post('/generate-snapshot', async (req: Request, res: Response) => {
  try {
    const { week_id, start_date, end_date } = req.body;

    if (!week_id || !start_date || !end_date) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: week_id, start_date, end_date'
      });
    }

    // 检查是否已存在该周的快照
    const existingSnapshot = rewardSnapshots.find(s => s.week_id === week_id);
    if (existingSnapshot) {
      return res.status(409).json({
        success: false,
        error: 'Snapshot for this week already exists'
      });
    }

    const snapshotId = crypto.randomUUID();
    
    // 创建初始快照记录
    const snapshot: RewardSnapshot = {
      id: snapshotId,
      week_id,
      start_date,
      end_date,
      merkle_root: '',
      merkle_tree_json: '',
      total_users: 0,
      total_rewards: '0',
      status: 'generating',
      created_at: new Date().toISOString()
    };

    rewardSnapshots.push(snapshot);

    // 模拟生成用户奖励数据（基于用户活跃度）
    const mockUserRewards: UserReward[] = [
      {
        id: crypto.randomUUID(),
        user_id: 'user_001',
        week_id,
        amount: '100.50',
        type: 'weekly',
        status: 'pending',
        merkle_proof: [],
        leaf_index: 0,
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30天后过期
      },
      {
        id: crypto.randomUUID(),
        user_id: 'user_002',
        week_id,
        amount: '75.25',
        type: 'weekly',
        status: 'pending',
        merkle_proof: [],
        leaf_index: 1,
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: crypto.randomUUID(),
        user_id: 'user_003',
        week_id,
        amount: '150.75',
        type: 'weekly',
        status: 'pending',
        merkle_proof: [],
        leaf_index: 2,
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      }
    ];

    // 生成Merkle树
    const { root, tree, rewards } = generateMerkleTree(mockUserRewards);

    // 更新快照
    const updatedSnapshot = {
      ...snapshot,
      merkle_root: root,
      merkle_tree_json: JSON.stringify({
        root,
        tree,
        leaves: rewards.map(r => `${r.user_id}:${r.amount}`)
      }),
      total_users: rewards.length,
      total_rewards: rewards.reduce((sum, r) => sum + parseFloat(r.amount), 0).toString(),
      status: 'completed' as const,
      updated_at: new Date().toISOString()
    };

    // 更新存储
    const index = rewardSnapshots.findIndex(s => s.id === snapshotId);
    rewardSnapshots[index] = updatedSnapshot;
    userRewards.push(...rewards);

    // 生成weekly merkle.json文件内容
    const weeklyMerkleJson = {
      week_id,
      merkle_root: root,
      total_amount: updatedSnapshot.total_rewards,
      claims: rewards.map(reward => ({
        user_id: reward.user_id,
        amount: reward.amount,
        proof: reward.merkle_proof,
        leaf_index: reward.leaf_index
      })),
      generated_at: new Date().toISOString()
    };

    res.status(201).json({
      success: true,
      data: {
        snapshot: updatedSnapshot,
        weekly_merkle: weeklyMerkleJson
      }
    });
  } catch (error) {
    console.error('Generate snapshot error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate reward snapshot'
    });
  }
});

// 获取用户奖励信息
router.get('/user/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { week_id } = req.query;

    let rewards = userRewards.filter(r => r.user_id === userId);
    
    if (week_id) {
      rewards = rewards.filter(r => r.week_id === parseInt(week_id as string));
    }

    // 计算统计信息
    const totalRewards = rewards.reduce((sum, r) => sum + parseFloat(r.amount), 0);
    const claimedRewards = rewards
      .filter(r => r.status === 'claimed')
      .reduce((sum, r) => sum + parseFloat(r.amount), 0);
    const pendingRewards = rewards
      .filter(r => r.status === 'pending')
      .reduce((sum, r) => sum + parseFloat(r.amount), 0);

    res.json({
      success: true,
      data: {
        user_id: userId,
        rewards,
        stats: {
          total_rewards: totalRewards.toString(),
          claimed_rewards: claimedRewards.toString(),
          pending_rewards: pendingRewards.toString(),
          total_count: rewards.length,
          claimed_count: rewards.filter(r => r.status === 'claimed').length,
          pending_count: rewards.filter(r => r.status === 'pending').length
        }
      }
    });
  } catch (error) {
    console.error('Get user rewards error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user rewards'
    });
  }
});

// 获取Merkle证明
router.get('/proof/:userId/:weekId', async (req: Request, res: Response) => {
  try {
    const { userId, weekId } = req.params;
    const weekIdNum = parseInt(weekId);

    // 查找用户在指定周的奖励
    const reward = userRewards.find(r => 
      r.user_id === userId && r.week_id === weekIdNum
    );

    if (!reward) {
      return res.status(404).json({
        success: false,
        error: 'Reward not found for this user and week'
      });
    }

    // 查找对应的快照
    const snapshot = rewardSnapshots.find(s => s.week_id === weekIdNum);
    if (!snapshot) {
      return res.status(404).json({
        success: false,
        error: 'Snapshot not found for this week'
      });
    }

    res.json({
      success: true,
      data: {
        user_id: userId,
        week_id: weekIdNum,
        amount: reward.amount,
        merkle_proof: reward.merkle_proof,
        leaf_index: reward.leaf_index,
        merkle_root: snapshot.merkle_root,
        status: reward.status
      }
    });
  } catch (error) {
    console.error('Get merkle proof error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get merkle proof'
    });
  }
});

// 验证奖励领取
router.post('/verify-claim', async (req: Request, res: Response) => {
  try {
    const { user_id, week_id, transaction_hash, block_number } = req.body;

    if (!user_id || !week_id || !transaction_hash || !block_number) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    // 查找用户奖励
    const rewardIndex = userRewards.findIndex(r => 
      r.user_id === user_id && r.week_id === week_id
    );

    if (rewardIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Reward not found'
      });
    }

    const reward = userRewards[rewardIndex];

    if (reward.status === 'claimed') {
      return res.status(409).json({
        success: false,
        error: 'Reward already claimed'
      });
    }

    if (reward.status === 'expired') {
      return res.status(410).json({
        success: false,
        error: 'Reward has expired'
      });
    }

    // 更新奖励状态
    userRewards[rewardIndex] = {
      ...reward,
      status: 'claimed',
      transaction_hash,
      claimed_at: new Date().toISOString()
    };

    // 创建领取记录
    const claimRecord: ClaimRecord = {
      id: crypto.randomUUID(),
      user_id,
      reward_id: reward.id,
      week_id,
      amount: reward.amount,
      transaction_hash,
      block_number,
      claimed_at: new Date().toISOString()
    };

    claimRecords.push(claimRecord);

    res.json({
      success: true,
      data: {
        claim_record: claimRecord,
        updated_reward: userRewards[rewardIndex]
      }
    });
  } catch (error) {
    console.error('Verify claim error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify claim'
    });
  }
});

// 获取奖励历史
router.get('/history/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { page = '1', limit = '10' } = req.query;
    
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    // 获取用户的领取记录
    const userClaimRecords = claimRecords
      .filter(record => record.user_id === userId)
      .sort((a, b) => new Date(b.claimed_at).getTime() - new Date(a.claimed_at).getTime())
      .slice(offset, offset + limitNum);

    const totalRecords = claimRecords.filter(record => record.user_id === userId).length;
    const totalPages = Math.ceil(totalRecords / limitNum);

    // 计算总计信息
    const totalClaimed = claimRecords
      .filter(record => record.user_id === userId)
      .reduce((sum, record) => sum + parseFloat(record.amount), 0);

    res.json({
      success: true,
      data: {
        user_id: userId,
        records: userClaimRecords,
        pagination: {
          current_page: pageNum,
          total_pages: totalPages,
          total_records: totalRecords,
          limit: limitNum
        },
        summary: {
          total_claimed: totalClaimed.toString(),
          total_transactions: totalRecords
        }
      }
    });
  } catch (error) {
    console.error('Get reward history error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get reward history'
    });
  }
});

// 获取所有快照列表（管理员功能）
router.get('/snapshots', async (req: Request, res: Response) => {
  try {
    const { page = '1', limit = '10' } = req.query;
    
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    const paginatedSnapshots = rewardSnapshots
      .sort((a, b) => b.week_id - a.week_id)
      .slice(offset, offset + limitNum);

    const totalSnapshots = rewardSnapshots.length;
    const totalPages = Math.ceil(totalSnapshots / limitNum);

    res.json({
      success: true,
      data: {
        snapshots: paginatedSnapshots,
        pagination: {
          current_page: pageNum,
          total_pages: totalPages,
          total_records: totalSnapshots,
          limit: limitNum
        }
      }
    });
  } catch (error) {
    console.error('Get snapshots error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get snapshots'
    });
  }
});

// 获取奖励统计信息
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const totalRewards = userRewards.reduce((sum, r) => sum + parseFloat(r.amount), 0);
    const claimedRewards = userRewards
      .filter(r => r.status === 'claimed')
      .reduce((sum, r) => sum + parseFloat(r.amount), 0);
    const pendingRewards = userRewards
      .filter(r => r.status === 'pending')
      .reduce((sum, r) => sum + parseFloat(r.amount), 0);

    const totalUsers = new Set(userRewards.map(r => r.user_id)).size;
    const claimedUsers = new Set(userRewards.filter(r => r.status === 'claimed').map(r => r.user_id)).size;
    const pendingUsers = new Set(userRewards.filter(r => r.status === 'pending').map(r => r.user_id)).size;

    res.json({
      success: true,
      data: {
        total_rewards: totalRewards.toString(),
        claimed_rewards: claimedRewards.toString(),
        pending_rewards: pendingRewards.toString(),
        total_users: totalUsers,
        claimed_users: claimedUsers,
        pending_users: pendingUsers,
        last_updated: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get reward stats'
    });
  }
});

export default router;