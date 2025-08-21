-- 会员/硬件兑换系统数据库迁移文件
-- 创建商品、订单、会员、支付相关表

-- 商品分类表
CREATE TABLE product_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    image_url TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 商品表
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES product_categories(id) ON DELETE SET NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    short_description VARCHAR(500),
    price_lum DECIMAL(18,8) NOT NULL, -- LUM代币价格
    original_price_lum DECIMAL(18,8), -- 原价
    stock_quantity INTEGER DEFAULT 0,
    min_stock_alert INTEGER DEFAULT 5,
    sku VARCHAR(100) UNIQUE,
    images JSONB DEFAULT '[]', -- 商品图片数组
    specifications JSONB DEFAULT '{}', -- 商品规格
    is_active BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,
    weight DECIMAL(8,2), -- 重量(kg)
    dimensions JSONB, -- 尺寸信息
    tags TEXT[], -- 标签数组
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 会员等级表
CREATE TABLE membership_tiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL,
    description TEXT,
    min_lum_spent DECIMAL(18,8) DEFAULT 0, -- 最低消费LUM要求
    discount_percentage DECIMAL(5,2) DEFAULT 0, -- 折扣百分比
    benefits JSONB DEFAULT '[]', -- 会员权益
    color VARCHAR(7) DEFAULT '#1e40af', -- 等级颜色
    icon VARCHAR(50),
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 用户会员信息表
CREATE TABLE user_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL, -- 关联用户ID
    tier_id UUID REFERENCES membership_tiers(id) ON DELETE SET NULL,
    total_lum_spent DECIMAL(18,8) DEFAULT 0, -- 累计消费LUM
    points INTEGER DEFAULT 0, -- 积分
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 订单表
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL, -- 关联用户ID
    order_number VARCHAR(50) UNIQUE NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded')),
    total_amount_lum DECIMAL(18,8) NOT NULL, -- 订单总金额(LUM)
    discount_amount_lum DECIMAL(18,8) DEFAULT 0, -- 折扣金额
    shipping_fee_lum DECIMAL(18,8) DEFAULT 0, -- 运费
    final_amount_lum DECIMAL(18,8) NOT NULL, -- 最终支付金额
    
    -- 收货信息
    shipping_name VARCHAR(100),
    shipping_phone VARCHAR(20),
    shipping_address TEXT,
    shipping_city VARCHAR(50),
    shipping_province VARCHAR(50),
    shipping_postal_code VARCHAR(20),
    shipping_country VARCHAR(50) DEFAULT 'China',
    
    -- 订单备注和追踪
    notes TEXT,
    tracking_number VARCHAR(100),
    shipped_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    cancel_reason TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 订单商品表
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price_lum DECIMAL(18,8) NOT NULL, -- 单价
    total_price_lum DECIMAL(18,8) NOT NULL, -- 小计
    product_snapshot JSONB, -- 商品快照(名称、图片等)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 支付记录表
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    payment_method VARCHAR(20) DEFAULT 'lum' CHECK (payment_method = 'lum'), -- 仅支持LUM支付
    amount_lum DECIMAL(18,8) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    transaction_hash VARCHAR(100), -- 区块链交易哈希
    wallet_address VARCHAR(100), -- 用户钱包地址
    gas_fee_lum DECIMAL(18,8) DEFAULT 0, -- Gas费用
    confirmation_blocks INTEGER DEFAULT 0, -- 确认区块数
    failed_reason TEXT,
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 购物车表
CREATE TABLE shopping_cart (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, product_id)
);

-- 商品收藏表
CREATE TABLE product_favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, product_id)
);

-- 商品评价表
CREATE TABLE product_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    title VARCHAR(200),
    content TEXT,
    images JSONB DEFAULT '[]',
    is_verified BOOLEAN DEFAULT false, -- 是否已购买验证
    helpful_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_active ON products(is_active);
