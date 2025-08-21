import express, { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 获取所有会员等级
router.get('/tiers', async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('membership_tiers')
      .select('*')
      .eq('is_active', true)
      .order('level');

    if (error) {
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch membership tiers'
      });
    }

    res.json({
      success: true,
      data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

// 获取用户会员信息
router.get('/user/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const { data, error } = await supabase
      .from('user_memberships')
      .select(`
        *,
        membership_tiers(
          id,
          name,
          level,
          benefits,
          discount_percentage,
          lum_discount_percentage,
          required_points,
          badge_color
        )
      `)
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();

    if (error && error.code !== 'PGRST116') {
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch user membership'
      });
    }

    // 如果用户没有会员记录，返回默认等级
    if (!data) {
      const { data: defaultTier } = await supabase
        .from('membership_tiers')
        .select('*')
        .eq('level', 1)
        .single();

      return res.json({
        success: true,
        data: {
          user_id: userId,
          tier_id: defaultTier?.id,
          points: 0,
          total_spent: 0,
          total_lum_spent: 0,
          is_active: true,
          membership_tiers: defaultTier
        }
      });
    }

    res.json({
      success: true,
      data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

// 更新用户积分
router.post('/points/add', async (req: Request, res: Response) => {
  try {
    const { user_id, points, reason, order_id } = req.body;

    if (!user_id || !points) {
      return res.status(400).json({
        success: false,
        error: 'user_id and points are required'
      });
    }

    // 获取或创建用户会员记录
    let { data: membership } = await supabase
      .from('user_memberships')
      .select('*')
      .eq('user_id', user_id)
      .single();

    if (!membership) {
      // 创建新的会员记录
      const { data: defaultTier } = await supabase
        .from('membership_tiers')
        .select('id')
        .eq('level', 1)
        .single();

      const { data: newMembership, error: createError } = await supabase
        .from('user_memberships')
        .insert({
          user_id,
          tier_id: defaultTier?.id,
          points: 0,
          total_spent: 0,
          total_lum_spent: 0
        })
        .select()
        .single();

      if (createError) {
        return res.status(500).json({
          success: false,
          error: 'Failed to create membership'
        });
      }
      membership = newMembership;
    }

    // 更新积分
    const newPoints = membership.points + points;
    const { data: updatedMembership, error: updateError } = await supabase
      .from('user_memberships')
      .update({ points: newPoints })
      .eq('id', membership.id)
      .select()
      .single();

    if (updateError) {
      return res.status(500).json({
        success: false,
        error: 'Failed to update points'
      });
    }

    // 检查是否需要升级会员等级
    await checkAndUpgradeMembership(user_id, newPoints);

    res.json({
      success: true,
      data: {
        ...updatedMembership,
        points_added: points,
        reason
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

// 更新用户消费金额
router.post('/spending/add', async (req: Request, res: Response) => {
  try {
    const { user_id, amount, lum_amount, order_id } = req.body;

    if (!user_id || (!amount && !lum_amount)) {
      return res.status(400).json({
        success: false,
        error: 'user_id and amount or lum_amount are required'
      });
    }

    // 获取或创建用户会员记录
    let { data: membership } = await supabase
      .from('user_memberships')
      .select('*')
      .eq('user_id', user_id)
      .single();

    if (!membership) {
      const { data: defaultTier } = await supabase
        .from('membership_tiers')
        .select('id')
        .eq('level', 1)
        .single();

      const { data: newMembership, error: createError } = await supabase
        .from('user_memberships')
        .insert({
          user_id,
          tier_id: defaultTier?.id,
          points: 0,
          total_spent: 0,
          total_lum_spent: 0
        })
        .select()
        .single();

      if (createError) {
        return res.status(500).json({
          success: false,
          error: 'Failed to create membership'
        });
      }
      membership = newMembership;
    }

    // 更新消费金额
    const updateData: any = {};
    if (amount) {
      updateData.total_spent = membership.total_spent + amount;
    }
    if (lum_amount) {
      updateData.total_lum_spent = membership.total_lum_spent + lum_amount;
    }

    const { data: updatedMembership, error: updateError } = await supabase
      .from('user_memberships')
      .update(updateData)
      .eq('id', membership.id)
      .select()
      .single();

    if (updateError) {
      return res.status(500).json({
        success: false,
        error: 'Failed to update spending'
      });
    }

    // 根据消费金额计算积分（1 LUM = 1 积分）
    if (lum_amount) {
      const earnedPoints = Math.floor(lum_amount);
      await supabase
        .from('user_memberships')
        .update({ points: updatedMembership.points + earnedPoints })
        .eq('id', membership.id);

      // 检查是否需要升级会员等级
      await checkAndUpgradeMembership(user_id, updatedMembership.points + earnedPoints);
    }

    res.json({
      success: true,
      data: updatedMembership
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

// 获取用户会员权益
router.get('/benefits/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const { data: membership } = await supabase
      .from('user_memberships')
      .select(`
        *,
        membership_tiers(*)
      `)
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();

    if (!membership) {
      // 返回默认等级权益
      const { data: defaultTier } = await supabase
        .from('membership_tiers')
        .select('*')
        .eq('level', 1)
        .single();

      return res.json({
        success: true,
        data: {
          tier: defaultTier,
          benefits: defaultTier?.benefits || [],
          discount_percentage: defaultTier?.discount_percentage || 0,
          lum_discount_percentage: defaultTier?.lum_discount_percentage || 0
        }
      });
    }

    res.json({
      success: true,
      data: {
        tier: membership.membership_tiers,
        benefits: membership.membership_tiers?.benefits || [],
        discount_percentage: membership.membership_tiers?.discount_percentage || 0,
        lum_discount_percentage: membership.membership_tiers?.lum_discount_percentage || 0,
        points: membership.points,
        total_spent: membership.total_spent,
        total_lum_spent: membership.total_lum_spent
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

// 计算订单折扣
router.post('/calculate-discount', async (req: Request, res: Response) => {
  try {
    const { user_id, original_amount, original_lum_amount } = req.body;

    if (!user_id || (!original_amount && !original_lum_amount)) {
      return res.status(400).json({
        success: false,
        error: 'user_id and amount are required'
      });
    }

    // 获取用户会员信息
    const { data: membership } = await supabase
      .from('user_memberships')
      .select(`
        *,
        membership_tiers(discount_percentage, lum_discount_percentage)
      `)
      .eq('user_id', user_id)
      .eq('is_active', true)
      .single();

    let discountPercentage = 0;
    let lumDiscountPercentage = 0;

    if (membership?.membership_tiers) {
      discountPercentage = membership.membership_tiers.discount_percentage || 0;
      lumDiscountPercentage = membership.membership_tiers.lum_discount_percentage || 0;
    }

    const discountAmount = original_amount ? (original_amount * discountPercentage / 100) : 0;
    const lumDiscountAmount = original_lum_amount ? (original_lum_amount * lumDiscountPercentage / 100) : 0;

    const finalAmount = original_amount ? (original_amount - discountAmount) : 0;
    const finalLumAmount = original_lum_amount ? (original_lum_amount - lumDiscountAmount) : 0;

    res.json({
      success: true,
      data: {
        original_amount: original_amount || 0,
        original_lum_amount: original_lum_amount || 0,
        discount_percentage: discountPercentage,
        lum_discount_percentage: lumDiscountPercentage,
        discount_amount: discountAmount,
        lum_discount_amount: lumDiscountAmount,
        final_amount: finalAmount,
        final_lum_amount: finalLumAmount,
        total_savings: discountAmount + lumDiscountAmount
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

// 检查并升级会员等级的辅助函数
async function checkAndUpgradeMembership(userId: string, currentPoints: number) {
  try {
    // 获取当前用户会员信息
    const { data: membership } = await supabase
      .from('user_memberships')
      .select(`
        *,
        membership_tiers(level)
      `)
      .eq('user_id', userId)
      .single();

    if (!membership) return;

    // 获取可升级的等级
    const { data: availableTiers } = await supabase
      .from('membership_tiers')
      .select('*')
      .lte('required_points', currentPoints)
      .gt('level', membership.membership_tiers?.level || 0)
      .eq('is_active', true)
      .order('level', { ascending: false })
      .limit(1);

    if (availableTiers && availableTiers.length > 0) {
      const newTier = availableTiers[0];
      
      // 升级会员等级
      await supabase
        .from('user_memberships')
        .update({ 
          tier_id: newTier.id,
          upgraded_at: new Date().toISOString()
        })
        .eq('id', membership.id);
    }
  } catch (error) {
    console.error('Error checking membership upgrade:', error);
  }
}

export default router;