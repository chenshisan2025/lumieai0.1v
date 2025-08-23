from typing import Optional, Dict, Any
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from datetime import datetime, timedelta
import os

from .logging import get_logger
from .config import settings

logger = get_logger("auth")

# JWT配置
SECRET_KEY = getattr(settings, 'SECRET_KEY', os.getenv('SECRET_KEY', 'your-secret-key-here'))
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

security = HTTPBearer()

class AuthService:
    """认证服务"""
    
    def __init__(self):
        self.secret_key = SECRET_KEY
        self.algorithm = ALGORITHM
        self.logger = get_logger("auth_service")
    
    def create_access_token(self, data: dict, expires_delta: Optional[timedelta] = None) -> str:
        """创建访问令牌"""
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, self.secret_key, algorithm=self.algorithm)
        return encoded_jwt
    
    def verify_token(self, token: str) -> Optional[Dict[str, Any]]:
        """验证令牌"""
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
            return payload
        except JWTError as e:
            self.logger.warning(f"Token verification failed: {e}")
            return None
    
    def get_user_from_token(self, token: str) -> Optional[Dict[str, Any]]:
        """从令牌获取用户信息"""
        payload = self.verify_token(token)
        if payload:
            user_id = payload.get("sub")
            if user_id:
                # 在实际应用中，这里应该从数据库获取用户信息
                return {
                    "id": user_id,
                    "username": payload.get("username"),
                    "email": payload.get("email"),
                    "is_active": True
                }
        return None

# 全局认证服务实例
auth_service = AuthService()

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> Dict[str, Any]:
    """获取当前用户（依赖注入）"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        token = credentials.credentials
        user = auth_service.get_user_from_token(token)
        if user is None:
            raise credentials_exception
        return user
    except Exception as e:
        logger.error(f"Authentication error: {e}")
        raise credentials_exception

async def get_current_active_user(
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    """获取当前活跃用户"""
    if not current_user.get("is_active", False):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
    return current_user

# 可选的用户依赖（不强制认证）
async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False))
) -> Optional[Dict[str, Any]]:
    """获取可选用户（不强制认证）"""
    if credentials is None:
        return None
    
    try:
        token = credentials.credentials
        user = auth_service.get_user_from_token(token)
        return user
    except Exception as e:
        logger.warning(f"Optional authentication failed: {e}")
        return None

def create_test_token(user_id: str = "test_user", username: str = "testuser") -> str:
    """创建测试令牌（仅用于开发和测试）"""
    token_data = {
        "sub": user_id,
        "username": username,
        "email": f"{username}@example.com"
    }
    return auth_service.create_access_token(token_data)

def get_auth_info() -> Dict[str, Any]:
    """获取认证配置信息"""
    return {
        "algorithm": ALGORITHM,
        "token_expire_minutes": ACCESS_TOKEN_EXPIRE_MINUTES,
        "secret_key_configured": bool(SECRET_KEY and SECRET_KEY != 'your-secret-key-here'),
        "auth_enabled": True
    }