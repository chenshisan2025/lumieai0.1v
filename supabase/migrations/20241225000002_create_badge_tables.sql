-- Badge System Migration
-- Creates all necessary tables for the BadgeNFT system

-- Badge Types Table
CREATE TABLE IF NOT EXISTS badge_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    image_url TEXT,
    rarity VARCHAR(50) DEFAULT 'common' CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),
    category VARCHAR(100),
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'draft')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(255)
);

-- Badge Conditions Table
CREATE TABLE IF NOT EXISTS badge_conditions (
    id SERIAL PRIMARY KEY,
    badge_type_id INTEGER REFERENCES badge_types(id) ON DELETE CASCADE,
    condition_type VARCHAR(100) NOT NULL CHECK (condition_type IN (
        'daily_checkin', 'consecutive_days', 'total_activities', 
        'health_score', 'milestone', 'special_event'
    )),
    target_value INTEGER NOT NULL DEFAULT 1,
    metadata JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Badges Table (NFT ownership records)
CREATE TABLE IF NOT EXISTS user_badges (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    badge_type_id INTEGER REFERENCES badge_types(id) ON DELETE CASCADE,
    token_id BIGINT,
    wallet_address VARCHAR(255),
    transaction_hash VARCHAR(255),
    metadata JSONB DEFAULT '{}',
    minted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, badge_type_id) -- Prevent duplicate badges for same user
);

-- Badge Progress Table (tracks user progress towards badge conditions)
CREATE TABLE IF NOT EXISTS badge_progress (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    badge_condition_id INTEGER REFERENCES badge_conditions(id) ON DELETE CASCADE,
    current_value INTEGER DEFAULT 0,
    target_value INTEGER NOT NULL,
    is_completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMP WITH TIME ZONE,
    last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, badge_condition_id)
);

