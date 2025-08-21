# DataProof 智能合约

数据存证智能合约，支持健康数据的区块链存证和验证功能。

## 功能特性

- ✅ **每日数据锚定**: 支持按日期批量锚定健康数据
- ✅ **批量数据锚定**: 支持自定义批次的数据锚定
- ✅ **Merkle树验证**: 使用Merkle树确保数据完整性
- ✅ **数据验证**: 支持验证数据是否已上链存证
- ✅ **权限管理**: 基于所有者的访问控制
- ✅ **暂停机制**: 紧急情况下可暂停合约操作
- ✅ **统计功能**: 提供锚定数据的统计信息

## 合约架构

### 核心结构

```solidity
// 锚定记录
struct Anchor {
    bytes32 merkleRoot;     // Merkle树根
    string cid;             // IPFS CID（可选）
    uint256 blockNumber;    // 区块号
    uint256 timestamp;      // 时间戳
    uint256 dataCount;      // 数据条数
    address submitter;      // 提交者
    bool exists;            // 是否存在
}

// 批量锚定记录
struct BatchAnchor {
    bytes32 batchId;        // 批次ID
    bytes32 merkleRoot;     // Merkle树根
    uint256 blockNumber;    // 区块号
    uint256 timestamp;      // 时间戳
    uint256 dataCount;      // 数据条数
    address submitter;      // 提交者
    string metadata;        // 元数据
    bool exists;            // 是否存在
}
```

### 主要功能

#### 1. 每日数据锚定
```solidity
function anchorDaily(
    uint256 _date,          // 日期 (YYYYMMDD)
    bytes32 _merkleRoot,    // Merkle树根
    string calldata _cid,   // IPFS CID
    uint256 _dataCount      // 数据条数
) external onlyOwner
```

#### 2. 批量数据锚定
```solidity
function anchorBatch(
    bytes32 _batchId,       // 批次ID
    bytes32 _merkleRoot,    // Merkle树根
    uint256 _dataCount,     // 数据条数
    string calldata _metadata // 元数据
) external onlyOwner
```

#### 3. 数据验证
```solidity
function isRootAnchored(bytes32 _merkleRoot) external view returns (bool)
function getAnchorInfo(bytes32 _merkleRoot) external view returns (...)
```

## 快速开始

### 1. 环境准备

```bash
# 安装依赖
npm install

# 复制环境变量配置
cp .env.example .env
```

### 2. 配置环境变量

编辑 `.env` 文件：

```bash
# 部署账户私钥 (测试网络)
PRIVATE_KEY=your_private_key_here

# BSCScan API密钥 (用于合约验证)
BSC_API_KEY=your_bscscan_api_key_here
```

### 3. 编译合约

```bash
npm run compile
```

### 4. 运行测试

```bash
# 运行所有测试
npm run test

# 生成Gas报告
npm run gas-report

# 生成覆盖率报告
npm run test:coverage
```

### 5. 部署合约

#### 本地测试网络
```bash
# 启动本地节点
npm run node

# 部署到本地网络
npm run deploy:local
```

#### BSC Testnet
```bash
# 部署到BSC测试网
npm run deploy:testnet

# 验证合约 (可选)
npm run verify:testnet <CONTRACT_ADDRESS>
```

#### BSC Mainnet (生产环境)
```bash
# 部署到BSC主网
npm run deploy:mainnet

# 验证合约
npm run verify:mainnet <CONTRACT_ADDRESS>
```

## 部署后配置

### 1. 获取测试BNB

