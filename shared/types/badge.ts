/**
 * BadgeNFT勋章系统数据模型
 * 前后端共享的TypeScript类型定义
 */

// 勋章状态枚举
export enum BadgeStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  DEPRECATED = 'deprecated'
}

// 勋章条件类型枚举
export enum BadgeConditionType {
  DAILY_CHECKIN = 'daily_checkin',           // 每日签到
  CONSECUTIVE_DAYS = 'consecutive_days',     // 连续天数
  TOTAL_ACTIVITIES = 'total_activities',    // 总活动次数
  HEALTH_SCORE = 'health_score',            // 健康评分
  MILESTONE = 'milestone',                  // 里程碑
  SPECIAL_EVENT = 'special_event'           // 特殊事件
}

// 勋章稀有度枚举
export enum BadgeRarity {
  COMMON = 'common',
  UNCOMMON = 'uncommon',
  RARE = 'rare',
  EPIC = 'epic',
  LEGENDARY = 'legendary',
  MYTHIC = 'mythic'
}

// 勋章类型接口
export interface BadgeType {
  id: number;
  name: string;
  description: string;
  imageUrl: string;
  icon?: string; // 勋章图标
  rarity: BadgeRarity;
  status: BadgeStatus;
  maxSupply: number; // 0表示无限制
  currentSupply: number;
  contractAddress?: string;
  contractTokenId?: number;
  createdAt: Date;
  updatedAt: Date;
}

// 勋章条件接口
export interface BadgeCondition {
  id: number;
  badgeTypeId: number;
  conditionType: BadgeConditionType;
  targetValue: number; // 目标值（如连续7天、总计100次等）
  currentValue?: number; // 当前进度值
  metadata?: Record<string, any>; // 额外的条件参数
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// 用户勋章状态枚举
export enum UserBadgeStatus {
  EARNED = 'earned',
  IN_PROGRESS = 'in_progress',
  LOCKED = 'locked'
}

// 用户勋章接口
export interface UserBadge {
  id: number;
  userId: string;
  badgeTypeId: number;
  tokenId?: number; // NFT Token ID
  transactionHash?: string; // 铸造交易哈希
  mintedAt: Date;
  earnedAt?: Date; // 获得时间
  progress?: number; // 进度百分比
  status: UserBadgeStatus; // 勋章状态
  metadata?: Record<string, any>; // 额外的勋章数据
  badgeType?: BadgeType; // 关联的勋章类型
}

// 勋章进度接口
export interface BadgeProgress {
  id: number;
  userId: string;
  badgeConditionId: number;
  currentValue: number;
  targetValue: number;
  isCompleted: boolean;
  completedAt?: Date;
  lastUpdatedAt: Date;
  badgeCondition?: BadgeCondition;
}

// 勋章统计接口
export interface BadgeStats {
  totalBadges: number;
  badgesByRarity: Record<BadgeRarity, number>;
  recentBadges: UserBadge[];
  progressBadges: BadgeProgress[];
  completionRate: number;
}

// 勋章铸造请求接口
export interface MintBadgeRequest {
  userId: string;
  badgeTypeId: number;
  walletAddress: string;
  metadata?: Record<string, any>;
}

// 勋章铸造响应接口
export interface MintBadgeResponse {
  success: boolean;
  userBadge?: UserBadge;
  transactionHash?: string;
  tokenId?: number;
  error?: string;
}

// 创建勋章类型请求接口
export interface CreateBadgeTypeRequest {
  name: string;
  description: string;
  imageUrl: string;
  rarity: BadgeRarity;
  maxSupply: number;
  conditions: Omit<BadgeCondition, 'id' | 'badgeTypeId' | 'createdAt' | 'updatedAt'>[];
}

// 更新勋章类型请求接口
export interface UpdateBadgeTypeRequest {
  name?: string;
  description?: string;
  imageUrl?: string;
  rarity?: BadgeRarity;
  status?: BadgeStatus;
  maxSupply?: number;
}

// 勋章查询参数接口
export interface BadgeQueryParams {
  userId?: string;
  badgeTypeId?: number;
  rarity?: BadgeRarity;
  status?: BadgeStatus;
  limit?: number;
  offset?: number;
  sortBy?: 'createdAt' | 'mintedAt' | 'rarity' | 'name';
  sortOrder?: 'asc' | 'desc';
}

// 勋章列表响应接口
export interface BadgeListResponse {
  badges: UserBadge[];
  total: number;
  hasMore: boolean;
}

// 勋章类型列表响应接口
export interface BadgeTypeListResponse {
  badgeTypes: BadgeType[];
  total: number;
  hasMore: boolean;
}

// 勋章条件检查结果接口
export interface ConditionCheckResult {
  badgeConditionId: number;
  userId: string;
  isCompleted: boolean;
  currentValue: number;
  targetValue: number;
  shouldMint: boolean;
  badgeTypeId?: number;
}

// 批量勋章铸造请求接口
export interface BatchMintRequest {
  requests: MintBadgeRequest[];
}

// 批量勋章铸造响应接口
export interface BatchMintResponse {
  results: MintBadgeResponse[];
  successCount: number;
  failureCount: number;
}

// 勋章活动日志接口
export interface BadgeActivityLog {
  id: number;
  userId: string;
  badgeTypeId?: number;
  action: 'progress_updated' | 'badge_minted' | 'condition_completed';
  details: Record<string, any>;
  createdAt: Date;
}

// 勋章系统配置接口
export interface BadgeSystemConfig {
  isEnabled: boolean;
  autoMintEnabled: boolean;
  maxBadgesPerUser: number;
  checkIntervalMinutes: number;
  contractAddress: string;
  networkId: number;
}