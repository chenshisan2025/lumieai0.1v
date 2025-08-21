/**
 * 管理员认证API路由
 * 处理管理员登录、注销、token验证等
 */
import { Router, type Request, type Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';

const router = Router();

// Supabase客户端
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// JWT密钥
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// 管理员认证中间件
export const authenticateAdmin = async (req: Request, res: Response, next: any) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Access token required'
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    // 验证管理员是否存在且活跃
    const { data: admin, error } = await supabase
      .from('admin_users')
      .select('*')
      .eq('id', decoded.adminId)
      .eq('is_active', true)
      .single();

    if (error || !admin) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token'
      });
    }

    req.admin = admin;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: 'Invalid token'
    });
  }
};

// 角色权限检查中间件
export const requireRole = (roles: string[]) => {
  return (req: Request, res: Response, next: any) => {
    if (!req.admin || !roles.includes(req.admin.role)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions'
      });
    }
    next();
  };
};

// 记录管理员操作日志
const logAdminAction = async (adminId: number, action: string, details: any, req: Request) => {
  try {
    await supabase
      .from('admin_logs')
      .insert({
        admin_id: adminId,
        action,
        details,
        ip_address: req.ip,
        user_agent: req.get('User-Agent')
      });
  } catch (error) {
    console.error('Failed to log admin action:', error);
  }
};

/**
 * 管理员登录
 * POST /api/admin/auth/login
 */
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      res.status(400).json({
        success: false,
        error: 'Username and password are required'
      });
      return;
    }

    // 查找管理员用户
    const { data: admin, error } = await supabase
      .from('admin_users')
      .select('*')
      .eq('username', username)
      .eq('is_active', true)
      .single();

    if (error || !admin) {
      res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
      return;
    }

    // 验证密码
    const isValidPassword = await bcrypt.compare(password, admin.password_hash);
    if (!isValidPassword) {
      res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
      return;
    }

    // 生成JWT token
    const token = jwt.sign(
      {
        adminId: admin.id,
        username: admin.username,
        role: admin.role
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions
    );

    // 更新最后登录时间
    await supabase
      .from('admin_users')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', admin.id);

    // 记录登录日志
    await logAdminAction(admin.id, 'login', { username }, req);

    res.json({
      success: true,
      data: {
        token,
        admin: {
          id: admin.id,
          username: admin.username,
          email: admin.email,
          role: admin.role,
          full_name: admin.full_name,
          avatar_url: admin.avatar_url
        }
      }
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * 管理员注销
 * POST /api/admin/auth/logout
 */
router.post('/logout', authenticateAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    // 记录注销日志
    await logAdminAction(req.admin.id, 'logout', {}, req);

    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Admin logout error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * 验证token
 * GET /api/admin/auth/verify
 */
router.get('/verify', authenticateAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    res.json({
      success: true,
      data: {
        admin: {
          id: req.admin.id,
          username: req.admin.username,
          email: req.admin.email,
          role: req.admin.role,
          full_name: req.admin.full_name,
          avatar_url: req.admin.avatar_url
        }
      }
    });
  } catch (error) {
    console.error('Admin verify error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * 修改密码
 * PUT /api/admin/auth/change-password
 */
router.put('/change-password', authenticateAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      res.status(400).json({
        success: false,
        error: 'Current password and new password are required'
      });
      return;
    }

    if (newPassword.length < 6) {
      res.status(400).json({
        success: false,
        error: 'New password must be at least 6 characters long'
      });
      return;
    }

    // 获取管理员完整信息
    const { data: adminData, error: adminError } = await supabase
      .from('admin_users')
      .select('password_hash')
      .eq('id', req.admin.id)
      .single();

    if (adminError || !adminData) {
      res.status(500).json({
        success: false,
        error: 'Failed to get admin data'
      });
      return;
    }

    // 验证当前密码
    const isValidPassword = await bcrypt.compare(currentPassword, adminData.password_hash);
    if (!isValidPassword) {
      res.status(401).json({
        success: false,
        error: 'Current password is incorrect'
      });
      return;
    }

    // 加密新密码
    const saltRounds = 10;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // 更新密码
    const { error } = await supabase
      .from('admin_users')
      .update({ password_hash: newPasswordHash })
      .eq('id', req.admin.id);

    if (error) {
      throw error;
    }

    // 记录密码修改日志
    await logAdminAction(req.admin.id, 'change_password', {}, req);

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * 获取管理员信息
 * GET /api/admin/auth/profile
 */
router.get('/profile', authenticateAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    res.json({
      success: true,
      data: {
        admin: {
          id: req.admin.id,
          username: req.admin.username,
          email: req.admin.email,
          role: req.admin.role,
          full_name: req.admin.full_name,
          avatar_url: req.admin.avatar_url,
          last_login_at: req.admin.last_login_at,
          created_at: req.admin.created_at
        }
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * 更新管理员信息
 * PUT /api/admin/auth/profile
 */
router.put('/profile', authenticateAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { full_name, email, avatar_url } = req.body;
    const updateData: any = {};

    if (full_name !== undefined) updateData.full_name = full_name;
    if (email !== undefined) updateData.email = email;
    if (avatar_url !== undefined) updateData.avatar_url = avatar_url;

    if (Object.keys(updateData).length === 0) {
      res.status(400).json({
        success: false,
        error: 'No valid fields to update'
      });
      return;
    }

    // 如果更新邮箱，检查是否已存在
    if (email && email !== req.admin.email) {
      const { data: existingAdmin } = await supabase
        .from('admin_users')
        .select('id')
        .eq('email', email)
        .neq('id', req.admin.id)
        .single();

      if (existingAdmin) {
        res.status(400).json({
          success: false,
          error: 'Email already exists'
        });
        return;
      }
    }

    const { data, error } = await supabase
      .from('admin_users')
      .update(updateData)
      .eq('id', req.admin.id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    // 记录更新日志
    await logAdminAction(req.admin.id, 'update_profile', updateData, req);

    res.json({
      success: true,
      data: {
        admin: {
          id: data.id,
          username: data.username,
          email: data.email,
          role: data.role,
          full_name: data.full_name,
          avatar_url: data.avatar_url
        }
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

export default router;