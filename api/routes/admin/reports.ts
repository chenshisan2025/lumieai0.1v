/**
 * 管理员报告系统API路由
 * 提供数据报告生成和统计分析功能
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
 * 获取用户增长报告
 * GET /api/admin/reports/user-growth
 */
router.get('/user-growth', authenticateAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { 
      start_date,
      end_date,
      period = 'day' // day, week, month
    } = req.query;

    // 设置默认时间范围（最近30天）
    const endDate = end_date ? new Date(end_date as string) : new Date();
    const startDate = start_date ? new Date(start_date as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // 获取用户注册数据
    const { data: users, error } = await supabase
      .from('auth.users')
      .select('created_at')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .order('created_at', { ascending: true });

    if (error) {
      throw error;
    }

    // 按时间周期分组统计
    const groupedData = new Map();
    const formatDate = (date: Date) => {
      switch (period) {
        case 'week':
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          return weekStart.toISOString().split('T')[0];
        case 'month':
          return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        default: // day
          return date.toISOString().split('T')[0];
      }
    };

    users?.forEach(user => {
      const date = formatDate(new Date(user.created_at));
      groupedData.set(date, (groupedData.get(date) || 0) + 1);
    });

    // 生成完整的时间序列数据
    const result = [];
    const current = new Date(startDate);
    let totalUsers = 0;

    while (current <= endDate) {
      const dateKey = formatDate(current);
      const newUsers = groupedData.get(dateKey) || 0;
      totalUsers += newUsers;
      
      result.push({
        date: dateKey,
        newUsers,
        totalUsers
      });

      // 移动到下一个周期
      switch (period) {
        case 'week':
          current.setDate(current.getDate() + 7);
          break;
        case 'month':
          current.setMonth(current.getMonth() + 1);
          break;
        default: // day
          current.setDate(current.getDate() + 1);
          break;
      }
    }

    res.json({
      success: true,
      data: {
        period,
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        data: result,
        summary: {
          totalNewUsers: users?.length || 0,
          averagePerPeriod: result.length ? Math.round((users?.length || 0) / result.length) : 0
        }
      }
    });
  } catch (error) {
    console.error('Get user growth report error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * 获取任务完成报告
 * GET /api/admin/reports/task-completion
 */
router.get('/task-completion', authenticateAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { 
      start_date,
      end_date,
      task_id = '',
      task_type = ''
    } = req.query;

    // 设置默认时间范围（最近30天）
    const endDate = end_date ? new Date(end_date as string) : new Date();
    const startDate = start_date ? new Date(start_date as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // 构建查询
    let query = supabase
      .from('user_tasks')
      .select(`
        *,
        tasks!inner(
          title,
          task_type,
          reward_amount
        )
      `)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    if (task_id) {
      query = query.eq('task_id', task_id);
    }
    if (task_type) {
      query = query.eq('tasks.task_type', task_type);
    }

    const { data: userTasks, error } = await query;

    if (error) {
      throw error;
    }

    // 统计数据
    const stats = {
      total: userTasks?.length || 0,
      completed: userTasks?.filter(ut => ut.status === 'completed').length || 0,
      inProgress: userTasks?.filter(ut => ut.status === 'in_progress').length || 0,
      failed: userTasks?.filter(ut => ut.status === 'failed').length || 0
    };

    // 按任务类型统计
    const byTaskType = userTasks?.reduce((acc, ut) => {
      const type = ut.tasks.task_type;
      if (!acc[type]) {
        acc[type] = { total: 0, completed: 0, inProgress: 0, failed: 0 };
      }
      acc[type].total++;
      acc[type][ut.status]++;
      return acc;
    }, {} as Record<string, any>) || {};

    // 按日期统计完成情况
    const dailyCompletion = userTasks?.reduce((acc, ut) => {
      if (ut.status === 'completed' && ut.completed_at) {
        const date = new Date(ut.completed_at).toISOString().split('T')[0];
        acc[date] = (acc[date] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>) || {};

    // 生成日期序列
    const dailyData = [];
    const current = new Date(startDate);
    while (current <= endDate) {
      const dateKey = current.toISOString().split('T')[0];
      dailyData.push({
        date: dateKey,
        completions: dailyCompletion[dateKey] || 0
      });
      current.setDate(current.getDate() + 1);
    }

    res.json({
      success: true,
      data: {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        summary: {
          ...stats,
          completionRate: stats.total ? ((stats.completed / stats.total) * 100).toFixed(2) : '0'
        },
        byTaskType,
        dailyCompletion: dailyData
      }
    });
  } catch (error) {
    console.error('Get task completion report error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * 获取奖励发放报告
 * GET /api/admin/reports/reward-distribution
 */
router.get('/reward-distribution', authenticateAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { 
      start_date,
      end_date,
      reward_type = '',
      status = ''
    } = req.query;

    // 设置默认时间范围（最近30天）
    const endDate = end_date ? new Date(end_date as string) : new Date();
    const startDate = start_date ? new Date(start_date as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // 构建查询
    let query = supabase
      .from('reward_records')
      .select(`
        *,
        tasks(
          title,
          task_type
        )
      `)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    if (reward_type) {
      query = query.eq('reward_type', reward_type);
    }
    if (status) {
      query = query.eq('status', status);
    }

    const { data: rewards, error } = await query;

    if (error) {
      throw error;
    }

    // 统计数据
    const totalAmount = rewards?.reduce((sum, r) => sum + parseFloat(r.amount || '0'), 0) || 0;
    const distributedAmount = rewards?.filter(r => r.status === 'distributed')
      .reduce((sum, r) => sum + parseFloat(r.amount || '0'), 0) || 0;
    const pendingAmount = rewards?.filter(r => r.status === 'pending')
      .reduce((sum, r) => sum + parseFloat(r.amount || '0'), 0) || 0;

    // 按奖励类型统计
    const byRewardType = rewards?.reduce((acc, r) => {
      const type = r.reward_type;
      if (!acc[type]) {
        acc[type] = { count: 0, totalAmount: 0, distributedAmount: 0, pendingAmount: 0 };
      }
      acc[type].count++;
      acc[type].totalAmount += parseFloat(r.amount || '0');
      if (r.status === 'distributed') {
        acc[type].distributedAmount += parseFloat(r.amount || '0');
      } else if (r.status === 'pending') {
        acc[type].pendingAmount += parseFloat(r.amount || '0');
      }
      return acc;
    }, {} as Record<string, any>) || {};

    // 按任务类型统计
    const byTaskType = rewards?.reduce((acc, r) => {
      const type = r.tasks?.task_type || 'unknown';
      if (!acc[type]) {
        acc[type] = { count: 0, totalAmount: 0 };
      }
      acc[type].count++;
      acc[type].totalAmount += parseFloat(r.amount || '0');
      return acc;
    }, {} as Record<string, any>) || {};

    // 按日期统计发放情况
    const dailyDistribution = rewards?.reduce((acc, r) => {
      if (r.status === 'distributed' && r.distributed_at) {
        const date = new Date(r.distributed_at).toISOString().split('T')[0];
        if (!acc[date]) {
          acc[date] = { count: 0, amount: 0 };
        }
        acc[date].count++;
        acc[date].amount += parseFloat(r.amount || '0');
      }
      return acc;
    }, {} as Record<string, any>) || {};

    // 生成日期序列
    const dailyData = [];
    const current = new Date(startDate);
    while (current <= endDate) {
      const dateKey = current.toISOString().split('T')[0];
      const dayData = dailyDistribution[dateKey] || { count: 0, amount: 0 };
      dailyData.push({
        date: dateKey,
        count: dayData.count,
        amount: dayData.amount.toFixed(8)
      });
      current.setDate(current.getDate() + 1);
    }

    res.json({
      success: true,
      data: {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        summary: {
          totalRewards: rewards?.length || 0,
          totalAmount: totalAmount.toFixed(8),
          distributedAmount: distributedAmount.toFixed(8),
          pendingAmount: pendingAmount.toFixed(8),
          distributionRate: totalAmount ? ((distributedAmount / totalAmount) * 100).toFixed(2) : '0'
        },
        byRewardType,
        byTaskType,
        dailyDistribution: dailyData
      }
    });
  } catch (error) {
    console.error('Get reward distribution report error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * 获取锚定记录报告
 * GET /api/admin/reports/anchoring
 */
router.get('/anchoring', authenticateAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { 
      start_date,
      end_date,
      data_type = '',
      status = ''
    } = req.query;

    // 设置默认时间范围（最近30天）
    const endDate = end_date ? new Date(end_date as string) : new Date();
    const startDate = start_date ? new Date(start_date as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // 构建查询
    let query = supabase
      .from('anchoring_records')
      .select('*')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    if (data_type) {
      query = query.eq('data_type', data_type);
    }
    if (status) {
      query = query.eq('status', status);
    }

    const { data: records, error } = await query;

    if (error) {
      throw error;
    }

    // 统计数据
    const stats = {
      total: records?.length || 0,
      pending: records?.filter(r => r.status === 'pending').length || 0,
      processing: records?.filter(r => r.status === 'processing').length || 0,
      completed: records?.filter(r => r.status === 'completed').length || 0,
      failed: records?.filter(r => r.status === 'failed').length || 0
    };

    // 按数据类型统计
    const byDataType = records?.reduce((acc, r) => {
      const type = r.data_type;
      if (!acc[type]) {
        acc[type] = { total: 0, pending: 0, processing: 0, completed: 0, failed: 0 };
      }
      acc[type].total++;
      acc[type][r.status]++;
      return acc;
    }, {} as Record<string, any>) || {};

    // 按日期统计锚定情况
    const dailyAnchoring = records?.reduce((acc, r) => {
      const date = new Date(r.created_at).toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = { total: 0, completed: 0 };
      }
      acc[date].total++;
      if (r.status === 'completed') {
        acc[date].completed++;
      }
      return acc;
    }, {} as Record<string, any>) || {};

    // 生成日期序列
    const dailyData = [];
    const current = new Date(startDate);
    while (current <= endDate) {
      const dateKey = current.toISOString().split('T')[0];
      const dayData = dailyAnchoring[dateKey] || { total: 0, completed: 0 };
      dailyData.push({
        date: dateKey,
        total: dayData.total,
        completed: dayData.completed,
        successRate: dayData.total ? ((dayData.completed / dayData.total) * 100).toFixed(2) : '0'
      });
      current.setDate(current.getDate() + 1);
    }

    res.json({
      success: true,
      data: {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        summary: {
          ...stats,
          successRate: stats.total ? ((stats.completed / stats.total) * 100).toFixed(2) : '0'
        },
        byDataType,
        dailyAnchoring: dailyData
      }
    });
  } catch (error) {
    console.error('Get anchoring report error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * 获取系统活跃度报告
 * GET /api/admin/reports/system-activity
 */
router.get('/system-activity', authenticateAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { 
      start_date,
      end_date
    } = req.query;

    // 设置默认时间范围（最近7天）
    const endDate = end_date ? new Date(end_date as string) : new Date();
    const startDate = start_date ? new Date(start_date as string) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // 获取管理员操作日志
    const { data: adminLogs, error: logsError } = await supabase
      .from('admin_logs')
      .select(`
        *,
        admin_users!inner(
          username
        )
      `)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .order('created_at', { ascending: false });

    if (logsError) {
      throw logsError;
    }

    // 按操作类型统计
    const byAction = adminLogs?.reduce((acc, log) => {
      const action = log.action;
      acc[action] = (acc[action] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    // 按管理员统计
    const byAdmin = adminLogs?.reduce((acc, log) => {
      const admin = log.admin_users.username;
      if (!acc[admin]) {
        acc[admin] = { total: 0, actions: {} };
      }
      acc[admin].total++;
      acc[admin].actions[log.action] = (acc[admin].actions[log.action] || 0) + 1;
      return acc;
    }, {} as Record<string, any>) || {};

    // 按日期统计活动
    const dailyActivity = adminLogs?.reduce((acc, log) => {
      const date = new Date(log.created_at).toISOString().split('T')[0];
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    // 生成日期序列
    const dailyData = [];
    const current = new Date(startDate);
    while (current <= endDate) {
      const dateKey = current.toISOString().split('T')[0];
      dailyData.push({
        date: dateKey,
        activities: dailyActivity[dateKey] || 0
      });
      current.setDate(current.getDate() + 1);
    }

    res.json({
      success: true,
      data: {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        summary: {
          totalActivities: adminLogs?.length || 0,
          uniqueAdmins: Object.keys(byAdmin).length,
          averagePerDay: dailyData.length ? Math.round((adminLogs?.length || 0) / dailyData.length) : 0
        },
        byAction,
        byAdmin,
        dailyActivity: dailyData,
        recentLogs: adminLogs?.slice(0, 20) || []
      }
    });
  } catch (error) {
    console.error('Get system activity report error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * 生成综合报告
 * GET /api/admin/reports/comprehensive
 */
router.get('/comprehensive', authenticateAdmin, requireRole(['super_admin', 'admin']), async (req: Request, res: Response): Promise<void> => {
  try {
    const { 
      start_date,
      end_date
    } = req.query;

    // 设置默认时间范围（最近30天）
    const endDate = end_date ? new Date(end_date as string) : new Date();
    const startDate = start_date ? new Date(start_date as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // 并行获取各种统计数据
    const [usersResult, tasksResult, rewardsResult, anchoringResult, announcementsResult] = await Promise.all([
      // 用户统计
      supabase
        .from('auth.users')
        .select('created_at', { count: 'exact' })
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString()),
      
      // 任务统计
      supabase
        .from('user_tasks')
        .select('status, completed_at', { count: 'exact' })
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString()),
      
      // 奖励统计
      supabase
        .from('reward_records')
        .select('amount, status')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString()),
      
      // 锚定统计
      supabase
        .from('anchoring_records')
        .select('status', { count: 'exact' })
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString()),
      
      // 公告统计
      supabase
        .from('announcements')
        .select('status', { count: 'exact' })
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
    ]);

    // 处理用户数据
    const userStats = {
      newUsers: usersResult.count || 0
    };

    // 处理任务数据
    const taskStats = {
      totalTasks: tasksResult.count || 0,
      completedTasks: tasksResult.data?.filter(t => t.status === 'completed').length || 0,
      completionRate: tasksResult.count ? 
        ((tasksResult.data?.filter(t => t.status === 'completed').length || 0) / tasksResult.count * 100).toFixed(2) : '0'
    };

    // 处理奖励数据
    const totalRewards = rewardsResult.data?.reduce((sum, r) => sum + parseFloat(r.amount), 0) || 0;
    const distributedRewards = rewardsResult.data?.filter(r => r.status === 'distributed')
      .reduce((sum, r) => sum + parseFloat(r.amount), 0) || 0;
    
    const rewardStats = {
      totalRewards: rewardsResult.data?.length || 0,
      totalAmount: totalRewards.toFixed(8),
      distributedAmount: distributedRewards.toFixed(8),
      distributionRate: totalRewards ? ((distributedRewards / totalRewards) * 100).toFixed(2) : '0'
    };

    // 处理锚定数据
    const anchoringStats = {
      totalAnchoring: anchoringResult.count || 0,
      completedAnchoring: anchoringResult.data?.filter(a => a.status === 'completed').length || 0,
      successRate: anchoringResult.count ? 
        ((anchoringResult.data?.filter(a => a.status === 'completed').length || 0) / anchoringResult.count * 100).toFixed(2) : '0'
    };

    // 处理公告数据
    const announcementStats = {
      totalAnnouncements: announcementsResult.count || 0,
      publishedAnnouncements: announcementsResult.data?.filter(a => a.status === 'published').length || 0
    };

    res.json({
      success: true,
      data: {
        period: {
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
          days: Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
        },
        users: userStats,
        tasks: taskStats,
        rewards: rewardStats,
        anchoring: anchoringStats,
        announcements: announcementStats,
        generatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Get comprehensive report error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

export default router;