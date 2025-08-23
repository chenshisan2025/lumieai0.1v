from typing import Any, Dict, Optional, Union
from fastapi import HTTPException, Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
import traceback
import uuid
from datetime import datetime

from .logging import get_logger, get_security_logger

logger = get_logger("exceptions")
security_logger = get_security_logger()


class BaseAPIException(Exception):
    """基础API异常类"""
    
    def __init__(
        self,
        message: str,
        status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
        error_code: str = "INTERNAL_ERROR",
        details: Optional[Dict[str, Any]] = None,
    ):
        self.message = message
        self.status_code = status_code
        self.error_code = error_code
        self.details = details or {}
        self.error_id = str(uuid.uuid4())
        super().__init__(self.message)


class ValidationException(BaseAPIException):
    """验证异常"""
    
    def __init__(self, message: str, field: str = None, details: Dict[str, Any] = None):
        super().__init__(
            message=message,
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            error_code="VALIDATION_ERROR",
            details=details or {}
        )
        if field:
            self.details["field"] = field


class AuthenticationException(BaseAPIException):
    """认证异常"""
    
    def __init__(self, message: str = "Authentication failed"):
        super().__init__(
            message=message,
            status_code=status.HTTP_401_UNAUTHORIZED,
            error_code="AUTHENTICATION_ERROR"
        )


class AuthorizationException(BaseAPIException):
    """授权异常"""
    
    def __init__(self, message: str = "Access denied"):
        super().__init__(
            message=message,
            status_code=status.HTTP_403_FORBIDDEN,
            error_code="AUTHORIZATION_ERROR"
        )


class ResourceNotFoundException(BaseAPIException):
    """资源未找到异常"""
    
    def __init__(self, resource: str, identifier: str = None):
        message = f"{resource} not found"
        if identifier:
            message += f" (ID: {identifier})"
        
        super().__init__(
            message=message,
            status_code=status.HTTP_404_NOT_FOUND,
            error_code="RESOURCE_NOT_FOUND",
            details={"resource": resource, "identifier": identifier}
        )


class BusinessLogicException(BaseAPIException):
    """业务逻辑异常"""
    
    def __init__(self, message: str, details: Dict[str, Any] = None):
        super().__init__(
            message=message,
            status_code=status.HTTP_400_BAD_REQUEST,
            error_code="BUSINESS_LOGIC_ERROR",
            details=details
        )


class ExternalServiceException(BaseAPIException):
    """外部服务异常"""
    
    def __init__(self, service: str, message: str, details: Dict[str, Any] = None):
        super().__init__(
            message=f"{service} service error: {message}",
            status_code=status.HTTP_502_BAD_GATEWAY,
            error_code="EXTERNAL_SERVICE_ERROR",
            details={"service": service, **(details or {})}
        )


class ConfigurationException(BaseAPIException):
    """配置异常"""
    
    def __init__(self, message: str, config_key: str = None, details: Dict[str, Any] = None):
        error_details = details or {}
        if config_key:
            error_details["config_key"] = config_key
        
        super().__init__(
            message=message,
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            error_code="CONFIGURATION_ERROR",
            details=error_details
        )


class RateLimitException(BaseAPIException):
    """速率限制异常"""
    
    def __init__(self, message: str = "Rate limit exceeded", retry_after: int = None):
        details = {}
        if retry_after:
            details["retry_after"] = retry_after
        
        super().__init__(
            message=message,
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            error_code="RATE_LIMIT_ERROR",
            details=details
        )


class DataProofException(BaseAPIException):
    """数据证明相关异常"""
    
    def __init__(self, message: str, operation: str = None, details: Dict[str, Any] = None):
        error_details = details or {}
        if operation:
            error_details["operation"] = operation
        
        super().__init__(
            message=message,
            status_code=status.HTTP_400_BAD_REQUEST,
            error_code="DATA_PROOF_ERROR",
            details=error_details
        )


class IPFSException(ExternalServiceException):
    """IPFS服务异常"""
    
    def __init__(self, message: str, details: Dict[str, Any] = None):
        super().__init__("IPFS", message, details)


