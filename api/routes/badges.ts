import { Router, Request, Response } from 'express';
import { BadgeService } from '../services/BadgeService';
import { ConditionCheckerService } from '../services/ConditionCheckerService';
import {
  CreateBadgeTypeRequest,
  UpdateBadgeTypeRequest,
  MintBadgeRequest,
  BadgeQueryParams,
  BatchMintRequest
} from '../../shared/types/badge';

const router = Router();
const badgeService = new BadgeService();
const conditionChecker = new ConditionCheckerService();

/**
 * POST /api/badges/types
 * 创建新的勋章类型
 */
router.post('/types', async (req: Request, res: Response) => {
  try {
    const createRequest: CreateBadgeTypeRequest = req.body;
    
    // 验证请求数据
    if (!createRequest.name || !createRequest.description || !createRequest.imageUrl) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: name, description, imageUrl'
      });
    }

    const badgeType = await badgeService.createBadgeType(createRequest);
    
    res.status(201).json({
      success: true,
      data: badgeType
    });
  } catch (error) {
    console.error('Error creating badge type:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create badge type'
    });
  }
});

/**
 * GET /api/badges/types
 * 获取所有勋章类型列表
 */
router.get('/types', async (req: Request, res: Response) => {
  try {
    const { limit = 20, offset = 0, status, rarity } = req.query;
    
    const result = await badgeService.getBadgeTypes({
      limit: Number(limit),
      offset: Number(offset),
      status: status as any,
      rarity: rarity as any
    });
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error fetching badge types:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch badge types'
    });
  }
});

/**
 * PUT /api/badges/types/:id
 * 更新勋章类型
 */
router.put('/types/:id', async (req: Request, res: Response) => {
  try {
    const badgeTypeId = Number(req.params.id);
    const updateRequest: UpdateBadgeTypeRequest = req.body;
    
    if (isNaN(badgeTypeId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid badge type ID'
      });
    }

    const badgeType = await badgeService.updateBadgeType(badgeTypeId, updateRequest);
    
    if (!badgeType) {
      return res.status(404).json({
        success: false,
        error: 'Badge type not found'
      });
    }
    
    res.json({
      success: true,
      data: badgeType
    });
  } catch (error) {
    console.error('Error updating badge type:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update badge type'
    });
  }
});

/**
 * GET /api/badges/user/:userId
 * 获取用户的勋章列表
 */
router.get('/user/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { limit = 20, offset = 0, rarity, sortBy = 'mintedAt', sortOrder = 'desc' } = req.query;
    
    const queryParams: BadgeQueryParams = {
      userId,
      limit: Number(limit),
      offset: Number(offset),
      rarity: rarity as any,
      sortBy: sortBy as any,
      sortOrder: sortOrder as any
    };
    
    const result = await badgeService.getUserBadges(queryParams);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error fetching user badges:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user badges'
    });
  }
});

/**
 * GET /api/badges/user/:userId/stats
 * 获取用户的勋章统计信息
 */
router.get('/user/:userId/stats', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    
    const stats = await badgeService.getUserBadgeStats(userId);
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching user badge stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user badge stats'
    });
  }
});

/**
 * GET /api/badges/user/:userId/progress
 * 获取用户的勋章进度
 */
router.get('/user/:userId/progress', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    
    const progress = await badgeService.getUserBadgeProgress(userId);
    
    res.json({
      success: true,
      data: progress
    });
  } catch (error) {
    console.error('Error fetching user badge progress:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user badge progress'
    });
  }
});

/**
 * POST /api/badges/mint
 * 铸造勋章（自动或手动）
 */
router.post('/mint', async (req: Request, res: Response) => {
  try {
    const mintRequest: MintBadgeRequest = req.body;
    
    // 验证请求数据
    if (!mintRequest.userId || !mintRequest.badgeTypeId || !mintRequest.walletAddress) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: userId, badgeTypeId, walletAddress'
      });
    }

    const result = await badgeService.mintBadge(mintRequest);
    
    if (!result.success) {
      return res.status(400).json(result);
    }
    
    res.status(201).json(result);
  } catch (error) {
    console.error('Error minting badge:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mint badge'
    });
  }
});

/**
 * POST /api/badges/mint/batch
 * 批量铸造勋章
 */
router.post('/mint/batch', async (req: Request, res: Response) => {
  try {
    const batchRequest: BatchMintRequest = req.body;
    
    if (!batchRequest.requests || !Array.isArray(batchRequest.requests)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid batch request format'
      });
    }

    const result = await badgeService.batchMintBadges(batchRequest);
    
    res.status(201).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error batch minting badges:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to batch mint badges'
    });
  }
});

/**
 * GET /api/badges/:badgeId
 * 获取特定勋章的详细信息
 */
router.get('/:badgeId', async (req: Request, res: Response) => {
  try {
    const badgeId = Number(req.params.badgeId);
    
    if (isNaN(badgeId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid badge ID'
      });
    }

    const badge = await badgeService.getBadgeById(badgeId);
    
    if (!badge) {
      return res.status(404).json({
        success: false,
        error: 'Badge not found'
      });
    }
    
    res.json({
      success: true,
      data: badge
    });
  } catch (error) {
    console.error('Error fetching badge:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch badge'
    });
  }
});

/**
 * POST /api/badges/check-conditions/:userId
 * 手动检查用户的勋章条件
 */
router.post('/check-conditions/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    
    const results = await conditionChecker.checkUserConditions(userId);
    
    res.json({
      success: true,
      data: {
        checkedConditions: results.length,
        completedConditions: results.filter(r => r.isCompleted).length,
        newBadges: results.filter(r => r.shouldMint).length,
        results
      }
    });
  } catch (error) {
    console.error('Error checking conditions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check conditions'
    });
  }
});

/**
 * GET /api/badges/activity/:userId
 * 获取用户的勋章活动日志
 */
router.get('/activity/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { limit = 20, offset = 0 } = req.query;
    
    const activities = await badgeService.getUserBadgeActivities(userId, {
      limit: Number(limit),
      offset: Number(offset)
    });
    
    res.json({
      success: true,
      data: activities
    });
  } catch (error) {
    console.error('Error fetching badge activities:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch badge activities'
    });
  }
});

/**
 * GET /api/badges/leaderboard
 * 获取勋章排行榜
 */
router.get('/leaderboard', async (req: Request, res: Response) => {
  try {
    const { limit = 50, rarity } = req.query;
    
    const leaderboard = await badgeService.getBadgeLeaderboard({
      limit: Number(limit),
      rarity: rarity as any
    });
    
    res.json({
      success: true,
      data: leaderboard
    });
  } catch (error) {
    console.error('Error fetching badge leaderboard:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch badge leaderboard'
    });
  }
});

export default router;