const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * Deploy script for LUMIEAI smart contracts
 * Deploys LUMToken and HealthRewards contracts
 */
async function main() {
  console.log("🚀 Starting LUMIEAI contract deployment...");
  
  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log("📝 Deploying contracts with account:", deployer.address);
  
  // Check deployer balance
  const balance = await deployer.getBalance();
  console.log("💰 Account balance:", ethers.utils.formatEther(balance), "ETH");
  
  if (balance.lt(ethers.utils.parseEther("0.01"))) {
    throw new Error("❌ Insufficient balance for deployment");
  }
  
  const deploymentResults = {};
  
  try {
    // 1. Deploy LUM Token
    console.log("\n📦 Deploying LUM Token...");
    const LUMToken = await ethers.getContractFactory("LUMToken");
    
    // Token parameters
    const tokenName = "LUMIE Health Token";
    const tokenSymbol = "LUM";
    const initialSupply = ethers.utils.parseEther("100000000"); // 100M tokens
    
    const lumToken = await LUMToken.deploy(tokenName, tokenSymbol, initialSupply);
    await lumToken.deployed();
    
    console.log("✅ LUM Token deployed to:", lumToken.address);
    console.log("📊 Token Name:", tokenName);
    console.log("📊 Token Symbol:", tokenSymbol);
    console.log("📊 Initial Supply:", ethers.utils.formatEther(initialSupply), "LUM");
    
    deploymentResults.lumToken = {
      address: lumToken.address,
      name: tokenName,
      symbol: tokenSymbol,
      initialSupply: initialSupply.toString(),
      deployer: deployer.address
    };
    
    // 2. Deploy Health Rewards Contract
    console.log("\n📦 Deploying Health Rewards Contract...");
    const HealthRewards = await ethers.getContractFactory("HealthRewards");
    
    const healthRewards = await HealthRewards.deploy(lumToken.address);
    await healthRewards.deployed();
    
    console.log("✅ Health Rewards deployed to:", healthRewards.address);
    
    deploymentResults.healthRewards = {
      address: healthRewards.address,
      lumTokenAddress: lumToken.address,
      deployer: deployer.address
    };
    
    // 3. Setup initial configuration
    console.log("\n⚙️ Setting up initial configuration...");
    
    // Transfer some tokens to HealthRewards contract for rewards
    const rewardPoolAmount = ethers.utils.parseEther("10000000"); // 10M tokens for rewards
    console.log("💸 Transferring", ethers.utils.formatEther(rewardPoolAmount), "LUM to rewards contract...");
    
    const transferTx = await lumToken.transfer(healthRewards.address, rewardPoolAmount);
    await transferTx.wait();
    console.log("✅ Reward pool funded successfully");
    
    // Add deployer as authorized signer for testing
    console.log("🔐 Adding deployer as authorized signer...");
    const addSignerTx = await healthRewards.updateSigner(deployer.address, true);
    await addSignerTx.wait();
    console.log("✅ Authorized signer added");
    
    // 4. Verify deployment
    console.log("\n🔍 Verifying deployment...");
    
    // Check LUM token
    const tokenBalance = await lumToken.balanceOf(deployer.address);
    const rewardBalance = await lumToken.balanceOf(healthRewards.address);
    const totalSupply = await lumToken.totalSupply();
    
    console.log("📊 Deployer LUM balance:", ethers.utils.formatEther(tokenBalance));
    console.log("📊 Rewards contract LUM balance:", ethers.utils.formatEther(rewardBalance));
    console.log("📊 Total LUM supply:", ethers.utils.formatEther(totalSupply));
    
    // Check HealthRewards
    const isSignerAuthorized = await healthRewards.authorizedSigners(deployer.address);
    console.log("📊 Deployer authorized as signer:", isSignerAuthorized);
    
    // 5. Save deployment info
    deploymentResults.network = {
      name: (await ethers.provider.getNetwork()).name,
      chainId: (await ethers.provider.getNetwork()).chainId
    };
    
    deploymentResults.deployment = {
      timestamp: new Date().toISOString(),
      blockNumber: await ethers.provider.getBlockNumber(),
      gasUsed: {
        lumToken: (await lumToken.deployTransaction.wait()).gasUsed.toString(),
        healthRewards: (await healthRewards.deployTransaction.wait()).gasUsed.toString()
      }
    };
    
    // Save to file
    const deploymentsDir = path.join(__dirname, "..", "deployments");
    if (!fs.existsSync(deploymentsDir)) {
      fs.mkdirSync(deploymentsDir, { recursive: true });
    }
    
    const deploymentFile = path.join(deploymentsDir, `deployment-${Date.now()}.json`);
    fs.writeFileSync(deploymentFile, JSON.stringify(deploymentResults, null, 2));
    
    console.log("\n📄 Deployment info saved to:", deploymentFile);
    
    // 6. Generate environment variables
    const envVars = `
# LUMIEAI Smart Contract Addresses
# Generated on ${new Date().toISOString()}
# Network: ${deploymentResults.network.name} (Chain ID: ${deploymentResults.network.chainId})

# LUM Token Contract
LUM_TOKEN_ADDRESS=${lumToken.address}
LUM_TOKEN_NAME="${tokenName}"
LUM_TOKEN_SYMBOL=${tokenSymbol}

# Health Rewards Contract
HEALTH_REWARDS_ADDRESS=${healthRewards.address}

# Deployer Info
DEPLOYER_ADDRESS=${deployer.address}

# Contract ABIs (for frontend integration)
LUM_TOKEN_ABI_PATH="./contracts/artifacts/contracts/LUMToken.sol/LUMToken.json"
HEALTH_REWARDS_ABI_PATH="./contracts/artifacts/contracts/HealthRewards.sol/HealthRewards.json"
`;
    
    const envFile = path.join(__dirname, "..", "..", ".env.contracts");
    fs.writeFileSync(envFile, envVars);
    
    console.log("\n📄 Contract environment variables saved to:", envFile);
    
    // 7. Display summary
    console.log("\n🎉 Deployment completed successfully!");
    console.log("\n📋 DEPLOYMENT SUMMARY:");
    console.log("=" .repeat(50));
    console.log(`🪙 LUM Token: ${lumToken.address}`);
    console.log(`🎁 Health Rewards: ${healthRewards.address}`);
    console.log(`🌐 Network: ${deploymentResults.network.name} (${deploymentResults.network.chainId})`);
    console.log(`👤 Deployer: ${deployer.address}`);
    console.log(`💰 Reward Pool: ${ethers.utils.formatEther(rewardPoolAmount)} LUM`);
    console.log("=" .repeat(50));
    
    console.log("\n📝 Next steps:");
    console.log("1. Update your .env file with the contract addresses");
    console.log("2. Verify contracts on BSCScan (if on mainnet/testnet)");
    console.log("3. Configure your backend API with the new addresses");
    console.log("4. Update your Flutter app configuration");
    
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