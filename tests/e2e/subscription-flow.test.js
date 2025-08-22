const { expect } = require('chai');
const { ethers } = require('hardhat');
const { loadFixture } = require('@nomicfoundation/hardhat-network-helpers');
const { anyValue } = require('@nomicfoundation/hardhat-chai-matchers/withArgs');

/**
 * E2E测试：模拟完整的BNB订阅支付流程
 * 测试从连接钱包到完成订阅支付的完整用户体验
 */
describe('E2E: BNB Subscription Flow', function () {
  // 测试超时设置为30秒
  this.timeout(30000);

  async function deploySubscriptionFixture() {
    const [owner, user1, user2] = await ethers.getSigners();

    // 部署SubscriptionManager合约
    const SubscriptionManager = await ethers.getContractFactory('SubscriptionManager');
    const subscriptionManager = await SubscriptionManager.deploy();
    await subscriptionManager.waitForDeployment();

    // 创建测试订阅计划
    const planPrice = ethers.parseEther('0.01'); // 0.01 BNB
    const planDuration = 30 * 24 * 60 * 60; // 30天
    
    await subscriptionManager.createPlan(
      planPrice,
      30, // 30天
      true, // 激活状态
      "Basic Plan" // 计划名称
    );
    
    return {
      subscriptionManager,
      owner,
      user1,
      user2,
      planPrice,
      planDuration
    };
  }

  describe('完整订阅流程测试', function () {
    it('应该成功完成从连接钱包到订阅支付的完整流程', async function () {
      const { subscriptionManager, user1, planPrice } = await loadFixture(deploySubscriptionFixture);
      
      // 步骤1: 模拟用户连接钱包（检查余额）
      const userBalance = await ethers.provider.getBalance(user1.address);
      expect(userBalance).to.be.gt(planPrice, '用户BNB余额不足');
      
      // 步骤2: 检查订阅计划信息
        const planInfo = await subscriptionManager.getPlan(1);
        expect(planInfo.priceWei).to.equal(planPrice);
        expect(planInfo.active).to.be.true;
        
        // 步骤3: 检查用户当前订阅状态（应该未订阅）
        const isSubscribed = await subscriptionManager.isActive(user1.address);
        expect(isSubscribed).to.be.false;
        
        // 步骤4: 执行订阅购买
        const tx = await subscriptionManager.connect(user1).purchase(1, {
          value: planPrice
        });
      
      // 步骤5: 等待交易确认
      const receipt = await tx.wait();
      expect(receipt.status).to.equal(1, '交易应该成功');
      
      // 步骤6: 验证订阅状态更新
      const isNowSubscribed = await subscriptionManager.isActive(user1.address);
      expect(isNowSubscribed).to.be.true;
      
      // 步骤7: 检查订阅到期时间
      const expiryTime = await subscriptionManager.subscriptionUntil(user1.address);
      const currentTime = Math.floor(Date.now() / 1000);
      const expectedExpiry = currentTime + (30 * 24 * 60 * 60); // 30天后
      
      // 允许5秒的时间差
      expect(expiryTime).to.be.closeTo(expectedExpiry, 5);
      
      // 步骤8: 验证合约余额增加
      const contractBalance = await ethers.provider.getBalance(subscriptionManager.target);
      expect(contractBalance).to.equal(planPrice);
    });

    it('应该正确处理订阅延长', async function () {
      const { subscriptionManager, user1, planPrice, planDuration } = await loadFixture(deploySubscriptionFixture);
      
      // 首次订阅
      await subscriptionManager.connect(user1).purchase(1, {
        value: planPrice
      });
      
      const firstExpiry = await subscriptionManager.subscriptionUntil(user1.address);
      
      // 等待1秒确保时间差异
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 延长订阅
      await subscriptionManager.connect(user1).purchase(1, {
        value: planPrice
      });
      
      const secondExpiry = await subscriptionManager.subscriptionUntil(user1.address);
      
      // 验证订阅时间延长了30天
      expect(secondExpiry - firstExpiry).to.be.closeTo(planDuration, 5);
    });

    it('应该正确处理支付金额错误', async function () {
      const { subscriptionManager, user1, planPrice } = await loadFixture(deploySubscriptionFixture);
      
      // 支付金额不足
      await expect(
        subscriptionManager.connect(user1).purchase(1, {
          value: planPrice - ethers.parseEther('0.001')
        })
      ).to.be.revertedWith('Incorrect payment amount');
      
      // 支付金额过多
      await expect(
        subscriptionManager.connect(user1).purchase(1, {
          value: planPrice + ethers.parseEther('0.001')
        })
      ).to.be.revertedWith('Incorrect payment amount');
    });

    it('应该正确处理非活跃计划', async function () {
      const { subscriptionManager, owner, user1, planPrice } = await loadFixture(deploySubscriptionFixture);
      
      // 禁用计划
      await subscriptionManager.connect(owner).setPlan(1, planPrice, 30, false);
      
      // 尝试订阅非活跃计划
      await expect(
        subscriptionManager.connect(user1).purchase(1, {
          value: planPrice
        })
      ).to.be.revertedWith('Plan is not active');
    });
  });

  describe('暂停功能测试', function () {
    it('应该在合约暂停时阻止新订阅', async function () {
      const { subscriptionManager, owner, user1, planPrice } = await loadFixture(deploySubscriptionFixture);
      
      // 暂停合约
      await subscriptionManager.connect(owner).pause();
      
      // 尝试订阅（应该失败）
      await expect(
        subscriptionManager.connect(user1).purchase(1, {
          value: planPrice
        })
      ).to.be.revertedWithCustomError(subscriptionManager, 'EnforcedPause');
      
      // 恢复合约
      await subscriptionManager.connect(owner).unpause();
      
      // 现在应该可以订阅
      await expect(
        subscriptionManager.connect(user1).purchase(1, {
          value: planPrice
        })
      ).to.not.be.reverted;
    });
  });

  describe('多用户并发测试', function () {
    it('应该支持多个用户同时订阅', async function () {
      const { subscriptionManager, user1, user2, planPrice } = await loadFixture(deploySubscriptionFixture);
      
      // 两个用户同时订阅
      const tx1 = subscriptionManager.connect(user1).purchase(1, {
        value: planPrice
      });
      
      const tx2 = subscriptionManager.connect(user2).purchase(1, {
        value: planPrice
      });
      
      // 等待两个交易都完成
      await Promise.all([tx1, tx2]);
      
      // 验证两个用户都有活跃订阅
      expect(await subscriptionManager.isActive(user1.address)).to.be.true;
      expect(await subscriptionManager.isActive(user2.address)).to.be.true;
      
      // 验证合约余额
      const contractBalance = await ethers.provider.getBalance(subscriptionManager.target);
      expect(contractBalance).to.equal(planPrice * 2n);
    });
  });

  describe('Gas费用测试', function () {
    it('应该在合理的Gas限制内完成订阅', async function () {
      const { subscriptionManager, user1, planPrice } = await loadFixture(deploySubscriptionFixture);
      
      // 估算Gas费用
      const gasEstimate = await subscriptionManager.connect(user1).purchase.estimateGas(1, {
        value: planPrice
      });
      
      // Gas费用应该在合理范围内（小于150,000）
      expect(gasEstimate).to.be.lt(150000);
      
      // 执行交易并检查实际Gas使用量
      const tx = await subscriptionManager.connect(user1).purchase(1, {
        value: planPrice,
        gasLimit: gasEstimate
      });
      
      const receipt = await tx.wait();
      expect(receipt.gasUsed).to.be.lte(gasEstimate);
    });
  });

  describe('事件发射测试', function () {
    it('应该正确发射SubscriptionPurchased事件', async function () {
      const { subscriptionManager, user1, planPrice, planDuration } = await loadFixture(deploySubscriptionFixture);
      
      // 监听事件
      await expect(
        subscriptionManager.connect(user1).purchase(1, {
          value: planPrice
        })
      ).to.emit(subscriptionManager, 'SubscriptionPurchased')
       .withArgs(user1.address, 1, anyValue, planPrice);
    });
  });
});