# LUMIEAI 项目部署交付文档

## 📋 文档概述

本文档为 LUMIEAI Web3 健康管理平台的完整部署交付指南，包含所有必要的环境配置、部署步骤和验证方法，确保运维团队能够独立完成项目部署。

**项目版本**: v1.0.0  
**文档版本**: 2025-01-23  
**适用环境**: 生产环境、测试环境

---

## 🏗️ 1. 项目概述和架构

### 1.1 项目简介

LUMIEAI 是一款基于 Web3 技术的跨端健康管理应用，采用微服务架构，包含以下核心组件：

- **前端应用**: React 管理后台 + Flutter 移动端
- **后端服务**: FastAPI + PostgreSQL + Redis
- **区块链**: BSC 智能合约 + Web3 集成
- **存储**: IPFS 分布式存储
- **CI/CD**: GitHub Actions 自动化流水线

### 1.2 系统架构图

```mermaid
graph TD
    A[用户设备] --> B[Nginx 负载均衡]
    B --> C[React 管理后台]
    B --> D[Flutter 移动端]
    C --> E[FastAPI 后端]
    D --> E
    E --> F[PostgreSQL 数据库]
    E --> G[Redis 缓存]
    E --> H[BSC 区块链]
    E --> I[IPFS 存储]
    
    subgraph "前端层"
        C
        D
    end
    
    subgraph "后端层"
        E
    end
    
    subgraph "数据层"
        F
        G
    end
    
    subgraph "区块链层"
        H
    end
    
    subgraph "存储层"
        I
    end
```

### 1.3 技术栈

| 组件 | 技术栈 | 版本 |
|------|--------|------|
| 前端管理后台 | React + TypeScript + Tailwind CSS | 18.2.0 |
| 移动端应用 | Flutter + Dart | 3.16.0 |
| 后端服务 | FastAPI + Python | 0.104.1 |
| 数据库 | PostgreSQL + TimescaleDB | 15+ |
| 缓存 | Redis | 7+ |
| 区块链 | BSC + Solidity | - |
| 存储 | IPFS + Pinata | - |
| 容器化 | Docker + Docker Compose | 20+ |

---

## 🔧 2. 环境要求和依赖清单

### 2.1 服务器要求

**最低配置**:
- CPU: 4 核
- 内存: 8GB RAM
- 存储: 100GB SSD
- 网络: 100Mbps

**推荐配置**:
- CPU: 8 核
- 内存: 16GB RAM
- 存储: 200GB SSD
- 网络: 1Gbps

### 2.2 软件依赖

```bash
# 基础环境
Ubuntu 20.04+ / CentOS 8+
Docker 20.10+
Docker Compose 2.0+
Nginx 1.18+

# 开发环境（可选）
Node.js 20+
Python 3.11+
Flutter 3.16+
PostgreSQL 15+
Redis 7+
```

### 2.3 外部服务依赖

| 服务 | 用途 | 必需性 |
|------|------|--------|
| OpenAI API | AI 健康咨询 | 必需 |
| Pinata IPFS | 分布式存储 | 必需 |
| BSC RPC | 区块链交互 | 必需 |
| SMTP 服务 | 邮件发送 | 可选 |
| 监控服务 | 系统监控 | 推荐 |

---

## 🚀 3. 详细部署步骤

### 3.1 环境准备

```bash
# 1. 更新系统
sudo apt update && sudo apt upgrade -y

# 2. 安装 Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# 3. 安装 Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 4. 安装 Nginx
sudo apt install nginx -y
sudo systemctl enable nginx
```

### 3.2 项目部署

```bash
# 1. 克隆项目
git clone https://github.com/lumieai/lumieai.git
cd lumieai

# 2. 配置环境变量
cp .env.example .env
vim .env  # 编辑配置文件

# 3. 启动服务
docker-compose up -d

# 4. 验证服务状态
docker-compose ps
docker-compose logs -f
```

### 3.3 数据库初始化

```bash
# 1. 等待数据库启动
sleep 30

# 2. 运行数据库迁移
docker-compose exec backend python -m alembic upgrade head

# 3. 初始化基础数据
docker-compose exec backend python scripts/init_data.py

# 4. 验证数据库连接
docker-compose exec postgres psql -U lumieai -d lumieai -c "\dt"
```

### 3.4 智能合约部署

```bash
# 1. 进入合约目录
cd contracts

# 2. 安装依赖
npm install

# 3. 编译合约
npx hardhat compile

# 4. 部署到测试网
npx hardhat run scripts/deploy.js --network bsc-testnet

# 5. 验证合约
npx hardhat run scripts/verify.js --network bsc-testnet
```

