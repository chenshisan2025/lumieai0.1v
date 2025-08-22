import json
import logging
import time
from typing import Dict, Any, Optional, Union
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.backends import default_backend
import os
import base64
import httpx
from ..core.config import settings
from .kms_service import get_kms_service, KMSService

logger = logging.getLogger(__name__)

class EncryptionService:
    """AES-256-GCM加密服务，集成KMS密钥管理"""
    
    def __init__(self):
        self.kms_service = get_kms_service()
        self.key = self._get_encryption_key()
        self.aesgcm = AESGCM(self.key)
        self.current_key_info = None
    
    def _get_encryption_key(self) -> bytes:
        """获取加密密钥（通过KMS服务）"""
        try:
            return self.kms_service.get_encryption_key()
        except Exception as e:
            logger.error(f"Failed to get encryption key from KMS: {e}")
            # 回退到生成临时密钥
            logger.warning("Using temporary encryption key as fallback")
            return AESGCM.generate_key(bit_length=256)
    
    def encrypt_data(self, data: str) -> Dict[str, str]:
        """加密数据
        
        Args:
            data: 要加密的字符串数据
            
        Returns:
            包含加密数据和nonce的字典
        """
        try:
            # 生成随机nonce
            nonce = os.urandom(12)  # 96位nonce用于GCM
            
            # 加密数据
            ciphertext = self.aesgcm.encrypt(nonce, data.encode('utf-8'), None)
            
            # 获取KMS密钥信息
            kms_info = self.kms_service.get_key_info()
            
            return {
                'encrypted_data': base64.b64encode(ciphertext).decode('utf-8'),
                'nonce': base64.b64encode(nonce).decode('utf-8'),
                'algorithm': 'AES-256-GCM',
                'kms_enabled': kms_info['kms_enabled'],
                'key_source': kms_info['key_source']
            }
        except Exception as e:
            logger.error(f"Encryption failed: {e}")
            raise
    
    def decrypt_data(self, encrypted_data: str, nonce: str) -> str:
        """解密数据
        
        Args:
            encrypted_data: base64编码的加密数据
            nonce: base64编码的nonce
            
        Returns:
            解密后的原始字符串
        """
        try:
            # 解码base64数据
            ciphertext = base64.b64decode(encrypted_data)
            nonce_bytes = base64.b64decode(nonce)
            
            # 解密数据
            plaintext = self.aesgcm.decrypt(nonce_bytes, ciphertext, None)
            
            return plaintext.decode('utf-8')
        except Exception as e:
            logger.error(f"Decryption failed: {e}")
            raise

