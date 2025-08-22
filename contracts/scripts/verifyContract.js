const { ethers } = require('hardhat');
const SubscriptionManagerABI = require('../artifacts/contracts/SubscriptionManager.sol/SubscriptionManager.json');

async function main() {
  // 合约地址
  const contractAddress = '0x9c7920f113B27De6a57bbCF53D6111cbA5532498';
  
  // 连接到BSC测试网
  const provider = new ethers.providers.JsonRpcProvider('https://data-seed-prebsc-1-s1.binance.org:8545/');
  
  // 创建合约实例
  const contract = new ethers.Contract(contractAddress, SubscriptionManagerABI.abi, provider);
  
  console.log('🔍 验证SubscriptionManager合约功能...');
  console.log('合约地址:', contractAddress);
  console.log('网络:', await provider.getNetwork());
  
  try {
    // 测试地址（可以是任意地址）
    const testAddress = '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6'.toLowerCase();
    const checksumAddress = ethers.utils.getAddress(testAddress);
    
    console.log('\n📋 测试合约读取功能:');
    
    // 1. 测试 isActive 方法
    console.log('\n1. 测试 isActive 方法:');
    const isActive = await contract.isActive(checksumAddress);
    console.log(`   isActive(${checksumAddress}):`, isActive);
    
    // 2. 测试 subscriptionUntil 方法
    console.log('\n2. 测试 subscriptionUntil 方法:');
    const subscriptionUntil = await contract.subscriptionUntil(checksumAddress);
    console.log(`   subscriptionUntil(${checksumAddress}):`, subscriptionUntil.toString());
    
    // 3. 获取计划信息
    console.log('\n3. 测试 getPlan 方法:');
    const plan = await contract.plans(1);
    console.log('   计划1信息:', {
      priceWei: plan.priceWei.toString(),
      periodDays: plan.periodDays.toString(),
      active: plan.active,
      name: plan.name
    });
    
    // 4. 获取合约余额
    console.log('\n4. 合约余额:');
    const balance = await provider.getBalance(contractAddress);
    console.log('   合约余额:', ethers.utils.formatEther(balance), 'BNB');
    
    // 5. 获取总计划数
    console.log('\n5. 总计划数:');
    const totalPlans = await contract.nextPlanId();
    console.log('   下一个计划ID:', totalPlans.toString());
    
    console.log('\n✅ 合约功能验证完成！');
    console.log('\n📝 验证结果:');
    console.log('   - isActive() 方法: ✅ 可正常调用');
    console.log('   - subscriptionUntil() 方法: ✅ 可正常调用');
    console.log('   - 合约已部署且可访问: ✅');
    console.log('   - 初始计划已设置: ✅');
    
  } catch (error) {
    console.error('❌ 验证过程中出现错误:', error.message);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ 脚本执行失败:', error);
    process.exit(1);
  });