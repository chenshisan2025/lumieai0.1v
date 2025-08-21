// import { Pool } from 'pg';
import {
  BadgeCondition,
  BadgeProgress,
  ConditionCheckResult,
  BadgeConditionType,
  MintBadgeRequest,
  UserBadgeStatus
} from '../../shared/types/badge';
import { BadgeService } from './BadgeService';

export class ConditionCheckerService {
  private db: any;
  private badgeService: BadgeService;

  constructor() {
    // this.db = new Pool({
    //   connectionString: process.env.DATABASE_URL,
    //   ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    // });
    this.db = null; // Mock database for development
    this.badgeService = new BadgeService();
  }

  /**
   * 检查用户的所有勋章条件
   */
  async checkUserConditions(userId: string): Promise<ConditionCheckResult[]> {
    const results: ConditionCheckResult[] = [];
    
    // 获取所有活跃的勋章条件
    const conditionsResult = await this.db.query(`
      SELECT bc.*, bt.name as badge_name, bt.status as badge_status
      FROM badge_conditions bc
      JOIN badge_types bt ON bc.badge_type_id = bt.id
      WHERE bc.is_active = true AND bt.status = 'active'
    `);
    
    for (const condition of conditionsResult.rows) {
      const result = await this.checkCondition(userId, condition);
      results.push(result);
      
      // 如果条件满足且应该铸造勋章，执行自动铸造
      if (result.shouldMint) {
        await this.autoMintBadge(userId, result.badgeTypeId!);
      }
    }
    
    return results;
  }

  /**
   * 检查单个条件
   */
  async checkCondition(userId: string, condition: any): Promise<ConditionCheckResult> {
    const conditionType = condition.condition_type as BadgeConditionType;
    const targetValue = condition.target_value;
    const badgeConditionId = condition.id;
    const badgeTypeId = condition.badge_type_id;
    
    // 检查用户是否已经拥有该勋章
    const existingBadge = await this.db.query(
      'SELECT id FROM user_badges WHERE user_id = $1 AND badge_type_id = $2',
      [userId, badgeTypeId]
    );
    
    if (existingBadge.rows.length > 0) {
      return {
        badgeConditionId,
        userId,
        isCompleted: true,
        currentValue: targetValue,
        targetValue,
        shouldMint: false // 已经拥有，不需要再铸造
      };
    }
    
    let currentValue = 0;
    
    switch (conditionType) {
      case BadgeConditionType.DAILY_CHECKIN:
        currentValue = await this.checkDailyCheckin(userId, condition.metadata);
        break;
      case BadgeConditionType.CONSECUTIVE_DAYS:
        currentValue = await this.checkConsecutiveDays(userId, condition.metadata);
        break;
      case BadgeConditionType.TOTAL_ACTIVITIES:
        currentValue = await this.checkTotalActivities(userId, condition.metadata);
        break;
      case BadgeConditionType.HEALTH_SCORE:
        currentValue = await this.checkHealthScore(userId, condition.metadata);
        break;
      case BadgeConditionType.MILESTONE:
        currentValue = await this.checkMilestone(userId, condition.metadata);
        break;
      case BadgeConditionType.SPECIAL_EVENT:
        currentValue = await this.checkSpecialEvent(userId, condition.metadata);
        break;
      default:
        console.warn(`Unknown condition type: ${conditionType}`);
    }
    
    const isCompleted = currentValue >= targetValue;
    
    // 更新或创建进度记录
    await this.updateProgress(userId, badgeConditionId, currentValue, targetValue, isCompleted);
    
    return {
      badgeConditionId,
      userId,
      isCompleted,
      currentValue,
      targetValue,
      shouldMint: isCompleted,
      badgeTypeId: isCompleted ? badgeTypeId : undefined
    };
  }

  /**
   * 检查每日签到条件
   */
  private async checkDailyCheckin(userId: string, metadata: any): Promise<number> {
    const days = metadata?.days || 30; // 默认检查最近30天
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const result = await this.db.query(`
      SELECT COUNT(DISTINCT DATE(created_at)) as checkin_days
      FROM user_activities
      WHERE user_id = $1 
        AND activity_type = 'daily_checkin'
        AND created_at >= $2
    `, [userId, startDate]);
    
    return parseInt(result.rows[0]?.checkin_days || '0');
  }