CREATE INDEX idx_products_featured ON products(is_featured);
CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created ON orders(created_at);
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_product ON order_items(product_id);
CREATE INDEX idx_payments_order ON payments(order_id);
CREATE INDEX idx_payments_user ON payments(user_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_shopping_cart_user ON shopping_cart(user_id);
CREATE INDEX idx_product_favorites_user ON product_favorites(user_id);
CREATE INDEX idx_product_reviews_product ON product_reviews(product_id);
CREATE INDEX idx_user_memberships_user ON user_memberships(user_id);

-- 创建更新时间触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 为需要的表添加更新时间触发器
CREATE TRIGGER update_product_categories_updated_at BEFORE UPDATE ON product_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_membership_tiers_updated_at BEFORE UPDATE ON membership_tiers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_memberships_updated_at BEFORE UPDATE ON user_memberships FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_shopping_cart_updated_at BEFORE UPDATE ON shopping_cart FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_product_reviews_updated_at BEFORE UPDATE ON product_reviews FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 插入示例数据

-- 商品分类示例数据
INSERT INTO product_categories (name, description, image_url, sort_order) VALUES
('硬件设备', 'Lumie智能硬件产品', 'https://trae-api-sg.mchost.guru/api/ide/v1/text_to_image?prompt=modern%20tech%20hardware%20devices%20blue%20gold%20theme&image_size=square', 1),
('会员权益', '专属会员服务和权益', 'https://trae-api-sg.mchost.guru/api/ide/v1/text_to_image?prompt=premium%20membership%20benefits%20luxury%20blue%20gold&image_size=square', 2),
('数字商品', '软件和数字内容', 'https://trae-api-sg.mchost.guru/api/ide/v1/text_to_image?prompt=digital%20products%20software%20apps%20blue%20theme&image_size=square', 3);

-- 会员等级示例数据
INSERT INTO membership_tiers (name, description, min_lum_spent, discount_percentage, benefits, color, icon, sort_order) VALUES
('青铜会员', '入门级会员，享受基础权益', 0, 5, '["5%折扣", "生日礼品", "专属客服"]', '#CD7F32', 'bronze', 1),
('白银会员', '进阶会员，更多专属服务', 1000, 10, '["10%折扣", "免费配送", "优先客服", "月度礼品"]', '#C0C0C0', 'silver', 2),
('黄金会员', '高级会员，尊享特权', 5000, 15, '["15%折扣", "免费配送", "VIP客服", "专属活动", "季度大礼包"]', '#FFD700', 'gold', 3),
('钻石会员', '顶级会员，至尊体验', 20000, 20, '["20%折扣", "免费配送", "专属客服经理", "内测权限", "年度豪礼", "定制服务"]', '#B9F2FF', 'diamond', 4);

-- 商品示例数据
INSERT INTO products (category_id, name, description, short_description, price_lum, original_price_lum, stock_quantity, sku, images, specifications, is_featured) VALUES
((SELECT id FROM product_categories WHERE name = '硬件设备'), 
 'Lumie智能手环Pro', 
 '新一代智能健康监测手环，支持心率、血氧、睡眠监测，配备高清彩屏和7天续航。采用医疗级传感器，提供专业健康数据分析。', 
 '专业健康监测，7天续航，医疗级传感器', 
 299.99, 399.99, 100, 'LUM-BAND-PRO-001',
 '["https://trae-api-sg.mchost.guru/api/ide/v1/text_to_image?prompt=smart%20fitness%20band%20blue%20gold%20design%20modern&image_size=square"]',
 '{"屏幕":"1.4英寸AMOLED","续航":"7天","防水":"5ATM","传感器":"心率+血氧+加速度计"}', true),

((SELECT id FROM product_categories WHERE name = '硬件设备'), 
 'Lumie智能音箱', 
 '支持语音控制的智能音箱，内置Lumie AI助手，可控制智能家居设备。高品质音响效果，支持多房间音乐播放。', 
 'AI语音助手，智能家居控制，高品质音响', 
 199.99, 249.99, 50, 'LUM-SPEAKER-001',
 '["https://trae-api-sg.mchost.guru/api/ide/v1/text_to_image?prompt=smart%20speaker%20blue%20gold%20elegant%20design&image_size=square"]',
 '{"功率":"20W","连接":"WiFi+蓝牙","语音":"Lumie AI","控制":"智能家居"}', true),

((SELECT id FROM product_categories WHERE name = '会员权益'), 
 '黄金会员年卡', 
 '一年黄金会员权益，享受15%购物折扣、免费配送、VIP客服、专属活动等特权服务。', 
 '15%折扣，免费配送，VIP特权', 
 999.99, null, 999, 'LUM-GOLD-YEAR-001',
 '["https://trae-api-sg.mchost.guru/api/ide/v1/text_to_image?prompt=gold%20membership%20card%20luxury%20design&image_size=square"]',
 '{"有效期":"365天","折扣":"15%","配送":"免费","客服":"VIP专线"}', true),

((SELECT id FROM product_categories WHERE name = '数字商品'), 
 'Lumie Pro软件许可', 
 '专业版软件许可，解锁全部高级功能，包括AI分析、数据导出、自定义报告等。适合专业用户和企业使用。', 
 '专业版许可，AI分析，数据导出', 
 599.99, 799.99, 999, 'LUM-SOFTWARE-PRO-001',
 '["https://trae-api-sg.mchost.guru/api/ide/v1/text_to_image?prompt=software%20license%20professional%20blue%20interface&image_size=square"]',
 '{"许可":"永久","功能":"全部解锁","支持":"优先技术支持","更新":"免费升级"}', false);

-- 启用行级安全(RLS)
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE membership_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_cart ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_reviews ENABLE ROW LEVEL SECURITY;

-- 创建RLS策略

-- 商品分类和商品：所有人可读，管理员可写
CREATE POLICY "商品分类公开可读" ON product_categories FOR SELECT USING (true);
CREATE POLICY "商品公开可读" ON products FOR SELECT USING (is_active = true);
CREATE POLICY "会员等级公开可读" ON membership_tiers FOR SELECT USING (is_active = true);

-- 用户会员信息：用户只能查看自己的
CREATE POLICY "用户查看自己的会员信息" ON user_memberships FOR SELECT USING (auth.uid()::text = user_id::text);
CREATE POLICY "用户更新自己的会员信息" ON user_memberships FOR UPDATE USING (auth.uid()::text = user_id::text);
CREATE POLICY "创建用户会员信息" ON user_memberships FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

-- 订单：用户只能查看自己的订单
CREATE POLICY "用户查看自己的订单" ON orders FOR SELECT USING (auth.uid()::text = user_id::text);
CREATE POLICY "用户创建自己的订单" ON orders FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);
CREATE POLICY "用户更新自己的订单" ON orders FOR UPDATE USING (auth.uid()::text = user_id::text);

