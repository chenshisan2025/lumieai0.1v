// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title DataProof
 * @dev 数据存证智能合约，支持批量锚定和验证功能
 */
contract DataProof {
    address public owner;
    uint256 public totalAnchors;
    uint256 public totalBatches;
    
    // 锚定记录结构
    struct Anchor {
        bytes32 merkleRoot;     // Merkle树根
        string cid;             // IPFS CID（可选）
        uint256 blockNumber;    // 区块号
        uint256 timestamp;      // 时间戳
        uint256 dataCount;      // 数据条数
        address submitter;      // 提交者
        bool exists;            // 是否存在
    }
    
    // 批量锚定记录结构
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
    
    // 存储映射
    mapping(uint256 => Anchor) public dailyAnchors;           // 日期 => 锚定记录
    mapping(bytes32 => BatchAnchor) public batchAnchors;      // 批次ID => 批量锚定记录
    mapping(bytes32 => bool) public anchoredRoots;            // Merkle根 => 是否已锚定
    mapping(bytes32 => uint256) public rootToDate;            // Merkle根 => 日期
    mapping(bytes32 => bytes32) public rootToBatch;           // Merkle根 => 批次ID
    
    // 事件定义
    event DailyAnchored(
        uint256 indexed date,
        bytes32 indexed merkleRoot,
        string cid,
        uint256 dataCount,
        address indexed submitter
    );
    
    event BatchAnchored(
        bytes32 indexed batchId,
        bytes32 indexed merkleRoot,
        uint256 dataCount,
        address indexed submitter,
        string metadata
    );
    
    event OwnershipTransferred(
        address indexed previousOwner,
        address indexed newOwner
    );
    
    // 修饰符
    modifier onlyOwner() {
        require(msg.sender == owner, "DataProof: caller is not the owner");
        _;
    }
    
    modifier validMerkleRoot(bytes32 _merkleRoot) {
        require(_merkleRoot != bytes32(0), "DataProof: invalid merkle root");
        _;
    }
    
    modifier notAlreadyAnchored(bytes32 _merkleRoot) {
        require(!anchoredRoots[_merkleRoot], "DataProof: merkle root already anchored");
        _;
    }
    
    /**
     * @dev 构造函数
     */
    constructor() {
        owner = msg.sender;
        totalAnchors = 0;
        totalBatches = 0;
        emit OwnershipTransferred(address(0), msg.sender);
    }
    
    /**
     * @dev 转移所有权
     * @param _newOwner 新所有者地址
     */
    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "DataProof: new owner is the zero address");
        emit OwnershipTransferred(owner, _newOwner);
        owner = _newOwner;
    }
    
    /**
     * @dev 每日数据锚定
     * @param _date 日期（YYYYMMDD格式）
     * @param _merkleRoot Merkle树根
     * @param _cid IPFS CID
     * @param _dataCount 数据条数
     */
    function anchorDaily(
        uint256 _date,
        bytes32 _merkleRoot,
        string calldata _cid,
        uint256 _dataCount
    ) external onlyOwner validMerkleRoot(_merkleRoot) notAlreadyAnchored(_merkleRoot) {
        require(dailyAnchors[_date].timestamp == 0, "DataProof: date already anchored");
        require(_dataCount > 0, "DataProof: data count must be greater than 0");
        
        // 创建锚定记录
        dailyAnchors[_date] = Anchor({
            merkleRoot: _merkleRoot,
            cid: _cid,
            blockNumber: block.number,
            timestamp: block.timestamp,
            dataCount: _dataCount,
            submitter: msg.sender,
            exists: true
        });
        
        // 更新映射
        anchoredRoots[_merkleRoot] = true;
        rootToDate[_merkleRoot] = _date;
        totalAnchors++;
        
        emit DailyAnchored(_date, _merkleRoot, _cid, _dataCount, msg.sender);
    }
    
    /**
     * @dev 批量数据锚定
     * @param _batchId 批次ID
     * @param _merkleRoot Merkle树根
     * @param _dataCount 数据条数
     * @param _metadata 元数据
     */
    function anchorBatch(
        bytes32 _batchId,
        bytes32 _merkleRoot,
        uint256 _dataCount,
        string calldata _metadata
    ) external onlyOwner validMerkleRoot(_merkleRoot) notAlreadyAnchored(_merkleRoot) {
        require(_batchId != bytes32(0), "DataProof: invalid batch id");
        require(!batchAnchors[_batchId].exists, "DataProof: batch id already exists");
        require(_dataCount > 0, "DataProof: data count must be greater than 0");
        
        // 创建批量锚定记录
        batchAnchors[_batchId] = BatchAnchor({
            batchId: _batchId,
            merkleRoot: _merkleRoot,
            blockNumber: block.number,
            timestamp: block.timestamp,
            dataCount: _dataCount,
            submitter: msg.sender,
            metadata: _metadata,
            exists: true
        });
        
        // 更新映射
        anchoredRoots[_merkleRoot] = true;
        rootToBatch[_merkleRoot] = _batchId;
        totalBatches++;
        
        emit BatchAnchored(_batchId, _merkleRoot, _dataCount, msg.sender, _metadata);
    }
    
    /**
     * @dev 获取日期锚定记录
     * @param _date 日期
     * @return 锚定记录
     */
    function getDailyAnchor(uint256 _date) external view returns (Anchor memory) {
        return dailyAnchors[_date];
    }
    
    /**
     * @dev 获取批量锚定记录
     * @param _batchId 批次ID
     * @return 批量锚定记录
     */
    function getBatchAnchor(bytes32 _batchId) external view returns (BatchAnchor memory) {
        return batchAnchors[_batchId];
    }
    
    /**
     * @dev 验证Merkle根是否已锚定
     * @param _merkleRoot Merkle树根
     * @return 是否已锚定
     */
    function isRootAnchored(bytes32 _merkleRoot) external view returns (bool) {
        return anchoredRoots[_merkleRoot];
    }
    
    /**
     * @dev 根据Merkle根获取锚定信息
     * @param _merkleRoot Merkle树根
     * @return isAnchored 是否已锚定
     * @return anchorType 锚定类型（0=未锚定，1=日期锚定，2=批量锚定）
     * @return identifier 标识符（日期或批次ID）
     * @return blockNumber 区块号
     * @return timestamp 时间戳
     */
    function getAnchorInfo(bytes32 _merkleRoot) external view returns (
        bool isAnchored,
        uint8 anchorType,
        bytes32 identifier,
        uint256 blockNumber,
        uint256 timestamp
    ) {
        if (!anchoredRoots[_merkleRoot]) {
            return (false, 0, bytes32(0), 0, 0);
        }
        
        // 检查是否为日期锚定
        uint256 date = rootToDate[_merkleRoot];
        if (date != 0 && dailyAnchors[date].exists) {
            Anchor memory anchor = dailyAnchors[date];
            return (true, 1, bytes32(date), anchor.blockNumber, anchor.timestamp);
        }
        
        // 检查是否为批量锚定
        bytes32 batchId = rootToBatch[_merkleRoot];
        if (batchId != bytes32(0) && batchAnchors[batchId].exists) {
            BatchAnchor memory batchAnchor = batchAnchors[batchId];
            return (true, 2, batchId, batchAnchor.blockNumber, batchAnchor.timestamp);
        }
        
        return (false, 0, bytes32(0), 0, 0);
    }
    
    /**
     * @dev 获取合约统计信息
     * @return _totalAnchors 总锚定数
     * @return _totalBatches 总批次数
     * @return _owner 所有者地址
     */
    function getStats() external view returns (
        uint256 _totalAnchors,
        uint256 _totalBatches,
        address _owner
    ) {
        return (totalAnchors, totalBatches, owner);
    }
    
    /**
     * @dev 紧急暂停功能（预留）
     */
    bool public paused = false;
    
    modifier whenNotPaused() {
        require(!paused, "DataProof: contract is paused");
        _;
    }
    
    function pause() external onlyOwner {
        paused = true;
    }
    
    function unpause() external onlyOwner {
        paused = false;
    }
}