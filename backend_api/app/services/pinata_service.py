import asyncio
import json
import logging
import time
from typing import Dict, Any, Optional, List
import httpx
from ..core.config import settings
from ..core.logging import get_logger, log_operation
from ..core.exceptions import (
    IPFSException,
    ExternalServiceException,
    ValidationException,
    ConfigurationException
)

logger = logging.getLogger(__name__)

class PinataService:
    """Pinata IPFS客户端服务
    
    支持JWT认证、重试机制、超时处理和文件上传功能
    """
    
    def __init__(self):
        self.logger = get_logger("pinata_service")
        self.jwt_token = getattr(settings, 'PINATA_JWT', None)
        self.api_key = getattr(settings, 'PINATA_API_KEY', None)
        self.secret_key = getattr(settings, 'PINATA_SECRET_KEY', None)
        self.base_url = "https://api.pinata.cloud"
        self.gateway_url = getattr(settings, 'PINATA_GATEWAY_URL', 'https://gateway.pinata.cloud')
        
        # 重试配置
        self.max_retries = getattr(settings, 'PINATA_MAX_RETRIES', 3)
        self.retry_delay = getattr(settings, 'PINATA_RETRY_DELAY', 1.0)
        self.timeout = getattr(settings, 'PINATA_TIMEOUT', 30.0)
        
        # 验证配置
        if not self.jwt_token and not (self.api_key and self.secret_key):
            raise ConfigurationException("Pinata credentials not configured. JWT or API Key/Secret required.")
    
    def _get_headers(self) -> Dict[str, str]:
        """获取请求头"""
        if self.jwt_token:
            return {
                'Authorization': f'Bearer {self.jwt_token}',
                'Content-Type': 'application/json'
            }
        elif self.api_key and self.secret_key:
            return {
                'pinata_api_key': self.api_key,
                'pinata_secret_api_key': self.secret_key,
                'Content-Type': 'application/json'
            }
        else:
            raise ValueError("Pinata credentials not configured")
    
    async def _retry_request(self, request_func, *args, **kwargs) -> Optional[httpx.Response]:
        """带重试机制的请求
        
        Args:
            request_func: 请求函数
            *args: 位置参数
            **kwargs: 关键字参数
            
        Returns:
            HTTP响应对象
        """
        last_exception = None
        
        for attempt in range(self.max_retries + 1):
            try:
                response = await request_func(*args, **kwargs)
                
                # 检查响应状态
                if response.status_code < 500:  # 4xx和2xx都不重试
                    return response
                
                logger.warning(f"Server error {response.status_code}, attempt {attempt + 1}/{self.max_retries + 1}")
                
            except (httpx.TimeoutException, httpx.ConnectError, httpx.ReadError) as e:
                last_exception = e
                logger.warning(f"Request failed: {e}, attempt {attempt + 1}/{self.max_retries + 1}")
            
            # 如果不是最后一次尝试，等待后重试
            if attempt < self.max_retries:
                await asyncio.sleep(self.retry_delay * (2 ** attempt))  # 指数退避
        
        # 所有重试都失败了
        if last_exception:
            raise last_exception
        return None
    
    async def test_authentication(self) -> Dict[str, Any]:
        """测试Pinata认证
        
        Returns:
            认证测试结果
        """
        try:
            headers = self._get_headers()
            
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await self._retry_request(
                    client.get,
                    f"{self.base_url}/data/testAuthentication",
                    headers=headers
                )
                
                if response and response.status_code == 200:
                    result = response.json()
                    logger.info("Pinata authentication successful")
                    return {
                        'success': True,
                        'message': result.get('message', 'Authentication successful'),
                        'authenticated': True
                    }
                else:
                    error_msg = f"Authentication failed with status {response.status_code if response else 'unknown'}"
                    logger.error(error_msg)
                    return {
                        'success': False,
                        'message': error_msg,
                        'authenticated': False
                    }
                    
        except Exception as e:
            logger.error(f"Pinata authentication test failed: {e}")
            return {
                'success': False,
                'message': str(e),
                'authenticated': False
            }
    
    async def pin_json_to_ipfs(self, json_data: Dict[str, Any], metadata: Optional[Dict[str, Any]] = None) -> Optional[Dict[str, Any]]:
        """将JSON数据固定到IPFS
        
        Args:
            json_data: 要上传的JSON数据
            metadata: 可选的元数据
            
        Returns:
            包含CID和其他信息的字典
        """
        try:
            headers = self._get_headers()
            
            # 准备请求数据
            pin_data = {
                'pinataContent': json_data
            }
            
            if metadata:
                pin_data['pinataMetadata'] = metadata
            
            # 设置固定选项
            pin_data['pinataOptions'] = {
                'cidVersion': 1
            }
            
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await self._retry_request(
                    client.post,
                    f"{self.base_url}/pinning/pinJSONToIPFS",
                    headers=headers,
                    json=pin_data
                )
                
                if response and response.status_code == 200:
                    result = response.json()
                    cid = result.get('IpfsHash')
                    
                    logger.info(f"Successfully pinned JSON to IPFS: {cid}")
                    
                    return {
                        'success': True,
                        'cid': cid,
                        'url': f"{self.gateway_url}/ipfs/{cid}",
                        'size': result.get('PinSize', 0),
                        'timestamp': result.get('Timestamp'),
                        'pinned': True
                    }
                else:
                    error_msg = f"Failed to pin JSON: {response.status_code if response else 'unknown'}"
                    if response:
                        try:
                            error_detail = response.json()
                            error_msg += f" - {error_detail}"
                        except:
                            error_msg += f" - {response.text}"
                    
                    logger.error(error_msg)
                    return None
                    
        except Exception as e:
            logger.error(f"Failed to pin JSON to IPFS: {e}")
            return None
    
    async def pin_file_to_ipfs(self, file_content: bytes, filename: str, metadata: Optional[Dict[str, Any]] = None) -> Optional[Dict[str, Any]]:
        """将文件固定到IPFS
        
        Args:
            file_content: 文件内容（字节）
            filename: 文件名
            metadata: 可选的元数据
            
        Returns:
            包含CID和其他信息的字典
        """
        try:
            # 对于文件上传，不使用JSON Content-Type
            headers = self._get_headers()
            if 'Content-Type' in headers:
                del headers['Content-Type']
            
            # 准备文件数据
            files = {
                'file': (filename, file_content)
            }
            
            # 准备元数据
            data = {}
            if metadata:
                data['pinataMetadata'] = json.dumps(metadata)
            
            # 设置固定选项
            data['pinataOptions'] = json.dumps({
                'cidVersion': 1
            })
            
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await self._retry_request(
                    client.post,
                    f"{self.base_url}/pinning/pinFileToIPFS",
                    headers=headers,
                    files=files,
                    data=data
                )
                
                if response and response.status_code == 200:
                    result = response.json()
                    cid = result.get('IpfsHash')
                    
                    logger.info(f"Successfully pinned file to IPFS: {cid}")
                    
                    return {
                        'success': True,
                        'cid': cid,
                        'url': f"{self.gateway_url}/ipfs/{cid}",
                        'size': result.get('PinSize', 0),
                        'timestamp': result.get('Timestamp'),
                        'pinned': True,
                        'filename': filename
                    }
                else:
                    error_msg = f"Failed to pin file: {response.status_code if response else 'unknown'}"
                    if response:
                        try:
                            error_detail = response.json()
                            error_msg += f" - {error_detail}"
                        except:
                            error_msg += f" - {response.text}"
                    
                    logger.error(error_msg)
                    return None
                    
        except Exception as e:
            logger.error(f"Failed to pin file to IPFS: {e}")
            return None
    
    async def get_pinned_files(self, limit: int = 10, offset: int = 0) -> Optional[Dict[str, Any]]:
        """获取已固定的文件列表
        
        Args:
            limit: 返回结果数量限制
            offset: 偏移量
            
        Returns:
            固定文件列表
        """
        try:
            headers = self._get_headers()
            
            params = {
                'pageLimit': limit,
                'pageOffset': offset
            }
            
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await self._retry_request(
                    client.get,
                    f"{self.base_url}/data/pinList",
                    headers=headers,
                    params=params
                )
                
                if response and response.status_code == 200:
                    result = response.json()
                    logger.info(f"Retrieved {len(result.get('rows', []))} pinned files")
                    return result
                else:
                    logger.error(f"Failed to get pinned files: {response.status_code if response else 'unknown'}")
                    return None
                    
        except Exception as e:
            logger.error(f"Failed to get pinned files: {e}")
            return None
    
    async def unpin_file(self, cid: str) -> bool:
        """取消固定文件
        
        Args:
            cid: 要取消固定的CID
            
        Returns:
            是否成功取消固定
        """
        try:
            headers = self._get_headers()
            
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await self._retry_request(
                    client.delete,
                    f"{self.base_url}/pinning/unpin/{cid}",
                    headers=headers
                )
                
                if response and response.status_code == 200:
                    logger.info(f"Successfully unpinned CID: {cid}")
                    return True
                else:
                    logger.error(f"Failed to unpin CID {cid}: {response.status_code if response else 'unknown'}")
                    return False
                    
        except Exception as e:
            logger.error(f"Failed to unpin CID {cid}: {e}")
            return False
    
    async def get_file_by_cid(self, cid: str) -> Optional[bytes]:
        """通过CID获取文件内容
        
        Args:
            cid: IPFS CID
            
        Returns:
            文件内容（字节）
        """
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await self._retry_request(
                    client.get,
                    f"{self.gateway_url}/ipfs/{cid}"
                )
                
                if response and response.status_code == 200:
                    logger.info(f"Successfully retrieved file with CID: {cid}")
                    return response.content
                else:
                    logger.error(f"Failed to retrieve file with CID {cid}: {response.status_code if response else 'unknown'}")
                    return None
                    
        except Exception as e:
            logger.error(f"Failed to retrieve file with CID {cid}: {e}")
            return None
    
    def get_service_info(self) -> Dict[str, Any]:
        """获取服务信息"""
        return {
            'service': 'Pinata IPFS',
            'base_url': self.base_url,
            'gateway_url': self.gateway_url,
            'authentication': 'JWT' if self.jwt_token else 'API Key',
            'max_retries': self.max_retries,
            'retry_delay': self.retry_delay,
            'timeout': self.timeout,
            'configured': bool(self.jwt_token or (self.api_key and self.secret_key))
        }

# 全局Pinata服务实例
_pinata_service = None

def get_pinata_service() -> PinataService:
    """获取Pinata服务实例"""
    global _pinata_service
    if _pinata_service is None:
        _pinata_service = PinataService()
    return _pinata_service

# 创建全局实例供导入使用
pinata_service = get_pinata_service()