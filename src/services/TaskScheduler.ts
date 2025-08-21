import { BadgeType, UserBadge } from '../../shared/types/badge';

interface ScheduledTask {
  id: string;
  name: string;
  interval: number; // 毫秒
  lastRun: Date;
  isRunning: boolean;
  handler: () => Promise<void>;
}

interface UserActivity {
  userId: string;
  activityType: string;
  timestamp: Date;
  data?: any;
}

class TaskScheduler {
  private tasks: Map<string, ScheduledTask> = new Map();
  private intervals: Map<string, NodeJS.Timeout> = new Map();
  private userActivities: UserActivity[] = [];
  private isInitialized = false;

  constructor() {
    this.initializeDefaultTasks();
  }

  private initializeDefaultTasks() {
    // 每分钟检查连续性条件
    this.addTask({
      id: 'continuity-check',
      name: '连续性条件检查',
      interval: 60 * 1000, // 1分钟
      lastRun: new Date(0),
      isRunning: false,
      handler: this.checkContinuityConditions.bind(this)
    });

    // 每5分钟检查日常任务完成情况
    this.addTask({
      id: 'daily-task-check',
      name: '日常任务检查',
      interval: 5 * 60 * 1000, // 5分钟
      lastRun: new Date(0),
      isRunning: false,
      handler: this.checkDailyTasks.bind(this)
    });

    // 每小时检查成就条件
    this.addTask({
      id: 'achievement-check',
      name: '成就条件检查',
      interval: 60 * 60 * 1000, // 1小时
      lastRun: new Date(0),
      isRunning: false,
      handler: this.checkAchievementConditions.bind(this)
    });

    this.isInitialized = true;
  }

  // 添加任务
  addTask(task: ScheduledTask) {
    this.tasks.set(task.id, task);
    console.log(`[TaskScheduler] 添加任务: ${task.name}`);
  }

  // 启动调度器
  start() {
    if (!this.isInitialized) {
      console.warn('[TaskScheduler] 调度器未初始化');
      return;
    }

    console.log('[TaskScheduler] 启动调度器');
    
    this.tasks.forEach((task) => {
      this.startTask(task.id);
    });
  }

  // 停止调度器
  stop() {
    console.log('[TaskScheduler] 停止调度器');
    
    this.intervals.forEach((interval) => {
      clearInterval(interval);
    });
    this.intervals.clear();
  }

  // 启动单个任务
  private startTask(taskId: string) {
    const task = this.tasks.get(taskId);
    if (!task) {
      console.warn(`[TaskScheduler] 任务不存在: ${taskId}`);
      return;
    }

    // 清除已存在的定时器
    const existingInterval = this.intervals.get(taskId);
    if (existingInterval) {
      clearInterval(existingInterval);
    }

    // 创建新的定时器
    const interval = setInterval(async () => {
      if (task.isRunning) {
        console.log(`[TaskScheduler] 任务 ${task.name} 正在运行中，跳过此次执行`);
        return;
      }

      try {
        task.isRunning = true;
        console.log(`[TaskScheduler] 执行任务: ${task.name}`);
        await task.handler();
        task.lastRun = new Date();
        console.log(`[TaskScheduler] 任务完成: ${task.name}`);
      } catch (error) {
        console.error(`[TaskScheduler] 任务执行失败: ${task.name}`, error);
      } finally {
        task.isRunning = false;
      }
    }, task.interval);

    this.intervals.set(taskId, interval);
    console.log(`[TaskScheduler] 启动任务: ${task.name}, 间隔: ${task.interval}ms`);
  }

  // 记录用户活动
  recordActivity(activity: UserActivity) {
    this.userActivities.push(activity);
    
    // 保持最近1000条记录
    if (this.userActivities.length > 1000) {
      this.userActivities = this.userActivities.slice(-1000);
    }

    console.log(`[TaskScheduler] 记录用户活动: ${activity.activityType}`, activity);
  }

  // 检查连续性条件
  private async checkContinuityConditions() {
    console.log('[TaskScheduler] 检查连续性条件');
    
    // 模拟检查连续登录
    const users = this.getActiveUsers();
    
    for (const userId of users) {
      await this.checkConsecutiveLogin(userId);
      await this.checkConsecutiveDataEntry(userId);
    }
  }

