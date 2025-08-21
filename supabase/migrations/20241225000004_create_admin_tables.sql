-- 创建管理后台系统相关表

-- 管理员用户表
CREATE TABLE IF NOT EXISTS admin_users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'admin', -- super_admin, admin, analyst
    full_name VARCHAR(100),
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 锚定记录表
CREATE TABLE IF NOT EXISTS anchoring_records (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    data_hash VARCHAR(66) NOT NULL,
    blockchain_network VARCHAR(50) NOT NULL DEFAULT 'ethereum',
    transaction_hash VARCHAR(66),
    block_number BIGINT,
    gas_used BIGINT,
    gas_price DECIMAL(20, 8),
    anchor_type VARCHAR(50) NOT NULL, -- health_data, reward_claim, badge_mint
    data_size INTEGER,
    metadata JSONB,
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, confirmed, failed
    anchored_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 任务表
CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    task_type VARCHAR(50) NOT NULL, -- daily, weekly, monthly, special
    category VARCHAR(50) NOT NULL, -- health, social, learning, achievement
    reward_type VARCHAR(50) NOT NULL DEFAULT 'lum_token', -- lum_token, badge, points
    reward_amount DECIMAL(20, 8) DEFAULT 0,
    reward_badge_id INTEGER,
    requirements JSONB, -- 任务完成条件
    start_date DATE,
    end_date DATE,
    max_completions INTEGER, -- 最大完成次数，NULL表示无限制
    is_active BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 0,
    created_by INTEGER REFERENCES admin_users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 用户任务关联表
CREATE TABLE IF NOT EXISTS user_tasks (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    task_id INTEGER NOT NULL REFERENCES tasks(id),
    status VARCHAR(20) NOT NULL DEFAULT 'assigned', -- assigned, in_progress, completed, expired
    progress JSONB, -- 任务进度数据
    completed_at TIMESTAMP WITH TIME ZONE,
    reward_claimed BOOLEAN DEFAULT false,
    reward_claimed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, task_id)
);

