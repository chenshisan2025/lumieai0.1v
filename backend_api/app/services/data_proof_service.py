import asyncio
import json
import logging
import time
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
import os
import base64
import hashlib

from app.services.pinata_service import pinata_service
from app.services.kms_service import kms_service
from app.services.bscscan_service import bscscan_service
from app.core.config import settings
from app.core.logging import get_logger, log_operation
from app.core.exceptions import (
    DataProofException,
    IPFSException,
    BlockchainException,
    EncryptionException,
    ResourceNotFoundException,
    BusinessLogicException
)

logger = logging.getLogger(__name__)

class DataProofEncryption:
    """数据证明专用加密服务
    
    专门用于加密每日摘要包，确保解密流程在受控环境内可复现
    """
    
    def __init__(self):
        self.kms_service = kms_service
        self.key = self._get_encryption_key()
        self.aesgcm = AESGCM(self.key)
    
    def _get_encryption_key(self) -> bytes:
        """获取加密密钥（通过KMS服务）"""
        try:
            return self.kms_service.get_encryption_key()
        except Exception as e:
            logger.error(f"Failed to get encryption key from KMS: {e}")
            # 回退到配置文件中的密钥
            if settings.AES_ENCRYPTION_KEY:
                try:
                    return base64.b64decode(settings.AES_ENCRYPTION_KEY)
                except Exception as decode_error:
                    logger.error(f"Failed to decode AES key from config: {decode_error}")
            
            # 最后回退到生成临时密钥（仅用于开发）
            logger.warning("Using temporary encryption key as fallback - NOT SUITABLE FOR PRODUCTION")
            return AESGCM.generate_key(bit_length=256)
    
    def encrypt_daily_summary(self, summary_data: Dict[str, Any]) -> Dict[str, Any]:
        """加密每日摘要包
        
        Args:
            summary_data: 每日摘要数据
            
        Returns:
            包含加密数据和元数据的字典
        """
        try:
            # 添加时间戳和版本信息
            enhanced_data = {
                'summary': summary_data,
                'encrypted_at': datetime.now(timezone.utc).isoformat(),
                'version': '1.0',
                'data_type': 'daily_summary'
            }
            
            # 转换为JSON字符串
            json_str = json.dumps(enhanced_data, ensure_ascii=False, separators=(',', ':'))
            
            # 生成随机nonce
            nonce = os.urandom(12)  # 96位nonce用于GCM
            
            # 加密数据
            ciphertext = self.aesgcm.encrypt(nonce, json_str.encode('utf-8'), None)
            
            # 计算数据哈希（用于验证）
            data_hash = hashlib.sha256(json_str.encode('utf-8')).hexdigest()
            
            # 获取KMS密钥信息
            kms_info = self.kms_service.get_key_info()
            
            return {
                'encrypted_data': base64.b64encode(ciphertext).decode('utf-8'),
                'nonce': base64.b64encode(nonce).decode('utf-8'),
                'algorithm': 'AES-256-GCM',
                'data_hash': data_hash,
                'kms_enabled': kms_info['kms_enabled'],
                'key_source': kms_info['key_source'],
                'encryption_metadata': {
                    'encrypted_at': enhanced_data['encrypted_at'],
                    'version': enhanced_data['version'],
                    'data_type': enhanced_data['data_type']
                }
            }
        except Exception as e:
            logger.error(f"Daily summary encryption failed: {e}")
            raise
    
    def decrypt_daily_summary(self, encrypted_data: str, nonce: str, expected_hash: Optional[str] = None) -> Dict[str, Any]:
        """解密每日摘要包
        
        Args:
            encrypted_data: base64编码的加密数据
            nonce: base64编码的nonce
            expected_hash: 可选的预期数据哈希（用于验证）
            
        Returns:
            解密后的原始数据
        """
        try:
            # 解码base64数据
            ciphertext = base64.b64decode(encrypted_data)
            nonce_bytes = base64.b64decode(nonce)
            
            # 解密数据
            plaintext = self.aesgcm.decrypt(nonce_bytes, ciphertext, None)
            decrypted_str = plaintext.decode('utf-8')
            
            # 验证数据哈希（如果提供）
            if expected_hash:
                actual_hash = hashlib.sha256(decrypted_str.encode('utf-8')).hexdigest()
                if actual_hash != expected_hash:
                    raise ValueError(f"Data integrity check failed: expected {expected_hash}, got {actual_hash}")
            
            # 解析JSON数据
            decrypted_data = json.loads(decrypted_str)
            
            logger.info(f"Successfully decrypted daily summary from {decrypted_data.get('encrypted_at', 'unknown time')}")
            
            return decrypted_data
        except Exception as e:
            logger.error(f"Daily summary decryption failed: {e}")
            raise
    
    def get_decryption_info(self) -> Dict[str, Any]:
        """获取解密环境信息（用于受控环境复现）"""
        kms_info = self.kms_service.get_key_info()
        
        return {
            'encryption_algorithm': 'AES-256-GCM',
            'key_length': 256,
            'nonce_length': 96,
            'kms_enabled': kms_info['kms_enabled'],
            'key_source': kms_info['key_source'],
            'environment_requirements': {
                'python_cryptography': 'cryptography>=3.0.0',
                'key_management': 'AWS KMS or local key file',
                'access_control': 'Controlled environment with proper credentials'
            },
            'decryption_steps': [
                '1. Obtain encryption key from KMS or secure storage',
                '2. Decode base64 encrypted data and nonce',
                '3. Initialize AES-256-GCM with the key',
                '4. Decrypt using nonce and ciphertext',
                '5. Verify data integrity using SHA-256 hash',
                '6. Parse JSON to retrieve original data'
            ]
        }

