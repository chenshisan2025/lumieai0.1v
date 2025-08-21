/**
 * 管理员公告管理API路由
 * 提供公告的CRUD操作和发布管理功能
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
 * 获取公告列表
 * GET /api/admin/announcements
 */
router.get('/', authenticateAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      type = '',
      status = '',
      search = '',
      sortBy = 'created_at', 
      sortOrder = 'desc' 
    } = req.query;

    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
    
    // 构建查询
    let query = supabase
      .from('announcements')
      .select(`
        *,
        admin_users!inner(
          username,
          email
        )
      `, { count: 'exact' });

    // 类型过滤
    if (type) {
      query = query.eq('type', type);
    }

    // 状态过滤
    if (status) {
      query = query.eq('status', status);
    }

    // 搜索过滤
    if (search) {
      query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%`);
    }

    // 排序
    query = query.order(sortBy as string, { ascending: sortOrder === 'asc' });

    // 分页
    query = query.range(offset, offset + parseInt(limit as string) - 1);

    const { data: announcements, error, count } = await query;

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      data: {
        announcements: announcements || [],
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total: count || 0,
          totalPages: Math.ceil((count || 0) / parseInt(limit as string))
        }
      }
    });
  } catch (error) {
    console.error('Get announcements error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * 获取公告详情
 * GET /api/admin/announcements/:id
 */
router.get('/:id', authenticateAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const { data: announcement, error } = await supabase
      .from('announcements')
      .select(`
        *,
        admin_users!inner(
          username,
          email
        )
      `)
      .eq('id', id)
      .single();

    if (error || !announcement) {
      res.status(404).json({
        success: false,
        error: 'Announcement not found'
      });
      return;
    }

    res.json({
      success: true,
      data: {
        announcement
      }
    });
  } catch (error) {
    console.error('Get announcement detail error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * 创建新公告
 * POST /api/admin/announcements
 */
router.post('/', authenticateAdmin, requireRole(['super_admin', 'admin']), async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      title,
      content,
      type,
      priority,
      target_audience,
      publish_at,
      expire_at,
      is_pinned = false,
      status = 'draft'
    } = req.body;

    if (!title || !content || !type) {
      res.status(400).json({
        success: false,
        error: 'Title, content, and type are required'
      });
      return;
    }

    const adminUser = (req as any).admin;

    // 创建新公告
    const { data: newAnnouncement, error: insertError } = await supabase
      .from('announcements')
      .insert({
        title,
        content,
        type,
        priority: priority || 'normal',
        target_audience: target_audience || 'all',
        publish_at: publish_at || new Date().toISOString(),
        expire_at,
        is_pinned,
        status,
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
        action: 'announcement_create',
        target_type: 'announcement',
        target_id: newAnnouncement.id,
        details: {
          title,
          type,
          status
        }
      });

    res.json({
      success: true,
      message: 'Announcement created successfully',
      data: {
        announcement: newAnnouncement
      }
    });
  } catch (error) {
    console.error('Create announcement error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * 更新公告
 * PUT /api/admin/announcements/:id
 */
router.put('/:id', authenticateAdmin, requireRole(['super_admin', 'admin']), async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      title,
      content,
      type,
      priority,
      target_audience,
      publish_at,
      expire_at,
      is_pinned,
      status
    } = req.body;

    // 准备更新数据
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (type !== undefined) updateData.type = type;
    if (priority !== undefined) updateData.priority = priority;
    if (target_audience !== undefined) updateData.target_audience = target_audience;
    if (publish_at !== undefined) updateData.publish_at = publish_at;
    if (expire_at !== undefined) updateData.expire_at = expire_at;
    if (is_pinned !== undefined) updateData.is_pinned = is_pinned;
    if (status !== undefined) updateData.status = status;

    // 更新公告
    const { error: updateError } = await supabase
      .from('announcements')
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
        action: 'announcement_update',
        target_type: 'announcement',
        target_id: id,
        details: updateData
      });

    res.json({
      success: true,
      message: 'Announcement updated successfully'
    });
  } catch (error) {
    console.error('Update announcement error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * 删除公告
 * DELETE /api/admin/announcements/:id
 */
router.delete('/:id', authenticateAdmin, requireRole(['super_admin', 'admin']), async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // 软删除公告
    const { error: deleteError } = await supabase
      .from('announcements')
      .update({ 
        status: 'deleted',
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
        action: 'announcement_delete',
        target_type: 'announcement',
        target_id: id,
        details: {
          message: 'Announcement soft deleted'
        }
      });

    res.json({
      success: true,
      message: 'Announcement deleted successfully'
    });
  } catch (error) {
    console.error('Delete announcement error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * 发布公告
 * POST /api/admin/announcements/:id/publish
 */
router.post('/:id/publish', authenticateAdmin, requireRole(['super_admin', 'admin']), async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { publish_at } = req.body;

    // 更新公告状态为已发布
    const { error: updateError } = await supabase
      .from('announcements')
      .update({
        status: 'published',
        publish_at: publish_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
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
        action: 'announcement_publish',
        target_type: 'announcement',
        target_id: id,
        details: {
          publish_at: publish_at || new Date().toISOString()
        }
      });

    res.json({
      success: true,
      message: 'Announcement published successfully'
    });
  } catch (error) {
    console.error('Publish announcement error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * 撤回公告
 * POST /api/admin/announcements/:id/unpublish
 */
router.post('/:id/unpublish', authenticateAdmin, requireRole(['super_admin', 'admin']), async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // 更新公告状态为草稿
    const { error: updateError } = await supabase
      .from('announcements')
      .update({
        status: 'draft',
        updated_at: new Date().toISOString()
      })
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
        action: 'announcement_unpublish',
        target_type: 'announcement',
        target_id: id,
        details: {
          message: 'Announcement unpublished'
        }
      });

    res.json({
      success: true,
      message: 'Announcement unpublished successfully'
    });
  } catch (error) {
    console.error('Unpublish announcement error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * 批量操作公告
 * POST /api/admin/announcements/batch
 */
router.post('/batch', authenticateAdmin, requireRole(['super_admin', 'admin']), async (req: Request, res: Response): Promise<void> => {
  try {
    const { announcement_ids, action, data = {} } = req.body;

    if (!Array.isArray(announcement_ids) || announcement_ids.length === 0) {
      res.status(400).json({
        success: false,
        error: 'announcement_ids must be a non-empty array'
      });
      return;
    }

    if (!action) {
      res.status(400).json({
        success: false,
        error: 'action is required'
      });
      return;
    }

    let updateData: any = {
      updated_at: new Date().toISOString()
    };

    switch (action) {
      case 'publish':
        updateData.status = 'published';
        updateData.publish_at = data.publish_at || new Date().toISOString();
        break;
      case 'unpublish':
        updateData.status = 'draft';
        break;
      case 'delete':
        updateData.status = 'deleted';
        updateData.deleted_at = new Date().toISOString();
        break;
      case 'pin':
        updateData.is_pinned = true;
        break;
      case 'unpin':
        updateData.is_pinned = false;
        break;
      default:
        res.status(400).json({
          success: false,
          error: 'Invalid action'
        });
        return;
    }

    // 批量更新公告
    const { error: updateError } = await supabase
      .from('announcements')
      .update(updateData)
      .in('id', announcement_ids);

    if (updateError) {
      throw updateError;
    }

    // 记录管理员操作日志
    const adminUser = (req as any).admin;
    await supabase
      .from('admin_logs')
      .insert({
        admin_id: adminUser.id,
        action: `announcement_batch_${action}`,
        target_type: 'announcement',
        target_id: null,
        details: {
          announcement_ids,
          count: announcement_ids.length,
          action,
          data
        }
      });

    res.json({
      success: true,
      message: `${announcement_ids.length} announcements ${action}ed successfully`
    });
  } catch (error) {
    console.error('Batch announcement operation error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * 获取公告统计
 * GET /api/admin/announcements/stats
 */
router.get('/stats/overview', authenticateAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    // 总公告数
    const { count: totalAnnouncements } = await supabase
      .from('announcements')
      .select('*', { count: 'exact', head: true })
      .neq('status', 'deleted');

    // 已发布公告数
    const { count: publishedAnnouncements } = await supabase
      .from('announcements')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'published');

    // 草稿公告数
    const { count: draftAnnouncements } = await supabase
      .from('announcements')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'draft');

    // 置顶公告数
    const { count: pinnedAnnouncements } = await supabase
      .from('announcements')
      .select('*', { count: 'exact', head: true })
      .eq('is_pinned', true)
      .neq('status', 'deleted');

    // 按类型统计
    const { data: typeStats } = await supabase
      .from('announcements')
      .select('type')
      .neq('status', 'deleted');

    const typeCount = typeStats?.reduce((acc, item) => {
      acc[item.type] = (acc[item.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    // 按优先级统计
    const { data: priorityStats } = await supabase
      .from('announcements')
      .select('priority')
      .neq('status', 'deleted');

    const priorityCount = priorityStats?.reduce((acc, item) => {
      acc[item.priority] = (acc[item.priority] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    // 今日发布的公告数
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const { count: todayPublished } = await supabase
      .from('announcements')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'published')
      .gte('publish_at', today.toISOString());

    res.json({
      success: true,
      data: {
        overview: {
          total: totalAnnouncements || 0,
          published: publishedAnnouncements || 0,
          draft: draftAnnouncements || 0,
          pinned: pinnedAnnouncements || 0,
          todayPublished: todayPublished || 0
        },
        byType: typeCount,
        byPriority: priorityCount
      }
    });
  } catch (error) {
    console.error('Get announcement stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

export default router;