  // 检查日常任务
  private async checkDailyTasks() {
    console.log('[TaskScheduler] 检查日常任务');
    
    const users = this.getActiveUsers();
    
    for (const userId of users) {
      await this.checkDailyGoalCompletion(userId);
      await this.checkDailyDataEntry(userId);
    }
  }

  // 检查成就条件
  private async checkAchievementConditions() {
    console.log('[TaskScheduler] 检查成就条件');
    
    const users = this.getActiveUsers();
    
    for (const userId of users) {
      await this.checkMilestoneAchievements(userId);
      await this.checkSpecialAchievements(userId);
    }
  }

  // 获取活跃用户列表
  private getActiveUsers(): string[] {
    const recentActivities = this.userActivities.filter(
      activity => Date.now() - activity.timestamp.getTime() < 24 * 60 * 60 * 1000 // 24小时内
    );
    
    const activeUsers = [...new Set(recentActivities.map(activity => activity.userId))];
    return activeUsers;
  }

  // 检查连续登录
  private async checkConsecutiveLogin(userId: string) {
    const loginActivities = this.userActivities.filter(
      activity => activity.userId === userId && activity.activityType === 'login'
    ).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    if (loginActivities.length === 0) return;

    // 计算连续登录天数
    let consecutiveDays = 1;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 1; i < loginActivities.length; i++) {
      const currentDate = new Date(loginActivities[i].timestamp);
      currentDate.setHours(0, 0, 0, 0);
      
      const previousDate = new Date(loginActivities[i - 1].timestamp);
      previousDate.setHours(0, 0, 0, 0);
      
      const dayDiff = (previousDate.getTime() - currentDate.getTime()) / (24 * 60 * 60 * 1000);
      
      if (dayDiff === 1) {
        consecutiveDays++;
      } else {
        break;
      }
    }

    // 检查是否达到连续登录勋章条件
    if (consecutiveDays >= 7) {
      await this.triggerBadgeMinting(userId, 'consecutive-login-7', {
        consecutiveDays,
        type: 'consecutive_login'
      });
    }
    
