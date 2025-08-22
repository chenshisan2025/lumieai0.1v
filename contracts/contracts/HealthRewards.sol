// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";

/**
 * @title HealthRewards
 * @dev Smart contract for managing health-related rewards in LUM tokens
 * Features:
 * - Task completion rewards
 * - Health milestone rewards
 * - Daily check-in rewards
 * - Referral rewards
 * - Anti-fraud protection
 * - Signature verification
 */
contract HealthRewards is ReentrancyGuard, Ownable, Pausable, EIP712 {
    using SafeERC20 for IERC20;
    using ECDSA for bytes32;
    
    // LUM Token contract
    IERC20 public immutable lumToken;
    
    // Reward types
    enum RewardType {
        TASK_COMPLETION,
        HEALTH_MILESTONE,
        DAILY_CHECKIN,
        REFERRAL,
        SPECIAL_EVENT
    }
    
    // Reward configuration
    struct RewardConfig {
        uint256 amount;
        uint256 dailyLimit;
        uint256 totalLimit;
        bool enabled;
    }
    
    // User reward tracking
    struct UserRewards {
        uint256 totalEarned;
        uint256 dailyEarned;
        uint256 lastClaimDate;
        uint256 consecutiveDays;
        mapping(bytes32 => bool) claimedTasks;
    }
    
    // Mappings
    mapping(RewardType => RewardConfig) public rewardConfigs;
    mapping(address => UserRewards) public userRewards;
    mapping(address => bool) public authorizedSigners;
    mapping(bytes32 => bool) public usedNonces;
    
    // Constants
    uint256 public constant MAX_DAILY_REWARDS = 1000 * 10**18; // 1000 LUM per day
    uint256 public constant CONSECUTIVE_BONUS_THRESHOLD = 7; // 7 days
    uint256 public constant CONSECUTIVE_BONUS_MULTIPLIER = 150; // 1.5x bonus
    
    // Events
    event RewardClaimed(
        address indexed user,
        RewardType indexed rewardType,
        uint256 amount,
        bytes32 taskId
    );
    event RewardConfigUpdated(
        RewardType indexed rewardType,
        uint256 amount,
        uint256 dailyLimit,
        uint256 totalLimit,
        bool enabled
    );
    event SignerUpdated(address indexed signer, bool authorized);
    event EmergencyWithdrawal(address indexed token, uint256 amount);
    
    /**
     * @dev Constructor
     * @param _lumToken LUM token contract address
     */
    constructor(address _lumToken) EIP712("HealthRewards", "1.0.0") Ownable(msg.sender) {
        require(_lumToken != address(0), "Invalid LUM token address");
        lumToken = IERC20(_lumToken);
        
        // Initialize default reward configurations
        _initializeRewardConfigs();
    }
    
    /**
     * @dev Initialize default reward configurations
     */
    function _initializeRewardConfigs() private {
        // Task completion: 10 LUM, 100 LUM daily limit
        rewardConfigs[RewardType.TASK_COMPLETION] = RewardConfig({
            amount: 10 * 10**18,
            dailyLimit: 100 * 10**18,
            totalLimit: 0, // No total limit
            enabled: true
        });
        
        // Health milestone: 50 LUM, 200 LUM daily limit
        rewardConfigs[RewardType.HEALTH_MILESTONE] = RewardConfig({
            amount: 50 * 10**18,
            dailyLimit: 200 * 10**18,
            totalLimit: 0,
            enabled: true
        });
        
        // Daily check-in: 5 LUM, 5 LUM daily limit (once per day)
        rewardConfigs[RewardType.DAILY_CHECKIN] = RewardConfig({
            amount: 5 * 10**18,
            dailyLimit: 5 * 10**18,
            totalLimit: 0,
            enabled: true
        });
        
        // Referral: 25 LUM, 100 LUM daily limit
        rewardConfigs[RewardType.REFERRAL] = RewardConfig({
            amount: 25 * 10**18,
            dailyLimit: 100 * 10**18,
            totalLimit: 0,
            enabled: true
        });
        
        // Special event: 100 LUM, 500 LUM daily limit
        rewardConfigs[RewardType.SPECIAL_EVENT] = RewardConfig({
            amount: 100 * 10**18,
            dailyLimit: 500 * 10**18,
            totalLimit: 0,
            enabled: true
        });
    }
    
    /**
     * @dev Claim reward with signature verification
     * @param rewardType Type of reward to claim
     * @param taskId Unique task identifier
     * @param nonce Unique nonce to prevent replay attacks
     * @param signature Signature from authorized signer
     */
    function claimReward(
        RewardType rewardType,
        bytes32 taskId,
        bytes32 nonce,
        bytes calldata signature
    ) external nonReentrant whenNotPaused {
        require(!usedNonces[nonce], "Nonce already used");
        require(rewardConfigs[rewardType].enabled, "Reward type disabled");
        
        // Verify signature
        bytes32 structHash = keccak256(
            abi.encode(
                keccak256("ClaimReward(address user,uint8 rewardType,bytes32 taskId,bytes32 nonce)"),
                msg.sender,
                uint8(rewardType),
                taskId,
                nonce
            )
        );
        bytes32 hash = _hashTypedDataV4(structHash);
        address signer = hash.recover(signature);
        require(authorizedSigners[signer], "Invalid signature");
        
        // Mark nonce as used
        usedNonces[nonce] = true;
        
        // Check if task already claimed (for non-daily rewards)
        if (rewardType != RewardType.DAILY_CHECKIN) {
            require(!userRewards[msg.sender].claimedTasks[taskId], "Task already claimed");
            userRewards[msg.sender].claimedTasks[taskId] = true;
        }
        
        // Calculate reward amount
        uint256 rewardAmount = _calculateRewardAmount(msg.sender, rewardType);
        require(rewardAmount > 0, "No reward available");
        
        // Update user rewards tracking
        _updateUserRewards(msg.sender, rewardAmount, rewardType);
        
        // Transfer tokens
        lumToken.safeTransfer(msg.sender, rewardAmount);
        
        emit RewardClaimed(msg.sender, rewardType, rewardAmount, taskId);
    }
    
    /**
     * @dev Calculate reward amount with bonuses and limits
     */
    function _calculateRewardAmount(address user, RewardType rewardType) 
        private 
        view 
        returns (uint256) 
    {
        RewardConfig memory config = rewardConfigs[rewardType];
        UserRewards storage userReward = userRewards[user];
        
        // Check daily limit
        if (_isNewDay(userReward.lastClaimDate)) {
            // Reset daily counter for new day
            if (userReward.dailyEarned + config.amount > config.dailyLimit) {
                return config.dailyLimit;
            }
        } else {
            // Same day, check remaining daily limit
            if (userReward.dailyEarned + config.amount > config.dailyLimit) {
                return 0; // Daily limit exceeded
            }
        }
        
        uint256 baseAmount = config.amount;
        
        // Apply consecutive day bonus for daily check-ins
        if (rewardType == RewardType.DAILY_CHECKIN && 
            userReward.consecutiveDays >= CONSECUTIVE_BONUS_THRESHOLD) {
            baseAmount = (baseAmount * CONSECUTIVE_BONUS_MULTIPLIER) / 100;
        }
        
        return baseAmount;
    }
    
    /**
     * @dev Update user rewards tracking
     */
    function _updateUserRewards(address user, uint256 amount, RewardType rewardType) private {
        UserRewards storage userReward = userRewards[user];
        
        // Reset daily counter if new day
        if (_isNewDay(userReward.lastClaimDate)) {
            userReward.dailyEarned = 0;
            
            // Update consecutive days for daily check-ins
            if (rewardType == RewardType.DAILY_CHECKIN) {
                if (_isConsecutiveDay(userReward.lastClaimDate)) {
                    userReward.consecutiveDays++;
                } else {
                    userReward.consecutiveDays = 1;
                }
            }
        }
        
        userReward.totalEarned += amount;
        userReward.dailyEarned += amount;
        userReward.lastClaimDate = block.timestamp;
    }
    
    /**
     * @dev Check if it's a new day
     */
    function _isNewDay(uint256 lastClaimDate) private view returns (bool) {
        return (block.timestamp / 1 days) > (lastClaimDate / 1 days);
    }
    
    /**
     * @dev Check if it's a consecutive day
     */
    function _isConsecutiveDay(uint256 lastClaimDate) private view returns (bool) {
        uint256 daysDiff = (block.timestamp / 1 days) - (lastClaimDate / 1 days);
        return daysDiff == 1;
    }
    
    /**
     * @dev Update reward configuration (only owner)
     */
    function updateRewardConfig(
        RewardType rewardType,
        uint256 amount,
        uint256 dailyLimit,
        uint256 totalLimit,
        bool enabled
    ) external onlyOwner {
        require(amount > 0, "Amount must be greater than 0");
        require(dailyLimit >= amount, "Daily limit must be >= amount");
        
        rewardConfigs[rewardType] = RewardConfig({
            amount: amount,
            dailyLimit: dailyLimit,
            totalLimit: totalLimit,
            enabled: enabled
        });
        
        emit RewardConfigUpdated(rewardType, amount, dailyLimit, totalLimit, enabled);
    }
    
    /**
     * @dev Update authorized signer (only owner)
     */
    function updateSigner(address signer, bool authorized) external onlyOwner {
        require(signer != address(0), "Invalid signer address");
        authorizedSigners[signer] = authorized;
        emit SignerUpdated(signer, authorized);
    }
    
    /**
     * @dev Pause contract (only owner)
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @dev Unpause contract (only owner)
     */
    function unpause() external onlyOwner {
        _unpause();
    }
    
    /**
     * @dev Emergency withdrawal (only owner)
     */
    function emergencyWithdraw(address token, uint256 amount) 
        external 
        onlyOwner 
        nonReentrant 
    {
        if (token == address(0)) {
            payable(owner()).transfer(amount);
        } else {
            IERC20(token).safeTransfer(owner(), amount);
        }
        emit EmergencyWithdrawal(token, amount);
    }
    
    /**
     * @dev Get user reward info
     */
    function getUserRewardInfo(address user) 
        external 
        view 
        returns (
            uint256 totalEarned,
            uint256 dailyEarned,
            uint256 lastClaimDate,
            uint256 consecutiveDays
        ) 
    {
        UserRewards storage userReward = userRewards[user];
        return (
            userReward.totalEarned,
            userReward.dailyEarned,
            userReward.lastClaimDate,
            userReward.consecutiveDays
        );
    }
    
    /**
     * @dev Check if task is claimed
     */
    function isTaskClaimed(address user, bytes32 taskId) external view returns (bool) {
        return userRewards[user].claimedTasks[taskId];
    }
    
    /**
     * @dev Get contract version
     */
    function version() external pure returns (string memory) {
        return "1.0.0";
    }
}