---

## ⚙️ 4. 环境变量配置说明

### 4.1 核心配置文件

**`.env` 主配置文件**:

```bash
# 应用配置
APP_NAME=LUMIEAI
APP_ENV=production
APP_DEBUG=false
APP_URL=https://lumieai.com

# 数据库配置
DATABASE_URL=postgresql://lumieai:password@postgres:5432/lumieai
REDIS_URL=redis://redis:6379/0

# JWT 配置
JWT_SECRET_KEY=your-super-secret-jwt-key-here
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=1440

# 区块链配置
BSC_RPC_URL=https://bsc-dataseed1.binance.org/
BSC_PRIVATE_KEY=your-private-key-here
CONTRAT_ADDRESS_LUM=0x...
CONTRAT_ADDRESS_NFT=0x...

# 外部服务
OPENAI_API_KEY=sk-...
PINATA_JWT=eyJ...
PINATA_GATEWAY=https://gateway.pinata.cloud

# 邮件配置
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=noreply@lumieai.com
SMTP_PASS=your-email-password

# 安全配置
CORS_ORIGINS=["https://lumieai.com","https://admin.lumieai.com"]
ALLOWED_HOSTS=["lumieai.com","admin.lumieai.com"]
```

### 4.2 Docker 环境变量

**`docker-compose.yml` 配置**:

```yaml
version: '3.8'

services:
  backend:
    build: ./backend_api
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
      - JWT_SECRET_KEY=${JWT_SECRET_KEY}
    ports:
      - "8000:8000"
    depends_on:
      - postgres
      - redis

  postgres:
    image: timescale/timescaledb:latest-pg15
    environment:
      - POSTGRES_DB=lumieai
      - POSTGRES_USER=lumieai
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  frontend:
    build: .
    ports:
      - "3000:3000"
    environment:
      - REACT_APP_API_URL=${APP_URL}/api

volumes:
  postgres_data:
  redis_data:
```

---

## 🗄️ 5. 数据库迁移和初始化

### 5.1 数据库结构

```sql
-- 核心表结构
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE,
    wallet_address VARCHAR(42) UNIQUE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE health_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    data_type VARCHAR(50),
    data_value JSONB,
    recorded_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255),
    description TEXT,
    reward_amount DECIMAL(18,8),
    status VARCHAR(20) DEFAULT 'active'
);
```

### 5.2 迁移命令

```bash
# 1. 创建迁移文件
docker-compose exec backend alembic revision --autogenerate -m "Initial migration"

# 2. 应用迁移
docker-compose exec backend alembic upgrade head

# 3. 回滚迁移（如需要）
docker-compose exec backend alembic downgrade -1

# 4. 查看迁移历史
docker-compose exec backend alembic history
```

### 5.3 初始数据

```bash
# 运行初始化脚本
docker-compose exec backend python scripts/init_data.py

# 或手动插入
docker-compose exec postgres psql -U lumieai -d lumieai -c "
INSERT INTO roles (name, description) VALUES 
('admin', '系统管理员'),
('ops', '运营人员'),
('viewer', '只读用户');
"
```

---

## 🔄 6. CI/CD 流水线配置验证

### 6.1 GitHub Actions 配置

**PR 检查流水线** (`.github/workflows/pr-checks.yml`):

```yaml
name: PR Checks

on:
  pull_request:
    branches: [ main, develop ]

jobs:
  flutter-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: subosito/flutter-action@v2
        with:
          flutter-version: '3.16.0'
      - run: flutter analyze
      - run: flutter test

  python-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      - run: pip install -r backend_api/requirements.txt
      - run: pytest backend_api/tests/

  contract-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: cd contracts && npm install
      - run: cd contracts && npx hardhat test

  security-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npx secretlint "**/*"
      - run: npx dotenv-linter
```

**部署流水线** (`.github/workflows/deploy.yml`):

```yaml
name: Deploy

on:
  push:
    branches: [ main ]

jobs:
  build-android:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: subosito/flutter-action@v2
      - run: flutter build appbundle
      - uses: actions/upload-artifact@v4
        with:
          name: android-aab
          path: build/app/outputs/bundle/release/

  build-ios:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4
      - uses: subosito/flutter-action@v2
      - run: flutter build ipa
      - uses: actions/upload-artifact@v4
        with:
          name: ios-ipa
          path: build/ios/ipa/

  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: docker build -t lumieai/backend ./backend_api
      - run: docker push lumieai/backend:latest
```

