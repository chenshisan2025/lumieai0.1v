import base64
import os
import time
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
import secrets
from typing import Optional, Dict, Any

from ..core.logging import get_logger, log_operation
from ..core.exceptions import (
    EncryptionException,
    ValidationException,
    ConfigurationException
)
from ..core.config import settings

# Initialize logger first
logger = get_logger("kms_service")

try:
    import boto3
    from botocore.exceptions import ClientError, NoCredentialsError
    AWS_AVAILABLE = True
except ImportError:
    logger.warning("boto3 not available, AWS KMS features disabled")
    AWS_AVAILABLE = False
    ClientError = Exception
    NoCredentialsError = Exception

class KMSService:
    """密钥管理服务 (Key Management Service)"""
    
    def __init__(self):
        self.logger = get_logger("kms_service")
        self.kms_enabled = getattr(settings, 'KMS_ENABLED', False)
        self.aws_kms_client = None
        self.local_keys = {}
        
        if self.kms_enabled and AWS_AVAILABLE:
            self._init_aws_kms()
        else:
            self.logger.info("Using local key management (development mode)")
    
    def _init_aws_kms(self):
        """初始化AWS KMS客户端"""
        try:
            self.aws_kms_client = boto3.client(
                'kms',
                region_name=getattr(settings, 'AWS_REGION', 'us-east-1'),
                aws_access_key_id=getattr(settings, 'AWS_ACCESS_KEY_ID', None),
                aws_secret_access_key=getattr(settings, 'AWS_SECRET_ACCESS_KEY', None)
            )
            
            # 测试连接
            self.aws_kms_client.list_keys(Limit=1)
            self.logger.info("AWS KMS client initialized successfully")
            
        except (ClientError, NoCredentialsError) as e:
             self.logger.error(f"Failed to initialize AWS KMS: {e}")
             self.aws_kms_client = None
             self.kms_enabled = False
    
    def generate_data_key(self, key_id: str = None, key_spec: str = 'AES_256') -> Optional[Dict[str, Any]]:
        """生成数据加密密钥
        
        Args:
            key_id: AWS KMS密钥ID（如果使用AWS KMS）
            key_spec: 密钥规格，默认AES_256
            
        Returns:
            包含明文密钥和加密密钥的字典
        """
        if self.kms_enabled and self.aws_kms_client:
            return self._generate_aws_data_key(key_id, key_spec)
        else:
            return self._generate_local_data_key(key_spec)
    
    def _generate_aws_data_key(self, key_id: str, key_spec: str) -> Optional[Dict[str, Any]]:
        """使用AWS KMS生成数据密钥"""
        try:
            if not key_id:
                key_id = getattr(settings, 'AWS_KMS_KEY_ID', None)
                if not key_id:
                    self.logger.error("AWS_KMS_KEY_ID not configured")
                    return None
            
            response = self.aws_kms_client.generate_data_key(
                KeyId=key_id,
                KeySpec=key_spec
            )
            
            return {
                'plaintext_key': response['Plaintext'],
                'encrypted_key': response['CiphertextBlob'],
                'key_id': key_id,
                'source': 'aws_kms'
            }
            
        except ClientError as e:
            self.logger.error(f"Failed to generate AWS KMS data key: {e}")
            return None
    
    def _generate_local_data_key(self, key_spec: str) -> Dict[str, Any]:
        """生成本地数据密钥（开发模式）"""
        try:
            if key_spec == 'AES_256':
                key = AESGCM.generate_key(bit_length=256)
            elif key_spec == 'AES_128':
                key = AESGCM.generate_key(bit_length=128)
            else:
                raise ValueError(f"Unsupported key spec: {key_spec}")
            
            # 在本地模式下，我们使用一个固定的"主密钥"来"加密"数据密钥
            master_key = self._get_local_master_key()
            aesgcm = AESGCM(master_key)
            nonce = os.urandom(12)
            encrypted_key = aesgcm.encrypt(nonce, key, None)
            
            # 存储nonce和加密密钥
            encrypted_blob = nonce + encrypted_key
            
            return {
                'plaintext_key': key,
                'encrypted_key': encrypted_blob,
                'key_id': 'local-master-key',
                'source': 'local'
            }
            
        except Exception as e:
            self.logger.error(f"Failed to generate local data key: {e}")
            raise
    
    def _get_local_master_key(self) -> bytes:
        """获取本地主密钥"""
        try:
            # 在生产环境中，这应该从安全的地方获取
            # 这里仅用于开发和测试
            master_key_env = os.getenv('LOCAL_MASTER_KEY')
            if master_key_env:
                self.logger.debug("Loading master key from environment")
                try:
                    return base64.b64decode(master_key_env)
                except Exception:
                    pass
            
            # 生成一个临时主密钥（仅用于开发）
            self.logger.warning("Using temporary master key for development")
            return AESGCM.generate_key(bit_length=256)
        except Exception as e:
            self.logger.error(f"Failed to get master key: {str(e)}")
            raise ConfigurationException(f"Failed to initialize master key: {str(e)}")
    
    def decrypt_data_key(self, encrypted_key: bytes, key_id: str = None) -> Optional[bytes]:
        """解密数据密钥
        
        Args:
            encrypted_key: 加密的数据密钥
            key_id: 密钥ID
            
        Returns:
            解密后的明文密钥
        """
        if self.kms_enabled and self.aws_kms_client:
            return self._decrypt_aws_data_key(encrypted_key)
        else:
            return self._decrypt_local_data_key(encrypted_key)
    
    def _decrypt_aws_data_key(self, encrypted_key: bytes) -> Optional[bytes]:
        """使用AWS KMS解密数据密钥"""
        try:
            response = self.aws_kms_client.decrypt(
                CiphertextBlob=encrypted_key
            )
            return response['Plaintext']
            
        except ClientError as e:
            self.logger.error(f"Failed to decrypt AWS KMS data key: {e}")
            return None
    
    def _decrypt_local_data_key(self, encrypted_blob: bytes) -> Optional[bytes]:
        """解密本地数据密钥"""
        try:
            # 提取nonce和加密数据
            nonce = encrypted_blob[:12]
            encrypted_key = encrypted_blob[12:]
            
            # 使用主密钥解密
            master_key = self._get_local_master_key()
            aesgcm = AESGCM(master_key)
            plaintext_key = aesgcm.decrypt(nonce, encrypted_key, None)
            
            return plaintext_key
            
        except Exception as e:
            self.logger.error(f"Failed to decrypt local data key: {e}")
            return None
    
    def get_encryption_key(self) -> bytes:
        """获取用于数据加密的密钥
        
        Returns:
            AES-256密钥
        """
        # 首先尝试从环境变量获取
        if hasattr(settings, 'AES_ENCRYPTION_KEY') and settings.AES_ENCRYPTION_KEY:
            try:
                return base64.b64decode(settings.AES_ENCRYPTION_KEY)
            except Exception as e:
                self.logger.warning(f"Failed to decode AES_ENCRYPTION_KEY: {e}")
        
        # 如果启用了KMS，生成新的数据密钥
        if self.kms_enabled:
            data_key = self.generate_data_key()
            if data_key:
                # 在实际应用中，你可能想要存储encrypted_key以便后续使用
                self.logger.info("Generated new data key using KMS")
                return data_key['plaintext_key']
        
        # 回退到生成临时密钥
        self.logger.warning("Using temporary encryption key for development")
        return AESGCM.generate_key(bit_length=256)
    
    def rotate_key(self, old_key_id: str = None) -> Optional[Dict[str, Any]]:
        """轮换加密密钥
        
        Args:
            old_key_id: 旧密钥ID
            
        Returns:
            新密钥信息
        """
        self.logger.info("Starting key rotation")
        
        # 生成新的数据密钥
        new_key = self.generate_data_key()
        if not new_key:
            self.logger.error("Failed to generate new key for rotation")
            return None
        
        # 在实际应用中，这里应该:
        # 1. 使用新密钥重新加密所有数据
        # 2. 更新密钥引用
        # 3. 安全地删除旧密钥
        
        # 将二进制数据转换为base64字符串以便JSON序列化
        rotation_info = {
            'key_id': new_key['key_id'],
            'source': new_key['source'],
            'plaintext_key_b64': base64.b64encode(new_key['plaintext_key']).decode('utf-8'),
            'encrypted_key_b64': base64.b64encode(new_key['encrypted_key']).decode('utf-8'),
            'rotation_timestamp': time.time()
        }
        
        self.logger.info("Key rotation completed")
        return rotation_info
    
    def get_key_info(self) -> Dict[str, Any]:
        """获取密钥管理信息"""
        return {
            'kms_enabled': self.kms_enabled,
            'aws_kms_available': self.aws_kms_client is not None,
            'encryption_enabled': getattr(settings, 'ENCRYPTION_ENABLED', True),
            'key_source': 'aws_kms' if self.kms_enabled else 'local',
            'aws_region': getattr(settings, 'AWS_REGION', 'us-east-1') if self.kms_enabled else None
        }

# 全局KMS服务实例
_kms_service = None

def get_kms_service() -> KMSService:
    """获取KMS服务实例"""
    global _kms_service
    if _kms_service is None:
        _kms_service = KMSService()
    return _kms_service

# 创建全局实例供导入使用
kms_service = get_kms_service()