  /**
   * 检查连续天数条件
   */
  private async checkConsecutiveDays(userId: string, metadata: any): Promise<number> {
    const activityType = metadata?.activityType || 'daily_checkin';
    
    // 获取用户最近的活动记录
    const result = await this.db.query(`
      SELECT DATE(created_at) as activity_date
      FROM user_activities
      WHERE user_id = $1 AND activity_type = $2
      GROUP BY DATE(created_at)
      ORDER BY activity_date DESC
      LIMIT 100
    `, [userId, activityType]);
    
    if (result.rows.length === 0) {
      return 0;
    }
    
    // 计算连续天数
    let consecutiveDays = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (let i = 0; i < result.rows.length; i++) {
      const activityDate = new Date(result.rows[i].activity_date);
      const expectedDate = new Date(today);
      expectedDate.setDate(today.getDate() - i);
      
      if (activityDate.getTime() === expectedDate.getTime()) {
        consecutiveDays++;
      } else {
        break;
      }
    }
    
    return consecutiveDays;
  }

  /**
   * 检查总活动次数条件
   */
  private async checkTotalActivities(userId: string, metadata: any): Promise<number> {
    const activityType = metadata?.activityType;
    const timeRange = metadata?.timeRange; // 'all', 'month', 'week'
    
    let whereClause = 'WHERE user_id = $1';
    const values = [userId];
    let paramIndex = 2;
    
    if (activityType) {
      whereClause += ` AND activity_type = $${paramIndex++}`;
      values.push(activityType);
    }
    
    if (timeRange && timeRange !== 'all') {
      const startDate = new Date();
      if (timeRange === 'month') {
        startDate.setMonth(startDate.getMonth() - 1);
      } else if (timeRange === 'week') {
        startDate.setDate(startDate.getDate() - 7);
      }
      whereClause += ` AND created_at >= $${paramIndex++}`;
      values.push(startDate.toISOString());
    }
    
    const result = await this.db.query(`
      SELECT COUNT(*) as total_activities
      FROM user_activities
      ${whereClause}
    `, values);
    
    return parseInt(result.rows[0]?.total_activities || '0');
  }

  /**
   * 检查健康评分条件
   */
  private async checkHealthScore(userId: string, metadata: any): Promise<number> {
    const scoreType = metadata?.scoreType || 'overall'; // 'overall', 'weekly', 'monthly'
    const timeRange = metadata?.timeRange || 30; // 天数
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - timeRange);
    
    const result = await this.db.query(`
      SELECT AVG(score) as avg_score
      FROM health_scores
      WHERE user_id = $1 
        AND score_type = $2
        AND created_at >= $3
    `, [userId, scoreType, startDate]);
    
