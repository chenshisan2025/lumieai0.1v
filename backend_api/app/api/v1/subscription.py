from fastapi import APIRouter, Query, HTTPException, Depends
from typing import Dict, Any
from ...services.web3_service import get_web3_service, Web3Service
from ...core.redis import get_redis, RedisClient


router = APIRouter(prefix="/subscription", tags=["subscription"])


@router.get("/status")
async def get_subscription_status(
    address: str = Query(..., description="Wallet address to check subscription status"),
    web3_service: Web3Service = Depends(get_web3_service),
    redis_client: RedisClient = Depends(get_redis)
) -> Dict[str, Any]:
    """Get subscription status for a wallet address"""
    
    try:
        # Validate address format
        if not address or len(address) != 42 or not address.startswith('0x'):
            raise HTTPException(
                status_code=400, 
                detail="Invalid wallet address format"
            )
        
        # Check cache first
        cache_key = f"subscription_status:{address.lower()}"
        cached_result = await redis_client.get(cache_key)
        
        if cached_result:
            return {
                "success": True,
                "data": cached_result,
                "cached": True
            }
        
        # Get subscription status from blockchain
        subscription_status = await web3_service.get_subscription_status(address)
        
        # Prepare response data
        response_data = {
            "active": subscription_status.get("active", False),
            "until": subscription_status.get("until"),
            "address": address.lower()
        }
        
        # Cache the result for 60 seconds
        await redis_client.set(cache_key, response_data, ttl=60)
        
        return {
            "success": True,
            "data": response_data,
            "cached": False
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get subscription status: {str(e)}"
        )


@router.get("/plan")
async def get_subscription_plan(
    plan_id: int = Query(None, description="Plan ID to get details for"),
    web3_service: Web3Service = Depends(get_web3_service)
) -> Dict[str, Any]:
    """Get subscription plan information"""
    
    try:
        # Get plan information from blockchain or config
        plan_info = await web3_service.get_plan_info(plan_id)
        
        return {
            "success": True,
            "data": {
                "id": plan_info.get("id"),
                "price_wei": plan_info.get("price_wei"),
                "price_bnb": plan_info.get("price_bnb"),
                "period_days": plan_info.get("period_days"),
                "active": plan_info.get("active", True),
                "currency": "BNB",
                "network": "BSC Testnet"
            }
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get subscription plan: {str(e)}"
        )


@router.get("/health")
async def subscription_health(
    web3_service: Web3Service = Depends(get_web3_service)
) -> Dict[str, Any]:
    """Check subscription service health"""
    
    try:
        # Check Web3 connection
        web3_connected = web3_service.is_connected()
        
        # Try to get default plan info
        plan_info = await web3_service.get_plan_info()
        contract_accessible = "error" not in plan_info
        
        return {
            "success": True,
            "data": {
                "web3_connected": web3_connected,
                "contract_accessible": contract_accessible,
                "subscription_manager_address": web3_service.subscription_manager_address,
                "network": "BSC Testnet"
            }
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }