const { ethers } = require('hardhat');
const fs = require('fs');
const path = require('path');

/**
 * 部署DataProof合约到BSC Testnet
 */
async function main() {
  console.log('开始部署DataProof合约...');
  
  // 获取部署账户
  const [deployer] = await ethers.getSigners();
  console.log('部署账户:', deployer.address);
  
  // 检查账户余额
  const balance = await deployer.getBalance();
  console.log('账户余额:', ethers.utils.formatEther(balance), 'BNB');
  
  if (balance.lt(ethers.utils.parseEther('0.01'))) {
    console.warn('警告: 账户余额较低，可能无法完成部署');
  }
  
  try {
    // 获取合约工厂
    const DataProof = await ethers.getContractFactory('DataProof');
    
    // 部署合约
    console.log('正在部署合约...');
    const dataProof = await DataProof.deploy();
    
    // 等待部署完成
    await dataProof.deployed();
    
    console.log('✅ DataProof合约部署成功!');
    console.log('合约地址:', dataProof.address);
    console.log('部署交易哈希:', dataProof.deployTransaction.hash);
    console.log('部署区块号:', dataProof.deployTransaction.blockNumber);
    
    // 验证合约所有者
    const owner = await dataProof.owner();
    console.log('合约所有者:', owner);
    
    // 获取合约统计信息
    const stats = await dataProof.getStats();
    console.log('合约统计:', {
      totalAnchors: stats._totalAnchors.toString(),
      totalBatches: stats._totalBatches.toString(),
      owner: stats._owner
    });
    
    // 保存部署信息到文件
    const deploymentInfo = {
      contractName: 'DataProof',
      contractAddress: dataProof.address,
      deploymentTxHash: dataProof.deployTransaction.hash,
      deploymentBlockNumber: dataProof.deployTransaction.blockNumber,
      deployer: deployer.address,
      network: 'BSC Testnet',
      deployedAt: new Date().toISOString(),
      abi: JSON.parse(dataProof.interface.format('json'))
    };
    
    // 创建部署信息目录
    const deploymentsDir = path.join(__dirname, 'deployments');
    if (!fs.existsSync(deploymentsDir)) {
      fs.mkdirSync(deploymentsDir, { recursive: true });
    }
    
    // 保存部署信息
    const deploymentFile = path.join(deploymentsDir, 'DataProof.json');
    fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
    console.log('部署信息已保存到:', deploymentFile);
    
    // 生成前端配置文件
    const frontendConfig = {
      contractAddress: dataProof.address,
      contractABI: deploymentInfo.abi,
      network: {
        name: 'BSC Testnet',
        chainId: 97,
        rpcUrl: 'https://data-seed-prebsc-1-s1.binance.org:8545/',
        blockExplorer: 'https://testnet.bscscan.com'
      }
    };
    
    const frontendConfigFile = path.join(__dirname, '..', 'lib', 'core', 'config', 'contract_config.json');
    const configDir = path.dirname(frontendConfigFile);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    
    fs.writeFileSync(frontendConfigFile, JSON.stringify(frontendConfig, null, 2));
    console.log('前端配置文件已生成:', frontendConfigFile);
    
    console.log('\n🎉 部署完成! 请保存以下信息:');
    console.log('合约地址:', dataProof.address);
    console.log('BSC Testnet浏览器链接:', `https://testnet.bscscan.com/address/${dataProof.address}`);
    
  } catch (error) {
    console.error('❌ 部署失败:', error.message);
    
    if (error.code === 'INSUFFICIENT_FUNDS') {
      console.log('\n💡 解决方案:');
      console.log('1. 请确保账户有足够的BNB用于支付Gas费用');
      console.log('2. 可以从BSC Testnet水龙头获取测试BNB: https://testnet.binance.org/faucet-smart');
    }
    
    if (error.code === 'NETWORK_ERROR') {
      console.log('\n💡 解决方案:');
      console.log('1. 检查网络连接');
      console.log('2. 确认hardhat.config.js中的网络配置正确');
    }
    
    process.exit(1);
  }
}

// 执行部署
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = main;