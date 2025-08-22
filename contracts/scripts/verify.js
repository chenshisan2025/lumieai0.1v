const hre = require("hardhat");

async function main() {
    const contractAddress = "0xF87A47426Fc5718456d69a347320f5aebF250Ea9";
    
    console.log("🔍 Starting contract verification...");
    console.log(`📋 Contract Address: ${contractAddress}`);
    console.log(`🌐 Network: ${hre.network.name}`);
    
    try {
        // Verify the contract
        await hre.run("verify:verify", {
            address: contractAddress,
            constructorArguments: [], // SubscriptionManager constructor takes no arguments
        });
        
        console.log("✅ Contract verification completed successfully!");
        console.log(`🔗 View on BSCScan: https://testnet.bscscan.com/address/${contractAddress}`);
        
    } catch (error) {
        if (error.message.toLowerCase().includes("already verified")) {
            console.log("✅ Contract is already verified!");
            console.log(`🔗 View on BSCScan: https://testnet.bscscan.com/address/${contractAddress}`);
        } else {
            console.error("❌ Verification failed:", error.message);
            
            // Provide helpful debugging information
            console.log("\n🔧 Debugging information:");
            console.log(`- Contract Address: ${contractAddress}`);
            console.log(`- Network: ${hre.network.name}`);
            console.log(`- Chain ID: ${hre.network.config.chainId}`);
            console.log(`- API Key configured: ${process.env.BSC_API_KEY ? 'Yes' : 'No'}`);
            
            if (error.message.includes("API Key")) {
                console.log("\n💡 API Key issue detected. Please check:");
                console.log("1. BSC_API_KEY is set in .env file");
                console.log("2. API key is valid and active");
                console.log("3. API key has verification permissions");
            }
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });