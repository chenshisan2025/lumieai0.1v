import express, { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 创建订单
router.post('/', async (req: Request, res: Response) => {
  try {
    const { 
      user_id, 
      items, 
      shipping_address, 
      payment_method = 'lum_token',
      notes 
    } = req.body;

    if (!user_id || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'user_id and items are required'
      });
    }

    // 验证商品和计算总价
    let totalAmount = 0;
    let totalLumAmount = 0;
    const validatedItems = [];

    for (const item of items) {
      const { data: product } = await supabase
        .from('products')
        .select('id, name, price, lum_price, stock_quantity, is_active')
        .eq('id', item.product_id)
        .single();

      if (!product || !product.is_active) {
        return res.status(400).json({
          success: false,
          error: `Product ${item.product_id} is not available`
        });
      }

      if (product.stock_quantity < item.quantity) {
        return res.status(400).json({
          success: false,
          error: `Insufficient stock for ${product.name}`
        });
      }

      totalAmount += product.price * item.quantity;
      totalLumAmount += product.lum_price * item.quantity;
      
      validatedItems.push({
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: product.price,
        unit_lum_price: product.lum_price,
        subtotal: product.price * item.quantity,
        subtotal_lum: product.lum_price * item.quantity
      });
    }

    // 生成订单号
    const orderNumber = `ORD${Date.now()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

    // 创建订单
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        order_number: orderNumber,
        user_id,
        total_amount: totalAmount,
        total_lum_amount: totalLumAmount,
        payment_method,
        payment_status: 'pending',
        order_status: 'pending',
        shipping_address,
        notes
      })
      .select()
      .single();

    if (orderError) {
      return res.status(500).json({
        success: false,
        error: 'Failed to create order'
      });
    }

    // 创建订单项目
    const orderItems = validatedItems.map(item => ({
      ...item,
      order_id: order.id
    }));

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems);

    if (itemsError) {
      // 如果订单项目创建失败，删除已创建的订单
      await supabase.from('orders').delete().eq('id', order.id);
      return res.status(500).json({
        success: false,
        error: 'Failed to create order items'
      });
    }

    // 更新库存
    for (const item of validatedItems) {
      await supabase.rpc('decrease_product_stock', {
        product_id: item.product_id,
        quantity: item.quantity
      });
    }

    // 清空购物车（如果是从购物车下单）
    if (req.body.clear_cart) {
      await supabase
        .from('shopping_cart')
        .delete()
        .eq('user_id', user_id);
    }

    res.status(201).json({
      success: true,
      data: {
        ...order,
        items: orderItems
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

// 获取用户订单列表
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
      .from('orders')
      .select(`
        *,
        order_items(
          *,
          products(name, image_url)
        )
      `)
      .eq('user_id', userId);

    // 状态筛选
    if (status) {
      query = query.eq('order_status', status);
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
        error: 'Failed to fetch orders'
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

// 获取订单详情
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items(
          *,
          products(
            id,
            name,
            image_url,
            description
          )
        ),
        payments(*)
      `)
      .eq('id', id)
      .single();

    if (error || !data) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
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

// 更新订单状态
router.put('/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status'
      });
    }

    const updateData: any = { order_status: status };
    if (notes) {
      updateData.notes = notes;
    }

    // 如果是取消订单，需要恢复库存
    if (status === 'cancelled') {
      const { data: order } = await supabase
        .from('orders')
        .select(`
          order_items(
            product_id,
            quantity
          )
        `)
        .eq('id', id)
        .single();

      if (order?.order_items) {
        for (const item of order.order_items) {
          await supabase.rpc('increase_product_stock', {
            product_id: item.product_id,
            quantity: item.quantity
          });
        }
      }
    }

    const { data, error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({
        success: false,
        error: 'Failed to update order status'
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

// 获取所有订单（管理员）
router.get('/', async (req: Request, res: Response) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status,
      user_id,
      sort = 'created_at',
      order = 'desc'
    } = req.query;

    let query = supabase
      .from('orders')
      .select(`
        *,
        order_items(
          *,
          products(name, image_url)
        )
      `);

    // 状态筛选
    if (status) {
      query = query.eq('order_status', status);
    }

    // 用户筛选
    if (user_id) {
      query = query.eq('user_id', user_id);
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
        error: 'Failed to fetch orders'
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

export default router;