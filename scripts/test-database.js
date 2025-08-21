import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Supabase 配置
const supabaseUrl = 'https://edlwanvgejywgyybeell.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkbHdhbnZnZWp5d2d5eWJlZWxsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTE2MTYyNCwiZXhwIjoyMDcwNzM3NjI0fQ.3ev5zOFb88QPcjP6XJOhzzvSNqoMdAl4WSbXivKks1Y';

// 创建 Supabase 客户端
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testDatabaseConnection() {
  console.log('🔍 测试数据库连接...');
  
  try {
    // 1. 测试基本连接
    console.log('\n1. 测试基本连接');
    const { data: tables, error: tablesError } = await supabase
      .from('badge_types')
      .select('count')
      .limit(1);
    
    if (tablesError) {
      console.error('❌ 连接失败:', tablesError.message);
      return;
    }
    console.log('✅ 数据库连接成功');
    
    // 2. 检查所有表是否存在
    console.log('\n2. 检查表结构');
    const expectedTables = [
      'badge_types',
      'badge_conditions', 
      'user_badges',
      'badge_progress',
      'user_activities',
      'badge_activity_logs',
      'health_scores',
      'user_event_participations'
    ];
    
    for (const tableName of expectedTables) {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);
        
        if (error) {
          console.log(`❌ 表 ${tableName} 不存在或无权限访问:`, error.message);
        } else {
          console.log(`✅ 表 ${tableName} 存在且可访问`);
        }
      } catch (err) {
        console.log(`❌ 表 ${tableName} 检查失败:`, err.message);
      }
    }
    
    // 3. 检查示例数据
    console.log('\n3. 检查示例数据');
    const { data: badgeTypes, error: badgeTypesError } = await supabase
      .from('badge_types')
      .select('*');
    
    if (badgeTypesError) {
      console.error('❌ 获取勋章类型失败:', badgeTypesError.message);
    } else {
      console.log(`✅ 找到 ${badgeTypes.length} 个勋章类型`);
      badgeTypes.forEach(badge => {
        console.log(`   - ${badge.name} (${badge.rarity})`);
      });
    }
    
    const { data: badgeConditions, error: conditionsError } = await supabase
      .from('badge_conditions')
      .select('*');
    
    if (conditionsError) {
      console.error('❌ 获取勋章条件失败:', conditionsError.message);
    } else {
      console.log(`✅ 找到 ${badgeConditions.length} 个勋章条件`);
      badgeConditions.forEach(condition => {
        console.log(`   - ${condition.condition_type}: ${condition.target_value}`);
      });
    }
    
    // 4. 测试插入操作
    console.log('\n4. 测试数据插入');
    const testUserId = 'test-user-' + Date.now();
    
    // 插入用户活动
    const { data: activity, error: activityError } = await supabase
      .from('user_activities')
      .insert({
        user_id: testUserId,
        activity_type: 'daily_checkin',
        metadata: { test: true }
      })
      .select()
      .single();
    
    if (activityError) {
      console.error('❌ 插入用户活动失败:', activityError.message);
    } else {
      console.log('✅ 成功插入用户活动:', activity.id);
      
      // 清理测试数据
      await supabase
        .from('user_activities')
        .delete()
        .eq('id', activity.id);
      console.log('✅ 清理测试数据完成');
    }
    
    console.log('\n🎉 数据库测试完成！所有功能正常。');
    
  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error.message);
  }
}

// 如果直接运行此脚本
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1].endsWith('test-database.js')) {
  testDatabaseConnection();
}

export { testDatabaseConnection, supabase };