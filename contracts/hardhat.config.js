require('@nomiclabs/hardhat-waffle');
require('@nomiclabs/hardhat-ethers');
require('dotenv').config();

/**
 * Hardhat配置文件
 * 支持BSC Testnet部署和本地测试
 */

// 从环境变量获取私钥
const PRIVATE_KEY = process.env.PRIVATE_KEY || '0x' + '0'.repeat(64);
const BSC_API_KEY = process.env.BSC_API_KEY || '';

module.exports = {
  // Solidity编译器配置
  solidity: {
    version: '0.8.20',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      },
      viaIR: true
    }
  },
  
  // 网络配置
  networks: {
    // 本地开发网络
    hardhat: {
      chainId: 31337,
      gas: 12000000,
      blockGasLimit: 12000000,
      allowUnlimitedContractSize: true
    },
    
    // 本地测试网络
    localhost: {
      url: 'http://127.0.0.1:8545',
      chainId: 31337
    },
    
    // BSC Testnet
    bscTestnet: {
      url: 'https://data-seed-prebsc-1-s1.binance.org:8545/',
      chainId: 97,
      accounts: PRIVATE_KEY !== '0x' + '0'.repeat(64) ? [PRIVATE_KEY] : [],
      gas: 2100000,
      gasPrice: 20000000000, // 20 gwei
      timeout: 60000,
      confirmations: 2
    },
    
    // BSC Mainnet (生产环境)
    bscMainnet: {
      url: 'https://bsc-dataseed1.binance.org/',
      chainId: 56,
      accounts: PRIVATE_KEY !== '0x' + '0'.repeat(64) ? [PRIVATE_KEY] : [],
      gas: 2100000,
      gasPrice: 5000000000, // 5 gwei
      timeout: 60000,
      confirmations: 3
    }
  },
  
  // 路径配置
  paths: {
    sources: './contracts',
    tests: './test',
    cache: './cache',
    artifacts: './artifacts'
  },
  
  // Mocha测试配置
  mocha: {
    timeout: 40000,
    reporter: 'spec'
  },
  
  // Gas报告配置
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: 'USD'
  },
  
  // 合约验证配置
  etherscan: {
    apiKey: {
      bscTestnet: BSC_API_KEY,
      bsc: BSC_API_KEY
    },
    customChains: [
      {
        network: 'bscTestnet',
        chainId: 97,
        urls: {
          apiURL: 'https://api-testnet.bscscan.com/api',
          browserURL: 'https://testnet.bscscan.com'
        }
      }
    ]
  }
};