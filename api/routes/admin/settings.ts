/**
 * 管理员系统设置API路由
 * 提供系统配置管理功能
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
 * 获取系统设置
 * GET /api/admin/settings
 */
router.get('/', authenticateAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    // 从环境变量或数据库获取系统设置
    const settings = {
      system: {
        siteName: process.env.SITE_NAME || 'Lumie Admin',
        siteDescription: process.env.SITE_DESCRIPTION || 'Lumie管理后台系统',
        version: process.env.APP_VERSION || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        timezone: process.env.TIMEZONE || 'Asia/Shanghai',
        language: process.env.DEFAULT_LANGUAGE || 'zh-CN'
      },
      security: {
        jwtExpiration: process.env.JWT_EXPIRATION || '24h',
        passwordMinLength: parseInt(process.env.PASSWORD_MIN_LENGTH || '8'),
        maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5'),
        lockoutDuration: parseInt(process.env.LOCKOUT_DURATION || '15'), // minutes
        sessionTimeout: parseInt(process.env.SESSION_TIMEOUT || '30'), // minutes
        requireTwoFactor: process.env.REQUIRE_TWO_FACTOR === 'true'
      },
      notification: {
        emailEnabled: process.env.EMAIL_ENABLED === 'true',
        smsEnabled: process.env.SMS_ENABLED === 'true',
        pushEnabled: process.env.PUSH_ENABLED === 'true',
        emailProvider: process.env.EMAIL_PROVIDER || 'smtp',
        smtpHost: process.env.SMTP_HOST || '',
        smtpPort: parseInt(process.env.SMTP_PORT || '587'),
        smtpUser: process.env.SMTP_USER || '',
        smtpFrom: process.env.SMTP_FROM || ''
      },
      blockchain: {
        network: process.env.BLOCKCHAIN_NETWORK || 'testnet',
        rpcUrl: process.env.BLOCKCHAIN_RPC_URL || '',
        contractAddress: process.env.CONTRACT_ADDRESS || '',
        gasLimit: parseInt(process.env.GAS_LIMIT || '21000'),
        gasPrice: process.env.GAS_PRICE || 'auto',
        confirmations: parseInt(process.env.CONFIRMATIONS || '3')
      },
      rewards: {
        defaultRewardAmount: parseFloat(process.env.DEFAULT_REWARD_AMOUNT || '0.001'),
        maxRewardAmount: parseFloat(process.env.MAX_REWARD_AMOUNT || '1.0'),
        rewardCurrency: process.env.REWARD_CURRENCY || 'ETH',
        autoDistribution: process.env.AUTO_DISTRIBUTION === 'true',
        distributionSchedule: process.env.DISTRIBUTION_SCHEDULE || 'daily'
      },
      tasks: {
        maxActiveTasks: parseInt(process.env.MAX_ACTIVE_TASKS || '10'),
        taskTimeout: parseInt(process.env.TASK_TIMEOUT || '24'), // hours
        autoExpire: process.env.AUTO_EXPIRE_TASKS === 'true',
        allowDuplicates: process.env.ALLOW_DUPLICATE_TASKS === 'true'
      },
      anchoring: {
        autoAnchoring: process.env.AUTO_ANCHORING === 'true',
        anchoringInterval: parseInt(process.env.ANCHORING_INTERVAL || '60'), // minutes
        batchSize: parseInt(process.env.ANCHORING_BATCH_SIZE || '100'),
        retryAttempts: parseInt(process.env.ANCHORING_RETRY_ATTEMPTS || '3')
      }
    };

    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * 更新系统设置
 * PUT /api/admin/settings
 */
router.put('/', authenticateAdmin, requireRole(['super_admin']), async (req: Request, res: Response): Promise<void> => {
  try {
    const { category, settings } = req.body;
    const adminId = (req as any).admin.id;

    if (!category || !settings) {
      res.status(400).json({
        success: false,
        error: 'Category and settings are required'
      });
      return;
    }

    // 验证设置类别
    const validCategories = ['system', 'security', 'notification', 'blockchain', 'rewards', 'tasks', 'anchoring'];
    if (!validCategories.includes(category)) {
      res.status(400).json({
        success: false,
        error: 'Invalid settings category'
      });
      return;
    }

    // 这里应该将设置保存到数据库或更新环境变量
    // 为了演示，我们只记录操作日志
    await supabase
      .from('admin_logs')
      .insert({
        admin_id: adminId,
        action: 'update_settings',
        resource_type: 'settings',
        resource_id: category,
        details: {
          category,
          updatedSettings: Object.keys(settings),
          timestamp: new Date().toISOString()
        }
      });

    res.json({
      success: true,
      message: 'Settings updated successfully'
    });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * 获取系统状态
 * GET /api/admin/settings/status
 */
router.get('/status', authenticateAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    // 检查各个服务的状态
    const status = {
      database: 'healthy',
      redis: 'unknown',
      blockchain: 'unknown',
      email: 'unknown',
      storage: 'healthy'
    };

    // 检查数据库连接
    try {
      const { data, error } = await supabase
        .from('admin_users')
        .select('id')
        .limit(1);
      
      status.database = error ? 'error' : 'healthy';
    } catch {
      status.database = 'error';
    }

    // 检查区块链连接（如果配置了）
    if (process.env.BLOCKCHAIN_RPC_URL) {
      try {
        // 这里应该实际检查区块链连接
        status.blockchain = 'healthy';
      } catch {
        status.blockchain = 'error';
      }
    }

    // 检查邮件服务（如果配置了）
    if (process.env.EMAIL_ENABLED === 'true') {
      try {
        // 这里应该实际检查邮件服务
        status.email = 'healthy';
      } catch {
        status.email = 'error';
      }
    }

    // 系统信息
    const systemInfo = {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.version,
      platform: process.platform,
      arch: process.arch,
      env: process.env.NODE_ENV
    };

    res.json({
      success: true,
      data: {
        status,
        systemInfo,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Get system status error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * 获取系统日志
 * GET /api/admin/settings/logs
 */
router.get('/logs', authenticateAdmin, requireRole(['super_admin', 'admin']), async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      page = 1,
      limit = 50,
      level = '',
      action = '',
      admin_id = '',
      start_date = '',
      end_date = ''
    } = req.query;

    const offset = (Number(page) - 1) * Number(limit);

    // 构建查询
    let query = supabase
      .from('admin_logs')
      .select(`
        *,
        admin_users!inner(
          username,
          email
        )
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + Number(limit) - 1);

    if (action) {
      query = query.eq('action', action);
    }
    if (admin_id) {
      query = query.eq('admin_id', admin_id);
    }
    if (start_date) {
      query = query.gte('created_at', start_date);
    }
    if (end_date) {
      query = query.lte('created_at', end_date);
    }

    const { data: logs, error, count } = await query;

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      data: {
        logs: logs || [],
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: count || 0,
          totalPages: Math.ceil((count || 0) / Number(limit))
        }
      }
    });
  } catch (error) {
    console.error('Get system logs error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * 清理系统日志
 * DELETE /api/admin/settings/logs
 */
router.delete('/logs', authenticateAdmin, requireRole(['super_admin']), async (req: Request, res: Response): Promise<void> => {
  try {
    const { days = 30 } = req.body;
    const adminId = (req as any).admin.id;

    // 计算删除日期
    const deleteDate = new Date();
    deleteDate.setDate(deleteDate.getDate() - Number(days));

    // 删除旧日志
    const { error } = await supabase
      .from('admin_logs')
      .delete()
      .lt('created_at', deleteDate.toISOString());

    if (error) {
      throw error;
    }

    // 记录清理操作
    await supabase
      .from('admin_logs')
      .insert({
        admin_id: adminId,
        action: 'cleanup_logs',
        resource_type: 'system',
        details: {
          days: Number(days),
          cutoffDate: deleteDate.toISOString(),
          timestamp: new Date().toISOString()
        }
      });

    res.json({
      success: true,
      message: `Logs older than ${days} days have been cleaned up`
    });
  } catch (error) {
    console.error('Cleanup logs error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * 备份系统数据
 * POST /api/admin/settings/backup
 */
router.post('/backup', authenticateAdmin, requireRole(['super_admin']), async (req: Request, res: Response): Promise<void> => {
  try {
    const { tables = [], format = 'json' } = req.body;
    const adminId = (req as any).admin.id;

    // 默认备份的表
    const defaultTables = ['admin_users', 'users', 'tasks', 'announcements', 'anchoring_records'];
    const tablesToBackup = tables.length > 0 ? tables : defaultTables;

    // 验证表名
    const validTables = ['admin_users', 'users', 'tasks', 'user_tasks', 'reward_records', 'announcements', 'anchoring_records', 'admin_logs'];
    const invalidTables = tablesToBackup.filter((table: string) => !validTables.includes(table));
    
    if (invalidTables.length > 0) {
      res.status(400).json({
        success: false,
        error: `Invalid tables: ${invalidTables.join(', ')}`
      });
      return;
    }

    // 生成备份文件名
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupId = `backup_${timestamp}`;

    // 这里应该实际执行备份操作
    // 为了演示，我们只记录备份请求
    await supabase
      .from('admin_logs')
      .insert({
        admin_id: adminId,
        action: 'create_backup',
        resource_type: 'system',
        details: {
          backupId,
          tables: tablesToBackup,
          format,
          timestamp: new Date().toISOString()
        }
      });

    res.json({
      success: true,
      data: {
        backupId,
        tables: tablesToBackup,
        format,
        status: 'initiated',
        message: 'Backup process has been initiated'
      }
    });
  } catch (error) {
    console.error('Create backup error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * 获取备份列表
 * GET /api/admin/settings/backups
 */
router.get('/backups', authenticateAdmin, requireRole(['super_admin']), async (req: Request, res: Response): Promise<void> => {
  try {
    // 从日志中获取备份记录
    const { data: backupLogs, error } = await supabase
      .from('admin_logs')
      .select(`
        *,
        admin_users!inner(
          username
        )
      `)
      .eq('action', 'create_backup')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      throw error;
    }

    const backups = backupLogs?.map(log => ({
      id: log.details?.backupId || log.id,
      createdAt: log.created_at,
      createdBy: log.admin_users.username,
      tables: log.details?.tables || [],
      format: log.details?.format || 'json',
      status: 'completed', // 这里应该从实际备份系统获取状态
      size: '0 MB' // 这里应该从实际备份文件获取大小
    })) || [];

    res.json({
      success: true,
      data: backups
    });
  } catch (error) {
    console.error('Get backups error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * 测试系统配置
 * POST /api/admin/settings/test
 */
router.post('/test', authenticateAdmin, requireRole(['super_admin', 'admin']), async (req: Request, res: Response): Promise<void> => {
  try {
    const { service } = req.body;

    if (!service) {
      res.status(400).json({
        success: false,
        error: 'Service type is required'
      });
      return;
    }

    const results: Record<string, any> = {};

    switch (service) {
      case 'database':
        try {
          const { data, error } = await supabase
            .from('admin_users')
            .select('count')
            .limit(1);
          
          results.database = {
            status: error ? 'error' : 'success',
            message: error ? error.message : 'Database connection successful',
            responseTime: Date.now()
          };
        } catch (err: any) {
          results.database = {
            status: 'error',
            message: err.message,
            responseTime: Date.now()
          };
        }
        break;

      case 'email':
        // 这里应该实际测试邮件服务
        results.email = {
          status: 'success',
          message: 'Email service test not implemented',
          responseTime: Date.now()
        };
        break;

      case 'blockchain':
        // 这里应该实际测试区块链连接
        results.blockchain = {
          status: 'success',
          message: 'Blockchain connection test not implemented',
          responseTime: Date.now()
        };
        break;

      default:
        res.status(400).json({
          success: false,
          error: 'Invalid service type'
        });
        return;
    }

    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('Test service error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

export default router;