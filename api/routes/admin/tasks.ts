/**
 * 管理员任务与奖励管理API路由
 * 提供任务管理、奖励设置和用户任务跟踪功能
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
 * 获取任务列表
 * GET /api/admin/tasks
 */
router.get('/', authenticateAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      task_type = '',
      is_active = '',
      search = '',
      sortBy = 'created_at', 
      sortOrder = 'desc' 
    } = req.query;

    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
    
    // 构建查询
    let query = supabase
      .from('tasks')
      .select('*', { count: 'exact' });

    // 任务类型过滤
    if (task_type) {
      query = query.eq('task_type', task_type);
    }

    // 活跃状态过滤
    if (is_active !== '') {
      query = query.eq('is_active', is_active === 'true');
    }

    // 搜索过滤
    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
    }

    // 排序
    query = query.order(sortBy as string, { ascending: sortOrder === 'asc' });

    // 分页
    query = query.range(offset, offset + parseInt(limit as string) - 1);

    const { data: tasks, error, count } = await query;

    if (error) {
      throw error;
    }

    // 获取每个任务的完成统计
    const taskIds = tasks?.map(task => task.id) || [];
    const { data: taskStats } = await supabase
      .from('user_tasks')
      .select('task_id, status')
      .in('task_id', taskIds);

    // 处理统计数据
    const statsMap = new Map();
    taskIds.forEach(id => {
      statsMap.set(id, { total: 0, completed: 0, in_progress: 0 });
    });

    taskStats?.forEach(userTask => {
      const stats = statsMap.get(userTask.task_id);
      if (stats) {
        stats.total++;
        if (userTask.status === 'completed') {
          stats.completed++;
        } else if (userTask.status === 'in_progress') {
          stats.in_progress++;
        }
      }
    });

    // 合并任务数据和统计数据
    const enrichedTasks = tasks?.map(task => ({
      ...task,
      stats: statsMap.get(task.id) || { total: 0, completed: 0, in_progress: 0 }
    }));

    res.json({
      success: true,
      data: {
        tasks: enrichedTasks,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total: count || 0,
          totalPages: Math.ceil((count || 0) / parseInt(limit as string))
        }
      }
    });
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * 获取任务详情
 * GET /api/admin/tasks/:id
 */