-- 公告表
CREATE TABLE IF NOT EXISTS announcements (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    announcement_type VARCHAR(50) NOT NULL DEFAULT 'general', -- general, maintenance, update, event
    priority VARCHAR(20) NOT NULL DEFAULT 'normal', -- low, normal, high, urgent
    target_audience VARCHAR(50) NOT NULL DEFAULT 'all', -- all, members, specific_users
    target_users JSONB, -- 特定用户ID列表
    is_published BOOLEAN DEFAULT false,
    publish_at TIMESTAMP WITH TIME ZONE,
    expire_at TIMESTAMP WITH TIME ZONE,
    created_by INTEGER NOT NULL REFERENCES admin_users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 管理员操作日志表
CREATE TABLE IF NOT EXISTS admin_logs (
    id SERIAL PRIMARY KEY,
    admin_id INTEGER NOT NULL REFERENCES admin_users(id),
    action VARCHAR(100) NOT NULL, -- login, logout, create_user, update_task, etc.
    resource_type VARCHAR(50), -- user, task, announcement, etc.
    resource_id VARCHAR(255), -- 资源ID
    details JSONB, -- 操作详情
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 奖励记录表（扩展现有奖励系统）
CREATE TABLE IF NOT EXISTS reward_records (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    reward_type VARCHAR(50) NOT NULL, -- task_completion, referral, special_event
    reward_source VARCHAR(50) NOT NULL, -- task_id, referral_id, event_id
    amount DECIMAL(20, 8) NOT NULL DEFAULT 0,
    badge_id INTEGER,
    points INTEGER DEFAULT 0,
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, distributed, failed
    distributed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_admin_users_username ON admin_users(username);
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);
CREATE INDEX IF NOT EXISTS idx_admin_users_role ON admin_users(role);
CREATE INDEX IF NOT EXISTS idx_anchoring_records_user_id ON anchoring_records(user_id);
CREATE INDEX IF NOT EXISTS idx_anchoring_records_status ON anchoring_records(status);
CREATE INDEX IF NOT EXISTS idx_anchoring_records_tx_hash ON anchoring_records(transaction_hash);
CREATE INDEX IF NOT EXISTS idx_tasks_type ON tasks(task_type);
CREATE INDEX IF NOT EXISTS idx_tasks_category ON tasks(category);
CREATE INDEX IF NOT EXISTS idx_tasks_active ON tasks(is_active);
CREATE INDEX IF NOT EXISTS idx_user_tasks_user_id ON user_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_user_tasks_task_id ON user_tasks(task_id);
CREATE INDEX IF NOT EXISTS idx_user_tasks_status ON user_tasks(status);
CREATE INDEX IF NOT EXISTS idx_announcements_published ON announcements(is_published);
CREATE INDEX IF NOT EXISTS idx_announcements_type ON announcements(announcement_type);
CREATE INDEX IF NOT EXISTS idx_admin_logs_admin_id ON admin_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_action ON admin_logs(action);
CREATE INDEX IF NOT EXISTS idx_admin_logs_created_at ON admin_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_reward_records_user_id ON reward_records(user_id);
CREATE INDEX IF NOT EXISTS idx_reward_records_type ON reward_records(reward_type);
CREATE INDEX IF NOT EXISTS idx_reward_records_status ON reward_records(status);

-- 创建更新时间触发器（复用现有函数）
CREATE TRIGGER update_admin_users_updated_at BEFORE UPDATE ON admin_users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_anchoring_records_updated_at BEFORE UPDATE ON anchoring_records FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_tasks_updated_at BEFORE UPDATE ON user_tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_announcements_updated_at BEFORE UPDATE ON announcements FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_reward_records_updated_at BEFORE UPDATE ON reward_records FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 启用行级安全策略 (RLS)
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE anchoring_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE reward_records ENABLE ROW LEVEL SECURITY;

-- 创建RLS策略
-- 管理员用户表：只有管理员可以访问
CREATE POLICY "Admin only access to admin_users" ON admin_users FOR ALL USING (auth.role() = 'service_role');

-- 锚定记录表：用户可查看自己的记录，管理员可查看所有
CREATE POLICY "Users can view own anchoring records" ON anchoring_records FOR SELECT USING (auth.uid()::text = user_id OR auth.role() = 'service_role');
CREATE POLICY "Admin write access to anchoring_records" ON anchoring_records FOR ALL USING (auth.role() = 'service_role');

-- 任务表：所有用户可读，只有管理员可写
CREATE POLICY "Allow read access to tasks" ON tasks FOR SELECT USING (true);
CREATE POLICY "Admin write access to tasks" ON tasks FOR ALL USING (auth.role() = 'service_role');

-- 用户任务表：用户可查看自己的任务，管理员可查看所有
CREATE POLICY "Users can view own tasks" ON user_tasks FOR SELECT USING (auth.uid()::text = user_id OR auth.role() = 'service_role');
CREATE POLICY "Users can update own task progress" ON user_tasks FOR UPDATE USING (auth.uid()::text = user_id);
CREATE POLICY "Admin write access to user_tasks" ON user_tasks FOR ALL USING (auth.role() = 'service_role');

-- 公告表：所有用户可读已发布的公告，只有管理员可写
CREATE POLICY "Allow read published announcements" ON announcements FOR SELECT USING (is_published = true OR auth.role() = 'service_role');
CREATE POLICY "Admin write access to announcements" ON announcements FOR ALL USING (auth.role() = 'service_role');

-- 管理员日志表：只有管理员可以访问
CREATE POLICY "Admin only access to admin_logs" ON admin_logs FOR ALL USING (auth.role() = 'service_role');

-- 奖励记录表：用户可查看自己的奖励记录，管理员可查看所有
CREATE POLICY "Users can view own reward records" ON reward_records FOR SELECT USING (auth.uid()::text = user_id OR auth.role() = 'service_role');
CREATE POLICY "Admin write access to reward_records" ON reward_records FOR ALL USING (auth.role() = 'service_role');

-- 授权给anon和authenticated角色
GRANT SELECT ON tasks TO anon, authenticated;
GRANT SELECT ON announcements TO anon, authenticated;
GRANT SELECT ON user_tasks TO authenticated;
GRANT SELECT ON reward_records TO authenticated;
GRANT SELECT ON anchoring_records TO authenticated;
GRANT UPDATE ON user_tasks TO authenticated;

-- 插入示例数据
-- 创建默认管理员用户
INSERT INTO admin_users (username, email, password_hash, role, full_name) VALUES
('admin', 'admin@lumieai.com', '$2b$10$example_hash_here', 'super_admin', 'System Administrator'),
('operator', 'operator@lumieai.com', '$2b$10$example_hash_here', 'admin', 'Operations Manager'),
('analyst', 'analyst@lumieai.com', '$2b$10$example_hash_here', 'analyst', 'Data Analyst')
ON CONFLICT (username) DO NOTHING;

-- 创建示例任务
INSERT INTO tasks (title, description, task_type, category, reward_amount, requirements, is_active, created_by) VALUES
('每日健康数据上传', '每天上传健康数据到系统', 'daily', 'health', 10.00000000, '{"data_types": ["steps", "heart_rate"], "min_entries": 1}', true, 1),
('完成健康评估', '完成系统健康评估问卷', 'weekly', 'health', 50.00000000, '{"assessment_type": "weekly_health", "completion_rate": 100}', true, 1),
('邀请好友注册', '邀请新用户注册并完成首次数据上传', 'special', 'social', 100.00000000, '{"referral_count": 1, "friend_data_upload": true}', true, 1)
ON CONFLICT DO NOTHING;

-- 创建示例公告
INSERT INTO announcements (title, content, announcement_type, priority, is_published, created_by) VALUES
('系统维护通知', '系统将于本周末进行维护升级，预计停机2小时。', 'maintenance', 'high', true, 1),
('新功能发布', 'LumieAI健康管理系统新增AI健康建议功能，欢迎体验！', 'update', 'normal', true, 1),
('每周奖励发放', '本周健康数据奖励已发放，请查看您的钱包余额。', 'general', 'normal', true, 1)
ON CONFLICT DO NOTHING;