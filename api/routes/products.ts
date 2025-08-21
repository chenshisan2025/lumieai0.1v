import express, { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// for esm mode
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// load env
dotenv.config({ path: path.join(__dirname, '../../.env') });

const router = express.Router();

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 获取商品分类
router.get('/categories', async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('product_categories')
      .select('*')
      .eq('is_active', true)
      .order('sort_order');

    if (error) {
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch categories'
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

// 获取商品列表
router.get('/', async (req: Request, res: Response) => {
  try {
    const { 
      category_id, 
      page = 1, 
      limit = 12, 
      sort = 'created_at', 
      order = 'desc',
      search 
    } = req.query;

    let query = supabase
      .from('products')
      .select(`
        *,
        product_categories(name, slug)
      `)
      .eq('is_active', true);

    // 分类筛选
    if (category_id) {
      query = query.eq('category_id', category_id);
    }

    // 搜索
    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
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
        error: 'Failed to fetch products'
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

// 获取商品详情
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        product_categories(name, slug),
        product_reviews(
          id,
          rating,
          comment,
          created_at,
          user_id
        )
      `)
      .eq('id', id)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
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

// 获取推荐商品
router.get('/:id/recommendations', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { limit = 4 } = req.query;

    // 先获取当前商品的分类
    const { data: currentProduct } = await supabase
      .from('products')
      .select('category_id')
      .eq('id', id)
      .single();

    if (!currentProduct) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    // 获取同分类的其他商品
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        product_categories(name, slug)
      `)
      .eq('category_id', currentProduct.category_id)
      .eq('is_active', true)
      .neq('id', id)
      .order('created_at', { ascending: false })
      .limit(Number(limit));

    if (error) {
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch recommendations'
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

// 创建商品评价
router.post('/:id/reviews', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { rating, comment, user_id } = req.body;

    if (!rating || !user_id) {
      return res.status(400).json({
        success: false,
        error: 'Rating and user_id are required'
      });
    }

    // 检查用户是否已经评价过
    const { data: existingReview } = await supabase
      .from('product_reviews')
      .select('id')
      .eq('product_id', id)
      .eq('user_id', user_id)
      .single();

    if (existingReview) {
      return res.status(400).json({
        success: false,
        error: 'You have already reviewed this product'
      });
    }

    const { data, error } = await supabase
      .from('product_reviews')
      .insert({
        product_id: id,
        user_id,
        rating,
        comment
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({
        success: false,
        error: 'Failed to create review'
      });
    }

    res.status(201).json({
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

export default router;