const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * Deploy script for SubscriptionManager contract
 * Deploys SubscriptionManager and sets up initial plan
 */
async function main() {
  console.log("🚀 Starting SubscriptionManager deployment...");
  
  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log("📝 Deploying contracts with account:", deployer.address);
  
  // Check deployer balance
  const balance = await deployer.getBalance();
  console.log("💰 Account balance:", ethers.utils.formatEther(balance), "BNB");
  
  if (balance.lt(ethers.utils.parseEther("0.01"))) {
    throw new Error("❌ Insufficient balance for deployment");
  }
  
  const deploymentResults = {};
  
  try {
    // 1. Deploy SubscriptionManager
    console.log("\n📦 Deploying SubscriptionManager...");
     // 获取合约工厂
     const SubscriptionManager = await ethers.getContractFactory("SubscriptionManager");
    
    const subscriptionManager = await SubscriptionManager.deploy();
    await subscriptionManager.deployed();
    
    console.log("✅ SubscriptionManager deployed to:", subscriptionManager.address);
    
    deploymentResults.subscriptionManager = {
      address: subscriptionManager.address,
      deployer: deployer.address
    };
    
    // 2. Setup initial plan
    console.log("\n⚙️ Setting up initial subscription plan...");
    
    // Plan parameters as specified in requirements
    const planId = 1;
    const priceWei = ethers.utils.parseEther("0.1"); // 0.1 BNB
    const periodDays = 30; // 30 days
    const active = true;
    const planName = "Monthly Premium";
    
    console.log("📋 Plan configuration:");
    console.log(`   - Plan ID: ${planId}`);
    console.log(`   - Price: ${ethers.utils.formatEther(priceWei)} BNB`);
    console.log(`   - Period: ${periodDays} days`);
    console.log(`   - Active: ${active}`);
    console.log(`   - Name: ${planName}`);
    
    // Create the plan
    console.log("\n🔧 Creating subscription plan...");
    const createPlanTx = await subscriptionManager.createPlan(
      priceWei,
      periodDays,
      active,
      planName
    );
    await createPlanTx.wait();
    
    console.log("✅ Initial plan created successfully");
    
    // 3. Verify deployment
    console.log("\n🔍 Verifying deployment...");
    
    // Check plan details
    const planDetails = await subscriptionManager.getPlan(planId);
    console.log("📊 Plan verification:");
    console.log(`   - Price: ${ethers.utils.formatEther(planDetails.priceWei)} BNB`);
    console.log(`   - Period: ${planDetails.periodDays} days`);
    console.log(`   - Active: ${planDetails.active}`);
    console.log(`   - Name: ${planDetails.name}`);
    
    // Check for multisig owner configuration
    const multisigOwner = process.env.MULTISIG_OWNER_ADDRESS;
    if (multisigOwner && ethers.utils.isAddress(multisigOwner)) {
      console.log(`\n🔐 Transferring ownership to multisig: ${multisigOwner}`);
      const transferTx = await subscriptionManager.transferOwnership(multisigOwner);
      await transferTx.wait();
      console.log("✅ Ownership transferred successfully");
    }
    
    // Check contract owner
    const owner = await subscriptionManager.owner();
    console.log(`📊 Contract owner: ${owner}`);
    console.log(`📊 Owner matches deployer: ${owner === deployer.address}`);
    if (multisigOwner) {
      console.log(`📊 Owner is multisig: ${owner === multisigOwner}`);
    }
    
    // Check total plans
    const totalPlans = await subscriptionManager.getTotalPlans();
    console.log(`📊 Total plans created: ${totalPlans}`);
    
    // 4. Save deployment info
    deploymentResults.network = {
      name: (await ethers.provider.getNetwork()).name,
      chainId: (await ethers.provider.getNetwork()).chainId
    };
    
    deploymentResults.plan = {
      planId: planId,
      priceWei: priceWei.toString(),
      priceBNB: ethers.utils.formatEther(priceWei),
      periodDays: periodDays,
      active: active,
      name: planName
    };
    
    deploymentResults.deployment = {
      timestamp: new Date().toISOString(),
      blockNumber: await ethers.provider.getBlockNumber(),
      gasUsed: (await subscriptionManager.deployTransaction.wait()).gasUsed.toString()
    };
    
    // Save to file
    const deploymentsDir = path.join(__dirname, "..", "deployments");
    if (!fs.existsSync(deploymentsDir)) {
      fs.mkdirSync(deploymentsDir, { recursive: true });
    }
    
    const deploymentFile = path.join(deploymentsDir, `subscription-deployment-${Date.now()}.json`);
    fs.writeFileSync(deploymentFile, JSON.stringify(deploymentResults, null, 2));
    
    console.log("\n📄 Deployment info saved to:", deploymentFile);
    
    // 5. Generate environment variables
    const envVars = `
# SubscriptionManager Contract
# Generated on ${new Date().toISOString()}
# Network: ${deploymentResults.network.name} (Chain ID: ${deploymentResults.network.chainId})

# Subscription Manager Contract
SUBSCRIPTION_MANAGER_ADDRESS=${subscriptionManager.address}

# Plan Configuration
SUBSCRIPTION_PLAN_ID=${planId}
SUBSCRIPTION_PRICE_WEI=${priceWei.toString()}
SUBSCRIPTION_PRICE_BNB=${ethers.utils.formatEther(priceWei)}
SUBSCRIPTION_PERIOD_DAYS=${periodDays}

# Contract ABI (for frontend integration)
SUBSCRIPTION_MANAGER_ABI_PATH="./contracts/artifacts/contracts/SubscriptionManager.sol/SubscriptionManager.json"
`;
    
    const envFile = path.join(__dirname, "..", "..", ".env.subscription");
    fs.writeFileSync(envFile, envVars);
    
    console.log("\n📄 Subscription environment variables saved to:", envFile);
    
    // 6. Display summary
    console.log("\n🎉 SubscriptionManager deployment completed successfully!");
    console.log("\n📋 DEPLOYMENT SUMMARY:");
    console.log("=" .repeat(60));
    console.log(`📋 SubscriptionManager: ${subscriptionManager.address}`);
    console.log(`🌐 Network: ${deploymentResults.network.name} (${deploymentResults.network.chainId})`);
    console.log(`👤 Deployer/Owner: ${deployer.address}`);
    console.log(`💰 Plan Price: ${ethers.utils.formatEther(priceWei)} BNB`);
    console.log(`📅 Plan Period: ${periodDays} days`);
    console.log(`✅ Plan Active: ${active}`);
    console.log("=" .repeat(60));
    
    console.log("\n📝 Next steps:");
    console.log("1. Add SUBSCRIPTION_MANAGER_ADDRESS to your .env file");
    console.log("2. Verify contract on BSCScan (if on mainnet/testnet)");
    console.log("3. Test the contract functions");
    console.log("4. Update your frontend to use the new contract");
    if (!multisigOwner) {
      console.log("\n⚠️  SECURITY NOTICE:");
      console.log("   - Contract owner is currently the deployer address");
      console.log("   - For production, consider transferring ownership to a multisig wallet");
      console.log("   - Set MULTISIG_OWNER_ADDRESS environment variable before deployment");
    }
    
    console.log("\n🧪 Test the contract:");
    console.log(`   - Check if address is active: isActive(address)`);
    console.log(`   - Check subscription expiry: subscriptionUntil(address)`);
    console.log(`   - Purchase subscription: purchase(${planId}) with ${ethers.utils.formatEther(priceWei)} BNB`);
    
    return deploymentResults;
    
  } catch (error) {
    console.error("❌ Deployment failed:", error);
    throw error;
  }
}

// Execute deployment
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = main;