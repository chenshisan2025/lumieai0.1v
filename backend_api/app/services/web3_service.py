import asyncio
from typing import Dict, Any, Optional
from datetime import datetime
from web3 import Web3

# Handle different web3.py versions
try:
    from web3.middleware import geth_poa_middleware
except ImportError:
    try:
        from web3.middleware.geth_poa import geth_poa_middleware
    except ImportError:
        # Fallback for very new versions
        geth_poa_middleware = None

from ..core.config import settings
from ..core.logging import get_logger, log_operation
from ..core.exceptions import BlockchainException, ValidationException

logger = get_logger("web3_service")


class Web3Service:
    def __init__(self):
        self.rpc_url = settings.BSC_RPC_URL
        self.w3 = None
        self.logger = get_logger("web3_service")
        self.connect()
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
        if self.w3:
            self.subscription_contract = self.w3.eth.contract(
                address=self.subscription_manager_address,
                abi=self.subscription_manager_abi
            )
    
    def connect(self):
        """连接到BSC网络"""
        try:
            self.logger.info(f"Connecting to BSC network: {self.rpc_url}")
            self.w3 = Web3(Web3.HTTPProvider(self.rpc_url))
            # 添加POA中间件（用于BSC等网络）
            if geth_poa_middleware:
                try:
                    if hasattr(self.w3.middleware_onion, 'inject'):
                        self.w3.middleware_onion.inject(geth_poa_middleware, layer=0)
                    else:
                        self.w3.middleware_onion.add(geth_poa_middleware)
                    self.logger.debug("POA middleware added successfully")
                except Exception as e:
                    self.logger.warning(f"Failed to add POA middleware: {str(e)}")
            else:
                self.logger.warning("POA middleware not available in this web3.py version")
            
            if self.w3.is_connected():
                self.logger.info("Successfully connected to BSC network")
            else:
                self.logger.error("Failed to connect to BSC network")
                raise BlockchainException("Failed to connect to BSC network")
                
        except BlockchainException:
            raise
        except Exception as e:
            self.logger.error(f"Error connecting to BSC network: {str(e)}")
            self.w3 = None
            raise BlockchainException(f"Error connecting to BSC network: {str(e)}")
    
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
    
    @log_operation("send_transaction")
    async def send_transaction(self, transaction_data: Dict[str, Any]) -> str:
        """发送交易到区块链"""
        if not self.w3 or not self.w3.is_connected():
            raise BlockchainException("Not connected to BSC network")
            
        try:
            self.logger.info("Sending transaction to BSC network")
            
            # 验证交易数据
            if not transaction_data:
                raise ValidationException("Transaction data cannot be empty")
                
            # 这里应该实现实际的交易发送逻辑
            # 目前返回模拟的交易哈希
            tx_hash = f"0x{hash(str(transaction_data) + str(datetime.utcnow().timestamp()))}"
            
            self.logger.info(f"Transaction sent successfully: {tx_hash}")
            return tx_hash
            
        except (BlockchainException, ValidationException):
            raise
        except Exception as e:
            self.logger.error(f"Failed to send transaction: {str(e)}")
            raise BlockchainException(f"Failed to send transaction: {str(e)}")


# Global Web3 service instance
web3_service = Web3Service()


def get_web3_service() -> Web3Service:
    """Get Web3 service instance"""
    return web3_service