如果部署到BSC Testnet，需要获取测试BNB：
- 访问 [BSC Testnet Faucet](https://testnet.binance.org/faucet-smart)
- 输入部署账户地址获取测试BNB

### 2. 合约验证

部署成功后，建议在BSCScan上验证合约：

```bash
# 获取BSCScan API密钥
# 1. 访问 https://bscscan.com/apis
# 2. 注册账户并创建API密钥
# 3. 将API密钥添加到.env文件

# 验证合约
npm run verify:testnet <CONTRACT_ADDRESS>
```

## 使用示例

### JavaScript/TypeScript 集成

```javascript
const { ethers } = require('ethers');
const contractConfig = require('./lib/core/config/contract_config.json');

// 连接到BSC Testnet
const provider = new ethers.providers.JsonRpcProvider(
  'https://data-seed-prebsc-1-s1.binance.org:8545/'
);

// 创建合约实例
const contract = new ethers.Contract(
  contractConfig.contractAddress,
  contractConfig.contractABI,
  provider
);

// 查询锚定信息
async function getAnchorInfo(merkleRoot) {
  const info = await contract.getAnchorInfo(merkleRoot);
  return {
    isAnchored: info.isAnchored,
    anchorType: info.anchorType, // 0=未锚定, 1=日期锚定, 2=批量锚定
    identifier: info.identifier,
    blockNumber: info.blockNumber.toString(),
    timestamp: new Date(info.timestamp.toNumber() * 1000)
  };
}

// 验证数据是否已锚定
async function verifyData(merkleRoot) {
  return await contract.isRootAnchored(merkleRoot);
}
```

### Merkle树生成示例

```javascript
const { MerkleTree } = require('merkletreejs');
const crypto = require('crypto');

// 生成健康数据的Merkle树
function generateMerkleTree(healthDataArray) {
  // 将数据转换为哈希叶子节点
  const leaves = healthDataArray.map(data => 
    crypto.createHash('sha256')
      .update(JSON.stringify(data))
      .digest()
  );
  
  // 创建Merkle树
  const tree = new MerkleTree(leaves, crypto.createHash('sha256'));
  
  return {
    root: '0x' + tree.getRoot().toString('hex'),
    tree: tree,
    leaves: leaves
  };
}

// 使用示例
const healthData = [
  { userId: 'user1', heartRate: 72, timestamp: Date.now() },
  { userId: 'user2', steps: 8500, timestamp: Date.now() },
  { userId: 'user3', sleep: 8.5, timestamp: Date.now() }
];

const merkleData = generateMerkleTree(healthData);
console.log('Merkle Root:', merkleData.root);
```

## 网络信息

### BSC Testnet
- **Chain ID**: 97
- **RPC URL**: https://data-seed-prebsc-1-s1.binance.org:8545/
- **Block Explorer**: https://testnet.bscscan.com
- **Faucet**: https://testnet.binance.org/faucet-smart

### BSC Mainnet
- **Chain ID**: 56
- **RPC URL**: https://bsc-dataseed1.binance.org/
- **Block Explorer**: https://bscscan.com

## 安全注意事项

1. **私钥安全**: 永远不要在代码中硬编码私钥
2. **权限管理**: 合约部署后，建议将所有权转移到多签钱包
3. **Gas优化**: 批量操作时注意Gas限制
4. **数据验证**: 上链前确保数据格式正确
5. **网络选择**: 生产环境使用主网，测试使用测试网

## 故障排除

### 常见问题

1. **部署失败 - 余额不足**
   ```
   Error: insufficient funds for gas * price + value
   ```
   解决方案: 确保账户有足够的BNB支付Gas费用

2. **网络连接错误**
   ```
   Error: network error
   ```
   解决方案: 检查网络配置和RPC节点状态

3. **合约验证失败**
   ```
   Error: verification failed
   ```
   解决方案: 确保API密钥正确，合约代码匹配

### 调试技巧

```bash
# 查看详细错误信息
DEBUG=* npm run deploy:testnet

# 检查Gas使用情况
npm run gas-report

# 分析合约大小
npm run size
```

## 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 联系方式

- 项目主页: https://github.com/lumieai/dataproof-contracts
- 问题反馈: https://github.com/lumieai/dataproof-contracts/issues
- 邮箱: dev@lumieai.com