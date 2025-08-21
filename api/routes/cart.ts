import express, { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 获取购物车
router.get('/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const { data, error } = await supabase
      .from('shopping_cart')
      .select(`
        *,
        products(
          id,
          name,
          price,
          lum_price,
          image_url,
          stock_quantity,
          is_active
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch cart'
      });
    }

    // 计算总价
    const totalPrice = data.reduce((sum, item) => {
      if (item.products?.is_active) {
        return sum + (item.products.price * item.quantity);
      }
      return sum;
    }, 0);

    const totalLumPrice = data.reduce((sum, item) => {
      if (item.products?.is_active) {
        return sum + (item.products.lum_price * item.quantity);
      }
      return sum;
    }, 0);

    res.json({
      success: true,
      data: {
        items: data,
        summary: {
          totalItems: data.length,
          totalQuantity: data.reduce((sum, item) => sum + item.quantity, 0),
          totalPrice,
          totalLumPrice
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

// 添加商品到购物车
router.post('/add', async (req: Request, res: Response) => {
  try {
    const { user_id, product_id, quantity = 1 } = req.body;

    if (!user_id || !product_id) {
      return res.status(400).json({
        success: false,
        error: 'user_id and product_id are required'
      });
    }

    // 检查商品是否存在且有库存
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, stock_quantity, is_active')
      .eq('id', product_id)
      .single();

    if (productError || !product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    if (!product.is_active) {
      return res.status(400).json({
        success: false,
        error: 'Product is not available'
      });
    }

    if (product.stock_quantity < quantity) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient stock'
      });
    }

    // 检查购物车中是否已有该商品
    const { data: existingItem } = await supabase
      .from('shopping_cart')
      .select('*')
      .eq('user_id', user_id)
      .eq('product_id', product_id)
      .single();

    let result;
    if (existingItem) {
      // 更新数量
      const newQuantity = existingItem.quantity + quantity;
      if (newQuantity > product.stock_quantity) {
        return res.status(400).json({
          success: false,
          error: 'Insufficient stock'
        });
      }

      const { data, error } = await supabase
        .from('shopping_cart')
        .update({ quantity: newQuantity })
        .eq('id', existingItem.id)
        .select()
        .single();

      if (error) {
        return res.status(500).json({
          success: false,
          error: 'Failed to update cart'
        });
      }
      result = data;
    } else {
      // 添加新商品
      const { data, error } = await supabase
        .from('shopping_cart')
        .insert({
          user_id,
          product_id,
          quantity
        })
        .select()
        .single();

      if (error) {
        return res.status(500).json({
          success: false,
          error: 'Failed to add to cart'
        });
      }
      result = data;
    }

    res.status(201).json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

// 更新购物车商品数量
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { quantity } = req.body;

    if (!quantity || quantity < 1) {
      return res.status(400).json({
        success: false,
        error: 'Invalid quantity'
      });
    }

    // 获取购物车项目和商品信息
    const { data: cartItem } = await supabase
      .from('shopping_cart')
      .select(`
        *,
        products(stock_quantity, is_active)
      `)
      .eq('id', id)
      .single();

    if (!cartItem) {
      return res.status(404).json({
        success: false,
        error: 'Cart item not found'
      });
    }

    if (!cartItem.products?.is_active) {
      return res.status(400).json({
        success: false,
        error: 'Product is not available'
      });
    }

    if (quantity > cartItem.products.stock_quantity) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient stock'
      });
    }

    const { data, error } = await supabase
      .from('shopping_cart')
      .update({ quantity })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({
        success: false,
        error: 'Failed to update cart'
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

// 删除购物车商品
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('shopping_cart')
      .delete()
      .eq('id', id);

    if (error) {
      return res.status(500).json({
        success: false,
        error: 'Failed to remove from cart'
      });
    }

    res.json({
      success: true,
      message: 'Item removed from cart'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

// 清空购物车
router.delete('/clear/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const { error } = await supabase
      .from('shopping_cart')
      .delete()
      .eq('user_id', userId);

    if (error) {
      return res.status(500).json({
        success: false,
        error: 'Failed to clear cart'
      });
    }

    res.json({
      success: true,
      message: 'Cart cleared'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

export default router;