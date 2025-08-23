import logging
import logging.config
import sys
from pathlib import Path
from typing import Dict, Any
import json
from datetime import datetime

from .config import settings


class JSONFormatter(logging.Formatter):
    """JSON格式化器，用于结构化日志输出"""
    
    def format(self, record: logging.LogRecord) -> str:
        log_entry = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
        }
        
        # 添加异常信息
        if record.exc_info:
            log_entry["exception"] = self.formatException(record.exc_info)
        
        # 添加额外的字段
        if hasattr(record, "user_id"):
            log_entry["user_id"] = record.user_id
        if hasattr(record, "request_id"):
            log_entry["request_id"] = record.request_id
        if hasattr(record, "operation"):
            log_entry["operation"] = record.operation
        if hasattr(record, "duration"):
            log_entry["duration_ms"] = record.duration
        
        return json.dumps(log_entry, ensure_ascii=False)


class SecurityFilter(logging.Filter):
    """安全过滤器，防止敏感信息泄露"""
    
    SENSITIVE_FIELDS = {
        "password", "token", "secret", "key", "authorization",
        "jwt", "api_key", "private_key", "access_token", "refresh_token"
    }
    
    def filter(self, record: logging.LogRecord) -> bool:
        # 检查消息中是否包含敏感信息
        message = record.getMessage().lower()
        for field in self.SENSITIVE_FIELDS:
            if field in message:
                # 替换敏感信息
                record.msg = self._mask_sensitive_data(record.msg)
                break
        return True
    
    def _mask_sensitive_data(self, message: str) -> str:
        """遮蔽敏感数据"""
        import re
        # 遮蔽JWT token
        message = re.sub(r'Bearer\s+[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+', 'Bearer ***', message)
        # 遮蔽API密钥
        message = re.sub(r'[A-Za-z0-9]{32,}', '***', message)
        return message


def setup_logging() -> None:
    """设置应用程序日志配置"""
    
    # 创建日志目录
    log_dir = Path("logs")
    log_dir.mkdir(exist_ok=True)
    
    # 日志配置
    config: Dict[str, Any] = {
        "version": 1,
        "disable_existing_loggers": False,
        "formatters": {
            "default": {
                "format": "%(asctime)s - %(name)s - %(levelname)s - %(message)s",
                "datefmt": "%Y-%m-%d %H:%M:%S",
            },
            "detailed": {
                "format": "%(asctime)s - %(name)s - %(levelname)s - %(module)s:%(funcName)s:%(lineno)d - %(message)s",
                "datefmt": "%Y-%m-%d %H:%M:%S",
            },
            "json": {
                "()": JSONFormatter,
            },
        },
        "filters": {
            "security": {
                "()": SecurityFilter,
            },
        },
        "handlers": {
            "console": {
                "class": "logging.StreamHandler",
                "level": "INFO" if settings.ENVIRONMENT == "production" else "DEBUG",
                "formatter": "default",
                "filters": ["security"],
                "stream": sys.stdout,
            },
            "file": {
                "class": "logging.handlers.RotatingFileHandler",
                "level": "INFO",
                "formatter": "detailed",
                "filters": ["security"],
                "filename": str(log_dir / "app.log"),
                "maxBytes": 10485760,  # 10MB
                "backupCount": 5,
                "encoding": "utf-8",
            },
            "error_file": {
                "class": "logging.handlers.RotatingFileHandler",
                "level": "ERROR",
                "formatter": "detailed",
                "filters": ["security"],
                "filename": str(log_dir / "error.log"),
                "maxBytes": 10485760,  # 10MB
                "backupCount": 5,
                "encoding": "utf-8",
            },
            "audit_file": {
                "class": "logging.handlers.RotatingFileHandler",
                "level": "INFO",
                "formatter": "json",
                "filename": str(log_dir / "audit.log"),
                "maxBytes": 10485760,  # 10MB
                "backupCount": 10,
                "encoding": "utf-8",
            },
        },
        "loggers": {
            "app": {
                "level": "DEBUG" if settings.DEBUG else "INFO",
                "handlers": ["console", "file", "error_file"],
                "propagate": False,
            },
            "app.audit": {
                "level": "INFO",
                "handlers": ["audit_file"],
                "propagate": False,
            },
            "app.security": {
                "level": "WARNING",
                "handlers": ["console", "file", "error_file"],
                "propagate": False,
            },
            "app.performance": {
                "level": "INFO",
                "handlers": ["file"],
                "propagate": False,
            },
            "uvicorn": {
                "level": "INFO",
                "handlers": ["console"],
                "propagate": False,
            },
            "uvicorn.error": {
                "level": "INFO",
                "handlers": ["console", "error_file"],
                "propagate": False,
            },
            "uvicorn.access": {
                "level": "INFO",
                "handlers": ["file"],
                "propagate": False,
            },
        },
        "root": {
            "level": "INFO",
            "handlers": ["console"],
        },
    }
    
    # 在生产环境中禁用控制台日志
    if settings.ENVIRONMENT == "production":
        config["loggers"]["app"]["handlers"] = ["file", "error_file"]
        config["loggers"]["uvicorn"]["handlers"] = ["file"]
    
    logging.config.dictConfig(config)


def get_logger(name: str) -> logging.Logger:
    """获取指定名称的日志记录器"""
    return logging.getLogger(f"app.{name}")


def get_audit_logger() -> logging.Logger:
    """获取审计日志记录器"""
    return logging.getLogger("app.audit")


def get_security_logger() -> logging.Logger:
    """获取安全日志记录器"""
    return logging.getLogger("app.security")


def get_performance_logger() -> logging.Logger:
    """获取性能日志记录器"""
    return logging.getLogger("app.performance")


class LogContext:
    """日志上下文管理器，用于添加额外的日志字段"""
    
    def __init__(self, logger: logging.Logger, **kwargs):
        self.logger = logger
        self.context = kwargs
        self.old_factory = logging.getLogRecordFactory()
    
    def __enter__(self):
        def record_factory(*args, **kwargs):
            record = self.old_factory(*args, **kwargs)
            for key, value in self.context.items():
                setattr(record, key, value)
            return record
        
        logging.setLogRecordFactory(record_factory)
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        logging.setLogRecordFactory(self.old_factory)


def log_operation(operation: str, user_id: str = None):
    """操作日志装饰器"""
    def decorator(func):
        def wrapper(*args, **kwargs):
            logger = get_audit_logger()
            start_time = datetime.utcnow()
            
            with LogContext(logger, operation=operation, user_id=user_id):
                try:
                    result = func(*args, **kwargs)
                    duration = (datetime.utcnow() - start_time).total_seconds() * 1000
                    logger.info(f"Operation '{operation}' completed successfully", extra={"duration": duration})
                    return result
                except Exception as e:
                    duration = (datetime.utcnow() - start_time).total_seconds() * 1000
                    logger.error(f"Operation '{operation}' failed: {str(e)}", extra={"duration": duration}, exc_info=True)
                    raise
        
        return wrapper
    return decorator