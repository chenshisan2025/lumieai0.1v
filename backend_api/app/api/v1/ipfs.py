from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from fastapi.responses import JSONResponse
from typing import Dict, Any, Optional
import json
import logging
from pydantic import BaseModel

from ...services.ipfs_service import get_ipfs_service
from ...services.kms_service import get_kms_service
from ...core.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ipfs", tags=["IPFS"])

class IPFSUploadRequest(BaseModel):
    """IPFS上传请求模型"""
    data: Dict[str, Any]
    filename: Optional[str] = "data.json"
    encrypt: bool = True

class IPFSDownloadRequest(BaseModel):
    """IPFS下载请求模型"""
    cid: str
    nonce: Optional[str] = None
    encrypted: bool = True

@router.get("/health")
async def ipfs_health():
    """检查IPFS服务健康状态"""
    try:
        ipfs_service = get_ipfs_service()
        kms_service = get_kms_service()
        
        is_connected = ipfs_service.is_connected()
        node_info = ipfs_service.get_node_info() if is_connected else None
        kms_info = kms_service.get_key_info()
        
        return {
            "status": "healthy" if is_connected else "unhealthy",
            "ipfs_connected": is_connected,
            "ipfs_node": node_info,
            "encryption": {
                "enabled": getattr(settings, 'ENCRYPTION_ENABLED', True),
                "kms_info": kms_info
            },
            "services": {
                "ipfs_api": getattr(settings, 'IPFS_API_URL', 'http://localhost:5001'),
                "ipfs_gateway": getattr(settings, 'IPFS_GATEWAY_URL', 'http://localhost:8080')
            }
        }
    except Exception as e:
        logger.error(f"IPFS health check failed: {e}")
        raise HTTPException(status_code=500, detail=f"IPFS health check failed: {str(e)}")