router.get('/:id', authenticateAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const { data: task, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !task) {
      res.status(404).json({
        success: false,
        error: 'Task not found'
      });
      return;
    }

    // 获取任务的用户完成记录
    const { data: userTasks } = await supabase
      .from('user_tasks')
      .select(`
        *,
        auth.users!inner(
          email,
          raw_user_meta_data
        )
      `)
      .eq('task_id', id)
      .order('created_at', { ascending: false })
      .limit(50);

    // 获取任务统计
    const { count: totalParticipants } = await supabase
      .from('user_tasks')
      .select('*', { count: 'exact', head: true })
      .eq('task_id', id);

    const { count: completedCount } = await supabase
      .from('user_tasks')
      .select('*', { count: 'exact', head: true })
      .eq('task_id', id)
      .eq('status', 'completed');

    const { count: inProgressCount } = await supabase
      .from('user_tasks')
      .select('*', { count: 'exact', head: true })
      .eq('task_id', id)
      .eq('status', 'in_progress');

    // 获取奖励发放统计
    const { data: rewardStats } = await supabase
      .from('reward_records')
      .select('amount, status')
      .eq('task_id', id);

    const totalRewards = rewardStats?.reduce((sum, record) => sum + parseFloat(record.amount), 0) || 0;
    const distributedRewards = rewardStats?.filter(r => r.status === 'distributed')
      .reduce((sum, record) => sum + parseFloat(record.amount), 0) || 0;

    res.json({
      success: true,
      data: {
        task,
        stats: {
          totalParticipants: totalParticipants || 0,
          completedCount: completedCount || 0,
          inProgressCount: inProgressCount || 0,
          completionRate: totalParticipants ? ((completedCount || 0) / totalParticipants * 100).toFixed(2) : '0',
          totalRewards: totalRewards.toFixed(8),
          distributedRewards: distributedRewards.toFixed(8)
        },
        userTasks: userTasks || []
      }
    });
  } catch (error) {
    console.error('Get task detail error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * 创建新任务
 * POST /api/admin/tasks
 */
router.post('/', authenticateAdmin, requireRole(['super_admin', 'admin']), async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      title,
      description,
      task_type,
      reward_amount,
      reward_type,
      requirements,
      start_date,
      end_date,
      max_participants,
      is_active = true
    } = req.body;

    if (!title || !description || !task_type || !reward_amount) {
      res.status(400).json({
        success: false,
        error: 'Title, description, task_type, and reward_amount are required'
      });
      return;
    }

    const adminUser = (req as any).admin;

    // 创建新任务
    const { data: newTask, error: insertError } = await supabase
      .from('tasks')
      .insert({
        title,
        description,
        task_type,
        reward_amount: parseFloat(reward_amount),
        reward_type: reward_type || 'LUM',
        requirements: requirements || {},
        start_date,
        end_date,
        max_participants: max_participants ? parseInt(max_participants) : null,
        is_active,
        created_by: adminUser.id
      })
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    // 记录管理员操作日志
    await supabase
      .from('admin_logs')
      .insert({
        admin_id: adminUser.id,
        action: 'task_create',
        target_type: 'task',
        target_id: newTask.id,
        details: {
          title,
          task_type,
          reward_amount
        }
      });

    res.json({
      success: true,
      message: 'Task created successfully',
      data: {
        task: newTask
      }
    });
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * 更新任务
 * PUT /api/admin/tasks/:id
 */
router.put('/:id', authenticateAdmin, requireRole(['super_admin', 'admin']), async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      task_type,
      reward_amount,
      reward_type,
      requirements,
      start_date,
      end_date,
      max_participants,
      is_active
    } = req.body;

    // 准备更新数据
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (task_type !== undefined) updateData.task_type = task_type;
    if (reward_amount !== undefined) updateData.reward_amount = parseFloat(reward_amount);
    if (reward_type !== undefined) updateData.reward_type = reward_type;
    if (requirements !== undefined) updateData.requirements = requirements;
    if (start_date !== undefined) updateData.start_date = start_date;
    if (end_date !== undefined) updateData.end_date = end_date;
    if (max_participants !== undefined) updateData.max_participants = max_participants ? parseInt(max_participants) : null;
    if (is_active !== undefined) updateData.is_active = is_active;

    // 更新任务
    const { error: updateError } = await supabase
      .from('tasks')
      .update(updateData)
      .eq('id', id);

    if (updateError) {
      throw updateError;
    }

    // 记录管理员操作日志
    const adminUser = (req as any).admin;
    await supabase
      .from('admin_logs')
      .insert({
        admin_id: adminUser.id,
        action: 'task_update',
        target_type: 'task',
        target_id: id,
        details: updateData
      });

    res.json({
      success: true,
      message: 'Task updated successfully'
    });
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * 删除任务
 * DELETE /api/admin/tasks/:id
 */
router.delete('/:id', authenticateAdmin, requireRole(['super_admin', 'admin']), async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // 检查是否有用户正在进行此任务
    const { count: activeUserTasks } = await supabase
      .from('user_tasks')
      .select('*', { count: 'exact', head: true })
      .eq('task_id', id)
      .eq('status', 'in_progress');

    if (activeUserTasks && activeUserTasks > 0) {
      res.status(400).json({
        success: false,
        error: 'Cannot delete task with active participants. Please deactivate the task first.'
      });
      return;
    }

    // 软删除任务（设置为非活跃状态）
    const { error: deleteError } = await supabase
      .from('tasks')
      .update({ 
        is_active: false,
        deleted_at: new Date().toISOString()
      })
      .eq('id', id);

    if (deleteError) {
      throw deleteError;
    }

    // 记录管理员操作日志
    const adminUser = (req as any).admin;
    await supabase
      .from('admin_logs')
      .insert({
        admin_id: adminUser.id,
        action: 'task_delete',
        target_type: 'task',
        target_id: id,
        details: {
          message: 'Task soft deleted'
        }
      });

    res.json({
      success: true,
      message: 'Task deleted successfully'
    });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * 获取用户任务记录
 * GET /api/admin/tasks/user-tasks
 */
router.get('/user-tasks/list', authenticateAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      task_id = '',
      user_id = '',
      status = '',
      sortBy = 'created_at', 
      sortOrder = 'desc' 
    } = req.query;

    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
    
    // 构建查询
    let query = supabase
      .from('user_tasks')
      .select(`
        *,
        tasks!inner(
          title,
          task_type,
          reward_amount
        ),
        auth.users!inner(
          email,
          raw_user_meta_data
        )
      `, { count: 'exact' });

    // 过滤条件
    if (task_id) {
      query = query.eq('task_id', task_id);
    }
    if (user_id) {
      query = query.eq('user_id', user_id);
    }
    if (status) {
      query = query.eq('status', status);
    }

    // 排序
    query = query.order(sortBy as string, { ascending: sortOrder === 'asc' });

    // 分页
    query = query.range(offset, offset + parseInt(limit as string) - 1);

    const { data: userTasks, error, count } = await query;

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      data: {
        userTasks: userTasks || [],
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total: count || 0,
          totalPages: Math.ceil((count || 0) / parseInt(limit as string))
        }
      }
    });
  } catch (error) {
    console.error('Get user tasks error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * 手动完成用户任务
 * PUT /api/admin/tasks/user-tasks/:id/complete
 */
router.put('/user-tasks/:id/complete', authenticateAdmin, requireRole(['super_admin', 'admin']), async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { reason, bonus_amount = 0 } = req.body;

    // 获取用户任务信息
    const { data: userTask, error: fetchError } = await supabase
      .from('user_tasks')
      .select(`
        *,
        tasks!inner(
          reward_amount,
          reward_type
        )
      `)
      .eq('id', id)
      .single();

    if (fetchError || !userTask) {
      res.status(404).json({
        success: false,
        error: 'User task not found'
      });
      return;
    }

    if (userTask.status === 'completed') {
      res.status(400).json({
        success: false,
        error: 'Task is already completed'
      });
      return;
    }

    // 更新用户任务状态
    const { error: updateError } = await supabase
      .from('user_tasks')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        completion_data: {
          completed_by_admin: true,
          reason,
          bonus_amount: parseFloat(bonus_amount)
        }
      })
      .eq('id', id);

    if (updateError) {
      throw updateError;
    }

    // 创建奖励记录
    const totalReward = parseFloat(userTask.tasks.reward_amount) + parseFloat(bonus_amount);
    const { error: rewardError } = await supabase
      .from('reward_records')
      .insert({
        user_id: userTask.user_id,
        task_id: userTask.task_id,
        reward_type: userTask.tasks.reward_type,
        amount: totalReward.toString(),
        status: 'pending',
        metadata: {
          completed_by_admin: true,
          base_amount: userTask.tasks.reward_amount,
          bonus_amount: parseFloat(bonus_amount),
          reason
        }
      });

    if (rewardError) {
      console.error('Create reward record error:', rewardError);
    }

    // 记录管理员操作日志
    const adminUser = (req as any).admin;
    await supabase
      .from('admin_logs')
      .insert({
        admin_id: adminUser.id,
        action: 'user_task_complete',
        target_type: 'user_task',
        target_id: id,
        details: {
          user_id: userTask.user_id,
          task_id: userTask.task_id,
          reason,
          bonus_amount: parseFloat(bonus_amount),
          total_reward: totalReward
        }
      });

    res.json({
      success: true,
      message: 'User task completed successfully'
    });
  } catch (error) {
    console.error('Complete user task error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * 获取奖励记录
 * GET /api/admin/tasks/rewards
 */
router.get('/rewards/list', authenticateAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      task_id = '',
      user_id = '',
      status = '',
      reward_type = '',
      sortBy = 'created_at', 
      sortOrder = 'desc' 
    } = req.query;

    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
    
    // 构建查询
    let query = supabase
      .from('reward_records')
      .select(`
        *,
        tasks(
          title,
          task_type
        ),
        auth.users!inner(
          email,
          raw_user_meta_data
        )
      `, { count: 'exact' });

    // 过滤条件
    if (task_id) {
      query = query.eq('task_id', task_id);
    }
    if (user_id) {
      query = query.eq('user_id', user_id);
    }
    if (status) {
      query = query.eq('status', status);
    }
    if (reward_type) {
      query = query.eq('reward_type', reward_type);
    }

    // 排序
    query = query.order(sortBy as string, { ascending: sortOrder === 'asc' });

    // 分页
    query = query.range(offset, offset + parseInt(limit as string) - 1);

    const { data: rewards, error, count } = await query;

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      data: {
        rewards: rewards || [],
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total: count || 0,
          totalPages: Math.ceil((count || 0) / parseInt(limit as string))
        }
      }
    });
  } catch (error) {
    console.error('Get rewards error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * 批量发放奖励
 * POST /api/admin/tasks/rewards/distribute
 */
router.post('/rewards/distribute', authenticateAdmin, requireRole(['super_admin', 'admin']), async (req: Request, res: Response): Promise<void> => {
  try {
    const { reward_ids } = req.body;

    if (!Array.isArray(reward_ids) || reward_ids.length === 0) {
      res.status(400).json({
        success: false,
        error: 'reward_ids must be a non-empty array'
      });
      return;
    }

    // 批量更新奖励状态
    const { error: updateError } = await supabase
      .from('reward_records')
      .update({
        status: 'distributed',
        distributed_at: new Date().toISOString()
      })
      .in('id', reward_ids)
      .eq('status', 'pending');

    if (updateError) {
      throw updateError;
    }

    // 记录管理员操作日志
    const adminUser = (req as any).admin;
    await supabase
      .from('admin_logs')
      .insert({
        admin_id: adminUser.id,
        action: 'rewards_batch_distribute',
        target_type: 'reward_record',
        target_id: null,
        details: {
          reward_ids,
          count: reward_ids.length
        }
      });

    res.json({
      success: true,
      message: `${reward_ids.length} rewards distributed successfully`
    });
  } catch (error) {
    console.error('Distribute rewards error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * 获取任务统计概览
 * GET /api/admin/tasks/stats/overview
 */
router.get('/stats/overview', authenticateAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    // 总任务数
    const { count: totalTasks } = await supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true });

    // 活跃任务数
    const { count: activeTasks } = await supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    // 总参与人次
    const { count: totalParticipations } = await supabase
      .from('user_tasks')
      .select('*', { count: 'exact', head: true });

    // 完成任务数
    const { count: completedTasks } = await supabase
      .from('user_tasks')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'completed');

    // 奖励统计
    const { data: rewardStats } = await supabase
      .from('reward_records')
      .select('amount, status');

    const totalRewards = rewardStats?.reduce((sum, record) => sum + parseFloat(record.amount), 0) || 0;
    const distributedRewards = rewardStats?.filter(r => r.status === 'distributed')
      .reduce((sum, record) => sum + parseFloat(record.amount), 0) || 0;
    const pendingRewards = rewardStats?.filter(r => r.status === 'pending')
      .reduce((sum, record) => sum + parseFloat(record.amount), 0) || 0;

    // 今日完成任务数
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const { count: todayCompleted } = await supabase
      .from('user_tasks')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'completed')
      .gte('completed_at', today.toISOString());

    res.json({
      success: true,
      data: {
        tasks: {
          total: totalTasks || 0,
          active: activeTasks || 0
        },
        participations: {
          total: totalParticipations || 0,
          completed: completedTasks || 0,
          completionRate: totalParticipations ? ((completedTasks || 0) / totalParticipations * 100).toFixed(2) : '0',
          todayCompleted: todayCompleted || 0
        },
        rewards: {
          total: totalRewards.toFixed(8),
          distributed: distributedRewards.toFixed(8),
          pending: pendingRewards.toFixed(8),
          distributionRate: totalRewards ? ((distributedRewards / totalRewards) * 100).toFixed(2) : '0'
        }
      }
    });
  } catch (error) {
    console.error('Get task stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

export default router;