-- 订单商品：通过订单关联控制
CREATE POLICY "用户查看自己订单的商品" ON order_items FOR SELECT USING (
    EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.user_id::text = auth.uid()::text)
);
CREATE POLICY "用户创建自己订单的商品" ON order_items FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.user_id::text = auth.uid()::text)
);

-- 支付记录：用户只能查看自己的
CREATE POLICY "用户查看自己的支付记录" ON payments FOR SELECT USING (auth.uid()::text = user_id::text);
CREATE POLICY "用户创建自己的支付记录" ON payments FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);
CREATE POLICY "用户更新自己的支付记录" ON payments FOR UPDATE USING (auth.uid()::text = user_id::text);

-- 购物车：用户只能操作自己的
CREATE POLICY "用户操作自己的购物车" ON shopping_cart FOR ALL USING (auth.uid()::text = user_id::text);

-- 商品收藏：用户只能操作自己的
CREATE POLICY "用户操作自己的收藏" ON product_favorites FOR ALL USING (auth.uid()::text = user_id::text);

-- 商品评价：用户可以查看所有，但只能操作自己的
CREATE POLICY "所有人可查看商品评价" ON product_reviews FOR SELECT USING (true);
CREATE POLICY "用户创建自己的评价" ON product_reviews FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);
CREATE POLICY "用户更新自己的评价" ON product_reviews FOR UPDATE USING (auth.uid()::text = user_id::text);
CREATE POLICY "用户删除自己的评价" ON product_reviews FOR DELETE USING (auth.uid()::text = user_id::text);

-- 授予权限
GRANT SELECT ON product_categories TO anon, authenticated;
GRANT SELECT ON products TO anon, authenticated;
GRANT SELECT ON membership_tiers TO anon, authenticated;
GRANT ALL PRIVILEGES ON user_memberships TO authenticated;
GRANT ALL PRIVILEGES ON orders TO authenticated;
GRANT ALL PRIVILEGES ON order_items TO authenticated;
GRANT ALL PRIVILEGES ON payments TO authenticated;
GRANT ALL PRIVILEGES ON shopping_cart TO authenticated;
GRANT ALL PRIVILEGES ON product_favorites TO authenticated;
GRANT ALL PRIVILEGES ON product_reviews TO authenticated;

-- 为序列授予权限
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;