    if (consecutiveDays >= 30) {
      await this.triggerBadgeMinting(userId, 'consecutive-login-30', {
        consecutiveDays,
        type: 'consecutive_login'
      });
    }
  }

  // 检查连续数据记录
  private async checkConsecutiveDataEntry(userId: string) {
    const dataEntries = this.userActivities.filter(
      activity => activity.userId === userId && activity.activityType === 'data_entry'
    ).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    if (dataEntries.length === 0) return;

    // 计算连续记录天数
    let consecutiveDays = 1;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 1; i < dataEntries.length; i++) {
      const currentDate = new Date(dataEntries[i].timestamp);
      currentDate.setHours(0, 0, 0, 0);
      
      const previousDate = new Date(dataEntries[i - 1].timestamp);
      previousDate.setHours(0, 0, 0, 0);
      
      const dayDiff = (previousDate.getTime() - currentDate.getTime()) / (24 * 60 * 60 * 1000);
      
      if (dayDiff === 1) {
        consecutiveDays++;
      } else {
        break;
      }
    }

    // 检查是否达到连续记录勋章条件
    if (consecutiveDays >= 14) {
      await this.triggerBadgeMinting(userId, 'consecutive-data-14', {
        consecutiveDays,
        type: 'consecutive_data'
      });
    }
  }

  // 检查日常目标完成
  private async checkDailyGoalCompletion(userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayGoals = this.userActivities.filter(
      activity => 
        activity.userId === userId && 
        activity.activityType === 'goal_completion' &&
        activity.timestamp >= today &&
        activity.timestamp < tomorrow
    );

    if (todayGoals.length >= 3) {
      await this.triggerBadgeMinting(userId, 'daily-achiever', {
        goalsCompleted: todayGoals.length,
        date: today.toISOString(),
        type: 'daily_goal'
      });
    }
  }

  // 检查日常数据记录
  private async checkDailyDataEntry(userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayEntries = this.userActivities.filter(
      activity => 
        activity.userId === userId && 
        activity.activityType === 'data_entry' &&
        activity.timestamp >= today &&
        activity.timestamp < tomorrow
    );

    if (todayEntries.length >= 5) {
      await this.triggerBadgeMinting(userId, 'data-recorder', {
        entriesCount: todayEntries.length,
        date: today.toISOString(),
        type: 'daily_data'
      });
    }
  }

  // 检查里程碑成就
  private async checkMilestoneAchievements(userId: string) {
    const userGoals = this.userActivities.filter(
      activity => activity.userId === userId && activity.activityType === 'goal_completion'
    );

    // 检查总目标完成数
    if (userGoals.length >= 100) {
      await this.triggerBadgeMinting(userId, 'goal-master-100', {
        totalGoals: userGoals.length,
        type: 'milestone'
      });
    }

    if (userGoals.length >= 500) {
      await this.triggerBadgeMinting(userId, 'goal-master-500', {
        totalGoals: userGoals.length,
        type: 'milestone'
      });
    }
  }

  // 检查特殊成就
  private async checkSpecialAchievements(userId: string) {
    // 检查是否在特殊时间完成目标（如深夜、早晨等）
    const nightOwlGoals = this.userActivities.filter(
      activity => 
        activity.userId === userId && 
        activity.activityType === 'goal_completion' &&
        (activity.timestamp.getHours() >= 22 || activity.timestamp.getHours() <= 5)
    );

    if (nightOwlGoals.length >= 10) {
      await this.triggerBadgeMinting(userId, 'night-owl', {
        nightGoals: nightOwlGoals.length,
        type: 'special'
      });
    }

    // 检查早起完成目标
    const earlyBirdGoals = this.userActivities.filter(
      activity => 
        activity.userId === userId && 
        activity.activityType === 'goal_completion' &&
        activity.timestamp.getHours() >= 5 && activity.timestamp.getHours() <= 8
    );

    if (earlyBirdGoals.length >= 10) {
      await this.triggerBadgeMinting(userId, 'early-bird', {
        earlyGoals: earlyBirdGoals.length,
        type: 'special'
      });
    }
  }

  // 触发勋章铸造
  private async triggerBadgeMinting(userId: string, badgeTypeId: string, metadata: any) {
    try {
      console.log(`[TaskScheduler] 触发勋章铸造: ${badgeTypeId} for user ${userId}`, metadata);
      
      // 这里应该调用实际的勋章铸造API
      // 目前使用模拟实现
      const response = await this.simulateBadgeMinting(userId, badgeTypeId, metadata);
      
      if (response.success) {
        console.log(`[TaskScheduler] 勋章铸造成功: ${badgeTypeId}`);
        
        // 记录铸造活动
        this.recordActivity({
          userId,
          activityType: 'badge_minted',
          timestamp: new Date(),
          data: {
            badgeTypeId,
            badgeId: response.badgeId,
            metadata
          }
        });
      } else {
        console.warn(`[TaskScheduler] 勋章铸造失败: ${badgeTypeId}`, response);
      }
    } catch (error) {
      console.error(`[TaskScheduler] 勋章铸造异常: ${badgeTypeId}`, error);
    }
  }

  // 模拟勋章铸造
  private async simulateBadgeMinting(userId: string, badgeTypeId: string, metadata: any) {
    // 模拟API调用延迟
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // 模拟成功响应
    return {
      success: true,
      badgeId: `badge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      badgeTypeId,
      metadata,
      mintedAt: new Date().toISOString()
    };
  }

  // 获取任务状态
  getTaskStatus() {
    const status: any = {};
    
    this.tasks.forEach((task, id) => {
      status[id] = {
        name: task.name,
        interval: task.interval,
        lastRun: task.lastRun,
        isRunning: task.isRunning,
        isActive: this.intervals.has(id)
      };
    });
    
    return status;
  }

  // 获取用户活动统计
  getActivityStats() {
    const stats = {
      totalActivities: this.userActivities.length,
      activeUsers: this.getActiveUsers().length,
      recentActivities: this.userActivities.filter(
        activity => Date.now() - activity.timestamp.getTime() < 60 * 60 * 1000 // 1小时内
      ).length
    };
    
    return stats;
  }
}

// 创建全局实例
export const taskScheduler = new TaskScheduler();

// 导出类型
export type { ScheduledTask, UserActivity };
export default TaskScheduler;