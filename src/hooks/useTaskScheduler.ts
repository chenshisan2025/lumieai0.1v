import { useState, useEffect, useCallback } from 'react';
import { taskScheduler, UserActivity } from '../services/TaskScheduler';

interface TaskStatus {
  name: string;
  interval: number;
  lastRun: Date;
  isRunning: boolean;
  isActive: boolean;
}

interface ActivityStats {
  totalActivities: number;
  activeUsers: number;
  recentActivities: number;
}

export const useTaskScheduler = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [taskStatus, setTaskStatus] = useState<Record<string, TaskStatus>>({});
  const [activityStats, setActivityStats] = useState<ActivityStats>({
    totalActivities: 0,
    activeUsers: 0,
    recentActivities: 0
  });

  // 启动调度器
  const startScheduler = useCallback(() => {
    try {
      taskScheduler.start();
      setIsRunning(true);
      console.log('[useTaskScheduler] 调度器已启动');
    } catch (error) {
      console.error('[useTaskScheduler] 启动调度器失败:', error);
    }
  }, []);

  // 停止调度器
  const stopScheduler = useCallback(() => {
    try {
      taskScheduler.stop();
      setIsRunning(false);
      console.log('[useTaskScheduler] 调度器已停止');
    } catch (error) {
      console.error('[useTaskScheduler] 停止调度器失败:', error);
    }
  }, []);

  // 记录用户活动
  const recordActivity = useCallback((activity: UserActivity) => {
    try {
      taskScheduler.recordActivity(activity);
      console.log('[useTaskScheduler] 记录用户活动:', activity.activityType);
    } catch (error) {
      console.error('[useTaskScheduler] 记录活动失败:', error);
    }
  }, []);

  // 更新状态
  const updateStatus = useCallback(() => {
    try {
      const status = taskScheduler.getTaskStatus();
      const stats = taskScheduler.getActivityStats();
      
      setTaskStatus(status);
      setActivityStats(stats);
    } catch (error) {
      console.error('[useTaskScheduler] 更新状态失败:', error);
    }
  }, []);

  // 模拟用户登录活动
  const simulateLogin = useCallback((userId: string = 'user_001') => {
    recordActivity({
      userId,
      activityType: 'login',
      timestamp: new Date(),
      data: { source: 'web' }
    });
  }, [recordActivity]);

  // 模拟数据记录活动
  const simulateDataEntry = useCallback((userId: string = 'user_001') => {
    recordActivity({
      userId,
      activityType: 'data_entry',
      timestamp: new Date(),
      data: { 
        type: 'health_metric',
        value: Math.floor(Math.random() * 100) + 50
      }
    });
  }, [recordActivity]);

  // 模拟目标完成活动
  const simulateGoalCompletion = useCallback((userId: string = 'user_001') => {
    recordActivity({
      userId,
      activityType: 'goal_completion',
      timestamp: new Date(),
      data: {
        goalId: `goal_${Date.now()}`,
        goalType: 'daily',
        points: Math.floor(Math.random() * 50) + 10
      }
    });
  }, [recordActivity]);

  // 组件挂载时自动启动调度器
  useEffect(() => {
    startScheduler();
    
    // 定期更新状态
    const statusInterval = setInterval(updateStatus, 5000); // 每5秒更新一次
    
    // 初始更新
    updateStatus();
    
    return () => {
      clearInterval(statusInterval);
      stopScheduler();
    };
  }, [startScheduler, stopScheduler, updateStatus]);

  return {
    // 状态
    isRunning,
    taskStatus,
    activityStats,
    
    // 控制方法
    startScheduler,
    stopScheduler,
    updateStatus,
    
    // 活动记录方法
    recordActivity,
    simulateLogin,
    simulateDataEntry,
    simulateGoalCompletion
  };
};

export default useTaskScheduler;