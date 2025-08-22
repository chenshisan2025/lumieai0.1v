from web3 import Web3
from typing import Optional, Dict, Any
from datetime import datetime, timezone
from ..core.config import settings


class Web3Service:
    """Web3 service for blockchain interactions"""
    
    def __init__(self):
        self.w3 = Web3(Web3.HTTPProvider(settings.BSC_RPC_URL))
        self.subscription_manager_address = settings.SUBSCRIPTION_MANAGER_ADDRESS
        
        # SubscriptionManager ABI (minimal required functions)
        self.subscription_manager_abi = [
            {
                "inputs": [{"internalType": "address", "name": "user", "type": "address"}],
                "name": "isActive",
                "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
                "stateMutability": "view",
                "type": "function"
            },
            {
                "inputs": [{"internalType": "address", "name": "user", "type": "address"}],
                "name": "subscriptionUntil",
                "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
                "stateMutability": "view",
                "type": "function"
            },
            {
                "inputs": [{"internalType": "uint256", "name": "planId", "type": "uint256"}],
                "name": "plans",
                "outputs": [
                    {"internalType": "uint256", "name": "priceWei", "type": "uint256"},
                    {"internalType": "uint256", "name": "periodDays", "type": "uint256"},
                    {"internalType": "bool", "name": "active", "type": "bool"}
                ],
                "stateMutability": "view",
                "type": "function"
            }
        ]
        
        # Create contract instance
        self.subscription_contract = self.w3.eth.contract(
            address=self.subscription_manager_address,
            abi=self.subscription_manager_abi
        )
    
    def is_connected(self) -> bool:
        """Check if Web3 is connected"""
        return self.w3.is_connected()
    
    async def get_subscription_status(self, address: str) -> Dict[str, Any]:
        """Get subscription status for an address"""
        try:
            # Validate address
            if not self.w3.is_address(address):
                raise ValueError(f"Invalid address: {address}")
            
            # Convert to checksum address
            checksum_address = self.w3.to_checksum_address(address)
            
            # Get subscription until timestamp
            subscription_until_timestamp = self.subscription_contract.functions.subscriptionUntil(
                checksum_address
            ).call()
            
            # Check if subscription is active
            is_active = self.subscription_contract.functions.isActive(
                checksum_address
            ).call()
            
            # Convert timestamp to ISO format
            subscription_until = None
            if subscription_until_timestamp > 0:
                subscription_until = datetime.fromtimestamp(
                    subscription_until_timestamp, 
                    tz=timezone.utc
                ).isoformat()
            
            return {
                "active": is_active,
                "until": subscription_until,
                "timestamp": subscription_until_timestamp
            }
            
        except Exception as e:
            print(f"Error getting subscription status: {e}")
            return {
                "active": False,
                "until": None,
                "timestamp": 0,
                "error": str(e)
            }
    
    async def get_plan_info(self, plan_id: int = None) -> Dict[str, Any]:
        """Get subscription plan information"""
        try:
            if plan_id is None:
                plan_id = settings.DEFAULT_PLAN_ID
            
            # Get plan details from contract
            plan_info = self.subscription_contract.functions.plans(plan_id).call()
            price_wei, period_days, active = plan_info
            
            # Convert wei to BNB
            price_bnb = self.w3.from_wei(price_wei, 'ether')
            
            return {
                "id": plan_id,
                "price_wei": str(price_wei),
                "price_bnb": str(price_bnb),
                "period_days": period_days,
                "active": active
            }
            
        except Exception as e:
            print(f"Error getting plan info: {e}")
            # Return default plan info from settings
            return {
                "id": settings.DEFAULT_PLAN_ID,
                "price_wei": settings.DEFAULT_PLAN_PRICE_WEI,
                "price_bnb": str(self.w3.from_wei(int(settings.DEFAULT_PLAN_PRICE_WEI), 'ether')),
                "period_days": settings.DEFAULT_PLAN_PERIOD_DAYS,
                "active": True,
                "error": str(e)
            }


# Global Web3 service instance
web3_service = Web3Service()


def get_web3_service() -> Web3Service:
    """Get Web3 service instance"""
    return web3_service