import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Supabase 连接配置
const supabaseUrl = 'https://edlwanvgejywgyybeell.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkbHdhbnZnZWp5d2d5eWJlZWxsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTE2MTYyNCwiZXhwIjoyMDcwNzM3NjI0fQ.3ev5zOFb88QPcjP6XJOhzzvSNqoMdAl4WSbXivKks1Y';

// 创建 Supabase 客户端
const supabase = createClient(supabaseUrl, serviceRoleKey);

async function executeSQL(sql) {
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceRoleKey}`,
        'apikey': serviceRoleKey,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({ sql })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    throw new Error(`SQL执行失败: ${error.message}`);
  }
}

async function executeMigration() {
  try {
    console.log('开始执行数据库迁移...');
    
    // 读取迁移文件
    const migrationPath = path.join(__dirname, '../supabase/migrations/20241225000002_create_badge_tables.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('读取迁移文件成功，开始执行SQL...');
    console.log('SQL内容长度:', migrationSQL.length);
    
    // 直接执行整个SQL文件
    try {
      await executeSQL(migrationSQL);
      console.log('✓ SQL执行成功');
    } catch (error) {
      console.error('❌ SQL执行失败:', error.message);
      
      // 如果整体执行失败，尝试分段执行
      console.log('尝试分段执行SQL...');
      const statements = migrationSQL
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
      
      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i] + ';';
        console.log(`执行第 ${i + 1}/${statements.length} 条语句...`);
        
        try {
          await executeSQL(statement);
          console.log(`✓ 语句 ${i + 1} 执行成功`);
        } catch (err) {
          console.warn(`⚠️ 语句 ${i + 1} 执行失败: ${err.message}`);
          console.warn(`语句内容: ${statement.substring(0, 100)}...`);
        }
      }
    }
    
    console.log('\n迁移执行完成，验证表创建情况...');
    await verifyTables();
    
  } catch (error) {
    console.error('迁移执行失败:', error);
    throw error;
  }
}

async function verifyTables() {
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
  
  console.log('验证表创建情况...');
  
  for (const tableName of expectedTables) {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);
      
      if (error) {
        console.log(`❌ 表 ${tableName}: ${error.message}`);
      } else {
        console.log(`✓ 表 ${tableName} 创建成功`);
      }
    } catch (err) {
      console.log(`❌ 表 ${tableName} 验证失败: ${err.message}`);
    }
  }
}

async function testDatabaseConnection() {
  console.log('\n测试数据库连接...');
  
  try {
    // 测试基本连接
    const { data, error } = await supabase
      .from('badge_types')
      .select('count')
      .limit(1);
    
    if (error) {
      console.log(`连接测试失败: ${error.message}`);
      return;
    }
    
    console.log('✓ 数据库连接正常');
    
    // 测试插入示例数据
    console.log('测试插入示例勋章类型...');
    const { data: insertData, error: insertError } = await supabase
      .from('badge_types')
      .insert({
        name: '测试勋章',
        description: '这是一个测试勋章',
        icon_url: 'https://example.com/test-badge.png',
        rarity: 'common',
        category: 'test'
      })
      .select();
    
    if (insertError) {
      console.log(`插入测试失败: ${insertError.message}`);
    } else {
      console.log('✓ 数据插入测试成功');
      console.log('插入的数据:', insertData);
    }
    
  } catch (error) {
    console.error('数据库连接测试失败:', error);
  }
}

// 主函数
async function main() {
  console.log('=== BadgeNFT 数据库迁移工具 ===\n');
  
  try {
    await executeMigration();
    await testDatabaseConnection();
    console.log('\n=== 迁移完成 ===');
  } catch (error) {
    console.error('\n=== 迁移失败 ===');
    console.error(error);
    process.exit(1);
  }
}

// 直接运行
main().catch(console.error);

export { executeMigration, verifyTables, testDatabaseConnection };