class BlockchainException(ExternalServiceException):
    """区块链服务异常"""
    
    def __init__(self, message: str, details: Dict[str, Any] = None):
        super().__init__("Blockchain", message, details)


class EncryptionException(BaseAPIException):
    """加密服务异常"""
    
    def __init__(self, message: str, operation: str = None):
        details = {}
        if operation:
            details["operation"] = operation
        
        super().__init__(
            message=message,
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            error_code="ENCRYPTION_ERROR",
            details=details
        )


def create_error_response(
    error: Union[BaseAPIException, Exception],
    request: Request = None,
    include_traceback: bool = False
) -> Dict[str, Any]:
    """创建标准化的错误响应"""
    
    if isinstance(error, BaseAPIException):
        response_data = {
            "success": False,
            "error": {
                "code": error.error_code,
                "message": error.message,
                "error_id": error.error_id,
                "timestamp": datetime.utcnow().isoformat() + "Z",
            }
        }
        
        if error.details:
            response_data["error"]["details"] = error.details
        
        # 记录错误日志
        log_data = {
            "error_id": error.error_id,
            "error_code": error.error_code,
            "status_code": error.status_code,
            "details": error.details
        }
        
        if request:
            log_data.update({
                "method": request.method,
                "url": str(request.url),
                "client_ip": request.client.host if request.client else None
            })
        
        if error.status_code >= 500:
            logger.error(f"Internal error: {error.message}", extra=log_data, exc_info=True)
        elif error.status_code in [401, 403]:
            security_logger.warning(f"Security error: {error.message}", extra=log_data)
        else:
            logger.warning(f"Client error: {error.message}", extra=log_data)
        
    else:
        # 处理未预期的异常
        error_id = str(uuid.uuid4())
        response_data = {
            "success": False,
            "error": {
                "code": "INTERNAL_ERROR",
                "message": "An unexpected error occurred",
                "error_id": error_id,
                "timestamp": datetime.utcnow().isoformat() + "Z",
            }
        }
        
        log_data = {
            "error_id": error_id,
            "error_type": type(error).__name__,
            "error_message": str(error)
        }
        
        if request:
            log_data.update({
                "method": request.method,
                "url": str(request.url),
                "client_ip": request.client.host if request.client else None
            })
        
        logger.error(f"Unexpected error: {str(error)}", extra=log_data, exc_info=True)
    
    # 在开发环境中包含堆栈跟踪
    if include_traceback and not isinstance(error, BaseAPIException):
        response_data["error"]["traceback"] = traceback.format_exc()
    
    return response_data


async def base_api_exception_handler(request: Request, exc: BaseAPIException) -> JSONResponse:
    """BaseAPIException处理器"""
    error_response = create_error_response(exc, request)
    return JSONResponse(
        status_code=exc.status_code,
        content=error_response
    )


async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    """HTTPException处理器"""
    api_exc = BaseAPIException(
        message=exc.detail,
        status_code=exc.status_code,
        error_code="HTTP_ERROR"
    )
    error_response = create_error_response(api_exc, request)
    return JSONResponse(
        status_code=exc.status_code,
        content=error_response
    )


async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    """验证异常处理器"""
    errors = []
    for error in exc.errors():
        field = ".".join(str(loc) for loc in error["loc"])
        errors.append({
            "field": field,
            "message": error["msg"],
            "type": error["type"]
        })
    
    api_exc = ValidationException(
        message="Validation failed",
        details={"validation_errors": errors}
    )
    error_response = create_error_response(api_exc, request)
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=error_response
    )


async def general_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """通用异常处理器"""
    from .config import settings
    
    error_response = create_error_response(
        exc, 
        request, 
        include_traceback=settings.DEBUG
    )
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=error_response
    )


def setup_exception_handlers(app):
    """设置异常处理器"""
    app.add_exception_handler(BaseAPIException, base_api_exception_handler)
    app.add_exception_handler(HTTPException, http_exception_handler)
    app.add_exception_handler(StarletteHTTPException, http_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(Exception, general_exception_handler)