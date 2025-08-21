/**
 * 管理员用户管理API路由
 * 提供用户列表、详情、状态管理等功能
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
 * 获取用户列表
 * GET /api/admin/users
 */
router.get('/', authenticateAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      search = '', 
      status = '', 
      sortBy = 'created_at', 
      sortOrder = 'desc' 
    } = req.query;

    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
    
    // 构建查询
    let query = supabase
      .from('auth.users')
      .select(`
        id,
        email,
        phone,
        created_at,
        updated_at,
        last_sign_in_at,
        email_confirmed_at,
        phone_confirmed_at,
        banned_until,
        raw_user_meta_data
      `, { count: 'exact' });

    // 搜索过滤
    if (search) {
      query = query.or(`email.ilike.%${search}%,phone.ilike.%${search}%`);
    }

    // 状态过滤
    if (status === 'active') {
      query = query.is('banned_until', null);
    } else if (status === 'banned') {
      query = query.not('banned_until', 'is', null);
    } else if (status === 'unverified') {
      query = query.is('email_confirmed_at', null);
    }

    // 排序
    query = query.order(sortBy as string, { ascending: sortOrder === 'asc' });

    // 分页
    query = query.range(offset, offset + parseInt(limit as string) - 1);

    const { data: users, error, count } = await query;

    if (error) {
      throw error;
    }

    // 获取用户的额外信息（任务完成数、奖励总额等）
    const userIds = users?.map(user => user.id) || [];
    
    // 获取用户任务完成统计
    const { data: taskStats } = await supabase
      .from('user_tasks')
      .select('user_id, status')
      .in('user_id', userIds);

    // 获取用户奖励统计
    const { data: rewardStats } = await supabase
      .from('reward_records')
      .select('user_id, amount, status')
      .in('user_id', userIds);

    // 处理统计数据
    const userStatsMap = new Map();
    userIds.forEach(id => {
      userStatsMap.set(id, {
        completedTasks: 0,
        totalTasks: 0,
        totalRewards: 0,
        distributedRewards: 0
      });
    });

    taskStats?.forEach(task => {
      const stats = userStatsMap.get(task.user_id);
      if (stats) {
        stats.totalTasks++;
        if (task.status === 'completed') {
          stats.completedTasks++;
        }
      }
    });

    rewardStats?.forEach(reward => {
      const stats = userStatsMap.get(reward.user_id);
      if (stats) {
        stats.totalRewards += parseFloat(reward.amount);
        if (reward.status === 'distributed') {
          stats.distributedRewards += parseFloat(reward.amount);
        }
      }
    });

    // 合并用户数据和统计数据
    const enrichedUsers = users?.map(user => {
      const stats = userStatsMap.get(user.id) || {
        completedTasks: 0,
        totalTasks: 0,
        totalRewards: 0,
        distributedRewards: 0
      };

      return {
        ...user,
        stats: {
          completedTasks: stats.completedTasks,
          totalTasks: stats.totalTasks,
          totalRewards: stats.totalRewards.toFixed(8),
          distributedRewards: stats.distributedRewards.toFixed(8)
        },
        status: user.banned_until ? 'banned' : 
                !user.email_confirmed_at ? 'unverified' : 'active'
      };
    });

    res.json({
      success: true,
      data: {
        users: enrichedUsers,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total: count || 0,
          totalPages: Math.ceil((count || 0) / parseInt(limit as string))
        }
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * 获取用户详情
 * GET /api/admin/users/:id
 */
router.get('/:id', authenticateAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // 获取用户基本信息
    const { data: user, error: userError } = await supabase
      .from('auth.users')
      .select(`
        id,
        email,
        phone,
        created_at,
        updated_at,
        last_sign_in_at,
        email_confirmed_at,
        phone_confirmed_at,
        banned_until,
        raw_user_meta_data
      `)
      .eq('id', id)
      .single();

    if (userError || !user) {
      res.status(404).json({
        success: false,
        error: 'User not found'
      });
      return;
    }

    // 获取用户任务记录
    const { data: userTasks } = await supabase
      .from('user_tasks')
      .select(`
        *,
        tasks!inner(
          title,
          task_type,
          reward_amount
        )
      `)
      .eq('user_id', id)
      .order('created_at', { ascending: false })
      .limit(10);

    // 获取用户奖励记录
    const { data: userRewards } = await supabase
      .from('reward_records')
      .select('*')
      .eq('user_id', id)
      .order('created_at', { ascending: false })
      .limit(10);

    // 获取用户锚定记录
    const { data: anchoringRecords } = await supabase
      .from('anchoring_records')
      .select('*')
      .eq('user_id', id)
      .order('created_at', { ascending: false })
      .limit(10);

    // 计算统计数据
    const { count: totalTasks } = await supabase
      .from('user_tasks')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', id);

    const { count: completedTasks } = await supabase
      .from('user_tasks')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', id)
      .eq('status', 'completed');

    const { data: allRewards } = await supabase
      .from('reward_records')
      .select('amount, status')
      .eq('user_id', id);

    const totalRewards = allRewards?.reduce((sum, reward) => sum + parseFloat(reward.amount), 0) || 0;
    const distributedRewards = allRewards?.filter(r => r.status === 'distributed')
      .reduce((sum, reward) => sum + parseFloat(reward.amount), 0) || 0;

    res.json({
      success: true,
      data: {
        user: {
          ...user,
          status: user.banned_until ? 'banned' : 
                  !user.email_confirmed_at ? 'unverified' : 'active'
        },
        stats: {
          totalTasks: totalTasks || 0,
          completedTasks: completedTasks || 0,
          completionRate: totalTasks ? ((completedTasks || 0) / totalTasks * 100).toFixed(2) : '0',
          totalRewards: totalRewards.toFixed(8),
          distributedRewards: distributedRewards.toFixed(8)
        },
        recentActivities: {
          tasks: userTasks || [],
          rewards: userRewards || [],
          anchoring: anchoringRecords || []
        }
      }
    });
  } catch (error) {
    console.error('Get user detail error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * 更新用户状态（封禁/解封）
 * PUT /api/admin/users/:id/status
 */
router.put('/:id/status', authenticateAdmin, requireRole(['super_admin', 'admin']), async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { action, reason, duration } = req.body;

    if (!['ban', 'unban'].includes(action)) {
      res.status(400).json({
        success: false,
        error: 'Invalid action. Must be "ban" or "unban"'
      });
      return;
    }

    let banned_until = null;
    if (action === 'ban') {
      if (duration && duration > 0) {
        const banDate = new Date();
        banDate.setDate(banDate.getDate() + duration);
        banned_until = banDate.toISOString();
      } else {
        // 永久封禁
        banned_until = '2099-12-31T23:59:59.999Z';
      }
    }

    // 更新用户状态
    const { error: updateError } = await supabase.auth.admin.updateUserById(id, {
      ban_duration: banned_until ? 'indefinite' : 'none'
    });

    if (updateError) {
      throw updateError;
    }

    // 记录管理员操作日志
    const adminUser = (req as any).admin;
    await supabase
      .from('admin_logs')
      .insert({
        admin_id: adminUser.id,
        action: `user_${action}`,
        target_type: 'user',
        target_id: id,
        details: {
          reason,
          duration,
          banned_until
        }
      });

    res.json({
      success: true,
      message: `User ${action === 'ban' ? 'banned' : 'unbanned'} successfully`
    });
  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * 重置用户密码
 * POST /api/admin/users/:id/reset-password
 */
router.post('/:id/reset-password', authenticateAdmin, requireRole(['super_admin', 'admin']), async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters long'
      });
      return;
    }

    // 更新用户密码
    const { error: updateError } = await supabase.auth.admin.updateUserById(id, {
      password: newPassword
    });

    if (updateError) {
      throw updateError;
    }

    // 记录管理员操作日志
    const adminUser = (req as any).admin;
    await supabase
      .from('admin_logs')
      .insert({
        admin_id: adminUser.id,
        action: 'user_password_reset',
        target_type: 'user',
        target_id: id,
        details: {
          message: 'Password reset by admin'
        }
      });

    res.json({
      success: true,
      message: 'Password reset successfully'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * 发送用户通知
 * POST /api/admin/users/:id/notify
 */
router.post('/:id/notify', authenticateAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { title, content, type = 'info' } = req.body;

    if (!title || !content) {
      res.status(400).json({
        success: false,
        error: 'Title and content are required'
      });
      return;
    }

    // 创建通知记录（这里可以扩展为实际的通知系统）
    const { error: notifyError } = await supabase
      .from('user_notifications')
      .insert({
        user_id: id,
        title,
        content,
        type,
        is_read: false
      });

    if (notifyError) {
      // 如果通知表不存在，记录到管理员日志
      const adminUser = (req as any).admin;
      await supabase
        .from('admin_logs')
        .insert({
          admin_id: adminUser.id,
          action: 'user_notify',
          target_type: 'user',
          target_id: id,
          details: {
            title,
            content,
            type
          }
        });
    }

    res.json({
      success: true,
      message: 'Notification sent successfully'
    });
  } catch (error) {
    console.error('Send notification error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * 获取用户统计概览
 * GET /api/admin/users/stats/overview
 */
router.get('/stats/overview', authenticateAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    // 总用户数
    const { count: totalUsers } = await supabase
      .from('auth.users')
      .select('*', { count: 'exact', head: true });

    // 活跃用户数（最近30天登录）
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { count: activeUsers } = await supabase
      .from('auth.users')
      .select('*', { count: 'exact', head: true })
      .gte('last_sign_in_at', thirtyDaysAgo.toISOString());

    // 未验证用户数
    const { count: unverifiedUsers } = await supabase
      .from('auth.users')
      .select('*', { count: 'exact', head: true })
      .is('email_confirmed_at', null);

    // 被封禁用户数
    const { count: bannedUsers } = await supabase
      .from('auth.users')
      .select('*', { count: 'exact', head: true })
      .not('banned_until', 'is', null);

    // 今日新增用户
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const { count: todayNewUsers } = await supabase
      .from('auth.users')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today.toISOString());

    res.json({
      success: true,
      data: {
        total: totalUsers || 0,
        active: activeUsers || 0,
        unverified: unverifiedUsers || 0,
        banned: bannedUsers || 0,
        todayNew: todayNewUsers || 0,
        activeRate: totalUsers ? ((activeUsers || 0) / totalUsers * 100).toFixed(2) : '0'
      }
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

export default router;