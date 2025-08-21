# LUMIEAI - Web3 健康管理平台

<div align="center">
  <img src="./branding/lumieai_logo.svg" alt="LUMIEAI Logo" width="200"/>
  
  [![CI/CD](https://github.com/lumieai/lumieai/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/lumieai/lumieai/actions/workflows/ci-cd.yml)
  [![Flutter](https://img.shields.io/badge/Flutter-3.16.0-blue.svg)](https://flutter.dev/)
  [![FastAPI](https://img.shields.io/badge/FastAPI-0.104.1-green.svg)](https://fastapi.tiangolo.com/)
  [![BSC](https://img.shields.io/badge/Blockchain-BSC-yellow.svg)](https://www.bnbchain.org/)
  [![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
</div>

## 📱 项目简介

LUMIEAI 是一款基于 Web3 技术的跨端健康管理应用，通过 AI 驱动的个性化健康建议和区块链技术确保数据安全与激励机制。

### ✨ 核心特性

- 🔐 **Web3 登录**: 支持邮箱注册和钱包连接（MetaMask等）
- 📊 **健康数据管理**: 多源健康数据同步与可视化分析
- 🤖 **AI 健康助手**: 个性化健康建议和 7 日微计划制定
- 🎯 **任务系统**: 日常健康任务与 PoC 数据验证
- 🏆 **激励机制**: LUM 代币奖励与 NFT 勋章系统
- 🛒 **健康商城**: 仅支持 LUM 代币的健康产品购买
- 🔒 **数据确权**: 基于 Merkle 树的区块链数据存证
- 🌍 **多语言支持**: 中英双语界面
- 🎨 **主题切换**: 深色/浅色主题适配

## 🏗️ 项目架构

```
lumieai/
├── flutter_app/          # Flutter 跨端应用
│   ├── lib/
│   │   ├── core/         # 核心配置和服务
│   │   ├── features/     # 功能模块
│   │   ├── shared/       # 共享组件
│   │   └── main.dart     # 应用入口
│   └── pubspec.yaml      # Flutter 依赖配置
├── backend_api/          # FastAPI 后端服务
│   ├── app/
│   │   ├── api/          # API 路由
│   │   ├── core/         # 核心配置
│   │   ├── models/       # 数据模型
│   │   ├── services/     # 业务服务
│   │   └── utils/        # 工具函数
│   ├── main.py           # FastAPI 应用入口
│   └── requirements.txt  # Python 依赖
├── contracts/            # 智能合约
│   ├── contracts/        # Solidity 合约
│   ├── scripts/          # 部署脚本
│   └── test/             # 合约测试
├── .github/workflows/    # CI/CD 配置
├── docker-compose.yml    # Docker 容器编排
└── README.md             # 项目文档
```

## 🚀 快速开始

### 环境要求

- **Flutter**: 3.16.0+
- **Python**: 3.11+
- **Node.js**: 20+
- **PostgreSQL**: 15+ (推荐使用 TimescaleDB)
- **Redis**: 7+
- **Docker**: 20+ (可选)

### 1. 克隆项目

```bash
git clone https://github.com/lumieai/lumieai.git
cd lumieai
```

### 2. 环境配置

```bash
# 复制环境配置文件
cp .env.example .env

# 编辑配置文件，填入必要的 API 密钥和数据库连接信息
vim .env
```

### 3. 使用 Docker 启动（推荐）

```bash
# 启动所有服务
docker-compose up -d

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f backend
```

### 4. 手动启动开发环境

#### 启动后端服务

```bash
cd backend_api

# 创建虚拟环境
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 安装依赖
pip install -r requirements.txt

# 运行数据库迁移
alembic upgrade head

# 启动开发服务器
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

#### 启动 Flutter 应用

```bash
cd flutter_app

# 获取依赖
flutter pub get

# 运行应用（iOS 模拟器）
flutter run -d ios

# 运行应用（Android 模拟器）
flutter run -d android
```

#### 部署智能合约

```bash
cd contracts

# 安装依赖
npm install

# 编译合约
npx hardhat compile

# 运行测试
npx hardhat test

# 部署到 BSC 测试网
npx hardhat run scripts/deploy.js --network bsc-testnet
```

## 📚 API 文档

启动后端服务后，访问以下地址查看 API 文档：

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## 🧪 测试

### 运行所有测试

```bash
# Flutter 测试
cd flutter_app && flutter test

# 后端测试
cd backend_api && pytest

# 智能合约测试
cd contracts && npx hardhat test
```

### 代码质量检查

```bash
# Flutter 代码分析
cd flutter_app && flutter analyze

# Python 代码格式化和检查
cd backend_api
black .
isort .
flake8 .
mypy .

# Solidity 代码检查
cd contracts && npx hardhat check
```

## 🔧 配置说明

### 环境变量

| 变量名 | 描述 | 默认值 |
|--------|------|--------|
| `DATABASE_URL` | PostgreSQL 数据库连接 | `postgresql://user:pass@localhost/db` |
| `REDIS_URL` | Redis 缓存连接 | `redis://localhost:6379/0` |
| `BSC_RPC_URL` | BSC 网络 RPC 地址 | `https://bsc-dataseed1.binance.org/` |
| `OPENAI_API_KEY` | OpenAI API 密钥 | - |
| `PINATA_API_KEY` | Pinata IPFS API 密钥 | - |
| `JWT_SECRET_KEY` | JWT 签名密钥 | - |

### 区块链配置

- **网络**: BSC Mainnet (Chain ID: 56)
- **代币**: LUM Token
- **合约地址**: 见 `flutter_app/lib/core/app_config.dart`

## 🚀 部署

### 生产环境部署

1. **构建 Docker 镜像**

```bash
# 构建后端镜像
docker build -t lumieai/backend:latest ./backend_api

# 推送到镜像仓库
docker push lumieai/backend:latest
```

2. **部署到云服务**

```bash
# 使用 docker-compose 部署
docker-compose -f docker-compose.prod.yml up -d

# 或使用 Kubernetes
kubectl apply -f k8s/
```

3. **Flutter 应用发布**

```bash
# 构建 Android APK
cd flutter_app
flutter build apk --release

# 构建 iOS IPA
flutter build ios --release
```

## 🤝 贡献指南

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

### 代码规范

- **Flutter**: 遵循 [Dart Style Guide](https://dart.dev/guides/language/effective-dart/style)
- **Python**: 遵循 [PEP 8](https://www.python.org/dev/peps/pep-0008/)
- **Solidity**: 遵循 [Solidity Style Guide](https://docs.soliditylang.org/en/latest/style-guide.html)

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🙏 致谢

- [Flutter](https://flutter.dev/) - 跨端应用开发框架
- [FastAPI](https://fastapi.tiangolo.com/) - 现代 Python Web 框架
- [BSC](https://www.bnbchain.org/) - 区块链基础设施
- [OpenAI](https://openai.com/) - AI 服务支持

## 📞 联系我们

- **官网**: https://lumieai.com
- **邮箱**: contact@lumieai.com
- **Twitter**: [@LumieAI](https://twitter.com/LumieAI)
- **Discord**: [LUMIEAI Community](https://discord.gg/lumieai)

---

<div align="center">
  Made with ❤️ by LUMIEAI Team
</div>
