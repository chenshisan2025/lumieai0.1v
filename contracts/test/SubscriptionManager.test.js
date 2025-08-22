const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("SubscriptionManager", function () {
    let subscriptionManager;
    let owner;
    let user1;
    let user2;
    let addrs;
    
    const PLAN_PRICE = ethers.utils.parseEther("0.1"); // 0.1 BNB
    const PLAN_PERIOD = 30; // 30 days
    const PLAN_ID = 1;
    
    beforeEach(async function () {
        // Get signers
        [owner, user1, user2, ...addrs] = await ethers.getSigners();
        
        // Deploy SubscriptionManager
        const SubscriptionManager = await ethers.getContractFactory("SubscriptionManager");
        subscriptionManager = await SubscriptionManager.deploy();
        await subscriptionManager.deployed();
        
        // Create initial plan
        await subscriptionManager.createPlan(
            PLAN_PRICE,
            PLAN_PERIOD,
            true,
            "Basic Plan"
        );
    });
    
    describe("Deployment", function () {
        it("Should set the right owner", async function () {
            expect(await subscriptionManager.owner()).to.equal(owner.address);
        });
        
        it("Should create initial plan correctly", async function () {
            const plan = await subscriptionManager.plans(PLAN_ID);
            expect(plan.priceWei).to.equal(PLAN_PRICE);
            expect(plan.periodDays).to.equal(PLAN_PERIOD);
            expect(plan.active).to.be.true;
            expect(plan.name).to.equal("Basic Plan");
        });
    });
    
    describe("Purchase Subscription", function () {
        it("Should allow purchase with correct payment", async function () {
            await subscriptionManager.connect(user1).purchase(PLAN_ID, { value: PLAN_PRICE });
            
            const subscription = await subscriptionManager.getSubscription(user1.address);
            expect(subscription.planId).to.equal(PLAN_ID);
            expect(subscription.active).to.be.true;
            
            // Check that expiry time is approximately correct (within 10 seconds)
            const currentTime = await time.latest();
            const expectedExpiry = currentTime + (PLAN_PERIOD * 24 * 60 * 60);
            expect(subscription.expiryTime).to.be.closeTo(expectedExpiry, 10);
        });
        
        it("Should revert with insufficient payment", async function () {
            const insufficientPayment = ethers.utils.parseEther("0.05"); // 0.05 BNB
            
            await expect(
                subscriptionManager.connect(user1).purchase(PLAN_ID, {
                    value: insufficientPayment
                })
            ).to.be.revertedWith("Incorrect payment amount");
        });
        
        it("Should revert with excessive payment", async function () {
            const excessivePayment = ethers.utils.parseEther("0.2"); // 0.2 BNB
            
            await expect(
                subscriptionManager.connect(user1).purchase(PLAN_ID, {
                    value: excessivePayment
                })
            ).to.be.revertedWith("Incorrect payment amount");
        });
        
        it("Should revert for inactive plan", async function () {
            // Deactivate the plan
            await subscriptionManager.setPlan(PLAN_ID, PLAN_PRICE, PLAN_PERIOD, false);
            
            await expect(
                subscriptionManager.connect(user1).purchase(PLAN_ID, {
                    value: PLAN_PRICE
                })
            ).to.be.revertedWith("Plan is not active");
        });
        
        it("Should extend existing subscription", async function () {
            // First purchase
            await subscriptionManager.connect(user1).purchase(PLAN_ID, {
                value: PLAN_PRICE
            });
            
            const firstSubscription = await subscriptionManager.getSubscription(user1.address);
            const firstExpiry = firstSubscription.expiryTime;
            
            // Second purchase (should extend)
            await subscriptionManager.connect(user1).purchase(PLAN_ID, {
                value: PLAN_PRICE
            });
            
            const secondSubscription = await subscriptionManager.getSubscription(user1.address);
            const secondExpiry = secondSubscription.expiryTime;
            
            // Should extend by another 30 days
            expect(secondExpiry.toNumber()).to.be.greaterThan(firstExpiry.toNumber());
            expect(secondExpiry.toNumber() - firstExpiry.toNumber()).to.be.closeTo(PLAN_PERIOD * 24 * 60 * 60, 10);
        });
    });
    
    describe("Pause Functionality", function () {
        it("Should prevent purchases when paused", async function () {
            // Pause the contract
            await subscriptionManager.pause();
            
            await expect(
                subscriptionManager.connect(user1).purchase(PLAN_ID, {
                    value: PLAN_PRICE
                })
            ).to.be.revertedWith("EnforcedPause");
        });
        
        it("Should allow purchases after unpause", async function () {
            // Pause and then unpause
            await subscriptionManager.pause();
            await subscriptionManager.unpause();
            
            // Should work normally
            await expect(
                subscriptionManager.connect(user1).purchase(PLAN_ID, {
                    value: PLAN_PRICE
                })
            ).to.emit(subscriptionManager, "SubscriptionPurchased");
        });
        
        it("Should only allow owner to pause/unpause", async function () {
            await expect(
                subscriptionManager.connect(user1).pause()
            ).to.be.revertedWith("OwnableUnauthorizedAccount");
            
            await expect(
                subscriptionManager.connect(user1).unpause()
            ).to.be.revertedWith("OwnableUnauthorizedAccount");
        });
    });
    
    describe("Withdraw Functionality", function () {
        beforeEach(async function () {
            // Add some revenue to the contract
            await subscriptionManager.connect(user1).purchase(PLAN_ID, {
                value: PLAN_PRICE
            });
            await subscriptionManager.connect(user2).purchase(PLAN_ID, {
                value: PLAN_PRICE
            });
        });
        
        it("Should allow owner to withdraw funds", async function () {
            const contractBalanceBefore = await ethers.provider.getBalance(subscriptionManager.address);
            expect(contractBalanceBefore).to.equal(PLAN_PRICE.mul(2));
            
            await subscriptionManager.withdraw();
            
            const contractBalanceAfter = await ethers.provider.getBalance(subscriptionManager.address);
            expect(contractBalanceAfter).to.equal(0);
        });
        
        it("Should revert if non-owner tries to withdraw", async function () {
            await expect(
                subscriptionManager.connect(user1).withdraw()
            ).to.be.revertedWith("OwnableUnauthorizedAccount");
        });
        
        it("Should revert if withdrawal amount exceeds balance", async function () {
            const contractBalance = await ethers.provider.getBalance(subscriptionManager.address);
            const excessiveAmount = contractBalance.add(ethers.utils.parseEther("1"));
            
            await expect(
                subscriptionManager.emergencyWithdraw(excessiveAmount)
            ).to.be.revertedWith("Insufficient balance");
        });
        
        it("Should emit FundsWithdrawn event", async function () {
            // First purchase to add funds
            await subscriptionManager.connect(user1).purchase(PLAN_ID, { value: PLAN_PRICE });
            
            // Get contract balance before withdrawal
            const contractBalance = await ethers.provider.getBalance(subscriptionManager.address);
            
            await expect(
                subscriptionManager.withdraw()
            ).to.emit(subscriptionManager, "FundsWithdrawn")
             .withArgs(owner.address, contractBalance);
        });
    });
    
    describe("Subscription Status", function () {
        it("Should return correct active status", async function () {
            // Initially not active
            expect(await subscriptionManager.isActive(user1.address)).to.be.false;
            
            // Purchase subscription
            await subscriptionManager.connect(user1).purchase(PLAN_ID, {
                value: PLAN_PRICE
            });
            
            // Should be active
            expect(await subscriptionManager.isActive(user1.address)).to.be.true;
        });
        
        it("Should return correct expiry time", async function () {
            // Initially 0
            expect(await subscriptionManager.subscriptionUntil(user1.address)).to.equal(0);
            
            // Purchase subscription
            const tx = await subscriptionManager.connect(user1).purchase(PLAN_ID, {
                value: PLAN_PRICE
            });
            const receipt = await tx.wait();
            const blockTimestamp = (await ethers.provider.getBlock(receipt.blockNumber)).timestamp;
            
            const expectedExpiry = blockTimestamp + PLAN_PERIOD * 24 * 60 * 60;
            const actualExpiry = await subscriptionManager.subscriptionUntil(user1.address);
            
            expect(actualExpiry).to.be.closeTo(expectedExpiry, 10);
        });
        
        it("Should handle expired subscriptions", async function () {
            // Purchase subscription
            await subscriptionManager.connect(user1).purchase(PLAN_ID, {
                value: PLAN_PRICE
            });
            
            // Should be active initially
            expect(await subscriptionManager.isActive(user1.address)).to.be.true;
            
            // Fast forward time beyond expiry
            await time.increase(PLAN_PERIOD * 24 * 60 * 60 + 1);
            
            // Should no longer be active
            expect(await subscriptionManager.isActive(user1.address)).to.be.false;
        });
    });
    
    describe("Plan Management", function () {
        it("Should allow owner to create new plans", async function () {
            const newPlanPrice = ethers.utils.parseEther("0.2");
            const newPlanPeriod = 60;
            const newPlanName = "Premium Plus";
            
            await subscriptionManager.createPlan(
                newPlanPrice,
                newPlanPeriod,
                true,
                newPlanName
            );
            
            const plan = await subscriptionManager.getPlan(2);
            expect(plan.priceWei).to.equal(newPlanPrice);
            expect(plan.periodDays).to.equal(newPlanPeriod);
            expect(plan.active).to.be.true;
            expect(plan.name).to.equal(newPlanName);
        });
        
        it("Should allow owner to update existing plans", async function () {
            const newPrice = ethers.utils.parseEther("0.15");
            const newPeriod = 45;
            
            await subscriptionManager.setPlan(
                PLAN_ID,
                newPrice,
                newPeriod,
                false
            );
            
            const plan = await subscriptionManager.getPlan(PLAN_ID);
            expect(plan.priceWei).to.equal(newPrice);
            expect(plan.periodDays).to.equal(newPeriod);
            expect(plan.active).to.be.false;
        });
    });
});