@router.post("/upload")
async def upload_data(request: IPFSUploadRequest):
    """上传数据到IPFS（支持加密）"""
    try:
        ipfs_service = get_ipfs_service()
        
        if not ipfs_service.is_connected():
            raise HTTPException(status_code=503, detail="IPFS service not available")
        
        # 根据请求选择加密或非加密上传
        if request.encrypt:
            result = await ipfs_service.upload_json_encrypted(
                data=request.data,
                filename=request.filename
            )
        else:
            result = await ipfs_service.upload_json(
                data=request.data,
                filename=request.filename
            )
        
        if not result:
            raise HTTPException(status_code=500, detail="Failed to upload data to IPFS")
        
        logger.info(f"Successfully uploaded data to IPFS: {result['cid']}")
        
        return {
            "success": True,
            "message": "Data uploaded successfully",
            "result": result
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"IPFS upload failed: {e}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@router.post("/download")
async def download_data(request: IPFSDownloadRequest):
    """从IPFS下载数据（支持解密）"""
    try:
        ipfs_service = get_ipfs_service()
        
        if not ipfs_service.is_connected():
            raise HTTPException(status_code=503, detail="IPFS service not available")
        
        # 根据请求选择解密或非解密下载
        if request.encrypted and request.nonce:
            result = await ipfs_service.download_json_encrypted(
                cid=request.cid,
                nonce=request.nonce
            )
        else:
            result = await ipfs_service.download_json(cid=request.cid)
        
        if not result:
            raise HTTPException(status_code=404, detail="Failed to download data from IPFS")
        
        logger.info(f"Successfully downloaded data from IPFS: {request.cid}")
        
        return {
            "success": True,
            "message": "Data downloaded successfully",
            "data": result
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"IPFS download failed: {e}")
        raise HTTPException(status_code=500, detail=f"Download failed: {str(e)}")

@router.post("/upload-file")
async def upload_file(file: UploadFile = File(...), encrypt: bool = True):
    """上传文件到IPFS"""
    try:
        ipfs_service = get_ipfs_service()
        
        if not ipfs_service.is_connected():
            raise HTTPException(status_code=503, detail="IPFS service not available")
        
        # 读取文件内容
        content = await file.read()
        
        # 尝试解析为JSON
        try:
            if file.content_type == 'application/json' or file.filename.endswith('.json'):
                data = json.loads(content.decode('utf-8'))
            else:
                # 对于非JSON文件，将内容作为base64字符串处理
                import base64
                data = {
                    "filename": file.filename,
                    "content_type": file.content_type,
                    "content": base64.b64encode(content).decode('utf-8'),
                    "size": len(content)
                }
        except (json.JSONDecodeError, UnicodeDecodeError) as e:
            raise HTTPException(status_code=400, detail=f"Invalid file format: {str(e)}")
        
        # 上传数据
        if encrypt:
            result = await ipfs_service.upload_json_encrypted(
                data=data,
                filename=file.filename
            )
        else:
            result = await ipfs_service.upload_json(
                data=data,
                filename=file.filename
            )
        
        if not result:
            raise HTTPException(status_code=500, detail="Failed to upload file to IPFS")
        
        logger.info(f"Successfully uploaded file to IPFS: {result['cid']}")
        
        return {
            "success": True,
            "message": "File uploaded successfully",
            "result": result,
            "file_info": {
                "filename": file.filename,
                "content_type": file.content_type,
                "size": len(content)
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"File upload failed: {e}")
        raise HTTPException(status_code=500, detail=f"File upload failed: {str(e)}")

@router.post("/pin/{cid}")
async def pin_content(cid: str):
    """Pin内容到IPFS节点"""
    try:
        ipfs_service = get_ipfs_service()
        
        if not ipfs_service.is_connected():
            raise HTTPException(status_code=503, detail="IPFS service not available")
        
        success = await ipfs_service.pin_cid(cid)
        
        if not success:
            raise HTTPException(status_code=500, detail="Failed to pin content")
        
        logger.info(f"Successfully pinned content: {cid}")
        
        return {
            "success": True,
            "message": "Content pinned successfully",
            "cid": cid
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Pin operation failed: {e}")
        raise HTTPException(status_code=500, detail=f"Pin failed: {str(e)}")

@router.get("/encryption/test")
async def test_encryption():
    """测试加密功能"""
    try:
        from ...services.ipfs_service import EncryptionService
        
        encryption_service = EncryptionService()
        
        # 测试数据
        test_data = {
            "message": "Hello, IPFS with encryption!",
            "timestamp": "2024-01-01T00:00:00Z",
            "user_id": "test_user_123",
            "sensitive_data": "This should be encrypted"
        }
        
        # 加密测试
        json_str = json.dumps(test_data)
        encrypted_result = encryption_service.encrypt_data(json_str)
        
        # 解密测试
        decrypted_data = encryption_service.decrypt_data(
            encrypted_result['encrypted_data'],
            encrypted_result['nonce']
        )
        
        # 验证数据完整性
        decrypted_json = json.loads(decrypted_data)
        data_integrity = test_data == decrypted_json
        
        return {
            "success": True,
            "message": "Encryption test completed",
            "test_results": {
                "original_data": test_data,
                "encrypted_info": {
                    "algorithm": encrypted_result['algorithm'],
                    "has_nonce": bool(encrypted_result['nonce']),
                    "has_encrypted_data": bool(encrypted_result['encrypted_data']),
                    "kms_enabled": encrypted_result.get('kms_enabled', False),
                    "key_source": encrypted_result.get('key_source', 'unknown')
                },
                "decrypted_data": decrypted_json,
                "data_integrity": data_integrity
            }
        }
        
    except Exception as e:
        logger.error(f"Encryption test failed: {e}")
        raise HTTPException(status_code=500, detail=f"Encryption test failed: {str(e)}")

@router.get("/kms/info")
async def get_kms_info():
    """获取KMS密钥管理信息"""
    try:
        kms_service = get_kms_service()
        kms_info = kms_service.get_key_info()
        
        return {
            "success": True,
            "kms_info": kms_info,
            "encryption_config": {
                "encryption_enabled": getattr(settings, 'ENCRYPTION_ENABLED', True),
                "privacy_mode": getattr(settings, 'PRIVACY_MODE', True),
                "log_health_data": getattr(settings, 'LOG_HEALTH_DATA', False)
            }
        }
        
    except Exception as e:
        logger.error(f"Failed to get KMS info: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get KMS info: {str(e)}")

@router.post("/kms/rotate-key")
async def rotate_kms_key():
    """轮换KMS密钥"""
    try:
        kms_service = get_kms_service()
        result = kms_service.rotate_key()
        
        if result:
            logger.info("KMS key rotation completed successfully")
            return {
                "success": True,
                "message": "Key rotation completed successfully",
                "rotation_info": result
            }
        else:
            raise HTTPException(status_code=500, detail="Key rotation failed")
        
    except Exception as e:
        logger.error(f"KMS key rotation failed: {e}")
        raise HTTPException(status_code=500, detail=f"Key rotation failed: {str(e)}")