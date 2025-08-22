# 环境变量配置文档

本文档详细说明了LUMIEAI项目中所有必需的环境变量配置。

## 核心环境变量

### 区块链配置

| 变量名 | 用途 | 示例值 | 状态 |
|--------|------|--------|------|
| `BSC_RPC_URL` | BSC主网RPC地址 | `https://bsc-dataseed1.binance.org/` | ✅ 已配置 |
| `BSC_TESTNET_RPC_URL` | BSC测试网RPC地址 | `https://data-seed-prebsc-1-s1.binance.org:8545/` | ✅ 已配置 |
| `BSC_CHAIN_ID` | BSC主网链ID | `56` | ✅ 已配置 |
| `BSC_TESTNET_CHAIN_ID` | BSC测试网链ID | `97` | ✅ 已配置 |
| `BSC_API_KEY` | BSCScan API密钥 | `97D2C23INBJ1YCSV4B1UYP1TV4VWKEPAJ1` | ✅ 已配置 |

### 智能合约地址

| 变量名 | 用途 | 当前地址 | 状态 |
|--------|------|----------|------|
| `LUM_TOKEN_ADDRESS` | LUM代币合约地址（商城支付） | `0x6445C5d74c57a6fe0E622B1380c65C0F112B3C5A` | ✅ 已配置 |
| `SUBSCRIPTION_MANAGER_ADDRESS` | 订阅管理合约地址（BNB支付） | `0x9c7920f113B27De6a57bbCF53D6111cbA5532498` | ✅ 已配置 |
| `REWARD_DISTRIBUTOR_ADDRESS` | 奖励分发合约地址 | `0x...` | ⚠️ 待部署 |
| `BADGE_NFT_ADDRESS` | NFT徽章合约地址 | `0x...` | ⚠️ 待部署 |
| `DATA_PROOF_ADDRESS` | 数据证明合约地址 | `0x...` | ⚠️ 待部署 |

### 订阅配置

| 变量名 | 用途 | 值 | 状态 |
|--------|------|----|----- |
| `SUBSCRIPTION_DEFAULT_PLAN_ID` | 默认订阅计划ID | `1` | ✅ 已配置 |

### 私钥配置

| 变量名 | 用途 | 安全级别 | 状态 |
|--------|------|----------|------|
| `SERVER_WALLET_PRIVATE_KEY` | 服务器钱包私钥（后端自动交易） | 🔴 高敏感 | ✅ 已配置 |
| `PRIVATE_KEY` | 部署账户私钥 | 🔴 高敏感 | ✅ 已配置 |

## 配置文件状态

### 主项目配置
- ✅ `.env` - 包含所有必需变量
- ✅ `.env.example` - 包含完整模板和注释

### 后端API配置
- ✅ `backend_api/.env` - 包含正确的合约地址
- ✅ `backend_api/.env.example` - 包含详细注释
- ✅ `backend_api/app/core/config.py` - 配置类已更新

### 合约配置
- ✅ `contracts/.env` - 包含部署配置
- ✅ `contracts/.env.example` - 包含中文注释

### 前端配置
- ✅ `.env.local` - 包含Vite环境变量

## 双代币体系说明

### BNB支付（订阅系统）
- **用途**: 高级订阅服务
- **合约**: `SubscriptionManager` (`0x9c7920f113B27De6a57bbCF53D6111cbA5532498`)
- **支付方式**: 直接BNB转账
- **特点**: 无需授权，Gas费用低

### LUM代币支付（商城系统）
- **用途**: 商城商品购买
- **合约**: `LUMToken` (`0x6445C5d74c57a6fe0E622B1380c65C0F112B3C5A`)
- **支付方式**: ERC20代币转账
- **特点**: 需要授权，精确授权额度

## 安全注意事项

1. **私钥安全**
   - 🔴 绝不在版本控制中提交真实私钥
   - 🔴 生产环境使用专用服务账户
   - 🔴 定期轮换私钥

2. **API密钥安全**
   - 🟡 BSC API密钥限制访问频率
   - 🟡 监控API使用情况

3. **合约地址验证**
   - ✅ 所有合约地址已在BSCScan验证
   - ✅ 前端/后端/合约配置保持一致

## 部署检查清单

### 开发环境
- [x] 所有环境变量已配置
- [x] TypeScript检查通过
- [x] 合约地址一致性验证
- [x] 前后端配置同步

### 生产环境
- [ ] 更新为主网RPC地址
- [ ] 更新为主网合约地址
- [ ] 配置生产级私钥
- [ ] 启用监控和日志

## 故障排除

### 常见问题

1. **合约地址不匹配**
   - 检查所有配置文件中的`SUBSCRIPTION_MANAGER_ADDRESS`
   - 确保前端、后端、合约配置一致

2. **网络连接问题**
   - 验证RPC URL可访问性
   - 检查API密钥有效性

3. **私钥权限问题**
   - 确保私钥对应账户有足够余额
   - 验证账户权限设置

## 更新日志

- **2024-01-XX**: 初始配置完成
- **2024-01-XX**: 更新订阅合约地址为 `0x9c7920f113B27De6a57bbCF53D6111cbA5532498`
- **2024-01-XX**: 统一所有配置文件中的环境变量