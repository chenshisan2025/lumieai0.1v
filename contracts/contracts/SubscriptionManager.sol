// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title SubscriptionManager
 * @dev Smart contract for managing BNB-based subscription plans
 * Features:
 * - Multiple subscription plans
 * - BNB payment processing
 * - Subscription status tracking
 * - Owner controls and emergency functions
 */
contract SubscriptionManager is Ownable, Pausable, ReentrancyGuard {
    
    // Subscription plan structure
    struct Plan {
        uint256 priceWei;     // Price in wei (BNB)
        uint256 periodDays;   // Subscription period in days
        bool active;          // Whether plan is active
        string name;          // Plan name
    }
    
    // User subscription structure
    struct Subscription {
        uint256 planId;       // Plan ID
        uint256 expiryTime;   // Expiry timestamp
        bool active;          // Whether subscription is active
    }
    
    // State variables
    mapping(uint256 => Plan) public plans;
    mapping(address => Subscription) public subscriptions;
    uint256 public nextPlanId;
    uint256 public totalRevenue;
    
    // Events
    event PlanCreated(uint256 indexed planId, uint256 priceWei, uint256 periodDays, string name);
    event PlanUpdated(uint256 indexed planId, uint256 priceWei, uint256 periodDays, bool active);
    event SubscriptionPurchased(address indexed user, uint256 indexed planId, uint256 expiryTime, uint256 amount);
    event SubscriptionExtended(address indexed user, uint256 newExpiryTime);
    event FundsWithdrawn(address indexed owner, uint256 amount);
    
    constructor() Ownable(msg.sender) {
        nextPlanId = 1;
    }
    
    /**
     * @dev Create a new subscription plan
     * @param priceWei Price in wei (BNB)
     * @param periodDays Subscription period in days
     * @param active Whether plan is active
     * @param name Plan name
     */
    function createPlan(
        uint256 priceWei,
        uint256 periodDays,
        bool active,
        string memory name
    ) external onlyOwner {
        require(priceWei > 0, "Price must be greater than 0");
        require(periodDays > 0, "Period must be greater than 0");
        
        plans[nextPlanId] = Plan({
            priceWei: priceWei,
            periodDays: periodDays,
            active: active,
            name: name
        });
        
        emit PlanCreated(nextPlanId, priceWei, periodDays, name);
        nextPlanId++;
    }
    
    /**
     * @dev Set plan configuration (for existing plans)
     * @param planId Plan ID to update
     * @param priceWei New price in wei
     * @param periodDays New period in days
     * @param active New active status
     */
    function setPlan(
        uint256 planId,
        uint256 priceWei,
        uint256 periodDays,
        bool active
    ) external onlyOwner {
        require(planId > 0 && planId < nextPlanId, "Invalid plan ID");
        require(priceWei > 0, "Price must be greater than 0");
        require(periodDays > 0, "Period must be greater than 0");
        
        plans[planId].priceWei = priceWei;
        plans[planId].periodDays = periodDays;
        plans[planId].active = active;
        
        emit PlanUpdated(planId, priceWei, periodDays, active);
    }
    
    /**
     * @dev Purchase a subscription
     * @param planId Plan ID to purchase
     */
    function purchase(uint256 planId) external payable whenNotPaused nonReentrant {
        require(planId > 0 && planId < nextPlanId, "Invalid plan ID");
        
        Plan memory plan = plans[planId];
        require(plan.active, "Plan is not active");
        require(msg.value == plan.priceWei, "Incorrect payment amount");
        
        Subscription storage userSub = subscriptions[msg.sender];
        
        // Calculate new expiry time
        uint256 newExpiryTime;
        if (userSub.active && userSub.expiryTime > block.timestamp) {
            // Extend existing subscription
            newExpiryTime = userSub.expiryTime + (plan.periodDays * 1 days);
            emit SubscriptionExtended(msg.sender, newExpiryTime);
        } else {
            // New subscription
            newExpiryTime = block.timestamp + (plan.periodDays * 1 days);
        }
        
        // Update subscription
        userSub.planId = planId;
        userSub.expiryTime = newExpiryTime;
        userSub.active = true;
        
        // Update revenue
        totalRevenue += msg.value;
        
        emit SubscriptionPurchased(msg.sender, planId, newExpiryTime, msg.value);
    }
    
    /**
     * @dev Check if user has active subscription
     * @param user User address to check
     * @return bool Whether user has active subscription
     */
    function isActive(address user) external view returns (bool) {
        Subscription memory userSub = subscriptions[user];
        return userSub.active && userSub.expiryTime > block.timestamp;
    }
    
    /**
     * @dev Get user subscription expiry time
     * @param user User address to check
     * @return uint256 Subscription expiry timestamp
     */
    function subscriptionUntil(address user) external view returns (uint256) {
        return subscriptions[user].expiryTime;
    }
    
    /**
     * @dev Get user subscription details
     * @param user User address to check
     * @return planId Plan ID
     * @return expiryTime Expiry timestamp
     * @return active Whether subscription is active
     */
    function getSubscription(address user) external view returns (
        uint256 planId,
        uint256 expiryTime,
        bool active
    ) {
        Subscription memory userSub = subscriptions[user];
        return (
            userSub.planId,
            userSub.expiryTime,
            userSub.active && userSub.expiryTime > block.timestamp
        );
    }
    
    /**
     * @dev Get plan details
     * @param planId Plan ID to query
     * @return priceWei Price in wei
     * @return periodDays Period in days
     * @return active Whether plan is active
     * @return name Plan name
     */
    function getPlan(uint256 planId) external view returns (
        uint256 priceWei,
        uint256 periodDays,
        bool active,
        string memory name
    ) {
        require(planId > 0 && planId < nextPlanId, "Invalid plan ID");
        Plan memory plan = plans[planId];
        return (plan.priceWei, plan.periodDays, plan.active, plan.name);
    }
    
    /**
     * @dev Withdraw contract balance to owner
     */
    function withdraw() external onlyOwner whenNotPaused nonReentrant {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");
        
        (bool success, ) = payable(owner()).call{value: balance}("");
        require(success, "Withdrawal failed");
        
        emit FundsWithdrawn(owner(), balance);
    }
    
    /**
     * @dev Emergency withdraw specific amount
     * @param amount Amount to withdraw in wei
     */
    function emergencyWithdraw(uint256 amount) external onlyOwner whenNotPaused nonReentrant {
        require(amount > 0, "Amount must be greater than 0");
        require(address(this).balance >= amount, "Insufficient balance");
        
        (bool success, ) = payable(owner()).call{value: amount}("");
        require(success, "Emergency withdrawal failed");
        
        emit FundsWithdrawn(owner(), amount);
    }
    
    /**
     * @dev Pause contract (emergency function)
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @dev Unpause contract
     */
    function unpause() external onlyOwner {
        _unpause();
    }
    
    /**
     * @dev Get contract balance
     * @return uint256 Contract balance in wei
     */
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
    
    /**
     * @dev Get total number of plans
     * @return uint256 Total plans count
     */
    function getTotalPlans() external view returns (uint256) {
        return nextPlanId - 1;
    }
    
    /**
     * @dev Fallback function to reject direct payments
     */
    receive() external payable {
        revert("Direct payments not allowed. Use purchase() function");
    }
}