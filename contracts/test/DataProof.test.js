const { expect } = require('chai');
const { ethers } = require('hardhat');
const { MerkleTree } = require('merkletreejs');
const crypto = require('crypto');

describe('DataProof Contract', function () {
  let dataProof;
  let owner;
  let addr1;
  let addr2;
  
  // 测试数据
  const testDate = 20241201;
  const testCid = 'QmTestCid123456789';
  const testDataCount = 100;
  const testMetadata = 'Test batch metadata';
  
  // 生成测试Merkle树
  function generateTestMerkleTree(dataArray) {
    const leaves = dataArray.map(data => 
      crypto.createHash('sha256').update(JSON.stringify(data)).digest()
    );
    return new MerkleTree(leaves, crypto.createHash('sha256'));
  }
  
  beforeEach(async function () {
    // 获取测试账户
    [owner, addr1, addr2] = await ethers.getSigners();
    
    // 部署合约
    const DataProof = await ethers.getContractFactory('DataProof');
    dataProof = await DataProof.deploy();
    await dataProof.deployed();
  });
  
  describe('部署和初始化', function () {
    it('应该正确设置合约所有者', async function () {
      expect(await dataProof.owner()).to.equal(owner.address);
    });
    
    it('应该初始化统计数据为0', async function () {
      const stats = await dataProof.getStats();
      expect(stats._totalAnchors).to.equal(0);
      expect(stats._totalBatches).to.equal(0);
      expect(stats._owner).to.equal(owner.address);
    });
    
    it('应该初始化暂停状态为false', async function () {
      expect(await dataProof.paused()).to.equal(false);
    });
  });
  
  describe('所有权管理', function () {
    it('应该允许所有者转移所有权', async function () {
      await expect(dataProof.transferOwnership(addr1.address))
        .to.emit(dataProof, 'OwnershipTransferred')
        .withArgs(owner.address, addr1.address);
      
      expect(await dataProof.owner()).to.equal(addr1.address);
    });
    
    it('应该拒绝非所有者转移所有权', async function () {
      await expect(
        dataProof.connect(addr1).transferOwnership(addr2.address)
      ).to.be.revertedWith('DataProof: caller is not the owner');
    });
    
    it('应该拒绝转移所有权给零地址', async function () {
      await expect(
        dataProof.transferOwnership(ethers.constants.AddressZero)
      ).to.be.revertedWith('DataProof: new owner is the zero address');
    });
  });
  
  describe('每日数据锚定', function () {
    let merkleRoot;
    
    beforeEach(function () {
      // 生成测试数据和Merkle根
      const testData = [
        { userId: 'user1', data: 'health_data_1', timestamp: Date.now() },
        { userId: 'user2', data: 'health_data_2', timestamp: Date.now() },
        { userId: 'user3', data: 'health_data_3', timestamp: Date.now() }
      ];
      const merkleTree = generateTestMerkleTree(testData);
      merkleRoot = '0x' + merkleTree.getRoot().toString('hex');
    });
    
    it('应该成功锚定每日数据', async function () {
      await expect(
        dataProof.anchorDaily(testDate, merkleRoot, testCid, testDataCount)
      ).to.emit(dataProof, 'DailyAnchored')
        .withArgs(testDate, merkleRoot, testCid, testDataCount, owner.address);
      
      // 验证锚定记录
      const anchor = await dataProof.getDailyAnchor(testDate);
      expect(anchor.merkleRoot).to.equal(merkleRoot);
      expect(anchor.cid).to.equal(testCid);
      expect(anchor.dataCount).to.equal(testDataCount);
      expect(anchor.submitter).to.equal(owner.address);
      expect(anchor.exists).to.equal(true);
      
      // 验证统计数据更新
      const stats = await dataProof.getStats();
      expect(stats._totalAnchors).to.equal(1);
    });
    
    it('应该拒绝重复锚定同一日期', async function () {
      // 第一次锚定
      await dataProof.anchorDaily(testDate, merkleRoot, testCid, testDataCount);
      
      // 尝试重复锚定
      const newMerkleRoot = '0x' + crypto.randomBytes(32).toString('hex');
      await expect(
        dataProof.anchorDaily(testDate, newMerkleRoot, testCid, testDataCount)
      ).to.be.revertedWith('DataProof: date already anchored');
    });
    
    it('应该拒绝重复使用相同的Merkle根', async function () {
      // 第一次锚定
      await dataProof.anchorDaily(testDate, merkleRoot, testCid, testDataCount);
      
      // 尝试使用相同Merkle根锚定不同日期
      await expect(
        dataProof.anchorDaily(testDate + 1, merkleRoot, testCid, testDataCount)
      ).to.be.revertedWith('DataProof: merkle root already anchored');
    });
    
    it('应该拒绝无效的Merkle根', async function () {
      await expect(
        dataProof.anchorDaily(testDate, ethers.constants.HashZero, testCid, testDataCount)
      ).to.be.revertedWith('DataProof: invalid merkle root');
    });
    
    it('应该拒绝零数据计数', async function () {
      await expect(
        dataProof.anchorDaily(testDate, merkleRoot, testCid, 0)
      ).to.be.revertedWith('DataProof: data count must be greater than 0');
    });
    
    it('应该拒绝非所有者调用', async function () {
      await expect(
        dataProof.connect(addr1).anchorDaily(testDate, merkleRoot, testCid, testDataCount)
      ).to.be.revertedWith('DataProof: caller is not the owner');
    });
  });
  
  describe('批量数据锚定', function () {
    let batchId;
    let merkleRoot;
    
    beforeEach(function () {
      batchId = '0x' + crypto.randomBytes(32).toString('hex');
      const testData = [
        { userId: 'user1', data: 'batch_data_1', timestamp: Date.now() },
        { userId: 'user2', data: 'batch_data_2', timestamp: Date.now() }
      ];
      const merkleTree = generateTestMerkleTree(testData);
      merkleRoot = '0x' + merkleTree.getRoot().toString('hex');
    });
    
    it('应该成功锚定批量数据', async function () {
      await expect(
        dataProof.anchorBatch(batchId, merkleRoot, testDataCount, testMetadata)
      ).to.emit(dataProof, 'BatchAnchored')
        .withArgs(batchId, merkleRoot, testDataCount, owner.address, testMetadata);
      
      // 验证批量锚定记录
      const batchAnchor = await dataProof.getBatchAnchor(batchId);
      expect(batchAnchor.batchId).to.equal(batchId);
      expect(batchAnchor.merkleRoot).to.equal(merkleRoot);
      expect(batchAnchor.dataCount).to.equal(testDataCount);
      expect(batchAnchor.submitter).to.equal(owner.address);
      expect(batchAnchor.metadata).to.equal(testMetadata);
      expect(batchAnchor.exists).to.equal(true);
      
      // 验证统计数据更新
      const stats = await dataProof.getStats();
      expect(stats._totalBatches).to.equal(1);
    });
    
    it('应该拒绝重复的批次ID', async function () {
      // 第一次锚定
      await dataProof.anchorBatch(batchId, merkleRoot, testDataCount, testMetadata);
      
      // 尝试重复使用批次ID
      const newMerkleRoot = '0x' + crypto.randomBytes(32).toString('hex');
      await expect(
        dataProof.anchorBatch(batchId, newMerkleRoot, testDataCount, testMetadata)
      ).to.be.revertedWith('DataProof: batch id already exists');
    });
    
    it('应该拒绝无效的批次ID', async function () {
      await expect(
        dataProof.anchorBatch(ethers.constants.HashZero, merkleRoot, testDataCount, testMetadata)
      ).to.be.revertedWith('DataProof: invalid batch id');
    });
  });
  
  describe('数据验证和查询', function () {
    let dailyMerkleRoot;
    let batchMerkleRoot;
    let batchId;
    
    beforeEach(async function () {
      // 准备测试数据
      const dailyData = [{ data: 'daily_test' }];
      const batchData = [{ data: 'batch_test' }];
      
      const dailyTree = generateTestMerkleTree(dailyData);
      const batchTree = generateTestMerkleTree(batchData);
      
      dailyMerkleRoot = '0x' + dailyTree.getRoot().toString('hex');
      batchMerkleRoot = '0x' + batchTree.getRoot().toString('hex');
      batchId = '0x' + crypto.randomBytes(32).toString('hex');
      
      // 锚定测试数据
      await dataProof.anchorDaily(testDate, dailyMerkleRoot, testCid, testDataCount);
      await dataProof.anchorBatch(batchId, batchMerkleRoot, testDataCount, testMetadata);
    });
    
    it('应该正确验证已锚定的Merkle根', async function () {
      expect(await dataProof.isRootAnchored(dailyMerkleRoot)).to.equal(true);
      expect(await dataProof.isRootAnchored(batchMerkleRoot)).to.equal(true);
      
      const randomRoot = '0x' + crypto.randomBytes(32).toString('hex');
      expect(await dataProof.isRootAnchored(randomRoot)).to.equal(false);
    });
    
    it('应该返回正确的每日锚定信息', async function () {
      const anchorInfo = await dataProof.getAnchorInfo(dailyMerkleRoot);
      expect(anchorInfo.isAnchored).to.equal(true);
      expect(anchorInfo.anchorType).to.equal(1); // 日期锚定
      expect(anchorInfo.identifier).to.equal(ethers.utils.hexZeroPad(ethers.utils.hexlify(testDate), 32));
    });
    
    it('应该返回正确的批量锚定信息', async function () {
      const anchorInfo = await dataProof.getAnchorInfo(batchMerkleRoot);
      expect(anchorInfo.isAnchored).to.equal(true);
      expect(anchorInfo.anchorType).to.equal(2); // 批量锚定
      expect(anchorInfo.identifier).to.equal(batchId);
    });
    
    it('应该返回未锚定根的正确信息', async function () {
      const randomRoot = '0x' + crypto.randomBytes(32).toString('hex');
      const anchorInfo = await dataProof.getAnchorInfo(randomRoot);
      expect(anchorInfo.isAnchored).to.equal(false);
      expect(anchorInfo.anchorType).to.equal(0);
    });
  });
  
  describe('暂停功能', function () {
    it('应该允许所有者暂停合约', async function () {
      await dataProof.pause();
      expect(await dataProof.paused()).to.equal(true);
    });
    
    it('应该允许所有者恢复合约', async function () {
      await dataProof.pause();
      await dataProof.unpause();
      expect(await dataProof.paused()).to.equal(false);
    });
    
    it('应该拒绝非所有者暂停合约', async function () {
      await expect(
        dataProof.connect(addr1).pause()
      ).to.be.revertedWith('DataProof: caller is not the owner');
    });
  });
  
  describe('综合测试', function () {
    it('应该支持多次锚定操作', async function () {
      const operations = [];
      
      // 执行多次锚定操作
      for (let i = 0; i < 5; i++) {
        const date = testDate + i;
        const data = [{ id: i, data: `test_data_${i}` }];
        const tree = generateTestMerkleTree(data);
        const root = '0x' + tree.getRoot().toString('hex');
        
        await dataProof.anchorDaily(date, root, `cid_${i}`, 10 + i);
        operations.push({ date, root });
      }
      
      // 验证所有操作
      for (const op of operations) {
        expect(await dataProof.isRootAnchored(op.root)).to.equal(true);
        const anchor = await dataProof.getDailyAnchor(op.date);
        expect(anchor.exists).to.equal(true);
      }
      
      // 验证统计数据
      const stats = await dataProof.getStats();
      expect(stats._totalAnchors).to.equal(5);
    });
  });
});