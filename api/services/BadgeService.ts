// import { Pool } from 'pg';
import {
  BadgeType,
  UserBadge,
  BadgeProgress,
  BadgeStats,
  BadgeCondition,
  BadgeActivityLog,
  CreateBadgeTypeRequest,
  UpdateBadgeTypeRequest,
  MintBadgeRequest,
  MintBadgeResponse,
  BadgeQueryParams,
  BadgeListResponse,
  BadgeTypeListResponse,
  BatchMintRequest,
  BatchMintResponse,
  BadgeStatus,
  BadgeRarity,
  BadgeConditionType,
  UserBadgeStatus
} from '../../shared/types/badge';
// import { Web3Service } from './Web3Service';

export class BadgeService {
  private db: any; // Pool;
  private web3Service: any; // Web3Service;

  constructor() {
    this.db = null; // new Pool({
    //   connectionString: process.env.DATABASE_URL,
    //   ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    // });
    this.web3Service = null; // new Web3Service();
  }

  /**
   * 创建新的勋章类型
   */
  async createBadgeType(request: CreateBadgeTypeRequest): Promise<BadgeType> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');
      
      // 创建勋章类型
      const badgeTypeResult = await client.query(`
        INSERT INTO badge_types (name, description, image_url, rarity, max_supply, status)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [
        request.name,
        request.description,
        request.imageUrl,
        request.rarity,
        request.maxSupply,
        BadgeStatus.ACTIVE
      ]);
      
      const badgeType = badgeTypeResult.rows[0];
      
      // 创建勋章条件
      for (const condition of request.conditions) {
        await client.query(`
          INSERT INTO badge_conditions (badge_type_id, condition_type, target_value, metadata, is_active)
          VALUES ($1, $2, $3, $4, $5)
        `, [
          badgeType.id,
          condition.conditionType,
          condition.targetValue,
          JSON.stringify(condition.metadata || {}),
          condition.isActive
        ]);
      }
      
      await client.query('COMMIT');
      
      return this.mapBadgeType(badgeType);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * 更新勋章类型
   */
  async updateBadgeType(id: number, request: UpdateBadgeTypeRequest): Promise<BadgeType | null> {
    const setParts: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (request.name !== undefined) {
      setParts.push(`name = $${paramIndex++}`);
      values.push(request.name);
    }
    if (request.description !== undefined) {
      setParts.push(`description = $${paramIndex++}`);
      values.push(request.description);
    }
    if (request.imageUrl !== undefined) {
      setParts.push(`image_url = $${paramIndex++}`);
      values.push(request.imageUrl);
    }
    if (request.rarity !== undefined) {
      setParts.push(`rarity = $${paramIndex++}`);
      values.push(request.rarity);
    }
    if (request.status !== undefined) {
      setParts.push(`status = $${paramIndex++}`);
      values.push(request.status);
    }
    if (request.maxSupply !== undefined) {
      setParts.push(`max_supply = $${paramIndex++}`);
      values.push(request.maxSupply);
    }

    if (setParts.length === 0) {
      return this.getBadgeTypeById(id);
    }

    setParts.push(`updated_at = NOW()`);
    values.push(id);

    const result = await this.db.query(`
      UPDATE badge_types 
      SET ${setParts.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `, values);

    return result.rows.length > 0 ? this.mapBadgeType(result.rows[0]) : null;
  }

  /**
   * 获取勋章类型列表
   */
  async getBadgeTypes(params: Partial<BadgeQueryParams> = {}): Promise<BadgeTypeListResponse> {
    const { limit = 20, offset = 0, status, rarity } = params;
    
    let whereClause = 'WHERE 1=1';
    const values: any[] = [];
    let paramIndex = 1;

    if (status) {
      whereClause += ` AND status = $${paramIndex++}`;
      values.push(status);
    }
    if (rarity) {
      whereClause += ` AND rarity = $${paramIndex++}`;
      values.push(rarity);
    }

    const countResult = await this.db.query(`
      SELECT COUNT(*) as total FROM badge_types ${whereClause}
    `, values);

    const dataResult = await this.db.query(`
      SELECT * FROM badge_types 
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `, [...values, limit, offset]);

    const total = parseInt(countResult.rows[0].total);
    const badgeTypes = dataResult.rows.map(row => this.mapBadgeType(row));

    return {
      badgeTypes,
      total,
      hasMore: offset + limit < total
    };
  }

  /**
   * 根据ID获取勋章类型
   */
  async getBadgeTypeById(id: number): Promise<BadgeType | null> {
    const result = await this.db.query(
      'SELECT * FROM badge_types WHERE id = $1',
      [id]
    );
    
    return result.rows.length > 0 ? this.mapBadgeType(result.rows[0]) : null;
  }

  /**
   * 铸造勋章
   */
  async mintBadge(request: MintBadgeRequest): Promise<MintBadgeResponse> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');
      
      // 检查勋章类型是否存在且可用
      const badgeTypeResult = await client.query(
        'SELECT * FROM badge_types WHERE id = $1 AND status = $2',
        [request.badgeTypeId, BadgeStatus.ACTIVE]
      );
      
      if (badgeTypeResult.rows.length === 0) {
        return {
          success: false,
          error: 'Badge type not found or inactive'
        };
      }
      
      const badgeType = badgeTypeResult.rows[0];
      
      // 检查是否已经拥有该勋章
      const existingBadge = await client.query(
        'SELECT id FROM user_badges WHERE user_id = $1 AND badge_type_id = $2',
        [request.userId, request.badgeTypeId]
      );
      
      if (existingBadge.rows.length > 0) {
        return {
          success: false,
          error: 'User already owns this badge'
        };
      }
      
      // 检查供应量限制
      if (badgeType.max_supply > 0) {
        const currentSupplyResult = await client.query(
          'SELECT COUNT(*) as count FROM user_badges WHERE badge_type_id = $1',
          [request.badgeTypeId]
        );
        
        const currentSupply = parseInt(currentSupplyResult.rows[0].count);
        if (currentSupply >= badgeType.max_supply) {
          return {
            success: false,
            error: 'Badge supply limit reached'
          };
        }
      }
      
      // 在区块链上铸造NFT
      let tokenId: number | undefined;
      let transactionHash: string | undefined;
      
      try {
        const mintResult = await this.web3Service.mintBadgeNFT(
          request.walletAddress,
          request.badgeTypeId,
          request.metadata || {}
        );
        tokenId = mintResult.tokenId;
        transactionHash = mintResult.transactionHash;
      } catch (error) {
        console.error('Failed to mint NFT on blockchain:', error);
        // 继续创建数据库记录，但标记为未铸造
      }
      
      // 创建用户勋章记录
      const userBadgeResult = await client.query(`
        INSERT INTO user_badges (user_id, badge_type_id, token_id, transaction_hash, metadata)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `, [
        request.userId,
        request.badgeTypeId,
        tokenId,
        transactionHash,
        JSON.stringify(request.metadata || {})
      ]);
      
      // 更新勋章类型的当前供应量
      await client.query(
        'UPDATE badge_types SET current_supply = current_supply + 1 WHERE id = $1',
        [request.badgeTypeId]
      );
      
      // 记录活动日志
      await this.logBadgeActivity(client, {
        userId: request.userId,
        badgeTypeId: request.badgeTypeId,
        action: 'badge_minted',
        details: {
          tokenId,
          transactionHash,
          walletAddress: request.walletAddress
        }
      });
      
      await client.query('COMMIT');
      
      const userBadge = this.mapUserBadge(userBadgeResult.rows[0]);
      
      return {
        success: true,
        userBadge,
        tokenId,
        transactionHash
      };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error minting badge:', error);
      return {
        success: false,
        error: 'Failed to mint badge'
      };
    } finally {
      client.release();
    }
  }

  /**
   * 批量铸造勋章
   */
  async batchMintBadges(request: BatchMintRequest): Promise<BatchMintResponse> {
    const results: MintBadgeResponse[] = [];
    let successCount = 0;
    let failureCount = 0;
    
    for (const mintRequest of request.requests) {
      const result = await this.mintBadge(mintRequest);
      results.push(result);
      
      if (result.success) {
        successCount++;
      } else {
        failureCount++;
      }
    }
    
    return {
      results,
      successCount,
      failureCount
    };
  }

  /**
   * 获取用户勋章列表
   */
  async getUserBadges(params: BadgeQueryParams): Promise<BadgeListResponse> {
    const { userId, limit = 20, offset = 0, rarity, sortBy = 'mintedAt', sortOrder = 'desc' } = params;
    
    let whereClause = 'WHERE ub.user_id = $1';
    const values: any[] = [userId];
    let paramIndex = 2;

    if (rarity) {
      whereClause += ` AND bt.rarity = $${paramIndex++}`;
      values.push(rarity);
    }

    const orderByClause = this.buildOrderByClause(sortBy, sortOrder);

    const countResult = await this.db.query(`
      SELECT COUNT(*) as total 
      FROM user_badges ub
      JOIN badge_types bt ON ub.badge_type_id = bt.id
      ${whereClause}
    `, values);

    const dataResult = await this.db.query(`
      SELECT ub.*, bt.name, bt.description, bt.image_url, bt.rarity, bt.status
      FROM user_badges ub
      JOIN badge_types bt ON ub.badge_type_id = bt.id
      ${whereClause}
      ${orderByClause}
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `, [...values, limit, offset]);

    const total = parseInt(countResult.rows[0].total);
    const badges = dataResult.rows.map(row => this.mapUserBadgeWithType(row));

    return {
      badges,
      total,
      hasMore: offset + limit < total
    };
  }

  /**
   * 根据ID获取勋章
   */
  async getBadgeById(id: number): Promise<UserBadge | null> {
    const result = await this.db.query(`
      SELECT ub.*, bt.name, bt.description, bt.image_url, bt.rarity, bt.status
      FROM user_badges ub
      JOIN badge_types bt ON ub.badge_type_id = bt.id
      WHERE ub.id = $1
    `, [id]);
    
    return result.rows.length > 0 ? this.mapUserBadgeWithType(result.rows[0]) : null;
  }

  /**
   * 获取用户勋章统计
   */
  async getUserBadgeStats(userId: string): Promise<BadgeStats> {
    const totalResult = await this.db.query(
      'SELECT COUNT(*) as total FROM user_badges WHERE user_id = $1',
      [userId]
    );

    const rarityResult = await this.db.query(`
      SELECT bt.rarity, COUNT(*) as count
      FROM user_badges ub
      JOIN badge_types bt ON ub.badge_type_id = bt.id
      WHERE ub.user_id = $1
      GROUP BY bt.rarity
    `, [userId]);

    const recentResult = await this.db.query(`
      SELECT ub.*, bt.name, bt.description, bt.image_url, bt.rarity, bt.status
      FROM user_badges ub
      JOIN badge_types bt ON ub.badge_type_id = bt.id
      WHERE ub.user_id = $1
      ORDER BY ub.minted_at DESC
      LIMIT 5
    `, [userId]);

    const progressResult = await this.db.query(`
      SELECT bp.*, bc.condition_type, bc.target_value, bt.name as badge_name
      FROM badge_progress bp
      JOIN badge_conditions bc ON bp.badge_condition_id = bc.id
      JOIN badge_types bt ON bc.badge_type_id = bt.id
      WHERE bp.user_id = $1 AND bp.is_completed = false
      ORDER BY (bp.current_value::float / bp.target_value::float) DESC
      LIMIT 10
    `, [userId]);

    const totalBadges = parseInt(totalResult.rows[0].total);
    const badgesByRarity: Record<BadgeRarity, number> = {
      [BadgeRarity.COMMON]: 0,
      [BadgeRarity.UNCOMMON]: 0,
      [BadgeRarity.RARE]: 0,
      [BadgeRarity.EPIC]: 0,
      [BadgeRarity.LEGENDARY]: 0,
      [BadgeRarity.MYTHIC]: 0
    };

    rarityResult.rows.forEach(row => {
      badgesByRarity[row.rarity as BadgeRarity] = parseInt(row.count);
    });

    const recentBadges = recentResult.rows.map(row => this.mapUserBadgeWithType(row));
    const progressBadges = progressResult.rows.map(row => this.mapBadgeProgress(row));

    // 计算完成率
    const totalConditionsResult = await this.db.query(
      'SELECT COUNT(*) as total FROM badge_progress WHERE user_id = $1',
      [userId]
    );
    const completedConditionsResult = await this.db.query(
      'SELECT COUNT(*) as completed FROM badge_progress WHERE user_id = $1 AND is_completed = true',
      [userId]
    );

    const totalConditions = parseInt(totalConditionsResult.rows[0].total);
    const completedConditions = parseInt(completedConditionsResult.rows[0].completed);
    const completionRate = totalConditions > 0 ? (completedConditions / totalConditions) * 100 : 0;

    return {
      totalBadges,
      badgesByRarity,
      recentBadges,
      progressBadges,
      completionRate
    };
  }

  /**
   * 获取用户勋章进度
   */
  async getUserBadgeProgress(userId: string): Promise<BadgeProgress[]> {
    const result = await this.db.query(`
      SELECT bp.*, bc.condition_type, bc.target_value, bc.metadata, bt.name as badge_name
      FROM badge_progress bp
      JOIN badge_conditions bc ON bp.badge_condition_id = bc.id
      JOIN badge_types bt ON bc.badge_type_id = bt.id
      WHERE bp.user_id = $1
      ORDER BY bp.is_completed ASC, (bp.current_value::float / bp.target_value::float) DESC
    `, [userId]);

    return result.rows.map(row => this.mapBadgeProgress(row));
  }

  /**
   * 获取用户勋章活动日志
   */
  async getUserBadgeActivities(userId: string, params: { limit: number; offset: number }): Promise<BadgeActivityLog[]> {
    const { limit, offset } = params;
    
    const result = await this.db.query(`
      SELECT * FROM badge_activity_logs
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `, [userId, limit, offset]);

    return result.rows.map(row => this.mapBadgeActivityLog(row));
  }

  /**
   * 获取勋章排行榜
   */
  async getBadgeLeaderboard(params: { limit: number; rarity?: BadgeRarity }): Promise<any[]> {
    const { limit, rarity } = params;
    
    let whereClause = '';
    const values: any[] = [];
    let paramIndex = 1;

    if (rarity) {
      whereClause = 'WHERE bt.rarity = $1';
      values.push(rarity);
      paramIndex++;
    }

    const result = await this.db.query(`
      SELECT 
        ub.user_id,
        COUNT(*) as badge_count,
        COUNT(CASE WHEN bt.rarity = 'legendary' THEN 1 END) as legendary_count,
        COUNT(CASE WHEN bt.rarity = 'epic' THEN 1 END) as epic_count,
        COUNT(CASE WHEN bt.rarity = 'rare' THEN 1 END) as rare_count,
        MAX(ub.minted_at) as latest_badge
      FROM user_badges ub
      JOIN badge_types bt ON ub.badge_type_id = bt.id
      ${whereClause}
      GROUP BY ub.user_id
      ORDER BY badge_count DESC, legendary_count DESC, epic_count DESC, rare_count DESC
      LIMIT $${paramIndex}
    `, [...values, limit]);

    return result.rows;
  }

  /**
   * 记录勋章活动日志
   */
  private async logBadgeActivity(client: any, activity: {
    userId: string;
    badgeTypeId?: number;
    action: string;
    details: Record<string, any>;
  }): Promise<void> {
    await client.query(`
      INSERT INTO badge_activity_logs (user_id, badge_type_id, action, details)
      VALUES ($1, $2, $3, $4)
    `, [
      activity.userId,
      activity.badgeTypeId,
      activity.action,
      JSON.stringify(activity.details)
    ]);
  }

  /**
   * 构建排序子句
   */
  private buildOrderByClause(sortBy: string, sortOrder: string): string {
    const validSortFields = {
      'mintedAt': 'ub.minted_at',
      'createdAt': 'ub.created_at',
      'rarity': 'bt.rarity',
      'name': 'bt.name'
    };

    const field = validSortFields[sortBy as keyof typeof validSortFields] || 'ub.minted_at';
    const order = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';
    
    return `ORDER BY ${field} ${order}`;
  }

  /**
   * 映射数据库行到BadgeType对象
   */
  private mapBadgeType(row: any): BadgeType {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      imageUrl: row.image_url,
      rarity: row.rarity,
      status: row.status,
      maxSupply: row.max_supply,
      currentSupply: row.current_supply,
      contractAddress: row.contract_address,
      contractTokenId: row.contract_token_id,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

  /**
   * 映射数据库行到UserBadge对象
   */
  private mapUserBadge(row: any): UserBadge {
    return {
      id: row.id,
      userId: row.user_id,
      badgeTypeId: row.badge_type_id,
      tokenId: row.token_id,
      transactionHash: row.transaction_hash,
      mintedAt: new Date(row.minted_at),
      metadata: row.metadata ? JSON.parse(row.metadata) : {},
      status: row.status || 'active'
    };
  }

  /**
   * 映射数据库行到带有BadgeType的UserBadge对象
   */
  private mapUserBadgeWithType(row: any): UserBadge {
    const userBadge = this.mapUserBadge(row);
    userBadge.badgeType = {
      id: row.badge_type_id,
      name: row.name,
      description: row.description,
      imageUrl: row.image_url,
      rarity: row.rarity,
      status: row.badge_status || 'active',
      maxSupply: 0,
      currentSupply: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    return userBadge;
  }

  /**
   * 映射数据库行到BadgeProgress对象
   */
  private mapBadgeProgress(row: any): BadgeProgress {
    return {
      id: row.id,
      userId: row.user_id,
      badgeConditionId: row.badge_condition_id,
      currentValue: row.current_value,
      targetValue: row.target_value,
      isCompleted: row.is_completed,
      completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
      lastUpdatedAt: new Date(row.last_updated_at)
    };
  }

  /**
   * 映射数据库行到BadgeActivityLog对象
   */
  private mapBadgeActivityLog(row: any): BadgeActivityLog {
    return {
      id: row.id,
      userId: row.user_id,
      badgeTypeId: row.badge_type_id,
      action: row.action,
      details: row.details ? JSON.parse(row.details) : {},
      createdAt: new Date(row.created_at)
    };
  }
}