class IPFSService:
    """IPFS服务类，支持数据加密"""
    
    def __init__(self):
        self.client = None
        self.encryption_service = EncryptionService()
        self.api_url = getattr(settings, 'IPFS_API_URL', 'http://localhost:5001')
        self.gateway_url = getattr(settings, 'IPFS_GATEWAY_URL', 'http://localhost:8080')
        self.connect()
    
    def connect(self):
        """连接到IPFS节点"""
        try:
            # 测试IPFS连接
            response = httpx.post(f"{self.api_url}/api/v0/version", timeout=5.0)
            if response.status_code == 200:
                version_info = response.json()
                logger.info(f"Successfully connected to IPFS version {version_info['Version']}")
                self.client = True
            else:
                logger.error(f"IPFS connection failed with status {response.status_code}")
                self.client = None
        except Exception as e:
            logger.error(f"Failed to connect to IPFS: {e}")
            self.client = None
    
    def is_connected(self) -> bool:
        """检查IPFS连接状态"""
        try:
            if not self.client:
                return False
            response = httpx.post(f"{self.api_url}/api/v0/version", timeout=5.0)
            return response.status_code == 200
        except Exception as e:
            logger.error(f"IPFS connection check failed: {e}")
            return False
    
    async def upload_json_encrypted(self, data: Dict[str, Any], filename: str = "data.json") -> Optional[Dict[str, Any]]:
        """加密并上传JSON数据到IPFS
        
        Args:
            data: 要上传的JSON数据
            filename: 文件名
            
        Returns:
            包含CID、URL和加密信息的字典
        """
        if not self.client:
            logger.error("IPFS client not connected")
            return None
        
        try:
            # 1. 将数据转换为JSON字符串
            json_str = json.dumps(data, ensure_ascii=False, indent=2)
            
            # 2. 加密数据
            encrypted_result = self.encryption_service.encrypt_data(json_str)
            
            # 3. 准备上传的加密数据包
            encrypted_package = {
                'encrypted_data': encrypted_result['encrypted_data'],
                'nonce': encrypted_result['nonce'],
                'algorithm': encrypted_result['algorithm'],
                'metadata': {
                    'original_filename': filename,
                    'content_type': 'application/json',
                    'encrypted_at': str(int(time.time())),
                    'encryption_version': '1.0'
                }
            }
            
            # 4. 上传加密数据包到IPFS
            encrypted_json = json.dumps(encrypted_package, ensure_ascii=False)
            
            async with httpx.AsyncClient() as client:
                files = {'file': (filename, encrypted_json.encode('utf-8'), 'application/json')}
                response = await client.post(
                    f"{self.api_url}/api/v0/add",
                    files=files,
                    params={'pin': 'true'}
                )
            
            if response.status_code == 200:
                result = response.json()
                cid = result['Hash']
                
                logger.info(f"Successfully uploaded encrypted data to IPFS: {cid}")
                
                return {
                    'success': True,
                    'cid': cid,
                    'url': f"{self.gateway_url}/ipfs/{cid}",
                    'size': result.get('Size', 0),
                    'encrypted': True,
                    'encryption_info': {
                        'algorithm': encrypted_result['algorithm'],
                        'nonce': encrypted_result['nonce']
                    }
                }
            else:
                logger.error(f"IPFS upload failed with status {response.status_code}: {response.text}")
                return None
                
        except Exception as e:
            logger.error(f"Failed to upload encrypted JSON to IPFS: {e}")
            return None
    
    async def upload_json(self, data: Dict[str, Any], filename: str = "data.json") -> Optional[Dict[str, Any]]:
        """上传JSON数据到IPFS（未加密，向后兼容）
        
        Args:
            data: 要上传的JSON数据
            filename: 文件名
            
        Returns:
            包含CID和URL的字典
        """
        if not self.client:
            logger.error("IPFS client not connected")
            return None
        
        try:
            # 将数据转换为JSON字符串
            json_str = json.dumps(data, ensure_ascii=False, indent=2)
            
            # Upload to IPFS using HTTP API
            async with httpx.AsyncClient() as client:
                files = {'file': (filename, json_str.encode('utf-8'), 'application/json')}
                response = await client.post(
                    f"{self.api_url}/api/v0/add",
                    files=files,
                    params={'pin': 'true'}
                )
            
            if response.status_code == 200:
                result = response.json()
                cid = result['Hash']
                
                logger.info(f"Successfully uploaded to IPFS: {cid}")
                
                return {
                    'success': True,
                    'cid': cid,
                    'url': f"{self.gateway_url}/ipfs/{cid}",
                    'size': result.get('Size', 0),
                    'encrypted': False
                }
            else:
                logger.error(f"IPFS upload failed with status {response.status_code}: {response.text}")
                return None
                
        except Exception as e:
            logger.error(f"Failed to upload JSON to IPFS: {e}")
            return None
    
    async def download_json_encrypted(self, cid: str, nonce: str) -> Optional[Dict[str, Any]]:
        """从IPFS下载并解密JSON数据
        
        Args:
            cid: IPFS CID
            nonce: 解密所需的nonce
            
        Returns:
            解密后的JSON数据
        """
        if not self.client:
            logger.error("IPFS client not connected")
            return None
        
        try:
            # 从IPFS下载加密数据包 - 使用API而不是网关
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.api_url}/api/v0/cat",
                    params={'arg': cid}
                )
            
            if response.status_code == 200:
                # 解析加密数据包
                encrypted_package = response.json()
                
                # 解密数据 - 使用传入的nonce参数
                decrypted_data = self.encryption_service.decrypt_data(
                    encrypted_package['encrypted_data'],
                    nonce
                )
                
                # 解析原始JSON数据
                return json.loads(decrypted_data)
            else:
                logger.error(f"Failed to download from IPFS: {response.status_code}")
                return None
                
        except Exception as e:
            logger.error(f"Failed to download encrypted JSON from IPFS CID {cid}: {e}")
            return None
    
    async def download_json(self, cid: str) -> Optional[Dict[str, Any]]:
        """从IPFS下载JSON数据（未加密）
        
        Args:
            cid: IPFS CID
            
        Returns:
            JSON数据
        """
        if not self.client:
            logger.error("IPFS client not connected")
            return None
        
        try:
            # Download from IPFS - 使用API而不是网关
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.api_url}/api/v0/cat",
                    params={'arg': cid}
                )
            
            if response.status_code == 200:
                return response.json()
            else:
                logger.error(f"Failed to download from IPFS: {response.status_code}")
                return None
                
        except Exception as e:
            logger.error(f"Failed to download JSON from IPFS CID {cid}: {e}")
            return None
    
    async def pin_cid(self, cid: str) -> bool:
        """Pin CID到IPFS节点"""
        if not self.client:
            logger.error("IPFS client not connected")
            return False
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.api_url}/api/v0/pin/add",
                    params={'arg': cid}
                )
            
            if response.status_code == 200:
                logger.info(f"Successfully pinned CID: {cid}")
                return True
            else:
                logger.error(f"Failed to pin CID {cid}: {response.status_code}")
                return False
                
        except Exception as e:
            logger.error(f"Failed to pin CID {cid}: {e}")
            return False

    def get_node_info(self) -> Optional[Dict[str, Any]]:
        """获取IPFS节点信息"""
        try:
            response = httpx.get(f"{self.api_url}/api/v0/version", timeout=5.0)
            if response.status_code == 200:
                version_info = response.json()
                
                # 获取节点ID
                id_response = httpx.get(f"{self.api_url}/api/v0/id", timeout=5.0)
                node_id = None
                if id_response.status_code == 200:
                    node_id = id_response.json().get('ID')
                
                return {
                    'version': version_info.get('Version'),
                    'commit': version_info.get('Commit'),
                    'node_id': node_id,
                    'api_url': self.api_url,
                    'gateway_url': self.gateway_url
                }
            else:
                logger.error(f"Failed to get IPFS version: {response.status_code}")
                return None
                
        except Exception as e:
            logger.error(f"Failed to get IPFS node info: {e}")
            return None

# 全局IPFS服务实例
_ipfs_service = None

def get_ipfs_service() -> IPFSService:
    """获取IPFS服务实例"""
    global _ipfs_service
    if _ipfs_service is None:
        _ipfs_service = IPFSService()
    return _ipfs_service