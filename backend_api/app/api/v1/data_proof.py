from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from fastapi.responses import JSONResponse
from typing import Dict, Any, Optional, List
from fastapi import Body
from datetime import datetime, timezone

from app.services.data_proof_service import data_proof_service
from app.services.bscscan_service import bscscan_service
from ...core.auth import get_current_user
from ...core.config import settings
from ...core.logging import get_logger, log_operation
from ...core.exceptions import (
    DataProofException, 
    ValidationException, 
    ResourceNotFoundException,
    IPFSException,
    BlockchainException
)

logger = get_logger("data_proof_api")

router = APIRouter(prefix="/data-proof", tags=["data-proof"])

@router.post("/create-daily-proof")
@log_operation("create_daily_proof_api")
async def create_daily_proof(
    daily_data: Dict[str, Any],
    encrypt: bool = True,
    background_tasks: BackgroundTasks = BackgroundTasks(),
    current_user: Dict = Depends(get_current_user)
):
    """创建每日数据证明
    
    Args:
        daily_data: 每日健康数据
        encrypt: 是否加密数据（默认为True）
        background_tasks: 后台任务
        current_user: 当前用户
        
    Returns:
        包含CID和证明记录的响应
    """
    try:
        if not daily_data:
            raise ValidationException("Daily data cannot be empty")
            
        logger.info(f"Creating daily proof for user {current_user.get('username')}")
        data_proof_service = get_data_proof_service()
        
        # 添加用户信息到数据中
        enhanced_data = {
            **daily_data,
            'user_id': current_user.get('id'),
            'username': current_user.get('username'),
            'created_by': current_user.get('username'),
            'timestamp': datetime.now(timezone.utc).isoformat()
        }
        
        # 创建数据证明
        result = await data_proof_service.create_daily_proof(
            enhanced_data, 
            encrypt=encrypt
        )
        
        if result and result.get('success'):
            logger.info(f"Daily proof created successfully for user {current_user.get('username')}: {result['proof_record']['cid']}")
            
            return JSONResponse(
                status_code=201,
                content={
                    'success': True,
                    'message': 'Daily proof created successfully',
                    'data': {
                        'proof_id': result['proof_record']['id'],
                        'cid': result['proof_record']['cid'],
                        'url': result['proof_record']['url'],
                        'date': result['proof_record']['date'],
                        'encrypted': result['proof_record']['encrypted'],
                        'size': result['proof_record']['size'],
                        'created_at': result['proof_record']['created_at']
                    }
                }
            )
        else:
            raise DataProofException("Failed to create daily proof")
            
    except (ValidationException, DataProofException, IPFSException, BlockchainException) as e:
        logger.error(f"Error creating daily proof: {e}")
        raise HTTPException(
            status_code=400,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Unexpected error creating daily proof: {e}")
        raise HTTPException(
            status_code=500,
            detail="Internal server error"
        )

@router.get("/verify/{cid}")
async def verify_proof(
    cid: str,
    expected_date: Optional[str] = None,
    current_user: Dict = Depends(get_current_user)
):
    """验证数据证明
    
    Args:
        cid: IPFS CID
        expected_date: 可选的预期日期
        current_user: 当前用户
        
    Returns:
        验证结果
    """
    try:
        data_proof_service = get_data_proof_service()
        
        # 验证数据证明
        verification_result = await data_proof_service.verify_daily_proof(
            cid, 
            expected_date
        )
        
        if verification_result and verification_result.get('success'):
            logger.info(f"Proof verification successful for CID {cid} by user {current_user.get('username')}")
            
            return JSONResponse(
                status_code=200,
                content={
                    'success': True,
                    'message': 'Proof verification completed',
                    'data': verification_result
                }
            )
        else:
            logger.warning(f"Proof verification failed for CID {cid}: {verification_result.get('error', 'Unknown error')}")
            
            return JSONResponse(
                status_code=400,
                content={
                    'success': False,
                    'message': 'Proof verification failed',
                    'error': verification_result.get('error', 'Unknown error')
                }
            )
            
    except Exception as e:
        logger.error(f"Error verifying proof {cid}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )

@router.get("/records")
async def get_proof_records(
    date_filter: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    current_user: Dict = Depends(get_current_user)
):
    """获取证明记录列表
    
    Args:
        date_filter: 可选的日期过滤器 (YYYY-MM-DD)
        limit: 返回记录数量限制
        offset: 偏移量
        current_user: 当前用户
        
    Returns:
        证明记录列表
    """
    try:
        data_proof_service = get_data_proof_service()
        
        # 获取证明记录
        records = data_proof_service.get_proof_records(date_filter)
        
        # 应用分页
        total_count = len(records)
        paginated_records = records[offset:offset + limit]
        
        logger.info(f"Retrieved {len(paginated_records)} proof records for user {current_user.get('username')}")
        
        return JSONResponse(
            status_code=200,
            content={
                'success': True,
                'message': 'Proof records retrieved successfully',
                'data': {
                    'records': paginated_records,
                    'pagination': {
                        'total_count': total_count,
                        'limit': limit,
                        'offset': offset,
                        'has_more': offset + limit < total_count
                    }
                }
            }
        )
        
    except Exception as e:
        logger.error(f"Error retrieving proof records: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )

@router.get("/records/by-date/{date}")
async def get_proof_by_date(
    date: str,
    current_user: Dict = Depends(get_current_user)
):
    """根据日期获取特定的证明记录
    
    Args:
        date: 日期 (YYYY-MM-DD)
        current_user: 当前用户
        
    Returns:
        指定日期的证明记录
    """
    try:
        data_proof_service = get_data_proof_service()
        
        # 获取指定日期的记录
        records = data_proof_service.get_proof_records(date)
        
        if records:
            logger.info(f"Found {len(records)} proof records for date {date} by user {current_user.get('username')}")
            
            return JSONResponse(
                status_code=200,
                content={
                    'success': True,
                    'message': f'Proof records for {date} retrieved successfully',
                    'data': {
                        'date': date,
                        'records': records,
                        'count': len(records)
                    }
                }
            )
        else:
            return JSONResponse(
                status_code=404,
                content={
                    'success': False,
                    'message': f'No proof records found for date {date}',
                    'data': {
                        'date': date,
                        'records': [],
                        'count': 0
                    }
                }
            )
            
    except Exception as e:
        logger.error(f"Error retrieving proof records for date {date}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )

@router.get("/decryption-guide")
async def get_decryption_guide(
    current_user: Dict = Depends(get_current_user)
):
    """获取解密指南（用于受控环境复现）
    
    Args:
        current_user: 当前用户
        
    Returns:
        解密指南和环境要求
    """
    try:
        data_proof_service = get_data_proof_service()
        
        # 获取解密指南
        guide = data_proof_service.get_decryption_guide()
        
        logger.info(f"Decryption guide requested by user {current_user.get('username')}")
        
        return JSONResponse(
            status_code=200,
            content={
                'success': True,
                'message': 'Decryption guide retrieved successfully',
                'data': guide
            }
        )
        
    except Exception as e:
        logger.error(f"Error retrieving decryption guide: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )

@router.post("/decrypt/{cid}")
async def decrypt_proof_data(
    cid: str,
    current_user: Dict = Depends(get_current_user)
):
    """解密证明数据（仅在受控环境中使用）
    
    Args:
        cid: IPFS CID
        current_user: 当前用户
        
    Returns:
        解密后的数据
    """
    try:
        # 检查用户权限（仅管理员可以解密）
        if not current_user.get('is_admin', False):
            raise HTTPException(
                status_code=403,
                detail="Insufficient permissions for decryption operation"
            )
        
        data_proof_service = get_data_proof_service()
        
        # 验证并解密数据
        verification_result = await data_proof_service.verify_daily_proof(cid)
        
        if verification_result and verification_result.get('success'):
            if verification_result.get('encrypted'):
                logger.warning(f"Decryption operation performed by admin {current_user.get('username')} for CID {cid}")
                
                return JSONResponse(
                    status_code=200,
                    content={
                        'success': True,
                        'message': 'Data decrypted successfully',
                        'data': {
                            'cid': cid,
                            'decrypted_data': verification_result.get('decrypted_data'),
                            'encryption_info': verification_result.get('encryption_info'),
                            'warning': 'This operation was performed in a controlled environment'
                        }
                    }
                )
            else:
                return JSONResponse(
                    status_code=200,
                    content={
                        'success': True,
                        'message': 'Data is not encrypted',
                        'data': {
                            'cid': cid,
                            'data': verification_result.get('data')
                        }
                    }
                )
        else:
            raise HTTPException(
                status_code=400,
                detail=f"Failed to decrypt data: {verification_result.get('error', 'Unknown error')}"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error decrypting proof data {cid}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )

@router.get("/health")
async def health_check():
    """数据证明服务健康检查
    
    Returns:
        服务状态信息
    """
    try:
        data_proof_service = get_data_proof_service()
        
        # 检查Pinata连接
        pinata_status = await data_proof_service.pinata_service.test_authentication()
        
        # 检查加密服务
        encryption_info = data_proof_service.encryption_service.get_decryption_info()
        
        return JSONResponse(
            status_code=200,
            content={
                'success': True,
                'message': 'Data proof service is healthy',
                'data': {
                    'service_status': 'healthy',
                    'pinata_connected': pinata_status.get('success', False),
                    'encryption_enabled': True,
                    'kms_enabled': encryption_info.get('kms_enabled', False),
                    'timestamp': datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return JSONResponse(
            status_code=503,
            content={
                'success': False,
                'message': 'Data proof service is unhealthy',
                'error': str(e),
                'timestamp': datetime.now(timezone.utc).isoformat()
            }
        )

@router.get("/transaction/{tx_hash}")
async def get_transaction_info(tx_hash: str):
    """获取区块链交易信息
    
    Args:
        tx_hash: 交易哈希
    
    Returns:
        交易详细信息
    """
    try:
        # 获取交易详情
        transaction = await bscscan_service.get_transaction_by_hash(tx_hash)
        
        # 获取交易收据
        receipt = await bscscan_service.get_transaction_receipt(tx_hash)
        
        # 获取区块信息以获取时间戳
        block_number = transaction.get('blockNumber')
        block_info = await bscscan_service.get_block_by_number(block_number)
        
        return {
            "transaction": transaction,
            "receipt": receipt,
            "block": {
                "number": block_info.get('number'),
                "timestamp": block_info.get('timestamp'),
                "hash": block_info.get('hash')
            },
            "urls": {
                "bscscan": bscscan_service.get_transaction_url(tx_hash),
                "block": bscscan_service.get_block_url(block_number)
            },
            "status": "success" if receipt.get('status') == 1 else "failed"
        }
        
    except Exception as e:
        logger.error(f"Error getting transaction info for {tx_hash}: {str(e)}")
        raise HTTPException(
            status_code=404,
            detail=f"Transaction not found or error: {str(e)}"
        )

@router.post("/verify-transaction")
async def verify_transaction_data(
    tx_hash: str = Body(..., description="交易哈希"),
    expected_cid: Optional[str] = Body(None, description="期望的IPFS CID")
):
    """验证交易中是否包含指定的数据
    
    Args:
        tx_hash: 交易哈希
        expected_cid: 期望的IPFS CID
    
    Returns:
        验证结果
    """
    try:
        # 验证交易数据
        verification_result = await bscscan_service.verify_transaction_data(
            tx_hash, expected_cid
        )
        
        # 如果提供了CID，检查是否匹配
        if expected_cid:
            transaction = await bscscan_service.get_transaction_by_hash(tx_hash)
            input_data = transaction.get('input', '')
            cid_found = expected_cid.lower() in input_data.lower()
            verification_result['cidMatches'] = cid_found
            verification_result['expectedCid'] = expected_cid
        
        return {
            "verification": verification_result,
            "urls": {
                "bscscan": bscscan_service.get_transaction_url(tx_hash)
            },
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error verifying transaction {tx_hash}: {str(e)}")
        raise HTTPException(
            status_code=400,
            detail=f"Transaction verification failed: {str(e)}"
        )

@router.get("/gas-price")
async def get_current_gas_price():
    """获取当前BSC网络Gas价格
    
    Returns:
        当前Gas价格信息
    """
    try:
        gas_info = await bscscan_service.get_gas_price()
        return gas_info
        
    except Exception as e:
        logger.error(f"Error getting gas price: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get gas price: {str(e)}"
        )

@router.get("/latest-block")
async def get_latest_block_info():
    """获取最新区块信息
    
    Returns:
        最新区块信息
    """
    try:
        latest_block_number = await bscscan_service.get_latest_block_number()
        block_info = await bscscan_service.get_block_by_number(latest_block_number)
        
        return {
            "block": block_info,
            "url": bscscan_service.get_block_url(latest_block_number)
        }
        
    except Exception as e:
        logger.error(f"Error getting latest block: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get latest block: {str(e)}"
        )