    return Math.round(parseFloat(result.rows[0]?.avg_score || '0'));
  }

  /**
   * 检查里程碑条件
   */
  private async checkMilestone(userId: string, metadata: any): Promise<number> {
    const milestoneType = metadata?.milestoneType;
    const targetField = metadata?.targetField;
    const tableName = metadata?.tableName || 'user_activities';
    
    if (!milestoneType || !targetField) {
      return 0;
    }
    
    // 这里可以根据不同的里程碑类型实现不同的检查逻辑
    // 例如：总步数、总运动时间、总消耗卡路里等
    const result = await this.db.query(`
      SELECT SUM(${targetField}) as total_value
      FROM ${tableName}
      WHERE user_id = $1
    `, [userId]);
    
    return parseInt(result.rows[0]?.total_value || '0');
  }

  /**
   * 检查特殊事件条件
   */
  private async checkSpecialEvent(userId: string, metadata: any): Promise<number> {
    const eventType = metadata?.eventType;
    const eventId = metadata?.eventId;
    
    if (!eventType) {
      return 0;
    }
    
    const result = await this.db.query(`
      SELECT COUNT(*) as participation_count
      FROM user_event_participations
      WHERE user_id = $1 
        AND event_type = $2
        ${eventId ? 'AND event_id = $3' : ''}
    `, eventId ? [userId, eventType, eventId] : [userId, eventType]);
    
    return parseInt(result.rows[0]?.participation_count || '0');
  }

  /**
   * 更新或创建进度记录
   */
  private async updateProgress(
    userId: string,
    badgeConditionId: number,
    currentValue: number,
    targetValue: number,
    isCompleted: boolean
  ): Promise<void> {
    const client = await this.db.connect();
    
    try {
      // 检查是否已存在进度记录
      const existingProgress = await client.query(
        'SELECT id FROM badge_progress WHERE user_id = $1 AND badge_condition_id = $2',
        [userId, badgeConditionId]
      );
      
      if (existingProgress.rows.length > 0) {
        // 更新现有记录
        await client.query(`
          UPDATE badge_progress 
          SET current_value = $1, 
              is_completed = $2,
              completed_at = $3,
              last_updated_at = NOW()
          WHERE user_id = $4 AND badge_condition_id = $5
        `, [
          currentValue,
          isCompleted,
          isCompleted ? new Date() : null,
          userId,
          badgeConditionId
        ]);
      } else {
        // 创建新记录
        await client.query(`
          INSERT INTO badge_progress (
            user_id, badge_condition_id, current_value, target_value, 
            is_completed, completed_at, last_updated_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, NOW())
        `, [
          userId,
          badgeConditionId,
          currentValue,
          targetValue,
          isCompleted,
          isCompleted ? new Date() : null
        ]);
      }
      
      // 如果条件完成，记录活动日志
      if (isCompleted) {
        await client.query(`
          INSERT INTO badge_activity_logs (user_id, badge_condition_id, action, details)
          VALUES ($1, $2, $3, $4)
        `, [
          userId,
          badgeConditionId,
          'condition_completed',
          JSON.stringify({ currentValue, targetValue })
        ]);
      }
    } finally {
      client.release();
    }
  }

  /**
   * 自动铸造勋章
   */
  private async autoMintBadge(userId: string, badgeTypeId: number): Promise<void> {
    try {
      // 获取用户的钱包地址
      const userResult = await this.db.query(
        'SELECT wallet_address FROM users WHERE id = $1',
        [userId]
      );
      
      if (userResult.rows.length === 0 || !userResult.rows[0].wallet_address) {
        console.warn(`User ${userId} does not have a wallet address for auto-minting`);
        return;
      }
      
      const walletAddress = userResult.rows[0].wallet_address;
      
      const mintRequest: MintBadgeRequest = {
        userId,
        badgeTypeId,
        walletAddress,
        metadata: {
          autoMinted: true,
          mintedAt: new Date().toISOString()
        }
      };
      
      const result = await this.badgeService.mintBadge(mintRequest);
      
      if (result.success) {
        console.log(`Successfully auto-minted badge ${badgeTypeId} for user ${userId}`);
      } else {
        console.error(`Failed to auto-mint badge ${badgeTypeId} for user ${userId}:`, result.error);
      }
    } catch (error) {
      console.error(`Error auto-minting badge for user ${userId}:`, error);
    }
  }

  /**
   * 批量检查所有用户的条件（用于定时任务）
   */
  async checkAllUsersConditions(): Promise<void> {
    try {
      // 获取所有活跃用户
      const usersResult = await this.db.query(`
        SELECT DISTINCT user_id
        FROM user_activities
        WHERE created_at >= NOW() - INTERVAL '7 days'
      `);
      
      console.log(`Checking conditions for ${usersResult.rows.length} active users`);
      
      for (const user of usersResult.rows) {
        try {
          await this.checkUserConditions(user.user_id);
        } catch (error) {
          console.error(`Error checking conditions for user ${user.user_id}:`, error);
        }
      }
      
      console.log('Completed checking conditions for all users');
    } catch (error) {
      console.error('Error in batch condition checking:', error);
    }
  }

  /**
   * 记录用户活动（供其他服务调用）
   */
  async recordUserActivity(userId: string, activityType: string, metadata: any = {}): Promise<void> {
    try {
      await this.db.query(`
        INSERT INTO user_activities (user_id, activity_type, metadata)
        VALUES ($1, $2, $3)
      `, [userId, activityType, JSON.stringify(metadata)]);
      
      // 触发条件检查
      await this.checkUserConditions(userId);
    } catch (error) {
      console.error('Error recording user activity:', error);
    }
  }

  /**
   * 获取用户的活动统计
   */
  async getUserActivityStats(userId: string, days: number = 30): Promise<any> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const result = await this.db.query(`
      SELECT 
        activity_type,
        COUNT(*) as count,
        DATE(created_at) as activity_date
      FROM user_activities
      WHERE user_id = $1 AND created_at >= $2
      GROUP BY activity_type, DATE(created_at)
      ORDER BY activity_date DESC
    `, [userId, startDate]);
    
    return result.rows;
  }
}