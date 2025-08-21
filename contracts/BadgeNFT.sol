// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC721} from "openzeppelin-contracts/contracts/token/ERC721/ERC721.sol";
import {ERC721URIStorage} from "openzeppelin-contracts/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import {Ownable} from "openzeppelin-contracts/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "openzeppelin-contracts/contracts/utils/ReentrancyGuard.sol";

/**
 * @title BadgeNFT
 * @dev NFT勋章系统智能合约，支持勋章类型管理、防重复铸造、元数据管理
 */
contract BadgeNFT is ERC721, ERC721URIStorage, Ownable, ReentrancyGuard {
    // 勋章类型结构体
    struct BadgeType {
        uint256 id;
        string name;
        string description;
        string imageURI;
        bool isActive;
        uint256 totalSupply;
        uint256 maxSupply; // 0表示无限制
        uint256 createdAt;
    }

    // 用户勋章记录
    struct UserBadge {
        uint256 tokenId;
        uint256 badgeTypeId;
        address owner;
        uint256 mintedAt;
        string metadata;
    }

    // 状态变量
    uint256 public nextTokenId = 1;
    uint256 public nextBadgeTypeId = 1;
    string public baseTokenURI;
    
    // 映射
    mapping(uint256 => BadgeType) public badgeTypes; // badgeTypeId => BadgeType
    mapping(uint256 => uint256) public tokenToBadgeType; // tokenId => badgeTypeId
    mapping(address => mapping(uint256 => bool)) public userHasBadgeType; // user => badgeTypeId => hasBadge
    mapping(address => uint256[]) public userBadges; // user => tokenIds
    mapping(uint256 => uint256[]) public badgeTypeTokens; // badgeTypeId => tokenIds
    
    // 授权的铸造者
    mapping(address => bool) public authorizedMinters;
    
    // 事件
    event BadgeTypeCreated(uint256 indexed badgeTypeId, string name, string description);
    event BadgeMinted(uint256 indexed tokenId, uint256 indexed badgeTypeId, address indexed to);
    event BadgeTypeUpdated(uint256 indexed badgeTypeId, string name, string description);
    event MinterAuthorized(address indexed minter, bool authorized);
    event BaseURIUpdated(string newBaseURI);

    // 修饰符
    modifier onlyAuthorizedMinter() {
        require(authorizedMinters[msg.sender] || msg.sender == owner(), "Not authorized to mint");
        _;
    }

    modifier badgeTypeExists(uint256 badgeTypeId) {
        require(badgeTypes[badgeTypeId].id != 0, "Badge type does not exist");
        _;
    }

    constructor(
        string memory name,
        string memory symbol,
        string memory baseURI
    ) ERC721(name, symbol) Ownable(msg.sender) {
        baseTokenURI = baseURI;
    }

    /**
     * @dev 创建新的勋章类型
     */
    function createBadgeType(
        string memory name,
        string memory description,
        string memory imageURI,
        uint256 maxSupply
    ) external onlyOwner returns (uint256) {
        uint256 badgeTypeId = nextBadgeTypeId++;
        
        badgeTypes[badgeTypeId] = BadgeType({
            id: badgeTypeId,
            name: name,
            description: description,
            imageURI: imageURI,
            isActive: true,
            totalSupply: 0,
            maxSupply: maxSupply,
            createdAt: block.timestamp
        });
        
        emit BadgeTypeCreated(badgeTypeId, name, description);
        return badgeTypeId;
    }

    /**
     * @dev 更新勋章类型信息
     */
    function updateBadgeType(
        uint256 badgeTypeId,
        string memory name,
        string memory description,
        string memory imageURI,
        bool isActive
    ) external onlyOwner badgeTypeExists(badgeTypeId) {
        BadgeType storage badgeType = badgeTypes[badgeTypeId];
        badgeType.name = name;
        badgeType.description = description;
        badgeType.imageURI = imageURI;
        badgeType.isActive = isActive;
        
        emit BadgeTypeUpdated(badgeTypeId, name, description);
    }

    /**
     * @dev 铸造勋章给指定用户
     */
    function mintBadge(
        address to,
        uint256 badgeTypeId,
        string memory metadata
    ) external onlyAuthorizedMinter nonReentrant badgeTypeExists(badgeTypeId) returns (uint256) {
        require(to != address(0), "Cannot mint to zero address");
        
        BadgeType storage badgeType = badgeTypes[badgeTypeId];
        require(badgeType.isActive, "Badge type is not active");
        require(!userHasBadgeType[to][badgeTypeId], "User already has this badge type");
        
        // 检查供应量限制
        if (badgeType.maxSupply > 0) {
            require(badgeType.totalSupply < badgeType.maxSupply, "Badge type max supply reached");
        }
        
        uint256 tokenId = nextTokenId++;
        
        // 铸造NFT
        _mint(to, tokenId);
        
        // 设置元数据URI
        if (bytes(metadata).length > 0) {
            _setTokenURI(tokenId, metadata);
        }
        
        // 更新映射
        tokenToBadgeType[tokenId] = badgeTypeId;
        userHasBadgeType[to][badgeTypeId] = true;
        userBadges[to].push(tokenId);
        badgeTypeTokens[badgeTypeId].push(tokenId);
        
        // 更新供应量
        badgeType.totalSupply++;
        
        emit BadgeMinted(tokenId, badgeTypeId, to);
        return tokenId;
    }

    /**
     * @dev 批量铸造勋章
     */
    function batchMintBadge(
        address[] memory recipients,
        uint256 badgeTypeId,
        string memory metadata
    ) external onlyAuthorizedMinter nonReentrant badgeTypeExists(badgeTypeId) {
        require(recipients.length > 0, "No recipients provided");
        
        BadgeType storage badgeType = badgeTypes[badgeTypeId];
        require(badgeType.isActive, "Badge type is not active");
        
        // 检查供应量限制
        if (badgeType.maxSupply > 0) {
            require(
                badgeType.totalSupply + recipients.length <= badgeType.maxSupply,
                "Batch mint would exceed max supply"
            );
        }
        
        for (uint256 i = 0; i < recipients.length; i++) {
            address to = recipients[i];
            require(to != address(0), "Cannot mint to zero address");
            
            if (!userHasBadgeType[to][badgeTypeId]) {
                uint256 tokenId = nextTokenId++;
                
                _mint(to, tokenId);
                
                if (bytes(metadata).length > 0) {
                    _setTokenURI(tokenId, metadata);
                }
                
                tokenToBadgeType[tokenId] = badgeTypeId;
                userHasBadgeType[to][badgeTypeId] = true;
                userBadges[to].push(tokenId);
                badgeTypeTokens[badgeTypeId].push(tokenId);
                
                badgeType.totalSupply++;
                
                emit BadgeMinted(tokenId, badgeTypeId, to);
            }
        }
    }

    /**
     * @dev 设置授权铸造者
     */
    function setAuthorizedMinter(address minter, bool authorized) external onlyOwner {
        authorizedMinters[minter] = authorized;
        emit MinterAuthorized(minter, authorized);
    }

    /**
     * @dev 设置基础URI
     */
    function setBaseURI(string memory newBaseURI) external onlyOwner {
        baseTokenURI = newBaseURI;
        emit BaseURIUpdated(newBaseURI);
    }

    /**
     * @dev 获取用户的所有勋章
     */
    function getUserBadges(address user) external view returns (uint256[] memory) {
        return userBadges[user];
    }

    /**
     * @dev 获取用户勋章详情
     */
    function getUserBadgeDetails(address user) external view returns (UserBadge[] memory) {
        uint256[] memory tokenIds = userBadges[user];
        UserBadge[] memory badges = new UserBadge[](tokenIds.length);
        
        for (uint256 i = 0; i < tokenIds.length; i++) {
            uint256 tokenId = tokenIds[i];
            uint256 badgeTypeId = tokenToBadgeType[tokenId];
            
            badges[i] = UserBadge({
                tokenId: tokenId,
                badgeTypeId: badgeTypeId,
                owner: user,
                mintedAt: block.timestamp, // 简化处理，实际应该存储铸造时间
                metadata: tokenURI(tokenId)
            });
        }
        
        return badges;
    }

    /**
     * @dev 获取勋章类型的所有token
     */
    function getBadgeTypeTokens(uint256 badgeTypeId) external view returns (uint256[] memory) {
        return badgeTypeTokens[badgeTypeId];
    }

    /**
     * @dev 检查用户是否拥有特定类型的勋章
     */
    function hasUserBadgeType(address user, uint256 badgeTypeId) external view returns (bool) {
        return userHasBadgeType[user][badgeTypeId];
    }

    /**
     * @dev 获取勋章类型信息
     */
    function getBadgeType(uint256 badgeTypeId) external view returns (BadgeType memory) {
        require(badgeTypes[badgeTypeId].id != 0, "Badge type does not exist");
        return badgeTypes[badgeTypeId];
    }

    /**
     * @dev 获取所有勋章类型
     */
    function getAllBadgeTypes() external view returns (BadgeType[] memory) {
        BadgeType[] memory allTypes = new BadgeType[](nextBadgeTypeId - 1);
        uint256 count = 0;
        
        for (uint256 i = 1; i < nextBadgeTypeId; i++) {
            if (badgeTypes[i].id != 0) {
                allTypes[count] = badgeTypes[i];
                count++;
            }
        }
        
        // 调整数组大小
        BadgeType[] memory result = new BadgeType[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = allTypes[i];
        }
        
        return result;
    }

    /**
     * @dev 重写基础URI函数
     */
    function _baseURI() internal view override returns (string memory) {
        return baseTokenURI;
    }

    /**
     * @dev 重写tokenURI函数以支持URIStorage
     */
    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    /**
     * @dev 重写supportsInterface函数
     */
    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    /**
     * @dev 禁止转移勋章NFT（勋章应该是不可转移的）
     */
    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        address from = _ownerOf(tokenId);
        
        // 允许铸造（from == address(0)）和销毁（to == address(0)）
        if (from != address(0) && to != address(0)) {
            revert("Badge NFTs are non-transferable");
        }
        
        return super._update(to, tokenId, auth);
    }
}