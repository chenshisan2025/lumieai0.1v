-- 将LUM支付相关字段和约束修改为BNB
-- 更新商品表：price_lum -> price_bnb, original_price_lum -> original_price_bnb
ALTER TABLE products RENAME COLUMN price_lum TO price_bnb;
ALTER TABLE products RENAME COLUMN original_price_lum TO original_price_bnb;

-- 更新会员等级表：min_lum_spent -> min_bnb_spent
ALTER TABLE membership_tiers RENAME COLUMN min_lum_spent TO min_bnb_spent;

-- 更新用户会员信息表：total_lum_spent -> total_bnb_spent
ALTER TABLE user_memberships RENAME COLUMN total_lum_spent TO total_bnb_spent;

-- 更新订单表：所有LUM相关字段改为BNB
ALTER TABLE orders RENAME COLUMN total_amount_lum TO total_amount_bnb;
ALTER TABLE orders RENAME COLUMN discount_amount_lum TO discount_amount_bnb;
ALTER TABLE orders RENAME COLUMN shipping_fee_lum TO shipping_fee_bnb;
ALTER TABLE orders RENAME COLUMN final_amount_lum TO final_amount_bnb;

-- 更新订单商品表：LUM价格字段改为BNB
ALTER TABLE order_items RENAME COLUMN unit_price_lum TO unit_price_bnb;
ALTER TABLE order_items RENAME COLUMN total_price_lum TO total_price_bnb;

-- 更新支付记录表：支付方式约束和LUM相关字段
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_payment_method_check;
ALTER TABLE payments ADD CONSTRAINT payments_payment_method_check CHECK (payment_method = 'bnb');
ALTER TABLE payments RENAME COLUMN amount_lum TO amount_bnb;
ALTER TABLE payments RENAME COLUMN gas_fee_lum TO gas_fee_bnb;

-- 更新支付方式默认值
ALTER TABLE payments ALTER COLUMN payment_method SET DEFAULT 'bnb';

-- 更新示例数据中的价格字段
UPDATE products SET 
    price_bnb = CASE 
        WHEN name = 'Lumie智能手环Pro' THEN 0.5
        WHEN name = 'Lumie智能音箱' THEN 0.35
        WHEN name = '黄金会员年卡' THEN 1.8
        WHEN name = 'Lumie Pro软件许可' THEN 1.0
        ELSE price_bnb * 0.0017  -- 假设1 LUM ≈ 0.0017 BNB的转换率
    END,
    original_price_bnb = CASE 
        WHEN original_price_bnb IS NOT NULL THEN 
            CASE 
                WHEN name = 'Lumie智能手环Pro' THEN 0.7
                WHEN name = 'Lumie智能音箱' THEN 0.45
                WHEN name = 'Lumie Pro软件许可' THEN 1.4
                ELSE original_price_bnb * 0.0017
            END
        ELSE NULL
    END;

-- 更新会员等级的BNB消费要求
UPDATE membership_tiers SET 
    min_bnb_spent = CASE 
        WHEN name = '青铜会员' THEN 0
        WHEN name = '白银会员' THEN 1.7
        WHEN name = '黄金会员' THEN 8.5
        WHEN name = '钻石会员' THEN 34.0
        ELSE min_bnb_spent * 0.0017
    END;

-- 添加注释说明字段变更
COMMENT ON COLUMN products.price_bnb IS 'BNB代币价格';
COMMENT ON COLUMN products.original_price_bnb IS 'BNB原价';
COMMENT ON COLUMN membership_tiers.min_bnb_spent IS '最低消费BNB要求';
COMMENT ON COLUMN user_memberships.total_bnb_spent IS '累计消费BNB';
COMMENT ON COLUMN orders.total_amount_bnb IS '订单总金额(BNB)';
COMMENT ON COLUMN orders.discount_amount_bnb IS '折扣金额(BNB)';
COMMENT ON COLUMN orders.shipping_fee_bnb IS '运费(BNB)';
COMMENT ON COLUMN orders.final_amount_bnb IS '最终支付金额(BNB)';
COMMENT ON COLUMN order_items.unit_price_bnb IS '单价(BNB)';
COMMENT ON COLUMN order_items.total_price_bnb IS '小计(BNB)';
COMMENT ON COLUMN payments.amount_bnb IS '支付金额(BNB)';
COMMENT ON COLUMN payments.gas_fee_bnb IS 'Gas费用(BNB)';