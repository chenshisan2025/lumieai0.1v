from pydantic_settings import BaseSettings
from typing import List, Optional
import os

class Settings(BaseSettings):
    model_config = {"extra": "ignore", "env_file": ".env", "case_sensitive": True}
    """Application settings"""
    
    # Environment
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    
    # API
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "LUMIEAI API"
    
    # Security
    SECRET_KEY: str = "your-secret-key-here"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # CORS
    ALLOWED_HOSTS: str = "*"
    
    # Database
    DATABASE_URL: str = "postgresql://user:password@localhost/lumieai"
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379"
    
    # Blockchain
    BSC_RPC_URL: str = "https://data-seed-prebsc-1-s1.binance.org:8545/"
    BSC_API_KEY: Optional[str] = None
    SUBSCRIPTION_MANAGER_ADDRESS: str = "0x9c7920f113B27De6a57bbCF53D6111cbA5532498"
    
    # Subscription Plan (Default)
    DEFAULT_PLAN_ID: int = 1
    DEFAULT_PLAN_PRICE: str = "0.1"  # BNB
    DEFAULT_PLAN_PRICE_WEI: str = "100000000000000000"  # 0.1 BNB in wei
    DEFAULT_PLAN_DURATION: int = 30  # days
    DEFAULT_PLAN_PERIOD_DAYS: int = 30  # days
    SUBSCRIPTION_PLAN_ID: int = 1
    SUBSCRIPTION_PLAN_PRICE: str = "0.1"  # BNB
    SUBSCRIPTION_PLAN_DURATION: int = 30  # days
    
    # OpenAI
    OPENAI_API_KEY: Optional[str] = None
    
    # IPFS
    IPFS_API_URL: str = "http://localhost:5001"
    IPFS_GATEWAY_URL: str = "http://localhost:8080"
    IPFS_GATEWAY: str = "https://gateway.pinata.cloud/ipfs/"
    
    # Data Encryption
    AES_ENCRYPTION_KEY: Optional[str] = None  # Base64 encoded AES-256 key
    ENCRYPTION_ENABLED: bool = True
    
    # KMS Configuration
    KMS_ENABLED: bool = False
    AWS_KMS_KEY_ID: Optional[str] = None
    AWS_ACCESS_KEY_ID: Optional[str] = None
    AWS_SECRET_ACCESS_KEY: Optional[str] = None
    AWS_REGION: str = "us-east-1"
    
    # Privacy & Compliance
    PRIVACY_MODE: bool = True
    DATA_RETENTION_DAYS: int = 90
    AUDIT_LOGGING: bool = True
    LOG_HEALTH_DATA: bool = False  # Never log raw health data


settings = Settings()