-- User Activities Table (tracks user actions for condition checking)
CREATE TABLE IF NOT EXISTS user_activities (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    activity_type VARCHAR(100) NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Badge Activity Logs Table (audit trail for badge-related actions)
CREATE TABLE IF NOT EXISTS badge_activity_logs (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255),
    badge_type_id INTEGER REFERENCES badge_types(id) ON DELETE SET NULL,
    badge_condition_id INTEGER REFERENCES badge_conditions(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    details JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Health Scores Table (for health score based conditions)
CREATE TABLE IF NOT EXISTS health_scores (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    score_type VARCHAR(50) DEFAULT 'overall',
    score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Event Participations Table (for special event conditions)
CREATE TABLE IF NOT EXISTS user_event_participations (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    event_id VARCHAR(255),
    participation_data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_badge_types_status ON badge_types(status);
CREATE INDEX IF NOT EXISTS idx_badge_types_category ON badge_types(category);
CREATE INDEX IF NOT EXISTS idx_badge_conditions_badge_type ON badge_conditions(badge_type_id);
CREATE INDEX IF NOT EXISTS idx_badge_conditions_active ON badge_conditions(is_active);
CREATE INDEX IF NOT EXISTS idx_user_badges_user_id ON user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_badge_type ON user_badges(badge_type_id);
CREATE INDEX IF NOT EXISTS idx_badge_progress_user_id ON badge_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_badge_progress_condition ON badge_progress(badge_condition_id);
CREATE INDEX IF NOT EXISTS idx_badge_progress_completed ON badge_progress(is_completed);
CREATE INDEX IF NOT EXISTS idx_user_activities_user_id ON user_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activities_type ON user_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_user_activities_created_at ON user_activities(created_at);
CREATE INDEX IF NOT EXISTS idx_badge_activity_logs_user_id ON badge_activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_health_scores_user_id ON health_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_health_scores_type ON health_scores(score_type);
CREATE INDEX IF NOT EXISTS idx_event_participations_user_id ON user_event_participations(user_id);
CREATE INDEX IF NOT EXISTS idx_event_participations_type ON user_event_participations(event_type);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
CREATE TRIGGER update_badge_types_updated_at BEFORE UPDATE ON badge_types
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_badge_conditions_updated_at BEFORE UPDATE ON badge_conditions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample badge types
INSERT INTO badge_types (name, description, image_url, rarity, category, metadata) VALUES
('早起鸟', '连续7天早上6点前签到', 'https://trae-api-sg.mchost.guru/api/ide/v1/text_to_image?prompt=early_bird_badge_golden_sunrise_minimalist_design&image_size=square', 'common', 'daily_habits', '{"color": "#FFD700", "icon": "sunrise"}'),
('健康达人', '连续30天完成健康目标', 'https://trae-api-sg.mchost.guru/api/ide/v1/text_to_image?prompt=health_master_badge_green_heart_fitness_design&image_size=square', 'rare', 'health', '{"color": "#32CD32", "icon": "heart"}'),
('运动狂人', '单月运动超过100小时', 'https://trae-api-sg.mchost.guru/api/ide/v1/text_to_image?prompt=fitness_fanatic_badge_blue_dumbbell_athletic_design&image_size=square', 'epic', 'fitness', '{"color": "#1E90FF", "icon": "dumbbell"}'),
('传奇战士', '连续365天保持活跃', 'https://trae-api-sg.mchost.guru/api/ide/v1/text_to_image?prompt=legendary_warrior_badge_purple_crown_epic_design&image_size=square', 'legendary', 'achievement', '{"color": "#9932CC", "icon": "crown"}'),
('新手上路', '完成首次健康数据提交', 'https://trae-api-sg.mchost.guru/api/ide/v1/text_to_image?prompt=beginner_badge_silver_star_welcome_design&image_size=square', 'common', 'milestone', '{"color": "#C0C0C0", "icon": "star"}');

-- Insert sample badge conditions
INSERT INTO badge_conditions (badge_type_id, condition_type, target_value, metadata) VALUES
(1, 'consecutive_days', 7, '{"activityType": "early_checkin", "timeWindow": "06:00"}'),
(2, 'consecutive_days', 30, '{"activityType": "health_goal_completion"}'),
(3, 'total_activities', 100, '{"activityType": "exercise", "timeRange": "month", "unit": "hours"}'),
(4, 'consecutive_days', 365, '{"activityType": "daily_checkin"}'),
(5, 'total_activities', 1, '{"activityType": "health_data_submission", "timeRange": "all"}');

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE ON badge_types TO authenticated;
GRANT SELECT, INSERT, UPDATE ON badge_conditions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON user_badges TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON badge_progress TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON user_activities TO authenticated;
GRANT SELECT, INSERT ON badge_activity_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON health_scores TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON user_event_participations TO authenticated;

-- Grant sequence permissions
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant basic read permissions to anonymous users
GRANT SELECT ON badge_types TO anon;
GRANT SELECT ON badge_conditions TO anon;

-- Enable Row Level Security (RLS)
ALTER TABLE badge_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE badge_conditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE badge_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE badge_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_event_participations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for badge_types (public read, admin write)
CREATE POLICY "Badge types are viewable by everyone" ON badge_types
    FOR SELECT USING (true);

CREATE POLICY "Badge types are editable by admins" ON badge_types
    FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

-- RLS Policies for badge_conditions (public read, admin write)
CREATE POLICY "Badge conditions are viewable by everyone" ON badge_conditions
    FOR SELECT USING (true);

CREATE POLICY "Badge conditions are editable by admins" ON badge_conditions
    FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

-- RLS Policies for user_badges (users can view their own badges)
CREATE POLICY "Users can view their own badges" ON user_badges
    FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert their own badges" ON user_badges
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Admins can view all badges" ON user_badges
    FOR SELECT USING (auth.jwt() ->> 'role' = 'admin');

-- RLS Policies for badge_progress (users can view their own progress)
CREATE POLICY "Users can view their own progress" ON badge_progress
    FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own progress" ON badge_progress
    FOR ALL USING (auth.uid()::text = user_id);

CREATE POLICY "Admins can view all progress" ON badge_progress
    FOR SELECT USING (auth.jwt() ->> 'role' = 'admin');

-- RLS Policies for user_activities (users can manage their own activities)
CREATE POLICY "Users can view their own activities" ON user_activities
    FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert their own activities" ON user_activities
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Admins can view all activities" ON user_activities
    FOR SELECT USING (auth.jwt() ->> 'role' = 'admin');

-- RLS Policies for badge_activity_logs (users can view their own logs)
CREATE POLICY "Users can view their own activity logs" ON badge_activity_logs
    FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "System can insert activity logs" ON badge_activity_logs
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can view all activity logs" ON badge_activity_logs
    FOR SELECT USING (auth.jwt() ->> 'role' = 'admin');

-- RLS Policies for health_scores (users can manage their own scores)
CREATE POLICY "Users can view their own health scores" ON health_scores
    FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert their own health scores" ON health_scores
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Admins can view all health scores" ON health_scores
    FOR SELECT USING (auth.jwt() ->> 'role' = 'admin');

-- RLS Policies for user_event_participations (users can manage their own participations)
CREATE POLICY "Users can view their own event participations" ON user_event_participations
    FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert their own event participations" ON user_event_participations
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Admins can view all event participations" ON user_event_participations
    FOR SELECT USING (auth.jwt() ->> 'role' = 'admin');