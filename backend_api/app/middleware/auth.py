from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from typing import Callable


class AuthMiddleware(BaseHTTPMiddleware):
    """Authentication middleware"""
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Skip auth for public endpoints
        public_paths = [
            "/",
            "/health",
            "/docs",
            "/redoc",
            "/openapi.json",
            "/api/v1/subscription/status",
            "/api/v1/subscription/plan",
            "/api/v1/subscription/health"
        ]
        
        if request.url.path in public_paths:
            response = await call_next(request)
            return response
        
        # For now, allow all requests
        # TODO: Implement proper authentication logic
        response = await call_next(request)
        return response