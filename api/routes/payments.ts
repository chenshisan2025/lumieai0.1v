import express, { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 创建支付记录
router.post('/create', async (req: Request, res: Response) => {
  try {
    const { 
      order_id, 
      user_id, 
      amount, 
      bnb_amount, 
      payment_method = 'bnb_token',
      wallet_address 
    } = req.body;

    if (!order_id || !user_id || !bnb_amount || !wallet_address) {
      return res.status(400).json({
        success: false,
        error: 'order_id, user_id, bnb_amount and wallet_address are required'
      });
    }

    // 验证订单存在且状态正确
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, order_status, payment_status, total_bnb_amount')
      .eq('id', order_id)
      .eq('user_id', user_id)
      .single();

    if (orderError || !order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    if (order.payment_status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: 'Order payment is not pending'
      });
    }

    if (order.total_bnb_amount !== bnb_amount) {
      return res.status(400).json({
        success: false,
        error: 'Payment amount mismatch'
      });
    }

    // 生成支付ID
    const paymentId = `PAY${Date.now()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

    // 创建支付记录
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        payment_id: paymentId,
        order_id,
        user_id,
        amount: amount || 0,
        bnb_amount,
        payment_method,
        payment_status: 'pending',
        wallet_address
      })
      .select()
      .single();

    if (paymentError) {
      return res.status(500).json({
        success: false,
        error: 'Failed to create payment record'
      });
    }

    res.status(201).json({
      success: true,
      data: payment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

// 验证BNB代币余额
router.post('/verify-balance', async (req: Request, res: Response) => {
  try {
    const { wallet_address, required_amount } = req.body;

    if (!wallet_address || !required_amount) {
      return res.status(400).json({
        success: false,
        error: 'wallet_address and required_amount are required'
      });
    }

    // 这里应该调用区块链API来检查BNB代币余额
    // 目前模拟余额检查
    const mockBalance = 1000; // 模拟余额
    
    const hasEnoughBalance = mockBalance >= required_amount;

    res.json({
      success: true,
      data: {
        wallet_address,
        balance: mockBalance,
        required_amount,
        has_enough_balance: hasEnoughBalance
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

// 处理BNB代币支付
router.post('/process-bnb', async (req: Request, res: Response) => {
  try {
    const { 
      payment_id, 
      transaction_hash, 
      wallet_address, 
      signature 
    } = req.body;

    if (!payment_id || !transaction_hash || !wallet_address) {
      return res.status(400).json({
        success: false,
        error: 'payment_id, transaction_hash and wallet_address are required'
      });
    }

    // 获取支付记录
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('*')
      .eq('payment_id', payment_id)
      .single();

    if (paymentError || !payment) {
      return res.status(404).json({
        success: false,
        error: 'Payment not found'
      });
    }

    if (payment.payment_status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: 'Payment is not pending'
      });
    }

    // 验证交易哈希（这里应该调用区块链API验证）
    // 目前模拟验证过程
    const isValidTransaction = true; // 模拟验证结果

    if (!isValidTransaction) {
      // 更新支付状态为失败
      await supabase
        .from('payments')
        .update({ 
          payment_status: 'failed',
          transaction_hash,
          failure_reason: 'Invalid transaction'
        })
        .eq('id', payment.id);

      return res.status(400).json({
        success: false,
        error: 'Invalid transaction'
      });
    }

    // 更新支付状态为成功
    const { data: updatedPayment, error: updateError } = await supabase
      .from('payments')
      .update({ 
        payment_status: 'completed',
        transaction_hash,
        signature,
        processed_at: new Date().toISOString()
      })
      .eq('id', payment.id)
      .select()
      .single();

    if (updateError) {
      return res.status(500).json({
        success: false,
        error: 'Failed to update payment status'
      });
    }

    // 更新订单支付状态
    await supabase
      .from('orders')
      .update({ 
        payment_status: 'completed',
        order_status: 'confirmed'
      })
      .eq('id', payment.order_id);

    res.json({
      success: true,
      data: updatedPayment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

// 获取支付记录
router.get('/:paymentId', async (req: Request, res: Response) => {
  try {
    const { paymentId } = req.params;

    const { data, error } = await supabase
      .from('payments')
      .select(`
        *,
        orders(
          order_number,
          total_amount,
          total_bnb_amount,
          order_status
        )
      `)
      .eq('payment_id', paymentId)
      .single();

    if (error || !data) {
      return res.status(404).json({
        success: false,
        error: 'Payment not found'
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

// 获取用户支付历史
router.get('/user/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { 
      page = 1, 
      limit = 10, 
      status,
      sort = 'created_at',
      order = 'desc'
    } = req.query;

    let query = supabase
      .from('payments')
      .select(`
        *,
        orders(
          order_number,
          total_amount,
          total_lum_amount,
          order_status
        )
      `)
      .eq('user_id', userId);

    // 状态筛选
    if (status) {
      query = query.eq('payment_status', status);
    }

    // 排序
    query = query.order(sort as string, { ascending: order === 'asc' });

    // 分页
    const from = (Number(page) - 1) * Number(limit);
    const to = from + Number(limit) - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch payments'
      });
    }

    res.json({
      success: true,
      data,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: count || 0,
        totalPages: Math.ceil((count || 0) / Number(limit))
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

// 退款处理
router.post('/refund', async (req: Request, res: Response) => {
  try {
    const { payment_id, refund_amount, reason } = req.body;

    if (!payment_id || !refund_amount || !reason) {
      return res.status(400).json({
        success: false,
        error: 'payment_id, refund_amount and reason are required'
      });
    }

    // 获取支付记录
    const { data: payment } = await supabase
      .from('payments')
      .select('*')
      .eq('payment_id', payment_id)
      .single();

    if (!payment) {
      return res.status(404).json({
        success: false,
        error: 'Payment not found'
      });
    }

    if (payment.payment_status !== 'completed') {
      return res.status(400).json({
        success: false,
        error: 'Payment is not completed'
      });
    }

    if (refund_amount > payment.bnb_amount) {
      return res.status(400).json({
        success: false,
        error: 'Refund amount exceeds payment amount'
      });
    }

    // 这里应该调用区块链API处理退款
    // 目前模拟退款过程
    const refundTxHash = `REFUND${Date.now()}`;

    // 更新支付记录
    const { data: updatedPayment, error: updateError } = await supabase
      .from('payments')
      .update({ 
        payment_status: 'refunded',
        refund_amount,
        refund_reason: reason,
        refund_transaction_hash: refundTxHash,
        refunded_at: new Date().toISOString()
      })
      .eq('id', payment.id)
      .select()
      .single();

    if (updateError) {
      return res.status(500).json({
        success: false,
        error: 'Failed to process refund'
      });
    }

    res.json({
      success: true,
      data: updatedPayment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

export default router;