/**
 * 管理员锚定记录管理API路由
 * 提供锚定记录查询、管理和统计功能
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
 * 获取锚定记录列表
 * GET /api/admin/anchoring
 */
router.get('/', authenticateAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status = '', 
      anchor_type = '',
      user_id = '',
      date_from = '',
      date_to = '',
      sortBy = 'created_at', 
      sortOrder = 'desc' 
    } = req.query;

    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
    
    // 构建查询
    let query = supabase
      .from('anchoring_records')
      .select(`
        *,
        auth.users!inner(
          email,
          raw_user_meta_data
        )
      `, { count: 'exact' });

    // 状态过滤
    if (status) {
      query = query.eq('status', status);
    }

    // 锚定类型过滤
    if (anchor_type) {
      query = query.eq('anchor_type', anchor_type);
    }

    // 用户过滤
    if (user_id) {
      query = query.eq('user_id', user_id);
    }

    // 日期范围过滤
    if (date_from) {
      query = query.gte('created_at', date_from);
    }
    if (date_to) {
      query = query.lte('created_at', date_to);
    }

    // 排序
    query = query.order(sortBy as string, { ascending: sortOrder === 'asc' });

    // 分页
    query = query.range(offset, offset + parseInt(limit as string) - 1);

    const { data: records, error, count } = await query;

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      data: {
        records: records || [],
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total: count || 0,
          totalPages: Math.ceil((count || 0) / parseInt(limit as string))
        }
      }
    });
  } catch (error) {
    console.error('Get anchoring records error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * 获取锚定记录详情
 * GET /api/admin/anchoring/:id
 */
router.get('/:id', authenticateAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const { data: record, error } = await supabase
      .from('anchoring_records')
      .select(`
        *,
        auth.users!inner(
          id,
          email,
          raw_user_meta_data
        )
      `)
      .eq('id', id)
      .single();

    if (error || !record) {
      res.status(404).json({
        success: false,
        error: 'Anchoring record not found'
      });
      return;
    }

    // 获取相关的管理员操作日志
    const { data: logs } = await supabase
      .from('admin_logs')
      .select(`
        *,
        admin_users!inner(
          username,
          email
        )
      `)
      .eq('target_type', 'anchoring_record')
      .eq('target_id', id)
      .order('created_at', { ascending: false });

    res.json({
      success: true,
      data: {
        record,
        logs: logs || []
      }
    });
  } catch (error) {
    console.error('Get anchoring record detail error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * 更新锚定记录状态
 * PUT /api/admin/anchoring/:id/status
 */
router.put('/:id/status', authenticateAdmin, requireRole(['super_admin', 'admin']), async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, reason, tx_hash } = req.body;

    if (!['pending', 'confirmed', 'failed'].includes(status)) {
      res.status(400).json({
        success: false,
        error: 'Invalid status. Must be "pending", "confirmed", or "failed"'
      });
      return;
    }

    // 准备更新数据
    const updateData: any = {
      status,
      updated_at: new Date().toISOString()
    };

    if (status === 'confirmed' && tx_hash) {
      updateData.tx_hash = tx_hash;
      updateData.confirmed_at = new Date().toISOString();
    } else if (status === 'failed' && reason) {
      updateData.failure_reason = reason;
    }

    // 更新锚定记录
    const { error: updateError } = await supabase
      .from('anchoring_records')
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
        action: 'anchoring_status_update',
        target_type: 'anchoring_record',
        target_id: id,
        details: {
          old_status: 'pending', // 这里可以从数据库获取原状态
          new_status: status,
          reason,
          tx_hash
        }
      });

    res.json({
      success: true,
      message: 'Anchoring record status updated successfully'
    });
  } catch (error) {
    console.error('Update anchoring status error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * 批量处理锚定记录
 * POST /api/admin/anchoring/batch
 */
router.post('/batch', authenticateAdmin, requireRole(['super_admin', 'admin']), async (req: Request, res: Response): Promise<void> => {
  try {
    const { action, record_ids, status, reason } = req.body;

    if (!['update_status', 'delete'].includes(action)) {
      res.status(400).json({
        success: false,
        error: 'Invalid action. Must be "update_status" or "delete"'
      });
      return;
    }

    if (!Array.isArray(record_ids) || record_ids.length === 0) {
      res.status(400).json({
        success: false,
        error: 'record_ids must be a non-empty array'
      });
      return;
    }

    const adminUser = (req as any).admin;
    let successCount = 0;
    let errorCount = 0;

    if (action === 'update_status') {
      if (!['pending', 'confirmed', 'failed'].includes(status)) {
        res.status(400).json({
          success: false,
          error: 'Invalid status for batch update'
        });
        return;
      }

      // 批量更新状态
      const updateData: any = {
        status,
        updated_at: new Date().toISOString()
      };

      if (status === 'failed' && reason) {
        updateData.failure_reason = reason;
      }

      const { error: batchUpdateError } = await supabase
        .from('anchoring_records')
        .update(updateData)
        .in('id', record_ids);

      if (batchUpdateError) {
        throw batchUpdateError;
      }

      successCount = record_ids.length;

      // 记录批量操作日志
      await supabase
        .from('admin_logs')
        .insert({
          admin_id: adminUser.id,
          action: 'anchoring_batch_update',
          target_type: 'anchoring_record',
          target_id: null,
          details: {
            record_ids,
            new_status: status,
            reason,
            count: successCount
          }
        });
    } else if (action === 'delete') {
      // 批量删除（软删除或标记为已删除）
      const { error: batchDeleteError } = await supabase
        .from('anchoring_records')
        .update({ 
          status: 'deleted',
          updated_at: new Date().toISOString()
        })
        .in('id', record_ids);

      if (batchDeleteError) {
        throw batchDeleteError;
      }

      successCount = record_ids.length;

      // 记录批量删除日志
      await supabase
        .from('admin_logs')
        .insert({
          admin_id: adminUser.id,
          action: 'anchoring_batch_delete',
          target_type: 'anchoring_record',
          target_id: null,
          details: {
            record_ids,
            count: successCount
          }
        });
    }

    res.json({
      success: true,
      message: `Batch ${action} completed`,
      data: {
        successCount,
        errorCount,
        totalCount: record_ids.length
      }
    });
  } catch (error) {
    console.error('Batch operation error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * 获取锚定统计数据
 * GET /api/admin/anchoring/stats
 */
router.get('/stats/overview', authenticateAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { period = '7d' } = req.query;
    
    // 计算时间范围
    const now = new Date();
    let startDate = new Date();
    
    switch (period) {
      case '24h':
        startDate.setDate(now.getDate() - 1);
        break;
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(now.getDate() - 90);
        break;
      default:
        startDate.setDate(now.getDate() - 7);
    }

    // 总锚定记录数
    const { count: totalRecords } = await supabase
      .from('anchoring_records')
      .select('*', { count: 'exact', head: true });

    // 指定时间段内的记录数
    const { count: periodRecords } = await supabase
      .from('anchoring_records')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startDate.toISOString());

    // 按状态统计
    const { data: statusStats } = await supabase
      .from('anchoring_records')
      .select('status')
      .gte('created_at', startDate.toISOString());

    const statusCounts = {
      pending: 0,
      confirmed: 0,
      failed: 0
    };

    statusStats?.forEach(record => {
      if (statusCounts.hasOwnProperty(record.status)) {
        statusCounts[record.status as keyof typeof statusCounts]++;
      }
    });

    // 按锚定类型统计
    const { data: typeStats } = await supabase
      .from('anchoring_records')
      .select('anchor_type')
      .gte('created_at', startDate.toISOString());

    const typeCounts: Record<string, number> = {};
    typeStats?.forEach(record => {
      typeCounts[record.anchor_type] = (typeCounts[record.anchor_type] || 0) + 1;
    });

    // 成功率计算
    const successRate = periodRecords ? 
      ((statusCounts.confirmed / periodRecords) * 100).toFixed(2) : '0';

    // 获取每日趋势数据
    const dailyTrend = [];
    const days = period === '24h' ? 24 : (period === '7d' ? 7 : (period === '30d' ? 30 : 90));
    const isHourly = period === '24h';
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      if (isHourly) {
        date.setHours(date.getHours() - i);
        const nextHour = new Date(date);
        nextHour.setHours(nextHour.getHours() + 1);
        
        const { count } = await supabase
          .from('anchoring_records')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', date.toISOString())
          .lt('created_at', nextHour.toISOString());
        
        dailyTrend.push({
          date: date.toISOString(),
          count: count || 0
        });
      } else {
        date.setDate(date.getDate() - i);
        const nextDate = new Date(date);
        nextDate.setDate(nextDate.getDate() + 1);
        
        const { count } = await supabase
          .from('anchoring_records')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', date.toISOString().split('T')[0])
          .lt('created_at', nextDate.toISOString().split('T')[0]);
        
        dailyTrend.push({
          date: date.toISOString().split('T')[0],
          count: count || 0
        });
      }
    }

    res.json({
      success: true,
      data: {
        overview: {
          totalRecords: totalRecords || 0,
          periodRecords: periodRecords || 0,
          successRate,
          statusCounts,
          typeCounts
        },
        trend: dailyTrend
      }
    });
  } catch (error) {
    console.error('Get anchoring stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * 手动触发锚定操作
 * POST /api/admin/anchoring/trigger
 */
router.post('/trigger', authenticateAdmin, requireRole(['super_admin', 'admin']), async (req: Request, res: Response): Promise<void> => {
  try {
    const { anchor_type, data_hash, metadata } = req.body;

    if (!anchor_type || !data_hash) {
      res.status(400).json({
        success: false,
        error: 'anchor_type and data_hash are required'
      });
      return;
    }

    const adminUser = (req as any).admin;

    // 创建新的锚定记录
    const { data: newRecord, error: insertError } = await supabase
      .from('anchoring_records')
      .insert({
        user_id: adminUser.id, // 使用管理员ID作为触发者
        anchor_type,
        data_hash,
        metadata: metadata || {},
        status: 'pending',
        created_by_admin: true
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
        action: 'anchoring_manual_trigger',
        target_type: 'anchoring_record',
        target_id: newRecord.id,
        details: {
          anchor_type,
          data_hash,
          metadata
        }
      });

    res.json({
      success: true,
      message: 'Anchoring operation triggered successfully',
      data: {
        record: newRecord
      }
    });
  } catch (error) {
    console.error('Trigger anchoring error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

export default router;