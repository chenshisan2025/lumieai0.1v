# TRAE SOLO 对话脚本（一步一步）
> 按顺序把每段“用户输入”粘贴给 TRAE。

[Step 0] 新建项目（骨架 + CI/CD）
用户输入：创建名为 LUMIEAI 的跨端应用……（详见你收到的方案）；只支持 LUM（BSC）；生成项目骨架与 README，加入 CI。

[Step 1] 导入 PRD 与品牌
用户输入：导入 PRD；创建主题（#1E5BFF/#8E5CFF/#12D6C5/#0B1220；Inter/Noto Sans SC）；生成组件库（卡片/按钮/折线/进度环）；导入 logo。

[Step 2] 国际化
用户输入：启用 Flutter i18n（ARB）；导入 en.arb/zh.arb；设置页提供语言切换。

[Step 3] 导航与页面
用户输入：底部导航：数据/洞见/任务/奖励/商城/我的；生成路由与占位；首页今日概览+趋势图。

[Step 4] 健康数据
用户输入：集成 HealthKit/Health Connect；读取步数、心率、HRV、睡眠；首次授权/定时同步/错误处理。

[Step 5] 洞见（建议）
用户输入：“洞见”页对话式建议；本地规则占位 + /ai/coach/plan 接口；解释卡 + 反馈按钮。

[Step 6] 任务 + PoC
用户输入：任务中心（健康/社交/邀请）；PoC 连击（近7天）；任务卡含奖励与截止时间。

[Step 7] 钱包 + BSC
用户输入：WalletConnect v2；显示 LUM 余额/历史；BSC Testnet；读余额与一笔测试交易。

[Step 8] 上链确权 + IPFS
用户输入：后端 /proofs/daily/commit、/proofs/batch/anchor；合约 DataProof；前端显示锚定状态与链接。

[Step 9] 周度奖励（Merkle）
用户输入：生成 weekly merkle.json；合约 RewardDistributor；前端 claim。

[Step 10] NFT 勋章
用户输入：合约 BadgeNFT；后台条件达成自动 mint；前端“勋章墙”。

[Step 11] 商城（仅 LUM）
用户输入：会员/硬件兑换；下单仅 LUM 扣款；订单状态。

[Step 12] 管理后台
用户输入：仪表盘/用户/锚定记录/任务与奖励/公告/报告/系统设置；对齐后端 API。

[Step 13] 打包发布
用户输入：CI 打包 Android AAB/iOS IPA（TestFlight）；后端/后台 Docker 化；.env.sample。