### 6.2 验证流水线

```bash
# 1. 检查 GitHub Actions 状态
curl -H "Authorization: token $GITHUB_TOKEN" \
     https://api.github.com/repos/lumieai/lumieai/actions/runs

# 2. 本地验证构建
docker build -t lumieai/backend ./backend_api
docker build -t lumieai/frontend .

# 3. 验证测试
cd flutter_app && flutter test
cd backend_api && pytest
cd contracts && npx hardhat test
```

---

## 🏥 7. 服务健康检查和监控

### 7.1 健康检查端点

```bash
# 后端健康检查
curl http://localhost:8000/health
# 预期响应: {"status": "healthy", "timestamp": "2025-01-23T10:00:00Z"}

# 数据库连接检查
curl http://localhost:8000/health/db
# 预期响应: {"database": "connected", "redis": "connected"}

# 区块链连接检查
curl http://localhost:8000/health/blockchain
# 预期响应: {"bsc_network": "connected", "block_number": 12345678}
```

### 7.2 监控配置

**Docker Compose 监控**:

```yaml
# 添加到 docker-compose.yml
services:
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana_data:/var/lib/grafana

volumes:
  grafana_data:
```

**Prometheus 配置** (`monitoring/prometheus.yml`):

```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'lumieai-backend'
    static_configs:
      - targets: ['backend:8000']
    metrics_path: '/metrics'

  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres:5432']

  - job_name: 'redis'
    static_configs:
      - targets: ['redis:6379']
```

### 7.3 日志管理

```bash
# 查看服务日志
docker-compose logs -f backend
docker-compose logs -f postgres
docker-compose logs -f redis

# 日志轮转配置
sudo vim /etc/logrotate.d/docker
# 添加内容:
/var/lib/docker/containers/*/*.log {
    rotate 7
    daily
    compress
    size=1M
    missingok
    delaycompress
    copytruncate
}
```

---

## 🔍 8. 常见问题排查指南

### 8.1 服务启动问题

**问题**: 后端服务无法启动
```bash
# 检查端口占用
sudo netstat -tlnp | grep :8000

# 检查环境变量
docker-compose exec backend env | grep DATABASE_URL

# 查看详细错误日志
docker-compose logs backend --tail 100
```

**问题**: 数据库连接失败
```bash
# 检查数据库状态
docker-compose exec postgres pg_isready

# 测试连接
docker-compose exec postgres psql -U lumieai -d lumieai -c "SELECT 1;"

# 重置数据库
docker-compose down -v
docker-compose up -d postgres
```

**问题**: Redis 连接失败
```bash
# 检查 Redis 状态
docker-compose exec redis redis-cli ping

# 查看 Redis 日志
docker-compose logs redis

# 清空 Redis 缓存
docker-compose exec redis redis-cli FLUSHALL
```

### 8.2 区块链交互问题

**问题**: 智能合约调用失败
```bash
# 检查网络连接
curl -X POST -H "Content-Type: application/json" \
     --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
     https://bsc-dataseed1.binance.org/

# 验证合约地址
npx hardhat verify --network bsc-testnet CONTRACT_ADDRESS

# 检查钱包余额
npx hardhat run scripts/check-balance.js --network bsc-testnet
```

**问题**: IPFS 上传失败
```bash
# 测试 Pinata 连接
curl -X GET "https://api.pinata.cloud/data/testAuthentication" \
     -H "Authorization: Bearer $PINATA_JWT"

# 检查文件大小限制
ls -lh /tmp/upload_file

# 重试上传
curl -X POST "https://api.pinata.cloud/pinning/pinFileToIPFS" \
     -H "Authorization: Bearer $PINATA_JWT" \
     -F "file=@/tmp/upload_file"
```

### 8.3 性能问题

**问题**: 响应时间过长
```bash
# 检查数据库查询性能
docker-compose exec postgres psql -U lumieai -d lumieai -c "
SELECT query, mean_exec_time, calls 
FROM pg_stat_statements 
ORDER BY mean_exec_time DESC LIMIT 10;"

# 检查 Redis 命中率
docker-compose exec redis redis-cli info stats | grep keyspace

# 监控系统资源
docker stats
```

---

## 🔒 9. 安全配置检查清单

### 9.1 网络安全

- [ ] **防火墙配置**: 仅开放必要端口（80, 443, 22）
- [ ] **SSL/TLS**: 配置有效的 HTTPS 证书
- [ ] **CORS 设置**: 限制跨域请求来源
- [ ] **Rate Limiting**: 配置 API 请求频率限制

```bash
# 配置防火墙
sudo ufw enable
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw deny 5432/tcp  # 禁止外部访问数据库

# 配置 Nginx SSL
sudo certbot --nginx -d lumieai.com
```

### 9.2 应用安全

- [ ] **环境变量**: 敏感信息不在代码中硬编码
- [ ] **JWT 密钥**: 使用强随机密钥
- [ ] **数据库权限**: 使用最小权限原则
- [ ] **API 认证**: 所有敏感接口需要认证

```bash
# 生成强密钥
openssl rand -hex 32

# 检查敏感文件权限
chmod 600 .env
chown root:root .env

# 数据库用户权限
psql -U postgres -c "REVOKE ALL ON DATABASE lumieai FROM PUBLIC;"
```

### 9.3 区块链安全

- [ ] **私钥管理**: 使用硬件钱包或 HSM
- [ ] **合约验证**: 所有合约代码已验证
- [ ] **权限控制**: 实现多签或时间锁
- [ ] **审计报告**: 完成第三方安全审计

```bash
# 验证合约
npx hardhat verify --network bsc-mainnet CONTRACT_ADDRESS

# 检查合约权限
npx hardhat run scripts/check-permissions.js --network bsc-mainnet
```

---

## ⚡ 10. 性能优化建议

### 10.1 数据库优化

```sql
-- 创建索引
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_health_data_user_id ON health_data(user_id);
CREATE INDEX idx_health_data_recorded_at ON health_data(recorded_at);

-- 分区表（时序数据）
CREATE TABLE health_data_2025 PARTITION OF health_data
FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');

-- 查询优化
EXPLAIN ANALYZE SELECT * FROM health_data WHERE user_id = 'uuid';
```

### 10.2 缓存策略

```python
# Redis 缓存配置
REDIS_CACHE_TTL = {
    'user_profile': 3600,      # 1小时
    'health_summary': 1800,    # 30分钟
    'ai_response': 7200,       # 2小时
    'blockchain_data': 300,    # 5分钟
}

# 缓存键命名规范
CACHE_KEYS = {
    'user': 'user:{user_id}',
    'health': 'health:{user_id}:{date}',
    'ai_chat': 'ai:{user_id}:{session_id}',
}
```

### 10.3 CDN 配置

```nginx
# Nginx 静态资源缓存
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
    add_header Vary Accept-Encoding;
    gzip_static on;
}

# API 响应压缩
location /api/ {
    gzip on;
    gzip_types application/json application/javascript text/css;
    proxy_pass http://backend;
}
```

### 10.4 监控指标

```yaml
# 关键性能指标
metrics:
  response_time:
    target: < 200ms
    alert: > 1000ms
  
  database_connections:
    target: < 80%
    alert: > 90%
  
  memory_usage:
    target: < 70%
    alert: > 85%
  
  error_rate:
    target: < 1%
    alert: > 5%
```

---

## 📞 11. 支持和联系方式

### 11.1 技术支持

- **开发团队**: dev@lumieai.com
- **运维支持**: ops@lumieai.com
- **紧急联系**: +86-xxx-xxxx-xxxx

### 11.2 文档和资源

- **项目仓库**: https://github.com/lumieai/lumieai
- **API 文档**: https://docs.lumieai.com
- **监控面板**: https://monitor.lumieai.com
- **状态页面**: https://status.lumieai.com

### 11.3 更新和维护

- **版本发布**: 每月第一个周五
- **安全更新**: 发现后 24 小时内
- **维护窗口**: 每周日 02:00-04:00 UTC

---

## 📋 12. 部署检查清单

### 12.1 部署前检查

- [ ] 服务器资源充足（CPU、内存、存储）
- [ ] 网络连通性正常
- [ ] 域名和 SSL 证书配置
- [ ] 环境变量完整配置
- [ ] 外部服务 API 密钥有效
- [ ] 数据库备份策略就绪

### 12.2 部署后验证

- [ ] 所有服务正常启动
- [ ] 健康检查端点响应正常
- [ ] 数据库连接和迁移成功
- [ ] 前端页面正常访问
- [ ] API 接口功能正常
- [ ] 区块链交互正常
- [ ] 监控和日志收集正常

### 12.3 上线后监控

- [ ] 系统性能指标正常
- [ ] 错误率在可接受范围
- [ ] 用户访问正常
- [ ] 数据同步正常
- [ ] 备份任务执行正常

---

**文档结束**

> 本文档将随项目更新持续维护，如有问题请及时反馈给开发团队。