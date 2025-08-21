/**
 * 管理员仪表盘API路由
 * 提供统计数据、图表数据等
 */
import { Router, type Request, type Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { authenticateAdmin, requireRole } from './auth.js';

const router = Router();

// Supabase客户端
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * 获取仪表盘概览数据
 * GET /api/admin/dashboard/overview
 */
router.get('/overview', authenticateAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    // 获取用户总数（从auth.users表）
    const { count: totalUsers } = await supabase
      .from('auth.users')
      .select('*', { count: 'exact', head: true });

    // 获取活跃用户数（最近30天有登录）
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { count: activeUsers } = await supabase
      .from('auth.users')
      .select('*', { count: 'exact', head: true })
      .gte('last_sign_in_at', thirtyDaysAgo.toISOString());

    // 获取总任务数
    const { count: totalTasks } = await supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true });

    // 获取活跃任务数
    const { count: activeTasks } = await supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    // 获取已完成任务数
    const { count: completedTasks } = await supabase
      .from('user_tasks')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'completed');

    // 获取锚定记录总数
    const { count: totalAnchoringRecords } = await supabase
      .from('anchoring_records')
      .select('*', { count: 'exact', head: true });

    // 获取成功锚定记录数
    const { count: successfulAnchoring } = await supabase
      .from('anchoring_records')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'confirmed');

    // 获取公告总数
    const { count: totalAnnouncements } = await supabase
      .from('announcements')
      .select('*', { count: 'exact', head: true });

    // 获取已发布公告数
    const { count: publishedAnnouncements } = await supabase
      .from('announcements')
      .select('*', { count: 'exact', head: true })
      .eq('is_published', true);

    // 获取奖励发放总额
    const { data: totalRewards } = await supabase
      .from('reward_records')
      .select('amount')
      .eq('status', 'distributed');

    const totalRewardAmount = totalRewards?.reduce((sum, record) => sum + parseFloat(record.amount), 0) || 0;

    // 获取今日新增用户数
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const { count: todayNewUsers } = await supabase
      .from('auth.users')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today.toISOString());

    // 获取今日完成任务数
    const { count: todayCompletedTasks } = await supabase
      .from('user_tasks')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'completed')
      .gte('completed_at', today.toISOString());

    res.json({
      success: true,
      data: {
        users: {
          total: totalUsers || 0,
          active: activeUsers || 0,
          todayNew: todayNewUsers || 0
        },
        tasks: {
          total: totalTasks || 0,
          active: activeTasks || 0,
          completed: completedTasks || 0,
          todayCompleted: todayCompletedTasks || 0
        },
        anchoring: {
          total: totalAnchoringRecords || 0,
          successful: successfulAnchoring || 0,
          successRate: totalAnchoringRecords ? ((successfulAnchoring || 0) / totalAnchoringRecords * 100).toFixed(2) : '0'
        },
        announcements: {
          total: totalAnnouncements || 0,
          published: publishedAnnouncements || 0
        },
        rewards: {
          totalAmount: totalRewardAmount.toFixed(8)
        }
      }
    });
  } catch (error) {
    console.error('Dashboard overview error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * 获取用户增长趋势数据
 * GET /api/admin/dashboard/user-growth
 */
router.get('/user-growth', authenticateAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { days = 30 } = req.query;
    const daysCount = parseInt(days as string);
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysCount);
    
    // 获取每日新增用户数据
    const { data: userGrowthData, error } = await supabase
      .rpc('get_daily_user_growth', {
        start_date: startDate.toISOString().split('T')[0],
        end_date: new Date().toISOString().split('T')[0]
      });

    if (error) {
      // 如果RPC函数不存在，使用基础查询
      const growthData = [];
      for (let i = daysCount - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const nextDate = new Date(date);
        nextDate.setDate(nextDate.getDate() + 1);
        
        const { count } = await supabase
          .from('auth.users')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', date.toISOString().split('T')[0])
          .lt('created_at', nextDate.toISOString().split('T')[0]);
        
        growthData.push({
          date: date.toISOString().split('T')[0],
          count: count || 0
        });
      }
      
      res.json({
        success: true,
        data: growthData
      });
      return;
    }

    res.json({
      success: true,
      data: userGrowthData || []
    });
  } catch (error) {
    console.error('User growth data error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * 获取任务完成统计数据
 * GET /api/admin/dashboard/task-stats
 */
router.get('/task-stats', authenticateAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    // 按任务类型统计完成情况
    const { data: taskTypeStats } = await supabase
      .from('tasks')
      .select(`
        task_type,
        user_tasks!inner(status)
      `);

    // 处理任务类型统计
    const typeStatsMap = new Map();
    taskTypeStats?.forEach(task => {
      const type = task.task_type;
      if (!typeStatsMap.has(type)) {
        typeStatsMap.set(type, { total: 0, completed: 0 });
      }
      const stats = typeStatsMap.get(type);
      stats.total++;
      if (task.user_tasks && task.user_tasks.length > 0 && task.user_tasks[0].status === 'completed') {
        stats.completed++;
      }
    });

    const taskTypeData = Array.from(typeStatsMap.entries()).map(([type, stats]) => ({
      type,
      total: stats.total,
      completed: stats.completed,
      completionRate: stats.total > 0 ? ((stats.completed / stats.total) * 100).toFixed(2) : '0'
    }));

    // 获取最近7天的任务完成趋势
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const completionTrend = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);
      
      const { count } = await supabase
        .from('user_tasks')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed')
        .gte('completed_at', date.toISOString().split('T')[0])
        .lt('completed_at', nextDate.toISOString().split('T')[0]);
      
      completionTrend.push({
        date: date.toISOString().split('T')[0],
        count: count || 0
      });
    }

    res.json({
      success: true,
      data: {
        taskTypes: taskTypeData,
        completionTrend
      }
    });
  } catch (error) {
    console.error('Task stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * 获取锚定记录统计数据
 * GET /api/admin/dashboard/anchoring-stats
 */
router.get('/anchoring-stats', authenticateAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    // 按锚定类型统计
    const { data: anchorTypeStats } = await supabase
      .from('anchoring_records')
      .select('anchor_type, status');

    const typeStatsMap = new Map();
    anchorTypeStats?.forEach(record => {
      const type = record.anchor_type;
      if (!typeStatsMap.has(type)) {
        typeStatsMap.set(type, { total: 0, confirmed: 0, pending: 0, failed: 0 });
      }
      const stats = typeStatsMap.get(type);
      stats.total++;
      stats[record.status]++;
    });

    const anchorTypeData = Array.from(typeStatsMap.entries()).map(([type, stats]) => ({
      type,
      total: stats.total,
      confirmed: stats.confirmed || 0,
      pending: stats.pending || 0,
      failed: stats.failed || 0,
      successRate: stats.total > 0 ? (((stats.confirmed || 0) / stats.total) * 100).toFixed(2) : '0'
    }));

    // 获取最近7天的锚定趋势
    const anchoringTrend = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);
      
      const { count } = await supabase
        .from('anchoring_records')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', date.toISOString().split('T')[0])
        .lt('created_at', nextDate.toISOString().split('T')[0]);
      
      anchoringTrend.push({
        date: date.toISOString().split('T')[0],
        count: count || 0
      });
    }

    res.json({
      success: true,
      data: {
        anchorTypes: anchorTypeData,
        anchoringTrend
      }
    });
  } catch (error) {
    console.error('Anchoring stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * 获取奖励发放统计数据
 * GET /api/admin/dashboard/reward-stats
 */
router.get('/reward-stats', authenticateAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    // 按奖励类型统计
    const { data: rewardTypeStats } = await supabase
      .from('reward_records')
      .select('reward_type, amount, status');

    const typeStatsMap = new Map();
    rewardTypeStats?.forEach(record => {
      const type = record.reward_type;
      if (!typeStatsMap.has(type)) {
        typeStatsMap.set(type, { total: 0, distributed: 0, totalAmount: 0, distributedAmount: 0 });
      }
      const stats = typeStatsMap.get(type);
      stats.total++;
      stats.totalAmount += parseFloat(record.amount);
      if (record.status === 'distributed') {
        stats.distributed++;
        stats.distributedAmount += parseFloat(record.amount);
      }
    });

    const rewardTypeData = Array.from(typeStatsMap.entries()).map(([type, stats]) => ({
      type,
      total: stats.total,
      distributed: stats.distributed,
      totalAmount: stats.totalAmount.toFixed(8),
      distributedAmount: stats.distributedAmount.toFixed(8),
      distributionRate: stats.total > 0 ? ((stats.distributed / stats.total) * 100).toFixed(2) : '0'
    }));

    // 获取最近7天的奖励发放趋势
    const rewardTrend = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);
      
      const { data: dailyRewards } = await supabase
        .from('reward_records')
        .select('amount')
        .eq('status', 'distributed')
        .gte('distributed_at', date.toISOString().split('T')[0])
        .lt('distributed_at', nextDate.toISOString().split('T')[0]);
      
      const dailyAmount = dailyRewards?.reduce((sum, record) => sum + parseFloat(record.amount), 0) || 0;
      
      rewardTrend.push({
        date: date.toISOString().split('T')[0],
        amount: dailyAmount.toFixed(8),
        count: dailyRewards?.length || 0
      });
    }

    res.json({
      success: true,
      data: {
        rewardTypes: rewardTypeData,
        rewardTrend
      }
    });
  } catch (error) {
    console.error('Reward stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

export default router;