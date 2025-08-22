from fastapi import APIRouter
from .subscription import router as subscription_router
from .ipfs import router as ipfs_router


# Create main API router
api_router = APIRouter()

# Include subscription routes
api_router.include_router(subscription_router)

# Include IPFS routes
api_router.include_router(ipfs_router)


@api_router.get("/")
async def api_root():
    """API root endpoint"""
    return {
        "message": "LUMIEAI API v1",
        "version": "1.0.0",
        "endpoints": {
            "subscription_status": "/subscription/status?address=0x...",
            "subscription_plan": "/subscription/plan",
            "subscription_health": "/subscription/health",
            "ipfs_health": "/ipfs/health",
            "ipfs_upload": "/ipfs/upload",
            "ipfs_download": "/ipfs/download",
            "ipfs_encryption_test": "/ipfs/encryption/test"
        }
    }