class DataProofService:
    """数据证明服务
    
    整合Pinata IPFS和加密功能，提供完整的数据证明解决方案
    """
    
    def __init__(self):
        self.pinata_service = pinata_service
        self.encryption_service = DataProofEncryption()
        self.proof_records = []  # 在实际应用中应该使用数据库
        self.logger = get_logger("data_proof_service")
    
    @log_operation("create_daily_proof")
    async def create_daily_proof(self, daily_data: Dict[str, Any], encrypt: bool = True) -> Optional[Dict[str, Any]]:
        """创建每日数据证明
        
        Args:
            daily_data: 每日数据
            encrypt: 是否加密数据（默认为True）
            
        Returns:
            包含CID、加密信息和证明记录的字典
        """
        try:
            self.logger.info(f"Creating daily proof for data: {len(str(daily_data))} bytes")
            
            # 准备元数据
            date_str = datetime.now(timezone.utc).strftime('%Y-%m-%d')
            metadata = {
                'name': f'Daily Health Summary - {date_str}',
                'description': f'Encrypted daily health data summary for {date_str}',
                'date': date_str,
                'data_type': 'daily_summary',
                'encrypted': encrypt,
                'created_at': datetime.now(timezone.utc).isoformat()
            }
            
            if encrypt:
                try:
                    # 加密数据
                    encrypted_result = self.encryption_service.encrypt_daily_summary(daily_data)
                    
                    # 准备上传的数据包
                    upload_data = {
                        'encrypted_data': encrypted_result['encrypted_data'],
                        'nonce': encrypted_result['nonce'],
                        'algorithm': encrypted_result['algorithm'],
                        'data_hash': encrypted_result['data_hash'],
                        'encryption_metadata': encrypted_result['encryption_metadata'],
                        'proof_metadata': metadata
                    }
                    
                    self.logger.info("Data encrypted successfully")
                except Exception as e:
                    raise EncryptionException(f"Failed to encrypt daily data: {str(e)}", "encrypt")
                
                try:
                    # 上传到Pinata
                    pinata_result = await self.pinata_service.pin_json_to_ipfs(
                        upload_data, 
                        metadata
                    )
                    
                    if not pinata_result or not pinata_result.get('success'):
                        raise IPFSException("Failed to get success response from Pinata upload")
                    
                    self.logger.info(f"Data uploaded to IPFS: {pinata_result['cid']}")
                except IPFSException:
                    raise
                except Exception as e:
                    raise IPFSException(f"Failed to upload to IPFS: {str(e)}")
                
                try:
                    # 创建证明记录
                    proof_record = {
                        'id': f"proof_{int(time.time())}",
                        'date': date_str,
                        'cid': pinata_result['cid'],
                        'url': pinata_result['url'],
                        'encrypted': True,
                        'nonce': encrypted_result['nonce'],
                        'data_hash': encrypted_result['data_hash'],
                        'algorithm': encrypted_result['algorithm'],
                        'size': pinata_result.get('size', 0),
                        'created_at': metadata['created_at'],
                        'kms_enabled': encrypted_result['kms_enabled'],
                        'key_source': encrypted_result['key_source']
                    }
                    
                    # 保存记录（在实际应用中应该保存到数据库）
                    self.proof_records.append(proof_record)
                    
                    self.logger.info(f"Successfully created encrypted daily proof: {pinata_result['cid']}")
                    
                    return {
                        'success': True,
                        'proof_record': proof_record,
                        'pinata_result': pinata_result
                    }
                except Exception as e:
                    raise DataProofException(f"Failed to create proof record: {str(e)}", "create_record")
            else:
                try:
                    # 未加密上传
                    upload_data = {
                        'daily_data': daily_data,
                        'proof_metadata': metadata
                    }
                    
                    pinata_result = await self.pinata_service.pin_json_to_ipfs(
                        upload_data,
                        metadata
                    )
                    
                    if not pinata_result or not pinata_result.get('success'):
                        raise IPFSException("Failed to get success response from Pinata upload")
                    
                    self.logger.info(f"Data uploaded to IPFS: {pinata_result['cid']}")
                except IPFSException:
                    raise
                except Exception as e:
                    raise IPFSException(f"Failed to upload to IPFS: {str(e)}")
                
                try:
                    proof_record = {
                        'id': f"proof_{int(time.time())}",
                        'date': date_str,
                        'cid': pinata_result['cid'],
                        'url': pinata_result['url'],
                        'encrypted': False,
                        'size': pinata_result.get('size', 0),
                        'created_at': metadata['created_at']
                    }
                    
                    self.proof_records.append(proof_record)
                    
                    self.logger.info(f"Successfully created unencrypted daily proof: {pinata_result['cid']}")
                    
                    return {
                        'success': True,
                        'proof_record': proof_record,
                        'pinata_result': pinata_result
                    }
                except Exception as e:
                    raise DataProofException(f"Failed to create proof record: {str(e)}", "create_record")
                    
        except (DataProofException, IPFSException, EncryptionException) as e:
            raise e
        except Exception as e:
            self.logger.error(f"Unexpected error creating daily proof: {str(e)}")
            raise DataProofException(f"Failed to create daily proof: {str(e)}", "create_daily_proof")
    
    async def verify_daily_proof(self, cid: str, expected_date: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """验证每日数据证明
        
        Args:
            cid: IPFS CID
            expected_date: 可选的预期日期
            
        Returns:
            验证结果
        """
        try:
            # 从Pinata获取数据
            data_content = await self.pinata_service.get_file_by_cid(cid)
            
            if not data_content:
                return {
                    'success': False,
                    'error': 'Failed to retrieve data from IPFS'
                }
            
            # 解析数据
            try:
                data = json.loads(data_content.decode('utf-8'))
            except json.JSONDecodeError as e:
                return {
                    'success': False,
                    'error': f'Invalid JSON data: {e}'
                }
            
            # 检查是否为加密数据
            if 'encrypted_data' in data and 'nonce' in data:
                # 验证加密数据
                try:
                    decrypted_data = self.encryption_service.decrypt_daily_summary(
                        data['encrypted_data'],
                        data['nonce'],
                        data.get('data_hash')
                    )
                    
                    verification_result = {
                        'success': True,
                        'cid': cid,
                        'encrypted': True,
                        'data_verified': True,
                        'decrypted_data': decrypted_data,
                        'encryption_info': {
                            'algorithm': data.get('algorithm'),
                            'data_hash': data.get('data_hash'),
                            'encrypted_at': data.get('encryption_metadata', {}).get('encrypted_at')
                        }
                    }
                    
                    # 验证日期（如果提供）
                    if expected_date:
                        actual_date = decrypted_data.get('summary', {}).get('date')
                        if actual_date != expected_date:
                            verification_result['date_mismatch'] = {
                                'expected': expected_date,
                                'actual': actual_date
                            }
                    
                    return verification_result
                    
                except Exception as decrypt_error:
                    return {
                        'success': False,
                        'error': f'Decryption failed: {decrypt_error}'
                    }
            else:
                # 未加密数据
                return {
                    'success': True,
                    'cid': cid,
                    'encrypted': False,
                    'data_verified': True,
                    'data': data
                }
                
        except Exception as e:
            logger.error(f"Failed to verify daily proof {cid}: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_proof_records(self, date_filter: Optional[str] = None) -> List[Dict[str, Any]]:
        """获取证明记录列表
        
        Args:
            date_filter: 可选的日期过滤器
            
        Returns:
            证明记录列表
        """
        if date_filter:
            return [record for record in self.proof_records if record.get('date') == date_filter]
        return self.proof_records.copy()
    
    def get_decryption_guide(self) -> Dict[str, Any]:
        """获取解密指南（用于受控环境复现）"""
        return {
            'service_info': {
                'name': 'LumieAI Data Proof Service',
                'version': '1.0',
                'description': 'Encrypted daily health data proof system'
            },
            'encryption_info': self.encryption_service.get_decryption_info(),
            'ipfs_info': self.pinata_service.get_service_info(),
            'reproduction_requirements': {
                'environment': 'Controlled secure environment',
                'credentials': 'Valid KMS access or encryption key',
                'network': 'Access to Pinata IPFS gateway',
                'software': 'Python 3.8+ with cryptography library'
            },
            'bscscan_info': {
                'service': 'BSC blockchain verification',
                'purpose': 'Transaction and contract verification'
            }
        }

# 全局数据证明服务实例
_data_proof_service = None

def get_data_proof_service() -> DataProofService:
    """获取数据证明服务实例"""
    global _data_proof_service
    if _data_proof_service is None:
        _data_proof_service = DataProofService()
    return _data_proof_service

# 创建全局实例供导入使用
data_proof_service = get_data_proof_service()