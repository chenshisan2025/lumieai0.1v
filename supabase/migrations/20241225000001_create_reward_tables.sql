-- 创建奖励分发系统相关表

-- 奖励快照表
CREATE TABLE IF NOT EXISTS reward_snapshots (
    id SERIAL PRIMARY KEY,
    week_id INTEGER NOT NULL UNIQUE,
    merkle_root VARCHAR(66) NOT NULL,
    total_rewards DECIMAL(20, 8) NOT NULL DEFAULT 0,
    total_users INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 用户奖励表
CREATE TABLE IF NOT EXISTS user_rewards (
    id SERIAL PRIMARY KEY,
    week_id INTEGER NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    user_address VARCHAR(42) NOT NULL,
    amount DECIMAL(20, 8) NOT NULL,
    merkle_index INTEGER NOT NULL,
    merkle_proof JSONB NOT NULL,
    reward_type VARCHAR(50) NOT NULL DEFAULT 'health_data',
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    claimed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(week_id, user_id),
    FOREIGN KEY (week_id) REFERENCES reward_snapshots(week_id)
);

-- 奖励领取记录表
CREATE TABLE IF NOT EXISTS reward_claims (
    id SERIAL PRIMARY KEY,
    week_id INTEGER NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    user_address VARCHAR(42) NOT NULL,
    amount DECIMAL(20, 8) NOT NULL,
    transaction_hash VARCHAR(66) NOT NULL,
    block_number BIGINT,
    gas_used BIGINT,
    gas_price DECIMAL(20, 8),
    claimed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (week_id) REFERENCES reward_snapshots(week_id)
);

-- Merkle树节点表（用于存储完整的Merkle树结构）
CREATE TABLE IF NOT EXISTS merkle_trees (
    id SERIAL PRIMARY KEY,
    week_id INTEGER NOT NULL,
    node_hash VARCHAR(66) NOT NULL,
    parent_hash VARCHAR(66),
    left_child VARCHAR(66),
    right_child VARCHAR(66),
    level INTEGER NOT NULL,
    position INTEGER NOT NULL,
    is_leaf BOOLEAN DEFAULT FALSE,
    leaf_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (week_id) REFERENCES reward_snapshots(week_id)
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_reward_snapshots_week_id ON reward_snapshots(week_id);
CREATE INDEX IF NOT EXISTS idx_reward_snapshots_status ON reward_snapshots(status);
CREATE INDEX IF NOT EXISTS idx_user_rewards_week_user ON user_rewards(week_id, user_id);
CREATE INDEX IF NOT EXISTS idx_user_rewards_user_id ON user_rewards(user_id);
CREATE INDEX IF NOT EXISTS idx_user_rewards_status ON user_rewards(status);
CREATE INDEX IF NOT EXISTS idx_reward_claims_week_user ON reward_claims(week_id, user_id);
CREATE INDEX IF NOT EXISTS idx_reward_claims_user_id ON reward_claims(user_id);
CREATE INDEX IF NOT EXISTS idx_reward_claims_tx_hash ON reward_claims(transaction_hash);
CREATE INDEX IF NOT EXISTS idx_merkle_trees_week_id ON merkle_trees(week_id);
CREATE INDEX IF NOT EXISTS idx_merkle_trees_node_hash ON merkle_trees(node_hash);

-- 创建更新时间触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 为需要的表添加更新时间触发器
CREATE TRIGGER update_reward_snapshots_updated_at BEFORE UPDATE ON reward_snapshots FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_rewards_updated_at BEFORE UPDATE ON user_rewards FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 启用行级安全策略 (RLS)
ALTER TABLE reward_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE reward_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE merkle_trees ENABLE ROW LEVEL SECURITY;

-- 创建RLS策略
-- 奖励快照表：所有用户可读，只有管理员可写
CREATE POLICY "Allow read access to reward_snapshots" ON reward_snapshots FOR SELECT USING (true);
CREATE POLICY "Allow admin write access to reward_snapshots" ON reward_snapshots FOR ALL USING (auth.role() = 'service_role');

-- 用户奖励表：用户只能查看自己的奖励
CREATE POLICY "Users can view own rewards" ON user_rewards FOR SELECT USING (auth.uid()::text = user_id OR auth.role() = 'service_role');
CREATE POLICY "Allow admin write access to user_rewards" ON user_rewards FOR ALL USING (auth.role() = 'service_role');

-- 奖励领取记录表：用户只能查看自己的领取记录
CREATE POLICY "Users can view own claims" ON reward_claims FOR SELECT USING (auth.uid()::text = user_id OR auth.role() = 'service_role');
CREATE POLICY "Allow admin write access to reward_claims" ON reward_claims FOR ALL USING (auth.role() = 'service_role');

-- Merkle树表：所有用户可读（用于验证），只有管理员可写
CREATE POLICY "Allow read access to merkle_trees" ON merkle_trees FOR SELECT USING (true);
CREATE POLICY "Allow admin write access to merkle_trees" ON merkle_trees FOR ALL USING (auth.role() = 'service_role');

-- 授权给anon和authenticated角色
GRANT SELECT ON reward_snapshots TO anon, authenticated;
GRANT SELECT ON user_rewards TO anon, authenticated;
GRANT SELECT ON reward_claims TO anon, authenticated;
GRANT SELECT ON merkle_trees TO anon, authenticated;

-- 为authenticated角色授权INSERT权限（用于领取奖励）
GRANT INSERT ON reward_claims TO authenticated;
GRANT UPDATE ON user_rewards TO authenticated;

-- 插入示例数据
INSERT INTO reward_snapshots (week_id, merkle_root, total_rewards, total_users, status) VALUES
(1, '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef12', 1000.00000000, 10, 'active'),
(2, '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890ab', 1500.00000000, 15, 'pending')
ON CONFLICT (week_id) DO NOTHING;

INSERT INTO user_rewards (week_id, user_id, user_address, amount, merkle_index, merkle_proof, reward_type, status) VALUES
(1, 'user1', '0x1234567890123456789012345678901234567890', 100.00000000, 0, '["0xabc", "0xdef"]', 'health_data', 'pending'),
(1, 'user2', '0x2345678901234567890123456789012345678901', 150.00000000, 1, '["0x123", "0x456"]', 'health_data', 'pending'),
(2, 'user1', '0x1234567890123456789012345678901234567890', 120.00000000, 0, '["0x789", "0xabc"]', 'health_data', 'pending')
ON CONFLICT (week_id, user_id) DO NOTHING;